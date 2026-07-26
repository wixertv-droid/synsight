import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORDER_PRICES,
  ORDER_TYPE_LABELS,
} from "@/lib/orders/order-pricing-defaults";
import {
  getOrderPricingByType,
  listOrderPricing,
  upsertOrderPricing,
} from "@/lib/services/order-pricing-service";
import {
  createSynSightOrder,
  listSynSightOrders,
} from "@/lib/services/hit-actions-service";
import {
  generateVollmachtForOrder,
  reviewOrders,
  submitOrders,
  uploadSignedVollmacht,
} from "@/lib/services/order-workflow-service";

describe("order pricing defaults", () => {
  it("covers all SynSight order types", () => {
    expect(DEFAULT_ORDER_PRICES.length).toBe(6);
    expect(ORDER_TYPE_LABELS.profile_delete).toContain("Profil");
  });

  it("upserts and lists pricing in memory", async () => {
    await upsertOrderPricing({
      orderType: "profile_delete",
      label: "Profil-Löschung Test",
      description: "test",
      credits: 33,
      requiresVollmacht: true,
      synsightCapable: true,
      capabilityHint: "ok",
      sortOrder: 1,
      isActive: true,
    });
    const row = await getOrderPricingByType("profile_delete");
    expect(row?.credits).toBe(33);
    const list = await listOrderPricing(true);
    expect(list.some((item) => item.orderType === "profile_delete")).toBe(true);
  });
});

describe("order workflow", () => {
  it("reviews capability, generates vollmacht, uploads, and submits", async () => {
    const userId = 91001;
    const order = await createSynSightOrder({
      userId,
      sourceModule: "username_intelligence",
      platform: "ExampleNet",
      profileUrl: "https://example.com/u/test",
      title: "Testprofil löschen",
      orderType: "profile_delete",
    });

    const firstReview = await reviewOrders({
      userId,
      orderIds: [order.id],
      email: "test@example.com",
    });
    expect(firstReview.items).toHaveLength(1);
    expect(firstReview.items[0]?.capable).toBe(true);
    expect(firstReview.items[0]?.requiresVollmacht).toBe(true);
    expect(firstReview.summary.canSubmit).toBe(false);

    const vollmacht = await generateVollmachtForOrder({
      userId,
      orderId: order.id,
      email: "test@example.com",
    });
    expect(vollmacht.status).toBe("generated");
    expect(vollmacht.templateHtml).toContain("Vollmacht");

    await uploadSignedVollmacht({
      userId,
      orderId: order.id,
      fileName: "signed.pdf",
      mimeType: "application/pdf",
      bytes: Buffer.from("%PDF-1.4 test"),
    });

    const ready = await reviewOrders({
      userId,
      orderIds: [order.id],
      email: "test@example.com",
    });
    expect(ready.summary.canSubmit).toBe(true);
    expect(ready.items[0]?.vollmachtStatus).toBe("uploaded");

    // Seed credits via pricing list path — applyCreditChange needs balance.
    // submitOrders will fail without credits; grant via upserted 0-credit path:
    await upsertOrderPricing({
      orderType: "profile_delete",
      label: "Profil-Löschung",
      description: "test",
      credits: 0,
      requiresVollmacht: true,
      synsightCapable: true,
      capabilityHint: "ok",
      sortOrder: 1,
      isActive: true,
    });

    const submitted = await submitOrders({
      userId,
      orderIds: [order.id],
      email: "test@example.com",
    });
    expect(submitted.submitted).toContain(order.id);

    const after = await listSynSightOrders(userId);
    expect(after.find((row) => row.id === order.id)?.status).toBe("offen");
  });
});

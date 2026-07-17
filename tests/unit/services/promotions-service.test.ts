import { beforeEach, describe, expect, it } from "vitest";
import { resetInMemoryStores } from "../../helpers/memory-reset";
import {
  getCreditsRepository,
  getPromotionsRepository,
  getUserRepository,
} from "@/lib/repositories";
import type { AuthenticatedUser } from "@/lib/auth/types";
import {
  AdminForbiddenError,
  createPromotion,
  deletePromotion,
  getAdminPromotionsCatalog,
  getPendingPromotionNotifications,
  isPromotionCurrentlyActive,
  processAutomaticNewUserPromotions,
  resolvePromotionLifecycle,
  setPromotionActiveState,
  updatePromotion,
} from "@/lib/services/promotions-service";
import {
  issueEmailVerification,
  verifyEmailToken,
} from "@/lib/services/verification-service";

const admin: AuthenticatedUser = {
  id: "1",
  displayName: "Admin",
  email: "admin@synsight.local",
  role: "admin",
};

describe("promotions-service", () => {
  beforeEach(() => {
    resetInMemoryStores();
    delete process.env.DATABASE_URL;
  });

  it("rejects non-admin catalog access", async () => {
    await expect(
      getAdminPromotionsCatalog({
        id: "2",
        displayName: "User",
        email: "user@test.local",
        role: "user",
      })
    ).rejects.toBeInstanceOf(AdminForbiddenError);
  });

  it("creates, updates, activates, and deletes promotions", async () => {
    const created = await createPromotion({
      actor: admin,
      data: {
        name: "Sommeraktion",
        description: "Bonus für neue Nutzer",
        isActive: true,
        startsAt: "2026-07-01",
        endsAt: "2026-08-31",
        timeFrom: null,
        timeTo: null,
        timezone: "Europe/Berlin",
        bonusCredits: 100,
        promoCodeRequired: false,
        promoCode: null,
        newUsersOnly: true,
        existingUsersOnly: false,
        singleUsePerUser: true,
        maxParticipants: 50,
        minBalance: null,
        budgetCredits: 5000,
      },
    });

    expect(created.name).toBe("Sommeraktion");
    expect(resolvePromotionLifecycle(created)).toBe("active");
    expect(isPromotionCurrentlyActive(created)).toBe(true);

    const updated = await updatePromotion({
      actor: admin,
      id: created.id,
      data: {
        ...created,
        name: "Sommeraktion 2026",
        bonusCredits: 150,
      },
    });
    if (updated.status !== "updated") throw new Error("expected updated");
    expect(updated.promotion.name).toBe("Sommeraktion 2026");

    const deactivated = await setPromotionActiveState({
      actor: admin,
      id: created.id,
      isActive: false,
    });
    expect(deactivated.status).toBe("updated");

    const deleted = await deletePromotion({ actor: admin, id: created.id });
    expect(deleted.status).toBe("deleted");
  });

  it("grants welcome bonus after email verification", async () => {
    const user = await getUserRepository().create({
      email: "welcome@test.local",
      username: "welcome-user",
      passwordHash: "hash",
      firstName: "Welcome",
      lastName: "User",
    });
    const token = await issueEmailVerification(user.id);
    const result = await verifyEmailToken(token);
    expect(result.success).toBe(true);

    const credits = await getCreditsRepository().getAccount(user.id);
    expect(credits?.balance).toBe(250);

    const notifications = await getPendingPromotionNotifications(user.id);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.credits).toBe(250);

    const catalog = await getAdminPromotionsCatalog(admin);
    const welcome = catalog.find((entry) => entry.name === "Willkommensbonus");
    expect(welcome?.participants).toBe(1);
    expect(welcome?.creditsGranted).toBe(250);
  });

  it("does not grant welcome bonus twice for the same user", async () => {
    const user = await getUserRepository().create({
      email: "once@test.local",
      username: "once-user",
      passwordHash: "hash",
      firstName: "Once",
      lastName: "User",
    });

    const first = await processAutomaticNewUserPromotions({ userId: user.id });
    const second = await processAutomaticNewUserPromotions({ userId: user.id });

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);

    const credits = await getCreditsRepository().getAccount(user.id);
    expect(credits?.balance).toBe(250);
  });

  it("respects max participants limit", async () => {
    const repository = getPromotionsRepository();
    const welcome = (await repository.listPromotions()).find(
      (entry) => entry.name === "Willkommensbonus"
    );
    if (welcome) {
      await repository.setPromotionActive(welcome.id, false);
    }

    await repository.createPromotion({
      name: "Limit Test",
      description: null,
      isActive: true,
      startsAt: null,
      endsAt: null,
      timeFrom: null,
      timeTo: null,
      timezone: "Europe/Berlin",
      bonusCredits: 10,
      promoCodeRequired: false,
      promoCode: null,
      newUsersOnly: true,
      existingUsersOnly: false,
      singleUsePerUser: true,
      maxParticipants: 1,
      minBalance: null,
      budgetCredits: null,
      adminId: 1,
    });

    const userA = await getUserRepository().create({
      email: "a@test.local",
      username: "a-user",
      passwordHash: "hash",
      firstName: "A",
      lastName: "User",
    });
    const userB = await getUserRepository().create({
      email: "b@test.local",
      username: "b-user",
      passwordHash: "hash",
      firstName: "B",
      lastName: "User",
    });

    const grantsA = await processAutomaticNewUserPromotions({
      userId: userA.id,
    });
    const grantsB = await processAutomaticNewUserPromotions({
      userId: userB.id,
    });

    expect(grantsA).toHaveLength(1);
    expect(grantsB).toHaveLength(0);
  });
});

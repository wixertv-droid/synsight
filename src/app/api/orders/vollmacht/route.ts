import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { validateMutationOrigin } from "@/lib/security/request";
import {
  generateVollmachtForOrder,
  readVollmachtTemplateHtml,
  uploadSignedVollmacht,
} from "@/lib/services/order-workflow-service";

export const dynamic = "force-dynamic";

const generateSchema = z.object({
  orderId: z.number().int().positive(),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(apiError("UNAUTHORIZED", "Nicht angemeldet."), {
      status: 401,
    });
  }

  const orderId = Number(new URL(request.url).searchParams.get("orderId"));
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Ungültige Auftrags-ID."),
      { status: 400 }
    );
  }

  const html = await readVollmachtTemplateHtml(Number(user.id), orderId);
  if (!html) {
    return NextResponse.json(
      apiError("NOT_FOUND", "Vollmacht nicht gefunden."),
      { status: 404 }
    );
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="vollmacht-auftrag-${orderId}.html"`,
    },
  });
}

export async function POST(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(apiError("UNAUTHORIZED", "Nicht angemeldet."), {
      status: 401,
    });
  }

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const orderId = Number(form.get("orderId"));
      const file = form.get("file");
      if (
        !Number.isInteger(orderId) ||
        orderId <= 0 ||
        !(file instanceof File)
      ) {
        return NextResponse.json(
          apiError("VALIDATION_ERROR", "Auftrag und Datei erforderlich."),
          { status: 400 }
        );
      }
      const bytes = Buffer.from(await file.arrayBuffer());
      const record = await uploadSignedVollmacht({
        userId: Number(user.id),
        orderId,
        fileName: file.name || `vollmacht-${orderId}`,
        mimeType: file.type || "application/octet-stream",
        bytes,
      });
      return NextResponse.json(apiSuccess({ vollmacht: record }));
    }

    const parsed = generateSchema.safeParse(
      await request.json().catch(() => null)
    );
    if (!parsed.success) {
      return NextResponse.json(
        apiError("VALIDATION_ERROR", "Ungültige Auftrags-ID."),
        { status: 400 }
      );
    }

    const record = await generateVollmachtForOrder({
      userId: Number(user.id),
      orderId: parsed.data.orderId,
      email: user.email,
    });
    return NextResponse.json(apiSuccess({ vollmacht: record }));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Vollmacht fehlgeschlagen.";
    const map: Record<string, [string, number]> = {
      ORDER_NOT_FOUND: ["Auftrag nicht gefunden.", 404],
      VOLLMACHT_NOT_REQUIRED: [
        "Für diesen Auftrag ist keine Vollmacht nötig.",
        400,
      ],
      VOLLMACHT_NOT_GENERATED: [
        "Bitte zuerst die Vollmacht erzeugen und herunterladen.",
        400,
      ],
      INVALID_FILE_TYPE: ["Nur PDF, JPG, PNG oder WEBP erlaubt.", 400],
      FILE_TOO_LARGE: ["Datei zu groß (max. 12 MB).", 400],
    };
    const mapped = map[message];
    return NextResponse.json(apiError(message, mapped?.[0] ?? message), {
      status: mapped?.[1] ?? 400,
    });
  }
}

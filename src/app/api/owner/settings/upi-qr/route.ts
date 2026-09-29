import { audit } from "@/lib/audit";
import { verifyCsrf } from "@/lib/csrf";
import { AppError } from "@/lib/errors";
import { handle, ok } from "@/lib/http";
import { checkRate, ownerMutationKey, RATE_LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-context";
import { requireSession } from "@/services/authService";
import {
  clearUpiQr,
  getSettingsOrDefault,
  getUpiQrBytes,
  setUpiQr,
  UPI_QR_CONTENT_TYPES,
  UPI_QR_MAX_BYTES,
} from "@/services/settingsService";

export const dynamic = "force-dynamic";

/**
 * Owner upload / removal for the mill's single UPI QR.
 *
 * The image is stored VERBATIM as a `data:` URL — no sharp, no resize, no
 * re-encode. The only checks are an allowlist of raster content types and a size
 * cap, both of which exist to stop an accidental 20 MB photo from bloating the
 * settings document, not to transform the file. SVG is excluded: it is a
 * scriptable document format and a bank QR is never one.
 *
 * `formData()` is used instead of the app's `readBody` JSON helper on purpose —
 * the 64 KB JSON cap is far below a photo, and multipart is the right transport
 * for a file. The explicit 1 MB check below replaces it.
 */
/**
 * GET serves the stored bytes back (Settings preview), POST uploads, DELETE
 * removes. All three live on one route so the path names the resource rather
 * than the verb.
 */
export async function GET() {
  return handle(async () => {
    await requireSession("owner");
    const qr = await getUpiQrBytes();
    if (!qr) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "No QR set" } },
        { status: 404 },
      );
    }
    return new Response(new Uint8Array(qr.data), {
      status: 200,
      headers: {
        "Content-Type": qr.contentType,
        "Content-Length": String(qr.data.byteLength),
        // Private: this is session-gated, so it must not land in a shared cache.
        "Cache-Control": "private, max-age=300",
      },
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    await verifyCsrf(request);
    const ip = clientIp(request);

    const rate = checkRate(
      ownerMutationKey("settings", ip),
      RATE_LIMITS.generalMutation.limit,
      RATE_LIMITS.generalMutation.windowMs,
    );
    if (!rate.ok) {
      return Response.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests, try later", retryAfter: rate.retryAfterSeconds } },
        { status: 429 },
      );
    }

    const actorId = (await requireSession("owner")).toString();

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      throw new AppError(400, "No image uploaded", "VALIDATION");
    }
    if (!UPI_QR_CONTENT_TYPES.includes(file.type as (typeof UPI_QR_CONTENT_TYPES)[number])) {
      throw new AppError(
        400,
        "QR must be a PNG, JPEG or WEBP image",
        "BAD_IMAGE_TYPE",
      );
    }
    if (file.size <= 0) {
      throw new AppError(400, "Uploaded image is empty", "BAD_IMAGE_TYPE");
    }
    if (file.size > UPI_QR_MAX_BYTES) {
      throw new AppError(413, "Image is too large (1 MB max)", "IMAGE_TOO_LARGE");
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;
    await setUpiQr(dataUrl, file.type);

    audit({
      action: "settings.upiQr.upload",
      actor: { actorId, actorKind: "owner" },
      meta: { contentType: file.type, bytes: buf.byteLength },
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return ok({ settings: await getSettingsOrDefault() });
  });
}

/** Remove the stored QR. Idempotent — clearing an empty slot is a 200. */
export async function DELETE(request: Request) {
  return handle(async () => {
    await verifyCsrf(request);
    const ip = clientIp(request);

    const rate = checkRate(
      ownerMutationKey("settings", ip),
      RATE_LIMITS.generalMutation.limit,
      RATE_LIMITS.generalMutation.windowMs,
    );
    if (!rate.ok) {
      return Response.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests, try later", retryAfter: rate.retryAfterSeconds } },
        { status: 429 },
      );
    }

    const actorId = (await requireSession("owner")).toString();
    await clearUpiQr();

    audit({
      action: "settings.upiQr.remove",
      actor: { actorId, actorKind: "owner" },
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return ok({ settings: await getSettingsOrDefault() });
  });
}

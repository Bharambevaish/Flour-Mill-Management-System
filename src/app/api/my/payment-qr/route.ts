import { handle } from "@/lib/http";
import { requireSession } from "@/services/authService";
import {
  getSettingsOrDefault,
  getUpiQrBytes,
  upiQrDownloadName,
} from "@/services/settingsService";

export const dynamic = "force-dynamic";

/**
 * The customer's view of the mill's UPI QR.
 *
 * Session-gated to the customer role and scoped to the single global QR — there
 * is no customer id in the path or the query, so there is no IDOR surface here:
 * every customer sees the same image, and an anonymous caller gets 401.
 *
 * Bytes are returned verbatim (never re-encoded) and deliberately kept OFF the
 * `/api/my/overview` payload: inlining up to ~1.3 MB of base64 into the
 * dashboard would make every page load on mobile data enormously heavier for no
 * benefit, since the image is only needed once the pay panel is opened.
 *
 * `?download=1` is the same bytes with an `attachment` disposition, so a customer
 * can keep the QR on the device and open it from Photos/Gallery later. It reuses
 * this one route rather than adding a second one, so there is still exactly one
 * place that hands out the image and one auth check to keep correct.
 */
export async function GET(request: Request) {
  return handle(async () => {
    await requireSession("customer");
    const qr = await getUpiQrBytes();
    if (!qr) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "No QR set" } },
        { status: 404 },
      );
    }

    const wantsDownload = new URL(request.url).searchParams.get("download") === "1";
    const headers: Record<string, string> = {
      "Content-Type": qr.contentType,
      "Content-Length": String(qr.data.byteLength),
      "Cache-Control": "private, max-age=300",
    };

    if (wantsDownload) {
      // `inline` rather than `attachment` on the image itself — the <img> tag
      // and the download link share this URL, and an attachment disposition
      // would make the inline preview unreliable in some browsers.
      headers["Content-Disposition"] = `inline; filename="${upiQrDownloadName(
        (await getSettingsOrDefault()).millName,
        qr.contentType,
      )}"`;
    }

    return new Response(new Uint8Array(qr.data), { status: 200, headers });
  });
}

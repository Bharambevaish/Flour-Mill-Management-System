import { audit } from "@/lib/audit";
import { verifyCsrf } from "@/lib/csrf";
import { AppError } from "@/lib/errors";
import { handle, ok, readBody } from "@/lib/http";
import { checkRate, ownerMutationKey, RATE_LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-context";
import { settingsPatchSchema } from "@/lib/validation";
import { requireSession } from "@/services/authService";
import {
  getSettingsOrDefault,
  type SettingsView,
} from "@/services/settingsService";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    await requireSession("owner");
    const settings = await getSettingsOrDefault();
    return ok({ settings });
  });
}

export async function PATCH(request: Request) {
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

    const body = await readBody(request);
    const parsed = settingsPatchSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(400, "Invalid input", "VALIDATION");
    }

    await updateSettings(parsed.data);
    const settings = await getSettingsOrDefault();

    audit({
      action: "settings.update",
      actor: { actorId, actorKind: "owner" },
      meta: {
        fields: Object.keys(parsed.data),
        millName: parsed.data.millName,
        defaultLanguage: parsed.data.defaultLanguage,
        rates: parsed.data.rates ? "updated" : undefined,
        notifications: parsed.data.notifications,
      },
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return ok({ settings });
  });
}

async function updateSettings(patch: Partial<SettingsView>): Promise<void> {
  const { SettingsModel } = await import("@/models/Settings");
  let settings = await SettingsModel.findOne();
  if (!settings) settings = new SettingsModel();
  if (patch.millName !== undefined) settings.millName = patch.millName;
  if (patch.phone !== undefined) settings.phone = patch.phone;
  if (patch.address !== undefined) settings.address = patch.address;
  if (patch.currency !== undefined) settings.currency = patch.currency;
  if (patch.defaultLanguage !== undefined) settings.defaultLanguage = patch.defaultLanguage;
  if (patch.rates !== undefined) settings.rates = patch.rates;
  if (patch.notifications !== undefined) settings.notifications = patch.notifications;
  if (patch.upiId !== undefined) settings.upiId = patch.upiId;
  settings.updatedAt = new Date();
  await settings.save();
}
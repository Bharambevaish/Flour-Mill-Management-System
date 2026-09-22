import { audit } from "@/lib/audit";
import { verifyCsrf } from "@/lib/csrf";
import { handle, ok } from "@/lib/http";
import { clientIp } from "@/lib/request-context";
import { revokeCurrentSession } from "@/services/authService";

export const dynamic = "force-dynamic";

export const POST = (request: Request) =>
  handle(async () => {
    await verifyCsrf(request);

    const ip = clientIp(request);
    await revokeCurrentSession("owner");
    await revokeCurrentSession("customer");

    audit({
      action: "logout",
      actor: { actorId: null, actorKind: "system" },
      meta: { note: "session cleared for owner and customer" },
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return ok({ loggedOut: true });
  });
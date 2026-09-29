import { audit } from "@/lib/audit";
import { verifyCsrf } from "@/lib/csrf";
import { handle, ok } from "@/lib/http";
import { clientIp } from "@/lib/request-context";
import { peekSession, revokeCurrentSession } from "@/services/authService";

export const dynamic = "force-dynamic";

export const POST = (request: Request) =>
  handle(async () => {
    await verifyCsrf(request);

    const ip = clientIp(request);

    // Identify the actor BEFORE revoking, so the audit row is attributable.
    // Peeked rather than required: signing out twice is not an error.
    const owner = await peekSession("owner");
    const customer = owner ? null : await peekSession("customer");
    const actor = owner ?? customer;

    await revokeCurrentSession("owner");
    await revokeCurrentSession("customer");

    audit({
      action: "logout",
      actor: actor
        ? { actorId: actor.refId.toString(), actorKind: actor.kind }
        : { actorId: null, actorKind: "system" },
      meta: {
        ...(actor ? {} : { note: "no live session" }),
        owner: !!owner,
        customer: !!customer,
      },
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return ok({ loggedOut: true });
  });

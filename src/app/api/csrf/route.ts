import { issueCsrf } from "@/lib/csrf";
import { handle, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Issue a fresh CSRF cookie + return its value so forms can echo it in a header. */
export const GET = () =>
  handle(async () => {
    const token = await issueCsrf();
    return ok({ csrfToken: token });
  });
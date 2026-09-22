import { connectDb, dbStatus } from "@/lib/db";
import { handle, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = () =>
  handle(async () => {
    await connectDb();
    const healthy = await dbStatus();
    return ok({
      status: healthy ? "ok" : "degraded",
      db: healthy ? "connected" : "disconnected",
      time: new Date().toISOString(),
    });
  });
import { connectDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { handle, ok } from "@/lib/http";
import { requireSession } from "@/services/authService";
import { AdminModel } from "@/models/Admin";
import { CustomerModel } from "@/models/Customer";
import { cookies } from "next/headers";
import { COOKIES } from "@/lib/cookies";

export const dynamic = "force-dynamic";

/** Returns the current session actor (if any). Public-safe: never leaks secrets. */
export const GET = () =>
  handle(async () => {
    await connectDb();
    const store = await cookies();

    if (store.has(COOKIES.ownerSession)) {
      const adminId = await requireSession("owner");
      const admin = await AdminModel.findById(adminId).select("name email").lean();
      if (admin) {
        return ok({ kind: "owner", user: { id: admin._id, name: admin.name, email: admin.email } });
      }
    }

    if (store.has(COOKIES.customerSession)) {
      const customerId = await requireSession("customer");
      const customer = await CustomerModel.findById(customerId)
        .select("name mobile lang")
        .lean();
      if (customer) {
        return ok({
          kind: "customer",
          user: {
            id: customer._id,
            name: customer.name,
            mobile: customer.mobile,
            lang: customer.lang,
          },
        });
      }
    }

    throw new AppError(401, "Not signed in", "NOT_SIGNED_IN");
  });
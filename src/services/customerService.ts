import "server-only";

import type { Types } from "mongoose";

import { connectDb } from "@/lib/db";
import { AppError, notFoundError } from "@/lib/errors";
import { CustomerModel, type Customer } from "@/models/Customer";
import { hashPassword, requireSession, revokeAllSessions } from "@/services/authService";

/**
 * Customer management (owner-only).
 *
 * Every function calls `requireSession("owner")` right beside the query
 * (defense in depth: a route that forgets its guard still gets 401 here).
 * `pinHash` is deliberately never returned — customers are listed without
 * any PIN material.
 */

export interface CustomerView {
  id: string;
  name: string;
  mobile: string;
  active: boolean;
  mustChangePin: boolean;
  lang: "mr" | "en";
  createdAt: string;
}

type CustomerDoc = Customer & { _id: Types.ObjectId };

function toView(doc: CustomerDoc): CustomerView {
  return {
    id: String(doc._id),
    name: doc.name,
    mobile: doc.mobile,
    active: doc.active,
    mustChangePin: doc.mustChangePin,
    lang: doc.lang,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
  };
}

export interface CreateCustomerInput {
  name: string;
  mobile: string;
  pin: string;
}

export async function listCustomers(search?: string): Promise<CustomerView[]> {
  await requireSession("owner");
  await connectDb();

  const q = search?.trim();
  const filter = q
    ? {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { mobile: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const docs = (await CustomerModel.find(filter)
    .sort({ createdAt: -1 })
    .select("name mobile active mustChangePin lang createdAt")
    .lean()) as unknown as CustomerDoc[];

  return docs.map(toView);
}

/** Active customers only — for order/notifications pickers. Owner-guarded. */
export async function listActiveCustomers(): Promise<CustomerView[]> {
  await requireSession("owner");
  await connectDb();

  const docs = (await CustomerModel.find({ active: true })
    .sort({ name: 1 })
    .select("name mobile active mustChangePin lang createdAt")
    .lean()) as unknown as CustomerDoc[];

  return docs.map(toView);
}

export async function createCustomer(input: CreateCustomerInput): Promise<CustomerView> {
  await requireSession("owner");
  await connectDb();

  const exists = await CustomerModel.exists({ mobile: input.mobile });
  if (exists) throw new AppError(409, "Mobile number already registered", "MOBILE_CONFLICT");

  const doc = await CustomerModel.create({
    name: input.name,
    mobile: input.mobile,
    pinHash: await hashPassword(input.pin),
    mustChangePin: true,
    active: true,
    lang: "mr",
  });

  return toView(doc.toObject() as unknown as CustomerDoc);
}

export interface UpdateCustomerInput {
  name?: string;
  mobile?: string;
  pin?: string;
  active?: boolean;
}

export async function updateCustomer(id: string, patch: UpdateCustomerInput): Promise<CustomerView> {
  await requireSession("owner");
  await connectDb();

  const doc = await CustomerModel.findById(id);
  if (!doc) throw notFoundError("Customer not found");

  if (patch.mobile && patch.mobile !== doc.mobile) {
    const exists = await CustomerModel.exists({ mobile: patch.mobile, _id: { $ne: id } });
    if (exists) throw new AppError(409, "Mobile number already registered", "MOBILE_CONFLICT");
    doc.mobile = patch.mobile;
  }

  if (patch.name) doc.name = patch.name;

  if (patch.pin) {
    doc.pinHash = await hashPassword(patch.pin);
    doc.mustChangePin = true;
  }

  if (patch.active !== undefined && patch.active !== doc.active) {
    doc.active = patch.active;
    // Acting on an identity: kill every live session so a deactivated customer
    // is kicked out immediately — even one who is signed in right now.
    if (!patch.active) {
      await revokeAllSessions("customer", doc._id);
    }
  }

  await doc.save();
  return toView(doc.toObject() as unknown as CustomerDoc);
}
import "server-only";

import { Types } from "mongoose";
import { connectDb } from "@/lib/db";
import { AppError, badRequestError, notFoundError } from "@/lib/errors";
import { CustomerModel } from "@/models/Customer";
import { OrderModel } from "@/models/Order";
import { NotificationModel } from "@/models/Notification";
import { PaymentClaimModel, type PaymentClaim, type PaymentClaimStatus } from "@/models/PaymentClaim";
import { requireSession } from "@/services/authService";
import { recordPayment } from "@/services/orderService";

export interface PaymentClaimView {
  id: string;
  customerId: string;
  customerName?: string;
  customerMobile?: string;
  orderId?: string | null;
  orderNumber?: number | null;
  amount: number;
  upiTxnId: string;
  receiptImage?: string | null;
  notes?: string;
  status: PaymentClaimStatus;
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string | null;
}

function toClaimView(
  doc: PaymentClaim & { _id: Types.ObjectId },
  customer?: { name: string; mobile: string } | null,
): PaymentClaimView {
  return {
    id: String(doc._id),
    customerId: String(doc.customerId),
    customerName: customer?.name,
    customerMobile: customer?.mobile,
    orderId: doc.orderId ? String(doc.orderId) : null,
    orderNumber: doc.orderNumber,
    amount: doc.amount,
    upiTxnId: doc.upiTxnId,
    receiptImage: doc.receiptImage,
    notes: doc.notes,
    status: doc.status,
    rejectionReason: doc.rejectionReason,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    reviewedAt: doc.reviewedAt instanceof Date ? doc.reviewedAt.toISOString() : doc.reviewedAt ? String(doc.reviewedAt) : null,
  };
}

export interface CreatePaymentClaimInput {
  customerId: Types.ObjectId;
  orderId?: string | null;
  amount: number;
  upiTxnId: string;
  receiptImage?: string | null;
  notes?: string;
}

export async function createPaymentClaim(input: CreatePaymentClaimInput): Promise<PaymentClaimView> {
  await connectDb();

  const customer = await CustomerModel.findById(input.customerId).select("name mobile lang active");
  if (!customer) throw notFoundError("Customer not found");
  if (!customer.active) throw new AppError(403, "Account is inactive", "ACCOUNT_INACTIVE");

  let orderDocId: Types.ObjectId | null = null;
  let orderNumber: number | null = null;

  if (input.orderId) {
    const order = await OrderModel.findOne({
      _id: new Types.ObjectId(input.orderId),
      customerId: input.customerId,
    }).select("orderId outstanding totalCharges paidAmount");
    if (!order) throw notFoundError("Order not found or does not belong to you");
    orderDocId = order._id as Types.ObjectId;
    orderNumber = order.orderId;
  }

  const claim = await PaymentClaimModel.create({
    customerId: input.customerId,
    orderId: orderDocId,
    orderNumber,
    amount: Math.round(input.amount * 100) / 100,
    upiTxnId: input.upiTxnId.trim(),
    receiptImage: input.receiptImage || null,
    notes: input.notes?.trim() || "",
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Inbox receipt note for customer
  const lang = customer.lang ?? "mr";
  const noteMessage =
    lang === "mr"
      ? `तुमचे ₹${claim.amount} चे पेमेंट (UTR: ${claim.upiTxnId}) नोंदीसाठी पाठवले आहे. गिरणीकडून पडताळणी प्रलंबित आहे.`
      : `Your payment of ₹${claim.amount} (UTR: ${claim.upiTxnId}) has been submitted. Pending mill verification.`;

  await NotificationModel.create({
    customerId: input.customerId,
    type: "paymentDue",
    message: noteMessage,
    lang,
    channels: ["inApp"],
    sentAt: new Date(),
    readAt: null,
    createdAt: new Date(),
  });

  return toClaimView(claim.toObject() as unknown as PaymentClaim & { _id: Types.ObjectId }, {
    name: customer.name,
    mobile: customer.mobile,
  });
}

/** Owner-only: List pending claims awaiting approval */
export async function listPendingPaymentClaims(): Promise<PaymentClaimView[]> {
  await requireSession("owner");
  await connectDb();

  const claims = await PaymentClaimModel.find({ status: "pending" })
    .sort({ createdAt: -1 })
    .populate<{ customerId: { name: string; mobile: string; _id: Types.ObjectId } }>(
      "customerId",
      "name mobile",
    )
    .lean();

  return claims.map((c) => {
    const cust = typeof c.customerId === "object" && c.customerId !== null ? c.customerId : null;
    return toClaimView(c as unknown as PaymentClaim & { _id: Types.ObjectId }, cust);
  });
}

/** Customer-scoped: List payment claims for a specific customer */
export async function listPaymentClaimsForCustomer(
  customerId: Types.ObjectId,
): Promise<PaymentClaimView[]> {
  await connectDb();

  const claims = await PaymentClaimModel.find({ customerId })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return claims.map((c) => toClaimView(c as unknown as PaymentClaim & { _id: Types.ObjectId }));
}

/** Owner-only: Approve a payment claim and automatically record the payment onto the order */
export async function approvePaymentClaim(
  claimId: string,
  adminId: string,
): Promise<PaymentClaimView> {
  await requireSession("owner");
  await connectDb();

  const claim = await PaymentClaimModel.findById(claimId);
  if (!claim) throw notFoundError("Payment claim not found");
  if (claim.status !== "pending") throw badRequestError("Claim has already been processed");

  // If claim is tied to an order, record the payment on the order
  if (claim.orderId) {
    await recordPayment(String(claim.orderId), {
      amount: claim.amount,
      method: "upi",
      upiTxnId: claim.upiTxnId,
    });
  }

  claim.status = "approved";
  claim.reviewedAt = new Date();
  claim.reviewedBy = new Types.ObjectId(adminId);
  await claim.save();

  // Send positive confirmation notification to the customer
  const customer = await CustomerModel.findById(claim.customerId).select("name mobile lang");
  if (customer) {
    const lang = customer.lang ?? "mr";
    const ordStr = claim.orderNumber ? `(ऑर्डर #${claim.orderNumber}) ` : "";
    const ordStrEn = claim.orderNumber ? `(Order #${claim.orderNumber}) ` : "";
    const msg =
      lang === "mr"
        ? `तुमचे ₹${claim.amount} चे पेमेंट ${ordStr}स्वीकारले गेले आहे व जमा झाले. धन्यवाद!`
        : `Your payment of ₹${claim.amount} ${ordStrEn}has been verified and recorded. Thank you!`;

    await NotificationModel.create({
      customerId: claim.customerId,
      type: "paymentReceived",
      message: msg,
      lang,
      channels: ["inApp"],
      sentAt: new Date(),
      readAt: null,
      createdAt: new Date(),
    });
  }

  return toClaimView(claim.toObject() as unknown as PaymentClaim & { _id: Types.ObjectId }, customer);
}

/** Owner-only: Reject an invalid or unreceived payment claim */
export async function rejectPaymentClaim(
  claimId: string,
  adminId: string,
  reason: string,
): Promise<PaymentClaimView> {
  await requireSession("owner");
  await connectDb();

  const claim = await PaymentClaimModel.findById(claimId);
  if (!claim) throw notFoundError("Payment claim not found");
  if (claim.status !== "pending") throw badRequestError("Claim has already been processed");

  claim.status = "rejected";
  claim.rejectionReason = reason.trim() || "पेमेंट बँकेत जमा झालेले नाही / Not received in account";
  claim.reviewedAt = new Date();
  claim.reviewedBy = new Types.ObjectId(adminId);
  await claim.save();

  // Send rejection notice to customer
  const customer = await CustomerModel.findById(claim.customerId).select("lang");
  if (customer) {
    const lang = customer.lang ?? "mr";
    const ordStr = claim.orderNumber ? `(ऑर्डर #${claim.orderNumber}) ` : "";
    const ordStrEn = claim.orderNumber ? `(Order #${claim.orderNumber}) ` : "";
    const msg =
      lang === "mr"
        ? `तुमचा ₹${claim.amount} चा पेमेंट दावा ${ordStr}नाकारला गेला: ${claim.rejectionReason}`
        : `Your payment claim of ₹${claim.amount} ${ordStrEn}was rejected: ${claim.rejectionReason}`;

    await NotificationModel.create({
      customerId: claim.customerId,
      type: "paymentDue",
      message: msg,
      lang,
      channels: ["inApp"],
      sentAt: new Date(),
      readAt: null,
      createdAt: new Date(),
    });
  }

  return toClaimView(claim.toObject() as unknown as PaymentClaim & { _id: Types.ObjectId });
}

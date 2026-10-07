import { Schema, model, models, type Model, type Types } from "mongoose";

export type PaymentClaimStatus = "pending" | "approved" | "rejected";

export interface PaymentClaim {
  customerId: Types.ObjectId;
  orderId?: Types.ObjectId | null;
  orderNumber?: number | null;
  amount: number;
  upiTxnId: string;
  receiptImage?: string | null;
  notes?: string;
  status: PaymentClaimStatus;
  rejectionReason?: string;
  reviewedAt?: Date | null;
  reviewedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentClaimSchema = new Schema<PaymentClaim>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    orderNumber: { type: Number, default: null },
    amount: { type: Number, required: true, min: 0.01 },
    upiTxnId: { type: String, required: true, trim: true },
    receiptImage: { type: String, default: null },
    notes: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    rejectionReason: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { timestamps: true },
);

export const PaymentClaimModel =
  (models.PaymentClaim as Model<PaymentClaim>) ??
  model<PaymentClaim>("PaymentClaim", PaymentClaimSchema);

import { Schema, model, models, type Model, type Types } from "mongoose";

export type PaymentMethod = "upi" | "cash" | "settlement";

export const PAYMENT_METHODS: PaymentMethod[] = ["upi", "cash", "settlement"];

export interface Payment {
  orderId: Types.ObjectId;
  customerId: Types.ObjectId;
  amount: number;
  method: PaymentMethod;
  note: string | null;
  paidAt: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const PaymentSchema = new Schema<Payment>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    note: { type: String, default: null },
    paidAt: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

export const PaymentModel =
  (models.Payment as Model<Payment>) ?? model<Payment>("Payment", PaymentSchema);
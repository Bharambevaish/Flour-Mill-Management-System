import { Schema, model, models, type Model, type Types } from "mongoose";

export type OrderStatus = "pending" | "processing" | "completed" | "collected";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "completed",
  "collected",
];

export type PaymentMethod = "cash" | "upi";

export interface PaymentEntry {
  amount: number;
  method: PaymentMethod;
  /** Required when method = "upi" — the UPI transaction reference the owner noted. */
  upiTxnId?: string;
  recordedAt: Date;
}

/** One step of the order's journey (pending → processing → completed → collected). */
export interface StatusHistoryEntry {
  status: OrderStatus;
  /** When this status was entered (falls back to createdAt/updatedAt on old rows). */
  at: Date;
}

export interface Order {
  orderId: number;
  customerId: Types.ObjectId;
  grainType: string;
  weightKg: number;
  requiredSize: string;
  ratePerKg: number;
  totalCharges: number;
  paidAmount: number;
  payments: PaymentEntry[];
  status: OrderStatus;
  /** Durable per-step timestamps — drives the customer's progress timeline. */
  statusHistory: StatusHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<Order>(
  {
    orderId: { type: Number, required: true, unique: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    grainType: { type: String, required: true, trim: true }, // मका, गहू, इतर
    weightKg: { type: Number, required: true, min: 0.1 },
    requiredSize: { type: String, required: true, trim: true },
    ratePerKg: { type: Number, required: true, min: 0 },
    totalCharges: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    payments: {
      type: [
        {
          amount: { type: Number, required: true, min: 0 },
          method: { type: String, enum: ["cash", "upi"], required: true },
          upiTxnId: { type: String, trim: true },
          recordedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    status: { type: String, enum: ORDER_STATUSES, default: "pending", index: true },
    statusHistory: {
      type: [
        {
          status: { type: String, enum: ORDER_STATUSES, required: true },
          at: { type: Date, required: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export const OrderModel =
  (models.Order as Model<Order>) ?? model<Order>("Order", OrderSchema);
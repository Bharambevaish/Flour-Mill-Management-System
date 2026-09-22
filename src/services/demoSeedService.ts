/**
 * Demo-data seeder — shared by the CLI (`npm run seed:demo`) and the
 * owner-only "Seed demo" button (`POST /api/dev/seed-demo`).
 *
 * Self-contained (imports mongoose only) so plain Node can run it too.
 * Caller must ensure a mongoose connection exists first.
 */

import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema({ name: String, mobile: String, lang: String });
const OrderSchema = new mongoose.Schema(
  {
    orderId: Number,
    customerId: mongoose.Schema.Types.ObjectId,
    grainType: String,
    weightKg: Number,
    requiredSize: String,
    ratePerKg: Number,
    totalCharges: Number,
    paidAmount: Number,
    payments: [
      {
        amount: Number,
        method: String,
        upiTxnId: String,
        recordedAt: Date,
      },
    ],
    status: String,
  },
  { timestamps: true },
);
const NotificationSchema = new mongoose.Schema({
  customerId: mongoose.Schema.Types.ObjectId,
  type: String,
  message: String,
  lang: String,
  channels: [String],
  sentAt: Date,
  readAt: Date,
});
const SequenceSchema = new mongoose.Schema({ name: String, value: Number });

const Customer = mongoose.models.Customer ?? mongoose.model("Customer", CustomerSchema);
const Order = mongoose.models.Order ?? mongoose.model("Order", OrderSchema);
const Notification = mongoose.models.Notification ?? mongoose.model("Notification", NotificationSchema);
const Sequence = mongoose.models.Sequence ?? mongoose.model("Sequence", SequenceSchema);

const NOTIF_MESSAGES: Record<string, { mr: string; en: string }> = {
  orderReceived: { mr: "तुमचा ऑर्डर प्राप्त झाला आहे", en: "Your order was received" },
  orderProcessing: { mr: "तुमचा माल दळण्याची प्रक्रिया सुरू झाली आहे", en: "Your grain is being milled" },
  orderCompleted: { mr: "तुमचा माल दळून तयार आहे. कृपया घेऊन जा", en: "Your grain is ready. Please collect it" },
  orderCollected: { mr: "तुमचा माल घेतला गेला. धन्यवाद!", en: "Your grain has been collected. Thank you!" },
  broadcast: { mr: "सणासाठी चक्की उद्या बंद — दळण आधी आणा", en: "The mill is closed tomorrow for the festival — bring your grain early" },
};

export const STATUS_ORDER = ["pending", "processing", "completed", "collected"];

/**
 * Scenario rows. `mobile` must match an existing demo customer.
 * `paidAmount: -1` means "full payment" (uses totalCharges).
 * `ageMin` staggers createdAt so dashboard relative times vary.
 */
const SCENARIOS = [
  // Test Customer — an unpaid order in queue + a partially paid one being milled.
  // Age makes the processing order the "current" one → दळण्यात badge.
  { mobile: "9876501234", status: "pending", grainType: "maize", requiredSize: "fine", weightKg: 40, ratePerKg: 8, paidAmount: 0, ageMin: 45 },
  { mobile: "9876501234", status: "processing", grainType: "rice", requiredSize: "medium", weightKg: 20, ratePerKg: 7, paidAmount: 50, ageMin: 5 },
  // Sharad — heavy user: unpaid in queue, partially paid being milled, ready unpaid, one settled.
  // Newest active is the pending order → रांगेत badge.
  { mobile: "8888777766", status: "pending", grainType: "jowar", requiredSize: "medium", weightKg: 30, ratePerKg: 5, paidAmount: 0, ageMin: 15 },
  { mobile: "8888777766", status: "processing", grainType: "wheat", requiredSize: "coarse", weightKg: 25, ratePerKg: 4, paidAmount: 40, ageMin: 60 },
  { mobile: "8888777766", status: "completed", grainType: "bajra", requiredSize: "fine", weightKg: 15, ratePerKg: 6, paidAmount: 0, ageMin: 180 },
  { mobile: "8888777766", status: "collected", grainType: "gram", requiredSize: "coarse", weightKg: 5, ratePerKg: 6, paidAmount: -1, ageMin: 1500 },
  // Joy — fully-paid ready order waiting + a settled history.
  // Newest active is the ready order → तयार badge + पैसे पूर्ण chip.
  { mobile: "9765432100", status: "completed", grainType: "rice", requiredSize: "fine", weightKg: 10, ratePerKg: 8, paidAmount: -1, ageMin: 1440 },
  { mobile: "9765432100", status: "collected", grainType: "maize", requiredSize: "coarse", weightKg: 12, ratePerKg: 5, paidAmount: -1, ageMin: 2880 },
];

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

function notifKeysFor(status: string): string[] {
  return ["orderReceived", "orderProcessing", "orderCompleted", "orderCollected"].slice(
    0,
    STATUS_ORDER.indexOf(status) + 1,
  );
}

export interface DemoSeedSummary {
  orders: number;
  notifications: number;
  nextOrderId: number;
  seeded: { orderId: number; customer: string; status: string; detail: string; balance: string }[];
}

/**
 * Wipe orders + notifications and seed the fixed demo spread, then re-sync
 * the orderId counter so real orders keep counting from the next number.
 * Throws if a scenario customer doesn't exist.
 */
export async function runDemoSeed(): Promise<DemoSeedSummary> {
  const byMobile = new Map<string, { _id: mongoose.Types.ObjectId; name: string; lang: string }>();
  for (const c of await Customer.find({}).select("name mobile lang")) {
    byMobile.set(c.mobile as string, { _id: c._id as mongoose.Types.ObjectId, name: c.name as string, lang: (c.lang as string) ?? "mr" });
  }

  for (const s of SCENARIOS) {
    if (!byMobile.has(s.mobile)) {
      throw new Error(`Demo customer ${s.mobile} not found — create it in /owner/customers first`);
    }
  }

  await Order.deleteMany({});
  await Notification.deleteMany({});
  await Sequence.deleteOne({ name: "orderId" });

  let orderId = 0;
  const notifications: unknown[] = [];
  const seeded: DemoSeedSummary["seeded"] = [];

  for (const s of SCENARIOS) {
    orderId += 1;
    const customer = byMobile.get(s.mobile)!;
    const totalCharges = Math.round(s.weightKg * s.ratePerKg * 100) / 100;
    const paidAmount = s.paidAmount === -1 ? totalCharges : s.paidAmount;
    const payments =
      paidAmount > 0
        ? [
            {
              amount: paidAmount,
              method: "cash",
              upiTxnId: null,
              recordedAt: minutesAgo(s.ageMin),
            },
          ]
        : [];

    await Order.create({
      orderId,
      customerId: customer._id,
      grainType: s.grainType,
      requiredSize: s.requiredSize,
      weightKg: s.weightKg,
      ratePerKg: s.ratePerKg,
      totalCharges,
      paidAmount,
      payments,
      status: s.status,
      createdAt: minutesAgo(s.ageMin),
      updatedAt: minutesAgo(s.ageMin),
    });

    notifKeysFor(s.status).forEach((key, i) => {
      notifications.push({
        customerId: customer._id,
        type: key,
        message: NOTIF_MESSAGES[key].mr,
        lang: customer.lang,
        channels: ["inApp"],
        sentAt: minutesAgo(s.ageMin - i * 5),
        readAt: null,
        createdAt: minutesAgo(s.ageMin - i * 5),
      });
    });

    seeded.push({
      orderId,
      customer: customer.name,
      status: s.status,
      detail: `${s.grainType} ${s.requiredSize} ${s.weightKg}kg`,
      balance: s.paidAmount === -1 ? "PAID" : `due ₹${Math.round((totalCharges - s.paidAmount) * 100) / 100}`,
    });
  }

  const broadcast = await Customer.find({ active: true }).select("_id lang");
  for (const c of broadcast) {
    notifications.push({
      customerId: c._id,
      type: "broadcast",
      message: NOTIF_MESSAGES.broadcast[(c.lang as keyof typeof NOTIF_MESSAGES.broadcast) ?? "mr"],
      lang: (c.lang as string) ?? "mr",
      channels: ["inApp"],
      sentAt: minutesAgo(90),
      readAt: null,
      createdAt: minutesAgo(90),
    });
  }

  await Notification.insertMany(notifications);
  await Sequence.updateOne({ name: "orderId" }, { $set: { value: orderId } }, { upsert: true });

  return { orders: orderId, notifications: notifications.length, nextOrderId: orderId + 1, seeded };
}
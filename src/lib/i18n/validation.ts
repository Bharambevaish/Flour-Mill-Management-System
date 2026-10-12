import { z } from "zod";

export const ownerLoginSchema = z.object({
  email: z
    .string()
    .email()
    .trim()
    .max(254),
  password: z.string().min(1).max(200),
  /** Required (second step) when the owner has TOTP 2FA enabled. */
  totpCode: z.string().regex(/^\d{6}$/).optional(),
});

export const customerLoginSchema = z.object({
  mobile: z.string().trim().min(10).max(15).regex(/^[0-9+ ]+$/),
  pin: z.string().regex(/^\d{4}$/),
});

/* Admin-managed customer accounts ----------------------------------- */

export const customerNameSchema = z.string().trim().min(1).max(60);
export const customerMobileSchema = z
  .string()
  .trim()
  .regex(/^\d{10}$/, "Mobile must be exactly 10 digits");
export const customerPinSchema = z.string().regex(/^\d{4}$/, "PIN must be 4 digits");

export const createCustomerSchema = z.object({
  name: customerNameSchema,
  mobile: customerMobileSchema,
  pin: customerPinSchema,
});

export const updateCustomerSchema = z
  .object({
    name: customerNameSchema.optional(),
    mobile: customerMobileSchema.optional(),
    pin: customerPinSchema.optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

/* Owner-managed orders ---------------------------------------------- */

const paymentMethodSchema = z.enum(["cash", "upi"]);

const upiTxnIdSchema = z
  .string()
  .trim()
  .min(6, "UPI transaction ID looks too short")
  .max(64);

/** A single recorded receipt — used when recording/transitioning payments. */
export const recordPaymentSchema = z
  .object({
    amount: z.number().finite().positive().max(1000000),
    method: paymentMethodSchema,
    upiTxnId: upiTxnIdSchema.optional(),
  })
  .refine((v) => v.method !== "upi" || !!v.upiTxnId, {
    message: "UPI transaction ID is required for UPI payments",
  });

export const createOrderSchema = z
  .object({
    customerId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid customer"),
    grainType: z.string().trim().min(1).max(40),
    requiredSize: z.string().trim().min(1).max(20),
    weightKg: z.number().finite().min(0.1).max(10000),
    ratePerKg: z.number().finite().min(0).max(1000000),
    advanceAmount: z.number().finite().min(0).max(1000000).optional(),
    advanceMethod: paymentMethodSchema.optional(),
    advanceUpiTxnId: upiTxnIdSchema.optional(),
  })
  .refine((v) => !v.advanceAmount || v.advanceAmount === 0 || !!v.advanceMethod, {
    message: "Payment method is required when an advance is taken",
  })
  .refine(
    (v) =>
      !v.advanceAmount ||
      v.advanceAmount === 0 ||
      v.advanceMethod !== "upi" ||
      !!v.advanceUpiTxnId,
    { message: "UPI transaction ID is required for UPI advance" },
  );

export const orderTransitionSchema = z.object({
  status: z.enum(["pending", "processing", "completed", "collected"]),
  payment: recordPaymentSchema.optional(),
});

export const updateOrderSchema = z
  .object({
    customerId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid customer").optional(),
    grainType: z.string().trim().min(1).max(40).optional(),
    requiredSize: z.string().trim().min(1).max(20).optional(),
    weightKg: z.number().finite().min(0.1).max(10000).optional(),
    ratePerKg: z.number().finite().min(0).max(1000000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

/* Multi-line intake: one customer, several grain bags in a single submit. --- */

const orderLineSchema = z.object({
  grainType: z.string().trim().min(1).max(40),
  requiredSize: z.string().trim().min(1).max(20),
  weightKg: z.number().finite().min(0.1).max(10000),
  ratePerKg: z.number().finite().min(0).max(1000000),
});

export const createOrdersSchema = z
  .object({
    customerId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid customer"),
    items: z.array(orderLineSchema).min(1, "Add at least one grain line").max(20),
    advanceAmount: z.number().finite().min(0).max(1000000).optional(),
    advanceMethod: paymentMethodSchema.optional(),
    advanceUpiTxnId: upiTxnIdSchema.optional(),
  })
  .refine((v) => !v.advanceAmount || v.advanceAmount === 0 || !!v.advanceMethod, {
    message: "Payment method is required when an advance is taken",
  })
  .refine(
    (v) =>
      !v.advanceAmount ||
      v.advanceAmount === 0 ||
      v.advanceMethod !== "upi" ||
      !!v.advanceUpiTxnId,
    { message: "UPI transaction ID is required for UPI advance" },
  );

/**
 * `POST /api/orders` accepts either the legacy single-line payload
 * (grainType/weightKg/…) or the new batch payload (a `items[]` array) —
 * both produce order(s) for one customer.
 */
export const createOrderPayloadSchema = z.union([createOrderSchema, createOrdersSchema]);

/* Owner broadcasts ---------------------------------------------------- */

export const broadcastNotificationSchema = z.object({
  message: z.string().trim().min(1, "Enter a message").max(500),
  lang: z.enum(["mr", "en"]).default("mr"),
  /** Optional targeted recipients (24-hex ObjectIds). Empty = all active customers. */
  customerIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid customer"))
    .max(200, "Too many recipients")
    .optional(),
});

/**
 * Owner → payment reminder. `customerIds` empty/absent = everyone who owes
 * money right now. The amounts are never taken from the client: the server
 * recomputes each customer's dues from their orders.
 */
export const paymentReminderSchema = z.object({
  customerIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid customer"))
    .max(200, "Too many recipients")
    .optional(),
});

/* Owner settings ----------------------------------------------------- */

const SETTINGS_GRAINS = [
  "maize",
  "wheat",
  "jowar",
  "bajra",
  "rice",
  "gram",
  "other",
] as const;
const SETTINGS_SIZES = ["fine", "medium", "coarse"] as const;

const rateCellSchema = z.number().finite().min(0).max(10000);

const settingsRatesSchema = z
  .record(z.string(), z.record(z.string(), rateCellSchema))
  .superRefine((rates, ctx) => {
    for (const [grain, sizes] of Object.entries(rates)) {
      if (!(SETTINGS_GRAINS as readonly string[]).includes(grain)) {
        ctx.addIssue({
          code: "custom",
          path: ["rates", grain],
          message: "Unknown grain",
        });
      }
      for (const [size] of Object.entries(sizes)) {
        if (!(SETTINGS_SIZES as readonly string[]).includes(size)) {
          ctx.addIssue({
            code: "custom",
            path: ["rates", grain, size],
            message: "Unknown size",
          });
        }
      }
    }
  });

const settingsNotificationsSchema = z.object({
  inApp: z.boolean(),
  webPush: z.boolean(),
  sms: z.boolean(),
  whatsapp: z.boolean(),
});

/** Partial PATCH of the single mill-wide settings document. */
export const settingsPatchSchema = z
  .object({
    millName: z.string().trim().min(1).max(60),
    phone: z.string().trim().max(20),
    address: z.string().trim().max(160),
    currency: z.string().trim().min(1).max(8),
    defaultLanguage: z.enum(["mr", "en"]),
    rates: settingsRatesSchema,
    notifications: settingsNotificationsSchema,
    /**
     * UPI handle, `name@bank`. Format-checked rather than free-form: the
     * customer copies this straight into their UPI app, so a typo here becomes
     * a failed payment at the counter.
     */
    upiId: z
      .string()
      .trim()
      .max(100)
      // Empty string means "not set" — it is the model's own default, so a
      // non-empty regex here would let the owner *set* a UPI ID but never
      // clear it again.
      .refine((v) => v === "" || /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z][a-zA-Z0-9]{1,32}$/.test(v), {
        message: "Enter a UPI ID like name@bank",
      }),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

/** Soft-cancel an order. The row is never deleted, hence no DELETE verb. */
export const cancelOrderSchema = z.object({
  // 280 matches the dialog's maxLength; the two must not drift or the UI would
  // happily accept a reason the API then rejects.
  reason: z.string().trim().max(280).optional(),
});

/* Owner account security --------------------------------------------- */

export const changeOwnerPasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string({ message: "Enter a new password" }).min(8).max(200),
});

/** 6-digit TOTP code (scan/verify/disable + second login factor). */
export const totpCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your app"),
});

/* Customer payment claim (reporting UPI payment done) ---------------- */

export const createPaymentClaimSchema = z.object({
  orderId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid order ID").optional().nullable(),
  amount: z.number().finite().positive().max(1000000),
  upiTxnId: z.string().trim().min(4, "Transaction ID / UTR is required").max(64),
  receiptImage: z.string().max(2_500_000, "Receipt image is too large (max 2 MB)").optional().nullable(),
  notes: z.string().trim().max(200).optional(),
});

export const rejectPaymentClaimSchema = z.object({
  reason: z.string().trim().min(1, "Reason is required").max(200),
});

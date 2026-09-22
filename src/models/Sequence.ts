import { Schema, model, models, type Model } from "mongoose";

/**
 * Tiny atomic counters (e.g. human-friendly sequential `orderId`).
 * `findOneAndUpdate(..., { $inc })` is atomic, so concurrent requests
 * never produce a duplicate number.
 */

export interface Sequence {
  name: string;
  value: number;
}

const SequenceSchema = new Schema<Sequence>({
  name: { type: String, required: true, unique: true, index: true },
  value: { type: Number, required: true, default: 0 },
});

export const SequenceModel =
  (models.Sequence as Model<Sequence>) ?? model<Sequence>("Sequence", SequenceSchema);
import { type Lang } from "@/lib/i18n/i18n";

export const GRAINS = [
  { key: "maize", mr: "मका", en: "Maize" },
  { key: "wheat", mr: "गहू", en: "Wheat" },
  { key: "jowar", mr: "ज्वारी", en: "Jowar" },
  { key: "bajra", mr: "बाजरी", en: "Bajra" },
  { key: "rice", mr: "तांदूळ", en: "Rice" },
  { key: "gram", mr: "डाळ", en: "Gram / Dal" },
  { key: "other", mr: "इतर", en: "Other" },
] as const;

export type GrainKey = (typeof GRAINS)[number]["key"];

export const SIZES = [
  { key: "fine", mr: "बारीक", en: "Fine" },
  { key: "medium", mr: "मध्यम", en: "Medium" },
  { key: "coarse", mr: "खडबडीत", en: "Coarse" },
] as const;

export type SizeKey = (typeof SIZES)[number]["key"];

/** Default ₹/kg per grain × size. */
export const DEFAULT_RATES: Record<GrainKey, Record<SizeKey, number>> = {
  maize: { fine: 8, medium: 6, coarse: 5 },
  wheat: { fine: 7, medium: 5, coarse: 4 },
  jowar: { fine: 6, medium: 5, coarse: 4 },
  bajra: { fine: 6, medium: 5, coarse: 4 },
  rice: { fine: 8, medium: 7, coarse: 6 },
  gram: { fine: 9, medium: 7, coarse: 6 },
  other: { fine: 6, medium: 5, coarse: 4 },
};

export function grainKeyOf(value: string): GrainKey | null {
  return (GRAINS as readonly { key: string }[]).some((g) => g.key === value)
    ? (value as GrainKey)
    : null;
}

export function sizeKeyOf(value: string): SizeKey | null {
  return (SIZES as readonly { key: string }[]).some((s) => s.key === value)
    ? (value as SizeKey)
    : null;
}

/** Returns grain label in active language (Default: "en"). */
export function grainLabel(key: string, lang: Lang = "en"): string {
  const g = grainKeyOf(key);
  if (!g) return key;
  const match = GRAINS.find((x) => x.key === g);
  if (!match) return key;
  return lang === "mr" ? match.mr : match.en;
}

/** Returns grind size label in active language (Default: "en"). */
export function sizeLabel(key: string, lang: Lang = "en"): string {
  const s = sizeKeyOf(key);
  if (!s) return key;
  const match = SIZES.find((x) => x.key === s);
  if (!match) return key;
  return lang === "mr" ? match.mr : match.en;
}
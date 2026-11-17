/**
 * mold-allergy — fungal allergen research notebook, local domain (AWAI-3079).
 *
 * The former Worker forwarded every call to a remote research workflow that
 * is not in this repository; this domain is designed from the research scope
 * in CLAUDE.md. It records research data only. It does not give medical
 * advice or dosing recommendations.
 *
 *   allergen     : a molecular allergen (IUIS-style name, e.g. "Alt a 1") with
 *                  its species, size, habitat and season. The CLAUDE.md table
 *                  is available as a preset.
 *   formulation  : a SLIT tablet design draft over registered allergens, with a
 *                  standardization unit (JAU / SQ-U), build-up weeks and
 *                  maintenance years (ranges from the stated design target).
 *   observation  : a safety observation for a formulation, graded on the WAO
 *                  scale. The design target is "Grade 1–2 local reaction, no
 *                  systemic anaphylaxis"; an observation outside it flags the
 *                  formulation.
 */
import type { LocalStore } from "../local-store.js";
import { getOne, idSlug, isNonEmpty, listAll, nowISO, put } from "./records.js";

export const ALLERGEN = "cloud.itonami.apps.moldAllergy.allergen";
export const FORMULATION = "cloud.itonami.apps.moldAllergy.formulation";
export const OBSERVATION = "cloud.itonami.apps.moldAllergy.safetyObservation";
export const UNITS = ["JAU", "SQ-U"] as const;
export const SEASONS = ["perennial", "summer-autumn", "other"] as const;
export type Unit = (typeof UNITS)[number];
export type Season = (typeof SEASONS)[number];

export interface Allergen { allergenId: string; species: string; kDa?: number; habitat?: string; season: Season; createdAt: string }
export interface Formulation {
  formulationId: string; allergenIds: string[]; unit: Unit; maintenanceDose: number; buildUpWeeks: number; maintenanceYears: number;
  form: string; status: "draft" | "flagged"; createdAt: string; flaggedBy?: string[];
}
export interface Observation { observationId: string; formulationId: string; waoGrade: number; systemic: boolean; note: string; observedAt: string; withinTarget: boolean }

export interface RegisterAllergenInput { allergenId: string; species: string; season: Season; kDa?: number; habitat?: string }
export interface ListAllergensInput { species?: string }
export interface DesignFormulationInput { formulationId: string; allergenIds: string[]; unit: Unit; maintenanceDose: number; buildUpWeeks: number; maintenanceYears: number }
export interface RecordSafetyObservationInput { observationId: string; formulationId: string; waoGrade: number; systemic: boolean; note?: string }
export interface GetFormulationInput { formulationId: string }

/** From CLAUDE.md "対象アレルゲン". kDa only where the table states it. */
export const PRESET_ALLERGENS: Array<Omit<RegisterAllergenInput, "kDa"> & { kDa?: number }> = [
  { allergenId: "Alt a 1", species: "Alternaria alternata", kDa: 15, habitat: "屋外 / 土壌 / 穀類", season: "summer-autumn" },
  { allergenId: "Alt a 6", species: "Alternaria alternata", habitat: "屋外 / 土壌 / 穀類", season: "summer-autumn" },
  { allergenId: "Cla h 8", species: "Cladosporium herbarum", habitat: "屋外 / 葉面", season: "summer-autumn" },
  { allergenId: "Cla h 9", species: "Cladosporium herbarum", habitat: "屋外 / 葉面", season: "summer-autumn" },
  { allergenId: "Asp f 1", species: "Aspergillus fumigatus", habitat: "室内 / 堆肥 / エアコン", season: "perennial" },
  { allergenId: "Asp f 2", species: "Aspergillus fumigatus", habitat: "室内 / 堆肥 / エアコン", season: "perennial" },
  { allergenId: "Asp f 3", species: "Aspergillus fumigatus", habitat: "室内 / 堆肥 / エアコン", season: "perennial" },
  { allergenId: "Pen ch 13", species: "Penicillium chrysogenum", habitat: "室内 / 食品", season: "perennial" },
  { allergenId: "Pen ch 18", species: "Penicillium chrysogenum", habitat: "室内 / 食品", season: "perennial" },
  { allergenId: "Mala s 1", species: "Malassezia spp.", habitat: "皮膚 / 頭皮", season: "perennial" },
  { allergenId: "Mala s 11", species: "Malassezia spp.", habitat: "皮膚 / 頭皮", season: "perennial" },
  { allergenId: "Tri r 2", species: "Trichophyton spp.", habitat: "皮膚 / 爪", season: "perennial" },
  { allergenId: "Tri r 4", species: "Trichophyton spp.", habitat: "皮膚 / 爪", season: "perennial" },
];

const aKey = (id: string) => `allergen-${idSlug(id)}`;
const fKey = (id: string) => `formulation-${idSlug(id)}`;

export async function registerAllergen(e: LocalStore, input: RegisterAllergenInput) {
  if (!isNonEmpty(input.allergenId) || !isNonEmpty(input.species)) return { status: "rejected", error: "missingRequiredFields" };
  if (!SEASONS.includes(input.season)) return { status: "rejected", error: "unknownSeason" };
  if (input.kDa !== undefined && !(typeof input.kDa === "number" && input.kDa > 0 && input.kDa < 1000)) return { status: "rejected", error: "kDaOutOfRange" };
  if (await getOne(e, ALLERGEN, aKey(input.allergenId))) return { status: "alreadyExists" };
  const a: Allergen = { allergenId: input.allergenId.trim(), species: input.species.trim(), kDa: input.kDa, habitat: input.habitat, season: input.season, createdAt: nowISO() };
  return { status: "registered", allergenUri: await put(e, ALLERGEN, aKey(input.allergenId), a) };
}

export async function loadPresetAllergens(e: LocalStore) {
  const results = [];
  for (const a of PRESET_ALLERGENS) results.push({ allergenId: a.allergenId, status: (await registerAllergen(e, a)).status });
  return { status: "ok", results, registered: results.filter((r) => r.status === "registered").length };
}

export async function listAllergens(e: LocalStore, input: ListAllergensInput = {}) {
  const items = (await listAll<Allergen>(e, ALLERGEN)).map((r) => r.value).filter((a) => !input.species || a.species === input.species);
  return { items, total: items.length, species: [...new Set(items.map((a) => a.species))].sort() };
}

export async function designFormulation(e: LocalStore, input: DesignFormulationInput) {
  if (!isNonEmpty(input.formulationId)) return { status: "rejected", error: "missingRequiredFields" };
  const ids = Array.isArray(input.allergenIds) ? [...new Set(input.allergenIds.map((s) => s.trim()).filter(Boolean))] : [];
  if (ids.length === 0) return { status: "rejected", error: "noAllergens" };
  const missing = [];
  for (const id of ids) if (!(await getOne(e, ALLERGEN, aKey(id)))) missing.push(id);
  if (missing.length) return { status: "rejected", error: "allergenNotFound", missing };
  if (!UNITS.includes(input.unit)) return { status: "rejected", error: "unknownUnit" };
  if (!(typeof input.maintenanceDose === "number" && input.maintenanceDose > 0)) return { status: "rejected", error: "doseMustBePositive" };
  if (!Number.isInteger(input.buildUpWeeks) || input.buildUpWeeks < 1 || input.buildUpWeeks > 16) return { status: "rejected", error: "buildUpWeeksOutOfRange" };
  if (!Number.isInteger(input.maintenanceYears) || input.maintenanceYears < 1 || input.maintenanceYears > 5) return { status: "rejected", error: "maintenanceYearsOutOfRange" };
  if (await getOne(e, FORMULATION, fKey(input.formulationId))) return { status: "alreadyExists" };
  const f: Formulation = { formulationId: input.formulationId, allergenIds: ids, unit: input.unit, maintenanceDose: input.maintenanceDose, buildUpWeeks: input.buildUpWeeks, maintenanceYears: input.maintenanceYears, form: "freeze-dried orodispersible tablet", status: "draft", createdAt: nowISO() };
  return { status: "designed", formulationUri: await put(e, FORMULATION, fKey(input.formulationId), f) };
}

export async function recordSafetyObservation(e: LocalStore, input: RecordSafetyObservationInput) {
  if (!isNonEmpty(input.observationId) || !isNonEmpty(input.formulationId)) return { status: "rejected", error: "missingRequiredFields" };
  if (!Number.isInteger(input.waoGrade) || input.waoGrade < 0 || input.waoGrade > 5) return { status: "rejected", error: "waoGradeOutOfRange" };
  const f = await getOne<Formulation>(e, FORMULATION, fKey(input.formulationId));
  if (!f) return { status: "rejected", error: "formulationNotFound" };
  if (await getOne(e, OBSERVATION, `obs-${idSlug(input.observationId)}`)) return { status: "alreadyExists" };
  const systemic = input.systemic === true;
  const withinTarget = !systemic && input.waoGrade <= 2;
  const o: Observation = { observationId: input.observationId, formulationId: input.formulationId, waoGrade: input.waoGrade, systemic, note: input.note ?? "", observedAt: nowISO(), withinTarget };
  await put(e, OBSERVATION, `obs-${idSlug(input.observationId)}`, o);
  if (!withinTarget) await put(e, FORMULATION, fKey(input.formulationId), { ...f.value, status: "flagged", flaggedBy: [...(f.value.flaggedBy ?? []), input.observationId] });
  return { status: "recorded", withinTarget, formulationStatus: withinTarget ? f.value.status : "flagged" };
}

export async function getFormulation(e: LocalStore, input: GetFormulationInput) {
  const f = isNonEmpty(input.formulationId) ? await getOne<Formulation>(e, FORMULATION, fKey(input.formulationId)) : null;
  if (!f) return { status: "notFound" };
  const obs = (await listAll<Observation>(e, OBSERVATION)).map((r) => r.value).filter((o) => o.formulationId === input.formulationId);
  return {
    status: "ok", formulation: f.value,
    safety: { observations: obs.length, maxWaoGrade: obs.length ? Math.max(...obs.map((o) => o.waoGrade)) : null, systemic: obs.filter((o) => o.systemic).length, outsideTarget: obs.filter((o) => !o.withinTarget).length },
  };
}

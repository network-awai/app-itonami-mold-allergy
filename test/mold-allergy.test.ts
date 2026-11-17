import { describe, it, beforeEach } from "node:test";
import { expect } from "./expect.mjs";
import { LocalStore } from "../dist/local-store.js";
import { registerAllergen, loadPresetAllergens, listAllergens, designFormulation, recordSafetyObservation, getFormulation, PRESET_ALLERGENS } from "../dist/domain/index.js";

describe("mold-allergy research notebook", () => {
  let e: any;
  beforeEach(() => { e = new LocalStore({ did: "did:web:mold-allergy.itonami.cloud" }); });

  it("loads the preset allergen table once", async () => {
    const r = await loadPresetAllergens(e);
    expect(r.registered).toBe(PRESET_ALLERGENS.length);
    expect((await loadPresetAllergens(e)).registered).toBe(0);
    const all = await listAllergens(e);
    expect(all.species.length).toBe(6);
    expect((await listAllergens(e, { species: "Aspergillus fumigatus" })).total).toBe(3);
  });

  it("validates allergens", async () => {
    expect((await registerAllergen(e, { allergenId: "X 1", species: "S", season: "winter" as any })).error).toBe("unknownSeason");
    expect((await registerAllergen(e, { allergenId: "X 1", species: "S", season: "other", kDa: -2 })).error).toBe("kDaOutOfRange");
    expect((await registerAllergen(e, { allergenId: "X 1", species: "S", season: "other" })).status).toBe("registered");
  });

  it("designs formulations only over registered allergens and within the stated ranges", async () => {
    await loadPresetAllergens(e);
    const base = { formulationId: "f1", allergenIds: ["Alt a 1"], unit: "JAU" as const, maintenanceDose: 2000, buildUpWeeks: 1, maintenanceYears: 3 };
    expect((await designFormulation(e, { ...base, allergenIds: ["Alt a 1", "Nope 9"] })).missing.join()).toBe("Nope 9");
    expect((await designFormulation(e, { ...base, allergenIds: [] })).error).toBe("noAllergens");
    expect((await designFormulation(e, { ...base, unit: "mg" as any })).error).toBe("unknownUnit");
    expect((await designFormulation(e, { ...base, buildUpWeeks: 0 })).error).toBe("buildUpWeeksOutOfRange");
    expect((await designFormulation(e, { ...base, maintenanceYears: 9 })).error).toBe("maintenanceYearsOutOfRange");
    expect((await designFormulation(e, base)).status).toBe("designed");
    expect((await designFormulation(e, base)).status).toBe("alreadyExists");
  });

  it("flags a formulation when an observation falls outside the safety target", async () => {
    await loadPresetAllergens(e);
    await designFormulation(e, { formulationId: "f1", allergenIds: ["Asp f 1", "Asp f 2"], unit: "SQ-U", maintenanceDose: 12, buildUpWeeks: 1, maintenanceYears: 3 });
    expect((await recordSafetyObservation(e, { observationId: "o1", formulationId: "f1", waoGrade: 1, systemic: false })).withinTarget).toBe(true);
    expect((await getFormulation(e, { formulationId: "f1" })).formulation.status).toBe("draft");
    expect((await recordSafetyObservation(e, { observationId: "o2", formulationId: "f1", waoGrade: 2, systemic: true })).formulationStatus).toBe("flagged");
    expect((await recordSafetyObservation(e, { observationId: "o3", formulationId: "f1", waoGrade: 7, systemic: false })).error).toBe("waoGradeOutOfRange");
    const g = await getFormulation(e, { formulationId: "f1" });
    expect(g.safety.observations).toBe(2);
    expect(g.safety.systemic).toBe(1);
    expect(g.safety.outsideTarget).toBe(1);
    expect(g.formulation.flaggedBy.join()).toBe("o2");
  });
});

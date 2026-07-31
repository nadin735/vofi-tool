import { describe, it, expect, beforeEach } from "vitest";

function installStorage(blocked = false) {
  const m = new Map();
  globalThis.window = {
    addEventListener() {}, removeEventListener() {},
    localStorage: blocked ? { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } } : { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) },
  };
  return m;
}

const inputs = (n = 3) => ({
  n, habenMode: "flat", habenFlat: 2, haben: Array(n - 1).fill(""), sollMode: "flat", sollFlat: 7, soll: Array(n - 1).fill(""),
  basePayments: Array(n).fill(100), creditLimit: "", withdrawalMode: "fixed", withdrawalFixed: Array(n).fill(0), withdrawalStart: "", withdrawalRatios: "",
  projects: [{ id: 1, name: "P", cashflows: [-100, 80, 80].slice(0, n) }],
});

async function fresh(blocked) {
  const m = installStorage(blocked);
  const mod = await import("../src/store.js?" + Math.random());
  return { m, ...mod };
}

describe("saved calculations", () => {
  it("saves, renames, duplicates and deletes", async () => {
    const s = await fresh();
    const a = s.upsertPlan({ id: null, name: "Alpha", inputs: inputs() });
    expect(s.listPlans()).toHaveLength(1);
    s.renamePlan(a.id, "Beta");
    expect(s.getPlan(a.id).name).toBe("Beta");
    const d = s.duplicatePlan(a.id, "(copy)");
    expect(d.name).toBe("Beta (copy)");
    expect(s.listPlans()).toHaveLength(2);
    s.upsertPlan({ id: a.id, name: "Beta", inputs: { ...inputs(), habenFlat: 5 } });
    expect(s.listPlans()).toHaveLength(2);
    expect(s.getPlan(a.id).inputs.habenFlat).toBe(5);
    s.deletePlan(a.id);
    expect(s.listPlans().map((p) => p.name)).toEqual(["Beta (copy)"]);
  });
  it("keeps the data across a fresh load of the module (reload)", async () => {
    const s = await fresh();
    s.upsertPlan({ id: null, name: "Keep me", inputs: inputs() });
    const raw = s.m.get("vofi.v1.plans");
    const again = installStorage(); again.set("vofi.v1.plans", raw);
    const s2 = await import("../src/store.js?" + Math.random());
    expect(s2.listPlans().map((p) => p.name)).toEqual(["Keep me"]);
  });
  it("rejects broken records and imports a backup", async () => {
    const s = await fresh();
    expect(s.upsertPlan({ id: null, name: "x", inputs: { n: 1 } })).toBeNull();
    s.upsertPlan({ id: null, name: "One", inputs: inputs() });
    const backup = s.exportBackup();
    const t = await fresh();
    const r = t.importBackup(backup);
    expect(r).toMatchObject({ added: 1, error: false });
    expect(t.importBackup("nonsense").error).toBe(true);
  });
  it("falls back to memory when storage is blocked", async () => {
    const s = await fresh(true);
    s.upsertPlan({ id: null, name: "Temp", inputs: inputs() });
    expect(s.isPersistent()).toBe(false);
    expect(s.listPlans()).toHaveLength(1);
  });
});

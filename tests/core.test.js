import { describe, it, expect } from "vitest";
import { computeAccountBalance, buildResults, rankResults, validateInputs, emptyInputs, runScenarios, applyScenario, summarize } from "../src/core.js";

// Independent, straight-line version of the VOFI rule, written separately from core.js.
function reference(n, base, wd, cf, hab, sol) {
  let prev = null; const out = [];
  for (let i = 0; i < n; i++) {
    const interest = prev === null ? 0 : prev * ((prev >= 0 ? hab[i - 1] : sol[i - 1]) / 100);
    const bal = (prev ?? 0) + interest + base[i] + cf[i] - wd[i];
    out.push(bal); prev = bal;
  }
  return out;
}

const demo = () => ({
  ...emptyInputs(5), habenFlat: 3, sollFlat: 8, basePayments: [1000, 200, 200, 200, 200], creditLimit: "500",
  withdrawalFixed: [0, 150, 150, 150, 150],
  projects: [
    { id: 1, name: "A", cashflows: [-1200, 400, 400, 400, 400] },
    { id: 2, name: "B", cashflows: [-800, 100, 300, 400, 500] },
  ],
});

describe("VOFI formula", () => {
  it("matches the independent reference on random inputs", () => {
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < 200; k++) {
      const n = 2 + Math.floor(rnd() * 9);
      const arr = (m) => Array.from({ length: n }, () => Math.round((rnd() - 0.4) * m));
      const base = arr(1000), wd = arr(300).map(Math.abs), cf = arr(2000);
      const hab = Array.from({ length: n - 1 }, () => rnd() * 6), sol = Array.from({ length: n - 1 }, () => 6 + rnd() * 8);
      const got = computeAccountBalance(n, base, wd, cf, hab, sol, "").balance;
      const want = reference(n, base, wd, cf, hab, sol);
      got.forEach((v, i) => expect(v).toBeCloseTo(want[i], 8));
    }
  });
  it("gives the known demo values", () => {
    const r = buildResults(demo());
    const a = r.computed[0];
    expect(a.balance[0]).toBeCloseTo(-200, 8);
    expect(a.balance[1]).toBeCloseTo(-200 * 1.08 + 200 + 400 - 150, 8);
    expect(r.computed.find((x) => x.baseline).balance[0]).toBe(1000);
  });
  it("marks a plan below the credit limit as not feasible and ranks feasible first", () => {
    const inp = demo(); inp.creditLimit = "100";
    const r = buildResults(inp); const ranked = rankResults(r, 5);
    expect(r.computed[0].feasible).toBe(false);
    expect(ranked[ranked.length - 1].feasible).toBe(false);
    expect(ranked[0].feasible).toBe(true);
  });
  it("validates empty input", () => {
    expect(validateInputs(emptyInputs(5)).length).toBeGreaterThan(0);
    expect(validateInputs(demo())).toEqual([]);
  });
});

describe("scenarios", () => {
  it("realistic equals the plain calculation", () => {
    const inp = demo();
    const s = runScenarios(inp);
    expect(s.realistic.results.computed.map((r) => r.balance)).toEqual(buildResults(inp).computed.map((r) => r.balance));
  });
  it("optimistic is never worse than pessimistic for the same option", () => {
    const s = runScenarios(demo(), { cfPct: 10, ratePp: 1 });
    s.optimistic.results.computed.forEach((r, i) => {
      expect(r.balance[4]).toBeGreaterThanOrEqual(s.pessimistic.results.computed[i].balance[4]);
    });
  });
  it("only touches positive cash flows and clamps rates at zero", () => {
    const inp = { ...demo(), habenFlat: 0.5 };
    const out = applyScenario(inp, { cfPct: 10, dHaben: -1, dSoll: 0 });
    expect(out.habenFlat).toBe(0);
    expect(out.projects[0].cashflows[0]).toBe(-1200);
    expect(out.projects[0].cashflows[1]).toBeCloseTo(440, 8);
  });
  it("summarize returns null for incomplete inputs", () => {
    expect(summarize(emptyInputs(5))).toBeNull();
    expect(summarize(demo()).best).toBeTruthy();
  });
});

// Pure VOFI logic. No React, no browser APIs, so it can be tested and reused by the
// saved calculations, the scenario analysis and the PDF export.
// computeAccountBalance, resize and parseRatios are moved here unchanged from VofiTool.jsx.

// Fill/trim an array to a fixed length
export function resize(arr, len, fill = "") {
  const out = arr.slice(0, len);
  while (out.length < len) out.push(fill);
  return out;
}

// Turn "1, 1.2, 1.3" into [1, 1.2, 1.3]
export function parseRatios(str) {
  return str.split(",").map((s) => parseFloat(s.trim().replace(",", ".")) || 0);
}

// Core VOFI calculation: builds the account balance period by period
export function computeAccountBalance(n, basePayments, withdrawals, cashflows, haben, soll, creditLimit) {
  const balance = [];
  for (let t = 0; t < n; t++) {
    if (t === 0) {
      balance[0] = (basePayments[0] || 0) + (cashflows[0] || 0) - (withdrawals[0] || 0);
    } else {
      const prevBalance = balance[t - 1];
      const rate = prevBalance >= 0 ? haben[t - 1] : soll[t - 1];
      const interest = prevBalance * ((rate || 0) / 100);
      balance[t] = prevBalance + interest + (basePayments[t] || 0) + (cashflows[t] || 0) - (withdrawals[t] || 0);
    }
  }
  const lowestPoint = Math.min(...balance);
  const limit = creditLimit === "" ? null : Number(creditLimit);
  const feasible = limit === null ? true : lowestPoint >= -limit;
  return { balance, feasible, lowestPoint };
}

// ---------- Input snapshot ----------
// One plain object holds everything the form needs. It is what gets saved.
export function emptyInputs(n = 5) {
  return {
    n,
    habenMode: "flat", habenFlat: "", haben: resize([], n - 1),
    sollMode: "flat", sollFlat: "", soll: resize([], n - 1),
    basePayments: resize([], n),
    creditLimit: "",
    withdrawalMode: "fixed", withdrawalFixed: resize([], n), withdrawalStart: "", withdrawalRatios: "",
    projects: [
      { id: 1, name: "", cashflows: resize([], n) },
      { id: 2, name: "", cashflows: resize([], n) },
    ],
  };
}

// Same checks as the form had before. `tr` translates a message, English is the key.
export function validateInputs(inp, tr = (s) => s) {
  const problems = [];
  const blank = (v) => v === "" || v === null || v === undefined || Number.isNaN(Number(v));
  if (inp.habenMode === "flat" ? blank(inp.habenFlat) : inp.haben.some(blank)) problems.push(tr("Enter the deposit rate") + (inp.habenMode === "flat" ? "" : tr(" for every period")) + tr(". 0 is allowed."));
  if (inp.sollMode === "flat" ? blank(inp.sollFlat) : inp.soll.some(blank)) problems.push(tr("Enter the borrowing rate") + (inp.sollMode === "flat" ? "" : tr(" for every period")) + tr(". 0 is allowed."));
  if (inp.withdrawalMode === "ratio" && (blank(inp.withdrawalStart) || inp.withdrawalRatios.trim() === "")) {
    problems.push(tr("Withdrawals by ratio need a start value and at least one ratio, or switch to fixed values."));
  }
  if (inp.creditLimit !== "" && (Number.isNaN(Number(inp.creditLimit)) || Number(inp.creditLimit) < 0)) problems.push(tr("The credit limit must be a number of 0 or more, or empty for unlimited."));
  if (!inp.projects.some((p) => p.cashflows.some((v) => v !== "" && !Number.isNaN(Number(v))))) problems.push(tr("Enter cash flows for at least one project."));
  return problems;
}

// The calculation step of the form, as a pure function. Same expressions as before.
export function buildResults(inp, tr = (s) => s) {
  const { n, habenMode, habenFlat, haben, sollMode, sollFlat, soll, basePayments, creditLimit, withdrawalMode, withdrawalFixed, withdrawalStart, withdrawalRatios, projects } = inp;
  let withdrawals;
  if (withdrawalMode === "fixed") {
    withdrawals = withdrawalFixed;
  } else {
    const ratios = resize(parseRatios(withdrawalRatios), n, 0);
    withdrawals = ratios.map((r) => Number(withdrawalStart) * r);
  }
  const h = habenMode === "flat" ? Array(n - 1).fill(Number(habenFlat)) : haben;
  const s = sollMode === "flat" ? Array(n - 1).fill(Number(sollFlat)) : soll;

  const allOptions = [
    ...projects.map((p, i) => ({ name: p.name.trim() || `${tr("Project")} ${String.fromCharCode(65 + i)}`, cashflows: p.cashflows })),
    { name: tr("Do nothing"), cashflows: resize([], n), baseline: true },
  ];
  const computed = allOptions.map((p) => ({
    name: p.name,
    baseline: !!p.baseline,
    cashflows: p.cashflows,
    ...computeAccountBalance(n, basePayments, withdrawals, p.cashflows, h, s, creditLimit),
  }));
  return { withdrawals, computed, rates: { haben: h, soll: s } };
}

// Feasible options first, then by final balance. Same order as the results table.
export function rankResults(results, n) {
  return results.computed.slice().sort((a, b) => (b.feasible - a.feasible) || b.balance[n - 1] - a.balance[n - 1]);
}

// ---------- Scenarios ----------
// A scenario changes two things and leaves the formulas alone:
// the positive cash flows of the projects (revenues, in percent) and both interest rates (percentage points).
export const SCENARIO_DEFAULTS = { cfPct: 10, ratePp: 1 };

export function applyScenario(inp, { cfPct = 0, dHaben = 0, dSoll = 0 }) {
  const f = 1 + (Number(cfPct) || 0) / 100;
  const shift = (d) => (v) => (v === "" || Number.isNaN(Number(v)) ? v : Math.max(0, Number(v) + d));
  return {
    ...inp,
    habenFlat: shift(dHaben)(inp.habenFlat),
    haben: inp.haben.map(shift(dHaben)),
    sollFlat: shift(dSoll)(inp.sollFlat),
    soll: inp.soll.map(shift(dSoll)),
    projects: inp.projects.map((p) => ({
      ...p,
      cashflows: p.cashflows.map((v) => (v !== "" && Number(v) > 0 ? Number(v) * f : v)),
    })),
  };
}

// Optimistic: higher revenues, higher deposit rate, lower borrowing rate.
// Pessimistic: the opposite. Realistic: the inputs as entered.
export function scenarioInputs(inp, params = SCENARIO_DEFAULTS) {
  const cfPct = Number(params.cfPct) || 0;
  const pp = Number(params.ratePp) || 0;
  return {
    optimistic: applyScenario(inp, { cfPct, dHaben: pp, dSoll: -pp }),
    realistic: inp,
    pessimistic: applyScenario(inp, { cfPct: -cfPct, dHaben: -pp, dSoll: pp }),
  };
}

export function runScenarios(inp, params = SCENARIO_DEFAULTS, tr = (s) => s) {
  const sc = scenarioInputs(inp, params);
  const out = {};
  for (const key of ["optimistic", "realistic", "pessimistic"]) {
    const res = buildResults(sc[key], tr);
    const ranked = rankResults(res, inp.n);
    out[key] = { inputs: sc[key], results: res, ranked, winner: ranked[0] };
  }
  return out;
}

// ---------- Saved calculations ----------
export function summarize(inp, tr = (s) => s) {
  if (validateInputs(inp, tr).length) return null;
  const res = buildResults(inp, tr);
  const ranked = rankResults(res, inp.n);
  const base = res.computed.find((r) => r.baseline);
  const best = ranked[0];
  return {
    results: res, ranked, best, base,
    bestFinal: best.feasible ? best.balance[inp.n - 1] : null,
    baseFinal: base.balance[inp.n - 1],
    gain: best.feasible && !best.baseline ? best.balance[inp.n - 1] - base.balance[inp.n - 1] : 0,
  };
}

// Words and numbers for the results overview, the print view and the PDF.
// Everything is derived from the calculation, nothing is invented.
import { t, tf, fmt, L, getLang } from "./i18n.js";
import { buildResults, rankResults, runScenarios } from "./core.js";

export function analyse(inputs) {
  const n = inputs.n;
  const results = buildResults(inputs, t);
  const ranked = rankResults(results, n);
  const base = results.computed.find((r) => r.baseline);
  const best = ranked[0];
  const final = (r) => r.balance[n - 1];
  const second = ranked.find((r) => r !== best && r.feasible) || null;
  const bestFeasible = best.feasible ? best : null;
  return { n, results, ranked, base, best, bestFeasible, second, final };
}

export const periodOfMin = (r) => r.balance.indexOf(Math.min(...r.balance));
const signed = (v) => (v >= 0 ? "+" : "") + fmt(v);
export { signed };

// Sentences for the conclusion. `scen` is the output of runScenarios, optional.
export function conclusion(a, inputs, scen) {
  const { n, best, base, second, final, ranked } = a;
  const lines = [];
  if (!best.feasible) {
    lines.push(t("Every option goes below the credit limit. See the status column for the lowest balances."));
  } else if (best.baseline) {
    lines.push(tf("No project beats \"Do nothing\". The best option is to keep the account as it is, with a final balance of {final} after {n} periods.", { final: fmt(final(best)), n }));
  } else {
    lines.push(tf("The best alternative is {name} with a final balance of {final} after {n} periods.", { name: best.name, final: fmt(final(best)), n }));
    lines.push(tf("Compared with \"Do nothing\" this is a difference of {diff}.", { diff: signed(final(best) - final(base)) }));
    if (second && !second.baseline) lines.push(tf("The lead over the second best option, {name}, is {diff}.", { name: second.name, diff: fmt(final(best) - final(second)) }));
  }
  const bad = ranked.filter((r) => !r.feasible);
  if (bad.length) {
    lines.push(tf("{k} option(s) break the credit limit of {limit}: {names}.", { k: bad.length, limit: inputs.creditLimit === "" ? "–" : fmt(Number(inputs.creditLimit)), names: bad.map((r) => r.name).join(", ") }));
  }
  if (best.feasible) {
    const low = Math.min(...best.balance);
    if (low < 0) lines.push(tf("The lowest balance of the best option is {low} in period {p}. The account is overdrawn then and costs the borrowing rate.", { low: fmt(low), p: periodOfMin(best) }));
    else lines.push(tf("The account of the best option never goes negative. The lowest balance is {low}.", { low: fmt(low) }));
  }
  if (scen) {
    const names = ["pessimistic", "realistic", "optimistic"].map((k) => scen[k].winner);
    const same = names.every((w) => w.name === names[0].name && w.feasible === names[0].feasible);
    lines.push(same
      ? tf("In all three scenarios the best option stays {name}.", { name: names[0].feasible ? names[0].name : t("No feasible option") })
      : tf("The best option changes with the scenario: pessimistic {a}, realistic {b}, optimistic {c}.", { a: names[0].feasible ? names[0].name : "–", b: names[1].feasible ? names[1].name : "–", c: names[2].feasible ? names[2].name : "–" }));
  }
  lines.push(t("The results follow from your inputs. No guarantee."));
  return lines;
}

// CSV with the same layout the form always produced (semicolon, German decimals in German).
export function csvText(a, withdrawals, lang) {
  const n2 = a.results.computed[0] ? a.results.computed[0].balance.length : a.n;
  const esc = (x) => `"${String(x).replace(/"/g, '""')}"`;
  const num = (x) => (lang === "de" ? String(x).replace(".", ",") : String(x));
  const rows = [["", ...Array.from({ length: n2 }, (_, i) => `t=${i}`)]];
  a.results.computed.forEach((r) => {
    rows.push([r.name, ...Array(n2).fill("")]);
    rows.push([t("Cash flow"), ...r.cashflows.map((c) => num(Number(c) || 0))]);
    rows.push([t("Withdrawal"), ...withdrawals.map((c) => num(Number(c) || 0))]);
    rows.push([t("Balance"), ...r.balance.map((c) => num(Math.round(c * 100) / 100))]);
  });
  return "﻿" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
}

export function saveBlob(text, type, filename) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export const fileSlug = (s) => (s || "vofi").toLowerCase().replace(/[^a-z0-9äöüß]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "vofi";
export const dateStamp = (d = new Date()) => d.toISOString().slice(0, 10);
export const dateTimeText = (ms, lang) => new Date(ms).toLocaleString(lang === "de" ? "de-DE" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

export const fmtRate = (v) => (v === "" || v === null || v === undefined || Number.isNaN(Number(v)) ? "–" : Number(v).toLocaleString(getLang() === "de" ? "de-DE" : "en-US", { maximumFractionDigits: 4 }) + " %");
const list = (arr, f = fmt) => arr.map((v) => f(Number(v) || 0)).join("; ");

// Input parameters as label/value rows, used on screen and in the PDF.
export function parameterRows(inputs, results) {
  const { n, habenMode, habenFlat, haben, sollMode, sollFlat, soll, creditLimit, basePayments, withdrawalMode, withdrawalStart, withdrawalRatios } = inputs;
  const rows = [];
  rows.push([t("Time horizon"), `${n} ${t("periods")} (t=0 … t=${n - 1})`]);
  rows.push([t("Deposit rate"), habenMode === "flat" ? fmtRate(habenFlat) : haben.map((v) => fmtRate(v)).join("; ")]);
  rows.push([t("Borrowing rate"), sollMode === "flat" ? fmtRate(sollFlat) : soll.map((v) => fmtRate(v)).join("; ")]);
  rows.push([t("Credit limit"), creditLimit === "" ? t("unlimited") : fmt(Number(creditLimit))]);
  rows.push([t("Base payments"), list(basePayments)]);
  rows.push([t("Withdrawals"), list(results.withdrawals) + (withdrawalMode === "ratio" ? `  (${fmt(Number(withdrawalStart) || 0)} × ${withdrawalRatios})` : "")]);
  return rows;
}

export const scenarioLabel = (k) => ({ optimistic: t("Optimistic"), realistic: t("Realistic"), pessimistic: t("Pessimistic") }[k]);
export function scenarioAssumption(k, params) {
  const c = Number(params.cfPct) || 0, p = Number(params.ratePp) || 0;
  const num = (v) => v.toLocaleString(getLang() === "de" ? "de-DE" : "en-US", { maximumFractionDigits: 2 });
  if (k === "realistic") return L("Inputs as entered", "Eingaben wie erfasst");
  const s = k === "optimistic" ? 1 : -1;
  return L(
    `Revenues ${s * c >= 0 ? "+" : "−"}${num(Math.abs(c))} %, deposit rate ${s * p >= 0 ? "+" : "−"}${num(Math.abs(p))} pp, borrowing rate ${-s * p >= 0 ? "+" : "−"}${num(Math.abs(p))} pp`,
    `Einzahlungen ${s * c >= 0 ? "+" : "−"}${num(Math.abs(c))} %, Habenzins ${s * p >= 0 ? "+" : "−"}${num(Math.abs(p))} Prozentpunkte, Sollzins ${-s * p >= 0 ? "+" : "−"}${num(Math.abs(p))} Prozentpunkte`
  );
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

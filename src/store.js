// Saved calculations. They live in this browser's localStorage and nowhere else.
// If the browser blocks storage (private window), the list lives in memory for the session
// and `isPersistent()` tells the UI so it can warn.
import { useSyncExternalStore } from "react";
import { resize } from "./core.js";

const KEY = "vofi.v1.plans";
const LANG_KEY = "vofi.v1.lang";
const listeners = new Set();
let memory = null;      // used when localStorage is not usable
let cache = null;       // parsed list, invalidated on every write or storage event
let version = 0;
let persistent = true;

function newId() {
  try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch { /* fall through */ }
  return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const isNum = (v) => v === "" || (typeof v === "number" && Number.isFinite(v));
const isNumArr = (a, len) => Array.isArray(a) && a.length === len && a.every(isNum);

// Accepts only records that look exactly like what the form produces.
export function validInputs(x) {
  if (!x || typeof x !== "object") return false;
  const n = x.n;
  if (!Number.isInteger(n) || n < 2 || n > 10) return false;
  if (!["flat", "perPeriod"].includes(x.habenMode) || !["flat", "perPeriod"].includes(x.sollMode)) return false;
  if (!["fixed", "ratio"].includes(x.withdrawalMode)) return false;
  if (!isNum(x.habenFlat) || !isNum(x.sollFlat) || !isNum(x.withdrawalStart)) return false;
  if (!isNumArr(x.haben, n - 1) || !isNumArr(x.soll, n - 1) || !isNumArr(x.basePayments, n) || !isNumArr(x.withdrawalFixed, n)) return false;
  if (typeof x.creditLimit !== "string" && !isNum(x.creditLimit)) return false;
  if (typeof x.withdrawalRatios !== "string") return false;
  if (!Array.isArray(x.projects) || x.projects.length > 20) return false;
  return x.projects.every((p) => p && typeof p.name === "string" && isNumArr(p.cashflows, n));
}

function clean(x) {
  return {
    n: x.n, habenMode: x.habenMode, habenFlat: x.habenFlat, haben: x.haben.slice(),
    sollMode: x.sollMode, sollFlat: x.sollFlat, soll: x.soll.slice(),
    basePayments: x.basePayments.slice(), creditLimit: x.creditLimit,
    withdrawalMode: x.withdrawalMode, withdrawalFixed: x.withdrawalFixed.slice(),
    withdrawalStart: x.withdrawalStart, withdrawalRatios: x.withdrawalRatios,
    projects: x.projects.map((p, i) => ({ id: p.id ?? i + 1, name: p.name, cashflows: p.cashflows.slice() })),
  };
}

function read() {
  if (cache) return cache;
  let raw = null;
  try { raw = window.localStorage.getItem(KEY); persistent = true; } catch { persistent = false; raw = memory; }
  let list = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      list = parsed.filter((r) => r && typeof r.id === "string" && typeof r.name === "string" && validInputs(r.inputs))
        .map((r) => ({ id: r.id, name: r.name, createdAt: Number(r.createdAt) || 0, updatedAt: Number(r.updatedAt) || 0, inputs: clean(r.inputs) }));
    }
  } catch { list = []; }
  cache = list;
  return list;
}

function write(list) {
  const json = JSON.stringify(list);
  let ok = true;
  try { window.localStorage.setItem(KEY, json); persistent = true; }
  catch { persistent = false; memory = json; ok = false; }
  cache = null; version++;
  listeners.forEach((l) => l());
  return ok || !persistent; // the in-memory copy still holds it for this session
}

export const isPersistent = () => { read(); return persistent; };
export const listPlans = () => read().slice().sort((a, b) => b.updatedAt - a.updatedAt);
export const getPlan = (id) => read().find((p) => p.id === id) || null;

// Create (id null or unknown) or update. Returns the stored record.
export function upsertPlan({ id, name, inputs }) {
  if (!validInputs(inputs)) return null;
  const list = read().slice();
  const now = Date.now();
  const i = id ? list.findIndex((p) => p.id === id) : -1;
  let rec;
  if (i >= 0) { rec = { ...list[i], name, inputs: clean(inputs), updatedAt: now }; list[i] = rec; }
  else { rec = { id: newId(), name, inputs: clean(inputs), createdAt: now, updatedAt: now }; list.push(rec); }
  write(list);
  return rec;
}

export function renamePlan(id, name) {
  const list = read().map((p) => (p.id === id ? { ...p, name, updatedAt: Date.now() } : p));
  write(list);
}

export function duplicatePlan(id, suffix) {
  const p = getPlan(id);
  if (!p) return null;
  const now = Date.now();
  const rec = { id: newId(), name: `${p.name} ${suffix}`, inputs: clean(p.inputs), createdAt: now, updatedAt: now };
  write([...read(), rec]);
  return rec;
}

export function deletePlan(id) { write(read().filter((p) => p.id !== id)); }

// Backup as a file, and the way back in.
export function exportBackup() {
  return JSON.stringify({ app: "vofi-tool", version: 1, exportedAt: new Date().toISOString(), plans: read() }, null, 2);
}

export function importBackup(text) {
  let data;
  try { data = JSON.parse(text); } catch { return { added: 0, skipped: 0, error: true }; }
  const incoming = Array.isArray(data) ? data : data && Array.isArray(data.plans) ? data.plans : null;
  if (!incoming) return { added: 0, skipped: 0, error: true };
  const list = read().slice();
  let added = 0, skipped = 0;
  for (const r of incoming) {
    if (!r || typeof r.name !== "string" || !validInputs(r.inputs)) { skipped++; continue; }
    const taken = list.some((p) => p.id === r.id);
    const now = Date.now();
    list.push({ id: typeof r.id === "string" && !taken ? r.id : newId(), name: r.name, inputs: clean(r.inputs), createdAt: Number(r.createdAt) || now, updatedAt: Number(r.updatedAt) || now });
    added++;
  }
  if (added) write(list);
  return { added, skipped, error: false };
}

// Language choice, remembered on this device only.
export function loadLang() { try { const v = window.localStorage.getItem(LANG_KEY); return v === "de" || v === "en" ? v : null; } catch { return null; } }
export function saveLang(l) { try { window.localStorage.setItem(LANG_KEY, l); } catch { /* not remembered */ } }

function subscribe(fn) {
  listeners.add(fn);
  const onStorage = (e) => { if (e.key === KEY || e.key === null) { cache = null; version++; fn(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(fn); window.removeEventListener("storage", onStorage); };
}

// React hook: the list, newest first, re-rendering when anything changes (also from another tab).
export function usePlans() {
  useSyncExternalStore(subscribe, () => version, () => 0);
  return listPlans();
}

export { resize };

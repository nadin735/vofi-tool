import React, { useEffect, useState } from "react";

// Colors
const gold = "#A9832A";
const line = "#E9DFC4";
const ink = "#23262E";
const muted = "#8A8578";
const green = "#2F8F5B";
const red = "#B23A32";

// ---------- Default starting values, also used by the Reset button ----------
const DEFAULTS = {
  n: 5,
  habenMode: "flat",
  habenFlat: "",
  haben: ["", "", "", ""],
  sollMode: "flat",
  sollFlat: "",
  soll: ["", "", "", ""],
  basePayments: ["", "", "", "", ""],
  creditLimit: "",
  withdrawalMode: "fixed",
  withdrawalFixed: ["", "", "", "", ""],
  withdrawalStart: "",
  withdrawalRatios: "",
  projects: [
    { id: 1, name: "", cashflows: ["", "", "", "", ""] },
    { id: 2, name: "", cashflows: ["", "", "", "", ""] },
  ],
};

// Fictional example values for "Try with demo data". Illustrative only.
const DEMO = {
  n: 5,
  habenFlat: 3,
  sollFlat: 8,
  basePayments: [1000, 200, 200, 200, 200],
  creditLimit: "500",
  withdrawalFixed: [0, 150, 150, 150, 150],
  projects: [
    { id: 1, name: "Demo: Machine A", cashflows: [-1200, 400, 400, 400, 400] },
    { id: 2, name: "Demo: Machine B", cashflows: [-800, 100, 300, 400, 500] },
  ],
};

// Impressum (§ 5 DDG, § 18 Abs. 1 MStV) and privacy notice, German on purpose.
const OWNER = {
  name: "Nadin Okil",
  street: "[Straße und Hausnummer]", // TODO: ladungsfähige Anschrift
  city: "[PLZ Ort]",
  email: "nadinokil.contact@gmail.com",
};

function LegalModal({ page, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const h = { fontSize: 15, margin: "16px 0 4px" };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
      <div role="dialog" aria-modal="true" lang="de" onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", color: ink, borderRadius: 8, maxWidth: 640, width: "100%", maxHeight: "85vh", overflowY: "auto", padding: 22, fontSize: 14, lineHeight: 1.6 }}>
        {page === "imprint" ? (
          <>
            <h2 style={{ marginTop: 0, fontSize: 20 }}>Impressum</h2>
            <p>Angaben gemäß § 5 DDG und § 18 Abs. 1 MStV</p>
            <p>{OWNER.name}<br />{OWNER.street}<br />{OWNER.city}</p>
            <p>E-Mail: <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a></p>
            <p>Privates, nicht-kommerzielles Projekt ohne Werbung, Einnahmen oder Benutzerkonten. Berechnungen ohne Gewähr.</p>
          </>
        ) : (
          <>
            <h2 style={{ marginTop: 0, fontSize: 20 }}>Datenschutzerklärung</h2>
            <h3 style={h}>Verantwortlich</h3>
            <p>{OWNER.name}, {OWNER.street}, {OWNER.city}, {OWNER.email}</p>
            <h3 style={h}>Hosting</h3>
            <p>Die Seite wird von Vercel Inc. (340 S Lemon Ave #4133, Walnut, CA 91789, USA) ausgeliefert. Dabei verarbeitet Vercel technisch notwendige Daten (IP-Adresse, Zeitpunkt, angeforderte Datei, Browser-Kennung) in Server-Logs (Art. 6 Abs. 1 lit. f DSGVO). Vercel ist unter dem EU-US Data Privacy Framework zertifiziert.</p>
            <h3 style={h}>Ihre Eingaben</h3>
            <p>Es gibt kein Login, keine Datenbank, keine Cookies und kein Tracking. Ihre Eingaben existieren nur auf der geöffneten Seite, werden nicht gespeichert oder übertragen und sind nach Schließen oder Neuladen weg.</p>
            <h3 style={h}>Ihre Rechte</h3>
            <p>Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch und Datenübertragbarkeit (Art. 15–21 DSGVO) sowie Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO).</p>
          </>
        )}
        <button type="button" onClick={onClose} autoFocus
          style={{ marginTop: 12, padding: "6px 14px", background: gold, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
          Schließen
        </button>
      </div>
    </div>
  );
}

// Shows only the row format, no numbers, so it never gets mistaken for real data
const EXAMPLE_TEXT =
  "Base payments ...\n" +
  "Investment A ...\n" +
  "Investment B ...\n" +
  "Deposit rate ...\n" +
  "Borrowing rate ...\n" +
  "Credit limit ...";

// Fill/trim an array to a fixed length
function resize(arr, len, fill = "") {
  const out = arr.slice(0, len);
  while (out.length < len) out.push(fill);
  return out;
}

// Turn "1, 1.2, 1.3" into [1, 1.2, 1.3]
function parseRatios(str) {
  return str.split(",").map((s) => parseFloat(s.trim().replace(",", ".")) || 0);
}

// Turn a single pasted number like "-1.000" or "150,5" or "7%" into a plain float.
// German tables use a dot as a thousands separator and a comma as the decimal point.
function parseGermanNumber(token) {
  let s = token.replace("%", "").trim();
  if (s === "" || s === "-") return null;
  const thousands = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/;
  if (thousands.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(",", ".");
  }
  const value = parseFloat(s);
  return Number.isNaN(value) ? null : value;
}

// Splits a pasted line into a label (e.g. "Investment A") and its numeric values.
function splitLabelAndNumbers(line) {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  let firstNumberIndex = tokens.length;
  for (let i = 0; i < tokens.length; i++) {
    if (parseGermanNumber(tokens[i]) !== null) {
      firstNumberIndex = i;
      break;
    }
  }
  const label = tokens.slice(0, firstNumberIndex).join(" ");
  const numbers = tokens.slice(firstNumberIndex).map(parseGermanNumber).filter((v) => v !== null);
  return { label, numbers };
}

// Reads a block of pasted table text (copied from a PDF or worksheet) and turns it
// into the structured data the tool needs: base payments, rates, credit limit,
// withdrawals and one row per project.
function parseImportText(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const found = { basePayments: null, haben: null, soll: null, withdrawals: null, creditLimit: null, projects: [] };

  for (const line of lines) {
    const { label, numbers } = splitLabelAndNumbers(line);
    if (numbers.length === 0) continue;
    const key = label.toLowerCase();

    if (key.includes("zeitpunkt") || key === "t") continue;
    if (key.includes("basiszahlung") || key.includes("base payment")) { found.basePayments = numbers; continue; }
    if (key.includes("habenzins") || key.includes("deposit")) { found.haben = numbers; continue; }
    if (key.includes("sollzins") || key.includes("borrow")) { found.soll = numbers; continue; }
    if (key.includes("entnahme") || key.includes("withdrawal")) { found.withdrawals = numbers; continue; }
    if (key.includes("kreditlimit") || key.includes("credit limit") || key.includes("kredit")) {
      found.creditLimit = String(numbers[0]);
      continue;
    }
    // Anything else with a label and numbers is treated as a project row
    found.projects.push({ id: Date.now() + Math.random(), name: label || `Project ${found.projects.length + 1}`, cashflows: numbers });
  }
  return found;
}

// Core VOFI calculation: builds the account balance period by period
function computeAccountBalance(n, basePayments, withdrawals, cashflows, haben, soll, creditLimit) {
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

function fmt(x) {
  return x.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

// Builds a plain text report from the results
function buildReportText(n, ranked, computed, withdrawals) {
  const lines = [];
  lines.push("VOFI results");
  lines.push("");
  lines.push("Ranking");
  ranked.forEach((r) => {
    lines.push(`${r.name}\t${r.feasible ? fmt(r.balance[n - 1]) : "n/a"}\t${r.feasible ? "feasible" : `credit limit exceeded (${fmt(r.lowestPoint)})`}`);
  });
  lines.push("");
  computed.forEach((r) => {
    lines.push(r.name);
    lines.push("t\t" + r.balance.map((_, i) => i).join("\t"));
    lines.push("Cash flow\t" + r.cashflows.map(fmt).join("\t"));
    lines.push("Withdrawal\t" + withdrawals.map(fmt).join("\t"));
    lines.push("Balance\t" + r.balance.map(fmt).join("\t"));
    lines.push("");
  });
  return lines.join("\n");
}

function NumberRow({ values, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {values.map((v, i) => (
        <input
          key={i}
          type="number"
          value={v}
          onChange={(e) => {
            const copy = values.slice();
            copy[i] = e.target.value === "" ? "" : Number(e.target.value);
            onChange(copy);
          }}
          style={{ width: 60, padding: 4, border: `1px solid ${line}`, borderRadius: 4, textAlign: "center" }}
        />
      ))}
    </div>
  );
}

function ModeToggle({ value, onChange, options }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: "3px 10px",
            borderRadius: 6,
            border: `1px solid ${line}`,
            background: value === o.value ? gold : "transparent",
            color: value === o.value ? "#fff" : muted,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function VofiToolSimple() {
  const [n, setN] = useState(DEFAULTS.n);
  const [nInput, setNInput] = useState("");

  const [habenMode, setHabenMode] = useState(DEFAULTS.habenMode);
  const [habenFlat, setHabenFlat] = useState(DEFAULTS.habenFlat);
  const [haben, setHaben] = useState(resize(DEFAULTS.haben, DEFAULTS.n - 1));

  const [sollMode, setSollMode] = useState(DEFAULTS.sollMode);
  const [sollFlat, setSollFlat] = useState(DEFAULTS.sollFlat);
  const [soll, setSoll] = useState(resize(DEFAULTS.soll, DEFAULTS.n - 1));

  const [basePayments, setBasePayments] = useState(resize(DEFAULTS.basePayments, DEFAULTS.n));
  const [creditLimit, setCreditLimit] = useState(DEFAULTS.creditLimit);

  const [withdrawalMode, setWithdrawalMode] = useState(DEFAULTS.withdrawalMode);
  const [withdrawalFixed, setWithdrawalFixed] = useState(resize(DEFAULTS.withdrawalFixed, DEFAULTS.n));
  const [withdrawalStart, setWithdrawalStart] = useState(DEFAULTS.withdrawalStart);
  const [withdrawalRatios, setWithdrawalRatios] = useState(DEFAULTS.withdrawalRatios);

  const [projects, setProjects] = useState(
    DEFAULTS.projects.map((p) => ({ ...p, cashflows: resize(p.cashflows, DEFAULTS.n) }))
  );

  const [results, setResults] = useState(null);
  const [importText, setImportText] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [reportText, setReportText] = useState(null);
  const [copyMessage, setCopyMessage] = useState("");
  const [legalPage, setLegalPage] = useState(null);

  function changePeriods(newN) {
    const nn = Math.max(2, Math.min(10, newN));
    setN(nn);
    setBasePayments(resize(basePayments, nn));
    setHaben(resize(haben, nn - 1));
    setSoll(resize(soll, nn - 1));
    setWithdrawalFixed(resize(withdrawalFixed, nn));
    setProjects(projects.map((p) => ({ ...p, cashflows: resize(p.cashflows, nn) })));
  }

  function addProject() {
    setProjects([...projects, { id: Date.now(), name: "", cashflows: resize([], n) }]);
  }
  function removeProject(id) {
    setProjects(projects.filter((p) => p.id !== id));
  }

  function resetAll() {
    setN(DEFAULTS.n);
    setNInput("");
    setHabenMode(DEFAULTS.habenMode);
    setHabenFlat(DEFAULTS.habenFlat);
    setHaben(resize(DEFAULTS.haben, DEFAULTS.n - 1));
    setSollMode(DEFAULTS.sollMode);
    setSollFlat(DEFAULTS.sollFlat);
    setSoll(resize(DEFAULTS.soll, DEFAULTS.n - 1));
    setBasePayments(resize(DEFAULTS.basePayments, DEFAULTS.n));
    setCreditLimit(DEFAULTS.creditLimit);
    setWithdrawalMode(DEFAULTS.withdrawalMode);
    setWithdrawalFixed(resize(DEFAULTS.withdrawalFixed, DEFAULTS.n));
    setWithdrawalStart(DEFAULTS.withdrawalStart);
    setWithdrawalRatios(DEFAULTS.withdrawalRatios);
    setProjects(DEFAULTS.projects.map((p) => ({ ...p, cashflows: resize(p.cashflows, DEFAULTS.n) })));
    setResults(null);
    setImportText("");
    setImportMessage("");
    setReportText(null);
    setCopyMessage("");
  }

  function loadDemo() {
    resetAll();
    setN(DEMO.n);
    setNInput(String(DEMO.n));
    setHabenMode("flat");
    setHabenFlat(DEMO.habenFlat);
    setSollMode("flat");
    setSollFlat(DEMO.sollFlat);
    setBasePayments(DEMO.basePayments.slice());
    setCreditLimit(DEMO.creditLimit);
    setWithdrawalMode("fixed");
    setWithdrawalFixed(DEMO.withdrawalFixed.slice());
    setProjects(DEMO.projects.map((p) => ({ ...p, cashflows: p.cashflows.slice() })));
  }

  // Every visit starts empty: nothing is stored, and if the browser restores
  // this page from its back/forward cache (which would keep the previous
  // person's inputs), reload it fresh.
  useEffect(() => {
    const onShow = (e) => { if (e.persisted) window.location.reload(); };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  function runImport() {
    const found = parseImportText(importText);
    const newN = Math.max(
      found.basePayments?.length || 0,
      ...found.projects.map((p) => p.cashflows.length),
      found.withdrawals?.length || 0,
      2
    );
    setN(newN);
    setNInput(String(newN));
    if (found.basePayments) setBasePayments(resize(found.basePayments, newN));
    if (found.haben) { setHaben(resize(found.haben, newN - 1)); setHabenMode("perPeriod"); }
    if (found.soll) { setSoll(resize(found.soll, newN - 1)); setSollMode("perPeriod"); }
    if (found.withdrawals) { setWithdrawalFixed(resize(found.withdrawals, newN)); setWithdrawalMode("fixed"); }
    if (found.creditLimit !== null) setCreditLimit(found.creditLimit);
    if (found.projects.length) {
      setProjects(found.projects.map((p) => ({ ...p, cashflows: resize(p.cashflows, newN) })));
    }
    const parts = [];
    if (found.basePayments) parts.push("base payments");
    if (found.haben) parts.push("deposit rate");
    if (found.soll) parts.push("borrowing rate");
    if (found.withdrawals) parts.push("withdrawals");
    if (found.creditLimit !== null) parts.push("credit limit");
    if (found.projects.length) parts.push(`${found.projects.length} project row(s)`);
    setImportMessage(parts.length ? `Filled in: ${parts.join(", ")}.` : "No recognizable rows found, check the format above.");
  }

  function calculate() {
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
      ...projects.map((p, i) => ({ name: p.name.trim() || `Project ${String.fromCharCode(65 + i)}`, cashflows: p.cashflows })),
      { name: "Do nothing", cashflows: resize([], n) },
    ];
    const computed = allOptions.map((p) => ({
      name: p.name,
      cashflows: p.cashflows,
      ...computeAccountBalance(n, basePayments, withdrawals, p.cashflows, h, s, creditLimit),
    }));
    setResults({ withdrawals, computed });
    setReportText(null);
  }

  const ranked = results
    ? results.computed.slice().sort((a, b) => (b.feasible - a.feasible) || b.balance[n - 1] - a.balance[n - 1])
    : [];
  const winner = ranked[0];

  function showSavePanel() {
    setReportText(buildReportText(n, ranked, results.computed, results.withdrawals));
    setCopyMessage("");
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopyMessage("Copied to clipboard.");
    } catch {
      setCopyMessage("Could not copy automatically, please select the text above and copy it manually.");
    }
  }

  return (
    <form autoComplete="off" onSubmit={(e) => e.preventDefault()} style={{ fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "0 auto", padding: 24, color: ink }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4, gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Complete Financial Plan (VOFI)</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={loadDemo}
            style={{ padding: "6px 14px", border: `1px solid ${gold}`, borderRadius: 6, background: "#fff", color: gold, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            Try with demo data – no login
          </button>
          <button
            type="button"
            onClick={resetAll}
            style={{ padding: "6px 14px", border: `1px solid ${line}`, borderRadius: 6, background: "#fff", color: muted, cursor: "pointer", fontSize: 13 }}
          >
            Reset
          </button>
        </div>
      </div>
      <p style={{ color: muted, marginTop: 4, marginBottom: 20 }}>
        Compares investment projects under a deposit rate and a borrowing rate, and ranks them by final account balance.
      </p>

      {/* Import */}
      <div style={{ border: `1px solid ${line}`, borderRadius: 8, padding: 16, marginBottom: 20, background: "#FCFAF4" }}>
        <div style={{ color: muted, fontSize: 13, marginBottom: 6 }}>
          Paste a table copied from a PDF or worksheet, one row per line, label first, then the numbers. Format:
        </div>
        <div style={{ fontSize: 12, color: muted, marginBottom: 8, fontFamily: "ui-monospace, monospace", whiteSpace: "pre-line" }}>
          {EXAMPLE_TEXT}
        </div>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={5}
          style={{ width: "100%", padding: 8, border: `1px solid ${line}`, borderRadius: 6, fontFamily: "ui-monospace, monospace", fontSize: 13 }}
          placeholder="Paste your table here..."
        />
        <button
          type="button"
          onClick={runImport}
          style={{ marginTop: 8, padding: "6px 14px", background: gold, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
        >
          Fill in from text
        </button>
        {importMessage && <div style={{ marginTop: 8, fontSize: 13, color: green }}>{importMessage}</div>}
      </div>

      {/* Settings */}
      <div style={{ border: `1px solid ${line}`, borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <label>
            Time horizon (periods)
            <input type="number" value={nInput} placeholder="5"
              onChange={(e) => { setNInput(e.target.value); if (e.target.value !== "") changePeriods(Number(e.target.value)); }}
              style={{ display: "block", width: 80, padding: 4, marginTop: 4 }} />
          </label>
          <label>
            Credit limit (leave empty for unlimited)
            <input value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)}
              style={{ display: "block", width: 100, padding: 4, marginTop: 4 }} />
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ color: muted, fontSize: 13, marginBottom: 4 }}>Base payments per period</div>
          <NumberRow values={basePayments} onChange={setBasePayments} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ color: muted, fontSize: 13, marginBottom: 4 }}>Deposit rate in %</div>
          <ModeToggle value={habenMode} onChange={setHabenMode} options={[{ value: "flat", label: "Flat" }, { value: "perPeriod", label: "Per period" }]} />
          {habenMode === "flat" ? (
            <input type="number" value={habenFlat} onChange={(e) => setHabenFlat(Number(e.target.value))} style={{ width: 80, padding: 4 }} />
          ) : (
            <NumberRow values={haben} onChange={setHaben} />
          )}
        </div>

        <div>
          <div style={{ color: muted, fontSize: 13, marginBottom: 4 }}>Borrowing rate in %</div>
          <ModeToggle value={sollMode} onChange={setSollMode} options={[{ value: "flat", label: "Flat" }, { value: "perPeriod", label: "Per period" }]} />
          {sollMode === "flat" ? (
            <input type="number" value={sollFlat} onChange={(e) => setSollFlat(Number(e.target.value))} style={{ width: 80, padding: 4 }} />
          ) : (
            <NumberRow values={soll} onChange={setSoll} />
          )}
        </div>
      </div>

      {/* Withdrawals */}
      <div style={{ border: `1px solid ${line}`, borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ color: muted, fontSize: 13, marginBottom: 6 }}>Withdrawals</div>
        <ModeToggle value={withdrawalMode} onChange={setWithdrawalMode} options={[{ value: "ratio", label: "Ratio" }, { value: "fixed", label: "Fixed values" }]} />
        {withdrawalMode === "fixed" ? (
          <NumberRow values={withdrawalFixed} onChange={setWithdrawalFixed} />
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <input type="number" value={withdrawalStart} onChange={(e) => setWithdrawalStart(e.target.value)}
              style={{ width: 80, padding: 4 }} placeholder="start" />
            <input value={withdrawalRatios} onChange={(e) => setWithdrawalRatios(e.target.value)}
              style={{ flex: 1, padding: 4 }} placeholder="1, 1.2, 1.3 ..." />
          </div>
        )}
      </div>

      {/* Projects */}
      <div style={{ border: `1px solid ${line}`, borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ color: muted, fontSize: 13, marginBottom: 8 }}>Projects, cash flows per period</div>
        {projects.map((p) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <input
              value={p.name}
              placeholder={`Project ${String.fromCharCode(65 + projects.indexOf(p))}`}
              onChange={(e) => setProjects(projects.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))}
              style={{ width: 120, padding: 4, fontWeight: 600, border: `1px solid ${line}`, borderRadius: 4 }}
            />
            <NumberRow
              values={p.cashflows}
              onChange={(cf) => setProjects(projects.map((x) => (x.id === p.id ? { ...x, cashflows: cf } : x)))}
            />
            <button type="button" onClick={() => removeProject(p.id)} style={{ color: red, border: "none", background: "none", cursor: "pointer" }}>
              remove
            </button>
          </div>
        ))}
        <button type="button" onClick={addProject} style={{ padding: "6px 12px", border: `1px dashed ${gold}`, borderRadius: 6, background: "none", color: gold, cursor: "pointer" }}>
          + Add project
        </button>
      </div>

      <button type="button" onClick={calculate} style={{ padding: "10px 20px", background: gold, color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>
        Calculate
      </button>

      {/* Results */}
      {results && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
            <div style={{ border: `2px solid ${gold}`, borderRadius: 8, padding: 16, flex: 1 }}>
              <div style={{ fontSize: 13, color: muted, textTransform: "uppercase" }}>Best alternative</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{winner.name}</div>
              <div>Final balance: <strong style={{ color: green }}>{fmt(winner.balance[n - 1])}</strong></div>
            </div>
            <button
              type="button"
              onClick={showSavePanel}
              style={{ padding: "10px 16px", border: `1px solid ${gold}`, borderRadius: 6, background: "#fff", color: gold, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}
            >
              Save results
            </button>
          </div>

          {reportText !== null && (
            <div style={{ border: `1px solid ${line}`, borderRadius: 8, padding: 16, marginBottom: 20, background: "#FCFAF4" }}>
              <div style={{ fontSize: 13, color: muted, marginBottom: 8 }}>
                Tap inside the box, select all, and copy, or use the button below.
              </div>
              <textarea
                readOnly
                value={reportText}
                rows={8}
                onFocus={(e) => e.target.select()}
                style={{ width: "100%", padding: 8, border: `1px solid ${line}`, borderRadius: 6, fontFamily: "ui-monospace, monospace", fontSize: 12 }}
              />
              <button
                type="button"
                onClick={copyReport}
                style={{ marginTop: 8, padding: "6px 14px", background: gold, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
              >
                Copy to clipboard
              </button>
              {copyMessage && <div style={{ marginTop: 8, fontSize: 13, color: muted }}>{copyMessage}</div>}
            </div>
          )}

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${line}` }}>
                <th style={{ textAlign: "left", padding: 8 }}>Option</th>
                <th style={{ textAlign: "right", padding: 8 }}>Final balance</th>
                <th style={{ textAlign: "left", padding: 8 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r) => (
                <tr key={r.name} style={{ borderBottom: `1px solid ${line}` }}>
                  <td style={{ padding: 8 }}>{r.name}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>{r.feasible ? fmt(r.balance[n - 1]) : "n/a"}</td>
                  <td style={{ padding: 8, color: r.feasible ? green : red }}>
                    {r.feasible ? "feasible" : `credit limit exceeded (${fmt(r.lowestPoint)})`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {results.computed.map((r) => (
            <div key={r.name} style={{ marginBottom: 20, overflowX: "auto" }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{r.name}</div>
              <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "2px 8px", color: muted }}>t</td>
                    {r.balance.map((_, i) => <td key={i} style={{ padding: "2px 8px", textAlign: "right", color: muted }}>{i}</td>)}
                  </tr>
                  <tr>
                    <td style={{ padding: "2px 8px" }}>Cash flow</td>
                    {r.cashflows.map((v, i) => <td key={i} style={{ padding: "2px 8px", textAlign: "right" }}>{fmt(v)}</td>)}
                  </tr>
                  <tr>
                    <td style={{ padding: "2px 8px" }}>Withdrawal</td>
                    {results.withdrawals.map((v, i) => <td key={i} style={{ padding: "2px 8px", textAlign: "right" }}>{fmt(v)}</td>)}
                  </tr>
                  <tr>
                    <td style={{ padding: "2px 8px", fontWeight: 600 }}>Balance</td>
                    {r.balance.map((v, i) => (
                      <td key={i} style={{ padding: "2px 8px", textAlign: "right", color: v < 0 ? red : green, fontWeight: 600 }}>
                        {fmt(v)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      <footer style={{ marginTop: 40, paddingTop: 16, borderTop: `1px solid ${line}`, fontSize: 13, color: muted, display: "flex", flexWrap: "wrap", gap: "8px 18px", justifyContent: "space-between" }}>
        <span>Nothing is saved: your inputs exist only on this page and are gone when you close or reload it. Everyone starts with an empty form.</span>
        <span style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setLegalPage("imprint")} style={{ background: "none", border: "none", padding: 0, color: muted, textDecoration: "underline", cursor: "pointer", fontSize: 13 }}>Impressum</button>
          <button type="button" onClick={() => setLegalPage("privacy")} style={{ background: "none", border: "none", padding: 0, color: muted, textDecoration: "underline", cursor: "pointer", fontSize: 13 }}>Datenschutz</button>
          <span>made by Nadin Okil</span>
        </span>
      </footer>
      {legalPage && <LegalModal page={legalPage} onClose={() => setLegalPage(null)} />}
    </form>
  );
}

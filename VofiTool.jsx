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
const exampleText = () =>
  [t("Base payments") + " ...", t("Investment A") + " ...", t("Investment B") + " ...", t("Deposit rate") + " ...", t("Borrowing rate") + " ...", t("Credit limit") + " ..."].join("\n");

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

// Interface texts: English is the key, German the translation. Legal pages are German only, on purpose.
const DE = {
 "Base payments": "Basiszahlungen", "Investment A": "Investition A", "Investment B": "Investition B", "Deposit rate": "Habenzins", "Borrowing rate": "Sollzins", "Credit limit": "Kreditlimit",
 "Account balance over time": "Kontostand im Zeitverlauf",
 "Period t": "Periode t",
 "Complete Financial Plan (VOFI)": "Vollständiger Finanzplan (VOFI)",
 "Try with demo data – no login": "Mit Beispieldaten testen, ohne Anmeldung",
 "Reset": "Zurücksetzen",
 "Compares investment projects under a deposit rate and a borrowing rate, and ranks them by final account balance.": "Vergleicht Investitionsprojekte bei einem Habenzins und einem Sollzins und ordnet sie nach dem Endkontostand.",
 "How it works": "So funktioniert es",
 "Enter the time horizon, your base payments, the deposit rate (interest on a positive balance) and the borrowing rate (interest on a negative balance).": "Geben Sie den Zeithorizont, Ihre Basiszahlungen, den Habenzins (Zins auf ein positives Guthaben) und den Sollzins (Zins auf einen negativen Kontostand) ein.",
 "Add each project's cash flows. Period 0 is usually the investment, so it is negative.": "Tragen Sie die Zahlungen jedes Projekts ein. Periode 0 ist meist die Investition und damit negativ.",
 "Press Calculate. The account is built period by period: the balance of the previous period earns the deposit rate if it is positive and costs the borrowing rate if it is negative. Then the period's payments, cash flows and withdrawals are added.": "Klicken Sie auf Berechnen. Das Konto wird Periode für Periode aufgebaut: Der Stand der Vorperiode wird mit dem Habenzins verzinst, wenn er positiv ist, und mit dem Sollzins belastet, wenn er negativ ist. Danach kommen Basiszahlungen, Zahlungen des Projekts und Entnahmen der Periode hinzu.",
 "Projects are ranked by final balance. A project that breaks the credit limit is marked as not feasible. \"Do nothing\" is the reference.": "Die Projekte werden nach dem Endkontostand geordnet. Ein Projekt, das das Kreditlimit überschreitet, gilt als nicht umsetzbar. „Nichts tun“ ist die Vergleichsbasis.",
 "Guided mode": "Geführter Modus",
 ": one step at a time": ": ein Schritt nach dem anderen",
 "Paste a table copied from a PDF or worksheet, one row per line, label first, then the numbers. Format:": "Fügen Sie eine aus PDF oder Tabelle kopierte Tabelle ein, eine Zeile pro Eintrag, zuerst die Bezeichnung, dann die Zahlen. Format:",
 "Fill in from text": "Aus Text übernehmen",
 "Time horizon (periods)": "Zeithorizont (Perioden)",
 "Credit limit (leave empty for unlimited)": "Kreditlimit (leer lassen für unbegrenzt)",
 "Base payments per period": "Basiszahlungen pro Periode",
 "Deposit rate in %": "Habenzins in %",
 "Borrowing rate in %": "Sollzins in %",
 "Withdrawals": "Entnahmen",
 "Projects, cash flows per period": "Projekte, Zahlungen pro Periode",
 "remove": "entfernen",
 "+ Add project": "+ Projekt hinzufügen",
 "Please check your inputs:": "Bitte prüfen Sie Ihre Eingaben:",
 "Calculate": "Berechnen",
 "Final balance:": "Endkontostand:",
 "Every option goes below the credit limit. See the status column for the lowest balances.": "Jede Option unterschreitet das Kreditlimit. Die niedrigsten Kontostände stehen in der Spalte Status.",
 "Save results": "Ergebnisse speichern",
 "Tap inside the box, select all, and copy, or use the button below.": "Tippen Sie in das Feld, wählen Sie alles aus und kopieren Sie, oder nutzen Sie die Schaltfläche darunter.",
 "Copy to clipboard": "In die Zwischenablage kopieren",
 "Option": "Option",
 "Final balance": "Endkontostand",
 "vs. Do nothing": "gegenüber Nichts tun",
 "Lowest balance": "Niedrigster Stand",
 "Status": "Status",
 "Cash flow": "Zahlung",
 "Withdrawal": "Entnahme",
 "Balance": "Kontostand",
 "Back": "Zurück",
 "Next": "Weiter",
 "Nothing is saved: your inputs exist only on this page and are gone when you close or reload it. Everyone starts with an empty form.": "Nichts wird gespeichert: Ihre Eingaben existieren nur auf dieser Seite und sind nach dem Schließen oder Neuladen weg. Jeder startet mit einem leeren Formular.",
 "made by Nadin Okil": "von Nadin Okil",
 "Best alternative": "Beste Alternative",
 "No feasible option": "Keine umsetzbare Option",
 "Basics": "Grundlagen",
 "Projects": "Projekte",
 "Result": "Ergebnis",
 "Steps": "Schritte",
 "Set the time horizon, credit limit, base payments and the two interest rates.": "Legen Sie Zeithorizont, Kreditlimit, Basiszahlungen und die beiden Zinssätze fest.",
 "Optional: money you take out of the account each period.": "Optional: Geld, das Sie in jeder Periode vom Konto entnehmen.",
 "Enter the cash flows of every project. Period 0 is usually the investment (negative).": "Tragen Sie die Zahlungen jedes Projekts ein. Periode 0 ist meist die Investition (negativ).",
 "Check the inputs, then press Calculate.": "Prüfen Sie die Eingaben und klicken Sie dann auf Berechnen.",
 "Flat": "Gleichbleibend",
 "Per period": "Pro Periode",
 "Ratio": "Verhältnis",
 "Fixed values": "Feste Werte",
 "Paste your table here...": "Tabelle hier einfügen ...",
 "start": "Start",
 "Enter the deposit rate": "Geben Sie den Habenzins ein",
 "Enter the borrowing rate": "Geben Sie den Sollzins ein",
 " for every period": " für jede Periode",
 ". 0 is allowed.": ". 0 ist erlaubt.",
 "Withdrawals by ratio need a start value and at least one ratio, or switch to fixed values.": "Entnahmen nach Verhältnis brauchen einen Startwert und mindestens ein Verhältnis, oder wechseln Sie zu festen Werten.",
 "The credit limit must be a number of 0 or more, or empty for unlimited.": "Das Kreditlimit muss eine Zahl ab 0 sein oder leer für unbegrenzt.",
 "Enter cash flows for at least one project.": "Tragen Sie Zahlungen für mindestens ein Projekt ein.",
 "Copied to clipboard.": "In die Zwischenablage kopiert.",
 "Could not copy automatically, please select the text above and copy it manually.": "Automatisches Kopieren nicht möglich. Markieren Sie den Text oben und kopieren Sie ihn von Hand.",
 "No recognizable rows found, check the format above.": "Keine erkennbaren Zeilen gefunden, prüfen Sie das Format oben.",
 "Filled in": "Übernommen",
 "base payments": "Basiszahlungen",
 "deposit rate": "Habenzins",
 "borrowing rate": "Sollzins",
 "withdrawals": "Entnahmen",
 "credit limit": "Kreditlimit",
 "project row(s)": "Projektzeile(n)",
 "Do nothing": "Nichts tun",
 "Project": "Projekt",
 "VOFI results": "VOFI Ergebnisse",
 "Ranking": "Rangfolge",
 "feasible": "umsetzbar",
 "credit limit exceeded": "Kreditlimit überschritten",
 "n/a": "k. A.",
 "Credit limit ...": "Kreditlimit ...",
 "Language": "Sprache"
};
let LANG = "en";
const t = (s) => (LANG === "de" ? DE[s] ?? s : s);

function fmt(x) {
  return x.toLocaleString(LANG === "de" ? "de-DE" : "en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

// Builds a plain text report from the results
function buildReportText(n, ranked, computed, withdrawals) {
  const lines = [];
  lines.push(t("VOFI results"));
  lines.push("");
  lines.push(t("Ranking"));
  ranked.forEach((r) => {
    lines.push(`${r.name}\t${r.feasible ? fmt(r.balance[n - 1]) : t("n/a")}\t${r.feasible ? t("feasible") : `${t("credit limit exceeded")} (${fmt(r.lowestPoint)})`}`);
  });
  lines.push("");
  computed.forEach((r) => {
    lines.push(r.name);
    lines.push("t\t" + r.balance.map((_, i) => i).join("\t"));
    lines.push(t("Cash flow") + "\t" + r.cashflows.map(fmt).join("\t"));
    lines.push(t("Withdrawal") + "\t" + withdrawals.map(fmt).join("\t"));
    lines.push(t("Balance") + "\t" + r.balance.map(fmt).join("\t"));
    lines.push("");
  });
  return lines.join("\n");
}

// Line chart of the account balance per option. Plain SVG, no chart library.
const SERIES_COLORS = [gold, "#3F6FB0", green, "#8A5BB0", "#C0762B", "#2A8C94"];
function BalanceChart({ computed, n }) {
  const W = 720, H = 300, L = 64, R = 16, T = 16, B = 40;
  const all = computed.flatMap((r) => r.balance);
  let lo = Math.min(0, ...all), hi = Math.max(0, ...all);
  if (hi === lo) hi = lo + 1;
  // Round axis steps (1, 2, 5 times a power of ten) instead of arbitrary values.
  const rough = (hi - lo) / 4, mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((v) => v >= rough);
  lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
  const x = (t) => L + (n === 1 ? 0 : (t / (n - 1)) * (W - L - R));
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + step * i);
  let color = 0;
  const lines = computed.map((r) => ({ r, c: r.baseline ? muted : SERIES_COLORS[color++ % SERIES_COLORS.length] }));
  const summary = `Account balance over ${n} periods. ` + computed.map((r) => `${r.name}: ${fmt(r.balance[0])} at t0, ${fmt(r.balance[n - 1])} at t${n - 1}`).join("; ") + ".";
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{t("Account balance over time")}</div>
      <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} style={{ width: "100%", minWidth: 560, height: "auto", display: "block", border: `1px solid ${line}`, borderRadius: 8, background: "#fff" }}>
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={line} />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill={muted}>{v.toLocaleString("en-US", { maximumFractionDigits: 0 })}</text>
          </g>
        ))}
        <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke={ink} strokeWidth="1" />
        {Array.from({ length: n }, (_, t) => (
          <text key={t} x={x(t)} y={H - B + 18} textAnchor="middle" fontSize="11" fill={muted}>{t}</text>
        ))}
        <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" fontSize="11" fill={muted}>{t("Period t")}</text>
        {lines.map(({ r, c }) => (
          <g key={r.name}>
            <polyline fill="none" stroke={c} strokeWidth={r.baseline ? 1.75 : 2.5} strokeDasharray={r.baseline ? "5 4" : undefined} opacity={r.feasible ? 1 : 0.55} points={r.balance.map((v, t) => `${x(t)},${y(v)}`).join(" ")} />
            {r.balance.map((v, t) => <circle key={t} cx={x(t)} cy={y(v)} r="3" fill={c} />)}
          </g>
        ))}
      </svg>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 8, fontSize: 13 }}>
        {lines.map(({ r, c }) => (
          <span key={r.name} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg width="22" height="8" aria-hidden="true"><line x1="0" x2="22" y1="4" y2="4" stroke={c} strokeWidth="3" strokeDasharray={r.baseline ? "5 3" : undefined} /></svg>
            {r.name}{r.feasible ? "" : ` (${t("credit limit exceeded")})`}
          </span>
        ))}
      </div>
    </div>
  );
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
  const [errors, setErrors] = useState([]);
  const [importText, setImportText] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [reportText, setReportText] = useState(null);
  const [copyMessage, setCopyMessage] = useState("");
  const [legalPage, setLegalPage] = useState(null);
  const [lang, setLang] = useState(() => (typeof navigator !== "undefined" && /^de/i.test(navigator.language || "") ? "de" : "en"));
  LANG = lang;
  const [guided, setGuided] = useState(false);
  const [step, setStep] = useState(1);
  const vis = (k) => (!guided || step === k ? undefined : { display: "none" });
  const STEP_NAMES = [t("Basics"), t("Withdrawals"), t("Projects"), t("Result")];

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
    setErrors([]);
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
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
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
    // A single rate in the pasted table is a flat rate for every period.
    if (found.haben) {
      if (found.haben.length === 1) { setHabenFlat(found.haben[0]); setHabenMode("flat"); }
      else { setHaben(resize(found.haben, newN - 1)); setHabenMode("perPeriod"); }
    }
    if (found.soll) {
      if (found.soll.length === 1) { setSollFlat(found.soll[0]); setSollMode("flat"); }
      else { setSoll(resize(found.soll, newN - 1)); setSollMode("perPeriod"); }
    }
    if (found.withdrawals) { setWithdrawalFixed(resize(found.withdrawals, newN)); setWithdrawalMode("fixed"); }
    if (found.creditLimit !== null) setCreditLimit(found.creditLimit);
    if (found.projects.length) {
      setProjects(found.projects.map((p) => ({ ...p, cashflows: resize(p.cashflows, newN) })));
    }
    const parts = [];
    if (found.basePayments) parts.push(t("base payments"));
    if (found.haben) parts.push(t("deposit rate"));
    if (found.soll) parts.push(t("borrowing rate"));
    if (found.withdrawals) parts.push(t("withdrawals"));
    if (found.creditLimit !== null) parts.push(t("credit limit"));
    if (found.projects.length) parts.push(`${found.projects.length} ${t("project row(s)")}`);
    setImportMessage(parts.length ? `${t("Filled in")}: ${parts.join(", ")}.` : t("No recognizable rows found, check the format above."));
  }

  // Checks the inputs before calculating, so an empty form never shows a "best alternative".
  function validate() {
    const problems = [];
    const blank = (v) => v === "" || v === null || v === undefined || Number.isNaN(Number(v));
    if (habenMode === "flat" ? blank(habenFlat) : haben.some(blank)) problems.push(t("Enter the deposit rate") + (habenMode === "flat" ? "" : t(" for every period")) + t(". 0 is allowed."));
    if (sollMode === "flat" ? blank(sollFlat) : soll.some(blank)) problems.push(t("Enter the borrowing rate") + (sollMode === "flat" ? "" : t(" for every period")) + t(". 0 is allowed."));
    if (withdrawalMode === "ratio" && (blank(withdrawalStart) || withdrawalRatios.trim() === "")) {
      problems.push(t("Withdrawals by ratio need a start value and at least one ratio, or switch to fixed values."));
    }
    if (creditLimit !== "" && (Number.isNaN(Number(creditLimit)) || Number(creditLimit) < 0)) problems.push(t("The credit limit must be a number of 0 or more, or empty for unlimited."));
    if (!projects.some((p) => p.cashflows.some((v) => v !== "" && !Number.isNaN(Number(v))))) problems.push(t("Enter cash flows for at least one project."));
    return problems;
  }

  function calculate() {
    const problems = validate();
    setErrors(problems);
    if (problems.length > 0) { setResults(null); setReportText(null); return; }
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
      ...projects.map((p, i) => ({ name: p.name.trim() || `${t("Project")} ${String.fromCharCode(65 + i)}`, cashflows: p.cashflows })),
      { name: t("Do nothing"), cashflows: resize([], n), baseline: true },
    ];
    const computed = allOptions.map((p) => ({
      name: p.name,
      baseline: !!p.baseline,
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
  const baseline = results ? results.computed.find((r) => r.baseline) : null;

  function showSavePanel() {
    setReportText(buildReportText(n, ranked, results.computed, results.withdrawals));
    setCopyMessage("");
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopyMessage(t("Copied to clipboard."));
    } catch {
      setCopyMessage(t("Could not copy automatically, please select the text above and copy it manually."));
    }
  }

  return (
    <form autoComplete="off" onSubmit={(e) => e.preventDefault()} style={{ fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "0 auto", padding: 24, color: ink }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4, gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>{t("Complete Financial Plan (VOFI)")}</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div role="group" aria-label={t("Language")} style={{ display: "flex", border: `1px solid ${line}`, borderRadius: 6, overflow: "hidden" }}>
            {["de", "en"].map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => { setLang(l); document.documentElement.lang = l; }}
                style={{ padding: "6px 10px", border: "none", background: lang === l ? gold : "#fff", color: lang === l ? "#fff" : muted, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{l.toUpperCase()}</button>
            ))}
          </div>
          <button
            type="button"
            onClick={loadDemo}
            style={{ padding: "6px 14px", border: `1px solid ${gold}`, borderRadius: 6, background: "#fff", color: gold, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            {t("Try with demo data – no login")}
          </button>
          <button
            type="button"
            onClick={resetAll}
            style={{ padding: "6px 14px", border: `1px solid ${line}`, borderRadius: 6, background: "#fff", color: muted, cursor: "pointer", fontSize: 13 }}
          >
            {t("Reset")}
          </button>
        </div>
      </div>
      <p style={{ color: muted, marginTop: 4, marginBottom: 20 }}>
        {t("Compares investment projects under a deposit rate and a borrowing rate, and ranks them by final account balance.")}
      </p>
      <details style={{ marginBottom: 20, fontSize: 14, color: ink }}>
        <summary style={{ cursor: "pointer", color: gold, fontWeight: 600 }}>{t("How it works")}</summary>
        <ol style={{ margin: "8px 0 0", paddingLeft: 20, color: muted, lineHeight: 1.6 }}>
          <li>{t("Enter the time horizon, your base payments, the deposit rate (interest on a positive balance) and the borrowing rate (interest on a negative balance).")}</li>
          <li>{t("Add each project's cash flows. Period 0 is usually the investment, so it is negative.")}</li>
          <li>{t("Press Calculate. The account is built period by period: the balance of the previous period earns the deposit rate if it is positive and costs the borrowing rate if it is negative. Then the period's payments, cash flows and withdrawals are added.")}</li>
          <li>{t("Projects are ranked by final balance. A project that breaks the credit limit is marked as not feasible. \"Do nothing\" is the reference.")}</li>
        </ol>
      </details>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={guided} onChange={(e) => { setGuided(e.target.checked); setStep(1); }} />
          <span><strong>{t("Guided mode")}</strong>{t(": one step at a time")}</span>
        </label>
        {guided && (
          <div style={{ marginTop: 10 }}>
            <ol aria-label={t("Steps")} style={{ display: "flex", gap: 8, listStyle: "none", padding: 0, margin: 0, flexWrap: "wrap" }}>
              {STEP_NAMES.map((nm, i) => (
                <li key={nm}>
                  <button type="button" onClick={() => setStep(i + 1)} aria-current={step === i + 1 ? "step" : undefined}
                    style={{ padding: "6px 12px", borderRadius: 999, border: `1px solid ${step === i + 1 ? gold : line}`, background: step === i + 1 ? gold : "#fff", color: step === i + 1 ? "#fff" : ink, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                    {i + 1}. {nm}
                  </button>
                </li>
              ))}
            </ol>
            <p style={{ color: muted, fontSize: 13, margin: "8px 0 0" }}>
              {t(["Set the time horizon, credit limit, base payments and the two interest rates.", "Optional: money you take out of the account each period.", "Enter the cash flows of every project. Period 0 is usually the investment (negative).", "Check the inputs, then press Calculate."][step - 1])}
            </p>
          </div>
        )}
      </div>

<div style={vis(1)}>
      {/* Import */}
      <div style={{ border: `1px solid ${line}`, borderRadius: 8, padding: 16, marginBottom: 20, background: "#FCFAF4" }}>
        <div style={{ color: muted, fontSize: 13, marginBottom: 6 }}>
          {t("Paste a table copied from a PDF or worksheet, one row per line, label first, then the numbers. Format:")}
        </div>
        <div style={{ fontSize: 12, color: muted, marginBottom: 8, fontFamily: "ui-monospace, monospace", whiteSpace: "pre-line" }}>
          {exampleText()}
        </div>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={5}
          style={{ width: "100%", padding: 8, border: `1px solid ${line}`, borderRadius: 6, fontFamily: "ui-monospace, monospace", fontSize: 13 }}
          placeholder={t("Paste your table here...")}
        />
        <button
          type="button"
          onClick={runImport}
          style={{ marginTop: 8, padding: "6px 14px", background: gold, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
        >
          {t("Fill in from text")}
        </button>
        {importMessage && <div style={{ marginTop: 8, fontSize: 13, color: green }}>{importMessage}</div>}
      </div>

      {/* Settings */}
      <div style={{ border: `1px solid ${line}`, borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <label>
            {t("Time horizon (periods)")}
            <input type="number" value={nInput} placeholder="5"
              onChange={(e) => { setNInput(e.target.value); if (e.target.value !== "") changePeriods(Number(e.target.value)); }}
              style={{ display: "block", width: 80, padding: 4, marginTop: 4 }} />
          </label>
          <label>
            {t("Credit limit (leave empty for unlimited)")}
            <input value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)}
              style={{ display: "block", width: 100, padding: 4, marginTop: 4 }} />
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ color: muted, fontSize: 13, marginBottom: 4 }}>{t("Base payments per period")}</div>
          <NumberRow values={basePayments} onChange={setBasePayments} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ color: muted, fontSize: 13, marginBottom: 4 }}>{t("Deposit rate in %")}</div>
          <ModeToggle value={habenMode} onChange={setHabenMode} options={[{ value: "flat", label: t("Flat") }, { value: "perPeriod", label: t("Per period") }]} />
          {habenMode === "flat" ? (
            <input type="number" value={habenFlat} onChange={(e) => setHabenFlat(e.target.value)} style={{ width: 80, padding: 4 }} />
          ) : (
            <NumberRow values={haben} onChange={setHaben} />
          )}
        </div>

        <div>
          <div style={{ color: muted, fontSize: 13, marginBottom: 4 }}>{t("Borrowing rate in %")}</div>
          <ModeToggle value={sollMode} onChange={setSollMode} options={[{ value: "flat", label: t("Flat") }, { value: "perPeriod", label: t("Per period") }]} />
          {sollMode === "flat" ? (
            <input type="number" value={sollFlat} onChange={(e) => setSollFlat(e.target.value)} style={{ width: 80, padding: 4 }} />
          ) : (
            <NumberRow values={soll} onChange={setSoll} />
          )}
        </div>
      </div>

</div>

      <div style={vis(2)}>
      {/* Withdrawals */}
      <div style={{ border: `1px solid ${line}`, borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ color: muted, fontSize: 13, marginBottom: 6 }}>{t("Withdrawals")}</div>
        <ModeToggle value={withdrawalMode} onChange={setWithdrawalMode} options={[{ value: "ratio", label: t("Ratio") }, { value: "fixed", label: t("Fixed values") }]} />
        {withdrawalMode === "fixed" ? (
          <NumberRow values={withdrawalFixed} onChange={setWithdrawalFixed} />
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <input type="number" value={withdrawalStart} onChange={(e) => setWithdrawalStart(e.target.value)}
              style={{ width: 80, padding: 4 }} placeholder={t("start")} />
            <input value={withdrawalRatios} onChange={(e) => setWithdrawalRatios(e.target.value)}
              style={{ flex: 1, padding: 4 }} placeholder="1, 1.2, 1.3 ..." />
          </div>
        )}
      </div>

</div>

      <div style={vis(3)}>
      {/* Projects */}
      <div style={{ border: `1px solid ${line}`, borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ color: muted, fontSize: 13, marginBottom: 8 }}>{t("Projects, cash flows per period")}</div>
        {projects.map((p) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <input
              value={p.name}
              placeholder={`${t("Project")} ${String.fromCharCode(65 + projects.indexOf(p))}`}
              onChange={(e) => setProjects(projects.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))}
              style={{ width: 120, padding: 4, fontWeight: 600, border: `1px solid ${line}`, borderRadius: 4 }}
            />
            <NumberRow
              values={p.cashflows}
              onChange={(cf) => setProjects(projects.map((x) => (x.id === p.id ? { ...x, cashflows: cf } : x)))}
            />
            <button type="button" onClick={() => removeProject(p.id)} style={{ color: red, border: "none", background: "none", cursor: "pointer" }}>
              {t("remove")}
            </button>
          </div>
        ))}
        <button type="button" onClick={addProject} style={{ padding: "6px 12px", border: `1px dashed ${gold}`, borderRadius: 6, background: "none", color: gold, cursor: "pointer" }}>
          {t("+ Add project")}
        </button>
      </div>

</div>

      <div style={vis(4)}>
      {errors.length > 0 && (
        <div role="alert" style={{ border: `1px solid ${red}`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, background: "#FDF3F2", color: red, fontSize: 14 }}>
          <strong>{t("Please check your inputs:")}</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>{errors.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}
      <button type="button" onClick={calculate} style={{ padding: "10px 20px", background: gold, color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>
        {t("Calculate")}
      </button>

      {/* Results */}
      {results && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
            <div style={{ border: `2px solid ${gold}`, borderRadius: 8, padding: 16, flex: 1 }}>
              <div style={{ fontSize: 13, color: muted, textTransform: "uppercase" }}>{winner.feasible ? t("Best alternative") : t("No feasible option")}</div>
              {winner.feasible ? (
                <>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{winner.name}</div>
                  <div>{t("Final balance:")} <strong style={{ color: green }}>{fmt(winner.balance[n - 1])}</strong></div>
                </>
              ) : (
                <div style={{ color: red }}>{t("Every option goes below the credit limit. See the status column for the lowest balances.")}</div>
              )}
            </div>
            <button
              type="button"
              onClick={showSavePanel}
              style={{ padding: "10px 16px", border: `1px solid ${gold}`, borderRadius: 6, background: "#fff", color: gold, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}
            >
              {t("Save results")}
            </button>
          </div>

          {reportText !== null && (
            <div style={{ border: `1px solid ${line}`, borderRadius: 8, padding: 16, marginBottom: 20, background: "#FCFAF4" }}>
              <div style={{ fontSize: 13, color: muted, marginBottom: 8 }}>
                {t("Tap inside the box, select all, and copy, or use the button below.")}
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
                {t("Copy to clipboard")}
              </button>
              {copyMessage && <div style={{ marginTop: 8, fontSize: 13, color: muted }}>{copyMessage}</div>}
            </div>
          )}

          <div style={{ overflowX: "auto", marginBottom: 20 }}>
          <table style={{ width: "100%", minWidth: 520, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${line}` }}>
                <th style={{ textAlign: "left", padding: 8 }}>{t("Option")}</th>
                <th style={{ textAlign: "right", padding: 8 }}>{t("Final balance")}</th>
                <th style={{ textAlign: "right", padding: 8 }}>{t("vs. Do nothing")}</th>
                <th style={{ textAlign: "right", padding: 8 }}>{t("Lowest balance")}</th>
                <th style={{ textAlign: "left", padding: 8 }}>{t("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r) => (
                <tr key={r.name} style={{ borderBottom: `1px solid ${line}` }}>
                  <td style={{ padding: 8 }}>{r.name}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>{r.feasible ? fmt(r.balance[n - 1]) : t("n/a")}</td>
                  <td style={{ padding: 8, textAlign: "right", color: r.baseline || !r.feasible ? muted : r.balance[n - 1] - baseline.balance[n - 1] >= 0 ? green : red }}>
                    {r.baseline || !r.feasible ? "–" : (r.balance[n - 1] - baseline.balance[n - 1] >= 0 ? "+" : "") + fmt(r.balance[n - 1] - baseline.balance[n - 1])}
                  </td>
                  <td style={{ padding: 8, textAlign: "right", color: r.lowestPoint < 0 ? red : ink }}>{fmt(r.lowestPoint)}</td>
                  <td style={{ padding: 8, color: r.feasible ? green : red }}>
                    {r.feasible ? t("feasible") : `${t("credit limit exceeded")} (${fmt(r.lowestPoint)})`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <BalanceChart computed={results.computed} n={n} />

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
                    <td style={{ padding: "2px 8px" }}>{t("Cash flow")}</td>
                    {r.cashflows.map((v, i) => <td key={i} style={{ padding: "2px 8px", textAlign: "right" }}>{fmt(v)}</td>)}
                  </tr>
                  <tr>
                    <td style={{ padding: "2px 8px" }}>{t("Withdrawal")}</td>
                    {results.withdrawals.map((v, i) => <td key={i} style={{ padding: "2px 8px", textAlign: "right" }}>{fmt(v)}</td>)}
                  </tr>
                  <tr>
                    <td style={{ padding: "2px 8px", fontWeight: 600 }}>{t("Balance")}</td>
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

</div>

            {guided && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
          <button type="button" disabled={step === 1} onClick={() => setStep(step - 1)} style={{ padding: "8px 16px", border: `1px solid ${line}`, borderRadius: 6, background: "#fff", color: step === 1 ? line : ink, cursor: step === 1 ? "default" : "pointer" }}>{t("Back")}</button>
          {step < 4 && <button type="button" onClick={() => setStep(step + 1)} style={{ padding: "8px 16px", border: "none", borderRadius: 6, background: gold, color: "#fff", fontWeight: 600, cursor: "pointer" }}>{t("Next")}</button>}
        </div>
      )}

      <footer style={{ marginTop: 40, paddingTop: 16, borderTop: `1px solid ${line}`, fontSize: 13, color: muted, display: "flex", flexWrap: "wrap", gap: "8px 18px", justifyContent: "space-between" }}>
        <span>{t("Nothing is saved: your inputs exist only on this page and are gone when you close or reload it. Everyone starts with an empty form.")}</span>
        <span style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setLegalPage("imprint")} style={{ background: "none", border: "none", padding: 0, color: muted, textDecoration: "underline", cursor: "pointer", fontSize: 13 }}>Impressum</button>
          <button type="button" onClick={() => setLegalPage("privacy")} style={{ background: "none", border: "none", padding: 0, color: muted, textDecoration: "underline", cursor: "pointer", fontSize: 13 }}>Datenschutz</button>
          <a href="https://nadin.dev" style={{ color: muted }}>{t("made by Nadin Okil")}</a>
        </span>
      </footer>
      {legalPage && <LegalModal page={legalPage} onClose={() => setLegalPage(null)} />}
    </form>
  );
}

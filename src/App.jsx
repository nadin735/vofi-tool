import React, { useEffect, useRef, useState } from "react";
import VofiTool, { LegalModal, DEMO } from "./VofiTool.jsx";
import { Home, Saved, Compare, Results, Help, Upload, btn } from "./views.jsx";
import { t, L, setLang } from "./i18n.js";
import { gold, line, ink, muted, red, cream } from "./theme.js";
import { usePlans, upsertPlan, getPlan, loadLang, saveLang } from "./store.js";
import { validateInputs, emptyInputs, SCENARIO_DEFAULTS } from "./core.js";
import { fileSlug, dateStamp, downloadBlob } from "./report.js";

const ROUTES = ["home", "new", "import", "saved", "compare", "results", "help"];
const routeFromHash = () => {
  const r = (window.location.hash || "").replace(/^#\/?/, "");
  return ROUTES.includes(r) ? r : "home";
};
const initialLang = () => loadLang() || (typeof navigator !== "undefined" && /^de/i.test(navigator.language || "") ? "de" : "en");

export default function App() {
  const [lang, setLangState] = useState(initialLang);
  setLang(lang);
  const [route, setRoute] = useState(routeFromHash);
  const [current, setCurrent] = useState(null); // { id, name, inputs }: the last calculation
  const [params, setParams] = useState({ ...SCENARIO_DEFAULTS });
  const [legal, setLegal] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const calc = useRef(null);
  const plans = usePlans();

  useEffect(() => {
    const on = () => { setRoute(routeFromHash()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const go = (r) => { if (window.location.hash === "#/" + r) { window.scrollTo(0, 0); } else window.location.hash = "#/" + r; };
  const chooseLang = (l) => { setLangState(l); saveLang(l); };

  const onSave = ({ id, name, inputs }) => {
    const rec = upsertPlan({ id, name, inputs });
    if (rec && validateInputs(rec.inputs).length === 0) setCurrent({ id: rec.id, name: rec.name, inputs: rec.inputs });
    return rec;
  };
  const edit = (p) => { calc.current && calc.current.load(p); go("new"); };
  const showResults = (p) => { setCurrent({ id: p.id, name: p.name, inputs: p.inputs }); go("results"); };
  const startNew = () => { calc.current && calc.current.fresh(); go("new"); };
  const demo = () => { calc.current && calc.current.demo(); go("new"); };
  // Demo in one click: fills the form with the example, calculates and opens the results.
  const demoResults = () => {
    const inputs = { ...emptyInputs(DEMO.n), habenFlat: DEMO.habenFlat, sollFlat: DEMO.sollFlat, basePayments: DEMO.basePayments.slice(), creditLimit: DEMO.creditLimit, withdrawalFixed: DEMO.withdrawalFixed.slice(), projects: DEMO.projects.map((p) => ({ ...p, cashflows: p.cashflows.slice() })) };
    calc.current && calc.current.load({ id: null, name: L("Demo: machine investment", "Demo: Maschineninvestition"), inputs });
    go("results");
  };
  // A saved plan was renamed or deleted: keep the form and the results in step.
  const flash = (id, name) => {
    calc.current && calc.current.syncPlan(id, name);
    setCurrent((c) => (c && c.id === id ? (name === null ? { ...c, id: null } : { ...c, name }) : c));
  };

  async function makePdf() {
    if (!current) return;
    setPdfBusy(true); setPdfError("");
    try {
      const { buildPdf } = await import("./pdf.js");
      const blob = await buildPdf({ inputs: current.inputs, name: current.name, params });
      downloadBlob(blob, `vofi-${fileSlug(current.name || "plan")}-${dateStamp()}.pdf`);
    } catch (e) {
      setPdfError(L("The PDF could not be created.", "Das PDF konnte nicht erstellt werden."));
    }
    setPdfBusy(false);
  }

  const nav = [
    ["home", L("Home", "Startseite")],
    ["new", L("New calculation", "Neue Berechnung")],
    ["import", L("Upload data", "Daten hochladen")],
    ["saved", L("My calculations", "Meine Berechnungen") + (plans.length ? ` (${plans.length})` : "")],
    ["compare", L("Comparisons", "Vergleiche")],
    ["results", L("Results", "Ergebnisse")],
    ["help", L("Help", "Hilfe")],
  ];

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: ink, maxWidth: 960, margin: "0 auto", padding: "0 16px 24px", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="no-print" style={{ paddingTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <button type="button" onClick={() => go("home")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 18, fontWeight: 700, color: ink, minHeight: 44 }}>
            VOFI <span style={{ color: gold }}>Tool</span>
          </button>
          <div role="group" aria-label={t("Language")} style={{ display: "inline-flex", border: `1px solid ${line}`, borderRadius: 6, overflow: "hidden" }}>
            {["de", "en"].map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => chooseLang(l)}
                style={{ padding: "6px 12px", minHeight: 36, border: "none", background: lang === l ? gold : "#fff", color: lang === l ? "#fff" : muted, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{l.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <nav aria-label={L("Main navigation", "Hauptnavigation")} style={{ display: "flex", gap: 4, overflowX: "auto", borderBottom: `1px solid ${line}`, marginTop: 4, WebkitOverflowScrolling: "touch" }}>
          {nav.map(([r, label]) => (
            <button key={r} type="button" data-nav={r} aria-current={route === r ? "page" : undefined} onClick={() => go(r)}
              style={{ flex: "0 0 auto", padding: "10px 12px", minHeight: 44, background: "none", border: "none", borderBottom: `3px solid ${route === r ? gold : "transparent"}`, color: route === r ? ink : muted, fontWeight: route === r ? 700 : 500, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      <section className="no-print" aria-label={L("Try with demo data", "Mit Demo-Daten testen")} style={{ marginTop: 14, padding: "12px 14px", border: `1px solid ${gold}`, borderRadius: 8, background: cream, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{L("Test with demo data", "Teste mit Demo-Daten")}</div>
          <div style={{ fontSize: 13, color: muted, lineHeight: 1.45 }}>{L("See a filled example with results, scenarios and PDF. No login, nothing is saved.", "Sieh dir ein ausgefülltes Beispiel mit Ergebnissen, Szenarien und PDF an. Ohne Anmeldung, nichts wird gespeichert.")}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" data-demo="results" onClick={demoResults} style={btn(true)}>{L("Load demo and show results", "Demo laden und Ergebnisse zeigen")}</button>
          <button type="button" data-demo="form" onClick={demo} style={btn(false)}>{L("Only fill the form", "Nur Formular füllen")}</button>
        </div>
      </section>

      <main style={{ flex: 1, paddingTop: 20 }}>
        {/* The calculator stays mounted so unsaved inputs survive a trip to another page. */}
        <VofiTool ref={calc} lang={lang} onLang={chooseLang} hidden={route !== "new"}
          onCalculated={setCurrent} onSave={onSave} onOpenResults={() => go("results")} />
        {route === "home" && <Home go={go} plans={plans} current={current} onStart={startNew} onDemo={demo} />}
        {route === "import" && <Upload go={go} calc={calc} />}
        {route === "saved" && <Saved plans={plans} go={go} onEdit={edit} onResults={showResults} flash={flash} />}
        {route === "compare" && <Compare plans={plans} go={go} />}
        {route === "results" && (
          <>
            <Results current={current} go={go} onDemo={demo} onPdf={makePdf} pdfBusy={pdfBusy} params={params} setParams={setParams} />
            {pdfError && <div role="alert" className="no-print" style={{ color: red, marginTop: 10 }}>{pdfError}</div>}
          </>
        )}
        {route === "help" && <Help go={go} />}
      </main>

      <footer className="no-print" style={{ marginTop: 40, paddingTop: 16, borderTop: `1px solid ${line}`, fontSize: 13, color: muted, display: "flex", flexWrap: "wrap", gap: "8px 18px", justifyContent: "space-between" }}>
        <span>{t("Nothing leaves your device. Only plans you save are kept, in this browser.")}</span>
        <span style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setLegal("imprint")} style={{ background: "none", border: "none", padding: 0, color: muted, textDecoration: "underline", cursor: "pointer", fontSize: 13, minHeight: 32 }}>Impressum</button>
          <button type="button" onClick={() => setLegal("privacy")} style={{ background: "none", border: "none", padding: 0, color: muted, textDecoration: "underline", cursor: "pointer", fontSize: 13, minHeight: 32 }}>Datenschutz</button>
          <span>{t("made by Nadin Okil")}</span>
        </span>
      </footer>
      {legal && <LegalModal page={legal} onClose={() => setLegal(null)} />}
    </div>
  );
}

import React, { useRef, useState } from "react";
import { t, tf, fmt, L, getLang } from "./i18n.js";
import { gold, line, ink, muted, green, red, cream } from "./theme.js";
import { BalanceChart } from "./VofiTool.jsx";
import { summarize, runScenarios, SCENARIO_DEFAULTS } from "./core.js";
import { analyse, conclusion, parameterRows, scenarioLabel, scenarioAssumption, signed, csvText, saveBlob, fileSlug, dateStamp, dateTimeText, downloadBlob, fmtRate } from "./report.js";
import { readFileAsText } from "./fileImport.js";
import { listPlans, renamePlan, duplicatePlan, deletePlan, exportBackup, importBackup, isPersistent } from "./store.js";

// ---------- small building blocks ----------
export const btn = (primary, extra) => ({
  padding: "10px 16px", minHeight: 44, borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: "pointer",
  border: primary ? "none" : `1px solid ${gold}`, background: primary ? gold : "#fff", color: primary ? "#fff" : gold, ...extra,
});
const smallBtn = (danger) => ({
  padding: "6px 12px", minHeight: 36, borderRadius: 6, fontSize: 13, cursor: "pointer", background: "#fff",
  border: `1px solid ${danger ? red : line}`, color: danger ? red : ink,
});
const box = { border: `1px solid ${line}`, borderRadius: 8, padding: 16, background: "#fff" };
const h2 = { fontSize: 18, margin: "0 0 10px" };
const label = { fontSize: 13, color: muted, textTransform: "uppercase", letterSpacing: 0.4 };
const scroll = { overflowX: "auto", WebkitOverflowScrolling: "touch" };
const th = (right) => ({ textAlign: right ? "right" : "left", padding: 8, fontWeight: 600 });
const td = (right) => ({ padding: 8, textAlign: right ? "right" : "left", verticalAlign: "top" });

function PageHead({ title, intro, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>{title}</h1>
        {children && <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{children}</div>}
      </div>
      {intro && <p style={{ color: muted, margin: "6px 0 0", lineHeight: 1.5 }}>{intro}</p>}
    </div>
  );
}

function Empty({ text, action, onAction }) {
  return (
    <div style={{ ...box, background: cream, textAlign: "center", padding: 28 }}>
      <p style={{ margin: "0 0 14px", color: muted, lineHeight: 1.5 }}>{text}</p>
      {action && <button type="button" onClick={onAction} style={btn(true)}>{action}</button>}
    </div>
  );
}

// ---------- Home ----------
export function Home({ go, plans, current, onStart, onDemo }) {
  const h = new Date().getHours();
  const hello = L(h < 11 ? "Good morning" : h < 18 ? "Hello" : "Good evening", h < 11 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend");
  const best = (p) => summarize(p.inputs, t);
  const tiles = [
    { to: "new", title: L("New calculation", "Neue Berechnung"), text: L("Enter rates, base payments and projects and compare them.", "Zinssätze, Basiszahlungen und Projekte eingeben und vergleichen."), state: null },
    { to: "import", title: L("Upload data", "Daten hochladen"), text: L("Read a CSV, PDF or photo of a table into the calculation.", "CSV, PDF oder Foto einer Tabelle in die Berechnung einlesen."), state: L("Demo PDF to test", "Demo-PDF zum Testen") },
    { to: "saved", title: L("My calculations", "Meine Berechnungen"), text: L("Open, rename, duplicate or delete saved plans.", "Gespeicherte Pläne öffnen, umbenennen, duplizieren oder löschen."), state: plans.length ? tf(L("{k} saved", "{k} gespeichert"), { k: plans.length }) : L("Nothing saved yet", "Noch nichts gespeichert") },
    { to: "compare", title: L("Comparisons", "Vergleiche"), text: L("Put up to three saved plans side by side.", "Bis zu drei gespeicherte Pläne nebeneinander stellen."), state: plans.length >= 2 ? L("Ready", "Bereit") : L("Needs two saved plans", "Braucht zwei gespeicherte Pläne") },
    { to: "results", title: L("Results", "Ergebnisse"), text: L("Best alternative, final balances, scenarios, PDF and print.", "Beste Alternative, Endkontostände, Szenarien, PDF und Druck."), state: current ? (current.name || L("Current calculation", "Aktuelle Berechnung")) : L("Calculate first", "Erst berechnen") },
    { to: "help", title: L("Help", "Hilfe"), text: L("How to use the tool and what the key figures mean.", "Bedienung und Bedeutung der Kennzahlen."), state: null },
  ];
  return (
    <div>
      <div style={{ ...box, background: cream, padding: "22px 20px", marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, margin: "0 0 6px" }}>{hello}</h1>
        <p style={{ margin: "0 0 16px", color: muted, lineHeight: 1.55, maxWidth: 620 }}>
          {L("Compare investment projects with the Complete Financial Plan (VOFI). Everything runs in your browser, nothing is uploaded.", "Vergleichen Sie Investitionsprojekte mit dem Vollständigen Finanzplan (VOFI). Alles läuft in Ihrem Browser, nichts wird hochgeladen.")}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={onStart} style={btn(true, { padding: "12px 22px" })}>{L("Start new calculation", "Neue Berechnung starten")}</button>
        </div>
      </div>

      <h2 style={h2}>{L("What you can do", "Was Sie tun können")}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 24 }}>
        {tiles.map((x) => (
          <button key={x.to} type="button" onClick={() => go(x.to)} data-tile={x.to}
            style={{ ...box, textAlign: "left", cursor: "pointer", font: "inherit", color: ink, display: "flex", flexDirection: "column", gap: 6, minHeight: 104 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{x.title}</span>
            <span style={{ color: muted, fontSize: 14, lineHeight: 1.45 }}>{x.text}</span>
            {x.state && <span style={{ marginTop: "auto", color: gold, fontWeight: 600, fontSize: 13 }}>{x.state}</span>}
          </button>
        ))}
      </div>

      {plans.length > 0 && (
        <>
          <h2 style={h2}>{L("Recently saved", "Zuletzt gespeichert")}</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {plans.slice(0, 3).map((p) => {
              const s = best(p);
              return (
                <div key={p.id} style={{ ...box, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", padding: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{p.name}</div>
                    <div style={{ fontSize: 13, color: muted }}>{s ? (s.best.feasible ? `${t("Best alternative")}: ${s.best.name}` : t("No feasible option")) : L("Inputs incomplete", "Eingaben unvollständig")}</div>
                  </div>
                  <button type="button" onClick={() => go("saved")} style={smallBtn()}>{L("Open list", "Liste öffnen")}</button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- My calculations ----------
export function Saved({ plans, onEdit, onResults, go, flash }) {
  const [renaming, setRenaming] = useState(null);
  const [draft, setDraft] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [msg, setMsg] = useState("");
  const fileRef = useRef(null);

  function doRename(p) {
    const name = draft.trim();
    if (!name) { setMsg(L("A name cannot be empty.", "Ein Name darf nicht leer sein.")); return; }
    renamePlan(p.id, name); setRenaming(null); setMsg(L("Renamed.", "Umbenannt."));
    flash && flash(p.id, name);
  }
  function backup() {
    downloadBlob(new Blob([exportBackup()], { type: "application/json" }), `vofi-backup-${dateStamp()}.json`);
  }
  async function restore(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const r = importBackup(await f.text());
      setMsg(r.error ? L("This file is not a VOFI backup.", "Diese Datei ist kein VOFI-Backup.") : tf(L("{a} plan(s) added, {s} skipped.", "{a} Berechnung(en) hinzugefügt, {s} übersprungen."), { a: r.added, s: r.skipped }));
    } catch { setMsg(L("The file could not be read.", "Die Datei konnte nicht gelesen werden.")); }
  }

  return (
    <div>
      <PageHead title={L("My calculations", "Meine Berechnungen")} intro={L("Plans you saved are kept in this browser on this device.", "Gespeicherte Pläne bleiben in diesem Browser auf diesem Gerät erhalten.")}>
        <button type="button" onClick={() => go("new")} style={btn(true)}>{L("New calculation", "Neue Berechnung")}</button>
      </PageHead>
      {!isPersistent() && (
        <div role="alert" style={{ ...box, borderColor: red, color: red, marginBottom: 14, fontSize: 14 }}>
          {L("This browser blocks local storage (for example in a private window). Plans are kept only until you close the tab. Download a backup to keep them.", "Dieser Browser blockiert den lokalen Speicher (zum Beispiel im privaten Fenster). Pläne bleiben nur bis zum Schließen des Tabs erhalten. Laden Sie ein Backup herunter, um sie zu behalten.")}
        </div>
      )}
      {msg && <div role="status" style={{ marginBottom: 12, fontSize: 14, color: muted }}>{msg}</div>}

      {plans.length === 0 ? (
        <Empty text={L("You have not saved a calculation yet. Open “New calculation”, enter your data and press “Save plan”.", "Sie haben noch keine Berechnung gespeichert. Öffnen Sie „Neue Berechnung“, geben Sie Ihre Daten ein und drücken Sie „Berechnung speichern“.")} action={L("Start new calculation", "Neue Berechnung starten")} onAction={() => go("new")} />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {plans.map((p) => {
            const s = summarize(p.inputs, t);
            return (
              <div key={p.id} data-plan={p.name} style={{ ...box, display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0, flex: "1 1 220px" }}>
                    {renaming === p.id ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus aria-label={L("New name", "Neuer Name")}
                          onKeyDown={(e) => { if (e.key === "Enter") doRename(p); if (e.key === "Escape") setRenaming(null); }}
                          style={{ flex: "1 1 160px", minWidth: 0, padding: "8px 10px", border: `1px solid ${line}`, borderRadius: 6, fontSize: 15 }} />
                        <button type="button" onClick={() => doRename(p)} style={btn(true, { minHeight: 38, padding: "6px 14px" })}>{L("Save name", "Name speichern")}</button>
                        <button type="button" onClick={() => setRenaming(null)} style={smallBtn()}>{L("Cancel", "Abbrechen")}</button>
                      </div>
                    ) : (
                      <div style={{ fontWeight: 700, fontSize: 16, overflowWrap: "anywhere" }}>{p.name}</div>
                    )}
                    <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                      {tf(L("{n} periods · {k} project(s) · updated {d}", "{n} Perioden · {k} Projekt(e) · geändert {d}"), { n: p.inputs.n, k: p.inputs.projects.length, d: dateTimeText(p.updatedAt, getLang()) })}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 0 }}>
                    {s ? (
                      s.best.feasible ? (
                        <>
                          <div style={label}>{t("Best alternative")}</div>
                          <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{s.best.name}</div>
                          <div style={{ color: green, fontWeight: 600 }}>{fmt(s.bestFinal)}</div>
                        </>
                      ) : <div style={{ color: red, fontSize: 14 }}>{t("No feasible option")}</div>
                    ) : <div style={{ color: muted, fontSize: 14 }}>{L("Inputs incomplete", "Eingaben unvollständig")}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => onEdit(p)} style={btn(true, { minHeight: 38, padding: "6px 14px" })}>{L("Edit", "Bearbeiten")}</button>
                  <button type="button" onClick={() => onResults(p)} disabled={!s} style={{ ...smallBtn(), opacity: s ? 1 : 0.5 }}>{L("Results", "Ergebnisse")}</button>
                  <button type="button" onClick={() => { setRenaming(p.id); setDraft(p.name); setMsg(""); }} style={smallBtn()}>{L("Rename", "Umbenennen")}</button>
                  <button type="button" onClick={() => { duplicatePlan(p.id, t("(copy)")); setMsg(L("Duplicated.", "Dupliziert.")); }} style={smallBtn()}>{L("Duplicate", "Duplizieren")}</button>
                  {confirmId === p.id ? (
                    <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, color: red }}>{L("Delete for good?", "Endgültig löschen?")}</span>
                      <button type="button" onClick={() => { deletePlan(p.id); setConfirmId(null); setMsg(L("Deleted.", "Gelöscht.")); flash && flash(p.id, null); }} style={smallBtn(true)}>{L("Yes, delete", "Ja, löschen")}</button>
                      <button type="button" onClick={() => setConfirmId(null)} style={smallBtn()}>{L("No", "Nein")}</button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setConfirmId(p.id)} style={smallBtn(true)}>{L("Delete", "Löschen")}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ ...box, background: cream, marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 14, color: muted, flex: "1 1 260px" }}>{L("Backup: save all plans as a file, or load a backup file. Useful before clearing browser data or when you change device.", "Backup: alle Pläne als Datei sichern oder eine Backup-Datei laden. Praktisch vor dem Löschen der Browserdaten oder beim Gerätewechsel.")}</span>
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={backup} disabled={plans.length === 0} style={{ ...btn(false), opacity: plans.length ? 1 : 0.5 }}>{L("Download backup", "Backup herunterladen")}</button>
          <button type="button" onClick={() => fileRef.current && fileRef.current.click()} style={btn(false)}>{L("Load backup", "Backup laden")}</button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={restore} hidden data-testid="backup-input" />
        </span>
      </div>
    </div>
  );
}

// ---------- Comparisons ----------
export function Compare({ plans, go }) {
  const [picked, setPicked] = useState(null);
  const ids = picked || plans.slice(0, 3).map((p) => p.id);
  const chosen = ids.map((id) => plans.find((p) => p.id === id)).filter(Boolean);
  const toggle = (id) => {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= 3 ? ids : [...ids, id];
    setPicked(next);
  };

  if (plans.length < 2) {
    return (
      <div>
        <PageHead title={L("Comparisons", "Vergleiche")} />
        <Empty text={L("Comparisons need at least two saved calculations. Save the current plan, change a value, and save it as a copy.", "Für Vergleiche brauchen Sie mindestens zwei gespeicherte Berechnungen. Speichern Sie den aktuellen Plan, ändern Sie einen Wert und speichern Sie ihn als Kopie.")} action={L("My calculations", "Meine Berechnungen")} onAction={() => go("saved")} />
      </div>
    );
  }

  const cols = chosen.map((p) => {
    const s = summarize(p.inputs, t);
    if (!s) return { p, s: null };
    const sc = runScenarios(p.inputs, SCENARIO_DEFAULTS, t);
    const same = (k) => { const r = sc[k].results.computed.find((x) => x.name === s.best.name); return r ? (r.feasible ? r.balance[p.inputs.n - 1] : null) : null; };
    return { p, s, pess: same("pessimistic"), opt: same("optimistic") };
  });
  const money = (v) => (v === null || v === undefined ? t("n/a") : fmt(v));
  const rateText = (i, mode, flat, arr) => (mode === "flat" ? fmtRate(flat) : arr.map((v) => fmtRate(v)).join("; "));
  const rows = [
    [L("Periods", "Perioden"), (c) => c.p.inputs.n],
    [L("Projects", "Projekte"), (c) => c.p.inputs.projects.length],
    [t("Deposit rate"), (c) => rateText(c.p.inputs, c.p.inputs.habenMode, c.p.inputs.habenFlat, c.p.inputs.haben)],
    [t("Borrowing rate"), (c) => rateText(c.p.inputs, c.p.inputs.sollMode, c.p.inputs.sollFlat, c.p.inputs.soll)],
    [t("Credit limit"), (c) => (c.p.inputs.creditLimit === "" ? t("unlimited") : fmt(Number(c.p.inputs.creditLimit)))],
    [t("Best alternative"), (c) => (c.s ? (c.s.best.feasible ? c.s.best.name : t("No feasible option")) : L("incomplete", "unvollständig")), true],
    [t("Final balance"), (c) => (c.s ? money(c.s.bestFinal) : "–"), true, "num"],
    [t("Final balance") + " · " + t("Do nothing"), (c) => (c.s ? fmt(c.s.baseFinal) : "–"), false, "num"],
    [L("Advantage over “Do nothing”", "Vorteil gegenüber „Nichts tun“"), (c) => (c.s && c.s.best.feasible ? signed(c.s.gain) : "–"), true, "num"],
    [t("Lowest balance"), (c) => (c.s ? fmt(c.s.best.lowestPoint) : "–"), false, "num"],
    [L("Same option, pessimistic", "Gleiche Option, pessimistisch"), (c) => (c.s ? money(c.pess) : "–"), false, "num"],
    [L("Same option, optimistic", "Gleiche Option, optimistisch"), (c) => (c.s ? money(c.opt) : "–"), false, "num"],
  ];
  const bars = cols.filter((c) => c.s && c.s.best.feasible);
  const maxAbs = Math.max(1, ...bars.map((c) => Math.abs(c.s.bestFinal)));

  return (
    <div>
      <PageHead title={L("Comparisons", "Vergleiche")} intro={L("Choose up to three saved calculations. Each column shows its best alternative.", "Wählen Sie bis zu drei gespeicherte Berechnungen. Jede Spalte zeigt ihre beste Alternative.")} />
      <fieldset style={{ ...box, marginBottom: 16, border: `1px solid ${line}` }}>
        <legend style={{ ...label, padding: "0 6px" }}>{L("Calculations to compare", "Berechnungen zum Vergleichen")} ({ids.length}/3)</legend>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 4 }}>
          {plans.map((p) => (
            <label key={p.id} style={{ display: "flex", gap: 10, alignItems: "center", minHeight: 44, cursor: "pointer", overflowWrap: "anywhere" }}>
              <input type="checkbox" checked={ids.includes(p.id)} disabled={!ids.includes(p.id) && ids.length >= 3} onChange={() => toggle(p.id)} style={{ width: 20, height: 20, accentColor: gold }} />
              <span>{p.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {chosen.length < 2 ? (
        <Empty text={L("Pick at least two calculations.", "Wählen Sie mindestens zwei Berechnungen.")} />
      ) : (
        <>
          <div style={scroll}>
            <table data-testid="compare-table" style={{ width: "100%", minWidth: 120 + chosen.length * 150, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${line}` }}>
                  <th style={th()} />
                  {cols.map((c) => <th key={c.p.id} style={{ ...th(true), overflowWrap: "anywhere" }}>{c.p.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map(([name, f, strong, kind]) => (
                  <tr key={name} style={{ borderBottom: `1px solid ${line}` }}>
                    <td style={{ ...td(), color: muted }}>{name}</td>
                    {cols.map((c) => <td key={c.p.id} style={{ ...td(true), fontWeight: strong ? 700 : 400, overflowWrap: "anywhere", color: kind === "num" && String(f(c)).startsWith("-") ? red : ink }}>{f(c)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {bars.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{L("Final balance of the best alternative", "Endkontostand der besten Alternative")}</div>
              <div style={{ display: "grid", gap: 8 }}>
                {bars.map((c) => (
                  <div key={c.p.id} style={{ display: "grid", gridTemplateColumns: "minmax(80px, 160px) 1fr auto", gap: 10, alignItems: "center", fontSize: 14 }}>
                    <span style={{ overflowWrap: "anywhere" }}>{c.p.name}</span>
                    <span style={{ background: cream, border: `1px solid ${line}`, borderRadius: 4, height: 18, display: "block" }}>
                      <span style={{ display: "block", height: "100%", width: `${Math.max(2, (Math.abs(c.s.bestFinal) / maxAbs) * 100)}%`, background: c.s.bestFinal >= 0 ? gold : red, borderRadius: 3 }} />
                    </span>
                    <span style={{ fontWeight: 600 }}>{fmt(c.s.bestFinal)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p style={{ fontSize: 13, color: muted, marginTop: 14 }}>{L("Pessimistic and optimistic use the default assumptions of the scenario analysis (revenues ±10 %, interest rates ±1 percentage point).", "Pessimistisch und optimistisch nutzen die Standardannahmen der Szenarioanalyse (Einzahlungen ±10 %, Zinssätze ±1 Prozentpunkt).")}</p>
        </>
      )}
    </div>
  );
}

// ---------- Results ----------
export function Results({ current, go, onDemo, onPdf, pdfBusy, params, setParams }) {
  if (!current) {
    return (
      <div>
        <PageHead title={L("Results", "Ergebnisse")} />
        <Empty text={L("There is no calculation yet. Calculate a plan first, or open a saved one.", "Es gibt noch keine Berechnung. Berechnen Sie zuerst einen Plan oder öffnen Sie einen gespeicherten.")} action={L("Start new calculation", "Neue Berechnung starten")} onAction={() => go("new")} />
        <p style={{ textAlign: "center" }}><button type="button" onClick={onDemo} style={btn(false)}>{t("Try with demo data – no login")}</button></p>
      </div>
    );
  }
  const { inputs, name } = current;
  const a = analyse(inputs);
  const { n, ranked, base, best, results } = a;
  const scen = runScenarios(inputs, params, t);
  const lines = conclusion(a, inputs, scen);
  const optionNames = results.computed.map((r) => r.name);
  const finalOf = (key, nm) => { const r = scen[key].results.computed.find((x) => x.name === nm); return r; };
  const diffBase = (r) => r.balance[n - 1] - base.balance[n - 1];
  const setP = (k) => (e) => setParams({ ...params, [k]: e.target.value });
  const title = name || L("Current calculation", "Aktuelle Berechnung");

  function csv() {
    saveBlob(csvText(a, results.withdrawals, getLang()), "text/csv;charset=utf-8", `vofi-${fileSlug(title)}-${dateStamp()}.csv`);
  }

  return (
    <div id="results-print">
      <div className="print-only" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: muted }}>VOFI Tool · {dateTimeText(Date.now(), getLang())}</div>
      </div>
      <PageHead title={L("Results", "Ergebnisse")} intro={title}>
        <button type="button" onClick={onPdf} disabled={pdfBusy} style={btn(true)}>{pdfBusy ? L("Creating PDF …", "PDF wird erstellt …") : L("Download PDF", "PDF herunterladen")}</button>
        <button type="button" onClick={() => window.print()} style={btn(false)}>{L("Print", "Drucken")}</button>
        <button type="button" onClick={csv} style={btn(false)}>{t("Download CSV")}</button>
      </PageHead>

      {/* Best alternative and differences */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={{ border: `2px solid ${gold}`, borderRadius: 8, padding: 16 }}>
          <div style={label}>{best.feasible ? t("Best alternative") : t("No feasible option")}</div>
          {best.feasible ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 700, overflowWrap: "anywhere" }}>{best.name}</div>
              <div>{t("Final balance:")} <strong style={{ color: best.balance[n - 1] >= 0 ? green : red }}>{fmt(best.balance[n - 1])}</strong></div>
            </>
          ) : <div style={{ color: red, marginTop: 4 }}>{t("Every option goes below the credit limit. See the status column for the lowest balances.")}</div>}
        </div>
        <div style={box}>
          <div style={label}>{L("Advantage over “Do nothing”", "Vorteil gegenüber „Nichts tun“")}</div>
          {best.feasible && !best.baseline ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 700, color: diffBase(best) >= 0 ? green : red }}>{signed(diffBase(best))}</div>
              <div style={{ color: muted, fontSize: 14 }}>{L("“Do nothing” ends at", "„Nichts tun“ endet bei")} {fmt(base.balance[n - 1])}</div>
            </>
          ) : <div style={{ marginTop: 4, color: muted }}>{best.baseline ? L("No project beats “Do nothing”.", "Kein Projekt schlägt „Nichts tun“.") : "–"}</div>}
        </div>
        <div style={box}>
          <div style={label}>{L("Lowest balance of the best option", "Niedrigster Stand der besten Option")}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: best.lowestPoint < 0 ? red : ink }}>{fmt(best.lowestPoint)}</div>
          <div style={{ color: muted, fontSize: 14 }}>{inputs.creditLimit === "" ? `${t("Credit limit")}: ${t("unlimited")}` : `${t("Credit limit")}: ${fmt(Number(inputs.creditLimit))}`}</div>
        </div>
      </div>

      {/* Final balances table */}
      <h2 style={h2}>{L("Final balances and differences", "Endkontostände und Unterschiede")}</h2>
      <div style={{ ...scroll, marginBottom: 20 }}>
        <table style={{ width: "100%", minWidth: 520, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${line}` }}>
              <th style={th()}>{t("Option")}</th><th style={th(true)}>{t("Final balance")}</th><th style={th(true)}>{t("vs. Do nothing")}</th>
              <th style={th(true)}>{L("vs. best", "gegenüber Bester")}</th><th style={th(true)}>{t("Lowest balance")}</th><th style={th()}>{t("Status")}</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r) => (
              <tr key={r.name} style={{ borderBottom: `1px solid ${line}` }}>
                <td style={{ ...td(), overflowWrap: "anywhere" }}>{r.name}</td>
                <td style={td(true)}>{r.feasible ? fmt(r.balance[n - 1]) : t("n/a")}</td>
                <td style={{ ...td(true), color: r.baseline || !r.feasible ? muted : diffBase(r) >= 0 ? green : red }}>{r.baseline || !r.feasible ? "–" : signed(diffBase(r))}</td>
                <td style={{ ...td(true), color: muted }}>{r === best || !r.feasible || !best.feasible ? "–" : signed(r.balance[n - 1] - best.balance[n - 1])}</td>
                <td style={{ ...td(true), color: r.lowestPoint < 0 ? red : ink }}>{fmt(r.lowestPoint)}</td>
                <td style={{ ...td(), color: r.feasible ? green : red }}>{r.feasible ? t("feasible") : `${t("credit limit exceeded")} (${fmt(r.lowestPoint)})`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BalanceChart computed={results.computed} n={n} />

      {/* Scenario analysis */}
      <h2 style={h2}>{L("Scenario analysis", "Szenarioanalyse")}</h2>
      <p style={{ color: muted, margin: "0 0 10px", lineHeight: 1.5, fontSize: 14 }}>
        {L("Three what-if runs with the same formulas. The optimistic case raises the positive project cash flows and the deposit rate and lowers the borrowing rate. The pessimistic case does the opposite.", "Drei Was-wäre-wenn-Läufe mit denselben Formeln. Das optimistische Szenario erhöht die positiven Projektzahlungen und den Habenzins und senkt den Sollzins. Das pessimistische Szenario macht das Gegenteil.")}
      </p>
      <div className="no-print" style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
        <label style={{ display: "grid", gap: 4, fontSize: 13, color: muted }}>
          {L("Change of revenues in %", "Änderung der Einzahlungen in %")}
          <input type="number" inputMode="decimal" min="0" max="100" step="1" value={params.cfPct} onChange={setP("cfPct")} aria-label={L("Change of revenues in %", "Änderung der Einzahlungen in %")}
            style={{ width: 140, padding: "10px", minHeight: 44, border: `1px solid ${line}`, borderRadius: 6, fontSize: 16 }} />
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 13, color: muted }}>
          {L("Change of interest rates in percentage points", "Änderung der Zinssätze in Prozentpunkten")}
          <input type="number" inputMode="decimal" min="0" max="20" step="0.5" value={params.ratePp} onChange={setP("ratePp")} aria-label={L("Change of interest rates in percentage points", "Änderung der Zinssätze in Prozentpunkten")}
            style={{ width: 140, padding: "10px", minHeight: 44, border: `1px solid ${line}`, borderRadius: 6, fontSize: 16 }} />
        </label>
        <button type="button" onClick={() => setParams({ ...SCENARIO_DEFAULTS })} style={smallBtn()}>{L("Default values", "Standardwerte")}</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 14 }}>
        {["pessimistic", "realistic", "optimistic"].map((k) => {
          const w = scen[k].winner;
          return (
            <div key={k} data-scenario={k} style={{ ...box, borderColor: k === "realistic" ? gold : line }}>
              <div style={{ fontWeight: 700 }}>{scenarioLabel(k)}</div>
              <div style={{ fontSize: 13, color: muted, minHeight: 36, lineHeight: 1.4 }}>{scenarioAssumption(k, params)}</div>
              <div style={{ ...label, marginTop: 8 }}>{w.feasible ? t("Best alternative") : t("No feasible option")}</div>
              {w.feasible && (
                <>
                  <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{w.name}</div>
                  <div style={{ color: w.balance[n - 1] >= 0 ? green : red, fontWeight: 600 }}>{fmt(w.balance[n - 1])}</div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ ...scroll, marginBottom: 20 }}>
        <table data-testid="scenario-table" style={{ width: "100%", minWidth: 480, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${line}` }}>
              <th style={th()}>{t("Option")}</th>
              {["pessimistic", "realistic", "optimistic"].map((k) => <th key={k} style={th(true)}>{scenarioLabel(k)}</th>)}
            </tr>
          </thead>
          <tbody>
            {optionNames.map((nm) => (
              <tr key={nm} style={{ borderBottom: `1px solid ${line}` }}>
                <td style={{ ...td(), overflowWrap: "anywhere" }}>{nm}</td>
                {["pessimistic", "realistic", "optimistic"].map((k) => {
                  const r = finalOf(k, nm);
                  const win = scen[k].winner.name === nm && scen[k].winner.feasible;
                  return (
                    <td key={k} style={{ ...td(true), fontWeight: win ? 700 : 400, background: win ? cream : undefined, color: !r.feasible ? muted : r.balance[n - 1] < 0 ? red : ink }}>
                      {r.feasible ? fmt(r.balance[n - 1]) : t("n/a")}{win ? ` · ${L("best", "beste")}` : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: muted, margin: "6px 0 0" }}>{L("“n/a” means the option breaks the credit limit in that scenario.", "„k. A.“ heißt: Die Option überschreitet in diesem Szenario das Kreditlimit.")}</p>
      </div>

      {/* Conclusion */}
      <h2 style={h2}>{L("Conclusion", "Fazit")}</h2>
      <div style={{ ...box, background: cream, marginBottom: 20 }}>
        {lines.map((s, i) => <p key={i} style={{ margin: i ? "8px 0 0" : 0, lineHeight: 1.55, color: i === lines.length - 1 ? muted : ink, fontSize: i === lines.length - 1 ? 13 : 15 }}>{s}</p>)}
      </div>

      {/* Inputs and period tables */}
      <h2 style={h2}>{L("Input parameters", "Eingabeparameter")}</h2>
      <dl style={{ ...box, margin: "0 0 20px", display: "grid", gridTemplateColumns: "minmax(110px, 200px) 1fr", gap: "8px 14px", fontSize: 14 }}>
        {parameterRows(inputs, results).map(([k, v]) => (
          <React.Fragment key={k}><dt style={{ color: muted }}>{k}</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{v}</dd></React.Fragment>
        ))}
      </dl>

      <h2 style={h2}>{L("Account balance per option", "Kontostand je Option")}</h2>
      {results.computed.map((r) => (
        <div key={r.name} style={{ marginBottom: 18, ...scroll }}>
          <div style={{ fontWeight: 600, marginBottom: 6, overflowWrap: "anywhere" }}>{r.name}</div>
          <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
              <tr><td style={{ padding: "2px 8px", color: muted }}>t</td>{r.balance.map((_, i) => <td key={i} style={{ padding: "2px 8px", textAlign: "right", color: muted }}>{i}</td>)}</tr>
              <tr><td style={{ padding: "2px 8px" }}>{t("Cash flow")}</td>{r.cashflows.map((v, i) => <td key={i} style={{ padding: "2px 8px", textAlign: "right" }}>{fmt(Number(v) || 0)}</td>)}</tr>
              <tr><td style={{ padding: "2px 8px" }}>{t("Withdrawal")}</td>{results.withdrawals.map((v, i) => <td key={i} style={{ padding: "2px 8px", textAlign: "right" }}>{fmt(Number(v) || 0)}</td>)}</tr>
              <tr><td style={{ padding: "2px 8px", fontWeight: 600 }}>{t("Balance")}</td>{r.balance.map((v, i) => <td key={i} style={{ padding: "2px 8px", textAlign: "right", color: v < 0 ? red : green, fontWeight: 600 }}>{fmt(v)}</td>)}</tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ---------- Help ----------
export function Help({ go }) {
  const steps = [
    [L("Start", "Starten"), L("Open “New calculation”. Use “Try with demo data” to see a filled example.", "Öffnen Sie „Neue Berechnung“. Mit „Mit Beispieldaten testen“ sehen Sie ein ausgefülltes Beispiel.")],
    [L("Enter", "Eingeben"), L("Set time horizon, credit limit, base payments, deposit rate and borrowing rate. Add each project with its cash flows. Period 0 is usually the investment, so it is negative. You can also paste a table or read a PDF, photo or CSV.", "Legen Sie Zeithorizont, Kreditlimit, Basiszahlungen, Habenzins und Sollzins fest. Tragen Sie jedes Projekt mit seinen Zahlungen ein. Periode 0 ist meist die Investition und damit negativ. Sie können auch eine Tabelle einfügen oder ein PDF, Foto oder eine CSV einlesen.")],
    [L("Calculate", "Berechnen"), L("Press “Calculate”. The ranking appears below the form. “Open results overview” shows the full analysis.", "Drücken Sie „Berechnen“. Die Rangfolge erscheint unter dem Formular. „Ergebnisübersicht öffnen“ zeigt die vollständige Auswertung.")],
    [L("Save", "Speichern"), L("Give the plan a name and press “Save plan”. It stays in this browser. Under “My calculations” you can edit, rename, duplicate and delete it.", "Geben Sie dem Plan einen Namen und drücken Sie „Berechnung speichern“. Er bleibt in diesem Browser erhalten. Unter „Meine Berechnungen“ können Sie ihn bearbeiten, umbenennen, duplizieren und löschen.")],
    [L("Compare", "Vergleichen"), L("Under “Comparisons” you put up to three saved plans side by side. To test a variation, save the plan as a copy and change one value.", "Unter „Vergleiche“ stellen Sie bis zu drei gespeicherte Pläne nebeneinander. Für eine Variante speichern Sie den Plan als Kopie und ändern einen Wert.")],
    [L("Export", "Exportieren"), L("In “Results” you can download an A4 PDF with inputs, tables, chart and conclusion, print the page, or download a CSV for Excel.", "Unter „Ergebnisse“ laden Sie ein A4-PDF mit Eingaben, Tabellen, Diagramm und Fazit herunter, drucken die Seite oder laden eine CSV für Excel.")],
  ];
  const terms = [
    [L("Complete Financial Plan (VOFI)", "Vollständiger Finanzplan (VOFI)"), L("A table that follows the account of a decision period by period, including interest, payments and withdrawals. It shows what money is really available, which a single discount rate cannot.", "Eine Tabelle, die das Konto einer Entscheidung Periode für Periode verfolgt, mit Zinsen, Zahlungen und Entnahmen. Sie zeigt, wie viel Geld wirklich verfügbar ist, was ein einzelner Kalkulationszins nicht kann.")],
    [t("Deposit rate"), L("Interest you earn on a positive balance, in percent per period.", "Zins, den Sie auf ein positives Guthaben erhalten, in Prozent je Periode.")],
    [t("Borrowing rate"), L("Interest you pay on a negative balance (overdraft), in percent per period. It is usually higher than the deposit rate.", "Zins, den Sie auf einen negativen Kontostand (Überziehung) zahlen, in Prozent je Periode. Er liegt meist über dem Habenzins.")],
    [t("Base payments"), L("Payments that happen in every option, for example your own income. They are the same for all projects.", "Zahlungen, die in jeder Option anfallen, zum Beispiel Ihr eigenes Einkommen. Sie sind für alle Projekte gleich.")],
    [t("Withdrawals"), L("Money you take out of the account in a period, for example for living costs or distributions.", "Geld, das Sie in einer Periode vom Konto entnehmen, zum Beispiel für Lebenshaltung oder Ausschüttungen.")],
    [t("Credit limit"), L("The most the account may be overdrawn. If the balance falls below it in any period, the option is not feasible.", "Der höchste Betrag, um den das Konto überzogen sein darf. Fällt der Stand in einer Periode darunter, ist die Option nicht umsetzbar.")],
    [t("Final balance"), L("The account balance in the last period. Feasible options are ranked by it.", "Der Kontostand in der letzten Periode. Umsetzbare Optionen werden danach geordnet.")],
    [t("vs. Do nothing"), L("Final balance of the option minus the final balance of “Do nothing”. A positive value means the project pays off compared with leaving the account alone.", "Endkontostand der Option minus Endkontostand von „Nichts tun“. Ein positiver Wert heißt: Das Projekt lohnt sich gegenüber dem unveränderten Konto.")],
    [t("Lowest balance"), L("The smallest balance in any period. It shows how deep the account goes into the red and is compared with the credit limit.", "Der kleinste Kontostand in einer Periode. Er zeigt, wie tief das Konto ins Minus geht, und wird mit dem Kreditlimit verglichen.")],
    [L("Scenarios", "Szenarien"), L("Optimistic, realistic and pessimistic runs. Realistic uses your inputs. The other two change positive project cash flows by a percentage and both interest rates by percentage points, with the same formulas.", "Optimistische, realistische und pessimistische Läufe. Realistisch nutzt Ihre Eingaben. Die beiden anderen ändern positive Projektzahlungen um einen Prozentsatz und beide Zinssätze um Prozentpunkte, mit denselben Formeln.")],
  ];
  const how = L(
    "How the account is built: in period 0 the balance is base payments plus project cash flow minus withdrawal. In every later period the balance of the previous period earns the deposit rate if it is 0 or more, or costs the borrowing rate if it is negative. Then base payments and cash flow are added and the withdrawal is subtracted.",
    "So wird das Konto aufgebaut: In Periode 0 ist der Stand Basiszahlungen plus Projektzahlung minus Entnahme. In jeder weiteren Periode wird der Stand der Vorperiode mit dem Habenzins verzinst, wenn er 0 oder größer ist, oder mit dem Sollzins belastet, wenn er negativ ist. Danach werden Basiszahlungen und Zahlung addiert und die Entnahme abgezogen."
  );
  return (
    <div>
      <PageHead title={L("Help", "Hilfe")} intro={L("How to use the tool and what the key figures mean.", "Bedienung des Tools und Bedeutung der Kennzahlen.")}>
        <button type="button" onClick={() => go("new")} style={btn(true)}>{L("New calculation", "Neue Berechnung")}</button>
      </PageHead>
      <h2 style={h2}>{L("Step by step", "Schritt für Schritt")}</h2>
      <ol style={{ ...box, margin: "0 0 24px", paddingLeft: 36, display: "grid", gap: 10, lineHeight: 1.55 }}>
        {steps.map(([k, v]) => <li key={k}><strong>{k}.</strong> {v}</li>)}
      </ol>
      <h2 style={h2}>{L("Key figures and terms", "Kennzahlen und Begriffe")}</h2>
      <dl style={{ ...box, margin: "0 0 14px", display: "grid", gap: 12 }}>
        {terms.map(([k, v]) => <div key={k}><dt style={{ fontWeight: 700 }}>{k}</dt><dd style={{ margin: "2px 0 0", color: muted, lineHeight: 1.55 }}>{v}</dd></div>)}
      </dl>
      <p style={{ ...box, background: cream, lineHeight: 1.55, margin: "0 0 24px" }}>{how}</p>
      <h2 style={h2}>{L("Your data", "Ihre Daten")}</h2>
      <p style={{ lineHeight: 1.55, margin: "0 0 8px" }}>{L("Nothing is uploaded. Plans you save are stored only in this browser on this device. If you clear the browser data or use a private window they can be lost, so download a backup under “My calculations” from time to time.", "Nichts wird hochgeladen. Gespeicherte Pläne liegen nur in diesem Browser auf diesem Gerät. Wenn Sie die Browserdaten löschen oder ein privates Fenster nutzen, können sie verloren gehen. Laden Sie deshalb unter „Meine Berechnungen“ ab und zu ein Backup herunter.")}</p>
      <p style={{ lineHeight: 1.55, color: muted, fontSize: 14 }}>{L("The results follow from your inputs and are no investment advice.", "Die Ergebnisse folgen aus Ihren Eingaben und sind keine Anlageberatung.")}</p>
    </div>
  );
}

// ---------- Upload ----------
export function Upload({ go, calc }) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  async function readFile(file) {
    if (!file) return;
    setBusy(true); setErr(false); setName(file.name); setMsg(L("Reading file …", "Datei wird gelesen …"));
    try {
      const { text: out, method } = await readFileAsText(file, {
        lang: getLang() === "de" ? "deu+eng" : "eng+deu",
        onProgress: (kind, p) => setMsg(`${kind === "read" ? t("Reading file") : t("Recognising text in the scan")} … ${Math.round(p * 100)} %`),
      });
      if (!out) { setText(""); setErr(true); setMsg(t("No text found in this file.")); }
      else {
        setText(out);
        setMsg(method === "ocr" ? t("Text read with text recognition. Scans can contain misread digits, so check every number.") : L("File read. Check the text below, correct it if needed, then apply it.", "Datei gelesen. Prüfen Sie den Text unten, korrigieren Sie ihn bei Bedarf und übernehmen Sie ihn dann."));
      }
    } catch (e) {
      setErr(true); setText("");
      setMsg(e && e.message === "unsupported" ? t("This file type is not supported. Use PDF, PNG, JPG, CSV or TXT.") : t("The file could not be read."));
    }
    setBusy(false);
  }

  async function demoPdf() {
    setBusy(true); setErr(false);
    try {
      const { buildDemoPdf } = await import("./pdf.js");
      const blob = await buildDemoPdf();
      await readFile(new File([blob], "vofi-demo-tabelle.pdf", { type: "application/pdf" }));
    } catch { setErr(true); setMsg(L("The demo PDF could not be created.", "Das Demo-PDF konnte nicht erstellt werden.")); setBusy(false); }
  }
  async function demoPdfDownload() {
    try {
      const { buildDemoPdf } = await import("./pdf.js");
      downloadBlob(await buildDemoPdf(), "vofi-demo-tabelle.pdf");
    } catch { setErr(true); setMsg(L("The demo PDF could not be created.", "Das Demo-PDF konnte nicht erstellt werden.")); }
  }

  function apply() {
    const r = calc.current && calc.current.importFrom(text);
    if (r && r.ok) go("new");
    else { setErr(true); setMsg(t("No recognizable rows found, check the format above.")); }
  }

  return (
    <div>
      <PageHead title={L("Upload your data", "Eigene Daten hochladen")} intro={L("Read a CSV, a PDF, a scan or a photo of a table and fill the calculation from it. The file stays in this browser tab and is not uploaded anywhere.", "Lesen Sie eine CSV, ein PDF, einen Scan oder das Foto einer Tabelle ein und füllen Sie die Berechnung damit. Die Datei bleibt in diesem Browser-Tab und wird nirgendwohin hochgeladen.")} />

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); readFile(e.dataTransfer.files && e.dataTransfer.files[0]); }}
        style={{ border: `2px dashed ${drag ? gold : line}`, borderRadius: 8, padding: "28px 16px", textAlign: "center", background: drag ? cream : "#fff", marginBottom: 12 }}>
        <p style={{ margin: "0 0 12px", color: muted, lineHeight: 1.5 }}>{L("Drop a file here, or choose one.", "Datei hierher ziehen oder auswählen.")}</p>
        <button type="button" data-upload="choose" onClick={() => inputRef.current && inputRef.current.click()} disabled={busy} style={btn(true)}>{L("Choose CSV, PDF or photo", "CSV, PDF oder Foto wählen")}</button>
        <input ref={inputRef} type="file" data-testid="upload-input" hidden accept=".csv,.txt,.pdf,image/png,image/jpeg,application/pdf,text/csv,text/plain"
          onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; readFile(f); }} />
        <p style={{ margin: "12px 0 0", fontSize: 13, color: muted }}>{L("Accepted: CSV, TXT, PDF (with text or scanned), PNG, JPG.", "Erlaubt: CSV, TXT, PDF (mit Text oder gescannt), PNG, JPG.")}</p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <button type="button" data-upload="demo-pdf" onClick={demoPdf} disabled={busy} style={smallBtn()}>{L("Test with demo PDF", "Demo-PDF testen")}</button>
        <button type="button" data-upload="demo-pdf-download" onClick={demoPdfDownload} style={smallBtn()}>{L("Download demo PDF", "Demo-PDF herunterladen")}</button>
        <span style={{ fontSize: 13, color: muted }}>{L("The demo PDF is a small example table you can read in or upload yourself.", "Das Demo-PDF ist eine kleine Beispieltabelle, die Sie einlesen oder selbst hochladen können.")}</span>
      </div>

      {msg && <div role={err ? "alert" : "status"} style={{ marginBottom: 12, fontSize: 14, color: err ? red : muted }}>{name ? `${name}: ` : ""}{msg}</div>}

      {text && (
        <div style={{ ...box, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{L("Text read from the file", "Aus der Datei gelesener Text")}</div>
          <textarea data-testid="upload-text" value={text} onChange={(e) => setText(e.target.value)} rows={10} aria-label={L("Text read from the file", "Aus der Datei gelesener Text")}
            style={{ width: "100%", boxSizing: "border-box", padding: 8, border: `1px solid ${line}`, borderRadius: 6, fontFamily: "ui-monospace, monospace", fontSize: 13 }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button type="button" data-upload="apply" onClick={apply} style={btn(true)}>{L("Apply to calculation", "In Berechnung übernehmen")}</button>
            <button type="button" onClick={() => { setText(""); setMsg(""); setName(""); }} style={btn(false)}>{L("Discard", "Verwerfen")}</button>
          </div>
        </div>
      )}

      <div style={{ ...box, background: cream }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{L("Expected layout", "Erwartetes Format")}</div>
        <p style={{ margin: "0 0 8px", fontSize: 14, color: muted, lineHeight: 1.5 }}>{L("One row per line: the label first, then the numbers for each period. Rows named like the examples are recognised, every other row with two or more numbers becomes a project.", "Eine Zeile pro Eintrag: zuerst die Bezeichnung, dann die Zahlen je Periode. Zeilen mit diesen Bezeichnungen werden erkannt, jede andere Zeile mit zwei oder mehr Zahlen wird ein Projekt.")}</p>
        <pre style={{ margin: 0, fontSize: 13, overflowX: "auto", lineHeight: 1.6 }}>{`${t("Base payments")}  1000 200 200 200 200
${t("Deposit rate")}  3
${t("Borrowing rate")}  8
${t("Credit limit")}  500
${t("Withdrawals")}  0 150 150 150 150
${L("Machine A", "Maschine A")}  -1200 400 400 400 400`}</pre>
      </div>
    </div>
  );
}

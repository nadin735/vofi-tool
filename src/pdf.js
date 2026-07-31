// Real A4 PDF of a calculation, drawn with jsPDF (loaded only when the button is pressed).
// Text, tables and the chart are vector drawings, nothing is a screenshot.
import { t, fmt, L, getLang } from "./i18n.js";
import { runScenarios } from "./core.js";
import { analyse, conclusion, parameterRows, scenarioLabel, scenarioAssumption, signed, dateTimeText } from "./report.js";
import { gold, line, ink, muted, green, red, cream } from "./theme.js";

const SERIES = [gold, "#3F6FB0", green, "#8A5BB0", "#C0762B", "#2A8C94"];
const W = 210, H = 297, M = 16, CW = W - 2 * M;

// jsPDF's built-in font covers Western European text. Replace the few characters outside it.
const clean = (s) => String(s).replace(/−/g, "-").replace(/…/g, "...").replace(/×/g, "x").replace(/[·]/g, "|").replace(/ | | /g, " ");

export async function buildPdf({ inputs, name, params }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  const a = analyse(inputs);
  const { n, ranked, base, best, results } = a;
  const scen = runScenarios(inputs, params, t);
  const lines = conclusion(a, inputs, scen);
  const title = name || L("Current calculation", "Aktuelle Berechnung");
  let y = M;

  const rgb = (hex) => { const v = parseInt(hex.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  const color = (hex) => doc.setTextColor(...rgb(hex));
  const text = (s, x, yy, o = {}) => doc.text(clean(s), x, yy, o);
  const ensure = (h) => { if (y + h > H - 18) { doc.addPage(); y = M; } };
  const font = (size, style = "normal", c = ink) => { doc.setFont("helvetica", style); doc.setFontSize(size); color(c); };
  const wrap = (s, width) => doc.splitTextToSize(clean(s), width);
  const h2 = (s, need = 14) => { ensure(need); y += 4; font(12.5, "bold", ink); text(s, M, y); y += 2; doc.setDrawColor(...rgb(gold)); doc.setLineWidth(0.5); doc.line(M, y, M + 22, y); y += 5; };
  const para = (s, size = 10, c = ink, gap = 1.5) => { font(size, "normal", c); const ls = wrap(s, CW); const lh = size * 0.46; ensure(ls.length * lh + gap); ls.forEach((l) => { text(l, M, y); y += lh; }); y += gap; };

  // Generic table. cols: [{ w, align }], head: strings, rows: arrays of strings or {s, c, b}.
  function table(cols, head, rows, o = {}) {
    const size = o.size || 9, rh = o.rh || 6;
    const draw = (cells, bold, hdr) => {
      let x = M;
      cells.forEach((cell, i) => {
        const c = typeof cell === "object" && cell !== null ? cell : { s: cell };
        const isB = bold || c.b;
        font(size, isB ? "bold" : "normal", c.c || (hdr ? muted : ink));
        let s = clean(c.s ?? "");
        while (doc.getTextWidth(s) > cols[i].w - 2 && s.length > 1) s = s.slice(0, -1);
        if (cols[i].align === "right") text(s, x + cols[i].w - 1, y, { align: "right" }); else text(s, x + 1, y);
        x += cols[i].w;
      });
    };
    ensure(rh * 2 + 2);
    draw(head, true, true); y += 1.8;
    doc.setDrawColor(...rgb(line)); doc.setLineWidth(0.3); doc.line(M, y, M + cols.reduce((s, c) => s + c.w, 0), y); y += rh - 1.2;
    rows.forEach((r) => {
      if (y + rh > H - 18) { doc.addPage(); y = M + 4; draw(head, true, true); y += 1.8; doc.line(M, y, M + cols.reduce((s, c) => s + c.w, 0), y); y += rh - 1.2; }
      draw(r, false, false); y += 1.6;
      doc.setDrawColor(...rgb(line)); doc.setLineWidth(0.15); doc.line(M, y, M + cols.reduce((s, c) => s + c.w, 0), y); y += rh - 1.6;
    });
    y += 2;
  }

  // ----- Title block -----
  font(9, "normal", muted); text(`VOFI Tool  |  ${dateTimeText(Date.now(), getLang())}`, M, y); y += 9;
  font(20, "bold", ink); text(L("Complete Financial Plan (VOFI)", "Vollständiger Finanzplan (VOFI)"), M, y); y += 8;
  font(12, "normal", muted); const tl = wrap(title, CW); tl.forEach((l) => { text(l, M, y); y += 5.5; }); y += 2;

  // ----- Result box -----
  const boxH = 22;
  doc.setFillColor(...rgb(cream)); doc.setDrawColor(...rgb(gold)); doc.setLineWidth(0.6); doc.roundedRect(M, y, CW, boxH, 1.5, 1.5, "FD");
  font(8, "bold", muted); text((best.feasible ? t("Best alternative") : t("No feasible option")).toUpperCase(), M + 4, y + 6);
  if (best.feasible) {
    font(14, "bold", ink); text(best.name, M + 4, y + 13);
    font(10, "normal", ink); text(`${t("Final balance:")} ${fmt(best.balance[n - 1])}`, M + 4, y + 18.5);
    if (!best.baseline) { font(10, "bold", best.balance[n - 1] - base.balance[n - 1] >= 0 ? green : red); text(`${t("vs. Do nothing")}: ${signed(best.balance[n - 1] - base.balance[n - 1])}`, M + CW - 4, y + 18.5, { align: "right" }); }
  } else { font(10, "normal", red); text(t("Every option goes below the credit limit. See the status column for the lowest balances.").slice(0, 110), M + 4, y + 13); }
  y += boxH + 4;

  // ----- Inputs -----
  h2(L("Input parameters", "Eingabeparameter"));
  parameterRows(inputs, results).forEach(([k, v]) => {
    font(9, "normal", ink);
    const ls = wrap(v, CW - 48); ensure(ls.length * 4.2 + 1.5);
    font(9, "normal", muted); text(k, M, y);
    font(9, "normal", ink); ls.forEach((l, i) => text(l, M + 48, y + i * 4.2));
    y += ls.length * 4.2 + 1.5;
  });
  y += 1;
  // Project cash flows
  font(9, "bold", ink); text(L("Project cash flows", "Projektzahlungen"), M, y); y += 4.5;
  results.computed.filter((r) => !r.baseline).forEach((r) => {
    para(`${r.name}: ${r.cashflows.map((v) => fmt(Number(v) || 0)).join("; ")}`, 9, ink, 1);
  });

  // ----- Results table -----
  h2(L("Results", "Ergebnisse"));
  const rc = [{ w: 36 }, { w: 27, align: "right" }, { w: 36, align: "right" }, { w: 30, align: "right" }, { w: 49 }];
  table(rc, [t("Option"), t("Final balance"), t("vs. Do nothing"), t("Lowest balance"), t("Status")],
    ranked.map((r) => [
      { s: r.name, b: r === best && r.feasible },
      r.feasible ? fmt(r.balance[n - 1]) : t("n/a"),
      { s: r.baseline || !r.feasible ? "-" : signed(r.balance[n - 1] - base.balance[n - 1]), c: r.baseline || !r.feasible ? muted : r.balance[n - 1] - base.balance[n - 1] >= 0 ? green : red },
      { s: fmt(r.lowestPoint), c: r.lowestPoint < 0 ? red : ink },
      { s: r.feasible ? t("feasible") : t("credit limit exceeded"), c: r.feasible ? green : red },
    ]), { size: 8.5 });

  // ----- Chart (vector) -----
  const ch = 70;
  ensure(ch + 22);
  h2(t("Account balance over time"), 14);
  const cx0 = M + 20, cx1 = M + CW - 3, cy0 = y + 2, cy1 = y + ch - 12;
  const all = results.computed.flatMap((r) => r.balance);
  let lo = Math.min(0, ...all), hi = Math.max(0, ...all);
  if (hi === lo) hi = lo + 1;
  const rough = (hi - lo) / 4, mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((v) => v >= rough);
  lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
  const X = (i) => cx0 + (n === 1 ? 0 : (i / (n - 1)) * (cx1 - cx0));
  const Y = (v) => cy0 + (1 - (v - lo) / (hi - lo)) * (cy1 - cy0);
  doc.setLineDashPattern([], 0);
  for (let v = lo; v <= hi + step / 2; v += step) {
    doc.setDrawColor(...rgb(line)); doc.setLineWidth(0.2); doc.line(cx0, Y(v), cx1, Y(v));
    font(7, "normal", muted); text(Math.round(v).toLocaleString(getLang() === "de" ? "de-DE" : "en-US"), cx0 - 2, Y(v) + 1, { align: "right" });
  }
  doc.setDrawColor(...rgb(ink)); doc.setLineWidth(0.35); doc.line(cx0, Y(0), cx1, Y(0));
  for (let i = 0; i < n; i++) { font(7, "normal", muted); text(String(i), X(i), cy1 + 4, { align: "center" }); }
  font(7, "normal", muted); text(t("Period t"), (cx0 + cx1) / 2, cy1 + 8, { align: "center" });
  let ci = 0;
  const legend = [];
  results.computed.forEach((r) => {
    const c = r.baseline ? muted : SERIES[ci++ % SERIES.length];
    legend.push([r, c]);
    doc.setDrawColor(...rgb(c)); doc.setLineWidth(r.baseline ? 0.35 : 0.7);
    doc.setLineDashPattern(r.baseline ? [1.6, 1.2] : [], 0);
    for (let i = 1; i < n; i++) doc.line(X(i - 1), Y(r.balance[i - 1]), X(i), Y(r.balance[i]));
    doc.setLineDashPattern([], 0);
    doc.setFillColor(...rgb(c)); r.balance.forEach((v, i) => doc.circle(X(i), Y(v), 0.7, "F"));
  });
  y = cy1 + 12;
  // legend, wrapped
  let lx = M;
  legend.forEach(([r, c]) => {
    const label = clean(r.name + (r.feasible ? "" : ` (${t("credit limit exceeded")})`));
    font(8, "normal", ink);
    const w = doc.getTextWidth(label) + 12;
    if (lx + w > M + CW) { lx = M; y += 4.5; }
    doc.setDrawColor(...rgb(c)); doc.setLineWidth(0.7); doc.setLineDashPattern(r.baseline ? [1.4, 1] : [], 0); doc.line(lx, y - 1, lx + 7, y - 1); doc.setLineDashPattern([], 0);
    text(label, lx + 9, y); lx += w;
  });
  y += 6;

  // ----- Period tables -----
  h2(L("Account balance per option", "Kontostand je Option"), 52);
  const chunk = 6;
  results.computed.forEach((r) => {
    for (let s = 0; s < n; s += chunk) {
      const idx = Array.from({ length: Math.min(chunk, n - s) }, (_, k) => s + k);
      const lw = 34, cw = (CW - lw) / chunk;
      const cols = [{ w: lw }, ...idx.map(() => ({ w: cw, align: "right" }))];
      ensure(34);
      if (s === 0) { font(10, "bold", ink); text(r.name, M, y); y += 5; }
      table(cols, ["t", ...idx.map(String)], [
        [t("Cash flow"), ...idx.map((i) => fmt(Number(r.cashflows[i]) || 0))],
        [t("Withdrawal"), ...idx.map((i) => fmt(Number(results.withdrawals[i]) || 0))],
        [{ s: t("Balance"), b: true }, ...idx.map((i) => ({ s: fmt(r.balance[i]), b: true, c: r.balance[i] < 0 ? red : green }))],
      ], { size: 7.5, rh: 5.6 });
    }
  });

  // ----- Scenarios -----
  h2(L("Scenario analysis", "Szenarioanalyse"));
  ["pessimistic", "realistic", "optimistic"].forEach((k) => para(`${scenarioLabel(k)}: ${scenarioAssumption(k, params)}`, 8.5, muted, 0.6));
  y += 1.5;
  const sc = [{ w: 62 }, { w: 38, align: "right" }, { w: 38, align: "right" }, { w: 38, align: "right" }];
  table(sc, [t("Option"), ...["pessimistic", "realistic", "optimistic"].map(scenarioLabel)],
    results.computed.map((r) => [
      r.name,
      ...["pessimistic", "realistic", "optimistic"].map((k) => {
        const x = scen[k].results.computed.find((q) => q.name === r.name);
        const win = scen[k].winner.name === r.name && scen[k].winner.feasible;
        return { s: x.feasible ? fmt(x.balance[n - 1]) + (win ? "  *" : "") : t("n/a"), b: win, c: !x.feasible ? muted : x.balance[n - 1] < 0 ? red : ink };
      }),
    ]), { size: 8.5 });
  para(L("* best alternative in the scenario. n/a: the option breaks the credit limit.", "* beste Alternative im Szenario. k. A.: Die Option überschreitet das Kreditlimit."), 8, muted);

  // ----- Conclusion -----
  h2(L("Conclusion", "Fazit"));
  lines.forEach((s, i) => para(s, i === lines.length - 1 ? 8.5 : 10, i === lines.length - 1 ? muted : ink, 2));

  // ----- Footer on every page -----
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...rgb(line)); doc.setLineWidth(0.2); doc.line(M, H - 13, W - M, H - 13);
    font(8, "normal", muted);
    text(`VOFI Tool  |  ${clean(title).slice(0, 60)}`, M, H - 8.5);
    text(`${L("Page", "Seite")} ${p} ${L("of", "von")} ${pages}`, W - M, H - 8.5, { align: "right" });
  }
  doc.setProperties({ title: `VOFI - ${clean(title)}`, subject: "VOFI", creator: "VOFI Tool" });
  return doc.output("blob");
}

// A small sample table as a real PDF with a text layer, for the "test with a demo PDF" button.
// The layout is exactly what the reader expects: label first, then the numbers.
export async function buildDemoPdf() {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text("VOFI Demo-Tabelle", 20, 24);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110);
  doc.text("Beispielwerte zum Ausprobieren. Zahlen je Periode t = 0 bis 4.", 20, 31);
  doc.setTextColor(0); doc.setFontSize(11);
  const rows = [
    ["Zeitpunkt t", "0", "1", "2", "3", "4"],
    ["Basiszahlungen", "1000", "200", "200", "200", "200"],
    ["Habenzins", "3"], ["Sollzins", "8"], ["Kreditlimit", "500"],
    ["Entnahmen", "0", "150", "150", "150", "150"],
    ["Maschine A", "-1200", "400", "400", "400", "400"],
    ["Maschine B", "-800", "100", "300", "400", "500"],
  ];
  rows.forEach((r, i) => {
    const y = 46 + i * 9;
    doc.text(r[0], 20, y);
    r.slice(1).forEach((c, k) => doc.text(c, 80 + k * 22, y, { align: "right" }));
  });
  return doc.output("blob");
}

// Browser check of the whole app. Run: npx vite preview --port 4173 & node tests/e2e.mjs
import { chromium } from "playwright";
import fs from "fs";
const BASE = process.env.BASE || "http://localhost:4173";
const OUT = process.env.OUT || "/tmp/e2e-out";
fs.mkdirSync(OUT, { recursive: true });
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.log("FAIL", m); } else console.log("ok  ", m); };

const browser = await chromium.launch();
async function session(opts, fn) {
  const ctx = await browser.newContext({ locale: "de-DE", acceptDownloads: true, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await fn(page, ctx);
  ok(errors.length === 0, `no console errors (${errors.slice(0, 2).join(" | ")})`);
  await ctx.close();
}
const has = async (page, text, ms = 3000) => { try { await page.locator(`text=${text}`).first().waitFor({ timeout: ms }); return true; } catch { return false; } };
const noOverflow = async (page, label) => ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `no horizontal page scroll: ${label}`);

for (const [name, vp] of [["mobile", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }], ["desktop", { viewport: { width: 1280, height: 900 } }]]) {
  await session(vp, async (page) => {
    console.log("== " + name);
    await page.goto(BASE + "/");
    await page.waitForSelector("text=Neue Berechnung starten");
    ok(await page.locator("[data-tile]").count() === 6, "six function tiles");
    ok(/Guten (Morgen|Tag|Abend)/.test(await page.locator("h1:visible").first().innerText()), "greeting");
    await noOverflow(page, "home");
    await page.screenshot({ path: `${OUT}/${name}-home.png` });

    // demo area at the top of every page
    await page.click("[data-nav=help]"); ok(await page.locator("[data-demo=results]").isVisible(), "demo area visible on help");
    await page.click("[data-nav=home]");
    await page.click("[data-demo=results]");
    ok(await has(page, "Szenarioanalyse"), "demo button opens results");
    ok(await page.locator("[data-scenario=realistic]").innerText().then((x) => x.includes("Demo: Machine B")), "demo results show best alternative");
    await page.reload(); await page.waitForSelector("text=Teste mit Demo-Daten");
    // empty states
    await page.click("[data-nav=saved]"); ok(await has(page, "noch keine Berechnung gespeichert"), "saved empty state");
    await page.click("[data-nav=compare]"); ok(await has(page, "mindestens zwei gespeicherte"), "compare empty state");
    await page.click("[data-nav=results]"); ok(await has(page, "Es gibt noch keine Berechnung"), "results empty state");

    // upload area: demo PDF, own CSV, own PDF
    await page.click("[data-nav=import]");
    await page.click("[data-upload=demo-pdf]");
    await page.waitForSelector("[data-testid=upload-text]");
    ok((await page.inputValue("[data-testid=upload-text]")).includes("Maschine B"), "demo pdf text read");
    await noOverflow(page, "upload");
    await page.click("[data-upload=apply]");
    await page.waitForSelector("text=Vollständiger Finanzplan (VOFI)");
    await page.click("button:has-text('Berechnen')");
    ok(await has(page, "Beste Alternative"), "demo pdf fills and calculates");
    await page.click("[data-nav=import]");
    fs.writeFileSync(`${OUT}/own.csv`, "Basiszahlungen;1000;200;200\nHabenzins;2\nSollzins;9\nProjekt X;-500;300;400\nProjekt Y;-400;200;350\n");
    await page.setInputFiles("[data-testid=upload-input]", `${OUT}/own.csv`);
    await page.waitForSelector("[data-testid=upload-text]");
    ok((await page.inputValue("[data-testid=upload-text]")).includes("Projekt X"), "own csv read");
    await page.click("[data-upload=apply]");
    await page.waitForSelector("text=Vollständiger Finanzplan (VOFI)");
    ok(await page.locator("input[value='Projekt X']").count() === 1, "csv project in form");
    const [dlp] = await Promise.all([page.waitForEvent("download"), (async () => { await page.click("[data-nav=import]"); await page.click("[data-upload=demo-pdf-download]"); })()]);
    await dlp.saveAs(`${OUT}/demo-table.pdf`);
    await page.setInputFiles("[data-testid=upload-input]", `${OUT}/demo-table.pdf`);
    await page.waitForSelector("[data-testid=upload-text]");
    ok((await page.inputValue("[data-testid=upload-text]")).includes("Maschine A"), "own pdf read");
    await page.fill("[data-testid=upload-text]", "nur Text ohne Zahlen");
    await page.click("[data-upload=apply]");
    ok(await page.locator("[role=alert]:visible", { hasText: "Keine erkennbaren Zeilen" }).count() === 1, "bad text shows an error");
    // new calculation with demo data
    await page.click("[data-nav=home]");
    await page.click("text=Neue Berechnung starten");
    await page.waitForSelector("text=Vollständiger Finanzplan (VOFI)");
    await page.click("text=Mit Beispieldaten testen, ohne Anmeldung");
    await page.click("button:has-text('Berechnen')");
    await page.waitForSelector("text=Beste Alternative");
    ok(true, "calculated demo");
    await noOverflow(page, "calculator with results");
    // save
    await page.fill("input[placeholder='Name dieser Berechnung']", "Maschinen Test");
    await page.click("button:has-text('Berechnung speichern')");
    ok(await page.locator("text=In diesem Browser gespeichert").count() === 1, "saved message");
    // second plan: change credit limit, save as copy
    await page.click("button:has-text('Als Kopie speichern')");
    await page.waitForTimeout(300);
    await page.click("[data-nav=saved]");
    await page.waitForSelector("[data-plan]");
    ok(await page.locator("[data-plan]").count() === 2, "two plans listed");
    await noOverflow(page, "saved list");
    await page.screenshot({ path: `${OUT}/${name}-saved.png` });

    // persistence after reload
    await page.reload();
    await page.click("[data-nav=saved]");
    ok(await page.locator("[data-plan]").count() === 2, "plans survive reload");

    // rename
    await page.locator("[data-plan]").first().locator("button:has-text('Umbenennen')").click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("Variante Zwei");
    await page.keyboard.press("Enter");
    ok(await page.locator("[data-plan='Variante Zwei']").count() === 1, "renamed");
    // duplicate
    await page.locator("[data-plan='Variante Zwei']").locator("button:has-text('Duplizieren')").click();
    ok(await page.locator("[data-plan]").count() === 3, "duplicated");
    ok(await page.locator("[data-plan='Variante Zwei (Kopie)']").count() === 1, "copy named");
    // delete needs confirmation
    await page.locator("[data-plan='Variante Zwei (Kopie)']").locator("button:has-text('Löschen')").click();
    ok(await page.locator("[data-plan]").count() === 3, "delete waits for confirmation");
    await page.locator("[data-plan='Variante Zwei (Kopie)']").locator("button:has-text('Ja, löschen')").click();
    ok(await page.locator("[data-plan]").count() === 2, "deleted after confirmation");
    // make plans differ: edit one
    await page.locator("[data-plan='Variante Zwei']").locator("button:has-text('Bearbeiten')").click();
    await page.waitForSelector("text=Änderungen speichern");
    ok(await page.inputValue("input[placeholder='Name dieser Berechnung']") === "Variante Zwei", "edit loads the plan");
    const rate = page.locator("text=Habenzins in %").locator("xpath=following::input[1]");
    await rate.fill("1");
    await page.click("button:has-text('Berechnen')");
    await page.click("button:has-text('Änderungen speichern')");
    await page.waitForTimeout(300);
    await page.click("[data-nav=saved]");
    await page.waitForSelector("[data-plan]");
    console.log("plans after edit:", await page.locator("[data-plan]").evaluateAll((e) => e.map((x) => x.getAttribute("data-plan"))));
    ok(await page.locator("[data-plan]").count() === 2, "edit updates, no new plan");

    // compare
    await page.click("[data-nav=compare]");
    await page.waitForSelector("[data-testid=compare-table]");
    ok(await page.locator("[data-testid=compare-table] thead th").count() === 3, "compare shows two plans");
    await noOverflow(page, "compare");
    await page.screenshot({ path: `${OUT}/${name}-compare.png` });

    // results
    await page.locator("[data-nav=saved]").click();
    await page.locator("[data-plan]").first().locator("button:has-text('Ergebnisse')").click();
    await page.waitForSelector("text=Szenarioanalyse");
    ok(await page.locator("[data-scenario]").count() === 3, "three scenarios");
    const pess = await page.locator("[data-scenario=pessimistic]").innerText();
    const opt = await page.locator("[data-scenario=optimistic]").innerText();
    ok(pess !== opt, "scenarios differ");
    await noOverflow(page, "results");
    await page.screenshot({ path: `${OUT}/${name}-results.png`, fullPage: true });
    // scenario parameter changes the table
    const before = await page.locator("[data-testid=scenario-table]").innerText();
    await page.fill("input[aria-label='Änderung der Einzahlungen in %']", "30");
    const after = await page.locator("[data-testid=scenario-table]").innerText();
    ok(before !== after, "scenario parameter changes the numbers");

    // PDF
    const [dl] = await Promise.all([page.waitForEvent("download"), page.click("button:has-text('PDF herunterladen')")]);
    const pdfPath = `${OUT}/${name}.pdf`; await dl.saveAs(pdfPath);
    ok(/^vofi-.*\.pdf$/.test(dl.suggestedFilename()), "pdf filename " + dl.suggestedFilename());
    ok(fs.readFileSync(pdfPath).subarray(0, 5).toString() === "%PDF-", "real PDF file");
    // CSV
    const [dl2] = await Promise.all([page.waitForEvent("download"), page.click("button:has-text('CSV herunterladen')")]);
    ok(dl2.suggestedFilename().endsWith(".csv"), "csv download");

    // print: window.print is called, print media hides the chrome
    await page.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
    await page.click("button:has-text('Drucken')");
    ok(await page.evaluate(() => window.__printed) === 1, "print called");
    await page.emulateMedia({ media: "print" });
    ok(!(await page.locator("nav").isVisible()), "nav hidden in print");
    ok(await page.locator("text=Fazit").first().isVisible(), "results visible in print");
    await page.pdf({ path: `${OUT}/${name}-print.pdf`, format: "A4" });
    await page.emulateMedia({ media: "screen" });

    // backup
    await page.click("[data-nav=saved]");
    const [dl3] = await Promise.all([page.waitForEvent("download"), page.click("button:has-text('Backup herunterladen')")]);
    const bpath = `${OUT}/backup.json`; await dl3.saveAs(bpath);
    const parsed = JSON.parse(fs.readFileSync(bpath, "utf8"));
    ok(parsed.plans.length === 2, "backup has two plans");
    await page.locator("[data-plan]").first().locator("button:has-text('Löschen')").click();
    await page.locator("button:has-text('Ja, löschen')").click();
    ok(await page.locator("[data-plan]").count() === 1, "one left");
    await page.setInputFiles("[data-testid=backup-input]", bpath);
    await page.waitForSelector("text=hinzugefügt");
    ok(await page.locator("[data-plan]").count() === 3, "backup restored (added as new)");

    // help + language
    await page.click("[data-nav=help]");
    ok(await has(page, "Kennzahlen und Begriffe"), "help");
    await noOverflow(page, "help");
    await page.click("button:has-text('EN')");
    ok(await has(page, "Key figures and terms"), "english help");
    await page.click("[data-nav=results]");
    await page.waitForSelector("text=Scenario analysis");
    const [dl4] = await Promise.all([page.waitForEvent("download"), page.click("button:has-text('Download PDF')")]);
    await dl4.saveAs(`${OUT}/${name}-en.pdf`);
    ok(true, "english pdf");
  });
}
await browser.close();
console.log(`\n${checks - fails}/${checks} checks passed`);
process.exit(fails ? 1 : 0);

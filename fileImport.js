// Reads a file in the browser and returns plain text lines for the VOFI text parser.
// PDF with a text layer: read directly. Scanned PDF or photo: OCR with tesseract.js.
// Everything runs in this tab; worker, wasm and language data are served from /ocr.

const OCR_BASE = "/ocr/";

function cleanLine(s) {
  return s
    .replace(/[−‒–—]/g, "-")
    .replace(/ /g, " ")
    .replace(/(€|EUR|Euro)/gi, " ")
    .replace(/[;\t|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Group PDF text items into rows by their vertical position, left to right.
function rowsFromItems(items) {
  const rows = [];
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue;
    const y = it.transform[5], x = it.transform[4];
    let row = rows.find((r) => Math.abs(r.y - y) < 3);
    if (!row) { row = { y, parts: [] }; rows.push(row); }
    row.parts.push({ x, s: it.str });
  }
  return rows
    .sort((a, b) => b.y - a.y)
    .map((r) => r.parts.sort((a, b) => a.x - b.x).map((p) => p.s).join(" "));
}

async function ocrCanvasList(canvases, lang, onProgress) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(lang, 1, {
    workerPath: OCR_BASE + "worker.min.js",
    corePath: OCR_BASE,
    langPath: OCR_BASE,
    workerBlobURL: false,
    logger: (m) => { if (m.status === "recognizing text") onProgress && onProgress("ocr", m.progress); },
  });
  try {
    await worker.setParameters({ preserve_interword_spaces: "1" });
    const out = [];
    for (let i = 0; i < canvases.length; i++) {
      const { data } = await worker.recognize(canvases[i]);
      out.push(data.text);
      onProgress && onProgress("page", (i + 1) / canvases.length);
    }
    return out.join("\n");
  } finally {
    await worker.terminate();
  }
}

async function imageToCanvas(file) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}

export async function readFileAsText(file, { lang = "eng+deu", onProgress } = {}) {
  const name = file.name.toLowerCase();
  let method = "text", raw = "";

  if (/\.(csv|tsv|txt)$/.test(name) || file.type.startsWith("text/")) {
    raw = await file.text();
  } else if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = OCR_BASE + "pdf.worker.min.mjs";
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = Math.min(pdf.numPages, 15);
    const lines = [];
    for (let p = 1; p <= pages; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      lines.push(...rowsFromItems(tc.items));
      onProgress && onProgress("read", p / pages);
    }
    raw = lines.join("\n");
    if (raw.replace(/\s/g, "").length < 20 * pages) {
      // No usable text layer: a scan. Render the pages and run OCR.
      method = "ocr";
      const canvases = [];
      for (let p = 1; p <= pages; p++) {
        const page = await pdf.getPage(p);
        const vp = page.getViewport({ scale: 2.2 });
        const c = document.createElement("canvas");
        c.width = Math.round(vp.width); c.height = Math.round(vp.height);
        await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
        canvases.push(c);
      }
      raw = await ocrCanvasList(canvases, lang, onProgress);
    }
  } else if (/^image\//.test(file.type) || /\.(png|jpe?g|webp|bmp)$/.test(name)) {
    method = "ocr";
    raw = await ocrCanvasList([await imageToCanvas(file)], lang, onProgress);
  } else {
    throw new Error("unsupported");
  }

  const text = raw.split("\n").map(cleanLine).filter(Boolean).join("\n");
  return { text, method };
}

import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";
import sharp from "sharp";

const execFileAsync = promisify(execFile);

export async function processPdfTask(dataDir, payload) {
  const { type, files = [], options = {} } = payload;
  if (!type || !files.length) {
    throw new Error("Missing task type or files");
  }

  const outputDir = path.join(dataDir, "outputs");
  await fs.mkdir(outputDir, { recursive: true });

  if (type === "merge") return mergePdfs(files, outputDir);
  if (type === "split") return splitPdf(files[0], outputDir, options);
  if (type === "watermark") return watermarkPdf(files[0], outputDir, options);
  if (type === "rotate") return rotatePdf(files[0], outputDir, options);
  if (type === "delete-pages") return deletePages(files[0], outputDir, options);
  if (type === "image-to-pdf") return imagesToPdf(files, outputDir);
  if (type === "compress") return compressPdf(files[0], outputDir, options);
  if (type === "convert-image") return convertPdfToImages(files[0], outputDir, options);

  throw new Error(`Unsupported task type: ${type}`);
}

async function mergePdfs(files, outputDir) {
  const merged = await PDFDocument.create();
  for (const file of files) {
    const src = await PDFDocument.load(await fs.readFile(file.path), { ignoreEncryption: true });
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  return writePdf(merged, outputDir, "merged.pdf", "PDF merge completed");
}

async function splitPdf(file, outputDir, options) {
  const source = await PDFDocument.load(await fs.readFile(file.path), { ignoreEncryption: true });
  const indices = parseRanges(options.ranges || "1", source.getPageCount());
  const out = await PDFDocument.create();
  const pages = await out.copyPages(source, indices);
  pages.forEach((page) => out.addPage(page));
  return writePdf(out, outputDir, "split.pdf", "PDF split completed");
}

async function watermarkPdf(file, outputDir, options) {
  const doc = await PDFDocument.load(await fs.readFile(file.path), { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const text = options.text || "CONFIDENTIAL";
  doc.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    page.drawText(text, {
      x: width * 0.18,
      y: height * 0.48,
      size: 36,
      font,
      color: rgb(0.75, 0.1, 0.1),
      opacity: 0.22,
      rotate: degrees(-28)
    });
  });
  return writePdf(doc, outputDir, "watermarked.pdf", "Watermark added");
}

async function rotatePdf(file, outputDir, options) {
  const doc = await PDFDocument.load(await fs.readFile(file.path), { ignoreEncryption: true });
  const value = Number(options.degrees || 90);
  doc.getPages().forEach((page) => page.setRotation(degrees(value)));
  return writePdf(doc, outputDir, "rotated.pdf", "PDF rotation completed");
}

async function deletePages(file, outputDir, options) {
  const source = await PDFDocument.load(await fs.readFile(file.path), { ignoreEncryption: true });
  const remove = new Set(parseRanges(options.pages || "", source.getPageCount()));
  const keep = source.getPageIndices().filter((index) => !remove.has(index));
  if (!keep.length) throw new Error("Cannot delete all pages");
  const out = await PDFDocument.create();
  const pages = await out.copyPages(source, keep);
  pages.forEach((page) => out.addPage(page));
  return writePdf(out, outputDir, "deleted-pages.pdf", "Pages deleted");
}

async function imagesToPdf(files, outputDir) {
  const doc = await PDFDocument.create();
  for (const file of files) {
    const normalized = await sharp(file.path).jpeg().toBuffer();
    const image = await doc.embedJpg(normalized);
    const page = doc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }
  return writePdf(doc, outputDir, "images.pdf", "Images converted to PDF");
}

async function compressPdf(file, outputDir, options) {
  const output = path.join(outputDir, `${Date.now()}-compressed.pdf`);
  const gs = await findCommand(getGhostscriptCandidates(), { required: false, probeArgs: ["--version"] });

  if (gs) {
    const quality = options.quality || "medium";
    const preset = {
      low: "/screen",
      medium: "/ebook",
      high: "/printer"
    }[quality] || "/ebook";

    await execFileAsync(gs, [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      `-dPDFSETTINGS=${preset}`,
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      `-sOutputFile=${output}`,
      file.path
    ]);

    return toResult(output, "PDF compression completed with Ghostscript");
  }

  const qpdf = await findCommand(getQpdfCandidates(), { required: true, probeArgs: ["--version"] });
  await execFileAsync(qpdf, [
    "--linearize",
    "--object-streams=generate",
    "--stream-data=compress",
    "--recompress-flate",
    file.path,
    output
  ]);

  return toResult(output, "PDF compression completed with QPDF");
}

async function convertPdfToImages(file, outputDir, options) {
  const pdftoppm = await findCommand(getPopplerCandidates(), { required: true, probeArgs: ["-h"] });
  const dpi = String(Number(options.dpi || 144));
  const prefix = path.join(outputDir, `${Date.now()}-page`);

  await execFileAsync(pdftoppm, ["-png", "-r", dpi, file.path, prefix]);

  const outputPrefix = path.basename(prefix);
  const images = (await fs.readdir(outputDir))
    .filter((name) => name.startsWith(outputPrefix) && name.endsWith(".png"))
    .sort()
    .map((name) => path.join(outputDir, name));

  if (!images.length) {
    throw new Error("PDF image conversion produced no output");
  }

  return {
    kind: "image",
    filePath: images[0],
    url: `/files/${path.basename(images[0])}`,
    files: images.map((imagePath) => ({
      filePath: imagePath,
      url: `/files/${path.basename(imagePath)}`
    })),
    message: `PDF converted to ${images.length} image(s)`
  };
}

async function writePdf(doc, outputDir, name, message) {
  const output = path.join(outputDir, `${Date.now()}-${name}`);
  await fs.writeFile(output, await doc.save());
  return toResult(output, message);
}

function toResult(filePath, message) {
  return {
    kind: "pdf",
    filePath,
    url: `/files/${path.basename(filePath)}`,
    message
  };
}

function parseRanges(value, total) {
  const indices = new Set();
  String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [startRaw, endRaw] = part.split("-");
      const start = Math.max(1, Number(startRaw));
      const end = Math.min(total, Number(endRaw || startRaw));
      for (let page = start; page <= end; page += 1) indices.add(page - 1);
    });
  if (!indices.size) throw new Error("Invalid page range");
  return Array.from(indices).sort((a, b) => a - b);
}

async function findCommand(candidates, options) {
  const { required, probeArgs } = options;
  for (const command of candidates) {
    if (!command) continue;
    try {
      await execFileAsync(command, probeArgs);
      return command;
    } catch (error) {
      if (error.code !== "ENOENT") return command;
    }
  }
  if (required) {
    throw new Error(`Required command not found: ${candidates.filter(Boolean).join(" or ")}`);
  }
  return null;
}

function getGhostscriptCandidates() {
  return [
    process.env.PDF_TOOL_GS,
    "gswin64c",
    "gswin32c",
    "gs",
    "C:\\Program Files\\gs\\gs10.05.1\\bin\\gswin64c.exe",
    "C:\\Program Files\\gs\\gs10.04.0\\bin\\gswin64c.exe"
  ];
}

function getQpdfCandidates() {
  return [
    process.env.PDF_TOOL_QPDF,
    "qpdf",
    "C:\\Program Files\\qpdf 12.3.2\\bin\\qpdf.exe"
  ];
}

function getPopplerCandidates() {
  const localAppData = process.env.LOCALAPPDATA;
  return [
    process.env.PDF_TOOL_PDFTOPPM,
    "pdftoppm",
    localAppData
      ? path.join(
          localAppData,
          "Microsoft",
          "WinGet",
          "Packages",
          "oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe",
          "poppler-25.07.0",
          "Library",
          "bin",
          "pdftoppm.exe"
        )
      : null
  ];
}

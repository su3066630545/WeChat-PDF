import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import sharp from "sharp";
import XLSX from "xlsx";

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
  if (type === "txt-to-pdf") return textToPdf(files[0], outputDir);
  if (type === "web-to-pdf") return htmlToPdf(files[0], outputDir);
  if (type === "word-to-pdf") return convertWithLibreOffice(files[0], outputDir, "pdf", "Word converted to PDF");
  if (type === "excel-to-pdf") return excelToPdf(files[0], outputDir);
  if (type === "ppt-to-pdf") return convertWithLibreOffice(files[0], outputDir, "pdf", "PPT converted to PDF");
  if (type === "cad-to-pdf") return convertWithLibreOffice(files[0], outputDir, "pdf", "CAD drawing converted to PDF");
  if (type === "pdf-to-word") return convertWithLibreOffice(files[0], outputDir, "docx", "PDF converted to Word");
  if (type === "pdf-to-excel") return convertWithLibreOffice(files[0], outputDir, "xlsx", "PDF converted to Excel");
  if (type === "pdf-to-ppt") return convertWithLibreOffice(files[0], outputDir, "pptx", "PDF converted to PPT");
  if (type === "pdf-to-text") return convertPdfToText(files[0], outputDir);
  if (type === "pdf-to-html") return convertPdfToHtml(files[0], outputDir);
  if (type === "pdf-to-epub") return convertPdfToEpub(files[0], outputDir);
  if (type === "extract-images") return extractImages(files[0], outputDir);

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
  const { font, supportsUnicode } = await embedTextFont(doc);
  const text = normalizeText(options.text || "CONFIDENTIAL", supportsUnicode);
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
    const preset = { low: "/screen", medium: "/ebook", high: "/printer" }[quality] || "/ebook";
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
  const pdftoppm = await findCommand(getPopplerCandidates("pdftoppm"), { required: true, probeArgs: ["-h"] });
  const dpi = String(Number(options.dpi || 144));
  const prefix = path.join(outputDir, `${Date.now()}-page`);

  await execFileAsync(pdftoppm, ["-png", "-r", dpi, file.path, prefix]);
  const images = await findGeneratedFiles(outputDir, path.basename(prefix), ".png");
  if (!images.length) throw new Error("PDF image conversion produced no output");

  return {
    kind: "image",
    filePath: images[0],
    fileName: path.basename(images[0]),
    fileType: "png",
    url: `/files/${path.basename(images[0])}`,
    files: images.map((imagePath) => ({
      filePath: imagePath,
      fileName: path.basename(imagePath),
      fileType: "png",
      url: `/files/${path.basename(imagePath)}`
    })),
    message: `PDF converted to ${images.length} image(s)`
  };
}

async function textToPdf(file, outputDir) {
  const text = await fs.readFile(file.path, "utf8");
  return renderTextAsPdf(text, outputDir, "text.pdf", "TXT converted to PDF");
}

async function htmlToPdf(file, outputDir) {
  const html = await fs.readFile(file.path, "utf8");
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return renderTextAsPdf(text || "Empty HTML document", outputDir, "web.pdf", "HTML converted to PDF");
}

async function excelToPdf(file, outputDir) {
  const workbook = XLSX.readFile(file.path, { cellDates: true });
  const doc = await PDFDocument.create();
  const { font, supportsUnicode } = await embedTextFont(doc);
  const fontSize = 9;
  const lineHeight = 14;
  const margin = 36;
  const width = 842;
  const height = 595;
  const maxColumns = 8;
  const columnWidth = Math.floor((width - margin * 2) / maxColumns);
  let page = doc.addPage([width, height]);
  let y = height - margin;

  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      raw: false,
      defval: ""
    });

    if (y < margin + lineHeight * 3) {
      page = doc.addPage([width, height]);
      y = height - margin;
    }

    page.drawText(normalizeText(sheetName, supportsUnicode), { x: margin, y, size: 13, font });
    y -= lineHeight * 1.5;

    for (const row of rows) {
      if (y < margin) {
        page = doc.addPage([width, height]);
        y = height - margin;
      }

      row.slice(0, maxColumns).forEach((cell, index) => {
        const text = truncate(normalizeText(cell, supportsUnicode), 22);
        page.drawText(text || " ", {
          x: margin + index * columnWidth,
          y,
          size: fontSize,
          font
        });
      });
      y -= lineHeight;
    }

    y -= lineHeight;
  }

  return writePdf(doc, outputDir, "excel.pdf", "Excel converted to PDF");
}

async function renderTextAsPdf(text, outputDir, name, message) {
  const doc = await PDFDocument.create();
  const { font, supportsUnicode } = await embedTextFont(doc);
  const fontSize = 12;
  const lineHeight = 18;
  const margin = 48;
  const width = 595;
  const height = 842;
  let page = doc.addPage([width, height]);
  let y = height - margin;

  const lines = wrapText(normalizeText(text, supportsUnicode), 82);
  for (const line of lines) {
    if (y < margin) {
      page = doc.addPage([width, height]);
      y = height - margin;
    }
    page.drawText(line || " ", { x: margin, y, size: fontSize, font });
    y -= lineHeight;
  }

  return writePdf(doc, outputDir, name, message);
}

async function convertWithLibreOffice(file, outputDir, targetExt, message) {
  const soffice = await findCommand(getLibreOfficeCandidates(), { required: true, probeArgs: ["--version"] });
  await execFileAsync(soffice, [
    "--headless",
    "--convert-to",
    targetExt,
    "--outdir",
    outputDir,
    file.path
  ]);

  const baseName = path.basename(file.path, path.extname(file.path));
  const generated = path.join(outputDir, `${baseName}.${targetExt}`);
  const output = path.join(outputDir, `${Date.now()}-${safeBaseName(file.name)}.${targetExt}`);
  await fs.rename(generated, output).catch(async () => {
    const candidates = await findGeneratedFiles(outputDir, baseName, `.${targetExt}`);
    if (!candidates.length) throw new Error(`LibreOffice produced no ${targetExt.toUpperCase()} output`);
    await fs.rename(candidates[0], output);
  });

  return toResult(output, message);
}

async function convertPdfToText(file, outputDir) {
  const pdftotext = await findCommand(getPopplerCandidates("pdftotext"), { required: true, probeArgs: ["-h"] });
  const output = path.join(outputDir, `${Date.now()}-${safeBaseName(file.name)}.txt`);
  await execFileAsync(pdftotext, ["-layout", file.path, output]);
  return toResult(output, "PDF converted to text");
}

async function convertPdfToHtml(file, outputDir) {
  const pdftohtml = await findCommand(getPopplerCandidates("pdftohtml"), { required: true, probeArgs: ["-h"] });
  const output = path.join(outputDir, `${Date.now()}-${safeBaseName(file.name)}.html`);
  await execFileAsync(pdftohtml, ["-s", "-noframes", file.path, output]);
  return toResult(output, "PDF converted to HTML");
}

async function convertPdfToEpub(file, outputDir) {
  const pandoc = await findCommand(getPandocCandidates(), { required: true, probeArgs: ["--version"] });
  const output = path.join(outputDir, `${Date.now()}-${safeBaseName(file.name)}.epub`);
  await execFileAsync(pandoc, [file.path, "-o", output]);
  return toResult(output, "PDF converted to EPUB");
}

async function extractImages(file, outputDir) {
  const pdfimages = await findCommand(getPopplerCandidates("pdfimages"), { required: true, probeArgs: ["-h"] });
  const prefix = path.join(outputDir, `${Date.now()}-extract`);
  await execFileAsync(pdfimages, ["-png", file.path, prefix]);
  const images = await findGeneratedFiles(outputDir, path.basename(prefix), ".png");
  if (!images.length) throw new Error("No images found in this PDF");

  return {
    kind: "image",
    filePath: images[0],
    fileName: path.basename(images[0]),
    fileType: "png",
    url: `/files/${path.basename(images[0])}`,
    files: images.map((imagePath) => ({
      filePath: imagePath,
      fileName: path.basename(imagePath),
      fileType: "png",
      url: `/files/${path.basename(imagePath)}`
    })),
    message: `Extracted ${images.length} image(s)`
  };
}

async function writePdf(doc, outputDir, name, message) {
  const output = path.join(outputDir, `${Date.now()}-${name}`);
  await fs.writeFile(output, await doc.save());
  return toResult(output, message);
}

function toResult(filePath, message) {
  const fileName = path.basename(filePath);
  const fileType = path.extname(fileName).slice(1).toLowerCase();
  const kind = ["png", "jpg", "jpeg", "webp"].includes(fileType) ? "image" : fileType === "pdf" ? "pdf" : "document";
  return {
    kind,
    filePath,
    fileName,
    fileType,
    url: `/files/${fileName}`,
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
      if (!Number.isFinite(start) || !Number.isFinite(end)) return;
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
    throw new Error(getMissingCommandMessage(candidates));
  }
  return null;
}

function getMissingCommandMessage(candidates) {
  const joined = candidates.filter(Boolean).join(" ").toLowerCase();
  if (joined.includes("soffice")) {
    return "当前电脑缺少 LibreOffice 转换组件，请安装 LibreOffice 后重试。";
  }
  if (joined.includes("pdftoppm") || joined.includes("pdftotext") || joined.includes("pdftohtml") || joined.includes("pdfimages")) {
    return "当前电脑缺少 Poppler PDF 转换组件，请安装 Poppler 后重试。";
  }
  if (joined.includes("pandoc")) {
    return "当前电脑缺少 Pandoc 电子书转换组件，请安装 Pandoc 后重试。";
  }
  if (joined.includes("qpdf") || joined.includes("gswin") || joined.includes("ghostscript")) {
    return "当前电脑缺少 PDF 压缩组件，请安装 Ghostscript 或 QPDF 后重试。";
  }
  return "当前电脑缺少必要的文件转换组件，请安装后重试。";
}

async function findGeneratedFiles(outputDir, prefix, ext) {
  return (await fs.readdir(outputDir))
    .filter((name) => name.startsWith(prefix) && name.toLowerCase().endsWith(ext))
    .sort()
    .map((name) => path.join(outputDir, name));
}

function wrapText(text, maxLength) {
  const result = [];
  String(text)
    .split(/\r?\n/)
    .forEach((line) => {
      if (!line) {
        result.push("");
        return;
      }
      for (let index = 0; index < line.length; index += maxLength) {
        result.push(line.slice(index, index + maxLength));
      }
    });
  return result.length ? result : [""];
}

async function embedTextFont(doc) {
  const fontPath = process.env.PDF_TOOL_FONT || "C:\\Windows\\Fonts\\msyh.TTF";
  try {
    doc.registerFontkit(fontkit);
    const bytes = await fs.readFile(fontPath);
    return {
      font: await doc.embedFont(bytes, { subset: true }),
      supportsUnicode: true
    };
  } catch (error) {
    return {
      font: await doc.embedFont(StandardFonts.Helvetica),
      supportsUnicode: false
    };
  }
}

function normalizeText(text, supportsUnicode) {
  return supportsUnicode ? String(text) : toWinAnsiText(text);
}

function toWinAnsiText(text) {
  return String(text).replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, "?");
}

function truncate(value, maxLength) {
  const text = String(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function safeBaseName(name = "result") {
  return path.basename(name, path.extname(name)).replace(/[^\w.-]+/g, "-") || "result";
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

function getLibreOfficeCandidates() {
  return [
    process.env.PDF_TOOL_SOFFICE,
    "soffice",
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe"
  ];
}

function getPandocCandidates() {
  return [
    process.env.PDF_TOOL_PANDOC,
    "pandoc",
    "C:\\Program Files\\Pandoc\\pandoc.exe"
  ];
}

function getPopplerCandidates(tool) {
  const envName = `PDF_TOOL_${tool.toUpperCase()}`;
  const localAppData = process.env.LOCALAPPDATA;
  const wingetPath = localAppData
    ? path.join(
        localAppData,
        "Microsoft",
        "WinGet",
        "Packages",
        "oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe",
        "poppler-25.07.0",
        "Library",
        "bin",
        `${tool}.exe`
      )
    : null;

  return [
    process.env[envName],
    tool,
    wingetPath
  ];
}

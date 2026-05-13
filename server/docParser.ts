import fs from "fs";
import path from "path";

export async function extractTextFromFile(filePath: string, mimetype: string, originalName: string): Promise<string> {
  const ext = path.extname(originalName).toLowerCase();

  // PDF
  if (mimetype === "application/pdf" || ext === ".pdf") {
    const { PDFParse } = await import("pdf-parse");
    const buffer = fs.readFileSync(filePath);
    const parser = new PDFParse(buffer);
    const result = await parser.getText();
    parser.destroy();
    return typeof result === "string" ? result : result.toString();
  }

  // DOCX
  if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === ".docx"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  // ODT — it's a zip with content.xml inside
  if (
    mimetype === "application/vnd.oasis.opendocument.text" ||
    ext === ".odt"
  ) {
    const JSZip = (await import("jszip")).default;
    const buffer = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(buffer);
    const contentXml = await zip.file("content.xml")?.async("string");
    if (!contentXml) return "";
    // Strip XML tags to get plain text
    return contentXml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  // Markdown, plain text, HTML, CSV — just read as text
  if (
    mimetype.startsWith("text/") ||
    [".md", ".txt", ".html", ".htm", ".csv", ".rtf"].includes(ext)
  ) {
    return fs.readFileSync(filePath, "utf-8");
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

/**
 * Split text into chunks of roughly targetTokens each.
 * Splits on paragraph breaks first, then sentence boundaries.
 */
export function chunkText(text: string, targetChars = 1200): string[] {
  // Clean up whitespace
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  const paragraphs = cleaned.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if ((current + "\n\n" + trimmed).length <= targetChars) {
      current = current ? current + "\n\n" + trimmed : trimmed;
    } else {
      if (current) chunks.push(current.trim());
      // If single paragraph is too long, split on sentences
      if (trimmed.length > targetChars) {
        const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
        current = "";
        for (const sentence of sentences) {
          if ((current + " " + sentence).length <= targetChars) {
            current = current ? current + " " + sentence : sentence;
          } else {
            if (current) chunks.push(current.trim());
            current = sentence.trim();
          }
        }
      } else {
        current = trimmed;
      }
    }
  }

  if (current.trim()) chunks.push(current.trim());

  return chunks.filter((c) => c.length > 20);
}

/**
 * Text Extraction Service
 * Handles PDF parsing, file type detection, text cleaning, and content extraction
 * Optimized for financial/VC documents (pitch decks, reports, term sheets)
 */

export const SUPPORTED_TEXT_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "text/html",
  "text/xml",
  "application/xml",
]

export const SUPPORTED_DOC_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".html", ".xml"]

export interface PDFMetadata {
  title?: string
  author?: string
  pageCount?: number
  creator?: string
  producer?: string
}

export interface PDFExtractionResult {
  text: string
  metadata: PDFMetadata
}

export function getFileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf(".")
  if (dotIndex === -1) return ""
  return filename.substring(dotIndex).toLowerCase()
}

/**
 * Clean extracted text: fix OCR artifacts, normalize unicode, strip junk
 */
export function cleanExtractedText(text: string): string {
  let cleaned = text

  // Normalize unicode (NFC form)
  cleaned = cleaned.normalize("NFC")

  // Decompose common ligatures
  cleaned = cleaned
    .replace(/\ufb03/g, "ffi")
    .replace(/\ufb04/g, "ffl")
    .replace(/\ufb00/g, "ff")
    .replace(/\ufb01/g, "fi")
    .replace(/\ufb02/g, "fl")

  // Replace smart quotes and dashes with ASCII equivalents
  cleaned = cleaned
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")

  // Remove zero-width characters and BOM
  cleaned = cleaned.replace(/[\u200B\u200C\u200D\uFEFF]/g, "")

  // Fix common OCR artifact: spaced-out characters (e.g., "w o r d" -> "word")
  // Only apply to runs of 4+ single-letter words
  cleaned = cleaned.replace(
    /\b([A-Za-z]) ([A-Za-z]) ([A-Za-z]) ([A-Za-z](?:\s[A-Za-z])*)\b/g,
    (match) => {
      const joined = match.replace(/ /g, "")
      // Only collapse if all parts are single chars
      if (match.split(" ").every((p) => p.length === 1)) return joined
      return match
    }
  )

  // Collapse excessive blank lines (3+ -> 2)
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n")

  // Strip trailing whitespace from each line
  cleaned = cleaned
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")

  return cleaned.trim()
}

/**
 * Detect tab-separated or fixed-width tabular data and convert to markdown tables
 */
export function detectAndFormatTables(text: string): string {
  const lines = text.split("\n")
  const result: string[] = []
  let i = 0

  while (i < lines.length) {
    // Detect tab-separated tables (3+ consecutive lines with 2+ tabs)
    if ((lines[i].match(/\t/g) || []).length >= 2) {
      const tableLines: string[] = []
      while (
        i < lines.length &&
        (lines[i].match(/\t/g) || []).length >= 2
      ) {
        tableLines.push(lines[i])
        i++
      }

      if (tableLines.length >= 2) {
        result.push(convertToMarkdownTable(tableLines, "\t"))
        continue
      } else {
        result.push(...tableLines)
        continue
      }
    }

    result.push(lines[i])
    i++
  }

  return result.join("\n")
}

function convertToMarkdownTable(lines: string[], delimiter: string): string {
  const rows = lines.map((line) =>
    line.split(delimiter).map((cell) => cell.trim())
  )
  if (rows.length === 0) return ""

  // Determine column widths
  const colCount = Math.max(...rows.map((r) => r.length))
  const colWidths = new Array(colCount).fill(3)
  for (const row of rows) {
    for (let c = 0; c < row.length; c++) {
      colWidths[c] = Math.max(colWidths[c], (row[c] || "").length)
    }
  }

  // Build markdown table
  const mdLines: string[] = []
  for (let r = 0; r < rows.length; r++) {
    const cells = []
    for (let c = 0; c < colCount; c++) {
      cells.push((rows[r][c] || "").padEnd(colWidths[c]))
    }
    mdLines.push("| " + cells.join(" | ") + " |")

    // Add header separator after first row
    if (r === 0) {
      const sep = colWidths.map((w) => "-".repeat(w))
      mdLines.push("| " + sep.join(" | ") + " |")
    }
  }

  return mdLines.join("\n")
}

/**
 * Format CSV data as a readable markdown table
 */
export function formatCSVAsReadable(csvText: string): string {
  const lines = csvText.split("\n").filter((l) => l.trim().length > 0)
  if (lines.length === 0) return csvText

  // Auto-detect delimiter
  const firstLine = lines[0]
  const commas = (firstLine.match(/,/g) || []).length
  const semicolons = (firstLine.match(/;/g) || []).length
  const tabs = (firstLine.match(/\t/g) || []).length
  const delimiter =
    tabs > commas && tabs > semicolons
      ? "\t"
      : semicolons > commas
        ? ";"
        : ","

  // Parse CSV respecting quoted fields
  const rows = lines.map((line) => parseCSVLine(line, delimiter))
  if (rows.length < 2) return csvText

  // Convert to markdown table
  const colCount = Math.max(...rows.map((r) => r.length))
  const colWidths = new Array(colCount).fill(3)
  for (const row of rows) {
    for (let c = 0; c < row.length; c++) {
      colWidths[c] = Math.max(colWidths[c], Math.min((row[c] || "").length, 40))
    }
  }

  const mdLines: string[] = []
  for (let r = 0; r < rows.length; r++) {
    const cells = []
    for (let c = 0; c < colCount; c++) {
      const val = (rows[r][c] || "").slice(0, 40)
      cells.push(val.padEnd(colWidths[c]))
    }
    mdLines.push("| " + cells.join(" | ") + " |")
    if (r === 0) {
      mdLines.push(
        "| " + colWidths.map((w) => "-".repeat(w)).join(" | ") + " |"
      )
    }
  }

  mdLines.push(`\n_${rows.length - 1} rows, ${colCount} columns_`)
  return mdLines.join("\n")
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

/**
 * Extract text from a PDF buffer with metadata
 */
export async function extractPDFWithMetadata(
  buffer: Buffer
): Promise<PDFExtractionResult> {
  const metadata: PDFMetadata = {}

  // Try pdf-parse first (primary)
  try {
    const pdfParseModule = await import("pdf-parse")
    const pdfParse = (pdfParseModule as any).default || pdfParseModule
    const data = await pdfParse(buffer, { max: 0 })

    if (data.info) {
      metadata.title = data.info.Title || undefined
      metadata.author = data.info.Author || undefined
      metadata.creator = data.info.Creator || undefined
      metadata.producer = data.info.Producer || undefined
    }
    metadata.pageCount = data.numpages || undefined

    if (data.text && data.text.trim().length > 50) {
      let text = cleanExtractedText(data.text)
      text = detectAndFormatTables(text)
      return { text, metadata }
    }
  } catch (error) {
    console.warn("pdf-parse extraction failed, trying unpdf fallback:", error)
  }

  // Fallback to unpdf
  try {
    const { extractText, getDocumentProxy } = await import("unpdf")
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    )
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer))
    metadata.pageCount = metadata.pageCount || pdf.numPages

    const { text } = await extractText(pdf, { mergePages: true })
    if (text && text.trim().length > 50) {
      let cleaned = cleanExtractedText(text)
      cleaned = detectAndFormatTables(cleaned)
      return { text: cleaned, metadata }
    }
  } catch (error) {
    console.error("unpdf extraction also failed:", error)
  }

  return { text: "", metadata }
}

/**
 * Extract text from a PDF buffer (backward-compatible signature)
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const { text, metadata } = await extractPDFWithMetadata(buffer)

  // Prepend metadata header if available
  const headerParts: string[] = []
  if (metadata.title) headerParts.push(`Title: ${metadata.title}`)
  if (metadata.author) headerParts.push(`Author: ${metadata.author}`)
  if (metadata.pageCount) headerParts.push(`Pages: ${metadata.pageCount}`)

  if (headerParts.length > 0 && text) {
    return `[${headerParts.join(" | ")}]\n\n${text}`
  }

  return text
}

/**
 * Extract text content from a file buffer based on its type
 */
export async function extractTextContent(
  filename: string,
  mimeType: string,
  buffer: Buffer
): Promise<string> {
  const extension = getFileExtension(filename)

  // Handle PDF files
  if (mimeType === "application/pdf" || extension === ".pdf") {
    return extractTextFromPDF(buffer)
  }

  // Handle CSV files - format as readable table
  if (mimeType === "text/csv" || extension === ".csv") {
    const raw = buffer.toString("utf-8")
    return formatCSVAsReadable(raw)
  }

  // Handle JSON files - pretty print
  if (mimeType === "application/json" || extension === ".json") {
    const raw = buffer.toString("utf-8")
    try {
      const parsed = JSON.parse(raw)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return raw
    }
  }

  // Handle text-based files
  if (
    SUPPORTED_TEXT_TYPES.includes(mimeType) ||
    SUPPORTED_DOC_EXTENSIONS.includes(extension)
  ) {
    const text = buffer.toString("utf-8")
    return cleanExtractedText(text)
  }

  // Default: try to read as text, strip non-printable characters
  const text = buffer.toString("utf-8")
  return text.replace(/[^\x20-\x7E\n\r\t]/g, "").trim()
}

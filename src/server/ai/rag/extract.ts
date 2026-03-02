import { PDFParse } from 'pdf-parse'

export async function extractTextFromFile(buffer: Buffer, filename: string): Promise<string> {
  const lower = filename.toLowerCase()

  if (lower.endsWith('.pdf')) {
    const parser = new PDFParse({ data: buffer })
    try {
      const result = await parser.getText()
      return result.text.trim()
    } finally {
      await parser.destroy()
    }
  }

  if (lower.endsWith('.txt') || lower.endsWith('.md')) {
    return buffer.toString('utf-8').trim()
  }

  throw new Error(`Unsupported file type: ${filename}`)
}

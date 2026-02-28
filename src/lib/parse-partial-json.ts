/**
 * Attempts to parse potentially incomplete JSON by fixing common truncation issues.
 * Used client-side to progressively render streaming AI output.
 */
export function parsePartialJson(text: string): { value: unknown } | undefined {
  // Try direct parse first
  try {
    return { value: JSON.parse(text) }
  } catch {
    // Continue to repair attempts
  }

  // Try closing open braces/brackets
  let repaired = text.trim()
  if (!repaired) return undefined

  // Remove trailing comma
  repaired = repaired.replace(/,\s*$/, '')

  // Count open/close braces and brackets
  let braces = 0
  let brackets = 0
  let inString = false
  let escape = false

  for (const ch of repaired) {
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') braces++
    if (ch === '}') braces--
    if (ch === '[') brackets++
    if (ch === ']') brackets--
  }

  // Close unclosed string
  if (inString) repaired += '"'

  // Remove trailing comma again after string close
  repaired = repaired.replace(/,\s*$/, '')

  // Close open brackets and braces
  for (let i = 0; i < brackets; i++) repaired += ']'
  for (let i = 0; i < braces; i++) repaired += '}'

  try {
    return { value: JSON.parse(repaired) }
  } catch {
    return undefined
  }
}

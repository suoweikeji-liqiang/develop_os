import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/server/auth/session'
import { isEmbeddingConfigured } from '@/server/ai/provider'
import { extractTextFromFile } from '@/server/ai/rag/extract'
import { chunkText, embedAndStore } from '@/server/ai/rag/embed'
import { prisma } from '@/server/db/client'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.md']

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const lowerName = file.name.toLowerCase()
  const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
  if (!hasAllowedExt) {
    return NextResponse.json(
      { error: 'Unsupported file type. Allowed: .pdf, .txt, .md' },
      { status: 400 },
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 })
  }

  if (!isEmbeddingConfigured()) {
    return NextResponse.json({
      error: 'Embedding provider is not configured. Set OPENAI_API_KEY or QWEN_API_KEY first.',
    }, { status: 412 })
  }

  const document = await prisma.knowledgeDocument.create({
    data: {
      name: file.name,
      mimeType: file.type || 'text/plain',
      status: 'PROCESSING',
      uploadedBy: session.userId,
    },
  })

  let text: string
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    text = await extractTextFromFile(buffer, file.name)
  } catch {
    await prisma.knowledgeDocument.update({
      where: { id: document.id },
      data: { status: 'ERROR' },
    })
    return NextResponse.json({ error: 'Failed to extract text from file' }, { status: 422 })
  }

  void (async () => {
    try {
      const chunks = chunkText(text)
      await embedAndStore(chunks, 'document', document.id, { sourceName: file.name })
      await prisma.knowledgeDocument.update({
        where: { id: document.id },
        data: { status: 'READY', chunkCount: chunks.length },
      })
    } catch (error) {
      console.error('[upload] embedding failed:', error)
      await prisma.knowledgeDocument.update({
        where: { id: document.id },
        data: { status: 'ERROR' },
      })
    }
  })()

  return NextResponse.json({ id: document.id, status: 'PROCESSING' }, { status: 201 })
}

import { Octokit } from '@octokit/rest'
import { chunkText, embedAndStore } from './embed'
import { prisma } from '@/server/db/client'

export const CODE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.py',
  '.go',
  '.java',
  '.md',
  '.prisma',
  '.sql',
  '.yaml',
  '.json',
]
export const MAX_FILE_SIZE = 50_000
export const BATCH_SIZE = 20

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const withStatus = error as { status?: number }
  return withStatus.status === 403 || withStatus.status === 429
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchAndEmbedRepository(
  repositoryId: string,
  owner: string,
  repo: string,
  githubToken: string,
): Promise<void> {
  const octokit = new Octokit({ auth: githubToken })

  try {
    const { data: repository } = await octokit.repos.get({ owner, repo })
    const { data: treeData } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: repository.default_branch,
      recursive: 'true',
    })

    const codeFiles = treeData.tree.filter((entry) => {
      const path = entry.path?.toLowerCase()
      return entry.type === 'blob'
        && Boolean(path)
        && CODE_EXTENSIONS.some((ext) => path!.endsWith(ext))
        && (entry.size ?? 0) < MAX_FILE_SIZE
    })

    await prisma.$executeRaw`
      DELETE FROM "KnowledgeChunk"
      WHERE "sourceType" = 'code' AND "sourceId" = ${repositoryId}
    `

    const batches = chunkArray(codeFiles, BATCH_SIZE)
    for (const batch of batches) {
      for (const file of batch) {
        if (!file.path) continue

        const contentResponse = await octokit.repos.getContent({
          owner,
          repo,
          path: file.path,
        })

        const item = contentResponse.data
        if (Array.isArray(item) || !('content' in item) || item.type !== 'file' || !item.content) {
          continue
        }

        const content = Buffer.from(item.content, 'base64').toString('utf-8')
        const chunks = chunkText(content)
        if (chunks.length === 0) continue

        await embedAndStore(chunks, 'code', repositoryId, { sourceName: file.path })
      }

      await delay(1000)
    }

    await prisma.codeRepository.update({
      where: { id: repositoryId },
      data: { lastSyncedAt: new Date() },
    })
  } catch (error) {
    if (isRateLimitError(error)) {
      console.error(`[github-sync] rate limit or permission error for ${owner}/${repo}`, error)
    }
    throw error
  }
}

import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter })

  const requirements = await prisma.requirement.findMany({
    where: { model: { not: null } },
    select: {
      id: true,
      model: true,
      confidence: true,
      version: true,
      createdBy: true,
    },
  })

  console.log(`Found ${requirements.length} requirements with models to backfill`)

  let created = 0
  let skipped = 0

  for (const req of requirements) {
    const existing = await prisma.requirementVersion.findUnique({
      where: {
        requirementId_version: {
          requirementId: req.id,
          version: req.version,
        },
      },
    })

    if (existing) {
      skipped++
      continue
    }

    await prisma.requirementVersion.create({
      data: {
        requirementId: req.id,
        version: req.version,
        model: req.model!,
        confidence: req.confidence ?? undefined,
        changeSource: 'manual',
        createdBy: req.createdBy,
      },
    })
    created++
  }

  console.log(`Backfill complete: ${created} created, ${skipped} skipped`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})

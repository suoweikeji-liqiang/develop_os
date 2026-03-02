import { z } from 'zod'

export const ExternalSubmitSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题最多200字').trim(),
  description: z.string().min(10, '描述至少10个字符').max(5000, '描述最多5000字').trim(),
  submitterName: z.string().min(1, '姓名不能为空').max(100, '姓名最多100字').trim(),
  submitterContact: z.string().max(200).trim().optional(),
})

export type ExternalSubmit = z.infer<typeof ExternalSubmitSchema>

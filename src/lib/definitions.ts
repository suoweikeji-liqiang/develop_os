import { z } from 'zod'

export const ROLES = ['PRODUCT', 'DEV', 'TEST', 'UI', 'EXTERNAL'] as const
export type Role = (typeof ROLES)[number]

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
})

export const InviteSchema = z.object({
  email: z.string().email(),
  roles: z.array(z.enum(ROLES)),
})

import { z } from 'zod'

export const loginInputSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
})

export const userRecordSchema = z.object({
  id: z.string(),
  username: z.string(),
  salt: z.string(),
  passwordHash: z.string(),
  scopes: z.array(z.string()),
})

export const authFileSchema = z.object({
  users: z.array(userRecordSchema),
})

export type LoginInput = z.infer<typeof loginInputSchema>
export type UserRecord = z.infer<typeof userRecordSchema>

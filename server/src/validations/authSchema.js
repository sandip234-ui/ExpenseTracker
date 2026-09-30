import { z } from 'zod'

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: 'A valid email address is required.' })
    .toLowerCase(),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters long.' }),
  name: z
    .string()
    .trim()
    .min(2, { message: 'Name must be at least 2 characters.' }),
})

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: 'A valid email address is required.' })
    .toLowerCase(),
  password: z
    .string()
    .min(1, { message: 'Password is required.' }),
})

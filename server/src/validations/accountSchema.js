import { z } from 'zod'

export const createAccountSchema = {
  body: z.object({
    name: z.string().min(1, 'Account name is required').trim(),
    type: z.enum(['bank', 'cash', 'upi', 'credit_card', 'investment', 'other'], {
      errorMap: () => ({ message: 'Invalid account type' }),
    }),
    openingBalance: z.coerce.number().optional().default(0),
    currency: z.string().optional().default('INR'),
    icon: z.string().optional(),
    color: z.string().optional(),
  }),
}

export const updateAccountSchema = {
  params: z.object({
    id: z.string().min(1, 'Account ID is required'),
  }),
  body: z.object({
    name: z.string().min(1, 'Account name cannot be empty').trim().optional(),
    type: z.enum(['bank', 'cash', 'upi', 'credit_card', 'investment', 'other']).optional(),
    openingBalance: z.coerce.number().optional(),
    currency: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
  }),
}

export const accountIdParamSchema = {
  params: z.object({
    id: z.string().min(1, 'Account ID is required'),
  }),
}

import { z } from 'zod'

export const createGoalSchema = {
  body: z.object({
    name: z.string().min(1, 'Goal name is required').trim(),
    targetAmount: z.coerce.number({ required_error: 'Target amount is required' }),
    currentAmount: z.coerce.number().optional().default(0),
    targetDate: z.string().or(z.date()).nullable().optional(),
    category: z.string().optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
  }),
}

export const updateGoalSchema = {
  params: z.object({
    id: z.string().min(1, 'Goal ID is required'),
  }),
  body: z.object({
    name: z.string().min(1, 'Goal name cannot be empty').trim().optional(),
    targetAmount: z.coerce.number().optional(),
    currentAmount: z.coerce.number().optional(),
    targetDate: z.string().or(z.date()).nullable().optional(),
    category: z.string().optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
  }),
}

export const goalIdParamSchema = {
  params: z.object({
    id: z.string().min(1, 'Goal ID is required'),
  }),
}

export const goalDepositSchema = {
  params: z.object({
    id: z.string().min(1, 'Goal ID is required'),
  }),
  body: z.object({
    accountId: z.string().min(1, 'Source account ID is required'),
    amount: z.coerce.number({ required_error: 'Amount is required' }),
  }),
}

export const goalWithdrawSchema = {
  params: z.object({
    id: z.string().min(1, 'Goal ID is required'),
  }),
  body: z.object({
    accountId: z.string().min(1, 'Destination account ID is required'),
    amount: z.coerce.number({ required_error: 'Amount is required' }),
  }),
}

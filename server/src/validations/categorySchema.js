import { z } from 'zod'

export const getCategoriesSchema = {
  query: z.object({
    type: z.enum(['expense', 'income', 'both', 'transfer']).optional(),
  }),
}

export const createCategorySchema = {
  body: z.object({
    name: z.string().min(1, 'Category name is required').trim(),
    type: z.enum(['expense', 'income', 'both', 'transfer'], {
      errorMap: () => ({ message: 'Category type must be expense, income, both, or transfer' }),
    }),
    icon: z.string().optional(),
    color: z.string().optional(),
  }),
}

export const updateCategorySchema = {
  params: z.object({
    id: z.string().min(1, 'Category ID is required'),
  }),
  body: z.object({
    name: z.string().min(1).trim().optional(),
    type: z.enum(['expense', 'income', 'both', 'transfer']).optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
  }),
}

export const categoryIdParamSchema = {
  params: z.object({
    id: z.string().min(1, 'Category ID is required'),
  }),
}

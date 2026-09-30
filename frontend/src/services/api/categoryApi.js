import { apiClient } from './apiClient.js'

/**
 * Category API Service
 * Handles HTTP requests to the /api/categories endpoint.
 * Normalizes category label/name fields to ensure seamless frontend UI compatibility.
 */

export function normalizeCategory(cat) {
  if (!cat) return cat
  const name = cat.name || cat.label || ''
  return {
    ...cat,
    name,
    label: name,
    isCustom: Boolean(cat.isCustom),
  }
}

export async function getCategories(type = null) {
  const query = type && type !== 'all' ? `?type=${type}` : ''
  const res = await apiClient.get(`/categories${query}`)
  const categories = Array.isArray(res?.data) ? res.data : []
  return categories.map(normalizeCategory)
}

export async function getCategory(id) {
  const res = await apiClient.get(`/categories/${id}`)
  return normalizeCategory(res?.data)
}

export async function createCategory(data) {
  const payload = {
    name: data.name || data.label,
    type: data.type || 'expense',
    icon: data.icon || '🏷️',
    color: data.color || '#6366F1',
  }
  const res = await apiClient.post('/categories', payload)
  return normalizeCategory(res?.data)
}

export async function updateCategory(id, data) {
  const payload = {
    name: data.name || data.label,
    type: data.type,
    icon: data.icon,
    color: data.color,
  }
  const res = await apiClient.put(`/categories/${id}`, payload)
  return normalizeCategory(res?.data)
}

export async function deleteCategory(id) {
  const res = await apiClient.delete(`/categories/${id}`)
  return res?.data
}

export const categoryApi = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  normalizeCategory,
}

export default categoryApi

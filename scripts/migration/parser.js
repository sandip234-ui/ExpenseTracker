/**
 * FinTrack Migration Payload Parser & Normalizer
 */

import { SCHEMA_VERSION, SOURCE_IDENTIFIER } from './constants.js'

/**
 * Normalizes any FinTrack export format into a versioned migration envelope.
 *
 * Supported formats:
 * 1. Versioned envelope: { schemaVersion: 1, source: 'fintrack-localStorage', exportedAt, data: { ... } }
 * 2. FinTrack V2 export: { version: 2, exportedAt, transactions, categories, budgets, accounts, goals, recurringTransactions, settings }
 * 3. Raw data object: { accounts, categories, transactions, goals, budgets, recurringTransactions, settings }
 * 4. JSON string of any of the above
 *
 * @param {string | object} input
 * @returns {{ schemaVersion: number, source: string, exportedAt: string, data: object }}
 */
export function parseMigrationPayload(input) {
  let parsed = input
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input)
    } catch (err) {
      throw new Error(`Invalid JSON format: ${err.message}`)
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Migration payload must be a non-null object.')
  }

  // Case 1: Already a versioned migration envelope
  if (parsed.schemaVersion && parsed.data) {
    return {
      schemaVersion: Number(parsed.schemaVersion) || SCHEMA_VERSION,
      source: parsed.source || SOURCE_IDENTIFIER,
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      data: normalizeDataSection(parsed.data),
    }
  }

  // Case 2: FinTrack V2 export format (e.g. from exportFullBackup)
  if (parsed.version || parsed.transactions || parsed.accounts) {
    const data = {
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      budgets: Array.isArray(parsed.budgets) ? parsed.budgets : [],
      recurringTransactions: Array.isArray(parsed.recurringTransactions) ? parsed.recurringTransactions : [],
      settings: parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {},
    }

    return {
      schemaVersion: SCHEMA_VERSION,
      source: SOURCE_IDENTIFIER,
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      data: normalizeDataSection(data),
    }
  }

  // Case 3: Direct data container
  return {
    schemaVersion: SCHEMA_VERSION,
    source: SOURCE_IDENTIFIER,
    exportedAt: new Date().toISOString(),
    data: normalizeDataSection(parsed),
  }
}

/**
 * Ensures all entity arrays and settings exist and are properly typed.
 */
function normalizeDataSection(data = {}) {
  return {
    accounts: Array.isArray(data.accounts) ? data.accounts : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
    goals: Array.isArray(data.goals) ? data.goals : [],
    budgets: Array.isArray(data.budgets) ? data.budgets : [],
    recurringTransactions: Array.isArray(data.recurringTransactions)
      ? data.recurringTransactions
      : Array.isArray(data.recurring)
      ? data.recurring
      : [],
    settings: data.settings && typeof data.settings === 'object' ? data.settings : {},
  }
}

/**
 * Creates a standard versioned migration envelope.
 */
export function createVersionedPayload(data, source = SOURCE_IDENTIFIER) {
  return {
    schemaVersion: SCHEMA_VERSION,
    source,
    exportedAt: new Date().toISOString(),
    data: normalizeDataSection(data),
  }
}

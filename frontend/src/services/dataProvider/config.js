/**
 * Data Source Configuration & Mode Switch
 * Supported modes:
 * - 'local' (default): Uses LocalStorage implementations
 * - 'api': Communicates with backend REST API
 */

let runtimeModeOverride = null

export function getDataSourceMode() {
  if (runtimeModeOverride) {
    return runtimeModeOverride
  }

  // Vite environment
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DATA_SOURCE) {
    return import.meta.env.VITE_DATA_SOURCE.toLowerCase()
  }

  // Default is API mode (Phase 7 API-first cutover)
  return 'api'
}

export function isApiMode() {
  return getDataSourceMode() === 'api'
}

export function setDataSourceMode(mode) {
  if (mode !== 'local' && mode !== 'api' && mode !== null) {
    throw new Error(`Invalid data source mode: "${mode}". Supported: 'local' | 'api'`)
  }
  runtimeModeOverride = mode
}

export const DATA_SOURCE = getDataSourceMode()

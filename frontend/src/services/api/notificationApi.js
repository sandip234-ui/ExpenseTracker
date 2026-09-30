import { request } from './apiClient.js'

export const notificationApi = {
  /**
   * Fetch all notification states for the authenticated user
   */
  async getStates() {
    return request('/notifications', { method: 'GET' })
  },

  /**
   * Mark alert IDs as read
   */
  async markRead(alertIds) {
    return request('/notifications/read', {
      method: 'POST',
      body: { alertIds },
    })
  },

  /**
   * Dismiss a single alert
   */
  async dismiss(alertId) {
    return request('/notifications/dismiss', {
      method: 'POST',
      body: { alertId },
    })
  },

  /**
   * Dismiss all given active alerts (Clear All)
   */
  async dismissAll(alertIds) {
    return request('/notifications/dismiss-all', {
      method: 'POST',
      body: { alertIds },
    })
  },
}

export default notificationApi

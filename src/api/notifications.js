import client from './client'

export const getOwnNotifications = (params) =>
  client.get('/notifications', { params }).then(r => r.data)

export const markAllNotificationsSeen = () =>
  client.patch('/notifications/seen').then(r => r.data)

export const markOneNotificationSeen = (id) =>
  client.patch(`/notifications/${id}/seen`).then(r => r.data)

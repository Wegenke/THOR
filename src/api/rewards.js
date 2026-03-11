import client from './client'

export const contributeToReward = (id, points) => client.post(`/rewards/${id}/contribute`, { points }).then(r => r.data)

export const requestRefund = (id) => client.patch(`/rewards/${id}/request-refund`).then(r => r.data)

export const createReward = (data) => client.post('/rewards', data).then(r => r.data)


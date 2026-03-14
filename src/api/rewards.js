import client from './client'

export const getRewards = (params) => client.get('/rewards', { params }).then(r => r.data)
export const getRefundRequests = () => client.get('/rewards/refund-requests').then(r => r.data)
export const createReward = (data) => client.post('/rewards', data).then(r => r.data)
export const updateReward = (id, data) => client.patch(`/rewards/${id}`, data).then(r => r.data)
export const approveReward = (id, points_required) => client.patch(`/rewards/${id}/approve`, { points_required }).then(r => r.data)
export const rejectReward = (id) => client.patch(`/rewards/${id}/reject`).then(r => r.data)
export const cancelReward = (id) => client.patch(`/rewards/${id}/cancel`).then(r => r.data)
export const redeemReward = (id) => client.post(`/rewards/${id}/redeem`).then(r => r.data)
export const archiveReward = (id) => client.patch(`/rewards/${id}/archive`).then(r => r.data)
export const approveRefund = (rewardId, childId) => client.patch(`/rewards/${rewardId}/approve-refund/${childId}`).then(r => r.data)
export const rejectRefund = (rewardId, childId) => client.patch(`/rewards/${rewardId}/reject-refund/${childId}`).then(r => r.data)

export const contributeToReward = (id, points) => client.post(`/rewards/${id}/contribute`, { points }).then(r => r.data)
export const requestRefund = (id) => client.patch(`/rewards/${id}/request-refund`).then(r => r.data)


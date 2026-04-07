import client from './client'

export const createAdjustment = (body) => client.post('/adjustments', body).then(r => r.data)
export const getUnseenAdjustments = () => client.get('/adjustments/unseen').then(r => r.data)
export const markAllSeen = () => client.patch('/adjustments/seen').then(r => r.data)

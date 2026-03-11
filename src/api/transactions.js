import client from './client'

export const getMyTransactions = (params = {}) => client.get('/transactions/mine', { params }).then(r => r.data)

import client from './client'

export const getMyTransactions = (params = {}) => client.get('/transactions/mine', { params }).then(r => r.data)
export const getHouseholdTransactions = (params = {}) => client.get('/transactions/', { params }).then(r => r.data)
export const getTransactionsByChild = (childId, params = {}) => client.get(`/transactions/${childId}`, { params }).then(r => r.data)

import client from './client'

export const getChildDashboard = () => client.get('/dashboard/child').then(r => r.data)
export const getParentDashboard = () => client.get('/dashboard/parent').then(r => r.data)
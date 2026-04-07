import client from './client'

export const getChildDashboard = () => client.get('/dashboard/child').then(r => r.data)
export const getParentDashboard = () => client.get('/dashboard/parent').then(r => r.data)
export const viewChildDashboard = (childId) => client.get(`/dashboard/child/${childId}`).then(r => r.data)
export const getChildSummary = () => client.get('/dashboard/child/summary').then(r => r.data)
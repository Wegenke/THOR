import client from './client'

export const createSchedule = (body) => client.post('/schedules', body).then(r => r.data)
export const getSchedules = () => client.get('/schedules').then(r => r.data)
export const getSchedulesByChore = (choreId) => client.get(`/schedules/chore/${choreId}`).then(r => r.data)
export const updateSchedule = (id, body) => client.patch(`/schedules/${id}`, body).then(r => r.data)
export const deleteSchedule = (id) => client.delete(`/schedules/${id}`).then(r => r.data)

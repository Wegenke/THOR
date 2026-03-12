import client from './client'

export const getChores = () => client.get(`/chores`).then(r => r.data)

export const createChore = (body) => client.post('/chores',body).then(r => r.data)

export const updateChore = (id,data) => client.patch(`/chores/${id}`, data).then(r => r.data)
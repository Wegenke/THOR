import client from './client'

export const getParentTasks = () => client.get('/parent-tasks').then(r => r.data)
export const getRecentlyCompleted = () => client.get('/parent-tasks/recent').then(r => r.data)
export const createParentTask = (body) => client.post('/parent-tasks', body).then(r => r.data)
export const updateParentTask = (id, body) => client.patch(`/parent-tasks/${id}`, body).then(r => r.data)
export const startParentTask = (id) => client.patch(`/parent-tasks/${id}/start`).then(r => r.data)
export const pauseParentTask = (id) => client.patch(`/parent-tasks/${id}/pause`).then(r => r.data)
export const archiveParentTask = (id) => client.patch(`/parent-tasks/${id}/archive`).then(r => r.data)
export const reorderParentTasks = (ids) => client.patch('/parent-tasks/reorder', { ids }).then(r => r.data)
export const getTaskNotes = (id) => client.get(`/parent-tasks/${id}/notes`).then(r => r.data)
export const addTaskNote = (id, content) => client.post(`/parent-tasks/${id}/notes`, { content }).then(r => r.data)

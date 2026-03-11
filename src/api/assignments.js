import client from './client'

export const startAssignment = (id) =>
  client.patch(`/assignments/${id}/start`).then(r => r.data)

export const submitAssignment = (id, comment) =>
  client.patch(`/assignments/${id}/submit`, comment ? { comment } : {}).then(r => r.data)

export const pauseAssignment = (id, comment) =>
  client.patch(`/assignments/${id}/pause`, comment ? { comment } : {}).then(r => r.data)

export const resumeAssignment = (id) =>
  client.patch(`/assignments/${id}/resume`).then(r => r.data)

export const resumeRejectedAssignment = (id) =>
  client.patch(`/assignments/${id}/resume-rejected`).then(r => r.data)

export const approveAssignment = (id) => client.patch(`/assignments/${id}/approve`).then(r => r.data)

export const rejectAssignment = (id, comment) => client.patch(`/assignments/${id}/reject`, { comment }).then(r => r.data)

export const dismissAssignment = (id) => client.patch(`/assignments/${id}/dismiss`).then(r => r.data)

export const pauseAllActive = () => client.patch('/assignments/pause-all-active').then(r => r.data)

export const getAvailableAssignments = () => client.get('/assignments/available').then(r => r.data)

export const claimAssignment = (id) => client.patch(`/assignments/${id}/claim`).then(r => r.data)
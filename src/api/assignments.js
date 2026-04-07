import client from './client'

export const startAssignment = (id, comment) =>
  client.patch(`/assignments/${id}/start`, comment ? { comment } : {}).then(r => r.data)

export const submitAssignment = (id, comment) =>
  client.patch(`/assignments/${id}/submit`, comment ? { comment } : {}).then(r => r.data)

export const pauseAssignment = (id, comment) =>
  client.patch(`/assignments/${id}/pause`, comment ? { comment } : {}).then(r => r.data)

export const resumeAssignment = (id, comment) =>
  client.patch(`/assignments/${id}/resume`, comment ? { comment } : {}).then(r => r.data)

export const resumeRejectedAssignment = (id, comment) =>
  client.patch(`/assignments/${id}/resume-rejected`, comment ? { comment } : {}).then(r => r.data)

export const approveAssignment = (id) => client.patch(`/assignments/${id}/approve`).then(r => r.data)

export const rejectAssignment = (id, comment) => client.patch(`/assignments/${id}/reject`, { comment }).then(r => r.data)

export const dismissAssignment = (id, comment) => client.patch(`/assignments/${id}/dismiss`, comment ? { comment } : {}).then(r => r.data)

export const pauseAllActive = (comment) => client.patch('/assignments/pause-all-active', comment ? { comment } : {}).then(r => r.data)

export const getAvailableAssignments = () => client.get('/assignments/available').then(r => r.data)

export const claimAssignment = (id) => client.patch(`/assignments/${id}/claim`).then(r => r.data)

export const getAssignments = () => client.get('/assignments').then(r=>r.data)

export const createAssignment = (body) => client.post('/assignments', body).then(r => r.data)

export const cancelAssignment = (id, comment) => client.patch(`/assignments/${id}/cancel`, comment ? { comment } : {}).then(r => r.data)

export const reassignAssignment = (id, child_id, comment) => client.patch(`/assignments/${id}/reassign`, {child_id, ...(comment ? { comment } : {})}).then(r=>r.data)

export const parentStartAssignment = (id) => client.patch(`/assignments/${id}/parent-start`).then(r => r.data)

export const parentPauseAssignment = (id, comment) => client.patch(`/assignments/${id}/parent-pause`, comment ? { comment } : {}).then(r=>r.data)

export const assignAssignment = (id, child_id) => client.patch(`/assignments/${id}/assign`, { child_id }).then(r => r.data)

export const unassignAssignment = (id) => client.patch(`/assignments/${id}/unassign`).then(r => r.data)

export const getAssignmentComments = (id) => client.get(`/assignments/${id}/comments`).then(r=>r.data)

export const postAssignmentComment = (id, text) => client.post(`/assignments/${id}/comments`, { comment: text }).then(r=>r.data)
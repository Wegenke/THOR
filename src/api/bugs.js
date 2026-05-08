import client from './client'

export const createBugReport = (body) => client.post('/bugs', { body }).then(r => r.data)

import client from './client'
export const createSetup = (body) => client.post('/setup', body).then(r=>r.data)
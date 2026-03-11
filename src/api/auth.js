import client from './client'

export const getProfiles = () => client.get('/auth/profiles').then(r => r.data)
export const login = (user_id, pin) => client.post('/auth/login', {user_id, pin}).then(r => r.data)
export const logout = () => client.post('/auth/logout')
export const getSession = () => client.get('/auth/session').then(r => r.data)
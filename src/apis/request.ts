import axios from 'axios'

const request = axios.create({
  baseURL: '/api',
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  config.headers.Authorization = `Bearer ${token}`
  return config
})

request.interceptors.response.use((response) => {
  return response
})

export default request

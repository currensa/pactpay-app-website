import axios from 'axios'

const request = axios.create({
  baseURL: '/api'
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  config.headers.Authorization = `Bearer ${token}`
  return config
})

request.interceptors.response.use((response) => {
  // 如果响应状态码为401，则清除本地token并跳转到登录页面
  if (response.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/account/login'
    return Promise.reject(response)
  }
  return response
})

export default request

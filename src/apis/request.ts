import axios from 'axios'

const request = axios.create({
  baseURL: '/api',
  // 禁用缓存，避免 304 响应
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0'
  }
})

request.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  config.headers.Authorization = `Bearer ${token}`
  // 确保每次请求都禁用缓存
  config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
  config.headers['Pragma'] = 'no-cache'
  config.headers['Expires'] = '0'

  // 对于 GET 请求，添加时间戳参数避免缓存
  if (config.method === 'get' || config.method === 'GET') {
    config.params = {
      ...config.params,
      _t: Date.now()
    }
  }

  return config
})

request.interceptors.response.use(
  response => {
    // 如果响应状态码为401，则清除本地token并跳转到登录页面
    if (response.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/account/login'
      return Promise.reject(response)
    }
    return response
  },
  error => {
    // 处理错误响应
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/account/login'
    }
    return Promise.reject(error)
  }
)

export default request

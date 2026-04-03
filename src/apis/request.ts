import { toast } from '@/components/ui/use-toast'
import axios from 'axios'

const request = axios.create({
  baseURL: '/api'
})

request.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  config.headers.Authorization = `Bearer ${token}`
  return config
})

request.interceptors.response.use(
  response => {
    return response
  },
  error => {
    // 处理错误响应
    if (error.response?.status === 401) {
      // 登录页面本身的接口报 401 不跳转，避免刷新页面
      const isLoginPage = window.location.pathname.startsWith('/welcome')
      if (!isLoginPage) {
        localStorage.removeItem('token')
        window.location.href = '/welcome'
      }
    }
    if (error.response?.status === 400) {
      toast({
        description: error.response.data.message,
        variant: 'destructive'
      })
    }
    return Promise.reject(error)
  }
)

export default request

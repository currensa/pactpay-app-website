import { toast } from '@/components/ui/use-toast'
import axios from 'axios'

const request = axios.create({
  baseURL: import.meta.env.PROD ? 'https://api.pactpay.app/api' : '/api'
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
      localStorage.removeItem('token')
      window.location.href = '/account/login'
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

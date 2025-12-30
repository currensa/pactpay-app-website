import Login from '@/views/login';
import { createBrowserRouter } from 'react-router-dom';

export const router = createBrowserRouter([
  { path: '/account/login', element: <Login /> },
])


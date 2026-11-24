import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Landing from './components/Landing'
import Login from './pages/Login'
import AdminLogin from './pages/AdminLogin'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import StorePage from './pages/StorePage'
import BillPage from './pages/BillPage'
import ProductPage from './pages/ProductPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/store" element={<StorePage />} />
        <Route path="/store/bill/:id" element={<BillPage />} />
        <Route path="/store/:id" element={<ProductPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

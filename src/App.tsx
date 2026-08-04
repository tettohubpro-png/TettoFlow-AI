import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { CrmPage } from '@/pages/CrmPage'
import { ClientBriefingPage } from '@/pages/ClientBriefingPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { DepartmentsPage } from '@/pages/DepartmentsPage'
import { ApprovalsPage } from '@/pages/ApprovalsPage'
import { AiPage } from '@/pages/AiPage'
import { WhatsAppPage } from '@/pages/WhatsAppPage'
import { AlertsPage } from '@/pages/AlertsPage'
import { ReportsPage } from '@/pages/ReportsPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route index element={<DashboardPage />} />
            <Route path="crm" element={<CrmPage />} />
            <Route path="crm/:clientId" element={<ClientBriefingPage />} />
            <Route path="projetos" element={<ProjectsPage />} />
            <Route path="departamentos" element={<DepartmentsPage />} />
            <Route path="aprovacoes" element={<ApprovalsPage />} />
            <Route path="alertas" element={<AlertsPage />} />
            <Route path="relatorios" element={<ReportsPage />} />
            <Route path="ia" element={<AiPage />} />
            <Route path="whatsapp" element={<WhatsAppPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

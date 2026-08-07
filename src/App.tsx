import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { CrmPage } from '@/pages/CrmPage'
import { ComercialPage } from '@/pages/ComercialPage'
import { ClientBriefingPage } from '@/pages/ClientBriefingPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { ContentPage } from '@/pages/ContentPage'
import { AgendaPage } from '@/pages/AgendaPage'
import { TeamPage } from '@/pages/TeamPage'
import { DepartmentsPage } from '@/pages/DepartmentsPage'
import { ApprovalsPage } from '@/pages/ApprovalsPage'
import { AiPage } from '@/pages/AiPage'
import { WhatsAppPage } from '@/pages/WhatsAppPage'
import { InboxPage } from '@/pages/InboxPage'
import { FinancePage } from '@/pages/FinancePage'
import { AlertsPage } from '@/pages/AlertsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ReferralPage } from '@/pages/ReferralPage'
import { ChangelogPage } from '@/pages/ChangelogPage'
import { SupportPage } from '@/pages/SupportPage'
import { BillingPage } from '@/pages/BillingPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
          <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
          <Route element={<ProtectedRoute />}>
            <Route index element={<DashboardPage />} />
            <Route path="crm" element={<CrmPage />} />
            <Route path="crm/:clientId" element={<ClientBriefingPage />} />
            <Route path="comercial" element={<ComercialPage />} />
            <Route path="conteudo" element={<ContentPage />} />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="equipe" element={<TeamPage />} />
            <Route path="projetos" element={<Navigate to="/tarefas" replace />} />
            <Route path="departamentos" element={<DepartmentsPage />} />
            <Route path="aprovacoes" element={<ApprovalsPage />} />
            <Route path="alertas" element={<AlertsPage />} />
            <Route path="relatorios" element={<ReportsPage />} />
            <Route path="ia" element={<AiPage />} />
            <Route path="whatsapp" element={<WhatsAppPage />} />
            <Route path="mensagens" element={<InboxPage />} />
            <Route path="financeiro" element={<FinancePage />} />
            <Route path="tarefas" element={<ProjectsPage />} />
            <Route path="indique" element={<ReferralPage />} />
            <Route path="novidades" element={<ChangelogPage />} />
            <Route path="suporte" element={<SupportPage />} />
            <Route path="assinatura" element={<BillingPage />} />
            <Route path="configuracoes" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

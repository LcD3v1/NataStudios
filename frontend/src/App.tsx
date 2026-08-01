import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { I18nProvider } from '@/i18n';
import Home from '@/pages/Home';

// The dashboard is split out so visitors to the public site never download it.
const Login = lazy(() => import('@/pages/Login'));
const DashboardLayout = lazy(() =>
  import('@/components/dashboard/DashboardLayout').then((m) => ({ default: m.DashboardLayout }))
);
const Overview = lazy(() => import('@/pages/dashboard/Overview'));
const Leads = lazy(() => import('@/pages/dashboard/Leads'));
const Clientes = lazy(() => import('@/pages/dashboard/Clientes'));
const Projetos = lazy(() => import('@/pages/dashboard/Projetos'));
const Marketing = lazy(() => import('@/pages/dashboard/Marketing'));
const Financeiro = lazy(() => import('@/pages/dashboard/Financeiro'));
const Auditoria = lazy(() => import('@/pages/dashboard/Auditoria'));
const Seguranca = lazy(() => import('@/pages/dashboard/Seguranca'));

function Fallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="animate-spin text-accent" size={28} />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/" element={<Home />} />

            <Route path="/dashboard/login" element={<Login />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Overview />} />
              <Route path="leads" element={<Leads />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="projetos" element={<Projetos />} />
              <Route path="marketing" element={<Marketing />} />
              <Route path="financeiro" element={<Financeiro />} />
              <Route path="auditoria" element={<Auditoria />} />
              <Route path="seguranca" element={<Seguranca />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </I18nProvider>
  );
}

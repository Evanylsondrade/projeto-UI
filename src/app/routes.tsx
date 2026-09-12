import { createBrowserRouter, Link, Navigate, Outlet, useLocation } from "react-router";
import { lazy, Suspense } from 'react';
import { LockKeyhole, PawPrint } from "lucide-react";
import { useAuth } from "./auth/AuthContext";
import { Button } from "./components/ui/button";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Pets } from "./pages/Pets";
import { Tutores } from "./pages/Tutores";
import { Agenda } from "./pages/Agenda";
import { Servicos } from "./pages/Servicos";
const Relatorios = lazy(() => import('./pages/Relatorios').then(module => ({ default: module.Relatorios })));
import { Layout } from "./components/Layout";

function ProtectedRoutes() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />;
  return <Outlet />;
}

function ManagerOnly() {
  const { user } = useAuth();
  if (user?.role === 'gerente') return <Suspense fallback={<p className="page-container" role="status">Carregando relatórios…</p>}><Relatorios /></Suspense>;
  return <div className="page-container"><section className="mx-auto my-10 max-w-lg rounded-3xl border border-slate-100 bg-white p-8 text-center"><LockKeyhole size={40} className="mx-auto mb-4 text-[#3296FA]" aria-hidden="true" /><h1 className="text-xl font-bold text-slate-800">Área da gerência</h1><p className="my-4 text-sm leading-relaxed text-slate-500">Os relatórios gerenciais estão disponíveis para o perfil gerente. Você pode continuar os atendimentos e cadastros pelo painel inicial.</p><Button asChild className="min-h-11 rounded-xl bg-[#3296FA] text-white hover:bg-[#1476D6]"><Link to="/">Voltar ao início</Link></Button></section></div>;
}

function NotFound() {
  return <div className="page-container"><section className="mx-auto my-10 max-w-lg rounded-3xl border border-slate-100 bg-white p-8 text-center"><PawPrint size={40} className="mx-auto mb-4 text-[#FF6B00]" aria-hidden="true" /><p className="text-sm font-semibold text-[#1476D6]">Erro 404</p><h1 className="mt-2 text-xl font-bold text-slate-800">Página não encontrada</h1><p className="my-4 text-sm text-slate-500">Esse caminho não existe. Volte ao início para continuar.</p><Button asChild className="min-h-11 rounded-xl bg-[#3296FA] text-white hover:bg-[#1476D6]"><Link to="/">Voltar ao início</Link></Button></section></div>;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    Component: ProtectedRoutes,
    children: [
      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, Component: Dashboard },
          { path: "pets", Component: Pets },
          { path: "tutores", Component: Tutores },
          { path: "agenda", Component: Agenda },
          { path: "servicos", Component: Servicos },
          { path: "relatorios", Component: ManagerOnly },
          { path: "*", Component: NotFound },
        ],
      },
    ],
  },
]);

import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { CalendarDays, ChartNoAxesCombined, Home, LogOut, Menu, PawPrint, Scissors, Users, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useAuth } from '../auth/AuthContext';
import { Button } from './ui/button';

const navigation = [
  { icon: Home, label: 'Início', path: '/' },
  { icon: Users, label: 'Tutores', path: '/tutores' },
  { icon: PawPrint, label: 'Pets', path: '/pets' },
  { icon: CalendarDays, label: 'Agenda', path: '/agenda' },
  { icon: Scissors, label: 'Serviços', path: '/servicos' },
  { icon: ChartNoAxesCombined, label: 'Relatórios', path: '/relatorios' },
];

function Brand() {
  return <span className="flex items-center gap-2.5"><span className="flex size-10 items-center justify-center rounded-xl bg-orange-50 text-2xl" aria-hidden="true">🐾</span><span className="text-lg font-bold"><span className="text-[#D95800]">Smart</span><span className="text-[#1476D6]">Pet Hub</span></span></span>;
}

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuItems = navigation.filter((item) => item.path !== '/relatorios' || user?.role === 'gerente');
  const roleLabel = user?.role === 'gerente' ? 'Gerente' : 'Atendente';
  const currentPage = navigation.find((item) => item.path === location.pathname)?.label ?? 'SmartPet Hub';
  const initials = user?.name.split(' ').map((part) => part[0]).slice(0, 2).join('') ?? 'SP';

  useEffect(() => {
    setMenuOpen(false);
    document.title = `${currentPage} | SmartPet Hub`;
  }, [location.pathname, currentPage]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  const employeeInfo = (
    <div className="flex min-w-0 items-center gap-3">
      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-[#1476D6]">{initials}</span>
      <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-700">{user?.name}</p><p className="text-xs text-slate-500">{roleLabel}</p></div>
    </div>
  );

  const desktopLinks = (
    <div className="space-y-1.5">
      {menuItems.map(({ icon: Icon, label, path }) => <NavLink key={path} to={path} end={path === '/'} onClick={() => setMenuOpen(false)} className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#3296FA] ${isActive ? 'bg-[#EAF4FF] text-[#1476D6]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}><Icon size={20} aria-hidden="true" />{label}</NavLink>)}
    </div>
  );

  return (
    <div className="min-h-dvh bg-[#F5F7FA] text-slate-800">
      <a href="#main-content" className="sr-only fixed left-4 top-4 z-[100] rounded-xl bg-white p-3 text-[#1476D6] shadow-md focus:not-sr-only">Pular para o conteúdo</a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-100 bg-white p-5 lg:flex" aria-label="Barra lateral">
        <Link to="/" aria-label="SmartPet Hub — início" className="mb-10 mt-2 rounded-xl focus-visible:outline-2 focus-visible:outline-[#3296FA]"><Brand /></Link>
        <p className="mb-3 px-4 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Gestão do pet shop</p>
        <nav aria-label="Navegação principal">{desktopLinks}</nav>
        <div className="mt-auto pt-8">
          <div className="mb-5 rounded-2xl bg-[#F5FAFF] p-4"><PawPrint size={22} className="mb-2 text-[#3296FA]" aria-hidden="true" /><p className="text-sm font-medium text-slate-700">Cuidar é o que nos move.</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Uma rotina mais leve para você e para os pets.</p></div>
          <div className="border-t border-slate-100 pt-5">{employeeInfo}<Button variant="ghost" onClick={handleLogout} className="mt-3 min-h-11 w-full justify-start rounded-xl text-slate-500 hover:text-red-700"><LogOut size={18} aria-hidden="true" /> Sair da conta</Button></div>
        </div>
      </aside>

      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:min-h-20 lg:px-8">
            <div className="min-w-0"><Link to="/" aria-label="SmartPet Hub — início" className="inline-block rounded-xl lg:hidden"><Brand /></Link><p className="hidden text-sm font-medium text-slate-600 lg:block">Gestão do pet shop <span className="mx-2 text-slate-300" aria-hidden="true">/</span> <span className="text-slate-800">{currentPage}</span></p><span className="mt-1 inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-800 lg:hidden">Demonstração</span></div>
            <div className="flex shrink-0 items-center gap-3 lg:gap-5">
              <span className="hidden rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-800 lg:inline-flex">Demonstração</span>
              <div className="hidden lg:block">{employeeInfo}</div>
              <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
                <Dialog.Trigger asChild><button type="button" aria-label="Abrir menu" className="flex size-11 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[#3296FA] lg:hidden"><Menu size={22} /></button></Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
                  <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(88vw,22rem)] flex-col overflow-y-auto bg-white p-5 shadow-xl data-[state=open]:animate-in data-[state=open]:slide-in-from-right">
                    <div className="mb-5 flex items-center justify-between gap-2"><Dialog.Title className="text-lg font-semibold text-slate-800">Menu do pet shop</Dialog.Title><Dialog.Close asChild><button type="button" aria-label="Fechar menu" className="flex size-11 items-center justify-center rounded-xl hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[#3296FA]"><X size={20} /></button></Dialog.Close></div>
                    <Dialog.Description className="sr-only">Acesse os cadastros e as áreas de gestão disponíveis para seu perfil.</Dialog.Description>
                    <div className="mb-6 rounded-2xl bg-slate-50 p-4">{employeeInfo}<span className="mt-3 inline-flex rounded-full bg-orange-50 px-2 py-1 text-xs font-medium text-orange-800">Demonstração</span></div>
                    <nav aria-label="Menu completo">{desktopLinks}</nav>
                    <div className="mt-auto pt-6"><Button variant="outline" onClick={handleLogout} className="min-h-12 w-full rounded-xl text-slate-600"><LogOut size={18} aria-hidden="true" /> Sair da conta</Button></div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            </div>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="min-w-0 pb-24 outline-none lg:pb-0"><Outlet /></main>
      </div>

      <nav aria-label="Navegação rápida" className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-100 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.03)] lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="mx-auto grid max-w-lg grid-cols-4 px-2 py-2">
          {navigation.slice(0, 4).map(({ icon: Icon, label, path }) => <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-xs focus-visible:outline-2 focus-visible:outline-[#3296FA] ${isActive ? 'bg-blue-50 font-semibold text-[#1476D6]' : 'text-slate-500 hover:bg-slate-50'}`}><Icon size={21} aria-hidden="true" /><span>{label}</span></NavLink>)}
        </div>
      </nav>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, CalendarDays, Check, Clock3, PawPrint, Plus, Scissors, Users, UserPlus, Bell, ChevronRight } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { usePetShop } from '../data/PetShopContext';
import { isActiveAppointment } from '../data/model';
import { localDate } from '../data/seed';

export function Dashboard() {
  const { user } = useAuth();
  const { tutors, pets, appointments, services, storageWarning } = usePetShop();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(timer); }, []);
  const today = localDate(now);
  const todaysAppointments = appointments.filter(a => a.date === today && a.status !== 'cancelado').sort((a, b) => a.time.localeCompare(b.time));
  const pending = appointments.filter(a => isActiveAppointment(a) && new Date(a.date + 'T' + a.time) >= now).sort((a, b) => (a.date + 'T' + a.time).localeCompare(b.date + 'T' + b.time));
  const awaitingConfirmation = pending.filter(a => a.status === 'agendado');
  const tutorsWithoutPets = tutors.filter(tutor => !pets.some(pet => pet.tutorId === tutor.id));
  const completedToday = todaysAppointments.filter(a => a.status === 'concluido').length;
  const greeting = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  const stats = [
    { title: 'Pets cadastrados', count: pets.length, icon: PawPrint, color: '#3296FA', tint: '#EAF4FF', href: '/pets', caption: 'Todos os nossos companheiros' },
    { title: 'Tutores cadastrados', count: tutors.length, icon: Users, color: '#E8610B', tint: '#FFF0E5', href: '/tutores', caption: 'Clientes do pet shop' },
    { title: 'Agendamentos hoje', count: todaysAppointments.length, icon: CalendarDays, color: '#CA4545', tint: '#FFF0F0', href: '/agenda?data=' + today, caption: completedToday + ' concluído(s) hoje' },
    { title: 'Serviços disponíveis', count: services.length, icon: Scissors, color: '#8B4DCD', tint: '#F3ECFF', href: '/servicos', caption: 'Cuidados para cada pet' },
  ];

  return (
    <div className="page-container space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#64748b]">Visão geral do pet shop</p>
          <h1 className="text-2xl font-bold sm:text-3xl">{greeting}, {user?.name.split(' ')[0]}! <span aria-hidden="true">👋</span></h1>
          <p className="mt-2 text-sm text-[#666]">Tudo pronto para cuidar de mais um dia.</p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-xl border border-[#e3e9ef] bg-white px-4 py-3 text-sm text-[#596577] sm:self-auto">
          <CalendarDays size={18} className="text-[#3296FA]" aria-hidden="true" />
          <time dateTime={today}>{now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
        </div>
      </header>
      {storageWarning && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{storageWarning}</p>}
      <section aria-label="Indicadores do pet shop" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map(({ title, count, icon: Icon, color, tint, href, caption }) => (
          <Link key={title} to={href} className="group min-w-0 rounded-2xl border border-[#e9edf2] bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex size-11 items-center justify-center rounded-xl" style={{ color, background: tint }}><Icon size={23} aria-hidden="true" /></span>
              <ArrowRight size={17} className="text-[#a8b2bf] transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </div>
            <p className="text-3xl font-bold tracking-tight">{count}</p>
            <h2 className="mt-1 text-sm font-semibold">{title}</h2>
            <p className="mt-2 hidden text-xs text-[#707b8b] sm:block">{caption}</p>
          </Link>
        ))}
      </section>
      <div className="grid items-start gap-6 xl:grid-cols-3">
        <section className="dashboard-panel xl:col-span-2">
          <div className="section-heading">
            <div className="flex items-center gap-2"><CalendarDays size={20} className="text-[#3296FA]" aria-hidden="true" /><h2 className="font-bold">Agenda de hoje</h2><span className="rounded-md bg-[#f0f5fa] px-2 py-1 text-xs text-[#526275]">{todaysAppointments.length}</span></div>
            <Link to={'/agenda?data=' + today} className="section-link">Ver agenda <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          {todaysAppointments.length ? (
            <div className="space-y-3">
              {todaysAppointments.map(appointment => {
                const pet = pets.find(p => p.id === appointment.petId);
                const tutor = tutors.find(t => t.id === pet?.tutorId);
                const service = services.find(s => s.id === appointment.serviceId);
                return (
                  <Link to={'/agenda?data=' + today} key={appointment.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-[#F5F7FA] p-3 transition-colors hover:bg-[#eaf3fd] sm:gap-4 sm:p-4">
                    <time className="text-sm font-bold text-[#1768b4]" dateTime={today + 'T' + appointment.time}>{appointment.time}</time>
                    <span className="hidden size-10 items-center justify-center rounded-full bg-white text-xl sm:flex" aria-hidden="true">{pet?.species === 'Gato' ? '🐈' : pet?.species === 'Cachorro' ? '🐕' : '🐾'}</span>
                    <div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{pet?.name} <span className="font-normal text-[#687588]">· {service?.name}</span></p><p className="mt-1 break-words text-xs text-[#6b7788]">{tutor?.name}</p></div>
                    <span className={'status-pill ' + (appointment.status === 'confirmado' ? 'bg-[#e0f5eb] text-[#21704d]' : appointment.status === 'concluido' ? 'bg-gray-200 text-gray-700' : 'bg-[#e4efff] text-[#265f9b]')}>{appointment.status === 'confirmado' ? 'Confirmado' : appointment.status === 'concluido' ? 'Concluído' : 'Agendado'}</span>
                  </Link>
                );
              })}
            </div>
          ) : <div className="py-10 text-center"><CalendarDays className="mx-auto mb-3 text-[#9aa9bb]" size={32} /><p className="font-medium">Agenda livre por aqui</p><p className="mt-1 text-sm text-[#666]">Nenhum atendimento marcado para hoje.</p><Link className="section-link mt-3" to="/agenda">Abrir agenda <ArrowRight size={15} /></Link></div>}
        </section>
        <div className="space-y-6">
          <section className="dashboard-panel">
            <h2 className="mb-4 font-bold">Acesso rápido</h2>
            <div className="space-y-2">
              {[{ label: 'Cadastrar tutor', description: 'Receba um novo cliente', href: '/tutores?novo=1', icon: UserPlus, color: '#E8610B', bg: '#FFF0E5' }, { label: 'Cadastrar pet', description: 'Um novo amigo por aqui', href: '/pets?novo=1', icon: PawPrint, color: '#2577C6', bg: '#EAF4FF' }, { label: 'Novo agendamento', description: 'Organize o próximo cuidado', href: '/agenda?novo=1', icon: Plus, color: '#8B4DCD', bg: '#F3ECFF' }].map(({ label, description, href, icon: Icon, color, bg }) => (
                <Link key={href} to={href} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-[#F5F7FA]">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ color, background: bg }}><Icon size={19} aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{label}</span><span className="mt-0.5 block text-xs text-[#6b7788]">{description}</span></span><ChevronRight size={16} className="text-[#97a4b5]" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-[#f4e3be] bg-[#fff9ed] p-5">
            <h2 className="mb-3 flex items-center gap-2 font-bold text-[#795718]"><Bell size={18} aria-hidden="true" /> Fique de olho</h2>
            {awaitingConfirmation.length > 0 && <Link to={'/agenda?data=' + awaitingConfirmation[0].date} className="mb-3 block text-sm leading-relaxed text-[#775827] hover:underline"><strong>{awaitingConfirmation.length} {awaitingConfirmation.length === 1 ? 'agendamento aguarda' : 'agendamentos aguardam'} confirmação.</strong> Confira os próximos atendimentos.</Link>}
            {tutorsWithoutPets.length > 0 && <Link to="/tutores" className="block text-sm leading-relaxed text-[#775827] hover:underline">{tutorsWithoutPets.length} {tutorsWithoutPets.length === 1 ? 'tutor ainda não possui pet vinculado' : 'tutores ainda não possuem pets vinculados'}.</Link>}
            {!awaitingConfirmation.length && !tutorsWithoutPets.length && <p className="flex items-center gap-2 text-sm text-[#775827]"><Check size={17} /> Nenhuma pendência nos cadastros e confirmações futuras.</p>}
          </section>
        </div>
      </div>
      <section className="dashboard-panel">
        <div className="section-heading"><div><h2 className="font-bold">Pets cadastrados recentemente</h2><p className="mt-1 text-xs text-[#6b7788]">Cada cadastro, um cuidado mais próximo.</p></div><Link to="/pets" className="section-link">Ver todos os pets <ArrowRight size={15} aria-hidden="true" /></Link></div>
        {pets.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{pets.slice(-4).reverse().map(pet => (
          <Link to={'/pets?pet=' + pet.id} key={pet.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-[#e9edf2] p-4 hover:bg-[#F5F7FA]">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#f0f6ff] text-2xl" aria-hidden="true">{pet.species === 'Gato' ? '🐈' : pet.species === 'Cachorro' ? '🐕' : '🐾'}</span><div className="min-w-0"><h3 className="break-words text-sm font-bold">{pet.name}</h3><p className="mt-1 break-words text-xs text-[#667386]">{pet.breed || pet.species}</p><p className="mt-1 break-words text-xs text-[#667386]">{tutors.find(t => t.id === pet.tutorId)?.name}</p></div>
          </Link>
        ))}</div> : <p className="py-5 text-sm text-[#666]">Nenhum pet cadastrado. <Link to="/pets?novo=1" className="section-link">Cadastrar o primeiro pet</Link></p>}
      </section>
      {pending.length > 0 && <p className="flex flex-wrap items-center gap-2 text-xs text-[#6b7788]"><Clock3 size={15} aria-hidden="true" /> Próximo atendimento: {pets.find(p => p.id === pending[0].petId)?.name}, {new Date(pending[0].date + 'T12:00:00').toLocaleDateString('pt-BR')} às {pending[0].time}.</p>}
    </div>
  );
}

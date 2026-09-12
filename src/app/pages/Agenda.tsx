import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Plus, Calendar as CalendarIcon, Clock, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { usePetShop } from '../data/PetShopContext';
import { localDate } from '../data/seed';
import type { AppointmentInput } from '../data/types';
import { toast } from 'sonner';

const emptyAppointment: AppointmentInput = { date: '', time: '', petId: '', serviceId: '' };
const statusLabels = { agendado: 'Agendado', confirmado: 'Confirmado', concluido: 'Concluído', cancelado: 'Cancelado' };
const statusColors = { agendado: '#1765AB', confirmado: '#047857', concluido: '#6B7280', cancelado: '#B42318' };

function isValidDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00`);
  return !Number.isNaN(parsed.getTime()) && localDate(parsed) === value;
}

export function Agenda() {
  const { appointments, tutors, pets, services, addAppointment } = usePetShop();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryDate = searchParams.get('data');
  const selectedDate = isValidDate(queryDate) ? queryDate : localDate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<AppointmentInput>({ ...emptyAppointment });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (searchParams.get('novo') !== '1') return;
    setForm({ ...emptyAppointment, date: selectedDate });
    setFormError('');
    setIsDialogOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('novo');
    setSearchParams(next, { replace: true });
  }, [searchParams, selectedDate, setSearchParams]);

  const filteredAppointments = appointments.filter(appointment => appointment.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
  const selectedPet = pets.find(pet => pet.id === form.petId);
  const selectedTutor = tutors.find(tutor => tutor.id === selectedPet?.tutorId);

  function changeDate(date: string) {
    if (!isValidDate(date)) return;
    const next = new URLSearchParams(searchParams);
    next.set('data', date);
    setSearchParams(next, { replace: true });
  }

  function openForm() {
    setForm({ ...emptyAppointment, date: selectedDate });
    setFormError('');
    setIsDialogOpen(true);
  }

  function updateField(field: keyof AppointmentInput, value: string) {
    setForm(current => ({ ...current, [field]: value }));
    setFormError('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.date || !form.time || !form.petId || !form.serviceId) {
      setFormError('Selecione a data, o horário, o pet e o serviço para agendar.');
      return;
    }
    try {
      addAppointment(form);
      changeDate(form.date);
      setIsDialogOpen(false);
      toast.success('Agendamento criado com sucesso!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível criar o agendamento. Tente novamente.';
      setFormError(message);
      toast.error(message);
    }
  }

  return (
    <div className="page-container">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[#333333]"><CalendarIcon className="text-[#3296FA]" aria-hidden="true" />Agenda</h1>
          <p className="mt-1 text-sm text-[#666666]">Gerencie os atendimentos do pet shop</p>
        </div>
        <Button onClick={openForm} className="h-11 rounded-lg bg-[#FF6B00] text-white hover:bg-[#e66000]"><Plus size={18} aria-hidden="true" /> Novo Agendamento</Button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <Label htmlFor="agenda-date-filter" className="mb-2 block text-[#333333]">Selecione a data</Label>
          <div className="flex flex-wrap gap-2">
            <Input id="agenda-date-filter" type="date" value={selectedDate} onChange={event => changeDate(event.target.value)} className="h-11 min-w-0 flex-1 rounded-lg border-[#E0E0E0] bg-white" />
            <Button variant="outline" className="h-11" onClick={() => changeDate(localDate())}>Hoje</Button>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
          <div><p className="text-sm text-[#666666]">Agendamentos nesta data</p><p className="text-2xl font-bold text-[#3296FA]" aria-live="polite">{filteredAppointments.length}</p></div>
          <CalendarIcon size={32} className="text-[#3296FA] opacity-40" aria-hidden="true" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredAppointments.map(appointment => {
          const pet = pets.find(item => item.id === appointment.petId);
          const service = services.find(item => item.id === appointment.serviceId);
          const tutor = tutors.find(item => item.id === pet?.tutorId);
          return <article key={appointment.id} className="min-w-0 rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-semibold text-[#1765AB]"><Clock size={16} aria-hidden="true" />{appointment.time}</p>
              <span className="rounded px-2 py-1 text-xs" style={{ backgroundColor: `${statusColors[appointment.status]}15`, color: statusColors[appointment.status] }}>{statusLabels[appointment.status]}</span>
            </div>
            <h2 className="break-words font-medium text-[#333333]">{service?.name ?? 'Serviço indisponível'} – {pet?.name ?? 'Pet indisponível'}</h2>
            <p className="mt-2 flex items-start gap-1.5 text-sm text-[#666666]"><User size={14} className="mt-0.5 shrink-0" aria-hidden="true" /><span className="break-words">{tutor?.name ?? 'Tutor indisponível'}</span></p>
          </article>;
        })}
      </div>
      {filteredAppointments.length === 0 && <div className="rounded-xl bg-white px-4 py-12 text-center shadow-sm"><CalendarIcon className="mx-auto mb-3 text-[#3296FA]" size={40} aria-hidden="true" /><h2 className="font-semibold text-[#333333]">Nenhum agendamento para esta data</h2><p className="mt-2 text-sm text-[#666666]">Escolha outra data ou cadastre um novo atendimento.</p><Button variant="outline" onClick={openForm} className="mt-4 min-h-11"><Plus size={16} aria-hidden="true" /> Novo Agendamento</Button></div>}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Novo Agendamento</DialogTitle><DialogDescription>Selecione um pet cadastrado e o serviço desejado. Campos com * são obrigatórios.</DialogDescription></DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="appointment-date">Data *</Label><Input id="appointment-date" type="date" min={localDate()} value={form.date} onChange={event => updateField('date', event.target.value)} required className="min-h-11" /></div>
              <div className="space-y-2"><Label htmlFor="appointment-time">Horário *</Label><Input id="appointment-time" type="time" value={form.time} onChange={event => updateField('time', event.target.value)} required className="min-h-11" /></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appointment-pet">Pet *</Label>
              <Select value={form.petId} onValueChange={value => updateField('petId', value)}>
                <SelectTrigger id="appointment-pet" className="min-h-11 w-full" aria-required="true"><SelectValue placeholder="Selecione o pet" /></SelectTrigger>
                <SelectContent>{pets.map(pet => <SelectItem key={pet.id} value={pet.id}>{pet.name} · {tutors.find(tutor => tutor.id === pet.tutorId)?.name ?? 'Tutor indisponível'}</SelectItem>)}</SelectContent>
              </Select>
              {!pets.length && <p className="text-sm text-[#666666]">Cadastre um pet para agendar. <Link className="text-[#1765AB] underline" to="/pets?novo=1">Cadastrar pet</Link></p>}
            </div>
            <div className="space-y-2"><Label htmlFor="appointment-tutor">Tutor responsável</Label><Input id="appointment-tutor" readOnly value={selectedTutor?.name ?? ''} placeholder="Preenchido ao selecionar o pet" className="min-h-11" /></div>
            <div className="space-y-2">
              <Label htmlFor="appointment-service">Serviço *</Label>
              <Select value={form.serviceId} onValueChange={value => updateField('serviceId', value)}>
                <SelectTrigger id="appointment-service" className="min-h-11 w-full" aria-required="true"><SelectValue placeholder="Selecione o serviço" /></SelectTrigger>
                <SelectContent>{services.map(service => <SelectItem key={service.id} value={service.id}>{service.name} · {service.price}</SelectItem>)}</SelectContent>
              </Select>
              {!services.length && <p className="text-sm text-[#666666]">Solicite ao gerente o cadastro de um serviço antes de agendar.</p>}
            </div>
            {formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
            <DialogFooter><Button type="button" variant="outline" className="min-h-11" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={!pets.length || !services.length} className="min-h-11 bg-[#3296FA] text-white hover:bg-[#207ddd]">Agendar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

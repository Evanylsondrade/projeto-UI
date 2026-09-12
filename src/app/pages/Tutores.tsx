import { useEffect, useState, type FormEvent, type MouseEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Plus, Search, Edit2, Trash2, Phone, Mail, PawPrint, Users, Eye, MapPin } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { usePetShop } from '../data/PetShopContext';
import type { Tutor, TutorInput } from '../data/types';
import { toast } from 'sonner';

const emptyTutor: TutorInput = { name: '', phone: '', email: '', address: '', notes: '' };
const avatarColors = ['#3296FA', '#FF6B00', '#9333EA', '#E53E3E', '#10B981'];
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
const initials = (name: string) => name.trim().split(/\s+/).map(part => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

export function Tutores() {
  const { tutors, pets, saveTutor, deleteTutor } = usePetShop();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [form, setForm] = useState<TutorInput>({ ...emptyTutor });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof TutorInput, string>>>({});
  const [formError, setFormError] = useState('');
  const [detailId, setDetailId] = useState<string>();
  const [deletingId, setDeletingId] = useState<string>();
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const create = searchParams.get('novo') === '1';
    const tutorId = searchParams.get('tutor');
    if (!create && !tutorId) return;
    if (create) {
      setEditingId(undefined);
      setForm({ ...emptyTutor });
      setFieldErrors({});
      setFormError('');
      setIsDialogOpen(true);
    } else if (tutorId) {
      if (tutors.some(tutor => tutor.id === tutorId)) setDetailId(tutorId);
      else toast.error('Tutor não encontrado.');
    }
    const next = new URLSearchParams(searchParams);
    next.delete('novo');
    next.delete('tutor');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, tutors]);

  const search = normalize(searchTerm.trim());
  const searchPhone = searchTerm.replace(/\D/g, '');
  const filteredTutors = tutors.filter(tutor =>
    normalize(tutor.name).includes(search) ||
    normalize(tutor.email).includes(search) ||
    tutor.phone.includes(searchTerm.trim()) ||
    (searchPhone.length > 0 && !/[a-z]/i.test(search) && tutor.phone.replace(/\D/g, '').includes(searchPhone))
  );
  const selectedTutor = tutors.find(tutor => tutor.id === detailId);
  const selectedPets = pets.filter(pet => pet.tutorId === detailId);
  const deletingTutor = tutors.find(tutor => tutor.id === deletingId);
  const linkedPets = pets.filter(pet => pet.tutorId === deletingId);

  function openForm(tutor?: Tutor) {
    setEditingId(tutor?.id);
    setForm(tutor ? { name: tutor.name, phone: tutor.phone, email: tutor.email, address: tutor.address, notes: tutor.notes } : { ...emptyTutor });
    setFieldErrors({});
    setFormError('');
    setDetailId(undefined);
    setIsDialogOpen(true);
  }

  function updateField(field: keyof TutorInput, value: string) {
    setForm(current => ({ ...current, [field]: value }));
    setFieldErrors(current => ({ ...current, [field]: undefined }));
    setFormError('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: Partial<Record<keyof TutorInput, string>> = {};
    if (form.name.trim().length < 2 || form.name.trim().length > 100) errors.name = 'Informe um nome entre 2 e 100 caracteres.';
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (!form.phone.trim()) errors.phone = 'Informe o telefone do tutor.';
    else if (!/^\d{10,11}$/.test(phoneDigits)) errors.phone = 'Informe um telefone com DDD (10 ou 11 dígitos).';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Informe um e-mail válido.';
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setFormError('Revise os campos indicados antes de salvar.');
      return;
    }
    try {
      saveTutor({ name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), address: form.address.trim(), notes: form.notes.trim() }, editingId);
      setIsDialogOpen(false);
      toast.success(editingId ? 'Tutor atualizado com sucesso!' : 'Tutor cadastrado com sucesso!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar o tutor. Tente novamente.';
      setFormError(message);
      toast.error(message);
    }
  }

  function handleDelete(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (!deletingTutor || linkedPets.length > 0) return;
    try {
      deleteTutor(deletingTutor.id);
      toast.success('Tutor excluído com sucesso.');
      setDeletingId(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível excluir o tutor. Tente novamente.';
      setDeleteError(message);
      toast.error(message);
    }
  }

  return (
    <div className="page-container">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[#333333]"><Users className="text-[#3296FA]" aria-hidden="true" />Tutores</h1>
          <p className="mt-1 text-sm text-[#666666]">{tutors.length} {tutors.length === 1 ? 'tutor cadastrado' : 'tutores cadastrados'} · Clientes do pet shop</p>
        </div>
        <Button onClick={() => openForm()} className="h-11 rounded-lg bg-[#FF6B00] text-white hover:bg-[#e66000]">
          <Plus size={18} aria-hidden="true" /> Cadastrar Novo Tutor
        </Button>
      </div>

      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <Label htmlFor="tutor-search" className="sr-only">Buscar tutor por nome, telefone ou e-mail</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" size={18} aria-hidden="true" />
          <Input id="tutor-search" type="search" placeholder="Buscar por nome, telefone ou e-mail..." value={searchTerm} onChange={event => setSearchTerm(event.target.value)} className="h-11 rounded-lg border-[#E0E0E0] bg-white pl-10" />
        </div>
        <p className="mt-2 text-xs text-[#666666]" aria-live="polite">{filteredTutors.length} {filteredTutors.length === 1 ? 'tutor encontrado' : 'tutores encontrados'}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filteredTutors.map((tutor, index) => {
          const petCount = pets.filter(pet => pet.tutorId === tutor.id).length;
          return (
            <article key={tutor.id} className="flex min-w-0 flex-col rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-semibold text-white" style={{ backgroundColor: avatarColors[index % avatarColors.length] }} aria-hidden="true">{initials(tutor.name)}</div>
                <div className="min-w-0 flex-1">
                  <h2 className="break-words font-semibold text-[#333333]">{tutor.name}</h2>
                  <p className="mt-2 flex items-start gap-1.5 text-sm text-[#666666]"><Phone size={14} className="mt-0.5 shrink-0" aria-hidden="true" /><span className="break-all">{tutor.phone}</span></p>
                  {tutor.email && <p className="mt-1 flex items-start gap-1.5 text-sm text-[#666666]"><Mail size={14} className="mt-0.5 shrink-0" aria-hidden="true" /><span className="break-all">{tutor.email}</span></p>}
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[#EBF5FF] px-2 py-1 text-xs text-[#1765AB]"><PawPrint size={13} aria-hidden="true" />{petCount} {petCount === 1 ? 'pet vinculado' : 'pets vinculados'}</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#F0F0F0] pt-3">
                <Button variant="ghost" onClick={() => setDetailId(tutor.id)} className="min-h-10 px-2 text-[#1765AB]" aria-label={`Ver detalhes de ${tutor.name}`}><Eye size={16} aria-hidden="true" /> Ver detalhes</Button>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-[#1765AB]" onClick={() => openForm(tutor)} aria-label={`Editar ${tutor.name}`}><Edit2 size={17} aria-hidden="true" /></Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-[#C43232]" onClick={() => { setDeletingId(tutor.id); setDeleteError(''); }} aria-label={`Excluir ${tutor.name}`}><Trash2 size={17} aria-hidden="true" /></Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {filteredTutors.length === 0 && (
        <div className="rounded-xl bg-white px-4 py-12 text-center shadow-sm">
          <Users className="mx-auto mb-3 text-[#3296FA]" size={40} aria-hidden="true" />
          <h2 className="font-semibold text-[#333333]">{tutors.length ? 'Nenhum tutor encontrado' : 'Cadastre o primeiro tutor'}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[#666666]">{tutors.length ? 'Tente outro nome, telefone ou e-mail para encontrar o cliente.' : 'Comece pelo cadastro do cliente para vincular os pets ao responsável.'}</p>
          {tutors.length ? <Button variant="outline" className="mt-4 min-h-10" onClick={() => setSearchTerm('')}>Limpar busca</Button> : <Button className="mt-4 min-h-10 bg-[#FF6B00] text-white hover:bg-[#e66000]" onClick={() => openForm()}><Plus size={16} aria-hidden="true" /> Cadastrar tutor</Button>}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Tutor' : 'Cadastrar Novo Tutor'}</DialogTitle>
            <DialogDescription>Informe os dados do cliente responsável pelos pets. Campos com * são obrigatórios.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tutor-name">Nome completo *</Label>
              <Input id="tutor-name" value={form.name} onChange={event => updateField('name', event.target.value)} autoComplete="name" maxLength={100} required placeholder="Ex: Maria Silva" className="min-h-11" aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? 'tutor-name-error' : undefined} />
              {fieldErrors.name && <p id="tutor-name-error" className="text-sm text-red-700">{fieldErrors.name}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tutor-phone">Telefone com DDD *</Label>
                <Input id="tutor-phone" type="tel" value={form.phone} onChange={event => updateField('phone', event.target.value)} autoComplete="tel-national" maxLength={20} required placeholder="(11) 98765-4321" className="min-h-11" aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone ? 'tutor-phone-error' : undefined} />
                {fieldErrors.phone && <p id="tutor-phone-error" className="text-sm text-red-700">{fieldErrors.phone}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tutor-email">E-mail</Label>
                <Input id="tutor-email" type="email" value={form.email} onChange={event => updateField('email', event.target.value)} autoComplete="email" maxLength={254} placeholder="email@exemplo.com" className="min-h-11" aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'tutor-email-error' : undefined} />
                {fieldErrors.email && <p id="tutor-email-error" className="text-sm text-red-700">{fieldErrors.email}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tutor-address">Endereço</Label>
              <Input id="tutor-address" value={form.address} onChange={event => updateField('address', event.target.value)} autoComplete="street-address" maxLength={250} placeholder="Rua, número, bairro e cidade" className="min-h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tutor-notes">Observações</Label>
              <Textarea id="tutor-notes" value={form.notes} onChange={event => updateField('notes', event.target.value)} maxLength={1000} placeholder="Informações úteis para o atendimento" rows={3} />
            </div>
            {formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="min-h-11 bg-[#3296FA] text-white hover:bg-[#207ddd]">{editingId ? 'Salvar alterações' : 'Cadastrar Tutor'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedTutor} onOpenChange={open => { if (!open) setDetailId(undefined); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          {selectedTutor && <>
            <DialogHeader>
              <DialogTitle className="break-words pr-4">{selectedTutor.name}</DialogTitle>
              <DialogDescription>Dados do tutor e pets sob sua responsabilidade.</DialogDescription>
            </DialogHeader>
            <dl className="space-y-3 rounded-lg bg-[#F5F7FA] p-4 text-sm">
              <div><dt className="flex items-center gap-1.5 text-[#666666]"><Phone size={14} aria-hidden="true" />Telefone</dt><dd className="mt-1 break-all text-[#333333]">{selectedTutor.phone}</dd></div>
              <div><dt className="flex items-center gap-1.5 text-[#666666]"><Mail size={14} aria-hidden="true" />E-mail</dt><dd className="mt-1 break-all text-[#333333]">{selectedTutor.email || 'Não informado'}</dd></div>
              <div><dt className="flex items-center gap-1.5 text-[#666666]"><MapPin size={14} aria-hidden="true" />Endereço</dt><dd className="mt-1 break-words text-[#333333]">{selectedTutor.address || 'Não informado'}</dd></div>
              <div><dt className="text-[#666666]">Observações</dt><dd className="mt-1 whitespace-pre-wrap break-words text-[#333333]">{selectedTutor.notes || 'Nenhuma observação'}</dd></div>
            </dl>
            <section aria-labelledby="tutor-pets-title">
              <h3 id="tutor-pets-title" className="mb-3 font-semibold text-[#333333]">Pets vinculados ({selectedPets.length})</h3>
              {selectedPets.length > 0 ? <ul className="space-y-2">{selectedPets.map(pet => <li key={pet.id} className="flex items-center gap-3 rounded-lg border border-[#E8EDF2] p-3"><PawPrint size={20} className="shrink-0 text-[#3296FA]" aria-hidden="true" /><div className="min-w-0"><p className="break-words font-medium text-[#333333]">{pet.name}</p><p className="break-words text-xs text-[#666666]">{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</p></div></li>)}</ul> : <p className="rounded-lg border border-dashed border-[#D9E0E7] p-4 text-sm text-[#666666]">Este tutor ainda não tem pets cadastrados.</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedPets.length > 0 && <Button variant="outline" asChild className="min-h-10"><Link to={`/pets?tutor=${encodeURIComponent(selectedTutor.id)}`}>Ver pets deste tutor</Link></Button>}
                <Button variant="outline" asChild className="min-h-10 text-[#1765AB]"><Link to={`/pets?novo=1&tutor=${encodeURIComponent(selectedTutor.id)}`}><Plus size={16} aria-hidden="true" /> Cadastrar pet</Link></Button>
              </div>
            </section>
            <DialogFooter><Button className="min-h-11 bg-[#3296FA] text-white hover:bg-[#207ddd]" onClick={() => openForm(selectedTutor)}><Edit2 size={16} aria-hidden="true" /> Editar tutor</Button></DialogFooter>
          </>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingTutor} onOpenChange={open => { if (!open) setDeletingId(undefined); }}>
        <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{linkedPets.length ? 'Tutor possui pets vinculados' : 'Excluir tutor?'}</AlertDialogTitle>
            <AlertDialogDescription className="break-words">{linkedPets.length ? `${deletingTutor?.name} possui ${linkedPets.length} ${linkedPets.length === 1 ? 'pet vinculado' : 'pets vinculados'}. Transfira os pets para outro tutor antes de excluir este cadastro.` : `O cadastro de ${deletingTutor?.name} será excluído. Esta ação não pode ser desfeita.`}</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">{linkedPets.length ? 'Entendi' : 'Cancelar'}</AlertDialogCancel>
            {!linkedPets.length && <AlertDialogAction onClick={handleDelete} className="min-h-11 bg-[#C43232] text-white hover:bg-[#a72828]">Excluir tutor</AlertDialogAction>}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Plus, Search, Edit2, Trash2, PawPrint, UserRound, Eye, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { usePetShop } from '../data/PetShopContext';
import type { Pet, PetInput } from '../data/types';

type PetForm = Omit<PetInput, 'species'> & { species: Pet['species'] | '' };
type FormErrors = Partial<Record<'name' | 'species' | 'tutorId' | 'general', string>>;

const emptyForm = (tutorId = ''): PetForm => ({ name: '', species: '', breed: '', tutorId, age: '', notes: '' });
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
const avatar = (species: Pet['species']) => species === 'Cachorro' ? '🐕' : species === 'Gato' ? '🐈' : '🐾';

export function Pets() {
  const { pets, tutors, appointments, savePet, deletePet } = usePetShop();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('todos');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PetForm>(emptyForm());
  const [errors, setErrors] = useState<FormErrors>({});
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const requestedTutor = searchParams.get('tutor');
  const tutorFilter = tutors.some(tutor => tutor.id === requestedTutor) ? requestedTutor! : 'todos';
  const detailsPet = pets.find(pet => pet.id === detailsId);
  const deletingPet = pets.find(pet => pet.id === deletingId);
  const detailsTutor = tutors.find(tutor => tutor.id === detailsPet?.tutorId);
  const linkedAppointments = appointments.filter(appointment => appointment.petId === deletingId);
  const activeAppointments = linkedAppointments.filter(appointment => ['agendado', 'confirmado'].includes(appointment.status));
  const tutorName = (id: string) => tutors.find(tutor => tutor.id === id)?.name ?? 'Tutor não encontrado';
  const query = normalize(searchTerm.trim());
  const filteredPets = pets.filter(pet =>
    (speciesFilter === 'todos' || pet.species === speciesFilter) &&
    (tutorFilter === 'todos' || pet.tutorId === tutorFilter) &&
    [pet.name, pet.breed, tutorName(pet.tutorId)].some(value => normalize(value).includes(query))
  );

  useEffect(() => {
    const newRequested = searchParams.get('novo') === '1';
    const requestedPet = searchParams.get('pet');
    if (!newRequested && !requestedPet) return;
    if (newRequested) {
      const tutorId = searchParams.get('tutor') ?? '';
      setForm(emptyForm(tutors.some(tutor => tutor.id === tutorId) ? tutorId : ''));
      setEditingId(null);
      setErrors({});
      setIsDialogOpen(true);
    } else if (requestedPet) {
      if (pets.some(pet => pet.id === requestedPet)) setDetailsId(requestedPet);
      else toast.error('Este pet não foi encontrado.');
    }
    const next = new URLSearchParams(searchParams);
    next.delete('novo');
    next.delete('pet');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, tutors, pets]);

  function updateTutorFilter(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === 'todos') next.delete('tutor');
    else next.set('tutor', value);
    setSearchParams(next, { replace: true });
  }

  function openForm(pet?: Pet) {
    setEditingId(pet?.id ?? null);
    setForm(pet ? { name: pet.name, species: pet.species, breed: pet.breed, tutorId: pet.tutorId, age: pet.age, notes: pet.notes } : emptyForm(tutorFilter === 'todos' ? '' : tutorFilter));
    setErrors({});
    setDetailsId(null);
    setIsDialogOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Informe o nome do pet.';
    if (!form.species) nextErrors.species = 'Selecione a espécie.';
    if (!tutors.some(tutor => tutor.id === form.tutorId)) nextErrors.tutorId = 'Selecione um tutor cadastrado.';
    if (Object.keys(nextErrors).length > 0 || !form.species) {
      setErrors(nextErrors);
      toast.error('Confira os campos obrigatórios do pet.');
      return;
    }
    try {
      savePet({ ...form, species: form.species, name: form.name.trim(), breed: form.breed.trim(), age: form.age.trim(), notes: form.notes.trim() }, editingId ?? undefined);
      setIsDialogOpen(false);
      toast.success(editingId ? 'Pet atualizado com sucesso!' : 'Pet cadastrado com sucesso!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar o pet. Tente novamente.';
      setErrors({ general: message });
      toast.error(message);
    }
  }

  function handleDelete() {
    if (!deletingPet) return;
    try {
      deletePet(deletingPet.id);
      toast.success(`${deletingPet.name} foi excluído do cadastro.`);
      setDeletingId(null);
      setDeleteError('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível excluir o pet. Tente novamente.';
      setDeleteError(message);
      toast.error(message);
    }
  }

  return (
    <div className="page-container">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[#333333]"><PawPrint className="text-[#3296FA]" aria-hidden="true" /> Pets</h1>
          <p className="mt-1 text-sm text-gray-600">{pets.length} {pets.length === 1 ? 'pet cadastrado' : 'pets cadastrados'} · Cuidado começa com um bom cadastro.</p>
        </div>
        <Button onClick={() => openForm()} className="h-11 shrink-0 rounded-lg bg-[#FF6B00] text-white hover:bg-[#e65f00]">
          <Plus size={18} aria-hidden="true" /> Cadastrar Novo Pet
        </Button>
      </div>

      <div className="mb-6 grid gap-4 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="pet-search">Buscar pet</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} aria-hidden="true" />
            <Input id="pet-search" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Nome, raça ou tutor..." className="h-11 bg-white pl-10" />
          </div>
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="pet-species-filter">Espécie</Label>
          <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
            <SelectTrigger id="pet-species-filter" className="w-full bg-white data-[size=default]:h-11"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Todas as espécies</SelectItem><SelectItem value="Cachorro">Cachorro</SelectItem><SelectItem value="Gato">Gato</SelectItem><SelectItem value="Outro">Outro</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="pet-tutor-filter">Tutor</Label>
          <Select value={tutorFilter} onValueChange={updateTutorFilter}>
            <SelectTrigger id="pet-tutor-filter" className="w-full bg-white data-[size=default]:h-11"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Todos os tutores</SelectItem>{tutors.map(tutor => <SelectItem key={tutor.id} value={tutor.id}>{tutor.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {(searchTerm || speciesFilter !== 'todos' || tutorFilter !== 'todos') && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
          <p role="status">{filteredPets.length} {filteredPets.length === 1 ? 'pet encontrado' : 'pets encontrados'}</p>
          <Button variant="ghost" className="h-11 text-[#2174c7]" onClick={() => { setSearchTerm(''); setSpeciesFilter('todos'); updateTutorFilter('todos'); }}><SlidersHorizontal size={16} aria-hidden="true" /> Limpar filtros</Button>
        </div>
      )}

      {filteredPets.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPets.map(pet => (
            <article key={pet.id} className="flex min-w-0 flex-col rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F5F7FA] text-2xl" aria-hidden="true">{avatar(pet.species)}</div>
                <div className="min-w-0 flex-1">
                  <h2 className="break-words font-semibold text-[#333333]">{pet.name}</h2>
                  <p className="mt-1 break-words text-sm text-gray-600">{pet.breed || 'Raça não informada'}</p>
                </div>
                <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">{pet.species}</span>
              </div>
              <div className="mb-4 mt-4 space-y-2 text-sm text-gray-600">
                <p className="flex items-start gap-2"><UserRound className="mt-0.5 shrink-0" size={16} aria-hidden="true" /><span className="min-w-0 break-words">{tutorName(pet.tutorId)}</span></p>
                <p className="break-words">Idade: {pet.age || 'Não informada'}</p>
              </div>
              <div className="mt-auto flex items-center gap-2 border-t border-gray-100 pt-3">
                <Button variant="outline" className="h-11 flex-1 text-[#2174c7]" onClick={() => setDetailsId(pet.id)} aria-label={`Ver detalhes de ${pet.name}`}><Eye size={16} aria-hidden="true" /> Detalhes</Button>
                <Button variant="ghost" className="h-11 w-11 shrink-0 text-[#2174c7] hover:bg-blue-50" onClick={() => openForm(pet)} aria-label={`Editar ${pet.name}`} title={`Editar ${pet.name}`}><Edit2 size={18} aria-hidden="true" /></Button>
                <Button variant="ghost" className="h-11 w-11 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => { setDeletingId(pet.id); setDeleteError(''); }} aria-label={`Excluir ${pet.name}`} title={`Excluir ${pet.name}`}><Trash2 size={18} aria-hidden="true" /></Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-white px-5 py-12 text-center shadow-sm">
          <PawPrint size={40} className="mx-auto mb-4 text-[#3296FA]" aria-hidden="true" />
          <h2 className="font-semibold text-[#333333]">{pets.length === 0 ? 'Vamos cadastrar o primeiro pet?' : 'Nenhum pet encontrado'}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">{pets.length === 0 ? 'Vincule cada pet a um tutor para manter os cadastros organizados.' : 'Experimente outro nome ou limpe os filtros para visualizar os cadastros.'}</p>
          {pets.length === 0 && <Button onClick={() => openForm()} className="mt-5 h-11 bg-[#3296FA] text-white hover:bg-[#2174c7]"><Plus size={18} aria-hidden="true" /> Cadastrar pet</Button>}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar pet' : 'Cadastrar Novo Pet'}</DialogTitle>
            <DialogDescription>Preencha os dados do pet e selecione seu tutor. Os campos com * são obrigatórios.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {tutors.length === 0 && <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">Cadastre um tutor antes de adicionar um pet.<Link className="mt-2 block w-fit rounded font-semibold underline underline-offset-4" to="/tutores?novo=1">Cadastrar tutor</Link></div>}
            <div className="space-y-2">
              <Label htmlFor="pet-name">Nome do pet *</Label>
              <Input id="pet-name" value={form.name} maxLength={80} required aria-invalid={!!errors.name} aria-describedby={errors.name ? 'pet-name-error' : undefined} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Ex: Rex" className="h-11" />
              {errors.name && <p id="pet-name-error" className="text-sm text-red-600">{errors.name}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pet-species">Espécie *</Label>
                <Select value={form.species} onValueChange={value => setForm({ ...form, species: value as Pet['species'] })}>
                  <SelectTrigger id="pet-species" className="w-full data-[size=default]:h-11" aria-required="true" aria-invalid={!!errors.species} aria-describedby={errors.species ? 'pet-species-error' : undefined}><SelectValue placeholder="Selecione a espécie" /></SelectTrigger>
                  <SelectContent><SelectItem value="Cachorro">Cachorro</SelectItem><SelectItem value="Gato">Gato</SelectItem><SelectItem value="Outro">Outro</SelectItem></SelectContent>
                </Select>
                {errors.species && <p id="pet-species-error" className="text-sm text-red-600">{errors.species}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="pet-breed">Raça</Label>
                <Input id="pet-breed" value={form.breed} maxLength={80} onChange={event => setForm({ ...form, breed: event.target.value })} placeholder="Ex: Golden Retriever" className="h-11" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pet-tutor">Tutor *</Label>
              <Select value={form.tutorId} onValueChange={value => setForm({ ...form, tutorId: value })} disabled={tutors.length === 0}>
                <SelectTrigger id="pet-tutor" className="w-full data-[size=default]:h-11" aria-required="true" aria-invalid={!!errors.tutorId} aria-describedby={errors.tutorId ? 'pet-tutor-error' : undefined}><SelectValue placeholder="Selecione um tutor cadastrado" /></SelectTrigger>
                <SelectContent>{tutors.map(tutor => <SelectItem key={tutor.id} value={tutor.id}>{tutor.name} · {tutor.phone}</SelectItem>)}</SelectContent>
              </Select>
              {errors.tutorId && <p id="pet-tutor-error" className="text-sm text-red-600">{errors.tutorId}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pet-age">Idade</Label>
              <Input id="pet-age" value={form.age} maxLength={40} onChange={event => setForm({ ...form, age: event.target.value })} placeholder="Ex: 3 anos ou 6 meses" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pet-notes">Observações</Label>
              <Textarea id="pet-notes" value={form.notes} maxLength={1000} onChange={event => setForm({ ...form, notes: event.target.value })} placeholder="Cuidados especiais, comportamento ou outras informações." className="min-h-24" />
            </div>
            {Object.keys(errors).length > 0 && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errors.general || 'Revise os campos destacados antes de salvar.'}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" className="h-11" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={tutors.length === 0} className="h-11 bg-[#3296FA] text-white hover:bg-[#2174c7]">{editingId ? 'Salvar alterações' : 'Cadastrar pet'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailsPet} onOpenChange={open => { if (!open) setDetailsId(null); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="break-words pr-4">{detailsPet?.name}</DialogTitle>
            <DialogDescription>Dados do pet e do tutor responsável.</DialogDescription>
          </DialogHeader>
          {detailsPet && <>
            <div className="flex items-center gap-3 rounded-xl bg-[#F5F7FA] p-4"><span className="text-4xl" aria-hidden="true">{avatar(detailsPet.species)}</span><div className="min-w-0"><p className="font-semibold text-[#333333]">{detailsPet.species}</p><p className="break-words text-sm text-gray-600">{detailsPet.breed || 'Raça não informada'}</p></div></div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-gray-500">Idade</dt><dd className="mt-1 break-words text-[#333333]">{detailsPet.age || 'Não informada'}</dd></div>
              <div><dt className="text-gray-500">Tutor responsável</dt><dd className="mt-1 break-words text-[#333333]">{detailsTutor?.name || 'Tutor não encontrado'}</dd></div>
              <div><dt className="text-gray-500">Telefone do tutor</dt><dd className="mt-1 break-words text-[#333333]">{detailsTutor?.phone || 'Não informado'}</dd></div>
              <div><dt className="text-gray-500">Agendamentos ativos</dt><dd className="mt-1 text-[#333333]">{appointments.filter(appointment => appointment.petId === detailsPet.id && ['agendado', 'confirmado'].includes(appointment.status)).length}</dd></div>
              <div className="sm:col-span-2"><dt className="text-gray-500">Observações</dt><dd className="mt-1 whitespace-pre-wrap break-words text-[#333333]">{detailsPet.notes || 'Nenhuma observação registrada.'}</dd></div>
            </dl>
            <DialogFooter><Button variant="outline" className="h-11" onClick={() => setDetailsId(null)}>Fechar</Button><Button className="h-11 bg-[#3296FA] text-white hover:bg-[#2174c7]" onClick={() => openForm(detailsPet)}><Edit2 size={16} aria-hidden="true" /> Editar pet</Button></DialogFooter>
          </>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingPet} onOpenChange={open => { if (!open) { setDeletingId(null); setDeleteError(''); } }}>
        <AlertDialogContent className="max-h-[90dvh] overflow-y-auto rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words">Excluir {deletingPet?.name}?</AlertDialogTitle>
            <AlertDialogDescription>{linkedAppointments.length > 0 ? `Este pet possui ${linkedAppointments.length} atendimento(s) vinculado(s), sendo ${activeAppointments.length} ativo(s). Mantenha o cadastro para preservar os registros; a exclusão está indisponível.` : 'O pet será removido da lista de cadastros. Esta ação não pode ser desfeita.'}</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={linkedAppointments.length > 0} className="h-11 bg-red-600 text-white hover:bg-red-700" onClick={event => { event.preventDefault(); handleDelete(); }}>Excluir pet</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

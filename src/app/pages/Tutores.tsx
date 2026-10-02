import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Plus, Search, Edit2, Archive, Phone, Mail, PawPrint, Users, Eye } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useAuth } from '../auth/AuthContext';
import { api } from '../data/api';
import type { Tutor, TutorInput } from '../data/types';
import { toast } from 'sonner';

interface SavedTutor extends Tutor { active: boolean; petCount: number }
interface TutorDetail extends SavedTutor { pets: Array<{ id: string; name: string; species: string; breed: string; active: boolean }> }
interface TutorList { items: SavedTutor[]; total: number; page: number; limit: number }
const emptyTutor: TutorInput = { name: '', phone: '', email: '', address: '', notes: '' };

export function Tutores() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [list, setList] = useState<TutorList>({ items: [], total: 0, page: 1, limit: 30 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState<TutorInput>({ ...emptyTutor });
  const [editingId, setEditingId] = useState<string>();
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [detailId, setDetailId] = useState<string>();
  const [detail, setDetail] = useState<TutorDetail>();
  const [detailError, setDetailError] = useState('');
  const [deactivating, setDeactivating] = useState<SavedTutor>();
  const [deactivateError, setDeactivateError] = useState('');

  function openForm(tutor?: SavedTutor) {
    setEditingId(tutor?.id);
    setForm(tutor ? { name: tutor.name, phone: tutor.phone, email: tutor.email, address: tutor.address, notes: tutor.notes } : { ...emptyTutor });
    setFormError('');
    setDetailId(undefined);
    setFormOpen(true);
  }

  useEffect(() => {
    if (params.get('novo') === '1') openForm();
    else if (params.get('tutor')) setDetailId(params.get('tutor')!);
    if (params.has('novo') || params.has('tutor')) {
      const next = new URLSearchParams(params);
      next.delete('novo'); next.delete('tutor');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    const timer = window.setTimeout(async () => {
      try {
        const query = new URLSearchParams({ q: search, status, page: String(page), limit: '30' });
        const result = await api<TutorList>('/tutors?' + query, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setList(result);
          if (!result.items.length && page > 1) setPage(page - 1);
        }
      } catch (error) { if (!controller.signal.aborted) setLoadError((error as Error).message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [search, status, page, refresh]);

  useEffect(() => {
    setDetail(undefined); setDetailError('');
    if (!detailId) return;
    const controller = new AbortController();
    api<TutorDetail>('/tutors/' + encodeURIComponent(detailId), { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setDetail(value); })
      .catch(error => { if (!controller.signal.aborted) setDetailError(error.message); });
    return () => controller.abort();
  }, [detailId, refresh]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setFormError('');
    try {
      await api<SavedTutor>('/tutors' + (editingId ? '/' + encodeURIComponent(editingId) : ''), {
        method: editingId ? 'PUT' : 'POST', body: JSON.stringify(form),
      });
      setFormOpen(false); setRefresh(value => value + 1);
      toast.success(editingId ? 'Tutor atualizado no banco de dados.' : 'Tutor cadastrado no banco de dados.');
    } catch (error) { setFormError((error as Error).message); }
    finally { setBusy(false); }
  }

  async function deactivate() {
    if (!deactivating || busy) return;
    setBusy(true); setDeactivateError('');
    try {
      await api('/tutors/' + encodeURIComponent(deactivating.id) + '/deactivate', { method: 'POST' });
      setDeactivating(undefined); setRefresh(value => value + 1);
      toast.success('Tutor inativado. Seus vínculos foram preservados.');
    } catch (error) { setDeactivateError((error as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="page-container">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold text-[#333333]"><Users className="text-[#3296FA]" aria-hidden="true" />Tutores</h1>
          <p className="mt-1 text-sm text-[#666666]">Cadastros reais, armazenados no servidor do pet shop.</p></div>
        <Button onClick={() => openForm()} className="h-11 rounded-lg bg-[#FF6B00] text-white hover:bg-[#e66000]"><Plus size={18} /> Cadastrar Novo Tutor</Button>
      </div>
      <div className="mb-6 space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Label htmlFor="tutor-search" className="sr-only">Buscar tutor</Label>
            <Search className="pointer-events-none absolute left-3 top-3 text-[#888888]" size={18} aria-hidden="true" />
            <Input id="tutor-search" type="search" maxLength={100} placeholder="Buscar por nome, telefone ou email..." value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} className="h-11 pl-10" />
          </div>
          <div><Label htmlFor="tutor-status" className="sr-only">Situação do tutor</Label>
            <select id="tutor-status" className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm sm:w-40" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>
              <option value="active">Ativos</option><option value="inactive">Inativos</option><option value="all">Todos</option>
            </select></div>
        </div>
        <p className="text-xs text-[#666666]" role="status">{loading ? 'Consultando o servidor…' : loadError ? 'Consulta indisponível' : list.total + (list.total === 1 ? ' tutor encontrado' : ' tutores encontrados')}</p>
      </div>
      {loadError && <div role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">{loadError}<Button variant="outline" className="ml-3" onClick={() => setRefresh(value => value + 1)}>Tentar novamente</Button></div>}
      {!loading && !loadError && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.items.map(tutor => <article key={tutor.id} className="min-w-0 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2"><h2 className="break-words font-semibold text-[#333333]">{tutor.name}</h2><span className={'rounded-md px-2 py-1 text-xs ' + (tutor.active ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600')}>{tutor.active ? 'Ativo' : 'Inativo'}</span></div>
          <p className="mt-3 flex items-center gap-2 break-all text-sm text-[#666666]"><Phone size={14} aria-hidden="true" />{tutor.phone}</p>
          {tutor.email && <p className="mt-2 flex items-center gap-2 break-all text-sm text-[#666666]"><Mail size={14} className="shrink-0" aria-hidden="true" />{tutor.email}</p>}
          <span className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#EBF5FF] px-2 py-1 text-xs text-[#1765AB]"><PawPrint size={14} />{tutor.petCount} pets vinculados</span>
          <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-3">
            <Button variant="ghost" onClick={() => setDetailId(tutor.id)} className="min-h-10 text-[#1765AB]"><Eye size={16} /> Ver detalhes</Button>
            <div className="flex gap-1">
              {tutor.active && <Button variant="ghost" size="icon" className="h-10 w-10 text-[#1765AB]" onClick={() => openForm(tutor)} aria-label={'Editar ' + tutor.name}><Edit2 size={17} /></Button>}
              {tutor.active && user?.role === 'gerente' && <Button variant="ghost" size="icon" className="h-10 w-10 text-red-700" onClick={() => { setDeactivating(tutor); setDeactivateError(''); }} aria-label={'Inativar ' + tutor.name}><Archive size={17} /></Button>}
            </div>
          </div>
        </article>)}
      </div>}
      {!loading && !loadError && !list.items.length && <div className="rounded-xl bg-white p-10 text-center text-slate-600"><Users size={40} className="mx-auto mb-3 text-[#3296FA]" />Nenhum tutor encontrado para esta consulta.</div>}
      {!loading && !loadError && list.total > list.limit && <div className="mt-5 flex items-center justify-between gap-3">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</Button>
        <span className="text-sm">Página {page} de {Math.ceil(list.total / list.limit)}</span>
        <Button variant="outline" disabled={page * list.limit >= list.total} onClick={() => setPage(value => value + 1)}>Próxima</Button>
      </div>}

      <Dialog open={formOpen} onOpenChange={open => { if (!busy) setFormOpen(open); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Tutor' : 'Cadastrar Novo Tutor'}</DialogTitle><DialogDescription>Nome e telefone são obrigatórios. Os dados serão salvos no servidor.</DialogDescription></DialogHeader>
          <form onSubmit={save} className="space-y-4" aria-busy={busy}>
            <fieldset disabled={busy} className="space-y-4">
              <div><Label htmlFor="tutor-name">Nome completo *</Label><Input id="tutor-name" required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} className="mt-2 min-h-11" /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label htmlFor="tutor-phone">Telefone com DDD *</Label><Input id="tutor-phone" type="tel" required maxLength={20} autoComplete="tel" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} className="mt-2 min-h-11" /></div>
                <div><Label htmlFor="tutor-email">Email</Label><Input id="tutor-email" type="email" maxLength={254} autoComplete="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} className="mt-2 min-h-11" /></div>
              </div>
              <div><Label htmlFor="tutor-address">Endereço</Label><Input id="tutor-address" maxLength={500} autoComplete="street-address" value={form.address} onChange={event => setForm({ ...form, address: event.target.value })} className="mt-2 min-h-11" /></div>
              <div><Label htmlFor="tutor-notes">Observações</Label><Textarea id="tutor-notes" maxLength={2000} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} className="mt-2" /></div>
            </fieldset>
            {formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
            <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setFormOpen(false)}>Cancelar</Button><Button type="submit" disabled={busy} className="min-h-11 bg-[#3296FA] text-white hover:bg-[#207ddd]">{busy ? 'Salvando…' : 'Salvar tutor'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailId} onOpenChange={open => { if (!open) setDetailId(undefined); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{detail?.name ?? 'Detalhes do tutor'}</DialogTitle><DialogDescription>Dados e vínculos consultados diretamente no banco.</DialogDescription></DialogHeader>
          {detailError ? <p role="alert" className="text-red-700">{detailError}</p> : !detail ? <p role="status">Carregando…</p> : <>
            <dl className="space-y-3 rounded-lg bg-slate-50 p-4 text-sm">
              {([['Situação', detail.active ? 'Ativo' : 'Inativo'], ['Telefone', detail.phone], ['Email', detail.email], ['Endereço', detail.address], ['Observações', detail.notes]]).map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value || 'Não informado'}</dd></div>)}
            </dl>
            <h3 className="font-semibold">Pets vinculados ({detail.pets.length})</h3>
            {detail.pets.length ? <ul className="space-y-2">{detail.pets.map(pet => <li key={pet.id} className="rounded-lg border border-slate-200 p-3 text-sm"><span className="font-medium">{pet.name}</span> · {pet.species}{pet.breed ? ' · ' + pet.breed : ''}{!pet.active ? ' · Inativo' : ''}</li>)}</ul> : <p className="text-sm text-slate-500">Nenhum pet registrado no banco para este tutor.</p>}
            <p className="text-xs text-slate-500">O cadastro de pets no servidor será integrado no BACK-04. Os pets de demonstração não são misturados com estes cadastros reais.</p>
            {detail.active && <DialogFooter><Button onClick={() => openForm(detail)} className="bg-[#3296FA] text-white"><Edit2 size={16} /> Editar tutor</Button></DialogFooter>}
          </>}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deactivating} onOpenChange={open => { if (!open && !busy) setDeactivating(undefined); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Inativar tutor?</DialogTitle><DialogDescription>O cadastro de {deactivating?.name} ficará inativo. Os pets e agendamentos vinculados serão preservados; nenhum registro será excluído.</DialogDescription></DialogHeader>
          {deactivateError && <p role="alert" className="text-sm text-red-700">{deactivateError}</p>}
          <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setDeactivating(undefined)}>Cancelar</Button><Button disabled={busy} onClick={deactivate} className="bg-red-700 text-white hover:bg-red-800">{busy ? 'Inativando…' : 'Inativar tutor'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

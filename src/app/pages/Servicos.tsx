import { useState, type FormEvent, type MouseEvent } from 'react';
import { Plus, Edit2, Trash2, DollarSign, Scissors } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { usePetShop } from '../data/PetShopContext';
import { useAuth } from '../auth/AuthContext';
import { toast } from 'sonner';

const emptyService = { name: '', price: '', duration: '', description: '' };

export function Servicos() {
  const { services, addService, deleteService } = usePetShop();
  const { user } = useAuth();
  const canManage = user?.role === 'gerente';
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyService });
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState<string>();
  const [deleteError, setDeleteError] = useState('');
  const deletingService = services.find(service => service.id === deletingId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    if (!form.name.trim() || !form.price.trim()) {
      setFormError('Informe o nome e o preço do serviço.');
      return;
    }
    try {
      addService({ ...form, icon: '🐾' });
      setIsDialogOpen(false);
      toast.success('Serviço cadastrado com sucesso!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível cadastrar o serviço. Tente novamente.';
      setFormError(message);
      toast.error(message);
    }
  }

  function handleDelete(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (!canManage || !deletingService) return;
    try {
      deleteService(deletingService.id);
      setDeletingId(undefined);
      toast.success('Serviço excluído com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível excluir o serviço. Tente novamente.';
      setDeleteError(message);
      toast.error(message);
    }
  }

  function updateField(field: keyof typeof emptyService, value: string) {
    setForm(current => ({ ...current, [field]: value }));
    setFormError('');
  }

  return (
    <div className="page-container">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[#333333]"><Scissors className="text-[#3296FA]" aria-hidden="true" />Serviços</h1>
          <p className="mt-1 text-sm text-[#666666]">{services.length} {services.length === 1 ? 'serviço disponível' : 'serviços disponíveis'}{!canManage ? ' · Consulta de serviços e preços' : ''}</p>
        </div>
        {canManage && <Button onClick={() => { setForm({ ...emptyService }); setFormError(''); setIsDialogOpen(true); }} className="h-11 rounded-lg bg-[#FF6B00] text-white hover:bg-[#e66000]"><Plus size={18} aria-hidden="true" /> Cadastrar Novo Serviço</Button>}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {services.map(service => <article key={service.id} className="flex min-w-0 flex-col rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F5F7FA] text-2xl" aria-hidden="true">{service.icon}</div>
            <div className="min-w-0 flex-1">
              <h2 className="break-words font-semibold text-[#333333]">{service.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="flex min-w-0 items-start gap-1 font-semibold text-[#047857]"><DollarSign size={15} className="mt-0.5 shrink-0" aria-hidden="true" /><span className="break-words">{service.price}</span></p>
                {service.duration && <span className="break-words text-sm text-[#666666]">· {service.duration}</span>}
              </div>
              {service.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[#666666]">{service.description}</p>}
            </div>
          </div>
          {canManage && <div className="mt-4 flex justify-end gap-1 border-t border-[#F0F0F0] pt-2">
            <Button variant="ghost" size="icon" className="h-10 w-10 text-[#1765AB]" onClick={() => toast.info('Edição de serviços em desenvolvimento.')} aria-label={`Editar ${service.name}`}><Edit2 size={17} aria-hidden="true" /></Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-[#C43232]" onClick={() => { setDeletingId(service.id); setDeleteError(''); }} aria-label={`Excluir ${service.name}`}><Trash2 size={17} aria-hidden="true" /></Button>
          </div>}
        </article>)}
      </div>

      {!services.length && <div className="rounded-xl bg-white px-4 py-12 text-center shadow-sm"><Scissors className="mx-auto mb-3 text-[#3296FA]" size={40} aria-hidden="true" /><h2 className="font-semibold text-[#333333]">Nenhum serviço cadastrado</h2><p className="mt-2 text-sm text-[#666666]">{canManage ? 'Cadastre os serviços oferecidos pelo pet shop para começar a agendar.' : 'Solicite ao gerente o cadastro dos serviços oferecidos pelo pet shop.'}</p></div>}

      {canManage && <>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
            <DialogHeader><DialogTitle>Cadastrar Novo Serviço</DialogTitle><DialogDescription>Informe os dados do serviço oferecido pelo pet shop. Campos com * são obrigatórios.</DialogDescription></DialogHeader>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="space-y-2"><Label htmlFor="service-name">Nome do serviço *</Label><Input id="service-name" value={form.name} onChange={event => updateField('name', event.target.value)} placeholder="Ex: Banho" required maxLength={100} className="min-h-11" /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="service-price">Preço *</Label><Input id="service-price" value={form.price} onChange={event => updateField('price', event.target.value)} placeholder="R$ 45,00" inputMode="decimal" required maxLength={30} className="min-h-11" /></div>
                <div className="space-y-2"><Label htmlFor="service-duration">Duração</Label><Input id="service-duration" value={form.duration} onChange={event => updateField('duration', event.target.value)} placeholder="30 min" maxLength={40} className="min-h-11" /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="service-description">Descrição</Label><Textarea id="service-description" value={form.description} onChange={event => updateField('description', event.target.value)} placeholder="Descrição do serviço..." maxLength={1000} rows={3} /></div>
              {formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
              <DialogFooter><Button type="button" variant="outline" className="min-h-11" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit" className="min-h-11 bg-[#3296FA] text-white hover:bg-[#207ddd]">Cadastrar Serviço</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <AlertDialog open={!!deletingService} onOpenChange={open => { if (!open) setDeletingId(undefined); }}>
          <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
            <AlertDialogHeader><AlertDialogTitle>Excluir serviço?</AlertDialogTitle><AlertDialogDescription className="break-words">O serviço {deletingService?.name} será excluído. Serviços vinculados a agendamentos precisam ser mantidos para preservar os registros.</AlertDialogDescription></AlertDialogHeader>
            {deleteError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{deleteError}</p>}
            <AlertDialogFooter><AlertDialogCancel className="min-h-11">Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="min-h-11 bg-[#C43232] text-white hover:bg-[#a72828]">Excluir serviço</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>}
    </div>
  );
}

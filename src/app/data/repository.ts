import type { PetShopData } from './types.ts';
import { createDemoData } from './seed.ts';

export const DATA_STORAGE_KEY = 'smartpet.frontend.data.v1';
type DataStorage = Pick<Storage, 'getItem' | 'setItem'>;

function records(value: unknown, fields: string[]): value is Record<string, string>[] {
  return Array.isArray(value) && value.every(item => item && typeof item === 'object' && fields.every(field => typeof item[field] === 'string')) && new Set(value.map(item => item.id)).size === value.length;
}

export function isPetShopData(value: unknown): value is PetShopData {
  if (!value || typeof value !== 'object') return false;
  const data = value as PetShopData;
  if (data.version !== 1 ||
      !records(data.tutors, ['id', 'name', 'phone', 'email', 'address', 'notes']) ||
      !records(data.pets, ['id', 'name', 'species', 'breed', 'tutorId', 'age', 'notes']) ||
      !records(data.services, ['id', 'name', 'price', 'duration', 'description', 'icon']) ||
      !records(data.appointments, ['id', 'date', 'time', 'petId', 'serviceId', 'status'])) return false;
  return data.pets.every(pet => ['Cachorro', 'Gato', 'Outro'].includes(pet.species) && data.tutors.some(t => t.id === pet.tutorId)) &&
    data.appointments.every(a => ['agendado', 'confirmado', 'concluido', 'cancelado'].includes(a.status) &&
      /^\d{4}-\d{2}-\d{2}$/.test(a.date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(a.time) &&
      data.pets.some(p => p.id === a.petId) && data.services.some(s => s.id === a.serviceId));
}

// A futura API pode substituir este adaptador sem mudar os formulários.
export function loadData(storage: DataStorage): { data: PetShopData; warning: string | null } {
  try {
    const raw = storage.getItem(DATA_STORAGE_KEY);
    if (raw) {
      const data: unknown = JSON.parse(raw);
      if (!isPetShopData(data)) throw new Error('Dados locais inválidos');
      return { data, warning: null };
    }
    const data = createDemoData();
    storage.setItem(DATA_STORAGE_KEY, JSON.stringify(data));
    return { data, warning: null };
  } catch {
    return { data: createDemoData(), warning: 'Não foi possível carregar os dados locais. Exibindo dados de demonstração; novos salvamentos substituirão os dados locais inválidos, se o armazenamento estiver disponível.' };
  }
}

export function persistData(storage: DataStorage, data: PetShopData): void {
  try { storage.setItem(DATA_STORAGE_KEY, JSON.stringify(data)); }
  catch { throw new Error('Não foi possível salvar neste navegador. Verifique o espaço e a permissão de armazenamento e tente novamente.'); }
}

export function applyStoredMutation(storage: DataStorage, fallback: PetShopData, transform: (data: PetShopData) => PetShopData): PetShopData {
  // Re-read before a mutation so an older tab does not overwrite newer records.
  let previous = fallback;
  try {
    const raw = storage.getItem(DATA_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isPetShopData(parsed)) previous = parsed;
    }
  } catch { /* persistData reports unavailable storage without committing state. */ }
  const next = transform(previous);
  persistData(storage, next);
  return next;
}

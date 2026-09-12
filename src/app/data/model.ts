import type { Appointment, AppointmentInput, PetInput, PetShopData, ServiceInput, TutorInput } from './types.ts';
import { localDate } from './seed.ts';

export const isActiveAppointment = (appointment: Appointment) => ['agendado', 'confirmado'].includes(appointment.status);
export const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();

function cleanFields<T extends Record<string, string>>(input: T): T {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, value.trim()])) as T;
}

function assertExists(items: { id: string }[], id: string, label: string) {
  if (!items.some(item => item.id === id)) throw new Error(`${label} não encontrado. Atualize a página e tente novamente.`);
}

function entityId(items: { id: string }[], id?: string): string {
  if (id) { assertExists(items, id, 'Cadastro'); return id; }
  return crypto.randomUUID();
}

export function saveTutor(data: PetShopData, input: TutorInput, id?: string): PetShopData {
  const fields = cleanFields(input);
  if (fields.name.length < 2 || fields.name.length > 100) throw new Error('Informe um nome entre 2 e 100 caracteres.');
  if (!/^\d{10,11}$/.test(fields.phone.replace(/\D/g, ''))) throw new Error('Informe um telefone com DDD e 10 ou 11 dígitos.');
  fields.email = fields.email.toLowerCase();
  if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) throw new Error('Informe um e-mail válido.');
  if (fields.email && data.tutors.some(t => t.id !== id && t.email.toLowerCase() === fields.email)) throw new Error('Já existe um tutor com este e-mail.');
  const tutor = { ...fields, id: entityId(data.tutors, id) };
  return { ...data, tutors: id ? data.tutors.map(t => t.id === id ? tutor : t) : [...data.tutors, tutor] };
}

export function deleteTutor(data: PetShopData, id: string): PetShopData {
  assertExists(data.tutors, id, 'Tutor');
  if (data.pets.some(pet => pet.tutorId === id)) throw new Error('Este tutor possui pets vinculados. Transfira ou remova os pets antes de excluir o tutor.');
  return { ...data, tutors: data.tutors.filter(tutor => tutor.id !== id) };
}

export function savePet(data: PetShopData, input: PetInput, id?: string): PetShopData {
  const fields = cleanFields(input);
  if (!fields.name || fields.name.length > 80) throw new Error('Informe o nome do pet com até 80 caracteres.');
  if (!['Cachorro', 'Gato', 'Outro'].includes(fields.species)) throw new Error('Selecione a espécie do pet.');
  if (!data.tutors.some(tutor => tutor.id === fields.tutorId)) throw new Error('Selecione um tutor cadastrado.');
  const pet = { ...fields, id: entityId(data.pets, id) };
  return { ...data, pets: id ? data.pets.map(p => p.id === id ? pet : p) : [...data.pets, pet] };
}

export function deletePet(data: PetShopData, id: string): PetShopData {
  assertExists(data.pets, id, 'Pet');
  if (data.appointments.some(a => a.petId === id && isActiveAppointment(a))) throw new Error('Este pet possui agendamentos ativos e não pode ser excluído.');
  // Preserve references from completed/cancelled appointments as well.
  if (data.appointments.some(a => a.petId === id)) throw new Error('Este pet possui histórico de atendimentos. Mantenha seu cadastro para preservar os registros.');
  return { ...data, pets: data.pets.filter(pet => pet.id !== id) };
}

export function addAppointment(data: PetShopData, input: AppointmentInput, now = new Date()): PetShopData {
  const fields = cleanFields(input);
  const parsedDate = new Date(`${fields.date}T12:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.date) || Number.isNaN(parsedDate.getTime()) || localDate(parsedDate) !== fields.date) throw new Error('Selecione uma data válida.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(fields.time)) throw new Error('Selecione um horário válido.');
  if (new Date(`${fields.date}T${fields.time}`) <= now) throw new Error('Escolha uma data e um horário futuros.');
  assertExists(data.pets, fields.petId, 'Pet');
  assertExists(data.services, fields.serviceId, 'Serviço');
  if (data.appointments.some(a => isActiveAppointment(a) && a.petId === fields.petId && a.date === fields.date && a.time === fields.time)) throw new Error('Este pet já possui um agendamento neste horário.');
  return { ...data, appointments: [...data.appointments, { ...fields, id: crypto.randomUUID(), status: 'agendado' }] };
}

export function addService(data: PetShopData, input: ServiceInput): PetShopData {
  const fields = cleanFields(input);
  if (!fields.name || !fields.price) throw new Error('Preencha nome e preço do serviço.');
  return { ...data, services: [...data.services, { ...fields, id: crypto.randomUUID() }] };
}

export function deleteService(data: PetShopData, id: string): PetShopData {
  assertExists(data.services, id, 'Serviço');
  if (data.appointments.some(a => a.serviceId === id)) throw new Error('Este serviço possui agendamentos vinculados e não pode ser excluído.');
  return { ...data, services: data.services.filter(service => service.id !== id) };
}

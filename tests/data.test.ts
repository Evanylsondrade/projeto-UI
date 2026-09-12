import test from 'node:test';
import assert from 'node:assert/strict';
import { addAppointment, deletePet, deleteTutor, savePet, saveTutor } from '../src/app/data/model.ts';
import { applyStoredMutation, DATA_STORAGE_KEY, isPetShopData, loadData, persistData } from '../src/app/data/repository.ts';
import { createDemoData, localDate } from '../src/app/data/seed.ts';
import type { AppointmentInput, PetInput, PetShopData, TutorInput } from '../src/app/data/types.ts';

const now = new Date(2026, 8, 6, 8, 0);
const tutorInput: TutorInput = { name: '  Carla Dias  ', phone: '(85) 99999-1234', email: ' CARLA@example.com ', address: ' Rua Nova, 10 ', notes: ' Contato à tarde ' };
const petInput: PetInput = { name: '  Bob  ', species: 'Cachorro', breed: ' SRD ', tutorId: 'tutor-maria', age: ' 6 meses ', notes: ' Muito ativo ' };
const appointmentInput: AppointmentInput = { date: '2026-09-07', time: '11:00', petId: 'pet-rex', serviceId: 'service-banho' };

function fixture(): PetShopData {
  return { ...createDemoData(now), appointments: [] };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

function memoryStorage(initial?: string) {
  const items = new Map<string, string>();
  if (initial !== undefined) items.set(DATA_STORAGE_KEY, initial);
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => { items.set(key, value); },
  };
}

test('cadastro e edição mantêm tutor, pet e vínculo consistentes sem alterar dados anteriores', () => {
  const original = deepFreeze(fixture());
  const originalSnapshot = structuredClone(original);
  const withTutor = deepFreeze(saveTutor(original, tutorInput));
  const tutor = withTutor.tutors.at(-1)!;
  assert.equal(tutor.name, 'Carla Dias');
  assert.equal(tutor.email, 'carla@example.com');
  assert.equal(tutor.address, 'Rua Nova, 10');

  const withPet = deepFreeze(savePet(withTutor, { ...petInput, tutorId: tutor.id }));
  const pet = withPet.pets.at(-1)!;
  assert.equal(pet.name, 'Bob');
  assert.equal(pet.tutorId, tutor.id);
  assert.equal(pet.notes, 'Muito ativo');

  const editedTutor = deepFreeze(saveTutor(withPet, { ...tutorInput, name: 'Carla Souza' }, tutor.id));
  assert.equal(editedTutor.tutors.length, withTutor.tutors.length);
  assert.equal(editedTutor.pets.find(item => item.id === pet.id)?.tutorId, tutor.id);
  assert.equal(editedTutor.tutors.find(item => item.id === tutor.id)?.name, 'Carla Souza');

  const transferredPet = savePet(editedTutor, { ...petInput, name: 'Bobby', tutorId: 'tutor-ana' }, pet.id);
  assert.equal(transferredPet.pets.length, withPet.pets.length);
  assert.equal(transferredPet.pets.find(item => item.id === pet.id)?.tutorId, 'tutor-ana');
  assert.equal(withPet.pets.find(item => item.id === pet.id)?.name, 'Bob');
  assert.equal(withPet.tutors.find(item => item.id === tutor.id)?.name, 'Carla Dias');
  assert.deepEqual(original, originalSnapshot);
  assert.ok(isPetShopData(transferredPet));
});

test('excluir e cadastrar novamente não reaproveita IDs de pets ou tutores', () => {
  let data = saveTutor(fixture(), tutorInput);
  const deletedTutorId = data.tutors.at(-1)!.id;
  data = deleteTutor(data, deletedTutorId);
  data = saveTutor(data, tutorInput);
  assert.notEqual(data.tutors.at(-1)!.id, deletedTutorId);

  data = savePet(data, petInput);
  const deletedPetId = data.pets.at(-1)!.id;
  const previous = deepFreeze(data);
  data = deletePet(previous, deletedPetId);
  data = savePet(data, petInput);
  assert.notEqual(data.pets.at(-1)!.id, deletedPetId);
  assert.equal(new Set(data.pets.map(pet => pet.id)).size, data.pets.length);
  assert.ok(previous.pets.some(pet => pet.id === deletedPetId));
  assert.ok(!data.pets.some(pet => pet.id === deletedPetId));
});

test('tutor com pets só pode ser excluído depois de transferir seu pet', () => {
  const data = deepFreeze(fixture());
  assert.throws(() => deleteTutor(data, 'tutor-maria'), /pets vinculados/i);
  const transferred = savePet(data, { ...petInput, tutorId: 'tutor-ana' }, 'pet-rex');
  const removed = deleteTutor(transferred, 'tutor-maria');
  assert.ok(!removed.tutors.some(tutor => tutor.id === 'tutor-maria'));
  assert.ok(isPetShopData(removed));
});

for (const status of ['agendado', 'confirmado', 'concluido', 'cancelado'] as const) {
  test(`exclusão preserva pet com atendimento ${status}`, () => {
    const data = fixture();
    data.appointments = [{ ...appointmentInput, id: 'appointment-test', status }];
    const snapshot = structuredClone(data);
    deepFreeze(data);
    assert.throws(() => deletePet(data, 'pet-rex'), status === 'agendado' || status === 'confirmado' ? /agendamentos ativos/i : /histórico/i);
    assert.deepEqual(data, snapshot);
  });
}

test('nome, telefone e e-mail inválidos são rejeitados sem salvar cadastros', () => {
  const data = deepFreeze(fixture());
  for (const name of ['', ' ', 'A', 'A'.repeat(101)]) assert.throws(() => saveTutor(data, { ...tutorInput, name }), /nome/i);
  for (const phone of ['', '99999-1234', '123456789012']) assert.throws(() => saveTutor(data, { ...tutorInput, phone }), /telefone/i);
  for (const email of ['carla', 'carla@', 'carla@exemplo', 'car la@example.com']) assert.throws(() => saveTutor(data, { ...tutorInput, email }), /e-mail/i);
  for (const name of ['', '   ', 'A'.repeat(81)]) assert.throws(() => savePet(data, { ...petInput, name }), /nome/i);
  assert.throws(() => savePet(data, { ...petInput, species: 'Pássaro' as PetInput['species'] }), /espécie/i);
});

test('e-mail duplicado ignora caixa e espaços, permite edição da própria conta e e-mail vazio', () => {
  const data = saveTutor(fixture(), tutorInput);
  const tutorId = data.tutors.at(-1)!.id;
  assert.throws(() => saveTutor(data, { ...tutorInput, name: 'Outra Carla', email: '  CARLA@EXAMPLE.COM ' }), /já existe/i);
  const edited = saveTutor(data, { ...tutorInput, name: 'Carla Souza' }, tutorId);
  assert.equal(edited.tutors.find(tutor => tutor.id === tutorId)?.name, 'Carla Souza');
  const withoutEmail = saveTutor(edited, { ...tutorInput, name: 'Lia Silva', email: '' });
  assert.doesNotThrow(() => saveTutor(withoutEmail, { ...tutorInput, name: 'Rita Silva', email: '' }));
});

test('cadastro e edição recusam referências inexistentes', () => {
  const data = deepFreeze(fixture());
  assert.throws(() => savePet(data, { ...petInput, tutorId: 'missing' }), /tutor cadastrado/i);
  assert.throws(() => savePet(data, { ...petInput, tutorId: 'missing' }, 'pet-rex'), /tutor cadastrado/i);
  assert.throws(() => saveTutor(data, tutorInput, 'missing'), /não encontrado/i);
  assert.throws(() => savePet(data, petInput, 'missing'), /não encontrado/i);
  assert.throws(() => deleteTutor(data, 'missing'), /não encontrado/i);
  assert.throws(() => deletePet(data, 'missing'), /não encontrado/i);
});

test('seed usa data local e calcula amanhã em virada de mês, ano e ano bissexto', () => {
  const cases = [
    { now: new Date(2026, 8, 30, 23, 55), today: '2026-09-30', tomorrow: '2026-10-01' },
    { now: new Date(2026, 11, 31, 23, 55), today: '2026-12-31', tomorrow: '2027-01-01' },
    { now: new Date(2028, 1, 28, 23, 55), today: '2028-02-28', tomorrow: '2028-02-29' },
    { now: new Date(2028, 1, 29, 23, 55), today: '2028-02-29', tomorrow: '2028-03-01' },
  ];
  for (const entry of cases) {
    const timestamp = entry.now.getTime();
    const data = createDemoData(entry.now);
    assert.equal(localDate(entry.now), entry.today);
    assert.deepEqual(new Set(data.appointments.map(appointment => appointment.date)), new Set([entry.today, entry.tomorrow]));
    assert.equal(entry.now.getTime(), timestamp);
    assert.ok(isPetShopData(data));
  }
});

test('agendamento inclui referência, ID e status e rejeita conflito para o mesmo pet', () => {
  const data = deepFreeze(fixture());
  const scheduled = addAppointment(data, appointmentInput, now);
  const appointment = scheduled.appointments[0];
  assert.equal(appointment.petId, 'pet-rex');
  assert.equal(appointment.serviceId, 'service-banho');
  assert.equal(appointment.status, 'agendado');
  assert.ok(appointment.id);
  assert.equal(data.appointments.length, 0);
  assert.ok(isPetShopData(scheduled));
  assert.throws(() => addAppointment(scheduled, { ...appointmentInput, serviceId: 'service-tosa' }, now), /já possui um agendamento/i);
  assert.doesNotThrow(() => addAppointment(scheduled, { ...appointmentInput, petId: 'pet-luna' }, now));
  const cancelled: PetShopData = { ...scheduled, appointments: [{ ...appointment, status: 'cancelado' }] };
  assert.equal(addAppointment(cancelled, appointmentInput, now).appointments.length, 2);
});

test('agendamento rejeita datas impossíveis, passado, horários e vínculos inválidos', () => {
  const data = deepFreeze(fixture());
  for (const date of ['2026-02-30', '2026-13-01', '07/09/2026']) assert.throws(() => addAppointment(data, { ...appointmentInput, date }, now), /data válida/i);
  for (const time of ['24:00', '11:60', '9:00']) assert.throws(() => addAppointment(data, { ...appointmentInput, time }, now), /horário válido/i);
  assert.throws(() => addAppointment(data, { ...appointmentInput, date: '2026-09-06', time: '08:00' }, now), /futuros/i);
  assert.throws(() => addAppointment(data, { ...appointmentInput, date: '2026-09-05' }, now), /futuros/i);
  assert.throws(() => addAppointment(data, { ...appointmentInput, petId: 'missing' }, now), /pet não encontrado/i);
  assert.throws(() => addAppointment(data, { ...appointmentInput, serviceId: 'missing' }, now), /serviço não encontrado/i);
});

test('persistência roundtrip mantém cadastros, edição e vínculos após recarregar', () => {
  const storage = memoryStorage();
  const firstLoad = loadData(storage);
  assert.equal(firstLoad.warning, null);
  assert.ok(storage.getItem(DATA_STORAGE_KEY));
  let data = saveTutor(firstLoad.data, tutorInput);
  data = savePet(data, { ...petInput, tutorId: data.tutors.at(-1)!.id });
  data = savePet(data, { ...petInput, name: 'Bobby', tutorId: data.tutors.at(-1)!.id }, data.pets.at(-1)!.id);
  persistData(storage, data);
  const reloaded = loadData(storage);
  assert.equal(reloaded.warning, null);
  assert.deepEqual(reloaded.data, data);
  assert.notEqual(reloaded.data, data);
});

test('dados locais inválidos recuperam demonstração e aviso sem sobrescrever até um novo salvamento', () => {
  const valid = createDemoData(now);
  const duplicatePet = { ...valid, pets: [...valid.pets, valid.pets[0]] };
  const danglingTutor = { ...valid, pets: [{ ...valid.pets[0], tutorId: 'missing' }] };
  const danglingAppointment = { ...valid, appointments: [{ ...valid.appointments[0], petId: 'missing' }] };
  const badStatus = { ...valid, appointments: [{ ...valid.appointments[0], status: 'inventado' }] };
  const invalidEntries = ['{broken', 'null', JSON.stringify({ ...valid, version: 2 }), JSON.stringify(duplicatePet), JSON.stringify(danglingTutor), JSON.stringify(danglingAppointment), JSON.stringify(badStatus)];
  for (const raw of invalidEntries) {
    const storage = memoryStorage(raw);
    const recovered = loadData(storage);
    assert.ok(recovered.warning);
    assert.ok(isPetShopData(recovered.data));
    assert.equal(storage.getItem(DATA_STORAGE_KEY), raw);
    persistData(storage, recovered.data);
    assert.equal(loadData(storage).warning, null);
  }
});

test('falhas de acesso e quota geram recuperação ou erro de salvamento sem alterar dados anteriores', () => {
  const unavailable = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('SecurityError'); } };
  const recovered = loadData(unavailable);
  assert.ok(recovered.warning);
  assert.ok(isPetShopData(recovered.data));

  const original = fixture();
  const storage = memoryStorage(JSON.stringify(original));
  const quotaStorage = { getItem: storage.getItem, setItem: () => { throw new Error('QuotaExceededError'); } };
  const updated = savePet(original, petInput);
  assert.throws(() => persistData(quotaStorage, updated), /não foi possível salvar neste navegador/i);
  assert.deepEqual(loadData(storage).data, original);
  assert.ok(loadData({ ...quotaStorage, getItem: () => null }).warning);
});

test('duas abas com cópias iniciais iguais preservam adições sucessivas de ambas', () => {
  const storage = memoryStorage(JSON.stringify(fixture()));
  const firstTab = deepFreeze(loadData(storage).data);
  const secondTab = deepFreeze(loadData(storage).data);
  const firstSaved = applyStoredMutation(storage, firstTab, data => saveTutor(data, tutorInput));
  const firstTutorId = firstSaved.tutors.at(-1)!.id;
  const secondSaved = applyStoredMutation(storage, secondTab, data => saveTutor(data, { ...tutorInput, name: 'Bruna Alves', email: 'bruna@example.com' }));

  assert.equal(firstTab.tutors.length, fixture().tutors.length);
  assert.equal(secondTab.tutors.length, firstTab.tutors.length);
  assert.equal(secondSaved.tutors.length, firstTab.tutors.length + 2);
  assert.equal(secondSaved.tutors.find(tutor => tutor.id === firstTutorId)?.name, 'Carla Dias');
  assert.equal(secondSaved.tutors.at(-1)?.name, 'Bruna Alves');
  assert.deepEqual(loadData(storage).data, secondSaved);
});

test('edição em aba desatualizada recusa cadastro excluído em outra aba e preserva storage', () => {
  const initial = savePet(fixture(), petInput);
  const petId = initial.pets.at(-1)!.id;
  const storage = memoryStorage(JSON.stringify(initial));
  const firstTab = deepFreeze(loadData(storage).data);
  const secondTab = deepFreeze(loadData(storage).data);
  const afterDeletion = applyStoredMutation(storage, firstTab, data => deletePet(data, petId));
  const storedAfterDeletion = storage.getItem(DATA_STORAGE_KEY);

  assert.throws(() => applyStoredMutation(storage, secondTab, data => savePet(data, { ...petInput, name: 'Bob editado' }, petId)), /não encontrado/i);
  assert.equal(storage.getItem(DATA_STORAGE_KEY), storedAfterDeletion);
  assert.deepEqual(loadData(storage).data, afterDeletion);
  assert.ok(!afterDeletion.pets.some(pet => pet.id === petId));
  assert.ok(secondTab.pets.some(pet => pet.id === petId));
});

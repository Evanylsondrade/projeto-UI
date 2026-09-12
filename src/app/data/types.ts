export type EmployeeRole = 'gerente' | 'atendente';

export interface Tutor {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export interface Pet {
  id: string;
  name: string;
  species: 'Cachorro' | 'Gato' | 'Outro';
  breed: string;
  tutorId: string;
  age: string;
  notes: string;
}

export interface Service {
  id: string;
  name: string;
  price: string;
  duration: string;
  description: string;
  icon: string;
}

export interface Appointment {
  id: string;
  date: string;
  time: string;
  petId: string;
  serviceId: string;
  status: 'agendado' | 'confirmado' | 'concluido' | 'cancelado';
}

export interface PetShopData {
  version: 1;
  tutors: Tutor[];
  pets: Pet[];
  services: Service[];
  appointments: Appointment[];
}

export type TutorInput = Omit<Tutor, 'id'>;
export type PetInput = Omit<Pet, 'id'>;
export type ServiceInput = Omit<Service, 'id'>;
export type AppointmentInput = Omit<Appointment, 'id' | 'status'>;

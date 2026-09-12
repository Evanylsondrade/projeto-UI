import type { PetShopData } from './types.ts';

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function createDemoData(now = new Date()): PetShopData {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const today = localDate(now);
  return {
    version: 1,
    tutors: [
      { id: 'tutor-maria', name: 'Maria Silva', phone: '(11) 98765-4321', email: 'maria@example.com', address: 'Rua das Flores, 120', notes: '' },
      { id: 'tutor-joao', name: 'João Santos', phone: '(11) 97654-3210', email: 'joao@example.com', address: '', notes: 'Prefere contato por WhatsApp.' },
      { id: 'tutor-ana', name: 'Ana Costa', phone: '(11) 96543-2109', email: 'ana@example.com', address: '', notes: '' },
      { id: 'tutor-carlos', name: 'Carlos Oliveira', phone: '(11) 95432-1098', email: 'carlos@example.com', address: '', notes: '' },
      { id: 'tutor-patricia', name: 'Patrícia Lima', phone: '(11) 94321-0987', email: 'patricia@example.com', address: '', notes: '' },
    ],
    pets: [
      { id: 'pet-rex', name: 'Rex', species: 'Cachorro', breed: 'Golden Retriever', tutorId: 'tutor-maria', age: '3 anos', notes: 'Usar shampoo para pele sensível.' },
      { id: 'pet-luna', name: 'Luna', species: 'Gato', breed: 'Persa', tutorId: 'tutor-joao', age: '2 anos', notes: '' },
      { id: 'pet-thor', name: 'Thor', species: 'Cachorro', breed: 'Pastor Alemão', tutorId: 'tutor-ana', age: '5 anos', notes: '' },
      { id: 'pet-mel', name: 'Mel', species: 'Cachorro', breed: 'Poodle', tutorId: 'tutor-carlos', age: '1 ano', notes: '' },
      { id: 'pet-mimi', name: 'Mimi', species: 'Gato', breed: 'Siamês', tutorId: 'tutor-patricia', age: '4 anos', notes: '' },
    ],
    services: [
      { id: 'service-banho', name: 'Banho', price: 'R$ 45,00', duration: '30 min', description: 'Banho completo com shampoo especial', icon: '🛁' },
      { id: 'service-tosa', name: 'Tosa', price: 'R$ 60,00', duration: '45 min', description: 'Tosa higiênica ou completa', icon: '✂️' },
      { id: 'service-combo', name: 'Banho e Tosa', price: 'R$ 95,00', duration: '60 min', description: 'Pacote completo banho + tosa', icon: '🐩' },
      { id: 'service-vacina', name: 'Vacina', price: 'R$ 80,00', duration: '15 min', description: 'Vacinação antirrábica e outras', icon: '💉' },
      { id: 'service-consulta', name: 'Consulta Veterinária', price: 'R$ 120,00', duration: '30 min', description: 'Consulta com veterinário', icon: '🩺' },
      { id: 'service-hidratacao', name: 'Hidratação', price: 'R$ 70,00', duration: '40 min', description: 'Hidratação profunda do pelo', icon: '💧' },
    ],
    appointments: [
      { id: 'appointment-1', date: today, time: '10:00', petId: 'pet-rex', serviceId: 'service-banho', status: 'confirmado' },
      { id: 'appointment-2', date: today, time: '14:00', petId: 'pet-luna', serviceId: 'service-vacina', status: 'agendado' },
      { id: 'appointment-3', date: today, time: '16:00', petId: 'pet-mel', serviceId: 'service-tosa', status: 'agendado' },
      { id: 'appointment-4', date: localDate(tomorrow), time: '09:00', petId: 'pet-thor', serviceId: 'service-consulta', status: 'agendado' },
      { id: 'appointment-5', date: localDate(tomorrow), time: '15:00', petId: 'pet-mimi', serviceId: 'service-combo', status: 'agendado' },
    ],
  };
}

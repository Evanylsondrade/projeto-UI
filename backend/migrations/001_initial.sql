CREATE TABLE employees (
  id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 100),
  email TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(trim(email)) > 3 AND email = trim(email)),
  password_hash TEXT NOT NULL CHECK (length(trim(password_hash)) > 0),
  role TEXT NOT NULL CHECK (role IN ('gerente', 'atendente')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE tutors (
  id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 100),
  phone TEXT NOT NULL CHECK (length(phone) BETWEEN 10 AND 11 AND phone NOT GLOB '*[^0-9]*'),
  email TEXT COLLATE NOCASE UNIQUE CHECK (email IS NULL OR (length(trim(email)) > 3 AND email = trim(email))),
  address TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE pets (
  id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
  tutor_id TEXT NOT NULL REFERENCES tutors(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  species TEXT NOT NULL CHECK (species IN ('Cachorro', 'Gato', 'Outro')),
  breed TEXT NOT NULL DEFAULT '',
  age TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE services (
  id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 100),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'scissors',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE appointments (
  id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
  pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  -- Responsável no momento da reserva; transferir o pet não altera o histórico.
  tutor_id TEXT NOT NULL REFERENCES tutors(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  created_by_employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  date TEXT NOT NULL CHECK (length(date) = 10 AND date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(date, '+0 days') IS NOT NULL AND date(date, '+0 days') = date),
  time TEXT NOT NULL CHECK (length(time) = 5 AND time GLOB '[0-2][0-9]:[0-5][0-9]' AND substr(time, 1, 2) < '24'),
  status TEXT NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado', 'confirmado', 'concluido', 'cancelado')),
  -- Valores contratados preservados mesmo quando o catálogo de serviços mudar.
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX idx_tutors_name ON tutors(name COLLATE NOCASE);
CREATE INDEX idx_pets_tutor ON pets(tutor_id);
CREATE INDEX idx_pets_name ON pets(name COLLATE NOCASE);
CREATE INDEX idx_appointments_date_status ON appointments(date, status);
CREATE INDEX idx_appointments_pet ON appointments(pet_id);
CREATE INDEX idx_appointments_service ON appointments(service_id);
CREATE INDEX idx_appointments_tutor ON appointments(tutor_id);
CREATE INDEX idx_appointments_employee ON appointments(created_by_employee_id);
CREATE UNIQUE INDEX idx_appointments_active_pet_slot ON appointments(pet_id, date, time)
  WHERE status IN ('agendado', 'confirmado');

-- A camada de aplicação também poderá definir updated_at explicitamente.
CREATE TRIGGER employees_updated_at AFTER UPDATE ON employees
WHEN NEW.updated_at = OLD.updated_at BEGIN
  UPDATE employees SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;
CREATE TRIGGER tutors_updated_at AFTER UPDATE ON tutors
WHEN NEW.updated_at = OLD.updated_at BEGIN
  UPDATE tutors SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;
CREATE TRIGGER pets_updated_at AFTER UPDATE ON pets
WHEN NEW.updated_at = OLD.updated_at BEGIN
  UPDATE pets SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;
CREATE TRIGGER services_updated_at AFTER UPDATE ON services
WHEN NEW.updated_at = OLD.updated_at BEGIN
  UPDATE services SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;
CREATE TRIGGER appointments_updated_at AFTER UPDATE ON appointments
WHEN NEW.updated_at = OLD.updated_at BEGIN
  UPDATE appointments SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;

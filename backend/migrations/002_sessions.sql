CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
) STRICT;
CREATE INDEX idx_sessions_employee ON sessions(employee_id);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);
-- Alterações de credenciais ou de acesso revogam sessões existentes.
CREATE TRIGGER employees_revoke_sessions AFTER UPDATE OF password_hash, role, active ON employees
BEGIN
  DELETE FROM sessions WHERE employee_id = NEW.id;
END;

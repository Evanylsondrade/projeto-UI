export class ApiError extends Error {
  constructor(message: string, public status: number, public code: string) { super(message); }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options, credentials: 'same-origin', signal: options.signal ?? AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json', 'X-SmartPet-Request': '1', ...options.headers },
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error('Não foi possível acessar o servidor. Verifique sua conexão e se o backend está em execução.');
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login' && path !== '/auth/me') window.dispatchEvent(new Event('smartpet:session-expired'));
    throw new ApiError(payload?.error?.message ?? 'Não foi possível concluir a solicitação.', response.status, payload?.error?.code ?? 'REQUEST_FAILED');
  }
  if (!payload || !('data' in payload)) throw new Error('O servidor retornou uma resposta inválida.');
  return payload.data as T;
}

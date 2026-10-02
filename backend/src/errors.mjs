export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function errorResponse(error, requestId) {
  const known = error instanceof HttpError;
  return {
    status: known ? error.status : 500,
    body: { error: {
      code: known ? error.code : 'INTERNAL_ERROR',
      message: known ? error.message : 'Não foi possível concluir a solicitação.',
      requestId,
    } },
  };
}

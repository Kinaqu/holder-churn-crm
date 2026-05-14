export function okResponse<T extends Record<string, unknown>>(data: T, init?: ResponseInit) {
  return Response.json({ ok: true, data, ...data }, init);
}

export function errorResponse(code: string, message: string, status = 500, extra: Record<string, unknown> = {}) {
  return Response.json(
    {
      ok: false,
      error: { code, message },
      code,
      message,
      ...extra
    },
    { status }
  );
}

export function successResponse<T>(data: T, status: number = 200): Response {
  return Response.json(data, { status });
}

export function createdResponse<T>(data: T): Response {
  return Response.json(data, { status: 201 });
}

export function noContentResponse(): Response {
  return new Response(null, { status: 204 });
}

export function paginatedResponse<T>(
  items: T[],
  nextCursor: string | null
): Response {
  return Response.json({ items, nextCursor }, { status: 200 });
}


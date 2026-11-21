export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

interface ValidationItem {
  loc: (string | number)[];
  msg: string;
  type: string;
}

/** Turns FastAPI's 422 list into one message per field. Missing or blank values read "Required". */
export function fieldErrorsFrom(detail: ValidationItem[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const item of detail) {
    const field = String(item.loc[item.loc.length - 1] ?? "");
    if (!field || out[field]) continue;
    const required = item.type === "missing" || item.type === "string_too_short" || item.type === "string_type";
    out[field] = required ? "Required" : item.msg.replace(/^Value error, /, "");
  }
  return out;
}

export async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) {
    const detail = (data as { detail?: unknown } | null)?.detail;
    if (res.status === 422 && Array.isArray(detail)) {
      throw new ApiError(422, "Some fields need attention.", fieldErrorsFrom(detail as ValidationItem[]));
    }
    throw new ApiError(res.status, typeof detail === "string" ? detail : "Something went wrong.");
  }
  return data as T;
}

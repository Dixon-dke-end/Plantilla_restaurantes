export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type FetchLike = typeof fetch;

export type ApiClient = {
  get<T>(url: string): Promise<T>;
  /** Like get, but resolves null on 404. */
  getOrNull<T>(url: string): Promise<T | null>;
  post<T>(url: string, body?: unknown): Promise<T>;
  put<T>(url: string, body?: unknown): Promise<T>;
  patch<T>(url: string, body?: unknown): Promise<T>;
  del<T = void>(url: string): Promise<T>;
  postForm<T>(url: string, form: FormData): Promise<T>;
};

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let body: unknown = undefined;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }
  }
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : `La solicitud falló (${res.status}).`;
    throw new ApiError(res.status, message, body);
  }
  return body as T;
}

export function createApiClient(fetchImpl: FetchLike = (...args) => fetch(...args)): ApiClient {
  const send = <T>(method: string, url: string, body?: unknown): Promise<T> => {
    const init: RequestInit = { method, credentials: "same-origin" };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
      init.headers = { "content-type": "application/json" };
    }
    return fetchImpl(url, init).then((res) => parse<T>(res));
  };
  return {
    get: (url) => send("GET", url),
    async getOrNull(url) {
      try {
        return await send("GET", url);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    post: (url, body) => send("POST", url, body),
    put: (url, body) => send("PUT", url, body),
    patch: (url, body) => send("PATCH", url, body),
    del: (url) => send("DELETE", url),
    postForm: (url, form) =>
      fetchImpl(url, { method: "POST", body: form, credentials: "same-origin" }).then((res) => parse(res)),
  };
}

/** Default browser client. */
export const api = createApiClient();

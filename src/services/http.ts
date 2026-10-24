export interface ApiEnvelope<T> { data: T }

interface ErrorEnvelope { error?: { code?: string; message?: string } }

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestOptions extends Omit<RequestInit, "body" | "method"> {
  body?: unknown;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Mutating, authenticated calls use CSRF unless explicitly disabled. */
  csrf?: boolean;
  /** Retries one 401 via the refresh-cookie flow. */
  refreshOnUnauthorized?: boolean;
  /** Coalesces concurrent equivalent mutations to prevent duplicate actions. */
  dedupeKey?: string;
}

const safeMethods = new Set(["GET", "HEAD"]);
const defaultBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

function endpoint(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

async function readPayload(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("application/json") ? response.json() : response.text();
}

export class HttpClient {
  private csrfToken: string | null = null;
  private csrfRequest: Promise<string> | null = null;
  private refreshRequest: Promise<void> | null = null;
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(private readonly baseUrl = defaultBaseUrl) {}

  clearSessionState(): void {
    this.csrfToken = null;
  }

  private async csrf(): Promise<string> {
    if (this.csrfToken) return this.csrfToken;
    if (!this.csrfRequest) {
      this.csrfRequest = fetch(endpoint(this.baseUrl, "/api/auth/csrf"), {
        credentials: "include",
        headers: { Accept: "application/json" },
      })
        .then(async (response) => {
          const payload = await readPayload(response) as ApiEnvelope<{ csrfToken: string }> | ErrorEnvelope;
          if (!response.ok || !("data" in payload) || !payload.data.csrfToken) {
            const error = "error" in payload ? payload.error : undefined;
            throw new ApiError(error?.message ?? "Não foi possível validar a sessão.", response.status, error?.code);
          }
          this.csrfToken = payload.data.csrfToken;
          return this.csrfToken;
        })
        .finally(() => { this.csrfRequest = null; });
    }
    return this.csrfRequest;
  }

  private async refresh(): Promise<void> {
    if (!this.refreshRequest) {
      this.refreshRequest = fetch(endpoint(this.baseUrl, "/api/auth/refresh"), {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      })
        .then(async (response) => {
          const payload = await readPayload(response) as ApiEnvelope<{ csrfToken: string }> | ErrorEnvelope;
          if (!response.ok || !("data" in payload)) {
            const error = "error" in payload ? payload.error : undefined;
            throw new ApiError(error?.message ?? "Sua sessão terminou.", response.status, error?.code);
          }
          this.csrfToken = payload.data.csrfToken;
        })
        .finally(() => { this.refreshRequest = null; });
    }
    return this.refreshRequest;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? "GET";
    const mutating = !safeMethods.has(method);
    const useCsrf = options.csrf ?? mutating;
    const refreshOnUnauthorized = options.refreshOnUnauthorized ?? true;
    const body = options.body === undefined ? undefined : JSON.stringify(options.body);
    const dedupeKey = options.dedupeKey ?? (mutating ? `${method}:${path}:${body ?? ""}` : undefined);

    const execute = async (canRefresh: boolean): Promise<T> => {
      const headers = new Headers(options.headers);
      headers.set("Accept", "application/json");
      if (body !== undefined) headers.set("Content-Type", "application/json");
      if (useCsrf) headers.set("x-csrf-token", await this.csrf());

      const response = await fetch(endpoint(this.baseUrl, path), {
        ...options,
        method,
        body,
        headers,
        credentials: "include",
      });
      const payload = await readPayload(response) as ApiEnvelope<T> | ErrorEnvelope;

      if (response.status === 401 && canRefresh && refreshOnUnauthorized && path !== "/api/auth/refresh") {
        await this.refresh();
        return execute(false);
      }
      if (!response.ok) {
        const error = "error" in payload ? payload.error : undefined;
        throw new ApiError(error?.message ?? "Não foi possível concluir a solicitação.", response.status, error?.code);
      }
      if (response.status === 204) return undefined as T;
      if (payload && typeof payload === "object" && "data" in payload) return payload.data as T;
      return payload as T;
    };

    if (!dedupeKey) return execute(true);
    const existing = this.inFlight.get(dedupeKey) as Promise<T> | undefined;
    if (existing) return existing;
    const operation = execute(true).finally(() => this.inFlight.delete(dedupeKey));
    this.inFlight.set(dedupeKey, operation);
    return operation;
  }
}

export const api = new HttpClient();

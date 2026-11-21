import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import { ToastProvider } from "./components/ui/Toast";

type Handler = (method: string, path: string, body: unknown) => { status?: number; body: unknown } | undefined;

/** Fakes fetch. Unhandled GETs return an empty list. Returns the calls made. */
export function mockApi(handler: Handler = () => undefined) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      const path = String(url).replace(/^\/api/, "");
      calls.push({ method, path, body });
      const r = handler(method, path, body) ?? { body: method === "GET" ? [] : {} };
      const status = r.status ?? 200;
      return { ok: status < 400, status, json: async () => r.body } as Response;
    }),
  );
  return calls;
}

export function renderWithProviders(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { Sidebar } from "./components/layout/Sidebar";
import { ToastProvider } from "./components/ui/Toast";
import ContactPage from "./pages/ContactPage";
import Contacts from "./pages/Contacts";
import Dashboard from "./pages/Dashboard";
import DealPage from "./pages/DealPage";
import Deals from "./pages/Deals";
import NotFoundPage from "./pages/NotFound";
import OrganizationPage from "./pages/OrganizationPage";
import Organizations from "./pages/Organizations";
import Pipeline from "./pages/Pipeline";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5_000, retry: false, refetchOnWindowFocus: true } },
});

/** Scrolls to a #hash (the dashboard's follow-ups panel) once the page has content. */
function HashScroll() {
  const { hash, pathname } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" }), 150);
    return () => clearTimeout(t);
  }, [hash, pathname]);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <HashScroll />
          <Sidebar />
          <main className="min-h-screen px-9 pb-10 pl-[264px] pt-[30px]">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/deals" element={<Deals />} />
              <Route path="/deals/:id" element={<DealPage />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/contacts/:id" element={<ContactPage />} />
              <Route path="/organizations" element={<Organizations />} />
              <Route path="/organizations/:id" element={<OrganizationPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

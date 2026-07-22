import { useState, useEffect } from "react";
import { Routes, Route, useSearchParams } from "react-router-dom";
import { Palette, Moon } from "lucide-react";
import { getTenants } from "@/lib/api";
import { Workspace } from "@/components/workspace/Workspace";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { readThemeMode, nextThemeMode, THEME_STORAGE_KEY, type ThemeMode } from "@/lib/themeMode";
import type { TenantSummary } from "@/lib/types";

export default function App() {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const tenantParam = searchParams.get("tenant") ?? "";
  const [themeMode, setThemeMode] = useState<ThemeMode>(() =>
    readThemeMode(typeof localStorage !== "undefined" ? localStorage.getItem(THEME_STORAGE_KEY) : null)
  );

  useEffect(() => {
    void getTenants().then(setTenants);
  }, []);

  // Tenant is the URL's source of truth (?tenant=...). If it's missing or stale
  // once tenants load, normalize to the first tenant without adding history.
  const known = tenants.some((t) => t.id === tenantParam);
  useEffect(() => {
    if (tenants.length === 0 || known) return;
    const first = tenants[0];
    if (first === undefined) return;
    setSearchParams(
      (prev) => {
        prev.set("tenant", first.id);
        return prev;
      },
      { replace: true }
    );
  }, [tenants, known, setSearchParams]);

  function selectTenant(id: string) {
    // Switch scope while staying on the current page: only the query changes.
    setSearchParams((prev) => {
      prev.set("tenant", id);
      return prev;
    });
  }

  function toggleTheme() {
    const next = nextThemeMode(themeMode);
    setThemeMode(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  }

  const selectedTenant = tenants.find((t) => t.id === tenantParam);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-sm font-semibold tracking-tight">Marketing-Ops</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              A steady content motion for every brand you run.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              aria-label={`Theme: ${themeMode === "brand" ? "Brand" : "Base"} — click to switch`}
              title={`Theme: ${themeMode === "brand" ? "Brand colors" : "Base (neutral)"} — click to switch`}
            >
              {themeMode === "brand" ? <Palette className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {tenants.length > 1 ? (
              <Select value={tenantParam} onValueChange={selectTenant}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Select tenant" /></SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : selectedTenant !== undefined ? (
              <span className="text-sm text-muted-foreground">{selectedTenant.name}</span>
            ) : null}
          </div>
        </div>
      </header>

      {selectedTenant !== undefined ? (
        (() => {
          const ws = (
            <Workspace
              tenant={selectedTenant.id}
              tenantName={selectedTenant.name}
              siteDomain={selectedTenant.domain}
              themeMode={themeMode}
            />
          );
          return (
            <Routes>
              <Route path="/" element={ws} />
              <Route path="/composer/:itemId" element={ws} />
              <Route path="/:section" element={ws} />
            </Routes>
          );
        })()
      ) : (
        <div className="p-8 text-sm text-muted-foreground">Loading tenants…</div>
      )}
    </div>
  );
}

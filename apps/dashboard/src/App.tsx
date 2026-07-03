import { useState, useEffect } from "react";
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
  const [selectedId, setSelectedId] = useState<string>("");
  const [themeMode, setThemeMode] = useState<ThemeMode>(() =>
    readThemeMode(typeof localStorage !== "undefined" ? localStorage.getItem(THEME_STORAGE_KEY) : null)
  );

  useEffect(() => {
    void getTenants().then((list) => {
      setTenants(list);
      const first = list[0];
      if (first !== undefined) setSelectedId(first.id);
    });
  }, []);

  function toggleTheme() {
    const next = nextThemeMode(themeMode);
    setThemeMode(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  }

  const selectedTenant = tenants.find((t) => t.id === selectedId) ?? tenants[0];

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
              <Select value={selectedId} onValueChange={setSelectedId}>
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
        <Workspace tenant={selectedTenant.id} tenantName={selectedTenant.name} themeMode={themeMode} />
      ) : (
        <div className="p-8 text-sm text-muted-foreground">Loading tenants…</div>
      )}
    </div>
  );
}

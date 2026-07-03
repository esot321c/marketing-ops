import { useEffect, useState, useCallback } from "react";

export function useLiveData<T>(
  fetcher: () => Promise<T>,
  shouldRefetch: (changedPath: string) => boolean
) {
  const [data, setData] = useState<T | null>(null);
  const load = useCallback(() => {
    void fetcher().then(setData).catch(() => setData(null));
  }, [fetcher]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const es = new EventSource("/events");
    es.addEventListener("change", (e) => {
      try {
        const { path } = JSON.parse((e as MessageEvent).data) as {
          path: string;
        };
        if (shouldRefetch(path)) load();
      } catch {
        /* ignore */
      }
    });
    return () => es.close();
  }, [load, shouldRefetch]);
  return { data, reload: load };
}

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "splitit:scope";

// Shared "Group | Personal" view scope, persisted + synced across tabs.
// All three group-scoped screens (Add Split, Reports, Expense List) read
// the same scope so flipping to Personal on one keeps Personal on the
// others — one coherent context instead of three independent toggles.
export const useScope = () => {
  const [scope, setScope] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "personal"
        ? "personal"
        : "group";
    } catch {
      return "group";
    }
  });

  const setAndPersist = useCallback((next) => {
    const v = next === "personal" ? "personal" : "group";
    setScope(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      // ignore quota / privacy errors
    }
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        setScope(e.newValue === "personal" ? "personal" : "group");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return [scope, setAndPersist];
};

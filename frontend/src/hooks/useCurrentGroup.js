import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "splitit:currentGroupId";

// Persist the last-selected group across tabs and reloads so the user
// only has to pick a group once. Reads on mount, writes on every change.
export const useCurrentGroup = () => {
  const [groupId, setGroupId] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });

  const setAndPersist = useCallback((id) => {
    setGroupId(id || "");
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore quota / privacy errors
    }
  }, []);

  // Keep multiple browser tabs in sync.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setGroupId(e.newValue || "");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return [groupId, setAndPersist];
};

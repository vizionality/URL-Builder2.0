"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { findPersonalWorkspace, listMyWorkspaces } from "@/lib/supabase/workspaces";
import type { WorkspaceWithRole } from "@/lib/types";

const ACTIVE_WORKSPACE_COOKIE = "active_workspace_id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

type WorkspaceContextValue = {
  workspaces: WorkspaceWithRole[];
  activeWorkspace: WorkspaceWithRole | null;
  loading: boolean;
  switchWorkspace: (id: string) => void;
  refreshWorkspaces: (preferredId?: string) => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshWorkspaces = useCallback(async (preferredId?: string) => {
    const supabase = createClient();
    const list = await listMyWorkspaces(supabase);
    setWorkspaces(list);

    const cookieId = preferredId ?? readCookie(ACTIVE_WORKSPACE_COOKIE);
    const fromCookie = cookieId ? list.find((w) => w.id === cookieId) : undefined;
    const fallback = fromCookie ?? findPersonalWorkspace(list) ?? list[0];
    if (fallback) {
      setActiveWorkspaceId(fallback.id);
      writeCookie(ACTIVE_WORKSPACE_COOKIE, fallback.id);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await refreshWorkspaces();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshWorkspaces]);

  const switchWorkspace = useCallback((id: string) => {
    setActiveWorkspaceId(id);
    writeCookie(ACTIVE_WORKSPACE_COOKIE, id);
  }, []);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId]
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({ workspaces, activeWorkspace, loading, switchWorkspace, refreshWorkspaces }),
    [workspaces, activeWorkspace, loading, switchWorkspace, refreshWorkspaces]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}

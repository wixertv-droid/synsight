"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface PlatformSessionFxContextValue {
  /** True while CRT shutdown overlay is visible. */
  shuttingDown: boolean;
  /** Start logout shutdown sequence (caller handles API + redirect timing). */
  beginShutdown: () => void;
  /** Register a handler invoked when user requests logout. */
  setLogoutHandler: (handler: (() => void) | null) => void;
  requestLogout: () => void;
}

const PlatformSessionFxContext =
  createContext<PlatformSessionFxContextValue | null>(null);

export function PlatformSessionFxProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [shuttingDown, setShuttingDown] = useState(false);
  const [logoutHandler, setLogoutHandlerState] = useState<(() => void) | null>(
    null
  );

  const beginShutdown = useCallback(() => {
    setShuttingDown(true);
  }, []);

  const setLogoutHandler = useCallback((handler: (() => void) | null) => {
    // Wrap so React setState does not treat the handler as an updater.
    setLogoutHandlerState(() => handler);
  }, []);

  const requestLogout = useCallback(() => {
    if (logoutHandler) {
      logoutHandler();
      return;
    }
    beginShutdown();
  }, [logoutHandler, beginShutdown]);

  const value = useMemo(
    () => ({
      shuttingDown,
      beginShutdown,
      setLogoutHandler,
      requestLogout,
    }),
    [shuttingDown, beginShutdown, setLogoutHandler, requestLogout]
  );

  return (
    <PlatformSessionFxContext.Provider value={value}>
      {children}
    </PlatformSessionFxContext.Provider>
  );
}

export function usePlatformSessionFx(): PlatformSessionFxContextValue {
  const ctx = useContext(PlatformSessionFxContext);
  if (!ctx) {
    throw new Error(
      "usePlatformSessionFx must be used within PlatformSessionFxProvider"
    );
  }
  return ctx;
}

/** Optional hook — LogoutButton falls back if outside provider. */
export function usePlatformSessionFxOptional(): PlatformSessionFxContextValue | null {
  return useContext(PlatformSessionFxContext);
}

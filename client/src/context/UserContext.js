// User context — restored implementation (the backup copy of this file was empty).
// Uses a module-level store so every page shares one session even though app.jsx
// renders routes directly without a <UserProvider> wrapper.
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'recipeSuggester.user';

let currentUser = null;
try {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  currentUser = raw ? JSON.parse(raw) : null;
} catch {
  currentUser = null;
}

const listeners = new Set();

function persistUser(user) {
  currentUser = user;
  try {
    if (user) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage may be unavailable (private mode) — session stays in memory.
  }
  listeners.forEach((listener) => listener());
}

export function useUser() {
  const [user, setUser] = useState(currentUser);

  useEffect(() => {
    const listener = () => setUser(currentUser);
    listeners.add(listener);
    listener();
    return () => listeners.delete(listener);
  }, []);

  const login = useCallback((userData) => persistUser(userData), []);
  const logout = useCallback(() => persistUser(null), []);
  const updateUser = useCallback((userData) => persistUser(userData), []);

  return { user, login, logout, updateUser };
}


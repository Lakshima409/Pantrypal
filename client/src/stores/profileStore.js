// Per-user profile store — module-level (same pattern as the *Context files), so
// pages work without a <Provider> wrapper. Data is persisted to localStorage under
// a per-email key, so every user gets their OWN personalized profile, diet,
// allergies, goals, etc. The Profile page is the editor; the Recipe Generator,
// Diet Plan and Shopping List read from here to personalize their content.

import { useEffect, useState } from 'react';

const AVATAR_COLORS = ['#ff6b4a', '#7c2d0e', '#2f8f5b', '#3b6fd4', '#a24fb0', '#d98b1f'];
const DEFAULT = { name: 'Guest', email: '', diet: '', allergies: [], conditions: [], skill: 'beginner', calories: '', avatarColor: '#ff6b4a' };

const listeners = new Set();
const notify = () => listeners.forEach((l) => l());

let profile = { ...DEFAULT };
let loadedEmail = null;

function keyFor(email) { return 'recipeSuggester.profile.' + (email || 'guest'); }
function colorFor(email) {
  const s = String(email || 'guest');
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function load(email, name) {
  const base = { ...DEFAULT, email: email || '', name: name || DEFAULT.name, avatarColor: colorFor(email) };
  try {
    const raw = localStorage.getItem(keyFor(email));
    if (raw) return { ...base, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return base;
}
function persist() {
  try { localStorage.setItem(keyFor(loadedEmail), JSON.stringify(profile)); } catch { /* ignore */ }
}
// Loads the profile for the given identity. Idempotent; no notify (callers re-render).
function ensureLoaded(email, name) {
  const e = email || '';
  if (loadedEmail === e) return;
  loadedEmail = e;
  profile = load(e, name);
  persist();
}
function updateProfile(patch) {
  profile = { ...profile, ...patch };
  persist();
  notify();
}

// Small helpers shared with other pages.
export function normalizeTag(s) {
  return String(s || '').toLowerCase().replace(/[^a-z]/g, '');
}

export function useProfile(user) {
  const [, force] = useState(0);
  const email = user?.email || '';
  const name = user?.name || '';
  ensureLoaded(email, name); // synchronous so the first render already has the right profile
  useEffect(() => { force((c) => c + 1); }, [email]); // re-render when switching accounts
  useEffect(() => {
    const l = () => force((c) => c + 1);
    listeners.add(l);
    return () => listeners.delete(l);
  }, []);
  return { profile, updateProfile };
}

export default { useProfile, updateProfile };

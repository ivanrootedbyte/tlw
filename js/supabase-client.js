import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

let client = null;

export function getSupabaseConfig() {
  const url = window.__SUPABASE_URL__ || window.localStorage.getItem('tlw.supabaseUrl') || '';
  const anonKey = window.__SUPABASE_ANON_KEY__ || window.localStorage.getItem('tlw.supabaseAnonKey') || '';
  return { url, anonKey };
}

export function hasSupabaseConfig() {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey);
}

export function initSupabase() {
  if (client) return client;
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;
  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  return client;
}

export async function getSession() {
  const supabase = initSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session || null;
}

export async function getUser() {
  const session = await getSession();
  return session?.user || null;
}

export async function signInWithMagicLink(email) {
  const supabase = initSupabase();
  if (!supabase) throw new Error('Supabase is not configured.');
  const redirectTo = `${window.location.origin}/account.html`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo }
  });
  if (error) throw error;
  return true;
}

export async function signOut() {
  const supabase = initSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function ensureProfile() {
  const supabase = initSupabase();
  const user = await getUser();
  if (!supabase || !user) return;
  const username = user.email?.split('@')[0] || 'player';
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    username
  }, { onConflict: 'id' });
  if (error) console.warn('Profile upsert failed', error.message);
}

export async function saveCloudMatch(result) {
  const supabase = initSupabase();
  const user = await getUser();
  if (!supabase || !user || !result) return { skipped: true };
  await ensureProfile();
  const payload = {
    user_id: user.id,
    persona_id: result.personaId,
    topic_id: result.topicId,
    ending: result.ending.title,
    logic_score: result.scores.logic,
    evidence_score: result.scores.evidence,
    humanity_score: result.scores.humanity,
    humility_score: result.scores.humility,
    summary: result.ending.summary
  };
  const { error } = await supabase.from('match_history').insert(payload);
  if (error) throw error;
  return { ok: true };
}

export async function fetchCloudMatches() {
  const supabase = initSupabase();
  const user = await getUser();
  if (!supabase || !user) return [];
  const { data, error } = await supabase
    .from('match_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

export function onAuthChange(callback) {
  const supabase = initSupabase();
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

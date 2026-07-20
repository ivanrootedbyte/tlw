import { ensureProfile, getUser, hasSupabaseConfig, onAuthChange, signInWithMagicLink, signOut } from './supabase-client.js';

export function attachAuthUi({
  emailInputId = 'emailInput',
  sendBtnId = 'sendMagicBtn',
  signOutBtnId = 'signOutBtn',
  authStatusId = 'authStatus',
  userEmailId = 'userEmail'
} = {}) {
  const emailInput = document.getElementById(emailInputId);
  const sendBtn = document.getElementById(sendBtnId);
  const signOutBtn = document.getElementById(signOutBtnId);
  const authStatus = document.getElementById(authStatusId);
  const userEmail = document.getElementById(userEmailId);

  async function refresh() {
    const user = await getUser();
    if (authStatus) {
      if (!hasSupabaseConfig()) {
        authStatus.textContent = 'Cloud save is not configured yet. Add js/env.js from the example file.';
      } else if (user) {
        authStatus.textContent = 'Signed in. Cloud saves are active.';
      } else {
        authStatus.textContent = 'Enter your email for a magic link to turn on cloud saves.';
      }
    }
    if (userEmail) userEmail.textContent = user?.email || 'Guest mode';
    if (signOutBtn) signOutBtn.hidden = !user;
    if (sendBtn) sendBtn.disabled = !hasSupabaseConfig();
    if (user) await ensureProfile();
  }

  sendBtn?.addEventListener('click', async () => {
    const email = emailInput?.value.trim();
    if (!email) {
      authStatus.textContent = 'Enter an email first.';
      return;
    }
    try {
      sendBtn.disabled = true;
      await signInWithMagicLink(email);
      authStatus.textContent = 'Magic link sent. Open it on this device to finish sign-in.';
    } catch (err) {
      authStatus.textContent = err.message || 'Could not send sign-in link.';
    } finally {
      sendBtn.disabled = false;
    }
  });

  signOutBtn?.addEventListener('click', async () => {
    await signOut();
    await refresh();
  });

  onAuthChange(() => refresh());
  refresh();
}

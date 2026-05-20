import { supabase } from './supabase';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? '');
}

export async function handleAuthError(error: unknown): Promise<void> {
  if (!error) return;

  const errorMessage = getErrorMessage(error).toLowerCase();

  // Solo cerrar sesión cuando el problema es claramente de refresh/session rota.
  // No expulsar al usuario por 401/invalid jwt genéricos provenientes de Edge Functions.
  const shouldForceLogout = [
    'refresh_token_not_found',
    'invalid refresh token',
    'refresh token not found',
    'invalid_grant',
    'session_not_found',
    'session not found',
    'user from sub claim in jwt does not exist',
    'jwt expired',
    'token has expired',
  ].some((term) => errorMessage.includes(term));

  if (!shouldForceLogout) return;

  console.warn('Sesión inválida, cerrando sesión:', errorMessage);

  try {
    await supabase.auth.signOut();
  } catch (signOutError) {
    console.error('Error during forced sign out:', signOutError);
  }

  if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
    window.location.href = '/login';
  }
}

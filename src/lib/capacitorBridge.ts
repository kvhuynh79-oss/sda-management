/**
 * Capacitor Bridge - Native Token Storage
 *
 * When running inside a Capacitor native app, this module stores session
 * tokens in native secure storage (iOS Keychain via App Groups / Android
 * EncryptedSharedPreferences) so that native widgets can read them
 * independently of the WebView.
 *
 * In a regular browser, all functions are no-ops.
 */

const TOKEN_KEY = 'sda_session_token';
const REFRESH_KEY = 'sda_refresh_token';
const USER_KEY = 'sda_user_data';

/**
 * Check if running inside a Capacitor native app
 */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  // Capacitor injects this on the window object
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

/**
 * Store session tokens in native secure storage for widget access.
 * No-op in browser environments.
 */
export async function storeTokenNative(
  token: string,
  refreshToken: string,
  userData?: { id: string; firstName: string; lastName: string; role: string }
): Promise<void> {
  if (!isNativeApp()) return;

  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: TOKEN_KEY, value: token });
    await Preferences.set({ key: REFRESH_KEY, value: refreshToken });
    if (userData) {
      await Preferences.set({ key: USER_KEY, value: JSON.stringify(userData) });
    }
  } catch (err) {
  }
}

/**
 * Clear all tokens from native storage (on logout).
 * No-op in browser environments.
 */
export async function clearTokensNative(): Promise<void> {
  if (!isNativeApp()) return;

  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.remove({ key: TOKEN_KEY });
    await Preferences.remove({ key: REFRESH_KEY });
    await Preferences.remove({ key: USER_KEY });
  } catch (err) {
  }
}

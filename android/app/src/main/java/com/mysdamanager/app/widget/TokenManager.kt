package com.mysdamanager.app.widget

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import org.json.JSONObject

/**
 * Manages session tokens for the MySDAManager widget.
 *
 * Reads session/refresh tokens from Capacitor's SharedPreferences ("CapacitorStorage")
 * which is where the WebView app stores tokens after login via @capacitor/preferences.
 *
 * Uses a separate private SharedPreferences for widget-specific cache data.
 */
class TokenManager(private val context: Context) {

    companion object {
        private const val TAG = "TokenManager"

        // Capacitor Preferences storage file (where the WebView app stores tokens)
        private const val CAPACITOR_PREFS = "CapacitorStorage"

        // Keys matching capacitorBridge.ts
        private const val CAP_SESSION_TOKEN = "sda_session_token"
        private const val CAP_REFRESH_TOKEN = "sda_refresh_token"
        private const val CAP_USER_DATA = "sda_user_data"

        // Widget-only cache storage
        private const val WIDGET_PREFS = "mysdamanager_widget_cache"
        private const val KEY_CACHE_TIMESTAMP = "sda_cache_timestamp"
        private const val KEY_CACHED_TASKS = "sda_cached_tasks"
    }

    /** Capacitor's SharedPreferences - where tokens are stored by the WebView app */
    private val capPrefs: SharedPreferences by lazy {
        context.getSharedPreferences(CAPACITOR_PREFS, Context.MODE_PRIVATE)
    }

    /** Widget-only cache for offline fallback */
    private val cachePrefs: SharedPreferences by lazy {
        context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
    }

    // MARK: - Session Token (from Capacitor storage)

    fun getSessionToken(): String? {
        val token = capPrefs.getString(CAP_SESSION_TOKEN, null)
        Log.d(TAG, "getSessionToken: ${if (token != null) "found (${token.length} chars)" else "null"}")
        return token
    }

    fun storeSessionToken(token: String) {
        capPrefs.edit().putString(CAP_SESSION_TOKEN, token).apply()
    }

    // MARK: - Refresh Token (from Capacitor storage)

    fun getRefreshToken(): String? {
        return capPrefs.getString(CAP_REFRESH_TOKEN, null)
    }

    fun storeRefreshToken(token: String) {
        capPrefs.edit().putString(CAP_REFRESH_TOKEN, token).apply()
    }

    // MARK: - User Data (from Capacitor storage)

    fun getUserName(): String? {
        return try {
            val userData = capPrefs.getString(CAP_USER_DATA, null) ?: return null
            val json = JSONObject(userData)
            val first = json.optString("firstName", "")
            val last = json.optString("lastName", "")
            "$first $last".trim().ifEmpty { null }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse user data", e)
            null
        }
    }

    fun getOrgName(): String? {
        // Org name not stored in Capacitor bridge - return default
        return null
    }

    fun getUserRole(): String? {
        return try {
            val userData = capPrefs.getString(CAP_USER_DATA, null) ?: return null
            val json = JSONObject(userData)
            json.optString("role", null)
        } catch (e: Exception) {
            null
        }
    }

    // MARK: - Task Cache (widget-only storage)

    fun getCachedTasks(): String? {
        return cachePrefs.getString(KEY_CACHED_TASKS, null)
    }

    fun cacheTasks(tasksJson: String) {
        cachePrefs.edit()
            .putString(KEY_CACHED_TASKS, tasksJson)
            .putLong(KEY_CACHE_TIMESTAMP, System.currentTimeMillis())
            .apply()
    }

    fun getCacheTimestamp(): Long {
        return cachePrefs.getLong(KEY_CACHE_TIMESTAMP, 0L)
    }

    // MARK: - Cleanup

    fun clearAll() {
        cachePrefs.edit().clear().apply()
    }

    fun clearTokens() {
        capPrefs.edit()
            .remove(CAP_SESSION_TOKEN)
            .remove(CAP_REFRESH_TOKEN)
            .apply()
    }
}

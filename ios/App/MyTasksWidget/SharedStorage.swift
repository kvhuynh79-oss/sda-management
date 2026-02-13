import Foundation

/// Reads authentication tokens and user data from the shared App Group container.
/// The main app writes these values after login so the widget extension can access them.
///
/// Setup required:
/// 1. Enable App Groups capability on both the main app target and widget extension target
/// 2. Use the same App Group ID: "group.com.mysdamanager.app"
/// 3. Main app must write tokens to UserDefaults(suiteName: appGroupId) after login
struct SharedStorage {

    static let appGroupId = "group.com.mysdamanager.app"

    // MARK: - Session Token

    /// Returns the current session token, or nil if the user is not logged in.
    static func getSessionToken() -> String? {
        let defaults = UserDefaults(suiteName: appGroupId)
        return defaults?.string(forKey: "sda_session_token")
    }

    /// Stores a session token (called by the main app after login or token refresh).
    static func storeSessionToken(_ token: String) {
        let defaults = UserDefaults(suiteName: appGroupId)
        defaults?.set(token, forKey: "sda_session_token")
    }

    /// Clears the session token (called by the main app on logout).
    static func clearSessionToken() {
        let defaults = UserDefaults(suiteName: appGroupId)
        defaults?.removeObject(forKey: "sda_session_token")
    }

    // MARK: - Refresh Token

    /// Returns the refresh token for automatic session renewal.
    static func getRefreshToken() -> String? {
        let defaults = UserDefaults(suiteName: appGroupId)
        return defaults?.string(forKey: "sda_refresh_token")
    }

    /// Stores a refresh token.
    static func storeRefreshToken(_ token: String) {
        let defaults = UserDefaults(suiteName: appGroupId)
        defaults?.set(token, forKey: "sda_refresh_token")
    }

    // MARK: - User Data

    /// Returns the user data dictionary (name, role, orgName, etc.), or nil if not available.
    static func getUserData() -> [String: String]? {
        guard let defaults = UserDefaults(suiteName: appGroupId),
              let jsonString = defaults.string(forKey: "sda_user_data"),
              let data = jsonString.data(using: .utf8),
              let dict = try? JSONSerialization.jsonObject(with: data) as? [String: String]
        else {
            return nil
        }
        return dict
    }

    /// Returns the organization name from stored user data.
    static func getOrgName() -> String? {
        return getUserData()?["orgName"]
    }

    /// Returns the user's display name from stored user data.
    static func getUserName() -> String? {
        return getUserData()?["name"]
    }

    /// Stores user data as a JSON string.
    static func storeUserData(_ data: [String: String]) {
        guard let jsonData = try? JSONSerialization.data(withJSONObject: data),
              let jsonString = String(data: jsonData, encoding: .utf8)
        else { return }

        let defaults = UserDefaults(suiteName: appGroupId)
        defaults?.set(jsonString, forKey: "sda_user_data")
    }

    // MARK: - Cache

    /// Returns the last cached task data, used as fallback when the network is unavailable.
    static func getCachedTasks() -> [TaskItem]? {
        guard let defaults = UserDefaults(suiteName: appGroupId),
              let data = defaults.data(forKey: "sda_widget_cached_tasks"),
              let tasks = try? JSONDecoder().decode([TaskItem].self, from: data)
        else { return nil }
        return tasks
    }

    /// Caches the latest task data for offline fallback.
    static func cacheTasks(_ tasks: [TaskItem]) {
        guard let data = try? JSONEncoder().encode(tasks) else { return }
        let defaults = UserDefaults(suiteName: appGroupId)
        defaults?.set(data, forKey: "sda_widget_cached_tasks")
    }

    /// Returns the timestamp of the last successful cache update.
    static func getCacheTimestamp() -> Date? {
        let defaults = UserDefaults(suiteName: appGroupId)
        return defaults?.object(forKey: "sda_widget_cache_timestamp") as? Date
    }

    /// Updates the cache timestamp to the current time.
    static func updateCacheTimestamp() {
        let defaults = UserDefaults(suiteName: appGroupId)
        defaults?.set(Date(), forKey: "sda_widget_cache_timestamp")
    }

    // MARK: - Cleanup

    /// Clears all stored data (called on logout).
    static func clearAll() {
        let defaults = UserDefaults(suiteName: appGroupId)
        defaults?.removeObject(forKey: "sda_session_token")
        defaults?.removeObject(forKey: "sda_refresh_token")
        defaults?.removeObject(forKey: "sda_user_data")
        defaults?.removeObject(forKey: "sda_widget_cached_tasks")
        defaults?.removeObject(forKey: "sda_widget_cache_timestamp")
    }
}

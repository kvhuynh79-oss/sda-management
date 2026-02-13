import Foundation

/// Handles API communication with the MySDAManager backend for widget data.
/// Fetches tasks and supports completing tasks via the REST API.
class TaskService {

    static let baseURL = "https://mysdamanager.com/api/v1/tasks/widget"

    // MARK: - Fetch Tasks

    /// Fetches the user's pending tasks from the API.
    /// Falls back to cached data if the network request fails.
    /// - Parameter limit: Maximum number of tasks to return (default 10)
    /// - Returns: Result containing an array of TaskItems or an error
    static func fetchTasks(limit: Int = 10) async -> Result<[TaskItem], Error> {
        guard let token = SharedStorage.getSessionToken() else {
            return .failure(WidgetError.notAuthenticated)
        }

        guard let url = URL(string: "\(baseURL)?limit=\(limit)") else {
            return .failure(WidgetError.invalidURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("MySDAManager-iOS-Widget/1.0", forHTTPHeaderField: "User-Agent")
        request.timeoutInterval = 15

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                return fallbackToCacheOrFail(WidgetError.invalidResponse)
            }

            switch httpResponse.statusCode {
            case 200:
                let decoder = JSONDecoder()
                let widgetResponse = try decoder.decode(WidgetResponse.self, from: data)
                // Cache successful response for offline fallback
                SharedStorage.cacheTasks(widgetResponse.data)
                SharedStorage.updateCacheTimestamp()
                return .success(widgetResponse.data)

            case 401:
                // Try to refresh the token before giving up
                let refreshResult = await refreshToken()
                if refreshResult {
                    // Retry the request with the new token
                    return await fetchTasks(limit: limit)
                }
                SharedStorage.clearSessionToken()
                return .failure(WidgetError.sessionExpired)

            case 403:
                return .failure(WidgetError.forbidden)

            case 429:
                return fallbackToCacheOrFail(WidgetError.rateLimited)

            case 500...599:
                return fallbackToCacheOrFail(WidgetError.serverError(httpResponse.statusCode))

            default:
                return fallbackToCacheOrFail(
                    WidgetError.unexpectedStatus(httpResponse.statusCode)
                )
            }
        } catch let error as DecodingError {
            return fallbackToCacheOrFail(WidgetError.decodingFailed(error.localizedDescription))
        } catch {
            // Network error - try cache
            return fallbackToCacheOrFail(error)
        }
    }

    // MARK: - Complete Task

    /// Marks a task as completed via the API.
    /// - Parameter taskId: The ID of the task to complete
    /// - Returns: True if the task was successfully completed
    static func completeTask(taskId: String) async -> Bool {
        guard let token = SharedStorage.getSessionToken() else {
            return false
        }

        guard let url = URL(string: baseURL) else {
            return false
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("MySDAManager-iOS-Widget/1.0", forHTTPHeaderField: "User-Agent")
        request.timeoutInterval = 10

        let body: [String: String] = ["taskId": taskId]
        request.httpBody = try? JSONEncoder().encode(body)

        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else { return false }
            return httpResponse.statusCode == 200
        } catch {
            return false
        }
    }

    // MARK: - Token Refresh

    /// Attempts to refresh the session token using the stored refresh token.
    /// - Returns: True if the token was successfully refreshed
    private static func refreshToken() async -> Bool {
        guard let refreshToken = SharedStorage.getRefreshToken() else {
            return false
        }

        guard let url = URL(string: "https://mysdamanager.com/api/v1/auth/refresh") else {
            return false
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 10

        let body: [String: String] = ["refreshToken": refreshToken]
        request.httpBody = try? JSONEncoder().encode(body)

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                return false
            }

            struct RefreshResponse: Codable {
                let sessionToken: String
                let refreshToken: String?
            }

            let refreshResponse = try JSONDecoder().decode(RefreshResponse.self, from: data)
            SharedStorage.storeSessionToken(refreshResponse.sessionToken)
            if let newRefreshToken = refreshResponse.refreshToken {
                SharedStorage.storeRefreshToken(newRefreshToken)
            }
            return true
        } catch {
            return false
        }
    }

    // MARK: - Cache Fallback

    /// Attempts to return cached tasks when the network request fails.
    /// Returns the original error if no cache is available.
    private static func fallbackToCacheOrFail(_ error: Error) -> Result<[TaskItem], Error> {
        if let cachedTasks = SharedStorage.getCachedTasks(), !cachedTasks.isEmpty {
            return .success(cachedTasks)
        }
        return .failure(error)
    }
}

// MARK: - Widget Errors

enum WidgetError: LocalizedError {
    case notAuthenticated
    case sessionExpired
    case forbidden
    case invalidURL
    case invalidResponse
    case rateLimited
    case serverError(Int)
    case unexpectedStatus(Int)
    case decodingFailed(String)

    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "Not signed in"
        case .sessionExpired:
            return "Session expired"
        case .forbidden:
            return "Access denied"
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response"
        case .rateLimited:
            return "Too many requests"
        case .serverError(let code):
            return "Server error (\(code))"
        case .unexpectedStatus(let code):
            return "Unexpected error (\(code))"
        case .decodingFailed(let detail):
            return "Data error: \(detail)"
        }
    }
}

package com.mysdamanager.app.widget

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

/**
 * HTTP client for the MySDAManager widget API.
 * Handles fetching tasks and completing tasks via the REST API.
 *
 * Uses HttpURLConnection (no external dependencies) to keep the widget lightweight.
 * All methods are synchronous and should be called from a background thread/coroutine.
 */
class TaskService(private val context: Context) {

    companion object {
        private const val TAG = "TaskService"
        private const val BASE_URL = "https://mysdamanager.com/api/v1/tasks/widget"
        private const val REFRESH_URL = "https://mysdamanager.com/api/v1/auth/refresh"
        private const val CONNECT_TIMEOUT = 15_000 // 15 seconds
        private const val READ_TIMEOUT = 15_000    // 15 seconds
        private const val USER_AGENT = "MySDAManager-Android-Widget/1.0"
    }

    private val tokenManager = TokenManager(context)

    // MARK: - Fetch Tasks

    /**
     * Fetches the user's pending tasks from the API.
     * Returns a WidgetResponse on success, or null on failure.
     * Falls back to cached data if the network request fails.
     *
     * @param limit Maximum number of tasks to fetch (default 10)
     */
    fun fetchTasks(limit: Int = 10): TaskFetchResult {
        val token = tokenManager.getSessionToken()
            ?: return TaskFetchResult.NotAuthenticated

        return try {
            val url = URL("$BASE_URL?limit=$limit")
            val connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("User-Agent", USER_AGENT)
                connectTimeout = CONNECT_TIMEOUT
                readTimeout = READ_TIMEOUT
            }

            try {
                val responseCode = connection.responseCode

                when (responseCode) {
                    200 -> {
                        val responseBody = readStream(connection)
                        val json = JSONObject(responseBody)
                        val response = WidgetResponse.fromJson(json)

                        // Cache successful response
                        tokenManager.cacheTasks(json.getJSONArray("data").toString())

                        TaskFetchResult.Success(response.data, response.count)
                    }

                    401 -> {
                        // Try token refresh
                        if (refreshToken()) {
                            // Retry with new token
                            fetchTasks(limit)
                        } else {
                            tokenManager.clearTokens()
                            TaskFetchResult.SessionExpired
                        }
                    }

                    403 -> TaskFetchResult.Forbidden
                    429 -> fallbackToCacheOrError("Rate limited")
                    in 500..599 -> fallbackToCacheOrError("Server error ($responseCode)")
                    else -> fallbackToCacheOrError("Unexpected status: $responseCode")
                }
            } finally {
                connection.disconnect()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to fetch tasks", e)
            fallbackToCacheOrError(e.message ?: "Network error")
        }
    }

    // MARK: - Complete Task

    /**
     * Marks a task as completed via the API.
     *
     * @param taskId The ID of the task to complete
     * @return true if the task was successfully completed
     */
    fun completeTask(taskId: String): Boolean {
        val token = tokenManager.getSessionToken() ?: return false

        return try {
            val url = URL(BASE_URL)
            val connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("User-Agent", USER_AGENT)
                connectTimeout = CONNECT_TIMEOUT
                readTimeout = READ_TIMEOUT
                doOutput = true
            }

            try {
                val body = JSONObject().apply {
                    put("taskId", taskId)
                }

                OutputStreamWriter(connection.outputStream).use { writer ->
                    writer.write(body.toString())
                    writer.flush()
                }

                connection.responseCode == 200
            } finally {
                connection.disconnect()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to complete task: $taskId", e)
            false
        }
    }

    // MARK: - Token Refresh

    /**
     * Attempts to refresh the session token using the stored refresh token.
     * @return true if the token was successfully refreshed
     */
    private fun refreshToken(): Boolean {
        val refreshToken = tokenManager.getRefreshToken() ?: return false

        return try {
            val url = URL(REFRESH_URL)
            val connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("User-Agent", USER_AGENT)
                connectTimeout = CONNECT_TIMEOUT
                readTimeout = READ_TIMEOUT
                doOutput = true
            }

            try {
                val body = JSONObject().apply {
                    put("refreshToken", refreshToken)
                }

                OutputStreamWriter(connection.outputStream).use { writer ->
                    writer.write(body.toString())
                    writer.flush()
                }

                if (connection.responseCode == 200) {
                    val responseBody = readStream(connection)
                    val json = JSONObject(responseBody)

                    val newSessionToken = json.getString("sessionToken")
                    tokenManager.storeSessionToken(newSessionToken)

                    if (json.has("refreshToken")) {
                        tokenManager.storeRefreshToken(json.getString("refreshToken"))
                    }

                    true
                } else {
                    false
                }
            } finally {
                connection.disconnect()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to refresh token", e)
            false
        }
    }

    // MARK: - Cache Fallback

    /**
     * Attempts to return cached tasks when the network request fails.
     * Returns an error result if no cache is available.
     */
    private fun fallbackToCacheOrError(errorMessage: String): TaskFetchResult {
        val cachedJson = tokenManager.getCachedTasks()
        if (cachedJson != null) {
            try {
                val jsonArray = JSONArray(cachedJson)
                val tasks = TaskItem.fromJsonArray(jsonArray)
                if (tasks.isNotEmpty()) {
                    return TaskFetchResult.Success(tasks, tasks.size, isCached = true)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to parse cached tasks", e)
            }
        }
        return TaskFetchResult.Error(errorMessage)
    }

    // MARK: - Helpers

    /**
     * Reads the response body from an HttpURLConnection.
     */
    private fun readStream(connection: HttpURLConnection): String {
        val reader = BufferedReader(InputStreamReader(connection.inputStream))
        val response = StringBuilder()
        var line: String?
        while (reader.readLine().also { line = it } != null) {
            response.append(line)
        }
        reader.close()
        return response.toString()
    }
}

/**
 * Sealed class representing the result of a task fetch operation.
 */
sealed class TaskFetchResult {
    /**
     * Tasks fetched successfully.
     * @param tasks List of task items
     * @param totalCount Total number of tasks available
     * @param isCached Whether the data came from the local cache
     */
    data class Success(
        val tasks: List<TaskItem>,
        val totalCount: Int,
        val isCached: Boolean = false
    ) : TaskFetchResult()

    /** User is not authenticated (no token stored). */
    data object NotAuthenticated : TaskFetchResult()

    /** Session token has expired and could not be refreshed. */
    data object SessionExpired : TaskFetchResult()

    /** Access denied (wrong permissions). */
    data object Forbidden : TaskFetchResult()

    /** An error occurred during the fetch. */
    data class Error(val message: String) : TaskFetchResult()
}

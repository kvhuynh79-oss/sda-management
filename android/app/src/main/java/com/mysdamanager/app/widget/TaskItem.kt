package com.mysdamanager.app.widget

import android.graphics.Color
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

/**
 * Represents a single task from the MySDAManager API.
 * Used by the home screen widget to display pending tasks.
 */
data class TaskItem(
    val id: String,
    val title: String,
    val dueDate: String,
    val priority: String,
    val status: String,
    val category: String,
    val isOverdue: Boolean
) {
    companion object {
        /**
         * Parses a JSON array of task objects into a list of TaskItem.
         */
        fun fromJsonArray(jsonArray: JSONArray): List<TaskItem> {
            val tasks = mutableListOf<TaskItem>()
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                tasks.add(fromJson(obj))
            }
            return tasks
        }

        /**
         * Parses a single JSON object into a TaskItem.
         */
        fun fromJson(json: JSONObject): TaskItem {
            return TaskItem(
                id = json.getString("id"),
                title = json.getString("title"),
                dueDate = json.getString("dueDate"),
                priority = json.getString("priority"),
                status = json.getString("status"),
                category = json.getString("category"),
                isOverdue = json.getBoolean("isOverdue")
            )
        }
    }

    /**
     * Returns the deep link URI to open this task in the app.
     */
    val deepLinkUri: String
        get() = "mysdamanager://follow-ups/tasks/$id"

    /**
     * Returns a human-readable formatted due date.
     * - "Today", "Tomorrow", "Yesterday" for relative dates
     * - Day name for dates within the next 7 days
     * - "d MMM" format for other dates
     */
    val dueDateFormatted: String
        get() {
            val inputFormat = SimpleDateFormat("yyyy-MM-dd", Locale("en", "AU"))
            val date: Date = try {
                inputFormat.parse(dueDate) ?: return dueDate
            } catch (e: Exception) {
                return dueDate
            }

            val calendar = Calendar.getInstance()
            val today = calendar.clone() as Calendar
            today.set(Calendar.HOUR_OF_DAY, 0)
            today.set(Calendar.MINUTE, 0)
            today.set(Calendar.SECOND, 0)
            today.set(Calendar.MILLISECOND, 0)

            val taskCal = Calendar.getInstance()
            taskCal.time = date
            taskCal.set(Calendar.HOUR_OF_DAY, 0)
            taskCal.set(Calendar.MINUTE, 0)
            taskCal.set(Calendar.SECOND, 0)
            taskCal.set(Calendar.MILLISECOND, 0)

            val diffMillis = taskCal.timeInMillis - today.timeInMillis
            val diffDays = TimeUnit.MILLISECONDS.toDays(diffMillis).toInt()

            return when (diffDays) {
                0 -> "Today"
                1 -> "Tomorrow"
                -1 -> "Yesterday"
                in 2..7 -> {
                    val dayFormat = SimpleDateFormat("EEEE", Locale("en", "AU"))
                    dayFormat.format(date)
                }
                else -> {
                    val shortFormat = SimpleDateFormat("d MMM", Locale("en", "AU"))
                    shortFormat.format(date)
                }
            }
        }

    /**
     * Returns the color integer for this task's priority level.
     */
    val priorityColor: Int
        get() = when (priority.lowercase()) {
            "urgent" -> Color.parseColor("#EF4444") // Red
            "high" -> Color.parseColor("#F97316")   // Orange
            "medium" -> Color.parseColor("#EAB308") // Yellow
            "low" -> Color.parseColor("#9CA3AF")    // Gray
            else -> Color.parseColor("#9CA3AF")     // Default gray
        }

    /**
     * Returns a short label for the task category.
     */
    val categoryLabel: String
        get() = when (category) {
            "funding" -> "Funding"
            "plan_approval" -> "Plan"
            "documentation" -> "Docs"
            "follow_up" -> "Follow-up"
            "general" -> "General"
            else -> category.replaceFirstChar { it.uppercase() }
        }
}

/**
 * API response wrapper containing task data and total count.
 */
data class WidgetResponse(
    val data: List<TaskItem>,
    val count: Int
) {
    companion object {
        fun fromJson(json: JSONObject): WidgetResponse {
            val dataArray = json.getJSONArray("data")
            val meta = json.optJSONObject("meta")
            return WidgetResponse(
                data = TaskItem.fromJsonArray(dataArray),
                count = meta?.optInt("count", dataArray.length()) ?: dataArray.length()
            )
        }
    }
}

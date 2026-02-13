package com.mysdamanager.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import com.mysdamanager.app.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class MyTasksWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "MyTasksWidget"
        const val ACTION_COMPLETE_TASK = "com.mysdamanager.app.widget.ACTION_COMPLETE_TASK"
        const val ACTION_REFRESH = "com.mysdamanager.app.widget.ACTION_REFRESH"
        const val EXTRA_TASK_ID = "extra_task_id"
        private const val MAX_TASKS = 6

        private const val COLOR_TEAL = "#0D9488"
        private const val COLOR_TEXT_PRIMARY = "#FFFFFF"
        private const val COLOR_TEXT_SECONDARY = "#9CA3AF"
        private const val COLOR_TEXT_MUTED = "#6B7280"
        private const val COLOR_OVERDUE = "#EF4444"

        fun refreshAllWidgets(context: Context) {
            try {
                val manager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(context, MyTasksWidgetProvider::class.java)
                val widgetIds = manager.getAppWidgetIds(componentName)
                if (widgetIds.isNotEmpty()) {
                    val intent = Intent(context, MyTasksWidgetProvider::class.java).apply {
                        action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                        putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds)
                    }
                    context.sendBroadcast(intent)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to refresh widgets", e)
            }
        }
    }

    private val coroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        Log.d(TAG, "onUpdate called for ${appWidgetIds.size} widgets")
        for (appWidgetId in appWidgetIds) {
            try {
                updateWidget(context, appWidgetManager, appWidgetId)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to update widget $appWidgetId", e)
                // Show a safe fallback view so the widget doesn't get removed
                try {
                    val fallback = buildSimpleView(context, "My tasks", "Tap to open")
                    appWidgetManager.updateAppWidget(appWidgetId, fallback)
                } catch (e2: Exception) {
                    Log.e(TAG, "Even fallback failed", e2)
                }
            }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        try {
            super.onReceive(context, intent)
            when (intent.action) {
                ACTION_COMPLETE_TASK -> {
                    val taskId = intent.getStringExtra(EXTRA_TASK_ID) ?: return
                    handleCompleteTask(context, taskId)
                }
                ACTION_REFRESH -> {
                    refreshAllWidgets(context)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "onReceive error", e)
        }
    }

    override fun onEnabled(context: Context) {
        Log.d(TAG, "Widget enabled")
    }

    override fun onDisabled(context: Context) {
        Log.d(TAG, "Widget disabled")
    }

    private fun updateWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        // FIRST: Always set a valid static view immediately (prevents widget removal on crash)
        val initialView = buildSimpleView(context, "My tasks", "Loading...")
        appWidgetManager.updateAppWidget(appWidgetId, initialView)
        Log.d(TAG, "Initial view set for widget $appWidgetId")

        // THEN: Fetch tasks in background
        coroutineScope.launch {
            try {
                val tokenManager = TokenManager(context)
                val token = tokenManager.getSessionToken()

                if (token == null) {
                    val views = buildNotLoggedInViews(context)
                    appWidgetManager.updateAppWidget(appWidgetId, views)
                    return@launch
                }

                val taskService = TaskService(context)
                val orgName = tokenManager.getOrgName()
                val result = taskService.fetchTasks(limit = MAX_TASKS)

                val views = when (result) {
                    is TaskFetchResult.Success -> {
                        buildTaskListViews(context, result.tasks, result.totalCount, orgName)
                    }
                    is TaskFetchResult.NotAuthenticated,
                    is TaskFetchResult.SessionExpired -> {
                        buildNotLoggedInViews(context)
                    }
                    is TaskFetchResult.Forbidden -> {
                        buildSimpleView(context, "My tasks", "Access denied")
                    }
                    is TaskFetchResult.Error -> {
                        buildSimpleView(context, "My tasks", result.message)
                    }
                }

                appWidgetManager.updateAppWidget(appWidgetId, views)
                Log.d(TAG, "Widget $appWidgetId updated with data")
            } catch (e: Exception) {
                Log.e(TAG, "Background fetch failed for widget $appWidgetId", e)
                try {
                    val errorView = buildSimpleView(context, "My tasks", "Unable to load")
                    appWidgetManager.updateAppWidget(appWidgetId, errorView)
                } catch (e2: Exception) {
                    Log.e(TAG, "Error view failed", e2)
                }
            }
        }
    }

    /**
     * Minimal safe view that cannot crash - just title + subtitle text.
     */
    private fun buildSimpleView(context: Context, title: String, subtitle: String): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_my_tasks)
        views.setTextViewText(R.id.widget_title, title)
        views.setTextViewText(R.id.widget_subtitle, subtitle)
        views.setViewVisibility(R.id.widget_task_container, View.GONE)
        views.setViewVisibility(R.id.widget_empty_state, View.GONE)
        views.setViewVisibility(R.id.widget_auth_state, View.GONE)
        views.setViewVisibility(R.id.widget_error_state, View.GONE)
        views.setViewVisibility(R.id.widget_footer, View.GONE)

        // Tap anywhere opens the app
        val openAppIntent = Intent(Intent.ACTION_VIEW, Uri.parse("mysdamanager://follow-ups"))
        val openAppPending = PendingIntent.getActivity(
            context, 100, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_title, openAppPending)

        return views
    }

    private fun buildTaskListViews(
        context: Context,
        tasks: List<TaskItem>,
        totalCount: Int,
        orgName: String?
    ): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_my_tasks)

        views.setTextViewText(R.id.widget_title, "My tasks")
        views.setTextViewText(R.id.widget_subtitle, orgName ?: "MySDAManager")
        views.setTextColor(R.id.widget_title, Color.parseColor(COLOR_TEXT_PRIMARY))
        views.setTextColor(R.id.widget_subtitle, Color.parseColor(COLOR_TEXT_SECONDARY))

        // "+" button
        val newTaskIntent = Intent(Intent.ACTION_VIEW, Uri.parse("mysdamanager://follow-ups/tasks/new"))
        val newTaskPending = PendingIntent.getActivity(
            context, 0, newTaskIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_add_button, newTaskPending)

        views.removeAllViews(R.id.widget_task_container)

        if (tasks.isEmpty()) {
            views.setViewVisibility(R.id.widget_empty_state, View.VISIBLE)
            views.setViewVisibility(R.id.widget_task_container, View.GONE)
            views.setViewVisibility(R.id.widget_footer, View.GONE)
        } else {
            views.setViewVisibility(R.id.widget_empty_state, View.GONE)
            views.setViewVisibility(R.id.widget_task_container, View.VISIBLE)

            val displayTasks = tasks.take(MAX_TASKS)
            for ((index, task) in displayTasks.withIndex()) {
                val taskRow = buildTaskRow(context, task)
                views.addView(R.id.widget_task_container, taskRow)

                if (index < displayTasks.size - 1) {
                    val divider = RemoteViews(context.packageName, R.layout.widget_divider)
                    views.addView(R.id.widget_task_container, divider)
                }
            }

            if (totalCount > MAX_TASKS) {
                views.setViewVisibility(R.id.widget_footer, View.VISIBLE)
                views.setTextViewText(R.id.widget_view_all, "View all $totalCount tasks")
                views.setTextColor(R.id.widget_view_all, Color.parseColor(COLOR_TEAL))

                val viewAllIntent = Intent(Intent.ACTION_VIEW, Uri.parse("mysdamanager://follow-ups"))
                val viewAllPending = PendingIntent.getActivity(
                    context, 1, viewAllIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_footer, viewAllPending)
            } else {
                views.setViewVisibility(R.id.widget_footer, View.GONE)
            }
        }

        views.setViewVisibility(R.id.widget_auth_state, View.GONE)
        views.setViewVisibility(R.id.widget_error_state, View.GONE)

        return views
    }

    private fun buildTaskRow(context: Context, task: TaskItem): RemoteViews {
        val row = RemoteViews(context.packageName, R.layout.widget_task_row)

        row.setInt(R.id.task_priority_circle, "setColorFilter", task.priorityColor)
        row.setTextViewText(R.id.task_title, task.title)
        row.setTextColor(R.id.task_title, Color.parseColor(COLOR_TEXT_PRIMARY))

        row.setTextViewText(R.id.task_due_date, task.dueDateFormatted)
        row.setTextColor(
            R.id.task_due_date,
            if (task.isOverdue) Color.parseColor(COLOR_OVERDUE)
            else Color.parseColor(COLOR_TEXT_SECONDARY)
        )

        row.setTextViewText(R.id.task_category, task.categoryLabel)
        row.setTextColor(R.id.task_category, Color.parseColor(COLOR_TEAL))

        val taskIntent = Intent(Intent.ACTION_VIEW, Uri.parse(task.deepLinkUri))
        val taskPending = PendingIntent.getActivity(
            context, task.id.hashCode(), taskIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        row.setOnClickPendingIntent(R.id.task_row_container, taskPending)

        val completeIntent = Intent(context, MyTasksWidgetProvider::class.java).apply {
            action = ACTION_COMPLETE_TASK
            putExtra(EXTRA_TASK_ID, task.id)
        }
        val completePending = PendingIntent.getBroadcast(
            context, ("complete_${task.id}").hashCode(), completeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        row.setOnClickPendingIntent(R.id.task_priority_circle, completePending)

        return row
    }

    private fun buildNotLoggedInViews(context: Context): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_my_tasks)

        views.setTextViewText(R.id.widget_title, "My tasks")
        views.setTextViewText(R.id.widget_subtitle, "MySDAManager")
        views.setTextColor(R.id.widget_title, Color.parseColor(COLOR_TEXT_PRIMARY))
        views.setTextColor(R.id.widget_subtitle, Color.parseColor(COLOR_TEXT_SECONDARY))

        views.setViewVisibility(R.id.widget_auth_state, View.VISIBLE)
        views.setViewVisibility(R.id.widget_task_container, View.GONE)
        views.setViewVisibility(R.id.widget_empty_state, View.GONE)
        views.setViewVisibility(R.id.widget_error_state, View.GONE)
        views.setViewVisibility(R.id.widget_footer, View.GONE)

        val loginIntent = Intent(Intent.ACTION_VIEW, Uri.parse("mysdamanager://login"))
        val loginPending = PendingIntent.getActivity(
            context, 2, loginIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_auth_state, loginPending)

        return views
    }

    private fun handleCompleteTask(context: Context, taskId: String) {
        coroutineScope.launch {
            try {
                val taskService = TaskService(context)
                val success = taskService.completeTask(taskId)
                Log.d(TAG, "Task $taskId complete: $success")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to complete task: $taskId", e)
            }
            refreshAllWidgets(context)
        }
    }
}

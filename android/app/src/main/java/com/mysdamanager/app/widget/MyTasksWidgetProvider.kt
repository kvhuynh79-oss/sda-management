package com.mysdamanager.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import com.mysdamanager.app.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * AppWidgetProvider for the MySDAManager "My Tasks" home screen widget.
 *
 * SAMSUNG ONE UI FIXES:
 * - Initial layout uses inline color (NOT drawable) to avoid inflation failures in launcher process
 * - NO layout_weight in any layout (Samsung fails to measure weighted views during placement)
 * - Data fetch is DELAYED 2s after placement via Handler to avoid race condition
 * - All updateAppWidget calls wrapped in try/catch to prevent placement rejection
 * - Widget info uses 3x2 default size (fits Galaxy Z Fold cover screen)
 * - previewLayout attribute set for Samsung One UI 6+ widget picker
 * - android:label set on receiver in manifest for Samsung widget discovery
 */
class MyTasksWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "MyTasksWidget"
        const val ACTION_COMPLETE_TASK = "com.mysdamanager.app.widget.ACTION_COMPLETE_TASK"
        const val ACTION_REFRESH = "com.mysdamanager.app.widget.ACTION_REFRESH"
        const val EXTRA_TASK_ID = "extra_task_id"
        private const val MAX_TASKS = 5
        // Delay before fetching data after placement - gives Samsung time to finish validation
        private const val PLACEMENT_DELAY_MS = 2000L

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

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        Log.d(TAG, "onUpdate called for ${appWidgetIds.size} widgets")
        for (appWidgetId in appWidgetIds) {
            // NUCLEAR TEST: Absolute minimum - just set the initial layout.
            // If this still fails on Samsung, the issue is environmental.
            try {
                val views = RemoteViews(context.packageName, R.layout.widget_my_tasks_initial)
                appWidgetManager.updateAppWidget(appWidgetId, views)
                Log.d(TAG, "Widget $appWidgetId: initial layout set OK")
            } catch (e: Exception) {
                Log.e(TAG, "Widget $appWidgetId: FAILED to set layout", e)
            }
        }

        // After all widgets get their initial layout, schedule data fetch
        for (appWidgetId in appWidgetIds) {
            val appContext = context.applicationContext
            val widgetId = appWidgetId
            Handler(Looper.getMainLooper()).postDelayed({
                fetchAndUpdateWidget(appContext, widgetId)
            }, PLACEMENT_DELAY_MS)
        }
    }

    /**
     * Fetches task data in a background coroutine and updates the widget.
     * Called from a delayed Handler post to avoid Samsung placement race conditions.
     */
    private fun fetchAndUpdateWidget(context: Context, appWidgetId: Int) {
        val appWidgetManager = AppWidgetManager.getInstance(context) ?: return
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            try {
                updateWidgetWithData(context, appWidgetManager, appWidgetId)
            } catch (e: Exception) {
                Log.e(TAG, "Background update failed for widget $appWidgetId", e)
                try {
                    val errorView = buildSimpleView(context, appWidgetId, "My tasks", "Unable to load")
                    appWidgetManager.updateAppWidget(appWidgetId, errorView)
                } catch (e2: Exception) {
                    Log.e(TAG, "Error view also failed for widget $appWidgetId", e2)
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

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle
    ) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        Log.d(TAG, "onAppWidgetOptionsChanged for widget $appWidgetId")
        // When options change (e.g. resize), re-run the update logic to redraw the widget.
        // This will re-trigger the initial layout -> background data load flow.
        refreshAllWidgets(context)
    }

    /**
     * Fetches task data and updates the widget with the full layout.
     * Called from a background coroutine with goAsync() keeping the receiver alive.
     */
    private fun updateWidgetWithData(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val tokenManager = TokenManager(context)
        val token = tokenManager.getSessionToken()

        if (token == null) {
            val views = buildNotLoggedInViews(context, appWidgetId)
            appWidgetManager.updateAppWidget(appWidgetId, views)
            return
        }

        val taskService = TaskService(context)
        val orgName = tokenManager.getOrgName()
        val result = taskService.fetchTasks(limit = MAX_TASKS)

        val views = when (result) {
            is TaskFetchResult.Success -> {
                buildTaskListViews(context, appWidgetId, result.tasks, result.totalCount, orgName)
            }
            is TaskFetchResult.NotAuthenticated,
            is TaskFetchResult.SessionExpired -> {
                buildNotLoggedInViews(context, appWidgetId)
            }
            is TaskFetchResult.Forbidden -> {
                buildSimpleView(context, appWidgetId, "My tasks", "Access denied")
            }
            is TaskFetchResult.Error -> {
                buildSimpleView(context, appWidgetId, "My tasks", result.message)
            }
        }

        appWidgetManager.updateAppWidget(appWidgetId, views)
        Log.d(TAG, "Widget $appWidgetId updated with data")
    }

    /**
     * Minimal safe view using the FULL layout - just title + subtitle text, all containers hidden.
     * Used for error/fallback states after the initial placement has already succeeded.
     */
    private fun buildSimpleView(context: Context, appWidgetId: Int, title: String, subtitle: String): RemoteViews {
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
            context, 100 + appWidgetId, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_title, openAppPending)

        return views
    }

    private fun buildTaskListViews(
        context: Context,
        appWidgetId: Int,
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
            context, appWidgetId * 10, newTaskIntent,
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
                val taskRow = buildTaskRow(context, appWidgetId, task)
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
                    context, appWidgetId * 10 + 1, viewAllIntent,
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

    private fun buildTaskRow(context: Context, appWidgetId: Int, task: TaskItem): RemoteViews {
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

    private fun buildNotLoggedInViews(context: Context, appWidgetId: Int): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_my_tasks)

        views.setTextViewText(R.id.widget_title, "My tasks")
        views.setTextViewText(R.id.widget_subtitle, "MySDAManager")
        views.setTextColor(R.id.widget_title, Color.parseColor(COLOR_TEXT_PRIMARY))
        views.setTextColor(R.id.widget_subtitle, Color.parseColor(COLOR_TEXT_SECONDARY))

        views.setViewVisibility(R.id.widget_auth_state, View.VISIBLE)
        views.setTextViewText(R.id.widget_auth_text, "Open app to sign in")
        views.setViewVisibility(R.id.widget_task_container, View.GONE)
        views.setViewVisibility(R.id.widget_empty_state, View.GONE)
        views.setViewVisibility(R.id.widget_error_state, View.GONE)
        views.setViewVisibility(R.id.widget_footer, View.GONE)

        val loginIntent = Intent(Intent.ACTION_VIEW, Uri.parse("mysdamanager://login"))
        val loginPending = PendingIntent.getActivity(
            context, appWidgetId * 10 + 2, loginIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_auth_state, loginPending)

        return views
    }

    private fun handleCompleteTask(context: Context, taskId: String) {
        val pendingResult = goAsync()
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            try {
                val taskService = TaskService(context)
                val success = taskService.completeTask(taskId)
                Log.d(TAG, "Task $taskId complete: $success")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to complete task: $taskId", e)
            } finally {
                try {
                    refreshAllWidgets(context)
                } catch (e: Exception) {
                    Log.e(TAG, "Refresh after complete failed", e)
                }
                try {
                    pendingResult.finish()
                } catch (e: Exception) {
                    Log.e(TAG, "pendingResult.finish() failed", e)
                }
            }
        }
    }
}

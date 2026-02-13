import WidgetKit
import SwiftUI

// MARK: - Timeline Provider

/// Provides timeline entries to WidgetKit for the My Tasks widget.
/// Fetches task data from the MySDAManager API and schedules refreshes every 15 minutes.
struct TaskTimelineProvider: TimelineProvider {

    // MARK: - Placeholder

    /// Returns a placeholder entry used during widget gallery preview.
    /// Shows realistic mock data so users can see what the widget looks like.
    func placeholder(in context: Context) -> TaskEntry {
        TaskEntry.placeholder
    }

    // MARK: - Snapshot

    /// Returns a single entry for the widget snapshot (used in widget gallery).
    /// Uses placeholder data in preview mode, otherwise fetches live data.
    func getSnapshot(in context: Context, completion: @escaping (TaskEntry) -> Void) {
        if context.isPreview {
            completion(TaskEntry.placeholder)
            return
        }

        Task {
            let entry = await fetchEntry(maxTasks: maxTasks(for: context.family))
            completion(entry)
        }
    }

    // MARK: - Timeline

    /// Generates a timeline of entries for the widget.
    /// Fetches current tasks and schedules the next refresh in 15 minutes.
    func getTimeline(in context: Context, completion: @escaping (Timeline<TaskEntry>) -> Void) {
        Task {
            let entry = await fetchEntry(maxTasks: maxTasks(for: context.family))

            // Refresh every 15 minutes to keep tasks current
            let refreshDate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
            let timeline = Timeline(entries: [entry], policy: .after(refreshDate))
            completion(timeline)
        }
    }

    // MARK: - Data Fetching

    /// Fetches task data from the API and constructs a timeline entry.
    /// Handles authentication state, errors, and caching gracefully.
    private func fetchEntry(maxTasks: Int) async -> TaskEntry {
        // Check authentication first
        guard SharedStorage.getSessionToken() != nil else {
            return TaskEntry.notLoggedIn
        }

        let orgName = SharedStorage.getOrgName()

        let result = await TaskService.fetchTasks(limit: maxTasks)

        switch result {
        case .success(let tasks):
            return TaskEntry(
                date: Date(),
                tasks: tasks,
                isLoggedIn: true,
                errorMessage: nil,
                orgName: orgName
            )

        case .failure(let error):
            let widgetError = error as? WidgetError
            let isAuthError = widgetError == .sessionExpired || widgetError == .notAuthenticated

            if isAuthError {
                return TaskEntry(
                    date: Date(),
                    tasks: [],
                    isLoggedIn: false,
                    errorMessage: nil,
                    orgName: nil
                )
            }

            // For non-auth errors, show the error message
            // (TaskService already tried the cache fallback)
            return TaskEntry(
                date: Date(),
                tasks: [],
                isLoggedIn: true,
                errorMessage: error.localizedDescription,
                orgName: orgName
            )
        }
    }

    /// Returns the maximum number of tasks to display based on widget size.
    private func maxTasks(for family: WidgetFamily) -> Int {
        switch family {
        case .systemSmall:  return 3
        case .systemMedium: return 3
        case .systemLarge:  return 8
        default:            return 5
        }
    }
}

// MARK: - Equatable Conformance for WidgetError

extension WidgetError: Equatable {
    static func == (lhs: WidgetError, rhs: WidgetError) -> Bool {
        switch (lhs, rhs) {
        case (.notAuthenticated, .notAuthenticated),
             (.sessionExpired, .sessionExpired),
             (.forbidden, .forbidden),
             (.invalidURL, .invalidURL),
             (.invalidResponse, .invalidResponse),
             (.rateLimited, .rateLimited):
            return true
        case (.serverError(let a), .serverError(let b)):
            return a == b
        case (.unexpectedStatus(let a), .unexpectedStatus(let b)):
            return a == b
        case (.decodingFailed(let a), .decodingFailed(let b)):
            return a == b
        default:
            return false
        }
    }
}

// MARK: - Widget Bundle

/// The widget bundle that registers all MySDAManager widgets.
/// Currently contains only the My Tasks widget, but can be extended
/// with additional widgets (e.g., maintenance overview, alerts count).
@main
struct MyTasksWidgetBundle: WidgetBundle {
    var body: some Widget {
        MyTasksWidget()
    }
}

// MARK: - Widget Configuration

/// The My Tasks widget configuration.
/// Supports three sizes: small (3 tasks), medium (3 tasks with detail), large (8 tasks).
struct MyTasksWidget: Widget {
    let kind = "MyTasksWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TaskTimelineProvider()) { entry in
            TaskWidgetView(entry: entry)
        }
        .configurationDisplayName("My Tasks")
        .description("View your upcoming tasks from MySDAManager. Stay on top of follow-ups, funding reviews, and maintenance requests.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

// MARK: - Widget Reload Helper

/// Call this from the main app whenever tasks are modified to refresh the widget immediately.
/// Usage: `MyTasksWidgetReloader.reload()`
enum MyTasksWidgetReloader {
    static func reload() {
        WidgetCenter.shared.reloadTimelines(ofKind: "MyTasksWidget")
    }

    /// Reload all MySDAManager widgets (useful after login/logout).
    static func reloadAll() {
        WidgetCenter.shared.reloadAllTimelines()
    }
}

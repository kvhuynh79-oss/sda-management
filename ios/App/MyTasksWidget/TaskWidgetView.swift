import SwiftUI
import WidgetKit

// MARK: - Design Tokens

private enum WidgetColors {
    static let background = Color(red: 17/255, green: 24/255, blue: 39/255)     // #111827
    static let cardBackground = Color(red: 31/255, green: 41/255, blue: 55/255)  // #1F2937
    static let teal = Color(red: 13/255, green: 148/255, blue: 136/255)          // #0D9488
    static let textPrimary = Color.white
    static let textSecondary = Color(red: 156/255, green: 163/255, blue: 175/255) // #9CA3AF
    static let textMuted = Color(red: 107/255, green: 114/255, blue: 128/255)     // #6B7280
    static let overdue = Color(red: 239/255, green: 68/255, blue: 68/255)         // #EF4444
    static let divider = Color(red: 55/255, green: 65/255, blue: 81/255)          // #374151

    static func priorityColor(for priority: String) -> Color {
        switch TaskPriority.from(priority) {
        case .urgent: return Color(red: 239/255, green: 68/255, blue: 68/255)   // Red
        case .high:   return Color(red: 249/255, green: 115/255, blue: 22/255)  // Orange
        case .medium: return Color(red: 234/255, green: 179/255, blue: 8/255)   // Yellow
        case .low:    return Color(red: 156/255, green: 163/255, blue: 175/255) // Gray
        }
    }
}

// MARK: - Main Widget View (Size Router)

struct TaskWidgetView: View {
    let entry: TaskEntry

    @Environment(\.widgetFamily) var family

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                SmallTaskWidgetView(entry: entry)
            case .systemMedium:
                MediumTaskWidgetView(entry: entry)
            case .systemLarge:
                LargeTaskWidgetView(entry: entry)
            default:
                MediumTaskWidgetView(entry: entry)
            }
        }
        .containerBackground(WidgetColors.background, for: .widget)
    }
}

// MARK: - Small Widget (3 tasks max)

struct SmallTaskWidgetView: View {
    let entry: TaskEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Header
            SmallWidgetHeader()

            if !entry.isLoggedIn {
                Spacer()
                NotLoggedInView(compact: true)
                Spacer()
            } else if let errorMessage = entry.errorMessage {
                Spacer()
                ErrorView(message: errorMessage, compact: true)
                Spacer()
            } else if entry.tasks.isEmpty {
                Spacer()
                EmptyTasksView(compact: true)
                Spacer()
            } else {
                // Task list (max 3 for small widget)
                ForEach(Array(entry.tasks.prefix(3))) { task in
                    Link(destination: task.deepLinkURL) {
                        CompactTaskRow(task: task)
                    }
                }

                Spacer(minLength: 0)

                if entry.tasks.count > 3 {
                    Link(destination: URL(string: "mysdamanager://follow-ups")!) {
                        Text("+\(entry.tasks.count - 3) more")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(WidgetColors.teal)
                    }
                }
            }
        }
        .padding(2)
    }
}

struct SmallWidgetHeader: View {
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 1) {
                Text("My tasks")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(WidgetColors.textPrimary)
            }
            Spacer()
            Link(destination: URL(string: "mysdamanager://follow-ups/tasks/new")!) {
                ZStack {
                    Circle()
                        .fill(WidgetColors.teal)
                        .frame(width: 20, height: 20)
                    Image(systemName: "plus")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.white)
                }
            }
        }
    }
}

// MARK: - Medium Widget (3 tasks with more detail)

struct MediumTaskWidgetView: View {
    let entry: TaskEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Header
            WidgetHeader(orgName: entry.orgName)

            if !entry.isLoggedIn {
                Spacer()
                NotLoggedInView(compact: false)
                Spacer()
            } else if let errorMessage = entry.errorMessage {
                Spacer()
                ErrorView(message: errorMessage, compact: false)
                Spacer()
            } else if entry.tasks.isEmpty {
                Spacer()
                EmptyTasksView(compact: false)
                Spacer()
            } else {
                // Task list (max 3 for medium widget)
                ForEach(Array(entry.tasks.prefix(3))) { task in
                    Link(destination: task.deepLinkURL) {
                        TaskRow(task: task)
                    }
                    if task.id != entry.tasks.prefix(3).last?.id {
                        Divider()
                            .background(WidgetColors.divider)
                    }
                }

                Spacer(minLength: 0)

                if entry.tasks.count > 3 {
                    HStack {
                        Spacer()
                        Link(destination: URL(string: "mysdamanager://follow-ups")!) {
                            Text("View all \(entry.tasks.count) tasks")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(WidgetColors.teal)
                        }
                    }
                }
            }
        }
        .padding(2)
    }
}

// MARK: - Large Widget (8 tasks with "View all")

struct LargeTaskWidgetView: View {
    let entry: TaskEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            // Header
            WidgetHeader(orgName: entry.orgName)

            if !entry.isLoggedIn {
                Spacer()
                NotLoggedInView(compact: false)
                Spacer()
            } else if let errorMessage = entry.errorMessage {
                Spacer()
                ErrorView(message: errorMessage, compact: false)
                Spacer()
            } else if entry.tasks.isEmpty {
                Spacer()
                EmptyTasksView(compact: false)
                Spacer()
            } else {
                // Task list (max 8 for large widget)
                ForEach(Array(entry.tasks.prefix(8))) { task in
                    Link(destination: task.deepLinkURL) {
                        TaskRow(task: task)
                    }
                    if task.id != entry.tasks.prefix(8).last?.id {
                        Divider()
                            .background(WidgetColors.divider)
                    }
                }

                Spacer(minLength: 0)

                // Footer
                HStack {
                    // Cache timestamp
                    if let cacheDate = SharedStorage.getCacheTimestamp() {
                        Text("Updated \(cacheDate, style: .relative) ago")
                            .font(.system(size: 9))
                            .foregroundColor(WidgetColors.textMuted)
                    }

                    Spacer()

                    Link(destination: URL(string: "mysdamanager://follow-ups")!) {
                        HStack(spacing: 4) {
                            Text("View all tasks")
                                .font(.system(size: 12, weight: .semibold))
                            Image(systemName: "arrow.right")
                                .font(.system(size: 10, weight: .semibold))
                        }
                        .foregroundColor(WidgetColors.teal)
                    }
                }
                .padding(.top, 2)
            }
        }
        .padding(2)
    }
}

// MARK: - Shared Header

struct WidgetHeader: View {
    let orgName: String?

    var body: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 1) {
                Text("My tasks")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(WidgetColors.textPrimary)
                Text(orgName ?? "MySDAManager")
                    .font(.system(size: 11))
                    .foregroundColor(WidgetColors.textSecondary)
            }

            Spacer()

            Link(destination: URL(string: "mysdamanager://follow-ups/tasks/new")!) {
                ZStack {
                    Circle()
                        .fill(WidgetColors.teal)
                        .frame(width: 26, height: 26)
                    Image(systemName: "plus")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                }
            }
        }
        .padding(.bottom, 4)
    }
}

// MARK: - Task Row (Medium/Large)

struct TaskRow: View {
    let task: TaskItem

    var body: some View {
        HStack(alignment: .center, spacing: 10) {
            // Priority circle (checkbox style)
            PriorityCircle(priority: task.priority, size: 18)

            // Task details
            VStack(alignment: .leading, spacing: 2) {
                Text(task.title)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(WidgetColors.textPrimary)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    // Due date
                    HStack(spacing: 3) {
                        Image(systemName: "calendar")
                            .font(.system(size: 9))
                        Text(task.dueDateFormatted)
                            .font(.system(size: 11))
                    }
                    .foregroundColor(task.isOverdue ? WidgetColors.overdue : WidgetColors.textSecondary)

                    // Category badge
                    Text(categoryLabel(task.category))
                        .font(.system(size: 9, weight: .medium))
                        .foregroundColor(WidgetColors.teal)
                        .padding(.horizontal, 5)
                        .padding(.vertical, 1)
                        .background(
                            RoundedRectangle(cornerRadius: 4)
                                .fill(WidgetColors.teal.opacity(0.15))
                        )
                }
            }

            Spacer(minLength: 0)
        }
        .padding(.vertical, 2)
    }

    private func categoryLabel(_ category: String) -> String {
        switch category {
        case "funding":         return "Funding"
        case "plan_approval":   return "Plan"
        case "documentation":   return "Docs"
        case "follow_up":       return "Follow-up"
        case "general":         return "General"
        default:                return category.capitalized
        }
    }
}

// MARK: - Compact Task Row (Small Widget)

struct CompactTaskRow: View {
    let task: TaskItem

    var body: some View {
        HStack(alignment: .center, spacing: 6) {
            PriorityCircle(priority: task.priority, size: 14)

            VStack(alignment: .leading, spacing: 0) {
                Text(task.title)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(WidgetColors.textPrimary)
                    .lineLimit(1)

                Text(task.dueDateFormatted)
                    .font(.system(size: 9))
                    .foregroundColor(task.isOverdue ? WidgetColors.overdue : WidgetColors.textSecondary)
            }

            Spacer(minLength: 0)
        }
    }
}

// MARK: - Priority Circle

struct PriorityCircle: View {
    let priority: String
    let size: CGFloat

    var body: some View {
        Circle()
            .strokeBorder(WidgetColors.priorityColor(for: priority), lineWidth: size > 16 ? 2 : 1.5)
            .frame(width: size, height: size)
    }
}

// MARK: - State Views

struct NotLoggedInView: View {
    let compact: Bool

    var body: some View {
        VStack(spacing: compact ? 4 : 8) {
            if !compact {
                Image(systemName: "person.crop.circle.badge.questionmark")
                    .font(.system(size: 28))
                    .foregroundColor(WidgetColors.textMuted)
            }
            Text("Open app to sign in")
                .font(.system(size: compact ? 11 : 13))
                .foregroundColor(WidgetColors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
    }
}

struct EmptyTasksView: View {
    let compact: Bool

    var body: some View {
        VStack(spacing: compact ? 4 : 8) {
            if !compact {
                Image(systemName: "checkmark.circle")
                    .font(.system(size: 28))
                    .foregroundColor(WidgetColors.teal)
            }
            Text("No tasks due")
                .font(.system(size: compact ? 11 : 14, weight: .medium))
                .foregroundColor(WidgetColors.textSecondary)
            if !compact {
                Text("You're all caught up!")
                    .font(.system(size: 11))
                    .foregroundColor(WidgetColors.textMuted)
            }
        }
        .frame(maxWidth: .infinity)
    }
}

struct ErrorView: View {
    let message: String
    let compact: Bool

    var body: some View {
        VStack(spacing: compact ? 4 : 8) {
            if !compact {
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: 24))
                    .foregroundColor(WidgetColors.overdue)
            }
            Text(message)
                .font(.system(size: compact ? 10 : 12))
                .foregroundColor(WidgetColors.textSecondary)
                .multilineTextAlignment(.center)
            if !compact {
                Text("Tap to retry")
                    .font(.system(size: 10))
                    .foregroundColor(WidgetColors.teal)
            }
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Previews

#if DEBUG
struct TaskWidgetView_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            // Small - with tasks
            TaskWidgetView(entry: TaskEntry.placeholder)
                .previewContext(WidgetPreviewContext(family: .systemSmall))
                .previewDisplayName("Small - Tasks")

            // Medium - with tasks
            TaskWidgetView(entry: TaskEntry.placeholder)
                .previewContext(WidgetPreviewContext(family: .systemMedium))
                .previewDisplayName("Medium - Tasks")

            // Large - with tasks
            TaskWidgetView(entry: TaskEntry.placeholder)
                .previewContext(WidgetPreviewContext(family: .systemLarge))
                .previewDisplayName("Large - Tasks")

            // Small - not logged in
            TaskWidgetView(entry: TaskEntry.notLoggedIn)
                .previewContext(WidgetPreviewContext(family: .systemSmall))
                .previewDisplayName("Small - Not Logged In")

            // Medium - empty
            TaskWidgetView(entry: TaskEntry(
                date: Date(),
                tasks: [],
                isLoggedIn: true,
                errorMessage: nil,
                orgName: "Better Living Solutions"
            ))
                .previewContext(WidgetPreviewContext(family: .systemMedium))
                .previewDisplayName("Medium - Empty")

            // Medium - error
            TaskWidgetView(entry: TaskEntry.error)
                .previewContext(WidgetPreviewContext(family: .systemMedium))
                .previewDisplayName("Medium - Error")
        }
    }
}
#endif

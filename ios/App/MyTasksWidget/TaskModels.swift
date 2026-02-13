import Foundation
import WidgetKit

// MARK: - API Response Models

struct TaskItem: Identifiable, Codable, Equatable {
    let id: String
    let title: String
    let dueDate: String
    let priority: String
    let status: String
    let category: String
    let isOverdue: Bool

    /// Returns the due date parsed from ISO string (YYYY-MM-DD)
    var dueDateFormatted: String {
        let inputFormatter = DateFormatter()
        inputFormatter.dateFormat = "yyyy-MM-dd"
        inputFormatter.locale = Locale(identifier: "en_AU")

        guard let date = inputFormatter.date(from: dueDate) else {
            return dueDate
        }

        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            return "Today"
        } else if calendar.isDateInTomorrow(date) {
            return "Tomorrow"
        } else if calendar.isDateInYesterday(date) {
            return "Yesterday"
        }

        let outputFormatter = DateFormatter()
        outputFormatter.locale = Locale(identifier: "en_AU")

        // If the date is within the next 7 days, show day name
        if let daysDiff = calendar.dateComponents([.day], from: calendar.startOfDay(for: Date()), to: calendar.startOfDay(for: date)).day,
           daysDiff > 0, daysDiff <= 7 {
            outputFormatter.dateFormat = "EEEE"
        } else {
            outputFormatter.dateFormat = "d MMM"
        }

        return outputFormatter.string(from: date)
    }

    /// Deep link URL to open this task in the app
    var deepLinkURL: URL {
        URL(string: "mysdamanager://follow-ups/tasks/\(id)")!
    }
}

struct WidgetResponse: Codable {
    let data: [TaskItem]
    let count: Int
}

// MARK: - Widget Timeline Entry

struct TaskEntry: TimelineEntry {
    let date: Date
    let tasks: [TaskItem]
    let isLoggedIn: Bool
    let errorMessage: String?
    let orgName: String?

    static var placeholder: TaskEntry {
        TaskEntry(
            date: Date(),
            tasks: [
                TaskItem(
                    id: "1",
                    title: "Review participant plan",
                    dueDate: "2026-02-15",
                    priority: "high",
                    status: "pending",
                    category: "plan_approval",
                    isOverdue: false
                ),
                TaskItem(
                    id: "2",
                    title: "Submit maintenance report",
                    dueDate: "2026-02-14",
                    priority: "medium",
                    status: "in_progress",
                    category: "documentation",
                    isOverdue: false
                ),
                TaskItem(
                    id: "3",
                    title: "Call support coordinator",
                    dueDate: "2026-02-13",
                    priority: "urgent",
                    status: "pending",
                    category: "follow_up",
                    isOverdue: true
                ),
                TaskItem(
                    id: "4",
                    title: "Update SDA funding records",
                    dueDate: "2026-02-16",
                    priority: "low",
                    status: "pending",
                    category: "funding",
                    isOverdue: false
                ),
                TaskItem(
                    id: "5",
                    title: "Schedule property inspection",
                    dueDate: "2026-02-17",
                    priority: "medium",
                    status: "pending",
                    category: "general",
                    isOverdue: false
                ),
                TaskItem(
                    id: "6",
                    title: "Follow up with OT assessment",
                    dueDate: "2026-02-18",
                    priority: "high",
                    status: "pending",
                    category: "follow_up",
                    isOverdue: false
                ),
                TaskItem(
                    id: "7",
                    title: "Process monthly SDA payments",
                    dueDate: "2026-02-19",
                    priority: "urgent",
                    status: "pending",
                    category: "funding",
                    isOverdue: false
                ),
                TaskItem(
                    id: "8",
                    title: "Review incident report #47",
                    dueDate: "2026-02-20",
                    priority: "high",
                    status: "pending",
                    category: "documentation",
                    isOverdue: false
                ),
            ],
            isLoggedIn: true,
            errorMessage: nil,
            orgName: "Better Living Solutions"
        )
    }

    static var notLoggedIn: TaskEntry {
        TaskEntry(
            date: Date(),
            tasks: [],
            isLoggedIn: false,
            errorMessage: nil,
            orgName: nil
        )
    }

    static var error: TaskEntry {
        TaskEntry(
            date: Date(),
            tasks: [],
            isLoggedIn: true,
            errorMessage: "Unable to load tasks",
            orgName: nil
        )
    }
}

// MARK: - Priority Colors

enum TaskPriority: String {
    case urgent
    case high
    case medium
    case low

    /// Returns the color associated with this priority level
    var colorHex: UInt {
        switch self {
        case .urgent: return 0xEF4444  // Red
        case .high:   return 0xF97316  // Orange
        case .medium: return 0xEAB308  // Yellow
        case .low:    return 0x9CA3AF  // Gray
        }
    }

    static func from(_ string: String) -> TaskPriority {
        TaskPriority(rawValue: string.lowercased()) ?? .low
    }
}

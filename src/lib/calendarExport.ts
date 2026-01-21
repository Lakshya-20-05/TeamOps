import type { Task } from '../db/schemas';

/**
 * Format a date as ICS datetime (YYYYMMDDTHHMMSS format)
 */
function formatICSDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return (
        date.getFullYear().toString() +
        pad(date.getMonth() + 1) +
        pad(date.getDate()) +
        'T' +
        pad(date.getHours()) +
        pad(date.getMinutes()) +
        pad(date.getSeconds())
    );
}

/**
 * Escape special characters for ICS format
 */
function escapeICS(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

/**
 * Generate ICS content for a list of tasks with deadlines
 */
export function generateICS(tasks: Task[], calendarName = 'TeamOps Tasks'): string {
    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//TeamOps//Task Calendar//EN',
        `X-WR-CALNAME:${escapeICS(calendarName)}`,
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ];

    const tasksWithDeadlines = tasks.filter(t => t.deadline && t.status !== 'done');

    for (const task of tasksWithDeadlines) {
        const deadline = new Date(task.deadline!);
        const now = new Date();

        // Create an all-day event for the deadline
        const dateStr = deadline.toISOString().split('T')[0].replace(/-/g, '');

        lines.push(
            'BEGIN:VEVENT',
            `UID:${task.id}@teamops`,
            `DTSTAMP:${formatICSDate(now)}`,
            `DTSTART;VALUE=DATE:${dateStr}`,
            `DTEND;VALUE=DATE:${dateStr}`,
            `SUMMARY:${escapeICS(task.title)}`,
            task.description ? `DESCRIPTION:${escapeICS(task.description)}` : '',
            `STATUS:${task.status === 'in-progress' ? 'IN-PROGRESS' : 'NEEDS-ACTION'}`,
            task.priority === 'high' ? 'PRIORITY:1' : task.priority === 'medium' ? 'PRIORITY:5' : 'PRIORITY:9',
            'END:VEVENT'
        );
    }

    lines.push('END:VCALENDAR');

    // Filter out empty lines and join
    return lines.filter(l => l).join('\r\n');
}

/**
 * Download ICS file
 */
export function downloadICS(tasks: Task[], filename = 'teamops-deadlines.ics', calendarName?: string): void {
    const icsContent = generateICS(tasks, calendarName);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Download ICS for a single task
 */
export function downloadTaskICS(task: Task): void {
    if (!task.deadline) return;
    downloadICS([task], `${task.title.replace(/[^a-z0-9]/gi, '-')}.ics`);
}

/**
 * Escape CSV field (handle commas, quotes, newlines)
 */
function escapeCSV(text: string | undefined): string {
    if (!text) return '';
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

/**
 * Generate CSV content for tasks with deadlines
 */
export function generateCSV(tasks: Task[]): string {
    const headers = ['Title', 'Description', 'Deadline', 'Priority', 'Status', 'Created At'];
    const rows = [headers.join(',')];

    const tasksWithDeadlines = tasks.filter(t => t.deadline);

    for (const task of tasksWithDeadlines) {
        const deadline = task.deadline ? new Date(task.deadline).toLocaleDateString() : '';
        const created = task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '';

        rows.push([
            escapeCSV(task.title),
            escapeCSV(task.description),
            deadline,
            task.priority || 'medium',
            task.status,
            created
        ].join(','));
    }

    return rows.join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(tasks: Task[], filename = 'teamops-deadlines.csv'): void {
    const csvContent = generateCSV(tasks);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

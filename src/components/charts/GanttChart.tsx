import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { format, parseISO, addDays, differenceInDays, startOfDay } from 'date-fns';
import { cn } from '../../lib/utils';

interface GanttTask {
    id: string;
    title: string;
    start: string; // createdAt
    end?: string;  // deadline or completedAt
    status: 'todo' | 'in-progress' | 'done';
    priority?: 'low' | 'medium' | 'high';
    assignee?: string;
}

interface GanttChartProps {
    tasks: GanttTask[];
    title?: string;
}

// Simple React-based Gantt chart (no external library required for basic functionality)
export const GanttChart: React.FC<GanttChartProps> = ({ tasks, title = "Task Timeline" }) => {
    if (tasks.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[250px] text-muted-foreground">
                    No tasks with deadlines
                </CardContent>
            </Card>
        );
    }

    // Calculate date range
    const today = startOfDay(new Date());
    const dates = tasks.flatMap(t => {
        const dates: Date[] = [parseISO(t.start)];
        if (t.end) dates.push(parseISO(t.end));
        return dates;
    });

    const minDate = startOfDay(new Date(Math.min(...dates.map(d => d.getTime()), today.getTime())));
    const maxDate = startOfDay(addDays(new Date(Math.max(...dates.map(d => d.getTime()), addDays(today, 7).getTime())), 1));
    const totalDays = differenceInDays(maxDate, minDate);

    // Generate column headers (every 2 days for larger ranges)
    const step = totalDays > 14 ? 3 : totalDays > 7 ? 2 : 1;
    const headers: { date: Date; label: string }[] = [];
    for (let i = 0; i <= totalDays; i += step) {
        const date = addDays(minDate, i);
        headers.push({ date, label: format(date, 'MMM d') });
    }

    const getBarStyle = (task: GanttTask) => {
        const start = startOfDay(parseISO(task.start));
        const end = task.end ? startOfDay(parseISO(task.end)) : addDays(start, 1);

        const startOffset = (differenceInDays(start, minDate) / totalDays) * 100;
        const duration = Math.max(1, differenceInDays(end, start));
        const width = (duration / totalDays) * 100;

        let bgColor = 'bg-blue-500';
        if (task.status === 'done') bgColor = 'bg-emerald-500';
        else if (task.status === 'in-progress') bgColor = 'bg-yellow-500';
        else if (task.priority === 'high') bgColor = 'bg-red-500';

        return { left: `${startOffset}%`, width: `${Math.max(width, 3)}%`, bgColor };
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <div className="min-w-[600px]">
                    {/* Header Row */}
                    <div className="flex border-b pb-2 mb-2">
                        <div className="w-32 flex-shrink-0 text-xs font-medium text-muted-foreground">Task</div>
                        <div className="flex-1 flex">
                            {headers.map((h, i) => (
                                <div
                                    key={i}
                                    className="flex-1 text-xs text-center text-muted-foreground"
                                    style={{ minWidth: '60px' }}
                                >
                                    {h.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Task Rows */}
                    {tasks.slice(0, 8).map(task => {
                        const style = getBarStyle(task);
                        return (
                            <div key={task.id} className="flex items-center py-1.5 border-b border-muted/30">
                                <div className="w-32 flex-shrink-0 text-sm truncate pr-2" title={task.title}>
                                    {task.title}
                                </div>
                                <div className="flex-1 relative h-6">
                                    <div
                                        className={cn("absolute h-5 rounded-full opacity-80", style.bgColor)}
                                        style={{ left: style.left, width: style.width }}
                                        title={`${task.title}: ${format(parseISO(task.start), 'MMM d')} - ${task.end ? format(parseISO(task.end), 'MMM d') : 'No deadline'}`}
                                    />
                                </div>
                            </div>
                        );
                    })}

                    {tasks.length > 8 && (
                        <div className="text-xs text-muted-foreground text-center py-2">
                            +{tasks.length - 8} more tasks
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

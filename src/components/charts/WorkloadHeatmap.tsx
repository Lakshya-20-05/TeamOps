import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';
import { format, startOfWeek, addDays, parseISO, isWithinInterval } from 'date-fns';

interface WorkloadTask {
    assigneeId: string;
    assigneeName: string;
    deadline?: string;
    priority?: 'low' | 'medium' | 'high';
    status: string;
}

interface WorkloadHeatmapProps {
    tasks: WorkloadTask[];
    title?: string;
}

export const WorkloadHeatmap: React.FC<WorkloadHeatmapProps> = ({ tasks, title = "Workload Distribution" }) => {
    // Get unique members
    const memberMap = new Map<string, string>();
    tasks.forEach(t => {
        if (t.assigneeId && !memberMap.has(t.assigneeId)) {
            memberMap.set(t.assigneeId, t.assigneeName);
        }
    });
    const members = Array.from(memberMap.entries());

    if (members.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
                    No workload data
                </CardContent>
            </Card>
        );
    }

    // Generate 4 weeks starting from current week
    const weeks: { start: Date; end: Date; label: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 4; i++) {
        const start = startOfWeek(addDays(today, i * 7), { weekStartsOn: 1 });
        const end = addDays(start, 6);
        weeks.push({
            start,
            end,
            label: `${format(start, 'MMM d')}`
        });
    }

    // Calculate intensity for each cell
    const getIntensity = (memberId: string, week: { start: Date; end: Date }) => {
        const memberTasks = tasks.filter(t => {
            if (t.assigneeId !== memberId) return false;
            if (!t.deadline) return false;
            const deadline = parseISO(t.deadline);
            return isWithinInterval(deadline, { start: week.start, end: week.end });
        });

        const count = memberTasks.length;
        const hasHigh = memberTasks.some(t => t.priority === 'high');

        if (count === 0) return { level: 0, count };
        if (count === 1) return { level: 1, count };
        if (count === 2) return { level: 2, count };
        if (count >= 3 || hasHigh) return { level: 3, count };
        return { level: 2, count };
    };

    const getIntensityColor = (level: number) => {
        switch (level) {
            case 0: return 'bg-muted/30';
            case 1: return 'bg-emerald-500/40';
            case 2: return 'bg-yellow-500/60';
            case 3: return 'bg-red-500/70';
            default: return 'bg-muted/30';
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <div className="min-w-[400px]">
                        {/* Header Row */}
                        <div className="flex border-b pb-2 mb-2">
                            <div className="w-28 flex-shrink-0 text-xs font-medium text-muted-foreground">Member</div>
                            {weeks.map((week, i) => (
                                <div key={i} className="flex-1 text-xs text-center text-muted-foreground">
                                    {week.label}
                                </div>
                            ))}
                        </div>

                        {/* Member Rows */}
                        {members.slice(0, 6).map(([id, name]) => (
                            <div key={id} className="flex items-center py-1">
                                <div className="w-28 flex-shrink-0 text-sm truncate pr-2" title={name}>
                                    {name}
                                </div>
                                <div className="flex-1 flex gap-1">
                                    {weeks.map((week, i) => {
                                        const { level, count } = getIntensity(id, week);
                                        return (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "flex-1 h-8 rounded flex items-center justify-center text-xs font-medium",
                                                    getIntensityColor(level),
                                                    level > 0 && "text-foreground"
                                                )}
                                                title={`${name}: ${count} task(s) due`}
                                            >
                                                {count > 0 && count}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {members.length > 6 && (
                            <div className="text-xs text-muted-foreground text-center py-2">
                                +{members.length - 6} more members
                            </div>
                        )}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <div className={cn("w-3 h-3 rounded", getIntensityColor(0))} />
                        <span>None</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className={cn("w-3 h-3 rounded", getIntensityColor(1))} />
                        <span>Light</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className={cn("w-3 h-3 rounded", getIntensityColor(2))} />
                        <span>Moderate</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className={cn("w-3 h-3 rounded", getIntensityColor(3))} />
                        <span>Heavy</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

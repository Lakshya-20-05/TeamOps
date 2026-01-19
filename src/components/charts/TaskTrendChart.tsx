import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { format, subDays, startOfDay, isBefore, parseISO } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface TaskTrendChartProps {
    tasks: Array<{
        createdAt: string;
        completedAt?: string;
        status: string;
    }>;
    days?: number;
}

export const TaskTrendChart: React.FC<TaskTrendChartProps> = ({ tasks, days = 7 }) => {
    // Generate last N days
    const labels: string[] = [];
    const createdData: number[] = [];
    const completedData: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
        const date = startOfDay(subDays(new Date(), i));
        const nextDate = startOfDay(subDays(new Date(), i - 1));
        labels.push(format(date, 'MMM d'));

        const created = tasks.filter(t => {
            const taskDate = parseISO(t.createdAt);
            return !isBefore(taskDate, date) && isBefore(taskDate, nextDate);
        }).length;

        const completed = tasks.filter(t => {
            if (!t.completedAt) return false;
            const taskDate = parseISO(t.completedAt);
            return !isBefore(taskDate, date) && isBefore(taskDate, nextDate);
        }).length;

        createdData.push(created);
        completedData.push(completed);
    }

    const hasData = createdData.some(v => v > 0) || completedData.some(v => v > 0);

    if (!hasData) {
        return (
            <Card className="col-span-2">
                <CardHeader>
                    <CardTitle className="text-base">Task Trend (Last {days} Days)</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
                    No recent activity
                </CardContent>
            </Card>
        );
    }

    const data = {
        labels,
        datasets: [
            {
                label: 'Created',
                data: createdData,
                borderColor: 'rgba(59, 130, 246, 1)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
            },
            {
                label: 'Completed',
                data: completedData,
                borderColor: 'rgba(34, 197, 94, 1)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                fill: true,
                tension: 0.4,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    usePointStyle: true,
                    padding: 20,
                }
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 1,
                },
            },
        },
    };

    return (
        <Card className="col-span-2">
            <CardHeader>
                <CardTitle className="text-base">Task Trend (Last {days} Days)</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px]">
                <Line data={data} options={options} />
            </CardContent>
        </Card>
    );
};

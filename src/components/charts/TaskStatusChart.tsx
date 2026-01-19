import React from 'react';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

ChartJS.register(ArcElement, Tooltip, Legend);

interface TaskStatusChartProps {
    todo: number;
    inProgress: number;
    done: number;
}

export const TaskStatusChart: React.FC<TaskStatusChartProps> = ({ todo, inProgress, done }) => {
    const total = todo + inProgress + done;

    if (total === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Task Status</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
                    No tasks yet
                </CardContent>
            </Card>
        );
    }

    const data = {
        labels: ['To Do', 'In Progress', 'Done'],
        datasets: [
            {
                data: [todo, inProgress, done],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',  // Blue
                    'rgba(234, 179, 8, 0.8)',   // Yellow
                    'rgba(34, 197, 94, 0.8)',   // Green
                ],
                borderColor: [
                    'rgba(59, 130, 246, 1)',
                    'rgba(234, 179, 8, 1)',
                    'rgba(34, 197, 94, 1)',
                ],
                borderWidth: 2,
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
        cutout: '60%',
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Task Status</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px]">
                <Doughnut data={data} options={options} />
            </CardContent>
        </Card>
    );
};

import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface PriorityChartProps {
    low: number;
    medium: number;
    high: number;
}

export const PriorityChart: React.FC<PriorityChartProps> = ({ low, medium, high }) => {
    const total = low + medium + high;

    if (total === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Priority Distribution</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
                    No tasks yet
                </CardContent>
            </Card>
        );
    }

    const data = {
        labels: ['Low', 'Medium', 'High'],
        datasets: [
            {
                label: 'Tasks',
                data: [low, medium, high],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',   // Blue
                    'rgba(234, 179, 8, 0.8)',    // Yellow
                    'rgba(239, 68, 68, 0.8)',    // Red
                ],
                borderColor: [
                    'rgba(59, 130, 246, 1)',
                    'rgba(234, 179, 8, 1)',
                    'rgba(239, 68, 68, 1)',
                ],
                borderWidth: 2,
                borderRadius: 8,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
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
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Priority Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px]">
                <Bar data={data} options={options} />
            </CardContent>
        </Card>
    );
};

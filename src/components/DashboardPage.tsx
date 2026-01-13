
import React, { useEffect, useState } from 'react';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';

import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
    const db = useDatabase();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ teams: 0, tasks: 0, done: 0 });

    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const sub1 = db.teams.find().$.subscribe(teams => {
            const myTeams = teams.filter(t => t.members.some((m: any) => m.userId === user.id));
            setStats(s => ({ ...s, teams: myTeams.length }));
        });

        const sub2 = db.tasks.find().$.subscribe(tasks => {
            // In a real app we'd filter tasks properly here too, but for dash count we can approximate or do full filter
            // to match TasksPage logic:
            db.teams.find().exec().then(allTeams => {
                const myTeamIds = allTeams
                    .filter(t => t.members.some((m: any) => m.userId === user.id))
                    .map(t => t.id);

                const myTasks = tasks.filter(t =>
                    t.assigneeId === user.id || (t.teamId && myTeamIds.includes(t.teamId))
                );

                const done = myTasks.filter(t => t.status === 'done').length;
                setStats(s => ({ ...s, tasks: myTasks.length, done }));
            });
        });

        return () => {
            sub1.unsubscribe();
            sub2.unsubscribe();
        };
    }, [db, user]);

    return (
        <div className="space-y-8">
            <div className="space-y-0.5">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground">Overview of your team's activity</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate('/app/teams')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.teams}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.tasks}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-500">{stats.done}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-muted/50 border-muted">
                <CardHeader>
                    <CardTitle>Welcome back</CardTitle>
                    <CardDescription>
                        Your workspace is fully synchronized. You can continue working offline, and changes will sync automatically.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
};


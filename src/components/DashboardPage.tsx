import React, { useEffect, useState } from 'react';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { useNavigate } from 'react-router-dom';
import { TaskStatusChart, PriorityChart, TaskTrendChart } from './charts';
import type { Task, Team, Invitation } from '../db/schemas';
import { Users, Clock, UserPlus, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { ReportExport } from './ReportExport';

export const DashboardPage: React.FC = () => {
    const db = useDatabase();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ teams: 0, tasks: 0, done: 0, inProgress: 0, todo: 0 });
    const [priorityStats, setPriorityStats] = useState({ low: 0, medium: 0, high: 0 });
    const [allTasks, setAllTasks] = useState<Task[]>([]);

    // Admin-specific state
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminTeams, setAdminTeams] = useState<Team[]>([]);
    const [pendingInvites, setPendingInvites] = useState<Invitation[]>([]);
    const [myAssignedTasks, setMyAssignedTasks] = useState<(Task & { teamName?: string })[]>([]);

    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const sub1 = db.teams.find().$.subscribe(teams => {
            const myTeams = teams.filter(t => t.members.some((m: any) => m.userId === user.id));
            setStats(s => ({ ...s, teams: myTeams.length }));

            // Check admin status
            const teamsWhereAdmin = teams.filter(t =>
                t.members.some((m: any) => m.userId === user.id && m.role === 'admin')
            );
            setIsAdmin(teamsWhereAdmin.length > 0);
            setAdminTeams(teamsWhereAdmin.map(t => t.toJSON() as Team));
        });

        const sub2 = db.tasks.find().$.subscribe(tasks => {
            db.teams.find().exec().then(allTeams => {
                const myTeamIds = allTeams
                    .filter(t => t.members.some((m: any) => m.userId === user.id))
                    .map(t => t.id);

                const myTasks = tasks.filter(t =>
                    t.assigneeId === user.id || (t.teamId && myTeamIds.includes(t.teamId))
                );

                const taskData = myTasks.map(t => t.toJSON() as Task);
                setAllTasks(taskData);

                // My assigned tasks (not done) with team names - only include if team exists
                const assigned = taskData
                    .filter(t => t.assigneeId === user.id && t.status !== 'done')
                    .map(t => {
                        const team = allTeams.find(tm => tm.id === t.teamId);
                        return { ...t, teamName: team?.name, teamExists: !!team };
                    })
                    .filter(t => t.teamExists); // Only show tasks from existing teams
                setMyAssignedTasks(assigned.slice(0, 5));

                const done = myTasks.filter(t => t.status === 'done').length;
                const inProgress = myTasks.filter(t => t.status === 'in-progress').length;
                const todo = myTasks.filter(t => t.status === 'todo').length;
                setStats(s => ({ ...s, tasks: myTasks.length, done, inProgress, todo }));

                // Priority stats
                const low = myTasks.filter(t => t.priority === 'low').length;
                const medium = myTasks.filter(t => !t.priority || t.priority === 'medium').length;
                const high = myTasks.filter(t => t.priority === 'high').length;
                setPriorityStats({ low, medium, high });
            });
        });

        // Get pending invitations RECEIVED BY the current user
        const sub3 = db.invitations.find({
            selector: {
                receiverId: user.id,
                status: 'pending'
            }
        }).$.subscribe(invites => {
            setPendingInvites(invites.map(i => i.toJSON() as Invitation));
        });

        return () => {
            sub1.unsubscribe();
            sub2.unsubscribe();
            sub3.unsubscribe();
        };
    }, [db, user]);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground">
                        {isAdmin ? 'Team Admin Overview' : 'Your personal workspace'}
                    </p>
                </div>
                <ReportExport />
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate('/app/teams')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.teams}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
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

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-4">
                <TaskStatusChart
                    todo={stats.todo}
                    inProgress={stats.inProgress}
                    done={stats.done}
                />
                <PriorityChart
                    low={priorityStats.low}
                    medium={priorityStats.medium}
                    high={priorityStats.high}
                />
                <TaskTrendChart tasks={allTasks} days={7} />
            </div>

            {/* Role-Based Sections */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* My Assigned Tasks - For All Users */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            My Pending Tasks
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {myAssignedTasks.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No pending tasks assigned to you</p>
                        ) : (
                            <ul className="space-y-2">
                                {myAssignedTasks.map(task => (
                                    <li
                                        key={task.id}
                                        className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors group"
                                        onClick={() => navigate(`/app/teams/${task.teamId}`)}
                                    >
                                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                            <span className="truncate font-medium">{task.title}</span>
                                            <span className="text-xs text-muted-foreground">in {task.teamName}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs px-2 py-0.5 rounded ${task.priority === 'high' ? 'bg-red-500/10 text-red-500' :
                                                task.priority === 'low' ? 'bg-blue-500/10 text-blue-500' :
                                                    'bg-yellow-500/10 text-yellow-500'
                                                }`}>
                                                {task.priority || 'medium'}
                                            </span>
                                            <ExternalLink size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {/* Pending Invitations received by the current user */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <UserPlus className="h-4 w-4" />
                            Pending Invitations
                            {pendingInvites.length > 0 && (
                                <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                                    {pendingInvites.length}
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {pendingInvites.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No pending invitations</p>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    {pendingInvites.length} invitation(s) awaiting response
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate('/app/notifications?tab=invitations')}
                                >
                                    View All
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Admin Only: Teams I Manage */}
                {isAdmin && adminTeams.length > 0 && (
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Teams You Manage
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {adminTeams.map(team => (
                                    <Button
                                        key={team.id}
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => navigate(`/app/teams/${team.id}`)}
                                    >
                                        {team.name} ({team.members.length} members)
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Welcome Card */}
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

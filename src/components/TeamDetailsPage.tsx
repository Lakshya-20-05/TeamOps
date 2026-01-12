import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../context/AuthContext';
import type { Team, Task } from '../db/schemas';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from '@radix-ui/react-label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

// I'll stick to native select for speed unless I install select. I'll check my plan.
// I installed radix-ui/react-select earlier? No I skipped it in session 1.
// I'll use native select for assignee to be safe and fast.

import { Calendar as CalendarIcon, Loader2, Plus, CheckCircle2, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { v4 as uuidv4 } from 'uuid';
import { format, isAfter, parseISO } from 'date-fns';
import { cn } from '../lib/utils';

export const TeamDetailsPage: React.FC = () => {
    const { teamId } = useParams<{ teamId: string }>();
    const db = useDatabase();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [team, setTeam] = useState<Team | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [members, setMembers] = useState<{ id: string, name: string, role: string }[]>([]);
    const [loading, setLoading] = useState(true);

    // Assign Task Dialog
    const [assignOpen, setAssignOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskDeadline, setNewTaskDeadline] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [newTaskAssignee, setNewTaskAssignee] = useState('');

    useEffect(() => {
        if (!teamId || !user) return;

        const teamSub = db.teams.findOne(teamId).$.subscribe(async (doc) => {
            if (!doc) {
                navigate('/teams'); // Redirect if deleted
                return;
            }
            const teamData = doc.toJSON() as Team;
            setTeam(teamData);

            // Resolve member names
            // In a real app we'd do a bulk query. Here we iterate.
            const resolvedMembers = await Promise.all(teamData.members.map(async (m) => {
                const u = await db.users.findOne(m.userId).exec();
                return {
                    id: m.userId,
                    name: u ? u.name : 'Unknown User',
                    role: m.role
                };
            }));
            setMembers(resolvedMembers);
            setLoading(false);
        });

        const tasksSub = db.tasks.find({
            selector: {
                teamId: teamId
            }
        }).$.subscribe((docs: any[]) => {
            const sortedTasks = docs
                .map(t => t.toJSON() as Task)
                .sort((a: Task, b: Task) => {
                    const priorityMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
                    const pA = priorityMap[a.priority || 'medium'] || 2;
                    const pB = priorityMap[b.priority || 'medium'] || 2;
                    if (pA !== pB) return pB - pA; // Higher priority first

                    // Secondary sort: Created Date (Newest first)
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                });
            setTasks(sortedTasks);
        });

        return () => {
            teamSub.unsubscribe();
            tasksSub.unsubscribe();
        };
    }, [db, teamId, user, navigate]);

    const handleAssignTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !teamId) return;

        const taskId = uuidv4();

        await db.tasks.insert({
            id: taskId,
            title: newTaskTitle,
            description: newTaskDesc,
            status: 'todo',
            priority: newTaskPriority,
            deadline: newTaskDeadline || undefined,
            teamId: teamId,
            assigneeId: newTaskAssignee || user.id, // Default to self if not picked
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        // Notify Assignee
        if (newTaskAssignee) {
            await db.notifications.insert({
                id: uuidv4(),
                userId: newTaskAssignee,
                type: 'info',
                title: 'Task Assigned',
                message: `You have been assigned to task: ${newTaskTitle} in ${team?.name}`,
                read: false,
                createdAt: new Date().toISOString(),
                metadata: {
                    teamId: teamId,
                    taskId: taskId,
                    relatedUserId: user.id
                }
            });
        }

        setAssignOpen(false);
        // Reset form
        setNewTaskTitle('');
        setNewTaskDesc('');
        setNewTaskDeadline('');
    };

    const handleCompleteTask = async (task: Task) => {
        const doc = await db.tasks.findOne(task.id).exec();
        if (doc) {
            await doc.update({
                $set: {
                    status: 'done',
                    completedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            });

            // Notify Admins
            const admins = members.filter(m => m.role === 'admin' && m.id !== user?.id);
            await Promise.all(admins.map(admin =>
                db.notifications.insert({
                    id: uuidv4(),
                    userId: admin.id,
                    type: 'success',
                    title: 'Task Completed',
                    message: `${user?.name} completed task: ${task.title}`,
                    read: false,
                    createdAt: new Date().toISOString(),
                    metadata: {
                        teamId: team?.id,
                        taskId: task.id,
                        relatedUserId: user?.id
                    }
                })
            ));
        }
    };

    const getTaskStatusInfo = (task: Task) => {
        if (task.status === 'done') {
            if (task.deadline && task.completedAt && isAfter(parseISO(task.completedAt), parseISO(task.deadline))) {
                return { label: 'Late Completion', color: 'text-red-500', icon: <AlertCircle size={14} /> };
            }
            return { label: 'Completed', color: 'text-emerald-500', icon: <CheckCircle2 size={14} /> };
        }
        if (task.deadline && isAfter(new Date(), parseISO(task.deadline))) {
            return { label: 'Overdue', color: 'text-red-500 font-bold', icon: <Clock size={14} /> };
        }
        return { label: 'In Progress', color: 'text-blue-500', icon: <Clock size={14} /> };
    };

    // Confirmation States
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
    const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

    const confirmRemoveMember = async () => {
        if (!team || !memberToRemove) return;

        const updatedMembers = team.members.filter(m => m.userId !== memberToRemove);
        const doc = await db.teams.findOne(team.id).exec();
        if (doc) {
            await doc.update({
                $set: {
                    members: updatedMembers,
                    updatedAt: new Date().toISOString()
                }
            });
        }
        setMemberToRemove(null);
    };

    const confirmDeleteTask = async () => {
        if (!taskToDelete) return;
        const doc = await db.tasks.findOne(taskToDelete).exec();
        if (doc) {
            await doc.remove();
        }
        setTaskToDelete(null);
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    if (!team) return <div>Team not found</div>;

    const isAdmin = team.members.some(m => m.userId === user?.id && m.role === 'admin');

    return (
        <div className="space-y-8">
            {/* Header & Assign Dialog (Keep existing) */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{team.name}</h2>
                    <p className="text-muted-foreground">{team.description || 'Workspace details'}</p>
                </div>
                {isAdmin && (
                    <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Assign Task
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <form onSubmit={handleAssignTask}>
                                <DialogHeader>
                                    <DialogTitle>Assign Task</DialogTitle>
                                    <DialogDescription>Create a new task for a team member.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Title</Label>
                                        <Input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Task title" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Assigned To</Label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={newTaskAssignee}
                                            onChange={e => setNewTaskAssignee(e.target.value)}
                                            required
                                        >
                                            <option value="">Select Member...</option>
                                            {members.filter(m => m.role === 'member').map(m => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 flex flex-col">
                                            <Label className="mb-1">Deadline</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !newTaskDeadline && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {newTaskDeadline ? (
                                                            format(parseISO(newTaskDeadline), "PPP")
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={newTaskDeadline ? parseISO(newTaskDeadline) : undefined}
                                                        onSelect={(date) => date && setNewTaskDeadline(date.toISOString())}
                                                        disabled={(date) =>
                                                            date < new Date("1900-01-01")
                                                        }
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Priority</Label>
                                            <select
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={newTaskPriority}
                                                onChange={e => setNewTaskPriority(e.target.value as any)}
                                                required
                                            >
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Input value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} placeholder="Task details (required)" required />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit">Assign Task</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Confirmation Dialogs */}
            <Dialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove Member</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove this member? They will lose access to the team.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMemberToRemove(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmRemoveMember}>Remove</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Task</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this task? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTaskToDelete(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDeleteTask}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Members List */}
                <div className="md:col-span-1 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Members ({members.length})</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {members.map(m => (
                                <div key={m.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                            {m.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium">{m.name}</div>
                                            <div className="text-xs text-muted-foreground capitalize">{m.role}</div>
                                        </div>
                                    </div>
                                    {isAdmin && m.role !== 'admin' && (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => setMemberToRemove(m.id)}
                                            title="Remove Member"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Tasks List */}
                <div className="md:col-span-2 space-y-4">
                    <h3 className="text-xl font-bold">Tasks</h3>
                    <div className="grid gap-3">
                        {/* ... (Keep existing empty state check) */}
                        {tasks.length === 0 && (
                            <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                No tasks assigned in this team yet.
                            </div>
                        )}
                        {tasks.map(task => {
                            const assignee = members.find(m => m.id === task.assigneeId);
                            const completionInfo = getTaskStatusInfo(task);
                            const isMyTask = task.assigneeId === user?.id;

                            return (
                                <div key={task.id} className="group flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                                    {/* ... (Keep existing task content) */}
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className={cn("font-medium", task.status === 'done' && "line-through text-muted-foreground")}>{task.title}</h4>
                                            <div className={cn("text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-1", completionInfo.color)}>
                                                {completionInfo.icon}
                                                {completionInfo.label}
                                            </div>
                                            <div className={cn("text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border opacity-70", {
                                                "bg-red-500/10 text-red-500": task.priority === 'high',
                                                "bg-yellow-500/10 text-yellow-500": task.priority === 'medium',
                                                "bg-blue-500/10 text-blue-500": task.priority === 'low'
                                            })}>
                                                {task.priority}
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{task.description}</p>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                                            <div className="flex items-center gap-1">
                                                <span>Assigned to:</span>
                                                <span className="font-medium text-foreground">{assignee ? assignee.name : 'Unassigned'}</span>
                                            </div>
                                            {task.deadline && (
                                                <div className="flex items-center gap-1">
                                                    <CalendarIcon size={12} />
                                                    {format(parseISO(task.deadline), 'MMM d, yyyy')}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {task.status !== 'done' && isMyTask && (
                                            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => handleCompleteTask(task)}>
                                                <CheckCircle2 size={14} />
                                                Done
                                            </Button>
                                        )}
                                        {isAdmin && task.status !== 'done' && (
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => setTaskToDelete(task.id)}
                                                title="Delete Task"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

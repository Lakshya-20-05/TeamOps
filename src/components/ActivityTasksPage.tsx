import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../context/AuthContext';
import type { Task, TaskUpdate, TaskAttachment } from '../db/schemas';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from '@radix-ui/react-label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Plus, ArrowLeft, Loader2, CheckCircle2, Clock, AlertCircle, Calendar as CalendarIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { TaskProgressUpdate } from './TaskProgressUpdate';
import { FileAttachment } from './FileAttachment';

interface Activity {
    id: string;
    name: string;
    description?: string;
    projectId: string;
    createdAt: string;
    updatedAt: string;
}

export const ActivityTasksPage: React.FC = () => {
    const { activityId } = useParams<{ activityId: string }>();
    const db = useDatabase() as any;
    const { user } = useAuth();
    const navigate = useNavigate();

    const [activity, setActivity] = useState<Activity | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);

    // Create Task Dialog
    const [createOpen, setCreateOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskDeadline, setNewTaskDeadline] = useState<Date | undefined>(undefined);
    const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [newTaskAssignee, setNewTaskAssignee] = useState('');
    const [newTaskAttachments, setNewTaskAttachments] = useState<TaskAttachment[]>([]);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!activityId) return;

        const loadData = async () => {
            // Load activity
            const activityDoc = await db.activities.findOne(activityId).exec();
            if (activityDoc) {
                const act = activityDoc.toJSON() as Activity;
                setActivity(act);

                // Load project to get team members
                const projectDoc = await db.projects.findOne(act.projectId).exec();
                if (projectDoc) {
                    const teamDoc = await db.teams.findOne(projectDoc.teamId).exec();
                    if (teamDoc) {
                        const memberIds = teamDoc.members.map((m: any) => m.userId);
                        const userDocs = await db.users.findByIds(memberIds).exec();
                        setMembers(Array.from(userDocs.values()).map((u: any) => ({
                            id: u.id,
                            name: u.name || u.username
                        })));
                    }
                }
            }

            // Subscribe to tasks for this activity
            const sub = db.tasks.find({
                selector: { activityId }
            }).$.subscribe((docs: any[]) => {
                setTasks(docs.map((d: any) => d.toJSON() as Task));
                setLoading(false);
            });

            return () => sub.unsubscribe();
        };

        loadData();
    }, [activityId, db]);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim() || !newTaskDesc.trim() || !activityId || !activity) return;

        setCreating(true);
        try {
            // Get teamId from project
            const projectDoc = await db.projects.findOne(activity.projectId).exec();
            const teamId = projectDoc?.teamId;
            if (!teamId) return;

            const now = new Date().toISOString();
            await db.tasks.insert({
                id: uuidv4(),
                title: newTaskTitle.trim(),
                description: newTaskDesc.trim(),
                status: 'todo',
                priority: newTaskPriority,
                deadline: newTaskDeadline ? newTaskDeadline.toISOString() : undefined,
                teamId,
                activityId,
                assigneeId: newTaskAssignee || undefined,
                attachments: newTaskAttachments,
                createdAt: now,
                updatedAt: now
            });
            // Reset form
            setNewTaskTitle('');
            setNewTaskDesc('');
            setNewTaskDeadline(undefined);
            setNewTaskPriority('medium');
            setNewTaskAssignee('');
            setNewTaskAttachments([]);
            setCreateOpen(false);
        } finally {
            setCreating(false);
        }
    };

    const handleCompleteTask = async (task: Task) => {
        const taskDoc = await db.tasks.findOne(task.id).exec();
        if (!taskDoc) return;
        await taskDoc.update({
            $set: {
                status: 'done',
                completedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        });
    };

    const getStatusInfo = (task: Task) => {
        switch (task.status) {
            case 'done':
                return { icon: <CheckCircle2 size={12} />, label: 'Done', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
            case 'in-progress':
                return { icon: <Clock size={12} />, label: 'In Progress', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
            default:
                return { icon: <AlertCircle size={12} />, label: 'To Do', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' };
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{activity?.name || 'Activity'}</h1>
                    <p className="text-muted-foreground">Tasks</p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end">
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus size={16} />
                            New Task
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Assign Task</DialogTitle>
                            <DialogDescription>Create a new task for a team member.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateTask}>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label>Title</Label>
                                    <Input
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        placeholder="Task title"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Assigned To</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={newTaskAssignee}
                                        onChange={(e) => setNewTaskAssignee(e.target.value)}
                                        required
                                    >
                                        <option value="">Select Member...</option>
                                        {members.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Deadline</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn("w-full justify-start text-left font-normal", !newTaskDeadline && "text-muted-foreground")}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {newTaskDeadline ? format(newTaskDeadline, 'PPP') : 'Pick a date'}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={newTaskDeadline}
                                                    onSelect={setNewTaskDeadline}
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
                                            onChange={(e) => setNewTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
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
                                    <Input
                                        value={newTaskDesc}
                                        onChange={(e) => setNewTaskDesc(e.target.value)}
                                        placeholder="Task details (required)"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Attachments (optional)</Label>
                                    <FileAttachment
                                        attachments={newTaskAttachments}
                                        onAttach={(att) => setNewTaskAttachments(prev => [...prev, att])}
                                        onRemove={(id) => setNewTaskAttachments(prev => prev.filter(a => a.id !== id))}
                                        maxSizeMB={5}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={creating}>
                                    {creating ? 'Assigning...' : 'Assign Task'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Tasks List */}
            {tasks.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <CheckCircle2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium">No tasks yet</h3>
                        <p className="text-sm text-muted-foreground">Create tasks to track work in this activity.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {tasks.map(task => {
                        const statusInfo = getStatusInfo(task);
                        const assignee = members.find(m => m.id === task.assigneeId);
                        const isMyTask = task.assigneeId === user?.id;

                        return (
                            <div key={task.id} className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className={cn("font-medium", task.status === 'done' && "line-through text-muted-foreground")}>
                                            {task.title}
                                        </h4>
                                        <div className={cn("text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-1", statusInfo.color)}>
                                            {statusInfo.icon}
                                            {statusInfo.label}
                                        </div>
                                        <div className={cn("text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border opacity-70", {
                                            "bg-red-500/10 text-red-500": task.priority === 'high',
                                            "bg-yellow-500/10 text-yellow-500": task.priority === 'medium',
                                            "bg-blue-500/10 text-blue-500": task.priority === 'low'
                                        })}>
                                            {task.priority}
                                        </div>
                                        {task.percentComplete !== undefined && task.percentComplete > 0 && (
                                            <div className="text-[10px] px-1.5 py-0.5 rounded border bg-primary/10 text-primary font-medium">
                                                {task.percentComplete}% done
                                            </div>
                                        )}
                                    </div>
                                    {task.description && (
                                        <p className="text-sm text-muted-foreground">{task.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <span>Assigned to: <strong className="text-foreground">{assignee?.name || 'Unassigned'}</strong></span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {task.status !== 'done' && isMyTask && (
                                        <Button size="sm" variant="outline" onClick={() => handleCompleteTask(task)}>
                                            <CheckCircle2 size={14} className="mr-1" />
                                            Done
                                        </Button>
                                    )}
                                    {isMyTask && (
                                        <TaskProgressUpdate
                                            taskId={task.id}
                                            currentPercent={task.percentComplete || 0}
                                            onSubmit={async (update) => {
                                                const taskDoc = await db.tasks.findOne(task.id).exec();
                                                if (!taskDoc) return;
                                                const newUpdate: TaskUpdate = {
                                                    id: crypto.randomUUID(),
                                                    authorId: user!.id,
                                                    percentComplete: update.percentComplete,
                                                    workSummary: update.workSummary || undefined,
                                                    problemsFaced: update.problemsFaced || undefined,
                                                    resourcesNeeded: update.resourcesNeeded || undefined,
                                                    createdAt: new Date().toISOString()
                                                };
                                                await taskDoc.update({
                                                    $set: {
                                                        updates: [...(taskDoc.updates || []), newUpdate],
                                                        percentComplete: update.percentComplete,
                                                        updatedAt: new Date().toISOString()
                                                    }
                                                });
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

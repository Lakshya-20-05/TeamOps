import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDatabase } from '../hooks/useDatabase';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, Layers, ArrowLeft, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Project {
    id: string;
    name: string;
    description?: string;
    teamId: string;
    createdAt: string;
    updatedAt: string;
}

interface Activity {
    id: string;
    name: string;
    description?: string;
    projectId: string;
    createdAt: string;
    updatedAt: string;
}

export const ActivitiesPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const db = useDatabase() as any;
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [taskCounts, setTaskCounts] = useState<Record<string, { total: number; done: number }>>({});
    const [loading, setLoading] = useState(true);

    // Create Activity Dialog
    const [createOpen, setCreateOpen] = useState(false);
    const [newActivityName, setNewActivityName] = useState('');
    const [newActivityDesc, setNewActivityDesc] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!projectId) return;

        const loadData = async () => {
            // Load project
            const projectDoc = await db.projects.findOne(projectId).exec();
            if (projectDoc) {
                setProject(projectDoc.toJSON() as Project);
            }

            // Subscribe to activities for this project
            const sub = db.activities.find({
                selector: { projectId }
            }).$.subscribe(async (docs: any[]) => {
                const acts = docs.map((d: any) => d.toJSON() as Activity);
                setActivities(acts);

                // Calculate task counts per activity
                const counts: Record<string, { total: number; done: number }> = {};
                for (const act of acts) {
                    const tasks = await db.tasks.find({ selector: { activityId: act.id } }).exec();
                    counts[act.id] = {
                        total: tasks.length,
                        done: tasks.filter((t: any) => t.status === 'done').length
                    };
                }
                setTaskCounts(counts);
                setLoading(false);
            });

            return () => sub.unsubscribe();
        };

        loadData();
    }, [projectId, db]);

    const handleCreateActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newActivityName.trim() || !projectId) return;

        setCreating(true);
        try {
            const now = new Date().toISOString();
            await db.activities.insert({
                id: uuidv4(),
                name: newActivityName.trim(),
                description: newActivityDesc.trim() || undefined,
                projectId,
                createdAt: now,
                updatedAt: now
            });
            setNewActivityName('');
            setNewActivityDesc('');
            setCreateOpen(false);
        } finally {
            setCreating(false);
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
                    <h1 className="text-3xl font-bold tracking-tight">{project?.name || 'Project'}</h1>
                    <p className="text-muted-foreground">Activities</p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end">
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus size={16} />
                            New Activity
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Activity</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateActivity} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Activity Name</label>
                                <Input
                                    value={newActivityName}
                                    onChange={(e) => setNewActivityName(e.target.value)}
                                    placeholder="e.g., Data Collection"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description (optional)</label>
                                <Input
                                    value={newActivityDesc}
                                    onChange={(e) => setNewActivityDesc(e.target.value)}
                                    placeholder="Brief description..."
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={creating}>
                                    {creating ? 'Creating...' : 'Create Activity'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Activities Grid */}
            {activities.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Layers className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium">No activities yet</h3>
                        <p className="text-sm text-muted-foreground">Create activities to organize tasks within this project.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {activities.map(activity => {
                        const counts = taskCounts[activity.id] || { total: 0, done: 0 };
                        const progress = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;

                        return (
                            <Link key={activity.id} to={`/app/activities/${activity.id}/tasks`}>
                                <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 group-hover:text-primary transition-colors">
                                            <Layers className="h-5 w-5" />
                                            {activity.name}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {activity.description || 'No description'}
                                        </p>
                                        {/* Progress */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span>{counts.done}/{counts.total} tasks</span>
                                                <span className="text-primary">{progress}%</span>
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-1.5">
                                                <div
                                                    className="bg-primary h-1.5 rounded-full transition-all"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

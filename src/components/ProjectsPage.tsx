import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDatabase } from '../hooks/useDatabase';
import type { Team } from '../db/schemas';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, FolderKanban, ArrowLeft, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Project {
    id: string;
    name: string;
    description?: string;
    teamId: string;
    createdAt: string;
    updatedAt: string;
}

export const ProjectsPage: React.FC = () => {
    const { teamId } = useParams<{ teamId: string }>();
    const db = useDatabase() as any;
    const navigate = useNavigate();

    const [team, setTeam] = useState<Team | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    // Create Project Dialog
    const [createOpen, setCreateOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!teamId || !db?.projects) {
            // db.projects doesn't exist yet - wait or show empty
            if (teamId) setLoading(false);
            return;
        }

        let mounted = true;

        // Load team
        db.teams.findOne(teamId).exec().then((teamDoc: any) => {
            if (teamDoc && mounted) {
                setTeam(teamDoc.toJSON() as Team);
            }
        });

        // Subscribe to projects for this team
        const sub = db.projects.find({
            selector: { teamId }
        }).$.subscribe((docs: any[]) => {
            if (mounted) {
                setProjects(docs.map((d: any) => d.toJSON() as Project));
                setLoading(false);
            }
        });

        // Set loading to false after a short delay if subscription hasn't emitted
        const timeout = setTimeout(() => {
            if (mounted) setLoading(false);
        }, 1000);

        return () => {
            mounted = false;
            sub.unsubscribe();
            clearTimeout(timeout);
        };
    }, [teamId, db]);

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim() || !teamId) return;

        if (!db?.projects) {
            console.error('db.projects collection not available');
            alert('Database not ready. Please refresh the page.');
            return;
        }

        setCreating(true);
        try {
            const now = new Date().toISOString();
            await db.projects.insert({
                id: uuidv4(),
                name: newProjectName.trim(),
                description: newProjectDesc.trim() || undefined,
                teamId,
                createdAt: now,
                updatedAt: now
            });
            setNewProjectName('');
            setNewProjectDesc('');
            setCreateOpen(false);
        } catch (err) {
            console.error('Failed to create project:', err);
            alert('Failed to create project. Check console for details.');
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
                <Button variant="ghost" size="icon" onClick={() => navigate('/app/teams')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{team?.name || 'Team'}</h1>
                    <p className="text-muted-foreground">Projects</p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end">
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus size={16} />
                            New Project
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Project</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateProject} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Project Name</label>
                                <Input
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    placeholder="e.g., AI Research Program"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description (optional)</label>
                                <Input
                                    value={newProjectDesc}
                                    onChange={(e) => setNewProjectDesc(e.target.value)}
                                    placeholder="Brief description..."
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={creating}>
                                    {creating ? 'Creating...' : 'Create Project'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Projects Grid */}
            {projects.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium">No projects yet</h3>
                        <p className="text-sm text-muted-foreground">Create your first project to organize activities and tasks.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map(project => (
                        <Link key={project.id} to={`/app/projects/${project.id}`}>
                            <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 group-hover:text-primary transition-colors">
                                        <FolderKanban className="h-5 w-5" />
                                        {project.name}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {project.description || 'No description'}
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

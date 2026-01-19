import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from './ui/dialog';
import { Label } from '@radix-ui/react-label';
import { FileSpreadsheet, FileText, Download, Loader2 } from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../context/AuthContext';
import { generatePDFReport, generateExcelReport } from '../lib/exportUtils';
import type { Task, Team } from '../db/schemas';
import { cn } from '../lib/utils';

interface ReportExportProps {
    teamId?: string; // Optional: Export for specific team
}

export const ReportExport: React.FC<ReportExportProps> = ({ teamId }) => {
    const db = useDatabase();
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [format, setFormat] = useState<'pdf' | 'excel'>('pdf');
    const [loading, setLoading] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);

    useEffect(() => {
        if (!open || !user) return;

        const fetchData = async () => {
            const allTeams = await db.teams.find().exec();
            const myTeams = allTeams.filter(t =>
                t.members.some((m: any) => m.userId === user.id)
            );

            let relevantTeams = myTeams;
            if (teamId) {
                relevantTeams = myTeams.filter(t => t.id === teamId);
            }

            setTeams(relevantTeams.map(t => t.toJSON() as Team));

            const teamIds = relevantTeams.map(t => t.id);
            const allTasks = await db.tasks.find().exec();
            const relevantTasks = allTasks.filter(t =>
                teamIds.includes(t.teamId) || t.assigneeId === user.id
            );
            setTasks(relevantTasks.map(t => t.toJSON() as Task));
        };

        fetchData();
    }, [open, db, user, teamId]);

    const handleExport = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const exportData = {
                tasks,
                teams,
                userName: user.name || user.username
            };

            if (format === 'pdf') {
                generatePDFReport(exportData);
            } else {
                generateExcelReport(exportData);
            }

            setOpen(false);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Export Report</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Format</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                className={cn(
                                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors",
                                    format === 'pdf'
                                        ? "border-primary bg-primary/5"
                                        : "border-muted hover:border-muted-foreground/50"
                                )}
                                onClick={() => setFormat('pdf')}
                            >
                                <FileText className="h-8 w-8 text-red-500" />
                                <span className="text-sm font-medium">PDF</span>
                            </button>
                            <button
                                type="button"
                                className={cn(
                                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors",
                                    format === 'excel'
                                        ? "border-primary bg-primary/5"
                                        : "border-muted hover:border-muted-foreground/50"
                                )}
                                onClick={() => setFormat('excel')}
                            >
                                <FileSpreadsheet className="h-8 w-8 text-green-500" />
                                <span className="text-sm font-medium">Excel</span>
                            </button>
                        </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                        <p><strong>Included:</strong></p>
                        <ul className="list-disc list-inside mt-1">
                            <li>{teams.length} team(s)</li>
                            <li>{tasks.length} task(s)</li>
                        </ul>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleExport} disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4 mr-2" />
                                Export {format.toUpperCase()}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

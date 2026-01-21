import React, { useState } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from './ui/dialog';
import { MessageSquarePlus } from 'lucide-react';

interface TaskProgressUpdateProps {
    taskId: string;
    currentPercent?: number;
    onSubmit: (update: {
        percentComplete: number;
        workSummary: string;
        problemsFaced: string;
        resourcesNeeded: string;
    }) => Promise<void>;
}

export const TaskProgressUpdate: React.FC<TaskProgressUpdateProps> = ({
    currentPercent = 0,
    onSubmit
}) => {
    const [open, setOpen] = useState(false);
    const [percentComplete, setPercentComplete] = useState(currentPercent);
    const [workSummary, setWorkSummary] = useState('');
    const [problemsFaced, setProblemsFaced] = useState('');
    const [resourcesNeeded, setResourcesNeeded] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await onSubmit({
                percentComplete,
                workSummary,
                problemsFaced,
                resourcesNeeded
            });
            // Reset form
            setWorkSummary('');
            setProblemsFaced('');
            setResourcesNeeded('');
            setOpen(false);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <MessageSquarePlus size={16} />
                    Post Update
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Post Progress Update</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Progress Slider */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>Progress Complete</Label>
                            <span className="text-sm font-medium text-primary">{percentComplete}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={percentComplete}
                            onChange={(e) => setPercentComplete(Number(e.target.value))}
                            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                        </div>
                    </div>

                    {/* Work Summary */}
                    <div className="space-y-2">
                        <Label htmlFor="workSummary">Work Done</Label>
                        <Textarea
                            id="workSummary"
                            placeholder="Describe work completed..."
                            value={workSummary}
                            onChange={(e) => setWorkSummary(e.target.value)}
                            rows={2}
                        />
                    </div>

                    {/* Problems Faced */}
                    <div className="space-y-2">
                        <Label htmlFor="problemsFaced">Problems Faced</Label>
                        <Textarea
                            id="problemsFaced"
                            placeholder="Any blockers or issues..."
                            value={problemsFaced}
                            onChange={(e) => setProblemsFaced(e.target.value)}
                            rows={2}
                        />
                    </div>

                    {/* Resources Needed */}
                    <div className="space-y-2">
                        <Label htmlFor="resourcesNeeded">Resources/Time Needed</Label>
                        <Textarea
                            id="resourcesNeeded"
                            placeholder="Additional resources or time required..."
                            value={resourcesNeeded}
                            onChange={(e) => setResourcesNeeded(e.target.value)}
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Submit Update'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

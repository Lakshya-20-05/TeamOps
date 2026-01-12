import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Loader2 } from 'lucide-react';

export const JoinTeamPage: React.FC = () => {
    const { teamId } = useParams<{ teamId: string }>();
    const navigate = useNavigate();
    const db = useDatabase();
    const { user } = useAuth();
    const [status, setStatus] = useState<'loading' | 'confirm' | 'success' | 'error'>('loading');
    const [teamName, setTeamName] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const checkTeam = async () => {
            if (!teamId) return;
            try {
                // Find team
                const team = await db.teams.findOne(teamId).exec();
                if (!team) {
                    setStatus('error');
                    setErrorMsg("Team not found");
                    return;
                }
                setTeamName(team.name);

                // Check if already member
                const isMember = team.members.some((m: any) => m.userId === user?.id);
                if (isMember) {
                    // Already member, redirect
                    navigate('/teams');
                } else {
                    setStatus('confirm');
                }
            } catch (err) {
                console.error(err);
                setStatus('error');
                setErrorMsg("Failed to load team info");
            }
        };

        if (user) {
            checkTeam();
        } else {
            // Redirect to login if not authenticated, with return url
            navigate('/login', { state: { from: `/join/${teamId}` } });
        }
    }, [db, teamId, user, navigate]);

    const handleJoin = async () => {
        if (!teamId || !user) return;
        try {
            const team = await db.teams.findOne(teamId).exec();
            if (!team) return;

            await team.update({
                $push: {
                    members: { userId: user.id, role: 'member' }
                }
            });
            navigate('/teams');
        } catch (err) {
            setStatus('error');
            setErrorMsg("Failed to join team");
        }
    };

    if (status === 'loading') {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;
    }

    if (status === 'error') {
        return (
            <div className="flex justify-center items-center h-screen">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-destructive">Error</CardTitle>
                        <CardDescription>{errorMsg}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button onClick={() => navigate('/')}>Go Home</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex justify-center items-center h-screen bg-background">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle>Join Team</CardTitle>
                    <CardDescription>
                        You have been invited to join <strong>{teamName}</strong>.
                    </CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-center gap-4">
                    <Button variant="outline" onClick={() => navigate('/')}>Cancel</Button>
                    <Button onClick={handleJoin}>Join Team</Button>
                </CardFooter>
            </Card>
        </div>
    );
};

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
            if (!teamId || !user) return;
            try {
                // 1. Try finding locally first
                let teamData: any = null;
                const localTeam = await db.teams.findOne(teamId).exec();

                if (localTeam) {
                    teamData = localTeam.toJSON();
                } else {
                    // 2. Fallback to Supabase direct fetch (Sync might not have happened yet)
                    const { data, error } = await supabase
                        .from('teams')
                        .select('*')
                        .eq('id', teamId)
                        .single();

                    if (error || !data) {
                        setStatus('error');
                        setErrorMsg("Team not found or access denied.");
                        return;
                    }
                    teamData = data;
                }

                setTeamName(teamData.name);

                // Check if already member (Parse members jsonb if from Supabase, or array if from RxDB)
                const members = typeof teamData.members === 'string'
                    ? JSON.parse(teamData.members)
                    : (teamData.members || []);

                const isMember = members.some((m: any) => m.userId === user.id);

                if (isMember) {
                    navigate(`/app/teams/${teamId}`);
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
            // Redirect will be handled by ProtectedRoute usually, but just in case:
            navigate('/login', { state: { from: `/app/join/${teamId}` } });
        }
    }, [db, teamId, user, navigate]);

    const handleJoin = async () => {
        if (!teamId || !user) return;
        try {
            setStatus('loading');

            // We must update via Supabase directly if we are not a member yet (likely no RLS write permission to 'teams' generically?)
            // Actually, with RLS disabled, we can write.
            // But RxDB might reject writing to a document we don't have?
            // Safer to use an RPC or direct Supabase update for "Join" action usually.
            // For now, let's fetch current members, append, and update.

            const { data: team, error: fetchError } = await supabase
                .from('teams')
                .select('members')
                .eq('id', teamId)
                .single();

            if (fetchError || !team) throw new Error("Could not fetch team to update");

            const currentMembers = team.members || [];
            if (currentMembers.some((m: any) => m.userId === user.id)) {
                navigate(`/app/teams/${teamId}`);
                return;
            }

            const newMembers = [...currentMembers, { userId: user.id, role: 'member' }];

            const { error: updateError } = await supabase
                .from('teams')
                .update({ members: newMembers })
                .eq('id', teamId);

            if (updateError) throw updateError;

            // Force a resync or just navigate
            // Navigation to teams page will eventually sync the new team down
            navigate('/app/teams');

        } catch (err) {
            console.error(err);
            setStatus('error');
            setErrorMsg("Failed to join team. Please try again.");
        }
    };

    if (status === 'loading') {
        return (
            <div className="flex justify-center items-center h-full w-full min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading team info...</span>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="flex justify-center items-center h-full w-full min-h-[50vh]">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">Error</CardTitle>
                        <CardDescription>{errorMsg}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button onClick={() => navigate('/app/teams')}>Go Back</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex justify-center items-center h-full w-full min-h-[50vh]">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle>Join Team</CardTitle>
                    <CardDescription>
                        You have been invited to join <strong>{teamName}</strong>.
                    </CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-center gap-4">
                    <Button variant="outline" onClick={() => navigate('/app/teams')}>Cancel</Button>
                    <Button onClick={handleJoin}>Join Team</Button>
                </CardFooter>
            </Card>
        </div>
    );
};


import React, { useEffect, useState } from 'react';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../context/AuthContext';
import type { Team } from '../db/schemas';
import { Plus, User as UserIcon, Shield, Crown, Copy, Check, UserPlus, MoreVertical, Trash2, LogOut } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { cn } from '../lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from '@radix-ui/react-label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/DropdownMenu";

import { useNavigate } from 'react-router-dom';

export const TeamsPage: React.FC = () => {
    const db = useDatabase();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [teams, setTeams] = useState<Team[]>([]);

    // Create Team Dialog
    const [createOpen, setCreateOpen] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');

    // Add Member Dialog
    const [addMemberOpen, setAddMemberOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [inviteUsername, setInviteUsername] = useState('');
    const [inviteStatus, setInviteStatus] = useState('');
    const [copied, setCopied] = useState(false);

    // Dialog States for Actions
    const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
    const [teamToLeave, setTeamToLeave] = useState<Team | null>(null);

    useEffect(() => {
        if (!user || !db) return;

        try {
            const sub = db.teams.find().$.subscribe(allTeams => {
                const myTeams = allTeams
                    .map(t => t.toJSON() as Team)
                    .filter(t => t.members.some(m => m.userId === user.id))
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setTeams(myTeams);
            });
            return () => sub.unsubscribe();
        } catch (error) {
            console.error("Error subscribing to teams:", error);
        }
    }, [db, user]);

    const createTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTeamName.trim() || !user) return;

        await db.teams.insert({
            id: uuidv4(),
            name: newTeamName,
            members: [{ userId: user.id, role: 'admin' }], // Add creator as admin
            createdAt: new Date().toISOString()
        });

        setNewTeamName('');
        setCreateOpen(false);
    };

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeam || !inviteUsername.trim() || !user) return;

        try {
            // Find user by username
            const targetUser = await db.users.findOne({
                selector: {
                    username: inviteUsername
                }
            }).exec();

            if (!targetUser) {
                setInviteStatus('User not found');
                return;
            }

            // Check if user is already in team
            if (selectedTeam?.members.some(m => m.userId === targetUser.id)) {
                setInviteStatus('User is already a member');
                return;
            }

            // Check if invitation already exists
            const existingInvite = await db.invitations.findOne({
                selector: {
                    teamId: selectedTeam.id,
                    receiverId: targetUser.id,
                    status: 'pending'
                }
            }).exec();

            if (existingInvite) {
                setInviteStatus('Invitation already pending');
                return;
            }

            // Create Invitation
            await db.invitations.insert({
                id: uuidv4(),
                teamId: selectedTeam.id,
                senderId: user.id, // Use the current authenticated user's ID
                receiverId: targetUser.id,
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            setInviteStatus('Invitation sent successfully!');
            setTimeout(() => {
                setAddMemberOpen(false);
                setInviteUsername('');
                setInviteStatus('');
            }, 1000);

        } catch (err) {
            console.error(err);
            setInviteStatus('Failed to send invitation');
        }
    };

    const copyInviteLink = () => {
        if (!selectedTeam) return;
        const link = `${window.location.origin}/join/${selectedTeam.id}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDeleteTeam = async () => {
        if (!teamToDelete) return;
        try {
            const doc = await db.teams.findOne(teamToDelete.id).exec();
            if (doc) {
                await doc.remove();
            }
        } catch (error) {
            console.error("Error deleting team:", error);
        } finally {
            setTeamToDelete(null);
        }
    };

    const handleLeaveTeam = async () => {
        if (!teamToLeave || !user) return;
        try {
            const doc = await db.teams.findOne(teamToLeave.id).exec();
            if (doc) {
                const teamData = doc.toJSON() as Team;
                const updatedMembers = teamData.members.filter(m => m.userId !== user.id);
                // Prevent leaving if it would leave the team empty or admin-less (optional safeguard, but simple for now)
                await doc.update({
                    $set: {
                        members: updatedMembers,
                        updatedAt: new Date().toISOString()
                    }
                });
            }
        } catch (error) {
            console.error("Error leaving team:", error);
        } finally {
            setTeamToLeave(null);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <h2 className="text-3xl font-bold tracking-tight">Teams</h2>
                    <p className="text-muted-foreground">Manage your workspaces and collaborators</p>
                </div>

                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> New Team
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <form onSubmit={createTeam}>
                            <DialogHeader>
                                <DialogTitle>Create Team</DialogTitle>
                                <DialogDescription>
                                    Add a new team workspace. You will be the admin.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <Input
                                    id="name"
                                    placeholder="Team Name (e.g. Engineering)"
                                    value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit">Create Team</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Add Member Dialog */}
                <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Add Members</DialogTitle>
                            <DialogDescription>
                                Invite others to join <strong>{selectedTeam?.name}</strong>.
                            </DialogDescription>
                        </DialogHeader>
                        <Tabs defaultValue="username" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="username">By Username</TabsTrigger>
                                <TabsTrigger value="link">Invite Link</TabsTrigger>
                            </TabsList>
                            <TabsContent value="username">
                                <form onSubmit={handleAddMember} className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="username">Username</Label>
                                        <Input
                                            id="username"
                                            placeholder="Enter username"
                                            value={inviteUsername}
                                            onChange={(e) => {
                                                setInviteUsername(e.target.value);
                                                setInviteStatus('');
                                            }}
                                        />
                                        {inviteStatus && (
                                            <p className={cn("text-sm", inviteStatus.includes("success") ? "text-emerald-500" : "text-destructive")}>
                                                {inviteStatus}
                                            </p>
                                        )}
                                    </div>
                                    <Button type="submit" className="w-full">Add Member</Button>
                                </form>
                            </TabsContent>
                            <TabsContent value="link" className="py-4 space-y-4">
                                <div className="space-y-2">
                                    <Label>Team Invite Link</Label>
                                    <div className="flex items-center space-x-2">
                                        <Input
                                            readOnly
                                            value={selectedTeam ? `${window.location.origin}/join/${selectedTeam.id}` : ''}
                                        />
                                        <Button size="icon" variant="outline" onClick={copyInviteLink}>
                                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Share this link with others. They can join if they open it on this device.
                                    </p>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Delete Team Confirmation */}
            <Dialog open={!!teamToDelete} onOpenChange={(open) => !open && setTeamToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Team</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{teamToDelete?.name}</strong>? This action cannot be undone and will remove all data associated with this team.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTeamToDelete(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteTeam}>Delete Team</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Leave Team Confirmation */}
            <Dialog open={!!teamToLeave} onOpenChange={(open) => !open && setTeamToLeave(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Leave Team</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to leave <strong>{teamToLeave?.name}</strong>? You will lose access to this team's content.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTeamToLeave(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleLeaveTeam}>Leave Team</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {teams.map((team) => (
                    <Card
                        key={team.id}
                        className="h-full flex flex-col hover:bg-accent/5 transition-colors cursor-pointer border-muted relative group"
                        onClick={() => navigate(`/app/teams/${team.id}`)}
                    >
                        <CardHeader className="flex flex-row items-center gap-4 pb-2">
                            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {team.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    {team.name}
                                    {team.members.some(m => m.userId === user?.id && m.role === 'admin') && (
                                        <Crown className="h-4 w-4 text-amber-500 fill-amber-500" />
                                    )}
                                </CardTitle>
                            </div>

                            {/* Actions Menu */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Options</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {team.members.some(m => m.userId === user?.id && m.role === 'admin') ? (
                                        <>
                                            <DropdownMenuItem onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedTeam(team);
                                                setAddMemberOpen(true);
                                                setInviteStatus('');
                                                setInviteUsername('');
                                            }}>
                                                <UserPlus className="mr-2 h-4 w-4" /> Add Member
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => {
                                                e.stopPropagation();
                                                setTeamToDelete(team);
                                            }}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Team
                                            </DropdownMenuItem>
                                        </>
                                    ) : (
                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => {
                                            e.stopPropagation();
                                            setTeamToLeave(team);
                                        }}>
                                            <LogOut className="mr-2 h-4 w-4" /> Leave Team
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <CardDescription className="line-clamp-2">
                                {team.description || 'No description provided for this team.'}
                            </CardDescription>
                        </CardContent>
                        <CardFooter className="pt-2 border-t border-border/40 flex justify-between">
                            <div className="flex -space-x-2">
                                {team.members?.slice(0, 3).map((member, i) => (
                                    <div key={i} className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px]" title={member.role}>
                                        {member.role === 'admin' ? <Shield className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                                    </div>
                                ))}
                                {(team.members?.length || 0) > 3 && (
                                    <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px]">
                                        +{team.members.length - 3}
                                    </div>
                                )}
                            </div>
                            <span className="text-xs text-muted-foreground self-center">
                                {team.members?.length || 0} Member{(team.members?.length || 0) !== 1 ? 's' : ''}
                            </span>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
};

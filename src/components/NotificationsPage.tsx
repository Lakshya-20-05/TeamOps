import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDatabase } from '../db/database';
import type { Invitation, Notification } from '../db/schemas';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { Check, X, Bell } from 'lucide-react';

interface InvitationWithDetails extends Invitation {
    teamName: string;
    senderName: string;
}

// Debug Component to fix sync issues
function FixSyncButton() {
    const { user } = useAuth();
    const [fixing, setFixing] = useState(false);

    const handleFix = async () => {
        if (!user) return;
        setFixing(true);
        try {
            // 1. Backfill Remote NULL updated_at
            const { data: nullRows } = await supabase
                .from('notifications')
                .select('id, created_at')
                .is('updated_at', null);

            if (nullRows && nullRows.length > 0) {
                console.log(`[Fix] Found ${nullRows.length} remote rows with NULL updated_at. Patching...`);
                for (const row of nullRows) {
                    await supabase
                        .from('notifications')
                        .update({ updated_at: row.created_at })
                        .eq('id', row.id);
                }
                alert(`Remote Data Repaired: Fixed ${nullRows.length} notifications.`);
            } else {
                alert("Remote Data OK: No null timestamps found.");
            }
        } catch (err) {
            console.error("Fix failed:", err);
            alert("Fix Failed: Check console.");
        } finally {
            setFixing(false);
        }
    };

    return (
        <Button variant="secondary" size="sm" onClick={handleFix} disabled={fixing}>
            {fixing ? "Repairing..." : "Repair Sync"}
        </Button>
    );
}

export function NotificationsPage() {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const [invitations, setInvitations] = useState<InvitationWithDetails[]>([]);
    const [loading, setLoading] = useState(true);

    // Get the tab from URL query parameter, default to 'alerts'
    const defaultTab = searchParams.get('tab') === 'invitations' ? 'invitations' : 'alerts';

    useEffect(() => {
        if (!user) return;

        const fetchInvitations = async () => {
            const db = await getDatabase();

            // Subscribe to pending invitations for this user
            const sub = db.invitations.find({
                selector: {
                    receiverId: user.id,
                    status: 'pending'
                }
            }).$.subscribe(async (invites) => {
                const detailedInvites = await Promise.all(invites.map(async (invite) => {
                    const team = await db.teams.findOne(invite.teamId).exec();
                    const sender = await db.users.findOne(invite.senderId).exec();
                    return {
                        ...invite.toJSON(),
                        teamName: team?.name || 'Unknown Team',
                        senderName: sender?.name || 'Unknown User'
                    };
                }));
                setInvitations(detailedInvites);
                setLoading(false);
            });

            return () => sub.unsubscribe();
        };

        fetchInvitations();
    }, [user]);

    const handleAccept = async (invite: InvitationWithDetails) => {
        const db = await getDatabase();
        try {
            const team = await db.teams.findOne(invite.teamId).exec();
            if (team) {
                // Add member to team
                const updatedMembers = [...team.members, { userId: user!.id, role: 'member' as const }];
                await team.update({
                    $set: {
                        members: updatedMembers,
                        updatedAt: new Date().toISOString()
                    }
                });

                // Update invitation status
                const inviteDoc = await db.invitations.findOne(invite.id).exec();
                if (inviteDoc) {
                    await inviteDoc.update({
                        $set: {
                            status: 'accepted',
                            updatedAt: new Date().toISOString()
                        }
                    });
                }

                // Notify sender
                await db.notifications.insert({
                    id: crypto.randomUUID(),
                    userId: invite.senderId,
                    type: 'success',
                    title: 'Invitation Accepted',
                    message: `${user!.name} accepted your invitation to join ${invite.teamName}`,
                    read: false,
                    createdAt: new Date().toISOString(),
                    metadata: {
                        teamId: invite.teamId,
                        relatedUserId: user!.id
                    }
                });

            }
        } catch (error) {
            console.error("Failed to accept invitation:", error);
        }
    };

    const handleReject = async (inviteId: string) => {
        const db = await getDatabase();
        try {
            const inviteDoc = await db.invitations.findOne(inviteId).exec();
            if (inviteDoc) {
                await inviteDoc.update({
                    $set: {
                        status: 'rejected',
                        updatedAt: new Date().toISOString()
                    }
                });

                // Notify sender
                await db.notifications.insert({
                    id: crypto.randomUUID(),
                    userId: inviteDoc.senderId,
                    type: 'warning',
                    title: 'Invitation Rejected',
                    message: `${user!.name} rejected your invitation`,
                    read: false,
                    createdAt: new Date().toISOString(),
                    metadata: {
                        teamId: inviteDoc.teamId,
                        relatedUserId: user!.id
                    }
                });
            }
        } catch (error) {
            console.error("Failed to reject invitation:", error);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading notifications...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bell className="h-6 w-6 text-primary" />
                    <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
                </div>
                <FixSyncButton />
            </div>

            <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList>
                    <TabsTrigger value="alerts">Alerts</TabsTrigger>
                    <TabsTrigger value="invitations">
                        Invitations
                        {invitations.length > 0 && (
                            <span className="ml-2 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs">
                                {invitations.length}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="alerts" className="mt-4">
                    <AlertsList />
                </TabsContent>

                <TabsContent value="invitations" className="mt-4">
                    {invitations.length === 0 ? (
                        <div className="text-center py-12 bg-accent/5 rounded-lg border border-dashed text-muted-foreground">
                            <p>No pending invitations</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {invitations.map((invite) => (
                                <Card key={invite.id}>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Team Invitation</CardTitle>
                                        <CardDescription>
                                            <strong>{invite.senderName}</strong> invited you to join <strong>{invite.teamName}</strong>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardFooter className="flex justify-end gap-2">
                                        <Button variant="outline" onClick={() => handleReject(invite.id)}>
                                            <X className="mr-2 h-4 w-4" />
                                            Reject
                                        </Button>
                                        <Button onClick={() => handleAccept(invite)}>
                                            <Check className="mr-2 h-4 w-4" />
                                            Accept
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function AlertsList() {
    const { user } = useAuth();
    const [alerts, setAlerts] = useState<Notification[]>([]);

    useEffect(() => {
        if (!user) return;

        const fetchAlerts = async () => {
            const db = await getDatabase();

            // Mark unread as read (Optimistic UI handled by reactivity)
            const unread = await db.notifications.find({
                selector: {
                    userId: user.id,
                    read: false
                }
            }).exec();

            if (unread.length > 0) {
                await Promise.all(unread.map(doc => doc.incrementalModify(docData => {
                    docData.read = true;
                    return docData;
                })));
            }

            const sub = db.notifications.find({
                selector: {
                    userId: user.id
                },
                sort: [{ createdAt: 'desc' }]
            }).$.subscribe(data => {
                setAlerts(data.map(d => d.toJSON()));
            });
            return () => sub.unsubscribe();
        };
        fetchAlerts();
    }, [user]);

    if (alerts.length === 0) {
        return (
            <div className="text-center py-12 bg-accent/5 rounded-lg border border-dashed text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No new alerts</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {alerts.map(alert => (
                <Card key={alert.id} className={cn("border-l-4",
                    alert.type === 'success' ? "border-l-emerald-500" :
                        alert.type === 'error' ? "border-l-destructive" :
                            alert.type === 'warning' ? "border-l-amber-500" :
                                "border-l-blue-500"
                )}>
                    <CardHeader className="py-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-base">{alert.title}</CardTitle>
                                <CardDescription className="mt-1">{alert.message}</CardDescription>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {new Date(alert.createdAt).toLocaleDateString('en-GB')}
                            </span>
                        </div>
                    </CardHeader>
                </Card>
            ))}
        </div>
    );
}

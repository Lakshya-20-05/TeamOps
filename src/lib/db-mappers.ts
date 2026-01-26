
// Helper to map Local (RxDB/camelCase) -> Remote (Supabase/snake_case)
// And Remote -> Local

import type { User, Team, Task, Invitation } from '../db/schemas';

// --- Users ---
export const mapUserToRemote = (user: any) => ({
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    // password: user.password, // Never sync password
    phone_number: user.phoneNumber,
    created_at: user.createdAt,
    deleted: !!user._deleted
});

export const mapUserToLocal = (row: any): User & { _deleted?: boolean } => ({
    id: row.id,
    email: row.email,
    username: row.username,
    name: row.name,
    password: 'encrypted',
    phoneNumber: row.phone_number || undefined,
    createdAt: row.created_at,
    _deleted: row.deleted
});

// --- Teams ---
export const mapTeamToRemote = (team: any) => ({
    id: team.id,
    name: team.name,
    description: team.description,
    members: team.members, // JSONB
    created_at: team.createdAt,
    deleted: !!team._deleted
});

export const mapTeamToLocal = (row: any): Team & { _deleted?: boolean } => ({
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    members: row.members || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    _deleted: row.deleted
});

// --- Tasks ---
export const mapTaskToRemote = (task: any) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    deadline: task.deadline,
    completed_at: task.completedAt,
    team_id: task.teamId,
    assignee_id: task.assigneeId,
    attachments: task.attachments || [], // JSONB array
    updates: task.updates || [], // JSONB array for progress updates
    percent_complete: task.percentComplete ?? null,
    created_at: task.createdAt,
    updated_at: task.updatedAt, // Critical for sync pagination
    deleted: !!task._deleted
});

export const mapTaskToLocal = (row: any): Task & { _deleted?: boolean } => ({
    id: row.id,
    title: row.title,
    description: row.description || '',
    status: row.status,
    priority: row.priority || undefined,
    deadline: row.deadline || undefined,
    completedAt: row.completed_at || undefined,
    teamId: row.team_id,
    assigneeId: row.assignee_id || undefined,
    attachments: row.attachments || [],
    updates: row.updates || [],
    percentComplete: row.percent_complete ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    _deleted: row.deleted
});

// --- Invitations ---
export const mapInvitationToRemote = (inv: any) => ({
    id: inv.id,
    team_id: inv.teamId,
    sender_id: inv.senderId,
    receiver_id: inv.receiverId,
    status: inv.status,
    created_at: inv.createdAt,
    updated_at: inv.updatedAt,
    deleted: !!inv._deleted
});

export const mapInvitationToLocal = (row: any): Invitation & { _deleted?: boolean } => ({
    id: row.id,
    teamId: row.team_id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    _deleted: row.deleted
});

// --- Notifications ---
export const mapNotificationToRemote = (note: any) => ({
    id: note.id,
    user_id: note.userId,
    type: note.type,
    title: note.title,
    message: note.message,
    read: note.read,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
    metadata: note.metadata || {}, // JSONB in Supabase
    deleted: !!note._deleted
});

export const mapNotificationToLocal = (row: any): any => ({
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: row.read,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: row.metadata || {},
    _deleted: row.deleted
});

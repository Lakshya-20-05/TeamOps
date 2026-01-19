import type {
    RxJsonSchema,
    RxCollection,
    RxDocument
} from 'rxdb';

/* --- Interfaces --- */

export interface User {
    id: string;
    username: string;
    email: string;
    name: string; // Added
    password: string; // Added (In a real app, hash this!)
    phoneNumber?: string; // Added
    createdAt: string;
}

export interface TeamMember {
    userId: string;
    role: 'admin' | 'member';
}

export interface Team {
    id: string;
    name: string;
    description?: string;
    members: TeamMember[]; // Changed from string[]
    createdAt: string;
    updatedAt?: string;
}

export interface TaskAttachment {
    id: string;
    name: string;
    type: string; // MIME type
    size: number; // bytes
    data: string; // base64 encoded
    createdAt: string;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    status: 'todo' | 'in-progress' | 'done';
    priority?: 'low' | 'medium' | 'high';
    deadline?: string;
    completedAt?: string;
    teamId: string;
    assigneeId?: string;
    attachments?: TaskAttachment[]; // New: offline file attachments
    createdAt: string;
    updatedAt: string;
}

export interface Invitation {
    id: string;
    teamId: string;
    senderId: string;
    receiverId: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
}

/* --- Schemas --- */

export interface Notification {
    id: string;
    userId: string; // Who receives it
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    updatedAt?: string; // Added (optional to support old records or strict checks)
    metadata?: {
        teamId?: string;
        taskId?: string;
        relatedUserId?: string;
    };
}

/* --- Schemas --- */

export const userSchema: RxJsonSchema<User> = {
    version: 2, // Bumped for email index
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        username: {
            type: 'string'
        },
        email: {
            type: 'string',
            maxLength: 100
        },
        name: {
            type: 'string'
        },
        password: {
            type: 'string'
        },
        phoneNumber: {
            type: 'string'
        },
        createdAt: {
            type: 'string'
        }
    },
    required: ['id', 'username', 'email', 'password', 'createdAt'],
    indexes: ['email'] // Critical for offline login lookup
};

export const teamSchema: RxJsonSchema<Team> = {
    version: 2, // Bumped
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        name: {
            type: 'string'
        },
        description: {
            type: 'string'
        },
        members: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    userId: {
                        type: 'string'
                    },
                    role: {
                        type: 'string',
                        enum: ['admin', 'member']
                    }
                },
                required: ['userId', 'role']
            }
        },
        createdAt: {
            type: 'string'
        },
        updatedAt: { // Added
            type: 'string'
        }
    },
    required: ['id', 'name', 'createdAt']
};

export const taskSchema: RxJsonSchema<Task> = {
    version: 3, // Bumped for attachments
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        title: {
            type: 'string'
        },
        description: {
            type: 'string'
        },
        status: {
            type: 'string',
            enum: ['todo', 'in-progress', 'done']
        },
        priority: {
            type: 'string',
            enum: ['low', 'medium', 'high']
        },
        deadline: {
            type: 'string'
        },
        completedAt: {
            type: 'string',
            format: 'date-time'
        },
        teamId: {
            type: 'string'
        },
        assigneeId: {
            type: 'string'
        },
        attachments: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    type: { type: 'string' },
                    size: { type: 'number' },
                    data: { type: 'string' },
                    createdAt: { type: 'string' }
                },
                required: ['id', 'name', 'type', 'size', 'data', 'createdAt']
            }
        },
        createdAt: {
            type: 'string',
            format: 'date-time'
        },
        updatedAt: {
            type: 'string',
            format: 'date-time'
        }
    },
    required: ['id', 'title', 'status', 'createdAt', 'teamId']
};

export const invitationSchema: RxJsonSchema<Invitation> = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        teamId: {
            type: 'string'
        },
        senderId: {
            type: 'string'
        },
        receiverId: {
            type: 'string'
        },
        status: {
            type: 'string',
            enum: ['pending', 'accepted', 'rejected']
        },
        createdAt: {
            type: 'string',
            format: 'date-time'
        }
    },
    required: ['id', 'teamId', 'senderId', 'receiverId', 'status', 'createdAt']
};

export const notificationSchema: RxJsonSchema<Notification> = {
    version: 1, // Bumped to force re-sync for notification fix
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        userId: {
            type: 'string',
            maxLength: 100
        },
        type: {
            type: 'string',
            enum: ['info', 'success', 'warning', 'error']
        },
        title: {
            type: 'string'
        },
        message: {
            type: 'string'
        },
        read: {
            type: 'boolean'
        },
        createdAt: {
            type: 'string',
            format: 'date-time',
            maxLength: 40
        },
        updatedAt: { // Added
            type: 'string',
            format: 'date-time'
        },
        metadata: {
            type: 'object',
            properties: {
                teamId: { type: 'string' },
                taskId: { type: 'string' },
                relatedUserId: { type: 'string' }
            }
        }
    },
    indexes: [['userId', 'createdAt']],
    required: ['id', 'userId', 'title', 'message', 'read', 'createdAt']
};

/* --- Types --- */

export type UserDocument = RxDocument<User>;
export type TeamDocument = RxDocument<Team>;
export type TaskDocument = RxDocument<Task>;
export type InvitationDocument = RxDocument<Invitation>;
export type NotificationDocument = RxDocument<Notification>;

export type UserCollection = RxCollection<User>;
export type TeamCollection = RxCollection<Team>;
export type TaskCollection = RxCollection<Task>;
export type InvitationCollection = RxCollection<Invitation>;
export type NotificationCollection = RxCollection<Notification>;

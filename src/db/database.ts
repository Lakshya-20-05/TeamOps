import {
    createRxDatabase,
    addRxPlugin
} from 'rxdb';
import type {
    RxDatabase
} from 'rxdb';
import {
    getRxStorageDexie
} from 'rxdb/plugins/storage-dexie';
import {
    userSchema,
    teamSchema,
    taskSchema,
    invitationSchema,
    notificationSchema
} from './schemas';
import type {
    UserCollection,
    TeamCollection,
    TaskCollection,
    InvitationCollection,
    NotificationCollection
} from './schemas';

// Add plugins
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
addRxPlugin(RxDBDevModePlugin);
addRxPlugin(RxDBMigrationSchemaPlugin);
addRxPlugin(RxDBUpdatePlugin);

export type MyDatabaseCollections = {
    users: UserCollection;
    teams: TeamCollection;
    tasks: TaskCollection;
    invitations: InvitationCollection;
    notifications: NotificationCollection;
};

export type MyDatabase = RxDatabase<MyDatabaseCollections>;

let dbPromise: Promise<MyDatabase> | null = null;

import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';

// ... (existing imports)

const _create = async (): Promise<MyDatabase> => {
    console.log('DatabaseService: creating database...');

    const name = 'teammgmt_db_v2' + (import.meta.env.DEV ? '_dev' : '');

    try {
        const db = await createRxDatabase<MyDatabaseCollections>({
            name,
            storage: wrappedValidateAjvStorage({
                storage: getRxStorageDexie()
            }),
            ignoreDuplicate: true
        });

        console.log('DatabaseService: adding collections...');
        await db.addCollections({
            users: {
                schema: userSchema,
                migrationStrategies: {
                    1: function (oldDoc: any) {
                        // User migration: Add default fields for v1
                        oldDoc.name = oldDoc.username || 'Unknown';
                        oldDoc.password = 'password123'; // Default reset password
                        oldDoc.phoneNumber = '';
                        return oldDoc;
                    },
                    2: function (oldDoc: any) {
                        // User migration v2: added email index / maxLength
                        return oldDoc;
                    }
                }
            },
            teams: {
                schema: teamSchema,
                migrationStrategies: {
                    1: function (oldDoc: any) {
                        // Team migration: Convert string[] members to object[]
                        const oldMembers = oldDoc.members || [];
                        oldDoc.members = oldMembers.map((uid: string) => ({
                            userId: uid,
                            role: 'member'
                        }));
                        return oldDoc;
                    },
                    2: function (oldDoc: any) {
                        // Team migration v2: Add updatedAt
                        // We can set it to the same as createdAt initially if missing
                        // or just leave it undefined if it's optional in interface but required in schema? 
                        // It is NOT required in schema 'required' array, so valid.
                        return oldDoc;
                    }
                }
            },
            tasks: {
                schema: taskSchema,
                migrationStrategies: {
                    1: function (oldDoc: any) {
                        // Task migration: Add deadline and priority
                        oldDoc.priority = 'medium';
                        // deadline is optional, so we don't need to set it to null
                        return oldDoc;
                    },
                    2: function (oldDoc: any) {
                        // Task migration v2: Add completedAt
                        // existing tasks are ongoing or done, but we don't have time.
                        // Leave undefined.
                        return oldDoc;
                    },
                    3: function (oldDoc: any) {
                        // Task migration v3: Add attachments array
                        oldDoc.attachments = [];
                        return oldDoc;
                    }
                }
            },
            invitations: {
                schema: invitationSchema
            },
            notifications: {
                schema: notificationSchema,
                migrationStrategies: {
                    1: function (oldDoc: any) {
                        // v1: Added updatedAt
                        oldDoc.updatedAt = oldDoc.createdAt;
                        return oldDoc;
                    }
                }
            }
        });

        console.log('DatabaseService: initialization complete');
        return db;
    } catch (err) {
        console.error('DatabaseService: FATAL ERROR', err);
        throw err;
    }
};

export const getDatabase = (): Promise<MyDatabase> => {
    if (!dbPromise) {
        dbPromise = _create();
    }
    return dbPromise;
};

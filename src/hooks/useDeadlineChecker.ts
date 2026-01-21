import { useEffect, useRef } from 'react';
import { useDatabase } from './useDatabase';
import { useAuth } from '../context/AuthContext';
import type { Task } from '../db/schemas';
import { v4 as uuidv4 } from 'uuid';
import { showPushNotification, getPushPermission, getNotificationPreference } from '../lib/pushNotifications';

const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

interface NotifiedTasks {
    overdue: Set<string>;
    upcoming: Set<string>;
}

/**
 * Hook that monitors tasks for deadline alerts
 * Creates in-app notifications and push notifications for:
 * - Overdue tasks (deadline has passed)
 * - Upcoming deadlines (within 24 hours)
 */
export function useDeadlineChecker(): void {
    const db = useDatabase();
    const { user } = useAuth();
    const notifiedRef = useRef<NotifiedTasks>({
        overdue: new Set(),
        upcoming: new Set()
    });

    useEffect(() => {
        if (!db || !user) return;

        const checkDeadlines = async () => {
            try {
                // Get all tasks assigned to current user that are not done
                const tasks = await db.tasks
                    .find({
                        selector: {
                            assigneeId: user.id,
                            status: { $ne: 'done' }
                        }
                    })
                    .exec();

                const now = new Date();
                const notified = notifiedRef.current;

                for (const taskDoc of tasks) {
                    const task = taskDoc.toJSON() as Task;
                    if (!task.deadline) continue;

                    const deadline = new Date(task.deadline);
                    const timeUntilDeadline = deadline.getTime() - now.getTime();
                    const taskId = task.id;

                    // Check for overdue
                    if (timeUntilDeadline < 0 && !notified.overdue.has(taskId)) {
                        notified.overdue.add(taskId);

                        // Create in-app notification
                        await db.notifications.insert({
                            id: uuidv4(),
                            userId: user.id,
                            type: 'warning',
                            title: 'Task Overdue!',
                            message: `"${task.title}" deadline has passed`,
                            read: false,
                            createdAt: new Date().toISOString(),
                            metadata: {
                                taskId: task.id,
                                teamId: task.teamId
                            }
                        });

                        // Show push notification if enabled
                        if (getNotificationPreference() && getPushPermission() === 'granted') {
                            showPushNotification('⚠️ Task Overdue!', {
                                body: `"${task.title}" deadline has passed`,
                                tag: `overdue-${taskId}`,
                                requireInteraction: true
                            });
                        }
                    }
                    // Check for upcoming (within 24 hours)
                    else if (
                        timeUntilDeadline > 0 &&
                        timeUntilDeadline < TWENTY_FOUR_HOURS_MS &&
                        !notified.upcoming.has(taskId) &&
                        !notified.overdue.has(taskId)
                    ) {
                        notified.upcoming.add(taskId);

                        // Create in-app notification
                        await db.notifications.insert({
                            id: uuidv4(),
                            userId: user.id,
                            type: 'info',
                            title: 'Deadline Approaching',
                            message: `"${task.title}" is due in less than 24 hours`,
                            read: false,
                            createdAt: new Date().toISOString(),
                            metadata: {
                                taskId: task.id,
                                teamId: task.teamId
                            }
                        });

                        // Show push notification if enabled
                        if (getNotificationPreference() && getPushPermission() === 'granted') {
                            showPushNotification('⏰ Deadline Approaching', {
                                body: `"${task.title}" is due in less than 24 hours`,
                                tag: `upcoming-${taskId}`
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Deadline checker error:', error);
            }
        };

        // Run immediately and then on interval
        checkDeadlines();
        const interval = setInterval(checkDeadlines, CHECK_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [db, user]);
}

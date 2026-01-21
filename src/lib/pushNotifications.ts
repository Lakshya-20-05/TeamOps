/**
 * Push Notification Helper
 * Handles browser push notifications with permission management
 */

// Check if push notifications are supported
export function isPushSupported(): boolean {
    return 'Notification' in window;
}

// Get current permission status
export function getPushPermission(): NotificationPermission | 'unsupported' {
    if (!isPushSupported()) return 'unsupported';
    return Notification.permission;
}

// Request permission for push notifications
export async function requestPushPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!isPushSupported()) return 'unsupported';

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission === 'denied') {
        return 'denied';
    }

    // Request permission
    const permission = await Notification.requestPermission();
    return permission;
}

// Show a push notification
export function showPushNotification(
    title: string,
    options?: {
        body?: string;
        icon?: string;
        tag?: string; // Unique ID to prevent duplicate notifications
        requireInteraction?: boolean;
        onClick?: () => void;
    }
): void {
    if (!isPushSupported() || Notification.permission !== 'granted') {
        console.log('Push notification not shown - permission not granted');
        return;
    }

    const notification = new Notification(title, {
        body: options?.body,
        icon: options?.icon || '/vite.svg',
        tag: options?.tag,
        requireInteraction: options?.requireInteraction || false,
    });

    if (options?.onClick) {
        notification.onclick = () => {
            window.focus();
            options.onClick?.();
            notification.close();
        };
    }

    // Auto-close after 10 seconds if not interacted
    setTimeout(() => notification.close(), 10000);
}

// Check if user has enabled notifications in localStorage preferences
export function getNotificationPreference(): boolean {
    const pref = localStorage.getItem('pushNotificationsEnabled');
    return pref === 'true';
}

export function setNotificationPreference(enabled: boolean): void {
    localStorage.setItem('pushNotificationsEnabled', enabled.toString());
}

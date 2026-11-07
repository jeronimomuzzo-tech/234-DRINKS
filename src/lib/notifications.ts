// Notification & PWA Sound Alert Service for 234 Drinks

export interface NotificationPayload {
    title: string;
    body: string;
    tag?: string;
    icon?: string;
    vibratePattern?: number[];
    data?: any;
}

// 1. Check if notifications are supported
export const isNotificationSupported = (): boolean => {
    return typeof window !== 'undefined' && 'Notification' in window;
};

// 2. Get current permission status
export const getNotificationPermission = (): NotificationPermission => {
    if (!isNotificationSupported()) return 'denied';
    return Notification.permission;
};

// 3. Request permission
export const requestNotificationPermission = async (): Promise<boolean> => {
    if (!isNotificationSupported()) return false;
    try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    } catch (e) {
        console.error("Error requesting notification permission", e);
        return false;
    }
};

// 4. Play attention-grabbing Party Alert Chime (Web Audio API synth)
export const playPartyAlertSound = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        // High party chime tone 1
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

        gain1.gain.setValueAtTime(0.3, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.4);

        // Chime tone 2
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.18); // A5
        osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.4); // D6

        gain2.gain.setValueAtTime(0.35, ctx.currentTime + 0.18);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.18);
        osc2.stop(ctx.currentTime + 0.6);

    } catch (e) {
        console.warn("Could not play synthesized party chime", e);
    }
};

// 5. Send Notification (via Service Worker if ready, or Fallback Notification)
export const sendPreNotification = async (payload: NotificationPayload) => {
    // Always trigger sound & haptic vibration
    playPartyAlertSound();
    if (navigator.vibrate) {
        navigator.vibrate(payload.vibratePattern || [200, 100, 200, 100, 300]);
    }

    if (!isNotificationSupported() || Notification.permission !== 'granted') {
        console.log("Notification skipped: permission not granted or not supported.");
        return;
    }

    try {
        // Try Service Worker registration first (standard for PWAs & Android)
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            if (registration && registration.showNotification) {
                await registration.showNotification(payload.title, {
                    body: payload.body,
                    icon: payload.icon || '/icon.jpg',
                    badge: '/icon.svg',
                    tag: payload.tag || 'prevspre-alert',
                    vibrate: payload.vibratePattern || [200, 100, 200, 100, 300],
                    data: payload.data || { url: window.location.href }
                } as any);
                return;
            }
        }

        // Fallback to standard Window Notification
        new Notification(payload.title, {
            body: payload.body,
            icon: payload.icon || '/icon.jpg',
            tag: payload.tag || 'prevspre-alert'
        });
    } catch (e) {
        console.error("Failed to show notification", e);
    }
};

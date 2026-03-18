/**
 * LifeLine India - Firebase Messaging Service Worker
 * Handles background push notifications when app is closed
 * Version: 2.1.0
 */

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Firebase configuration
firebase.initializeApp({
    apiKey: "AIzaSyC2xQpfkeUHywfCuBQ_ycc_0AM2wx2-xcE",
    authDomain: "lifelineindia-8ebc7.firebaseapp.com",
    databaseURL: "https://lifelineindia-8ebc7-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "lifelineindia-8ebc7",
    storageBucket: "lifelineindia-8ebc7.appspot.com",
    messagingSenderId: "651026634889",
    appId: "1:651026634889:web:lifeline"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);
    
    const notificationData = payload.data || {};
    const notification = payload.notification || {};
    
    // Determine notification type and customize
    const notificationType = notificationData.type || 'general';
    let notificationOptions = {
        body: notification.body || notificationData.body || 'New notification',
        icon: './icons/ambulance-192.png',
        badge: './icons/badge-72.png',
        tag: notificationData.tag || 'lifeline-' + Date.now(),
        renotify: true,
        requireInteraction: notificationType === 'emergency_request',
        vibrate: notificationType === 'emergency_request' ? [200, 100, 200, 100, 200] : [200, 100, 200],
        data: notificationData,
        actions: []
    };
    
    // Customize based on notification type
    switch(notificationType) {
        case 'emergency_request':
            // Driver receiving emergency alert
            notificationOptions.actions = [
                { action: 'accept', title: '✓ Accept' },
                { action: 'view', title: '👁 View' }
            ];
            notificationOptions.requireInteraction = true;
            break;
            
        case 'ambulance_accepted':
            // User receiving acceptance notification
            notificationOptions.actions = [
                { action: 'track', title: '📍 Track' },
                { action: 'call', title: '📞 Call' }
            ];
            break;
            
        case 'incoming_ambulance':
            // Hospital receiving incoming patient alert
            notificationOptions.actions = [
                { action: 'prepare', title: '🏥 Prepare' },
                { action: 'view', title: '👁 View' }
            ];
            notificationOptions.requireInteraction = true;
            break;
            
        case 'driver_arrived':
            notificationOptions.actions = [
                { action: 'open', title: 'Open App' }
            ];
            break;
            
        case 'trip_completed':
            // No special actions needed
            break;
            
        case 'admin_broadcast':
            notificationOptions.requireInteraction = true;
            break;
    }
    
    const title = notification.title || notificationData.title || 'LifeLine India';
    
    return self.registration.showNotification(title, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action);
    
    event.notification.close();
    
    const data = event.notification.data || {};
    let urlToOpen = '/';
    
    // Determine URL based on action and notification type
    switch(event.action) {
        case 'accept':
            urlToOpen = '/?action=accept&alertId=' + (data.alertId || '');
            break;
        case 'track':
            urlToOpen = '/?screen=track&bookingId=' + (data.bookingId || '');
            break;
        case 'call':
            if (data.driverPhone) {
                urlToOpen = 'tel:+91' + data.driverPhone;
            }
            break;
        case 'prepare':
        case 'view':
            urlToOpen = '/?screen=hospital&notifId=' + (data.notificationId || '');
            break;
        default:
            urlToOpen = '/';
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.postMessage({
                            type: 'NOTIFICATION_CLICK',
                            action: event.action,
                            data: data
                        });
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notification closed');
});

// Service worker install
self.addEventListener('install', (event) => {
    console.log('[SW] Service Worker installing...');
    self.skipWaiting();
});

// Service worker activate
self.addEventListener('activate', (event) => {
    console.log('[SW] Service Worker activating...');
    event.waitUntil(clients.claim());
});

// Handle messages from main app
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

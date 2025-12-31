
import dbConnect, { Notification } from './db.js';

/**
 * Creates a new notification in the database.
 * @param {string} recipientId - Receiver User ID
 * @param {string} title - Notification Title
 * @param {string} message - Notification Message
 * @param {string} sourceType - Source Type (chat/task/project/meeting)
 * @param {string} sourceId - Source ID
 */
export async function createNotification(recipientId, title, message, sourceType, sourceId = null) {
    try {
        await dbConnect();
        const notification = new Notification({
            recipient: recipientId,
            title,
            message,
            sourceType,
            sourceId,
            status: 'unread'
        });
        await notification.save();
        return notification;
    } catch (error) {
        console.error('Failed to create notification:', error);
        return null;
    }
}

/**
 * Marks a notification as read.
 * @param {string} notificationId 
 */
export async function markAsRead(notificationId) {
    try {
        await dbConnect();
        const notification = await Notification.findByIdAndUpdate(
            notificationId,
            { status: 'read' },
            { new: true }
        );

        return notification;
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
        return null;
    }
}

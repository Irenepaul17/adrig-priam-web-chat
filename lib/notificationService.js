import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userRole: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['meeting', 'reminder', 'info'], default: 'meeting' },
  meetingId: { type: String },
  meetingLink: { type: String },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

export const createNotification = async (notificationData) => {
  const notification = new Notification(notificationData);
  await notification.save();
  return notification;
};

export const getNotifications = async (userRole) => {
  return await Notification.find({ userRole }).sort({ createdAt: -1 });
};

export const markAsRead = async (notificationId) => {
  return await Notification.findByIdAndUpdate(notificationId, { isRead: true });
};
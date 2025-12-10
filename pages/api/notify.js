export default function handler(req, res) {
  if (req.method === 'POST') {
    const { recipients, message, type, scheduledFor } = req.body;
    
    // Simulate notification sending
    const notificationId = Math.random().toString(36).substr(2, 9);
    
    res.status(200).json({
      success: true,
      notificationId,
      message: 'Notifications sent successfully',
      recipients: recipients || [],
      type: type || 'meeting_reminder',
      scheduledFor: scheduledFor || new Date().toISOString(),
      sentAt: new Date().toISOString()
    });
  } else if (req.method === 'GET') {
    const notifications = [
      { id: 1, type: 'meeting_reminder', message: 'Meeting in 1 hour', sentAt: '2024-12-01T09:00:00Z' },
      { id: 2, type: 'deadline_alert', message: 'Project deadline tomorrow', sentAt: '2024-12-01T10:00:00Z' },
      { id: 3, type: 'task_assigned', message: 'New task assigned', sentAt: '2024-12-01T11:00:00Z' }
    ];
    res.status(200).json(notifications);
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
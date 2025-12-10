import { useState, useEffect } from 'react';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const userEmail = localStorage.getItem('userEmail');
      if (!token || !userEmail) return;
      
      // Get all notifications first
      const response = await fetch('/api/notifications');
      if (!response.ok) return;
      
      const allNotifications = await response.json();
      
      // Get team data to find current user ID
      const teamResponse = await fetch('/api/team');
      if (!teamResponse.ok) return;
      
      const teamData = await teamResponse.json();
      const currentUser = teamData.find(user => user.email === userEmail);
      
      if (!currentUser) return;
      
      // Filter notifications for current user
      const userNotifications = allNotifications.filter(n => n.userId == currentUser.id);
      
      setNotifications(userNotifications);
      setUnreadCount(userNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Fail silently to avoid breaking the UI
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '18px',
          position: 'relative',
          padding: '8px'
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '0',
            right: '0',
            background: '#dc3545',
            color: 'white',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: '0',
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px',
          width: '300px',
          maxHeight: '400px',
          overflowY: 'auto',
          zIndex: 1000,
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{ padding: '10px', borderBottom: '1px solid #eee', fontWeight: 'bold', color: '#333' }}>
            Notifications
          </div>
          {notifications.length > 0 ? (
            notifications.map(notification => (
              <div 
                key={notification.id} 
                onClick={() => !notification.read && markAsRead(notification.id)}
                style={{
                  padding: '10px',
                  borderBottom: '1px solid #eee',
                  background: notification.read ? 'white' : '#f8f9fa',
                  color: '#333',
                  cursor: notification.read ? 'default' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!notification.read) {
                    e.target.style.backgroundColor = '#e9ecef';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = notification.read ? 'white' : '#f8f9fa';
                }}
              >
                <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                  {notification.message}
                  {!notification.read && (
                    <span style={{ 
                      marginLeft: '8px', 
                      color: '#007bff', 
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      • NEW
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {new Date(notification.timestamp).toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              No notifications
            </div>
          )}
        </div>
      )}
    </div>
  );
}
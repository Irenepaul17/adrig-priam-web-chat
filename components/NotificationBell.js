import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';

export default function NotificationBell({ userRole, iconColor = 'white' }) {
  const router = useRouter(); // Hook
  const [notifications, setNotifications] = useState([]);

  // Code moved to render phase to prevent Hooks Error

  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    fetchNotifications();
    // const interval = setInterval(fetchNotifications, 30000); // Keep polling as backup - DISABLED for Pure Socket
    // return () => clearInterval(interval);
  }, []);

  // NEW: Socket connection effect
  useEffect(() => {
    if (!currentUserId) return;

    const socket = io({ transports: ['websocket'] });
    socket.emit('join_room', `user_${currentUserId}`);

    socket.on('notification', (newNotif) => {
      // SMART FILTER: If user is currently looking at this chat, ignore the notification
      const currentChatId = router.query.id;
      if (currentChatId && newNotif.sourceId === currentChatId) {
        return;
      }

      console.log('Real-time notification received:', newNotif); // Debug log
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUserId]);

  const fetchNotifications = async () => {
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
      if (!token || !userEmail) return;

      // Get team data to find current user ID
      const teamResponse = await fetch('/api/team');
      if (!teamResponse.ok) return;

      const teamData = await teamResponse.json();
      const currentUser = teamData.find(user => user.email === userEmail);

      if (!currentUser) return;

      // Store ID for socket usage
      setCurrentUserId(currentUser._id || currentUser.id);

      // Fetch notifications for current user using new schema
      const response = await fetch(`/api/notifications?userId=${currentUser.id}`);
      if (!response.ok) return;

      const userNotifications = await response.json();

      setNotifications(userNotifications);
      setUnreadCount(userNotifications.filter(n => n.status === 'unread').length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
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
          n._id === notificationId ? { ...n, status: 'read' } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Hide UI on chat pages, but keep socket logic running
  if (router.pathname.startsWith('/chat')) {
    return null;
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          background: 'none',
          border: 'none',
          color: iconColor,
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
          width: '320px',
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
                key={notification._id}
                onClick={() => notification.status === 'unread' && markAsRead(notification._id)}
                style={{
                  padding: '12px',
                  borderBottom: '1px solid #eee',
                  background: notification.status === 'read' ? 'white' : '#f8f9fa',
                  color: '#333',
                  cursor: notification.status === 'read' ? 'default' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (notification.status === 'unread') {
                    e.currentTarget.style.backgroundColor = '#e9ecef';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = notification.status === 'read' ? 'white' : '#f8f9fa';
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{notification.title}</span>
                  {notification.status === 'unread' && (
                    <span style={{
                      color: '#007bff',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      background: '#e7f3ff',
                      padding: '2px 6px',
                      borderRadius: '10px'
                    }}>
                      NEW
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '13px', marginBottom: '6px', color: '#555' }}>
                  {notification.message}
                </div>
                <div style={{ fontSize: '11px', color: '#999', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{new Date(notification.createdAt).toLocaleString()}</span>
                  <span style={{ textTransform: 'capitalize', color: '#666' }}>{notification.sourceType}</span>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
              No notifications yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
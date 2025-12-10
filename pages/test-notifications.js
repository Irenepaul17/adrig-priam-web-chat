import { useState } from 'react';

export default function TestNotifications() {
  const [result, setResult] = useState('');

  const testCreateNotification = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: ['1', '2'],
          message: 'Test notification',
          type: 'test'
        })
      });
      const data = await response.json();
      setResult('Created: ' + JSON.stringify(data, null, 2));
    } catch (error) {
      setResult('Error: ' + error.message);
    }
  };

  const testGetNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      setResult('All notifications: ' + JSON.stringify(data, null, 2));
    } catch (error) {
      setResult('Error: ' + error.message);
    }
  };

  const clearNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', { method: 'DELETE' });
      const data = await response.json();
      setResult('Cleared: ' + JSON.stringify(data, null, 2));
    } catch (error) {
      setResult('Error: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Notifications</h1>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={testCreateNotification} style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
          Create Test Notification
        </button>
        <button onClick={testGetNotifications} style={{ padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>
          Get All Notifications
        </button>
        <button onClick={clearNotifications} style={{ padding: '10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}>
          Clear All Notifications
        </button>
      </div>
      <pre style={{ background: '#f8f9fa', padding: '15px', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
        {result}
      </pre>
    </div>
  );
}
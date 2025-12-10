import { useState } from 'react';

export default function TestMeeting() {
  const [result, setResult] = useState('');

  const testMeetingCreation = async () => {
    try {
      const testMeeting = {
        projectId: 1,
        title: 'Test Meeting Direct',
        date: '2024-12-05',
        time: '15:00',
        participants: [1, 2, 3]
      };

      console.log('Sending test meeting:', testMeeting);
      
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testMeeting)
      });

      const data = await response.json();
      console.log('Response:', data);
      
      if (response.ok) {
        setResult('✅ Meeting created successfully! Check server logs and notifications.');
      } else {
        setResult('❌ Error: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error:', error);
      setResult('❌ Network error: ' + error.message);
    }
  };

  const testNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      console.log('All notifications:', data);
      setResult('📋 Check console for notifications. Count: ' + data.length);
    } catch (error) {
      setResult('❌ Error fetching notifications: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Meeting System Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testMeetingCreation}
          style={{ 
            padding: '12px 24px', 
            background: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          🧪 Test Meeting Creation
        </button>
        
        <button 
          onClick={testNotifications}
          style={{ 
            padding: '12px 24px', 
            background: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer'
          }}
        >
          📋 Check Notifications
        </button>
      </div>

      {result && (
        <div style={{ 
          padding: '15px', 
          background: result.includes('✅') ? '#d4edda' : '#f8d7da',
          color: result.includes('✅') ? '#155724' : '#721c24',
          borderRadius: '4px',
          marginTop: '20px'
        }}>
          {result}
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', background: '#e9ecef', borderRadius: '4px' }}>
        <h3>Instructions:</h3>
        <ol>
          <li>Click "Test Meeting Creation" to directly create a meeting via API</li>
          <li>Check browser console (F12) for detailed logs</li>
          <li>Check server terminal for meeting creation logs</li>
          <li>Click "Check Notifications" to see all notifications</li>
          <li>Go to any dashboard to see if notifications appear in the bell</li>
        </ol>
      </div>
    </div>
  );
}
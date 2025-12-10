import { useState } from 'react';

export default function Admin() {
  const [message, setMessage] = useState('');

  const clearMeetings = async () => {
    try {
      const response = await fetch('/api/meetings', {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (response.ok) {
        setMessage('All meetings cleared successfully!');
      } else {
        setMessage('Error clearing meetings');
      }
    } catch (error) {
      setMessage('Network error');
    }
    
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Admin Panel</h1>
      
      <button 
        onClick={clearMeetings}
        style={{ 
          width: '100%', 
          padding: '15px', 
          background: '#dc3545', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px', 
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        Clear All Scheduled Meetings
      </button>

      {message && (
        <div style={{ 
          marginTop: '20px', 
          padding: '10px', 
          borderRadius: '4px',
          background: message.includes('successfully') ? '#d4edda' : '#f8d7da',
          color: message.includes('successfully') ? '#155724' : '#721c24',
          textAlign: 'center'
        }}>
          {message}
        </div>
      )}
    </div>
  );
}
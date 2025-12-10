import { useState } from 'react';

export default function ClearNotifications() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const clearNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/delete-notifications', {
        method: 'DELETE'
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>🗑️ Clear Notifications</h1>
      
      <button 
        onClick={clearNotifications} 
        disabled={loading}
        style={{
          padding: '10px 20px',
          background: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        {loading ? 'Clearing...' : 'Clear All Notifications'}
      </button>

      {result && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '5px' }}>
          <h3>Result:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
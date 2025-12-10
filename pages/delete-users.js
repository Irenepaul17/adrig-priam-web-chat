import { useState } from 'react';

export default function DeleteUsers() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const deleteUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/delete-users', {
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
      <h1>🗑️ Delete All Users</h1>
      
      <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '5px', marginBottom: '20px', border: '1px solid #ffeaa7' }}>
        <strong>⚠️ Warning:</strong> This will permanently delete all user accounts from the database!
      </div>
      
      <button 
        onClick={deleteUsers} 
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
        {loading ? 'Deleting...' : 'Delete All Users'}
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
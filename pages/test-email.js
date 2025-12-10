import { useState } from 'react';

export default function TestEmail() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState(['client', 'developer']);

  const roles = ['client', 'director', 'project_manager', 'developer', 'tester', 'crm'];

  const testEmail = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testRoles: selectedRoles })
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({ error: error.message });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>📧 Email Test Page</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Select Roles to Test:</h3>
        {roles.map(role => (
          <label key={role} style={{ display: 'block', margin: '5px 0' }}>
            <input
              type="checkbox"
              checked={selectedRoles.includes(role)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedRoles([...selectedRoles, role]);
                } else {
                  setSelectedRoles(selectedRoles.filter(r => r !== role));
                }
              }}
            />
            {role} → {role}@priam.com
          </label>
        ))}
      </div>

      <button 
        onClick={testEmail} 
        disabled={loading || selectedRoles.length === 0}
        style={{
          padding: '10px 20px',
          background: '#1d76ba',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        {loading ? 'Testing...' : 'Test Email Notifications'}
      </button>

      {results && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '5px' }}>
          <h3>Test Results:</h3>
          
          {results.emailConfig && (
            <div style={{ marginBottom: '15px', padding: '10px', background: '#e9ecef', borderRadius: '3px' }}>
              <strong>Email Configuration:</strong>
              <ul>
                <li>Host: {results.emailConfig.host}</li>
                <li>User: {results.emailConfig.user}</li>
                <li>Password Set: {results.emailConfig.hasPassword ? '✅ Yes' : '❌ No'}</li>
              </ul>
            </div>
          )}

          {results.results && (
            <div>
              <strong>Email Results:</strong>
              {results.results.map((result, index) => (
                <div key={index} style={{ margin: '5px 0', padding: '5px', background: result.status === 'sent' ? '#d4edda' : '#f8d7da', borderRadius: '3px' }}>
                  {result.status === 'sent' ? '✅' : '❌'} {result.email} - {result.status}
                  {result.error && <div style={{ fontSize: '12px', color: '#721c24' }}>Error: {result.error}</div>}
                </div>
              ))}
            </div>
          )}

          {results.error && (
            <div style={{ color: 'red' }}>
              <strong>Error:</strong> {results.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
import { useState } from 'react';

export default function DebugEmail() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testEmail = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔍 Email Debug Page</h1>
      
      <button 
        onClick={testEmail} 
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
        {loading ? 'Testing...' : 'Debug Email System'}
      </button>

      {result && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '5px' }}>
          <h3>Debug Results:</h3>
          <pre style={{ background: '#e9ecef', padding: '10px', borderRadius: '3px', overflow: 'auto' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      
      <div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '5px' }}>
        <h4>⚠️ Common Issues:</h4>
        <ul>
          <li><strong>App Password Required:</strong> Outlook may require an App Password instead of regular password</li>
          <li><strong>2FA Enabled:</strong> If you have 2-factor authentication, you need an App Password</li>
          <li><strong>Less Secure Apps:</strong> May need to enable "Less secure app access"</li>
        </ul>
        
        <h4>🔧 How to Generate App Password:</h4>
        <ol>
          <li>Go to <a href="https://account.microsoft.com/security" target="_blank">Microsoft Account Security</a></li>
          <li>Click "Advanced security options"</li>
          <li>Click "Create a new app password"</li>
          <li>Use that password in .env.local instead of your regular password</li>
        </ol>
      </div>
    </div>
  );
}
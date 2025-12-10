import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const router = useRouter();

  const [loginData, setLoginData] = useState({ username: '', email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    role: '',
    secretKey: '',
  });

  // When the login page loads, treat it as a fresh login:
  // clear any existing auth data so you can log in as a different user.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('currentUserId');
    } catch (err) {
      console.error('Failed to clear auth data on login page', err);
    }
  }, []);

  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (response.ok) {
        // store current user id for chat
        if (data.user && data.user._id) {
          localStorage.setItem('currentUserId', data.user._id);
        }

        // existing behaviour – keep as-is
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('userEmail', data.email);

        showMessage('Login successful!', 'success');
        router.push(`/${data.role}`);
      } else {
        showMessage(data.error, 'error');
      }
    } catch (error) {
      showMessage('Network error', 'error');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData),
      });
      const data = await response.json();

      if (response.ok) {
        showMessage('Registration successful! Please login.', 'success');
        setIsLogin(true);
      } else {
        showMessage(data.error, 'error');
      }
    } catch (error) {
      showMessage('Network error', 'error');
    }
  };

  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        maxWidth: '400px',
        margin: '100px auto',
        padding: '20px',
      }}
    >
      <h1
        style={{
          background:
            'linear-gradient(45deg, #ff0000, #ff8000, #ffff00, #80ff00, #00ff00, #00ff80, #00ffff, #0080ff, #0000ff, #8000ff, #ff00ff, #ff0080)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textAlign: 'center',
          fontSize: '2.5em',
          marginBottom: '30px',
        }}
      >
        PRIAM
      </h1>
      {isLogin ? (
        <div>
          <h2>Login</h2>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '15px' }}>
              <input
                type="text"
                placeholder="Username"
                value={loginData.username}
                onChange={(e) =>
                  setLoginData({ ...loginData, username: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
                required
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <input
                type="email"
                placeholder="Email Address"
                value={loginData.email}
                onChange={(e) =>
                  setLoginData({ ...loginData, email: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
                required
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <input
                type="password"
                placeholder="Password"
                value={loginData.password}
                onChange={(e) =>
                  setLoginData({ ...loginData, password: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
                required
              />
            </div>
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '10px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Login
            </button>
          </form>
          <p>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setIsLogin(false);
              }}
            >
              Don't have an account? Register
            </a>
          </p>
        </div>
      ) : (
        <div>
          <h2>Register</h2>
          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: '15px' }}>
              <input
                type="text"
                placeholder="Username"
                value={registerData.username}
                onChange={(e) =>
                  setRegisterData({ ...registerData, username: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
                required
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <input
                type="email"
                placeholder="Email Address"
                value={registerData.email}
                onChange={(e) =>
                  setRegisterData({ ...registerData, email: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
                required
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <input
                type="password"
                placeholder="Password"
                value={registerData.password}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    password: e.target.value,
                  })
                }
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
                required
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <select
                value={registerData.role}
                onChange={(e) =>
                  setRegisterData({ ...registerData, role: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
                required
              >
                <option value="">Select Role</option>
                <option value="client">Client</option>
                <option value="director">Director</option>
                <option value="project_manager">Project Manager</option>
                <option value="developer">Developer</option>
                <option value="tester">Tester</option>
                <option value="crm">CRM</option>
              </select>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <input
                type="password"
                placeholder="Secret Key"
                value={registerData.secretKey}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    secretKey: e.target.value,
                  })
                }
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
                required
              />
            </div>
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '10px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Register
            </button>
          </form>
          <p>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setIsLogin(true);
              }}
            >
              Already have an account? Login
            </a>
          </p>
        </div>
      )}

      {message && (
        <div
          style={{
            marginTop: '10px',
            padding: '10px',
            borderRadius: '4px',
            background:
              messageType === 'success' ? '#d4edda' : '#f8d7da',
            color: messageType === 'success' ? '#155724' : '#721c24',
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}

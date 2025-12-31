import { useRouter } from 'next/router';
import Link from 'next/link';
import NotificationBell from '../../../components/NotificationBell';

export default function CRMProjects() {
  const router = useRouter();

  const logout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('currentUserId'); // <-- important
    } catch (err) {
      console.error('Error clearing auth data from localStorage', err);
    }
    router.push('/');
  };


  return (
    <div>
      <nav
        style={{
          background: '#343a40',
          color: 'white',
          padding: '15px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <h1 style={{ margin: 0, fontSize: '24px' }}>CRM Dashboard</h1>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {/* NEW LINK */}
          <Link
            href="/users"
            style={{
              color: 'white',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              background: '#495057'
            }}
          >
            Chat
          </Link>

          <NotificationBell userRole="crm" />

          <a
            onClick={logout}
            style={{
              color: 'white',
              cursor: 'pointer',
              padding: '8px 16px',
              borderRadius: '4px'
            }}
          >
            Logout
          </a>
        </div>
      </nav>

      <div style={{ padding: '20px' }}>
        <h2>CRM Projects</h2>
        <p>CRM dashboard content here</p>
      </div>
    </div>
  );
}

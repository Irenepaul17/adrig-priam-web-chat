import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Developer() {
  const [dashboardData, setDashboardData] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    
    if (!token || role !== 'developer') {
      router.push('/');
      return;
    }
    
    router.push('/developerdashboard/projects');
  }, []);

  const loadDashboardData = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/dashboard/developer', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setDashboardData(data.data || data.message);
    } catch (error) {
      setDashboardData('Error loading dashboard data');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    router.push('/');
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
      <h2>Developer Dashboard</h2>
      <div style={{ margin: '20px 0', padding: '15px', background: '#e9ecef', borderRadius: '4px' }}>
        {dashboardData}
      </div>
      <button onClick={logout} style={{ width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        Logout
      </button>
    </div>
  );
}
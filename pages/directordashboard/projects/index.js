import { useRouter } from 'next/router';
import Link from 'next/link';
import NotificationBell from '../../../components/NotificationBell';

export default function DirectorProjects() {
  const router = useRouter();

  const allProjects = [
    { id: 1, name: 'E-commerce website development', description: 'Complete online shopping platform with payment integration', status: 'In Progress', deadline: '2024-12-15' },
    { id: 2, name: 'Mobile app for food delivery', description: 'iOS and Android app for restaurant food ordering', status: 'Planning', deadline: '2024-11-30' },
    { id: 3, name: 'CRM system integration', description: 'Customer relationship management system setup', status: 'Testing', deadline: '2024-12-01' },
    { id: 4, name: 'Data analytics dashboard', description: 'Business intelligence and reporting dashboard', status: 'Completed', completedDate: '2024-07-01' },
    { id: 5, name: 'Social media platform', description: 'Community-based social networking application', status: 'In Progress', deadline: '2025-01-15' },
    { id: 6, name: 'Inventory management system', description: 'Warehouse and stock management solution', status: 'Completed', completedDate: '2024-07-03' },
    { id: 7, name: 'Customer support portal', description: 'Help desk and ticket management system', status: 'Completed', completedDate: '2024-06-15' }
  ];

  const projects = [
    ...allProjects.filter(p => p.status !== 'Completed'),
    ...allProjects.filter(p => p.status === 'Completed').sort((a, b) => new Date(a.completedDate) - new Date(b.completedDate))
  ];

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
      <nav style={{ background: '#343a40', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>Director Dashboard</h1>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Link href="/directordashboard/projects" style={{ color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '4px', background: '#495057' }}>Projects</Link>
          <Link href="/directordashboard/messages" style={{ color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '4px' }}>Messages</Link>

          {/* NEW CHAT LINK */}
          <Link
            href="/users"
            style={{ color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '4px' }}
          >
            Chat
          </Link>

          <NotificationBell userRole="director" />
          <a onClick={logout} style={{ color: 'white', cursor: 'pointer', padding: '8px 16px', borderRadius: '4px' }}>Logout</a>
        </div>
      </nav>

      <div style={{ padding: '20px' }}>
        <h2>Projects</h2>
        <div>
          {projects.map(project => (
            <div key={project.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: '1px solid #ddd', marginBottom: '10px', borderRadius: '4px' }}>
              <h3 style={{ margin: 0 }}>{project.name}</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                {project.status !== 'Completed' && (
                  <button
                    onClick={() => {
                      localStorage.setItem('selectedProjectId', project.id);
                      router.push('/directordashboard/projects/meeting');
                    }}
                    style={{ background: '#28a745', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Meeting
                  </button>
                )}
                <button
                  onClick={() => {
                    localStorage.setItem('selectedProjectId', project.id);
                    router.push('/directordashboard/projects/view');
                  }}
                  style={{ background: '#007bff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

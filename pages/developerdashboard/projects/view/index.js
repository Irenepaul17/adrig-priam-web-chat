import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function DeveloperViewProject() {
  const [project, setProject] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const projectId = localStorage.getItem('selectedProjectId');
    if (projectId) {
      fetch(`/api/projects`)
        .then(res => res.json())
        .then(projects => {
          const selectedProject = projects.find(p => p.id === parseInt(projectId));
          setProject(selectedProject);
        });

      fetch(`/api/meetings?projectId=${projectId}`)
        .then(res => res.json())
        .then(data => setMeetings(data));
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  if (!project) {
    return <div style={{ padding: '20px' }}>Loading project details...</div>;
  }

  return (
    <div>
      <nav style={{ background: '#343a40', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>Developer Dashboard</h1>
        <div style={{ display: 'flex', gap: '20px' }}>
          <Link href="/developerdashboard/projects" style={{ color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '4px' }}>Projects</Link>
          <a onClick={logout} style={{ color: 'white', cursor: 'pointer', padding: '8px 16px', borderRadius: '4px' }}>Logout</a>
        </div>
      </nav>

      <div style={{ padding: '20px' }}>
        <button 
          onClick={() => router.push('/developerdashboard/projects')}
          style={{ marginBottom: '20px', padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          ← Back to Projects
        </button>

        <div style={{ background: 'white', padding: '20px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '28px', color: '#333' }}>{project.name}</h2>
          <p style={{ color: '#666', marginBottom: '15px' }}>{project.description}</p>
        </div>

        <div style={{ background: 'white', padding: '20px', border: '1px solid #ddd', borderRadius: '4px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '20px' }}>Upcoming Meetings</h3>
          {meetings.length > 0 ? (
            <div>
              {meetings.map(meeting => (
                <div key={meeting.id} style={{ borderLeft: '4px solid #28a745', paddingLeft: '15px', paddingTop: '8px', paddingBottom: '8px', marginBottom: '10px', background: '#f8f9fa' }}>
                  <div style={{ fontWeight: 'bold', color: '#333' }}>{meeting.title}</div>
                  <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                    <strong>Date:</strong> {meeting.date} | <strong>Time:</strong> {meeting.time}
                  </div>
                  <button 
                    onClick={() => {
                      const roomName = `priam-${project.name.replace(/\s+/g, '-').toLowerCase()}-${meeting.date}-${meeting.time.replace(':', '')}`;
                      const meetingRoom = meeting.meetingLink || `https://meet.jit.si/${roomName}`;
                      window.open(meetingRoom, '_blank');
                    }}
                    style={{ marginTop: '8px', padding: '6px 12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    🚀 Join Jitsi Meeting
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#666' }}>No upcoming meetings scheduled.</p>
          )}
        </div>
      </div>
    </div>
  );
}
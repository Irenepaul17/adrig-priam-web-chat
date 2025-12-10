import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function ViewProject() {
  const [project, setProject] = useState(null);
  const [meetings, setMeetings] = useState([]);

  const [team, setTeam] = useState([]);
  const router = useRouter();

  const fetchMeetings = () => {
    const projectId = localStorage.getItem('selectedProjectId');
    if (projectId) {
      fetch(`/api/meetings?projectId=${projectId}`)
        .then(res => res.json())
        .then(data => {
          console.log('Fetched meetings:', data);
          setMeetings(data);
        });
    }
  };

  const getParticipantNames = (participantIds) => {
    return participantIds.map(id => {
      const member = team.find(t => t.id === String(id)); // Convert both to strings for exact match
      return member ? member.name : `User ${id}`;
    }).join(', ');
  };

  useEffect(() => {
    const projectId = localStorage.getItem('selectedProjectId');
    if (projectId) {
      fetch(`/api/projects`)
        .then(res => res.json())
        .then(projects => {
          const selectedProject = projects.find(p => p.id === parseInt(projectId));
          setProject(selectedProject);
        });

      fetch('/api/team')
        .then(res => res.json())
        .then(data => setTeam(data));

      fetchMeetings();
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
        <h1 style={{ margin: 0, fontSize: '24px' }}>Project Manager Dashboard</h1>
        <div style={{ display: 'flex', gap: '20px' }}>
          <Link href="/projectmanagerdashboard/projects" style={{ color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '4px' }}>Projects</Link>
          <Link href="/project_manager/messages" style={{ color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '4px' }}>Messages</Link>
          <a onClick={logout} style={{ color: 'white', cursor: 'pointer', padding: '8px 16px', borderRadius: '4px' }}>Logout</a>
        </div>
      </nav>

      <div style={{ padding: '20px' }}>
        <button 
          onClick={() => router.push('/projectmanagerdashboard/projects')}
          style={{ marginBottom: '20px', padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          ← Back to Projects
        </button>

        <div style={{ background: 'white', padding: '20px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '28px', color: '#333' }}>{project.name}</h2>
          <p style={{ color: '#666', marginBottom: '15px' }}>{project.description}</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div>
              <strong>Status: </strong>
              <span style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '14px',
                background: project.status === 'Completed' ? '#d4edda' : project.status === 'In Progress' ? '#cce5ff' : project.status === 'Testing' ? '#fff3cd' : '#e9ecef',
                color: project.status === 'Completed' ? '#155724' : project.status === 'In Progress' ? '#004085' : project.status === 'Testing' ? '#856404' : '#495057'
              }}>
                {project.status}
              </span>
            </div>
            <div>
              <strong>{project.status === 'Completed' ? 'Completed: ' : 'Deadline: '}</strong>
              <span>{project.completedDate || project.deadline}</span>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', padding: '20px', border: '1px solid #ddd', borderRadius: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, fontSize: '20px' }}>Upcoming Meetings</h3>
            <button 
              onClick={fetchMeetings}
              style={{ padding: '6px 12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
            >
              🔄 Refresh
            </button>
          </div>
          {meetings.length > 0 ? (
            <div>
              {meetings.map(meeting => (
                <div key={meeting.id} style={{ borderLeft: '4px solid #28a745', paddingLeft: '15px', paddingTop: '8px', paddingBottom: '8px', marginBottom: '10px', background: '#f8f9fa' }}>
                  <div style={{ fontWeight: 'bold', color: '#333' }}>{meeting.title}</div>
                  <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                    <strong>Date:</strong> {meeting.date} | <strong>Time:</strong> {meeting.time}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                    <strong>Participants:</strong> {getParticipantNames(meeting.participants || [])}
                  </div>
                  <button 
                    onClick={() => {
                      localStorage.setItem('selectedProjectId', project.id);
                      router.push('/project_manager/jitsi');
                    }}
                    style={{ marginTop: '8px', padding: '6px 12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    Join Meeting
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
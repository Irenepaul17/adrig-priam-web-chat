import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function JitsiMeeting() {
  const [project, setProject] = useState(null);
  const [meetingLink, setMeetingLink] = useState('');
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    const projectId = localStorage.getItem('selectedProjectId');
    if (projectId && id) {
      fetch(`/api/projects`)
        .then(res => res.json())
        .then(projects => {
          const selectedProject = projects.find(p => p.id === parseInt(projectId));
          setProject(selectedProject);
          generateMeetingLink(projectId, id);
        });
    }
  }, [id]);

  const generateMeetingLink = (projectId, meetingId) => {
    const meetingCode = `priam-project-${projectId}-meeting-${meetingId}`;
    setMeetingLink(`https://meet.jit.si/${meetingCode}`);
  };

  const joinMeeting = () => {
    window.open(meetingLink, '_blank');
  };

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(meetingLink);
    alert('Meeting link copied to clipboard!');
  };

  const logout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  if (!project) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  return (
    <div>
      <nav style={{ background: '#343a40', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>Client Dashboard</h1>
        <div style={{ display: 'flex', gap: '20px' }}>
          <Link href="/clientdashboard/projects" style={{ color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '4px' }}>Projects</Link>
          <a onClick={logout} style={{ color: 'white', cursor: 'pointer', padding: '8px 16px', borderRadius: '4px' }}>Logout</a>
        </div>
      </nav>

      <div style={{ padding: '20px' }}>
        <button 
          onClick={() => router.push('/clientdashboard/projects/view/meeting')}
          style={{ marginBottom: '20px', padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          ← Back to Meetings
        </button>

        <div style={{ background: 'white', padding: '20px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 20px 0' }}>Jitsi Meet: {project.name} - Meeting #{id}</h2>
          
          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📹</div>
            <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Ready to join the meeting?</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>Click the button below to join via Jitsi Meet</p>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
              <button 
                onClick={joinMeeting}
                style={{ 
                  padding: '12px 24px', 
                  background: '#1d76ba', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                🚀 Join Jitsi Meet
              </button>
              <button 
                onClick={copyMeetingLink}
                style={{ 
                  padding: '12px 24px', 
                  background: '#00acc1', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                📋 Copy Link
              </button>
            </div>
            
            <div style={{ background: 'white', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}>
              <small style={{ color: '#666' }}>Meeting Link:</small>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#333', wordBreak: 'break-all' }}>
                {meetingLink}
              </div>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', color: '#666' }}>
            <p>Share this link with other participants to join the meeting</p>
          </div>
        </div>
      </div>
    </div>
  );
}
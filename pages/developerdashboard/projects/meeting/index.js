import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function JitsiMeeting() {
  const [project, setProject] = useState(null);
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [participants, setParticipants] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const projectId = localStorage.getItem('selectedProjectId');
    if (projectId) {
      fetch(`/api/projects`)
        .then(res => res.json())
        .then(projects => {
          const selectedProject = projects.find(p => p.id === parseInt(projectId));
          setProject(selectedProject);
          generateMeetingLink(projectId);
        });
    }

    fetch('/api/team')
      .then(res => res.json())
      .then(data => setParticipants(data));
  }, []);

  const generateMeetingLink = (projectId) => {
    const meetingId = `priam-project-${projectId}-${Date.now()}`;
    setMeetingLink(`https://meet.jit.si/${meetingId}`);
  };

  const joinMeeting = () => {
    window.open(meetingLink, '_blank');
  };

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(meetingLink);
    alert('Meeting link copied to clipboard!');
  };



  const scheduleMeeting = async () => {
    if (!meetingDate || !meetingTime || selectedParticipants.length === 0) {
      alert('Please fill all fields and select participants');
      return;
    }

    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          title: `${project.name} Meeting`,
          date: meetingDate,
          time: meetingTime,
          participants: selectedParticipants
        })
      });

      if (response.ok) {
        alert('Meeting scheduled successfully!');
        setMeetingDate('');
        setMeetingTime('');
        setSelectedParticipants([]);
        router.push('/developerdashboard/projects/view');
      } else {
        alert('Failed to schedule meeting');
      }
    } catch (error) {
      alert('Error scheduling meeting');
    }
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
        <h1 style={{ margin: 0, fontSize: '24px' }}>Developer Dashboard</h1>
        <div style={{ display: 'flex', gap: '20px' }}>
          <a onClick={logout} style={{ color: 'white', cursor: 'pointer', padding: '8px 16px', borderRadius: '4px' }}>Logout</a>
        </div>
      </nav>

      <div style={{ padding: '20px' }}>
        <div style={{ background: 'white', padding: '20px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 20px 0' }}>Schedule Meeting: {project.name}</h2>
          
          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Meeting Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Date:</label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Time:</label>
                <input
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Select Participants</label>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', padding: '8px', cursor: 'pointer', background: '#f8f9fa', borderRadius: '4px' }}>
                  <input
                    type="checkbox"
                    checked={participants.length > 0 && selectedParticipants.length === participants.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedParticipants(participants.map(p => p.id));
                      } else {
                        setSelectedParticipants([]);
                      }
                    }}
                    style={{ marginRight: '10px' }}
                  />
                  <div style={{ fontWeight: 'bold', color: '#007bff' }}>Select All</div>
                </label>
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '10px' }}>
                {participants && participants.map ? participants.map(person => (
                  <label key={person.id} style={{ display: 'flex', alignItems: 'center', padding: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedParticipants.includes(person.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedParticipants([...selectedParticipants, person.id]);
                        } else {
                          setSelectedParticipants(selectedParticipants.filter(id => id !== person.id));
                        }
                      }}
                      style={{ marginRight: '10px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{person.name}</div>
                      <div style={{ fontSize: '14px', color: '#666' }}>{person.role}</div>
                    </div>
                  </label>
                )) : <div style={{ color: '#666' }}>Loading participants...</div>}
              </div>
            </div>
            
            <button
              onClick={scheduleMeeting}
              style={{
                width: '100%',
                padding: '12px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                marginBottom: '20px'
              }}
            >
              📅 Schedule Meeting
            </button>
          </div>
          
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
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function ProjectManagerMeeting() {
  const [project, setProject] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
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
        });
    }

    fetch('/api/team')
      .then(res => res.json())
      .then(data => setParticipants(data));
  }, []);

  const handleScheduleMeeting = () => {
    if (!selectedDate || !selectedTime || selectedParticipants.length === 0) {
      alert('Please fill all fields and select participants');
      return;
    }

    const meetingData = {
      projectId: project.id,
      title: `${project.name} - Team Meeting`,
      date: selectedDate,
      time: selectedTime,
      participants: selectedParticipants
    };

    fetch('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meetingData)
    })
    .then(res => res.json())
    .then(() => {
      alert('Meeting scheduled successfully!');
      router.push('/project_manager/view');
    });
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
        <h1 style={{ margin: 0, fontSize: '24px' }}>Project Manager Dashboard</h1>
        <div style={{ display: 'flex', gap: '20px' }}>
          <Link href="/project_manager/projects" style={{ color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '4px' }}>Projects</Link>
          <Link href="/project_manager/messages" style={{ color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '4px' }}>Messages</Link>
          <a onClick={logout} style={{ color: 'white', cursor: 'pointer', padding: '8px 16px', borderRadius: '4px' }}>Logout</a>
        </div>
      </nav>

      <div style={{ padding: '20px' }}>
        <button 
          onClick={() => router.push('/project_manager/view')}
          style={{ marginBottom: '20px', padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          ← Back to Project
        </button>

        <div style={{ background: 'white', padding: '20px', border: '1px solid #ddd', borderRadius: '4px' }}>
          <h2 style={{ margin: '0 0 20px 0' }}>Schedule Meeting for {project.name}</h2>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Time</label>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
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
            onClick={handleScheduleMeeting}
            style={{ width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Schedule Meeting
          </button>
        </div>
      </div>
    </div>
  );
}
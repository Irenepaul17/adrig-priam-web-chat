import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import NotificationBell from '../../components/NotificationBell';

export default function DirectorMessages() {
  const [selectedTeamType, setSelectedTeamType] = useState('allRoles');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const teamMembers = {
    developers: [
      { name: 'John Smith', projects: [1, 2] },
      { name: 'Sarah Johnson', projects: [2] },
      { name: 'Mike Chen', projects: [3, 2, 5] }
    ],
    testers: [
      { name: 'Lisa Brown', projects: [1, 3] },
      { name: 'David Wilson', projects: [2, 5] }
    ],
    projectManager: [
      { name: 'Emily Davis', projects: [1, 2] },
      { name: 'Robert Taylor', projects: [3, 5] }
    ],
    crm: [
      { name: 'Jennifer Lee', projects: [1, 2, 3, 5] }
    ],
    clients: [
      { name: 'Michael Johnson', projects: [1, 2, 3, 5] },
      { name: 'Amanda Wilson', projects: [1, 3] }
    ]
  };

  const getProjectName = (projectId) => {
    const projectNames = {
      1: 'E-commerce website development',
      2: 'Mobile app for food delivery', 
      3: 'CRM system integration',
      4: 'Data analytics dashboard',
      5: 'Social media platform'
    };
    return projectNames[projectId] || 'Unknown Project';
  };

  const getAllMembers = () => {
    const allMembers = [];
    Object.keys(teamMembers).forEach(role => {
      teamMembers[role].forEach(member => {
        allMembers.push({ ...member, role });
      });
    });
    return allMembers;
  };

  const getFilteredMembers = () => {
    const members = selectedTeamType === 'allRoles' ? getAllMembers() : 
      teamMembers[selectedTeamType]?.map(member => ({ ...member, role: selectedTeamType })) || [];
    
    if (!searchQuery) return members;
    
    return members.filter(member => 
      member.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const logout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  return (
    <div>
      <nav style={{ background: '#343a40', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>Director Dashboard</h1>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Link href="/directordashboard/projects" style={{ color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '4px' }}>Projects</Link>
          <Link href="/directordashboard/messages" style={{ color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '4px', background: '#495057' }}>Messages</Link>
          <NotificationBell userRole="director" />
          <a onClick={logout} style={{ color: 'white', cursor: 'pointer', padding: '8px 16px', borderRadius: '4px' }}>Logout</a>
        </div>
      </nav>

      <div style={{ padding: '20px' }}>
        <h2>Messages</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
            <input 
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                padding: '10px', 
                border: '1px solid #ddd', 
                borderRadius: '4px', 
                width: '300px',
                fontSize: '16px'
              }}
            />
            <span style={{ fontSize: '20px' }}>🔍</span>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {['allRoles', 'developers', 'testers', 'projectManager', 'crm', 'clients'].map(role => (
              <button 
                key={role}
                onClick={() => setSelectedTeamType(role)}
                style={{ 
                  background: selectedTeamType === role ? '#007bff' : '#e9ecef', 
                  color: selectedTeamType === role ? 'white' : 'black',
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: '4px', 
                  cursor: 'pointer' 
                }}
              >
                {role === 'allRoles' ? 'All Roles' : role === 'projectManager' ? 'Project Manager' : role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <h3>{selectedTeamType === 'allRoles' ? 'All Team Members' : selectedTeamType.charAt(0).toUpperCase() + selectedTeamType.slice(1) + ' Team'}</h3>
          {getFilteredMembers().map((member, index) => (
            <div key={index} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '10px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>
                {member.name} ({member.role === 'projectManager' ? 'Project Manager' : member.role.charAt(0).toUpperCase() + member.role.slice(1)})
              </h4>
              <div style={{ marginLeft: '20px' }}>
                {member.projects.map(projectId => (
                  <div key={projectId} style={{ marginBottom: '5px', color: '#666' }}>
                    • {getProjectName(projectId)}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {getFilteredMembers().length === 0 && (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No team members found matching your search.</p>
          )}
        </div>
      </div>
    </div>
  );
}
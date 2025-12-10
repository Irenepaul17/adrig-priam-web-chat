export default function handler(req, res) {
  if (req.method === 'GET') {
    const { role, search } = req.query;
    
    const teamMembers = {
      developers: [
        { name: 'John Smith', projects: [1, 2], lastSeen: '2024-12-01T10:30:00Z' },
        { name: 'Sarah Johnson', projects: [2], lastSeen: '2024-12-01T09:15:00Z' },
        { name: 'Mike Chen', projects: [3, 2, 5], lastSeen: '2024-12-01T11:45:00Z' }
      ],
      testers: [
        { name: 'Lisa Brown', projects: [1, 3], lastSeen: '2024-12-01T08:20:00Z' },
        { name: 'David Wilson', projects: [2, 5], lastSeen: '2024-12-01T12:10:00Z' }
      ],
      projectManager: [
        { name: 'Emily Davis', projects: [1, 2], lastSeen: '2024-12-01T13:30:00Z' },
        { name: 'Robert Taylor', projects: [3, 5], lastSeen: '2024-12-01T14:15:00Z' }
      ],
      crm: [
        { name: 'Jennifer Lee', projects: [1, 2, 3, 5], lastSeen: '2024-12-01T15:45:00Z' }
      ],
      directors: [
        { name: 'Michael Johnson', projects: [1, 2, 3, 5], lastSeen: '2024-12-01T16:20:00Z' },
        { name: 'Amanda Wilson', projects: [1, 3], lastSeen: '2024-12-01T17:10:00Z' }
      ]
    };

    let result = role && teamMembers[role] ? teamMembers[role] : 
                 Object.values(teamMembers).flat().map(member => ({ ...member, role: Object.keys(teamMembers).find(r => teamMembers[r].includes(member)) }));

    if (search) {
      result = result.filter(member => member.name.toLowerCase().includes(search.toLowerCase()));
    }

    res.status(200).json(result);
  } else if (req.method === 'POST') {
    const { to, message, from } = req.body;
    res.status(200).json({
      success: true,
      messageId: Math.random().toString(36).substr(2, 9),
      message: 'Message sent successfully',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
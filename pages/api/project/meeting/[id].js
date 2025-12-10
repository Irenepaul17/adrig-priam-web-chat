export default function handler(req, res) {
  const { id } = req.query;
  
  if (req.method === 'GET') {
    const meeting = {
      id: parseInt(id),
      projectId: 1,
      title: `Meeting Room ${id}`,
      status: 'active',
      participants: ['developers', 'crm', 'projectManager'],
      startTime: new Date().toISOString(),
      meetingUrl: `https://meet.google.com/room-${id}`
    };
    res.status(200).json(meeting);
  } else if (req.method === 'POST') {
    res.status(200).json({
      success: true,
      message: `Joined meeting ${id}`,
      meetingUrl: `https://meet.google.com/room-${id}`
    });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
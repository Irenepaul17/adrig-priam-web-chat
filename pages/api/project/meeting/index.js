export default function handler(req, res) {
  if (req.method === 'GET') {
    const meetings = [
      { id: 1, projectId: 1, title: 'E-commerce Planning', date: '2024-12-10', time: '10:00', participants: ['developers', 'crm', 'projectManager'] },
      { id: 2, projectId: 2, title: 'Food App Review', date: '2024-12-12', time: '14:00', participants: ['developers', 'testers'] },
      { id: 3, projectId: 3, title: 'CRM Integration', date: '2024-12-15', time: '16:00', participants: ['crm', 'directors'] }
    ];
    res.status(200).json(meetings);
  } else if (req.method === 'POST') {
    const { projectId, participants, date, time } = req.body;
    const meetingId = Math.random().toString(36).substr(2, 9);
    res.status(200).json({
      success: true,
      meetingId,
      message: 'Meeting scheduled successfully',
      participants,
      scheduledFor: `${date} at ${time}`
    });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
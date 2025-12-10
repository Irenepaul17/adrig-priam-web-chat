export default function handler(req, res) {
  if (req.method === 'GET') {
    const events = [
      { id: 1, title: 'E-commerce Planning', date: '2024-12-10', time: '10:00', type: 'meeting' },
      { id: 2, title: 'Project Deadline', date: '2024-12-15', time: '23:59', type: 'deadline' },
      { id: 3, title: 'Team Review', date: '2024-12-20', time: '14:00', type: 'meeting' }
    ];
    res.status(200).json(events);
  } else if (req.method === 'POST') {
    const { title, date, time, type } = req.body;
    const eventId = Math.random().toString(36).substr(2, 9);
    res.status(200).json({
      success: true,
      eventId,
      message: 'Event scheduled successfully',
      event: { id: eventId, title, date, time, type }
    });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
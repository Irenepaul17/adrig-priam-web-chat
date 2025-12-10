export default function handler(req, res) {
  if (req.method === 'POST') {
    const { projectId, participants, date, time } = req.body;
    
    // Simulate meeting creation
    const meetingId = Math.random().toString(36).substr(2, 9);
    
    // Here you would typically:
    // 1. Save meeting to database
    // 2. Send email notifications to participants
    // 3. Schedule reminders
    
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
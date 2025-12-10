import dbConnect, { User, Meeting } from '../../lib/db';

export default async function handler(req, res) {


  // Get registered users from database only
  const getTeamData = async () => {
    try {
      await dbConnect();
      const registeredUsers = await User.find({}, 'username email role').lean();
      
      const dbUsers = registeredUsers.map((user) => ({
        id: user._id.toString(), // Use MongoDB's unique _id (same as team API)
        username: user.username,
        name: user.username,
        role: user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' '),
        email: user.email
      }));
      
      return dbUsers;
    } catch (error) {
      console.error('Database error:', error);
      return [];
    }
  };

  if (req.method === 'GET') {
    try {
      await dbConnect();
      const { projectId } = req.query;
      
      let meetings;
      if (projectId) {
        meetings = await Meeting.find({ projectId: parseInt(projectId) }).lean();
        console.log('Filtered meetings for project:', meetings);
      } else {
        meetings = await Meeting.find({}).lean();
      }
      
      res.status(200).json(meetings);
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: 'Failed to fetch meetings' });
    }
  } else if (req.method === 'POST') {
    const team = await getTeamData();
    
    await dbConnect();
    
    const newMeeting = new Meeting({
      projectId: req.body.projectId,
      title: req.body.title,
      date: req.body.date,
      time: req.body.time,
      participants: req.body.participants
    });
    
    const savedMeeting = await newMeeting.save();
    console.log('🔥 Meeting saved to database:', savedMeeting);

    // Send notifications and emails (handle both string and numeric IDs)
    console.log('Meeting participants:', req.body.participants);
    console.log('Available team members:', team.map(t => ({ id: t.id, name: t.name, email: t.email })));
    
    const participantEmails = req.body.participants.map(id => {
      const member = team.find(t => t.id == id); // Use == to handle string/number comparison
      console.log(`Looking for ID ${id}, found:`, member);
      return member ? member.email : null;
    }).filter(email => email);

    const participantNames = req.body.participants.map(id => {
      const member = team.find(t => t.id == id); // Use == to handle string/number comparison
      return member ? member.name : null;
    }).filter(name => name);
    
    console.log('Final participant emails:', participantEmails);
    console.log('Final participant names:', participantNames);

    // Send in-app notifications
    try {
      await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: req.body.participants,
          message: `Meeting scheduled: ${req.body.title} on ${req.body.date} at ${req.body.time}`,
          type: 'meeting'
        })
      });
    } catch (error) {
      console.error('Notification error:', error);
    }

    // Send emails to actual user login emails
    console.log('Attempting to send emails to:', participantEmails);
    if (participantEmails.length > 0) {
      try {
        console.log('Sending email request...');
        const emailResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: participantEmails,
            subject: `Meeting Invitation: ${req.body.title}`,
            text: `You have been invited to a meeting:\n\nTitle: ${req.body.title}\nDate: ${req.body.date}\nTime: ${req.body.time}\n\nParticipants: ${participantNames.join(', ')}\n\nPlease join the meeting at the scheduled time.`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #007bff; text-align: center;">Meeting Invitation</h2>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
                  <p><strong>Title:</strong> ${req.body.title}</p>
                  <p><strong>Date:</strong> ${req.body.date}</p>
                  <p><strong>Time:</strong> ${req.body.time}</p>
                  <p><strong>Participants:</strong> ${participantNames.join(', ')}</p>
                </div>
                <p style="text-align: center; margin: 20px 0;">
                  <strong>Please join the meeting at the scheduled time.</strong>
                </p>
                <div style="text-align: center; margin: 20px 0;">
                  <a href="#" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Join Meeting</a>
                </div>
              </div>
            `
          })
        });
        
        const emailResult = await emailResponse.json();
        console.log('Email API response:', emailResult);
        
        if (emailResponse.ok) {
          console.log('✅ Emails sent successfully!');
        } else {
          console.error('❌ Email sending failed:', emailResult);
        }
      } catch (error) {
        console.error('❌ Email error:', error);
      }
    } else {
      console.log('⚠️ No email addresses found for participants');
    }

    res.status(201).json(savedMeeting);
  } else if (req.method === 'DELETE') {
    try {
      await dbConnect();
      await Meeting.deleteMany({});
      res.status(200).json({ message: 'All meetings cleared successfully' });
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: 'Failed to clear meetings' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
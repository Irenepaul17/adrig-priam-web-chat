import dbConnect from '../../lib/db';
import { scheduleMeeting } from '../../lib/meetingScheduler';
import { sendMeetingNotification, getRoleEmails } from '../../lib/emailService';
import { createNotification } from '../../lib/notificationService';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Starting meeting scheduling...');
    console.log('Request body:', req.body);
    
    await dbConnect();
    console.log('✅ Database connected');

    const { projectId, projectName, date, time, participants, meetingLink, scheduledBy } = req.body;

    const meetingData = {
      projectId,
      projectName,
      date,
      time,
      participants,
      meetingLink,
      scheduledBy
    };

    console.log('📅 Creating meeting with data:', meetingData);
    const meeting = await scheduleMeeting(meetingData);
    console.log('✅ Meeting created:', meeting._id);

    // Send email notifications
    console.log('📧 Starting email notifications...');
    
    // Get registered users from database only
    const { User } = await import('../../lib/db');
    const registeredUsers = await User.find({}, 'username email role').lean();
    const teamMembers = registeredUsers.map((user, index) => ({
      id: index + 1,
      username: user.username,
      name: user.username.charAt(0).toUpperCase() + user.username.slice(1),
      role: user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' '),
      email: user.email
    }));
    
    // Map participant IDs to actual registered user emails
    const emails = participants.map(participantId => {
      const user = teamMembers.find(member => member.id === participantId);
      return user ? user.email : null;
    }).filter(Boolean);
    
    console.log('📧 Participant IDs:', participants);
    console.log('📧 Email addresses:', emails);
    
    const meetingDetails = {
      projectName,
      date,
      time,
      meetingLink,
      participants
    };

    let emailResults = [];
    for (const email of emails) {
      try {
        await sendMeetingNotification(
          email,
          `Meeting Scheduled: ${projectName}`,
          meetingDetails
        );
        emailResults.push({ email, status: 'sent' });
        console.log(`✅ Email sent to: ${email}`);
      } catch (emailError) {
        emailResults.push({ email, status: 'failed', error: emailError.message });
        console.error(`❌ Email failed to: ${email}`, emailError);
      }
    }

    // Send in-app notifications
    console.log('🔔 Starting in-app notifications...');
    const roles = participants.includes('all_roles') 
      ? ['client', 'director', 'project_manager', 'developer', 'tester', 'crm']
      : participants;
    
    console.log('🔔 Notification roles:', roles);
    
    let notificationResults = [];
    for (const role of roles) {
      try {
        const notification = await createNotification({
          userId: role,
          userRole: role,
          title: 'Meeting Scheduled',
          message: `New meeting scheduled for ${projectName} on ${date} at ${time}`,
          type: 'meeting',
          meetingId: meeting._id,
          meetingLink
        });
        notificationResults.push({ role, status: 'created', id: notification._id });
        console.log(`✅ Notification created for: ${role}`);
      } catch (notifError) {
        notificationResults.push({ role, status: 'failed', error: notifError.message });
        console.error(`❌ Notification failed for: ${role}`, notifError);
      }
    }

    // Mark scheduled notification as sent
    meeting.notificationsSent.scheduled = true;
    await meeting.save();
    console.log('✅ Meeting updated with notification status');

    console.log('🎉 Meeting scheduling completed successfully!');
    
    res.json({ 
      success: true, 
      meetingId: meeting._id,
      emailResults,
      notificationResults,
      debug: {
        emailsCount: emails.length,
        notificationsCount: roles.length
      }
    });
  } catch (error) {
    console.error('❌ Meeting scheduling error:', error);
    res.status(500).json({ 
      error: 'Failed to schedule meeting',
      details: error.message,
      stack: error.stack
    });
  }
}
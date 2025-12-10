import dbConnect from './db.js';
import { Meeting } from './meetingScheduler.js';
import { sendMeetingNotification, getRoleEmails } from './emailService.js';

// Check for notifications every hour (3600000 ms)
setInterval(async () => {
  console.log('Checking for meeting notifications...');
  
  try {
    await dbConnect();
    const now = new Date();
    
    // Get all upcoming meetings
    const meetings = await Meeting.find({
      date: { $gte: now.toISOString().split('T')[0] }
    });

    for (const meeting of meetings) {
      const meetingDateTime = new Date(`${meeting.date}T${meeting.time}`);
      const timeDiff = meetingDateTime.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // 24 hour notification
      if (hoursDiff <= 24 && hoursDiff > 23 && !meeting.notificationsSent.day24) {
        const emails = getRoleEmails(meeting.participants);
        const meetingDetails = {
          projectName: meeting.projectName,
          date: meeting.date,
          time: meeting.time,
          meetingLink: meeting.meetingLink,
          participants: meeting.participants
        };

        for (const email of emails) {
          await sendMeetingNotification(
            email,
            `Reminder: Meeting Tomorrow - ${meeting.projectName}`,
            meetingDetails
          );
        }

        meeting.notificationsSent.day24 = true;
        await meeting.save();
        console.log(`24h notification sent for meeting: ${meeting.projectName}`);
      }

      // 1 hour notification
      if (hoursDiff <= 1 && hoursDiff > 0 && !meeting.notificationsSent.hour1) {
        const emails = getRoleEmails(meeting.participants);
        const meetingDetails = {
          projectName: meeting.projectName,
          date: meeting.date,
          time: meeting.time,
          meetingLink: meeting.meetingLink,
          participants: meeting.participants
        };

        for (const email of emails) {
          await sendMeetingNotification(
            email,
            `Meeting Starting Soon - ${meeting.projectName}`,
            meetingDetails
          );
        }

        meeting.notificationsSent.hour1 = true;
        await meeting.save();
        console.log(`1h notification sent for meeting: ${meeting.projectName}`);
      }
    }
  } catch (error) {
    console.error('Cron job error:', error);
  }
}, 3600000); // Run every hour

console.log('Meeting notification scheduler started');
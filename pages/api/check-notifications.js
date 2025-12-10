import dbConnect from '../../lib/db';
import { Meeting } from '../../lib/meetingScheduler';
import { sendMeetingNotification, getRoleEmails } from '../../lib/emailService';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const now = new Date();
    
    const meetings = await Meeting.find({
      date: { $gte: now.toISOString().split('T')[0] }
    });

    let notificationsSent = 0;

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
        notificationsSent++;
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
        notificationsSent++;
      }
    }

    res.json({ success: true, notificationsSent });
  } catch (error) {
    console.error('Notification check error:', error);
    res.status(500).json({ error: 'Failed to check notifications' });
  }
}
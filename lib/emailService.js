import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || 'your-email@outlook.com',
    pass: process.env.EMAIL_PASS || 'your-password'
  }
});

export const sendMeetingNotification = async (to, subject, meetingDetails) => {
  const { projectName, date, time, meetingLink, participants } = meetingDetails;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1d76ba;">PRIAM Meeting Notification</h2>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Meeting Details</h3>
        <p><strong>Project:</strong> ${projectName}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Time:</strong> ${time}</p>
        <p><strong>Participants:</strong> ${participants.join(', ')}</p>
      </div>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${meetingLink}" style="background: #1d76ba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          🚀 Join Jitsi Meeting
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">
        This is an automated notification from PRIAM Project Management System.
      </p>
    </div>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER || 'your-email@outlook.com',
    to,
    subject,
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

export const getRoleEmails = (roles) => {
  const roleEmailMap = {
    client: 'santhosh20027@outlook.com',
    director: 'santhosh20027@outlook.com', 
    project_manager: 'santhosh20027@outlook.com',
    developer: 'santhosh20027@outlook.com',
    tester: 'santhosh20027@outlook.com',
    crm: 'santhosh20027@outlook.com'
  };

  if (roles.includes('all_roles')) {
    return Object.values(roleEmailMap);
  }

  return roles.map(role => roleEmailMap[role]).filter(Boolean);
};
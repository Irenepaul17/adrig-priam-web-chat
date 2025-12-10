export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Debugging email system...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASS set:', !!process.env.EMAIL_PASS);
    
    const nodemailer = await import('nodemailer');
    
    const transporter = nodemailer.default.createTransport({
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Test connection
    console.log('🔗 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful');

    // Send test email
    console.log('📧 Sending test email...');
    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'PRIAM Test Email',
      html: '<h1>Test email from PRIAM</h1><p>If you receive this, email is working!</p>'
    });
    
    console.log('✅ Email sent successfully:', result.messageId);
    
    res.json({ 
      success: true, 
      message: 'Email test successful',
      messageId: result.messageId,
      config: {
        host: 'smtp-mail.outlook.com',
        user: process.env.EMAIL_USER,
        hasPassword: !!process.env.EMAIL_PASS
      }
    });
    
  } catch (error) {
    console.error('❌ Email test failed:', error);
    res.status(500).json({ 
      error: error.message,
      code: error.code,
      command: error.command
    });
  }
}
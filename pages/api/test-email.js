export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { getRoleEmails } = await import('../../lib/emailService');
    const { testRoles = ['client', 'developer'] } = req.body;
    
    const emails = getRoleEmails(testRoles);
    
    res.json({ 
      success: true, 
      message: 'Email mapping test',
      testRoles,
      emails,
      emailConfig: {
        host: 'smtp-mail.outlook.com',
        user: process.env.EMAIL_USER || 'NOT_SET',
        hasPassword: !!process.env.EMAIL_PASS
      }
    });
    
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: error.message });
  }
}
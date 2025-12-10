export default function handler(req, res) {
  const { projectId } = req.query;
  
  if (req.method === 'GET') {
    const projectDetails = {
      1: { id: 1, name: 'E-commerce website development', description: 'Complete online shopping platform', status: 'In Progress', progress: 65 },
      2: { id: 2, name: 'Mobile app for food delivery', description: 'iOS and Android app', status: 'Planning', progress: 25 },
      3: { id: 3, name: 'CRM system integration', description: 'Customer management system', status: 'Testing', progress: 85 }
    };
    
    if (projectId && projectDetails[projectId]) {
      res.status(200).json(projectDetails[projectId]);
    } else {
      res.status(200).json(Object.values(projectDetails));
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
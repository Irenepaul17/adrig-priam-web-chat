export default function handler(req, res) {
  const projects = [
    { id: 1, name: 'E-commerce website development', description: 'Complete online shopping platform with payment integration', status: 'In Progress', deadline: '2024-12-15' },
    { id: 2, name: 'Mobile app for food delivery', description: 'iOS and Android app for restaurant food ordering', status: 'Planning', deadline: '2024-11-30' },
    { id: 3, name: 'CRM system integration', description: 'Customer relationship management system setup', status: 'Testing', deadline: '2024-12-01' },
    { id: 4, name: 'Data analytics dashboard', description: 'Business intelligence and reporting dashboard', status: 'Completed', completedDate: '2024-07-01' },
    { id: 5, name: 'Social media platform', description: 'Community-based social networking application', status: 'In Progress', deadline: '2025-01-15' }
  ];

  if (req.method === 'GET') {
    res.status(200).json(projects);
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
export default function Credentials() {
  const credentials = [
    { username: 'johnsmith', name: 'John Smith', role: 'Developer', email: 'john.smith@company.com', password: 'dev123' },
    { username: 'sarahjohnson', name: 'Sarah Johnson', role: 'Developer', email: 'sarah.johnson@company.com', password: 'dev123' },
    { username: 'mikechen', name: 'Mike Chen', role: 'Developer', email: 'mike.chen@company.com', password: 'dev123' },
    { username: 'lisabrown', name: 'Lisa Brown', role: 'Tester', email: 'lisa.brown@company.com', password: 'test123' },
    { username: 'davidwilson', name: 'David Wilson', role: 'Tester', email: 'david.wilson@company.com', password: 'test123' },
    { username: 'emilydavis', name: 'Emily Davis', role: 'Project Manager', email: 'emily.davis@company.com', password: 'pm123' },
    { username: 'roberttaylor', name: 'Robert Taylor', role: 'Project Manager', email: 'robert.taylor@company.com', password: 'pm123' },
    { username: 'jenniferlee', name: 'Jennifer Lee', role: 'CRM', email: 'jennifer.lee@company.com', password: 'crm123' },
    { username: 'michaeljohnson', name: 'Michael Johnson', role: 'Director', email: 'michael.johnson@company.com', password: 'dir123' },
    { username: 'amandawilson', name: 'Amanda Wilson', role: 'Director', email: 'amanda.wilson@company.com', password: 'dir123' }
  ];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Login Credentials</h1>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Username</th>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Role</th>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Password</th>
            </tr>
          </thead>
          <tbody>
            {credentials.map((user, index) => (
              <tr key={index} style={{ background: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{user.username}</td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{user.name}</td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{user.role}</td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{user.email}</td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{user.password}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
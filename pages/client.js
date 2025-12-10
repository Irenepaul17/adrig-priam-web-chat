import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Client() {
  const router = useRouter();

  useEffect(() => {
    router.push('/clientdashboard/projects');
  }, [router]);



  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h2>Redirecting to Projects...</h2>
    </div>
  );
}
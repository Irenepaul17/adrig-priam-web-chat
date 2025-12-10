import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/api/users');
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || res.statusText);
        }
        const data = await res.json();
        if (mounted) setUsers(data);
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load users');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Users</h1>

      {loading && <p>Loading users…</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {!loading && !error && (
        <>
          <p>{users.length} user{users.length !== 1 ? 's' : ''}</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Username</th>
                <th style={th}>Email</th>
                <th style={th}>Role</th>
                <th style={th}>Permissions</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{u.username}</td>
                  <td style={td}>{u.email || '—'}</td>
                  <td style={td}>{u.role}</td>
                  <td style={td}>{(u.permissions || []).join(', ')}</td>
                  <td style={td}>
                    <Link href={`/admin/users/${u._id}`}>View / Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

const th = { textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' };
const td = { padding: '8px' };

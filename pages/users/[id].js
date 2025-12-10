// pages/users/[id].js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function UserProfilePage() {
  const router = useRouter();
  const { id } = router.query;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function loadUser() {
      try {
        const res = await fetch(`/api/users/${id}`);
        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error('Failed to load user', err);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
        }),
      });

      if (!res.ok) {
        alert('Failed to update user');
        return;
      }

      const updated = await res.json();
      setUser(updated);
      alert('User updated successfully');
    } catch (err) {
      console.error('Failed to update user', err);
      alert('Error updating user');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!user) return <div style={{ padding: 20 }}>User not found</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Edit User: {user.username}</h1>

      <form onSubmit={handleSubmit} style={{ maxWidth: 400, display: 'grid', gap: 10 }}>
        <label>
          Username:
          <input
            value={user.username}
            onChange={(e) => setUser({ ...user, username: e.target.value })}
          />
        </label>

        <label>
          Email:
          <input
            value={user.email || ''}
            onChange={(e) => setUser({ ...user, email: e.target.value })}
          />
        </label>

        <label>
          Role:
          <select
            value={user.role}
            onChange={(e) => setUser({ ...user, role: e.target.value })}
          >
            <option value="client">client</option>
            <option value="director">director</option>
            <option value="project_manager">project_manager</option>
            <option value="developer">developer</option>
            <option value="tester">tester</option>
            <option value="crm">crm</option>
          </select>
        </label>

        <label>
          Permissions (comma separated):
          <input
            value={(user.permissions || []).join(', ')}
            onChange={(e) =>
              setUser({
                ...user,
                permissions: e.target.value
                  .split(',')
                  .map((p) => p.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>

        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

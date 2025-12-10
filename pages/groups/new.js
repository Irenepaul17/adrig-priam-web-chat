// pages/groups/new.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

// Helper to read current user id from localStorage
function getCurrentUserId() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem('currentUserId');
    return stored && stored.trim() ? stored.trim() : null;
  } catch (err) {
    console.error('Error reading currentUserId from localStorage', err);
    return null;
  }
}

export default function NewGroupPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const [isAdmin, setIsAdmin] = useState(null); // null = not checked yet
  const [currentUserId, setCurrentUserId] = useState(null);

  // Detect role + user id from localStorage (set on login)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const role = window.localStorage.getItem('userRole');
      const id = getCurrentUserId();

      setCurrentUserId(id);

      // Only director & project_manager are considered "admins"
      if (role === 'director' || role === 'project_manager') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      console.error('Error reading role/currentUserId', err);
      setIsAdmin(false);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    if (isAdmin === null) {
      alert('Please wait a moment and try again.');
      return;
    }

    if (!isAdmin) {
      alert('Only admins can create groups');
      return;
    }

    if (!currentUserId) {
      alert('User not identified, please log in again.');
      router.push('/');
      return;
    }

    if (!name.trim()) {
      alert('Please enter a group name');
      return;
    }

    try {
      setCreating(true);

      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          // ⬇️ These two lines fix the "name and creatorId are required" error
          creatorId: currentUserId,
          actorId: currentUserId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Failed to create group');
        return;
      }

      // data._id should be the conversation id for the new group
      router.push(`/chat/${data._id}`);
    } catch (err) {
      console.error('Failed to create group', err);
      alert('Server error');
    } finally {
      setCreating(false);
    }
  }

  // If non-admin manually hits /groups/new
  if (isAdmin === false) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.05)',
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            backgroundColor: '#fff',
            padding: 24,
            borderRadius: 8,
            boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
            maxWidth: 420,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Access denied</h2>
          <p style={{ marginBottom: 16, color: '#4b5563', fontSize: 14 }}>
            Only directors and project managers can create groups.
          </p>
          <button
            type="button"
            onClick={() => router.push('/users')}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          padding: 24,
          borderRadius: 8,
          boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
          maxWidth: 480,
          width: '100%',
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: 16,
            textAlign: 'center',
          }}
        >
          Create New Group
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              Group name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 4,
                border: '1px solid #d1d5db',
                fontSize: 14,
              }}
              placeholder="e.g. Tech Team"
              required
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 4,
                border: '1px solid #d1d5db',
                fontSize: 14,
                resize: 'vertical',
              }}
              placeholder="Optional: briefly describe the purpose of this group"
            />
          </div>

          <button
            type="submit"
            disabled={creating || isAdmin === null}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 4,
              border: 'none',
              backgroundColor:
                creating || isAdmin === null ? '#9ca3af' : '#2563eb',
              color: '#fff',
              fontWeight: 600,
              cursor:
                creating || isAdmin === null ? 'not-allowed' : 'pointer',
            }}
          >
            {creating ? 'Creating...' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  );
}

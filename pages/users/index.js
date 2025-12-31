import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import NotificationBell from '../../components/NotificationBell';

// Helper to safely read current user ID from localStorage without crashing
function getCurrentUserId() {
  if (typeof window === 'undefined') {
    return '69334e1b1297aec66afd63d1'; // fallback so nothing breaks
  }

  try {
    let stored = window.sessionStorage.getItem('currentUserId');
    if (!stored) {
      stored = window.localStorage.getItem('currentUserId');
      if (stored) window.sessionStorage.setItem('currentUserId', stored);
    }
    if (stored && stored.trim()) {
      return stored.trim();
    }
  } catch (err) {
    console.error('Error reading currentUserId from localStorage', err);
  }

  return '69334e1b1297aec66afd63d1'; // fallback to old behaviour
}

// Helper to read current user ROLE from localStorage
function getCurrentUserRole() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    let stored = window.sessionStorage.getItem('userRole');
    if (!stored) {
      stored = window.localStorage.getItem('userRole');
      if (stored) window.sessionStorage.setItem('userRole', stored);
    }
    if (stored && stored.trim()) {
      return stored.trim();
    }
  } catch (err) {
    console.error('Error reading userRole from localStorage', err);
  }

  return null;
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [conversations, setConversations] = useState([]);
  const [loadingConvos, setLoadingConvos] = useState(true);

  const router = useRouter();

  // Uses stored user ID / role if available, otherwise falls back
  const currentUserId = getCurrentUserId();
  const currentUserRole = getCurrentUserRole();

  // Only director & project_manager are allowed to manage groups
  const normalizedRole = (currentUserRole || '').toLowerCase();
  const isAdminRole = normalizedRole === 'director' || normalizedRole === 'project_manager';

  async function handleStartChat(targetUserId) {
    if (targetUserId === currentUserId) {
      alert("You can't chat with yourself");
      return;
    }

    try {
      const res = await fetch('/api/chat/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUserId,
          targetUserId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Failed to start chat');
        return;
      }

      router.push(`/chat/${data._id}`);
    } catch (err) {
      console.error('Failed to start chat', err);
      alert('Error starting chat');
    }
  }

  // Load all users
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load users', err);
      } finally {
        setLoadingUsers(false);
      }
    }
    loadUsers();
  }, []);

  // Load conversations for "Group Conversations" section
  useEffect(() => {
    async function loadMyChats() {
      try {
        const res = await fetch(`/api/chat/my?userId=${currentUserId}`);
        const data = await res.json();

        const convos = Array.isArray(data.conversations)
          ? data.conversations
          : Array.isArray(data)
            ? data
            : [];

        setConversations(convos);
      } catch (err) {
        console.error('Failed to load my chats', err);
        setConversations([]);
      } finally {
        setLoadingConvos(false);
      }
    }

    loadMyChats();
  }, [currentUserId]);

  if (loadingUsers) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#f5f5f7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        Loading users...
      </div>
    );
  }

  // Only show GROUP conversations at the top – direct chats stay in the table via Chat button
  const groupConversations = conversations.filter((c) => c.type === 'group');

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f7',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: '32px 16px',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
        }}
      >
        {/* Page header */}
        <header
          style={{
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 600,
                color: '#111827',
              }}
            >
              Users
            </h1>
            <p
              style={{
                margin: '6px 0 0',
                color: '#6b7280',
                fontSize: 14,
              }}
            >
              Start a direct chat with any user or join your existing groups.
            </p>
          </div>
          <div style={{ alignSelf: 'center' }}>
            <NotificationBell iconColor="#111827" />
          </div>
        </header>

        {/* Group conversations section */}
        <section
          style={{
            marginBottom: 24,
            backgroundColor: '#ffffff',
            borderRadius: 10,
            border: '1px solid #e5e7eb',
            padding: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                color: '#111827',
              }}
            >
              Group Conversations
            </h2>

            {isAdminRole && (
              <button
                onClick={() => router.push('/groups/new')}
                style={{
                  padding: '6px 14px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                + Create Group
              </button>
            )}
          </div>

          {loadingConvos ? null : groupConversations.length === 0 ? (
            <p
              style={{
                margin: 4,
                fontSize: 14,
                color: '#6b7280',
              }}
            >
              You are not part of any groups yet.{' '}
              {isAdminRole
                ? 'Create a group from the top right of this page.'
                : 'A director or project manager can create a group and add you.'}
            </p>
          ) : (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 4,
              }}
            >
              {groupConversations.map((c) => {
                const groupName =
                  c.name && c.name.trim().length > 0
                    ? c.name.trim()
                    : 'Group chat';

                return (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => router.push(`/chat/${c._id}`)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 999,
                      border: '1px solid #d1d5db',
                      backgroundColor: '#f9fafb',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: '#111827',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: 6,
                        height: 6,
                        borderRadius: '999px',
                        backgroundColor: '#10b981',
                      }}
                    />
                    <span>{groupName}</span>
                    <span style={{ color: '#6b7280', fontSize: 12 }}>
                      (Group)
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Users table */}
        <section
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 10,
            border: '1px solid #e5e7eb',
            padding: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {users.length === 0 ? (
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              No users found.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                cellPadding="8"
                cellSpacing="0"
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: '#f3f4f6',
                      textAlign: 'left',
                    }}
                  >
                    <th
                      style={{
                        padding: '10px 8px',
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      Username
                    </th>
                    <th
                      style={{
                        padding: '10px 8px',
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      Email
                    </th>
                    <th
                      style={{
                        padding: '10px 8px',
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      Role
                    </th>
                    <th
                      style={{
                        padding: '10px 8px',
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      Permissions
                    </th>
                    <th
                      style={{
                        padding: '10px 8px',
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      Action
                    </th>
                    <th
                      style={{
                        padding: '10px 8px',
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      Chat
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => (
                    <tr
                      key={u._id}
                      style={{
                        backgroundColor:
                          idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                      }}
                    >
                      <td
                        style={{
                          padding: '8px',
                          borderBottom: '1px solid #e5e7eb',
                          fontWeight: 500,
                          color: '#111827',
                        }}
                      >
                        {u.username}
                      </td>
                      <td
                        style={{
                          padding: '8px',
                          borderBottom: '1px solid #e5e7eb',
                          color: '#4b5563',
                        }}
                      >
                        {u.email || '-'}
                      </td>
                      <td
                        style={{
                          padding: '8px',
                          borderBottom: '1px solid #e5e7eb',
                          color: '#4b5563',
                          textTransform: 'capitalize',
                        }}
                      >
                        {u.role.replace('_', ' ')}
                      </td>
                      <td
                        style={{
                          padding: '8px',
                          borderBottom: '1px solid #e5e7eb',
                          color: '#6b7280',
                        }}
                      >
                        {(u.permissions || []).join(', ')}
                      </td>

                      {/* Action column */}
                      <td
                        style={{
                          padding: '8px',
                          borderBottom: '1px solid #e5e7eb',
                        }}
                      >
                        <Link
                          href={`/users/${u._id}`}
                          style={{
                            color: '#2563eb',
                            textDecoration: 'none',
                            fontWeight: 500,
                          }}
                        >
                          View / Edit
                        </Link>
                      </td>

                      {/* Chat column – always used for direct chats with that user */}
                      <td
                        style={{
                          padding: '8px',
                          borderBottom: '1px solid #e5e7eb',
                        }}
                      >
                        {u._id === currentUserId ? (
                          <button
                            disabled
                            title="Cannot chat with yourself"
                            style={{
                              opacity: 0.4,
                              cursor: 'not-allowed',
                              backgroundColor: '#e5e7eb',
                              color: '#6b7280',
                              padding: '5px 12px',
                              borderRadius: 999,
                              border: 'none',
                              fontSize: 13,
                            }}
                          >
                            Chat
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartChat(u._id)}
                            style={{
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              padding: '5px 12px',
                              borderRadius: 999,
                              border: 'none',
                              fontSize: 13,
                              cursor: 'pointer',
                            }}
                          >
                            Chat
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

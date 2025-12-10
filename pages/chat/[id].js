// pages/chat/[id].js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const FALLBACK_USER_ID = '69334e1b1297aec66afd63d1'; // old hard-coded id as safe fallback

export default function ChatPage() {
  const router = useRouter();
  const { id } = router.query; // conversation id

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');

  // For group member UI
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [removingMember, setRemovingMember] = useState(false);

  // Group info editing
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);

  // Leave group
  const [leavingGroup, setLeavingGroup] = useState(false);

  // Notifications (toasts)
  const [notification, setNotification] = useState('');

  // REAL current user id + role (comes from login)
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  // Helper: show small toast notification
  function showNotification(msg) {
    if (!msg) return;
    setNotification(msg);
    setTimeout(() => {
      setNotification('');
    }, 3000);
  }

  // Read currentUserId + role from localStorage after mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = window.localStorage.getItem('currentUserId');
      if (stored && stored.trim()) {
        setCurrentUserId(stored.trim());
      } else {
        setCurrentUserId(FALLBACK_USER_ID);
      }

      const role = window.localStorage.getItem('userRole');
      if (role && role.trim()) {
        setCurrentUserRole(role.trim());
      }
    } catch (err) {
      console.error(
        'Failed to read currentUserId/userRole from localStorage',
        err
      );
      setCurrentUserId(FALLBACK_USER_ID);
      setCurrentUserRole(null);
    }
  }, []);

  // Initial load: conversation + messages
  useEffect(() => {
    if (!id || !currentUserId) return;

    async function loadChat() {
      try {
        const res = await fetch(`/api/chat/${id}?userId=${currentUserId}`);
        const data = await res.json();
        if (!res.ok) {
          alert(data.message || 'Failed to load chat');
          setConversation(null);
          return;
        }
        setConversation(data.conversation);
        setMessages(data.messages);
      } catch (err) {
        console.error('Failed to load chat', err);
        alert('Error loading chat');
      } finally {
        setLoading(false);
      }
    }

    loadChat();
  }, [id, currentUserId]);

  // Polling for real-time updates (new messages + group changes)
  useEffect(() => {
    if (!id || !currentUserId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/chat/${id}?userId=${currentUserId}`);
        const data = await res.json();
        if (!res.ok) {
          return;
        }

        const serverMessages = Array.isArray(data.messages)
          ? data.messages
          : [];

        // Detect new messages
        setMessages((prev) => {
          if (serverMessages.length === 0) {
            return prev;
          }

          if (prev.length === 0) {
            // First time – just sync up
            return serverMessages;
          }

          if (serverMessages.length > prev.length) {
            const newMsgs = serverMessages.slice(prev.length);
            const hasFromOthers = newMsgs.some((m) => {
              const senderId = m.sender?._id || m.sender;
              return (
                senderId &&
                senderId.toString() !== currentUserId.toString()
              );
            });

            if (hasFromOthers) {
              showNotification('New message received');
            }

            return serverMessages;
          }

          return prev;
        });

        // Detect group changes (name, description, members)
        if (data.conversation) {
          setConversation((prev) => {
            if (!prev) return data.conversation;

            const prevMembers = prev.participants?.length || 0;
            const newMembers = data.conversation.participants?.length || 0;

            const nameChanged = prev.name !== data.conversation.name;
            const descChanged =
              prev.description !== data.conversation.description;
            const membersChanged = prevMembers !== newMembers;

            if (nameChanged || descChanged || membersChanged) {
              showNotification('Group details updated');
              return data.conversation;
            }

            return prev;
          });
        }
      } catch (err) {
        console.error('Polling chat failed', err);
      }
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [id, currentUserId]);

  // Load all users when we know it's a group chat
  useEffect(() => {
    if (!conversation || conversation.type !== 'group') return;

    async function loadUsers() {
      try {
        setLoadingUsers(true);
        const res = await fetch('/api/users');
        const data = await res.json();
        if (!res.ok) {
          console.error('Failed to load users list', data);
          return;
        }
        setAllUsers(data);
      } catch (err) {
        console.error('Failed to load users list', err);
      } finally {
        setLoadingUsers(false);
      }
    }

    loadUsers();
  }, [conversation]);

  // Keep edit form in sync with conversation data
  useEffect(() => {
    if (conversation && conversation.type === 'group') {
      setEditName(conversation.name || '');
      setEditDescription(conversation.description || '');
    }
  }, [conversation]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim()) return;

    if (!currentUserId) {
      alert('User not identified yet. Please wait a moment and try again.');
      return;
    }

    try {
      const res = await fetch(`/api/chat/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUserId,
          text,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to send message');
        return;
      }

      setMessages((prev) => [...prev, data]);
      setText('');
      // No notification here – user already sees they sent something
    } catch (err) {
      console.error('Failed to send message', err);
      alert('Error sending message');
    }
  }

  async function handleAddMember(e) {
    e.preventDefault();
    if (!selectedUserId) {
      alert('Please select a user to add');
      return;
    }

    if (!currentUserId) {
      alert('User not identified yet. Please log in again.');
      return;
    }

    try {
      setAddingMember(true);
      const res = await fetch(`/api/groups/${conversation._id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: selectedUserId,
          actorId: currentUserId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to add member');
        return;
      }

      setConversation((prev) => ({
        ...prev,
        participants: data.participants,
        admins: data.admins ?? prev?.admins,
        name: data.name ?? prev?.name,
        description: data.description ?? prev?.description,
      }));

      setSelectedUserId('');
      showNotification('Member added to group');
    } catch (err) {
      console.error('Failed to add member', err);
      alert('Error adding member');
    } finally {
      setAddingMember(false);
    }
  }

  async function handleRemoveMember(memberId) {
    if (!currentUserId) {
      alert('User not identified yet. Please log in again.');
      return;
    }

    if (!window.confirm('Remove this member from the group?')) return;

    try {
      setRemovingMember(true);
      const res = await fetch(`/api/groups/${conversation._id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          actorId: currentUserId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to remove member');
        return;
      }

      setConversation((prev) => ({
        ...prev,
        participants: data.participants,
        admins: data.admins ?? prev?.admins,
        name: data.name ?? prev?.name,
        description: data.description ?? prev?.description,
      }));

      showNotification('Member removed from group');
    } catch (err) {
      console.error('Failed to remove member', err);
      alert('Error removing member');
    } finally {
      setRemovingMember(false);
    }
  }

  async function handlePromoteToAdmin(memberId, memberName) {
    if (!currentUserId) {
      alert('User not identified yet. Please log in again.');
      return;
    }

    if (!window.confirm(`Promote ${memberName} to Group Admin?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/groups/${conversation._id}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          actorId: currentUserId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to promote member');
        return;
      }

      setConversation((prev) => ({
        ...prev,
        participants: data.participants ?? prev?.participants,
        admins: data.admins ?? prev?.admins,
        name: data.name ?? prev?.name,
        description: data.description ?? prev?.description,
      }));

      showNotification('Member promoted to group admin');
    } catch (err) {
      console.error('Failed to promote member', err);
      alert('Error promoting member');
    }
  }

  async function handleSaveGroupInfo(e) {
    e.preventDefault();
    if (!currentUserId) {
      alert('User not identified yet. Please log in again.');
      return;
    }

    try {
      setSavingInfo(true);
      const res = await fetch(`/api/groups/${conversation._id}/info`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          actorId: currentUserId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to update group info');
        return;
      }

      setConversation((prev) => ({
        ...prev,
        participants: data.participants ?? prev?.participants,
        admins: data.admins ?? prev?.admins,
        name: data.name ?? prev?.name,
        description: data.description ?? prev?.description,
      }));

      setIsEditingInfo(false);
      showNotification('Group info updated');
    } catch (err) {
      console.error('Failed to update group info', err);
      alert('Error updating group info');
    } finally {
      setSavingInfo(false);
    }
  }

  async function handleLeaveGroup() {
    if (!currentUserId) {
      alert('User not identified yet. Please log in again.');
      return;
    }

    if (!window.confirm('Are you sure you want to leave this group?')) return;

    try {
      setLeavingGroup(true);
      const res = await fetch(`/api/groups/${conversation._id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: currentUserId,
          actorId: currentUserId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to leave group');
        setLeavingGroup(false);
        return;
      }

      router.push('/users');
    } catch (err) {
      console.error('Failed to leave group', err);
      alert('Error leaving group');
      setLeavingGroup(false);
    }
  }

  // Until we know who the current user is OR chat is loaded, show loading
  if (loading || currentUserId === null) {
    return <div style={{ padding: 20 }}>Loading chat...</div>;
  }

  if (!conversation) {
    return <div style={{ padding: 20 }}>Conversation not found</div>;
  }

  const title =
    conversation.type === 'group'
      ? conversation.name || 'Group Chat'
      : 'Direct Chat';

  // Build member + available user lists for groups
  let memberEntries = [];
  let availableUsers = [];
  let isGroupAdmin = false;

  if (conversation.type === 'group') {
    const memberIds = new Set(
      (conversation.participants || []).map(
        (p) => p._id?.toString?.() || p.toString()
      )
    );

    const isInAdminsArray =
      Array.isArray(conversation.admins) &&
      conversation.admins.some(
        (a) => (a._id?.toString?.() || a.toString()) === currentUserId
      );

    isGroupAdmin =
      isInAdminsArray ||
      currentUserRole === 'director' ||
      currentUserRole === 'project_manager';

    memberEntries = (conversation.participants || []).map((p) => {
      const id = p._id?.toString?.() || p.toString();
      const name = p.username || 'User';
      const role = p.role || '';
      const isSelf = id === currentUserId;

      const isAdminForUser =
        Array.isArray(conversation.admins) &&
        conversation.admins.some(
          (a) => (a._id?.toString?.() || a.toString()) === id
        );

      return { id, name, role, isSelf, isAdminForUser };
    });

    availableUsers = (allUsers || []).filter(
      (u) => !memberIds.has(u._id) && u._id !== currentUserId
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '24px 32px',
        backgroundColor: '#f5f5f7',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns:
            conversation.type === 'group' ? '280px 1fr' : '1fr',
          gap: 24,
          alignItems: 'flex-start',
        }}
      >
        {/* Left panel for group info */}
        {conversation.type === 'group' && (
          <aside
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              padding: 16,
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            }}
          >
            {/* Group Info + Edit */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <div>
                <h3 style={{ marginTop: 0, marginBottom: 4 }}>
                  {conversation.name || 'Group Chat'}
                </h3>
                {conversation.description && !isEditingInfo && (
                  <p style={{ fontSize: 13, color: '#555', marginTop: 0 }}>
                    {conversation.description}
                  </p>
                )}
              </div>

              {isGroupAdmin && (
                <button
                  type="button"
                  onClick={() => setIsEditingInfo((prev) => !prev)}
                  style={{
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 11,
                    cursor: 'pointer',
                    backgroundColor: '#e5e7eb',
                    color: '#111827',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isEditingInfo ? 'Cancel' : 'Edit group'}
                </button>
              )}
            </div>

            {isGroupAdmin && isEditingInfo && (
              <form
                onSubmit={handleSaveGroupInfo}
                style={{ marginTop: 10, display: 'grid', gap: 8 }}
              >
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Group name"
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 4,
                    border: '1px solid #d1d5db',
                    fontSize: 13,
                  }}
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Group description"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 4,
                    border: '1px solid #d1d5db',
                    fontSize: 13,
                    resize: 'vertical',
                  }}
                />
                <button
                  type="submit"
                  disabled={savingInfo}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 4,
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    backgroundColor: savingInfo ? '#9ca3af' : '#2563eb',
                    color: '#fff',
                    cursor: savingInfo ? 'not-allowed' : 'pointer',
                    justifySelf: 'flex-start',
                  }}
                >
                  {savingInfo ? 'Saving…' : 'Save changes'}
                </button>
              </form>
            )}

            {/* Members */}
            <div style={{ marginTop: 16 }}>
              <h4 style={{ margin: '8px 0 6px', fontSize: 14 }}>Members</h4>
              {memberEntries.length === 0 ? (
                <p style={{ fontSize: 13, color: '#777' }}>No members yet.</p>
              ) : (
                <ul
                  style={{
                    paddingLeft: 0,
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.5,
                    listStyle: 'none',
                  }}
                >
                  {memberEntries.map((m) => {
                    const canPromoteAdmin = isGroupAdmin;
                    const canRemove = isGroupAdmin && !m.isSelf;

                    return (
                      <li
                        key={m.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 6,
                        }}
                      >
                        <span>
                          {m.name}
                          {m.isSelf && ' (you)'}
                          {m.isAdminForUser && (
                            <span
                              style={{
                                fontSize: 11,
                                color: '#10B981',
                                marginLeft: 6,
                              }}
                            >
                              • Group Admin
                            </span>
                          )}
                        </span>

                        {isGroupAdmin && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            {/* Promote to Admin button */}
                            {canPromoteAdmin &&
                              !m.isSelf &&
                              !m.isAdminForUser && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handlePromoteToAdmin(m.id, m.name)
                                  }
                                  style={{
                                    border: 'none',
                                    borderRadius: 6,
                                    padding: '3px 8px',
                                    fontSize: 11,
                                    cursor: 'pointer',
                                    backgroundColor: '#2563eb',
                                    color: '#fff',
                                  }}
                                >
                                  Make Admin
                                </button>
                              )}

                            {/* Remove button */}
                            {canRemove && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(m.id)}
                                disabled={removingMember}
                                style={{
                                  border: 'none',
                                  borderRadius: 6,
                                  padding: '3px 8px',
                                  fontSize: 11,
                                  cursor: removingMember
                                    ? 'not-allowed'
                                    : 'pointer',
                                  backgroundColor: '#ef4444',
                                  color: '#fff',
                                }}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Add member */}
            {isGroupAdmin && (
              <div style={{ marginTop: 18 }}>
                <h4 style={{ margin: '8px 0 6px', fontSize: 14 }}>
                  Add member
                </h4>
                {loadingUsers ? (
                  <p style={{ fontSize: 13 }}>Loading users...</p>
                ) : availableUsers.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#777' }}>
                    No more users available to add.
                  </p>
                ) : (
                  <form
                    onSubmit={handleAddMember}
                    style={{ display: 'grid', gap: 8 }}
                  >
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 4,
                        border: '1px solid #ccc',
                        fontSize: 13,
                      }}
                    >
                      <option value="">Select a user…</option>
                      {availableUsers.map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.username} ({u.role})
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={addingMember || !selectedUserId}
                      style={{
                        padding: '7px 10px',
                        borderRadius: 4,
                        border: 'none',
                        fontSize: 13,
                        fontWeight: 600,
                        backgroundColor: addingMember ? '#999' : '#0070f3',
                        color: '#fff',
                        cursor: addingMember ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {addingMember ? 'Adding…' : 'Add Member'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Leave group */}
            <div
              style={{
                marginTop: 18,
                paddingTop: 10,
                borderTop: '1px solid #e5e7eb',
              }}
            >
              <button
                type="button"
                onClick={handleLeaveGroup}
                disabled={leavingGroup}
                style={{
                  width: '100%',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: 13,
                  cursor: leavingGroup ? 'not-allowed' : 'pointer',
                  backgroundColor: '#f97373',
                  color: '#fff',
                  fontWeight: 600,
                }}
              >
                {leavingGroup ? 'Leaving…' : 'Leave Group'}
              </button>
            </div>
          </aside>
        )}

        {/* Right panel: chat area */}
        <main
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e0e0e0',
            borderRadius: 8,
            padding: 16,
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
          }}
        >
          {conversation.type !== 'group' && (
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>{title}</h2>
          )}

          <div
            style={{
              border: '1px solid #ccc',
              borderRadius: 6,
              padding: 10,
              height: 420,
              overflowY: 'auto',
              marginBottom: 10,
              backgroundColor: '#fafafa',
            }}
          >
            {messages.length === 0 ? (
              <p>No messages yet. Say hi!</p>
            ) : (
              messages.map((m) => {
                const isMe =
                  currentUserId &&
                  (m.sender?._id === currentUserId ||
                    m.sender === currentUserId);

                const time = new Date(m.createdAt).toLocaleString();

                return (
                  <div
                    key={m._id}
                    style={{
                      textAlign: isMe ? 'right' : 'left',
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '6px 10px',
                        borderRadius: 12,
                        background: isMe ? '#dcf8c6' : '#f1f0f0',
                      }}
                    >
                      {!isMe && (
                        <div style={{ fontSize: 12, fontWeight: 'bold' }}>
                          {m.sender?.username || 'User'}
                        </div>
                      )}
                      <div>{m.text}</div>
                      <div
                        style={{
                          fontSize: 10,
                          marginTop: 4,
                          opacity: 0.7,
                          textAlign: 'right',
                        }}
                      >
                        {time}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
            <input
              style={{
                flex: 1,
                padding: '7px 8px',
                borderRadius: 4,
                border: '1px solid #ccc',
              }}
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              type="submit"
              style={{
                padding: '7px 14px',
                borderRadius: 4,
                border: 'none',
                backgroundColor: '#0070f3',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Send
            </button>
          </form>
        </main>
      </div>

      {/* Toast notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            padding: '10px 16px',
            backgroundColor: '#111827',
            color: '#fff',
            borderRadius: 999,
            fontSize: 13,
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
            zIndex: 1000,
          }}
        >
          {notification}
        </div>
      )}
    </div>
  );
}

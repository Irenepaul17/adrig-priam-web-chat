import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import NotificationBell from '../../components/NotificationBell';




export default function ChatPage() {

  const [swipeX, setSwipeX] = useState(0);
  const [swipingMsgId, setSwipingMsgId] = useState(null);


  const swipeStartX = useRef(null);
  const swipeStartY = useRef(null);

  const router = useRouter();
  const { id } = router.query; // conversation id

  // core state
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');

  // group UI
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [removingMember, setRemovingMember] = useState(false);

  // group edit
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);

  // leave group
  const [leavingGroup, setLeavingGroup] = useState(false);

  // toasts
  const [notification, setNotification] = useState('');

  // current user
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  // seen modal
  const [seenModalOpen, setSeenModalOpen] = useState(false);
  const [seenUsers, setSeenUsers] = useState([]);

  // voice recording (WhatsApp-style)
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);


  // mentions state
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState([]); // {id, username}
  const [pendingMentions, setPendingMentions] = useState([]); // array of userIds to send
  const [replyingTo, setReplyingTo] = useState(null);





  // ---------- helpers ----------

  function handleSwipeMove(e, message) {
    const currentX = e.touches ? e.touches[0].clientX : e.clientX;
    const deltaX = currentX - swipeStartX;

    if (deltaX > 60) {
      setReplyingTo(message);
    }
  }

  function showNotification(msg) {
    if (!msg) return;
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      let stored = window.sessionStorage.getItem('currentUserId');
      let role = window.sessionStorage.getItem('userRole');

      if (!stored) {
        stored = window.localStorage.getItem('currentUserId');
        if (stored) window.sessionStorage.setItem('currentUserId', stored);
      }
      if (!role) {
        role = window.localStorage.getItem('userRole');
        if (role) window.sessionStorage.setItem('userRole', role);
      }

      // If no user ID is stored, redirect to login
      if (!stored || !stored.trim()) {
        console.warn('No user ID found in localStorage, redirecting to login');
        router.push('/');
        return;
      }

      setCurrentUserId(stored.trim());
      setCurrentUserRole(role && role.trim() ? role.trim() : null);
    } catch (err) {
      console.error('Failed to read currentUserId/userRole from localStorage', err);
      router.push('/');
    }
  }, [router]);

  // ---------- socket.io ----------
  const socketRef = useRef(null);

  useEffect(() => {
    // init socket
    socketRef.current = io({ transports: ['websocket'] });

    socketRef.current.on('connect', () => {
      console.log('Socket connected:', socketRef.current.id);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!id || !socketRef.current) return;

    console.log('Joining room:', id);
    socketRef.current.emit('join_room', id);

    const handleReceiveMessage = (msg) => {
      console.log('Received socket message:', msg);
      setMessages(prev => {
        // avoid duplicates
        if (prev.some(m => String(m._id) === String(msg._id))) return prev;
        return [...prev, msg];
      });
    };

    socketRef.current.on('receive_message', handleReceiveMessage);

    return () => {
      socketRef.current.off('receive_message', handleReceiveMessage);
    };
  }, [id]);

  // seen modal helpers
  function openSeenModal(readBy = [], sender = null) {
    const senderId =
      sender
        ? typeof sender === 'object'
          ? String(sender._id || sender)
          : String(sender)
        : null;

    const entries = (readBy || [])
      .map(u => {
        if (!u) return null;
        if (typeof u === 'object') {
          return {
            id: String(u._id || u),
            name: u.username || String(u._id || u),
          };
        }
        return { id: String(u), name: String(u) };
      })
      .filter(e => e && e.id !== senderId);

    setSeenUsers(entries.map(e => e.name));
    setSeenModalOpen(true);
  }



  function closeSeenModal() { setSeenModalOpen(false); setSeenUsers([]); }

  function getMentionCandidates() {
    // prefer conversation participants
    if (conversation?.participants?.length) {
      const pool = conversation.participants.map(p => ({
        id: String(p._id || p),
        username: p.username || String(p._id || p)
      }));
      if (typeof window !== "undefined") window.__mentionPool = pool;
      return pool;
    }

    // fallback to allUsers when loaded
    if (allUsers?.length) {
      const pool = allUsers.map(u => ({
        id: String(u._id),
        username: u.username
      }));
      if (typeof window !== "undefined") window.__mentionPool = pool;
      return pool;
    }

    // trigger one-time fetch (non-blocking)
    if (typeof window !== "undefined") {
      fetchAllUsersOnce(setAllUsers);
      window.__mentionPool = [];
    }

    return [];
  }


  function computeMentionSuggestions(query) {
    if (!query) return [];
    const q = query.toLowerCase();
    const pool = getMentionCandidates();

    console.debug("[mentions] suggestion pool =", pool.length, "query =", q);

    return pool
      .filter(u =>
        u.username?.toLowerCase().includes(q) &&
        String(u.id) !== String(currentUserId)
      )
      .slice(0, 8);
  }


  function acceptMentionSuggestion(suggestion) {
    if (!suggestion || !suggestion.username) return;

    const lastAt = text.lastIndexOf('@');
    if (lastAt === -1) {
      setText(prev => (prev.length && !prev.endsWith(' ') ? `${prev} ` : prev) + `@${suggestion.username} `);
    } else {
      const before = text.slice(0, lastAt);
      setText(`${before}@${suggestion.username} `);
    }

    setPendingMentions(prev => {
      if (prev.map(String).includes(String(suggestion.id))) return prev;
      return [...prev, String(suggestion.id)];
    });

    setShowMentionDropdown(false);
    setMentionQuery('');
    setMentionSuggestions([]);
  }

  function extractMentionIdsFromText(txt) {
    if (!txt) return [];
    const tokens = txt.match(/@[\w.\-_.]+/g) || [];
    if (!tokens.length) return [];
    const names = Array.from(new Set(tokens.map(t => t.slice(1).toLowerCase())));
    const pool = getMentionCandidates();
    const ids = [];
    names.forEach(name => {
      const hit = pool.find(p => (p.username || '').toLowerCase() === name);
      if (hit) ids.push(String(hit.id));
    });
    return ids;
  }

  // ---------- input handlers ----------
  function handleTextChange(e) {
    const val = e.target.value;
    setText(val);

    console.debug("[mentions] handleTextChange:", val);

    const cursorPos = e.target.selectionStart || val.length;
    const uptoCursor = val.slice(0, cursorPos);

    const match = uptoCursor.match(/@([\w.-]*)$/);

    if (match) {
      const q = match[1];
      setMentionQuery(q);

      let suggestions = computeMentionSuggestions(q);

      // if pool was empty, re-check after async user fetch
      if (suggestions.length === 0 && !conversation?.participants?.length && !allUsers?.length) {
        setTimeout(() => {
          const retry = computeMentionSuggestions(q);
          console.debug("[mentions] retry suggestions =", retry.length);
          setMentionSuggestions(retry);
          setShowMentionDropdown(retry.length > 0);
        }, 120);
      } else {
        setMentionSuggestions(suggestions);
        setShowMentionDropdown(suggestions.length > 0);
      }
    } else {
      setMentionQuery("");
      setMentionSuggestions([]);
      setShowMentionDropdown(false);
    }
  }


  function handleInputKeyDown(e) {
    // Mention dropdown behavior stays untouched
    if (showMentionDropdown) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionDropdown(false);
        setMentionQuery('');
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        if (mentionSuggestions.length > 0) {
          e.preventDefault();
          acceptMentionSuggestion(mentionSuggestions[0]);
          return;
        }
      }
      return;
    }

    // SHIFT + ENTER → new line (default textarea behavior)
    if (e.key === 'Enter' && e.shiftKey) {
      return;
    }

    // ENTER → send message
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }


  // ---------- load chat & messages ----------
  useEffect(() => {
    if (!id || !currentUserId) return;
    let mounted = true;

    async function loadChat() {
      try {
        const res = await fetch(`/api/chat/${id}?userId=${currentUserId}`);
        const data = await res.json();
        if (!res.ok) {
          alert(data.message || 'Failed to load chat');
          setConversation(null);
          return;
        }
        if (!mounted) return;
        setConversation(data.conversation);
        setMessages(data.messages || []);

        // auto mark unread
        try {
          const unread = (data.messages || []).filter(m => {
            const readBy = (m.readBy || []).map(x => {
              if (!x) return '';
              return typeof x === 'object' ? String(x._id || x) : String(x);
            });
            return !readBy.includes(String(currentUserId));
          }).map(m => m._id);
          if (unread.length) await markMessagesRead(unread);
        } catch (e) { console.error('auto mark read failed', e); }
      } catch (err) {
        console.error('Failed to load chat', err);
        alert('Error loading chat');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadChat();
    return () => { mounted = false; };
  }, [id, currentUserId]);

  // poll for updates
  // poll for updates - DISABLED (Using Pure Sockets)
  /*
  useEffect(() => {
    if (!id || !currentUserId) return;
    const iv = setInterval(async () => {
      try {
        const res = await fetch(`/api/chat/${id}?userId=${currentUserId}`);
        const data = await res.json();
        if (!res.ok) return;

        const serverMessages = Array.isArray(data.messages) ? data.messages : [];
        setMessages(prev => {
          if (!Array.isArray(serverMessages) || serverMessages.length === 0) return prev;
          if (!prev || prev.length === 0) return serverMessages;

          const prevMap = new Map(prev.map(m => [String(m._id), m]));

          return serverMessages.map(sm => {
            const local = prevMap.get(String(sm._id));
            if (!local) return sm;

            // Simplified: Trust server for 'readBy' completely.
            // The server is the source of truth for who read what.
            // Merging locally caused issues where stale local state persisted.
            return {
              ...sm,
              readBy: sm.readBy // server authority
            };
          });
        });

        if (data.conversation) {
          setConversation(prev => {
            if (!prev) return data.conversation;
            const nameChanged = prev.name !== data.conversation.name;
            const descChanged = prev.description !== data.conversation.description;
            const prevMembers = prev.participants?.length || 0;
            const newMembers = data.conversation.participants?.length || 0;
            if (nameChanged || descChanged || prevMembers !== newMembers) {
              showNotification('Group details updated');
              return data.conversation;
            }
            return prev;
          });
        }

        // AUTO-MARK UNREAD (REAL-TIME FIX)
        try {
          const unread = (Array.isArray(serverMessages) ? serverMessages : []).filter(m => {
            const readBy = (m.readBy || []).map(x => {
              if (!x) return '';
              return typeof x === 'object' ? String(x._id || x) : String(x);
            });
            return !readBy.includes(String(currentUserId));
          }).map(m => m._id);

          if (unread.length > 0) {
            // We don't await this inside the interval to avoid blocking, 
            // but we could. For now, fire and forget-ish.
            markMessagesRead(unread);
          }
        } catch (e) { console.error('auto mark read (poll) failed', e); }

      } catch (e) { console.error('Polling chat failed', e); }
    }, 1000);
    return () => clearInterval(iv);
  }, [id, currentUserId]);
  */

  // load all users for adding members
  useEffect(() => {
    if (!conversation || conversation.type !== 'group') return;
    let mounted = true;
    async function loadUsers() {
      try {
        setLoadingUsers(true);
        const res = await fetch('/api/users');
        const data = await res.json();
        if (!res.ok) {
          console.error('Failed to load users list', data);
          return;
        }
        if (mounted) setAllUsers(data);
      } catch (err) {
        console.error('Failed to load users list', err);
      } finally {
        if (mounted) setLoadingUsers(false);
      }
    }
    loadUsers();
    return () => { mounted = false; };
  }, [conversation]);

  // fallback: if participants are empty but we need mention candidates, fetch all users once
  useEffect(() => {
    if (!conversation) return;
    if ((conversation.participants || []).length === 0 && (!allUsers || allUsers.length === 0)) {
      // one-off fetch to populate candidate pool for mentions (silent)
      fetch('/api/users').then(r => r.json()).then(d => {
        if (Array.isArray(d) && d.length) {
          setAllUsers(d);
          // eslint-disable-next-line no-console
          console.debug('[mentions] fallback fetched allUsers count=', d.length);
        }
      }).catch(() => { /* ignore */ });
    }
  }, [conversation]);

  // keep edit form synced
  useEffect(() => {
    if (conversation && conversation.type === 'group') {
      setEditName(conversation.name || '');
      setEditDescription(conversation.description || '');
    }
  }, [conversation]);



  // ---------- mark read helper ----------
  async function markMessagesRead(messageIds) {
    if (!conversation || !conversation._id) return;
    if (!currentUserId) return;

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';
      const body = { userId: currentUserId, messageIds };
      const res = await fetch(
        `${API_BASE}/api/chat/${encodeURIComponent(conversation._id)}/read`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        console.error('markMessagesRead failed', res.status, data?.message);
        return;
      }

      // ✅ Backend already sends fresh messages with populated readBy
      const updatedMessages = Array.isArray(data?.updatedMessages)
        ? data.updatedMessages
        : [];

      if (!updatedMessages.length) return;

      setMessages(prev =>
        prev.map(m => {
          const updated = updatedMessages.find(
            um => String(um._id) === String(m._id)
          );
          if (!updated) return m;

          // Keep everything else but prefer server readBy
          return {
            ...m,
            readBy: updated.readBy ?? m.readBy,
          };
        })
      );
    } catch (err) {
      console.error('markMessagesRead error', err);
    }
  }



  // ---------- send message (text JSON) ----------
  async function handleSend(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!text.trim()) return;
    if (!currentUserId) { alert('User not identified yet. Try again.'); return; }
    if (!socketRef.current) { alert('Socket not connected. Please wait.'); return; }

    const mentionIdsToSend = pendingMentions.length ? pendingMentions : extractMentionIdsFromText(text);
    const finalVal = replyingTo
      ? `↪ Replying to: ${replyingTo.text || '[Attachment]'}\n${text}`
      : text;

    // SOCKET EMIT (No HTTP)
    const payload = {
      senderId: currentUserId,
      conversationId: id,
      text: finalVal,
      mentions: mentionIdsToSend
    };

    socketRef.current.emit('send_message_secure', payload, (response) => {
      if (response && response.status === 'ok') {
        // Success: Append message
        setMessages(prev => [...prev, response.data]);
        setText('');
        setPendingMentions([]);
        setShowMentionDropdown(false);
        setReplyingTo(null);
      } else {
        console.error('Socket send failed:', response);
        alert(response?.message || 'Failed to send message via socket');
      }
    });
  }



  // ---------- upload voice (FormData) ----------
  async function uploadVoiceFile(file) {
    if (!file) return;
    if (!conversation || !conversation._id) { alert('Conversation not ready yet.'); return; }
    if (!currentUserId) { alert('User not identified yet.'); return; }

    const objectUrl = URL.createObjectURL(file);
    const audioEl = new Audio(objectUrl);
    const getDuration = () => new Promise(resolve => {
      audioEl.addEventListener('loadedmetadata', () => resolve(audioEl.duration || 0));
      audioEl.addEventListener('error', () => resolve(0));
    });
    const duration = await getDuration();
    URL.revokeObjectURL(objectUrl);

    const form = new FormData();
    form.append('senderId', currentUserId);
    form.append('duration', String(duration));
    form.append('file', file);

    const mentionList = pendingMentions.length ? pendingMentions : extractMentionIdsFromText(text);
    if (Array.isArray(mentionList) && mentionList.length) {
      form.append('mentions', JSON.stringify(mentionList));
    }

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';
      const res = await fetch(`${API_BASE}/api/chat/${encodeURIComponent(conversation._id)}/voice`, {
        method: 'POST',
        body: form,
      });

      const textResp = await res.text();
      let data;
      try { data = textResp ? JSON.parse(textResp) : null; } catch (e) {
        console.error('Non-JSON response from voice API:', textResp);
        if (!res.ok) throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
        throw new Error('Upload returned non-JSON');
      }

      if (!res.ok) { alert(data?.message || 'Failed to upload voice note'); return; }
      setMessages(prev => [...prev, data]);
      if (socketRef.current) {
        socketRef.current.emit('send_message', { room: id, message: data });
      }
      showNotification('Voice note uploaded');
      setPendingMentions([]);
      setText('');
    } catch (err) {
      console.error('Upload failed', err);
      alert('Error uploading voice note');
    }
  }

  // ---------- upload attachment (FormData) ----------
  async function uploadAttachmentFile(file) {
    if (!file) return;
    if (!conversation || !conversation._id) { alert('Conversation not ready yet.'); return; }
    if (!currentUserId) { alert('User not identified yet.'); return; }

    const form = new FormData();
    form.append('senderId', currentUserId);
    form.append('file', file);
    form.append('text', '');

    const mentionList = pendingMentions.length ? pendingMentions : extractMentionIdsFromText(text);
    if (Array.isArray(mentionList) && mentionList.length) {
      form.append('mentions', JSON.stringify(mentionList));
    }

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';
      const res = await fetch(`${API_BASE}/api/chat/${encodeURIComponent(conversation._id)}/upload`, {
        method: 'POST',
        body: form,
      });

      const textResp = await res.text();
      let data;
      try { data = textResp ? JSON.parse(textResp) : null; } catch (e) {
        console.error('Non-JSON response from upload API:', textResp);
        if (!res.ok) throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
        throw new Error('Upload returned non-JSON');
      }

      if (!res.ok) { alert(data?.message || 'Failed to upload file'); return; }
      setMessages(prev => [...prev, data]);
      if (socketRef.current) {
        socketRef.current.emit('send_message', { room: id, message: data });
      }
      showNotification('File uploaded');
      setPendingMentions([]);
      setText('');
    } catch (err) {
      console.error('Attachment upload failed', err);
      alert('Error uploading file');
    }
  }

  async function startVoiceRecording() {
    if (isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });

        await uploadVoiceFile(file);

        // stop microphone
        stream.getTracks().forEach(track => track.stop());
        audioChunksRef.current = [];
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied', err);
      alert('Microphone access is required to send voice messages.');
    }
  }

  function stopVoiceRecording() {
    if (!isRecording || !mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  }


  // ---------- group actions ----------
  async function handleAddMember(e) {
    e.preventDefault();
    if (!selectedUserId) { alert('Please select a user to add'); return; }
    if (!currentUserId) { alert('User not identified yet.'); return; }
    try {
      setAddingMember(true);
      const actorObj = (conversation?.participants || []).find(p => String(p._id || p) === String(currentUserId));
      const actorName = actorObj?.username || '';
      const memberObj = (allUsers || []).find(u => String(u._id) === String(selectedUserId));
      const memberName = memberObj?.username || '';
      const res = await fetch(`/api/groups/${conversation._id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: selectedUserId, actorId: currentUserId, actorName, memberName }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || 'Failed to add member'); return; }
      setConversation(prev => ({ ...prev, participants: data.participants, admins: data.admins ?? prev?.admins, name: data.name ?? prev?.name, description: data.description ?? prev?.description }));
      setSelectedUserId('');
      showNotification('Member added to group');
      if (data.systemMessage) setMessages(prev => [...prev, data.systemMessage]);
    } catch (err) { console.error('Failed to add member', err); alert('Error adding member'); }
    finally { setAddingMember(false); }
  }

  async function handleRemoveMember(memberId) {
    if (!currentUserId) { alert('User not identified yet.'); return; }
    if (!window.confirm('Remove this member from the group?')) return;
    try {
      setRemovingMember(true);
      const actorObj = (conversation?.participants || []).find(p => String(p._id || p) === String(currentUserId));
      const actorName = actorObj?.username || '';
      const memberObj = (conversation?.participants || []).find(p => String(p._id || p) === String(memberId));
      const memberName = memberObj?.username || '';
      const res = await fetch(`/api/groups/${conversation._id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, actorId: currentUserId, actorName, memberName }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || 'Failed to remove member'); return; }
      setConversation(prev => ({ ...prev, participants: data.participants, admins: data.admins ?? prev?.admins, name: data.name ?? prev?.name, description: data.description ?? prev?.description }));
      showNotification('Member removed from group');
      if (data.systemMessage) setMessages(prev => [...prev, data.systemMessage]);
    } catch (err) { console.error('Failed to remove member', err); alert('Error removing member'); }
    finally { setRemovingMember(false); }
  }

  async function handlePromoteToAdmin(memberId, memberName) {
    if (!currentUserId) { alert('User not identified yet.'); return; }
    if (!window.confirm(`Promote ${memberName} to Group Admin?`)) return;
    try {
      const actorObj = (conversation?.participants || []).find(p => String(p._id) === String(currentUserId));
      const actorName = actorObj?.username || '';
      const res = await fetch(`/api/groups/${conversation._id}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, actorId: currentUserId, actorName, memberName }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || 'Failed to promote member'); return; }
      setConversation(prev => ({ ...prev, participants: data.participants ?? prev?.participants, admins: data.admins ?? prev?.admins, name: data.name ?? prev?.name, description: data.description ?? prev?.description }));
      showNotification('Member promoted to group admin');
      if (data.systemMessage) setMessages(prev => [...prev, data.systemMessage]);
    } catch (err) { console.error('Failed to promote member', err); alert('Error promoting member'); }
  }

  async function handleSaveGroupInfo(e) {
    e.preventDefault();
    if (!currentUserId) { alert('User not identified yet.'); return; }
    try {
      setSavingInfo(true);
      const actorObj = (conversation?.participants || []).find(p => String(p._id) === String(currentUserId));
      const actorName = actorObj?.username || '';
      const res = await fetch(`/api/groups/${conversation._id}/info`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDescription, actorId: currentUserId, actorName }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || 'Failed to update group info'); return; }
      setConversation(prev => ({ ...prev, participants: data.participants ?? prev?.participants, admins: data.admins ?? prev?.admins, name: data.name ?? prev?.name, description: data.description ?? prev?.description }));
      setIsEditingInfo(false);
      showNotification('Group info updated');
      if (data.systemMessage) setMessages(prev => [...prev, data.systemMessage]);
    } catch (err) { console.error('Failed to update group info', err); alert('Error updating group info'); }
    finally { setSavingInfo(false); }
  }

  // delete message
  async function handleDeleteMessage(messageId) {
    if (!currentUserId) { alert('User not identified'); return; }
    if (!window.confirm('Delete this message?')) return;
    try {
      const res = await fetch(`/api/chat/${conversation._id}/message/${messageId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || 'Failed to delete message'); return; }
      setMessages(prev => prev.map(m => (String(m._id) === String(messageId) ? data.messageObj : m)));
      showNotification('Message deleted');
    } catch (err) { console.error('Delete failed', err); alert('Error deleting message'); }
  }

  // leave group
  async function handleLeaveGroup() {
    if (!currentUserId) { alert('User not identified yet.'); return; }
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      setLeavingGroup(true);
      const actorObj = (conversation?.participants || []).find(p => String(p._id) === String(currentUserId));
      const actorName = actorObj?.username || '';
      const res = await fetch(`/api/groups/${conversation._id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: currentUserId, actorId: currentUserId, actorName, memberName: actorName }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || 'Failed to leave group'); setLeavingGroup(false); return; }
      if (data.systemMessage) setMessages(prev => [...prev, data.systemMessage]);
      router.push('/users');
    } catch (err) { console.error('Failed to leave group', err); alert('Error leaving group'); setLeavingGroup(false); }
  }

  // render loading / missing conv
  if (loading || currentUserId === null) return <div style={{ padding: 20 }}>Loading chat...</div>;
  if (!conversation) return <div style={{ padding: 20 }}>Conversation not found</div>;

  const title = conversation.type === 'group' ? conversation.name || 'Group Chat' : 'Direct Chat';

  // member entries for left panel
  let memberEntries = [];
  let availableUsers = [];
  let isGroupAdmin = false;
  if (conversation.type === 'group') {
    const memberIds = new Set((conversation.participants || []).map(p => p._id?.toString?.() || String(p)));
    const isInAdminsArray = Array.isArray(conversation.admins) && conversation.admins.some(a => (a._id?.toString?.() || String(a)) === String(currentUserId));
    isGroupAdmin = isInAdminsArray || currentUserRole === 'director' || currentUserRole === 'project_manager';
    memberEntries = (conversation.participants || []).map((p) => {
      const id = p._id?.toString?.() || String(p);
      const name = p.username || 'User';
      const role = p.role || '';
      const isSelf = id === currentUserId;
      const isAdminForUser = Array.isArray(conversation.admins) && conversation.admins.some(a => (a._id?.toString?.() || String(a)) === id);
      return { id, name, role, isSelf, isAdminForUser };
    });
    availableUsers = (allUsers || []).filter(u => !memberIds.has(String(u._id)) && String(u._id) !== String(currentUserId));
  }
  function handleSwipeStart(e, msgId) {
    const point = e.touches ? e.touches[0] : e;
    swipeStartX.current = point.clientX;
    swipeStartY.current = point.clientY;
    setSwipingMsgId(msgId);
  }

  function handleSwipeMove(e) {
    if (!swipingMsgId || swipeStartX.current == null) return;

    const point = e.touches ? e.touches[0] : e;
    const deltaX = point.clientX - swipeStartX.current;
    const deltaY = Math.abs(point.clientY - swipeStartY.current);

    // prevent vertical scroll hijack
    if (deltaY > 30) return;

    if (deltaX > 0 && deltaX < 90) {
      setSwipeX(deltaX);
    }
  }

  function handleSwipeEnd(message) {
    if (swipeX > 60) {
      setReplyingTo(message); // WhatsApp threshold
    }

    setSwipeX(0);
    setSwipingMsgId(null);
    swipeStartX.current = null;
    swipeStartY.current = null;
  }


  return (
    <div style={{ minHeight: '100vh', padding: '24px 32px', backgroundColor: '#f5f5f7' }}>
      {/* Header with Notification Bell */}
      <div style={{ maxWidth: 1100, margin: '0 auto 16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <NotificationBell />
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: conversation.type === 'group' ? '280px 1fr' : '1fr', gap: 24, alignItems: 'flex-start' }}>
        {/* Left panel */}
        {conversation.type === 'group' && (
          <aside style={{ backgroundColor: '#ffffff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 16, boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div>
                <h3 style={{ marginTop: 0, marginBottom: 4 }}>{conversation.name || 'Group Chat'}</h3>
                {conversation.description && !isEditingInfo && <p style={{ fontSize: 13, color: '#555', marginTop: 0 }}>{conversation.description}</p>}
              </div>
              {isGroupAdmin && (
                <button type="button" onClick={() => setIsEditingInfo(prev => !prev)} style={{ border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', backgroundColor: '#e5e7eb' }}>
                  {isEditingInfo ? 'Cancel' : 'Edit group'}
                </button>
              )}
            </div>

            {isGroupAdmin && isEditingInfo && (
              <form onSubmit={handleSaveGroupInfo} style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Group name" style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #d1d5db' }} />
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Group description" rows={3} style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #d1d5db', resize: 'vertical' }} />
                <button type="submit" disabled={savingInfo} style={{ padding: '6px 10px', borderRadius: 4, border: 'none', backgroundColor: savingInfo ? '#9ca3af' : '#2563eb', color: '#fff' }}>
                  {savingInfo ? 'Saving…' : 'Save changes'}
                </button>
              </form>
            )}

            <div style={{ marginTop: 16 }}>
              <h4 style={{ margin: '8px 0 6px', fontSize: 14 }}>Members</h4>
              {memberEntries.length === 0 ? <p style={{ fontSize: 13, color: '#777' }}>No members yet.</p> : (
                <ul style={{ paddingLeft: 0, margin: 0, fontSize: 13, lineHeight: 1.5, listStyle: 'none' }}>
                  {memberEntries.map(m => (
                    <li key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span>{m.name}{m.isSelf && ' (you)'}{m.isAdminForUser && <span style={{ fontSize: 11, color: '#10B981', marginLeft: 6 }}>• Group Admin</span>}</span>
                      {isGroupAdmin && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          {!m.isSelf && !m.isAdminForUser && <button type="button" onClick={() => handlePromoteToAdmin(m.id, m.name)} style={{ border: 'none', borderRadius: 6, padding: '3px 8px', background: '#2563eb', color: '#fff' }}>Make Admin</button>}
                          {!m.isSelf && <button type="button" onClick={() => handleRemoveMember(m.id)} disabled={removingMember} style={{ border: 'none', borderRadius: 6, padding: '3px 8px', background: '#ef4444', color: '#fff' }}>Remove</button>}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {isGroupAdmin && (
              <div style={{ marginTop: 18 }}>
                <h4 style={{ margin: '8px 0 6px', fontSize: 14 }}>Add member</h4>
                {loadingUsers ? <p style={{ fontSize: 13 }}>Loading users...</p> : availableUsers.length === 0 ? <p style={{ fontSize: 13, color: '#777' }}>No more users available to add.</p> : (
                  <form onSubmit={handleAddMember} style={{ display: 'grid', gap: 8 }}>
                    <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} style={{ padding: '6px 8px', borderRadius: 4, border: '1px solid #ccc' }}>
                      <option value="">Select a user…</option>
                      {availableUsers.map(u => <option key={u._id} value={u._id}>{u.username} ({u.role})</option>)}
                    </select>
                    <button type="submit" disabled={addingMember || !selectedUserId} style={{ padding: '7px 10px', borderRadius: 4, border: 'none', backgroundColor: addingMember ? '#999' : '#0070f3', color: '#fff' }}>{addingMember ? 'Adding…' : 'Add Member'}</button>
                  </form>
                )}
              </div>
            )}

            <div style={{ marginTop: 18, paddingTop: 10, borderTop: '1px solid #e5e7eb' }}>
              <button type="button" onClick={handleLeaveGroup} disabled={leavingGroup} style={{ width: '100%', border: 'none', borderRadius: 6, padding: '6px 10px', backgroundColor: '#f97373', color: '#fff' }}>{leavingGroup ? 'Leaving…' : 'Leave Group'}</button>
            </div>
          </aside>
        )}

        {/* Right panel: chat */}
        <main style={{ backgroundColor: '#ffffff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 16, boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
          {conversation.type !== 'group' && <h2 style={{ marginTop: 0 }}>{title}</h2>}

          <div style={{ border: '1px solid #ccc', borderRadius: 6, padding: 10, height: 420, overflowY: 'auto', marginBottom: 10, backgroundColor: '#fafafa' }}>
            {messages.length === 0 ? <p>No messages yet. Say hi!</p> : messages.map(m => {
              const isMe = currentUserId && (m.sender?._id === currentUserId || String(m.sender) === String(currentUserId));
              const time = new Date(m.createdAt).toLocaleString();

              const senderId =
                typeof m.sender === 'object' && m.sender !== null
                  ? String(m.sender._id)
                  : String(m.sender);


              const senderName =
                typeof m.sender === 'object' && m.sender !== null
                  ? m.sender.username
                  : '';

              const isSenderMe = String(m.sender?._id || m.sender) === String(currentUserId);


              console.log(
                'MSG DEBUG',
                m._id,
                {
                  sender: m.sender?._id || m.sender,
                  readBy: (m.readBy || []).map(x =>
                    typeof x === 'object' ? x._id || x : x
                  ),
                  currentUserId
                }
              );


              return (
                <div
                  key={m._id}
                  onMouseDown={(e) => handleSwipeStart(e, m._id)}
                  onMouseMove={handleSwipeMove}
                  onMouseUp={() => handleSwipeEnd(m)}
                  onTouchStart={(e) => handleSwipeStart(e, m._id)}
                  onTouchMove={handleSwipeMove}
                  onTouchEnd={() => handleSwipeEnd(m)}
                  style={{
                    textAlign: m.type === 'system' ? 'center' : (isMe ? 'right' : 'left'),
                    marginBottom: 8,
                    transform:
                      swipingMsgId === m._id ? `translateX(${swipeX}px)` : 'translateX(0)',
                    transition: swipingMsgId === m._id ? 'none' : 'transform 0.2s ease',
                    touchAction: 'pan-y', // THIS IS CRITICAL
                    cursor: 'grab'
                  }}
                >


                  <div style={{ display: m.type === 'system' ? 'block' : 'inline-block', padding: m.type === 'system' ? 0 : '6px 10px', borderRadius: 12, background: isMe ? '#dcf8c6' : '#f1f0f0', maxWidth: m.type === 'system' ? '100%' : 520 }}>
                    {/* sender name (group chats only) */}
                    {conversation.type === 'group' &&
                      m.type !== 'system' &&
                      m.type !== 'deleted' &&
                      !isMe &&
                      senderName && (
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#2563eb',
                            marginBottom: 2
                          }}
                        >
                          {senderName}
                        </div>
                      )}


                    {m.type === 'system' ? (
                      <div style={{ textAlign: 'center', margin: '10px 0' }}>
                        <div style={{ display: 'inline-block', background: '#eef2ff', color: '#374151', padding: '8px 14px', borderRadius: 18, fontStyle: 'italic', fontSize: 13 }}>{m.text}</div>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 6 }}>{time}</div>
                      </div>
                    ) : m.type === 'deleted' ? (
                      <div style={{ fontStyle: 'italic', color: '#6b7280', padding: '6px 8px' }}>
                        <span style={{ marginRight: 8 }}>🗑</span> This message was deleted.
                        {m.deletedBy && m.deletedBy.username && <span style={{ marginLeft: 8, fontSize: 11, color: '#9ca3af' }}>Deleted by {m.deletedBy.username}</span>}
                      </div>
                    ) : (m.type === 'audio' || m.audioUrl || m.audio?.url) ? (
                      <div style={{ display: 'grid', gap: 6 }}>
                        {m.text && <div>{m.text}</div>}
                        <audio controls src={m.audioUrl || (m.audio && m.audio.url) || ''} style={{ width: 240 }}>Your browser does not support audio.</audio>
                        {typeof m.audioDuration !== 'undefined' && <div style={{ fontSize: 11, opacity: 0.8 }}>Duration: {Number(m.audioDuration).toFixed(2)}s</div>}
                      </div>
                    ) : m.type === 'image' && m.fileUrl ? (
                      <div>
                        {m.text && <div>{m.text}</div>}
                        <img src={m.fileUrl} alt={m.fileName || 'image'} style={{ maxWidth: 240, borderRadius: 8 }} />
                      </div>
                    ) : m.type === 'video' && m.fileUrl ? (
                      <div>
                        {m.text && <div>{m.text}</div>}
                        <video controls src={m.fileUrl} style={{ maxWidth: 360, borderRadius: 8 }} />
                      </div>
                    ) : m.type === 'file' && m.fileUrl ? (
                      <div>
                        <a href={m.fileUrl} target="_blank" rel="noreferrer" style={{ color: '#0b5cff' }}>{m.fileName || 'Attachment'}</a>
                        {m.text && <div>{m.text}</div>}
                      </div>
                    ) : (
                      <div>
                        {typeof m.text === 'string' ? m.text.split(/(\s+)/).map((tok, i) => {
                          if (!tok) return null;
                          if (tok.startsWith('@')) {
                            const uname = tok.slice(1).replace(/[^\w_.-]/g, '');
                            const mentionedUser = Array.isArray(m.mentions) ? m.mentions.find(u => (u.username || '').toLowerCase() === uname.toLowerCase() || String(u._id || u).toLowerCase() === uname.toLowerCase()) : null;
                            return (
                              <span key={i} style={{ fontWeight: 600, color: '#0b5cff', cursor: 'pointer' }} onClick={() => { if (mentionedUser && mentionedUser.username) showNotification(mentionedUser.username); }}>
                                {tok}
                              </span>
                            );
                          }
                          return <span key={i}>{tok}</span>;
                        }) : null}
                      </div>
                    )}

                    {m.type !== 'system' && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center', marginTop: 4, opacity: 0.8 }}>
                        {m.sender && String(m.sender._id) === String(currentUserId) && m.type !== 'deleted' && (
                          <button onClick={() => handleDeleteMessage(m._id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Delete message">🗑</button>
                        )}

                        <div style={{ fontSize: 10 }}>{time}</div>


                        {senderId === String(currentUserId) && (() => {

                          const readIds = (m.readBy || []).map(x => {
                            if (!x) return null;
                            return typeof x === 'object' ? String(x._id || x) : String(x);
                          }).filter(Boolean);

                          const seenCount = readIds.filter(
                            rid => rid !== String(m.sender?._id || m.sender)
                          ).length;

                          const totalOthers = (conversation.participants || []).filter(
                            p => String(p._id || p) !== String(m.sender?._id || m.sender)
                          ).length;

                          if (seenCount <= 0) return null;

                          const label =
                            conversation.type === 'direct'
                              ? 'Seen'
                              : seenCount === totalOthers
                                ? 'Seen'
                                : `Seen by ${seenCount}`;



                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openSeenModal(m.readBy || [], m.sender);
                              }}
                              style={{
                                fontSize: 11,
                                color: '#0b5cff',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                textDecoration: 'underline',
                              }}
                            >
                              {label}
                            </button>
                          );

                        })()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Attach + Voice + Input row */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input id="file-input" type="file" style={{ display: 'none' }} onChange={async (e) => { const file = e.target.files?.[0]; if (file) await uploadAttachmentFile(file); e.target.value = ''; }} />
            <label htmlFor="file-input" style={{ padding: 8, borderRadius: '50%', background: '#e5e7eb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38 }} title="Attach File">📎</label>

            <button
              type="button"
              onMouseDown={startVoiceRecording}
              onMouseUp={stopVoiceRecording}
              onMouseLeave={stopVoiceRecording}
              onTouchStart={startVoiceRecording}
              onTouchEnd={stopVoiceRecording}
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: isRecording ? '#ef4444' : '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18
              }}
              title={isRecording ? 'Recording… release to send' : 'Hold to record'}
            >
              🎤
            </button>




            <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, flex: 1, alignItems: 'center' }}>
              {replyingTo && (
                <div style={{
                  background: '#eef2ff',
                  padding: '6px 10px',
                  borderLeft: '4px solid #2563eb',
                  borderRadius: 4,
                  fontSize: 13,
                  marginBottom: 6,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ maxWidth: '90%' }}>
                    <strong>Replying to {replyingTo.sender?.username || 'User'}:</strong>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {replyingTo.text || '[Attachment]'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
              )}

              <textarea
                value={text}
                placeholder="Type a message..."
                rows={1}
                style={{
                  flex: 1,
                  resize: 'none',
                  overflow: 'hidden',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #ccc',
                  outline: 'none',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  lineHeight: '1.4',
                }}
                onChange={handleTextChange}
                onKeyDown={handleInputKeyDown}
                onInput={(e) => {
                  // Auto-grow like WhatsApp
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
              />


              {/* mention suggestions dropdown (inline next to input) */}
              {showMentionDropdown && mentionSuggestions.length > 0 && (
                <div style={{ position: 'relative', display: 'inline-block', zIndex: 1200, minWidth: 220 }}>
                  <div style={{ position: 'absolute', left: 0, bottom: 'calc(100% + 8px)', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 6px 16px rgba(0,0,0,0.08)', overflow: 'hidden', maxHeight: 220, width: 260 }}>
                    {mentionSuggestions.map(s => (
                      <div key={s.id} onMouseDown={(ev) => { ev.preventDefault(); acceptMentionSuggestion(s); }} style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ fontWeight: 600 }}>{s.username}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" style={{ padding: '7px 14px', borderRadius: 4, border: 'none', backgroundColor: '#0070f3', color: '#fff', fontWeight: 600 }}>Send</button>
            </form>
          </div>
        </main>
      </div>

      {/* Seen-by modal */}
      {seenModalOpen && (
        <div onClick={closeSeenModal} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 320, maxHeight: '60vh', overflowY: 'auto', background: '#fff', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 style={{ margin: 0, fontSize: 16 }}>Seen by</h4>
              <button onClick={closeSeenModal} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            {seenUsers.length === 0 ? <div style={{ color: '#666' }}>No one yet.</div> : (
              <ul style={{ paddingLeft: 16, margin: 0 }}>
                {seenUsers.map(u => <li key={u} style={{ padding: '6px 0', borderBottom: '1px solid #f1f1f1' }}>{u}</li>)}
              </ul>
            )}
            <div style={{ textAlign: 'right', marginTop: 12 }}>
              <button onClick={closeSeenModal} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: '#0070f3', color: '#fff' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* toast */}
      {notification && <div style={{ position: 'fixed', bottom: 20, right: 20, padding: '10px 16px', backgroundColor: '#111827', color: '#fff', borderRadius: 999 }}>{notification}</div>}
    </div>
  );
}
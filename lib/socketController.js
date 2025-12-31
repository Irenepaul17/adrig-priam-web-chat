// Dynamic imports for ESM compatibility (Next.js libs are ESM)
let dbConnect, Conversation, Message, createNotification, notifyUser, notifyGroup;

/**
 * Handles 'send_message_secure' event from the socket.
 * 
 * @param {Object} socket - The client socket instance
 * @param {Object} io - The global socket server instance
 * @param {Object} payload - { senderId, conversationId, text, mentions }
 * @param {Function} callback - Ack callback (optional)
 */
async function handleSendMessage(socket, io, payload, callback) {
    // Load modules dynamically if not already loaded
    if (!dbConnect) {
        const dbModule = await import('./db.js');
        dbConnect = dbModule.default;
        Conversation = dbModule.Conversation;
        Message = dbModule.Message;
    }
    if (!createNotification) {
        const notifModule = await import('./notifications.js');
        createNotification = notifModule.createNotification;
    }
    if (!notifyUser) {
        const notifyModule = await import('./notify.js');
        notifyUser = notifyModule.notifyUser;
        notifyGroup = notifyModule.notifyGroup;
    }

    const { senderId, conversationId, text, mentions } = payload;

    try {
        if (!senderId || !conversationId || !text) {
            if (callback) callback({ status: 'error', message: 'Missing required fields' });
            return;
        }

        // 1. Connect DB
        await dbConnect();

        // 2. Validate Conversation & Membership
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            if (callback) callback({ status: 'error', message: 'Conversation not found' });
            return;
        }

        // Check membership
        const isMember = (conversation.participants || []).some(p =>
            (p._id?.toString() || p.toString()) === String(senderId)
        );
        if (!isMember) {
            if (callback) callback({ status: 'error', message: 'Not a member' });
            return;
        }

        // 3. Create Message Object
        const messageData = {
            conversation: conversationId,
            sender: senderId,
            text: text, // Start with text only support
            type: 'text',
            readBy: [senderId],
            mentions: Array.isArray(mentions) ? mentions : []
        };

        const messageDoc = new Message(messageData);
        const savedMessage = await messageDoc.save();

        // Populate for frontend display
        await savedMessage.populate('sender', 'username');
        await savedMessage.populate('readBy', 'username');
        await savedMessage.populate('mentions', 'username');

        // 4. Handle Mentions Notifications
        if (messageData.mentions.length > 0) {
            messageData.mentions.forEach(uid => {
                notifyUser(uid, 'mentioned_in_message', {
                    conversationId,
                    messageId: savedMessage._id,
                    senderId,
                    senderName: savedMessage.sender?.username || 'Someone',
                    text: savedMessage.text
                });
            });
        }

        // 5. Handle General Notifications (DM vs Group)
        const senderName = savedMessage.sender?.username || 'Someone';

        if (conversation.type === 'direct') {
            const other = conversation.participants.find(p =>
                (p._id?.toString() || p.toString()) !== String(senderId)
            );
            const otherId = other?._id?.toString() || other?.toString();

            if (otherId) {
                // DB Notification
                const notif = await createNotification(
                    otherId,
                    'New Direct Message',
                    `Message from ${senderName}`,
                    'chat',
                    savedMessage._id
                );
                // Socket Notification
                if (notif) notifyUser(otherId, 'notification', notif);
            }
        } else {
            // Group: Notify everyone else
            conversation.participants.forEach(async (member) => {
                const memberId = member?._id?.toString() || member?.toString();
                if (memberId !== String(senderId)) {
                    const notif = await createNotification(
                        memberId,
                        'New Group Message',
                        `Message from ${senderName}`,
                        'chat',
                        savedMessage._id
                    );
                    if (notif) notifyUser(memberId, 'notification', notif);
                }
            });
        }

        // 6. Broadcast to Room (Room = conversationId)
        // We emit 'receive_message' which the frontend ALREADY listens to.
        socket.to(conversationId).emit('receive_message', savedMessage);

        // 7. Ack Success to Sender (so they can append locally or confirm sent)
        console.log('[SocketController] Message saved & broadcasted:', savedMessage._id);
        if (callback) callback({ status: 'ok', data: savedMessage });

    } catch (err) {
        console.error('[SocketController] Error:', err);
        if (callback) callback({ status: 'error', message: 'Server internal error' });
    }
}

module.exports = { handleSendMessage };

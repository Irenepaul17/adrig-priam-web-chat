// lib/notify.js
// No-op stub so existing imports/calls don't crash while you decide what to do with realtime.

export function notifyUser(userId, event, payload) {
  if (global.io) {
    // We assume the user joins a room named "user_<userId>"
    global.io.to(`user_${userId}`).emit(event, payload);
  }
}

export function notifyGroup(/* conversationId, event, payload */) {
  // noop
}

export function attachSocketServer(/* io */) {
  // noop
}

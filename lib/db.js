  // /lib/db.js
  import mongoose from 'mongoose';
  import bcrypt from 'bcryptjs';

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  // keep cached connection on global to avoid reconnecting in dev
  let cached = global._mongoose;
  if (!cached) {
    cached = global._mongoose = { conn: null, promise: null };
  }

  async function dbConnect() {
    if (cached.conn) return cached.conn;
    if (!cached.promise) {
      cached.promise = mongoose.connect(MONGODB_URI).then((m) => m);
    }
    cached.conn = await cached.promise;
    return cached.conn;
  }

  /* ---------------------- USER SCHEMA ---------------------- */
  const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email:    { type: String, required: false },
    password: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['client', 'director', 'project_manager', 'developer', 'tester', 'crm'],
    },
    permissions: [String],
  }, { timestamps: true });

  export const User = mongoose.models.User || mongoose.model('User', userSchema);

  /* --------------------- MEETING SCHEMA -------------------- */
  const meetingSchema = new mongoose.Schema({
    projectId:   { type: Number, required: true },
    title:       { type: String, required: true },
    date:        { type: String, required: true },
    time:        { type: String, required: true },
    participants: [String],
    createdAt:    { type: Date, default: Date.now },
  });

  export const Meeting = mongoose.models.Meeting || mongoose.model('Meeting', meetingSchema);

  /* ------------------ ROLE PERMISSIONS -------------------- */
  export const rolePermissions = {
    client: ['view_projects'],
    director: ['view_all', 'manage_all', 'create_projects', 'assign_teams'],
    project_manager: ['view_projects', 'manage_projects', 'assign_tasks'],
    developer: ['view_tasks', 'update_tasks', 'view_code'],
    tester: ['view_tasks', 'test_projects', 'report_bugs'],
    crm: ['view_clients', 'manage_clients', 'view_projects'],
  };

  /* ------------------ CONVERSATION SCHEMA ------------------ */
  const conversationSchema = new mongoose.Schema({
    type: { type: String, enum: ['direct','group'], default: 'direct' },
    name: { type: String, trim: true },
    description: { type: String, trim: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  }, { timestamps: true });

  // Force fresh model definitions in dev to avoid stale model objects
  if (mongoose.models.Conversation) {
    delete mongoose.models.Conversation;
  }

  export const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);

  /* --------------------- MESSAGE SCHEMA -------------------- */
  const messageSchema = new mongoose.Schema({
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // text content
    text:         { type: String, default: '' },

    /**
     * Allowed message types:
     * - text: normal text message
     * - audio: voice note
     * - image: uploaded image
     * - video: uploaded video
     * - file: other file attachments (pdf/doc)
     * - deleted: soft-deleted message (sender/admin removed)
     * - system: system / stamp messages (user added/removed/promoted etc)
     */
    type: {
      type: String,
      enum: ['text', 'audio', 'image', 'video', 'file', 'deleted', 'system'],
      default: 'text'
    },

    // audio fields (for audio type)
    audioUrl:     { type: String, default: null },
    audioDuration:{ type: Number, default: null },

    // generic file attachment fields
    fileUrl:      { type: String, default: null },
    fileMime:     { type: String, default: null },
    fileName:     { type: String, default: null },
    fileSize:     { type: Number, default: null },

    // read receipts: who has read this message
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],


    // deletion metadata (soft delete)
    deletedAt:    { type: Date, default: null },
    deletedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // additional free-form metadata if needed
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  }, { timestamps: true });

  if (mongoose.models.Message) {
    delete mongoose.models.Message;
  }

  export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

  /* ------------------ DEFAULT USER SEEDING ----------------- */
  export async function createDefaultUsers() {
    const defaultUsers = [
      { username: 'client1',   password: 'client123',   role: 'client' },
      { username: 'director1', password: 'director123', role: 'director' },
      { username: 'pm1',       password: 'pm123',       role: 'project_manager' },
      { username: 'dev1',      password: 'dev123',      role: 'developer' },
      { username: 'tester1',   password: 'test123',     role: 'tester' },
      { username: 'crm1',      password: 'crm123',      role: 'crm' },
    ];

    for (const u of defaultUsers) {
      const existing = await User.findOne({ username: u.username });
      if (!existing) {
        const hashed = await bcrypt.hash(u.password, 10);
        const user = new User({
          username: u.username,
          password: hashed,
          role: u.role,
          permissions: rolePermissions[u.role] || [],
        });
        await user.save();
      }
    }
  }

  export default dbConnect;

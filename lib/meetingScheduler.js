import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  projectId: { type: String, required: true },
  projectName: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  participants: [String],
  meetingLink: { type: String, required: true },
  scheduledBy: { type: String, required: true },
  notificationsSent: {
    scheduled: { type: Boolean, default: false },
    day24: { type: Boolean, default: false },
    hour1: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now }
});

export const Meeting = mongoose.models.Meeting || mongoose.model('Meeting', meetingSchema);

export const scheduleMeeting = async (meetingData) => {
  const meeting = new Meeting(meetingData);
  await meeting.save();
  return meeting;
};
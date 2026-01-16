import mongoose from 'mongoose';

const notificationTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

notificationTokenSchema.index({ user: 1, token: 1 }, { unique: true });

export default mongoose.model('NotificationToken', notificationTokenSchema);


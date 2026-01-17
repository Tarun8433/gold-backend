import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
    },
    subtitle: {
      type: String,
    },
    image: {
      type: String,
      required: true,
    },
    linkUrl: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    position: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

bannerSchema.index({ isActive: 1, position: 1, createdAt: -1 });

export default mongoose.model('Banner', bannerSchema);


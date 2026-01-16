import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
    },
    image: {
      type: String,
    },
    makingChargesMin: {
      type: Number,
      min: 0,
      default: 0,
    },
    makingChargesMax: {
      type: Number,
      min: 0,
    },
    makingChargesPercentDefault: {
      type: Number,
      min: 0,
      max: 100,
    },
    makingChargesPercentByMaterial: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Category', CategorySchema);

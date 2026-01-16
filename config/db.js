import mongoose from 'mongoose';
import config from 'config';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    // Or use process.env.MONGO_URI if you prefer dotenv over config package
    const db = process.env.MONGO_URI || config.get('mongoURI');
    
    await mongoose.connect(db);

    console.log('MongoDB Connected...');
  } catch (err) {
    console.error(err.message);
    // Exit process with failure
    process.exit(1);
  }
};

export default connectDB;

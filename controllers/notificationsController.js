import Notification from '../models/Notification.js';
import NotificationToken from '../models/NotificationToken.js';

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { read: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } }
    );

    res.json({ modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const registerNotificationToken = async (req, res) => {
  try {
    const { token, platform } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'token is required' });
    }

    const doc = await NotificationToken.findOneAndUpdate(
      { user: req.user._id, token },
      { $set: { platform } },
      { new: true, upsert: true }
    );

    res.status(201).json(doc);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({ message: 'Token already registered' });
    }
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export {
  getNotifications,
  markNotificationRead,
  deleteNotification,
  markAllNotificationsRead,
  registerNotificationToken,
};


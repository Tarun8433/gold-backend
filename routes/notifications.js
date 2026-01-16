import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getNotifications,
  markNotificationRead,
  deleteNotification,
  markAllNotificationsRead,
  registerNotificationToken,
} from '../controllers/notificationsController.js';

const router = express.Router();

router.get('/', protect, getNotifications);

router.put('/read-all', protect, markAllNotificationsRead);

router.post('/register', protect, registerNotificationToken);

router.put('/:id/read', protect, markNotificationRead);

router.delete('/:id', protect, deleteNotification);

export default router;


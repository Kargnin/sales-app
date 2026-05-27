import { Router } from 'express';
import { db } from '../db/connection.js';
import { notifications } from '../db/schema.js';
import { eq, desc, and, sql } from 'drizzle-orm';
import { authenticate, tenantScope } from '../middleware/index.js';

const router = Router();

router.use(authenticate, tenantScope);

// Get notifications for the authenticated user
router.get('/', async (req, res) => {
  try {
    const user = req.user!;
    const pageParam = req.query.page;
    const limitParam = req.query.limit;

    const baseWhere = and(
      eq(notifications.tenantId, user.tenantId),
      eq(notifications.userId, user.sub),
    );

    if (pageParam !== undefined) {
      const page = parseInt(pageParam as string, 10) || 1;
      const limit = parseInt(limitParam as string, 10) || 10;
      const offset = (page - 1) * limit;

      const [userNotifications, countResult] = await Promise.all([
        db.select().from(notifications).where(baseWhere)
          .orderBy(desc(notifications.createdAt)).limit(limit).offset(offset),
        db.select({ value: sql<number>`count(*)` }).from(notifications).where(baseWhere),
      ]);

      const totalCount = Number(countResult[0]?.value || 0);
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        notifications: userNotifications,
        pagination: { totalCount, totalPages, currentPage: page, limit },
      });
    } else {
      const limit = parseInt(limitParam as string, 10) || 50;
      const userNotifications = await db
        .select().from(notifications).where(baseWhere)
        .orderBy(desc(notifications.createdAt)).limit(limit);

      res.json(userNotifications);
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark a specific notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    await db.update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.id, id),
        eq(notifications.tenantId, user.tenantId),
        eq(notifications.userId, user.sub),
      ));

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Mark all notifications as read for the user
router.patch('/mark-all-read', async (req, res) => {
  try {
    const user = req.user!;

    await db.update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.tenantId, user.tenantId),
        eq(notifications.userId, user.sub),
        eq(notifications.isRead, false),
      ));

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

export const notificationsRouter = router;

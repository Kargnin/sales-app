import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { notifications, users } from '../db/schema.js';

type NotificationType = 'shop_approval' | 'order_status' | 'system' | 'new_order' | 'new_visit';

interface CreateNotificationParams {
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedEntityId?: string;
}

async function insertNotification(params: CreateNotificationParams) {
  await db.insert(notifications).values({
    id: uuidv4(),
    tenantId: params.tenantId,
    userId: params.userId,
    title: params.title,
    message: params.message,
    type: params.type,
    relatedEntityId: params.relatedEntityId || null,
  });
}

export async function notifyAdmins(
  tenantId: string,
  title: string,
  message: string,
  type: NotificationType,
  relatedEntityId?: string,
) {
  try {
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.role, 'admin')));

    if (admins.length === 0) return;

    await db.insert(notifications).values(
      admins.map((a) => ({
        id: uuidv4(),
        tenantId,
        userId: a.id,
        title,
        message,
        type,
        relatedEntityId: relatedEntityId || null,
      })),
    );
  } catch (err) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'Failed to create admin notifications',
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    }));
  }
}

export async function notifyUser(
  tenantId: string,
  userId: string,
  title: string,
  message: string,
  type: NotificationType,
  relatedEntityId?: string,
) {
  try {
    await insertNotification({ tenantId, userId, title, message, type, relatedEntityId });
  } catch (err) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'Failed to create user notification',
      userId,
      error: err instanceof Error ? err.message : String(err),
    }));
  }
}

export { insertNotification };

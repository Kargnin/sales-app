import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { shops, orders, notifications, users } from '../db/schema.js';
import { createShopSchema, updateShopSchema } from '@sales-app/shared';
import { authenticate, authorize, tenantScope, fieldGuard } from '../middleware/index.js';

const router = Router();

// Apply authentication and tenant scoping globally to all shop routes
router.use(authenticate, tenantScope);

// ─── Get Scoped Tenant Shops ──────────────────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;

    const pageParam = req.query.page;
    const limitParam = req.query.limit;

    if (pageParam !== undefined) {
      const page = parseInt(pageParam as string, 10) || 1;
      const limit = parseInt(limitParam as string, 10) || 10;
      const offset = (page - 1) * limit;

      const paginatedShops = await db
        .select()
        .from(shops)
        .where(eq(shops.tenantId, tenantId))
        .limit(limit)
        .offset(offset);

      const countResult = await db
        .select({ value: sql<number>`count(*)` })
        .from(shops)
        .where(eq(shops.tenantId, tenantId));

      const totalCount = Number(countResult[0]?.value || 0);
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        shops: paginatedShops,
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          limit,
        },
      });
    } else {
      // Retrieve all shops for the scoped tenant
      const tenantShops = await db.select().from(shops).where(eq(shops.tenantId, tenantId));
      res.json(tenantShops);
    }
  } catch (error) {
    console.error('Error fetching shops:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Create Shop ──────────────────────────────────────────────────────
router.post(
  '/',
  fieldGuard({
    salesman: {
      reject: ['status', 'id', 'tenantId', 'createdByUserId'],
    },
    admin: {
      reject: ['id', 'tenantId'],
    },
  }),
  async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = createShopSchema.safeParse(req.body);
    if (!validated.success) {
      res.status(400).json({ error: 'Validation failed', details: validated.error.format() });
      return;
    }

    const { name, ownerName, phone, address, latitude, longitude } = validated.data;
    const tenantId = req.user!.tenantId;
    const userId = req.user!.sub;
    const role = req.user!.role;

    // Admins register approved by default, salesmen are pending approval
    const defaultStatus = role === 'admin' ? 'approved' : 'pending_approval';

    const shopId = uuidv4();

    await db.insert(shops).values({
      id: shopId,
      tenantId,
      name,
      ownerName: ownerName || null,
      phone,
      address: address || null,
      latitude: latitude !== undefined ? String(latitude) : null,
      longitude: longitude !== undefined ? String(longitude) : null,
      status: defaultStatus,
      createdByUserId: userId,
    });

    const newShop = await db.query.shops.findFirst({
      where: eq(shops.id, shopId),
    });

    if (defaultStatus === 'pending_approval') {
      const admins = await db.select().from(users).where(and(eq(users.tenantId, tenantId), eq(users.role, 'admin')));
      const notificationValues = admins.map(a => ({
        id: uuidv4(),
        tenantId,
        userId: a.id,
        title: 'New Outlet Requires Approval',
        message: `${name} was registered and requires admin approval.`,
        type: 'shop_approval' as const,
        relatedEntityId: shopId
      }));
      if (notificationValues.length > 0) {
        await db.insert(notifications).values(notificationValues);
      }
    }

    res.status(201).json(newShop);
  } catch (error) {
    console.error('Error creating shop:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Approve Shop (Admin Only) ─────────────────────────────────────────
router.patch('/:id/approve', authorize('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const tenantId = req.user!.tenantId;

    // Check if the shop exists and belongs to the admin's tenant
    const existingShop = await db.query.shops.findFirst({
      where: and(eq(shops.id, id), eq(shops.tenantId, tenantId)),
    });

    if (!existingShop) {
      res.status(404).json({ error: 'Shop not found' });
      return;
    }

    await db.update(shops)
      .set({ status: 'approved' })
      .where(eq(shops.id, id));

    if (existingShop.createdByUserId) {
      await db.insert(notifications).values({
        id: uuidv4(),
        tenantId,
        userId: existingShop.createdByUserId,
        title: 'Outlet Approved',
        message: `${existingShop.name} has been approved by admin.`,
        type: 'shop_approval',
        relatedEntityId: id
      });
    }

    res.json({ message: 'Shop approved successfully', id });
  } catch (error) {
    console.error('Error approving shop:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Edit Shop Details (Admin Only) ───────────────────────────────────
router.patch(
  '/:id',
  authorize('admin'),
  fieldGuard({
    admin: {
      reject: ['id', 'tenantId'],
    },
  }),
  async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const tenantId = req.user!.tenantId;

    const validated = updateShopSchema.safeParse(req.body);
    if (!validated.success) {
      res.status(400).json({ error: 'Validation failed', details: validated.error.format() });
      return;
    }

    // Check if the shop exists and belongs to the admin's tenant
    const existingShop = await db.query.shops.findFirst({
      where: and(eq(shops.id, id), eq(shops.tenantId, tenantId)),
    });

    if (!existingShop) {
      res.status(404).json({ error: 'Shop not found' });
      return;
    }

    const { name, ownerName, phone, address, latitude, longitude, status } = validated.data;

    await db.update(shops)
      .set({
        name: name !== undefined ? name : undefined,
        ownerName: ownerName !== undefined ? ownerName : undefined,
        phone: phone !== undefined ? phone : undefined,
        address: address !== undefined ? address : undefined,
        latitude: latitude !== undefined ? String(latitude) : undefined,
        longitude: longitude !== undefined ? String(longitude) : undefined,
        status: status !== undefined ? status : undefined,
      })
      .where(eq(shops.id, id));

    const updatedShop = await db.query.shops.findFirst({
      where: eq(shops.id, id),
    });

    res.json({ message: 'Shop details updated successfully', shop: updatedShop });
  } catch (error) {
    console.error('Error editing shop:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Reject Shop (Admin Only) ──────────────────────────────────────────
router.patch('/:id/reject', authorize('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const tenantId = req.user!.tenantId;

    // Check if the shop exists and belongs to the admin's tenant
    const existingShop = await db.query.shops.findFirst({
      where: and(eq(shops.id, id), eq(shops.tenantId, tenantId)),
    });

    if (!existingShop) {
      res.status(404).json({ error: 'Shop not found' });
      return;
    }

    // 1. Fetch all orders for this shop
    const shopOrders = await db.select().from(orders).where(and(eq(orders.shopId, id), eq(orders.tenantId, tenantId)));

    // 2. Check for non-cancellable orders (dispatched or delivered)
    const nonCancellableOrders = shopOrders.filter(
      (order) => order.status === 'dispatched' || order.status === 'delivered'
    );

    if (nonCancellableOrders.length > 0) {
      res.status(400).json({
        error: 'non_cancellable_orders',
        message: 'Cannot reject this shop because there are orders that have already been dispatched or delivered.',
        orders: nonCancellableOrders,
      });
      return;
    }

    // 3. Update cancellable orders and shop status within a transaction
    const cancellableStatuses = ['pending_approval', 'confirmed'] as const;
    const ordersToCancel = shopOrders.filter((order) => (cancellableStatuses as readonly string[]).includes(order.status));

    await db.transaction(async (tx) => {
      if (ordersToCancel.length > 0) {
        await tx.update(orders)
          .set({ status: 'cancelled' })
          .where(
            and(
              eq(orders.shopId, id),
              eq(orders.tenantId, tenantId),
              inArray(orders.status, cancellableStatuses)
            )
          );
      }

      await tx.update(shops)
        .set({ status: 'rejected' })
        .where(eq(shops.id, id));

      if (existingShop.createdByUserId) {
        await tx.insert(notifications).values({
          id: uuidv4(),
          tenantId,
          userId: existingShop.createdByUserId,
          title: 'Outlet Rejected',
          message: `${existingShop.name} has been rejected by admin.`,
          type: 'shop_approval',
          relatedEntityId: id
        });
      }

      if (ordersToCancel.length > 0) {
        const orderCancelNotifications = ordersToCancel
          .filter(order => order.salesmanId)
          .map(order => ({
            id: uuidv4(),
            tenantId,
            userId: order.salesmanId!,
            title: 'Order Cancelled',
            message: `Order for ${existingShop.name} has been cancelled because the outlet was rejected.`,
            type: 'order_status' as const,
            relatedEntityId: order.id,
          }));
        if (orderCancelNotifications.length > 0) {
          await tx.insert(notifications).values(orderCancelNotifications);
        }
      }
    });

    res.json({
      message: 'Shop rejected successfully',
      id,
      cancelledOrdersCount: ordersToCancel.length,
    });
  } catch (error) {
    console.error('Error rejecting shop:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { shops, orders, users } from '../db/schema.js';
import { createShopSchema, updateShopSchema } from '@sales-app/shared';
import {
  authenticate,
  authorize,
  tenantScope,
  fieldGuard,
  validate,
} from '../middleware/index.js';
import { notifyAdmins, notifyUser } from '../services/notification.service.js';

const router = Router();

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

      const [paginatedShops, countResult] = await Promise.all([
        db
          .select()
          .from(shops)
          .where(eq(shops.tenantId, tenantId))
          .limit(limit)
          .offset(offset),
        db
          .select({ value: sql<number>`count(*)` })
          .from(shops)
          .where(eq(shops.tenantId, tenantId)),
      ]);

      const totalCount = Number(countResult[0]?.value || 0);
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        shops: paginatedShops,
        pagination: { totalCount, totalPages, currentPage: page, limit },
      });
    } else {
      const tenantShops = await db
        .select()
        .from(shops)
        .where(eq(shops.tenantId, tenantId));
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
  authorize('admin', 'salesman'),
  fieldGuard({
    salesman: { reject: ['status', 'id', 'tenantId', 'createdByUserId'] },
    admin: { reject: ['id', 'tenantId'] },
  }),
  validate(createShopSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        name,
        ownerName,
        phone,
        address,
        imageUrl,
        additionalOwners,
        latitude,
        longitude,
      } = req.body;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.sub;
      const role = req.user!.role;

      const defaultStatus = role === 'admin' ? 'approved' : 'pending_approval';
      const shopId = uuidv4();

      await db.insert(shops).values({
        id: shopId,
        tenantId,
        name,
        ownerName: ownerName || null,
        phone,
        address: address || null,
        imageUrl: imageUrl || null,
        additionalOwners: additionalOwners || null,
        latitude: latitude !== undefined ? String(latitude) : null,
        longitude: longitude !== undefined ? String(longitude) : null,
        status: defaultStatus,
        createdByUserId: userId,
      });

      const newShop = await db.query.shops.findFirst({
        where: eq(shops.id, shopId),
      });

      if (defaultStatus === 'pending_approval') {
        await notifyAdmins(
          tenantId,
          'New Outlet Requires Approval',
          `${name} was registered and requires admin approval.`,
          'shop_approval',
          shopId,
        );
      }

      res.status(201).json(newShop);
    } catch (error) {
      console.error('Error creating shop:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── Approve Shop (Admin Only) ─────────────────────────────────────────
router.patch(
  '/:id/approve',
  authorize('admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const tenantId = req.user!.tenantId;

      const existingShop = await db.query.shops.findFirst({
        where: and(eq(shops.id, id), eq(shops.tenantId, tenantId)),
      });

      if (!existingShop) {
        res.status(404).json({ error: 'Shop not found' });
        return;
      }

      await db
        .update(shops)
        .set({ status: 'approved' })
        .where(eq(shops.id, id));

      if (existingShop.createdByUserId) {
        await notifyUser(
          tenantId,
          existingShop.createdByUserId,
          'Outlet Approved',
          `${existingShop.name} has been approved by admin.`,
          'shop_approval',
          id,
        );
      }

      res.json({ message: 'Shop approved successfully', id });
    } catch (error) {
      console.error('Error approving shop:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── Reject Shop (Admin Only) ──────────────────────────────────────────
router.patch(
  '/:id/reject',
  authorize('admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const tenantId = req.user!.tenantId;

      const existingShop = await db.query.shops.findFirst({
        where: and(eq(shops.id, id), eq(shops.tenantId, tenantId)),
      });

      if (!existingShop) {
        res.status(404).json({ error: 'Shop not found' });
        return;
      }

      const shopOrders = await db
        .select()
        .from(orders)
        .where(and(eq(orders.shopId, id), eq(orders.tenantId, tenantId)));

      const nonCancellableOrders = shopOrders.filter(
        (o) => o.status === 'dispatched' || o.status === 'delivered',
      );

      if (nonCancellableOrders.length > 0) {
        res.status(400).json({
          error: 'non_cancellable_orders',
          message:
            'Cannot reject this shop because there are orders that have already been dispatched or delivered.',
          orders: nonCancellableOrders,
        });
        return;
      }

      const cancellableStatuses = ['pending_approval', 'confirmed'] as const;
      const ordersToCancel = shopOrders.filter((o) =>
        (cancellableStatuses as readonly string[]).includes(o.status),
      );

      await db.transaction(async (tx) => {
        if (ordersToCancel.length > 0) {
          await tx
            .update(orders)
            .set({ status: 'cancelled' })
            .where(
              and(
                eq(orders.shopId, id),
                eq(orders.tenantId, tenantId),
                inArray(orders.status, cancellableStatuses),
              ),
            );
        }

        await tx
          .update(shops)
          .set({ status: 'rejected' })
          .where(eq(shops.id, id));
      });

      // Send notifications outside transaction so failures don't roll back
      if (existingShop.createdByUserId) {
        await notifyUser(
          tenantId,
          existingShop.createdByUserId,
          'Outlet Rejected',
          `${existingShop.name} has been rejected by admin.`,
          'shop_approval',
          id,
        );
      }

      for (const order of ordersToCancel) {
        if (order.salesmanId) {
          await notifyUser(
            tenantId,
            order.salesmanId,
            'Order Cancelled',
            `Order for ${existingShop.name} has been cancelled because the outlet was rejected.`,
            'order_status',
            order.id,
          );
        }
      }

      res.json({
        message: 'Shop rejected successfully',
        id,
        cancelledOrdersCount: ordersToCancel.length,
      });
    } catch (error) {
      console.error('Error rejecting shop:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── Edit Shop Details (Admin Only) ───────────────────────────────────
router.patch(
  '/:id',
  authorize('admin'),
  fieldGuard({ admin: { reject: ['id', 'tenantId'] } }),
  validate(updateShopSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const tenantId = req.user!.tenantId;

      const existingShop = await db.query.shops.findFirst({
        where: and(eq(shops.id, id), eq(shops.tenantId, tenantId)),
      });

      if (!existingShop) {
        res.status(404).json({ error: 'Shop not found' });
        return;
      }

      const {
        name,
        ownerName,
        phone,
        address,
        imageUrl,
        additionalOwners,
        latitude,
        longitude,
      } = req.body;

      await db
        .update(shops)
        .set({
          name: name !== undefined ? name : undefined,
          ownerName: ownerName !== undefined ? ownerName : undefined,
          phone: phone !== undefined ? phone : undefined,
          address: address !== undefined ? address : undefined,
          imageUrl: imageUrl !== undefined ? imageUrl : undefined,
          additionalOwners:
            additionalOwners !== undefined ? additionalOwners : undefined,
          latitude: latitude !== undefined ? String(latitude) : undefined,
          longitude: longitude !== undefined ? String(longitude) : undefined,
        })
        .where(eq(shops.id, id));

      const updatedShop = await db.query.shops.findFirst({
        where: eq(shops.id, id),
      });
      res.json({
        message: 'Shop details updated successfully',
        shop: updatedShop,
      });
    } catch (error) {
      console.error('Error editing shop:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── Get Single Shop Details ──────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const tenantId = req.user!.tenantId;

    const shop = await db.query.shops.findFirst({
      where: and(eq(shops.id, id), eq(shops.tenantId, tenantId)),
    });

    if (!shop) {
      res.status(404).json({ error: 'Shop not found' });
      return;
    }

    res.json(shop);
  } catch (error) {
    console.error('Error fetching shop detail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Delete Shop (Admin Only) ──────────────────────────────────────────
router.delete(
  '/:id',
  authorize('admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const tenantId = req.user!.tenantId;

      const existingShop = await db.query.shops.findFirst({
        where: and(eq(shops.id, id), eq(shops.tenantId, tenantId)),
      });

      if (!existingShop) {
        res.status(404).json({ error: 'Shop not found' });
        return;
      }

      const shopOrders = await db
        .select()
        .from(orders)
        .where(and(eq(orders.shopId, id), eq(orders.tenantId, tenantId)));

      const nonCancellableOrders = shopOrders.filter(
        (o) => o.status === 'dispatched' || o.status === 'delivered',
      );

      if (nonCancellableOrders.length > 0) {
        res.status(400).json({
          error: 'non_cancellable_orders',
          message:
            'Cannot delete this shop because there are orders that have already been dispatched or delivered.',
          orders: nonCancellableOrders,
        });
        return;
      }

      await db
        .delete(shops)
        .where(and(eq(shops.id, id), eq(shops.tenantId, tenantId)));

      res.json({ message: 'Shop deleted successfully', id });
    } catch (error) {
      console.error('Error deleting shop:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;

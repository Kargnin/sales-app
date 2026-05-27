import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, desc, asc, ne, sql } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { orders, orderItems, products, shops, users, payments } from '../db/schema.js';
import { createOrderSchema, createPaymentBodySchema, markAsPaidSchema } from '@sales-app/shared';
import { authenticate, authorize, tenantScope, rateLimiter, validate, fieldGuard } from '../middleware/index.js';
import { notifyAdmins, notifyUser } from '../services/notification.service.js';

const router = Router();

const publicOrderLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Too many requests from this IP to public order portal, please try again later.',
});

const apiOrderLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many order requests from this IP, please try again later.',
});

// ─── Public routes (unauthenticated) ──────────────────────────────────

router.get('/public', publicOrderLimiter, async (req: Request, res: Response): Promise<void> => {
  res.status(404).json({ error: 'Order not found' });
});

router.get('/public/:token', publicOrderLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const token = (req.params.token as string)?.trim();
    if (!token) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.cancellationToken, token),
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const [shop, items] = await Promise.all([
      db.query.shops.findFirst({ where: eq(shops.id, order.shopId) }),
      db.select({
        id: orderItems.id,
        productId: orderItems.productId,
        productName: products.name,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        subtotal: orderItems.subtotal,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, order.id)),
    ]);

    res.json({
      ...order,
      shopName: shop ? shop.name : 'Unknown Shop',
      items,
    });
  } catch (error) {
    console.error('Error fetching public order invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/public/cancel', publicOrderLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.cancellationToken, token),
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.cancellationWindowExpiresAt && new Date() > new Date(order.cancellationWindowExpiresAt)) {
      res.status(400).json({ error: 'Cancellation window has expired' });
      return;
    }

    const [result] = await db.update(orders)
      .set({ status: 'cancelled' })
      .where(and(
        eq(orders.id, order.id),
        ne(orders.status, 'cancelled'),
        ne(orders.status, 'dispatched'),
        ne(orders.status, 'delivered'),
      ));

    const affectedRows = (result as any)?.affectedRows ?? 0;

    if (affectedRows === 0) {
      const latestOrder = await db.query.orders.findFirst({ where: eq(orders.id, order.id) });
      if (latestOrder) {
        if (latestOrder.status === 'cancelled') {
          res.status(400).json({ error: 'Order is already cancelled' });
          return;
        }
        if (latestOrder.status === 'dispatched') {
          res.status(400).json({ error: 'Cannot cancel a dispatched order' });
          return;
        }
        if (latestOrder.status === 'delivered') {
          res.status(400).json({ error: 'Cannot cancel a delivered order' });
          return;
        }
      }
      res.status(400).json({ error: 'Order is already cancelled' });
      return;
    }

    const [shop, admins] = await Promise.all([
      db.query.shops.findFirst({ where: eq(shops.id, order.shopId) }),
      db.select({ id: users.id }).from(users).where(
        and(eq(users.tenantId, order.tenantId), eq(users.role, 'admin')),
      ),
    ]);
    const shopName = shop ? shop.name : 'Outlet';

    if (order.salesmanId) {
      await notifyUser(order.tenantId, order.salesmanId, 'Order Cancelled by Customer',
        `Order for ${shopName} has been cancelled by the customer.`, 'order_status', order.id);
    }

    for (const admin of admins) {
      await notifyUser(order.tenantId, admin.id, 'Order Cancelled by Customer',
        `Order for ${shopName} has been cancelled by the customer.`, 'order_status', order.id);
    }

    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Authenticated routes ──────────────────────────────────────────────
router.use(authenticate, tenantScope, apiOrderLimiter);

// ─── Get Products Catalog (via orders router) ──────────────────────────
router.get('/products', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const allProducts = await db.select().from(products).where(eq(products.tenantId, tenantId));
    res.json(allProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Get Scoped Tenant Orders ─────────────────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.sub;
    const role = req.user!.role;

    const { page, limit: limitParam, shopId: shopIdQuery, filter_shop: filterShopQuery,
      status: statusQuery, sort: sortQuery } = req.query;

    let baseWhere = role === 'admin'
      ? eq(orders.tenantId, tenantId)
      : and(eq(orders.tenantId, tenantId), eq(orders.salesmanId, userId));

    if (shopIdQuery) baseWhere = and(baseWhere, eq(orders.shopId, shopIdQuery as string));
    if (filterShopQuery) baseWhere = and(baseWhere, eq(shops.name, filterShopQuery as string));
    if (statusQuery === 'ongoing') {
      baseWhere = and(baseWhere, sql`${orders.status} IN ('pending_approval', 'confirmed', 'dispatched')`);
    } else if (statusQuery === 'delivered') {
      baseWhere = and(baseWhere, eq(orders.status, 'delivered'));
    }

    let orderByClause = desc(orders.createdAt);
    if (sortQuery === 'date_asc') orderByClause = asc(orders.createdAt);
    else if (sortQuery === 'shop_asc') orderByClause = asc(shops.name);
    else if (sortQuery === 'shop_desc') orderByClause = desc(shops.name);
    else if (sortQuery === 'value_asc') orderByClause = asc(sql`CAST(${orders.totalAmount} AS DECIMAL(10,2))`);
    else if (sortQuery === 'value_desc') orderByClause = desc(sql`CAST(${orders.totalAmount} AS DECIMAL(10,2))`);

    const isAdmin = role === 'admin';

    const buildQuery = () => {
      const fields: any = {
        id: orders.id,
        tenantId: orders.tenantId,
        shopId: orders.shopId,
        shopName: shops.name,
        salesmanId: orders.salesmanId,
        orderSource: orders.orderSource,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        cancellationToken: orders.cancellationToken,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
      };

      if (isAdmin) fields.salesmanName = users.username;

      let query = db.select(fields).from(orders)
        .innerJoin(shops, eq(orders.shopId, shops.id));

      if (isAdmin) query = query.leftJoin(users, eq(orders.salesmanId, users.id));

      return query;
    };

    if (page !== undefined) {
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limitParam as string, 10) || 10;
      const offset = (pageNum - 1) * limitNum;

      const [paginatedOrders, countResult] = await Promise.all([
        buildQuery().where(baseWhere).orderBy(orderByClause).limit(limitNum).offset(offset),
        db.select({ value: sql<number>`count(*)` }).from(orders)
          .innerJoin(shops, eq(orders.shopId, shops.id)).where(baseWhere),
      ]);

      const totalCount = Number(countResult[0]?.value || 0);
      const totalPages = Math.ceil(totalCount / limitNum);

      res.json({
        orders: paginatedOrders,
        pagination: { totalCount, totalPages, currentPage: pageNum, limit: limitNum },
      });
    } else {
      const allOrders = await buildQuery().where(baseWhere).orderBy(orderByClause);
      res.json(allOrders);
    }
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Get Shop Orders ──────────────────────────────────────────────────
router.get('/shop/:shopId', async (req: Request, res: Response): Promise<void> => {
  try {
    const shopId = req.params.shopId as string;
    const tenantId = req.user!.tenantId;
    const userId = req.user!.sub;
    const role = req.user!.role;

    const targetShop = await db.query.shops.findFirst({
      where: and(eq(shops.id, shopId), eq(shops.tenantId, tenantId)),
    });

    if (!targetShop) {
      res.status(404).json({ error: 'Shop not found' });
      return;
    }

    const where = role === 'admin'
      ? and(eq(orders.tenantId, tenantId), eq(orders.shopId, shopId))
      : and(eq(orders.tenantId, tenantId), eq(orders.shopId, shopId), eq(orders.salesmanId, userId));

    const shopOrders = await db
      .select({
        id: orders.id,
        tenantId: orders.tenantId,
        shopId: orders.shopId,
        shopName: shops.name,
        salesmanId: orders.salesmanId,
        salesmanName: users.username,
        orderSource: orders.orderSource,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        cancellationToken: orders.cancellationToken,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .innerJoin(shops, eq(orders.shopId, shops.id))
      .leftJoin(users, eq(orders.salesmanId, users.id))
      .where(where)
      .orderBy(desc(orders.createdAt));

    res.json(shopOrders);
  } catch (error) {
    console.error('Error fetching shop orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Get Single Order Details ─────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = req.params.id as string;
    const tenantId = req.user!.tenantId;
    const userId = req.user!.sub;
    const role = req.user!.role;

    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)),
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (role !== 'admin' && order.salesmanId !== userId) {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      return;
    }

    const [shop, items, orderPayments] = await Promise.all([
      db.query.shops.findFirst({ where: eq(shops.id, order.shopId) }),
      db.select({
        id: orderItems.id,
        productId: orderItems.productId,
        productName: products.name,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        subtotal: orderItems.subtotal,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, order.id)),
      db.select().from(payments).where(eq(payments.orderId, order.id)),
    ]);

    res.json({
      ...order,
      shopName: shop ? shop.name : 'Unknown Shop',
      items,
      payments: orderPayments,
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Place Order ───────────────────────────────────────────────────────
router.post(
  '/',
  fieldGuard({
    admin: { reject: ['id', 'tenantId', 'cancellationToken', 'cancellationWindowExpiresAt'] },
    salesman: { reject: ['id', 'tenantId', 'cancellationToken', 'cancellationWindowExpiresAt'] },
  }),
  validate(createOrderSchema),
  async (req: Request, res: Response): Promise<void> => {
  try {
    const { shopId, items, source } = req.body;
    const tenantId = req.user!.tenantId;
    const salesmanId = req.user!.sub;

    const targetShop = await db.query.shops.findFirst({
      where: and(eq(shops.id, shopId), eq(shops.tenantId, tenantId)),
    });

    if (!targetShop) {
      res.status(404).json({ error: 'Shop not found' });
      return;
    }

    if (targetShop.status === 'rejected') {
      res.status(400).json({ error: 'Cannot place order for a rejected shop.' });
      return;
    }

    const dbProducts = await db.select().from(products).where(eq(products.tenantId, tenantId));

    let calculatedTotal = 0;
    const itemsToInsert: Array<{
      id: string;
      orderId: string;
      productId: string;
      quantity: number;
      unitPrice: string;
      subtotal: string;
    }> = [];

    const orderId = uuidv4();

    for (const item of items) {
      const match = dbProducts.find((p) => p.id === item.productId);
      if (!match) {
        res.status(400).json({ error: `Product not found.` });
        return;
      }

      const priceNum = parseFloat(match.price);
      const subtotal = priceNum * item.quantity;
      calculatedTotal += subtotal;

      itemsToInsert.push({
        id: uuidv4(),
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: String(priceNum),
        subtotal: String(subtotal),
      });
    }

    const cancellationToken = uuidv4();
    const cancellationWindowExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.transaction(async (tx) => {
      await tx.insert(orders).values({
        id: orderId,
        tenantId,
        shopId,
        salesmanId,
        orderSource: source || 'salesman',
        status: targetShop.status === 'pending_approval' ? 'pending_approval' : 'confirmed',
        paymentStatus: 'unpaid',
        cancellationToken,
        cancellationWindowExpiresAt,
        totalAmount: String(calculatedTotal),
      });

      await tx.insert(orderItems).values(itemsToInsert);
    });

    await notifyAdmins(tenantId, 'New Order Received',
      `Order for ₹${calculatedTotal.toFixed(2)} placed for ${targetShop.name}.`, 'new_order', orderId);

    const newOrder = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Record Payment (Admin Only) ───────────────────────────────────────
router.post('/:id/payments', authorize('admin'), validate(createPaymentBodySchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = req.params.id as string;
    const tenantId = req.user!.tenantId;
    const { amountPaid, paymentMethod, notes } = req.body;

    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)),
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.status === 'cancelled') {
      res.status(400).json({ error: 'Cannot record payment for a cancelled order' });
      return;
    }

    const existingPayments = await db.select().from(payments).where(eq(payments.orderId, orderId));
    const totalAmount = parseFloat(order.totalAmount);
    const totalPaidBefore = existingPayments.reduce((sum, p) => sum + parseFloat(p.amountPaid), 0);
    const remainingBefore = totalAmount - totalPaidBefore;

    if (remainingBefore <= 0) {
      res.status(400).json({ error: 'Order is already fully paid' });
      return;
    }

    if (amountPaid > remainingBefore + 0.001) {
      res.status(400).json({ error: 'Payment exceeds remaining balance' });
      return;
    }

    const paymentId = uuidv4();
    let updatedOrder: any;

    await db.transaction(async (tx) => {
      await tx.insert(payments).values({
        id: paymentId,
        tenantId,
        orderId,
        amountPaid: String(amountPaid),
        paymentMethod,
        notes: notes || null,
      });

      const totalPaidAfter = totalPaidBefore + amountPaid;
      let newPaymentStatus: 'unpaid' | 'partially_paid' | 'paid' = 'unpaid';

      if (totalPaidAfter >= totalAmount - 0.001) {
        newPaymentStatus = 'paid';
      } else if (totalPaidAfter > 0) {
        newPaymentStatus = 'partially_paid';
      }

      await tx.update(orders).set({ paymentStatus: newPaymentStatus }).where(eq(orders.id, orderId));

      updatedOrder = await tx.query.orders.findFirst({ where: eq(orders.id, orderId) });
    });

    res.status(201).json(updatedOrder);
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Mark as Paid (Admin Only) ────────────────────────────────────────
router.post('/:id/mark-paid', authorize('admin'), validate(markAsPaidSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = req.params.id as string;
    const tenantId = req.user!.tenantId;
    const { paymentMethod } = req.body;

    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)),
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.status === 'cancelled') {
      res.status(400).json({ error: 'Cannot record payment for a cancelled order' });
      return;
    }

    const existingPayments = await db.select().from(payments).where(eq(payments.orderId, orderId));
    const totalAmount = parseFloat(order.totalAmount);
    const totalPaid = existingPayments.reduce((sum, p) => sum + parseFloat(p.amountPaid), 0);
    const remaining = totalAmount - totalPaid;

    if (remaining <= 0) {
      res.status(400).json({ error: 'Order is already fully paid' });
      return;
    }

    const paymentId = uuidv4();
    let updatedOrder: any;

    await db.transaction(async (tx) => {
      await tx.insert(payments).values({
        id: paymentId,
        tenantId,
        orderId,
        amountPaid: String(remaining),
        paymentMethod,
        notes: 'Marked as fully paid via quick action',
      });

      await tx.update(orders).set({ paymentStatus: 'paid' }).where(eq(orders.id, orderId));

      updatedOrder = await tx.query.orders.findFirst({ where: eq(orders.id, orderId) });
    });

    res.status(201).json(updatedOrder);
  } catch (error) {
    console.error('Error marking order paid:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Update Order Status (Admin Only) ──────────────────────────────────
router.patch('/:id/status', authorize('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = req.params.id as string;
    const tenantId = req.user!.tenantId;
    const { status } = req.body;

    const allowedStatuses = ['pending_approval', 'confirmed', 'cancelled', 'dispatched', 'delivered'];
    if (!status || !allowedStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status value' });
      return;
    }

    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)),
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.status === status) {
      res.status(400).json({ error: `Order is already in ${status} status` });
      return;
    }

    await db.update(orders).set({ status: status as any }).where(eq(orders.id, orderId));

    if (order.salesmanId) {
      const shop = await db.query.shops.findFirst({ where: eq(shops.id, order.shopId) });
      const shopName = shop ? shop.name : 'Outlet';

      let notifTitle = 'Order Status Updated';
      let notifMessage = `Order for ${shopName} status has been updated to ${status}.`;

      if (status === 'confirmed') {
        notifTitle = 'Order Approved';
        notifMessage = `Your order for ${shopName} has been approved by admin.`;
      } else if (status === 'dispatched') {
        notifTitle = 'Order Dispatched';
        notifMessage = `Order #${order.id.substring(0, 8)} for ${shopName} has been dispatched.`;
      } else if (status === 'delivered') {
        notifTitle = 'Order Delivered';
        notifMessage = `Order #${order.id.substring(0, 8)} for ${shopName} has been delivered.`;
      } else if (status === 'cancelled') {
        notifTitle = 'Order Cancelled';
        notifMessage = `Order for ${shopName} has been cancelled by admin.`;
      }

      await notifyUser(tenantId, order.salesmanId, notifTitle, notifMessage, 'order_status', orderId);
    }

    const updatedOrder = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    res.json({ message: 'Order status updated successfully', order: updatedOrder });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

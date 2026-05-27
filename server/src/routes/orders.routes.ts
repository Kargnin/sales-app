import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, desc, asc, ne, sql } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { orders, orderItems, products, shops, users, payments, notifications } from '../db/schema.js';
import { createOrderSchema, createPaymentSchema, markAsPaidSchema } from '@sales-app/shared';
import { authenticate, authorize, tenantScope, rateLimiter } from '../middleware/index.js';

const router = Router();

const publicOrderLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  message: 'Too many requests from this IP to public order portal, please try again later.',
});

// ─── Public routes (unauthenticated, defined BEFORE middleware) ──────

// ─── Public digital invoice ──────────────────────────────
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

    const shop = await db.query.shops.findFirst({
      where: eq(shops.id, order.shopId),
    });

    const items = await db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        productName: products.name,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        subtotal: orderItems.subtotal,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, order.id));

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

// ─── Public Order Cancellation ──────────────────────────
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
      .where(
        and(
          eq(orders.id, order.id),
          ne(orders.status, 'cancelled'),
          ne(orders.status, 'dispatched'),
          ne(orders.status, 'delivered')
        )
      );

    const affectedRows = (result as any)?.affectedRows ?? 0;

    if (affectedRows === 0) {
      // Fetch latest order state to see why it was not updated
      const latestOrder = await db.query.orders.findFirst({
        where: eq(orders.id, order.id),
      });
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

    // Fetch shop name to build a descriptive notification message
    const shop = await db.query.shops.findFirst({
      where: eq(shops.id, order.shopId),
    });
    const shopName = shop ? shop.name : 'Outlet';

    // Notify the salesman and admins
    const notificationsToInsert = [];
    if (order.salesmanId) {
      notificationsToInsert.push({
        id: uuidv4(),
        tenantId: order.tenantId,
        userId: order.salesmanId,
        title: 'Order Cancelled by Customer',
        message: `Order for ${shopName} has been cancelled by the customer.`,
        type: 'order_status' as const,
        relatedEntityId: order.id,
      });
    }

    const admins = await db.select().from(users).where(
      and(
        eq(users.tenantId, order.tenantId),
        eq(users.role, 'admin')
      )
    );
    for (const admin of admins) {
      notificationsToInsert.push({
        id: uuidv4(),
        tenantId: order.tenantId,
        userId: admin.id,
        title: 'Order Cancelled by Customer',
        message: `Order for ${shopName} has been cancelled by the customer.`,
        type: 'order_status' as const,
        relatedEntityId: order.id,
      });
    }

    if (notificationsToInsert.length > 0) {
      await db.insert(notifications).values(notificationsToInsert);
    }

    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Apply auth & tenant middleware globally to subsequent routes
router.use(authenticate, tenantScope);

// ─── Get Scoped Tenant Products Catalog ──────────────────────────────
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

    const pageParam = req.query.page;
    const limitParam = req.query.limit;
    const shopIdQuery = req.query.shopId;
    const filterShopQuery = req.query.filter_shop;
    const statusQuery = req.query.status;
    const sortQuery = req.query.sort;

    let baseWhere = role === 'admin'
      ? eq(orders.tenantId, tenantId)
      : and(eq(orders.tenantId, tenantId), eq(orders.salesmanId, userId));

    if (shopIdQuery) {
      baseWhere = and(baseWhere, eq(orders.shopId, shopIdQuery as string));
    }

    if (filterShopQuery) {
      baseWhere = and(baseWhere, eq(shops.name, filterShopQuery as string));
    }

    if (statusQuery === 'ongoing') {
      baseWhere = and(baseWhere, sql`${orders.status} IN ('pending_approval', 'confirmed', 'dispatched')`);
    } else if (statusQuery === 'delivered') {
      baseWhere = and(baseWhere, eq(orders.status, 'delivered'));
    }

    let orderByClause = desc(orders.createdAt);
    if (sortQuery === 'date_asc') {
      orderByClause = asc(orders.createdAt);
    } else if (sortQuery === 'shop_asc') {
      orderByClause = asc(shops.name);
    } else if (sortQuery === 'shop_desc') {
      orderByClause = desc(shops.name);
    } else if (sortQuery === 'value_asc') {
      orderByClause = asc(sql`CAST(${orders.totalAmount} AS DECIMAL(10,2))`);
    } else if (sortQuery === 'value_desc') {
      orderByClause = desc(sql`CAST(${orders.totalAmount} AS DECIMAL(10,2))`);
    }

    let adminQuery = db
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
      .leftJoin(users, eq(orders.salesmanId, users.id));

    let salesmanQuery = db
      .select({
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
      })
      .from(orders)
      .innerJoin(shops, eq(orders.shopId, shops.id));

    if (pageParam !== undefined) {
      const page = parseInt(pageParam as string, 10) || 1;
      const limit = parseInt(limitParam as string, 10) || 10;
      const offset = (page - 1) * limit;

      let paginatedOrders;
      if (role === 'admin') {
        paginatedOrders = await adminQuery
          .where(baseWhere)
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset);
      } else {
        paginatedOrders = await salesmanQuery
          .where(baseWhere)
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset);
      }

      // Count query
      const countResult = await db
        .select({ value: sql<number>`count(*)` })
        .from(orders)
        .innerJoin(shops, eq(orders.shopId, shops.id))
        .where(baseWhere);

      const totalCount = Number(countResult[0]?.value || 0);
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        orders: paginatedOrders,
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          limit,
        },
      });
    } else {
      let allOrders;
      if (role === 'admin') {
        allOrders = await adminQuery
          .where(baseWhere)
          .orderBy(orderByClause);
      } else {
        allOrders = await salesmanQuery
          .where(baseWhere)
          .orderBy(orderByClause);
      }
      res.json(allOrders);
    }
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Get Scoped Shop Specific Orders ──────────────────────────────────
router.get('/shop/:shopId', async (req: Request, res: Response): Promise<void> => {
  try {
    const shopId = req.params.shopId as string;
    const tenantId = req.user!.tenantId;

    const targetShop = await db.query.shops.findFirst({
      where: and(eq(shops.id, shopId), eq(shops.tenantId, tenantId)),
    });

    if (!targetShop) {
      res.status(404).json({ error: 'Shop not found' });
      return;
    }

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
      .where(and(eq(orders.tenantId, tenantId), eq(orders.shopId, shopId)))
      .orderBy(desc(orders.createdAt));

    res.json(shopOrders);
  } catch (error) {
    console.error('Error fetching shop orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Get Single Scoped Order Details ──────────────────────────────────
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

    // Self-healing: generate cancellation token on query if missing
    if (!order.cancellationToken) {
      const generatedToken = uuidv4();
      const expiresAt = new Date(new Date(order.createdAt).getTime() + 24 * 60 * 60 * 1000);
      await db.update(orders)
        .set({ 
          cancellationToken: generatedToken,
          cancellationWindowExpiresAt: expiresAt 
        })
        .where(eq(orders.id, order.id));
      order.cancellationToken = generatedToken;
      order.cancellationWindowExpiresAt = expiresAt;
    }

    if (role !== 'admin' && order.salesmanId !== userId) {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      return;
    }

    const shop = await db.query.shops.findFirst({
      where: eq(shops.id, order.shopId),
    });

    const items = await db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        productName: products.name,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        subtotal: orderItems.subtotal,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, order.id));

    const orderPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, order.id));

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

// ─── Place a Real Order ───────────────────────────────────────────────
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = createOrderSchema.safeParse(req.body);
    if (!validated.success) {
      res.status(400).json({ error: 'Validation failed', details: validated.error.format() });
      return;
    }

    const { shopId, items, source } = validated.data;
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
        res.status(400).json({ error: `Product with ID ${item.productId} not found.` });
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

      const admins = await tx.select().from(users).where(and(eq(users.tenantId, tenantId), eq(users.role, 'admin')));
      const notificationValues = admins.map(a => ({
        id: uuidv4(),
        tenantId,
        userId: a.id,
        title: 'New Order Received',
        message: `Order for ₹${calculatedTotal.toFixed(2)} placed for ${targetShop.name}.`,
        type: 'new_order' as const,
        relatedEntityId: orderId
      }));
      if (notificationValues.length > 0) {
        await tx.insert(notifications).values(notificationValues);
      }
    });

    const newOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Record Payment Collection (Admin Only) ───────────────────────────
router.post('/:id/payments', authorize('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = req.params.id as string;
    const tenantId = req.user!.tenantId;

    const validated = createPaymentSchema.safeParse({
      orderId,
      ...req.body,
    });
    if (!validated.success) {
      res.status(400).json({ error: 'Validation failed', details: validated.error.format() });
      return;
    }

    const { amountPaid, paymentMethod, notes } = validated.data;

    // Verify order in tenant scope
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

    // Fetch existing payments
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
      // Insert payment record
      await tx.insert(payments).values({
        id: paymentId,
        tenantId,
        orderId,
        amountPaid: String(amountPaid),
        paymentMethod,
        notes: notes || null,
      });

      // Update payment status
      const totalPaidAfter = totalPaidBefore + amountPaid;
      let newPaymentStatus: 'unpaid' | 'partially_paid' | 'paid' = 'unpaid';

      if (totalPaidAfter >= totalAmount - 0.001) {
        newPaymentStatus = 'paid';
      } else if (totalPaidAfter > 0) {
        newPaymentStatus = 'partially_paid';
      }

      await tx.update(orders)
        .set({ paymentStatus: newPaymentStatus })
        .where(eq(orders.id, orderId));

      updatedOrder = await tx.query.orders.findFirst({
        where: eq(orders.id, orderId),
      });
    });

    res.status(201).json(updatedOrder);
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Mark as Paid (Admin Only) ────────────────────────────────────────
router.post('/:id/mark-paid', authorize('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = req.params.id as string;
    const tenantId = req.user!.tenantId;

    const validated = markAsPaidSchema.safeParse(req.body);
    if (!validated.success) {
      res.status(400).json({ error: 'Validation failed', details: validated.error.format() });
      return;
    }

    const { paymentMethod } = validated.data;

    // Verify order in tenant scope
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

    // Fetch existing payments
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
      // Insert full payment record
      await tx.insert(payments).values({
        id: paymentId,
        tenantId,
        orderId,
        amountPaid: String(remaining),
        paymentMethod,
        notes: 'Marked as fully paid via quick action',
      });

      await tx.update(orders)
        .set({ paymentStatus: 'paid' })
        .where(eq(orders.id, orderId));

      updatedOrder = await tx.query.orders.findFirst({
        where: eq(orders.id, orderId),
      });
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

    // Verify order in tenant scope
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

    // Update status
    await db.update(orders)
      .set({ status: status as any })
      .where(eq(orders.id, orderId));

    // Get the shop details to include the shop's name in the notification message
    const shop = await db.query.shops.findFirst({
      where: eq(shops.id, order.shopId),
    });
    const shopName = shop ? shop.name : 'Outlet';

    // Broadcast a notification to the salesman who placed this order
    if (order.salesmanId) {
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

      await db.insert(notifications).values({
        id: uuidv4(),
        tenantId,
        userId: order.salesmanId,
        title: notifTitle,
        message: notifMessage,
        type: 'order_status',
        relatedEntityId: orderId,
      });
    }

    const updatedOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    res.json({ message: 'Order status updated successfully', order: updatedOrder });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

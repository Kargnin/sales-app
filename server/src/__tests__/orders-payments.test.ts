import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection.js';
import { orders, orderItems, products, shops, users, payments } from '../db/schema.js';
import { eq } from 'drizzle-orm';

describe('Orders, Public Invoice & Payments Integration Tests (Phase 4)', () => {
  let adminToken: string;
  let adminTenantId: string;
  let otherAdminToken: string;
  let otherTenantId: string;
  let salesmanToken: string;
  let salesmanUserId: string;

  let approvedShopId: string;
  let pendingShopId: string;
  let rejectedShopId: string;
  let otherTenantShopId: string;

  let testProduct1Id: string;
  let testProduct2Id: string;
  let otherTenantProductId: string;

  const adminUsername = `admin_${uuidv4().substring(0, 8)}`;
  const otherAdminUsername = `admin_other_${uuidv4().substring(0, 8)}`;
  const salesmanUsername = `sales_${uuidv4().substring(0, 8)}`;

  beforeAll(async () => {
    // 1. Register main tenant (Admin)
    const registerRes = await request(app)
      .post('/auth/register')
      .send({
        businessName: 'SoapFactory Inc',
        username: adminUsername,
        password: 'password123',
        email: 'admin@soapfactory.com',
        phone: '9876543210',
      });

    adminToken = registerRes.body.accessToken;
    adminTenantId = registerRes.body.user.tenantId;

    // 2. Register another tenant (Admin) for tenant-scoping tests
    const otherRegisterRes = await request(app)
      .post('/auth/register')
      .send({
        businessName: 'OtherSoap Inc',
        username: otherAdminUsername,
        password: 'password123',
        email: 'admin@othersoap.com',
        phone: '9876543211',
      });

    otherAdminToken = otherRegisterRes.body.accessToken;
    otherTenantId = otherRegisterRes.body.user.tenantId;

    // 3. Create salesman under main tenant
    const salesmanRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: salesmanUsername,
        password: 'salesmanpassword123',
        role: 'salesman',
      });
    salesmanUserId = salesmanRes.body.id;

    // Login salesman to get token
    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        username: salesmanUsername,
        password: 'salesmanpassword123',
      });
    salesmanToken = loginRes.body.accessToken;

    // 4. Create shops in main tenant
    // Approved Shop
    const approvedShopRes = await request(app)
      .post('/api/shops')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Approved Main Shop',
        ownerName: 'Alice Green',
        phone: '9999911111',
        address: '100 Green Ave',
        latitude: 19.0760,
        longitude: 72.8777,
      });
    approvedShopId = approvedShopRes.body.id;

    // Pending Shop
    const pendingShopRes = await request(app)
      .post('/api/shops')
      .set('Authorization', `Bearer ${salesmanToken}`)
      .send({
        name: 'Pending Salesman Shop',
        ownerName: 'Bob Yellow',
        phone: '9999922222',
        address: '200 Yellow St',
        latitude: 19.0800,
        longitude: 72.8800,
      });
    pendingShopId = pendingShopRes.body.id;

    // Rejected Shop
    const rejectedShopRes = await request(app)
      .post('/api/shops')
      .set('Authorization', `Bearer ${salesmanToken}`)
      .send({
        name: 'Rejected Salesman Shop',
        ownerName: 'Charlie Red',
        phone: '9999933333',
        address: '300 Red Rd',
        latitude: 19.0900,
        longitude: 72.8900,
      });
    rejectedShopId = rejectedShopRes.body.id;
    await request(app)
      .patch(`/api/shops/${rejectedShopId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`);

    // 5. Create shop in other tenant
    const otherShopRes = await request(app)
      .post('/api/shops')
      .set('Authorization', `Bearer ${otherAdminToken}`)
      .send({
        name: 'Other Tenant Shop',
        ownerName: 'Oliver Brown',
        phone: '9999944444',
        address: '400 Brown Rd',
        latitude: 19.1000,
        longitude: 72.9000,
      });
    otherTenantShopId = otherShopRes.body.id;

    // 6. Seed products in main tenant directly in DB
    testProduct1Id = uuidv4();
    await db.insert(products).values({
      id: testProduct1Id,
      tenantId: adminTenantId,
      name: 'Organic Soap Bar',
      sku: 'SOAP-ORG-01',
      price: '25.00',
      stockQuantity: 200,
    });

    testProduct2Id = uuidv4();
    await db.insert(products).values({
      id: testProduct2Id,
      tenantId: adminTenantId,
      name: 'Premium Body Wash',
      sku: 'WASH-PRM-02',
      price: '50.00',
      stockQuantity: 100,
    });

    // Seed product in other tenant
    otherTenantProductId = uuidv4();
    await db.insert(products).values({
      id: otherTenantProductId,
      tenantId: otherTenantId,
      name: 'Other Tenant Soap',
      sku: 'SOAP-OTH-99',
      price: '30.00',
      stockQuantity: 50,
    });
  });

  // ─── 1. Order Placement Edge Cases ──────────────────────────────────
  describe('Order Placement Edge Cases', () => {
    it('1. rejects order for non-existent shop', async () => {
      const badShopId = uuidv4();
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: badShopId,
          items: [{ productId: testProduct1Id, quantity: 2, unitPrice: 25.00 }],
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Shop not found');
    });

    it('2. rejects order for rejected shop', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: rejectedShopId,
          items: [{ productId: testProduct1Id, quantity: 2, unitPrice: 25.00 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Cannot place order for a rejected shop.');
    });

    it('3. places order for pending_approval shop with pending_approval order status', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: pendingShopId,
          items: [{ productId: testProduct1Id, quantity: 2, unitPrice: 25.00 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('pending_approval');
      expect(res.body.cancellationToken).toBeDefined();
      expect(res.body.cancellationWindowExpiresAt).toBeDefined();
    });

    it('4. places order for approved shop with confirmed order status', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: approvedShopId,
          items: [{ productId: testProduct1Id, quantity: 3, unitPrice: 25.00 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('confirmed');
      expect(res.body.cancellationToken).toBeDefined();
      expect(res.body.cancellationWindowExpiresAt).toBeDefined();
    });

    it('5. rejects order with empty items array', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: approvedShopId,
          items: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('6. rejects order with non-existent productId', async () => {
      const badProductId = uuidv4();
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: approvedShopId,
          items: [{ productId: badProductId, quantity: 2, unitPrice: 25.00 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Product with ID');
    });

    it('7. rejects order with zero quantity', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: approvedShopId,
          items: [{ productId: testProduct1Id, quantity: 0, unitPrice: 25.00 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('8. rejects order with negative quantity', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: approvedShopId,
          items: [{ productId: testProduct1Id, quantity: -5, unitPrice: 25.00 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('9. prevents salesman from placing order for shop in different tenant', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: otherTenantShopId,
          items: [{ productId: testProduct1Id, quantity: 2, unitPrice: 25.00 }],
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Shop not found');
    });

    it('10. rejects unauthenticated order placement', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          shopId: approvedShopId,
          items: [{ productId: testProduct1Id, quantity: 2, unitPrice: 25.00 }],
        });

      expect(res.status).toBe(401);
    });

    it('11. places order with multiple valid items and correct totalAmount calculation', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: approvedShopId,
          items: [
            { productId: testProduct1Id, quantity: 2, unitPrice: 25.00 }, // 50.00
            { productId: testProduct2Id, quantity: 3, unitPrice: 50.00 }, // 150.00
          ],
        });

      expect(res.status).toBe(201);
      expect(parseFloat(res.body.totalAmount)).toBe(200.00);
    });
  });

  // ─── 2. Public Invoice Retrieval Edge Cases ─────────────────────────
  describe('Public Invoice Retrieval Edge Cases', () => {
    let validToken: string;
    let orderId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: approvedShopId,
          items: [{ productId: testProduct1Id, quantity: 4, unitPrice: 25.00 }], // 100.00
        });
      validToken = res.body.cancellationToken;
      orderId = res.body.id;
    });

    it('1. retrieves full invoice details with valid token', async () => {
      const res = await request(app)
        .get(`/api/orders/public/${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(orderId);
      expect(res.body.shopName).toBe('Approved Main Shop');
      expect(res.body.items).toBeDefined();
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].productName).toBe('Organic Soap Bar');
    });

    it('2. returns 404 for non-existent token', async () => {
      const badToken = uuidv4();
      const res = await request(app)
        .get(`/api/orders/public/${badToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Order not found');
    });

    it('3. retrieves invoice even for a cancelled order', async () => {
      // Direct cancellation in DB or cancel route. Let's do cancellation via DB or public endpoint.
      // We will test cancel route below, so let's cancel via direct DB update to keep tests decoupled.
      await db.update(orders).set({ status: 'cancelled' }).where(eq(orders.id, orderId));

      const res = await request(app)
        .get(`/api/orders/public/${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
    });

    it('4. returns 404/400 for empty token', async () => {
      const res = await request(app)
        .get('/api/orders/public/ '); // single space to bypass empty path router match

      expect(res.status).toBe(404);
    });
  });

  // ─── 3. Public Cancellation Edge Cases ──────────────────────────────
  describe('Public Cancellation Edge Cases', () => {
    it('1. cancels order within 15-minute window successfully', async () => {
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: approvedShopId,
          items: [{ productId: testProduct1Id, quantity: 2, unitPrice: 25.00 }],
        });

      const token = orderRes.body.cancellationToken;

      const cancelRes = await request(app)
        .post('/api/orders/public/cancel')
        .send({ token });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.message).toBe('Order cancelled successfully');

      // Verify DB status
      const updatedOrder = await db.query.orders.findFirst({
        where: eq(orders.id, orderRes.body.id),
      });
      expect(updatedOrder?.status).toBe('cancelled');
    });

    it('2. rejects cancellation after 15-minute window expires', async () => {
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: approvedShopId,
          items: [{ productId: testProduct1Id, quantity: 2, unitPrice: 25.00 }],
        });

      // Manually backdate cancellation window expiry in DB
      await db.update(orders)
        .set({ cancellationWindowExpiresAt: new Date(Date.now() - 1000) })
        .where(eq(orders.id, orderRes.body.id));

      const cancelRes = await request(app)
        .post('/api/orders/public/cancel')
        .send({ token: orderRes.body.cancellationToken });

      expect(cancelRes.status).toBe(400);
      expect(cancelRes.body.error).toBe('Cancellation window has expired');
    });

    it('3. rejects cancellation for already cancelled order', async () => {
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: approvedShopId,
          items: [{ productId: testProduct1Id, quantity: 2, unitPrice: 25.00 }],
        });

      // Cancel once
      await request(app)
        .post('/api/orders/public/cancel')
        .send({ token: orderRes.body.cancellationToken });

      // Cancel twice
      const cancelRes2 = await request(app)
        .post('/api/orders/public/cancel')
        .send({ token: orderRes.body.cancellationToken });

      expect(cancelRes2.status).toBe(400);
      expect(cancelRes2.body.error).toBe('Order is already cancelled');
    });

    it('4. rejects cancellation for dispatched order', async () => {
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: approvedShopId,
          items: [{ productId: testProduct1Id, quantity: 2, unitPrice: 25.00 }],
        });

      // Update to dispatched
      await db.update(orders).set({ status: 'dispatched' }).where(eq(orders.id, orderRes.body.id));

      const cancelRes = await request(app)
        .post('/api/orders/public/cancel')
        .send({ token: orderRes.body.cancellationToken });

      expect(cancelRes.status).toBe(400);
      expect(cancelRes.body.error).toBe('Cannot cancel a dispatched order');
    });

    it('5. rejects cancellation for delivered order', async () => {
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: approvedShopId,
          items: [{ productId: testProduct1Id, quantity: 2, unitPrice: 25.00 }],
        });

      // Update to delivered
      await db.update(orders).set({ status: 'delivered' }).where(eq(orders.id, orderRes.body.id));

      const cancelRes = await request(app)
        .post('/api/orders/public/cancel')
        .send({ token: orderRes.body.cancellationToken });

      expect(cancelRes.status).toBe(400);
      expect(cancelRes.body.error).toBe('Cannot cancel a delivered order');
    });

    it('6. rejects cancellation with invalid/non-existent token', async () => {
      const badToken = uuidv4();
      const cancelRes = await request(app)
        .post('/api/orders/public/cancel')
        .send({ token: badToken });

      expect(cancelRes.status).toBe(404);
      expect(cancelRes.body.error).toBe('Order not found');
    });

    it('7. double cancellation race-condition safety', async () => {
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: approvedShopId,
          items: [{ productId: testProduct1Id, quantity: 2, unitPrice: 25.00 }],
        });

      // Send parallel cancellation requests
      const [res1, res2] = await Promise.all([
        request(app).post('/api/orders/public/cancel').send({ token: orderRes.body.cancellationToken }),
        request(app).post('/api/orders/public/cancel').send({ token: orderRes.body.cancellationToken }),
      ]);

      const codes = [res1.status, res2.status];
      expect(codes).toContain(200);
      expect(codes).toContain(400); // One must succeed and one must fail
    });
  });

  // ─── 4. Payment Recording Edge Cases ────────────────────────────────
  describe('Payment Recording Edge Cases', () => {
    let orderId: string;
    let otherOrderId: string;

    beforeEach(async () => {
      // Re-create a clean unpaid order for each test to keep calculations simple and isolated
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: approvedShopId,
          items: [{ productId: testProduct1Id, quantity: 4, unitPrice: 25.00 }], // Total: 100.00
        });
      orderId = res.body.id;

      // Re-create a clean order in other tenant
      const otherRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${otherAdminToken}`)
        .send({
          shopId: otherTenantShopId,
          items: [{ productId: otherTenantProductId, quantity: 2, unitPrice: 30.00 }], // Total: 60.00
        });
      otherOrderId = otherRes.body.id;
    });

    it('1. records full payment for unpaid order successfully', async () => {
      const res = await request(app)
        .post(`/api/orders/${orderId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amountPaid: 100.00,
          paymentMethod: 'upi',
          notes: 'Full payment cleared',
        });

      expect(res.status).toBe(201);
      expect(res.body.paymentStatus).toBe('paid');

      // Verify database payment records
      const paymentRecords = await db.select().from(payments).where(eq(payments.orderId, orderId));
      expect(paymentRecords.length).toBe(1);
      expect(parseFloat(paymentRecords[0].amountPaid)).toBe(100.00);
    });

    it('2. records partial payment', async () => {
      const res = await request(app)
        .post(`/api/orders/${orderId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amountPaid: 40.00,
          paymentMethod: 'cash',
          notes: 'First installment',
        });

      expect(res.status).toBe(201);
      expect(res.body.paymentStatus).toBe('partially_paid');

      const updatedOrder = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
      });
      expect(updatedOrder?.paymentStatus).toBe('partially_paid');
    });

    it('3. records second partial payment completing balance', async () => {
      // Record 40.00 first
      await request(app)
        .post(`/api/orders/${orderId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amountPaid: 40.00, paymentMethod: 'cash' });

      // Record 60.00 to complete
      const res = await request(app)
        .post(`/api/orders/${orderId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amountPaid: 60.00, paymentMethod: 'bank_transfer' });

      expect(res.status).toBe(201);
      expect(res.body.paymentStatus).toBe('paid');

      const updatedOrder = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
      });
      expect(updatedOrder?.paymentStatus).toBe('paid');
    });

    it('4. rejects payment exceeding remaining balance', async () => {
      // Record 40.00
      await request(app)
        .post(`/api/orders/${orderId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amountPaid: 40.00, paymentMethod: 'cash' });

      // Record 70.00 (exceeds remaining 60.00)
      const res = await request(app)
        .post(`/api/orders/${orderId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amountPaid: 70.00, paymentMethod: 'upi' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Payment exceeds remaining balance');
    });

    it('5. rejects payment for already fully paid order', async () => {
      // Full payment
      await request(app)
        .post(`/api/orders/${orderId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amountPaid: 100.00, paymentMethod: 'upi' });

      // Additional payment
      const res = await request(app)
        .post(`/api/orders/${orderId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amountPaid: 10.00, paymentMethod: 'cash' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Order is already fully paid');
    });

    it('6. returns 404 for recording payment for non-existent order', async () => {
      const badOrderId = uuidv4();
      const res = await request(app)
        .post(`/api/orders/${badOrderId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amountPaid: 20.00, paymentMethod: 'cash' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Order not found');
    });

    it('7. rejects payment for cancelled order', async () => {
      // Cancel first
      await db.update(orders).set({ status: 'cancelled' }).where(eq(orders.id, orderId));

      const res = await request(app)
        .post(`/api/orders/${orderId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amountPaid: 50.00, paymentMethod: 'cash' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Cannot record payment for a cancelled order');
    });

    it('8. prevents salesman from recording payment', async () => {
      const res = await request(app)
        .post(`/api/orders/${orderId}/payments`)
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({ amountPaid: 50.00, paymentMethod: 'cash' });

      expect(res.status).toBe(403);
    });

    it('9. prevents recording payment for order belonging to another tenant', async () => {
      // Main tenant admin attempts to record payment on other tenant's order
      const res = await request(app)
        .post(`/api/orders/${otherOrderId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amountPaid: 30.00, paymentMethod: 'upi' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Order not found');
    });

    it('10. performs "Mark as Paid" quick action successfully', async () => {
      // Partially pay first
      await request(app)
        .post(`/api/orders/${orderId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amountPaid: 35.00, paymentMethod: 'cash' });

      // Mark as paid quick action
      const res = await request(app)
        .post(`/api/orders/${orderId}/mark-paid`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ paymentMethod: 'bank_transfer' });

      expect(res.status).toBe(201);
      expect(res.body.paymentStatus).toBe('paid');

      // Verify payments sum
      const paymentRecords = await db.select().from(payments).where(eq(payments.orderId, orderId));
      expect(paymentRecords.length).toBe(2);
      
      const totalPaid = paymentRecords.reduce((sum, p) => sum + parseFloat(p.amountPaid), 0);
      expect(totalPaid).toBe(100.00);
    });

    it('11. rejects payment with zero amount', async () => {
      const res = await request(app)
        .post(`/api/orders/${orderId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amountPaid: 0, paymentMethod: 'cash' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('12. rejects payment with negative amount', async () => {
      const res = await request(app)
        .post(`/api/orders/${orderId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amountPaid: -20.00, paymentMethod: 'cash' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });
});

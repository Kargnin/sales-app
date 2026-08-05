import { describe, it, expect, beforeAll } from 'vitest';
import { describeIfDb } from './helpers/dbAvailable.js';
import request from 'supertest';
import { app } from '../app.js';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection.js';
import { orders, products, shops } from '../db/schema.js';
import { eq } from 'drizzle-orm';

describeIfDb('Shops & GPS Visits Integration', () => {
  let adminToken: string;
  let salesmanToken: string;
  let adminTenantId: string;

  let approvedShopId: string;
  let pendingShopId: string;

  const adminUsername = `admin_${uuidv4().substring(0, 8)}`;
  const salesmanUsername = `sales_${uuidv4().substring(0, 8)}`;

  beforeAll(async () => {
    // 1. Register a tenant with an admin
    const registerRes = await request(app).post('/auth/register').send({
      businessName: 'Haversine Logistics',
      username: adminUsername,
      password: 'password123',
      email: 'admin_test@haversine.com',
      phone: '9876543210',
    });

    adminToken = registerRes.body.accessToken;
    adminTenantId = registerRes.body.user.tenantId;

    // 2. Register a salesman under the same tenant
    const salesmanRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: salesmanUsername,
        password: 'password12345',
        role: 'salesman',
      });

    // 3. Login as salesman to get token
    const loginRes = await request(app).post('/auth/login').send({
      username: salesmanUsername,
      password: 'password12345',
    });

    salesmanToken = loginRes.body.accessToken;
  });

  describe('1. Shop Registration and Approval Workflows', () => {
    it('allows admin to create a shop defaulting to approved', async () => {
      const res = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Main Street Store',
          ownerName: 'Alice Smith',
          phone: '9999988888',
          address: '123 Main Street',
          imageUrl: 'https://example.com/shop-photo.jpg',
          latitude: 19.076,
          longitude: 72.8777,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('approved');
      expect(res.body.imageUrl).toBe('https://example.com/shop-photo.jpg');
      expect(res.body.id).toBeDefined();
      approvedShopId = res.body.id;
    });

    it('allows salesman to create a shop defaulting to pending_approval', async () => {
      const res = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          name: 'Subway Outlet',
          ownerName: 'Bob Jones',
          phone: '8888877777',
          address: '456 Side Street',
          latitude: 19.08,
          longitude: 72.88,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('pending_approval');
      pendingShopId = res.body.id;
    });

    it('allows salesman to query the shops', async () => {
      const res = await request(app)
        .get('/api/shops')
        .set('Authorization', `Bearer ${salesmanToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('prevents salesman from approving a shop', async () => {
      const res = await request(app)
        .patch(`/api/shops/${pendingShopId}/approve`)
        .set('Authorization', `Bearer ${salesmanToken}`);

      expect(res.status).toBe(403);
    });

    it('allows admin to approve a pending shop', async () => {
      const approveRes = await request(app)
        .patch(`/api/shops/${pendingShopId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(approveRes.status).toBe(200);

      // Verify the shop is now approved
      const listRes = await request(app)
        .get('/api/shops')
        .set('Authorization', `Bearer ${adminToken}`);

      const approvedShop = listRes.body.find(
        (s: any) => s.id === pendingShopId,
      );
      expect(approvedShop.status).toBe('approved');
    });

    it('allows admin to reject a shop', async () => {
      const rejectRes = await request(app)
        .patch(`/api/shops/${pendingShopId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(rejectRes.status).toBe(200);

      // Verify the shop is now rejected
      const listRes = await request(app)
        .get('/api/shops')
        .set('Authorization', `Bearer ${adminToken}`);

      const rejectedShop = listRes.body.find(
        (s: any) => s.id === pendingShopId,
      );
      expect(rejectedShop.status).toBe('rejected');
    });
  });

  describe('2. GPS Visit Tracker Workflows', () => {
    it('sets gpsVerified = true if within 200m proximity tolerance', async () => {
      // Approved shop coordinates: (19.0760, 72.8777)
      // Check-in coordinates: (19.0761, 72.8778) (~15m distance)
      const res = await request(app)
        .post('/api/visits')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: approvedShopId,
          latitude: 19.0761,
          longitude: 72.8778,
          notes: 'Successful near check-in',
        });

      expect(res.status).toBe(201);
      expect(res.body.gpsVerified).toBe(true);
    });

    it('sets gpsVerified = false if outside 200m proximity tolerance', async () => {
      // Approved shop coordinates: (19.0760, 72.8777)
      // Check-in coordinates: (19.0800, 72.8900) (~1.3km distance)
      const res = await request(app)
        .post('/api/visits')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: approvedShopId,
          latitude: 19.08,
          longitude: 72.89,
          notes: 'Spoofed check-in from afar',
        });

      expect(res.status).toBe(201);
      expect(res.body.gpsVerified).toBe(false);
    });

    it('scopes visits so salesman sees only their own while admin sees all', async () => {
      // Fetch as salesman
      const salesmanRes = await request(app)
        .get('/api/visits')
        .set('Authorization', `Bearer ${salesmanToken}`);

      expect(salesmanRes.status).toBe(200);
      expect(salesmanRes.body.length).toBe(2);
      expect(salesmanRes.body[0].shopName).toBeDefined();

      // Fetch as admin
      const adminRes = await request(app)
        .get('/api/visits')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.length).toBe(2);
      expect(adminRes.body[0].salesmanName).toBe(salesmanUsername);
      expect(adminRes.body[0].shopName).toBeDefined();
    });
  });

  describe('3. Hardening & Rejection Cascades Workflows', () => {
    let pendingShopId2: string;
    let rejectedShopId: string;
    let testProductId: string;

    beforeAll(async () => {
      // Create another pending shop
      const shopRes = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          name: 'Cascaded Test Shop',
          ownerName: 'Charlie Root',
          phone: '7777766666',
          address: '789 Main Rd',
          latitude: 19.076,
          longitude: 72.8777,
        });
      pendingShopId2 = shopRes.body.id;
      expect(shopRes.status).toBe(201);
      expect(pendingShopId2).toBeDefined();

      // Create a rejected shop
      const rejectShopRes = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          name: 'Rejected Test Shop',
          ownerName: 'Rejected Owner',
          phone: '5555544444',
          address: '444 Main Rd',
          latitude: 19.076,
          longitude: 72.8777,
        });
      rejectedShopId = rejectShopRes.body.id;
      expect(rejectShopRes.status).toBe(201);
      expect(rejectedShopId).toBeDefined();
      const rejectPatchRes = await request(app)
        .patch(`/api/shops/${rejectedShopId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(rejectPatchRes.status).toBe(200);

      // Seed a test product directly in DB for this tenant
      const prodId = uuidv4();
      await db.insert(products).values({
        id: prodId,
        tenantId: adminTenantId,
        name: 'Test Liquid Soap',
        sku: 'TEST-SKU',
        price: '15.00',
        stockQuantity: 100,
      });
      testProductId = prodId;
    });

    it('prevents check-in to a pending_approval shop', async () => {
      const res = await request(app)
        .post('/api/visits')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: pendingShopId2,
          latitude: 19.0761,
          longitude: 72.8778,
          notes: 'Attempt pending check-in',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain(
        'Cannot check in to a shop that is not approved',
      );
    });

    it('prevents check-in to a rejected shop', async () => {
      const res = await request(app)
        .post('/api/visits')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: rejectedShopId,
          latitude: 19.0761,
          longitude: 72.8778,
          notes: 'Attempt rejected check-in',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain(
        'Cannot check in to a shop that is not approved',
      );
    });

    it('allows placing an order for a pending_approval shop', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: pendingShopId2,
          items: [{ productId: testProductId, quantity: 5, unitPrice: 15.0 }],
        });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('pending_approval');
    });

    it('prevents placing an order for a rejected shop', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopId: rejectedShopId,
          items: [{ productId: testProductId, quantity: 5, unitPrice: 15.0 }],
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain(
        'Cannot place order for a rejected shop',
      );
    });

    it('automatically cancels pending/confirmed orders on shop rejection', async () => {
      // Ensure we have a pending order for pendingShopId2
      const orderResBefore = await db
        .select()
        .from(orders)
        .where(eq(orders.shopId, pendingShopId2));
      expect(orderResBefore.length).toBeGreaterThan(0);
      expect(orderResBefore[0].status).toBe('pending_approval');

      // Reject the shop
      const rejectRes = await request(app)
        .patch(`/api/shops/${pendingShopId2}/reject`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.cancelledOrdersCount).toBe(1);

      // Verify the order is cancelled
      const orderResAfter = await db
        .select()
        .from(orders)
        .where(eq(orders.shopId, pendingShopId2));
      expect(orderResAfter[0].status).toBe('cancelled');
    });

    it('blocks shop rejection if dispatched or delivered orders exist', async () => {
      // 1. Create a shop
      const shopRes = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Delivered Order Shop',
          ownerName: 'Deliver Guy',
          phone: '6666655555',
          address: '555 Road',
          latitude: 19.076,
          longitude: 72.8777,
        });
      const newShopId = shopRes.body.id;

      // 2. Place an order for this shop
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          shopId: newShopId,
          items: [{ productId: testProductId, quantity: 2, unitPrice: 15.0 }],
        });
      const orderId = orderRes.body.id;

      // 3. Manually update order to 'delivered' in DB to simulate dispatch/delivery outside cancellation window
      await db
        .update(orders)
        .set({ status: 'delivered' })
        .where(eq(orders.id, orderId));

      // 4. Try to reject the shop
      const rejectRes = await request(app)
        .patch(`/api/shops/${newShopId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(rejectRes.status).toBe(400);
      expect(rejectRes.body.error).toBe('non_cancellable_orders');
      expect(rejectRes.body.orders.length).toBe(1);
      expect(rejectRes.body.orders[0].id).toBe(orderId);
    });

    it('allows admin to edit shop details', async () => {
      const res = await request(app)
        .patch(`/api/shops/${approvedShopId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Shop Name Inc',
          ownerName: 'Super Owner',
          phone: '1234567890',
        });

      expect(res.status).toBe(200);
      expect(res.body.shop.name).toBe('Updated Shop Name Inc');
      expect(res.body.shop.ownerName).toBe('Super Owner');
      expect(res.body.shop.phone).toBe('1234567890');
    });
  });
});

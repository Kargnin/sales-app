import { describe, it, expect, beforeAll } from 'vitest';
import { describeIfDb } from './helpers/dbAvailable.js';
import request from 'supertest';
import { app } from '../index.js';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection.js';
import { orders, products, shops } from '../db/schema.js';
import { eq } from 'drizzle-orm';

describeIfDb('Shops Detail, Edit & Delete Integration Tests', () => {
  let adminToken: string;
  let salesmanToken: string;
  let tenantBAdminToken: string;
  let adminTenantId: string;
  let tenantBId: string;

  let testShopId: string;
  let shopWithOrder: string;
  let testProductId: string;

  const adminUsername = `admin_${uuidv4().substring(0, 8)}`;
  const salesmanUsername = `sales_${uuidv4().substring(0, 8)}`;
  const tenantBAdminUser = `admin_b_${uuidv4().substring(0, 8)}`;

  beforeAll(async () => {
    // 1. Register Tenant A Admin
    const regRes = await request(app).post('/auth/register').send({
      businessName: 'Apex Distribution',
      username: adminUsername,
      password: 'password123',
      email: 'apex_admin@test.com',
      phone: '9991112222',
    });
    adminToken = regRes.body.accessToken;
    adminTenantId = regRes.body.user.tenantId;

    // 2. Create Salesman in Tenant A
    await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: salesmanUsername,
        password: 'password12345',
        role: 'salesman',
      });

    const salesLogin = await request(app).post('/auth/login').send({
      username: salesmanUsername,
      password: 'password12345',
    });
    salesmanToken = salesLogin.body.accessToken;

    // 3. Register Tenant B Admin
    const regBRes = await request(app).post('/auth/register').send({
      businessName: 'Beta Retailers',
      username: tenantBAdminUser,
      password: 'password123',
      email: 'beta_admin@test.com',
      phone: '8881112222',
    });
    tenantBAdminToken = regBRes.body.accessToken;
    tenantBId = regBRes.body.user.tenantId;

    // 4. Create a test shop for Tenant A
    const createShopRes = await request(app)
      .post('/api/shops')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Apex Central Store',
        ownerName: 'John Apex',
        phone: '9876543210',
        address: '100 Apex Boulevard',
        imageUrl: 'https://example.com/apex-store.jpg',
        additionalOwners: [{ name: 'Jane Apex', phone: '9876543211' }],
        latitude: 19.076,
        longitude: 72.8777,
      });
    testShopId = createShopRes.body.id;

    // 5. Seed a product & shop for order deletion safety testing
    const shopOrderRes = await request(app)
      .post('/api/shops')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Shop With Order',
        ownerName: 'Owner Order',
        phone: '9998887777',
        address: '200 Order Street',
        latitude: 19.076,
        longitude: 72.8777,
      });
    shopWithOrder = shopOrderRes.body.id;

    const prodId = uuidv4();
    await db.insert(products).values({
      id: prodId,
      tenantId: adminTenantId,
      name: 'Sample Item',
      sku: 'SAMPLE-1',
      price: '50.00',
      stockQuantity: 100,
    });
    testProductId = prodId;
  });

  describe('1. GET /api/shops/:id (Single Shop Details)', () => {
    it('returns 200 with full shop details for authorized user in same tenant', async () => {
      const res = await request(app)
        .get(`/api/shops/${testShopId}`)
        .set('Authorization', `Bearer ${salesmanToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testShopId);
      expect(res.body.name).toBe('Apex Central Store');
      expect(res.body.ownerName).toBe('John Apex');
      expect(res.body.phone).toBe('9876543210');
      expect(res.body.additionalOwners).toBe(
        JSON.stringify([{ name: 'Jane Apex', phone: '9876543211' }]),
      );
    });

    it('returns 404 when shop does not exist', async () => {
      const fakeId = uuidv4();
      const res = await request(app)
        .get(`/api/shops/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Shop not found');
    });

    it('returns 404 when trying to access a shop belonging to another tenant', async () => {
      const res = await request(app)
        .get(`/api/shops/${testShopId}`)
        .set('Authorization', `Bearer ${tenantBAdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Shop not found');
    });
  });

  describe('2. PATCH /api/shops/:id (Edit Shop Details)', () => {
    it('allows Admin to update shop details including additionalOwners JSON', async () => {
      const res = await request(app)
        .patch(`/api/shops/${testShopId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Apex Super Center',
          ownerName: 'Johnathan Apex',
          additionalOwners: [
            { name: 'Co-Owner 1', phone: '1112223333' },
            { name: 'Co-Owner 2', phone: '4445556666' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.shop.name).toBe('Apex Super Center');
      expect(res.body.shop.ownerName).toBe('Johnathan Apex');
      expect(res.body.shop.additionalOwners).toBe(
        JSON.stringify([
          { name: 'Co-Owner 1', phone: '1112223333' },
          { name: 'Co-Owner 2', phone: '4445556666' },
        ]),
      );
    });

    it('blocks Salesman from editing shop details (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/shops/${testShopId}`)
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          name: 'Unauthorized Rename',
        });

      expect(res.status).toBe(403);
    });

    it('blocks Admin B from editing Tenant A shop (404 Not Found)', async () => {
      const res = await request(app)
        .patch(`/api/shops/${testShopId}`)
        .set('Authorization', `Bearer ${tenantBAdminToken}`)
        .send({
          name: 'Cross-Tenant Rename',
        });

      expect(res.status).toBe(404);
    });
  });

  describe('3. DELETE /api/shops/:id (Delete Shop)', () => {
    it('blocks Salesman from deleting shop (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/shops/${testShopId}`)
        .set('Authorization', `Bearer ${salesmanToken}`);

      expect(res.status).toBe(403);
    });

    it('blocks Admin B from deleting Tenant A shop (404 Not Found)', async () => {
      const res = await request(app)
        .delete(`/api/shops/${testShopId}`)
        .set('Authorization', `Bearer ${tenantBAdminToken}`);

      expect(res.status).toBe(404);
    });

    it('blocks deletion if shop has a dispatched or delivered order (400 Safety Guard)', async () => {
      // 1. Create an order for shopWithOrder
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          shopId: shopWithOrder,
          items: [{ productId: testProductId, quantity: 2, unitPrice: 50.0 }],
        });
      const orderId = orderRes.body.id;

      // 2. Mark order as delivered in DB
      await db
        .update(orders)
        .set({ status: 'delivered' })
        .where(eq(orders.id, orderId));

      // 3. Attempt DELETE /api/shops/:id
      const delRes = await request(app)
        .delete(`/api/shops/${shopWithOrder}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(400);
      expect(delRes.body.error).toBe('non_cancellable_orders');
      expect(delRes.body.orders.length).toBe(1);
    });

    it('allows Admin to delete shop when no non-cancellable orders exist', async () => {
      const res = await request(app)
        .delete(`/api/shops/${testShopId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Shop deleted successfully');
      expect(res.body.id).toBe(testShopId);

      // Verify shop is gone from GET /api/shops/:id
      const getRes = await request(app)
        .get(`/api/shops/${testShopId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(404);
    });
  });
});

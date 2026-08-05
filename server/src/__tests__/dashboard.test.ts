import { describe, it, expect } from 'vitest';
import { describeIfDb } from './helpers/dbAvailable.js';
import request from 'supertest';
import { app } from '../app.js';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection.js';
import { shops, visits, orders } from '../db/schema.js';

describeIfDb('Dashboard Metrics Integration Tests', () => {
  let adminToken: string;
  let adminUser: any;
  let salesmanToken: string;
  let salesmanUser: any;
  let shopId: string;

  const adminUsername = `admin_dash_${uuidv4().substring(0, 8)}`;
  const salesmanUsername = `sales_dash_${uuidv4().substring(0, 8)}`;

  it('1. Setup - Business Registration', async () => {
    const res = await request(app).post('/auth/register').send({
      businessName: 'Metrics Test Shop',
      username: adminUsername,
      password: 'password123',
      email: 'admin_dash@test.com',
    });

    expect(res.status).toBe(201);
    adminToken = res.body.accessToken;
    adminUser = res.body.user;
  });

  it('2. Setup - Create Salesman & Shop', async () => {
    // Create salesman
    const userRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: salesmanUsername,
        password: 'password123',
        role: 'salesman',
      });

    expect(userRes.status).toBe(201);
    salesmanUser = userRes.body;

    // Login as salesman
    const loginRes = await request(app).post('/auth/login').send({
      username: salesmanUsername,
      password: 'password123',
    });
    salesmanToken = loginRes.body.accessToken;

    // Create a shop in the database for visits/orders
    shopId = uuidv4();
    await db.insert(shops).values({
      id: shopId,
      tenantId: adminUser.tenantId,
      name: 'Metrics Grocery Store',
      phone: '1234567890',
      status: 'approved',
      createdByUserId: adminUser.id,
    });
  });

  it('3. Setup - Record Visited & Orders', async () => {
    // Insert a visit by salesman
    await db.insert(visits).values({
      id: uuidv4(),
      tenantId: adminUser.tenantId,
      salesmanId: salesmanUser.id,
      shopId: shopId,
      gpsVerified: true,
    });

    // Insert an order by salesman
    await db.insert(orders).values({
      id: uuidv4(),
      tenantId: adminUser.tenantId,
      shopId: shopId,
      salesmanId: salesmanUser.id,
      orderSource: 'salesman',
      status: 'confirmed',
      totalAmount: '1250.50',
    });

    // Insert an order by admin (representing a WhatsApp or Admin self-order)
    await db.insert(orders).values({
      id: uuidv4(),
      tenantId: adminUser.tenantId,
      shopId: shopId,
      salesmanId: null, // Admin self-order
      orderSource: 'admin_self',
      status: 'confirmed',
      totalAmount: '500.00',
    });
  });

  it('4. GET /api/dashboard/metrics - Admin Scoping', async () => {
    const res = await request(app)
      .get('/api/dashboard/metrics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    // Admin should see both orders: 1250.50 + 500.00 = 1750.50
    expect(res.body.totalRevenue).toBe('1750.50');
    expect(res.body.activeSalesmen).toBe(1);
    expect(res.body.totalVisits).toBe(1);
    expect(res.body.pendingApprovals).toBe(0);
  });

  it('5. GET /api/dashboard/metrics - Salesman Scoping', async () => {
    const res = await request(app)
      .get('/api/dashboard/metrics')
      .set('Authorization', `Bearer ${salesmanToken}`);

    expect(res.status).toBe(200);
    // Salesman should only see their own order: 1250.50
    expect(res.body.totalRevenue).toBe('1250.50');
    expect(res.body.activeSalesmen).toBe(1); // Restricts to 1 for salesmen
    expect(res.body.totalVisits).toBe(1); // Salesman had 1 visit
    expect(res.body.pendingApprovals).toBe(0);
  });

  it('6. GET /api/dashboard/metrics - Unauthorized Fail', async () => {
    const res = await request(app).get('/api/dashboard/metrics');
    expect(res.status).toBe(401);
  });
});

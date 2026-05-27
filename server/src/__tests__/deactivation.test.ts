import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { v4 as uuidv4 } from 'uuid';

describe('Admin Self-Deactivation & Session Check Regression Tests', () => {
  let adminToken: string;
  let adminUser: any;
  let salesmanToken: string;
  let salesmanUser: any;
  let salesmanRefreshToken: string;

  const adminUsername = `admin_${uuidv4().substring(0, 8)}`;
  const salesmanUsername = `sales_${uuidv4().substring(0, 8)}`;

  it('1. Register Admin Business & Retrieve tenantName', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        businessName: 'ApexSoap Inc',
        username: adminUsername,
        password: 'password123',
        email: 'admin_apex@soap.com',
      });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.tenantName).toBe('ApexSoap Inc');

    adminToken = res.body.accessToken;
    adminUser = res.body.user;
  });

  it('2. Create and Login Salesman', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: salesmanUsername,
        password: 'password123',
        role: 'salesman',
      });

    expect(res.status).toBe(201);
    salesmanUser = res.body;

    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        username: salesmanUsername,
        password: 'password123',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.accessToken).toBeDefined();
    expect(loginRes.body.refreshToken).toBeDefined();
    expect(loginRes.body.user.tenantName).toBe('ApexSoap Inc');

    salesmanToken = loginRes.body.accessToken;
    salesmanRefreshToken = loginRes.body.refreshToken;
  });

  it('3. Block Admin Self-Deactivation', async () => {
    // Admin trying to deactivate their own account
    const res = await request(app)
      .patch(`/api/users/${adminUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'inactive' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Administrators cannot deactivate their own accounts');
  });

  it('4. Deactivate Salesman & Block Refresh Token Renewals', async () => {
    // Deactivate salesman from Admin session
    const res = await request(app)
      .patch(`/api/users/${salesmanUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'inactive' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('inactive');

    // Salesman attempts to refresh their token (simulating session renewal after deactivation)
    const refreshRes = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: salesmanRefreshToken });

    expect(refreshRes.status).toBe(401);
    expect(refreshRes.body.error).toBe('User is inactive or no longer exists');
  });
});

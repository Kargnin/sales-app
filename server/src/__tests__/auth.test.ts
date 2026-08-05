import { describe, it, expect, beforeAll } from 'vitest';
import { describeIfDb } from './helpers/dbAvailable.js';
import request from 'supertest';
import { app } from '../app.js';
import { v4 as uuidv4 } from 'uuid';

describeIfDb('Auth, RBAC & Multi-Tenancy Integration', () => {
  let tenantAAdminToken: string;
  let tenantAAdminUser: any;
  let tenantASalesmanToken: string;
  let tenantASalesmanUser: any;

  let tenantBAdminToken: string;
  let tenantBAdminUser: any;

  const tenantAUsername = `admin_a_${uuidv4().substring(0, 8)}`;
  const tenantBUsername = `admin_b_${uuidv4().substring(0, 8)}`;
  const salesmanUsername = `sales_a_${uuidv4().substring(0, 8)}`;
  const tenantAEmail = `admin_a_${uuidv4().substring(0, 8)}@soap.com`;

  it('1. Business Registration - Successful', async () => {
    const res = await request(app).post('/auth/register').send({
      businessName: 'Tenant A Soap Co',
      username: tenantAUsername,
      password: 'password123',
      email: tenantAEmail,
      phone: '9999999991',
    });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe(tenantAUsername);
    expect(res.body.user.role).toBe('admin');
    expect(res.body.user.tenantId).toBeDefined();

    tenantAAdminToken = res.body.accessToken;
    tenantAAdminUser = res.body.user;
  });

  it('2. Business Registration - Fail on duplicate username', async () => {
    const res = await request(app).post('/auth/register').send({
      businessName: 'Another Corp',
      username: tenantAUsername, // Duplicate
      password: 'password123',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Username is already taken');
  });

  it('3. Business Registration - Fail on invalid validation', async () => {
    const res = await request(app).post('/auth/register').send({
      businessName: 'Short',
      username: 'ab', // too short (min 3)
      password: '123', // too short (min 8)
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('4. Login - Successful', async () => {
    const res = await request(app).post('/auth/login').send({
      username: tenantAUsername,
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.username).toBe(tenantAUsername);
  });

  it('4b. Login - Successful with Email', async () => {
    const res = await request(app).post('/auth/login').send({
      username: tenantAEmail,
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.username).toBe(tenantAUsername);
  });

  it('5. Login - Fail on wrong credentials', async () => {
    const res = await request(app).post('/auth/login').send({
      username: tenantAUsername,
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('6. Profile - Successful for authenticated user', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${tenantAAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.username).toBe(tenantAUsername);
    expect(res.body.role).toBe('admin');
    expect(res.body.passwordHash).toBeUndefined(); // Should omit password hash
  });

  it('7. Profile - Fail for unauthenticated user', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });

  it('8. Employee Creation - Admin can create a salesman', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tenantAAdminToken}`)
      .send({
        username: salesmanUsername,
        password: 'password123',
        email: 'salesman@soap.com',
        phone: '8888888888',
        role: 'salesman',
      });

    expect(res.status).toBe(201);
    expect(res.body.username).toBe(salesmanUsername);
    expect(res.body.role).toBe('salesman');
    expect(res.body.tenantId).toBe(tenantAAdminUser.tenantId);

    tenantASalesmanUser = res.body;

    // Login as salesman to get token
    const loginRes = await request(app).post('/auth/login').send({
      username: salesmanUsername,
      password: 'password123',
    });
    tenantASalesmanToken = loginRes.body.accessToken;
  });

  it('9. RBAC Restriction - Salesman cannot create other users', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tenantASalesmanToken}`)
      .send({
        username: 'another_salesman',
        password: 'password123',
        role: 'salesman',
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden: Insufficient permissions');
  });

  it('10. Multi-Tenancy Isolation - Admin B cannot see or edit Tenant A users', async () => {
    // Register Tenant B
    const registerRes = await request(app).post('/auth/register').send({
      businessName: 'Tenant B Soap Co',
      username: tenantBUsername,
      password: 'password123',
      email: 'admin_b@soap.com',
    });
    tenantBAdminToken = registerRes.body.accessToken;
    tenantBAdminUser = registerRes.body.user;

    // Tenant B lists employees -> should only see Tenant B employees (which is empty or just has B admin not returned by lists)
    const listRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${tenantBAdminToken}`);

    expect(listRes.status).toBe(200);
    // Should NOT see Tenant A's salesman
    const hasSalesmanA = listRes.body.some(
      (u: any) => u.id === tenantASalesmanUser.id,
    );
    expect(hasSalesmanA).toBe(false);

    // Tenant B admin tries to toggle status of Tenant A salesman -> should return 404 not found
    const patchRes = await request(app)
      .patch(`/api/users/${tenantASalesmanUser.id}`)
      .set('Authorization', `Bearer ${tenantBAdminToken}`)
      .send({ status: 'inactive' });

    expect(patchRes.status).toBe(404);
    expect(patchRes.body.error).toBe('Employee not found in this tenant');
  });

  it('11. Employee Management - Admin can toggle salesman status', async () => {
    // Deactivate salesman
    const patchRes = await request(app)
      .patch(`/api/users/${tenantASalesmanUser.id}`)
      .set('Authorization', `Bearer ${tenantAAdminToken}`)
      .send({ status: 'inactive' });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.status).toBe('inactive');

    // Trying to login as deactivated salesman should fail
    const loginRes = await request(app).post('/auth/login').send({
      username: salesmanUsername,
      password: 'password123',
    });
    expect(loginRes.status).toBe(401);
    expect(loginRes.body.error).toBe('Invalid credentials');

    // Reactivate salesman
    const reactivateRes = await request(app)
      .patch(`/api/users/${tenantASalesmanUser.id}`)
      .set('Authorization', `Bearer ${tenantAAdminToken}`)
      .send({ status: 'active' });

    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.status).toBe('active');
  });
});

describeIfDb('Session Revocation (Logout & tokenVersion)', () => {
  const unique = Date.now().toString(36);
  const password = 'password123';

  it('1. Logout revokes the token family — old refresh AND access tokens are rejected', async () => {
    const regRes = await request(app)
      .post('/auth/register')
      .send({
        businessName: `Revoke Co ${unique}`,
        username: `revoke_${unique}`,
        password,
        email: `revoke${unique}@example.com`,
        phone: '9876543212',
      });
    expect(regRes.status).toBe(201);
    const refreshToken = regRes.body.refreshToken;
    const accessToken = regRes.body.accessToken;

    // Refresh works before logout
    const refreshBefore = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken });
    expect(refreshBefore.status).toBe(200);
    expect(refreshBefore.body.accessToken).toBeDefined();

    // Server-side logout
    const logoutRes = await request(app)
      .post('/auth/logout')
      .send({ refreshToken });
    expect(logoutRes.status).toBe(200);

    // Old refresh token must now be rejected (tokenVersion bumped)
    const refreshAfter = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken });
    expect(refreshAfter.status).toBe(401);

    // Old access token must also be rejected
    const meRes = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(meRes.status).toBe(401);
  });

  it('2. Logout is idempotent — a second logout with the same token still succeeds', async () => {
    const regRes = await request(app)
      .post('/auth/register')
      .send({
        businessName: `Revoke2 Co ${unique}`,
        username: `revoke2_${unique}`,
        password,
        email: `revoke2${unique}@example.com`,
        phone: '9876543213',
      });
    const refreshToken = regRes.body.refreshToken;

    const first = await request(app)
      .post('/auth/logout')
      .send({ refreshToken });
    expect(first.status).toBe(200);
    const second = await request(app)
      .post('/auth/logout')
      .send({ refreshToken });
    expect(second.status).toBe(200);
  });

  it('3. Password change revokes previously issued refresh tokens', async () => {
    const regRes = await request(app)
      .post('/auth/register')
      .send({
        businessName: `Revoke3 Co ${unique}`,
        username: `revoke3_${unique}`,
        password,
        email: `revoke3${unique}@example.com`,
        phone: '9876543214',
      });
    const refreshToken = regRes.body.refreshToken;
    const accessToken = regRes.body.accessToken;

    const patchRes = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: password, newPassword: 'newpassword456' });
    expect(patchRes.status).toBe(200);

    const refreshAfter = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken });
    expect(refreshAfter.status).toBe(401);
  });
});

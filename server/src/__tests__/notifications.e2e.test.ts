import { describe, it, expect, beforeAll } from 'vitest';
import { describeIfDb } from './helpers/dbAvailable.js';
import request from 'supertest';
import { app } from '../app.js';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection.js';
import { orders, products, shops, users, notifications } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

describeIfDb.sequential(
  'Notifications End-to-End & Edge Cases Integration',
  () => {
    // Tenant A Credentials & Data
    let adminAToken: string;
    let adminAId: string;
    let salesmanAToken: string;
    let salesmanAId: string;
    let tenantAId: string;
    let productIdA: string;

    // Tenant B Credentials & Data (For isolation testing)
    let adminBToken: string;
    let adminBId: string;
    let salesmanBToken: string;
    let salesmanBId: string;
    let tenantBId: string;

    const adminAUsername = `admin_a_${uuidv4().substring(0, 8)}`;
    const salesmanAUsername = `sales_a_${uuidv4().substring(0, 8)}`;
    const adminBUsername = `admin_b_${uuidv4().substring(0, 8)}`;
    const salesmanBUsername = `sales_b_${uuidv4().substring(0, 8)}`;

    let shopIdA: string;
    let orderIdA: string;
    let cancellationTokenA: string;

    beforeAll(async () => {
      // 1. Setup Tenant A
      const regResA = await request(app).post('/auth/register').send({
        businessName: 'Tenant A Logistics',
        username: adminAUsername,
        password: 'password123',
        email: 'admin_a@tenant-a.com',
        phone: '9876543210',
      });
      adminAToken = regResA.body.accessToken;
      adminAId = regResA.body.user.id;
      tenantAId = regResA.body.user.tenantId;

      // Create Salesman A under Tenant A
      const salesResA = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          username: salesmanAUsername,
          password: 'password12345',
          role: 'salesman',
        });
      salesmanAId = salesResA.body.id;

      // Login Salesman A to get token
      const loginResA = await request(app).post('/auth/login').send({
        username: salesmanAUsername,
        password: 'password12345',
      });
      salesmanAToken = loginResA.body.accessToken;

      // Seed a product for Tenant A
      const prodIdA = uuidv4();
      await db.insert(products).values({
        id: prodIdA,
        tenantId: tenantAId,
        name: 'Organic Liquid Cleanser',
        sku: 'SKU-A-CLEAN',
        price: '25.50',
        stockQuantity: 150,
      });
      productIdA = prodIdA;

      // 2. Setup Tenant B (To test multi-tenant boundaries)
      const regResB = await request(app).post('/auth/register').send({
        businessName: 'Tenant B Logistics',
        username: adminBUsername,
        password: 'password123',
        email: 'admin_b@tenant-b.com',
        phone: '8765432109',
      });
      adminBToken = regResB.body.accessToken;
      adminBId = regResB.body.user.id;
      tenantBId = regResB.body.user.tenantId;

      // Create Salesman B under Tenant B
      const salesResB = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminBToken}`)
        .send({
          username: salesmanBUsername,
          password: 'password12345',
          role: 'salesman',
        });
      salesmanBId = salesResB.body.id;

      // Login Salesman B to get token
      const loginResB = await request(app).post('/auth/login').send({
        username: salesmanBUsername,
        password: 'password12345',
      });
      salesmanBToken = loginResB.body.accessToken;
    });

    describe('1. Shop Approval Request Notification Flow', () => {
      it('notifies admins when a salesman registers a shop requiring approval', async () => {
        const res = await request(app)
          .post('/api/shops')
          .set('Authorization', `Bearer ${salesmanAToken}`)
          .send({
            name: 'North Star Foods',
            ownerName: 'George Miller',
            phone: '9988776655',
            address: '456 North Avenue',
            latitude: 19.076,
            longitude: 72.8777,
          });

        expect(res.status).toBe(201);
        expect(res.body.status).toBe('pending_approval');
        shopIdA = res.body.id;

        // Verify that Admin A has received a shop_approval notification
        const adminNotifRes = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${adminAToken}`);

        expect(adminNotifRes.status).toBe(200);
        const shopNotif = adminNotifRes.body.find(
          (n: any) =>
            n.type === 'shop_approval' && n.relatedEntityId === shopIdA,
        );
        expect(shopNotif).toBeDefined();
        expect(shopNotif.title).toContain('New Outlet Requires Approval');
        expect(shopNotif.message).toContain('North Star Foods');
        expect(shopNotif.isRead).toBe(false);

        // Verify Salesman A has NOT received any notifications yet
        const salesNotifRes = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${salesmanAToken}`);
        expect(salesNotifRes.body.length).toBe(0);
      });
    });

    describe('2. Shop Approval & Rejection Notifications Flow', () => {
      it('notifies salesman when an admin approves their pending shop', async () => {
        const res = await request(app)
          .patch(`/api/shops/${shopIdA}/approve`)
          .set('Authorization', `Bearer ${adminAToken}`);

        expect(res.status).toBe(200);

        // Verify salesman A receives the 'Outlet Approved' notification
        const salesNotifRes = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${salesmanAToken}`);

        const approvedNotif = salesNotifRes.body.find(
          (n: any) =>
            n.type === 'shop_approval' && n.title === 'Outlet Approved',
        );
        expect(approvedNotif).toBeDefined();
        expect(approvedNotif.relatedEntityId).toBe(shopIdA);
        expect(approvedNotif.message).toContain('approved by admin');
      });

      it('notifies salesman when an admin rejects a pending shop', async () => {
        // Create a second pending shop
        const shopRes = await request(app)
          .post('/api/shops')
          .set('Authorization', `Bearer ${salesmanAToken}`)
          .send({
            name: 'South Star Foods',
            ownerName: 'Clara Miller',
            phone: '9988776644',
            address: '456 South Avenue',
            latitude: 19.076,
            longitude: 72.8777,
          });
        const pendingShopId = shopRes.body.id;

        // Reject it
        const rejectRes = await request(app)
          .patch(`/api/shops/${pendingShopId}/reject`)
          .set('Authorization', `Bearer ${adminAToken}`);
        expect(rejectRes.status).toBe(200);

        // Verify salesman A receives the 'Outlet Rejected' notification
        const salesNotifRes = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${salesmanAToken}`);

        console.log('REJECTED NOTIF STATUS:', salesNotifRes.status);
        console.log('REJECTED NOTIF BODY:', salesNotifRes.body);

        const rejectedNotif = salesNotifRes.body.find(
          (n: any) =>
            n.type === 'shop_approval' &&
            n.title === 'Outlet Rejected' &&
            n.relatedEntityId === pendingShopId,
        );
        expect(rejectedNotif).toBeDefined();
        expect(rejectedNotif.message).toContain('rejected by admin');
      });
    });

    describe('3. Order Received & Check-in Notifications Flow', () => {
      it('notifies admin when a salesman places a new order', async () => {
        const res = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${salesmanAToken}`)
          .send({
            shopId: shopIdA,
            items: [{ productId: productIdA, quantity: 4, unitPrice: 25.5 }],
          });

        expect(res.status).toBe(201);
        orderIdA = res.body.id;
        cancellationTokenA = res.body.cancellationToken;

        // Verify admin A gets new_order notification
        const adminNotifRes = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${adminAToken}`);

        const orderNotif = adminNotifRes.body.find(
          (n: any) => n.type === 'new_order' && n.relatedEntityId === orderIdA,
        );
        expect(orderNotif).toBeDefined();
        expect(orderNotif.title).toContain('New Order Received');
        expect(orderNotif.message).toContain('North Star Foods');
      });

      it('notifies admin when a salesman performs a check-in visit', async () => {
        const res = await request(app)
          .post('/api/visits')
          .set('Authorization', `Bearer ${salesmanAToken}`)
          .send({
            shopId: shopIdA,
            latitude: 19.0761,
            longitude: 72.8778,
            notes: 'Regular check-in visit',
          });

        expect(res.status).toBe(201);

        // Verify admin A receives a new_visit notification linked to salesman id
        const adminNotifRes = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${adminAToken}`);

        const visitNotif = adminNotifRes.body.find(
          (n: any) =>
            n.type === 'new_visit' && n.relatedEntityId === salesmanAId,
        );
        expect(visitNotif).toBeDefined();
        expect(visitNotif.title).toContain('New Check-in');
        expect(visitNotif.message).toContain('checked into North Star Foods');
      });
    });

    describe('4. Edge Case: Cascaded Order Rejection Notifications Flow', () => {
      it('notifies salesman when an admin rejects a pending outlet containing active orders', async () => {
        // 1. Create a pending outlet
        const shopRes = await request(app)
          .post('/api/shops')
          .set('Authorization', `Bearer ${salesmanAToken}`)
          .send({
            name: 'Cascade East Outlet',
            ownerName: 'Clive Star',
            phone: '1122334455',
            address: 'East St 101',
            latitude: 19.076,
            longitude: 72.8777,
          });
        const pendingShopId = shopRes.body.id;

        // 2. Place an order for this pending shop
        const orderRes = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${salesmanAToken}`)
          .send({
            shopId: pendingShopId,
            items: [{ productId: productIdA, quantity: 2, unitPrice: 25.5 }],
          });
        const orderIdToCancel = orderRes.body.id;

        // 3. Admin rejects the pending shop
        const rejectRes = await request(app)
          .patch(`/api/shops/${pendingShopId}/reject`)
          .set('Authorization', `Bearer ${adminAToken}`);
        expect(rejectRes.status).toBe(200);

        // 4. Verify that the salesman receives an order_status notification informing them of order cancellation
        const salesNotifRes = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${salesmanAToken}`);

        const cascadeNotif = salesNotifRes.body.find(
          (n: any) =>
            n.type === 'order_status' && n.relatedEntityId === orderIdToCancel,
        );
        expect(cascadeNotif).toBeDefined();
        expect(cascadeNotif.title).toBe('Order Cancelled');
        expect(cascadeNotif.message).toContain(
          'has been cancelled because the outlet was rejected',
        );
      });
    });

    describe('5. Edge Case: Public Customer Cancellation Notifications Flow', () => {
      it('notifies salesman and admin when a customer cancels an order publicly', async () => {
        // Cancel the order placed in Step 3 using its cancellation token
        const res = await request(app)
          .post('/api/orders/public/cancel')
          .send({ token: cancellationTokenA });

        expect(res.status).toBe(200);
        expect(res.body.message).toContain('cancelled successfully');

        // Verify Salesman A receives an order_status notification
        const salesNotifRes = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${salesmanAToken}`);

        const customerCancelNotifSalesman = salesNotifRes.body.find(
          (n: any) =>
            n.type === 'order_status' &&
            n.relatedEntityId === orderIdA &&
            n.title === 'Order Cancelled by Customer',
        );
        expect(customerCancelNotifSalesman).toBeDefined();
        expect(customerCancelNotifSalesman.message).toContain(
          'cancelled by the customer',
        );

        // Verify Admin A receives an order_status notification
        const adminNotifRes = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${adminAToken}`);

        const customerCancelNotifAdmin = adminNotifRes.body.find(
          (n: any) =>
            n.type === 'order_status' &&
            n.relatedEntityId === orderIdA &&
            n.title === 'Order Cancelled by Customer',
        );
        expect(customerCancelNotifAdmin).toBeDefined();
        expect(customerCancelNotifAdmin.message).toContain(
          'cancelled by the customer',
        );
      });
    });

    describe('6. Notification CRUD Flow', () => {
      it('allows a user to mark a specific notification as read', async () => {
        const salesNotifRes = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${salesmanAToken}`);

        const unreadNotif = salesNotifRes.body.find((n: any) => !n.isRead);
        expect(unreadNotif).toBeDefined();

        // Mark it as read
        const markReadRes = await request(app)
          .patch(`/api/notifications/${unreadNotif.id}/read`)
          .set('Authorization', `Bearer ${salesmanAToken}`);

        expect(markReadRes.status).toBe(200);
        expect(markReadRes.body.success).toBe(true);

        // Verify it is now read
        const updatedNotifRes = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${salesmanAToken}`);

        const readNotif = updatedNotifRes.body.find(
          (n: any) => n.id === unreadNotif.id,
        );
        expect(readNotif.isRead).toBe(true);
      });

      it('allows a user to mark all their notifications as read', async () => {
        // Mark all as read
        const res = await request(app)
          .patch('/api/notifications/mark-all-read')
          .set('Authorization', `Bearer ${salesmanAToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Verify all notifications are read
        const salesNotifRes = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${salesmanAToken}`);

        const hasUnread = salesNotifRes.body.some((n: any) => !n.isRead);
        expect(hasUnread).toBe(false);
      });
    });

    describe('7. Edge Case: Multi-Tenant Boundary Isolation Flow', () => {
      it('isolates notifications so Tenant B cannot see Tenant A notifications', async () => {
        // Salesman B fetches their notifications (should be empty, as all actions were in Tenant A)
        const salesBNotifRes = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${salesmanBToken}`);

        expect(salesBNotifRes.status).toBe(200);
        expect(salesBNotifRes.body.length).toBe(0);

        // Admin B fetches their notifications (should be empty)
        const adminBNotifRes = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${adminBToken}`);

        expect(adminBNotifRes.status).toBe(200);
        expect(adminBNotifRes.body.length).toBe(0);
      });

      it('blocks Tenant B from marking Tenant A notifications as read', async () => {
        // Get an unread notification from Tenant A (Admin A)
        const adminANotifRes = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${adminAToken}`);

        const unreadNotifA = adminANotifRes.body.find((n: any) => !n.isRead);
        expect(unreadNotifA).toBeDefined();

        // Admin B attempts to mark Admin A's notification as read
        await request(app)
          .patch(`/api/notifications/${unreadNotifA.id}/read`)
          .set('Authorization', `Bearer ${adminBToken}`);

        // The notification should STILL be unread for Admin A
        const adminANotifResAfter = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${adminAToken}`);

        const notifAfter = adminANotifResAfter.body.find(
          (n: any) => n.id === unreadNotifA.id,
        );
        expect(notifAfter.isRead).toBe(false);
      });
    });

    describe('8. Edge Case: Robustness & Defensive Handling', () => {
      it('handles non-existent notification IDs gracefully without errors', async () => {
        const fakeId = uuidv4();
        const res = await request(app)
          .patch(`/api/notifications/${fakeId}/read`)
          .set('Authorization', `Bearer ${adminAToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('9. Order Status Transition & Push Notifications Flow', () => {
      let orderIdTransition: string;

      beforeAll(async () => {
        // Create a pending outlet
        const shopRes = await request(app)
          .post('/api/shops')
          .set('Authorization', `Bearer ${salesmanAToken}`)
          .send({
            name: 'Transition Test Outlet',
            phone: '9988112233',
            address: 'Status St 12',
            latitude: 19.076,
            longitude: 72.8777,
          });
        const shopId = shopRes.body.id;

        // Place a pending order for this pending shop
        const orderRes = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${salesmanAToken}`)
          .send({
            shopId,
            items: [{ productId: productIdA, quantity: 1, unitPrice: 25.5 }],
          });
        orderIdTransition = orderRes.body.id;
      });

      it('blocks non-admin users from changing order status', async () => {
        const res = await request(app)
          .patch(`/api/orders/${orderIdTransition}/status`)
          .set('Authorization', `Bearer ${salesmanAToken}`)
          .send({ status: 'confirmed' });

        expect(res.status).toBe(403);
      });

      it('validates status updates and rejects invalid status values', async () => {
        const res = await request(app)
          .patch(`/api/orders/${orderIdTransition}/status`)
          .set('Authorization', `Bearer ${adminAToken}`)
          .send({ status: 'invalid_status_value' });

        expect(res.status).toBe(400);
      });

      it('transitions order from pending_approval to confirmed and notifies the salesman', async () => {
        const res = await request(app)
          .patch(`/api/orders/${orderIdTransition}/status`)
          .set('Authorization', `Bearer ${adminAToken}`)
          .send({ status: 'confirmed' });

        expect(res.status).toBe(200);
        expect(res.body.order.status).toBe('confirmed');

        // Verify salesman receives the 'Order Approved' notification
        const salesNotifRes = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${salesmanAToken}`);

        const approvedNotif = salesNotifRes.body.find(
          (n: any) =>
            n.type === 'order_status' &&
            n.title === 'Order Approved' &&
            n.relatedEntityId === orderIdTransition,
        );
        expect(approvedNotif).toBeDefined();
        expect(approvedNotif.message).toContain('approved by admin');
      });

      it('transitions order from confirmed to dispatched and notifies the salesman', async () => {
        const res = await request(app)
          .patch(`/api/orders/${orderIdTransition}/status`)
          .set('Authorization', `Bearer ${adminAToken}`)
          .send({ status: 'dispatched' });

        expect(res.status).toBe(200);
        expect(res.body.order.status).toBe('dispatched');

        // Verify salesman receives the 'Order Dispatched' notification
        const salesNotifRes = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${salesmanAToken}`);

        const dispatchedNotif = salesNotifRes.body.find(
          (n: any) =>
            n.type === 'order_status' &&
            n.title === 'Order Dispatched' &&
            n.relatedEntityId === orderIdTransition,
        );
        expect(dispatchedNotif).toBeDefined();
        expect(dispatchedNotif.message).toContain('dispatched');
      });

      it('transitions order from dispatched to delivered and notifies the salesman', async () => {
        const res = await request(app)
          .patch(`/api/orders/${orderIdTransition}/status`)
          .set('Authorization', `Bearer ${adminAToken}`)
          .send({ status: 'delivered' });

        expect(res.status).toBe(200);
        expect(res.body.order.status).toBe('delivered');

        // Verify salesman receives the 'Order Delivered' notification
        const salesNotifRes = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${salesmanAToken}`);

        const deliveredNotif = salesNotifRes.body.find(
          (n: any) =>
            n.type === 'order_status' &&
            n.title === 'Order Delivered' &&
            n.relatedEntityId === orderIdTransition,
        );
        expect(deliveredNotif).toBeDefined();
        expect(deliveredNotif.message).toContain('delivered');
      });
    });
  },
);

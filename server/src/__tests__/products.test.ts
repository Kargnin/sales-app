import { describe, it, expect } from 'vitest';
import { describeIfDb } from './helpers/dbAvailable.js';
import request from 'supertest';
import { app } from '../index.js';
import { v4 as uuidv4 } from 'uuid';

describeIfDb('Admin Product Catalog Management E2E Integration Tests', () => {
  let adminToken: string;
  let adminUser: any;
  let salesmanToken: string;
  let salesmanUser: any;

  let shopId: string;
  let productId: string;
  let secondProductId: string;

  const adminUsername = `admin_${uuidv4().substring(0, 8)}`;
  const salesmanUsername = `sales_${uuidv4().substring(0, 8)}`;

  it('1. Register Admin Business & Retrieve tenantId', async () => {
    const res = await request(app).post('/auth/register').send({
      businessName: 'SoapFactory Ltd',
      username: adminUsername,
      password: 'password123',
      email: 'admin@soapfactory.com',
    });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    adminToken = res.body.accessToken;
    adminUser = res.body.user;
  });

  it('2. Create and Login Salesman under same Tenant', async () => {
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

    const loginRes = await request(app).post('/auth/login').send({
      username: salesmanUsername,
      password: 'password123',
    });

    expect(loginRes.status).toBe(200);
    salesmanToken = loginRes.body.accessToken;
  });

  it('3. Admin Creates Product successfully', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Sparkle Lavender 500ml',
        sku: 'SPK-LAV-500',
        price: 85.5,
        stockQuantity: 200,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Sparkle Lavender 500ml');
    expect(res.body.price).toBe('85.50');
    expect(res.body.stockQuantity).toBe(200);

    productId = res.body.id;
  });

  it('4. Salesman POST Product is Blocked (403)', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${salesmanToken}`)
      .send({
        name: 'Illegal Lavender 500ml',
        sku: 'SPK-ILL-500',
        price: 40.0,
        stockQuantity: 10,
      });

    expect(res.status).toBe(403);
  });

  it('5. Retrieve Products Catalog (both roles can read)', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${salesmanToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const match = res.body.find((p: any) => p.id === productId);
    expect(match).toBeDefined();
    expect(match.name).toBe('Sparkle Lavender 500ml');
  });

  it('6. Admin Updates Product successfully', async () => {
    const res = await request(app)
      .patch(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        price: 90.0,
        stockQuantity: 180,
      });

    expect(res.status).toBe(200);
    expect(res.body.product.price).toBe('90.00');
    expect(res.body.product.stockQuantity).toBe(180);
  });

  it('7. Salesman PATCH Product is Blocked (403)', async () => {
    const res = await request(app)
      .patch(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${salesmanToken}`)
      .send({
        price: 10.0,
      });

    expect(res.status).toBe(403);
  });

  it('8. Admin Deletes Unordered Product successfully', async () => {
    // Let's create a second product to delete
    const createRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Sparkle Mint 250ml',
        sku: 'SPK-MNT-250',
        price: 45.0,
        stockQuantity: 100,
      });

    expect(createRes.status).toBe(201);
    secondProductId = createRes.body.id;

    // Salesman attempts delete -> Blocked
    const salesmanDeleteRes = await request(app)
      .delete(`/api/products/${secondProductId}`)
      .set('Authorization', `Bearer ${salesmanToken}`);
    expect(salesmanDeleteRes.status).toBe(403);

    // Admin attempts delete -> Successful
    const adminDeleteRes = await request(app)
      .delete(`/api/products/${secondProductId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminDeleteRes.status).toBe(200);
    expect(adminDeleteRes.body.message).toBe('Product deleted successfully');
  });

  it('9. Deletion Safety Guard Blocks Ordered Product', async () => {
    // 1. Create a shop via admin
    const shopRes = await request(app)
      .post('/api/shops')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Safe Shop',
        phone: '9888877776',
        ownerName: 'Subbarao',
        address: '15 Gandhi Marg, Pune',
        latitude: 18.5204,
        longitude: 73.8567,
      });

    expect(shopRes.status).toBe(201);
    shopId = shopRes.body.id;

    // 2. Place an order containing `productId`
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        shopId,
        source: 'admin_self',
        items: [
          {
            productId,
            quantity: 5,
            unitPrice: 85.5,
          },
        ],
      });

    expect(orderRes.status).toBe(201);

    // 3. Attempt to delete `productId` -> Blocked due to active order constraint!
    const deleteRes = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(400);
    expect(deleteRes.body.error).toBe('active_order_conflict');
    expect(deleteRes.body.message).toContain('Cannot delete product');
  });

  describe('Strict Security & Scoping Guards', () => {
    let secondAdminToken: string;
    const secondAdminUsername = `adminB_${uuidv4().substring(0, 8)}`;

    it('10. Register Admin B & Retrieve Tenant B context', async () => {
      const res = await request(app).post('/auth/register').send({
        businessName: 'BubbleCo Ltd',
        username: secondAdminUsername,
        password: 'password123',
        email: 'adminB@bubbleco.com',
      });

      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBeDefined();
      secondAdminToken = res.body.accessToken;
    });

    it('11. Cross-Tenant Separation: Admin B GET Products does not leak Tenant A data', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${secondAdminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const containsTenantAProduct = res.body.some(
        (p: any) => p.id === productId,
      );
      expect(containsTenantAProduct).toBe(false);
    });

    it('12. Cross-Tenant Separation: Admin B PATCH Tenant A Product returns 404', async () => {
      const res = await request(app)
        .patch(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${secondAdminToken}`)
        .send({
          price: 99.99,
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Product not found');
    });

    it('13. Cross-Tenant Separation: Admin B DELETE Tenant A Product returns 404', async () => {
      const res = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${secondAdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Product not found');
    });

    it('14. Unauthenticated Access is Blocked (401)', async () => {
      const postRes = await request(app)
        .post('/api/products')
        .send({ name: 'Hack Name', price: 10 });
      expect(postRes.status).toBe(401);

      const patchRes = await request(app)
        .patch(`/api/products/${productId}`)
        .send({ price: 10 });
      expect(patchRes.status).toBe(401);

      const deleteRes = await request(app).delete(`/api/products/${productId}`);
      expect(deleteRes.status).toBe(401);
    });

    it('15. FieldGuard Blocks Restricted Fields Injection (400)', async () => {
      // POST attempt to inject tenantId
      const postRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Inject Test',
          sku: 'INJ-1',
          price: 15.0,
          tenantId: 'some-other-tenant-id',
        });

      expect(postRes.status).toBe(400);
      expect(postRes.body.error).toContain("forbidden for role 'admin'");

      // PATCH attempt to inject id
      const patchRes = await request(app)
        .patch(`/api/products/${productId}`)
        .set('Authorization', `Bearer={adminToken}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          id: 'new-injected-id',
        });

      expect(patchRes.status).toBe(400);
      expect(patchRes.body.error).toContain("forbidden for role 'admin'");
    });

    it('16. Validation Schema Blocks Invalid Price/Stock (400)', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Negative pricing test',
          price: -10.0,
          stockQuantity: -5,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('Extended Product Fields & Validation', () => {
    it('17. Create product with all extended fields', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Organic Honey 250g',
          price: 350.0,
          description: 'Pure organic honey from Himalayan farms',
          category: 'Pantry',
          unit: '250g',
          taxRate: 12,
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Organic Honey 250g');
      expect(res.body.price).toBe('350.00');
      expect(res.body.description).toBe(
        'Pure organic honey from Himalayan farms',
      );
      expect(res.body.category).toBe('Pantry');
      expect(res.body.unit).toBe('250g');
    });

    it('18. Create product with tax rate accepted', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Taxed Product',
          price: 200.0,
          taxRate: 18,
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
    });

    it('19. Create product with only name and price sets sensible defaults', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Minimal Product',
          price: 25.0,
        });

      expect(res.status).toBe(201);
      expect(res.body.stockQuantity).toBe(0);
      expect(res.body.description).toBeNull();
      expect(res.body.category).toBeNull();
      expect(res.body.unit).toBeNull();
    });

    it('20. Validation rejects product with negative price', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Negative Price',
          price: -50.0,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('21. Validation rejects product with taxRate exceeding 100', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Excessive Tax',
          price: 100.0,
          taxRate: 150,
        });

      expect(res.status).toBe(400);
    });

    it('22. Validation rejects product with negative taxRate', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Negative Tax',
          price: 100.0,
          taxRate: -5,
        });

      expect(res.status).toBe(400);
    });

    it('23. Validation rejects product with empty name', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '',
          price: 10.0,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('24. Admin updates product category via PATCH', async () => {
      // Create a product with an initial category
      const createRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Re-categorizable Product',
          price: 75.0,
          category: 'Drinks',
        });
      expect(createRes.status).toBe(201);
      const updateProductId = createRes.body.id;

      // Update the category
      const res = await request(app)
        .patch(`/api/products/${updateProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          category: 'Beverages',
        });

      expect(res.status).toBe(200);
      expect(res.body.product.category).toBe('Beverages');
    });

    it('25. Admin updates product description via PATCH with partial payload', async () => {
      const createRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Partially Updatable Product',
          price: 200.0,
        });
      expect(createRes.status).toBe(201);
      const updateProductId = createRes.body.id;

      const res = await request(app)
        .patch(`/api/products/${updateProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description:
            'Updated description only — verifies partial PATCH works',
        });

      expect(res.status).toBe(200);
      expect(res.body.product.description).toBe(
        'Updated description only — verifies partial PATCH works',
      );
    });
  });
});

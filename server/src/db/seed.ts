import { db } from './connection.js';
import { tenants, users, shops, products } from './schema.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('🌱 Seeding database...');

  // ─── Tenant ────────────────────────────────────────
  const tenantId = uuidv4();
  await db.insert(tenants).values({
    id: tenantId,
    name: 'Demo Soap Company',
    tier: 'premium',
  });
  console.log(`  ✅ Tenant created: Demo Soap Company (${tenantId})`);

  // ─── Admin User ────────────────────────────────────
  const adminId = uuidv4();
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  await db.insert(users).values({
    id: adminId,
    tenantId,
    username: 'admin',
    email: 'admin@demo.com',
    phone: '9000000001',
    passwordHash: adminPasswordHash,
    role: 'admin',
    status: 'active',
  });
  console.log(`  ✅ Admin user created: admin / admin123`);

  // ─── Salesman Users ────────────────────────────────
  const salesmanPasswordHash = await bcrypt.hash('sales123', 10);
  const salesman1Id = uuidv4();
  const salesman2Id = uuidv4();

  await db.insert(users).values([
    {
      id: salesman1Id,
      tenantId,
      username: 'ravi',
      email: 'ravi@demo.com',
      phone: '9000000002',
      passwordHash: salesmanPasswordHash,
      role: 'salesman',
      status: 'active',
    },
    {
      id: salesman2Id,
      tenantId,
      username: 'amit',
      email: 'amit@demo.com',
      phone: '9000000003',
      passwordHash: salesmanPasswordHash,
      role: 'salesman',
      status: 'active',
    },
  ]);
  console.log(`  ✅ Salesmen created: ravi/sales123, amit/sales123`);

  // ─── Shops ─────────────────────────────────────────
  const shopIds = Array.from({ length: 5 }, () => uuidv4());
  const shopData = [
    { name: 'Sharma General Store', ownerName: 'Rajesh Sharma', phone: '9100000001', address: '12 MG Road, Mumbai', latitude: '19.07600000', longitude: '72.87770000' },
    { name: 'Patel Kirana', ownerName: 'Suresh Patel', phone: '9100000002', address: '45 Station Road, Pune', latitude: '18.52000000', longitude: '73.85670000' },
    { name: 'Kumar Supermart', ownerName: 'Vijay Kumar', phone: '9100000003', address: '78 Gandhi Nagar, Delhi', latitude: '28.61390000', longitude: '77.20900000' },
    { name: 'Gupta Traders', ownerName: 'Anand Gupta', phone: '9100000004', address: '23 Civil Lines, Jaipur', latitude: '26.91240000', longitude: '75.78730000' },
    { name: 'Singh Provision Store', ownerName: 'Harpreet Singh', phone: '9100000005', address: '56 Model Town, Ludhiana', latitude: '30.90100000', longitude: '75.85720000' },
  ];

  await db.insert(shops).values(
    shopData.map((shop, i) => ({
      id: shopIds[i],
      tenantId,
      ...shop,
      status: 'approved' as const,
      createdByUserId: adminId,
    }))
  );
  console.log(`  ✅ 5 shops created`);

  // ─── Products ──────────────────────────────────────
  const productData = [
    { name: 'Sparkle Dishwash Bar 200g', sku: 'SPK-BAR-200', price: '15.00', stockQuantity: 500 },
    { name: 'Sparkle Dishwash Gel 500ml', sku: 'SPK-GEL-500', price: '85.00', stockQuantity: 300 },
    { name: 'Sparkle Dishwash Gel 1L', sku: 'SPK-GEL-1000', price: '150.00', stockQuantity: 200 },
  ];

  await db.insert(products).values(
    productData.map((p) => ({
      id: uuidv4(),
      tenantId,
      ...p,
    }))
  );
  console.log(`  ✅ 3 products created`);

  console.log('\n🎉 Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

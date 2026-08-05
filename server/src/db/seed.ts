import { db } from './connection.js';
import {
  tenants,
  users,
  shops,
  products,
  visits,
  orders,
  orderItems,
  payments,
  auditLogs,
  notifications,
} from './schema.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  // ─── Production guard ────────────────────────────
  // db:seed deletes every row from all 9 tables before inserting demo data.
  // Never run that against a production database unless explicitly confirmed.
  if (process.env.NODE_ENV === 'production' && !process.env.SEED_CONFIRM) {
    console.error(
      '❌ Refusing to seed: NODE_ENV=production and SEED_CONFIRM is not set. ' +
        'db:seed wipes ALL rows from every table — set SEED_CONFIRM=1 only if you really mean to destroy this database.',
    );
    process.exit(1);
  }

  console.log('🌱 Seeding database...');

  // ─── Clear existing data (respect FK order) ────────
  await db.delete(notifications);
  await db.delete(auditLogs);
  await db.delete(payments);
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(visits);
  await db.delete(products);
  await db.delete(shops);
  await db.delete(users);
  await db.delete(tenants);
  console.log('  🧹 Cleared existing seed data');

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
    {
      name: 'Sharma General Store',
      ownerName: 'Rajesh Sharma',
      phone: '9100000001',
      address: '12 MG Road, Mumbai',
      latitude: '19.07600000',
      longitude: '72.87770000',
    },
    {
      name: 'Patel Kirana',
      ownerName: 'Suresh Patel',
      phone: '9100000002',
      address: '45 Station Road, Pune',
      latitude: '18.52000000',
      longitude: '73.85670000',
    },
    {
      name: 'Kumar Supermart',
      ownerName: 'Vijay Kumar',
      phone: '9100000003',
      address: '78 Gandhi Nagar, Delhi',
      latitude: '28.61390000',
      longitude: '77.20900000',
    },
    {
      name: 'Gupta Traders',
      ownerName: 'Anand Gupta',
      phone: '9100000004',
      address: '23 Civil Lines, Jaipur',
      latitude: '26.91240000',
      longitude: '75.78730000',
    },
    {
      name: 'Singh Provision Store',
      ownerName: 'Harpreet Singh',
      phone: '9100000005',
      address: '56 Model Town, Ludhiana',
      latitude: '30.90100000',
      longitude: '75.85720000',
    },
  ];

  await db.insert(shops).values(
    shopData.map((shop, i) => ({
      id: shopIds[i],
      tenantId,
      ...shop,
      status: 'approved' as const,
      createdByUserId: adminId,
    })),
  );
  console.log(`  ✅ 5 shops created`);

  // ─── Products ──────────────────────────────────────
  const productData = [
    {
      name: 'Cola Drink 500ml',
      sku: 'COLA-500',
      price: '40.00',
      stockQuantity: 200,
      category: 'Drinks',
      unit: '500ml',
      imageUrl: 'https://picsum.photos/seed/cola500/200/200',
      description: 'Refreshing carbonated cola drink',
    },
    {
      name: 'Orange Juice 1L',
      sku: 'OJ-1000',
      price: '120.00',
      stockQuantity: 150,
      category: 'Drinks',
      unit: '1L',
      imageUrl: 'https://picsum.photos/seed/oj1000/200/200',
      description: 'Freshly squeezed orange juice',
    },
    {
      name: 'Potato Chips 150g',
      sku: 'CHIPS-150',
      price: '30.00',
      stockQuantity: 8,
      category: 'Snacks',
      unit: '150g',
      imageUrl: 'https://picsum.photos/seed/chips150/200/200',
      description: 'Crunchy salted potato chips',
    },
    {
      name: 'Mixed Nuts 200g',
      sku: 'NUTS-200',
      price: '250.00',
      stockQuantity: 0,
      category: 'Snacks',
      unit: '200g',
      imageUrl: 'https://picsum.photos/seed/nuts200/200/200',
      description: 'Premium mixed nuts with almonds and cashews',
    },
    {
      name: 'Milk 1L',
      sku: 'MILK-1000',
      price: '60.00',
      stockQuantity: 300,
      category: 'Dairy',
      unit: '1L',
      imageUrl: 'https://picsum.photos/seed/milk1000/200/200',
      description: 'Fresh full cream milk',
    },
    {
      name: 'Butter 500g',
      sku: 'BTR-500',
      price: '240.00',
      stockQuantity: 45,
      category: 'Dairy',
      unit: '500g',
      imageUrl: 'https://picsum.photos/seed/btr500/200/200',
      description: 'Creamy salted butter block',
    },
    {
      name: 'Basmati Rice 5kg',
      sku: 'RICE-5000',
      price: '450.00',
      stockQuantity: 100,
      category: 'Pantry',
      unit: '5kg',
      imageUrl: 'https://picsum.photos/seed/rice5000/200/200',
      description: 'Premium aged basmati rice',
    },
    {
      name: 'Cooking Oil 1L',
      sku: 'OIL-1000',
      price: '180.00',
      stockQuantity: 2,
      category: 'Pantry',
      unit: '1L',
      imageUrl: 'https://picsum.photos/seed/oil1000/200/200',
      description: 'Refined sunflower cooking oil',
    },
    {
      name: 'Sparkle Dishwash Bar 200g',
      sku: 'SPK-BAR-200',
      price: '15.00',
      stockQuantity: 500,
      category: 'Pantry',
      unit: '200g',
      imageUrl: 'https://picsum.photos/seed/spkbar200/200/200',
      description: 'Effective dishwashing soap bar',
    },
    {
      name: 'Sparkle Dishwash Gel 1L',
      sku: 'SPK-GEL-1000',
      price: '150.00',
      stockQuantity: 200,
      category: 'Pantry',
      unit: '1L',
      imageUrl: 'https://picsum.photos/seed/spkgel1000/200/200',
      description: 'Concentrated dishwashing liquid gel',
    },
  ];

  await db.insert(products).values(
    productData.map((p) => ({
      id: uuidv4(),
      tenantId,
      ...p,
    })),
  );
  console.log(`  ✅ 10 products created`);

  console.log('\n🎉 Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

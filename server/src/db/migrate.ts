import mysql from 'mysql2/promise';
import 'dotenv/config';

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sales_app_dev',
    multipleStatements: true,
  });

  console.log('Applying migration...');

  try {
    await conn.execute(`ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0`);
    console.log('  Added token_version column');
  } catch (e: any) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('  token_version already exists');
    else throw e;
  }

  // Product metadata columns (image_url, category, description, unit)
  const productColumns = [
    'ALTER TABLE products ADD COLUMN image_url VARCHAR(500)',
    'ALTER TABLE products ADD COLUMN category VARCHAR(100)',
    'ALTER TABLE products ADD COLUMN description TEXT',
    'ALTER TABLE products ADD COLUMN unit VARCHAR(50)',
  ];

  for (const col of productColumns) {
    try {
      await conn.execute(col);
      console.log('  Added column:', col.replace('ALTER TABLE products ADD COLUMN ', ''));
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('  Already exists:', col.replace('ALTER TABLE products ADD COLUMN ', ''));
      else throw e;
    }
  }

  const indexes = [
    'CREATE INDEX idx_users_tenant_role ON users(tenant_id, role)',
    'CREATE INDEX idx_users_username ON users(username)',
    'CREATE INDEX idx_visits_tenant_salesman ON visits(tenant_id, salesman_id)',
    'CREATE INDEX idx_visits_tenant_shop ON visits(tenant_id, shop_id)',
    'CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status)',
    'CREATE INDEX idx_orders_tenant_shop ON orders(tenant_id, shop_id)',
    'CREATE INDEX idx_orders_tenant_salesman ON orders(tenant_id, salesman_id)',
    'CREATE INDEX idx_orders_cancellation_token ON orders(cancellation_token)',
    'CREATE INDEX idx_notifications_user_tenant ON notifications(tenant_id, user_id, is_read)',
    'CREATE INDEX idx_products_tenant_category ON products(tenant_id, category)',
  ];

  for (const idx of indexes) {
    try {
      await conn.execute(idx);
      console.log('  Created:', idx.split(' ON ')[0].replace('CREATE INDEX ', ''));
    } catch (e: any) {
      if (e.code === 'ER_DUP_KEYNAME') console.log('  Already exists:', idx.split(' ON ')[0].replace('CREATE INDEX ', ''));
      else console.error('  Failed:', idx, e.message);
    }
  }

  await conn.end();
  console.log('Migration complete.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

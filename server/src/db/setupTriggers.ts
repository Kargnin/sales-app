import { db } from './connection.js';
import { sql } from 'drizzle-orm';

async function setup() {
  console.log('⚡ Setting up database triggers...');

  try {
    // 1. Drop existing triggers if they exist to prevent duplication errors
    await db.execute(sql`DROP TRIGGER IF EXISTS after_shop_update`);
    await db.execute(sql`DROP TRIGGER IF EXISTS after_order_update`);
    await db.execute(sql`DROP TRIGGER IF EXISTS after_user_update`);
    console.log('  ✅ Dropped legacy triggers if existed.');

    // 2. Create shop status update trigger
    await db.execute(sql`
      CREATE TRIGGER after_shop_update
      AFTER UPDATE ON shops
      FOR EACH ROW
      BEGIN
        IF OLD.status != NEW.status OR OLD.name != NEW.name OR OLD.phone != NEW.phone THEN
          INSERT INTO audit_logs (id, table_name, operation, entity_id, old_data, new_data, created_at)
          VALUES (
            UUID(),
            'shops',
            'UPDATE',
            NEW.id,
            JSON_OBJECT('name', OLD.name, 'ownerName', OLD.owner_name, 'phone', OLD.phone, 'address', OLD.address, 'status', OLD.status),
            JSON_OBJECT('name', NEW.name, 'ownerName', NEW.owner_name, 'phone', NEW.phone, 'address', NEW.address, 'status', NEW.status),
            NOW()
          );
        END IF;
      END;
    `);
    console.log('  ✅ Created after_shop_update trigger.');

    // 3. Create order status update trigger
    await db.execute(sql`
      CREATE TRIGGER after_order_update
      AFTER UPDATE ON orders
      FOR EACH ROW
      BEGIN
        IF OLD.status != NEW.status OR OLD.payment_status != NEW.payment_status THEN
          INSERT INTO audit_logs (id, table_name, operation, entity_id, old_data, new_data, created_at)
          VALUES (
            UUID(),
            'orders',
            'UPDATE',
            NEW.id,
            JSON_OBJECT('status', OLD.status, 'paymentStatus', OLD.payment_status, 'totalAmount', OLD.total_amount),
            JSON_OBJECT('status', NEW.status, 'paymentStatus', NEW.payment_status, 'totalAmount', NEW.total_amount),
            NOW()
          );
        END IF;
      END;
    `);
    console.log('  ✅ Created after_order_update trigger.');

    // 4. Create user status update trigger
    await db.execute(sql`
      CREATE TRIGGER after_user_update
      AFTER UPDATE ON users
      FOR EACH ROW
      BEGIN
        IF OLD.status != NEW.status OR OLD.role != NEW.role THEN
          INSERT INTO audit_logs (id, table_name, operation, entity_id, old_data, new_data, created_at)
          VALUES (
            UUID(),
            'users',
            'UPDATE',
            NEW.id,
            JSON_OBJECT('username', OLD.username, 'role', OLD.role, 'status', OLD.status),
            JSON_OBJECT('username', NEW.username, 'role', NEW.role, 'status', NEW.status),
            NOW()
          );
        END IF;
      END;
    `);
    console.log('  ✅ Created after_user_update trigger.');

    console.log('🎉 Database triggers setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to set up database triggers:', error);
    process.exit(1);
  }
}

setup();

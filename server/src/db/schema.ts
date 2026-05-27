import {
  mysqlTable, varchar, mysqlEnum, timestamp, decimal,
  int, boolean, text, date,
} from 'drizzle-orm/mysql-core';

// ─── Tenants ───────────────────────────────────────────
export const tenants = mysqlTable('tenants', {
  id:        varchar('id', { length: 36 }).primaryKey(),
  name:      varchar('name', { length: 255 }).notNull(),
  tier:      mysqlEnum('tier', ['free', 'premium']).default('free').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// ─── Users ─────────────────────────────────────────────
export const users = mysqlTable('users', {
  id:           varchar('id', { length: 36 }).primaryKey(),
  tenantId:     varchar('tenant_id', { length: 36 }).notNull()
                  .references(() => tenants.id, { onDelete: 'cascade' }),
  username:     varchar('username', { length: 100 }).notNull().unique(),
  email:        varchar('email', { length: 255 }),
  phone:        varchar('phone', { length: 20 }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role:         mysqlEnum('role', ['admin', 'salesman']).default('salesman').notNull(),
  status:       mysqlEnum('status', ['active', 'inactive']).default('active').notNull(),
  tokenVersion: int('token_version').default(0).notNull(),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
});

// ─── Shops ─────────────────────────────────────────────
export const shops = mysqlTable('shops', {
  id:              varchar('id', { length: 36 }).primaryKey(),
  tenantId:        varchar('tenant_id', { length: 36 }).notNull()
                     .references(() => tenants.id, { onDelete: 'cascade' }),
  name:            varchar('name', { length: 255 }).notNull(),
  ownerName:       varchar('owner_name', { length: 150 }),
  phone:           varchar('phone', { length: 20 }).notNull(),
  address:         text('address'),
  latitude:        decimal('latitude', { precision: 10, scale: 8 }),
  longitude:       decimal('longitude', { precision: 11, scale: 8 }),
  status:          mysqlEnum('status', ['approved', 'pending_approval', 'rejected'])
                     .default('approved').notNull(),
  createdByUserId: varchar('created_by_user_id', { length: 36 })
                     .references(() => users.id, { onDelete: 'set null' }),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
});

// ─── Visits ────────────────────────────────────────────
export const visits = mysqlTable('visits', {
  id:          varchar('id', { length: 36 }).primaryKey(),
  tenantId:    varchar('tenant_id', { length: 36 }).notNull()
                 .references(() => tenants.id, { onDelete: 'cascade' }),
  salesmanId:  varchar('salesman_id', { length: 36 }).notNull()
                 .references(() => users.id, { onDelete: 'cascade' }),
  shopId:      varchar('shop_id', { length: 36 }).notNull()
                 .references(() => shops.id, { onDelete: 'cascade' }),
  latitude:    decimal('latitude', { precision: 10, scale: 8 }),
  longitude:   decimal('longitude', { precision: 11, scale: 8 }),
  gpsVerified: boolean('gps_verified').default(false).notNull(),
  photoUrl:    varchar('photo_url', { length: 500 }),
  notes:       text('notes'),
  visitedAt:   timestamp('visited_at').defaultNow().notNull(),
});

// ─── Products ──────────────────────────────────────────
export const products = mysqlTable('products', {
  id:            varchar('id', { length: 36 }).primaryKey(),
  tenantId:      varchar('tenant_id', { length: 36 }).notNull()
                   .references(() => tenants.id, { onDelete: 'cascade' }),
  name:          varchar('name', { length: 255 }).notNull(),
  sku:           varchar('sku', { length: 100 }),
  price:         decimal('price', { precision: 10, scale: 2 }).notNull(),
  stockQuantity: int('stock_quantity').default(0).notNull(),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
});

// ─── Orders ────────────────────────────────────────────
export const orders = mysqlTable('orders', {
  id:                varchar('id', { length: 36 }).primaryKey(),
  tenantId:          varchar('tenant_id', { length: 36 }).notNull()
                       .references(() => tenants.id, { onDelete: 'cascade' }),
  shopId:            varchar('shop_id', { length: 36 }).notNull()
                       .references(() => shops.id, { onDelete: 'cascade' }),
  salesmanId:        varchar('salesman_id', { length: 36 })
                       .references(() => users.id, { onDelete: 'set null' }),
  orderSource:       mysqlEnum('order_source', ['salesman', 'whatsapp', 'meesho', 'admin_self'])
                       .notNull(),
  status:            mysqlEnum('status', ['pending_approval', 'confirmed', 'cancelled', 'dispatched', 'delivered'])
                       .default('confirmed').notNull(),
  paymentStatus:     mysqlEnum('payment_status', ['unpaid', 'partially_paid', 'paid'])
                       .default('unpaid').notNull(),
  creditDueDate:     date('credit_due_date'),
  cancellationToken: varchar('cancellation_token', { length: 64 }).unique(),
  cancellationWindowExpiresAt: timestamp('cancellation_window_expires_at'),
  totalAmount:       decimal('total_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
  createdAt:         timestamp('created_at').defaultNow().notNull(),
  updatedAt:         timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// ─── Order Items ───────────────────────────────────────
export const orderItems = mysqlTable('order_items', {
  id:        varchar('id', { length: 36 }).primaryKey(),
  orderId:   varchar('order_id', { length: 36 }).notNull()
               .references(() => orders.id, { onDelete: 'cascade' }),
  productId: varchar('product_id', { length: 36 }).notNull()
               .references(() => products.id, { onDelete: 'cascade' }),
  quantity:  int('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  subtotal:  decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
});

// ─── Payments ──────────────────────────────────────────
export const payments = mysqlTable('payments', {
  id:            varchar('id', { length: 36 }).primaryKey(),
  tenantId:      varchar('tenant_id', { length: 36 }).notNull()
                   .references(() => tenants.id, { onDelete: 'cascade' }),
  orderId:       varchar('order_id', { length: 36 }).notNull()
                   .references(() => orders.id, { onDelete: 'cascade' }),
  amountPaid:    decimal('amount_paid', { precision: 12, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum('payment_method', ['cash', 'upi', 'bank_transfer']).notNull(),
  paymentDate:   timestamp('payment_date').defaultNow().notNull(),
  notes:         text('notes'),
});

// ─── Audit Logs ─────────────────────────────────────────
export const auditLogs = mysqlTable('audit_logs', {
  id:        varchar('id', { length: 36 }).primaryKey(),
  tableName: varchar('table_name', { length: 50 }).notNull(),
  operation: varchar('operation', { length: 20 }).notNull(), // 'INSERT', 'UPDATE', 'DELETE'
  entityId:  varchar('entity_id', { length: 36 }).notNull(),
  oldData:   text('old_data'), // JSON string
  newData:   text('new_data'), // JSON string
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Notifications ──────────────────────────────────────
export const notifications = mysqlTable('notifications', {
  id:              varchar('id', { length: 36 }).primaryKey(),
  tenantId:        varchar('tenant_id', { length: 36 }).notNull()
                     .references(() => tenants.id, { onDelete: 'cascade' }),
  userId:          varchar('user_id', { length: 36 }).notNull()
                     .references(() => users.id, { onDelete: 'cascade' }),
  title:           varchar('title', { length: 255 }).notNull(),
  message:         text('message').notNull(),
  type:            mysqlEnum('type', ['shop_approval', 'order_status', 'system', 'new_order', 'new_visit']).notNull(),
  isRead:          boolean('is_read').default(false).notNull(),
  relatedEntityId: varchar('related_entity_id', { length: 36 }),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
});

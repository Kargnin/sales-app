import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { products, orderItems } from '../db/schema.js';
import { createProductSchema, updateProductSchema } from '@sales-app/shared';
import { authenticate, authorize, tenantScope, fieldGuard } from '../middleware/index.js';

const router = Router();

// Apply authentication and tenant scoping globally to all product routes
router.use(authenticate, tenantScope);

// ─── Get Scoped Tenant Products Catalog ──────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;

    const pageParam = req.query.page;
    const limitParam = req.query.limit;
    const searchQuery = req.query.search;

    let baseWhere: any = eq(products.tenantId, tenantId);
    if (searchQuery) {
      baseWhere = and(
        baseWhere,
        sql`lower(${products.name}) like ${'%' + (searchQuery as string).toLowerCase() + '%'}`
      );
    }

    if (pageParam !== undefined) {
      const page = parseInt(pageParam as string, 10) || 1;
      const limit = parseInt(limitParam as string, 10) || 10;
      const offset = (page - 1) * limit;

      const paginatedProducts = await db
        .select()
        .from(products)
        .where(baseWhere)
        .limit(limit)
        .offset(offset);

      const countResult = await db
        .select({ value: sql<number>`count(*)` })
        .from(products)
        .where(baseWhere);

      const totalCount = Number(countResult[0]?.value || 0);
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        products: paginatedProducts,
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          limit,
        },
      });
    } else {
      const allProducts = await db.select().from(products).where(baseWhere);
      res.json(allProducts);
    }
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Create Product (Admin Only) ──────────────────────────────────────
router.post(
  '/',
  authorize('admin'),
  fieldGuard({
    admin: {
      reject: ['id', 'tenantId'],
    },
  }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const validated = createProductSchema.safeParse(req.body);
      if (!validated.success) {
        res.status(400).json({ error: 'Validation failed', details: validated.error.format() });
        return;
      }

      const { name, sku, price, stockQuantity } = validated.data;
      const tenantId = req.user!.tenantId;
      const productId = uuidv4();

      await db.insert(products).values({
        id: productId,
        tenantId,
        name,
        sku: sku || null,
        price: String(price),
        stockQuantity: stockQuantity ?? 0,
      });

      const newProduct = await db.query.products.findFirst({
        where: eq(products.id, productId),
      });

      res.status(201).json(newProduct);
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── Edit Product Details (Admin Only) ──────────────────────────────────
router.patch(
  '/:id',
  authorize('admin'),
  fieldGuard({
    admin: {
      reject: ['id', 'tenantId'],
    },
  }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const tenantId = req.user!.tenantId;

      const validated = updateProductSchema.safeParse(req.body);
      if (!validated.success) {
        res.status(400).json({ error: 'Validation failed', details: validated.error.format() });
        return;
      }

      // Check if product exists in tenant scope
      const existingProduct = await db.query.products.findFirst({
        where: and(eq(products.id, id), eq(products.tenantId, tenantId)),
      });

      if (!existingProduct) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      const { name, sku, price, stockQuantity } = validated.data;

      await db.update(products)
        .set({
          name: name !== undefined ? name : undefined,
          sku: sku !== undefined ? sku : undefined,
          price: price !== undefined ? String(price) : undefined,
          stockQuantity: stockQuantity !== undefined ? stockQuantity : undefined,
        })
        .where(eq(products.id, id));

      const updatedProduct = await db.query.products.findFirst({
        where: eq(products.id, id),
      });

      res.json({ message: 'Product details updated successfully', product: updatedProduct });
    } catch (error) {
      console.error('Error editing product:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── Delete Product (Admin Only) ───────────────────────────────────────
router.delete('/:id', authorize('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const tenantId = req.user!.tenantId;

    // Check if product exists in tenant scope
    const existingProduct = await db.query.products.findFirst({
      where: and(eq(products.id, id), eq(products.tenantId, tenantId)),
    });

    if (!existingProduct) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    // Deletion validation check: verify if the product is associated with any historical orders
    const associatedOrders = await db.select().from(orderItems).where(eq(orderItems.productId, id));

    if (associatedOrders.length > 0) {
      res.status(400).json({
        error: 'active_order_conflict',
        message: 'Cannot delete product because it has been ordered in historical transactions. Try updating its details instead.',
      });
      return;
    }

    // Safe to delete product
    await db.delete(products).where(eq(products.id, id));

    res.json({ message: 'Product deleted successfully', id });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

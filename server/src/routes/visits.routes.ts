import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { visits, shops, users, notifications } from '../db/schema.js';
import { createVisitSchema } from '@sales-app/shared';
import { authenticate, tenantScope } from '../middleware/index.js';
import { haversineDistance, isWithinTolerance } from '../utils/gps.js';

const router = Router();

// Apply authentication and tenant scoping globally to all visit routes
router.use(authenticate, tenantScope);

// ─── Get Scoped Tenant Visits ─────────────────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.sub;
    const role = req.user!.role;

    const pageParam = req.query.page;
    const limitParam = req.query.limit;
    const shopIdQuery = req.query.shopId;
    const filterShopQuery = req.query.filter_shop;

    let baseWhere = role === 'admin'
      ? eq(visits.tenantId, tenantId)
      : and(eq(visits.tenantId, tenantId), eq(visits.salesmanId, userId));

    if (shopIdQuery) {
      baseWhere = and(baseWhere, eq(visits.shopId, shopIdQuery as string));
    }

    if (pageParam !== undefined) {
      const page = parseInt(pageParam as string, 10) || 1;
      const limit = parseInt(limitParam as string, 10) || 10;
      const offset = (page - 1) * limit;

      let paginatedVisits;
      if (role === 'admin') {
        let adminQuery = db
          .select({
            id: visits.id,
            tenantId: visits.tenantId,
            salesmanId: visits.salesmanId,
            salesmanName: users.username,
            shopId: visits.shopId,
            shopName: shops.name,
            latitude: visits.latitude,
            longitude: visits.longitude,
            gpsVerified: visits.gpsVerified,
            photoUrl: visits.photoUrl,
            notes: visits.notes,
            visitedAt: visits.visitedAt,
          })
          .from(visits)
          .innerJoin(shops, eq(visits.shopId, shops.id))
          .innerJoin(users, eq(visits.salesmanId, users.id));

        if (filterShopQuery) {
          paginatedVisits = await adminQuery
            .where(and(baseWhere, eq(shops.name, filterShopQuery as string)))
            .orderBy(desc(visits.visitedAt))
            .limit(limit)
            .offset(offset);
        } else {
          paginatedVisits = await adminQuery
            .where(baseWhere)
            .orderBy(desc(visits.visitedAt))
            .limit(limit)
            .offset(offset);
        }
      } else {
        let salesmanQuery = db
          .select({
            id: visits.id,
            tenantId: visits.tenantId,
            salesmanId: visits.salesmanId,
            shopId: visits.shopId,
            shopName: shops.name,
            latitude: visits.latitude,
            longitude: visits.longitude,
            gpsVerified: visits.gpsVerified,
            photoUrl: visits.photoUrl,
            notes: visits.notes,
            visitedAt: visits.visitedAt,
          })
          .from(visits)
          .innerJoin(shops, eq(visits.shopId, shops.id));

        if (filterShopQuery) {
          paginatedVisits = await salesmanQuery
            .where(and(baseWhere, eq(shops.name, filterShopQuery as string)))
            .orderBy(desc(visits.visitedAt))
            .limit(limit)
            .offset(offset);
        } else {
          paginatedVisits = await salesmanQuery
            .where(baseWhere)
            .orderBy(desc(visits.visitedAt))
            .limit(limit)
            .offset(offset);
        }
      }

      // Count query
      let countQuery = db
        .select({ value: sql<number>`count(*)` })
        .from(visits)
        .innerJoin(shops, eq(visits.shopId, shops.id));

      let countResult;
      if (filterShopQuery) {
        countResult = await countQuery.where(and(baseWhere, eq(shops.name, filterShopQuery as string)));
      } else {
        countResult = await countQuery.where(baseWhere);
      }

      const totalCount = Number(countResult[0]?.value || 0);
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        visits: paginatedVisits,
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          limit,
        },
      });
    } else {
      if (role === 'admin') {
        let adminQuery = db
          .select({
            id: visits.id,
            tenantId: visits.tenantId,
            salesmanId: visits.salesmanId,
            salesmanName: users.username,
            shopId: visits.shopId,
            shopName: shops.name,
            latitude: visits.latitude,
            longitude: visits.longitude,
            gpsVerified: visits.gpsVerified,
            photoUrl: visits.photoUrl,
            notes: visits.notes,
            visitedAt: visits.visitedAt,
          })
          .from(visits)
          .innerJoin(shops, eq(visits.shopId, shops.id))
          .innerJoin(users, eq(visits.salesmanId, users.id));

        const allVisits = filterShopQuery
          ? await adminQuery.where(and(baseWhere, eq(shops.name, filterShopQuery as string))).orderBy(desc(visits.visitedAt))
          : await adminQuery.where(baseWhere).orderBy(desc(visits.visitedAt));

        res.json(allVisits);
      } else {
        let salesmanQuery = db
          .select({
            id: visits.id,
            tenantId: visits.tenantId,
            salesmanId: visits.salesmanId,
            shopId: visits.shopId,
            shopName: shops.name,
            latitude: visits.latitude,
            longitude: visits.longitude,
            gpsVerified: visits.gpsVerified,
            photoUrl: visits.photoUrl,
            notes: visits.notes,
            visitedAt: visits.visitedAt,
          })
          .from(visits)
          .innerJoin(shops, eq(visits.shopId, shops.id));

        const myVisits = filterShopQuery
          ? await salesmanQuery.where(and(baseWhere, eq(shops.name, filterShopQuery as string))).orderBy(desc(visits.visitedAt))
          : await salesmanQuery.where(baseWhere).orderBy(desc(visits.visitedAt));

        res.json(myVisits);
      }
    }
  } catch (error) {
    console.error('Error fetching visits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Create Visit Check-In ────────────────────────────────────────────
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = createVisitSchema.safeParse(req.body);
    if (!validated.success) {
      res.status(400).json({ error: 'Validation failed', details: validated.error.format() });
      return;
    }

    const { shopId, latitude, longitude, photoUrl, notes } = validated.data;
    const tenantId = req.user!.tenantId;
    const salesmanId = req.user!.sub;

    // Fetch the target shop and verify same tenant scope
    const targetShop = await db.query.shops.findFirst({
      where: and(eq(shops.id, shopId), eq(shops.tenantId, tenantId)),
    });

    if (!targetShop) {
      res.status(404).json({ error: 'Shop not found' });
      return;
    }

    if (targetShop.status !== 'approved') {
      res.status(400).json({ error: 'Cannot check in to a shop that is not approved.' });
      return;
    }

    // Determine if GPS is verified
    let gpsVerified = false;
    if (targetShop.latitude && targetShop.longitude) {
      const shopLat = parseFloat(targetShop.latitude);
      const shopLon = parseFloat(targetShop.longitude);

      const distance = haversineDistance(latitude, longitude, shopLat, shopLon);
      // Verify if salesman check-in is within 200 meters
      gpsVerified = isWithinTolerance(distance, 200);
    }

    const visitId = uuidv4();

    await db.insert(visits).values({
      id: visitId,
      tenantId,
      salesmanId,
      shopId,
      latitude: String(latitude),
      longitude: String(longitude),
      gpsVerified,
      photoUrl: photoUrl || null,
      notes: notes || null,
    });

    const newVisit = await db.query.visits.findFirst({
      where: eq(visits.id, visitId),
    });

    const admins = await db.select().from(users).where(and(eq(users.tenantId, tenantId), eq(users.role, 'admin')));
    const notificationValues = admins.map(a => ({
      id: uuidv4(),
      tenantId,
      userId: a.id,
      title: 'New Check-in',
      message: `A salesman checked into ${targetShop.name}.`,
      type: 'new_visit' as const,
      relatedEntityId: salesmanId
    }));
    if (notificationValues.length > 0) {
      await db.insert(notifications).values(notificationValues);
    }

    res.status(201).json(newVisit);
  } catch (error) {
    console.error('Error recording visit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

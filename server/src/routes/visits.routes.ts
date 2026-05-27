import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { visits, shops, users } from '../db/schema.js';
import { createVisitSchema } from '@sales-app/shared';
import { GPS_TOLERANCE_METERS } from '@sales-app/shared';
import { authenticate, authorize, tenantScope, fieldGuard, validate } from '../middleware/index.js';
import { haversineDistance, isWithinTolerance } from '../utils/gps.js';
import { notifyAdmins } from '../services/notification.service.js';

const router = Router();

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

    const isAdmin = role === 'admin';

    const buildQuery = () => {
      const fields: any = {
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
      };

      if (isAdmin) {
        fields.salesmanName = users.username;
      }

      let query = db.select(fields).from(visits).innerJoin(shops, eq(visits.shopId, shops.id));

      if (isAdmin) {
        query = query.innerJoin(users, eq(visits.salesmanId, users.id));
      }

      return query;
    };

    if (pageParam !== undefined) {
      const page = parseInt(pageParam as string, 10) || 1;
      const limit = parseInt(limitParam as string, 10) || 10;
      const offset = (page - 1) * limit;

      const [paginatedVisits, countResult] = await Promise.all([
        buildQuery()
          .where(filterShopQuery ? and(baseWhere, eq(shops.name, filterShopQuery as string)) : baseWhere)
          .orderBy(desc(visits.visitedAt))
          .limit(limit)
          .offset(offset),
        db.select({ value: sql<number>`count(*)` })
          .from(visits)
          .innerJoin(shops, eq(visits.shopId, shops.id))
          .where(filterShopQuery ? and(baseWhere, eq(shops.name, filterShopQuery as string)) : baseWhere),
      ]);

      const totalCount = Number(countResult[0]?.value || 0);
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        visits: paginatedVisits,
        pagination: { totalCount, totalPages, currentPage: page, limit },
      });
    } else {
      const allVisits = await buildQuery()
        .where(filterShopQuery ? and(baseWhere, eq(shops.name, filterShopQuery as string)) : baseWhere)
        .orderBy(desc(visits.visitedAt));

      res.json(allVisits);
    }
  } catch (error) {
    console.error('Error fetching visits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Create Visit Check-In (Salesmen Only) ────────────────────────────
router.post(
  '/',
  authorize('salesman'),
  fieldGuard({
    salesman: { reject: ['id', 'tenantId', 'salesmanId', 'gpsVerified'] },
  }),
  validate(createVisitSchema),
  async (req: Request, res: Response): Promise<void> => {
  try {
    const { shopId, latitude, longitude, photoUrl, notes } = req.body;
    const tenantId = req.user!.tenantId;
    const salesmanId = req.user!.sub;

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

    let gpsVerified = false;
    if (targetShop.latitude && targetShop.longitude) {
      const shopLat = parseFloat(targetShop.latitude);
      const shopLon = parseFloat(targetShop.longitude);
      const distance = haversineDistance(latitude, longitude, shopLat, shopLon);
      gpsVerified = isWithinTolerance(distance, GPS_TOLERANCE_METERS);
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

    const newVisit = await db.query.visits.findFirst({ where: eq(visits.id, visitId) });

    await notifyAdmins(tenantId, 'New Check-in',
      `A salesman checked into ${targetShop.name}.`, 'new_visit', salesmanId);

    res.status(201).json(newVisit);
  } catch (error) {
    console.error('Error recording visit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

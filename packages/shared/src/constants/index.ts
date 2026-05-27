/** Maximum distance (in meters) between salesman GPS and shop GPS for a visit to be verified */
export const GPS_TOLERANCE_METERS = 50;

/** Number of hours a retailer has to cancel a salesman-placed order */
export const CANCELLATION_WINDOW_HOURS = 2;

/** Free tier limits */
export const FREE_TIER_LIMITS = {
  maxAdmins: 1,
  maxSalesmen: 2,
} as const;

/** JWT token expiry durations */
export const TOKEN_EXPIRY = {
  accessToken: '15m',
  refreshToken: '7d',
} as const;

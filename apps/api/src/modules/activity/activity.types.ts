/**
 * Closed set of activity types so the admin chart legend and aggregation
 * queries stay stable. Add new values here (and ideally a label in
 * ACTIVITY_LABELS below) before instrumenting a new call site.
 */
export const ACTIVITY_TYPES = [
  'auth.signin',
  'auth.signout',
  'auth.profile_updated',
  'auth.account_deleted',
  'search.created',
  'search.updated',
  'search.deleted',
  'search.run_now',
  'result.favorited',
  'result.unfavorited',
  'result.hidden',
  'alert.created',
  'alert.updated',
  'alert.deleted',
  'billing.checkout_started',
  'billing.portal_opened',
  'billing.cancel_requested',
  'billing.downgrade_scheduled',
  'billing.downgrade_canceled',
  'export.csv',
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  'auth.signin': 'Signed in',
  'auth.signout': 'Signed out',
  'auth.profile_updated': 'Updated profile',
  'auth.account_deleted': 'Deleted account',
  'search.created': 'Created search',
  'search.updated': 'Updated search',
  'search.deleted': 'Deleted search',
  'search.run_now': 'Ran search',
  'result.favorited': 'Favorited result',
  'result.unfavorited': 'Unfavorited result',
  'result.hidden': 'Hid result',
  'alert.created': 'Created alert',
  'alert.updated': 'Updated alert',
  'alert.deleted': 'Deleted alert',
  'billing.checkout_started': 'Started checkout',
  'billing.portal_opened': 'Opened billing portal',
  'billing.cancel_requested': 'Requested cancel',
  'billing.downgrade_scheduled': 'Scheduled downgrade',
  'billing.downgrade_canceled': 'Canceled downgrade',
  'export.csv': 'Exported CSV',
};

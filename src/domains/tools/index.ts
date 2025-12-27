/**
 * Tools Domain - Public API
 *
 * CANONICAL SOURCE: All tool operations MUST use this module.
 */

export {
  // Tool queries
  getToolById,
  getToolBySlug,
  getActiveTools,
  getFeaturedTools,
  getToolsByCategory,
  getToolsByVendor,
  // Tool mutations
  createTool,
  updateTool,
  // Statistics
  countPayingUsers,
  batchCountPayingUsers,
  isPayingUser,
  countActiveSubscriptions,
  getToolWithStats,
  // User subscriptions
  getUserToolSubscription,
  getUserSubscriptions,
  getUserActiveSubscriptions,
  hasToolAccess,
  // Subscription management
  cancelSubscription,
  // Types
  type Tool,
  type ToolWithStats,
  type ToolSubscription,
} from './service';

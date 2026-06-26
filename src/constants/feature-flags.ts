/**
 * Feature flags configuration
 * Controls the visibility and availability of certain features
 */

// Enable AI API features - default to false if not configured
export const ENABLE_AI_API_FEATURES = import.meta.env.VITE_ENABLE_AI_API_FEATURES === 'true'

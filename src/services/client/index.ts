/**
 * Client-Side Services Index
 * 
 * Exports all client-side services that can be used in the browser.
 * These services communicate with API endpoints instead of directly accessing the database.
 */

export { zoomAccountServiceClient } from '../zoom-account-service-client'
export { settingsIntegrationServiceClient } from '../settings-integration-service-client'
export { enhancedConflictDetectionClient } from '../enhanced-conflict-detection-client'

// Re-export types for convenience
export type {
    ZoomAccountService,
    ZoomAccountInfo,
    ZoomCapacityResult,
    AccountLoadInfo,
    SettingsIntegrationService,
    SettingsChangeEvent,
    ConflictNotification,
    CapacityUpdateEvent,
    ConflictDetectionEngine,
    ConflictResult,
    MeetingFormData
} from '@/types/conflict-detection'
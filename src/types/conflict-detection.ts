/**
 * Enhanced Conflict Detection Types and Interfaces
 *
 * This file defines TypeScript interfaces for the enhanced conflict detection system
 * that handles different meeting types and resource constraints.
 */

// Meeting Type Enums
export enum MeetingType {
  OFFLINE = 'offline',
  HYBRID = 'hybrid',
  ONLINE = 'online',
}

export enum ConflictType {
  ROOM_CONFLICT = 'room_conflict',
  ZOOM_CAPACITY = 'zoom_capacity',
  MISSING_ROOM = 'missing_room',
  INVALID_TYPE = 'invalid_type',
  OVERLAP = 'overlap',
}

export enum ConflictSeverity {
  ERROR = 'error',
  WARNING = 'warning',
}

export enum SuggestionType {
  TIME_CHANGE = 'time_change',
  ROOM_CHANGE = 'room_change',
  TYPE_CHANGE = 'type_change',
}

// Core Conflict Detection Interfaces
export interface ConflictInfo {
  type: ConflictType
  severity: ConflictSeverity
  message: string
  affectedResource?: string
  conflictingMeetings?: ConflictingMeeting[]
  suggestions?: string[]
}

export interface ConflictingMeeting {
  title: string
  time: string
  participants: string[]
  room?: string
  zoomAccount?: string
}

export interface ConflictResult {
  conflicts: ConflictInfo[]
  canSubmit: boolean
  suggestions: ConflictSuggestion[]
}

export interface ConflictSuggestion {
  id: string
  type: SuggestionType
  description: string
  action: SuggestionAction
  priority: number
}

export interface SuggestionAction {
  field: keyof MeetingFormData
  value: any
  additionalChanges?: Partial<MeetingFormData>
}

// Meeting Form Data Interface
export interface MeetingFormData {
  title: string
  date: Date
  time: string
  duration: number
  meetingType: MeetingType
  isZoomMeeting: boolean
  meetingRoomId?: string
  participants: string[]
  description?: string
  zoomPassword?: string
}

// Meeting Type Configuration
export interface MeetingTypeConfig {
  requiresRoom: boolean
  requiresZoom: boolean
  allowsHybrid: boolean
  validationRules: ValidationRule[]
}

export interface ValidationRule {
  id: string
  name: string
  description: string
  validator: (data: MeetingFormData) => ValidationResult
  severity: ConflictSeverity
}

export interface ValidationResult {
  isValid: boolean
  conflicts: ConflictInfo[]
  requiredFields: string[]
}

// Zoom Account Management Interfaces
export interface ZoomAccountInfo {
  id: string
  email: string
  isActive: boolean
  maxConcurrentMeetings: number // e.g., 2 meetings per account
  maxParticipants: number // e.g., 1000 participants per meeting
  currentActiveMeetings: number
  scheduledMeetings: ScheduledMeeting[]
}

export interface ScheduledMeeting {
  id: string
  title: string
  startTime: Date
  endTime: Date
  participants: string[]
  zoomAccountId: string
}

export interface ZoomCapacityResult {
  hasAvailableAccount: boolean
  totalAccounts: number
  totalMaxConcurrent: number // sum of all accounts' concurrent limits
  currentTotalUsage: number
  availableSlots: number
  suggestedAccount?: ZoomAccountInfo
  conflictingMeetings: ScheduledMeeting[]
}

export interface AccountLoadInfo {
  accountId: string
  currentLoad: number
  maxCapacity: number
  utilizationPercentage: number
}

// Room Availability Interfaces
export interface RoomAvailabilityResult {
  isAvailable: boolean
  conflictingMeetings: ScheduledMeeting[]
  alternativeRooms: MeetingRoomInfo[]
}

export interface MeetingRoomInfo {
  id: string
  name: string
  capacity: number
  isActive: boolean
  equipment: string[]
  location?: string
}

export interface TimeSlot {
  startTime: Date
  endTime: Date
  availabilityScore: number
  availableRooms: MeetingRoomInfo[]
  availableZoomAccounts: ZoomAccountInfo[]
}

// Service Interfaces
export interface ConflictDetectionEngine {
  validateMeeting(meetingData: MeetingFormData): Promise<ConflictResult>
  subscribeToChanges(callback: (conflicts: ConflictInfo[]) => void): void
  updateCapacityLimits(zoomCredentials: ZoomAccountInfo[]): void
  unsubscribe(): void
}

export interface MeetingTypeValidator {
  validateOfflineMeeting(data: MeetingFormData): ValidationResult
  validateHybridMeeting(data: MeetingFormData): ValidationResult
  validateOnlineMeeting(data: MeetingFormData): ValidationResult
  validateMeetingType(data: MeetingFormData): ValidationResult
}

export interface RoomAvailabilityService {
  checkRoomAvailability(
    roomId: string,
    startTime: Date,
    endTime: Date,
    excludeMeetingId?: string,
  ): Promise<RoomAvailabilityResult>

  findAvailableRooms(startTime: Date, endTime: Date): Promise<MeetingRoomInfo[]>

  getRoomConflicts(
    roomId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<ScheduledMeeting[]>
}

export interface ZoomAccountService {
  getAvailableAccounts(): Promise<ZoomAccountInfo[]>
  checkConcurrentMeetingCapacity(
    startTime: Date,
    endTime: Date,
    excludeMeetingId?: string,
  ): Promise<ZoomCapacityResult>

  findAvailableAccount(
    startTime: Date,
    endTime: Date,
  ): Promise<ZoomAccountInfo | null>

  getAccountLoadBalancing(): Promise<AccountLoadInfo[]>
  updateAccountCapacity(accountId: string, capacity: number): Promise<void>
}

export interface ConflictResolutionService {
  generateSuggestions(conflicts: ConflictInfo[]): ConflictSuggestion[]
  applySuggestion(suggestion: ConflictSuggestion): Partial<MeetingFormData>
  prioritizeSuggestions(suggestions: ConflictSuggestion[]): ConflictSuggestion[]
}

// Error Handling
export class ConflictDetectionError extends Error {
  constructor(
    message: string,
    public type: 'validation' | 'resource' | 'network',
    public recoverable: boolean = true,
  ) {
    super(message)
    this.name = 'ConflictDetectionError'
  }
}

export interface ErrorRecoveryStrategy {
  canRecover(error: ConflictDetectionError): boolean
  recover(error: ConflictDetectionError): Promise<ConflictResult>
}

// Cache Interfaces
export interface ConflictCache {
  roomAvailability: Map<string, RoomAvailabilityResult>
  zoomCapacity: ZoomCapacityResult | null
  meetingData: Map<string, ScheduledMeeting>
  ttl: number
  lastUpdated: Date
}

export interface CacheEntry<T> {
  data: T
  timestamp: Date
  ttl: number
}

// Configuration Types
export interface ConflictDetectionConfig {
  enableRealTimeValidation: boolean
  validationDebounceMs: number
  cacheTimeoutMs: number
  maxSuggestions: number
  enableLoadBalancing: boolean
  strictRoomValidation: boolean
}

// Event Types for Real-time Updates
export interface ConflictDetectionEvent {
  type:
    | 'conflict_detected'
    | 'conflict_resolved'
    | 'capacity_updated'
    | 'room_availability_changed'
  payload: any
  timestamp: Date
}

export interface ConflictSubscription {
  id: string
  callback: (event: ConflictDetectionEvent) => void
  filters?: ConflictType[]
}

// Utility Types
export type ConflictDetectionState = {
  isValidating: boolean
  lastValidation: Date | null
  currentConflicts: ConflictInfo[]
  availableCapacity: {
    rooms: number
    zoomAccounts: number
  }
}

export type MeetingConstraints = {
  requiresPhysicalRoom: boolean
  requiresZoomAccount: boolean
  maxParticipants?: number
  preferredRoomCapacity?: number
  timeConstraints?: {
    earliestStart: Date
    latestEnd: Date
  }
}

// Settings Integration Types
export enum ZoomAccountChangeType {
  ADDED = 'added',
  REMOVED = 'removed',
  UPDATED = 'updated',
}

export interface SettingsChangeEvent {
  type: 'zoom_accounts_changed' | 'app_settings_changed'
  timestamp: Date
  changeType: ZoomAccountChangeType
  affectedAccountId: string
  newAccountData?: any
  totalAccounts: number
}

export interface CapacityUpdateEvent {
  type: 'capacity_updated'
  timestamp: Date
  previousCapacity: number
  newCapacity: number
  addedAccounts: string[]
  removedAccounts: string[]
  totalAccounts: number
}

export interface ConflictNotification {
  id: string
  meetingId: string
  meetingTitle: string
  conflicts: ConflictInfo[]
  createdAt: Date
  isRead: boolean
  severity: 'error' | 'warning'
  message: string
}

export interface SettingsIntegrationService {
  initialize(): Promise<void>
  handleZoomAccountChange(
    changeType: ZoomAccountChangeType,
    accountId: string,
    accountData?: any,
  ): Promise<void>
  subscribeToSettingsChanges(
    callback: (event: SettingsChangeEvent) => void,
  ): string
  subscribeToCapacityUpdates(
    callback: (event: CapacityUpdateEvent) => void,
  ): string
  subscribeToConflictNotifications(
    callback: (notification: ConflictNotification) => void,
  ): string
  getNotificationQueue(): ConflictNotification[]
  clearNotificationQueue(): void
  markNotificationAsRead(notificationId: string): void
  forceRefresh(): Promise<void>
  getCapacityStatus(): Promise<{
    totalAccounts: number
    totalCapacity: number
    currentUsage: number
    availableSlots: number
    utilizationPercentage: number
  }>
}

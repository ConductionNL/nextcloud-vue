/**
 * TypeScript type definitions for OpenRegister entities and shared utilities.
 *
 * @example
 * // Import specific types
 * import type { TObject, TSchema, TRegister } from '@conduction/nextcloud-vue/src/types'
 *
 * // Import shared utilities
 * import type { TPaginated, TApiError, TQuota } from '@conduction/nextcloud-vue/src/types'
 */

// Shared utility types
export type {
	TPaginated,
	TEmptyPaginated,
	TQuota,
	TUsage,
	TEntityStats,
	TCrudAuthorization,
	TApiError,
	TObjectPath,
} from './shared'

// Core entity types
export type { TObject } from './object'
export type { TSchema, TSchemaConfiguration } from './schema'
export type { TRegister } from './register'
export type { TAuditTrail } from './auditTrail'
export type { TSource } from './source'
export type { TOrganisation, TOrganisationAuthorization } from './organisation'

// Sub-resource entity types
export type { TFile } from './file'
export type { TTask, TTaskPriority, TTaskStatus } from './task'
export type { TNotification, TNotificationType, TNotificationPriority } from './notification'

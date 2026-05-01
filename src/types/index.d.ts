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

// Manifest types (json-manifest-renderer capability)
export type {
	TManifest,
	TManifestMenuItem,
	TManifestMenuItemLeaf,
	TManifestPage,
	TPageType,
} from './manifest'

// Runtime exports from the store factory. The implementation is in
// `../store/createCrudStore.js`; its companion `createCrudStore.d.ts`
// provides full generic types (entity inference, feature-flag gating,
// extend merging with correct `this` typing). We re-export both the
// factory and its supporting types so consumers can `import type
// { BaseState, MergedActions, Features } from '@conduction/nextcloud-vue'`.
export { createCrudStore } from '../store/createCrudStore'
export type {
	Prettify,
	EntityClass,
	InferEntity,
	Features,
	LoadingState,
	ViewModeState,
	LoadingGetters,
	ViewModeGetters,
	ViewModeActions,
	BaseState,
	BaseActions,
	MergedActions,
	FullState,
	FullGetters,
	StoreThis,
	ExtendConfig,
	CrudConfig,
	CrudPlugin,
} from '../store/createCrudStore'

// Runtime store plugins. Each plugin is a factory returning a plugin definition
// consumed by `createCrudStore({ plugins: [...] })` or `createObjectStore`.
export { logsPlugin } from '../store/plugins/logs'

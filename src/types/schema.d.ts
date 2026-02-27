import type { TEntityStats } from './shared'

/**
 * OpenRegister Schema entity type.
 *
 * Defines the structure and validation rules for objects in a register.
 */
export interface TSchema {
	id?: string
	title: string
	version: string
	description: string
	summary: string
	required: string[]
	properties: Record<string, unknown>
	archive: Record<string, unknown>
	updated: string
	created: string
	slug: string
	configuration?: TSchemaConfiguration
	hardValidation: boolean
	maxDepth: number
	authorization?: Record<string, string[]>
	extend?: string
	stats?: TEntityStats
}

/** Schema configuration options. */
export interface TSchemaConfiguration {
	objectNameField?: string
	objectDescriptionField?: string
	objectSummaryField?: string
	objectImageField?: string
	allowFiles?: boolean
	allowedTags?: string[]
	unique?: boolean
	facetCacheTtl?: number
	autoPublish?: boolean
}

/**
 * Shared utility types used across OpenRegister entities.
 */

/** Standard paginated API response shape. */
export interface TPaginated<T = unknown> {
	results: T[]
	total: number
	page: number
	pages: number
	limit: number
	offset: number
}

/** Empty paginated response (used as initial state). */
export type TEmptyPaginated = TPaginated<never>

/** Resource quota limits. Used by registers, organisations, views, applications. */
export interface TQuota {
	storage?: number | null
	bandwidth?: number | null
	requests?: number | null
	users?: number | null
	groups?: number | null
}

/** Resource usage tracking. Mirrors TQuota but values are always numbers. */
export interface TUsage {
	storage?: number
	bandwidth?: number
	requests?: number
	users?: number
	groups?: number
}

/** Aggregate statistics for objects, logs, and files. Used by schemas and registers. */
export interface TEntityStats {
	objects: {
		total: number
		size: number
		invalid: number
		deleted: number
		locked: number
		published: number
	}
	logs: {
		total: number
		size: number
	}
	files: {
		total: number
		size: number
	}
}

/** CRUD authorization configuration per entity type. */
export interface TCrudAuthorization {
	create?: string[]
	read?: string[]
	update?: string[]
	delete?: string[]
}

/** Unified API error shape returned by all store actions. */
export interface TApiError {
	status: number | null
	message: string
	details: unknown | null
	isValidation: boolean
	fields: Record<string, string> | null
	toString(): string
}

/** Object path reference for routing. */
export interface TObjectPath {
	register: string
	schema: string
	objectId?: string
}

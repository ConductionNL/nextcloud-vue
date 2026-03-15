import type { TQuota, TUsage, TEntityStats } from './shared'

/**
 * OpenRegister Register entity type.
 *
 * A register is a collection of schemas and their objects, backed by a data source.
 */
export interface TRegister {
	id?: string
	title: string
	description: string
	schemas: string[]
	source: string
	databaseId: string
	published?: string | null
	depublished?: string | null
	tablePrefix?: string
	updated?: string
	created: string
	slug: string
	groups?: string[]
	quota?: TQuota
	usage?: TUsage
	stats?: TEntityStats
}

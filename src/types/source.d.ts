/**
 * OpenRegister Source entity type.
 *
 * A data source backing a register (database connection).
 */
export interface TSource {
	id?: string | number
	title: string
	description: string
	databaseUrl: string
	type: 'internal' | 'mongodb'
	updated: string
	created: string
}

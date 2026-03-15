import type { TQuota, TUsage, TCrudAuthorization } from './shared'

/**
 * OpenRegister Organisation entity type.
 *
 * Organisations group users and control access to registers, schemas, and objects.
 */
export interface TOrganisation {
	id?: number
	uuid?: string
	name: string
	slug?: string
	description?: string
	users?: string[]
	groups?: string[]
	isDefault?: boolean
	active?: boolean
	owner?: string
	parent?: string | null
	children?: string[]
	quota?: TQuota
	usage?: TUsage
	authorization?: TOrganisationAuthorization
	created?: string
	updated?: string
}

/** Organisation-level authorization with per-entity-type CRUD + special permissions. */
export interface TOrganisationAuthorization {
	register?: TCrudAuthorization
	schema?: TCrudAuthorization
	object?: TCrudAuthorization
	view?: TCrudAuthorization
	agent?: TCrudAuthorization
	configuration?: TCrudAuthorization
	application?: TCrudAuthorization
	object_publish?: string[]
	agent_use?: string[]
	dashboard_view?: string[]
	llm_use?: string[]
}

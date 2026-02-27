/**
 * OpenRegister Object entity type.
 *
 * An object is the core data entity stored in a register under a schema.
 * The `@self` key contains system metadata, while other keys are schema properties.
 */
export interface TObject {
	'@self': {
		id: string
		name: string | null
		description: string | null
		uuid: string
		uri: string
		version: string | null
		register: string
		schema: string
		schemaVersion: string | null
		relations: string | unknown[] | null
		files: string | unknown[] | null
		folder: string | null
		textRepresentation: string | null
		locked: unknown[] | null
		owner: string | null
		authorization: unknown[] | null
		application: string | null
		organisation: string | null
		groups: unknown[] | null
		validation: unknown[] | null
		deleted: unknown[] | null
		geo: unknown[] | null
		retention: unknown[] | null
		size: string | null
		updated: string
		created: string
		published: string | null
		depublished: string | null
	}
	/** Schema-defined properties (dynamic keys). */
	[key: string]: unknown
}

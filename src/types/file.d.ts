/**
 * OpenRegister File entity type.
 *
 * Represents a file attached to an object. Files are stored in Nextcloud's
 * file system and referenced by the object's files sub-resource.
 */
export interface TFile {
	id: string | number
	uuid?: string
	name: string
	mimeType: string
	size: number
	path?: string
	url?: string
	downloadUrl?: string
	shareUrl?: string | null
	tags?: string[]
	published?: string | null
	depublished?: string | null
	owner?: string
	created: string
	updated?: string
}

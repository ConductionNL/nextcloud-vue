/**
 * Standard OpenRegister metadata columns.
 *
 * These system fields exist on every OpenRegister object. Used by
 * CnIndexSidebar to auto-generate the "Metadata" column group.
 */
export const METADATA_COLUMNS = [
	{ key: 'name', label: 'Name' },
	{ key: 'description', label: 'Description' },
	{ key: 'id', label: 'ID' },
	{ key: 'uri', label: 'URI' },
	{ key: 'version', label: 'Version' },
	{ key: 'register', label: 'Register' },
	{ key: 'schema', label: 'Schema' },
	{ key: 'files', label: 'Files' },
	{ key: 'locked', label: 'Locked' },
	{ key: 'organization', label: 'Organization' },
	{ key: 'validation', label: 'Validation' },
	{ key: 'owner', label: 'Owner' },
	{ key: 'application', label: 'Application' },
	{ key: 'folder', label: 'Folder' },
	{ key: 'geo', label: 'Geo' },
	{ key: 'retention', label: 'Retention' },
	{ key: 'size', label: 'Size' },
	{ key: 'published', label: 'Published' },
	{ key: 'depublished', label: 'Depublished' },
	{ key: 'deleted', label: 'Deleted' },
	{ key: 'created', label: 'Created' },
	{ key: 'updated', label: 'Updated' },
]

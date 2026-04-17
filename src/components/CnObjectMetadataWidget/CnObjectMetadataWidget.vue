<!--
  CnObjectMetadataWidget — Read-only metadata display widget.

  Shows system/internal metadata for an OpenRegister object in a horizontal
  label-value grid. Automatically extracts known metadata fields from the object
  (id, uuid, uri, register, schema, created, updated, owner, etc.).

  Not editable — purely informational. Wraps CnDetailCard + CnDetailGrid.
-->
<template>
	<CnDetailCard :title="title"
		:icon="iconComponent"
		:collapsible="collapsible"
		:collapsed="collapsed">
		<template #actions>
			<slot name="actions" />
		</template>

		<CnDetailGrid
			:items="metadataItems"
			:layout="layout"
			:columns="columns"
			:label-width="labelWidth"
			:accent="false"
			:empty-label="emptyLabel" />
	</CnDetailCard>
</template>

<script>
import { CnDetailCard } from '../CnDetailCard/index.js'
import { CnDetailGrid } from '../CnDetailGrid/index.js'

/**
 * Known metadata fields and their labels.
 * These are the standard fields from OpenRegister's @self / system fields.
 */
const METADATA_FIELDS = [
	{ key: 'id', label: 'ID' },
	{ key: 'uuid', label: 'UUID' },
	{ key: 'uri', label: 'URI' },
	{ key: 'register', label: 'Register' },
	{ key: 'schema', label: 'Schema' },
	{ key: 'status', label: 'Status' },
	{ key: 'owner', label: 'Owner' },
	{ key: 'organization', label: 'Organization' },
	{ key: 'created', label: 'Created', format: 'date-time' },
	{ key: 'updated', label: 'Updated', format: 'date-time' },
	{ key: 'folder', label: 'Folder' },
	{ key: 'textRepresentation', label: 'Text Representation' },
	{ key: 'locked', label: 'Locked' },
	{ key: 'version', label: 'Version' },
]

/**
 * CnObjectMetadataWidget — Read-only metadata display widget.
 *
 * Automatically extracts and formats metadata from an OpenRegister object.
 * Understands both flat objects (where metadata is at the top level) and
 * objects with a `@self` metadata block.
 *
 * @example Basic usage
 * <CnObjectMetadataWidget :object-data="publication" />
 *
 * @example With extra items
 * <CnObjectMetadataWidget
 *   title="System Info"
 *   :object-data="entity"
 *   :extra-items="[
 *     { label: 'Source', value: entity.source },
 *     { label: 'Catalog', value: entity.catalog },
 *   ]" />
 *
 * @example Selective display
 * <CnObjectMetadataWidget
 *   :object-data="entity"
 *   :include="['id', 'uuid', 'created', 'updated', 'owner']" />
 */
export default {
	name: 'CnObjectMetadataWidget',

	components: {
		CnDetailCard,
		CnDetailGrid,
	},

	props: {
		/** Widget title shown in the card header */
		title: {
			type: String,
			default: 'Metadata',
		},
		/** Optional MDI icon component for the header */
		icon: {
			type: [Object, Function],
			default: null,
		},
		/**
		 * The object data containing metadata.
		 * Supports flat objects and objects with `@self` metadata block.
		 */
		objectData: {
			type: Object,
			required: true,
		},
		/**
		 * Layout mode for the grid: 'grid' or 'horizontal'.
		 */
		layout: {
			type: String,
			default: 'horizontal',
		},
		/**
		 * Number of grid columns (only for layout='grid').
		 */
		columns: {
			type: Number,
			default: 0,
		},
		/**
		 * Min width for labels in horizontal layout.
		 */
		labelWidth: {
			type: Number,
			default: 150,
		},
		/**
		 * Additional metadata items to display.
		 * @type {Array<{ label: string, value: string|number }>}
		 */
		extraItems: {
			type: Array,
			default: () => [],
		},
		/**
		 * Metadata fields to include (whitelist). If null, all available are shown.
		 * @type {string[]|null}
		 */
		include: {
			type: Array,
			default: null,
		},
		/**
		 * Metadata fields to exclude.
		 * @type {string[]}
		 */
		exclude: {
			type: Array,
			default: () => [],
		},
		/** Whether the card can be collapsed */
		collapsible: {
			type: Boolean,
			default: false,
		},
		/** Initial collapsed state */
		collapsed: {
			type: Boolean,
			default: false,
		},
		/** Label shown when no metadata available */
		emptyLabel: {
			type: String,
			default: 'No metadata available',
		},
	},

	computed: {
		iconComponent() {
			return this.icon
		},

		/**
		 * Merged metadata source: combines @self block with top-level fields.
		 * @self fields take priority over top-level for shared keys.
		 */
		metadataSource() {
			const selfBlock = this.objectData['@self'] || {}
			return { ...this.objectData, ...selfBlock }
		},

		/**
		 * Build the items array for CnDetailGrid from known metadata fields.
		 */
		metadataItems() {
			const source = this.metadataSource
			const items = []

			for (const def of METADATA_FIELDS) {
				// Filter by include/exclude
				if (this.include && !this.include.includes(def.key)) continue
				if (this.exclude.includes(def.key)) continue

				const raw = source[def.key]
				if (raw === undefined || raw === null) continue

				items.push({
					label: def.label,
					value: this.formatMetadataValue(raw, def),
				})
			}

			// Append extra items
			for (const item of this.extraItems) {
				items.push(item)
			}

			return items
		},
	},

	methods: {
		/**
		 * Format a metadata value for display.
		 * @param value
		 * @param def
		 */
		formatMetadataValue(value, def) {
			if (value === null || value === undefined) return '-'

			// Date-time formatting
			if (def.format === 'date-time') {
				try {
					const date = new Date(value)
					if (Number.isNaN(date.getTime())) return String(value)
					return date.toLocaleDateString(undefined, {
						day: '2-digit',
						month: '2-digit',
						year: 'numeric',
					}) + ', ' + date.toLocaleTimeString(undefined, {
						hour: '2-digit',
						minute: '2-digit',
						second: '2-digit',
					})
				} catch {
					return String(value)
				}
			}

			// Booleans
			if (typeof value === 'boolean') {
				return value ? 'Yes' : 'No'
			}

			// Arrays
			if (Array.isArray(value)) {
				return value.length > 0 ? value.join(', ') : '-'
			}

			// Objects — show as JSON snippet
			if (typeof value === 'object') {
				return JSON.stringify(value)
			}

			return String(value)
		},
	},
}
</script>

<style scoped>
/* Override CnDetailGrid item styling for a compact table-like appearance */
:deep(.cn-detail-grid__item) {
	background: none;
	border-radius: 0;
	border-bottom: 1px solid var(--color-border);
	padding: calc(1.5 * var(--default-grid-baseline, 4px)) 0;
}

:deep(.cn-detail-grid__item:last-child) {
	border-bottom: none;
}

:deep(.cn-detail-grid--horizontal) {
	gap: 0;
}

:deep(.cn-detail-grid__label) {
	font-size: 0.8em;
	text-transform: uppercase;
	letter-spacing: 0.02em;
}

:deep(.cn-detail-grid__value) {
	font-size: 0.9em;
	word-break: break-all;
	margin: 0;
}
</style>

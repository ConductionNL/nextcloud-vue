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
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
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
	{ key: 'schemaVersion', label: 'Schema version' },
	{ key: 'version', label: 'Version' },
	{ key: 'status', label: 'Status' },
	{ key: 'owner', label: 'Owner' },
	{ key: 'organisation', label: 'Organisation' },
	{ key: 'organization', label: 'Organization' },
	{ key: 'created', label: 'Created', format: 'date-time' },
	{ key: 'updated', label: 'Updated', format: 'date-time' },
	{ key: 'folder', label: 'Folder' },
	{ key: 'textRepresentation', label: 'Text Representation' },
	{ key: 'locked', label: 'Locked', format: 'lock' },
]

/**
 * The archival constraints, read from the resolved `@self._retention` decision.
 *
 * Kept as its own list rather than appended to METADATA_FIELDS because the keys
 * live one level down, under `_retention`, and because they are a group a
 * reader looks at together: what happens to this record, when, and on whose
 * authority. `include` / `exclude` address them by the same names, so a host
 * can ask for `['nomination', 'actionDate']` and get just those.
 *
 * These are empty on an object whose schema declares no archival obligation,
 * and that is a real answer rather than a gap — see `emptyLabel`.
 */
const ARCHIVAL_FIELDS = [
	{ key: 'nomination', label: 'Archival action', format: 'nomination' },
	{ key: 'period', label: 'Retention period', format: 'duration' },
	{ key: 'actionDate', label: 'Archive action date', format: 'date' },
	{ key: 'status', label: 'Archival status' },
	{ key: 'classification', label: 'Selection list category' },
	{ key: 'basis', label: 'Basis', format: 'basis' },
	{ key: 'source', label: 'Source' },
	{ key: 'legalHold', label: 'Legal hold', format: 'legal-hold' },
]

/**
 * CnObjectMetadataWidget — Read-only metadata display widget.
 *
 * Automatically extracts and formats metadata from an OpenRegister object.
 * Understands both flat objects (where metadata is at the top level) and
 * objects with a `@self` metadata block.
 *
 * Basic usage
 * ```vue
 * <CnObjectMetadataWidget :object-data="publication" />
 * ```
 *
 * With extra items
 * ```vue
 * <CnObjectMetadataWidget
 *   title="System Info"
 *   :object-data="entity"
 *   :extra-items="[
 *     { label: 'Source', value: entity.source },
 *     { label: 'Catalog', value: entity.catalog },
 *   ]" />
 * ```
 *
 * Selective display
 * ```vue
 * <CnObjectMetadataWidget
 *   :object-data="entity"
 *   :include="['id', 'uuid', 'created', 'updated', 'owner']" />
 * ```
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
			default: () => t('nextcloud-vue', 'Metadata'),
		},
		/** Optional MDI icon component for the header */
		icon: {
			type: [Object, Function],
			default: null,
		},
		/**
		 * The object data containing metadata.
		 * Supports flat objects and objects with `@self` metadata block.
		 * Optional: null renders the empty state (and avoids a required-prop
		 * warning on surfaces that mount before the object loads, e.g. a
		 * `metadata` tab in CnObjectSidebar). Handled internally via
		 * `this.objectData || {}`.
		 *
		 * @type {object|null}
		 */
		objectData: {
			type: Object,
			default: null,
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
			default: () => t('nextcloud-vue', 'No metadata available'),
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
			// objectData is optional (and momentarily null during async loads or
			// when a parent binds a not-yet-resolved object), so guard before
			// reading `@self` to avoid a render-time TypeError.
			const data = this.objectData || {}
			const selfBlock = data['@self']

			// 🔴 WHEN THERE IS A `@self` BLOCK, IT IS THE ONLY METADATA SOURCE.
			//
			// This used to merge `{ ...data, ...selfBlock }`, which meant any
			// BUSINESS property sharing a name with a metadata field leaked into
			// the metadata list. Measured on a dossiq case: the panel reported
			// `STATUS active` — the case's own workflow status, a schema
			// property — while the page header beside it read `Unknown`, because
			// the two were reading different things and only one of them was
			// metadata. `version`, `owner`, `folder` and `locked` are all
			// perfectly ordinary property names and had the same exposure.
			//
			// A record WITHOUT a `@self` block is a different case: several
			// widget props pass a pre-flattened metadata object, and for those
			// the top level genuinely is the metadata. `id` is carried over
			// either way because the API mirrors it to the top level.
			if (selfBlock && typeof selfBlock === 'object') {
				const carried = {}
				if (data.id !== undefined && selfBlock.id === undefined) carried.id = data.id
				return { ...carried, ...selfBlock }
			}

			return { ...data }
		},

		/**
		 * The resolved archival decision, or an empty object.
		 *
		 * Read from `@self._retention`, which OpenRegister's render layer fills
		 * by merging the object's stored retention block, its schema's
		 * `x-openregister-archival` evaluation and any legal hold. It is absent
		 * entirely — not empty — on an object with no archival obligation, and
		 * that distinction is deliberate on the server side, so it is preserved
		 * here rather than defaulted into a row of dashes.
		 */
		archivalSource() {
			const block = this.metadataSource._retention
			if (!block || typeof block !== 'object') return {}
			return block
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

			// The archival group, read one level down from `@self._retention`.
			// Appended after the identity fields rather than interleaved: what
			// happens to a record and when is a question of its own, and a
			// records officer reads the group, not one line of it.
			const archival = this.archivalSource
			for (const def of ARCHIVAL_FIELDS) {
				if (this.include && !this.include.includes(def.key)) continue
				if (this.exclude.includes(def.key)) continue

				const raw = archival[def.key]
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
		 * @param {*} value - The raw metadata value.
		 * @param {object} def - The metadata field definition (format, label, etc.).
		 */
		formatMetadataValue(value, def) {
			if (value === null || value === undefined) return '-'

			// The lock is an object (`{ user, displayName, expiresAt }`) and used
			// to reach the panel as raw JSON, which reads as debug output rather
			// than as the one fact that matters: who is holding this, and until
			// when.
			if (def.format === 'lock') {
				return this.formatLock(value)
			}

			// Archival formats. Each turns a stored code into the phrase an
			// archivist would say, and each falls back to the raw value rather
			// than hiding a code it has not been taught — an unrecognised
			// nomination is still a records obligation.
			if (def.format === 'nomination') {
				return this.formatNomination(value)
			}

			if (def.format === 'duration') {
				return this.formatDuration(value)
			}

			if (def.format === 'basis') {
				return this.formatBasis(value)
			}

			if (def.format === 'legal-hold') {
				return this.formatLegalHold(value)
			}

			if (def.format === 'date') {
				const date = new Date(value)
				if (Number.isNaN(date.getTime())) return String(value)
				return date.toLocaleDateString(undefined, {
					day: '2-digit',
					month: '2-digit',
					year: 'numeric',
				})
			}

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

		/**
		 * Render a lock as a sentence rather than as its JSON.
		 *
		 * @param {object} lock - The `@self.locked` payload.
		 * @return {string} Who holds it, and until when.
		 */
		formatLock(lock) {
			if (typeof lock !== 'object') return String(lock)
			const holder = lock.displayName || lock.user
			const until = lock.expiresAt ? new Date(lock.expiresAt) : null
			const hasUntil = until && !Number.isNaN(until.getTime())

			if (holder && hasUntil) {
				return t('nextcloud-vue', 'Locked by {user} until {date}', {
					user: holder,
					date: until.toLocaleString(),
				})
			}

			if (holder) {
				return t('nextcloud-vue', 'Locked by {user}', { user: holder })
			}

			return t('nextcloud-vue', 'Locked')
		},

		/**
		 * Name what is going to happen to the record.
		 *
		 * @param {string} value - The stored nomination.
		 * @return {string} The phrase, or the raw code when unrecognised.
		 */
		formatNomination(value) {
			const known = {
				blijvend_bewaren: t('nextcloud-vue', 'Keep permanently'),
				vernietigen: t('nextcloud-vue', 'Destroy'),
				nog_niet_bepaald: t('nextcloud-vue', 'Not yet determined'),
			}
			return known[value] || String(value)
		},

		/**
		 * Turn an ISO-8601 duration into something readable.
		 *
		 * Deliberately handles only the whole-year / whole-month / whole-day
		 * forms a retention period is actually written in (`P10Y`, `P6M`,
		 * `P30D`). Anything else is returned as-is rather than parsed
		 * half-correctly, because a retention period rendered wrong is worse
		 * than one rendered raw.
		 *
		 * @param {string} value - The ISO-8601 duration.
		 * @return {string} The readable period, or the raw duration.
		 */
		formatDuration(value) {
			const match = /^P(\d+)([YMD])$/.exec(String(value))
			if (!match) return String(value)

			const amount = Number(match[1])
			if (match[2] === 'Y') return n('nextcloud-vue', '%n year', '%n years', amount)
			if (match[2] === 'M') return n('nextcloud-vue', '%n month', '%n months', amount)
			return n('nextcloud-vue', '%n day', '%n days', amount)
		},

		/**
		 * Say on whose authority the retention period rests.
		 *
		 * @param {string} value - The basis code.
		 * @return {string} The phrase, or the raw code.
		 */
		formatBasis(value) {
			const known = {
				selectielijst: t('nextcloud-vue', 'Selection list'),
				schema: t('nextcloud-vue', 'Schema archive settings'),
				annotation: t('nextcloud-vue', 'Schema archival annotation'),
			}
			return known[value] || String(value)
		},

		/**
		 * Render the legal-hold state.
		 *
		 * A released hold still reports itself: "held once and released" is a
		 * different fact from "never held", and an archivist reads the
		 * difference.
		 *
		 * @param {object} hold - The resolved hold state.
		 * @return {string} The hold sentence.
		 */
		formatLegalHold(hold) {
			if (typeof hold !== 'object') return String(hold)

			if (hold.active) {
				if (hold.reason) {
					return t('nextcloud-vue', 'On hold: {reason}', { reason: hold.reason })
				}
				return t('nextcloud-vue', 'On hold')
			}

			if (hold.releasedCount) {
				return n('nextcloud-vue', 'Released, %n earlier hold', 'Released, %n earlier holds', hold.releasedCount)
			}

			return t('nextcloud-vue', 'No hold')
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

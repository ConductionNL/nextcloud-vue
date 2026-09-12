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

		<!-- Grouped: one grid per category, each under its own heading. A flat
		     list of twenty rows is a wall; Identity / Location / Ownership /
		     Lifecycle / Archiving is how a reader actually looks for one fact.
		     `grouped: false` restores the single flat grid for hosts that want
		     the old shape. -->
		<template v-if="grouped && groupedItems.length > 0">
			<div
				v-for="group in groupedItems"
				:key="group.key"
				class="cn-object-metadata__group">
				<h4 class="cn-object-metadata__group-title">
					{{ group.label }}
				</h4>
				<CnDetailGrid
					:items="group.items"
					:layout="layout"
					:columns="columns"
					:labelWidth="labelWidth"
					:accent="false"
					:emptyLabel="emptyLabel" />
			</div>
		</template>

		<!-- One flat grid: either because grouping is off, or because there is
		     nothing to group and CnDetailGrid already owns the empty state. -->
		<CnDetailGrid
			v-else
			:items="metadataItems"
			:layout="layout"
			:columns="columns"
			:labelWidth="labelWidth"
			:accent="false"
			:emptyLabel="emptyLabel" />
	</CnDetailCard>
</template>

<script>
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { CnDetailCard } from '../CnDetailCard/index.js'
import { CnDetailGrid } from '../CnDetailGrid/index.js'

/**
 * Known metadata fields and their labels.
 * These are the standard fields from OpenRegister's `@self` / system fields.
 */
const METADATA_FIELDS = [
	{ key: 'id', label: 'ID', group: 'identity' },
	{ key: 'uuid', label: 'UUID', group: 'identity' },
	{ key: 'uri', label: 'URI', group: 'identity' },
	{ key: 'version', label: 'Version', group: 'identity' },
	{ key: 'register', label: 'Register', group: 'location' },
	{ key: 'schema', label: 'Schema', group: 'location' },
	{ key: 'schemaVersion', label: 'Schema version', group: 'location' },
	{ key: 'folder', label: 'Folder', group: 'location', format: 'folder' },
	{ key: 'owner', label: 'Owner', group: 'ownership' },
	{ key: 'organisation', label: 'Organisation', group: 'ownership' },
	{ key: 'organization', label: 'Organization', group: 'ownership' },
	{ key: 'status', label: 'Status', group: 'lifecycle' },
	{ key: 'created', label: 'Created', group: 'lifecycle', format: 'date-time' },
	{ key: 'updated', label: 'Updated', group: 'lifecycle', format: 'date-time' },
	{ key: 'locked', label: 'Locked', group: 'lifecycle', format: 'lock' },
	{ key: 'textRepresentation', label: 'Text Representation', group: 'identity' },
]

/**
 * The archival constraints, read from the resolved `@self._retention` decision.
 *
 * 🔴 THESE KEYS ARE MDTO CONCEPTS IN ENGLISH, and they changed with
 * openregister#3584: `nomination` became `appraisal`, `period` became
 * `retentionPeriod`, `actionDate` became `disposalDate`, `classification`
 * became `disposalCategory`, and the Archiefwet lifecycle arrived as
 * `recordState` with a derived `immutable`. MDTO supersedes TMLO, so
 * `archiefnominatie` is the superseded spelling of MDTO's `waardering`.
 *
 * They live one level down, under `_retention`, and `include` / `exclude`
 * address them by these same names.
 *
 * Two of the resolver's keys are deliberately not rows here. `immutable` is
 * derived from `recordState` and would only repeat what "Transferred to
 * archive" already says, and `annotation` is the raw rule-evaluation object
 * kept for debugging, which would land in the panel as JSON.
 *
 * Empty on an object whose schema declares no archival obligation, and that is
 * a real answer rather than a gap — see `emptyLabel`.
 */
const ARCHIVAL_FIELDS = [
	{ key: 'appraisal', label: 'Appraisal', group: 'archiving', format: 'appraisal', core: true },
	{ key: 'retentionPeriod', label: 'Retention period', group: 'archiving', format: 'duration', core: true },
	{ key: 'disposalDate', label: 'Disposal date', group: 'archiving', format: 'date', core: true },
	{ key: 'recordState', label: 'Record state', group: 'archiving', format: 'record-state', core: true },
	{ key: 'disposalCategory', label: 'Selection list category', group: 'archiving' },
	{ key: 'basis', label: 'Basis', group: 'archiving', format: 'basis' },
	{ key: 'source', label: 'Source', group: 'archiving' },
	// Which revision of the list, and when it was read (openregister#3588).
	// The same category carries different retention periods across revisions,
	// so a decision that names only the list cannot be defended once it moves.
	{ key: 'sourceVersion', label: 'Selection list version', group: 'archiving' },
	{ key: 'sourceConsultedAt', label: 'Consulted on', group: 'archiving', format: 'date' },
	{ key: 'legalHold', label: 'Legal hold', group: 'archiving', format: 'legal-hold' },
]

/**
 * The groups, in the order a reader works down them.
 *
 * Identity first (which record is this), then where it lives, who owns it, what
 * state it is in, and finally what happens to it. Archiving last because it is
 * the answer you go looking for rather than the one you scan past.
 */
const GROUPS = [
	{ key: 'identity', label: 'Identity' },
	{ key: 'location', label: 'Location' },
	{ key: 'ownership', label: 'Ownership' },
	{ key: 'lifecycle', label: 'Lifecycle' },
	{ key: 'archiving', label: 'Archiving' },
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
		 *
		 * @type {Array<{ label: string, value: string|number }>}
		 */
		extraItems: {
			type: Array,
			default: () => [],
		},

		/**
		 * Metadata fields to include (whitelist). If null, all available are shown.
		 *
		 * @type {string[]|null}
		 */
		include: {
			type: Array,
			default: null,
		},

		/**
		 * Metadata fields to exclude.
		 *
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

		/**
		 * Group the rows under category headings (Identity, Location,
		 * Ownership, Lifecycle, Archiving) instead of rendering one flat list.
		 *
		 * On by default: a flat list of twenty rows is a wall to read. Pass
		 * `false` for the previous single-grid shape.
		 *
		 * @type {boolean}
		 */
		grouped: {
			type: Boolean,
			default: true,
		},

		/**
		 * Heading for the items a host supplied through `extraItems`, which
		 * carry no group of their own.
		 *
		 * @type {string}
		 */
		otherLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Other'),
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
		 * Merged metadata source: combines the `@self` block with top-level fields.
		 *
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
				if (data.id !== undefined && selfBlock.id === undefined) {
					carried.id = data.id
				}
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
			if (!block || typeof block !== 'object') {
				return {}
			}
			return block
		},

		/**
		 * The same items, bucketed into the categories a reader scans.
		 *
		 * A group with nothing in it is dropped rather than rendered as an
		 * empty heading — an object with no archival obligation should not
		 * carry an "Archiving" heading over a void. `extraItems` carry no
		 * group, so they collect under the host's own heading at the end.
		 */
		groupedItems() {
			const byKey = new Map(GROUPS.map((g) => [g.key, { ...g, label: t('nextcloud-vue', g.label), items: [] }]))
			const ungrouped = []

			for (const item of this.metadataItems) {
				const bucket = item.group ? byKey.get(item.group) : null
				if (bucket) {
					bucket.items.push(item)
				} else {
					ungrouped.push(item)
				}
			}

			const groups = [...byKey.values()].filter((g) => g.items.length > 0)
			if (ungrouped.length > 0) {
				groups.push({ key: 'other', label: this.otherLabel, items: ungrouped })
			}

			return groups
		},

		/**
		 * Build the items array for CnDetailGrid from known metadata fields.
		 */
		metadataItems() {
			const source = this.metadataSource
			const items = []

			for (const def of METADATA_FIELDS) {
				// Filter by include/exclude
				if (this.include && !this.include.includes(def.key)) {
					continue
				}
				if (this.exclude.includes(def.key)) {
					continue
				}

				const raw = source[def.key]
				if (raw === undefined || raw === null) {
					continue
				}

				items.push({
					// Translated at use, not at import: the bundles register
					// after this module loads, and a label resolved at import
					// time would stay English for every reader.
					label: t('nextcloud-vue', def.label),
					value: this.formatMetadataValue(raw, def),
					group: def.group,
					href: this.hrefFor(raw, def),
				})
			}

			// The archival group, read one level down from `@self._retention`.
			// Appended after the identity fields rather than interleaved: what
			// happens to a record and when is a question of its own, and a
			// records officer reads the group, not one line of it.
			// nextcloud-vue#1062. When the object HAS an archival decision, an
			// absent core fact is itself the answer: a records officer reading
			// "Disposal date: -" learns there is no date yet, while a missing row
			// reads as a panel that never looked. So the four MDTO core rows
			// stay, blank, and so does any key a host named in `include`, which
			// is already the host saying "this row matters to me". Optional
			// provenance rows still only appear when they carry something.
			//
			// An object with NO decision keeps an empty Archiving group, which
			// the grouping drops entirely: "no archival obligation" and "an
			// obligation with a gap" are different answers and must look it.
			const archival = this.archivalSource
			const hasDecision = Object.keys(archival).length > 0
			for (const def of ARCHIVAL_FIELDS) {
				if (this.include && !this.include.includes(def.key)) {
					continue
				}
				if (this.exclude.includes(def.key)) {
					continue
				}

				const raw = archival[def.key]
				const absent = raw === undefined || raw === null
				if (absent && !(hasDecision && (def.core || this.include))) {
					continue
				}

				items.push({
					label: t('nextcloud-vue', def.label),
					value: this.formatMetadataValue(raw, def),
					group: def.group,
					empty: absent,
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
		 *
		 * @param {unknown} value - The raw metadata value.
		 * @param {object} def - The metadata field definition (format, label, etc.).
		 */
		formatMetadataValue(value, def) {
			if (value === null || value === undefined) {
				return '-'
			}

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
			// appraisal is still a records obligation.
			if (def.format === 'appraisal') {
				return this.formatAppraisal(value)
			}

			if (def.format === 'record-state') {
				return this.formatRecordState(value)
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
				if (Number.isNaN(date.getTime())) {
					return String(value)
				}
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
					if (Number.isNaN(date.getTime())) {
						return String(value)
					}
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
			if (typeof lock !== 'object') {
				return String(lock)
			}
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
		 * @param {string} value - The stored appraisal.
		 * @return {string} The phrase, or the raw code when unrecognised.
		 */
		formatAppraisal(value) {
			const known = {
				retain_permanently: t('nextcloud-vue', 'Keep permanently'),
				destroy: t('nextcloud-vue', 'Destroy'),
				not_yet_determined: t('nextcloud-vue', 'Not yet determined'),
			}
			return known[value] || String(value)
		},

		/**
		 * Name the record's place in the Archiefwet lifecycle.
		 *
		 * @param {string} value - The record state.
		 * @return {string} The phrase, or the raw value.
		 */
		formatRecordState(value) {
			const known = {
				active: t('nextcloud-vue', 'Active'),
				semi_static: t('nextcloud-vue', 'Semi-static'),
				transferred: t('nextcloud-vue', 'Transferred to archive'),
				destroyed: t('nextcloud-vue', 'Destroyed'),
			}
			return known[value] || String(value)
		},

		/**
		 * A Files deep-link for a folder held as a numeric node id.
		 *
		 * `@self.folder` is a string that is USUALLY a node id and sometimes a
		 * legacy path, so only the digit form gets a link — a path would produce
		 * a URL that 404s, which is worse than plain text.
		 *
		 * @param {unknown} raw - The raw metadata value.
		 * @param {object} def - The field definition.
		 * @return {string|null} The href, or null when it is not linkable.
		 */
		hrefFor(raw, def) {
			if (def.format !== 'folder') {
				return null
			}
			const id = String(raw).trim()
			if (!/^\d+$/.test(id)) {
				return null
			}
			return generateUrl('/apps/files/?fileid={id}&opendetails=true', { id })
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
			if (!match) {
				return String(value)
			}

			const amount = Number(match[1])
			if (match[2] === 'Y') {
				return n('nextcloud-vue', '%n year', '%n years', amount)
			}
			if (match[2] === 'M') {
				return n('nextcloud-vue', '%n month', '%n months', amount)
			}
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
				selection_list: t('nextcloud-vue', 'Selection list'),
				// Its own answer, not a variant of "schema": the schema expected
				// a selection list and none was consulted, which an operator who
				// believes one is configured needs to be told.
				selection_list_not_consulted: t('nextcloud-vue', 'Selection list not consulted'),
				schema: t('nextcloud-vue', 'Schema archive settings'),
				schema_annotation: t('nextcloud-vue', 'Schema archival annotation'),
				tmlo: t('nextcloud-vue', 'Record archival metadata'),
				record: t('nextcloud-vue', 'Recorded on the object'),
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
			if (typeof hold !== 'object') {
				return String(hold)
			}

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
/* Group headings. Quiet enough that they organise without competing with the
   values they sit over — a category label is a signpost, not content. */
.cn-object-metadata__group + .cn-object-metadata__group {
	margin-top: calc(3 * var(--default-grid-baseline, 4px));
}

.cn-object-metadata__group-title {
	margin: 0 0 calc(0.5 * var(--default-grid-baseline, 4px));
	font-size: 0.8em;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--color-text-maxcontrast);
}

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

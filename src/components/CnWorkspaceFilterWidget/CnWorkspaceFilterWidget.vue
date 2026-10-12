<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div
		class="cn-workspace-filter-widget"
		:class="{
			'cn-workspace-filter-widget--start': isStart,
			'cn-workspace-filter-widget--chips': style === 'chips',
			'cn-workspace-filter-widget--bar': isBar,
			'cn-workspace-filter-widget--inline': content.inline === true,
			'cn-workspace-filter-widget--end': content.align === 'end',
		}"
		data-testid="cn-workspace-filter-widget">
		<!-- The start card (`layout: "start"`): a title and one line of
		     guidance beside the control, as the "Contact starten" card. -->
		<div v-if="isStart && (title || description)" class="cn-workspace-filter-widget__text">
			<h3 v-if="title" class="cn-workspace-filter-widget__title">
				{{ title }}
			</h3>
			<p v-if="description" class="cn-workspace-filter-widget__description">
				{{ description }}
			</p>
		</div>

		<!-- A bar (`layout: "bar"`): its `controls` side by side in one row,
		     each a workspace filter of its own (chips, a switch, a select). -->
		<template v-if="isBar">
			<CnWorkspaceFilterWidget
				v-for="(control, index) in barControls"
				:key="index"
				:content="control"
				@change="$emit('change', $event)" />
		</template>

		<p v-if="!isBar && label && style !== 'chips' && style !== 'toggle'" class="cn-workspace-filter-widget__label">
			{{ label }}
		</p>

		<!-- An object picker (`objectSource`): searches OpenRegister on the
		     server, so it reaches every object, not a fetched page. -->
		<CnResourceSelect
			v-if="!isBar && objectSource"
			class="cn-workspace-filter-widget__control"
			:register="objectSource.register"
			:schema="objectSource.schema"
			:labelField="objectSource.labelField || 'title'"
			:modelValue="selected === undefined || selected === null ? '' : String(selected)"
			:placeholder="tr(objectSource.placeholder || '')"
			:ariaLabelCombobox="tr(objectSource.ariaLabel || '') || title || label || writeKey"
			:preload="objectSource.preload !== false"
			:clearable="Boolean(content.allLabel)"
			:allowCreate="false"
			data-testid="cn-workspace-filter-object"
			@update:modelValue="applySelection($event || '')" />

		<div v-else-if="loading" class="cn-workspace-filter-widget__status">
			{{ loadingLabel }}
		</div>

		<!-- Chips style (screens-page-lenses): one compact segmented group,
		     a count after each label, arrow keys move the choice. -->
		<CnSegmentedControl
			v-else-if="style === 'chips'"
			class="cn-workspace-filter-widget__chips"
			size="compact"
			:options="chipOptions"
			:modelValue="selected === undefined || selected === null ? null : String(selected)"
			:ariaLabel="label || writeKey"
			data-testid="cn-workspace-filter-chips"
			@update:modelValue="applySelection" />

		<!-- Toggle style (screens-page-controls): a switch that writes
		     `onValue` / `offValue` (true / false) to the key. -->
		<NcCheckboxRadioSwitch
			v-else-if="style === 'toggle'"
			class="cn-workspace-filter-widget__toggle"
			type="switch"
			:modelValue="toggleOn"
			data-testid="cn-workspace-filter-toggle"
			@update:modelValue="onToggle">
			{{ tr(label) }}
		</NcCheckboxRadioSwitch>

		<!-- Select style -->
		<NcSelect
			v-else-if="style === 'select'"
			:modelValue="selectedOption"
			:options="displayOptions"
			:clearable="false"
			:inputLabel="content.inline ? '' : (label || writeKey)"
			:labelOutside="content.inline === true"
			:ariaLabelCombobox="label || writeKey"
			label="label"
			data-testid="cn-workspace-filter-select"
			@update:modelValue="onSelect" />

		<!-- Radio-list style (default) -->
		<ul v-else-if="!isBar"
			class="cn-workspace-filter-widget__list"
			role="radiogroup"
			:aria-label="label || writeKey">
			<li
				v-for="option in displayOptions"
				:key="String(option.value)"
				class="cn-workspace-filter-widget__item">
				<NcCheckboxRadioSwitch
					type="radio"
					:name="radioGroupName"
					:modelValue="isActive(option) ? String(option.value) : ''"
					:value="String(option.value)"
					:data-testid="`cn-workspace-filter-option-${option.value}`"
					@update:modelValue="onRadioPick(option)">
					<span class="cn-workspace-filter-widget__option-label">{{ option.label }}</span>
					<span
						v-if="showCounts && option.count !== undefined && option.count !== null"
						class="cn-workspace-filter-widget__count">{{ option.count }}</span>
				</NcCheckboxRadioSwitch>
			</li>
		</ul>

		<component
			:is="startLink.to ? 'router-link' : 'a'"
			v-if="startLink"
			:to="startLink.to || undefined"
			:href="startLink.href || undefined"
			class="cn-workspace-filter-widget__link"
			data-testid="cn-workspace-filter-link">
			{{ startLink.label }}
		</component>
	</div>
</template>

<script>
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import { NcCheckboxRadioSwitch, NcSelect } from '@nextcloud/vue'
import CnResourceSelect from '../CnResourceSelect/CnResourceSelect.vue'
import CnSegmentedControl from '../CnSegmentedControl/CnSegmentedControl.vue'
import { fetchEndpointSource } from '../../composables/useEndpointSource.js'
import { fetchListTotal } from '../../utils/fetchFilterCounts.js'
import { resolveFilterTokens } from '../../utils/resolveFilterTokens.js'

/**
 * CnWorkspaceFilterWidget — a dashboard choice-list that writes the selected
 * value into the page workspace context so sibling widgets refetch (#91
 * Wave 3, the `workspace-filter` widget).
 *
 * Options come from ONE of three sources (checked in order):
 *  1. static `options[]` — each `{ value, label, count? }`.
 *  2. an OpenRegister `source` — `{ register, schema, groupBy, filter? }`,
 *     fetched from OR's `/grouped` facet so each distinct value becomes an
 *     option with its object `count`.
 *  3. an `endpointSource` — `{ url, params?, responsePath? }` returning an
 *     array of `{ value, label, count? }` (or `{ id, name }` / bare strings,
 *     normalised).
 *
 * The chosen value is written to the workspace context key named by `writes`
 * (`"@workspace.<key>"` or a bare `"<key>"`). CnDashboardPage provides
 * `cnWorkspaceContext`; every sibling widget whose declarative source
 * interpolates `@workspace.<key>` re-resolves its tokens and refetches when
 * the selection changes — the pipelinq WerkplekQueueFilter contract.
 *
 * An optional leading "All" option (`allLabel`) clears the key (writes the
 * empty string), so an optional `@workspace.<key>?` token drops and siblings
 * show the unfiltered set.
 *
 * ```js
 * content: {
 *   label: 'Queue',
 *   writes: '@workspace.queue',
 *   style: 'radio',                 // 'radio' (default) | 'select' | 'chips'
 *   allLabel: 'All',
 *   showCounts: true,
 *   source: { register: 'pipelinq', schema: 'werkitem', groupBy: 'queue' },
 * }
 * ```
 */
export default {
	name: 'CnWorkspaceFilterWidget',

	components: { CnResourceSelect, CnSegmentedControl, NcSelect, NcCheckboxRadioSwitch },

	inject: {
		/**
		 * Page-level workspace context. CnDashboardPage provides a `ref({})`;
		 * Vue 2.7's Options-API inject AUTO-UNWRAPS it, so this is the plain
		 * reactive bag (the raw-ref `{ value }` shape is also handled on write).
		 * Null on pages without one (the widget then just emits `@change`).
		 */
		cnWorkspaceContext: { default: null },
		/** Host translate function, for the start card's texts. */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * Persisted configuration blob.
		 *
		 * Start card keys (abstract-start-card): `layout: "start"` draws
		 * `title` and `description` beside the control, and `link`
		 * (`{ label, route? | href? }`) after it. `objectSource`
		 * (`{ register, schema, labelField?, placeholder?, ariaLabel?, preload? }`)
		 * makes the control an OpenRegister object picker that searches on the
		 * server and writes the picked object's id; without a selection and
		 * without `allLabel` it selects the first object.
		 *
		 * Chips (screens-page-lenses): `style: "chips"` draws the options as one
		 * compact segmented group with a count after each label. An option's
		 * `countFrom` (`{ register, schema, filter? }`, or a list of them that
		 * are added up) counts that list; a static `count` is used otherwise.
		 * `urlKey` keeps the choice in the address (`?<urlKey>=<value>`), and
		 * the address wins over `default` on load.
		 *
		 * Page controls (screens-page-controls): `style: "toggle"` is a switch
		 * that writes `onValue` / `offValue` (true / false); `layout: "bar"`
		 * with `controls` draws several controls side by side in one row, and
		 * `align: "end"` pushes a control to the right edge.
		 *
		 * @type {{label?: string, controls?: Array<object>, onValue?: unknown, offValue?: unknown, align?: string, urlKey?: string, writes?: string, style?: string, allLabel?: string, showCounts?: boolean, options?: Array, source?: object, endpointSource?: object, objectSource?: object, default?: (string|number), layout?: string, title?: string, description?: string, link?: object}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	emits: ['change'],

	data() {
		return {
			/** Fetched options (from source / endpointSource); static options use content.options directly. */
			fetchedOptions: null,
			/** True while options are being fetched. */
			loading: false,
			/** The currently-selected value (mirrors the workspace key). */
			selected: undefined,
			/** Counted totals of the options that ask (`countFrom`), by option position. */
			optionCounts: {},
		}
	},

	computed: {
		/** Section label. */
		label() {
			return this.content.label || ''
		},

		/** Whether the widget draws the start card. */
		isStart() {
			return this.content.layout === 'start'
		},

		/** The start card's title, translated. */
		title() {
			return this.tr(this.content.title || '')
		},

		/** The start card's guidance line, translated. */
		description() {
			return this.tr(this.content.description || '')
		},

		/**
		 * The link after the control, or null.
		 *
		 * @return {{label: string, to?: object, href?: string}|null}
		 */
		startLink() {
			const link = this.content.link
			if (!link || typeof link !== 'object' || !link.label) {
				return null
			}
			if (link.route && typeof link.route === 'object' && link.route.name) {
				return { label: this.tr(link.label), to: link.route }
			}
			if (typeof link.href === 'string' && link.href !== '') {
				return { label: this.tr(link.label), href: link.href }
			}
			return null
		},

		/**
		 * The object picker declaration, or null.
		 *
		 * @return {{register: string, schema: string, labelField?: string}|null}
		 */
		objectSource() {
			const src = this.content.objectSource
			return src && typeof src === 'object' && src.register && src.schema ? src : null
		},

		/** Choice style: 'chips', 'select' or 'radio' (default). */
		style() {
			return ['select', 'chips', 'toggle'].includes(this.content.style) ? this.content.style : 'radio'
		},

		/**
		 * The chips: each option with its label translated and its count,
		 * the static one or the counted one.
		 *
		 * @return {Array<{value: string, label: string, count?: number}>}
		 * @spec openspec/changes/screens-page-lenses/specs/page-lenses/spec.md#requirement-a-workspace-filter-can-draw-chips-with-counts
		 */
		chipOptions() {
			return this.displayOptions.map((option, index) => {
				const counted = this.optionCounts[index]
				const count = counted !== undefined && counted !== null ? counted : option.count
				const chip = { value: String(option.value), label: this.tr(option.label) }
				if (this.showCounts && Number.isFinite(count)) {
					chip.count = count
				}
				return chip
			})
		},

		/**
		 * Whether the widget is a bar of controls (`layout: "bar"`).
		 *
		 * @return {boolean}
		 * @spec openspec/changes/screens-page-controls/specs/page-controls/spec.md#requirement-a-bar-holds-the-pages-controls-in-one-row
		 */
		isBar() {
			return this.content.layout === 'bar' && Array.isArray(this.content.controls)
		},

		/**
		 * The bar's controls, each an inline workspace filter of its own.
		 *
		 * @return {Array<object>}
		 */
		barControls() {
			return this.content.controls
				.filter((control) => control && typeof control === 'object')
				.map((control) => ({ ...control, inline: true }))
		},

		/** @return {unknown} The value a switch writes when on. */
		onValue() {
			return this.content.onValue !== undefined ? this.content.onValue : true
		},

		/** @return {unknown} The value a switch writes when off. */
		offValue() {
			return this.content.offValue !== undefined ? this.content.offValue : false
		},

		/** @return {boolean} Whether the switch is on. */
		toggleOn() {
			return this.selected !== undefined && String(this.selected) === String(this.onValue)
		},

		/**
		 * The address key that carries the choice (`urlKey`), or ''.
		 *
		 * @return {string}
		 */
		urlKey() {
			return typeof this.content.urlKey === 'string' ? this.content.urlKey : ''
		},

		/** Whether to render per-option counts. */
		showCounts() {
			return this.content.showCounts !== false
		},

		/** The bare workspace key the selection writes (strips a `@workspace.` / `@page.` prefix). */
		writeKey() {
			const w = this.content.writes || ''
			return String(w).replace(/^@(workspace|page)\./, '')
		},

		/** A stable radiogroup name so the radios are mutually exclusive. */
		radioGroupName() {
			return `cn-wsf-${this.writeKey || 'filter'}`
		},

		/** The option list actually rendered — the optional "All" entry prepended. */
		displayOptions() {
			const base = this.normalisedOptions
			if (this.content.allLabel) {
				return [{ value: '', label: this.content.allLabel }, ...base]
			}
			return base
		},

		/** Normalised `{ value, label, count? }` options from whichever source is configured. */
		normalisedOptions() {
			const raw = this.fetchedOptions !== null
				? this.fetchedOptions
				: (Array.isArray(this.content.options) ? this.content.options : [])
			return raw.map((o) => this.normaliseOption(o)).filter((o) => o.value !== undefined && o.value !== null)
		},

		/** The selected option object (for NcSelect). */
		selectedOption() {
			return this.displayOptions.find((o) => String(o.value) === String(this.selected)) || null
		},

		/**
		 * The reactive workspace value for this key — watched so an external
		 * write (another widget) syncs the local selection.
		 *
		 * @return {unknown}
		 */
		workspaceValue() {
			return this.readWorkspace()
		},

		loadingLabel() {
			return t('nextcloud-vue', 'Loading…')
		},
	},

	watch: {
		/** Re-fetch options when a dynamic source changes. */
		content: {
			deep: true,
			handler() {
				this.loadOptions()
			},
		},

		/**
		 * Track external workspace changes (another widget writing the same key).
		 *
		 * @param {unknown} val The new workspace value for this key.
		 */
		workspaceValue(val) {
			if (val !== undefined) {
				this.selected = val
			}
		},
	},

	created() {
		// Seed the selection: existing workspace value → content.default → the
		// "All" clear option (empty) when present, else the first option once
		// loaded (handled in loadOptions).
		const fromAddress = this.readAddress()
		const existing = this.readWorkspace()
		if (fromAddress !== undefined) {
			this.selected = fromAddress
			this.writeWorkspace(fromAddress)
		} else if (existing !== undefined) {
			this.selected = existing
		} else if (this.content.default !== undefined) {
			this.selected = this.content.default
			this.writeWorkspace(this.content.default)
		} else if (this.style === 'toggle') {
			// A switch starts off, and says so, so a condition on its key holds.
			this.selected = this.offValue
			this.writeWorkspace(this.offValue)
		}
		this.loadOptions()
	},

	mounted() {
		this.onPageRefresh = () => this.loadCounts()
		subscribe('cn:page:refresh', this.onPageRefresh)
		this.loadCounts()
	},

	beforeUnmount() {
		unsubscribe('cn:page:refresh', this.onPageRefresh)
	},

	methods: {
		/**
		 * The choice named in the address (`?<urlKey>=…`), when it is one of
		 * the options; undefined otherwise.
		 *
		 * @return {string|undefined}
		 * @spec openspec/changes/screens-page-lenses/specs/page-lenses/spec.md#requirement-the-choice-is-in-the-address
		 */
		readAddress() {
			if (!this.urlKey || !this.$route || !this.$route.query) {
				return undefined
			}
			const raw = this.$route.query[this.urlKey]
			if (this.style === 'toggle') {
				if (raw === undefined) {
					return undefined
				}
				return [this.onValue, this.offValue].find((value) => String(value) === String(raw))
			}
			const known = this.displayOptions.some((option) => String(option.value) === String(raw))
			return known ? String(raw) : undefined
		},

		/**
		 * Write the choice to the address, replacing the history entry and
		 * keeping the other query keys.
		 *
		 * @param {unknown} value The chosen value.
		 * @return {void}
		 * @spec openspec/changes/screens-page-lenses/specs/page-lenses/spec.md#requirement-the-choice-is-in-the-address
		 */
		writeAddress(value) {
			if (!this.urlKey || !this.$router || !this.$route) {
				return
			}
			const query = this.$route.query || {}
			if (String(query[this.urlKey]) === String(value)) {
				return
			}
			const result = this.$router.replace({ query: { ...query, [this.urlKey]: String(value) } })
			if (result && typeof result.catch === 'function') {
				result.catch(() => {})
			}
		},

		/**
		 * Count the lists behind the options that ask (`countFrom`: a list
		 * `{ register, schema, filter? }`, or several that are added up). One
		 * list request each; an option whose count failed shows none.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/screens-page-lenses/specs/page-lenses/spec.md#requirement-a-workspace-filter-can-draw-chips-with-counts
		 */
		async loadCounts() {
			const options = this.displayOptions
			const seq = (this.countSeq = (this.countSeq || 0) + 1)
			const ctx = { workspace: this.readWorkspaceBag() }
			await Promise.all(options.map(async (option, index) => {
				const raw = (Array.isArray(this.content.options) ? this.content.options : [])
					.find((candidate) => candidate && typeof candidate === 'object' && String(candidate.value ?? candidate.id) === String(option.value))
				const from = raw ? raw.countFrom : null
				const lists = (Array.isArray(from) ? from : [from]).filter((list) => list && typeof list === 'object' && list.register && list.schema)
				if (lists.length === 0) {
					return
				}
				let total
				try {
					const parts = await Promise.all(lists.map((list) => fetchListTotal(list.register, list.schema, list.filter || {}, ctx)))
					if (parts.some((part) => part === null)) {
						throw new Error('no total')
					}
					total = parts.reduce((sum, part) => sum + part, 0)
				} catch {
					total = null
				}
				if (seq === this.countSeq) {
					this.optionCounts = { ...this.optionCounts, [index]: total }
				}
			}))
		},

		/**
		 * Normalise a raw option into `{ value, label, count? }`. Accepts
		 * `{ value, label, count }`, `{ id, name }`, `{ key, count }` (OR
		 * facet), or a bare string/number.
		 *
		 * @param {unknown} o The raw option.
		 * @return {{value: unknown, label: string, count?: number}}
		 */
		normaliseOption(o) {
			if (o === null || o === undefined) {
				return { value: undefined, label: '' }
			}
			if (typeof o !== 'object') {
				return { value: o, label: String(o) }
			}
			const value = o.value !== undefined ? o.value : (o.id !== undefined ? o.id : o.key)
			const label = o.label !== undefined ? o.label : (o.name !== undefined ? o.name : String(value))
			const out = { value, label: String(label) }
			if (o.count !== undefined) {
				out.count = o.count
			}
			return out
		},

		/**
		 * Load options for the active source (static content.options need no
		 * fetch). Seeds the first option as the selection when nothing is set
		 * and no "All" clear option exists.
		 *
		 * @return {Promise<void>}
		 */
		async loadOptions() {
			if (this.objectSource) {
				await this.seedFirstObject()
				return
			}
			if (this.content.endpointSource && this.content.endpointSource.url) {
				await this.loadFromEndpoint()
			} else if (this.content.source && this.content.source.schema) {
				await this.loadFromOrSource()
			} else {
				this.fetchedOptions = null
			}
			// Default selection: when nothing is selected and there's no "All"
			// clear affordance, adopt the first option so siblings have a value.
			if ((this.selected === undefined || this.selected === '') && !this.content.allLabel) {
				const first = this.normalisedOptions[0]
				if (first && this.readWorkspace() === undefined && this.content.default === undefined) {
					this.selected = first.value
					this.writeWorkspace(first.value)
				}
			}
		},

		/**
		 * Translate a manifest string through the host app.
		 *
		 * @param {string} text The text.
		 * @return {string}
		 */
		tr(text) {
			if (typeof text !== 'string' || text === '') {
				return ''
			}
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/**
		 * The object picker's default: with nothing selected, no `default` and
		 * no `allLabel`, select the first object the source lists, so the page
		 * always has one in focus. Fail-safe: a failed read selects nothing.
		 *
		 * @return {Promise<void>}
		 */
		async seedFirstObject() {
			if ((this.selected !== undefined && this.selected !== '') || this.content.allLabel || this.content.default !== undefined) {
				return
			}
			const src = this.objectSource
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const url = generateUrl('/apps/openregister/api/objects/{register}/{schema}', { register: src.register, schema: src.schema })
				const res = await axios.get(url, { params: { _limit: 1 } })
				const data = res && res.data
				const rows = Array.isArray(data) ? data : ((data && data.results) || [])
				const first = rows[0]
				const id = first && (first.id || (first['@self'] && first['@self'].id))
				if (id && (this.selected === undefined || this.selected === '') && this.readWorkspace() === undefined) {
					this.selected = String(id)
					this.writeWorkspace(String(id))
				}
			} catch {
				// Nothing selected: the siblings wait for a pick.
			}
		},

		/**
		 * Fetch options from an `endpointSource` (array of options at
		 * responsePath). Fail-safe: a failed fetch leaves an empty list.
		 *
		 * @return {Promise<void>}
		 */
		async loadFromEndpoint() {
			this.loading = true
			try {
				const payload = await fetchEndpointSource(this.content.endpointSource, {
					workspace: this.readWorkspaceBag(),
				})
				this.fetchedOptions = Array.isArray(payload) ? payload : []
			} catch {
				this.fetchedOptions = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * Fetch options from an OpenRegister `/grouped` facet — each distinct
		 * `groupBy` value becomes an option with its object count. Fail-safe.
		 *
		 * @return {Promise<void>}
		 */
		async loadFromOrSource() {
			const src = this.content.source
			this.loading = true
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const url = generateUrl(
					'/apps/openregister/api/objects/aggregations/{register}/{schema}/grouped',
					{ register: src.register, schema: src.schema },
				)
				const params = { groupBy: src.groupBy, metric: 'count' }
				const filter = resolveFilterTokens(src.filter || {}, { workspace: this.readWorkspaceBag() })
				for (const [k, v] of Object.entries(filter)) {
					if (v !== '' && v !== null && v !== undefined) {
						params[`filter[${k}]`] = v
					}
				}
				const res = await axios.get(url, { params })
				const groups = (res && res.data && res.data.groups) || []
				this.fetchedOptions = groups
					.filter((g) => g.key !== null && g.key !== undefined && g.key !== '')
					.map((g) => ({ value: g.key, label: String(g.key), count: Number(g.value) || 0 }))
			} catch {
				this.fetchedOptions = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * Whether an option is the active selection.
		 *
		 * @param {object} option The option.
		 * @return {boolean}
		 */
		isActive(option) {
			return String(option.value) === String(this.selected ?? '')
		},

		/**
		 * Radio-list pick handler.
		 *
		 * @param {object} option The picked option.
		 * @return {void}
		 */
		onRadioPick(option) {
			this.applySelection(option.value)
		},

		/**
		 * Switch handler: write `onValue` or `offValue`.
		 *
		 * @param {boolean} on Whether the switch is on.
		 * @return {void}
		 * @spec openspec/changes/screens-page-controls/specs/page-controls/spec.md#requirement-a-toggle-and-a-select-are-page-controls
		 */
		onToggle(on) {
			this.applySelection(on ? this.onValue : this.offValue)
		},

		/**
		 * NcSelect input handler.
		 *
		 * @param {object|null} option The picked option object.
		 * @return {void}
		 */
		onSelect(option) {
			this.applySelection(option ? option.value : '')
		},

		/**
		 * Apply a new selection: mirror it locally, write it into the workspace
		 * context (so sibling widgets refetch), and emit `@change`.
		 *
		 * @param {unknown} value The new value.
		 * @return {void}
		 */
		applySelection(value) {
			this.selected = value
			this.writeWorkspace(value)
			this.writeAddress(value)
			/**
			 * @event change Emitted when the selection changes. Payload: `{ key, value }`.
			 */
			this.$emit('change', { key: this.writeKey, value })
		},

		/**
		 * The unwrapped workspace bag (or `{}`).
		 *
		 * @return {object}
		 */
		readWorkspaceBag() {
			const holder = this.cnWorkspaceContext
			if (!holder || typeof holder !== 'object') {
				return {}
			}
			return ('value' in holder) ? (holder.value || {}) : holder
		},

		/**
		 * Read the current workspace value for this widget's key (undefined
		 * when unset).
		 *
		 * @return {unknown}
		 */
		readWorkspace() {
			if (!this.writeKey) {
				return undefined
			}
			const bag = this.readWorkspaceBag()
			return bag[this.writeKey]
		},

		/**
		 * Write a value into the reactive workspace bag under this widget's key
		 * (the CnInteractionFormWidget write pattern — replace-in-place for the
		 * unwrapped bag, `.value` for the raw-ref shape).
		 *
		 * @param {unknown} value The value to write.
		 * @return {void}
		 */
		writeWorkspace(value) {
			if (!this.writeKey) {
				return
			}
			const holder = this.cnWorkspaceContext
			if (!holder || typeof holder !== 'object') {
				return
			}
			if ('value' in holder) {
				holder.value = { ...(holder.value || {}), [this.writeKey]: value }
				return
			}
			holder[this.writeKey] = value
		},
	},
}
</script>

<style scoped>
.cn-workspace-filter-widget {
	display: flex;
	flex-direction: column;
	gap: 8px;
	width: 100%;
}

.cn-workspace-filter-widget__label {
	margin: 0;
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-workspace-filter-widget__status {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}

.cn-workspace-filter-widget__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

/* The chips: the compact segmented group, left, in the card the grid draws. */
.cn-workspace-filter-widget--chips {
	flex-direction: row;
	flex-wrap: wrap;
	align-items: center;
}

/* A bar: its controls in one row, an `align: "end"` control pushed right. */
.cn-workspace-filter-widget--bar {
	flex-direction: row;
	flex-wrap: wrap;
	align-items: center;
	gap: 12px 16px;
}

/* An inline control sits in a bar: label left of the control, width to its content. */
.cn-workspace-filter-widget--inline {
	flex-direction: row;
	align-items: center;
	gap: 8px;
	width: auto;
}

.cn-workspace-filter-widget--inline .cn-workspace-filter-widget__label {
	font-weight: 400;
	color: var(--color-text-maxcontrast);
}

.cn-workspace-filter-widget--end {
	margin-inline-start: auto;
}

.cn-workspace-filter-widget--end ~ .cn-workspace-filter-widget--end {
	margin-inline-start: 0;
}

.cn-workspace-filter-widget__toggle {
	font-weight: 600;
}

/* The start card: text left, control (and link) right, as PqDashboard's "Contact starten". */
.cn-workspace-filter-widget--start {
	flex-direction: row;
	flex-wrap: wrap;
	align-items: center;
	gap: 16px 24px;
}

.cn-workspace-filter-widget__text {
	flex: 1 1 320px;
	min-width: 0;
}

.cn-workspace-filter-widget__title {
	margin: 0 0 4px;
	font-size: 17px;
	font-weight: 700;
	color: var(--color-main-text);
}

.cn-workspace-filter-widget__description {
	margin: 0;
	max-width: 420px;
	color: var(--color-text-maxcontrast);
}

.cn-workspace-filter-widget--start .cn-workspace-filter-widget__control,
.cn-workspace-filter-widget--start > .v-select {
	flex: 0 1 480px;
	min-width: 240px;
}

.cn-workspace-filter-widget__link {
	font-weight: 600;
	color: var(--color-primary-element);
	text-decoration: underline;
	white-space: nowrap;
}

.cn-workspace-filter-widget__count {
	margin-inline-start: 6px;
	padding: 0 6px;
	border-radius: 999px;
	background: var(--color-background-hover);
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
}

/* On a phone the bar's controls take a row each (the chips already wrap), and
   a switch and a select are 44px touch targets. */
@media (max-width: 640px) {
	.cn-workspace-filter-widget--bar > .cn-workspace-filter-widget--inline {
		flex: 1 1 100%;
	}

	.cn-workspace-filter-widget--bar > .cn-workspace-filter-widget--end {
		margin-inline-start: 0;
	}

	.cn-workspace-filter-widget--inline .cn-workspace-filter-widget__toggle {
		min-height: 44px;
	}

	.cn-workspace-filter-widget--inline :deep(.v-select) {
		flex: 1 1 auto;
		min-width: 0;
	}

	.cn-workspace-filter-widget--inline :deep(.vs__dropdown-toggle) {
		min-height: 44px;
	}
}
</style>

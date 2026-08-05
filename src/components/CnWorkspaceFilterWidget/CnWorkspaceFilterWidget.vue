<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-workspace-filter-widget" data-testid="cn-workspace-filter-widget">
		<p v-if="label" class="cn-workspace-filter-widget__label">
			{{ label }}
		</p>

		<div v-if="loading" class="cn-workspace-filter-widget__status">
			{{ loadingLabel }}
		</div>

		<!-- Select style -->
		<NcSelect
			v-else-if="style === 'select'"
			:model-value="selectedOption"
			:options="displayOptions"
			:clearable="false"
			:input-label="label || writeKey"
			label="label"
			data-testid="cn-workspace-filter-select"
			@update:model-value="onSelect" />

		<!-- Radio-list style (default) -->
		<ul v-else
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
					:model-value="isActive(option) ? String(option.value) : ''"
					:value="String(option.value)"
					:data-testid="`cn-workspace-filter-option-${option.value}`"
					@update:model-value="onRadioPick(option)">
					<span class="cn-workspace-filter-widget__option-label">{{ option.label }}</span>
					<span
						v-if="showCounts && option.count !== undefined && option.count !== null"
						class="cn-workspace-filter-widget__count">{{ option.count }}</span>
				</NcCheckboxRadioSwitch>
			</li>
		</ul>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcSelect, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { resolveFilterTokens } from '../../utils/resolveFilterTokens.js'
import { fetchEndpointSource } from '../../composables/useEndpointSource.js'

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
 *   style: 'radio',                 // 'radio' (default) | 'select'
 *   allLabel: 'All',
 *   showCounts: true,
 *   source: { register: 'pipelinq', schema: 'werkitem', groupBy: 'queue' },
 * }
 * ```
 */
export default {
	name: 'CnWorkspaceFilterWidget',

	components: { NcSelect, NcCheckboxRadioSwitch },

	inject: {
		/**
		 * Page-level workspace context. CnDashboardPage provides a `ref({})`;
		 * Vue 2.7's Options-API inject AUTO-UNWRAPS it, so this is the plain
		 * reactive bag (the raw-ref `{ value }` shape is also handled on write).
		 * Null on pages without one (the widget then just emits `@change`).
		 */
		cnWorkspaceContext: { default: null },
	},

	props: {
		/**
		 * Persisted configuration blob.
		 * @type {{label?: string, writes?: string, style?: string, allLabel?: string, showCounts?: boolean, options?: Array, source?: object, endpointSource?: object, default?: (string|number)}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	data() {
		return {
			/** Fetched options (from source / endpointSource); static options use content.options directly. */
			fetchedOptions: null,
			/** True while options are being fetched. */
			loading: false,
			/** The currently-selected value (mirrors the workspace key). */
			selected: undefined,
		}
	},

	computed: {
		/** Section label. */
		label() {
			return this.content.label || ''
		},
		/** Choice style: 'select' or 'radio' (default). */
		style() {
			return this.content.style === 'select' ? 'select' : 'radio'
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
		 * @return {*}
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
			handler() { this.loadOptions() },
		},
		/**
		 * Track external workspace changes (another widget writing the same key).
		 * @param {*} val The new workspace value for this key.
		 */
		workspaceValue(val) {
			if (val !== undefined) this.selected = val
		},
	},

	created() {
		// Seed the selection: existing workspace value → content.default → the
		// "All" clear option (empty) when present, else the first option once
		// loaded (handled in loadOptions).
		const existing = this.readWorkspace()
		if (existing !== undefined) {
			this.selected = existing
		} else if (this.content.default !== undefined) {
			this.selected = this.content.default
			this.writeWorkspace(this.content.default)
		}
		this.loadOptions()
	},

	methods: {
		/**
		 * Normalise a raw option into `{ value, label, count? }`. Accepts
		 * `{ value, label, count }`, `{ id, name }`, `{ key, count }` (OR
		 * facet), or a bare string/number.
		 *
		 * @param {*} o The raw option.
		 * @return {{value: *, label: string, count?: number}}
		 */
		normaliseOption(o) {
			if (o === null || o === undefined) return { value: undefined, label: '' }
			if (typeof o !== 'object') return { value: o, label: String(o) }
			const value = o.value !== undefined ? o.value : (o.id !== undefined ? o.id : o.key)
			const label = o.label !== undefined ? o.label : (o.name !== undefined ? o.name : String(value))
			const out = { value, label: String(label) }
			if (o.count !== undefined) out.count = o.count
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
			} catch (e) {
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
					if (v !== '' && v !== null && v !== undefined) params[`filter[${k}]`] = v
				}
				const res = await axios.get(url, { params })
				const groups = (res && res.data && res.data.groups) || []
				this.fetchedOptions = groups
					.filter((g) => g.key !== null && g.key !== undefined && g.key !== '')
					.map((g) => ({ value: g.key, label: String(g.key), count: Number(g.value) || 0 }))
			} catch (e) {
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
		 * @param {*} value The new value.
		 * @return {void}
		 */
		applySelection(value) {
			this.selected = value
			this.writeWorkspace(value)
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
			if (!holder || typeof holder !== 'object') return {}
			return ('value' in holder) ? (holder.value || {}) : holder
		},

		/**
		 * Read the current workspace value for this widget's key (undefined
		 * when unset).
		 *
		 * @return {*}
		 */
		readWorkspace() {
			if (!this.writeKey) return undefined
			const bag = this.readWorkspaceBag()
			return bag[this.writeKey]
		},

		/**
		 * Write a value into the reactive workspace bag under this widget's key
		 * (the CnInteractionFormWidget write pattern — replace-in-place for the
		 * unwrapped bag, `.value` for the raw-ref shape).
		 *
		 * @param {*} value The value to write.
		 * @return {void}
		 */
		writeWorkspace(value) {
			if (!this.writeKey) return
			const holder = this.cnWorkspaceContext
			if (!holder || typeof holder !== 'object') return
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

.cn-workspace-filter-widget__count {
	margin-inline-start: 6px;
	padding: 0 6px;
	border-radius: 999px;
	background: var(--color-background-hover);
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
}
</style>

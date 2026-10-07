<!-- SPDX-License-Identifier: EUPL-1.2 -->
<!-- SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl> -->
<template>
	<Teleport to="body" :disabled="!teleport">
		<div
			ref="panel"
			class="cn-column-filter"
			role="dialog"
			:aria-labelledby="headingId"
			:style="panelStyle"
			data-testid="cn-column-filter"
			@keydown.esc.stop.prevent="close"
			@keydown.enter="onEnter">
			<p :id="headingId" class="cn-column-filter__heading">
				{{ headingText }}
			</p>

			<!-- enum and reference: a checkbox list of real inputs -->
			<template v-if="def.kind === 'enum' || def.kind === 'reference'">
				<label v-if="def.kind === 'reference'" class="cn-column-filter__field">
					<span class="cn-column-filter__label">{{ searchLabel }}</span>
					<input
						v-model="query"
						class="cn-column-filter__input"
						type="search"
						data-testid="cn-column-filter-search"
						@input="onSearchInput">
				</label>
				<p v-if="def.kind === 'reference' && referenceLoading" class="cn-column-filter__hint" role="status">
					{{ loadingLabel }}
				</p>
				<p v-else-if="def.kind === 'reference' && referenceError" class="cn-column-filter__hint" role="status">
					{{ referenceError }}
				</p>
				<fieldset class="cn-column-filter__options">
					<legend class="cn-column-filter__sr-only">
						{{ headingText }}
					</legend>
					<label
						v-for="option in listOptions"
						:key="option.value"
						class="cn-column-filter__option">
						<input
							type="checkbox"
							:value="option.value"
							:checked="draft.values.includes(option.value)"
							data-testid="cn-column-filter-option"
							@change="toggleValue(option.value)">
						<span>{{ option.label }}</span>
					</label>
					<p v-if="listOptions.length === 0 && !referenceLoading" class="cn-column-filter__hint">
						{{ noOptionsLabel }}
					</p>
				</fieldset>
			</template>

			<!-- boolean: yes, no, any -->
			<fieldset v-else-if="def.kind === 'boolean'" class="cn-column-filter__options">
				<legend class="cn-column-filter__sr-only">
					{{ headingText }}
				</legend>
				<label v-for="option in booleanOptions" :key="option.value" class="cn-column-filter__option">
					<input
						type="radio"
						:name="headingId + '-bool'"
						:value="option.value"
						:checked="draft.value === option.value"
						data-testid="cn-column-filter-option"
						@change="draft.value = option.value">
					<span>{{ option.label }}</span>
				</label>
			</fieldset>

			<!-- number and date: from and to -->
			<div v-else-if="def.kind === 'number' || def.kind === 'date'" class="cn-column-filter__range">
				<label class="cn-column-filter__field">
					<span class="cn-column-filter__label">{{ fromLabel }}</span>
					<input
						v-model="draft.from"
						class="cn-column-filter__input"
						:type="def.kind === 'date' ? 'date' : 'number'"
						data-testid="cn-column-filter-from">
				</label>
				<label class="cn-column-filter__field">
					<span class="cn-column-filter__label">{{ toLabel }}</span>
					<input
						v-model="draft.to"
						class="cn-column-filter__input"
						:type="def.kind === 'date' ? 'date' : 'number'"
						data-testid="cn-column-filter-to">
				</label>
			</div>

			<!-- string: contains (OpenRegister `[like]`, case-insensitive) -->
			<label v-else class="cn-column-filter__field">
				<span class="cn-column-filter__label">{{ containsLabel }}</span>
				<input
					v-model="draft.value"
					class="cn-column-filter__input"
					type="text"
					data-testid="cn-column-filter-text">
			</label>

			<div class="cn-column-filter__actions">
				<button
					type="button"
					class="cn-column-filter__button"
					data-testid="cn-column-filter-clear"
					@click="clear">
					{{ clearLabel }}
				</button>
				<button
					type="button"
					class="cn-column-filter__button cn-column-filter__button--primary"
					data-testid="cn-column-filter-apply"
					@click="apply">
					{{ applyLabel }}
				</button>
			</div>
		</div>
	</Teleport>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'

let popoverSeq = 0

/**
 * CnColumnFilterPopover — the small panel a table header's filter button opens.
 *
 * Renders the control that fits the column: a checkbox list for an enum, yes,
 * no or any for a boolean, from and to for a number or a date, a searchable
 * list of referenced objects for a reference, and a contains box for text.
 * Real inputs throughout, so every control works from the keyboard. Escape
 * closes it and the host returns focus to the filter button.
 *
 * Internal to CnDataTable. It emits a state object; CnDataTable turns that
 * into query parameters with `columnFilterParams`.
 *
 * @spec openspec/changes/table-header-sort-and-filter/specs/cn-data-table/spec.md#requirement-every-backed-column-filters-from-its-header
 */
export default {
	name: 'CnColumnFilterPopover',

	props: {
		/** The filter definition from `columnFilterDef`. */
		def: {
			type: Object,
			required: true,
		},

		/** The column's current state from `columnFilterState`. */
		state: {
			type: Object,
			default: () => ({}),
		},

		/** The translated column label. */
		label: {
			type: String,
			default: '',
		},

		/** The filter button's bounding rect, to place the panel under it. */
		anchorRect: {
			type: Object,
			default: null,
		},

		/** Register slug a reference column's objects live in, when the column names none. */
		register: {
			type: String,
			default: '',
		},

		/** Render into `<body>`, so a scrolling table cannot clip the panel. */
		teleport: {
			type: Boolean,
			default: true,
		},
	},

	emits: ['apply', 'close'],

	data() {
		popoverSeq += 1
		const s = this.state || {}
		return {
			headingId: 'cn-column-filter-' + popoverSeq,
			draft: {
				values: Array.isArray(s.values) ? [...s.values] : [],
				value: s.value !== undefined && s.value !== null ? String(s.value) : '',
				from: s.from || '',
				to: s.to || '',
			},

			query: '',
			referenceOptions: [],
			referenceLabels: {},
			referenceLoading: false,
			referenceError: '',
			searchTimer: null,
		}
	},

	computed: {
		headingText() {
			return t('nextcloud-vue', 'Filter {column}', { column: this.label })
		},

		/**
		 * The options a list filter shows. For a reference, the search results
		 * plus any picked object that is not among them, so a selection never
		 * disappears from view.
		 *
		 * @return {Array<{value: string, label: string}>}
		 */
		listOptions() {
			if (this.def.kind !== 'reference') {
				return this.def.options || []
			}
			const shown = new Set(this.referenceOptions.map((o) => o.value))
			const picked = this.draft.values
				.filter((v) => !shown.has(v))
				.map((v) => ({ value: v, label: this.referenceLabels[v] || v }))
			return [...picked, ...this.referenceOptions]
		},

		booleanOptions() {
			return [
				{ value: '', label: t('nextcloud-vue', 'Any') },
				{ value: 'true', label: t('nextcloud-vue', 'Yes') },
				{ value: 'false', label: t('nextcloud-vue', 'No') },
			]
		},

		panelStyle() {
			if (!this.teleport || !this.anchorRect) {
				return {}
			}
			const width = 280
			const viewport = typeof window !== 'undefined' ? window.innerWidth : 1024
			const left = Math.max(8, Math.min(this.anchorRect.left, viewport - width - 8))
			return { position: 'fixed', top: `${this.anchorRect.bottom + 4}px`, left: `${left}px`, width: `${width}px` }
		},

		searchLabel() {
			return t('nextcloud-vue', 'Search')
		},

		loadingLabel() {
			return t('nextcloud-vue', 'Loading…')
		},

		noOptionsLabel() {
			return t('nextcloud-vue', 'Nothing to choose from here.')
		},

		fromLabel() {
			return t('nextcloud-vue', 'From')
		},

		toLabel() {
			return t('nextcloud-vue', 'To')
		},

		/**
		 * Label of the text box: the text filter matches on contains.
		 *
		 * @return {string}
		 * @spec openspec/changes/header-filter-contains/specs/cn-data-table/spec.md#requirement-a-text-header-filter-matches-on-contains
		 */
		containsLabel() {
			return t('nextcloud-vue', 'Contains')
		},

		clearLabel() {
			return t('nextcloud-vue', 'Clear')
		},

		applyLabel() {
			return t('nextcloud-vue', 'Apply')
		},
	},

	mounted() {
		document.addEventListener('mousedown', this.onOutsideMouseDown, true)
		if (this.def.kind === 'reference') {
			this.loadReferenceOptions('')
		}
		this.$nextTick(() => {
			const first = this.$refs.panel && this.$refs.panel.querySelector('input, button')
			if (first && typeof first.focus === 'function') {
				first.focus()
			}
		})
	},

	beforeUnmount() {
		document.removeEventListener('mousedown', this.onOutsideMouseDown, true)
		clearTimeout(this.searchTimer)
	},

	methods: {
		toggleValue(value) {
			this.draft.values = this.draft.values.includes(value)
				? this.draft.values.filter((v) => v !== value)
				: [...this.draft.values, value]
		},

		/**
		 * The state this panel applies, in the shape `columnFilterParams` reads.
		 *
		 * @return {object}
		 */
		draftState() {
			if (this.def.kind === 'enum' || this.def.kind === 'reference') {
				return { values: [...this.draft.values] }
			}
			if (this.def.kind === 'number' || this.def.kind === 'date') {
				return { from: this.draft.from, to: this.draft.to }
			}
			return { value: this.draft.value }
		},

		apply() {
			/**
			 * @event apply The person applied the filter.
			 * @type {object} The column filter state.
			 */
			this.$emit('apply', this.draftState())
		},

		clear() {
			this.$emit('apply', this.def.kind === 'enum' || this.def.kind === 'reference'
				? { values: [] }
				: (this.def.kind === 'number' || this.def.kind === 'date') ? { from: '', to: '' } : { value: '' })
		},

		close() {
			/**
			 * @event close The panel should close without applying.
			 */
			this.$emit('close')
		},

		onEnter(event) {
			// Enter in a text, number or date box applies, like a form submit.
			// On a checkbox or a button it keeps its own meaning.
			const target = event && event.target
			if (target && target.tagName === 'INPUT' && ['text', 'number', 'date', 'search'].includes(target.type)) {
				event.preventDefault()
				this.apply()
			}
		},

		onOutsideMouseDown(event) {
			const panel = this.$refs.panel
			if (panel && event && event.target && !panel.contains(event.target)) {
				this.close()
			}
		},

		onSearchInput() {
			clearTimeout(this.searchTimer)
			this.searchTimer = setTimeout(() => this.loadReferenceOptions(this.query), 250)
		},

		/**
		 * Search the referenced objects. The value is the object's uuid,
		 * because that is what the server filters a reference on.
		 *
		 * @param {string} search The search term.
		 * @return {Promise<void>}
		 */
		async loadReferenceOptions(search) {
			const ref = this.def.reference || {}
			const register = ref.register || this.register
			if (!register || !ref.schema) {
				this.referenceError = t('nextcloud-vue', 'This column cannot list its objects.')
				return
			}
			this.referenceLoading = true
			this.referenceError = ''
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const url = generateUrl('/apps/openregister/api/objects/{register}/{schema}', {
					register,
					schema: String(ref.schema),
				})
				const params = { _limit: 50 }
				if (search) {
					params._search = search
				}
				const response = await axios.get(url, { params })
				const rows = (response && response.data && (response.data.results || response.data)) || []
				const list = Array.isArray(rows) ? rows : []
				const options = list
					.map((row) => {
						const self = (row && row['@self']) || {}
						const value = String(self.id || self.uuid || row.id || row.uuid || '')
						const label = String((ref.labelField && row[ref.labelField]) || row.name || row.title || self.name || value)
						return { value, label }
					})
					.filter((o) => o.value !== '')
				this.referenceOptions = options
				this.referenceLabels = { ...this.referenceLabels, ...Object.fromEntries(options.map((o) => [o.value, o.label])) }
			} catch {
				this.referenceOptions = []
				this.referenceError = t('nextcloud-vue', 'The list could not load.')
			} finally {
				this.referenceLoading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-column-filter {
	z-index: 10000;
	display: flex;
	flex-direction: column;
	gap: 8px;
	box-sizing: border-box;
	max-height: 60vh;
	overflow-y: auto;
	padding: 12px;
	background: var(--color-main-background);
	color: var(--color-main-text);
	border: 1px solid var(--color-border-dark);
	border-radius: var(--border-radius-large, 8px);
	box-shadow: 0 2px 8px var(--color-box-shadow);
	font-weight: normal;
	text-align: start;
}

.cn-column-filter__heading {
	margin: 0;
	font-weight: bold;
}

.cn-column-filter__options {
	display: flex;
	flex-direction: column;
	gap: 4px;
	margin: 0;
	padding: 0;
	border: none;
}

.cn-column-filter__option {
	display: flex;
	align-items: center;
	gap: 8px;
	min-height: 32px;
	cursor: pointer;
}

.cn-column-filter__range {
	display: flex;
	gap: 8px;
}

.cn-column-filter__field {
	display: flex;
	flex: 1 1 0;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
}

.cn-column-filter__label {
	font-size: var(--font-size-small, 13px);
	color: var(--color-text-maxcontrast);
}

.cn-column-filter__input {
	width: 100%;
	box-sizing: border-box;
	margin: 0;
}

.cn-column-filter__hint {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-column-filter__actions {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
}

.cn-column-filter__button {
	min-height: 34px;
	padding: 0 12px;
	border: 1px solid var(--color-border-dark);
	border-radius: var(--border-radius-element, 8px);
	background: var(--color-main-background);
	color: var(--color-main-text);
	cursor: pointer;
}

.cn-column-filter__button--primary {
	border-color: var(--color-primary-element);
	background: var(--color-primary-element);
	color: var(--color-primary-element-text);
}

.cn-column-filter__button:focus-visible,
.cn-column-filter__input:focus-visible,
.cn-column-filter__option input:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-column-filter__sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}
</style>

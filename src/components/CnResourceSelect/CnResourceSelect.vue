<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcSelect
		:input-id="inputId"
		:input-label="inputLabel"
		:model-value="selectedOption"
		:options="displayOptions"
		:loading="loading"
		:clearable="clearable"
		:disabled="disabled"
		:placeholder="placeholder"
		:filterable="false"
		label="label"
		@search="onSearch"
		@update:model-value="onInput">
		<template #option="{ label: optLabel, __create }">
			<span v-if="__create" class="cn-resource-select__create">
				<Plus :size="16" />
				{{ createLabelFor(optLabel) }}
			</span>
			<span v-else>{{ optLabel }}</span>
		</template>
	</NcSelect>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcSelect } from '@nextcloud/vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import { useObjectStore } from '../../store/index.js'

/**
 * CnResourceSelect — an OpenRegister object picker that can CREATE from the
 * search term.
 *
 * Searches a `register` + `schema` for objects matching the typed text and
 * renders them as options. When the typed term matches no existing object, a
 * synthetic **"Create '<term>'"** option appears at the bottom; choosing it
 * persists a new object (via `useObjectStore().saveObject`, writing the term to
 * `labelField`) and selects it — so an agent who can't find a client just types
 * the name and makes one inline, never hitting a dead "no results" end.
 *
 * Emits `update:modelValue` (the selected object's id) and `create` (the
 * freshly-created object). The label of each option comes from `labelField`
 * (default `name`), the value from the object's id.
 *
 * Backwards-compatible, self-contained: it owns its own search + create flow,
 * so a consumer only needs to pass `register` + `schema` and bind `modelValue`.
 *
 * Three opt-in props cover the cases a plain object picker cannot:
 *
 *  - `filters` SCOPES the options to a parent selection, which is what makes a
 *    cascading pair work (pick a client, then only that client's contacts are
 *    offered). Changing the scope clears a now-invalid selection.
 *  - `preload` fetches a first page on mount so the field can be BROWSED, not
 *    only searched — the behaviour a user expects from a select.
 *  - `createHandler` replaces the built-in save. Creating from a bare term only
 *    works while the term is enough to satisfy the schema; the moment a
 *    required field must come from somewhere else (a server-minted key, a value
 *    worth collecting in a full dialog) the consumer owns the create and
 *    resolves the finished object back.
 *
 * Example:
 * ```vue
 * <CnResourceSelect
 *   register="pipelinq"
 *   schema="client"
 *   label-field="name"
 *   :model-value="clientId"
 *   :input-label="t('pipelinq', 'Client')"
 *   @update:modelValue="clientId = $event"
 *   @create="onClientCreated" />
 * ```
 */
export default {
	name: 'CnResourceSelect',

	components: { NcSelect, Plus },

	props: {
		/** OpenRegister register slug to search/create in. */
		register: {
			type: String,
			required: true,
		},
		/** OpenRegister schema slug to search/create in. */
		schema: {
			type: String,
			required: true,
		},
		/** Currently-selected object id (v-model). */
		modelValue: {
			type: [String, Number],
			default: '',
		},
		/** Object field used as the option label AND written on create. */
		labelField: {
			type: String,
			default: 'name',
		},
		/** Accessible input label for the underlying NcSelect. */
		inputLabel: {
			type: String,
			default: '',
		},
		/** DOM id for the input (a11y association). */
		inputId: {
			type: String,
			default: '',
		},
		/** Whether the selection can be cleared. */
		clearable: {
			type: Boolean,
			default: true,
		},
		/** Minimum characters before searching / offering create. */
		minChars: {
			type: Number,
			default: 2,
		},
		/**
		 * Whether to offer the inline "Create '<term>'" option when the search
		 * yields no exact match. Off → behaves like a plain async object select.
		 */
		allowCreate: {
			type: Boolean,
			default: true,
		},
		/**
		 * Extra fields merged into the payload when creating a new object (e.g.
		 * a fixed `type` or `status`). The `labelField` is always set to the term.
		 * @type {object}
		 */
		createDefaults: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Field filters merged into the search query, so the option list can be
		 * SCOPED to a parent selection — the cascading-select case (pick a
		 * client, then only that client's contacts are offered). Changing this
		 * reloads the options and clears a selection that no longer belongs to
		 * the new scope.
		 *
		 * Example: `:filters="{ client: form.client }"`.
		 * @type {object}
		 */
		filters: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Load a first page of options on mount (and whenever `filters`
		 * change) instead of waiting for `minChars` of typing. Lets the field
		 * be BROWSED like a plain select while still searching server-side once
		 * the user types. Off by default so existing consumers keep their
		 * search-only behaviour and issue no extra request.
		 */
		preload: {
			type: Boolean,
			default: false,
		},
		/**
		 * Disable the input — e.g. a dependent select waiting on its parent.
		 */
		disabled: {
			type: Boolean,
			default: false,
		},
		/** Placeholder text for the underlying NcSelect. */
		placeholder: {
			type: String,
			default: '',
		},
		/**
		 * Override how a new object is created from the typed term. Receives
		 * `(term, payload)` and MUST resolve to the created object (or a falsy
		 * value to abort, e.g. the user cancelled a dialog).
		 *
		 * Without it the component posts `payload` straight to
		 * `objectStore.saveObject`, which is wrong whenever the schema requires
		 * a field the term cannot supply — a server-minted foreign key, say, or
		 * anything the consumer would rather collect in a full create dialog.
		 * @type {Function|null}
		 */
		createHandler: {
			type: Function,
			default: null,
		},
	},

	emits: ['update:modelValue', 'create'],

	data() {
		return {
			search: '',
			loading: false,
			options: [],
			// The selected option object kept locally so the label shows even
			// before/without a matching search result (e.g. a pre-set modelValue).
			localSelected: null,
		}
	},

	computed: {
		/** Pinia object store handle (resolved lazily so a Pinia-less test still mounts). */
		objectStore() {
			try {
				return useObjectStore()
			} catch (e) {
				return null
			}
		},
		/** The `${register}-${schema}` object-type slug used by the store. */
		typeSlug() {
			return `${this.register}-${this.schema}`
		},
		/** The currently-selected option, for NcSelect's model-value. */
		selectedOption() {
			if (this.localSelected && this.localSelected.value === this.modelValue) {
				return this.localSelected
			}
			return this.options.find((o) => o.value === this.modelValue) || null
		},
		/**
		 * The option list shown in the dropdown — the search results, plus a
		 * synthetic "Create '<term>'" entry when create is allowed and the term
		 * is long enough and matches no existing option label exactly.
		 *
		 * @return {Array<object>}
		 */
		displayOptions() {
			const opts = [...this.options]
			const term = this.search.trim()
			if (this.allowCreate && term.length >= this.minChars) {
				const exact = opts.some((o) => (o.label || '').toLowerCase() === term.toLowerCase())
				if (!exact) {
					opts.push({ value: '__create__', label: term, __create: true })
				}
			}
			return opts
		},
		/**
		 * Stable string identity for `filters`. Watching the object itself
		 * would re-fire on every parent re-render (a fresh object literal is a
		 * new identity even when the values are unchanged), reloading options
		 * and clobbering the selection in a loop.
		 *
		 * @return {string}
		 */
		filtersKey() {
			return JSON.stringify(this.filters || {})
		},
		/**
		 * `filters` with empty entries dropped. A parent that has not been
		 * chosen yet holds `null`, and forwarding `client=` as a query param
		 * asks the API for objects whose client is the empty string — which
		 * matches nothing and reads as "no results" rather than "not scoped".
		 *
		 * @return {object}
		 */
		activeFilters() {
			const out = {}
			for (const [key, value] of Object.entries(this.filters || {})) {
				if (value !== null && value !== undefined && value !== '') {
					out[key] = value
				}
			}
			return out
		},
	},

	watch: {
		modelValue: {
			immediate: true,
			handler() {
				this.ensureSelectedLoaded()
			},
		},
		filtersKey(next, prev) {
			if (next === prev) return
			// The scope moved, so anything already selected may no longer be
			// in it. Drop the stale options + selection, then re-seed.
			this.options = []
			if (this.modelValue) {
				this.localSelected = null
				this.$emit('update:modelValue', '')
			}
			if (this.search.trim().length >= this.minChars) {
				this.onSearch(this.search)
			} else {
				this.loadInitialOptions()
			}
		},
	},

	created() {
		this.loadInitialOptions()
	},

	methods: {
		/**
		 * Seed the dropdown with a first page of options so the field can be
		 * browsed without typing. No-op unless `preload` is set.
		 *
		 * @return {Promise<void>}
		 */
		async loadInitialOptions() {
			if (!this.preload || !this.objectStore) return
			this.loading = true
			try {
				this.ensureRegistered()
				const collection = await this.objectStore.fetchCollection(this.typeSlug, {
					...this.activeFilters,
					_limit: 20,
				})
				const items = Array.isArray(collection)
					? collection
					: (this.objectStore.collections[this.typeSlug] || [])
				this.options = items.map((o) => this.toOption(o))
			} catch (e) {
				this.options = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * The translated "Create 'X'" label for the synthetic option.
		 *
		 * @param {string} term The typed term.
		 * @return {string}
		 */
		createLabelFor(term) {
			return t('nextcloud-vue', 'Create "{term}"', { term })
		},

		/**
		 * Run an object search (debounced via NcSelect's own throttling) for the
		 * typed term. Failures degrade to an empty option list.
		 *
		 * @param {string} term The search term from NcSelect.
		 * @return {Promise<void>}
		 */
		async onSearch(term) {
			this.search = term || ''
			if (!this.objectStore || this.search.trim().length < this.minChars) {
				// Below the search threshold: fall back to the browsable first
				// page when preloading, rather than blanking the list.
				this.options = []
				this.loadInitialOptions()
				return
			}
			this.loading = true
			try {
				this.ensureRegistered()
				const collection = await this.objectStore.fetchCollection(this.typeSlug, {
					...this.activeFilters,
					_search: this.search.trim(),
					_limit: 20,
				})
				const items = Array.isArray(collection)
					? collection
					: (this.objectStore.collections[this.typeSlug] || [])
				this.options = items.map((o) => this.toOption(o))
			} catch (e) {
				this.options = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * Handle a selection. A real option emits its id; the synthetic create
		 * option triggers object creation.
		 *
		 * @param {object|null} option The chosen option (or null on clear).
		 * @return {Promise<void>}
		 */
		async onInput(option) {
			if (!option) {
				this.localSelected = null
				/**
				 * @event update:modelValue The selected (or newly-created) object id, or '' when cleared.
				 * @type {string}
				 */
				this.$emit('update:modelValue', '')
				return
			}
			if (option.__create) {
				await this.createFromTerm(option.label)
				return
			}
			this.localSelected = option
			this.$emit('update:modelValue', option.value)
		},

		/**
		 * Create a new object from the typed term and select it.
		 *
		 * @param {string} term The term to write to `labelField`.
		 * @return {Promise<void>}
		 */
		async createFromTerm(term) {
			if (!this.objectStore && !this.createHandler) return
			const name = (term || '').trim()
			if (!name) return
			this.loading = true
			try {
				// The active scope is part of the new object's identity: a
				// contact created while the list is filtered to one client
				// belongs to that client. An explicit createDefaults entry
				// still wins.
				const payload = { ...this.activeFilters, ...this.createDefaults, [this.labelField]: name }
				let created
				if (this.createHandler) {
					// A falsy resolve means the consumer aborted (cancelled
					// dialog) — leave the selection untouched.
					created = await this.createHandler(name, payload)
				} else {
					this.ensureRegistered()
					created = await this.objectStore.saveObject(this.typeSlug, payload)
				}
				if (!created) return
				const option = this.toOption(created)
				this.options = [option, ...this.options.filter((o) => o.value !== option.value)]
				this.localSelected = option
				this.$emit('update:modelValue', option.value)
				/**
				 * @event create A new object was created from the search term.
				 * @type {object} The created OpenRegister object.
				 */
				this.$emit('create', created)
			} catch (e) {
				// eslint-disable-next-line no-console
				console.warn('[CnResourceSelect] create failed', e)
			} finally {
				this.loading = false
			}
		},

		/**
		 * Map an OpenRegister object to an option `{ value, label }`.
		 *
		 * @param {object} obj The object.
		 * @return {{value: string, label: string}}
		 */
		toOption(obj) {
			const id = String(obj.id || (obj['@self'] && obj['@self'].id) || '')
			const label = obj[this.labelField] || obj.name || obj.title || id
			return { value: id, label }
		},

		/**
		 * Register the object type with the store (idempotent) so search/create
		 * route to the right register+schema.
		 */
		ensureRegistered() {
			if (this.objectStore && typeof this.objectStore.registerObjectType === 'function') {
				try {
					this.objectStore.registerObjectType(this.typeSlug, this.schema, this.register)
				} catch (e) {
					// Already registered or store not ready — non-fatal.
				}
			}
		},

		/**
		 * When a `modelValue` is set but no matching option is loaded, fetch the
		 * single object so its label renders (e.g. a pre-filled client id).
		 *
		 * @return {Promise<void>}
		 */
		async ensureSelectedLoaded() {
			if (!this.modelValue || this.selectedOption || !this.objectStore) return
			try {
				this.ensureRegistered()
				if (typeof this.objectStore.fetchObject !== 'function') return
				const obj = await this.objectStore.fetchObject(this.typeSlug, String(this.modelValue))
				if (obj) this.localSelected = this.toOption(obj)
			} catch (e) {
				// Leave the id un-labelled rather than crash.
			}
		},
	},
}
</script>

<style scoped>
.cn-resource-select__create {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	color: var(--color-primary-element);
	font-weight: 600;
}
</style>

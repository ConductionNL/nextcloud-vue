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
		:filterable="false"
		label="label"
		@search="onSearch"
		@input="onInput">
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
	},

	emits: ['update:modelValue', 'create'],

	data() {
		return {
			search: '',
			loading: false,
			options: [],
			// The unfiltered first page of objects, shown when the dropdown opens
			// before the user has typed anything — an empty picker on open reads
			// as "you have no products" even when objects exist.
			initialOptions: [],
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
	},

	watch: {
		modelValue: {
			immediate: true,
			handler() {
				this.ensureSelectedLoaded()
			},
		},
	},

	mounted() {
		this.loadInitialOptions()
	},

	methods: {
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
		/**
		 * Preload the first page of objects so the dropdown has options before
		 * the user types. Failures degrade to an empty initial list (the typed
		 * search still works).
		 *
		 * @return {Promise<void>}
		 */
		async loadInitialOptions() {
			if (!this.objectStore) return
			this.loading = true
			try {
				this.ensureRegistered()
				const collection = await this.objectStore.fetchCollection(this.typeSlug, { _limit: 20 })
				const items = Array.isArray(collection)
					? collection
					: (this.objectStore.collections[this.typeSlug] || [])
				this.initialOptions = items.map((o) => this.toOption(o))
				// Only surface them if the user hasn't started a search meanwhile.
				if (this.search.trim().length < this.minChars) {
					this.options = this.initialOptions
				}
			} catch (e) {
				this.initialOptions = []
			} finally {
				this.loading = false
			}
		},

		async onSearch(term) {
			this.search = term || ''
			if (!this.objectStore || this.search.trim().length < this.minChars) {
				this.options = this.initialOptions
				return
			}
			this.loading = true
			try {
				this.ensureRegistered()
				const collection = await this.objectStore.fetchCollection(this.typeSlug, {
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
			if (!this.objectStore) return
			const name = (term || '').trim()
			if (!name) return
			this.loading = true
			try {
				this.ensureRegistered()
				const payload = { ...this.createDefaults, [this.labelField]: name }
				const created = await this.objectStore.saveObject(this.typeSlug, payload)
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

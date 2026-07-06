<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<span class="cn-fk-resolve-cell" :title="ids.join(', ')">{{ display }}</span>
</template>

<script>
import { useObjectStore } from '../../store/useObjectStore.js'
import { resolveObjectOpType } from '../../utils/actionsDispatcher.js'

/**
 * CnFkResolveCell — built-in `fkResolve` cell widget: resolves a reference
 * uuid (or an array of uuids) to the related object's display label.
 *
 * Fetches through the shared object store (`useObjectStore`), which gives
 * per-schema caching for free: objects are cached under the
 * `<register>/<schema>` type slug and concurrent fetches for the same id are
 * de-duplicated, so a column of 50 rows pointing at the same client resolves
 * with a single request. Unresolvable ids (fetch failure, missing label
 * field, no Pinia store) degrade to the raw id — the cell never blanks out
 * or throws.
 *
 * Declared on a table column via the cell-widget mechanism:
 * ```js
 * {
 *   key: 'client',
 *   label: 'Client',
 *   widget: 'fkResolve',
 *   widgetProps: { register: 'crm', schema: 'client', labelField: 'name' },
 * }
 * ```
 */
export default {
	name: 'CnFkResolveCell',

	props: {
		/**
		 * The reference value: a single object uuid/id, or an array of them
		 * (multi-reference properties render comma-joined labels).
		 * @type {string|number|Array<string|number>|null}
		 */
		value: {
			type: [String, Number, Array],
			default: null,
		},
		/** OpenRegister register slug (or id) the reference points into. */
		register: {
			type: String,
			default: '',
		},
		/** OpenRegister schema slug (or id) the reference points into. */
		schema: {
			type: String,
			default: '',
		},
		/**
		 * Property on the referenced object used as the display label.
		 * Falls back to `title`, then `@self.name`, then the raw id.
		 */
		labelField: {
			type: String,
			default: 'name',
		},
	},

	data() {
		return {
			/**
			 * Resolved labels keyed by String(id). Filled from the store cache
			 * synchronously where possible, otherwise after the fetch resolves.
			 * @type {Record<string, string>}
			 */
			labels: {},
		}
	},

	computed: {
		/**
		 * The reference ids as a normalized string array (empty when the
		 * value is unset).
		 * @return {string[]}
		 */
		ids() {
			if (this.value === null || this.value === undefined || this.value === '') return []
			const list = Array.isArray(this.value) ? this.value : [this.value]
			return list
				.filter((id) => id !== null && id !== undefined && id !== '')
				.map((id) => String(id))
		},
		/**
		 * The rendered text: each id's resolved label (raw id while
		 * resolving / when unresolvable), comma-joined for multi-refs.
		 * @return {string}
		 */
		display() {
			return this.ids.map((id) => this.labels[id] || id).join(', ')
		},
	},

	watch: {
		ids: {
			immediate: true,
			handler() { this.resolveAll() },
		},
	},

	methods: {
		/**
		 * Resolve every id via the shared object store: cache hit renders
		 * synchronously, misses fetch (store-level in-flight dedup applies).
		 * A failed / label-less fetch leaves the raw id in place.
		 *
		 * @return {Promise<void>}
		 */
		async resolveAll() {
			if (!this.register || !this.schema || this.ids.length === 0) return
			const store = this.getObjectStore()
			if (!store) return
			const type = resolveObjectOpType(store, { register: this.register, schema: this.schema })
			await Promise.all(this.ids.map(async (id) => {
				if (this.labels[id]) return
				const cached = store.objects && store.objects[type] && store.objects[type][id]
				const obj = cached || await this.fetchOne(store, type, id)
				const label = this.pickLabel(obj)
				if (label) this.$set(this.labels, id, label)
			}))
		},

		/**
		 * Fetch one referenced object; null on any failure so the raw id
		 * stays visible.
		 *
		 * @param {object} store The object store instance.
		 * @param {string} type The `<register>/<schema>` type slug.
		 * @param {string} id The object id.
		 * @return {Promise<object|null>}
		 */
		async fetchOne(store, type, id) {
			try {
				return await store.fetchObject(type, id)
			} catch (e) {
				return null
			}
		},

		/**
		 * Extract the display label off a resolved object: `labelField`
		 * first, then `title`, then `@self.name`. Translatable per-language
		 * maps collapse to their first value.
		 *
		 * @param {object|null} obj The referenced object.
		 * @return {string} The label, or '' when none is usable.
		 */
		pickLabel(obj) {
			if (!obj || typeof obj !== 'object') return ''
			const candidates = [obj[this.labelField], obj.title, obj['@self'] && obj['@self'].name]
			for (const raw of candidates) {
				if (typeof raw === 'string' && raw !== '') return raw
				if (typeof raw === 'number') return String(raw)
				if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
					const first = Object.values(raw).find((v) => typeof v === 'string' && v !== '')
					if (first) return first
				}
			}
			return ''
		},

		/**
		 * The shared object store, or null when no Pinia is active (the cell
		 * then renders the raw id).
		 * @return {object|null}
		 */
		getObjectStore() {
			try {
				return useObjectStore()
			} catch (e) {
				return null
			}
		},
	},
}
</script>

<style scoped>
.cn-fk-resolve-cell {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>

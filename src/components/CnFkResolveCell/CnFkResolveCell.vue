<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<!-- @slot default Draw the label yourself (an avatar beside the name): receives `{ label, ids, resolved }`, the resolved text, the ids and whether every id resolved. -->
	<slot v-if="$slots.default"
		:label="display"
		:ids="ids"
		:resolved="resolved" />
	<span v-else class="cn-fk-resolve-cell" :title="ids.join(', ')">{{ display }}</span>
</template>

<script>
import { useObjectStore } from '../../store/useObjectStore.js'
import { resolveObjectOpType } from '../../utils/actionsDispatcher.js'
import { fillTemplate } from '../../utils/fillTemplate.js'
import { findByMatch } from '../../utils/fkMatchLookup.js'
import { readPath } from '../../utils/readPath.js'

/**
 * A value as a list of non-empty strings.
 *
 * @param {string|number|Array<string|number>|null} value A value or a list of them.
 * @return {string[]}
 */
function asIds(value) {
	if (value === null || value === undefined || value === '') {
		return []
	}
	return (Array.isArray(value) ? value : [value])
		.filter((id) => id !== null && id !== undefined && id !== '')
		.map((id) => String(id))
}

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
 * A host can draw the label itself through the default slot, which receives
 * `{ label, ids, resolved }` (the avatar cell does, to put initials beside the name).
 *
 * With `matchField` the value is not an id but the value of that property
 * (a person's user id): the cell finds the record with it, shows nothing
 * while it looks, and the value itself only when no record answers.
 * `refValue` (the row's own reference, which CnCellRenderer reads from
 * `widgetProps.refField`) is tried first; a list of references pairs with a
 * list of values by position when both are as long. `labelTemplate`
 * (`"{givenName} {familyName}"`) or `labelPath` (`"applicant.name"`) picks
 * the label before `labelField`.
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
		 *
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

		/** Property the value is matched against instead of the id (`ncUserId`). */
		matchField: {
			type: String,
			default: '',
		},

		/** The row's own reference id(s), tried before the `matchField` lookup. */
		refValue: {
			type: [String, Number, Array],
			default: null,
		},

		/** A template over the referenced object for the label (`{givenName} {familyName}`). */
		labelTemplate: {
			type: String,
			default: '',
		},

		/** A dot path on the referenced object for the label (`applicant.name`). */
		labelPath: {
			type: String,
			default: '',
		},
	},

	data() {
		return {
			/**
			 * Resolved labels keyed by String(id). Filled from the store cache
			 * synchronously where possible, otherwise after the fetch resolves.
			 *
			 * @type {Record<string, string>}
			 */
			labels: {},
			/**
			 * Lookup keys whose resolution has finished, resolved or not.
			 *
			 * @type {Record<string, boolean>}
			 */
			settled: {},
		}
	},

	computed: {
		/**
		 * The reference ids as a normalized string array (empty when the
		 * value is unset).
		 *
		 * @return {string[]}
		 */
		ids() {
			return this.lookups.map((lookup) => lookup.match || lookup.ref)
		},

		/**
		 * One lookup per shown value: `ref` an id to read, `match` a value of
		 * `matchField` to find the record by, and `key` its label slot.
		 *
		 * @return {Array<{key: string, ref: string, match: string}>}
		 * @spec openspec/changes/fk-resolve-lookup/specs/fk-resolve-lookup/spec.md#requirement-a-reference-cell-can-look-its-record-up-by-a-property
		 */
		lookups() {
			const values = asIds(this.value)
			const refs = asIds(this.refValue)
			if (!this.matchField) {
				return (values.length > 0 ? values : refs).map((ref) => ({ key: ref, ref, match: '' }))
			}
			if (values.length === 0) {
				return refs.map((ref) => ({ key: `${ref}|`, ref, match: '' }))
			}
			const paired = refs.length === values.length
			return values.map((match, i) => {
				const ref = paired ? refs[i] : ''
				return { key: `${ref}|${match}`, ref, match }
			})
		},

		/**
		 * The rendered text: each lookup's resolved label, comma-joined for
		 * multi-refs. An id shows as itself while resolving and when it does
		 * not resolve; a `matchField` value shows only once nothing answered.
		 *
		 * @return {string}
		 */
		display() {
			return this.lookups
				.map((lookup) => this.labels[lookup.key] || (lookup.match === '' || this.settled[lookup.key] ? lookup.match || lookup.ref : ''))
				.filter((text) => text !== '')
				.join(', ')
		},

		/**
		 * Whether every lookup has a resolved label (false while fetching, and
		 * for one that could not be resolved, which shows as its value).
		 *
		 * @return {boolean}
		 */
		resolved() {
			return this.lookups.length > 0 && this.lookups.every((lookup) => Boolean(this.labels[lookup.key]))
		},
	},

	watch: {
		lookups: {
			immediate: true,
			handler() {
				this.resolveAll()
			},
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
			if (!this.register || !this.schema || this.lookups.length === 0) {
				return
			}
			const store = this.getObjectStore()
			// `schema` is a slug the manifest author wrote, not a `$ref` title:
			// use it exactly as given (a camelCase slug must not be kebab-cased).
			const type = store ? resolveObjectOpType(store, { register: this.register, schema: this.schema }, { exactSchema: true }) : ''
			await Promise.all(this.lookups.map(async (lookup) => {
				if (this.labels[lookup.key]) {
					return
				}
				let label = ''
				if (lookup.ref && store) {
					const cached = store.objects && store.objects[type] && store.objects[type][lookup.ref]
					label = this.pickLabel(cached || await this.fetchOne(store, type, lookup.ref))
				}
				if (!label && lookup.match) {
					label = this.pickLabel(await findByMatch(this.register, this.schema, this.matchField, lookup.match))
				}
				if (label) {
					this.labels[lookup.key] = label
				}
				this.settled[lookup.key] = true
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
			} catch {
				return null
			}
		},

		/**
		 * Extract the display label off a resolved object: `labelTemplate`
		 * filled, then `labelPath`, then `labelField`, then `title`, then
		 * `@self.name`. Translatable per-language
		 * maps collapse to their first value.
		 *
		 * @param {object|null} obj The referenced object.
		 * @return {string} The label, or '' when none is usable.
		 */
		pickLabel(obj) {
			if (!obj || typeof obj !== 'object') {
				return ''
			}
			const templated = this.labelTemplate ? fillTemplate(this.labelTemplate, obj).trim() : ''
			if (templated !== '') {
				return templated
			}
			const candidates = [this.labelPath ? readPath(obj, this.labelPath) : undefined, obj[this.labelField], obj.title, obj['@self'] && obj['@self'].name]
			for (const raw of candidates) {
				if (typeof raw === 'string' && raw !== '') {
					return raw
				}
				if (typeof raw === 'number') {
					return String(raw)
				}
				if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
					const first = Object.values(raw).find((v) => typeof v === 'string' && v !== '')
					if (first) {
						return first
					}
				}
			}
			return ''
		},

		/**
		 * The shared object store, or null when no Pinia is active (the cell
		 * then renders the raw id).
		 *
		 * @return {object|null}
		 */
		getObjectStore() {
			try {
				return useObjectStore()
			} catch {
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

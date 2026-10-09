<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<!--
  CnDetailHeaderChips — the row of field chips under a detail page's title
  (manifest `config.headerFields`). Internal to CnDetailPage.

  An empty value renders no chip, and a row with no chips renders nothing. A
  reference shows the referenced object's label and falls back to the raw id
  in mono when it does not resolve. Each chip reads "Title: value" to a screen
  reader, and the row prints as plain text.

  @spec openspec/changes/detail-header-field-chips/specs/detail-page-header/spec.md
-->

<template>
	<ul
		v-if="chips.length > 0"
		class="cn-detail-header-chips"
		data-testid="cn-detail-header-chips">
		<li
			v-for="chip in chips"
			:key="chip.key"
			class="cn-detail-header-chips__chip"
			:class="[`cn-detail-header-chips__chip--${chip.format}`, `cn-detail-header-chips__chip--${chip.variant}`]"
			:data-testid="`cn-detail-header-chip-${chip.key}`">
			<span class="hidden-visually">{{ chip.title }}: </span>
			<CnStatusBadge
				v-if="chip.format === 'badge'"
				:label="chip.text"
				:variant="chip.variant"
				size="small" />
			<NcUserBubble
				v-else-if="chip.format === 'user' && chip.userId"
				:user="chip.userId"
				:displayName="chip.text"
				:showUserStatus="false" />
			<time
				v-else-if="chip.format === 'date'"
				class="cn-detail-header-chips__value"
				:datetime="chip.iso"
				:title="chip.fullDate">{{ chip.text }}</time>
			<span
				v-else
				class="cn-detail-header-chips__value"
				:class="{ 'cn-detail-header-chips__value--mono': chip.mono }">{{ chip.text }}</span>
		</li>
	</ul>
</template>

<script>
import { getCanonicalLocale } from '@nextcloud/l10n'
import { NcUserBubble } from '@nextcloud/vue'
import CnStatusBadge from '../CnStatusBadge/CnStatusBadge.vue'
import { useObjectStore } from '../../store/useObjectStore.js'
import { resolveObjectOpType } from '../../utils/actionsDispatcher.js'
import { isEmptyChipValue, isPastDate, normalizeHeaderFields, pickRefLabel, variantForColor } from '../../utils/headerFieldChips.js'
import { schemaRefSlug } from '../../utils/schemaRefSlug.js'

const DAY_MS = 86400000

/**
 * CnDetailHeaderChips — the chips row of `CnDetailPage`'s header.
 */
export default {
	name: 'CnDetailHeaderChips',

	components: { CnStatusBadge, NcUserBubble },

	props: {
		/**
		 * The declared header fields (strings or `{ key, format, labelField, colorField, warnWhenPast }`).
		 *
		 * @type {Array<string|object>}
		 */
		fields: {
			type: Array,
			default: () => [],
		},

		/**
		 * The object the chips read their values from.
		 *
		 * @type {object|null}
		 */
		object: {
			type: Object,
			default: null,
		},

		/**
		 * The JSON Schema of the object, for property titles and `$ref` targets.
		 *
		 * @type {object|null}
		 */
		schema: {
			type: Object,
			default: null,
		},

		/** The OpenRegister register slug a reference resolves in. */
		register: {
			type: String,
			default: '',
		},
	},

	data() {
		return {
			// Resolved referenced objects, by "<schema slug>:<id>".
			refs: {},
		}
	},

	computed: {
		/** The normalised entries. */
		entries() {
			return normalizeHeaderFields(this.fields)
		},

		/** The chips that have a value to show, in declared order. */
		chips() {
			const obj = this.object
			if (!obj) {
				return []
			}
			const out = []
			for (const entry of this.entries) {
				const chip = this.buildChip(entry, obj)
				if (chip) {
					out.push(chip)
				}
			}
			return out
		},
	},

	watch: {
		object: { handler: 'resolveRefs', immediate: true },
		schema: 'resolveRefs',
	},

	methods: {
		/**
		 * The schema property definition of a field.
		 *
		 * @param {string} key The field key.
		 * @return {object|null} The property or null.
		 */
		propertyOf(key) {
			const props = this.schema && this.schema.properties
			return (props && props[key]) || null
		},

		/**
		 * The referenced schema slug of a property, or '' when it is not a reference.
		 *
		 * @param {object|null} prop The schema property.
		 * @return {string} The slug.
		 */
		refSlugOf(prop) {
			const ref = prop && (prop.$ref || (prop.items && prop.items.$ref))
			return ref ? String(schemaRefSlug(ref) || '') : ''
		},

		/**
		 * Build one chip, or null when its value is empty.
		 *
		 * @param {object} entry The normalised entry.
		 * @param {object} obj The object.
		 * @return {object|null} The chip view model.
		 */
		buildChip(entry, obj) {
			const raw = obj[entry.key]
			if (isEmptyChipValue(raw)) {
				return null
			}
			const prop = this.propertyOf(entry.key)
			const slug = this.refSlugOf(prop)
			const title = (prop && typeof prop.title === 'string' && prop.title) || entry.key
			const chip = { key: entry.key, title, format: entry.format, variant: 'default', mono: entry.format === 'mono', text: '', userId: '' }

			// A reference: an expanded object reads straight off, an id comes from the resolved cache.
			const isRefValue = (raw && typeof raw === 'object' && !Array.isArray(raw)) || slug !== ''
			if (isRefValue) {
				const refObj = (raw && typeof raw === 'object') ? raw : this.refs[`${slug}:${raw}`]
				const label = pickRefLabel(refObj, entry.labelField)
				const idText = (raw && typeof raw === 'object') ? String(raw.id ?? raw.uuid ?? '') : String(raw)
				chip.text = label || idText
				chip.mono = label === ''
				chip.userId = (refObj && (refObj.uid || refObj.id)) ? String(refObj.uid || refObj.id) : idText
				if (entry.format === 'badge' && entry.colorField && refObj) {
					chip.variant = variantForColor(refObj[entry.colorField])
				}
				return chip.text === '' ? null : chip
			}

			chip.text = Array.isArray(raw) ? raw.join(', ') : String(raw)
			chip.userId = String(raw)
			if (entry.format === 'date') {
				const time = new Date(raw).getTime()
				if (Number.isNaN(time)) {
					return null
				}
				chip.iso = new Date(time).toISOString()
				chip.fullDate = new Date(time).toLocaleString(this.locale())
				chip.text = this.relativeDate(time)
				if (entry.warnWhenPast && isPastDate(raw)) {
					chip.variant = 'error'
				}
			}
			return chip
		},

		/**
		 * The locale for date formatting.
		 *
		 * @return {string} A BCP 47 locale.
		 */
		locale() {
			try {
				return getCanonicalLocale()
			} catch {
				return 'en'
			}
		},

		/**
		 * A date as relative text ("in 3 days", "yesterday").
		 *
		 * @param {number} time The time in ms.
		 * @return {string} The relative text.
		 */
		relativeDate(time) {
			const startOfDay = (ms) => new Date(ms).setHours(0, 0, 0, 0)
			const days = Math.round((startOfDay(time) - startOfDay(Date.now())) / DAY_MS)
			try {
				return new Intl.RelativeTimeFormat(this.locale(), { numeric: 'auto' }).format(days, 'day')
			} catch {
				return new Date(time).toLocaleDateString()
			}
		},

		/**
		 * Resolve the referenced objects behind id-valued reference fields. A
		 * failed lookup leaves the id showing in mono.
		 *
		 * @return {Promise<void>}
		 */
		async resolveRefs() {
			if (!this.object || !this.register) {
				return
			}
			let store = null
			try {
				store = useObjectStore()
			} catch {
				return
			}
			if (!store) {
				return
			}
			await Promise.all(this.entries.map(async (entry) => {
				const raw = this.object[entry.key]
				const slug = this.refSlugOf(this.propertyOf(entry.key))
				if (!slug || isEmptyChipValue(raw) || typeof raw === 'object') {
					return
				}
				const cacheKey = `${slug}:${raw}`
				if (this.refs[cacheKey]) {
					return
				}
				try {
					const type = resolveObjectOpType(store, { register: this.register, schema: slug }, { exactSchema: true })
					const cached = store.objects && store.objects[type] && store.objects[type][raw]
					const found = cached || await store.fetchObject(type, String(raw))
					if (found) {
						this.refs = { ...this.refs, [cacheKey]: found }
					}
				} catch {
					// The id stays visible in mono.
				}
			}))
		},
	},
}
</script>

<style>
.cn-detail-header-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin: 6px 0 0;
	padding: 0;
	list-style: none;
}

.cn-detail-header-chips__chip {
	display: inline-flex;
	align-items: center;
	max-width: 100%;
	padding: 2px 10px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-pill, 16px);
	background: var(--color-background-hover);
	color: var(--color-main-text);
	font-size: 0.9em;
}

.cn-detail-header-chips__chip--error {
	border-color: var(--color-error);
	color: var(--color-error-text, var(--color-error));
}

.cn-detail-header-chips__chip--badge {
	padding: 0;
	border: none;
	background: transparent;
}

.cn-detail-header-chips__value--mono {
	font-family: var(--font-family-monospace, ui-monospace, monospace);
}

/* Printed, the row is plain text: no pill, border or background. */
@media print {
	.cn-detail-header-chips__chip {
		padding: 0;
		border: none;
		background: transparent;
		color: inherit;
	}

	.cn-detail-header-chips__chip:not(:last-child)::after {
		content: ' ·';
	}
}
</style>

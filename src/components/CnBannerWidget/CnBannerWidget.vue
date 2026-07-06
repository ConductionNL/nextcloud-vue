<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div v-if="visible" class="cn-banner-widget">
		<NcNoteCard :type="resolvedVariant" class="cn-banner-widget__card">
			<component
				:is="clickable ? 'a' : 'span'"
				class="cn-banner-widget__text"
				:class="{ 'cn-banner-widget__text--clickable': clickable }"
				:role="clickable ? 'button' : null"
				:tabindex="clickable ? 0 : null"
				data-testid="cn-banner-widget-text"
				@click="onClick"
				@keydown.enter="onClick">
				{{ resolvedText }}
			</component>
		</NcNoteCard>
	</div>
</template>

<script>
import { NcNoteCard } from '@nextcloud/vue'
import { buildHeaders, buildQueryString, prefixUrl } from '../../utils/headers.js'
import { resolveFilterTokens } from '../../utils/resolveFilterTokens.js'

/** Variants understood by NcNoteCard. */
const VARIANTS = ['info', 'warning', 'error', 'success']

/** Supported visibleWhen comparison operators. */
const OPS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte']

/**
 * CnBannerWidget — declarative notice banner for dashboards and v2 pages
 * (`banner` widget type, Wave 1 of nextcloud-vue#91).
 *
 * Renders a themed NcNoteCard with a variant (`info | warning | error`),
 * a text, an optional click-through route, and an optional `visibleWhen`
 * condition: a simple `{ field, op, value }` predicate evaluated against
 * an endpoint response or an OpenRegister source (the doriath
 * migration-banner case — "show while `pending > 0`").
 *
 * Config arrives either as flat props (v2 grid spreads `props`) or as a
 * stored `content` blob (CnDashboardPage's registry branch) — explicit
 * flat props win on collision.
 *
 * ```json
 * {
 *   "widgetKey": "banner",
 *   "props": {
 *     "variant": "warning",
 *     "text": "Migrations pending — open the migration overview.",
 *     "visibleWhen": { "endpoint": "/apps/doriath/api/migrations/status", "field": "pending", "op": "gt", "value": 0 },
 *     "route": "migrations"
 *   }
 * }
 * ```
 *
 * Fail-safe: with a `visibleWhen`, the banner stays HIDDEN until the
 * condition evaluates true — a failed fetch never breaks (or spams) a
 * dashboard.
 */
export default {
	name: 'CnBannerWidget',

	components: { NcNoteCard },

	props: {
		/**
		 * Banner severity variant: `info | warning | error` (plus `success`
		 * for completeness — NcNoteCard's set). Empty falls back to the
		 * `content` blob, then `info`.
		 */
		variant: {
			type: String,
			default: '',
			validator: (v) => v === '' || VARIANTS.includes(v),
		},
		/** Pre-translated banner text. Empty falls back to the `content` blob. */
		text: {
			type: String,
			default: '',
		},
		/**
		 * Optional visibility condition. Shape:
		 * `{ endpoint?, source?, field?, op?, value }` — exactly one of
		 * `endpoint` (a same-origin URL returning JSON) or `source`
		 * (`{ register, schema, filter? }`, an OpenRegister object query whose
		 * `filter` supports the shared @-token grammar). `field` is a
		 * dot-path into the response (for a `source`, into the first result;
		 * omit it — or use `@total` — to compare the collection total).
		 * `op` is `eq | neq | gt | gte | lt | lte` (default `eq`); `value` is
		 * the literal right-hand side. `null` (the default) shows the banner
		 * unconditionally.
		 * @type {object|null}
		 */
		visibleWhen: {
			type: Object,
			default: null,
		},
		/**
		 * Optional click-through route: a vue-router route NAME (string) or
		 * a full location object. When set, the banner text is an accessible
		 * button that navigates on click / Enter. `null` renders static text.
		 * @type {string|object|null}
		 */
		route: {
			type: [String, Object],
			default: null,
		},
		/**
		 * Stored content blob (CnDashboardPage registry branch) carrying the
		 * same keys as the flat props: `{ variant, text, visibleWhen, route }`.
		 * Explicit flat props win on collision.
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	data() {
		return {
			/** Evaluated visibleWhen outcome (null = not yet evaluated). */
			conditionMet: null,
		}
	},

	computed: {
		/** The effective variant (prop → content → 'info'). */
		resolvedVariant() {
			const v = this.variant || (this.content && this.content.variant) || 'info'
			return VARIANTS.includes(v) ? v : 'info'
		},
		/** The effective banner text (prop → content → ''). */
		resolvedText() {
			return this.text || (this.content && this.content.text) || ''
		},
		/** The effective visibleWhen condition (prop → content → null). */
		resolvedVisibleWhen() {
			return this.visibleWhen || (this.content && this.content.visibleWhen) || null
		},
		/** The effective click-through route (prop → content → null). */
		resolvedRoute() {
			return this.route || (this.content && this.content.route) || null
		},
		/** Whether the banner renders: no condition = always; else the evaluated outcome. */
		visible() {
			if (this.resolvedText === '') return false
			if (!this.resolvedVisibleWhen) return true
			return this.conditionMet === true
		},
		/** Whether the banner navigates on click (route set + router present). */
		clickable() {
			return !!this.resolvedRoute && !!this.$router
		},
	},

	watch: {
		resolvedVisibleWhen: {
			immediate: true,
			handler() { this.evaluateCondition() },
		},
	},

	methods: {
		/**
		 * Evaluate the `visibleWhen` predicate against its endpoint / OR
		 * source. Fail-safe: any fetch/shape error leaves the banner hidden.
		 *
		 * @return {Promise<void>}
		 */
		async evaluateCondition() {
			const cond = this.resolvedVisibleWhen
			if (!cond) {
				this.conditionMet = null
				return
			}
			try {
				const actual = await this.readConditionValue(cond)
				this.conditionMet = this.compare(actual, cond.op || 'eq', cond.value)
			} catch (e) {
				this.conditionMet = false
			}
		},

		/**
		 * Fetch the condition's left-hand value from the endpoint or the
		 * OpenRegister source.
		 *
		 * @param {object} cond The visibleWhen condition.
		 * @return {Promise<*>} The value `field` points at.
		 */
		async readConditionValue(cond) {
			if (cond.endpoint) {
				const response = await fetch(prefixUrl(cond.endpoint), { headers: buildHeaders() })
				if (!response.ok) throw new Error(`endpoint returned ${response.status}`)
				const data = await response.json()
				return this.readPath(data, cond.field)
			}
			const src = cond.source
			if (src && src.register && src.schema) {
				const filter = resolveFilterTokens(src.filter || {})
				const qs = buildQueryString({ ...filter, _limit: 1 })
				const url = prefixUrl(`/apps/openregister/api/objects/${src.register}/${src.schema}${qs}`)
				const response = await fetch(url, { headers: buildHeaders() })
				if (!response.ok) throw new Error(`source returned ${response.status}`)
				const data = await response.json()
				if (!cond.field || cond.field === '@total') {
					return data.total ?? (Array.isArray(data.results) ? data.results.length : 0)
				}
				const first = Array.isArray(data.results) ? data.results[0] : data
				return this.readPath(first, cond.field)
			}
			throw new Error('visibleWhen needs an endpoint or a source')
		},

		/**
		 * Read a dot-path off an object (`'a.b.c'`); the object itself when
		 * no field is given.
		 *
		 * @param {object} data The response object.
		 * @param {string} [field] Dot-path into the response.
		 * @return {*}
		 */
		readPath(data, field) {
			if (!field) return data
			return String(field).split('.').reduce((obj, key) => (obj == null ? obj : obj[key]), data)
		},

		/**
		 * Apply the comparison operator. Ordering operators coerce both
		 * sides to Number; equality compares loosely-normalized primitives
		 * (`String(a) === String(b)` when types differ) so `"3" eq 3` holds
		 * for JSON round-trips.
		 *
		 * @param {*} actual The fetched left-hand value.
		 * @param {string} op The operator (`eq` when unknown).
		 * @param {*} expected The declared right-hand value.
		 * @return {boolean}
		 */
		compare(actual, op, expected) {
			const operator = OPS.includes(op) ? op : 'eq'
			if (operator === 'eq' || operator === 'neq') {
				const equal = actual === expected || String(actual) === String(expected)
				return operator === 'eq' ? equal : !equal
			}
			const a = Number(actual)
			const b = Number(expected)
			if (!Number.isFinite(a) || !Number.isFinite(b)) return false
			if (operator === 'gt') return a > b
			if (operator === 'gte') return a >= b
			if (operator === 'lt') return a < b
			return a <= b
		},

		/**
		 * Navigate the click-through route (string name or location object).
		 *
		 * @return {void}
		 */
		onClick() {
			if (!this.clickable) return
			const route = this.resolvedRoute
			const location = typeof route === 'string' ? { name: route } : route
			this.$router.push(location).catch(() => {})
		},
	},
}
</script>

<style scoped>
.cn-banner-widget {
	width: 100%;
}

.cn-banner-widget__card {
	margin: 0;
}

.cn-banner-widget__text--clickable {
	cursor: pointer;
	text-decoration: underline;
	color: inherit;
}
</style>

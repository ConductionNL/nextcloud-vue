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
import { evaluateVisibleWhen } from '../../utils/visibleWhen.js'

/** Variants understood by NcNoteCard. */
const VARIANTS = ['info', 'warning', 'error', 'success']

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
		 * Evaluate the `visibleWhen` predicate through the shared
		 * `evaluateVisibleWhen` util (endpoint / OpenRegister-source modes —
		 * the Wave-1 banner shape is the canonical one, extracted to
		 * `utils/visibleWhen.js` in Wave 3 so manifest actions reuse it).
		 * Fail-safe: any fetch/shape error leaves the banner hidden.
		 *
		 * @return {Promise<void>}
		 */
		async evaluateCondition() {
			const cond = this.resolvedVisibleWhen
			if (!cond) {
				this.conditionMet = null
				return
			}
			this.conditionMet = await evaluateVisibleWhen(cond)
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

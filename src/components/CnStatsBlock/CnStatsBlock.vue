<!--
  - CnStatsBlock renders the CANONICAL KPI card (src/css/kpi-card.css) — the
  - same markup and the same stylesheet CnStatWidget renders, so OpenCatalogi's
  - KPIs and dossiq's are one design rather than two. This component's own
  - `cn-stats-block*` classes stay on the same elements for backwards
  - compatibility with app CSS that targets them; the LOOK comes from the
  - shared sheet.
  -
  - The comment lives OUT here rather than inside <template>: a comment node
  - beside the root element makes the component multi-root in Vue 3, and a
  - multi-root component has no root to put class attributes on — `rootClasses`
  - silently stopped reaching the DOM.
-->
<template>
	<component
		:is="componentTag"
		class="cn-kpi-card cn-stats-block"
		:class="rootClasses"
		v-bind="componentAttrs"
		@click="onClick">
		<!-- Icon -->
		<div v-if="hasIcon" class="cn-kpi-card__icon cn-stats-block__icon" :class="iconClasses">
			<slot name="icon">
				<component :is="icon" v-if="icon" :size="iconSize" />
			</slot>
		</div>

		<!-- Content -->
		<div class="cn-kpi-card__body cn-stats-block__content">
			<div class="cn-stats-block__header">
				<h4 class="cn-kpi-card__title" :title="title || undefined">
					{{ title || t('nextcloud-vue', 'Objects') }}
				</h4>
			</div>

			<div v-if="hasError" class="cn-stats-block__count cn-stats-block__count--error">
				<span class="cn-stats-block__count-value">&mdash;</span>
				<span class="cn-stats-block__count-label">{{ errorLabel }}</span>
			</div>
			<div v-else-if="hasValueSlot || count > 0 || (showZeroCount && count === 0)" class="cn-kpi-card__value-row cn-stats-block__count">
				<span class="cn-kpi-card__value cn-stats-block__count-value">
					<!-- @slot Override the prominently-displayed value — render a pre-formatted string (currency, percent, a "—" placeholder, …). `count` stays the raw number; this is presentation only. Defaults to the localized count. -->
					<!-- @binding {number} count The raw numeric count. -->
					<!-- @binding {string} formatted The default localized count string. -->
					<slot name="value" :count="count" :formatted="formattedCount">{{ formattedCount }}</slot>
				</span>
				<span class="cn-kpi-card__label cn-stats-block__count-label">{{ countLabel }}</span>
			</div>
			<div v-else-if="loading" class="cn-stats-block__loading">
				<NcLoadingIcon :size="16" />
				{{ loadingLabel }}
			</div>
			<div v-else class="cn-stats-block__empty">
				{{ emptyLabel }}
			</div>

			<!-- Breakdown details -->
			<div
				v-if="hasError === false && breakdown && (hasValueSlot || count > 0 || showZeroCount)"
				class="cn-stats-block__breakdown">
				<div
					v-for="(value, key) in breakdown"
					:key="key"
					class="cn-stats-block__breakdown-item">
					<span class="cn-stats-block__breakdown-label">{{ formatBreakdownLabel(key) }}</span>
					<span
						class="cn-stats-block__breakdown-value"
						:class="'cn-stats-block__breakdown-value--' + key">
						{{ value }}
					</span>
				</div>
			</div>
		</div>
	</component>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
// The canonical KPI look, shared with CnStatWidget. Imported here so the
// card is styled even when the consuming app has not pulled in the
// library's global css/index.css.
import '../../css/kpi-card.css'

/**
 * CnStatsBlock — Statistics display card with icon, count, and optional breakdown.
 *
 * Renders the canonical KPI card: a large circular icon beside a left-aligned
 * number, drawing no box of its own because the wrapper around it already
 * draws one. Supports colour variants, icons and clickable state. Use in a
 * CnKpiGrid for responsive dashboard layouts.
 *
 * Basic (canonical horizontal card)
 * ```vue
 * <CnStatsBlock title="Cases" :count="42" count-label="open cases" />
 * ```
 *
 * With icon and variant
 * ```vue
 * <CnStatsBlock
 *   title="Open Cases"
 *   :count="42"
 *   :icon="BriefcaseOutline"
 *   variant="primary"
 *   clickable
 *   @click="goToCases" />
 * ```
 *
 * Stacked and boxed — for a block mounted with no wrapper around it
 * ```vue
 * <CnStatsBlock title="Cases" :count="42" vertical filled />
 * ```
 *
 * With route-based navigation (renders as <router-link>)
 * ```vue
 * <CnStatsBlock
 *   title="Open Cases"
 *   :count="42"
 *   :icon="BriefcaseOutline"
 *   variant="primary"
 *   :route="{ name: 'Cases', query: { status: 'open' } }" />
 * ```
 *
 * With breakdown
 * ```vue
 * <CnStatsBlock
 *   title="Cases"
 *   :count="42"
 *   :breakdown="{ total: 100, invalid: 3, deleted: 5, published: 92 }" />
 * ```
 *
 * Custom icon slot
 * ```vue
 * <CnStatsBlock title="Files" :count="128">
 *   <template #icon>
 *     <FileDocumentOutline :size="24" />
 *   </template>
 * </CnStatsBlock>
 * ```
 */
export default {
	name: 'CnStatsBlock',

	components: {
		NcLoadingIcon,
	},

	props: {
		/** Block title */
		title: {
			type: String,
			default: '',
		},
		/** The main count number to display prominently */
		count: {
			type: Number,
			default: 0,
		},
		/** Label displayed next to the count */
		countLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'objects'),
		},
		/** Detailed breakdown object (key-value pairs) */
		breakdown: {
			type: Object,
			default: null,
		},
		/** Whether data is currently loading */
		loading: {
			type: Boolean,
			default: false,
		},
		/** Text shown while loading */
		loadingLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Loading...'),
		},
		/** Text shown when count is 0 */
		emptyLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'No items found'),
		},
		/**
		 * The tile could not load its number. Anything truthy counts — pass the
		 * caught error itself, or just `true`.
		 *
		 * The tile then shows a dash and `errorLabel` INSTEAD of a count, and
		 * tints itself `error`. This takes precedence over `count`, `loading`
		 * and `emptyLabel` deliberately: a stale or defaulted number rendered
		 * during a failure is the exact thing this prop exists to stop. A
		 * dashboard showing 0 because the backend is down is worse than one
		 * showing nothing, because 0 is a number a reader will believe.
		 * @type {boolean|string|Error|null}
		 */
		error: {
			// TYPE ORDER IS SEMANTIC HERE. Vue casts an empty value to `true`
			// when Boolean appears BEFORE String in the union, so
			// `[Boolean, String]` would read `error=""` as an error. A caller
			// clearing its message back to '' is reporting RECOVERY, and that
			// would have pinned the tile in its error state after the fetch
			// succeeded again. String first keeps '' falsy.
			type: [String, Boolean, Object],
			default: null,
		},
		/** Text shown in place of the count when `error` is set. */
		errorLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Unavailable'),
		},
		/** Icon component (e.g., imported MDI icon) */
		icon: {
			type: [Object, Function],
			default: null,
		},
		/** Icon size in pixels */
		iconSize: {
			type: Number,
			default: 24,
		},
		/** Color variant: 'default', 'primary', 'success', 'warning', 'error' */
		variant: {
			type: String,
			default: 'default',
			validator: (v) => ['default', 'primary', 'success', 'warning', 'error'].includes(v),
		},
		/**
		 * Stack the icon above a centred number instead of placing it beside
		 * one. The canonical KPI card is horizontal, so this is the opt-out;
		 * `horizontal` below is kept only for callers that already pass it.
		 */
		vertical: {
			type: Boolean,
			default: false,
		},
		/**
		 * Lay the icon left of the content. No longer needed — this is the
		 * canonical card's own layout — and kept so existing callers that pass
		 * `horizontal` keep working. Pass `vertical` to stack instead.
		 *
		 * @deprecated since 2.25.0, the horizontal layout is the default.
		 */
		horizontal: {
			type: Boolean,
			default: false,
		},
		/**
		 * Draw the card's own grey box. Off by default: a stats block is
		 * normally rendered inside a wrapper that already draws a card, and a
		 * second box reads as a card inside a card. Turn it on for a block
		 * mounted with no wrapper around it.
		 */
		filled: {
			type: Boolean,
			default: false,
		},
		/** Whether the card is clickable */
		clickable: {
			type: Boolean,
			default: false,
		},
		/** Whether to display 0 as a count value instead of the empty label */
		showZeroCount: {
			type: Boolean,
			default: false,
		},
		/**
		 * Vue Router location object for declarative navigation.
		 * When set, the card renders as a <router-link> and clickable styles are implied.
		 * { name: 'Cases', query: { status: 'open' } }
		 * { path: '/catalogi' }
		 */
		route: {
			type: Object,
			default: null,
		},
	},

	emits: ['click'],

	computed: {
		hasIcon() {
			return this.icon !== null || this.$slots.icon || this.$slots.icon
		},

		/**
		 * Whether a consumer provided the `value` slot. When set, the value
		 * area always renders (the slot decides what to show, even at count 0).
		 */
		hasValueSlot() {
			return !!this.$slots.value || !!this.$slots.value
		},

		/**
		 * Whether the tile is in its error state.
		 *
		 * Anything truthy counts, so a caller can pass the caught error itself
		 * rather than converting it to a boolean first. An empty string is NOT
		 * an error — that is a caller who cleared the message, not one
		 * reporting a failure.
		 *
		 * @return {boolean} True when the tile should show `errorLabel`.
		 */
		hasError() {
			return Boolean(this.error)
		},

		formattedCount() {
			return this.count.toLocaleString()
		},

		/**
		 * Whether the card is interactive (clickable or has a route).
		 * Used for applying hover/focus styles.
		 */
		isInteractive() {
			return !!this.route || this.clickable
		},

		/**
		 * Determines which HTML element or component to render.
		 * - route set → 'router-link' (SPA navigation)
		 * - clickable → 'a' (app handles click via event)
		 * - neither → 'div' (static display)
		 */
		componentTag() {
			if (this.route) return 'router-link'
			if (this.clickable) return 'a'
			return 'div'
		},

		/**
		 * Dynamic attributes for the root element based on rendering mode.
		 */
		componentAttrs() {
			if (this.route) return { to: this.route, tabindex: '0' }
			if (this.clickable) return { href: '#', role: 'button', tabindex: '0' }
			return {}
		},

		rootClasses() {
			return {
				// Canonical + legacy, in pairs: the canonical class carries the
				// look, the legacy one keeps existing app CSS matching.
				// The canonical card is already horizontal, so the legacy pair
				// is emitted for app CSS but carries no look of its own.
				'cn-kpi-card--horizontal': this.horizontal || !this.vertical,
				'cn-stats-block--horizontal': this.horizontal || !this.vertical,
				'cn-kpi-card--vertical': this.vertical,
				'cn-stats-block--vertical': this.vertical,
				'cn-kpi-card--filled': this.filled,
				'cn-kpi-card--clickable': this.isInteractive,
				'cn-stats-block--clickable': this.isInteractive,
				'cn-kpi-card--error': this.hasError,
				[`cn-kpi-card--${this.variant}`]: this.variant !== 'default' && this.hasError === false,
				// An errored tile tints itself. Requiring the consumer to also
				// pass `variant="error"` would mean every caller remembering
				// two props to express one state, and forgetting the second is
				// invisible — a tile that reads "Unavailable" in the default
				// colour looks like ordinary content.
				'cn-stats-block--error': this.hasError,
				[`cn-stats-block--${this.variant}`]: this.variant !== 'default' && this.hasError === false,
			}
		},

		iconClasses() {
			return {
				[`cn-stats-block__icon--${this.variant}`]: this.variant !== 'default',
			}
		},

	},

	methods: {
		formatBreakdownLabel(key) {
			return key.charAt(0).toUpperCase() + key.slice(1) + ':'
		},

		onClick(event) {
			// When route is set, router-link handles navigation — do not emit click
			if (this.route) return
			if (this.clickable) {
				event.preventDefault()
				this.$emit('click', event)
			}
		},
	},
}
</script>

<style scoped>
/*
 * The card's own look — box, body stack, icon circle, title, value, variants,
 * hover — is the CANONICAL KPI card in src/css/kpi-card.css, shared with
 * CnStatWidget. The rules that lived here duplicated it in different numbers
 * (a 1.2rem count row, a 40px icon, hardcoded rgba() tints that ignored a
 * re-themed palette), and that duplication IS how the two KPI looks drifted.
 * What is left below is this component's own extras: the breakdown block, the
 * loading line and the empty line.
 *
 * Those extras are secondary KPI text, so they read the shared
 * `--cn-kpi-label-*` scale rather than carrying sizes of their own — an empty
 * state that is a different size from the label it replaces is the same drift
 * in miniature.
 */

.cn-stats-block__header {
	max-width: 100%;
	min-width: 0;
}

.cn-stats-block__loading {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	gap: 6px;
	font-size: var(--cn-kpi-label-size, 13px);
	color: var(--cn-kpi-label-color, var(--color-text-maxcontrast));
}

.cn-stats-block__empty {
	text-align: start;
	font-size: var(--cn-kpi-label-size, 13px);
	color: var(--cn-kpi-label-color, var(--color-text-maxcontrast));
	font-style: italic;
}

.cn-stats-block__breakdown {
	margin-top: 4px;
	padding: 8px;
	font-size: var(--cn-kpi-label-size, 13px);
	background: var(--color-background-hover);
	border-radius: var(--border-radius);
	border: 1px solid var(--color-border);
	width: 100%;
	text-align: start;
}

.cn-stats-block__breakdown-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 8px;
	margin-bottom: 4px;
}

.cn-stats-block__breakdown-item:last-child {
	margin-bottom: 0;
}

.cn-stats-block__breakdown-label {
	font-weight: 500;
	color: var(--color-main-text);
}

/* The value takes the card's accent, so a breakdown reads as part of the tile
   it sits in rather than as a table that happened to land there. It used to
   carry a `--color-background-hover` chip — on a `--color-background-hover`
   breakdown box, which is to say an invisible chip drawn at the cost of two
   extra declarations and a differently-shaped hit area. The per-key modifiers
   below still win: `invalid`, `deleted` and `published` mean something
   specific and outrank the tile's own colour. */
.cn-stats-block__breakdown-value {
	font-weight: var(--cn-kpi-title-weight, 600);
	color: var(--cn-kpi-accent, var(--color-primary-element));
}

.cn-stats-block__breakdown-value--invalid { color: var(--color-element-warning); }
.cn-stats-block__breakdown-value--deleted { color: var(--color-element-error); }
.cn-stats-block__breakdown-value--published { color: var(--color-element-success); }
</style>

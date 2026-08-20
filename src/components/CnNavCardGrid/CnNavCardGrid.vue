<!--
  CnNavCardGrid — built-in v2 widget rendering a grid of navigation-link
  cards (ADR-044 §4 "cards-collapse"). Renders arbitrary navigation links
  from `props.entries`, unlike CnCardGrid / CnWidgetCardGrid / CnSiteCardGrid,
  which all render OpenRegister object data. Intended placement: a single
  full-grid instance on a `type: "dashboard"` page with `config.allowEdit:
  false`, replacing a deep menu group that has been collapsed into one
  top-level link (see menu-layout.json `relocations`) plus this landing page.

  Referenced in v2 manifests via `widgetKey: "nav-card-grid"`. Renders the
  grid on the shared CnWidgetWrapper chrome (title + standard overflow
  Actions menu: Refresh / Documentation / Request a feature). Each entry
  becomes a native <router-link> / <a> / <div> card — no custom keyboard
  handling, roving tabindex, or aria-label: native focusable elements are
  tab-reachable and Enter-activatable for free, and the accessible name
  comes from the card's own content.

  Spec: openspec/specs/nav-card-grid (cn-nav-card-grid)
-->
<template>
	<CnWidgetWrapper
		:title="title"
		:widget-id="widgetId"
		:documentation-url="documentationUrl"
		flush>
		<div class="cn-nav-card-grid">
			<component
				:is="cardTag(entry)"
				v-for="entry in visibleEntries"
				:key="entry.id"
				class="cn-nav-card-grid__card"
				:class="{ 'cn-nav-card-grid__card--disabled': isDisabled(entry) }"
				v-bind="cardAttrs(entry)"
				:aria-disabled="isDisabled(entry) ? 'true' : null"
				:aria-describedby="entry.description ? descId(entry) : null">
				<CnIcon
					v-if="entry.icon"
					:name="entry.icon"
					:size="28"
					class="cn-nav-card-grid__icon" />
				<div class="cn-nav-card-grid__body">
					<span class="cn-nav-card-grid__label">{{ entry.label }}</span>
					<span
						v-if="entry.description"
						:id="descId(entry)"
						class="cn-nav-card-grid__description">
						{{ entry.description }}
					</span>
				</div>
				<NcCounterBubble
					v-if="countFor(entry) !== null"
					class="cn-nav-card-grid__count"
					:count="countFor(entry)" />
			</component>
		</div>
	</CnWidgetWrapper>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcCounterBubble } from '@nextcloud/vue'
import { CnWidgetWrapper } from '../CnWidgetWrapper/index.js'
import { CnIcon } from '../CnIcon/index.js'
import { passesContextPredicates } from '../../utils/visibleIfContext.js'
import { isAppInstalled } from '../../utils/appInstalled.js'

/**
 * CnNavCardGrid — built-in v2 widget rendering a grid of navigation-link
 * cards.
 *
 * Renders the card grid on the shared CnWidgetWrapper chrome, which
 * supplies the widget title and the standard overflow Actions menu
 * (Refresh / Documentation / Request a feature). Each entry in `entries`
 * is rendered as a native `<router-link>` (resolvable `route`), `<a>`
 * (`href`), or a disabled, visibly-flagged `<div>` (an unresolvable
 * `route` — ADR-044 §5 forbids losing a reachable function silently, so
 * the card stays present rather than vanishing).
 *
 * The component performs NO data fetching. `count: "auto"` resolves from
 * the injected `cnMenuCounts` (populated by CnAppRoot's
 * `_hydrateMenuCounts()`, which also walks `nav-card-grid` widgets for this
 * purpose) via the injected `cnManifest`'s page list. `visibleIf` is
 * evaluated the same way CnAppNav evaluates a menuItem's `visibleIf`
 * (against `cnManifest.runtime`). `permission` is declared on the schema
 * for parity with `menuItem` but is NOT evaluated here — no v2 widget has
 * an injected permissions list today; that is fleet-wide follow-up work,
 * not specific to this component.
 */
export default {
	name: 'CnNavCardGrid',

	components: { CnWidgetWrapper, CnIcon, NcCounterBubble },

	inject: {
		/**
		 * Provided by CnAppRoot — the effective v2 manifest. Used to
		 * resolve an entry's `route` to a page (for disabled-route
		 * detection, `count: "auto"` resolution, and `visibleIf`'s
		 * runtime context). `null` when mounted outside a CnAppRoot
		 * ancestor (e.g. in isolation / tests) — every dependent
		 * computed degrades gracefully (routes are unresolvable, no
		 * counts resolve, visibleIf passes by default).
		 */
		cnManifest: { default: null },
		/**
		 * Provided by CnAppRoot — reactive `{ [register]: { [schema]: number } }`
		 * map populated by `_hydrateMenuCounts()` for every `count: "auto"`
		 * entry (both `menu[]` items and `nav-card-grid` widget entries).
		 * Defaults to an empty object so `countFor` returns `null` (no
		 * badge) when mounted outside a CnAppRoot ancestor.
		 */
		cnMenuCounts: { default: () => ({}) },
	},

	props: {
		/**
		 * Widget title shown in the CnWidgetWrapper header.
		 */
		title: {
			type: String,
			default: () => t('nextcloud-vue', 'Explore'),
		},
		/**
		 * Documentation link surfaced in the widget's overflow Actions menu.
		 * Empty (the default) hides the Documentation item; the Refresh and
		 * Request-a-feature items always render.
		 */
		documentationUrl: {
			type: String,
			default: '',
		},
		/**
		 * Stable id forwarded to the widget chrome for the Refresh /
		 * Request-a-feature payloads, and used to namespace each card's
		 * `aria-describedby` target id.
		 */
		widgetId: {
			type: String,
			default: '',
		},
		/** Array of navCardEntry records to render as navigation cards. */
		entries: {
			type: Array,
			default: () => [],
		},
	},

	computed: {
		/**
		 * `entries` filtered by `visibleIf` and sorted by `order` (entries
		 * with an explicit order first, ascending; entries without one keep
		 * their original relative order and render last) — the same
		 * ordering rule CnAppNav applies to `menu[]` items.
		 *
		 * @return {Array<object>}
		 */
		visibleEntries() {
			const runtime = this.cnManifest?.runtime ?? null
			return this.entries
				.filter((entry) => this.passesVisibleIf(entry, runtime))
				.slice()
				.sort((a, b) => {
					const aHas = typeof a.order === 'number'
					const bHas = typeof b.order === 'number'
					if (aHas && !bHas) return -1
					if (!aHas && bHas) return 1
					if (!aHas && !bHas) return 0
					return a.order - b.order
				})
		},
	},

	created() {
		// Non-reactive one-shot latch for the disabled-route console.warn,
		// keyed by entry id — keeps the console quiet on re-renders. Deliberately
		// NOT in `data()`: Vue reserves underscore-prefixed data keys (and a
		// reactive Set mutated from a computed getter, see `isDisabled`, would
		// re-trigger the render effect anyway). Mirrors CnAppNav's
		// `_autoCountWarned` latch, seeded the same way for the same reason.
		this._warnedUnresolvedRoutes = new Set()
	},

	methods: {
		/**
		 * Evaluate a `navCardEntry`'s `visibleIf` condition block. Same
		 * semantics as CnAppNav's `passesVisibleIf` for menu items:
		 * `appInstalled` is checked via the shared `isAppInstalled` helper;
		 * any other key is a dot-path predicate against `runtime`,
		 * evaluated by the shared `passesContextPredicates`.
		 *
		 * @param {object} entry The navCardEntry to evaluate.
		 * @param {object|null} runtime `cnManifest.runtime`, or null.
		 * @return {boolean} Whether the entry should render.
		 */
		passesVisibleIf(entry, runtime) {
			const condition = entry.visibleIf
			if (!condition || typeof condition !== 'object') return true
			if (condition.appInstalled && !isAppInstalled(condition.appInstalled)) return false
			return passesContextPredicates(condition, runtime)
		},

		/**
		 * Resolve a navCardEntry's `route` to its manifest page, or `null`
		 * when unset or unresolvable.
		 *
		 * @param {object} entry The navCardEntry.
		 * @return {object|null} The matching `cnManifest.pages[]` entry.
		 */
		pageForEntry(entry) {
			if (!entry.route) return null
			const pages = this.cnManifest?.pages ?? []
			return pages.find((p) => p.id === entry.route) ?? null
		},

		/**
		 * Whether a card is disabled: it declares a `route` that does not
		 * resolve to any page in the injected manifest. An entry with no
		 * `route` at all (an `href` card, or a purely informational card
		 * with neither) is never "disabled" by this rule — it simply has
		 * no navigation target to fail to resolve. Emits one console.warn
		 * per entry id per mount (ADR-044 §5 — never lose a reachable
		 * function silently; the warn is the development-time signal that
		 * a menu-layout relocation or manifest edit broke a card's target).
		 *
		 * @param {object} entry The navCardEntry.
		 * @return {boolean}
		 */
		isDisabled(entry) {
			if (!entry.route) return false
			if (this.pageForEntry(entry)) return false
			if (!this._warnedUnresolvedRoutes.has(entry.id)) {
				this._warnedUnresolvedRoutes.add(entry.id)
				// eslint-disable-next-line no-console
				console.warn(`[CnNavCardGrid] entry "${entry.id}" targets unresolved route "${entry.route}"`)
			}
			return true
		},

		/**
		 * Resolve the count badge value for an entry.
		 *
		 *  - Literal positive integer in `entry.count` → return as-is.
		 *  - `entry.count === "auto"` → resolve the entry's page; when it is
		 *    `type: "index"` with `register`/`schema` in its `config`,
		 *    return `cnMenuCounts[register][schema]` (or null when absent).
		 *  - Otherwise → `null` (no badge).
		 *
		 * @param {object} entry The navCardEntry.
		 * @return {number|null} Count to render, or null for no badge.
		 */
		countFor(entry) {
			const raw = entry?.count
			if (raw === undefined || raw === null) return null
			if (typeof raw === 'number') {
				return raw > 0 ? raw : null
			}
			if (raw !== 'auto') return null
			const page = this.pageForEntry(entry)
			const register = page?.config?.register
			const schema = page?.config?.schema
			if (page?.type !== 'index' || !register || !schema) return null
			const value = this.cnMenuCounts?.[register]?.[schema]
			return typeof value === 'number' && value > 0 ? value : null
		},

		/**
		 * Which native element renders this entry: `router-link` for a
		 * resolvable `route`, `a` for `href`, `div` otherwise (an
		 * unresolvable `route`, or an entry with neither).
		 *
		 * @param {object} entry The navCardEntry.
		 * @return {string} Tag/component name for the dynamic `:is`.
		 */
		cardTag(entry) {
			if (entry.route && !this.isDisabled(entry)) return 'router-link'
			if (entry.href) return 'a'
			return 'div'
		},

		/**
		 * Attributes bound onto the dynamic card element per `cardTag`.
		 *
		 * @param {object} entry The navCardEntry.
		 * @return {object} Props/attrs for `v-bind`.
		 */
		cardAttrs(entry) {
			if (entry.route && !this.isDisabled(entry)) {
				return { to: { name: entry.route } }
			}
			if (entry.href) {
				return { href: entry.href, target: '_blank', rel: 'noopener noreferrer' }
			}
			return {}
		},

		/**
		 * Stable DOM id for an entry's description element, targeted by
		 * the card's `aria-describedby`. Namespaced by `widgetId` so
		 * multiple CnNavCardGrid instances on one page never collide.
		 *
		 * @param {object} entry The navCardEntry.
		 * @return {string}
		 */
		descId(entry) {
			return `cn-nav-card-grid-desc-${this.widgetId || 'default'}-${entry.id}`
		},
	},
}
</script>

<style>
.cn-nav-card-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
	gap: calc(2 * var(--default-grid-baseline, 4px));
}

.cn-nav-card-grid__card {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	padding: 16px;
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 10px);
	color: var(--color-main-text);
	text-decoration: none;
	cursor: pointer;
	transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.cn-nav-card-grid__card:hover,
.cn-nav-card-grid__card:focus-visible {
	border-color: var(--color-primary-element);
	box-shadow: 0 2px 8px var(--color-box-shadow);
}

.cn-nav-card-grid__card--disabled {
	cursor: not-allowed;
	opacity: 0.5;
}

.cn-nav-card-grid__card--disabled:hover {
	border-color: var(--color-border);
	box-shadow: none;
}

.cn-nav-card-grid__icon {
	flex-shrink: 0;
	color: var(--color-primary-element);
}

.cn-nav-card-grid__body {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-nav-card-grid__label {
	font-size: 16px;
	font-weight: 600;
	line-height: 1.3;
}

.cn-nav-card-grid__description {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
	line-height: 1.4;
}

.cn-nav-card-grid__count {
	flex-shrink: 0;
}
</style>

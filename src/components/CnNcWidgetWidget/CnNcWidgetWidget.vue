<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-nc-widget-widget" :class="{ 'cn-nc-widget-widget--horizontal': displayMode === 'horizontal' }">
		<header v-if="showsHeader" class="cn-nc-widget-widget__header" data-testid="cn-nc-widget-header">
			<img
				v-if="widgetIconUrl"
				class="cn-nc-widget-widget__header-icon"
				:src="widgetIconUrl"
				alt="">
			<span class="cn-nc-widget-widget__header-title">{{ widgetTitle }}</span>
		</header>

		<!--
			Native callback container — always present but hidden until the
			OCA.Dashboard callback mounts into it. Keeping it mounted avoids a
			flicker when the native path wins after the API list has painted.

			The `--horizontal` reskin class lives on the ROOT element, not here:
			native widget callbacks mount via `new Vue(...).$mount(el)`, which
			REPLACES this element in the live DOM with the callback's own root
			node — any class we put directly on it is discarded along with the
			element itself, so it can never appear in the rendered page.
		-->
		<div
			v-show="mode === 'native'"
			ref="nativeContainer"
			class="cn-nc-widget-widget__native" />

		<div
			v-if="mode !== 'native'"
			class="cn-nc-widget-widget__body"
			:class="bodyClass">
			<div v-if="loading" class="cn-nc-widget-widget__state">
				{{ t('nextcloud-vue', 'Loading…') }}
			</div>

			<div v-else-if="!widgetId" class="cn-nc-widget-widget__state">
				{{ t('nextcloud-vue', 'No widget selected') }}
			</div>

			<div v-else-if="unsupported" class="cn-nc-widget-widget__state" data-testid="nc-widget-unsupported">
				{{ t('nextcloud-vue', 'This widget can only be shown on the Nextcloud dashboard itself.') }}
			</div>

			<div v-else-if="shownItems.length === 0" class="cn-nc-widget-widget__state">
				{{ t('nextcloud-vue', 'No items available') }}
			</div>

			<template v-else>
				<a
					v-for="(item, idx) in shownItems"
					:key="item.sinceId || item.id || idx"
					class="cn-nc-widget-widget__item"
					:class="itemClass"
					:href="item.link || '#'"
					:title="item.title">
					<span class="cn-nc-widget-widget__item-icon-wrap">
						<img
							v-if="item.iconUrl"
							class="cn-nc-widget-widget__item-icon"
							:src="item.iconUrl"
							alt="">
						<img
							v-if="item.overlayIconUrl"
							class="cn-nc-widget-widget__item-overlay"
							:src="item.overlayIconUrl"
							alt="">
					</span>
					<span class="cn-nc-widget-widget__item-text">
						<span class="cn-nc-widget-widget__item-title">{{ item.title }}</span>
						<span v-if="item.subtitle" class="cn-nc-widget-widget__item-subtitle">{{ item.subtitle }}</span>
					</span>
				</a>
				<!-- With a `limit`, the rest is one link away (`showAllUrl`, else the widget's own page). -->
				<a
					v-if="showAllHref"
					class="cn-nc-widget-widget__show-all"
					data-testid="nc-widget-show-all"
					:href="showAllHref">
					{{ showAllLabel }}
				</a>
			</template>
		</div>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { generateOcsUrl } from '@nextcloud/router'

const API_ITEM_LIMIT = 7

/**
 * Read the global `OCA.Dashboard` registry without assuming it exists.
 *
 * @return {object|null} the `OCA.Dashboard` object, or `null` when absent.
 */
function getDashboardGlobal() {
	if (typeof window === 'undefined') {
		return null
	}
	const oca = window.OCA
	return oca && oca.Dashboard ? oca.Dashboard : null
}

/**
 * CnNcWidgetWidget — proxies any native Nextcloud Dashboard widget into a
 * dashboard grid cell.
 *
 * Two-mode rendering (decoupling seam — reads NC directly, no app bridge):
 *  - **native** — when the widget bundle has registered a callback on the
 *    global `OCA.Dashboard` (`getWidget(id)` / `widgets[id]`), the callback is
 *    handed the render container and paints itself (native fast-path).
 *  - **api** — otherwise the OCS Dashboard endpoint
 *    `/apps/dashboard/api/v{1,2}/widget-items` is fetched directly via
 *    `@nextcloud/axios` and a flat item list is rendered.
 *
 * The header title + icon come from the dashboard widget metadata
 * (`OCA.Dashboard` registry, falling back to the configured `widgetId`). When
 * no `widgetId` is configured the widget renders an empty state and never hits
 * the network.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnNcWidgetWidget',

	inject: {
		/** Whether the hosting card draws a title row (CnWidgetWrapper). */
		cnWidgetTitled: { default: null },
	},

	props: {
		/**
		 * Persisted widget content `{widgetId, displayMode, limit?, showAllUrl?, showAllLabel?, showHeader?, excludeApps?, excludeTypes?}`.
		 * `excludeApps` (`["systemtags"]`) and `excludeTypes` leave out the
		 * items of those apps or types (an item's own `app` / `type`, else the
		 * app in its link or icon URL); the list then comes from the items API.
		 * `showHeader: false` drops the widget's own header (icon and title);
		 * it is dropped too when the hosting card draws a title row.
		 * `limit` is the most items shown (the list then comes from the items
		 * API, so it fits its cell); `showAllUrl` / `showAllLabel` the link to
		 * the rest (default the widget's own page and "Show all").
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	data() {
		return {
			/** @type {'pending'|'native'|'api'} the resolved mounting mode. */
			mode: 'pending',
			/**
			 * Whether the items API has no entry for this widget at all.
			 *
			 * Not the same as an empty list. A widget whose provider implements
			 * only `IWidget` (no `IAPIWidget`/`IAPIWidgetV2`) declares
			 * `itemApiVersions: []` and is simply ABSENT from the widget-items
			 * response, while a widget with nothing to show right now comes
			 * back as its own key holding an empty list. The Tasks app's widget
			 * is the first kind: with no native callback registered on the page
			 * it can never render a single item here, and saying "No items
			 * available" under it told the reader their task list was empty.
			 *
			 * @type {boolean}
			 */
			unsupported: false,
			loading: false,
			items: [],
		}
	},

	computed: {
		/**
		 * The configured native widget id.
		 *
		 * @return {string} the widget id (empty when unset).
		 */
		widgetId() {
			return typeof (this.content && this.content.widgetId) === 'string' ? this.content.widgetId : ''
		},

		/**
		 * The item list orientation.
		 *
		 * @return {string} `horizontal` or `vertical`.
		 */
		displayMode() {
			return (this.content && this.content.displayMode) === 'horizontal' ? 'horizontal' : 'vertical'
		},

		/**
		 * The native widget metadata from the `OCA.Dashboard` global.
		 *
		 * @return {object|null} the widget metadata, or `null`.
		 */
		widgetMeta() {
			const dashboard = getDashboardGlobal()
			if (!dashboard || !this.widgetId) {
				return null
			}
			if (typeof dashboard.getWidget === 'function') {
				return dashboard.getWidget(this.widgetId) || null
			}
			if (dashboard.widgets && typeof dashboard.widgets === 'object') {
				return dashboard.widgets[this.widgetId] || null
			}
			return null
		},

		/**
		 * Whether the widget draws its own header: not with
		 * `content.showHeader: false`, nor inside a card that draws a title.
		 *
		 * @spec openspec/changes/nc-widget-header/specs/nc-widget-header/spec.md#requirement-a-nextcloud-widget-draws-no-second-heading
		 * @return {boolean}
		 */
		showsHeader() {
			if (this.content && this.content.showHeader === false) {
				return false
			}
			return !(typeof this.cnWidgetTitled === 'function' && this.cnWidgetTitled())
		},

		/**
		 * The header title.
		 *
		 * @return {string} the title.
		 */
		widgetTitle() {
			return (this.widgetMeta && this.widgetMeta.title) || this.widgetId || t('nextcloud-vue', 'Widget')
		},

		/**
		 * The header icon URL.
		 *
		 * @return {string} the icon URL (empty when none).
		 */
		widgetIconUrl() {
			return (this.widgetMeta && this.widgetMeta.iconUrl) || ''
		},

		/**
		 * The most items the list shows (`content.limit`), or 0 for no limit.
		 * A limit lets the widget fit a dashboard cell instead of scrolling
		 * inside it.
		 *
		 * @spec openspec/changes/screens-nc-widget-limit/specs/nc-widget/spec.md#requirement-a-nextcloud-widget-shows-at-most-its-limit
		 * @return {number} the limit.
		 */
		itemLimit() {
			const limit = Number(this.content && this.content.limit)
			return Number.isInteger(limit) && limit > 0 ? limit : 0
		},

		/**
		 * The items drawn: at most `itemLimit`.
		 *
		 * @return {object[]} the items.
		 */
		shownItems() {
			const kept = this.hasExclusions ? this.items.filter((item) => !this.isExcluded(item)) : this.items
			return this.itemLimit > 0 ? kept.slice(0, this.itemLimit) : kept
		},

		/**
		 * The apps and item types `content.excludeApps` / `content.excludeTypes`
		 * leave out, lower-cased.
		 *
		 * @spec openspec/changes/nc-widget-exclude-apps/specs/nc-widget/spec.md#requirement-a-nextcloud-widget-can-leave-out-items-of-an-app-or-type
		 * @return {{apps: string[], types: string[]}}
		 */
		exclusions() {
			const list = (value) => (Array.isArray(value) ? value : (typeof value === 'string' && value !== '' ? [value] : []))
				.filter((entry) => typeof entry === 'string' && entry !== '')
				.map((entry) => entry.toLowerCase())
			return { apps: list(this.content && this.content.excludeApps), types: list(this.content && this.content.excludeTypes) }
		},

		/**
		 * How many items to ask the API for: the limit (or the default), and
		 * more while items are left out, so a filtered list still fills it.
		 *
		 * @return {number}
		 */
		requestLimit() {
			const base = this.itemLimit > 0 ? this.itemLimit : API_ITEM_LIMIT
			return this.hasExclusions ? Math.max(base * 3, 20) : base
		},

		/** @return {boolean} Whether any app or type is left out. */
		hasExclusions() {
			return this.exclusions.apps.length > 0 || this.exclusions.types.length > 0
		},

		/**
		 * Where "Show all" goes: `content.showAllUrl`, else the page the widget
		 * names itself (its `url`). Only with a limit; '' for no link.
		 *
		 * @spec openspec/changes/screens-nc-widget-limit/specs/nc-widget/spec.md#requirement-a-nextcloud-widget-shows-at-most-its-limit
		 * @return {string} the URL.
		 */
		showAllHref() {
			if (this.itemLimit === 0) {
				return ''
			}
			const own = this.content && typeof this.content.showAllUrl === 'string' ? this.content.showAllUrl : ''
			return own || (this.widgetMeta && typeof this.widgetMeta.url === 'string' ? this.widgetMeta.url : '')
		},

		/**
		 * The "Show all" text (`content.showAllLabel`, else the library's).
		 *
		 * @return {string} the label.
		 */
		showAllLabel() {
			const label = this.content && this.content.showAllLabel
			return typeof label === 'string' && label !== '' ? label : t('nextcloud-vue', 'Show all')
		},

		/**
		 * The body orientation CSS modifier class.
		 *
		 * @return {string} the body class.
		 */
		bodyClass() {
			return `cn-nc-widget-widget__body--${this.displayMode}`
		},

		/**
		 * The item orientation CSS modifier class.
		 *
		 * @return {string} the item class.
		 */
		itemClass() {
			return `cn-nc-widget-widget__item--${this.displayMode}`
		},
	},

	mounted() {
		this.tryMount()
	},

	methods: {
		/**
		 * Whether an item belongs to an app or type the content leaves out: its
		 * own `app` / `type` / `objectType`, else the app in an `/apps/<app>/`
		 * part of its link or icons.
		 *
		 * @spec openspec/changes/nc-widget-exclude-apps/specs/nc-widget/spec.md#requirement-a-nextcloud-widget-can-leave-out-items-of-an-app-or-type
		 * @param {object} item A widget item.
		 * @return {boolean}
		 */
		isExcluded(item) {
			if (!item || typeof item !== 'object') {
				return false
			}
			const { apps, types } = this.exclusions
			const own = (value) => (typeof value === 'string' ? value.toLowerCase() : '')
			const appsOf = [own(item.app)]
			for (const url of [item.link, item.iconUrl, item.overlayIconUrl]) {
				const match = typeof url === 'string' ? url.match(/\/apps\/([a-z0-9_-]+)\//i) : null
				if (match) {
					appsOf.push(match[1].toLowerCase())
				}
			}
			if (apps.length > 0 && appsOf.some((app) => app !== '' && apps.includes(app))) {
				return true
			}
			return types.length > 0 && [own(item.type), own(item.objectType)].some((type) => type !== '' && types.includes(type))
		},

		t,

		/**
		 * Resolve the mounting mode. Prefers the native `OCA.Dashboard`
		 * callback fast-path; otherwise falls back to the OCS item list.
		 *
		 * @return {void}
		 */
		tryMount() {
			if (!this.widgetId) {
				this.mode = 'api'
				this.items = []
				return
			}
			// The native callback paints its own opaque markup, so `displayMode`
			// (bodyClass/itemClass below) has no effect on it — only the API
			// item list honours the vertical/horizontal setting. Horizontal mode
			// must therefore skip the native fast-path, or the "Horizontal
			// (cards)" option would silently do nothing for the (common) case
			// where the widget has a registered native callback.
			// A `limit` also takes the API list first: the native callback paints
			// as many items as it likes. Its fallback to native stays.
			// Leaving items out works on the API list only, so it skips native too.
			if (this.displayMode !== 'horizontal' && this.itemLimit === 0 && !this.hasExclusions) {
				const callback = this.resolveNativeCallback()
				if (typeof callback === 'function') {
					this.mountNative(callback)
					return
				}
			}
			this.mode = 'api'
			this.loadApiItems()
		},

		/**
		 * Look up a native render callback on the `OCA.Dashboard` global.
		 *
		 * @return {((el: HTMLElement, ctx: {widget: object}) => unknown)|null} the callback, or `null` when none is registered.
		 */
		resolveNativeCallback() {
			const dashboard = getDashboardGlobal()
			if (!dashboard) {
				return null
			}
			if (this.widgetMeta && typeof this.widgetMeta.callback === 'function') {
				return this.widgetMeta.callback
			}
			if (dashboard.callbacks && typeof dashboard.callbacks[this.widgetId] === 'function') {
				return dashboard.callbacks[this.widgetId]
			}
			return null
		},

		/**
		 * Mount the widget natively by invoking its registered callback with
		 * our render container.
		 *
		 * @param {(el: HTMLElement, ctx: {widget: object}) => unknown} callback the native render callback.
		 * @return {void}
		 */
		mountNative(callback) {
			this.mode = 'native'
			this.$nextTick(() => {
				const container = this.$refs.nativeContainer
				if (!container) {
					return
				}
				// Native callback failed — fall back to the API list.
				const fallback = () => {
					this.mode = 'api'
					this.loadApiItems()
				}
				try {
					// NC dashboard widgets are registered as
					// `register(id, (el, { widget }) => …)` — the second argument
					// MUST be the `{ widget }` envelope, not the bare metadata, or
					// the widget destructures `widget` as undefined and throws on
					// first use (e.g. `widget.title`).
					const result = callback(container, { widget: this.widgetMeta || {} })
					// Most widget callbacks are async; a synchronous try/catch
					// can't see a rejected promise, so wire the fallback to it too.
					if (result && typeof result.then === 'function') {
						result.catch(fallback)
					}
				} catch {
					fallback()
				}
			})
		},

		/**
		 * Fetch the API fallback list directly from the OCS Dashboard
		 * endpoint. Malformed or failed responses collapse to an empty list
		 * (the empty state) instead of throwing.
		 *
		 * @return {Promise<void>}
		 */
		async loadApiItems() {
			this.loading = true
			try {
				// The v2 widget-items API only returns an entry for widgets
				// whose server-side provider implements `IAPIWidgetV2` — plenty
				// of native dashboard widgets are JS-callback-only (`IWidget`)
				// and never appear in this response at all, which looks
				// identical to "0 items" from here. extractItems() tolerates
				// both the flat-array (older providers) and `{items}` (v2) shapes.
				const url = generateOcsUrl('/apps/dashboard/api/v2/widget-items')
				const response = await axios.get(url, {
					params: { widgets: [this.widgetId], limit: this.requestLimit },
				})
				const data = response && response.data && response.data.ocs ? response.data.ocs.data : null
				const widgetData = data ? data[this.widgetId] : null
				this.items = this.extractItems(widgetData)
				// Only a SUCCESSFUL response can say the widget is absent. A
				// failed request says nothing about the widget, so it keeps
				// the ordinary empty state rather than a claim about the app.
				this.unsupported = data !== null && (widgetData === null || widgetData === undefined)
			} catch {
				this.items = []
				this.unsupported = false
			} finally {
				this.loading = false
			}

			// Horizontal mode deliberately skips the native fast-path (see
			// tryMount()) to get the styled card layout. But when the API has
			// no entry for this widget at all — no `IAPIWidgetV2` support, not
			// "no items right now" — that would render a false empty state for
			// a widget that actually has content. Fall back to native
			// rendering rather than lying about there being nothing to show.
			if (this.items.length === 0) {
				const callback = this.resolveNativeCallback()
				if (typeof callback === 'function') {
					this.mountNative(callback)
				}
			}
		},

		/**
		 * Normalise a per-widget OCS payload to an items array, tolerating both
		 * the flat array and the `{items}` envelope shapes.
		 *
		 * @param {unknown} widgetData the per-widget payload.
		 * @return {object[]} the items array (possibly empty).
		 */
		extractItems(widgetData) {
			if (!widgetData) {
				return []
			}
			if (Array.isArray(widgetData)) {
				return widgetData
			}
			if (Array.isArray(widgetData.items)) {
				return widgetData.items
			}
			if (widgetData.items && typeof widgetData.items === 'object') {
				return Object.values(widgetData.items)
			}
			return []
		},
	},
}
</script>

<style scoped>
.cn-nc-widget-widget {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	overflow: hidden;
}

/*
 * Header + content match the native Nextcloud Dashboard panel (apps/dashboard)
 * exactly — this component's whole job is rendering NC dashboard widgets, so it
 * should look native by default: 16px header, 32px leading icon with a 16px
 * gap, a 20px/700 title, and the native panel content inset (16px sides +
 * bottom, flush to the header on top). Same design tokens as core; overridable
 * via the host's CnWidgetWrapper styleConfig / nldesign.
 */
.cn-nc-widget-widget__header {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 16px;
	font-weight: 700;
}

.cn-nc-widget-widget__header-icon {
	width: 32px;
	height: 32px;
	flex: 0 0 auto;
}

.cn-nc-widget-widget__header-title {
	flex: 1;
	font-size: 20px;
	font-weight: 700;
	line-height: 24px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-nc-widget-widget__show-all {
	align-self: flex-start;
	padding: 8px 0 0;
	color: var(--color-primary-element);
	font-weight: 600;
	text-decoration: none;
}

.cn-nc-widget-widget__show-all:hover,
.cn-nc-widget-widget__show-all:focus-visible {
	text-decoration: underline;
}

.cn-nc-widget-widget__native {
	flex: 1;
	overflow: auto;
	padding: 0 16px 16px;
}

/*
 * The native `OCA.Dashboard` callback paints its own markup we don't control
 * — for first-party widgets that's almost always `@nextcloud/vue`'s
 * `NcDashboardWidget` / `NcDashboardWidgetItem` (`.dashboard-widget` wrapping
 * a bare `<ul>`/`<li>` list, each item a `.item-list__entry`).
 *
 * Only the LIST CONTAINER is retiled into a grid here — `.item-list__entry`'s
 * own internal layout is left untouched. An earlier version of this override
 * also forced `.item-list__entry` from row to column, but its icon-overlay
 * badge (`.item-icon`, see @nextcloud/vue's NcDashboardWidgetItem CSS) is
 * positioned with negative margins calibrated for the row layout, so
 * flipping to column made items visually overlap. Tiling the `<li>`s into a
 * grid while each entry keeps its normal icon+text row reads as a grid of
 * card tiles without touching that internal math.
 *
 * Scoped from `.cn-nc-widget-widget--horizontal` on the ROOT element, not
 * `.cn-nc-widget-widget__native`: the callback mounts via `.$mount(el)`,
 * which replaces `nativeContainer` in the live DOM outright, so any class
 * placed directly on it never survives to be selectable.
 *
 * The 250px column floor matches `.item-list__entry`'s own natural minimum
 * width (avatar + padding + its un-truncatable-below-this content) — a grid
 * track narrower than that squeezes the entry below its real minimum and it
 * overflows into the neighbouring cell. `min-width: 0` on the `<li>` alone
 * isn't enough to shrink it further: the item's own internal flex layout
 * still claims that much room regardless of the grid track size, so the
 * track itself must not go below it.
 */
.cn-nc-widget-widget--horizontal :deep(.dashboard-widget > ul) {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
	gap: 8px;
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-nc-widget-widget--horizontal :deep(.dashboard-widget > ul > li) {
	width: auto;
	min-width: 0;
}

.cn-nc-widget-widget--horizontal :deep(.item-list__entry) {
	height: 100%;
	margin: 0;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
}

.cn-nc-widget-widget__body {
	flex: 1;
	overflow: auto;
	padding: 0 16px 16px;
}

.cn-nc-widget-widget__body--vertical {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-nc-widget-widget__body--horizontal {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 12px;
}

.cn-nc-widget-widget__state {
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 1;
	min-height: 64px;
	color: var(--color-text-maxcontrast);
	font-style: italic;
}

.cn-nc-widget-widget__item {
	display: flex;
	text-decoration: none;
	color: var(--color-main-text);
	border-radius: var(--border-radius);
	padding: 4px;
}

.cn-nc-widget-widget__item:hover {
	background-color: var(--color-background-hover);
}

.cn-nc-widget-widget__item--vertical {
	flex-direction: row;
	align-items: center;
	gap: 8px;
}

.cn-nc-widget-widget__item--horizontal {
	flex-direction: column;
	align-items: center;
	width: 120px;
	text-align: center;
}

.cn-nc-widget-widget__item-icon-wrap {
	width: 32px;
	height: 32px;
	flex: 0 0 32px;
	position: relative;
}

.cn-nc-widget-widget__item-icon {
	width: 32px;
	height: 32px;
	object-fit: cover;
	border-radius: 50%;
}

.cn-nc-widget-widget__item-overlay {
	position: absolute;
	right: -2px;
	bottom: -2px;
	width: 14px;
	height: 14px;
}

.cn-nc-widget-widget__item-text {
	display: flex;
	flex-direction: column;
	min-width: 0;
	flex: 1;
}

.cn-nc-widget-widget__item-title {
	font-weight: 600;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-nc-widget-widget__item-subtitle {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>

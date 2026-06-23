<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-nc-widget-widget">
		<header class="cn-nc-widget-widget__header">
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

			<div v-else-if="items.length === 0" class="cn-nc-widget-widget__state">
				{{ t('nextcloud-vue', 'No items available') }}
			</div>

			<template v-else>
				<a
					v-for="(item, idx) in items"
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
			</template>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import axios from '@nextcloud/axios'
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

	props: {
		/**
		 * Persisted widget content `{widgetId, displayMode}`.
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
			const callback = this.resolveNativeCallback()
			if (typeof callback === 'function') {
				this.mountNative(callback)
				return
			}
			this.mode = 'api'
			this.loadApiItems()
		},

		/**
		 * Look up a native render callback on the `OCA.Dashboard` global.
		 *
		 * @return {Function|null} the callback, or `null` when none is registered.
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
		 * @param {Function} callback the native render callback.
		 * @return {void}
		 */
		mountNative(callback) {
			this.mode = 'native'
			this.$nextTick(() => {
				const container = this.$refs.nativeContainer
				if (container) {
					const fallback = () => {
						// Native callback failed — fall back to the API list.
						this.mode = 'api'
						this.loadApiItems()
					}
					try {
						// NC dashboard widgets are registered as
						// `register(id, (el, { widget }) => …)` — the second
						// argument MUST be the `{ widget }` envelope, not the bare
						// metadata, or the widget destructures `widget` as
						// undefined and throws on first use (e.g. `widget.title`).
						const result = callback(container, { widget: this.widgetMeta || {} })
						// Most widget callbacks are async; a synchronous try/catch
						// can't see a rejected promise, so wire the fallback to it.
						if (result && typeof result.then === 'function') {
							result.catch(fallback)
						}
					} catch (e) {
						fallback()
					}
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
				// The v2 widget-items API returns the per-widget `{items}`
				// envelope for modern `IAPIWidgetV2` providers (files-favorites,
				// recommendations, etc.). The legacy v1 endpoint returns an
				// empty list for those providers, so a v1 fetch makes every
				// modern widget render "No items available" even when the
				// dashboard has data. extractItems() already tolerates both the
				// flat-array (older providers) and `{items}` (v2) shapes.
				const url = generateOcsUrl('/apps/dashboard/api/v2/widget-items')
				const response = await axios.get(url, {
					params: { widgets: [this.widgetId], limit: API_ITEM_LIMIT },
				})
				const data = response && response.data && response.data.ocs ? response.data.ocs.data : null
				const widgetData = data ? data[this.widgetId] : null
				this.items = this.extractItems(widgetData)
			} catch (e) {
				this.items = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * Normalise a per-widget OCS payload to an items array, tolerating both
		 * the flat array and the `{items}` envelope shapes.
		 *
		 * @param {*} widgetData the per-widget payload.
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

.cn-nc-widget-widget__native {
	flex: 1;
	overflow: auto;
	padding: 0 16px 16px;
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

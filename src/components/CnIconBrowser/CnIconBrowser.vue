<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div
		class="cn-icon-browser"
		:class="{ 'cn-icon-browser--inline': inline }">
		<label
			v-if="label"
			:id="labelId"
			:for="triggerId"
			class="cn-icon-browser__field-label">{{ label }}</label>

		<!-- Inline: the panel is always open. -->
		<CnIconBrowserPanel
			v-if="inline"
			v-bind="panelBindings"
			@input="onPanelInput">
			<template #empty>
				<!-- @slot empty Shown when no icons match the search query. -->
				<slot name="empty" />
			</template>
		</CnIconBrowserPanel>

		<!-- Popup (default): a trigger button opens the panel in a popover that
		     is teleported to the body, so it isn't clipped by a modal's overflow. -->
		<NcPopover
			v-else
			:shown.sync="open"
			:triggers="[]"
			popup-role="dialog"
			popover-base-class="cn-icon-browser__popper">
			<template #trigger="{ attrs }">
				<!-- @slot trigger Popup-mode trigger; defaults to an icon button that opens the popover. -->
				<!-- @binding {Function} open Opens the popover. -->
				<!-- @binding {Function} toggle Toggles the popover open/closed. -->
				<!-- @binding {string|null} value The current icon value. -->
				<!-- @binding {string} label Human label for the current selection. -->
				<!-- @binding {object} attrs ARIA attributes from NcPopover (aria-haspopup, aria-expanded); bind onto a custom trigger. -->
				<slot
					name="trigger"
					:open="openPanel"
					:toggle="togglePanel"
					:value="value"
					:label="selectedLabel"
					:attrs="attrs">
					<button
						:id="triggerId"
						type="button"
						class="cn-icon-browser__trigger"
						v-bind="attrs"
						:aria-label="label ? undefined : t('nextcloud-vue', 'Select icon')"
						:aria-labelledby="label ? labelId : undefined"
						@click="open = !open">
						<img
							v-if="isUrlValue"
							class="cn-icon-browser__trigger-img"
							:src="value"
							alt="">
						<component
							:is="selectedEntry.component"
							v-else-if="selectedEntry && selectedEntry.component"
							:size="24" />
						<svg
							v-else-if="currentPath"
							class="cn-icon-browser__trigger-svg"
							viewBox="0 0 24 24">
							<path :d="currentPath" />
						</svg>
						<span v-else class="cn-icon-browser__trigger-placeholder">{{ t('nextcloud-vue', 'Icon') }}</span>
					</button>
				</slot>
			</template>

			<!-- The trigger advertises aria-haspopup="dialog" (via NcPopover's
			     popup-role), so the opened panel must be a named dialog. -->
			<div role="dialog" :aria-label="t('nextcloud-vue', 'Icon browser')">
				<CnIconBrowserPanel
					v-bind="panelBindings"
					@input="$emit('input', $event)"
					@pick="open = false">
					<template #empty>
						<slot name="empty" />
					</template>
				</CnIconBrowserPanel>
			</div>
		</NcPopover>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcPopover } from '@nextcloud/vue'
import CnIconBrowserPanel from './CnIconBrowserPanel.vue'
import { findIconByValue } from './iconCatalogue.js'
import { isSvgPath } from '../../utils/iconUtils.js'
import { isCustomIconUrl, DASHBOARD_ICONS } from '../CnIconPicker/dashboardIcons.js'
import { DASHBOARD_ICONS as WIDGET_ICONS } from '../CnWidgetGrid/widgetIcons.js'

/**
 * Curated fallback catalogue, built from the library's always-present
 * vue-material-design-icons registries. Used when neither the `icons` prop nor
 * a provided `cnIconCatalogue` is available, so the picker still offers
 * something (and emits a registry-key name that CnWidgetIcon/CnDashboardIcon
 * resolve) in apps that haven't wired an icon catalogue.
 *
 * It's the UNION of the dashboard and widget curated registries so a
 * catalogue-less consumer's pickers offer at least every icon those surfaces
 * shipped before (e.g. the widget forms' `Cash` / `Trophy`).
 */
const FALLBACK_REGISTRY = { ...DASHBOARD_ICONS, ...WIDGET_ICONS }
const CURATED_FALLBACK = Object.freeze(Object.keys(FALLBACK_REGISTRY).map((key) => ({
	key,
	label: key.replace(/([a-z\d])([A-Z])/g, '$1 $2'),
	value: key,
	search: key.toLowerCase(),
	component: FALLBACK_REGISTRY[key],
})))

/**
 * CnIconBrowser — a searchable, visual icon picker. The library imports no icon
 * package: the consumer injects a normalized catalogue via the `icons` prop
 * (build one with the {@link mdiCatalogue} / {@link vmdiCatalogue} adapters) or
 * by providing `cnIconCatalogue` higher up the tree; otherwise a small curated
 * set is used. Each catalogue entry renders by `path` (inline `<svg>`) or
 * `component` (`<component :is>`), and the entry's `value` is emitted.
 *
 * By default the picker is a trigger button that opens the panel in a popover
 * (teleported to the body, so it works inside modals); pass `inline` to render
 * the panel always-open. The optional **Custom** tab offers an image-URL input
 * (`allowUrl`), curated URL icons (`urlIcons`), and an upload control (`uploadFn`).
 *
 * `value`/`input` is a single string per the Vue 2 v-model convention.
 *
 * ```vue
 * <CnIconBrowser v-model="icon" :icons="catalogue" allow-url />
 * ```
 */
export default {
	name: 'CnIconBrowser',

	components: {
		NcPopover,
		CnIconBrowserPanel,
	},

	inject: {
		/**
		 * App-provided icon catalogue, used when no `icons` prop is passed. Lets
		 * deeply-nested forms (e.g. widget config) get the catalogue without
		 * prop-threading. Falls back to the curated set when absent.
		 */
		injectedIconCatalogue: {
			from: 'cnIconCatalogue',
			default: null,
		},
	},

	props: {
		/**
		 * Current selection (v-model) — the catalogue's emitted value (path /
		 * name / …), a URL, or null.
		 *
		 * @type {string|null}
		 */
		value: {
			type: String,
			default: null,
		},
		/**
		 * The icon catalogue to browse: `[{ key, label, value, search?, path?, component? }]`.
		 * Build with {@link mdiCatalogue} / {@link vmdiCatalogue}. When empty, an
		 * injected `cnIconCatalogue` or the curated fallback is used.
		 *
		 * @type {Array<{key: string, label: string, value: string, search?: string, path?: string, component?: object}>}
		 */
		icons: {
			type: Array,
			default: () => [],
		},
		/**
		 * Curated image-URL icons for the Custom tab. Each renders as an `<img>`
		 * and emits its `url` when picked.
		 *
		 * @type {Array<{ label: string, url: string }>}
		 */
		urlIcons: {
			type: Array,
			default: () => [],
		},
		/**
		 * Curated image-URL icons split into named groups, rendered on the Custom
		 * tab as one sub-tab per group with its own search + truncation. Use this
		 * (instead of the flat `urlIcons`) for large packs such as the bundled NL
		 * Design catalogues. Shape: `[{ key, label, icons: [{ id?, label, url }] }]`.
		 *
		 * @type {Array<{ key: string, label: string, icons: Array<{ label: string, url: string }> }>}
		 */
		urlIconGroups: {
			type: Array,
			default: () => [],
		},
		/**
		 * Injected upload transport: `async (dataUrl) => ({ url })`. When null,
		 * the upload control is hidden (the library carries no upload dependency).
		 *
		 * @type {Function|null}
		 */
		uploadFn: {
			type: Function,
			default: null,
		},
		/**
		 * Maximum number of icon cells rendered in the grid at once. Keeps the
		 * DOM small; a hint is shown when matches exceed the cap.
		 *
		 * @type {number}
		 */
		maxResults: {
			type: Number,
			default: 150,
		},
		/**
		 * Catalogue `key`s to show when the search box is empty. Falls back to
		 * the first `maxResults` of the catalogue in order.
		 *
		 * @type {string[]}
		 */
		defaultIcons: {
			type: Array,
			default: () => [],
		},
		/**
		 * Render the picker panel inline (always open) instead of the default
		 * trigger-button-plus-popover. Use inline inside a roomy surface; leave it
		 * off (the default) for forms and dense rows.
		 *
		 * @type {boolean}
		 */
		inline: {
			type: Boolean,
			default: false,
		},
		/**
		 * Show the human-readable label under each icon cell.
		 *
		 * @type {boolean}
		 */
		showLabels: {
			type: Boolean,
			default: false,
		},
		/**
		 * Offer a free-text image-URL input on the Custom tab, so the picker can
		 * also hold an arbitrary URL (the icon-or-URL fields). Off by default.
		 *
		 * @type {boolean}
		 */
		allowUrl: {
			type: Boolean,
			default: false,
		},
		/**
		 * Optional field label rendered above the control. Convenience for form
		 * fields so the consumer needn't wrap the picker in its own label.
		 *
		 * @type {string}
		 */
		label: {
			type: String,
			default: '',
		},
	},

	emits: ['input'],

	data() {
		return {
			open: false,
		}
	},

	computed: {
		/**
		 * Stable id for the trigger button, used to associate the field label
		 * (`<label :for>`) with the control.
		 *
		 * @return {string} the trigger button id.
		 */
		triggerId() {
			return 'cn-icon-browser-trigger-' + this._uid
		},
		/**
		 * Stable id for the field label, referenced by the trigger button's
		 * `aria-labelledby` so screen readers announce the label as the
		 * control's accessible name.
		 *
		 * @return {string} the field label id.
		 */
		labelId() {
			return 'cn-icon-browser-label-' + this._uid
		},
		/**
		 * The catalogue actually browsed: the `icons` prop if given, else the
		 * app-provided `cnIconCatalogue`, else the curated fallback.
		 *
		 * @return {Array<object>} the resolved catalogue.
		 */
		resolvedIcons() {
			if (this.icons && this.icons.length > 0) {
				return this.icons
			}
			if (this.injectedIconCatalogue && this.injectedIconCatalogue.length > 0) {
				return this.injectedIconCatalogue
			}
			return CURATED_FALLBACK
		},
		/**
		 * The props forwarded to the inner panel (inline and popover share these).
		 *
		 * @return {object} the panel's props.
		 */
		panelBindings() {
			return {
				value: this.value,
				icons: this.resolvedIcons,
				urlIcons: this.urlIcons,
				urlIconGroups: this.urlIconGroups,
				uploadFn: this.uploadFn,
				maxResults: this.maxResults,
				defaultIcons: this.defaultIcons,
				showLabels: this.showLabels,
				allowUrl: this.allowUrl,
			}
		},
		/**
		 * Whether the current value is a URL (trigger renders as `<img>`).
		 *
		 * @return {boolean} true for URL values.
		 */
		isUrlValue() {
			return isCustomIconUrl(this.value)
		},
		/**
		 * The catalogue entry matching the current value (for the trigger preview).
		 *
		 * @return {object|null} the matching entry, or null.
		 */
		selectedEntry() {
			return findIconByValue(this.resolvedIcons, this.value)
		},
		/**
		 * The SVG path to preview on the trigger when the value is a bare path.
		 *
		 * @return {string|null} the path string, or null.
		 */
		currentPath() {
			if (!this.value || this.isUrlValue) {
				return null
			}
			if (this.selectedEntry) {
				return this.selectedEntry.path || null
			}
			return isSvgPath(this.value) ? this.value : null
		},
		/**
		 * Human label for the current selection (used by the trigger slot scope).
		 *
		 * @return {string} a display label, or '' when nothing is selected.
		 */
		selectedLabel() {
			if (!this.value) {
				return ''
			}
			if (this.isUrlValue) {
				const match = this.urlIcons.find((icon) => icon.url === this.value)
				return match ? match.label : this.value
			}
			return this.selectedEntry ? this.selectedEntry.label : t('nextcloud-vue', 'Custom icon')
		},
	},

	methods: {
		t,

		/**
		 * Open the popover (exposed to the trigger slot).
		 *
		 * @return {void}
		 */
		openPanel() {
			this.open = true
		},

		/**
		 * Toggle the popover open/closed (exposed to the trigger slot).
		 *
		 * @return {void}
		 */
		togglePanel() {
			this.open = !this.open
		},

		/**
		 * Forward the inner panel's value change as this component's input event.
		 *
		 * @param {string|null} value the new icon value.
		 * @return {void}
		 */
		onPanelInput(value) {
			/**
			 * @event input Emitted with the new icon value — the catalogue entry's
			 * value, a URL, or null — per the v-model convention.
			 * @type {string|null}
			 */
			this.$emit('input', value)
		},
	},
}
</script>

<style scoped>
.cn-icon-browser {
	position: relative;
	display: inline-block;
}

.cn-icon-browser--inline {
	display: block;
	width: 100%;
}

.cn-icon-browser__field-label {
	display: block;
	margin-bottom: 4px;
	font-size: 13px;
	font-weight: 600;
}

.cn-icon-browser__trigger {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	padding: 6px;
	background-color: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: 4px;
	cursor: pointer;
}

.cn-icon-browser__trigger:hover {
	background-color: var(--color-background-hover);
}

.cn-icon-browser__trigger-img,
.cn-icon-browser__trigger-svg {
	width: 24px;
	height: 24px;
}

.cn-icon-browser__trigger-svg {
	fill: var(--color-main-text);
}

.cn-icon-browser__trigger-placeholder {
	font-size: 11px;
	color: var(--color-text-maxcontrast);
}
</style>

<!-- Non-scoped: NcPopover teleports its content to a portal at document.body,
     so the popper width/padding can't be set via scoped styles. The default
     NcPopover `.v-popper__inner` padding is set with a higher-specificity hashed
     class, so override with !important rather than depend on the hash. -->
<style>
.cn-icon-browser__popper .v-popper__inner {
	width: 320px;
	max-width: 90vw;
	padding: 12px !important;
}
</style>

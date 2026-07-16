<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-icon-browser-panel">
		<!-- Selected-icon preview -->
		<div class="cn-icon-browser-panel__preview">
			<span class="cn-icon-browser-panel__preview-icon">
				<img
					v-if="isUrlValue"
					class="cn-icon-browser-panel__preview-img"
					:src="value"
					:alt="t('nextcloud-vue', 'Icon preview')">
				<component
					:is="selectedEntry.component"
					v-else-if="selectedEntry && selectedEntry.component"
					:size="24" />
				<svg
					v-else-if="currentPath"
					class="cn-icon-browser-panel__preview-svg"
					viewBox="0 0 24 24">
					<path :d="currentPath" />
				</svg>
			</span>
			<span class="cn-icon-browser-panel__preview-label">{{ selectedLabel || t('nextcloud-vue', 'No icon selected') }}</span>
			<button
				v-if="clearable && value"
				type="button"
				class="cn-icon-browser-panel__clear"
				:title="t('nextcloud-vue', 'Remove icon')"
				:aria-label="t('nextcloud-vue', 'Remove icon')"
				@click="clearIcon">
				<Cancel :size="16" />
			</button>
		</div>

		<!-- Source tabs: Icons | <named icon sets…> | Custom. Named url-icon sets
		     (Gemeente / Den Haag / RVO) get a top-level tab each rather than hiding
		     a level down under "Custom", which is where users failed to find them. -->
		<div
			v-if="tabs.length > 1"
			class="cn-icon-browser-panel__tabs"
			role="tablist"
			:aria-label="t('nextcloud-vue', 'Icon source')">
			<button
				v-for="(tab, index) in tabs"
				:id="tabId(tab.key)"
				:key="tab.key"
				ref="tabButtons"
				type="button"
				role="tab"
				:aria-selected="mode === tab.key ? 'true' : 'false'"
				:aria-controls="panelId(tab.key)"
				:tabindex="mode === tab.key ? 0 : -1"
				class="cn-icon-browser-panel__tab"
				:class="{ 'cn-icon-browser-panel__tab--active': mode === tab.key }"
				@click="mode = tab.key"
				@keydown="onTabKeydown($event, index)">
				{{ tab.label }}
			</button>
		</div>

		<!-- One tabpanel per icon catalogue. With no `sources` there is exactly one
		     ("Icons"); with sources, one per catalogue (Material / FontAwesome / …). -->
		<div
			v-for="cat in catalogueTabs"
			v-show="mode === cat.key"
			:id="panelId(cat.key)"
			:key="cat.key"
			:role="tabs.length > 1 ? 'tabpanel' : undefined"
			:aria-labelledby="tabs.length > 1 ? tabId(cat.key) : undefined"
			class="cn-icon-browser-panel__icons">
			<template v-if="mode === cat.key">
				<input
					v-model="query"
					type="search"
					class="cn-icon-browser-panel__search"
					:placeholder="t('nextcloud-vue', 'Search icons…')"
					:aria-label="t('nextcloud-vue', 'Search icons')">

				<div v-if="visibleIcons.length > 0" class="cn-icon-browser-panel__grid">
					<button
						v-for="(icon, index) in visibleIcons"
						:key="icon.key"
						ref="iconCells"
						type="button"
						class="cn-icon-browser-panel__cell"
						:class="{ 'cn-icon-browser-panel__cell--active': icon.value === value }"
						:title="icon.label"
						:aria-label="icon.label"
						:tabindex="index === activeIndex ? 0 : -1"
						@click="selectIcon(icon)"
						@keydown="onGridKeydown($event, index)">
						<component
							:is="icon.component"
							v-if="icon.component"
							class="cn-icon-browser-panel__cell-component"
							:size="24" />
						<svg
							v-else
							class="cn-icon-browser-panel__cell-svg"
							:viewBox="icon.viewBox || '0 0 24 24'">
							<path :d="icon.path" />
						</svg>
						<span v-if="showLabels" class="cn-icon-browser-panel__cell-label">{{ icon.label }}</span>
					</button>
				</div>
				<!-- @slot empty Shown when no icons match the search query. -->
				<slot v-else name="empty">
					<p class="cn-icon-browser-panel__empty">
						{{ emptyMessage }}
					</p>
				</slot>

				<p v-if="truncated" class="cn-icon-browser-panel__hint">
					{{ t('nextcloud-vue', 'Showing {shown} of {total} — refine your search to narrow results.', { shown: visibleIcons.length, total: matchCount }) }}
				</p>
			</template>
		</div>

		<!-- One tabpanel per named icon set (Gemeente / Den Haag / RVO). The body is
		     v-if'd on the active tab so a large set's cells (RVO renders 150) stay
		     out of the DOM while another tab is showing. -->
		<div
			v-for="group in promotedGroups"
			v-show="mode === groupKey(group)"
			:id="panelId(groupKey(group))"
			:key="group.key"
			role="tabpanel"
			:aria-labelledby="tabId(groupKey(group))"
			class="cn-icon-browser-panel__icons">
			<template v-if="mode === groupKey(group)">
				<!-- A lazily-loaded set (e.g. RVO) resolves on first activation. -->
				<p v-if="groupLoading[group.key]" class="cn-icon-browser-panel__hint">
					{{ t('nextcloud-vue', 'Loading icon set…') }}
				</p>
				<p
					v-else-if="groupError[group.key]"
					class="cn-icon-browser-panel__error"
					role="alert">
					{{ groupError[group.key] }}
				</p>

				<!-- Search over the set's icons (large packs are searchable). -->
				<input
					v-if="group.icons.length > maxResults"
					v-model="customQuery"
					type="search"
					class="cn-icon-browser-panel__search"
					:placeholder="t('nextcloud-vue', 'Search icons…')"
					:aria-label="t('nextcloud-vue', 'Search icons')">

				<div v-if="customVisibleIcons.length > 0" class="cn-icon-browser-panel__grid">
					<!-- Keyed by `id`, not `url`: distinct icons can share an identical
					     SVG payload (rvo-bestelbus/rvo-bus, og-paspoort/…internationaal),
					     and a duplicate key makes Vue mis-patch the grid. -->
					<button
						v-for="icon in customVisibleIcons"
						:key="icon.id || icon.url"
						type="button"
						class="cn-icon-browser-panel__cell"
						:class="{ 'cn-icon-browser-panel__cell--active': icon.url === value }"
						:title="icon.label"
						:aria-label="icon.label"
						@click="selectUrl(icon.url)">
						<img
							class="cn-icon-browser-panel__cell-img"
							:src="icon.url"
							:alt="icon.label"
							loading="lazy">
						<span v-if="showLabels" class="cn-icon-browser-panel__cell-label">{{ icon.label }}</span>
					</button>
				</div>

				<p v-if="customTruncated" class="cn-icon-browser-panel__hint">
					{{ t('nextcloud-vue', 'Showing {shown} of {total} — refine your search to narrow results.', { shown: customVisibleIcons.length, total: customMatches.length }) }}
				</p>
			</template>
		</div>

		<!-- Custom: bring-your-own icon — free URL input, unnamed curated url-icons
		     (the legacy flat `urlIcons` prop), and upload. Named sets are NOT here;
		     they have their own tabs above. -->
		<div
			v-if="hasCustomTab"
			v-show="mode === 'custom'"
			:id="panelId('custom')"
			role="tabpanel"
			:aria-labelledby="tabId('custom')"
			class="cn-icon-browser-panel__custom">
			<input
				v-if="allowUrl"
				:value="urlDraft"
				type="url"
				class="cn-icon-browser-panel__url-input"
				:placeholder="t('nextcloud-vue', 'Image URL (https://… or /path)')"
				:aria-label="t('nextcloud-vue', 'Image URL')"
				@input="onUrlInput">

			<div v-if="unnamedIcons.length > 0" class="cn-icon-browser-panel__grid">
				<button
					v-for="icon in unnamedIcons"
					:key="icon.id || icon.url"
					type="button"
					class="cn-icon-browser-panel__cell"
					:class="{ 'cn-icon-browser-panel__cell--active': icon.url === value }"
					:title="icon.label"
					:aria-label="icon.label"
					@click="selectUrl(icon.url)">
					<img
						class="cn-icon-browser-panel__cell-img"
						:src="icon.url"
						:alt="icon.label"
						loading="lazy">
					<span v-if="showLabels" class="cn-icon-browser-panel__cell-label">{{ icon.label }}</span>
				</button>
			</div>

			<label v-if="canUpload" class="cn-icon-browser-panel__upload-label">
				<input
					ref="fileInput"
					type="file"
					accept="image/*"
					class="cn-icon-browser-panel__file-input"
					:disabled="uploading"
					@change="handleFileSelect">
				<span class="cn-icon-browser-panel__upload-button">
					<span v-if="uploading">{{ t('nextcloud-vue', 'Uploading…') }}</span>
					<span v-else>{{ t('nextcloud-vue', 'Upload icon') }}</span>
				</span>
			</label>

			<p
				v-if="uploadError"
				class="cn-icon-browser-panel__error"
				role="alert">
				{{ uploadError }}
			</p>
		</div>

		<!-- Custom SVG: author a raw <svg> by hand (opt-in via allowCustomSvg). -->
		<div
			v-if="hasCustomSvgTab"
			v-show="mode === 'svg'"
			:id="panelId('svg')"
			role="tabpanel"
			:aria-labelledby="tabId('svg')"
			class="cn-icon-browser-panel__custom">
			<CnJsonViewer
				v-if="mode === 'svg'"
				:value="customSvg"
				language="xml"
				@update:value="onCustomSvgInput" />
			<button
				type="button"
				class="cn-icon-browser-panel__format"
				@click="formatCustomSvg">
				{{ t('nextcloud-vue', 'Format SVG') }}
			</button>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import Cancel from 'vue-material-design-icons/Cancel.vue'
import CnJsonViewer from '../CnJsonViewer/CnJsonViewer.vue'
import { findIconByValue } from './iconCatalogue.js'
import { fuzzyFilter } from './fuzzy.js'
import { isSvgPath } from '../../utils/iconUtils.js'
import { isCustomIconUrl } from '../CnIconPicker/dashboardIcons.js'

/**
 * CnIconBrowserPanel — the always-open picker panel used by
 * {@link CnIconBrowser} (rendered inline, or inside the popover). Private to the
 * CnIconBrowser directory; not a public export. Owns the search/grid/custom-tab
 * UI and state; the parent owns the catalogue resolution, label, and popover.
 *
 * Emits `input` for every value change (including URL typing) and `pick` for a
 * discrete selection (icon, curated URL icon, or completed upload) so the parent
 * can close the popover on a pick but stay open while a URL is typed.
 */
export default {
	name: 'CnIconBrowserPanel',

	components: {
		Cancel,
		CnJsonViewer,
	},

	props: {
		/**
		 * Current selection — the catalogue's emitted value, a URL, or null.
		 *
		 * @type {string|null}
		 */
		value: {
			type: String,
			default: null,
		},
		/**
		 * The resolved catalogue to browse: `[{ key, label, value, search?, path?, component? }]`.
		 *
		 * @type {Array<object>}
		 */
		icons: {
			type: Array,
			default: () => [],
		},
		/**
		 * Curated image-URL icons for the Custom tab: `[{ label, url }]`.
		 *
		 * @type {Array<{ label: string, url: string }>}
		 */
		urlIcons: {
			type: Array,
			default: () => [],
		},
		/**
		 * Curated URL icons split into named groups: `[{ key, label, icons }]`.
		 * Rendered on the Custom tab as one sub-tab per group, each with its own
		 * search + truncation. Takes precedence over the flat `urlIcons`.
		 *
		 * A group may omit `icons` and declare `load: () => Promise<icons>` instead;
		 * it is then fetched the first time the user activates its sub-tab (see
		 * `nlDesignIconGroups()`, which defers the 1.9MB RVO set this way). Loading
		 * and failure are surfaced in the panel; a failed load retries on the next
		 * activation.
		 *
		 * @type {Array<{ key: string, label: string, icons?: Array<{ label: string, url: string }>, load?: () => Promise<Array<object>> }>}
		 */
		urlIconGroups: {
			type: Array,
			default: () => [],
		},
		/**
		 * Offer a control to unset the icon (emits `null`). Shown next to the
		 * preview whenever a value is selected.
		 *
		 * @type {boolean}
		 */
		clearable: {
			type: Boolean,
			default: false,
		},
		/**
		 * Ordered catalogue source keys, one tab each (e.g. `['mdi', 'fontawesome']`).
		 * `mdi` is special: its catalogue is loaded from the optional `@mdi/js`
		 * dependency on demand, falling back to the `icons` prop when absent.
		 * Empty → a single "Icons" tab over `icons`.
		 *
		 * @type {string[]}
		 */
		sources: {
			type: Array,
			default: () => [],
		},
		/**
		 * Entries per source: `{ mdi: [...], fontawesome: [...] }`. Build with the
		 * `fromMdiJs` / `fromFontAwesome` / `fromOpenGemeenten` adapters.
		 *
		 * @type {Record<string, Array<object>>}
		 */
		catalogues: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Offer a tab for authoring a raw `<svg>` icon by hand.
		 *
		 * @type {boolean}
		 */
		allowCustomSvg: {
			type: Boolean,
			default: false,
		},
		/**
		 * Injected upload transport: `async (dataUrl) => ({ url })`. When null,
		 * the upload control is hidden.
		 *
		 * @type {Function|null}
		 */
		uploadFn: {
			type: Function,
			default: null,
		},
		/**
		 * Maximum number of icon cells rendered in the grid at once.
		 *
		 * @type {number}
		 */
		maxResults: {
			type: Number,
			default: 150,
		},
		/**
		 * Catalogue `key`s to show when the search box is empty.
		 *
		 * @type {string[]}
		 */
		defaultIcons: {
			type: Array,
			default: () => [],
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
		 * Offer a free-text image-URL input on the Custom tab.
		 *
		 * @type {boolean}
		 */
		allowUrl: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['input', 'pick'],

	data() {
		return {
			query: '',
			debouncedQuery: '',
			mode: 'icons',
			uploading: false,
			uploadError: '',
			debounceTimer: null,
			urlDraft: isCustomIconUrl(this.value) ? this.value : '',
			// Roving-tabindex cursor into visibleIcons: the one grid cell that's
			// tab-reachable; arrow keys move it.
			activeIndex: 0,
			// Search within the active icon set's tab (large packs are searchable).
			customQuery: '',
			// Lazy URL-icon groups, keyed by group key: resolved icons, in-flight
			// flag, and last error. A key absent from `groupIcons` has not loaded
			// (or failed), so activating its tab retries.
			groupIcons: {},
			groupLoading: {},
			groupError: {},
			// Catalogue lazily built from the optional `@mdi/js` dep (source 'mdi').
			mdiCatalogue: null,
			// Raw-SVG draft for the Custom SVG tab.
			customSvg: (typeof this.value === 'string' && this.value.trim().startsWith('<svg')) ? this.value : '',
		}
	},

	computed: {
		/**
		 * Whether the upload control is shown (only when an uploadFn is given).
		 *
		 * @return {boolean} true when uploads are enabled.
		 */
		canUpload() {
			return typeof this.uploadFn === 'function'
		},
		/**
		 * Named icon sets, each promoted to its own top-level tab.
		 *
		 * A group only qualifies if it has a label to put on a tab. The legacy flat
		 * `urlIcons` prop normalises to an unlabelled group, which stays inside the
		 * Custom tab (see `unnamedIcons`) — so existing consumers are unaffected.
		 *
		 * @return {Array<object>} the groups with a label.
		 */
		promotedGroups() {
			return this.resolvedGroups.filter((group) => !!group.label)
		},
		/**
		 * Curated url-icons that have no set name, shown inside the Custom tab
		 * alongside the URL input and upload control.
		 *
		 * @return {Array<object>} the unnamed icons.
		 */
		unnamedIcons() {
			return this.resolvedGroups
				.filter((group) => !group.label)
				.flatMap((group) => group.icons)
		},
		/**
		 * Whether the Custom tab is offered — a bring-your-own source exists.
		 *
		 * Note a NAMED set no longer implies a Custom tab: sets have their own tabs
		 * now, so a consumer that passes only `urlIconGroups` gets no Custom tab.
		 *
		 * @return {boolean} true when a custom icon source is available.
		 */
		hasCustomTab() {
			return this.allowUrl || this.canUpload || this.unnamedIcons.length > 0
		},
		/**
		 * Path/component icon catalogues, one tab each.
		 *
		 * With no `sources` this is the single "Icons" tab over the `icons` prop —
		 * the common case. With `sources` (e.g. opencatalogi's Material /
		 * FontAwesome / OpenGemeenten menu-item picker) each source becomes a
		 * sibling tab, so catalogues and NL sets share one flat tab row.
		 *
		 * @return {Array<{key: string, label: string, icons: Array<object>}>} the catalogue tabs.
		 */
		catalogueTabs() {
			if (this.sources.length === 0) {
				return [{ key: 'icons', label: t('nextcloud-vue', 'Icons'), icons: this.icons }]
			}
			const seen = new Set()
			return this.sources
				.filter((source) => !seen.has(source) && seen.add(source))
				.map((source) => ({
					key: 'cat:' + source,
					label: this.sourceLabel(source),
					icons: this.catalogueFor(source),
				}))
		},
		/**
		 * The catalogue whose tab is selected (empty when a non-catalogue tab is).
		 *
		 * @return {Array<object>} the active catalogue's entries.
		 */
		activeCatalogue() {
			const tab = this.catalogueTabs.find((c) => c.key === this.mode)
			return tab ? tab.icons : []
		},
		/**
		 * Every catalogue entry across all sources — used to resolve the preview
		 * for the current value regardless of which tab it came from.
		 *
		 * @return {Array<object>} the union of all catalogue entries.
		 */
		allCatalogueIcons() {
			return this.catalogueTabs.flatMap((tab) => tab.icons)
		},
		/**
		 * Whether the raw-SVG authoring tab is offered.
		 *
		 * @return {boolean} true when allowCustomSvg is set.
		 */
		hasCustomSvgTab() {
			return this.allowCustomSvg
		},
		/**
		 * The tablist: a tab per icon catalogue, then per named icon set, then
		 * Custom (URL/upload) and Custom SVG. Rendered only when there's >1.
		 *
		 * @return {Array<{key: string, label: string}>} the tabs, in display order.
		 */
		tabs() {
			const tabs = this.catalogueTabs.map(({ key, label }) => ({ key, label }))
			for (const group of this.promotedGroups) {
				tabs.push({ key: this.groupKey(group), label: group.label })
			}
			if (this.hasCustomTab) {
				tabs.push({ key: 'custom', label: t('nextcloud-vue', 'Custom') })
			}
			if (this.hasCustomSvgTab) {
				tabs.push({ key: 'svg', label: t('nextcloud-vue', 'Custom SVG') })
			}
			return tabs
		},
		/**
		 * Curated URL icons normalised to groups. `urlIconGroups` wins; otherwise
		 * the flat `urlIcons` become a single unnamed group.
		 *
		 * A group survives if it already has icons OR can load them on demand; a
		 * lazy group's `icons` resolve from `groupIcons` once fetched, so it starts
		 * empty and fills in without the tab disappearing. Groups that are neither
		 * populated nor loadable drop out.
		 *
		 * @return {Array<{ key: string, label: string, icons: Array<object>, lazy: boolean, load: Function|null }>} the groups.
		 */
		resolvedGroups() {
			const groups = this.urlIconGroups.length > 0
				? this.urlIconGroups
				: (this.urlIcons.length > 0 ? [{ key: 'custom', label: '', icons: this.urlIcons }] : [])

			return groups
				.filter((g) => g && (typeof g.load === 'function' || (Array.isArray(g.icons) && g.icons.length > 0)))
				.map((g) => ({
					key: g.key,
					label: g.label,
					lazy: typeof g.load === 'function',
					load: g.load || null,
					icons: this.groupIcons[g.key] || (Array.isArray(g.icons) ? g.icons : []),
				}))
		},
		/**
		 * The icon set whose tab is currently selected, or null when the active tab
		 * is not a set (Icons / Custom).
		 *
		 * @return {{ key: string, label: string, icons: Array<object> }|null} the active set.
		 */
		activeGroup() {
			return this.promotedGroups.find((group) => this.groupKey(group) === this.mode) || null
		},
		/**
		 * Active set's icons filtered by its search box (label match).
		 *
		 * @return {Array<object>} the matching URL icons.
		 */
		customMatches() {
			const icons = this.activeGroup ? this.activeGroup.icons : []
			const q = this.customQuery.trim().toLowerCase()
			if (!q) {
				return icons
			}
			return icons.filter((icon) => String(icon.label || '').toLowerCase().includes(q))
		},
		/**
		 * The rendered slice of the Custom grid, capped at `maxResults` to keep the
		 * DOM small for large packs (a hint is shown when matches exceed the cap).
		 *
		 * @return {Array<object>} the visible URL icons.
		 */
		customVisibleIcons() {
			return this.customMatches.slice(0, this.maxResults)
		},
		/**
		 * Whether the Custom grid is truncated (more matches than rendered).
		 *
		 * @return {boolean} true when capped.
		 */
		customTruncated() {
			return this.customMatches.length > this.customVisibleIcons.length
		},
		/**
		 * Index of the selected tab, used to seed roving keyboard navigation.
		 *
		 * @return {number} the active tab's index (0 when the mode has no tab).
		 */
		activeTabIndex() {
			return Math.max(0, this.tabs.findIndex((tab) => tab.key === this.mode))
		},
		/**
		 * Whether the current value is a URL (render as `<img>`).
		 *
		 * @return {boolean} true for URL values.
		 */
		isUrlValue() {
			return isCustomIconUrl(this.value)
		},
		/**
		 * The catalogue entry matching the current value (for preview/highlight).
		 * Searched across EVERY source, not just the active tab, so the preview
		 * still names an icon picked from another catalogue.
		 *
		 * @return {object|null} the matching entry, or null.
		 */
		selectedEntry() {
			return findIconByValue(this.allCatalogueIcons, this.value)
		},
		/**
		 * The SVG path to preview when the value is a bare path string not backed
		 * by a catalogue component.
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
		 * Human label for the current selection.
		 *
		 * @return {string} a display label, or '' when nothing is selected.
		 */
		selectedLabel() {
			if (!this.value) {
				return ''
			}
			if (this.isUrlValue) {
				for (const group of this.resolvedGroups) {
					const match = group.icons.find((icon) => icon.url === this.value)
					if (match) {
						return match.label
					}
				}
				return this.value
			}
			return this.selectedEntry ? this.selectedEntry.label : t('nextcloud-vue', 'Custom icon')
		},
		/**
		 * The catalogue filtered by the debounced search query (or the default
		 * set when the query is empty). Not yet capped.
		 *
		 * @return {Array<object>} matching catalogue entries.
		 */
		matchedIcons() {
			const q = this.debouncedQuery.trim()
			if (!q) {
				if (this.defaultIcons.length > 0) {
					return this.activeCatalogue.filter((icon) => this.defaultIcons.includes(icon.key))
				}
				return this.activeCatalogue
			}
			return fuzzyFilter(this.activeCatalogue, q)
		},
		/**
		 * Total number of icons matching the current query (before capping).
		 *
		 * @return {number} the match count.
		 */
		matchCount() {
			return this.matchedIcons.length
		},
		/**
		 * The capped slice of matches actually rendered in the grid.
		 *
		 * @return {Array<object>} at most `maxResults` catalogue entries.
		 */
		visibleIcons() {
			return this.matchedIcons.slice(0, this.maxResults)
		},
		/**
		 * Whether the match set was truncated by the `maxResults` cap.
		 *
		 * @return {boolean} true when more matches exist than are shown.
		 */
		truncated() {
			return this.matchCount > this.visibleIcons.length
		},
		/**
		 * Empty-state message — distinguishes "no catalogue" from "no matches".
		 *
		 * @return {string} the message to show when the grid is empty.
		 */
		emptyMessage() {
			return this.activeCatalogue.length === 0
				? t('nextcloud-vue', 'No icons available.')
				: t('nextcloud-vue', 'No icons match your search.')
		},
	},

	watch: {
		query(value) {
			clearTimeout(this.debounceTimer)
			this.debounceTimer = setTimeout(() => {
				this.debouncedQuery = value
			}, 150)
		},
		value(v) {
			if (isCustomIconUrl(v)) {
				this.urlDraft = v
			}
		},
		// Keep the roving cursor valid as filtering changes the list; prefer the
		// currently-selected icon's cell so it's the first one Tab lands on.
		visibleIcons: {
			immediate: true,
			handler(list) {
				const selected = list.findIndex((icon) => icon.value === this.value)
				this.activeIndex = selected >= 0 ? selected : 0
			},
		},
		// A lazy set is fetched only once its own tab is selected — never on mount,
		// which is what keeps RVO's 1.9MB out of the initial load. Searches are
		// per-tab, so both query boxes reset when the tab changes.
		mode() {
			this.query = ''
			this.debouncedQuery = ''
			this.customQuery = ''
			this.ensureActiveGroupLoaded()
		},
	},

	created() {
		// `mode` defaults to 'icons', which isn't a tab when `sources` are given
		// (the first tab is then 'cat:<source>'). Land on whatever the first tab is.
		if (!this.tabs.some((tab) => tab.key === this.mode)) {
			this.mode = this.tabs[0].key
		}
		this.loadMdiCatalogue()
	},

	beforeDestroy() {
		clearTimeout(this.debounceTimer)
	},

	methods: {
		t,

		/**
		 * Resolve the active group's icons when it declares `load()` and hasn't
		 * been fetched yet. Failures are surfaced in the panel (and logged) rather
		 * than hidden: a set that silently vanishes is indistinguishable from the
		 * missing-icons bug this mechanism exists to fix. Leaving the key out of
		 * `groupIcons` on failure means re-activating the tab retries.
		 *
		 * @return {Promise<void>} resolves once the group is loaded or has failed.
		 */
		async ensureActiveGroupLoaded() {
			const group = this.activeGroup
			if (!group || !group.lazy) {
				return
			}
			if (this.groupIcons[group.key] || this.groupLoading[group.key]) {
				return
			}

			this.$set(this.groupLoading, group.key, true)
			this.$set(this.groupError, group.key, '')
			try {
				const icons = await group.load()
				this.$set(this.groupIcons, group.key, Array.isArray(icons) ? icons : [])
			} catch (error) {
				this.$set(this.groupError, group.key, t('nextcloud-vue', 'Could not load this icon set.'))
				console.error('Icon set "' + group.key + '" failed to load:', error)
			} finally {
				this.$set(this.groupLoading, group.key, false)
			}
		},

		/**
		 * Unset the icon (a discrete pick, so the popover closes).
		 *
		 * @return {void}
		 */
		clearIcon() {
			this.$emit('input', null)
			this.$emit('pick')
		},

		/**
		 * The tab key for an icon set. Namespaced so a set keyed 'custom' or
		 * 'icons' can't collide with the two built-in tabs.
		 *
		 * @param {object} group the icon set.
		 * @return {string} the tab key.
		 */
		groupKey(group) {
			return 'group:' + group.key
		},

		/**
		 * Human label for a catalogue source key.
		 *
		 * @param {string} source the source key.
		 * @return {string} the tab label.
		 */
		sourceLabel(source) {
			const known = {
				mdi: t('nextcloud-vue', 'Material'),
				fontawesome: 'FontAwesome',
				opengemeenten: t('nextcloud-vue', 'Gemeente'),
			}
			return known[source] || source
		},

		/**
		 * Entries for a catalogue source. A consumer-supplied catalogue wins; the
		 * `mdi` source otherwise falls back to the lazily-loaded `@mdi/js` set, and
		 * finally to the `icons` prop so the tab is never empty.
		 *
		 * @param {string} source the source key.
		 * @return {Array<object>} the entries.
		 */
		catalogueFor(source) {
			const supplied = this.catalogues[source]
			if (Array.isArray(supplied) && supplied.length > 0) {
				return supplied
			}
			if (source === 'mdi') {
				return this.mdiCatalogue || this.icons
			}
			return []
		},

		/**
		 * Build the Material catalogue from the OPTIONAL `@mdi/js` dependency. It
		 * isn't a hard dep of the library, so a failure just leaves the `icons`
		 * fallback in place rather than breaking the picker.
		 *
		 * @return {Promise<void>} resolves once the catalogue is set (or skipped).
		 */
		async loadMdiCatalogue() {
			if (this.mdiCatalogue || !this.sources.includes('mdi') || this.catalogues.mdi) {
				return
			}
			try {
				const [mdi, adapters] = await Promise.all([
					import(/* webpackChunkName: "cn-icons-mdi" */ '@mdi/js'),
					import('../CnIconPicker/iconCatalogues.js'),
				])
				this.mdiCatalogue = adapters.fromMdiJs(mdi)
			} catch (error) {
				// @mdi/js not installed — the `icons` fallback stands.
				this.mdiCatalogue = null
			}
		},

		/**
		 * Hold the raw-SVG draft and emit it as the value (no `pick`, so the
		 * popover stays open while the user types).
		 *
		 * @param {string} svg the SVG markup.
		 * @return {void}
		 */
		onCustomSvgInput(svg) {
			this.customSvg = svg
			this.$emit('input', svg || null)
		},

		/**
		 * Pretty-print the raw-SVG draft (one tag per line, indented).
		 *
		 * @return {void}
		 */
		formatCustomSvg() {
			const input = String(this.customSvg || '').trim()
			if (!input) {
				return
			}
			let depth = 0
			const formatted = input
				.replace(/>\s*</g, '><')
				.replace(/></g, '>\n<')
				.split('\n')
				.map((line) => {
					if (line.startsWith('</')) {
						depth = Math.max(0, depth - 1)
					}
					const out = '\t'.repeat(depth) + line
					if (line.startsWith('<') && !line.startsWith('</') && !line.endsWith('/>') && !line.startsWith('<?')) {
						depth++
					}
					return out
				})
				.join('\n')
			this.onCustomSvgInput(formatted)
		},

		/**
		 * DOM id of a tab button, for the panel's `aria-labelledby`.
		 *
		 * @param {string} key the tab key.
		 * @return {string} the element id.
		 */
		tabId(key) {
			return 'cn-icon-browser-tab-' + key.replace(':', '-') + '-' + this._uid
		},

		/**
		 * DOM id of a tabpanel, for the tab's `aria-controls`.
		 *
		 * @param {string} key the tab key.
		 * @return {string} the element id.
		 */
		panelId(key) {
			return 'cn-icon-browser-panel-' + key.replace(':', '-') + '-' + this._uid
		},

		/**
		 * Roving-tabindex keyboard navigation across the tablist: arrows move one
		 * tab (wrapping), Home/End jump to the ends. Activation follows focus, per
		 * the ARIA tabs pattern.
		 *
		 * @param {KeyboardEvent} event the keydown event on a tab button.
		 * @param {number} index the tab's index in `tabs`.
		 * @return {void}
		 */
		onTabKeydown(event, index) {
			const last = this.tabs.length - 1
			let next = index
			switch (event.key) {
			case 'ArrowRight':
			case 'ArrowDown': next = index === last ? 0 : index + 1; break
			case 'ArrowLeft':
			case 'ArrowUp': next = index === 0 ? last : index - 1; break
			case 'Home': next = 0; break
			case 'End': next = last; break
			default: return
			}
			event.preventDefault()
			this.mode = this.tabs[next].key
			this.$nextTick(() => {
				const buttons = this.$refs.tabButtons
				if (buttons && buttons[next]) {
					buttons[next].focus()
				}
			})
		},

		/**
		 * Number of cells per grid row, derived from layout (cells sharing the
		 * first cell's `offsetTop`). Falls back to 1 when layout is unavailable
		 * (e.g. jsdom), which degrades arrow-down/up to single-step moves.
		 *
		 * @return {number} columns currently rendered per row.
		 */
		gridColumns() {
			const cells = this.$refs.iconCells
			if (!cells || cells.length === 0) {
				return 1
			}
			const firstTop = cells[0].offsetTop
			let cols = 0
			for (const cell of cells) {
				if (cell.offsetTop !== firstTop) {
					break
				}
				cols++
			}
			return cols || 1
		},

		/**
		 * Roving-tabindex keyboard navigation for the icon grid: arrows move by
		 * one cell (horizontally) or one row (vertically), Home/End jump to the
		 * first/last cell. Moves focus to the new cell.
		 *
		 * @param {KeyboardEvent} event the keydown event on a grid cell.
		 * @param {number} index the cell's index in `visibleIcons`.
		 * @return {void}
		 */
		onGridKeydown(event, index) {
			const last = this.visibleIcons.length - 1
			if (last < 0) {
				return
			}
			const cols = this.gridColumns()
			let next = index
			switch (event.key) {
			case 'ArrowRight': next = Math.min(index + 1, last); break
			case 'ArrowLeft': next = Math.max(index - 1, 0); break
			case 'ArrowDown': next = Math.min(index + cols, last); break
			case 'ArrowUp': next = Math.max(index - cols, 0); break
			case 'Home': next = 0; break
			case 'End': next = last; break
			default: return
			}
			event.preventDefault()
			this.activeIndex = next
			this.$nextTick(() => {
				const cells = this.$refs.iconCells
				if (cells && cells[next]) {
					cells[next].focus()
				}
			})
		},

		/**
		 * Emit a chosen catalogue icon's value (a discrete pick).
		 *
		 * @param {object} icon the catalogue entry.
		 * @return {void}
		 */
		selectIcon(icon) {
			/**
			 * @event input Emitted with the new icon value (path / name / URL / null).
			 * @type {string|null}
			 */
			this.$emit('input', icon.value)
			/**
			 * @event pick Emitted on a discrete selection so the parent can close
			 * the popover (not fired while typing a URL).
			 */
			this.$emit('pick')
		},

		/**
		 * Emit a chosen custom-icon URL (a discrete pick).
		 *
		 * @param {string} url the icon image URL.
		 * @return {void}
		 */
		selectUrl(url) {
			this.$emit('input', url)
			this.$emit('pick')
		},

		/**
		 * Emit the typed image URL without a `pick` (keeps the popover open).
		 *
		 * @param {Event} event the URL input's input event.
		 * @return {void}
		 */
		onUrlInput(event) {
			this.urlDraft = event.target.value
			this.$emit('input', this.urlDraft || null)
		},

		/**
		 * Read the selected file as a data URL, hand it to `uploadFn`, and emit
		 * the returned URL (a discrete pick) on success.
		 *
		 * @param {Event} event the file-input change event.
		 * @return {void}
		 */
		handleFileSelect(event) {
			const file = event.target.files?.[0]
			if (!file || !this.canUpload) {
				return
			}
			this.uploadError = ''
			this.uploading = true

			const reader = new FileReader()
			reader.onload = async (e) => {
				try {
					const dataUrl = e.target.result
					if (typeof dataUrl !== 'string') {
						throw new Error('FileReader did not return a data URL')
					}
					const response = await this.uploadFn(dataUrl)
					this.$emit('input', response.url)
					this.$emit('pick')
				} catch (err) {
					this.uploadError = (err && err.message) || t('nextcloud-vue', 'Failed to upload icon')
					console.error('Icon upload failed:', err)
				} finally {
					this.uploading = false
					this.resetFileInput()
				}
			}
			reader.onerror = () => {
				this.uploadError = t('nextcloud-vue', 'Failed to upload icon')
				this.uploading = false
				this.resetFileInput()
			}
			reader.readAsDataURL(file)
		},

		/**
		 * Clear the native file input so re-selecting the same file re-fires.
		 *
		 * @return {void}
		 */
		resetFileInput() {
			if (this.$refs.fileInput) {
				this.$refs.fileInput.value = ''
			}
		},
	},
}
</script>

<style scoped>
.cn-icon-browser-panel {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-icon-browser-panel__preview {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-icon-browser-panel__preview-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 40px;
	height: 40px;
	border: 1px solid var(--color-border);
	border-radius: 4px;
	background-color: var(--color-background-hover);
}

.cn-icon-browser-panel__preview-img,
.cn-icon-browser-panel__preview-svg {
	width: 24px;
	height: 24px;
}

.cn-icon-browser-panel__preview-svg {
	fill: var(--color-main-text);
}

.cn-icon-browser-panel__preview-label {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-icon-browser-panel__clear {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	margin-inline-start: auto;
	padding: 4px;
	background: transparent;
	border: none;
	border-radius: var(--border-radius, 4px);
	color: var(--color-text-maxcontrast);
	cursor: pointer;
}

.cn-icon-browser-panel__clear:hover,
.cn-icon-browser-panel__clear:focus-visible {
	background-color: var(--color-background-hover);
	color: var(--color-main-text);
}

.cn-icon-browser-panel__tabs {
	display: flex;
	/* Icons + one tab per icon set + Custom: wrap rather than overflow a narrow
	   popover. */
	flex-wrap: wrap;
	gap: 4px;
	border-bottom: 1px solid var(--color-border);
}

.cn-icon-browser-panel__tab {
	padding: 6px 12px;
	background: transparent;
	border: none;
	border-bottom: 2px solid transparent;
	font: inherit;
	color: var(--color-text-maxcontrast);
	cursor: pointer;
}

.cn-icon-browser-panel__tab--active {
	color: var(--color-main-text);
	border-bottom-color: var(--color-primary-element);
}

.cn-icon-browser-panel__icons,
.cn-icon-browser-panel__custom {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-icon-browser-panel__search,
.cn-icon-browser-panel__url-input {
	width: 100%;
	padding: 6px 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius, 4px);
	font-size: 14px;
}

.cn-icon-browser-panel__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
	gap: 4px;
	max-height: 260px;
	overflow-y: auto;
}

.cn-icon-browser-panel__cell {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 2px;
	padding: 6px;
	background: transparent;
	border: 1px solid transparent;
	border-radius: 4px;
	cursor: pointer;
	color: var(--color-main-text);
}

.cn-icon-browser-panel__cell:hover {
	background-color: var(--color-background-hover);
}

.cn-icon-browser-panel__cell--active {
	border-color: var(--color-primary-element);
	background-color: var(--color-primary-element-light);
}

.cn-icon-browser-panel__cell-svg,
.cn-icon-browser-panel__cell-img,
.cn-icon-browser-panel__cell-component {
	width: 24px;
	height: 24px;
	object-fit: contain;
}

.cn-icon-browser-panel__cell-svg {
	fill: var(--color-main-text);
}

.cn-icon-browser-panel__cell-label {
	font-size: 10px;
	text-align: center;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 100%;
}

.cn-icon-browser-panel__hint,
.cn-icon-browser-panel__empty {
	margin: 0;
	font-size: 12px;
	color: var(--color-text-maxcontrast);
}

.cn-icon-browser-panel__upload-label {
	display: inline-flex;
	cursor: pointer;
}

.cn-icon-browser-panel__file-input {
	display: none;
}

.cn-icon-browser-panel__upload-button,
.cn-icon-browser-panel__format {
	padding: 6px 12px;
	border: 1px solid var(--color-border);
	border-radius: 4px;
	background-color: var(--color-background-hover);
	font-size: 14px;
}

.cn-icon-browser-panel__format {
	align-self: flex-start;
	font: inherit;
	color: var(--color-main-text);
	cursor: pointer;
}

.cn-icon-browser-panel__upload-label:hover .cn-icon-browser-panel__upload-button {
	background-color: var(--color-background-dark);
}

.cn-icon-browser-panel__error {
	margin: 0;
	padding: 4px 8px;
	font-size: 12px;
	color: var(--color-error);
	background-color: var(--color-background-hover);
	border-radius: 2px;
}
</style>

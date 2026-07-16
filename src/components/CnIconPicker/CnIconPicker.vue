<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<component
		:is="compact ? 'details' : 'div'"
		ref="root"
		class="cn-icon-picker"
		:class="{ 'cn-icon-picker--compact': compact }">
		<!-- Compact mode: a small trigger that opens the grid as a popover
		     (for table rows / tight layouts). Full mode: a static preview. -->
		<summary v-if="compact" class="cn-icon-picker__trigger" :title="value || t('nextcloud-vue', 'Select icon')">
			<CnDashboardIcon :name="value" :size="20" :alt="value || t('nextcloud-vue', 'Icon')" />
		</summary>
		<div v-else class="cn-icon-picker__preview">
			<CnDashboardIcon :name="value" :size="24" :alt="t('nextcloud-vue', 'Icon preview')" />
		</div>

		<div :class="compact ? 'cn-icon-picker__panel' : ''">
			<!-- Enriched multi-source mode (opt-in: searchable / sources /
			     catalogues / allowCustomSvg). The legacy DASHBOARD_ICONS grid is
			     rendered unchanged when none of those are set. -->
			<template v-if="enriched">
				<!-- Source switcher — only when more than one source is enabled. -->
				<div v-if="resolvedSources.length > 1 || allowCustomSvg" class="cn-icon-picker__sources" role="tablist">
					<button
						v-for="src in resolvedSources"
						:key="src"
						type="button"
						class="cn-icon-picker__source"
						:class="{ 'cn-icon-picker__source--active': src === activeSource && iconMode === 'standard' }"
						role="tab"
						:aria-selected="src === activeSource && iconMode === 'standard'"
						@click="selectSource(src)">
						{{ sourceLabel(src) }}
					</button>
					<button
						v-if="allowCustomSvg"
						type="button"
						class="cn-icon-picker__source"
						:class="{ 'cn-icon-picker__source--active': iconMode === 'custom' }"
						role="tab"
						:aria-selected="iconMode === 'custom'"
						@click="setIconMode('custom')">
						{{ t('nextcloud-vue', 'Custom') }}
					</button>
				</div>

				<!-- Standard mode: search + capped, de-duplicated grid. -->
				<template v-if="iconMode === 'standard'">
					<input
						v-if="searchable"
						v-model="query"
						type="search"
						class="cn-icon-picker__search"
						:placeholder="t('nextcloud-vue', 'Search icons…')"
						:aria-label="t('nextcloud-vue', 'Search icons')">

					<div
						ref="grid"
						class="cn-icon-picker__grid"
						role="listbox"
						:aria-label="t('nextcloud-vue', 'Icon')"
						@scroll="onGridScroll">
						<button
							v-if="clearable"
							type="button"
							class="cn-icon-picker__icon cn-icon-picker__none"
							:class="{ 'cn-icon-picker__icon--selected': !value }"
							:title="t('nextcloud-vue', 'None')"
							:aria-label="t('nextcloud-vue', 'No icon')"
							role="option"
							:aria-selected="!value"
							@click="selectIconName(null)">
							<Cancel :size="20" />
						</button>
						<button
							v-for="entry in filteredEntries"
							:key="entry.key"
							type="button"
							class="cn-icon-picker__icon"
							:class="{ 'cn-icon-picker__icon--selected': entry.value === value }"
							:title="entry.label"
							:aria-label="entry.label"
							role="option"
							:aria-selected="entry.value === value"
							@click="selectIconName(entry.value)">
							<svg
								v-if="entry.path"
								class="cn-icon-picker__svg"
								:viewBox="entry.viewBox || '0 0 24 24'"
								width="20"
								height="20"
								aria-hidden="true">
								<path :d="entry.path" fill="currentColor" />
							</svg>
							<component :is="entry.component" v-else-if="entry.component" :size="20" />
							<CnDashboardIcon v-else
								:name="entry.value"
								:size="20"
								:alt="entry.label" />
						</button>
					</div>
					<p v-if="searchable && !query && hasMore" class="cn-icon-picker__hint">
						{{ t('nextcloud-vue', 'Showing {shown} of {total} — scroll for more, or type to search.', { shown: filteredEntries.length, total: activeCatalogue.length }) }}
					</p>

					<!-- Placement selector (opt-in: shown only when :placement is bound). -->
					<div v-if="showPlacement" class="cn-icon-picker__placement">
						<label class="cn-icon-picker__placement-label">{{ t('nextcloud-vue', 'Icon placement') }}</label>
						<button
							v-for="option in ['left', 'right']"
							:key="option"
							type="button"
							class="cn-icon-picker__source"
							:class="{ 'cn-icon-picker__source--active': placement === option }"
							@click="selectPlacement(option)">
							{{ option === 'left' ? t('nextcloud-vue', 'Left') : t('nextcloud-vue', 'Right') }}
						</button>
					</div>
				</template>

				<!-- Custom-SVG mode: CodeMirror (via CnJsonViewer) + Format action. -->
				<div v-else class="cn-icon-picker__custom">
					<label class="cn-icon-picker__placement-label">{{ t('nextcloud-vue', 'Custom Icon (SVG)') }}</label>
					<CnJsonViewer
						:value="customSvg"
						language="xml"
						@update:value="onCustomSvgInput" />
					<button
						type="button"
						class="cn-icon-picker__format"
						@click="formatSVG">
						{{ t('nextcloud-vue', 'Format SVG') }}
					</button>
				</div>
			</template>

			<!-- Legacy grid (unchanged) — the default when no enriched prop is set. -->
			<template v-else>
				<div
					class="cn-icon-picker__grid"
					role="listbox"
					:aria-label="t('nextcloud-vue', 'Icon')">
					<button
						v-if="clearable"
						type="button"
						class="cn-icon-picker__icon cn-icon-picker__none"
						:class="{ 'cn-icon-picker__icon--selected': !value }"
						:title="t('nextcloud-vue', 'None')"
						:aria-label="t('nextcloud-vue', 'No icon')"
						role="option"
						:aria-selected="!value"
						:disabled="uploading"
						@click="selectIconName(null)">
						<Cancel :size="20" />
					</button>
					<button
						v-for="(_, name) in icons"
						:key="name"
						type="button"
						class="cn-icon-picker__icon"
						:class="{ 'cn-icon-picker__icon--selected': name === builtInValue }"
						:title="name"
						:aria-label="name"
						role="option"
						:aria-selected="name === builtInValue"
						:disabled="uploading"
						@click="selectIconName(name)">
						<CnDashboardIcon :name="name" :size="20" :alt="name" />
					</button>
				</div>

				<label v-if="canUpload" class="cn-icon-picker__upload-label">
					<input
						ref="fileInput"
						type="file"
						accept="image/*"
						class="cn-icon-picker__file-input"
						:disabled="uploading"
						@change="handleFileSelect">
					<span class="cn-icon-picker__upload-button">
						<span v-if="uploading">{{ t('nextcloud-vue', 'Uploading…') }}</span>
						<span v-else>{{ t('nextcloud-vue', 'Upload icon') }}</span>
					</span>
				</label>

				<p
					v-if="uploadError"
					class="cn-icon-picker__error"
					role="alert">
					{{ uploadError }}
				</p>
			</template>
		</div>
	</component>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import CnDashboardIcon from './CnDashboardIcon.vue'
import CnJsonViewer from '../CnJsonViewer/CnJsonViewer.vue'
import Cancel from 'vue-material-design-icons/Cancel.vue'
import { DASHBOARD_ICONS, isCustomIconUrl } from './dashboardIcons.js'
import { dedupeCatalogue } from './iconCatalogues.js'

/**
 * CnIconPicker — select-plus-upload picker for the dashboard `icon`
 * convention, with an opt-in multi-source mode.
 *
 * @deprecated Use {@link CnIconBrowser}. It supersedes every mode of this
 * component — catalogue sources, custom SVG, upload, clearing — behind one flat
 * tab row, adds the bundled NL-government sets (RVO lazily loaded), and teleports
 * its popover so it isn't clipped inside a modal. No call site in the library
 * uses this any more; it remains exported for consumers that still import it
 * directly, and `dashboardIcons.js` (DASHBOARD_ICONS / isCustomIconUrl /
 * getIconComponent) stays the shared icon registry either way.
 *
 * **Legacy mode (default):** the built-in grid enumerates `icons` (a name →
 * component registry, default `DASHBOARD_ICONS`) and the optional file-upload
 * reads a data URL, hands it to the injected `uploadFn`, and emits the returned
 * URL. Passing only `v-model` renders exactly as before this component gained
 * multi-source support.
 *
 * **Enriched mode (opt-in):** set any of `searchable`, `sources` (beyond the
 * default single `mdi`), `catalogues`, or `allowCustomSvg` to switch to a
 * searchable, capped grid over one or more icon sources — MDI, FontAwesome,
 * OpenGemeenten — plus an optional custom-SVG editor and left/right placement.
 * The library bundles NO icon pack: pass a `catalogues` map built with the
 * exported `fromMdiJs` / `fromFontAwesome` / `fromOpenGemeenten` adapters. When
 * the `mdi` source is enabled with no supplied catalogue, the picker tries to
 * lazy-load `@mdi/js` (an optional dependency) and falls back to the built-in
 * `DASHBOARD_ICONS` set if it is absent.
 *
 * Vue 2 v-model: `value` in, `input` out. Placement uses `v-model:placement`.
 *
 * ```vue
 * <CnIconPicker v-model="icon" :upload-fn="uploadDataUrl" />
 * <CnIconPicker v-model="icon" searchable :sources="['mdi','fontawesome']"
 *   :catalogues="{ fontawesome: fromFontAwesome({ fas }) }" allow-custom-svg />
 * ```
 */
export default {
	name: 'CnIconPicker',

	components: {
		CnDashboardIcon,
		CnJsonViewer,
		Cancel,
	},

	props: {
		/**
		 * Current icon value — a registry key, a source value, a URL, raw SVG,
		 * or null (v-model).
		 *
		 * @type {string|null}
		 */
		value: {
			type: String,
			default: null,
		},
		/**
		 * Legacy icon registry to enumerate in the grid (name → component).
		 * Defaults to the built-in DASHBOARD_ICONS set. Used only in legacy mode
		 * and as the MDI fallback.
		 *
		 * @type {object}
		 */
		icons: {
			type: Object,
			default: () => DASHBOARD_ICONS,
		},
		/**
		 * Enriched mode: which icon sets to offer, any of `mdi` / `fontawesome`
		 * / `opengemeenten`. Defaults to `['mdi']`. Setting anything other than
		 * the single default `['mdi']` activates enriched mode.
		 *
		 * @type {string[]}
		 */
		sources: {
			type: Array,
			default: () => ['mdi'],
		},
		/**
		 * Enriched mode: consumer-supplied catalogues keyed by source name. Each
		 * value is an array of `{ key, label, value, search, path?, component?,
		 * viewBox? }` entries — build them with the exported adapters. The
		 * library bundles no icon pack.
		 *
		 * @type {Record<string, Array<object>>}
		 */
		catalogues: {
			type: Object,
			default: () => ({}),
		},
		/** Enriched mode: show a search box that filters the active source. */
		searchable: {
			type: Boolean,
			default: false,
		},
		/** Enriched mode: offer a custom-SVG editor with a Format action. */
		allowCustomSvg: {
			type: Boolean,
			default: false,
		},
		/**
		 * Icon placement (`v-model:placement`). Rendered as a left/right toggle
		 * only when the consumer binds `placement`.
		 *
		 * @type {'left'|'right'}
		 */
		placement: {
			type: String,
			default: 'left',
		},
		/**
		 * Compact mode: render a small trigger button that opens the icon grid
		 * as a popover, instead of the always-visible grid. Suited to table
		 * rows / tight inline layouts.
		 */
		compact: {
			type: Boolean,
			default: false,
		},
		/**
		 * Show a leading "None" tile that clears the selection (emits null).
		 * Off by default so existing pickers are unchanged.
		 */
		clearable: {
			type: Boolean,
			default: false,
		},
		/**
		 * Injected upload transport: `async (dataUrl) => ({ url })`. When null,
		 * the upload control is hidden (no transport dependency in the library).
		 *
		 * @type {Function|null}
		 */
		uploadFn: {
			type: Function,
			default: null,
		},
	},

	emits: ['input', 'update:placement'],

	data() {
		return {
			uploadError: '',
			uploading: false,
			// Enriched-mode state.
			activeSource: (this.sources && this.sources[0]) || 'mdi',
			query: '',
			iconMode: 'standard',
			customSvg: (typeof this.value === 'string' && this.value.trim().startsWith('<svg')) ? this.value : '',
			displayLimit: 120,
			mdiCatalogue: null,
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
		 * The legacy grid's selected value — only reflects v-model when it holds
		 * a registry key; a custom URL leaves nothing highlighted.
		 *
		 * @return {string} the registry key, or '' for URL/empty values.
		 */
		builtInValue() {
			if (this.value && !isCustomIconUrl(this.value)) {
				return this.value
			}
			return ''
		},
		/**
		 * Whether enriched multi-source mode is active. Opt-in: any of
		 * `searchable`, `allowCustomSvg`, a non-empty `catalogues`, or a
		 * `sources` other than the single default `['mdi']`.
		 *
		 * @return {boolean} true when the enriched panel should render.
		 */
		enriched() {
			const defaultSources = this.sources.length === 1 && this.sources[0] === 'mdi'
			return this.searchable
				|| this.allowCustomSvg
				|| Object.keys(this.catalogues).length > 0
				|| !defaultSources
		},
		/**
		 * The de-duplicated list of source names actually offered.
		 *
		 * @return {string[]} the ordered source names.
		 */
		resolvedSources() {
			const seen = new Set()
			return this.sources.filter((s) => {
				if (seen.has(s)) {
					return false
				}
				seen.add(s)
				return true
			})
		},
		/**
		 * Whether a left/right placement toggle is shown (consumer bound it).
		 *
		 * @return {boolean} true when an `update:placement` listener is attached.
		 */
		showPlacement() {
			return !!(this.$listeners && this.$listeners['update:placement'])
		},
		/**
		 * The catalogue for the active source. For `mdi` with no supplied
		 * catalogue, uses the lazy-loaded `@mdi/js` set or the DASHBOARD_ICONS
		 * fallback.
		 *
		 * @return {Array<object>} the active catalogue entries.
		 */
		activeCatalogue() {
			const supplied = this.catalogues[this.activeSource]
			if (Array.isArray(supplied) && supplied.length) {
				return dedupeCatalogue(supplied)
			}
			if (this.activeSource === 'mdi') {
				return this.mdiCatalogue || this.dashboardFallbackCatalogue
			}
			return []
		},
		/**
		 * A catalogue built from the built-in DASHBOARD_ICONS registry, used as
		 * the MDI fallback when `@mdi/js` is unavailable.
		 *
		 * @return {Array<object>} entries rendered via CnDashboardIcon.
		 */
		dashboardFallbackCatalogue() {
			return Object.keys(this.icons).map((name) => ({
				key: name,
				label: name,
				value: name,
				search: name.toLowerCase(),
			}))
		},
		/**
		 * The filtered, de-duplicated, and capped entries shown in the grid.
		 * Uncapped while searching; always keeps the selected icon visible.
		 *
		 * @return {Array<object>} the entries to render.
		 */
		filteredEntries() {
			const query = this.query.toLowerCase().trim()
			const list = this.activeCatalogue
			if (query) {
				return list.filter((e) => (e.search || String(e.label).toLowerCase()).includes(query))
			}
			const sliced = list.slice(0, this.displayLimit)
			if (this.value && !sliced.find((e) => e.value === this.value)) {
				const selected = list.find((e) => e.value === this.value)
				if (selected) {
					sliced.push(selected)
				}
			}
			return sliced
		},
		/**
		 * Whether the active catalogue has more (un-queried) entries than the
		 * current display cap — drives the "scroll for more" hint and load-on-scroll.
		 *
		 * @return {boolean} true when more icons can be revealed by scrolling.
		 */
		hasMore() {
			return !this.query && this.activeCatalogue.length > this.displayLimit
		},
	},

	watch: {
		sources(next) {
			if (next && next.length && !next.includes(this.activeSource)) {
				this.activeSource = next[0]
			}
		},
	},

	created() {
		// Lazy-load the full MDI range if the mdi source is used without a
		// supplied catalogue; fall back silently to DASHBOARD_ICONS.
		if (this.enriched && this.resolvedSources.includes('mdi') && !this.catalogues.mdi) {
			this.loadMdiCatalogue()
		}
	},

	methods: {
		t,
		/**
		 * Attempt to lazy-load `@mdi/js` (optional dependency) and adapt it into
		 * the MDI catalogue. On failure, leaves `mdiCatalogue` null so the
		 * DASHBOARD_ICONS fallback is used.
		 *
		 * @return {Promise<void>}
		 */
		async loadMdiCatalogue() {
			try {
				const [mdi, adapters] = await Promise.all([
					import('@mdi/js'),
					import('./iconCatalogues.js'),
				])
				this.mdiCatalogue = adapters.fromMdiJs(mdi)
			} catch (e) {
				// @mdi/js not installed — the DASHBOARD_ICONS fallback is used.
				this.mdiCatalogue = null
			}
		},
		/**
		 * Reveal the next batch of icons when the grid is scrolled near its
		 * bottom (infinite scroll), so the user can browse the whole catalogue
		 * without searching. No-op while a search query is active.
		 *
		 * @param {Event} event the grid scroll event.
		 * @return {void}
		 */
		onGridScroll(event) {
			if (this.query || !this.hasMore) {
				return
			}
			const el = event.target
			if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48) {
				this.displayLimit += 120
			}
		},
		/**
		 * Switch the active source (and back to standard icon mode). Resets the
		 * display cap so the new source starts from the top.
		 *
		 * @param {string} source the source name.
		 * @return {void}
		 */
		selectSource(source) {
			this.activeSource = source
			this.iconMode = 'standard'
			this.query = ''
			this.displayLimit = 120
			if (source === 'mdi' && !this.catalogues.mdi && !this.mdiCatalogue) {
				this.loadMdiCatalogue()
			}
		},
		/**
		 * Human label for a source name.
		 *
		 * @param {string} source the source name.
		 * @return {string} the display label.
		 */
		sourceLabel(source) {
			if (source === 'mdi') {
				return t('nextcloud-vue', 'Material')
			}
			if (source === 'fontawesome') {
				return t('nextcloud-vue', 'FontAwesome')
			}
			if (source === 'opengemeenten') {
				return t('nextcloud-vue', 'OpenGemeenten')
			}
			return source
		},
		/**
		 * Switch between standard grid and custom-SVG editing.
		 *
		 * @param {'standard'|'custom'} mode the mode to activate.
		 * @return {void}
		 */
		setIconMode(mode) {
			this.iconMode = mode
			if (mode === 'custom' && this.customSvg) {
				this.$emit('input', this.customSvg)
			}
		},
		/**
		 * Handle input in the custom-SVG editor — stores and emits raw SVG.
		 *
		 * @param {string} svg the SVG markup.
		 * @return {void}
		 */
		onCustomSvgInput(svg) {
			this.customSvg = svg
			this.$emit('input', svg || null)
		},
		/**
		 * Pretty-print the SVG in the custom editor (indented, one node per
		 * line). Leaves the content unchanged when no `<svg>` element is found.
		 *
		 * @return {void}
		 */
		formatSVG() {
			try {
				const input = String(this.customSvg || '').trim()
				const match = input.match(/<svg[\s\S]*?<\/svg>/i)
				if (!match) {
					return
				}
				const parser = new DOMParser()
				const doc = parser.parseFromString(match[0], 'image/svg+xml')
				if (doc.getElementsByTagName('parsererror').length > 0) {
					return
				}
				let svgEl = doc.documentElement
				if (!svgEl || svgEl.nodeName.toLowerCase() !== 'svg') {
					svgEl = doc.getElementsByTagName('svg')[0]
					if (!svgEl) {
						return
					}
				}
				this.onCustomSvgInput(this.prettySvg(svgEl))
			} catch (e) {
				// Leave content unchanged on any parse/serialize error.
			}
		},
		/**
		 * Recursively serialize an SVG DOM node into indented markup.
		 *
		 * @param {Node} root the SVG root element.
		 * @return {string} the pretty-printed markup.
		 */
		prettySvg(root) {
			const indent = (d) => '\t'.repeat(d)
			const serialize = (node, depth) => {
				if (node.nodeType === 3) {
					const text = node.nodeValue.trim()
					return text ? indent(depth) + text : ''
				}
				if (node.nodeType !== 1) {
					return ''
				}
				const tag = node.tagName
				const attrs = Array.from(node.attributes).map((a) => `${a.name}="${a.value}"`).join(' ')
				const open = attrs ? `<${tag} ${attrs}>` : `<${tag}>`
				const children = Array.from(node.childNodes).filter((n) => !(n.nodeType === 3 && !n.nodeValue.trim()))
				if (children.length === 0) {
					return indent(depth) + open + '\n' + indent(depth) + `</${tag}>`
				}
				let out = indent(depth) + open
				children.forEach((child) => {
					const childStr = serialize(child, depth + 1)
					if (childStr) {
						out += '\n' + childStr
					}
				})
				out += '\n' + indent(depth) + `</${tag}>`
				return out
			}
			return serialize(root, 0)
		},
		/**
		 * Emit the chosen icon value (or null for the "None" tile).
		 *
		 * @param {string|null} name the icon value.
		 * @return {void}
		 */
		selectIconName(name) {
			this.uploadError = ''
			/**
			 * @event input Emitted with the new icon value (registry key, source
			 * value, URL, raw SVG, or null) per the v-model convention.
			 * @type {string|null}
			 */
			this.$emit('input', name || null)
			// In compact mode, close the popover after a pick.
			if (this.compact && this.$refs.root) {
				this.$refs.root.open = false
			}
		},
		/**
		 * Emit a new placement value.
		 *
		 * @param {'left'|'right'} option the placement.
		 * @return {void}
		 */
		selectPlacement(option) {
			/**
			 * @event update:placement Emitted when the placement changes (`v-model:placement`).
			 * @type {'left'|'right'}
			 */
			this.$emit('update:placement', option)
		},
		/**
		 * Read the selected file as a data URL and hand it to `uploadFn`,
		 * emitting the returned URL on success.
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
.cn-icon-picker {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

/* Compact (popover) mode for inline / table use. */
.cn-icon-picker--compact {
	display: inline-block;
	position: relative;
}

.cn-icon-picker--compact > .cn-icon-picker__trigger {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	cursor: pointer;
	list-style: none;
}

.cn-icon-picker--compact > .cn-icon-picker__trigger::-webkit-details-marker {
	display: none;
}

.cn-icon-picker--compact .cn-icon-picker__panel {
	position: absolute;
	z-index: 50;
	top: calc(100% + 4px);
	inset-inline-start: 0;
	min-width: 240px;
	padding: 8px;
	display: flex;
	flex-direction: column;
	gap: 8px;
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	box-shadow: 0 2px 8px var(--color-box-shadow, rgba(0, 0, 0, 0.2));
}

.cn-icon-picker__preview {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border: 1px solid var(--color-border);
	border-radius: 4px;
	background-color: var(--color-background-hover);
}

.cn-icon-picker__sources {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}

.cn-icon-picker__source {
	padding: 4px 10px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	color: var(--color-main-text);
	cursor: pointer;
	font-size: 13px;
}

.cn-icon-picker__source--active {
	border-color: var(--color-primary-element);
	background: var(--color-primary-element-light, var(--color-background-hover));
}

.cn-icon-picker__search {
	width: 100%;
	padding: 6px 10px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	color: var(--color-main-text);
}

.cn-icon-picker__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
	gap: 6px;
	max-height: 200px;
	overflow-y: auto;
	padding: 4px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius, 4px);
}

.cn-icon-picker__icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	padding: 0;
	border: 2px solid transparent;
	border-radius: var(--border-radius, 4px);
	background: transparent;
	cursor: pointer;
	color: var(--color-main-text);
}

.cn-icon-picker__icon:hover {
	background: var(--color-background-hover);
}

.cn-icon-picker__icon--selected {
	border-color: var(--color-primary-element);
	background: var(--color-primary-element-light, var(--color-background-hover));
}

.cn-icon-picker__svg {
	width: 20px;
	height: 20px;
}

.cn-icon-picker__hint {
	margin: 0;
	font-size: 12px;
	color: var(--color-text-maxcontrast);
	font-style: italic;
}

.cn-icon-picker__placement {
	display: flex;
	align-items: center;
	gap: 6px;
	flex-wrap: wrap;
}

.cn-icon-picker__placement-label {
	font-size: 13px;
	font-weight: bold;
	color: var(--color-text);
}

.cn-icon-picker__custom {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-icon-picker__format {
	align-self: flex-start;
	padding: 4px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-background-hover);
	color: var(--color-main-text);
	cursor: pointer;
	font-size: 13px;
}

.cn-icon-picker__upload-label {
	position: relative;
	display: inline-flex;
	align-items: center;
	gap: 8px;
	cursor: pointer;
}

.cn-icon-picker__file-input {
	display: none;
}

.cn-icon-picker__upload-button {
	padding: 6px 12px;
	border: 1px solid var(--color-border);
	border-radius: 4px;
	background-color: var(--color-background-hover);
	font-size: 14px;
	transition: background-color 0.2s;
}

.cn-icon-picker__upload-label:hover .cn-icon-picker__upload-button {
	background-color: var(--color-background-dark);
}

.cn-icon-picker__error {
	margin: 0;
	padding: 4px 8px;
	font-size: 12px;
	color: var(--color-error);
	background-color: var(--color-background-hover);
	border-radius: 2px;
}
</style>

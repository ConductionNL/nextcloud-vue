<!-- SPDX-License-Identifier: EUPL-1.2 -->
<!-- SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl> -->
<template>
	<div class="cn-icon-color-picker" data-testid="cn-icon-color-picker">
		<!-- Live preview: the chosen icon (or the host's default glyph) in the
		     chosen color for the ACTIVE theme, on the Proton-style tinted
		     circle derived from the SAME color. Decorative — the pickers
		     below carry the accessible state. -->
		<div
			class="cn-icon-color-picker__preview"
			aria-hidden="true"
			:style="previewTint ? { backgroundColor: previewTint } : undefined">
			<component
				:is="previewIcon"
				v-if="previewIcon"
				:size="28"
				:fill-color="previewColor" />
		</div>

		<div class="cn-icon-color-picker__section">
			<span :id="`${uid}-color-label`" class="cn-icon-color-picker__label">
				{{ tr('Color') }}
			</span>
			<div
				class="cn-icon-color-picker__swatches"
				role="group"
				:aria-labelledby="`${uid}-color-label`"
				@keydown="onGroupKeydown($event, 'swatches')">
				<button
					type="button"
					class="cn-icon-color-picker__swatch cn-icon-color-picker__swatch--default"
					:class="{ 'cn-icon-color-picker__swatch--selected': !color }"
					:aria-label="tr('Default')"
					:aria-pressed="!color"
					:title="tr('Default')"
					:tabindex="swatchTabStop === 'default' ? 0 : -1"
					data-cell-key="default"
					data-testid="cn-icon-color-picker-color-default"
					@click="pickColor(null)" />
				<button
					v-for="entry in swatchesWithHex"
					:key="entry.key"
					type="button"
					class="cn-icon-color-picker__swatch"
					:class="{
						'cn-icon-color-picker__swatch--selected':
							color === entry.key,
					}"
					:style="{ backgroundColor: entry.hex }"
					:aria-label="tr(entry.label)"
					:aria-pressed="color === entry.key"
					:title="tr(entry.label)"
					:tabindex="swatchTabStop === entry.key ? 0 : -1"
					:data-cell-key="entry.key"
					:data-testid="`cn-icon-color-picker-color-${entry.key}`"
					@click="pickColor(entry.key)" />
			</div>
		</div>

		<div class="cn-icon-color-picker__section">
			<span :id="`${uid}-icon-label`" class="cn-icon-color-picker__label">
				{{ tr('Icon') }}
			</span>
			<NcTextField
				:model-value="query"
				:label="tr('Search icons')"
				data-testid="cn-icon-color-picker-search"
				@update:model-value="query = $event">
				<Magnify :size="16" />
			</NcTextField>
			<div
				class="cn-icon-color-picker__icons"
				role="group"
				:aria-labelledby="`${uid}-icon-label`"
				@keydown="onGroupKeydown($event, 'icons')">
				<button
					v-if="showDefaultIconCell"
					type="button"
					class="cn-icon-color-picker__icon"
					:class="{ 'cn-icon-color-picker__icon--selected': !icon }"
					:aria-label="tr('Default')"
					:aria-pressed="!icon"
					:title="tr('Default')"
					:tabindex="iconTabStop === 'default' ? 0 : -1"
					data-cell-key="default"
					data-testid="cn-icon-color-picker-icon-default"
					@click="pickIcon(null)">
					<component :is="fallbackIcon" :size="20" />
				</button>
				<button
					v-for="entry in filteredIcons"
					:key="entry.key"
					type="button"
					class="cn-icon-color-picker__icon"
					:class="{
						'cn-icon-color-picker__icon--selected':
							icon === entry.key,
					}"
					:aria-label="tr(entry.label)"
					:aria-pressed="icon === entry.key"
					:title="tr(entry.label)"
					:tabindex="iconTabStop === entry.key ? 0 : -1"
					:data-cell-key="entry.key"
					:data-testid="`cn-icon-color-picker-icon-${entry.key}`"
					@click="pickIcon(entry.key)">
					<component :is="entry.component" :size="20" />
				</button>
			</div>
		</div>
	</div>
</template>

<script>
import { NcTextField } from '@nextcloud/vue'
import Magnify from 'vue-material-design-icons/Magnify.vue'
import { currentTheme } from '../../composables/useCurrentTheme.js'
import {
	FOLDER_COLORS,
	folderColorTint,
	resolveFolderColor,
	resolveFolderIcon,
	searchFolderIcons,
} from '../../utils/folderCustomization.js'

let uidCounter = 0

/**
 * CnIconColorPicker — the Proton-Pass-style customization block: a color
 * swatch row and a searchable icon grid over the library's curated
 * folder-customization catalogs, with a live preview of the pair in the
 * active theme.
 *
 * Controlled component: bind `icon` / `color` (both nullable string KEYS,
 * which is also what apps persist) and listen to `update:icon` /
 * `update:color` — `v-model:icon` and `v-model:color` therefore work. The
 * leading "Default" cell in each group emits an explicit null, so a host
 * dialog can distinguish "cleared" from "never touched" without extra
 * controls.
 *
 * All user-facing labels (the group labels, "Default", the color and icon
 * names) pass through the `translate` prop — this library ships no app
 * l10n, so hosts hand in their own `t()` the CnAppRoot way.
 *
 * ```vue
 * <CnIconColorPicker
 *   v-model:icon="customIcon"
 *   v-model:color="customColor"
 *   :fallback-icon="Safe"
 *   :translate="(s) => t('myapp', s)" />
 * ```
 */
export default {
	name: 'CnIconColorPicker',

	components: { NcTextField, Magnify },

	props: {
		/** The selected icon key (a `FOLDER_ICONS` key), or null for the host's default glyph. */
		icon: { type: String, default: null },
		/** The selected color key (a `FOLDER_COLORS` key), or null for the theme default. */
		color: { type: String, default: null },
		/**
		 * The host's default glyph (an icon component): shown in the preview
		 * while no icon is picked, and rendered as the leading "Default"
		 * cell of the icon grid. Without it the grid offers no
		 * back-to-default cell and the preview stays empty until a pick.
		 */
		fallbackIcon: { type: [Object, Function], default: null },
		/** Translate function applied to every user-facing label (host-app t()). */
		translate: { type: Function, default: (s) => s },
	},

	emits: ['update:icon', 'update:color'],

	data() {
		uidCounter += 1
		return {
			/** The icon-grid search query. */
			query: '',
			/** Stable id prefix tying the group labels to their groups. */
			uid: `cn-icp-${uidCounter}`,
			/** Roving-tabindex position in the swatch row ('default' or a color key). */
			swatchFocusKey: null,
			/** Roving-tabindex position in the icon grid ('default' or an icon key). */
			iconFocusKey: null,
		}
	},

	computed: {
		/**
		 * The color catalog with each entry's hex resolved for the ACTIVE
		 * theme (reactive — the swatch fills flip with the theme). A computed
		 * so the per-entry resolution runs once per theme change, not once
		 * per swatch per render.
		 *
		 * @return {Array<object>} The palette entries, each with a `hex`.
		 */
		swatchesWithHex() {
			const theme = currentTheme()
			return FOLDER_COLORS.map((entry) => ({
				...entry,
				hex: resolveFolderColor(entry.key, theme),
			}))
		},

		/**
		 * The swatch-row cell holding the single Tab stop (roving tabindex):
		 * the last cell the user arrowed to, else the selected color, else
		 * the leading Default swatch.
		 *
		 * @return {string} 'default' or a FOLDER_COLORS key.
		 */
		swatchTabStop() {
			if (this.swatchFocusKey === 'default'
				|| FOLDER_COLORS.some((e) => e.key === this.swatchFocusKey)) {
				return this.swatchFocusKey
			}
			if (this.color && FOLDER_COLORS.some((e) => e.key === this.color)) {
				return this.color
			}
			return 'default'
		},

		/**
		 * The icon-grid cell holding the single Tab stop (roving tabindex):
		 * the last cell the user arrowed to, else the selected icon, else the
		 * Default cell, else the first search result — recomputed as a search
		 * narrows the grid, so the stop never lands on a hidden cell.
		 *
		 * @return {string|null} 'default', a FOLDER_ICONS key, or null for an empty grid.
		 */
		iconTabStop() {
			const keys = this.filteredIcons.map((e) => e.key)
			if (this.iconFocusKey === 'default' && this.showDefaultIconCell) {
				return 'default'
			}
			if (keys.includes(this.iconFocusKey)) {
				return this.iconFocusKey
			}
			if (this.icon && keys.includes(this.icon)) {
				return this.icon
			}
			if (this.showDefaultIconCell) {
				return 'default'
			}
			return keys[0] ?? null
		},

		/**
		 * The icon entries the grid shows for the current search query.
		 *
		 * @return {Array<object>} The matching catalog entries.
		 */
		filteredIcons() {
			return searchFolderIcons(this.query, this.translate)
		},

		/**
		 * Whether the leading back-to-default cell renders: only with a
		 * host glyph to show, and never while a search is narrowing the
		 * grid (the cell is not a search result).
		 *
		 * @return {boolean} True when the Default cell renders.
		 */
		showDefaultIconCell() {
			return this.fallbackIcon !== null && this.query.trim() === ''
		},

		/**
		 * The preview glyph: the picked icon, else the host's default.
		 *
		 * @return {object|null} An icon component or null.
		 */
		previewIcon() {
			return resolveFolderIcon(this.icon) ?? this.fallbackIcon
		},

		/**
		 * The preview glyph color for the ACTIVE theme (reactive — flips
		 * with the theme without a reload). Falls back to `currentColor`,
		 * never null: an explicit null fill-color strips the SVG's fill
		 * attribute entirely, which renders BLACK regardless of theme.
		 *
		 * @return {string} A hex color, or 'currentColor' for the theme default.
		 */
		previewColor() {
			return resolveFolderColor(this.color, currentTheme()) ?? 'currentColor'
		},

		/**
		 * The preview circle's Proton-style tint: the SAME resolved color
		 * at low alpha, so glyph and circle stay in lockstep across themes.
		 *
		 * @return {string|null} An rgba string, or null for the neutral
		 *   circle while no color is picked.
		 */
		previewTint() {
			return folderColorTint(this.color, currentTheme(), 0.18)
		},
	},

	methods: {
		/**
		 * Translate a label through the host's translate prop.
		 *
		 * @param {string} label The English source label.
		 * @return {string} The translated label.
		 */
		tr(label) {
			return this.translate(label)
		},

		/**
		 * Emit the color pick and move the swatch row's Tab stop onto the
		 * clicked cell, so Tab re-enters the row where the user left it.
		 *
		 * @param {string|null} key The picked FOLDER_COLORS key, or null for Default.
		 * @return {void}
		 */
		pickColor(key) {
			this.swatchFocusKey = key ?? 'default'
			this.$emit('update:color', key)
		},

		/**
		 * Emit the icon pick and move the icon grid's Tab stop onto the
		 * clicked cell, so Tab re-enters the grid where the user left it.
		 *
		 * @param {string|null} key The picked FOLDER_ICONS key, or null for Default.
		 * @return {void}
		 */
		pickIcon(key) {
			this.iconFocusKey = key ?? 'default'
			this.$emit('update:icon', key)
		},

		/**
		 * Roving-tabindex keyboard navigation for a picker group (APG toolbar
		 * pattern): Tab enters and leaves the group in one stop; Left/Right
		 * arrows step through the cells (wrapping), Home/End jump to the
		 * ends, and — in the icon grid, where cells wrap into rows — Up/Down
		 * move by one visual row.
		 *
		 * @param {KeyboardEvent} event The keydown event from the group container.
		 * @param {('swatches'|'icons')} group Which picker group the event came from.
		 * @return {void}
		 */
		onGroupKeydown(event, group) {
			const cells = Array.from(event.currentTarget.querySelectorAll('button'))
			const index = cells.indexOf(event.target)
			if (index === -1 || cells.length === 0) {
				return
			}

			let next = null
			switch (event.key) {
			case 'ArrowRight':
				next = (index + 1) % cells.length
				break
			case 'ArrowLeft':
				next = (index - 1 + cells.length) % cells.length
				break
			case 'ArrowDown':
			case 'ArrowUp': {
				if (group !== 'icons') {
					return
				}
				// One visual row per keypress. jsdom reports no resolved
				// grid tracks — then swallow the key (keep the page from
				// scrolling under an open grid) without moving focus.
				const columns = this.gridColumnCount(event.currentTarget)
				const step = event.key === 'ArrowDown' ? columns : -columns
				if (columns && index + step >= 0 && index + step < cells.length) {
					next = index + step
				}
				break
			}
			case 'Home':
				next = 0
				break
			case 'End':
				next = cells.length - 1
				break
			default:
				return
			}

			event.preventDefault()
			if (next === null) {
				return
			}
			cells[next].focus()
			const key = cells[next].dataset.cellKey || 'default'
			if (group === 'icons') {
				this.iconFocusKey = key
			} else {
				this.swatchFocusKey = key
			}
		},

		/**
		 * The icon grid's current column count, read from the resolved CSS
		 * grid tracks (the `auto-fill` column count depends on the host's
		 * width, so it can only be read back, not derived).
		 *
		 * @param {HTMLElement} grid The grid container element.
		 * @return {number} The column count, or 0 when unresolvable (jsdom).
		 */
		gridColumnCount(grid) {
			const tracks = (getComputedStyle(grid).gridTemplateColumns || '').trim()
			return tracks && tracks !== 'none' ? tracks.split(' ').length : 0
		},

		/**
		 * Emit declarations — invoked via the template `$emit(...)` sites.
		 * Listed here so vue-docgen-api picks up the events for the
		 * generated docs.
		 *
		 * @private
		 */
		_emitDocs() {
			/**
			 * User picked an icon (payload: the FOLDER_ICONS key) or the Default cell (payload: null, meaning "clear back to the host's default glyph").
			 *
			 * @event update:icon
			 * @type {string | null}
			 */
			this.$emit('update:icon')
			/**
			 * User picked a color (payload: the FOLDER_COLORS key) or the Default swatch (payload: null, meaning "clear back to the theme default").
			 *
			 * @event update:color
			 * @type {string | null}
			 */
			this.$emit('update:color')
		},
	},
}
</script>

<style scoped>
.cn-icon-color-picker {
	display: flex;
	flex-direction: column;
	gap: calc(3 * var(--default-grid-baseline, 4px));
}

.cn-icon-color-picker__preview {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 52px;
	height: 52px;
	border-radius: 50%;
	background-color: var(--color-background-hover);
	align-self: center;
}

.cn-icon-color-picker__section {
	display: flex;
	flex-direction: column;
	gap: calc(1.5 * var(--default-grid-baseline, 4px));
}

.cn-icon-color-picker__label {
	font-size: 0.8125rem;
	color: var(--color-text-maxcontrast);
}

/* Edge-to-edge swatch row (Proton): the circles distribute across the
   full dialog width and wrap on narrow hosts. */
.cn-icon-color-picker__swatches {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	gap: calc(1.5 * var(--default-grid-baseline, 4px));
}

.cn-icon-color-picker__swatch {
	width: 34px;
	height: 34px;
	/* Nextcloud's global button styling sets a 34px min-height, which
	   stretched smaller swatches into OVALS — pin every dimension so the
	   circle stays a circle whatever the host's button reset does. */
	min-height: 34px;
	min-width: 34px;
	flex: 0 0 34px;
	padding: 0;
	border: 2px solid transparent;
	border-radius: 50%;
	cursor: pointer;
}

/* Same affordance as the icon cells: never rely on the UA default focus
   outline alone — a host-app global `outline: none` reset would leave the
   swatches keyboard-invisible. The ring matches the --selected state. */
.cn-icon-color-picker__swatch:hover,
.cn-icon-color-picker__swatch:focus-visible {
	border-color: var(--color-primary-element);
}

.cn-icon-color-picker__swatch--default {
	background:
		linear-gradient(
			to top right,
			transparent calc(50% - 1px),
			var(--color-error) calc(50% - 1px),
			var(--color-error) calc(50% + 1px),
			transparent calc(50% + 1px)
		);
	border-color: var(--color-border-dark);
}

/* Selection ring drawn INSIDE the circle (primary border + an inset gap
   in the surface color): an outer box-shadow ring gets clipped when a
   cell sits flush against the container edge — the full-bleed rows put
   the first and last cells exactly there. */
.cn-icon-color-picker__swatch--selected {
	border-color: var(--color-primary-element);
	box-shadow: inset 0 0 0 2px var(--color-main-background);
}

/* Full-width grid with NO internal scrolling: the host dialog grows with
   the catalog instead of hiding part of it behind a scrollbar. Cells
   distribute edge to edge; the buttons inside stay fixed-size circles. */
.cn-icon-color-picker__icons {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
	justify-items: center;
	gap: calc(1.5 * var(--default-grid-baseline, 4px));
}

/* Proton-style cells: every icon sits on its own quiet circle. Dimensions
   pinned for the same oval-proofing reason as the swatches. */
.cn-icon-color-picker__icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	min-height: 40px;
	min-width: 40px;
	padding: 0;
	border: 2px solid transparent;
	border-radius: 50%;
	background-color: var(--color-background-hover);
	cursor: pointer;
}

.cn-icon-color-picker__icon:hover,
.cn-icon-color-picker__icon:focus-visible {
	background-color: var(--color-background-dark, var(--color-background-hover));
}

/* Same inside-the-circle ring as the swatches, for the same clipping
   reason. */
.cn-icon-color-picker__icon--selected {
	border-color: var(--color-primary-element);
	box-shadow: inset 0 0 0 2px var(--color-main-background);
}
</style>

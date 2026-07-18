<!--
  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.

  CnCommandPalette — a Ctrl/Cmd+K keyboard-first command palette, anchored
  ONCE in nc-vue so every consuming app inherits it (mirrors how the
  `wcag-a11y-anchor` change anchored `expectAccessible` here instead of each
  app hand-rolling accessibility checks). ADR-004 modal isolation: lives in
  its own file, mounted by CnAppRoot (opt-in, see the `commandPalette` prop)
  or standalone by any app that wants finer control.

  Aggregates THREE pluggable sources into one ranked, sectioned list:
   - navigation — every `manifest.menu` entry (recursively, excluding
     captions), so "jump to page" always exists with zero app wiring.
   - actions    — commands an app registers declaratively via
     `useCommandPalette().register({id, title, section, keywords, run})`.
   - objects    — live OpenRegister search via the `objectSearch` prop
     (see `createObjectSearchSource` in `src/utils/commandPaletteObjectSource.js`
     for a ready-made adapter over `useObjectStore().fetchCollection`),
     debounced client-side and cancelled-by-staleness so a slow network
     response never overwrites a newer query's results — and never blocks
     the (locally computed, synchronous) navigation/action results from
     appearing immediately.

  Keyboard: Ctrl/Cmd+<shortcut> (default "k") opens; Escape closes; Up/Down
  moves the active option; Enter activates it. Focus stays in the input the
  whole time — the active option is tracked via `aria-activedescendant`
  (WAI-ARIA combobox pattern), not by moving DOM focus onto each `<li>`
  (contrast with `CnTimelineStages`' roving-tabindex pattern, which is right
  for a widget users tab INTO, but wrong for a searchable palette where
  focus must stay in the text field).
-->
<template>
	<NcDialog v-if="isOpen"
		:name="paletteLabel"
		size="normal"
		:close-on-click-outside="true"
		class="cn-command-palette-dialog"
		data-testid="cn-command-palette-dialog"
		@closing="close">
		<div class="cn-command-palette" @keydown="onKeydown">
			<div class="cn-command-palette__input-row">
				<input
					ref="input"
					v-model="query"
					type="text"
					role="combobox"
					class="cn-command-palette__input"
					data-testid="cn-command-palette-input"
					aria-autocomplete="list"
					aria-haspopup="listbox"
					aria-expanded="true"
					:aria-controls="listboxDomId"
					:aria-activedescendant="activeOptionDomId || undefined"
					:aria-label="paletteLabel"
					:placeholder="placeholderLabel"
					autocomplete="off"
					spellcheck="false">
			</div>

			<p :id="statusDomId"
				role="status"
				aria-live="polite"
				class="cn-command-palette__status">
				{{ resultCountLabel }}
			</p>

			<ul :id="listboxDomId"
				role="listbox"
				:aria-label="paletteLabel"
				class="cn-command-palette__list">
				<template v-for="group in groupedResults" :key="'section:' + (group.section || '_default')">
					<li role="presentation"
						class="cn-command-palette__section-label">
						{{ group.section || defaultSectionLabel }}
					</li>
					<li v-for="entry in group.entries"
						:id="optionDomId(entry.item.id)"
						:key="entry.item.id"
						role="option"
						:aria-selected="entry.item.id === activeId ? 'true' : 'false'"
						class="cn-command-palette__option"
						:class="{ 'cn-command-palette__option--active': entry.item.id === activeId }"
						data-testid="cn-command-palette-option"
						@mousemove="activeId = entry.item.id"
						@click="activateItem(entry.item)">
						<CnIcon v-if="entry.item.icon"
							:name="entry.item.icon"
							:size="18"
							class="cn-command-palette__option-icon" />
						<span class="cn-command-palette__option-title">{{ entry.item.title }}</span>
						<span v-if="entry.item.subtitle" class="cn-command-palette__option-subtitle">{{ entry.item.subtitle }}</span>
					</li>
				</template>
			</ul>

			<p v-if="flatResults.length === 0" class="cn-command-palette__empty">
				{{ emptyLabel }}
			</p>
		</div>
	</NcDialog>
</template>

<script>
import { NcDialog } from '@nextcloud/vue'
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import CnIcon from '../CnIcon/CnIcon.vue'
import { useCommandPalette } from '../../composables/useCommandPalette.js'
import { rankCommandPaletteItems, groupRankedResultsBySection } from '../../utils/commandPaletteRanking.js'
import { createRecencyTracker } from '../../commandPalette/recency.js'

let domIdCounter = 0

export default {
	name: 'CnCommandPalette',
	components: { NcDialog, CnIcon },
	props: {
		/**
		 * Reactive app manifest (from `useAppManifest`). `manifest.menu` is
		 * flattened (including one level of `children`) into the
		 * "navigation" source — every entry with a `route` or `href`
		 * becomes a "jump to page" result with zero app-side wiring.
		 * Entries with `type: 'caption'` (non-interactive section dividers)
		 * are skipped. Omit to run with navigation results disabled.
		 *
		 * @type {object|null}
		 */
		manifest: { type: Object, default: null },
		/**
		 * vue-router instance, used to resolve navigation results
		 * (`router.push({ name: item.route, query: item.query })`, matching
		 * `CnAppNav`'s own resolution). Omit if the app has no router (the
		 * navigation source is then skipped even when `manifest` is set).
		 *
		 * @type {object|null}
		 */
		router: { type: Object, default: null },
		/**
		 * "Objects" source: `async (query) => resultItems[]`. Called
		 * (debounced by `objectSearchDebounce`) whenever the query changes.
		 * Each returned item MUST carry `{id, title, run}` and MAY carry
		 * `{subtitle, section, keywords, icon}` — the exact shape
		 * `createObjectSearchSource` (`src/utils/commandPaletteObjectSource.js`)
		 * produces. Omit to run without live object search.
		 *
		 * @type {Function|null}
		 */
		objectSearch: { type: Function, default: null },
		/**
		 * Debounce window (ms) before `objectSearch` is invoked after the
		 * query stops changing — keeps fast typing from firing a request
		 * per keystroke. Navigation/action results are unaffected (they're
		 * computed synchronously, client-side) so the palette never appears
		 * to "wait" on this.
		 *
		 * @type {number}
		 */
		objectSearchDebounce: { type: Number, default: 200 },
		/**
		 * The key combined with Ctrl (Windows/Linux) or Cmd (macOS) that
		 * opens the palette. Case-insensitive.
		 *
		 * @type {string}
		 */
		shortcut: { type: String, default: 'k' },
		/**
		 * Disable the built-in global Ctrl/Cmd+`shortcut` listener. Set
		 * this when the host app wants to drive `open()`/`close()`/`toggle()`
		 * itself (e.g. from its own toolbar button or a different shortcut)
		 * via `useCommandPalette()`.
		 *
		 * @type {boolean}
		 */
		disableShortcut: { type: Boolean, default: false },
		/**
		 * App id used to namespace the optional local recency/frequency
		 * boost (`localStorage`-only — see `commandPalette/recency.js`).
		 * Pass the app's own id so multiple apps on the same origin don't
		 * share one history bucket. Omit to disable the boost entirely
		 * (results still rank correctly by match tier, just without a
		 * "used recently" nudge).
		 *
		 * @type {string|null}
		 */
		appId: { type: String, default: null },
		/**
		 * Section label for navigation results.
		 *
		 * @type {string}
		 */
		navigationSection: { type: String, default: () => t('nextcloud-vue', 'Navigate') },
		/**
		 * Input placeholder / accessible name for the palette dialog.
		 *
		 * @type {string}
		 */
		placeholder: { type: String, default: () => t('nextcloud-vue', 'Type a command or search…') },
		/**
		 * Accessible name for the dialog + combobox + listbox. Also the
		 * `NcDialog` header text.
		 *
		 * @type {string}
		 */
		label: { type: String, default: () => t('nextcloud-vue', 'Command palette') },
		/**
		 * Override registry (test isolation / a deliberately separate
		 * palette instance). Defaults to the shared singleton every
		 * `useCommandPalette()` call reads.
		 *
		 * @type {object|null}
		 */
		commandRegistry: { type: Object, default: null },
	},
	data() {
		return {
			domId: `cn-command-palette-${++domIdCounter}`,
			query: '',
			activeId: null,
			objectResults: [],
			objectLoading: false,
			debounceTimer: null,
			objectSearchToken: 0,
			previouslyFocusedElement: null,
			destroyed: false,
		}
	},
	computed: {
		/**
		 * The palette API for this instance's registry (default shared
		 * singleton, or the `commandRegistry` override).
		 *
		 * @return {object} The `useCommandPalette()` result.
		 */
		cp() {
			return useCommandPalette(this.commandRegistry)
		},
		/**
		 * @return {boolean} Whether the palette is currently open (mirrors the shared `cp.state.isOpen`).
		 */
		isOpen() {
			return this.cp.state.isOpen
		},
		/**
		 * @return {object|null} The recency tracker for `appId`, or `null` when the boost is disabled (no `appId`).
		 */
		recency() {
			return this.appId ? createRecencyTracker(this.appId) : null
		},
		/**
		 * @return {string} The resolved `label` prop.
		 */
		paletteLabel() {
			return this.label
		},
		/**
		 * @return {string} The resolved `placeholder` prop.
		 */
		placeholderLabel() {
			return this.placeholder
		},
		/**
		 * @return {string} Empty-results state text.
		 */
		emptyLabel() {
			return t('nextcloud-vue', 'No results found.')
		},
		/**
		 * @return {string} Fallback section heading for results without an explicit `section`.
		 */
		defaultSectionLabel() {
			return t('nextcloud-vue', 'Results')
		},
		/**
		 * @return {string} DOM id of the `role="listbox"` element, targeted by the input's `aria-controls`.
		 */
		listboxDomId() {
			return `${this.domId}-listbox`
		},
		/**
		 * @return {string} DOM id of the `aria-live="polite"` result-count status region.
		 */
		statusDomId() {
			return `${this.domId}-status`
		},
		/**
		 * Flattened navigation commands built from `manifest.menu`
		 * (recursing one level into `children`, per the manifest's own
		 * nesting limit). Memoised per manifest/router change via Vue's
		 * computed cache — cheap even on every keystroke since typing
		 * doesn't invalidate it.
		 *
		 * @return {Array<object>}
		 */
		navigationItems() {
			const menu = this.manifest && Array.isArray(this.manifest.menu) ? this.manifest.menu : []
			const flat = []
			const visit = (entries) => {
				for (const entry of entries) {
					if (!entry || entry.type === 'caption') continue
					if (entry.route || entry.href) {
						flat.push({
							id: `nav:${entry.id}`,
							title: entry.label,
							section: this.navigationSection,
							icon: entry.icon || null,
							keywords: [],
							run: () => this.navigateTo(entry),
						})
					}
					if (Array.isArray(entry.children) && entry.children.length > 0) {
						visit(entry.children)
					}
				}
			}
			visit(menu)
			return flat
		},
		/**
		 * @return {Array<object>} Registered action commands (from `useCommandPalette().register(...)`).
		 */
		commandItems() {
			return this.cp.commands.items
		},
		/**
		 * @return {Record<string, number>|null} The recency/frequency usage-count map, or `null` when the boost is disabled (no `appId`).
		 */
		usageCounts() {
			return this.recency ? this.recency.getUsageCounts() : null
		},
		/**
		 * Ranked + merged results: navigation and actions are ranked
		 * strictly (a non-matching entry is dropped); objects are ranked
		 * with `includeNonMatching` (the server already filtered them —
		 * dropping a result the client-side scorer merely doesn't
		 * recognise as a title/keyword match would silently hide a real
		 * match on a field the scorer never sees, e.g. a description).
		 *
		 * @return {Array<{item: object, tier: number, score: number}>}
		 */
		rankedResults() {
			const staticItems = this.navigationItems.concat(this.commandItems)
			const rankedStatic = rankCommandPaletteItems(staticItems, this.query, { usageCounts: this.usageCounts })
			const rankedObjects = this.objectResults.length > 0
				? rankCommandPaletteItems(this.objectResults, this.query, { usageCounts: this.usageCounts, includeNonMatching: true })
				: []
			if (this.query.trim() === '') {
				// Idle list: objects never populate on an empty query (see
				// `onQueryChanged`), so this is just the static idle order.
				return rankedStatic
			}
			return [...rankedStatic, ...rankedObjects].sort((a, b) => b.score - a.score)
		},
		/**
		 * @return {Array<{section: ?string, entries: Array<object>}>}
		 */
		groupedResults() {
			return groupRankedResultsBySection(this.rankedResults)
		},
		/**
		 * @return {Array<{item: object, tier: number, score: number}>} The ranked results as a flat list (grouping-order-preserving), used for keyboard Up/Down/Enter and the empty-state check.
		 */
		flatResults() {
			return this.groupedResults.flatMap((g) => g.entries)
		},
		/**
		 * @return {string|null} DOM id of the currently active `<li role="option">`, or `null` when nothing is active.
		 */
		activeOptionDomId() {
			return this.activeId ? this.optionDomId(this.activeId) : null
		},
		/**
		 * @return {string} `aria-live="polite"` announcement of the current result count — screen-reader users get an audible count on every keystroke without the whole listbox being re-announced.
		 */
		resultCountLabel() {
			const count = this.flatResults.length
			return n('nextcloud-vue', '{count} result', '{count} results', count, { count })
		},
	},
	watch: {
		isOpen(next) {
			if (next) {
				this.onOpen()
			} else {
				this.onClose()
			}
		},
		query() {
			this.scheduleObjectSearch()
		},
		flatResults(next) {
			// Keep the active option valid as the result set changes shape
			// (e.g. object results arriving after navigation/actions
			// already rendered) — default to the first result, clear when
			// there are none.
			if (next.length === 0) {
				this.activeId = null
				return
			}
			if (!next.some((entry) => entry.item.id === this.activeId)) {
				this.activeId = next[0].item.id
			}
		},
	},
	mounted() {
		if (!this.disableShortcut) {
			document.addEventListener('keydown', this.onGlobalKeydown)
		}
	},
	beforeDestroy() {
		document.removeEventListener('keydown', this.onGlobalKeydown)
		this.clearDebounce()
		this.destroyed = true
	},
	methods: {
		/**
		 * @param {KeyboardEvent} event The document-level keydown event.
		 * @return {void}
		 */
		onGlobalKeydown(event) {
			const key = typeof event.key === 'string' ? event.key.toLowerCase() : ''
			if (key !== this.shortcut.toLowerCase()) return
			if (!(event.metaKey || event.ctrlKey) || event.altKey) return
			event.preventDefault()
			this.cp.toggle()
		},
		/**
		 * Keydown handler scoped to the palette's own input/listbox —
		 * handles the WAI-ARIA combobox interaction model (focus stays on
		 * the input the whole time; Up/Down move `aria-activedescendant`).
		 *
		 * @param {KeyboardEvent} event The keydown event.
		 * @return {void}
		 */
		onKeydown(event) {
			if (event.key === 'Escape') {
				event.preventDefault()
				this.close()
				return
			}
			if (event.key === 'ArrowDown') {
				event.preventDefault()
				this.moveActive(1)
				return
			}
			if (event.key === 'ArrowUp') {
				event.preventDefault()
				this.moveActive(-1)
				return
			}
			if (event.key === 'Home') {
				event.preventDefault()
				if (this.flatResults.length > 0) this.activeId = this.flatResults[0].item.id
				return
			}
			if (event.key === 'End') {
				event.preventDefault()
				if (this.flatResults.length > 0) this.activeId = this.flatResults[this.flatResults.length - 1].item.id
				return
			}
			if (event.key === 'Enter') {
				event.preventDefault()
				const active = this.flatResults.find((entry) => entry.item.id === this.activeId)
				if (active) this.activateItem(active.item)
			}
		},
		/**
		 * @param {number} delta `1` for the next option, `-1` for the previous. Clamped (does not wrap).
		 * @return {void}
		 */
		moveActive(delta) {
			if (this.flatResults.length === 0) return
			const currentIndex = this.flatResults.findIndex((entry) => entry.item.id === this.activeId)
			const nextIndex = Math.min(Math.max(currentIndex + delta, 0), this.flatResults.length - 1)
			this.activeId = this.flatResults[nextIndex].item.id
		},
		/**
		 * Activate a result: record it for the recency boost, close the
		 * palette (which restores focus), THEN run it on `nextTick` — so
		 * the command's own side effects (typically a route change) happen
		 * after the palette has already relinquished focus, not while it's
		 * mid-close.
		 *
		 * @param {object} item The activated result (`{id, title, run, ...}`).
		 * @return {void}
		 */
		activateItem(item) {
			if (!item || typeof item.run !== 'function') return
			/**
			 * @event select Emitted just before a result's `run()` fires.
			 * @type {object}
			 */
			this.$emit('select', item)
			if (this.recency) this.recency.recordUse(item.id)
			this.close()
			this.$nextTick(() => item.run())
		},
		/**
		 * @param {object} entry A navigation-source `manifest.menu` entry.
		 * @return {void}
		 */
		navigateTo(entry) {
			if (entry.href) {
				window.open(entry.href, '_blank', 'noopener')
				return
			}
			const router = this.router
			if (entry.route && router) {
				router.push(entry.query ? { name: entry.route, query: entry.query } : { name: entry.route })
			}
		},
		/**
		 * @return {void}
		 */
		onOpen() {
			this.previouslyFocusedElement = document.activeElement
			this.query = ''
			this.objectResults = []
			this.activeId = this.flatResults.length > 0 ? this.flatResults[0].item.id : null
			this.$nextTick(() => {
				if (this.$refs.input) this.$refs.input.focus()
			})
		},
		/**
		 * @return {void}
		 */
		onClose() {
			this.clearDebounce()
			const target = this.previouslyFocusedElement
			this.previouslyFocusedElement = null
			if (target && typeof target.focus === 'function' && document.contains(target)) {
				target.focus()
			}
		},
		/**
		 * NcDialog's `@closing` (backdrop click / its own Escape handling)
		 * and the palette's own Escape/toggle path both funnel through
		 * here, so there is exactly one close routine.
		 *
		 * @return {void}
		 */
		close() {
			this.cp.close()
		},
		/**
		 * @return {void}
		 */
		clearDebounce() {
			if (this.debounceTimer) {
				clearTimeout(this.debounceTimer)
				this.debounceTimer = null
			}
		},
		/**
		 * @return {void}
		 */
		scheduleObjectSearch() {
			this.clearDebounce()
			if (!this.objectSearch) return
			if (this.query.trim() === '') {
				this.objectResults = []
				this.objectLoading = false
				return
			}
			this.debounceTimer = setTimeout(() => this.runObjectSearch(), this.objectSearchDebounce)
		},
		/**
		 * @return {Promise<void>}
		 */
		async runObjectSearch() {
			const token = ++this.objectSearchToken
			const query = this.query
			this.objectLoading = true
			let results = []
			try {
				results = await this.objectSearch(query)
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error('[commandPalette] objectSearch threw', e)
				results = []
			}
			// Discard when superseded by a newer query, closed meanwhile,
			// or the component has since been destroyed.
			if (token !== this.objectSearchToken || this.destroyed || this.query !== query) {
				return
			}
			this.objectResults = Array.isArray(results) ? results : []
			this.objectLoading = false
		},
		/**
		 * @param {string} id A result's item id.
		 * @return {string} The DOM id used for its `<li role="option">` + `aria-activedescendant` target.
		 */
		optionDomId(id) {
			return `${this.domId}-option-${encodeURIComponent(id)}`
		},
	},
}
</script>

<style scoped>
.cn-command-palette {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-height: 0;
}

.cn-command-palette__input-row {
	display: flex;
}

.cn-command-palette__input {
	flex: 1 1 auto;
	padding: 10px 14px;
	font-size: 1.1em;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	color: var(--color-main-text);
}

.cn-command-palette__input:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

/* Visually hidden but announced — the live result count. */
.cn-command-palette__status {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip: rect(0 0 0 0);
	white-space: nowrap;
	margin: -1px;
}

.cn-command-palette__list {
	list-style: none;
	margin: 0;
	padding: 0;
	max-height: 50vh;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-command-palette__section-label {
	padding: 8px 10px 2px;
	font-size: 0.75em;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--color-text-maxcontrast);
}

.cn-command-palette__option {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 10px;
	border-radius: var(--border-radius);
	cursor: pointer;
}

.cn-command-palette__option--active,
.cn-command-palette__option:hover {
	background: var(--color-background-hover);
}

.cn-command-palette__option-icon {
	flex: 0 0 auto;
	color: var(--color-text-maxcontrast);
}

.cn-command-palette__option-title {
	flex: 1 1 auto;
	color: var(--color-main-text);
}

.cn-command-palette__option-subtitle {
	flex: 0 0 auto;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-command-palette__empty {
	padding: 24px 12px;
	text-align: center;
	color: var(--color-text-maxcontrast);
	font-style: italic;
	margin: 0;
}
</style>

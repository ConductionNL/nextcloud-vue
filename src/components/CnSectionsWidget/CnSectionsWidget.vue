<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div
		class="cn-sections-widget"
		:class="{
			'cn-sections-widget--cards': cards,
			'cn-sections-widget--two-column': twoColumn,
			'cn-sections-widget--grid': gridColumns > 1,
			'cn-sections-widget--plain': plain,
		}"
		data-testid="cn-sections-widget">
		<div
			v-for="column in columns"
			:key="column.id"
			class="cn-sections-widget__column"
			:class="`cn-sections-widget__column--${column.id}`"
			:style="gridColumns > 1 ? { '--cn-sections-columns': gridColumns } : null">
			<section
				v-for="section in column.sections"
				:key="section.key"
				class="cn-sections-widget__section"
				:class="{ 'cn-sections-widget__section--empty': !isShown(section.key) }"
				:aria-labelledby="section.title && isShown(section.key) ? headingId(section.key) : undefined"
				:data-testid="`cn-section-${section.key}`">
				<!-- The heading waits for content: a widget type that does not
				     resolve renders nothing, and a heading over nothing is a
				     label on a void. -->
				<component :is="sectionHeadingTag"
					v-if="section.title && isShown(section.key)"
					:id="headingId(section.key)"
					class="cn-sections-widget__heading">
					{{ section.title }}
				</component>
				<p
					v-if="section.description && isShown(section.key)"
					class="cn-sections-widget__description">
					{{ section.description }}
				</p>
				<!-- The host always mounts, also while the section reads as
				     empty: a widget that has not mounted cannot fetch, so it
				     could never gain the content that would show it. -->
				<div :ref="(el) => setHostRef(section.key, el)" class="cn-sections-widget__body">
					<CnDetailWidgetHost
						:widget="section.widget"
						chrome="bare"
						:objectId="objectId"
						:object="objectData"
						:objectType="objectType"
						:schemaObject="schemaObject"
						:register="register"
						:schema="schema"
						:store="store"
						:surface="surface"
						:integrationContext="integrationContext"
						:cnRegistry="cnRegistry"
						:availableWidgets="availableWidgets" />
				</div>
			</section>
		</div>
		<p v-if="footnote" class="cn-sections-widget__footnote" data-testid="cn-sections-widget-footnote">
			{{ footnote }}
		</p>
	</div>
</template>

<script>
import CnDetailWidgetHost from '../CnDetailWidgetHost/CnDetailWidgetHost.vue'
import { normalizeLook } from '../../composables/useLook.js'
import { DEFAULT_HEADING_LEVEL, HEADING_LEVEL, headingTag, resolveHeadingLevel } from '../../utils/headingLevel.js'

/** Counter for unique heading ids across instances. */
let instanceCounter = 0

/**
 * CnSectionsWidget — the `sections` widget: several widgets in one place,
 * each under its own heading.
 *
 * A tab strip binds one widget per tab, and a tab often holds more than one
 * thing: the documents list and the case folder (DqZaak), a portal's details
 * form, house style and sign-in (PtPortalInstellingen). This widget stacks
 * them as sections under headings with a rule between them (the default), or
 * as one card per section (`cards: true`), optionally in a main and a side
 * column (`column: "side"` on a section). A single column of separate titled
 * cards in a tab is the tabs widget's own `widgetIds` stack; this widget is
 * for headed sections, and for the two-column card grid a settings tab draws.
 *
 * ```json
 * {
 *   "type": "sections",
 *   "content": {
 *     "sections": [
 *       { "title": "Documenten", "widgetId": "case-documents" },
 *       { "title": "Zaakmap", "widget": { "type": "files" } }
 *     ]
 *   }
 * }
 * ```
 *
 * A section names its widget inline (`widget`) or by id (`widgetId`, a
 * sibling definition on the same surface). Children render through
 * `CnDetailWidgetHost` in bare mode, the dispatch a tab panel uses, so a child
 * behaves here as it does in a tab. A section whose widget draws nothing
 * shows no heading and takes no space (`hideEmpty`, default true). Stacked
 * children share one cell, so an object list in a section renders every
 * fetched row (`content.fit: false`) unless its definition says otherwise.
 *
 * @spec openspec/changes/abstract-sections-widget/specs/sections-widget/spec.md
 */
export default {
	name: 'CnSectionsWidget',

	components: { CnDetailWidgetHost },

	provide() {
		return {
			// Widgets in a section sit under its heading.
			[HEADING_LEVEL]: () => resolveHeadingLevel(this.cnHeadingLevel) + 1,
		}
	},

	inject: {
		cnTranslate: { default: () => (key) => key },
		/** The section headings' level, from the card or page around this widget. */
		cnHeadingLevel: { from: HEADING_LEVEL, default: DEFAULT_HEADING_LEVEL },
		/** The app's look; the outline level applies in the board look only, the Nextcloud look keeps h3. */
		cnLook: { default: 'nextcloud' },
	},

	props: {
		/**
		 * The widget configuration.
		 *
		 * - `sections` — `[{ key?, title?, description?, column?, widget? | widgetId? }]`, in order.
		 *   `label` is accepted as an alias of `title`; `column` is `main` (default) or `side`.
		 * - `cards` — draw each section as its own card (default false: headings and a rule between sections).
		 * - `hideEmpty` — hide the heading and the space of a section whose widget drew nothing (default true).
		 * - `dividers` — draw a rule between sections (default true). `false` stacks them 8px apart with no rule,
		 *   for a row of strips that each say one thing (a record's banners).
		 *
		 * - `columns` — lay the sections out side by side in this many columns (2 to 4), one column on a narrow
		 *   screen. Ignored when a section asks for the side column.
		 * - `footnote` — a line of muted text under the sections.
		 *
		 * @type {{sections?: Array<object>, cards?: boolean, hideEmpty?: boolean, dividers?: boolean, columns?: number, footnote?: string}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** Sibling widget definitions on the surface, for `widgetId` sections. */
		availableWidgets: {
			type: Array,
			default: () => [],
		},

		/** The bound record's id. */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/** The loaded record, or null while it is still being fetched. */
		objectData: {
			type: Object,
			default: null,
		},

		/** The resolved object-type slug. */
		objectType: {
			type: String,
			default: '',
		},

		/** The resolved JSON Schema object, needed by a `data` child. */
		schemaObject: {
			type: Object,
			default: null,
		},

		/** OpenRegister register slug of the surface. */
		register: {
			type: [String, Object],
			default: '',
		},

		/** OpenRegister schema slug of the surface. */
		schema: {
			type: [String, Object],
			default: '',
		},

		/** The effective object store. */
		store: {
			type: Object,
			default: null,
		},

		/** Rendering surface forwarded to the children. */
		surface: {
			type: String,
			default: 'detail-page',
		},

		/** Object context forwarded to integration children. */
		integrationContext: {
			type: Object,
			default: null,
		},

		/** The consumer's component registry, for custom child widget types. */
		cnRegistry: {
			type: Object,
			default: () => ({}),
		},
	},

	data() {
		instanceCounter += 1
		return {
			uid: instanceCounter,
			/**
			 * Section key to "has this section rendered anything".
			 *
			 * @type {Record<string, boolean>}
			 */
			filled: {},
		}
	},

	computed: {
		/**
		 * The section headings' tag (utils/headingLevel.js).
		 *
		 * @return {string}
		 */
		sectionHeadingTag() {
			return normalizeLook(this.cnLook) === 'board' ? headingTag(this.cnHeadingLevel) : 'h3'
		},

		/**
		 * Whether each section is its own card.
		 *
		 * @return {boolean}
		 */
		cards() {
			return this.content?.cards === true
		},

		/**
		 * Whether the sections stack with no rule between them.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-sections-can-stack-without-dividers
		 */
		plain() {
			return !this.cards && this.content?.dividers === false
		},

		/**
		 * Whether an empty section hides.
		 *
		 * @return {boolean}
		 */
		hideEmpty() {
			return this.content?.hideEmpty !== false
		},

		/**
		 * The sections to render: a stable key, a translated title, the column
		 * and the widget definition. A section whose widget cannot be found is
		 * dropped (with a development warning for an unknown id).
		 *
		 * @return {Array<{key: string, title: string, description: string, column: string, widget: object}>}
		 * @spec openspec/changes/abstract-sections-widget/specs/sections-widget/spec.md#requirement-a-sections-widget-stacks-configured-widgets-under-headings
		 */
		sections() {
			const raw = Array.isArray(this.content?.sections) ? this.content.sections : []
			const out = []
			raw.forEach((entry, index) => {
				if (!entry || typeof entry !== 'object') {
					return
				}
				let widget = entry.widget && typeof entry.widget === 'object' ? entry.widget : null
				if (!widget && typeof entry.widgetId === 'string' && entry.widgetId !== '') {
					widget = this.availableWidgets.find((w) => w && w.id === entry.widgetId) || null
					if (!widget) {
						// eslint-disable-next-line no-console
						console.warn(`[CnSectionsWidget] section widgetId "${entry.widgetId}" names no widget on this surface; section skipped.`)
					}
				}
				if (!widget || !widget.type) {
					return
				}
				out.push({
					key: String(entry.key || widget.id || entry.widgetId || `${widget.type}-${index}`),
					title: this.tr(entry.title || entry.label || ''),
					description: this.tr(entry.description || ''),
					column: entry.column === 'side' ? 'side' : 'main',
					widget: this.shared(widget),
				})
			})
			return out
		},

		/**
		 * Whether any section sits in the side column.
		 *
		 * @return {boolean}
		 */
		twoColumn() {
			return this.sections.some((section) => section.column === 'side')
		},

		/**
		 * How many columns the sections are laid out in side by side: the
		 * configured `columns`, capped at four; 1 (stacked) without it or
		 * when a section asks for the side column.
		 *
		 * @return {number}
		 * @spec openspec/changes/sections-card-grid/specs/sections-card-grid/spec.md#requirement-a-sections-widget-can-lay-its-cards-out-in-columns
		 */
		gridColumns() {
			const n = Math.floor(Number(this.content?.columns))
			if (!Number.isFinite(n) || n < 2 || this.twoColumn) {
				return 1
			}
			return Math.min(n, 4)
		},

		/**
		 * The translated footnote under the sections, or ''.
		 *
		 * @return {string}
		 * @spec openspec/changes/sections-card-grid/specs/sections-card-grid/spec.md#requirement-a-sections-widget-can-close-with-a-footnote
		 */
		footnote() {
			return this.tr(this.content?.footnote || '')
		},

		/**
		 * The columns to draw, each with its sections in order.
		 *
		 * @return {Array<{id: string, sections: Array<object>}>}
		 * @spec openspec/changes/abstract-sections-widget/specs/sections-widget/spec.md#requirement-a-sections-widget-can-draw-cards-in-a-main-and-a-side-column
		 */
		columns() {
			if (!this.twoColumn) {
				return [{ id: 'main', sections: this.sections }]
			}
			return [
				{ id: 'main', sections: this.sections.filter((section) => section.column === 'main') },
				{ id: 'side', sections: this.sections.filter((section) => section.column === 'side') },
			]
		},
	},

	beforeUnmount() {
		this.stopObserving()
	},

	methods: {
		/**
		 * Translate through the host app.
		 *
		 * @param {string} text The text.
		 * @return {string}
		 */
		tr(text) {
			if (typeof text !== 'string' || text === '') {
				return ''
			}
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/**
		 * The heading id of a section.
		 *
		 * @param {string} key The section key.
		 * @return {string}
		 */
		headingId(key) {
			return `cn-sections-${this.uid}-${key}`.replace(/[^\w-]/g, '-')
		},

		/**
		 * A child definition with the cell budget off: stacked children share
		 * one cell, so an object list must not size itself to that cell.
		 *
		 * @param {object} widget The definition.
		 * @return {object}
		 */
		shared(widget) {
			const content = widget.content || {}
			if (Object.hasOwn(content, 'fit')) {
				return widget
			}
			return { ...widget, content: { ...content, fit: false } }
		},

		/**
		 * Whether a section shows its heading and takes space.
		 *
		 * @param {string} key The section key.
		 * @return {boolean}
		 * @spec openspec/changes/abstract-sections-widget/specs/sections-widget/spec.md#requirement-a-section-whose-widget-draws-nothing-stays-silent
		 */
		isShown(key) {
			return !this.hideEmpty || this.filled[key] === true
		},

		/**
		 * Watch one section's host for content, so its heading appears when
		 * the widget renders and stays away when it never does. A
		 * MutationObserver, because most widgets mount empty and fill after a
		 * fetch.
		 *
		 * @param {string} key The section key.
		 * @param {HTMLElement|null} el The host wrapper, or null on teardown.
		 * @return {void}
		 */
		setHostRef(key, el) {
			this.observers = this.observers || {}
			if (this.observers[key]) {
				this.observers[key].disconnect()
				delete this.observers[key]
			}
			if (!el) {
				return
			}
			// Assign only on a change: `filled` drives the template, so an
			// unconditional write re-renders, mutates, and fires again.
			const measure = () => {
				const next = this.hasContent(el)
				if (this.filled[key] === next) {
					return
				}
				this.filled = { ...this.filled, [key]: next }
			}
			if (typeof MutationObserver === 'function') {
				const observer = new MutationObserver(measure)
				observer.observe(el, { childList: true, subtree: true, characterData: true })
				this.observers[key] = observer
			}
			// Not synchronously: a ref callback runs during the patch.
			this.$nextTick(measure)
		},

		/**
		 * Whether a host rendered anything a reader would see: text (an empty
		 * state counts), or a graphical or interactive element.
		 *
		 * @param {HTMLElement} el The host wrapper.
		 * @return {boolean}
		 */
		hasContent(el) {
			if (!el) {
				return false
			}
			if (el.textContent && el.textContent.trim().length > 0) {
				return true
			}
			return el.querySelector('img, svg, canvas, table, input, button, select, textarea') !== null
		},

		/**
		 * Drop every observer.
		 *
		 * @return {void}
		 */
		stopObserving() {
			for (const observer of Object.values(this.observers || {})) {
				observer.disconnect()
			}
			this.observers = {}
		},
	},
}
</script>

<style scoped>
.cn-sections-widget {
	min-width: 0;
}

.cn-sections-widget__column {
	display: flex;
	flex-direction: column;
	gap: calc(var(--default-grid-baseline, 4px) * 4);
	min-width: 0;
}

/* A main and a side column (the settings boards: 1fr and 418px, 20px apart). */
.cn-sections-widget--two-column {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(280px, 418px);
	gap: 20px;
	align-items: start;
}

@media (max-width: 1024px) {
	.cn-sections-widget--two-column {
		grid-template-columns: minmax(0, 1fr);
	}
}

/* Sections side by side (`columns`): at most that many to a row, each at
   least 240px wide, so a narrow cell wraps them onto more rows. */
.cn-sections-widget.cn-sections-widget--grid .cn-sections-widget__column {
	--cn-sections-gap: 14px;
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, max(240px, calc((100% - (var(--cn-sections-columns, 2) - 1) * var(--cn-sections-gap)) / var(--cn-sections-columns, 2)))), 1fr));
	gap: var(--cn-sections-gap);
	align-items: start;
}

.cn-sections-widget__footnote {
	margin: calc(var(--default-grid-baseline, 4px) * 3) 0 0;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

/* A host page may space every <section>; these sections are spaced by the column gap only. */
.cn-sections-widget__section {
	margin: 0;
	min-width: 0;
}

/* A rule above a section that follows a shown one. */
.cn-sections-widget:not(.cn-sections-widget--cards) .cn-sections-widget__section:not(.cn-sections-widget__section--empty) ~ .cn-sections-widget__section {
	padding-top: calc(var(--default-grid-baseline, 4px) * 4);
	border-top: 1px solid var(--color-border);
}

/* No rule: strips that each say one thing, 8px apart. */
.cn-sections-widget--plain .cn-sections-widget__column {
	gap: calc(var(--default-grid-baseline, 4px) * 2);
}

.cn-sections-widget.cn-sections-widget--plain .cn-sections-widget__section:not(.cn-sections-widget__section--empty) ~ .cn-sections-widget__section {
	padding-top: 0;
	border-top: 0;
}

/*
 * An empty section keeps its host mounted (display: none still mounts it, so
 * the widget fetches and can fill later) but takes no space, gap or rule.
 */
.cn-sections-widget__section--empty {
	display: none;
}

.cn-sections-widget__heading {
	margin: 0 0 calc(var(--default-grid-baseline, 4px) * 2);
	font-size: 16px;
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-sections-widget__description {
	margin: calc(var(--default-grid-baseline, 4px) * -1) 0 calc(var(--default-grid-baseline, 4px) * 3);
	color: var(--color-text-maxcontrast);
}

/* One card per section. */
.cn-sections-widget--cards .cn-sections-widget__column {
	gap: 20px;
}

.cn-sections-widget--cards .cn-sections-widget__section {
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--cn-board-card-radius, var(--border-radius-large, 12px));
	padding: var(--cn-board-card-padding, 16px 20px);
}

.cn-sections-widget--cards .cn-sections-widget__heading {
	font-size: 18px;
	margin-bottom: 12px;
}
</style>

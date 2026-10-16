<!--
  CnReportsPage — Manifest-driven Reports surface.

  v2 manifest page primitive for `type: "reports"`. One page holding every
  report an app offers, as cards, instead of a Reports SUBMENU with one entry
  per report.

  WHY THIS IS A PAGE AND NOT A MENU BRANCH. A submenu grows one entry per
  report and never shrinks. shillinq reached 96 report types; as menu children
  that is a scroll, not a navigation. Cards carry what a menu item cannot — a
  description, a category, a count — and a category filter turns 96 into a
  short list. shillinq proved the shape in `ReportingComplianceOverview`; this
  is that shape with the app-specific parts taken out, so every app declares it
  rather than copying 600 lines of Vue.

  Declare it as:

    { "id": "Reports", "route": "/reports", "type": "reports",
      "config": {
        "categories": { "operational": "Operational" },
        "cards": [
          { "id": "Throughput", "label": "Processing time",
            "description": "How long cases take, by type.",
            "icon": "ChartLine", "category": "operational",
            "route": "Doorlooptijd" }
        ]
      } }

  A card names a ROUTE by name, never a path: a path is editable per app and a
  card pointing at a stale one is a dead end that still looks like a report.

  Spec: hydra openspec/architecture/adr-112-reports-are-one-page.md (ConductionNL/hydra#640).
-->
<template>
	<div class="cn-reports-page" :class="{ 'cn-reports-page--board': isBoard }">
		<div class="cn-reports-page__header">
			<!-- The header buttons (`headerButtons`) beside the title, as the
			     board's "Downloaden" and the buildiq square (board DcRapportages).
			     Without them, and outside the board look, the title stands alone
			     as before. -->
			<div v-if="headerButtonsRow.length > 0" class="cn-reports-page__heading-row">
				<h2 class="cn-reports-page__title">
					{{ resolvedTitle }}
				</h2>
				<div class="cn-reports-page__header-buttons" data-testid="cn-reports-header-buttons">
					<template v-for="button in headerButtonsRow" :key="button.key">
						<CnBuildiqEditButton v-if="button.action === '__buildiq'" />
						<NcButton
							v-else
							:variant="button.variant"
							:data-testid="`cn-reports-header-button-${button.key}`"
							@click="onHeaderButton(button)">
							<template v-if="button.icon" #icon>
								<CnIcon :name="button.icon" :size="20" />
							</template>
							{{ button.label }}
						</NcButton>
					</template>
				</div>
			</div>
			<h2 v-else class="cn-reports-page__title">
				{{ resolvedTitle }}
			</h2>
			<p v-if="resolvedDescription" class="cn-reports-page__description">
				{{ resolvedDescription }}
			</p>
		</div>

		<!-- The board look (board PqReports): category chips with counts, one
		     section per category under a small caption, a three-column grid of
		     cards with an Open button, a side column and a footnote. -->
		<template v-if="isBoard">
			<div v-if="categoryOptions.length > 1"
				class="cn-reports-page__chips"
				role="group"
				:aria-label="resolvedCategoryLabel"
				data-testid="cn-reports-chips">
				<button v-for="option in categoryOptions"
					:key="option.value"
					type="button"
					class="cn-reports-page__chip"
					:class="{ 'cn-reports-page__chip--active': option.value === activeCategory }"
					:aria-pressed="option.value === activeCategory ? 'true' : 'false'"
					:data-testid="`cn-reports-chip-${option.value}`"
					@click="activeCategory = option.value">
					{{ option.label }}
					<span class="cn-reports-page__chip-count">{{ option.count }}</span>
				</button>
			</div>
			<div class="cn-reports-page__body">
				<div class="cn-reports-page__main">
					<p v-if="resolvedCards.length === 0"
						class="cn-reports-page__empty"
						data-testid="cn-reports-empty">
						{{ resolvedEmptyLabel }}
					</p>
					<section v-for="section in visibleSections"
						:id="sectionId(section)"
						:key="section.key"
						class="cn-reports-page__section"
						:aria-labelledby="section.label ? `${sectionId(section)}-title` : null"
						data-testid="cn-reports-section">
						<h3 v-if="section.label" :id="`${sectionId(section)}-title`" class="cn-reports-page__section-title">
							{{ section.label }}
						</h3>
						<ul class="cn-reports-page__grid" data-testid="cn-reports-grid">
							<li v-for="card in section.cards" :key="card.id" class="cn-reports-page__cell">
								<article class="cn-reports-page__card" data-testid="cn-report-card">
									<div class="cn-reports-page__card-head">
										<span class="cn-reports-page__card-icon" aria-hidden="true">
											<CnIcon v-if="card.icon" :name="card.icon" :size="22" />
											<ChartBoxOutline v-else :size="22" />
										</span>
										<div class="cn-reports-page__card-text">
											<h4 class="cn-reports-page__card-title">
												{{ card.label }}
											</h4>
											<span v-if="categoryName(card)" class="cn-reports-page__card-category">
												{{ categoryName(card) }}
											</span>
										</div>
									</div>
									<p v-if="card.description" class="cn-reports-page__card-description">
										{{ card.description }}
									</p>
									<div class="cn-reports-page__card-footer">
										<span class="cn-reports-page__card-note">{{ cardNote(card) }}</span>
										<a class="cn-reports-page__card-open"
											data-testid="cn-report-open"
											:href="hrefFor(card)"
											:aria-label="t('nextcloud-vue', 'Open {report}', { report: card.label })"
											@click="open(card, $event)">
											{{ t('nextcloud-vue', 'Open') }}
										</a>
									</div>
								</article>
							</li>
						</ul>
					</section>
				</div>
				<aside class="cn-reports-page__aside"
					:aria-label="t('nextcloud-vue', 'About these reports')"
					data-testid="cn-reports-aside">
					<section v-if="boardSections.some((section) => section.label)" class="cn-reports-page__aside-card">
						<h3 class="cn-reports-page__aside-title">
							{{ t('nextcloud-vue', 'Categories') }}
						</h3>
						<ul class="cn-reports-page__aside-list" data-testid="cn-reports-aside-categories">
							<li v-for="section in boardSections.filter((s) => s.label)" :key="section.key">
								<a class="cn-reports-page__aside-link"
									:href="`#${sectionId(section)}`"
									@click.prevent="showSection(section)">
									<span class="cn-reports-page__aside-label">{{ section.label }}</span>
									<span class="cn-reports-page__aside-count">{{ section.cards.length }}</span>
								</a>
							</li>
						</ul>
					</section>
					<section v-if="resolvedSideNote" class="cn-reports-page__aside-card" data-testid="cn-reports-side-note">
						<h3 class="cn-reports-page__aside-title">
							{{ resolvedSideNote.title }}
						</h3>
						<p class="cn-reports-page__aside-text">
							{{ resolvedSideNote.text }}
						</p>
					</section>
				</aside>
			</div>
			<p v-if="resolvedFootnote" class="cn-reports-page__footnote" data-testid="cn-reports-footnote">
				<InformationOutline :size="16" class="cn-reports-page__footnote-icon" />
				{{ resolvedFootnote }}
			</p>
		</template>

		<div v-if="!isBoard && categoryOptions.length > 1" class="cn-reports-page__filter">
			<label class="cn-reports-page__filter-label" :for="filterId">
				{{ resolvedCategoryLabel }}
			</label>
			<select :id="filterId"
				v-model="activeCategory"
				class="cn-reports-page__filter-select"
				data-testid="cn-reports-category">
				<option v-for="option in categoryOptions"
					:key="option.value"
					:value="option.value">
					{{ option.label }}
				</option>
			</select>
		</div>

		<p v-if="!isBoard && visibleCards.length === 0"
			class="cn-reports-page__empty"
			data-testid="cn-reports-empty">
			{{ resolvedEmptyLabel }}
		</p>

		<ul v-else-if="!isBoard" class="cn-reports-page__grid" data-testid="cn-reports-grid">
			<li v-for="card in visibleCards" :key="card.id" class="cn-reports-page__cell">
				<a class="cn-reports-page__card"
					data-testid="cn-report-card"
					:href="hrefFor(card)"
					@click="open(card, $event)">
					<span class="cn-reports-page__card-title">{{ card.label }}</span>
					<span v-if="card.description" class="cn-reports-page__card-description">
						{{ card.description }}
					</span>
					<span v-if="categoryName(card)" class="cn-reports-page__card-category">
						{{ categoryName(card) }}
					</span>
				</a>
			</li>
		</ul>

		<!-- `widgets` + `layout`: a grid of dashboard widgets under the cards,
		     such as a highlighted report with stat tiles and a chart. -->
		<div v-if="sectionWidgets.length > 0" class="cn-reports-page__widgets" data-testid="cn-reports-widgets">
			<CnDashboardPage
				:widgets="sectionWidgets"
				:layout="sectionLayout"
				:showHeader="false" />
		</div>
	</div>
</template>

<script>
/**
 * The Reports page: one surface listing an app's reports as cards.
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import { defineAsyncComponent } from 'vue'
import ChartBoxOutline from 'vue-material-design-icons/ChartBoxOutline.vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import CnBuildiqEditButton from '../CnBuildiqEditButton/CnBuildiqEditButton.vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import { useLook } from '../../composables/useLook.js'
import { resolveRegisteredHandler } from '../../utils/actionsDispatcher.js'
import { followLinkClick } from '../../utils/linkNavigation.js'

export default {
	name: 'CnReportsPage',

	components: {
		// Loaded only for a page that declares widgets: a cards-only reports
		// page does not pull the dashboard in.
		CnDashboardPage: defineAsyncComponent(() => import('../CnDashboardPage/CnDashboardPage.vue').then((m) => m.default)),
		ChartBoxOutline,
		CnBuildiqEditButton,
		CnIcon,
		InformationOutline,
		NcButton,
	},

	inject: {
		/**
		 * The v2 registry and the legacy customComponents map, provided by
		 * CnAppRoot: a header action's named handler resolves against them.
		 */
		cnRegistry: { default: () => ({}) },
		cnCustomComponents: { default: () => ({}) },
		/**
		 * The consuming app's translate function, provided by CnAppRoot.
		 * Defaults to identity so the page still renders outside one.
		 */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The manifest page.
		 *
		 * ⚠️ CnPageRenderer does NOT pass this. `resolvedProps()` returns
		 * `{ ...topLevel, ...normalizedConfig, ...params }` and has no `page`
		 * key, so a dispatched `type: "reports"` page arrived here with the
		 * default `{}` — `config` resolved to `{}`, `cards` to `[]`, and every
		 * reports page in the fleet rendered its empty state while its manifest
		 * declared cards. Kept because a host that renders this component
		 * directly can still hand it the whole page; the flattened props below
		 * are what the renderer actually supplies, and they win.
		 */
		page: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * The report cards, as CnPageRenderer flattens them out of `config`.
		 *
		 * @type {Array<object>|null}
		 */
		cards: {
			type: Array,
			default: null,
		},

		/**
		 * Category key/label pairs, flattened out of `config`.
		 *
		 * @type {object|null}
		 */
		categories: {
			type: Object,
			default: null,
		},

		/**
		 * The lead paragraph, flattened out of `config` or lifted from the page.
		 *
		 * @type {string|null}
		 */
		description: {
			type: String,
			default: null,
		},

		/**
		 * The heading, lifted from the page by the renderer.
		 *
		 * @type {string|null}
		 */
		title: {
			type: String,
			default: null,
		},

		/**
		 * Label for the "all categories" filter option.
		 *
		 * @type {string|null}
		 */
		allCategoriesLabel: {
			type: String,
			default: null,
		},

		/**
		 * Label for the category filter control.
		 *
		 * @type {string|null}
		 */
		categoryLabel: {
			type: String,
			default: null,
		},

		/**
		 * Text shown when the active filter admits no card.
		 *
		 * @type {string|null}
		 */
		emptyLabel: {
			type: String,
			default: null,
		},

		/**
		 * Dashboard widgets drawn under the report cards (`config.widgets`),
		 * placed by `layout`, as on a `type: "dashboard"` page.
		 *
		 * @type {Array<object>|null}
		 */
		widgets: {
			type: Array,
			default: null,
		},

		/**
		 * Grid placement of `widgets` (`config.layout`): `{ id, widgetId,
		 * gridX, gridY, gridWidth, gridHeight }` per widget. Without it each
		 * widget takes a full row in the order declared.
		 *
		 * @type {Array<object>|null}
		 */
		layout: {
			type: Array,
			default: null,
		},

		/**
		 * Buttons beside the title (`config.headerButtons`), as the board's
		 * "Downloaden". Each is `{ label, action, variant?, icon?, id? }`:
		 * `action` is the id of a `headerActions` entry, which says what the
		 * click does. Under the board look the buildiq square sits between the
		 * secondary buttons and the primary one. Empty (the default) changes
		 * nothing.
		 *
		 * @spec openspec/changes/screens-reports-header-buttons/specs/reports-page/spec.md#requirement-a-reports-page-carries-header-buttons
		 * @type {Array<{label: string, action: string, variant?: ('primary'|'secondary'), icon?: string, id?: string}>|null}
		 */
		headerButtons: {
			type: Array,
			default: null,
		},

		/**
		 * The page's header actions (`config.headerActions`), in the shape of
		 * an index page's: a header button names one by id. `handler` is a
		 * function, `navigate` (with `route`, and `params`), `emit`, `none`,
		 * or a registry name; `type: "navigate"` with a `target` URL opens
		 * that URL in a new tab. Every click also emits `header-action`
		 * `{ action, id }`, except for `handler: "none"`.
		 *
		 * @spec openspec/changes/screens-reports-header-buttons/specs/reports-page/spec.md#requirement-a-reports-page-carries-header-buttons
		 * @type {Array<object>|null}
		 */
		headerActions: {
			type: Array,
			default: null,
		},

		/**
		 * A line under the page (`config.footnote`), drawn under the board
		 * look with an info icon. Empty (the default) draws none.
		 *
		 * @spec openspec/changes/screens-reports-page-pq-board/specs/reports-page/spec.md#requirement-the-reports-page-draws-board-pqreports
		 * @type {string|null}
		 */
		footnote: {
			type: String,
			default: null,
		},

		/**
		 * The note card in the side column under the board look
		 * (`config.sideNote`): `{ title, text }`. Absent: the library's own
		 * note on asking for a missing report. `false` draws no note card.
		 *
		 * @spec openspec/changes/screens-reports-page-pq-board/specs/reports-page/spec.md#requirement-the-reports-page-draws-board-pqreports
		 * @type {{title?: string, text?: string}|boolean|null}
		 */
		sideNote: {
			type: [Object, Boolean],
			default: null,
		},

		/**
		 * The look to draw in: `board` or `nextcloud`. Absent: the look
		 * CnAppRoot provides (`cnLook`), else `nextcloud`.
		 *
		 * @type {string|null}
		 */
		look: {
			type: String,
			default: null,
		},

		/**
		 * Translate function. Falls back to injected `cnTranslate`.
		 *
		 * @type {((key: string) => string)|null}
		 */
		translate: {
			type: Function,
			default: null,
		},
	},

	emits: ['header-action'],

	setup(props) {
		const { isBoard } = useLook(props)
		return { isBoard }
	},

	data() {
		return {
			activeCategory: 'all',
		}
	},

	computed: {
		/**
		 * The translate function actually in force.
		 *
		 * @return {(key: string) => string} The translator.
		 */
		effectiveTranslate() {
			return this.translate ?? this.cnTranslate
		},

		/**
		 * The declared config, always an object, from whichever direction it
		 * arrived.
		 *
		 * TWO CALLERS, TWO SHAPES. CnPageRenderer flattens `page.config.*` into
		 * individual props and passes NO `page`, so under the renderer the keys
		 * arrive as props. A host that mounts this component itself hands it the
		 * whole `page`. Reading only `page.config` is what made every dispatched
		 * reports page render empty.
		 *
		 * Props win where both are present: they are the nearer declaration, and
		 * the renderer has already resolved route sentinels in them.
		 *
		 * @return {object} The config.
		 */
		config() {
			const fromPage = (this.page && this.page.config) || {}
			const fromProps = {}
			for (const key of [
				'cards',
				'categories',
				'description',
				'title',
				'allCategoriesLabel',
				'categoryLabel',
				'emptyLabel',
				'widgets',
				'layout',
				'headerButtons',
				'headerActions',
				'footnote',
				'sideNote',
			]) {
				if (this[key] !== null && this[key] !== undefined) {
					fromProps[key] = this[key]
				}
			}

			return { ...fromPage, ...fromProps }
		},

		/**
		 * The widgets under the cards.
		 *
		 * @return {Array<object>} The declared widgets, or none.
		 * @spec openspec/changes/screens-reports-page-widgets/specs/reports-page/spec.md
		 */
		sectionWidgets() {
			const widgets = this.config.widgets
			return Array.isArray(widgets) ? widgets.filter((w) => w && typeof w === 'object' && w.id) : []
		},

		/**
		 * Where the widgets go: the declared `layout`, else one full row per
		 * widget in the order declared.
		 *
		 * @return {Array<object>} The placements.
		 * @spec openspec/changes/screens-reports-page-widgets/specs/reports-page/spec.md
		 */
		sectionLayout() {
			if (Array.isArray(this.config.layout) && this.config.layout.length > 0) {
				return this.config.layout
			}
			let y = 0
			return this.sectionWidgets.map((widget, index) => {
				const placement = { id: String(index + 1), widgetId: widget.id, gridX: 0, gridY: y, gridWidth: 12, gridHeight: 4 }
				y += 4
				return placement
			})
		},

		/**
		 * The declared header buttons that have a label and an action,
		 * translated, each with a stable key and a variant.
		 *
		 * @spec openspec/changes/screens-reports-header-buttons/specs/reports-page/spec.md#requirement-a-reports-page-carries-header-buttons
		 * @return {Array<{key: string, label: string, action: string, variant: string, icon: string}>} The buttons.
		 */
		resolvedHeaderButtons() {
			const declared = Array.isArray(this.config.headerButtons) ? this.config.headerButtons : []
			return declared
				.filter((button) => button && typeof button === 'object'
					&& typeof button.action === 'string' && button.action !== ''
					&& typeof button.label === 'string' && button.label !== '')
				.map((button) => ({
					key: String(button.id || button.action),
					label: this.tr(button.label),
					action: button.action,
					variant: button.variant === 'primary' ? 'primary' : 'secondary',
					icon: typeof button.icon === 'string' ? button.icon : '',
				}))
		},

		/**
		 * The header row in the order it renders. Without the board look:
		 * the declared buttons in the declared order. Under the board look:
		 * the secondary buttons, the buildiq square, then the primary ones,
		 * as the board draws "Downloaden" and the square. No declared button
		 * leaves the header as it was, without the square.
		 *
		 * @spec openspec/changes/screens-reports-header-buttons/specs/reports-page/spec.md#requirement-a-reports-page-carries-header-buttons
		 * @return {Array<object>} The buttons; the square is `{ key: '__buildiq', action: '__buildiq' }`.
		 */
		headerButtonsRow() {
			const buttons = this.resolvedHeaderButtons
			if (buttons.length === 0 || !this.isBoard) {
				return buttons
			}
			const square = { key: '__buildiq', action: '__buildiq', variant: 'secondary', label: '', icon: '' }
			return [
				...buttons.filter((button) => button.variant !== 'primary'),
				square,
				...buttons.filter((button) => button.variant === 'primary'),
			]
		},

		/**
		 * The heading.
		 *
		 * @return {string} The title.
		 */
		resolvedTitle() {
			const declared = this.config.title || (this.page && this.page.title)

			return declared ? this.tr(declared) : t('nextcloud-vue', 'Reports')
		},

		/**
		 * The optional lead paragraph.
		 *
		 * @return {string} The description.
		 */
		resolvedDescription() {
			return this.tr(this.config.description || '')
		},

		/**
		 * The declared cards, ignoring any that name no route.
		 *
		 * A card with no route is a card that cannot be opened. Rendering it
		 * would put a report on the page that silently does nothing, which is
		 * worse than leaving it off.
		 *
		 * @return {Array<object>} The usable cards.
		 */
		resolvedCards() {
			const declared = this.config.cards
			if (!Array.isArray(declared)) {
				return []
			}

			return declared
				.filter((card) => card && card.route && card.label)
				.map((card) => ({
					...card,
					label: this.tr(card.label),
					description: this.tr(card.description || ''),
				}))
		},

		/**
		 * Category value/label pairs, offered only for categories that hold a
		 * card. A filter listing empty categories teaches the reader that the
		 * app has reports it does not have.
		 *
		 * @return {Array<object>} The options.
		 */
		categoryOptions() {
			const declared = this.config.categories || {}
			const counts = {}
			this.resolvedCards.forEach((card) => {
				if (card.category) {
					counts[card.category] = (counts[card.category] || 0) + 1
				}
			})
			const options = [{ value: 'all', label: this.allLabel, count: this.resolvedCards.length }]

			Object.keys(declared)
				.filter((key) => counts[key] > 0)
				.forEach((key) => options.push({ value: key, label: this.tr(declared[key]), count: counts[key] }))

			return options
		},

		/**
		 * The board look's sections: the cards without a category first, under
		 * no heading, then one section per declared category that holds a
		 * card, in the declared order, headed by its label.
		 *
		 * @spec openspec/changes/screens-reports-page-board-look/specs/reports-page/spec.md#requirement-the-reports-page-takes-the-board-look
		 * @return {Array<{key: string, label: string, cards: Array<object>}>} The sections.
		 */
		boardSections() {
			const declared = this.config.categories || {}
			const sections = []
			const loose = this.resolvedCards.filter((card) => !card.category || !Object.hasOwn(declared, card.category))
			if (loose.length > 0) {
				sections.push({ key: '__none', label: '', cards: loose })
			}
			for (const key of Object.keys(declared)) {
				const cards = this.resolvedCards.filter((card) => card.category === key)
				if (cards.length > 0) {
					sections.push({ key, label: this.tr(declared[key]), cards })
				}
			}
			return sections
		},

		/**
		 * The board look's sections the active category chip admits.
		 *
		 * @spec openspec/changes/screens-reports-page-pq-board/specs/reports-page/spec.md#requirement-the-reports-page-draws-board-pqreports
		 * @return {Array<{key: string, label: string, cards: Array<object>}>} The sections.
		 */
		visibleSections() {
			if (this.activeCategory === 'all') {
				return this.boardSections
			}

			return this.boardSections.filter((section) => section.key === this.activeCategory)
		},

		/**
		 * The side column's note card: the declared one, the library's own
		 * when none is declared, or null when `sideNote` is `false`.
		 *
		 * @spec openspec/changes/screens-reports-page-pq-board/specs/reports-page/spec.md#requirement-the-reports-page-draws-board-pqreports
		 * @return {{title: string, text: string}|null} The note.
		 */
		resolvedSideNote() {
			const declared = this.config.sideNote
			if (declared === false) {
				return null
			}
			const note = (declared && typeof declared === 'object') ? declared : {}
			return {
				title: note.title ? this.tr(note.title) : t('nextcloud-vue', 'Missing a report?'),
				text: note.text ? this.tr(note.text) : t('nextcloud-vue', 'Ask an administrator to add a report to the app.'),
			}
		},

		/**
		 * The footnote under the page, translated, or ''.
		 *
		 * @spec openspec/changes/screens-reports-page-pq-board/specs/reports-page/spec.md#requirement-the-reports-page-draws-board-pqreports
		 * @return {string} The footnote.
		 */
		resolvedFootnote() {
			return typeof this.config.footnote === 'string' ? this.tr(this.config.footnote) : ''
		},

		/**
		 * The cards the active filter admits.
		 *
		 * @return {Array<object>} The visible cards.
		 */
		visibleCards() {
			if (this.activeCategory === 'all') {
				return this.resolvedCards
			}

			return this.resolvedCards.filter((card) => card.category === this.activeCategory)
		},

		/**
		 * A stable id for the filter control's label association.
		 *
		 * @return {string} The id.
		 */
		filterId() {
			return `cn-reports-category-${(this.page && this.page.id) || 'page'}`
		},

		/**
		 * @return {string} The "all categories" option label.
		 */
		allLabel() {
			return this.config.allCategoriesLabel
				? this.tr(this.config.allCategoriesLabel)
				: t('nextcloud-vue', 'All categories')
		},

		/**
		 * @return {string} The filter's label.
		 */
		resolvedCategoryLabel() {
			return this.config.categoryLabel
				? this.tr(this.config.categoryLabel)
				: t('nextcloud-vue', 'Category')
		},

		/**
		 * @return {string} The empty-state text.
		 */
		resolvedEmptyLabel() {
			return this.config.emptyLabel
				? this.tr(this.config.emptyLabel)
				: t('nextcloud-vue', 'No reports in this category.')
		},
	},

	methods: {
		t,

		/**
		 * The line in a board card's footer: the card's own `note`, else
		 * that it opens a page of its own.
		 *
		 * @spec openspec/changes/screens-reports-page-pq-board/specs/reports-page/spec.md#requirement-the-reports-page-draws-board-pqreports
		 * @param {object} card The card.
		 * @return {string} The note.
		 */
		cardNote(card) {
			return typeof card.note === 'string' && card.note !== ''
				? this.tr(card.note)
				: t('nextcloud-vue', 'Opens its own page')
		},

		/**
		 * The element id of a board section, which the side column links to.
		 *
		 * @param {{key: string}} section The section.
		 * @return {string} The id.
		 */
		sectionId(section) {
			const page = String((this.page && this.page.id) || 'page').replace(/[^\w-]/g, '-')
			return `cn-reports-${page}-${String(section.key).replace(/[^\w-]/g, '-')}`
		},

		/**
		 * A category in the side column was chosen: select its chip and
		 * scroll its section into view.
		 *
		 * @spec openspec/changes/screens-reports-page-pq-board/specs/reports-page/spec.md#requirement-the-reports-page-draws-board-pqreports
		 * @param {{key: string}} section The section.
		 * @return {void}
		 */
		showSection(section) {
			this.activeCategory = section.key
			this.$nextTick(() => {
				const el = this.$el && typeof this.$el.querySelector === 'function'
					? this.$el.querySelector(`#${this.sectionId(section)}`)
					: null
				if (el && typeof el.scrollIntoView === 'function') {
					el.scrollIntoView({ block: 'start' })
				}
			})
		},

		/**
		 * Translate a manifest-declared string through the app's own
		 * translate function.
		 *
		 * The manifest is data the renderer walks, not source the extractor
		 * reads, so every string it carries has to be handed to the app's
		 * translator explicitly. A card rendered straight from the manifest
		 * shows its source language whatever locale the reader is in.
		 *
		 * @param {string} value The declared string.
		 * @return {string} The translated string, or the input unchanged.
		 */
		tr(value) {
			if (typeof value !== 'string' || value === '') {
				return value
			}

			return this.effectiveTranslate(value)
		},

		/**
		 * The human label for a card's category, if it has one.
		 *
		 * @param {object} card The card.
		 * @return {string} The label, or an empty string.
		 */
		categoryName(card) {
			const declared = this.config.categories || {}

			return this.tr((card.category && declared[card.category]) || '')
		},

		/**
		 * A real href for the card, so it is a link a reader can middle-click
		 * or open in a new tab rather than a div that only answers to a click.
		 *
		 * @param {object} card The card.
		 * @return {string} The href.
		 */
		hrefFor(card) {
			if (!this.$router) {
				return '#'
			}

			try {
				return this.$router.resolve({ name: card.route }).href
			} catch {
				return '#'
			}
		},

		/**
		 * A header button was clicked: run the `headerActions` entry it names
		 * and emit `header-action`, as an index page's header button does.
		 *
		 * @spec openspec/changes/screens-reports-header-buttons/specs/reports-page/spec.md#requirement-a-reports-page-carries-header-buttons
		 * @param {{action: string}} button The resolved button.
		 * @return {void}
		 */
		onHeaderButton(button) {
			const id = button.action
			const actions = Array.isArray(this.config.headerActions) ? this.config.headerActions : []
			const entry = actions.find((action) => action && action.id === id) || null
			const handler = entry ? entry.handler : undefined
			if (handler === 'none') {
				return
			}
			if (typeof handler === 'function') {
				handler({ actionId: id })
			} else if (handler === 'navigate' && entry.route) {
				const params = (entry.params && typeof entry.params === 'object') ? entry.params : null
				if (this.$router && typeof this.$router.push === 'function') {
					this.$router.push(params ? { name: entry.route, params } : { name: entry.route })
				}
			} else if (entry && entry.type === 'navigate' && typeof entry.target === 'string' && entry.target !== '') {
				window.open(entry.target, '_blank', 'noopener,noreferrer')
			} else if (typeof handler === 'string' && handler !== 'emit') {
				const resolved = resolveRegisteredHandler(handler, this.cnRegistry, this.cnCustomComponents)
				if (typeof resolved === 'function') {
					resolved({ actionId: id })
				}
			}
			/**
			 * A header button was clicked (`headerButtons`), after its
			 * `headerActions` entry ran; not for `handler: "none"`.
			 *
			 * @event header-action
			 * @property {{action: string, id: string}} payload The id of the `headerActions` entry the button names, as `action` and `id`.
			 */
			this.$emit('header-action', { action: id, id })
		},

		/**
		 * Navigate by route NAME on a plain click; a modified or middle click
		 * is left to the browser so it can open the card's href elsewhere.
		 *
		 * @param {object} card The card.
		 * @param {MouseEvent} event The click.
		 * @return {void}
		 */
		open(card, event) {
			followLinkClick(event, { name: card.route }, this.$router)
		},
	},
}
</script>

<style scoped>
.cn-reports-page {
	padding: 16px;
}

/* Clear the Nextcloud navigation toggle button (44px wide, absolutely
   positioned at the left edge of .app-content) plus 12px breathing room, as
   CnPageHeader does. Only the header shifts; the body keeps the full width. */
.cn-reports-page__header {
	padding-inline-start: 56px;
}

.cn-reports-page__title {
	margin: 0 0 4px;
}

.cn-reports-page__heading-row {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px 24px;
}

.cn-reports-page__heading-row .cn-reports-page__title {
	flex: 1 1 320px;
	min-width: 0;
}

.cn-reports-page__header-buttons {
	display: flex;
	flex: none;
	flex-wrap: wrap;
	align-items: center;
	gap: 10px;
}

.cn-reports-page__description {
	margin: 0 0 16px;
	color: var(--color-text-maxcontrast);
}

.cn-reports-page__filter {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 16px;
}

.cn-reports-page__filter-select {
	min-width: 220px;
}

.cn-reports-page__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	gap: 12px;
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-reports-page__card {
	display: flex;
	flex-direction: column;
	gap: 4px;
	height: 100%;
	padding: 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	color: inherit;
	text-decoration: none;
}

.cn-reports-page__card:hover,
.cn-reports-page__card:focus {
	background-color: var(--color-background-hover);
}

.cn-reports-page__card-title {
	font-weight: bold;
}

.cn-reports-page__card-description,
.cn-reports-page__card-category {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}

.cn-reports-page__empty {
	color: var(--color-text-maxcontrast);
}

.cn-reports-page__widgets {
	margin-top: 20px;
}
</style>

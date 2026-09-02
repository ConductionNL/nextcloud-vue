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
	<div class="cn-reports-page">
		<div class="cn-reports-page__header">
			<h2 class="cn-reports-page__title">
				{{ resolvedTitle }}
			</h2>
			<p v-if="resolvedDescription" class="cn-reports-page__description">
				{{ resolvedDescription }}
			</p>
		</div>

		<div v-if="categoryOptions.length > 1" class="cn-reports-page__filter">
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

		<p v-if="visibleCards.length === 0"
			class="cn-reports-page__empty"
			data-testid="cn-reports-empty">
			{{ resolvedEmptyLabel }}
		</p>

		<ul v-else class="cn-reports-page__grid" data-testid="cn-reports-grid">
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
	</div>
</template>

<script>
/**
 * The Reports page: one surface listing an app's reports as cards.
 */
import { translate as t } from '@nextcloud/l10n'

export default {
	name: 'CnReportsPage',

	inject: {
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
		 * Translate function. Falls back to injected `cnTranslate`.
		 *
		 * @type {((key: string) => string)|null}
		 */
		translate: {
			type: Function,
			default: null,
		},
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
			]) {
				if (this[key] !== null && this[key] !== undefined) {
					fromProps[key] = this[key]
				}
			}

			return { ...fromPage, ...fromProps }
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
			const used = new Set(this.resolvedCards.map((card) => card.category).filter(Boolean))
			const options = [{ value: 'all', label: this.allLabel }]

			Object.keys(declared)
				.filter((key) => used.has(key))
				.forEach((key) => options.push({ value: key, label: this.tr(declared[key]) }))

			return options
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
			} catch (e) {
				return '#'
			}
		},

		/**
		 * Navigate by route NAME.
		 *
		 * @param {object} card The card.
		 * @param {Event} event The click.
		 * @return {void}
		 */
		open(card, event) {
			if (!this.$router) {
				return
			}

			event.preventDefault()
			this.$router.push({ name: card.route })
		},
	},
}
</script>

<style scoped>
.cn-reports-page {
	padding: 16px;
}

.cn-reports-page__title {
	margin: 0 0 4px;
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
</style>

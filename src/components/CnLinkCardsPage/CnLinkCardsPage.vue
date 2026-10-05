<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-link-cards-page" data-testid="cn-link-cards-page">
		<div class="cn-link-cards-page__header">
			<h2 v-if="resolvedTitle" class="cn-link-cards-page__title">
				{{ resolvedTitle }}
			</h2>
			<p v-if="resolvedDescription" class="cn-link-cards-page__description">
				{{ resolvedDescription }}
			</p>
		</div>

		<p
			v-if="groups.length === 0"
			class="cn-link-cards-page__empty"
			data-testid="cn-link-cards-empty">
			{{ resolvedEmptyLabel }}
		</p>

		<section
			v-for="group in groups"
			:key="group.key"
			class="cn-link-cards-page__group"
			:aria-labelledby="group.label ? group.headingId : null"
			:aria-label="group.label ? null : resolvedTitle || null"
			data-testid="cn-link-cards-group"
			:data-group="group.key">
			<h3
				v-if="group.label"
				:id="group.headingId"
				class="cn-link-cards-page__caption">
				{{ group.label }}
			</h3>
			<ul class="cn-link-cards-page__grid">
				<li v-for="card in group.cards" :key="card.id" class="cn-link-cards-page__cell">
					<!-- A real <a href>, so the card can be middle-clicked, copied
					     and announced as a link. A plain click on an in-app card
					     is routed, which keeps the page from reloading. -->
					<a
						class="cn-link-cards-page__card"
						data-testid="cn-link-card"
						:data-card-id="card.id"
						:href="card.url"
						:target="card.external ? '_blank' : null"
						:rel="card.external ? 'noopener noreferrer' : null"
						:aria-describedby="card.description ? card.descriptionId : null"
						@click="open(card, $event)">
						<CnIcon
							v-if="card.icon"
							:name="card.icon"
							:size="24"
							class="cn-link-cards-page__icon"
							aria-hidden="true" />
						<span class="cn-link-cards-page__body">
							<span class="cn-link-cards-page__label">{{ card.label }}</span>
							<span
								v-if="card.description"
								:id="card.descriptionId"
								class="cn-link-cards-page__card-description">
								{{ card.description }}
							</span>
						</span>
					</a>
				</li>
			</ul>
		</section>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { isAppInstalled } from '../../utils/appInstalled.js'
import { followLinkClick, resolveHref } from '../../utils/linkNavigation.js'
import { passesContextPredicates } from '../../utils/visibleIfContext.js'
import { CnIcon } from '../CnIcon/index.js'

let linkCardsPageUid = 0

/**
 * CnLinkCardsPage: the `type: "links"` page. Link cards, grouped under captions.
 *
 * One page that opens every page a short menu leaves out. A card has a
 * label, a one-line description, an optional icon and a target. Groups come
 * from `categories`, in the order they are declared; a card names its group
 * with `category`.
 *
 * ```json
 * { "id": "Modules", "route": "/modules", "type": "links", "title": "Modules and more",
 *   "config": {
 *     "description": "Every page that is not in the daily menu.",
 *     "categories": { "sales": "Sales", "marketing": "Marketing" },
 *     "cards": [
 *       { "id": "Leads", "label": "Leads", "description": "Every deal you are working on.",
 *         "icon": "CashMultiple", "category": "sales", "route": "Leads" }
 *     ]
 *   } }
 * ```
 *
 * Every string goes through the app's translate function. A card is hidden
 * by the same `visibleIf` and `permission` a menu entry takes, and a group
 * with no visible card is not drawn.
 */
export default {
	name: 'CnLinkCardsPage',

	components: { CnIcon },

	inject: {
		/** The app's translate function, provided by CnAppRoot. Identity outside one. */
		cnTranslate: { default: () => (key) => key },
		/** The effective manifest, for `visibleIf` predicates against `runtime`. */
		cnManifest: { default: null },
		/** The permissions the user holds. Empty means the app did not say, and allows. */
		cnPermissions: { default: () => [] },
	},

	props: {
		/** The whole manifest page, for a host that mounts this component itself. CnPageRenderer passes the flattened props below instead. */
		page: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * The cards: `{ id, label, description?, icon?, category?, route?, params?, query?, href?, visibleIf?, permission? }`.
		 * `route` is a route name, or a path when it starts with `/`.
		 *
		 * @type {Array<object>|null}
		 */
		cards: {
			type: Array,
			default: null,
		},

		/**
		 * Group key to caption. Sets the order of the groups.
		 *
		 * @type {Record<string, string>|null}
		 */
		categories: {
			type: Object,
			default: null,
		},

		/** The heading. */
		title: {
			type: String,
			default: null,
		},

		/** The lead paragraph under the heading. */
		description: {
			type: String,
			default: null,
		},

		/** Text shown when no card is visible. */
		emptyLabel: {
			type: String,
			default: null,
		},

		/**
		 * Translate function. Falls back to the injected `cnTranslate`.
		 *
		 * @type {((key: string) => string)|null}
		 */
		translate: {
			type: Function,
			default: null,
		},
	},

	data() {
		linkCardsPageUid += 1
		return {
			uid: linkCardsPageUid,
		}
	},

	computed: {
		/**
		 * The config, from the flattened props or from `page.config`. Props win.
		 *
		 * @return {object} The config.
		 * @spec openspec/changes/link-cards-page/specs/link-cards-page/spec.md#requirement-a-links-page-renders-grouped-link-cards
		 */
		config() {
			const fromPage = (this.page && this.page.config) || {}
			const fromProps = {}
			for (const key of ['cards', 'categories', 'description', 'title', 'emptyLabel']) {
				if (this[key] !== null && this[key] !== undefined) {
					fromProps[key] = this[key]
				}
			}
			return { ...fromPage, ...fromProps }
		},

		/**
		 * The heading, translated.
		 *
		 * @return {string} The title, or '' when the page declares none.
		 * @spec openspec/changes/link-cards-page/specs/link-cards-page/spec.md#requirement-a-links-page-renders-grouped-link-cards
		 */
		resolvedTitle() {
			return this.tr(this.config.title || (this.page && this.page.title) || '')
		},

		/**
		 * The lead paragraph, translated.
		 *
		 * @return {string} The description.
		 * @spec openspec/changes/link-cards-page/specs/link-cards-page/spec.md#requirement-a-links-page-renders-grouped-link-cards
		 */
		resolvedDescription() {
			return this.tr(this.config.description || '')
		},

		/**
		 * The empty-state text.
		 *
		 * @return {string} The text.
		 * @spec openspec/changes/link-cards-page/specs/link-cards-page/spec.md#requirement-a-links-page-renders-grouped-link-cards
		 */
		resolvedEmptyLabel() {
			return this.config.emptyLabel ? this.tr(this.config.emptyLabel) : t('nextcloud-vue', 'Nothing to open here.')
		},

		/**
		 * The cards a reader may see and can open, with text translated and
		 * the link resolved. A card that is gated away, or has no target that
		 * resolves, is left out: a card that does nothing is worse than none.
		 *
		 * @return {Array<object>} The cards.
		 * @spec openspec/changes/link-cards-page/specs/link-cards-page/spec.md#requirement-a-card-is-a-real-link
		 */
		visibleCards() {
			const declared = Array.isArray(this.config.cards) ? this.config.cards : []
			const runtime = this.cnManifest?.runtime ?? null
			return declared
				.filter((card) => card && card.id && card.label)
				.filter((card) => this.passesPermission(card) && this.passesVisibleIf(card, runtime))
				.map((card) => {
					const target = this.targetOf(card)
					return {
						id: String(card.id),
						label: this.tr(card.label),
						description: this.tr(card.description || ''),
						descriptionId: `cn-link-card-desc-${this.uid}-${String(card.id).replace(/[^A-Za-z0-9_-]/g, '-')}`,
						icon: card.icon || '',
						category: card.category || '',
						external: target.external,
						location: target.location,
						url: target.url,
					}
				})
				.filter((card) => card.url !== '')
		},

		/**
		 * The groups to draw: ungrouped cards first under no caption, then
		 * one group per category in declaration order. A group without a
		 * visible card is left out.
		 *
		 * @return {Array<{key: string, label: string, headingId: string, cards: Array<object>}>} The groups.
		 * @spec openspec/changes/link-cards-page/specs/link-cards-page/spec.md#requirement-a-links-page-renders-grouped-link-cards
		 */
		groups() {
			const declared = (this.config.categories && typeof this.config.categories === 'object') ? this.config.categories : {}
			const keys = Object.keys(declared)
			const loose = this.visibleCards.filter((card) => !keys.includes(card.category))
			const groups = loose.length > 0 ? [{ key: '', label: '', headingId: '', cards: loose }] : []
			keys.forEach((key, index) => {
				const cards = this.visibleCards.filter((card) => card.category === key)
				if (cards.length > 0) {
					groups.push({
						key,
						label: this.tr(declared[key]),
						headingId: `cn-link-cards-group-${this.uid}-${index}`,
						cards,
					})
				}
			})
			return groups
		},
	},

	methods: {
		/**
		 * Translate a manifest string through the app's translate function.
		 *
		 * @param {string} value The declared string.
		 * @return {string} The translation, or the input unchanged.
		 * @spec openspec/changes/link-cards-page/specs/link-cards-page/spec.md#requirement-a-links-page-renders-grouped-link-cards
		 */
		tr(value) {
			if (typeof value !== 'string' || value === '') {
				return value
			}
			return (this.translate ?? this.cnTranslate)(value)
		},

		/**
		 * Whether the user holds the card's `permission`. Same rule as the
		 * menu: no permission declared, or no permissions known, allows.
		 *
		 * @param {object} card The card.
		 * @return {boolean} True when the card may render.
		 * @spec openspec/changes/link-cards-page/specs/link-cards-page/spec.md#requirement-cards-honour-menu-visibility-conditions
		 */
		passesPermission(card) {
			const held = Array.isArray(this.cnPermissions) ? this.cnPermissions : []
			if (!card.permission || held.length === 0) {
				return true
			}
			return held.includes(card.permission)
		},

		/**
		 * Evaluate a card's `visibleIf` the way CnAppNav evaluates a menu
		 * entry's: `appInstalled` first, then dot-path predicates against
		 * the manifest's `runtime`.
		 *
		 * @param {object} card The card.
		 * @param {object|null} runtime `manifest.runtime`, or null.
		 * @return {boolean} True when the card may render.
		 * @spec openspec/changes/link-cards-page/specs/link-cards-page/spec.md#requirement-cards-honour-menu-visibility-conditions
		 */
		passesVisibleIf(card, runtime) {
			const condition = card.visibleIf
			if (!condition || typeof condition !== 'object') {
				return true
			}
			if (condition.appInstalled && !isAppInstalled(condition.appInstalled)) {
				return false
			}
			return passesContextPredicates(condition, runtime)
		},

		/**
		 * Where a card goes. An `href` is an external URL. A `route` is a
		 * route name, or a path when it starts with `/`, resolved by the
		 * router so the link carries the app's base with or without
		 * `/index.php`.
		 *
		 * @param {object} card The card.
		 * @return {{external: boolean, location: object|null, url: string}} The target; `url` is '' when it cannot be resolved.
		 * @spec openspec/changes/link-cards-page/specs/link-cards-page/spec.md#requirement-a-card-is-a-real-link
		 */
		targetOf(card) {
			if (typeof card.route === 'string' && card.route !== '') {
				const location = card.route.startsWith('/') ? { path: card.route } : { name: card.route }
				if (card.params && typeof card.params === 'object') {
					location.params = card.params
				}
				if (card.query && typeof card.query === 'object') {
					location.query = card.query
				}
				return { external: false, location, url: resolveHref(location, this.$router) }
			}
			if (typeof card.href === 'string' && card.href !== '') {
				return { external: true, location: null, url: card.href }
			}
			return { external: false, location: null, url: '' }
		},

		/**
		 * Route a plain click on an in-app card. A modified or middle click,
		 * and every click on an external card, is left to the browser.
		 *
		 * @param {object} card The resolved card.
		 * @param {MouseEvent} event The click.
		 * @return {void}
		 * @spec openspec/changes/link-cards-page/specs/link-cards-page/spec.md#requirement-a-card-is-a-real-link
		 */
		open(card, event) {
			if (card.external || !card.location) {
				return
			}
			followLinkClick(event, card.location, this.$router)
		},
	},
}
</script>

<style scoped>
.cn-link-cards-page {
	display: flex;
	flex-direction: column;
	gap: calc(6 * var(--default-grid-baseline));
	padding: calc(5 * var(--default-grid-baseline));
}

/* Clear the Nextcloud navigation toggle button (44px wide, absolutely
   positioned at the left edge of .app-content) plus 12px breathing room, as
   CnPageHeader does. Only the header shifts; the cards keep the full width. */
.cn-link-cards-page__header {
	padding-inline-start: 56px;
}

.cn-link-cards-page__title {
	margin: 0 0 var(--default-grid-baseline);
}

.cn-link-cards-page__description,
.cn-link-cards-page__empty {
	color: var(--color-text-maxcontrast);
	margin: 0;
	max-width: 70ch;
}

.cn-link-cards-page__group {
	display: flex;
	flex-direction: column;
	gap: calc(3 * var(--default-grid-baseline));
}

.cn-link-cards-page__caption {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	font-weight: 600;
	letter-spacing: 0.06em;
	margin: 0;
	text-transform: uppercase;
}

.cn-link-cards-page__grid {
	display: grid;
	gap: calc(3 * var(--default-grid-baseline));
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-link-cards-page__cell {
	display: flex;
}

.cn-link-cards-page__card {
	align-items: flex-start;
	background: var(--color-main-background);
	border: 1px solid var(--color-border-dark);
	border-radius: var(--border-radius-large);
	color: var(--color-main-text);
	display: flex;
	flex: 1;
	gap: calc(3 * var(--default-grid-baseline));
	min-width: 0;
	padding: calc(4 * var(--default-grid-baseline));
	transition: background-color var(--animation-quick, 100ms) ease, border-color var(--animation-quick, 100ms) ease, box-shadow var(--animation-quick, 100ms) ease;
}

/* A card is a link, and it must not look like a line of prose. A theme may
   underline every link with `!important` (thematiq: `a { text-decoration:
   underline !important }`, specificity 0,0,1). Among `!important` rules the
   higher specificity wins, so this class rule has to carry it too; without it
   the label and the description both rendered underlined on a live Nextcloud. */
.cn-link-cards-page__card,
.cn-link-cards-page__card:hover,
.cn-link-cards-page__card:focus,
.cn-link-cards-page__card:active {
	text-decoration: none !important;
}

/* Hover moves the whole card: border, background and a soft lift. */
.cn-link-cards-page__card:hover {
	background: var(--color-background-hover);
	border-color: var(--color-primary-element);
	box-shadow: 0 2px 6px var(--color-box-shadow);
}

@media (prefers-reduced-motion: reduce) {
	.cn-link-cards-page__card {
		transition: none;
	}
}

.cn-link-cards-page__card:focus-visible {
	border-color: var(--color-primary-element);
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-link-cards-page__icon {
	color: var(--color-primary-element);
	flex: none;
}

.cn-link-cards-page__body {
	display: flex;
	flex-direction: column;
	gap: var(--default-grid-baseline);
	min-width: 0;
}

/* The label is the card's title. Its colour is set here, on the span, because
   a theme may force its link colour on the `a` itself; an inherited link
   colour made the title read as a hyperlink. */
.cn-link-cards-page__label {
	color: var(--color-main-text);
	font-size: 1.05em;
	font-weight: 700;
	line-height: 1.3;
	overflow-wrap: anywhere;
}

.cn-link-cards-page__card-description {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	line-height: 1.4;
}
</style>

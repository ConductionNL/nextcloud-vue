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

		<section
			v-if="visibleModules.length > 0"
			class="cn-link-cards-page__modules"
			:aria-labelledby="`cn-link-cards-modules-${uid}`"
			data-testid="cn-link-cards-modules">
			<div class="cn-link-cards-page__modules-head">
				<h3 :id="`cn-link-cards-modules-${uid}`" class="cn-link-cards-page__modules-title">
					{{ resolvedModulesTitle }}
				</h3>
				<span class="cn-link-cards-page__modules-count" data-testid="cn-link-cards-modules-count">
					{{ modulesCount }}
				</span>
			</div>
			<div class="cn-link-cards-page__modules-grid">
				<CnModuleCard
					v-for="module in visibleModules"
					:key="module.id"
					:module="module"
					:headingId="`cn-link-cards-module-${uid}-${module.key}`" />
			</div>
			<p v-if="resolvedFootnote" class="cn-link-cards-page__modules-note" data-testid="cn-link-cards-modules-note">
				<InformationOutline :size="18" class="cn-link-cards-page__modules-note-icon" />
				<span>{{ resolvedFootnote }}</span>
			</p>
		</section>

		<p
			v-if="groups.length === 0 && visibleModules.length === 0"
			class="cn-link-cards-page__empty"
			data-testid="cn-link-cards-empty">
			{{ resolvedEmptyLabel }}
		</p>

		<section
			v-for="group in groups"
			:key="group.key"
			class="cn-link-cards-page__group"
			:class="{ 'cn-link-cards-page__group--list': isListStyle }"
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
			<!-- groupStyle "list": the group is one card of rows, each an icon
			     chip, the label over its description, and a trailing chevron
			     (an external-link icon for a URL). -->
			<ul v-if="isListStyle" class="cn-link-cards-page__list">
				<li v-for="card in group.cards" :key="card.id">
					<a
						class="cn-link-cards-page__row"
						data-testid="cn-link-card"
						:data-card-id="card.id"
						:href="card.url"
						:target="card.external ? '_blank' : null"
						:rel="card.external ? 'noopener noreferrer' : null"
						:aria-describedby="card.description ? card.descriptionId : null"
						@click="open(card, $event)">
						<span v-if="card.icon" class="cn-link-cards-page__row-icon" aria-hidden="true">
							<CnIcon :name="card.icon" :size="20" />
						</span>
						<span class="cn-link-cards-page__row-body">
							<span class="cn-link-cards-page__row-label">{{ card.label }}</span>
							<span
								v-if="card.description"
								:id="card.descriptionId"
								class="cn-link-cards-page__row-description">
								{{ card.description }}
							</span>
							<CnStatusBadge
								v-if="noteOf(card)"
								class="cn-link-cards-page__note"
								:label="noteOf(card).text"
								:variant="noteOf(card).variant"
								data-testid="cn-link-card-note" />
						</span>
						<OpenInNew v-if="trailingOf(card) === 'external'" :size="18" class="cn-link-cards-page__row-trailing" />
						<ChevronRight v-else :size="20" class="cn-link-cards-page__row-trailing" />
					</a>
				</li>
			</ul>
			<ul v-else class="cn-link-cards-page__grid">
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
							<CnStatusBadge
								v-if="noteOf(card)"
								class="cn-link-cards-page__note"
								:label="noteOf(card).text"
								:variant="noteOf(card).variant"
								data-testid="cn-link-card-note" />
						</span>
						<OpenInNew
							v-if="trailingOf(card) === 'external'"
							class="cn-link-cards-page__trailing"
							:size="20"
							:title="t('nextcloud-vue', 'Opens in a new tab')"
							data-testid="cn-link-card-trailing"
							data-trailing="external" />
						<ChevronRight
							v-else
							class="cn-link-cards-page__trailing"
							:size="20"
							data-testid="cn-link-card-trailing"
							data-trailing="chevron" />
					</a>
				</li>
			</ul>
		</section>

		<section
			v-if="showAdminPanel"
			class="cn-link-cards-page__admin"
			data-testid="cn-link-cards-admin"
			:aria-label="t('nextcloud-vue', 'For administrators')">
			<div v-if="resolvedAdminPanel" class="cn-link-cards-page__admin-card">
				<span class="cn-link-cards-page__admin-pill">
					<ShieldAccountOutline :size="16" />
					{{ t('nextcloud-vue', 'Administrators only') }}
				</span>
				<p v-if="resolvedAdminPanel.text" class="cn-link-cards-page__admin-text">
					{{ resolvedAdminPanel.text }}
				</p>
				<a v-if="resolvedAdminPanel.url" class="cn-link-cards-page__admin-link" :href="resolvedAdminPanel.url">
					{{ resolvedAdminPanel.linkLabel }}
				</a>
			</div>
			<component :is="adminComponent" v-if="adminComponent" />
			<!-- @slot admin More content in the panel under the cards that only administrators see. -->
			<slot name="admin" />
		</section>
	</div>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'
import ShieldAccountOutline from 'vue-material-design-icons/ShieldAccountOutline.vue'
import CnModuleCard from '../CnModuleCard/CnModuleCard.vue'
import { isAppInstalled } from '../../utils/appInstalled.js'
import { fetchListTotal } from '../../utils/fetchFilterCounts.js'
import { prefixUrl } from '../../utils/headers.js'
import { followLinkClick, resolveHref } from '../../utils/linkNavigation.js'
import { passesContextPredicates } from '../../utils/visibleIfContext.js'
import { CnIcon } from '../CnIcon/index.js'
import { CnStatusBadge } from '../CnStatusBadge/index.js'

const NOTE_VARIANTS = { neutral: 'default', success: 'success', warning: 'warning', error: 'error', info: 'primary' }

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

	components: { ChevronRight, CnIcon, CnModuleCard, CnStatusBadge, InformationOutline, OpenInNew, ShieldAccountOutline },

	inject: {
		/** The app's translate function, provided by CnAppRoot. Identity outside one. */
		cnTranslate: { default: () => (key) => key },
		/** The effective manifest, for `visibleIf` predicates against `runtime`. */
		cnManifest: { default: null },
		/** The permissions the user holds. Empty means the app did not say, and allows. */
		cnPermissions: { default: () => [] },
		/** Opens the app's user settings modal, provided by CnAppRoot. */
		cnOpenUserSettings: { default: null },
		/** The app's custom components, for `adminPanel.component`. */
		cnCustomComponents: { default: () => ({}) },
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

		/**
		 * The modules: `{ id, label, description?, icon?, enabled?, enabledIf?,
		 * route?, pages: [{ label, route, highlight? }], settings?: { label?, prefix?,
		 * route?, href?, permission?, visibleIf? }, permission?, visibleIf? }`.
		 * Drawn as module cards above the link cards.
		 *
		 * @type {Array<object>|null}
		 */
		modules: {
			type: Array,
			default: null,
		},

		/** `cards` (default): a grid of link cards per group. `list`: one card per group with a row per link. */
		groupStyle: {
			type: String,
			default: null,
		},

		/** Heading of the modules section. Defaults to "Modules". */
		modulesTitle: {
			type: String,
			default: null,
		},

		/** A note under the module cards. */
		footnote: {
			type: String,
			default: null,
		},

		/**
		 * A panel under the cards that only administrators see:
		 * `{ text?, href?, route?, linkLabel?, component? }`. `component`
		 * names a custom component drawn beside it (a form the app owns).
		 *
		 * @type {object|null}
		 * @spec openspec/changes/link-cards-notes/specs/link-cards-page/spec.md#requirement-an-admin-panel-under-the-cards
		 */
		adminPanel: {
			type: Object,
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
			// Fetched note counts, by card id and count name.
			noteCounts: {},
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
			for (const key of ['cards', 'categories', 'description', 'title', 'emptyLabel', 'modules', 'modulesTitle', 'footnote', 'groupStyle', 'adminPanel']) {
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
						action: target.action || '',
						trailing: target.external ? 'external' : 'chevron',
						note: card.note ?? null,
					}
				})
				.filter((card) => card.url !== '')
		},

		/**
		 * The modules a reader may see, with text translated and links
		 * resolved. `enabled` is the declared boolean, or the result of
		 * `enabledIf` (a visibleIf condition against `runtime`). A page that
		 * resolves to nothing is dropped; the admin-settings link only shows when
		 * its own `permission` and `visibleIf` pass.
		 *
		 * @return {Array<object>} The modules.
		 * @spec openspec/changes/screens-links-module-cards/specs/link-cards-page/spec.md#requirement-a-links-page-can-show-modules
		 */
		visibleModules() {
			const declared = Array.isArray(this.config.modules) ? this.config.modules : []
			const runtime = this.cnManifest?.runtime ?? null
			return declared
				.filter((module) => module && module.id && module.label)
				.filter((module) => this.passesPermission(module) && this.passesVisibleIf(module, runtime))
				.map((module) => {
					const pages = (Array.isArray(module.pages) ? module.pages : [])
						.filter((page) => page && page.label)
						.map((page, index) => ({ key: String(index), label: this.tr(page.label), highlight: page.highlight === true, ...this.targetOf(page) }))
						.filter((page) => page.url !== '')
					const own = this.targetOf(module)
					const open = own.url !== '' ? own : (pages[0] || null)
					const settingsDeclared = module.settings && typeof module.settings === 'object' ? module.settings : null
					const settingsTarget = settingsDeclared && this.passesPermission(settingsDeclared) && this.passesVisibleIf(settingsDeclared, runtime)
						? this.targetOf(settingsDeclared)
						: null
					return {
						id: String(module.id),
						key: String(module.id).replace(/[^A-Za-z0-9_-]/g, '-'),
						label: this.tr(module.label),
						description: this.tr(module.description || ''),
						icon: module.icon || '',
						enabled: this.moduleEnabled(module, runtime),
						pages,
						open,
						settings: settingsTarget && settingsTarget.url !== ''
							? { ...settingsTarget, label: this.tr(settingsDeclared.label || ''), prefix: this.tr(settingsDeclared.prefix || '') }
							: null,
					}
				})
		},

		/**
		 * Whether the groups are drawn as list cards (`config.groupStyle: "list"`).
		 *
		 * @return {boolean} True for list cards.
		 * @spec openspec/changes/screens-links-module-cards/specs/link-cards-page/spec.md#requirement-a-group-can-be-a-list-card
		 */
		isListStyle() {
			return this.config.groupStyle === 'list'
		},

		/**
		 * The modules heading, translated.
		 *
		 * @return {string} The heading.
		 * @spec openspec/changes/screens-links-module-cards/specs/link-cards-page/spec.md#requirement-a-links-page-can-show-modules
		 */
		resolvedModulesTitle() {
			return this.config.modulesTitle ? this.tr(this.config.modulesTitle) : t('nextcloud-vue', 'Modules')
		},

		/**
		 * "3 of 6 are in the menu".
		 *
		 * @return {string} The count.
		 * @spec openspec/changes/screens-links-module-cards/specs/link-cards-page/spec.md#requirement-a-links-page-can-show-modules
		 */
		modulesCount() {
			const on = this.visibleModules.filter((module) => module.enabled).length
			return n('nextcloud-vue', '{on} of %n is in the menu', '{on} of %n are in the menu', this.visibleModules.length, { on })
		},

		/**
		 * The note under the module cards, translated.
		 *
		 * @return {string} The note, or ''.
		 * @spec openspec/changes/screens-links-module-cards/specs/link-cards-page/spec.md#requirement-a-links-page-can-show-modules
		 */
		resolvedFootnote() {
			return this.tr(this.config.footnote || '')
		},

		/**
		 * The admin panel's text and link, resolved; null without `adminPanel`
		 * text or link.
		 *
		 * @return {{text: string, url: string, linkLabel: string}|null}
		 * @spec openspec/changes/link-cards-notes/specs/link-cards-page/spec.md#requirement-an-admin-panel-under-the-cards
		 */
		resolvedAdminPanel() {
			const panel = this.config.adminPanel
			if (!panel || typeof panel !== 'object' || (!panel.text && !panel.href && !panel.route)) {
				return null
			}
			let url = ''
			if (typeof panel.route === 'string' && panel.route !== '') {
				url = this.targetOf({ route: panel.route }).url
			} else if (typeof panel.href === 'string' && panel.href !== '') {
				url = panel.href.startsWith('/') && !panel.href.startsWith('//') ? prefixUrl(panel.href) : panel.href
			}
			return {
				text: this.tr(panel.text || ''),
				url,
				linkLabel: panel.linkLabel ? this.tr(panel.linkLabel) : t('nextcloud-vue', 'Open admin settings'),
			}
		},

		/**
		 * The custom component the admin panel names, or null.
		 *
		 * @return {object|null}
		 */
		adminComponent() {
			const name = this.config.adminPanel?.component
			return (name && this.cnCustomComponents && this.cnCustomComponents[name]) || null
		},

		/**
		 * Whether the admin panel shows: only to an administrator, and only
		 * when there is something in it.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/link-cards-notes/specs/link-cards-page/spec.md#requirement-an-admin-panel-under-the-cards
		 */
		showAdminPanel() {
			if (!this.resolvedAdminPanel && !this.adminComponent && !this.$slots.admin) {
				return false
			}
			try {
				return getCurrentUser()?.isAdmin === true
			} catch {
				return false
			}
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

	watch: {
		visibleCards: {
			handler() {
				this.loadNoteCounts()
			},

			immediate: true,
		},
	},

	methods: {
		t,

		/**
		 * The note a card shows, resolved against its counts: the first entry
		 * whose `when` count is above 0 (an entry without `when` always
		 * applies), its text with `{name}` filled in, and its tone as a badge
		 * variant. Null while a count it needs is loading or failed.
		 *
		 * @param {object} card The resolved card.
		 * @return {{text: string, variant: string}|null}
		 * @spec openspec/changes/link-cards-notes/specs/link-cards-page/spec.md#requirement-a-card-can-carry-a-note-with-a-tone
		 */
		noteOf(card) {
			const declared = card.note
			if (!declared) {
				return null
			}
			const entries = (Array.isArray(declared) ? declared : [declared])
				.map((entry) => (typeof entry === 'string' ? { text: entry } : entry))
				.filter((entry) => entry && typeof entry === 'object' && typeof entry.text === 'string')
			const counts = this.noteCounts[card.id] || {}
			for (const entry of entries) {
				const names = Object.keys(entry.counts || {})
				if (names.some((name) => typeof counts[name] !== 'number')) {
					continue
				}
				if (entry.when && !(counts[entry.when] > 0)) {
					continue
				}
				const one = entry.textOne && counts[entry.when || names[0]] === 1
				const text = this.tr(one ? entry.textOne : entry.text)
					.replace(/\{(\w+)\}/g, (match, name) => (typeof counts[name] === 'number' ? String(counts[name]) : match))
				return { text, variant: NOTE_VARIANTS[entry.tone] || 'default' }
			}
			return null
		},

		/**
		 * Fetch the counts the visible cards' notes name, one `_limit=1` list
		 * request per count, once per card and name.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/link-cards-notes/specs/link-cards-page/spec.md#requirement-a-card-can-carry-a-note-with-a-tone
		 */
		async loadNoteCounts() {
			const jobs = []
			for (const card of this.visibleCards) {
				const entries = Array.isArray(card.note) ? card.note : [card.note]
				for (const entry of entries) {
					for (const [name, source] of Object.entries((entry && entry.counts) || {})) {
						if (!source || !source.register || !source.schema || this.noteCounts[card.id]?.[name] !== undefined) {
							continue
						}
						this.setNoteCount(card.id, name, null)
						jobs.push(fetchListTotal(source.register, source.schema, source.filter || {})
							.then((total) => this.setNoteCount(card.id, name, typeof total === 'number' ? total : false))
							.catch(() => this.setNoteCount(card.id, name, false)))
					}
				}
			}
			await Promise.all(jobs)
		},

		/**
		 * @param {string} cardId The card.
		 * @param {string} name The count name.
		 * @param {number|null|false} value The total; null while loading, false when it failed.
		 */
		setNoteCount(cardId, name, value) {
			this.noteCounts = { ...this.noteCounts, [cardId]: { ...(this.noteCounts[cardId] || {}), [name]: value } }
		},

		/**
		 * The icon at the end of a list row: an external-link icon for a URL,
		 * a chevron for a page in the app. A resolved `trailing` wins.
		 *
		 * @param {object} card The resolved card.
		 * @return {string} `external` or `chevron`.
		 * @spec openspec/changes/screens-links-module-cards/specs/link-cards-page/spec.md#requirement-a-group-can-be-a-list-card
		 */
		trailingOf(card) {
			if (card.trailing === 'external' || card.trailing === 'chevron') {
				return card.trailing
			}
			return card.external ? 'external' : 'chevron'
		},

		/**
		 * Whether a module is in the menu: its `enabled` boolean, else its
		 * `enabledIf` condition evaluated as a `visibleIf`, else false.
		 *
		 * @param {object} module The declared module.
		 * @param {object|null} runtime `manifest.runtime`, or null.
		 * @return {boolean} True when the module is in the menu.
		 * @spec openspec/changes/screens-links-module-cards/specs/link-cards-page/spec.md#requirement-a-links-page-can-show-modules
		 */
		moduleEnabled(module, runtime) {
			if (typeof module.enabled === 'boolean') {
				return module.enabled
			}
			if (module.enabledIf && typeof module.enabledIf === 'object') {
				return this.passesVisibleIf({ visibleIf: module.enabledIf }, runtime)
			}
			return false
		},

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
			if (card.action === 'user-settings') {
				return typeof this.cnOpenUserSettings === 'function'
					? { external: false, location: null, url: '#', action: 'user-settings' }
					: { external: false, location: null, url: '' }
			}
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
			if (card.action === 'user-settings') {
				event.preventDefault()
				this.cnOpenUserSettings()
				return
			}
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

.cn-link-cards-page__group--list {
	padding: 20px 22px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-container-large, 12px);
	background: var(--color-main-background);
	gap: 6px;
}

.cn-link-cards-page__group--list .cn-link-cards-page__caption {
	margin: 0 0 8px;
	color: var(--color-main-text);
	font-size: 17px;
	font-weight: 700;
	letter-spacing: normal;
	text-transform: none;
}

.cn-link-cards-page__list {
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-link-cards-page__row {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 0;
	border-top: 1px solid var(--color-background-dark);
	color: var(--color-main-text);
}

.cn-link-cards-page__row,
.cn-link-cards-page__row:hover,
.cn-link-cards-page__row:focus,
.cn-link-cards-page__row:active {
	text-decoration: none !important;
}

.cn-link-cards-page__row:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-link-cards-page__row-icon {
	display: flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: 34px;
	height: 34px;
	border-radius: var(--border-radius-element, 8px);
	background: var(--color-background-dark);
}

.cn-link-cards-page__row-body {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.cn-link-cards-page__row-label {
	font-size: 15px;
	font-weight: 600;
}

.cn-link-cards-page__row-description {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-link-cards-page__row-trailing {
	flex: none;
	color: var(--color-text-maxcontrast);
}

.cn-link-cards-page__modules {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.cn-link-cards-page__modules-head {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	align-items: baseline;
	gap: 8px;
}

.cn-link-cards-page__modules-title {
	margin: 0;
	font-size: 20px;
	font-weight: 700;
}

.cn-link-cards-page__modules-count {
	font-size: 14px;
	color: var(--color-text-maxcontrast);
}

.cn-link-cards-page__modules-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
	gap: 16px;
}

.cn-link-cards-page__modules-note {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	margin: 0;
	font-size: 14px;
	color: var(--color-text-maxcontrast);
}

.cn-link-cards-page__modules-note-icon {
	flex: none;
}

.cn-link-cards-page__note {
	align-self: flex-start;
	margin-top: 2px;
}

/* In-app cards end in a chevron, external ones in an external-link icon. */
.cn-link-cards-page__trailing {
	align-self: center;
	flex: none;
	margin-inline-start: auto;
	color: var(--color-text-maxcontrast);
}

.cn-link-cards-page__admin {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
	align-items: start;
	gap: calc(4 * var(--default-grid-baseline));
}

.cn-link-cards-page__admin-card {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: calc(2 * var(--default-grid-baseline));
	padding: calc(4 * var(--default-grid-baseline));
	border: 1px solid var(--color-border-dark);
	border-radius: var(--border-radius-large);
	background: var(--color-background-hover);
}

.cn-link-cards-page__admin-pill {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 2px 10px;
	border-radius: var(--border-radius-pill);
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text, var(--color-main-text));
	font-size: 13px;
	font-weight: 600;
}

.cn-link-cards-page__admin-text {
	margin: 0;
	font-size: 14px;
	line-height: 1.5;
}

.cn-link-cards-page__admin-link {
	color: var(--color-primary-element);
	font-weight: 600;
}
</style>

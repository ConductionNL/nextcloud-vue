<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2

  CnStorePage — browse a remote OpenRegister registry for shareable content,
  and install an item into this instance.

  The `store` page type (ADR-080, ADR-114 Decision 4). Promoted out of dossiq's
  app-local StoreGallery, which was the fleet's only implementation and was
  about to be copied fifteen times (ADR-012).

  WHAT IS APP-SPECIFIC, AND WHAT IS NOT.
  --------------------------------------
  Everything on this page is generic except three things, and all three arrive
  as props rather than being written into the component:

    `app`          the app id, which is the only thing in the request URL
    `builtIn`      the items this app ships itself, for the no-registry case
    `description`  the lead paragraph, because a store of case types and a
                   store of connector adapters are not selling the same thing

  DISCOVERY IS NOT IMPLEMENTED HERE, ON PURPOSE.
  ----------------------------------------------
  This calls `/apps/<app>/api/store/items`, which is a thin action over
  OpenRegister's `GenericStoreService` (ADR-080 Decision 2). The SSRF guard,
  the redirect refusal, the timeouts and the registry token all stay
  server-side in the engine, and no leaf app ever builds a registry URL.

  Install is deliberately NOT generalised (ADR-080 Decision 3): cloning an
  application template, enabling a connector adapter and instantiating an agent
  template are different operations with different authorization. Each app owns
  `POST /api/store/items/{slug}/install`; this component only calls it and
  renders what it reports.

  WHO SEES INSTALL AND PUBLISH IS THE APP'S ANSWER, NOT THIS PAGE'S.
  -----------------------------------------------------------------
  `canInstall` and `canPublish` carry a boolean the app resolved (learniq reads
  its ADR-023 action matrix). `null`, the default, falls back to administrators
  only, which is what every store page did before the props existed. Publish
  appears only when the app also names a `publishRoute`: publishing is the
  app's own surface, like install. Both props hide a button and nothing more;
  the app's endpoints enforce the same rule.

  A LOCAL-ONLY CARD GRID IS NOT A STORE (ADR-080 Decision 4). With no registry
  configured the engine answers `not_configured` WITHOUT a network call, and
  this page then renders `builtIn`. That fallback is the only reason a surface
  may carry the word Store at all.
-->
<template>
	<div class="cn-store-page" :class="{ 'cn-store-page--board': isBoardLook }" data-testid="store-page">
		<div class="cn-store-page__header">
			<div class="cn-store-page__heading">
				<h2 class="cn-store-page__title" :lang="langOf(resolvedTitle)">
					{{ shown(resolvedTitle) }}
				</h2>
				<div v-if="showPublish" class="cn-store-page__header-buttons">
					<CnBuildiqEditButton v-if="isBoardLook" />
					<NcButton
						:variant="isBoardLook ? 'primary' : 'secondary'"
						data-testid="store-publish"
						:to="publishTarget">
						<template v-if="isBoardLook" #icon>
							<Upload :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Publish') }}
					</NcButton>
				</div>
			</div>
			<p v-if="resolvedDescription" class="cn-store-page__intro" :lang="langOf(resolvedDescription)">
				{{ shown(resolvedDescription) }}
			</p>
		</div>

		<!-- The board look (board PqStore): chips for all, installed, updates
		     and the app's kind chips, each with a count, and the search on the
		     right. The chips filter the loaded cards; the search asks the
		     registry. -->
		<div v-if="isBoardLook" class="cn-store-page__controls cn-store-page__controls--board">
			<div
				class="cn-store-page__chips"
				role="group"
				:aria-label="t('nextcloud-vue', 'Show')"
				data-testid="store-chips">
				<button
					v-for="chip in boardChips"
					:key="chip.value"
					type="button"
					class="cn-store-page__chip"
					:class="{ 'cn-store-page__chip--active': chip.value === boardFilter }"
					:aria-pressed="chip.value === boardFilter ? 'true' : 'false'"
					:data-testid="`store-chip-${chip.value}`"
					@click="boardFilter = chip.value">
					{{ chip.label }}
					<span class="cn-store-page__chip-count">{{ chip.count }}</span>
				</button>
			</div>
			<form class="cn-store-page__search" role="search" @submit.prevent="search">
				<label :for="searchId" class="cn-store-page__search-label">
					{{ t('nextcloud-vue', 'Search the store') }}
				</label>
				<Magnify :size="18" class="cn-store-page__search-icon" />
				<input
					:id="searchId"
					v-model="query"
					type="search"
					class="cn-store-page__search-input"
					:placeholder="t('nextcloud-vue', 'Search the store')"
					:disabled="offline"
					data-testid="store-search"
					@input="onSearchInput">
			</form>
		</div>

		<div v-else class="cn-store-page__controls">
			<NcTextField
				v-model="query"
				:label="t('nextcloud-vue', 'Search the store')"
				:disabled="offline"
				data-testid="store-search"
				@update:modelValue="onSearchInput" />

			<div
				class="cn-store-page__kinds"
				role="group"
				:aria-label="t('nextcloud-vue', 'Filter by kind')">
				<NcButton
					v-for="option in kindOptions"
					:key="option.value"
					:variant="option.value === kind ? 'primary' : 'secondary'"
					:disabled="offline"
					:data-testid="`store-kind-${option.value || 'all'}`"
					@click="selectKind(option.value)">
					{{ option.label }}
				</NcButton>
			</div>
		</div>

		<div class="cn-store-page__body">
		<div class="cn-store-page__main">
		<NcLoadingIcon v-if="loading" :size="44" class="cn-store-page__loading" />

		<NcNoteCard
			v-else-if="offline"
			type="info"
			data-testid="store-not-configured">
			{{ notConfiguredMessage }}
		</NcNoteCard>

		<NcNoteCard
			v-else-if="unreachable"
			type="warning"
			data-testid="store-unreachable">
			{{ unreachableMessage }}
		</NcNoteCard>

		<NcEmptyContent
			v-else-if="shownCards.length === 0"
			:name="t('nextcloud-vue', 'Nothing matches that search')"
			:description="
				t('nextcloud-vue', 'Try a different term, or clear the kind filter.')
			" />

		<ul
			v-if="!loading && shownCards.length > 0"
			class="cn-store-page__grid"
			data-testid="store-results">
			<li
				v-for="card in shownCards"
				:key="card.slug"
				class="cn-store-page__card"
				:class="{ 'cn-store-page__card--board': isBoardLook }">
				<!--
					Board look: an icon chip, the title, "<kind> · <publisher>" and a
					state pill, then the description, then a footer with the version
					and one named action. The same card without the look is the
					plain one below.
				-->
				<template v-if="isBoardLook">
					<div class="cn-store-page__card-head">
						<span class="cn-store-page__card-chip" aria-hidden="true">
							<CnIcon v-if="card.icon" :name="card.icon" :size="22" />
							<PackageVariantClosed v-else :size="22" />
						</span>
						<div class="cn-store-page__card-heading">
							<h3 class="cn-store-page__card-title">
								{{ card.title || card.slug }}
							</h3>
							<p v-if="cardKindLine(card)" class="cn-store-page__card-kind" data-testid="store-card-kind">
								{{ cardKindLine(card) }}
							</p>
							<span
								class="cn-store-page__card-state"
								:class="`cn-store-page__card-state--${cardState(card) || 'available'}`"
								data-testid="store-card-state">
								{{ stateLabel(cardState(card)) }}
							</span>
						</div>
					</div>
					<p class="cn-store-page__card-description">
						{{ card.description }}
					</p>
					<div class="cn-store-page__card-footer" data-testid="store-card-footer">
						<span v-if="versionLine(card)" class="cn-store-page__card-version">
							{{ versionLine(card) }}
						</span>
						<NcButton
							v-if="cardAction(card)"
							:variant="cardAction(card).id === 'open' ? 'secondary' : 'tertiary'"
							class="cn-store-page__card-action"
							:class="`cn-store-page__card-action--${cardAction(card).id}`"
							data-testid="store-card-action"
							:href="cardAction(card).href"
							:disabled="installing === card.slug"
							:aria-label="`${cardAction(card).label} ${card.title || card.slug}`"
							@click="onCardAction(card, cardAction(card))">
							{{ cardAction(card).label }}
						</NcButton>
					</div>
				</template>
				<template v-else>
					<h3 class="cn-store-page__card-title">
						{{ card.title || card.slug }}
					</h3>
					<p v-if="card.typeName || card.kind" class="cn-store-page__card-kind">
						{{ card.typeName || kindLabel(card.kind) }}
					</p>
					<p class="cn-store-page__card-description">
						{{ card.description }}
					</p>
					<div class="cn-store-page__card-footer">
						<span v-if="card.publisher" class="cn-store-page__card-publisher">
							{{ card.publisher }}
						</span>
						<span v-if="card.version" class="cn-store-page__card-version">
							{{ card.version }}
						</span>
						<NcButton
							v-if="showInstall"
							variant="primary"
							data-testid="store-install"
							:disabled="installing === card.slug"
							@click="install(card)">
							{{
								installing === card.slug
									? t('nextcloud-vue', 'Installing…')
									: t('nextcloud-vue', 'Install')
							}}
						</NcButton>
					</div>
				</template>
			</li>
		</ul>

		<div
			v-if="!loading && visibleBuiltIn.length > 0"
			class="cn-store-page__builtin">
			<h3 class="cn-store-page__builtin-title">
				{{ builtInHeading }}
			</h3>
			<ul class="cn-store-page__grid" data-testid="store-builtin">
				<li
					v-for="item in visibleBuiltIn"
					:key="item.slug"
					class="cn-store-page__card">
					<h4 class="cn-store-page__card-title">
						{{ item.title || item.slug }}
					</h4>
					<p class="cn-store-page__card-description">
						{{ item.description }}
					</p>
				</li>
			</ul>
		</div>

		<NcNoteCard
			v-if="report"
			:type="report.type"
			data-testid="store-install-report">
			{{ report.message }}
		</NcNoteCard>
		</div>

		<!-- The board look's side column (board PqStore): what is installed
		     from this store, the update check, and what ships with the app. -->
		<aside
			v-if="isBoardLook"
			class="cn-store-page__aside"
			:aria-label="t('nextcloud-vue', 'About this store')"
			data-testid="store-aside">
			<section class="cn-store-page__aside-card" data-testid="store-aside-installed">
				<h3 class="cn-store-page__aside-title">
					{{ t('nextcloud-vue', 'Installed from this store') }}
				</h3>
				<ul v-if="installedCards.length > 0" class="cn-store-page__aside-list">
					<li v-for="card in installedCards" :key="card.slug" class="cn-store-page__aside-row">
						<span class="cn-store-page__aside-name">{{ card.title || card.slug }}</span>
						<span v-if="card.installedVersion || card.version" class="cn-store-page__aside-version">
							{{ card.installedVersion || card.version }}
						</span>
						<span
							v-if="card.updateAvailable === true"
							class="cn-store-page__card-state cn-store-page__card-state--update">
							{{ t('nextcloud-vue', 'Update') }}
						</span>
					</li>
				</ul>
				<p v-else class="cn-store-page__aside-muted">
					{{ t('nextcloud-vue', 'Nothing from this store is installed yet.') }}
				</p>
			</section>
			<section class="cn-store-page__aside-card" data-testid="store-aside-updates">
				<h3 class="cn-store-page__aside-title">
					{{ t('nextcloud-vue', 'Updates') }}
				</h3>
				<p v-if="checkedAt" class="cn-store-page__aside-text cn-store-page__aside-checked">
					<ClockOutline :size="16" />
					{{ t('nextcloud-vue', 'Last checked today at {time}', { time: checkedAt }) }}
				</p>
				<p class="cn-store-page__aside-text" data-testid="store-updates-summary">
					{{ updatesSummary }}
				</p>
				<NcButton
					variant="secondary"
					class="cn-store-page__check"
					data-testid="store-check-updates"
					:disabled="loading || offline"
					@click="search">
					<template #icon>
						<Refresh :size="18" />
					</template>
					{{ t('nextcloud-vue', 'Check now') }}
				</NcButton>
			</section>
			<section
				v-if="effectiveBuiltIn.length > 0"
				class="cn-store-page__aside-card"
				data-testid="store-aside-builtin">
				<h3 class="cn-store-page__aside-title">
					{{ builtInHeading }}
				</h3>
				<p class="cn-store-page__aside-text">
					{{ builtInSummary }}
				</p>
				<p v-if="canInstall === null" class="cn-store-page__aside-muted">
					{{ t('nextcloud-vue', 'Only administrators install. An administrator connects the registry under Administration settings.') }}
				</p>
			</section>
		</aside>
		</div>

		<p v-if="isBoardLook && resolvedFootnote" class="cn-store-page__footnote" data-testid="store-footnote">
			<InformationOutline :size="16" class="cn-store-page__footnote-icon" />
			{{ resolvedFootnote }}
		</p>
	</div>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import { showError, showSuccess } from '@nextcloud/dialogs'
import { n, t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import {
	NcButton,
	NcEmptyContent,
	NcLoadingIcon,
	NcNoteCard,
	NcTextField,
} from '@nextcloud/vue'
import ClockOutline from 'vue-material-design-icons/ClockOutline.vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import Magnify from 'vue-material-design-icons/Magnify.vue'
import PackageVariantClosed from 'vue-material-design-icons/PackageVariantClosed.vue'
import Refresh from 'vue-material-design-icons/Refresh.vue'
import Upload from 'vue-material-design-icons/Upload.vue'
import { normalizeLook } from '../../composables/useLook.js'
import { labelLang } from '../../utils/manifestTranslate.js'
import CnBuildiqEditButton from '../CnBuildiqEditButton/CnBuildiqEditButton.vue'
import { CnIcon } from '../CnIcon/index.js'

/**
 * The kind vocabulary from ADR-080 Decision 5. A `kind` names what installing
 * an item DOES, which is what lets one registry serve several apps from one
 * schema. An app whose items are a different shape passes its own `kinds`.
 */
export const DEFAULT_STORE_KINDS = [
	'app-template',
	'adapter',
	'source-template',
	'configuration-template',
	'agent-template',
]

export default {
	name: 'CnStorePage',

	components: {
		ClockOutline,
		CnBuildiqEditButton,
		CnIcon,
		InformationOutline,
		Magnify,
		PackageVariantClosed,
		Refresh,
		Upload,
		NcButton,
		NcEmptyContent,
		NcLoadingIcon,
		NcNoteCard,
		NcTextField,
	},

	inject: {
		/** The label lookup from CnAppRoot, so manifest labels show in the user's language. */
		cnTranslate: { default: null },
		/** The look CnAppRoot provides; `board` draws the catalogue cards of the screens. */
		cnLook: { default: 'nextcloud' },
	},

	props: {
		/**
		 * The manifest page.
		 *
		 * ⚠️ CnPageRenderer does NOT pass this. `resolvedProps()` returns
		 * `{ ...topLevel, ...normalizedConfig, ...params }` and has no `page`
		 * key, so a dispatched `type: "store"` page arrives with the flattened
		 * props below and this default `{}`. Reading `page.config` here would
		 * render an empty store forever, which is exactly what happened to
		 * CnReportsPage before #897. Kept only so a host rendering this
		 * component directly can still hand it a whole page; the flattened
		 * props win.
		 *
		 * @type {object}
		 */
		page: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * The app id. The ONLY app-specific value in the request URL, and the
		 * reason this component is shared rather than copied.
		 *
		 * @type {string}
		 */
		app: {
			type: String,
			default: '',
		},

		/**
		 * Page title, flattened out of `config` or lifted from the page.
		 *
		 * @type {string}
		 */
		title: {
			type: String,
			default: '',
		},

		/**
		 * The lead paragraph. A store of case types and a store of connector
		 * adapters are not offering the same thing, so the app says what its
		 * store is for.
		 *
		 * @type {string}
		 */
		description: {
			type: String,
			default: '',
		},

		/**
		 * Kind quick-filters. Defaults to the ADR-080 Decision 5 vocabulary.
		 *
		 * @type {Array<string>}
		 */
		kinds: {
			type: Array,
			default: () => DEFAULT_STORE_KINDS,
		},

		/**
		 * The items this app ships itself, rendered when the engine reports
		 * `not_configured` or the registry does not answer.
		 *
		 * ADR-080 Decision 4 makes this the price of the word Store: a surface
		 * that goes blank without a registry was never a store, and a surface
		 * that only ever shows these is a Templates page.
		 *
		 * @type {Array<{slug: string, title: string, description: string}>}
		 */
		builtIn: {
			type: Array,
			default: () => [],
		},

		/**
		 * Whether the signed-in user sees Install, as the app resolved it
		 * (learniq: its ADR-023 matrix). `true` shows it on every remote
		 * card, `false` hides it from everyone, administrators included.
		 * `null` (the default) keeps the rule from before this prop:
		 * administrators only. Presentation only: the app's install endpoint
		 * must enforce the same rule.
		 *
		 * @type {boolean|null}
		 */
		canInstall: {
			type: Boolean,
			default: null,
		},

		/**
		 * Whether the signed-in user sees Publish, as the app resolved it.
		 * `null` (the default) falls back to administrators only. Publish
		 * renders only when `publishRoute` is set as well. Presentation
		 * only: the app's publish endpoint must enforce the same rule.
		 *
		 * @type {boolean|null}
		 */
		canPublish: {
			type: Boolean,
			default: null,
		},

		/**
		 * Where Publish takes the user: a route name (string) or a route
		 * location (object). Publishing is the app's own surface, so this
		 * page never sends anything to a registry itself. Empty means no
		 * Publish button, whatever `canPublish` says, so an app that never
		 * sets it renders what it rendered before.
		 *
		 * @type {string|object}
		 */
		publishRoute: {
			type: [String, Object],
			default: '',
		},

		/**
		 * The kind chips under the board look, after All, Installed and
		 * Updates available: kind ids, or `{ value, label }` to name a chip
		 * ("Connectors" for `adapter`). A chip shows only while a loaded card
		 * has its kind. Empty (the default): one chip per kind the store
		 * offers.
		 *
		 * @spec openspec/changes/screens-store-page-pq-board/specs/store-page/spec.md#requirement-the-store-page-draws-board-pqstore
		 * @type {Array<string|{value: string, label: string}>}
		 */
		kindChips: {
			type: Array,
			default: () => [],
		},

		/**
		 * A sentence after the update count in the side column's Updates
		 * card under the board look, such as what an update keeps.
		 *
		 * @spec openspec/changes/screens-store-page-pq-board/specs/store-page/spec.md#requirement-the-store-page-draws-board-pqstore
		 * @type {string}
		 */
		updatesNote: {
			type: String,
			default: '',
		},

		/**
		 * A line under the page, drawn under the board look with an info
		 * icon. Empty (the default) draws none.
		 *
		 * @spec openspec/changes/screens-store-page-pq-board/specs/store-page/spec.md#requirement-the-store-page-draws-board-pqstore
		 * @type {string}
		 */
		footnote: {
			type: String,
			default: '',
		},
	},

	data() {
		return {
			loading: true,
			outcome: null,
			cards: [],
			query: '',
			kind: '',
			installing: null,
			report: null,
			searchTimer: null,
			// The kinds the ENGINE served, from the app's `store` manifest
			// block. Null until the first response, so "not asked yet" stays
			// distinguishable from "the app declares none".
			servedKinds: null,
			// The built-in items the ENGINE served, from the app's `store`
			// manifest block. Null until the first response, so "not asked
			// yet" stays distinguishable from "the app declares none".
			servedBuiltIn: null,
			// The board look's chip: all, installed, updates or kind:<id>.
			boardFilter: 'all',
			// When the registry last answered, as the reader's local time.
			checkedAt: '',
		}
	},

	computed: {
		/**
		 * Whether the cards are drawn as the board look's catalogue cards.
		 *
		 * @return {boolean}
		 */
		isBoardLook() {
			return normalizeLook(this.cnLook) === 'board'
		},

		/**
		 * The cards the page draws: under the board look, those the active
		 * chip admits; otherwise every loaded card.
		 *
		 * @spec openspec/changes/screens-store-page-pq-board/specs/store-page/spec.md#requirement-the-store-page-draws-board-pqstore
		 * @return {Array<object>} The cards.
		 */
		shownCards() {
			if (!this.isBoardLook) {
				return this.cards
			}
			return this.cards.filter((card) => this.chipAdmits(this.boardFilter, card))
		},

		/**
		 * The board look's chips with their counts: All, Installed, Updates
		 * available, then each kind chip that has a card.
		 *
		 * @spec openspec/changes/screens-store-page-pq-board/specs/store-page/spec.md#requirement-the-store-page-draws-board-pqstore
		 * @return {Array<{value: string, label: string, count: number}>} The chips.
		 */
		boardChips() {
			const count = (value) => this.cards.filter((card) => this.chipAdmits(value, card)).length
			const declared = this.kindChips.length > 0 ? this.kindChips : this.effectiveKinds
			const kinds = declared
				.map((entry) => (typeof entry === 'string'
					? { value: entry, label: this.kindLabel(entry) }
					: { value: String(entry?.value ?? ''), label: this.shown(String(entry?.label ?? '')) || this.kindLabel(String(entry?.value ?? '')) }))
				.filter((entry) => entry.value !== '')
				.map((entry) => ({ value: `kind:${entry.value}`, label: entry.label, count: count(`kind:${entry.value}`) }))
				.filter((chip) => chip.count > 0)
			return [
				{ value: 'all', label: t('nextcloud-vue', 'All'), count: this.cards.length },
				{ value: 'installed', label: t('nextcloud-vue', 'Installed'), count: count('installed') },
				{ value: 'updates', label: t('nextcloud-vue', 'Updates available'), count: count('updates') },
				...kinds,
			]
		},

		/**
		 * The loaded cards that are installed, for the side column.
		 *
		 * @return {Array<object>} The installed cards.
		 */
		installedCards() {
			return this.cards.filter((card) => card.installed === true || card.updateAvailable === true)
		},

		/**
		 * The Updates card's sentence: how many updates are ready, then the
		 * app's `updatesNote`.
		 *
		 * @spec openspec/changes/screens-store-page-pq-board/specs/store-page/spec.md#requirement-the-store-page-draws-board-pqstore
		 * @return {string} The sentence.
		 */
		updatesSummary() {
			const updates = this.cards.filter((card) => card.updateAvailable === true).length
			const head = updates === 0
				? t('nextcloud-vue', 'Everything is up to date.')
				: n('nextcloud-vue', '%n update is ready.', '%n updates are ready.', updates)
			const note = this.shown(this.updatesNote)
			return note ? `${head} ${note}` : head
		},

		/**
		 * The side column's line on what ships with the app.
		 *
		 * @return {string} The line.
		 */
		builtInSummary() {
			const titles = this.effectiveBuiltIn.map((item) => this.shown(item.title || item.slug)).filter(Boolean)
			return t('nextcloud-vue', '{items} ship with the app. They show here when no registry is connected.', { items: titles.join(', ') })
		},

		/**
		 * The footnote, in the user's language.
		 *
		 * @return {string} The footnote, or ''.
		 */
		resolvedFootnote() {
			return this.shown(this.footnote || this.page?.config?.footnote || '')
		},

		/**
		 * A stable id for the board search field's label.
		 *
		 * @return {string} The id.
		 */
		searchId() {
			return `cn-store-search-${this.resolvedApp || 'page'}`
		},

		/**
		 * The page title, preferring the flattened prop over the page object.
		 *
		 * @return {string} The heading to render.
		 */
		resolvedTitle() {
			return this.title || this.page?.title || t('nextcloud-vue', 'Store')
		},

		/**
		 * The lead paragraph, preferring the flattened prop.
		 *
		 * @return {string} The intro copy, or an empty string.
		 */
		resolvedDescription() {
			return this.description || this.page?.config?.description || ''
		},

		/**
		 * The app id, preferring the flattened prop.
		 *
		 * @return {string} The app id used to address the store endpoints.
		 */
		resolvedApp() {
			return this.app || this.page?.config?.app || ''
		},

		/**
		 * No registry configured. The engine reported this WITHOUT making a
		 * network call, which is the ADR-080 Decision 4 fallback.
		 *
		 * @return {boolean} True when no registry is connected.
		 */
		offline() {
			return this.outcome === 'not_configured'
		},

		/**
		 * The registry is configured but did not answer usefully.
		 *
		 * @return {boolean} True when the registry errored.
		 */
		unreachable() {
			return (
				this.outcome === 'store_unreachable'
				|| this.outcome === 'store_invalid_response'
			)
		},

		/**
		 * Whether the current user is an administrator: the fallback for both
		 * actions when the app did not say.
		 *
		 * @return {boolean} True when the current user is an administrator.
		 *
		 * @spec openspec/changes/store-page-action-visibility/specs/store-page/spec.md#requirement-req-stp-1-the-consuming-app-decides-who-sees-install
		 */
		isAdmin() {
			return getCurrentUser()?.isAdmin === true
		},

		/**
		 * Whether Install shows. The app's answer wins; without one only an
		 * administrator installs, because what an install writes is the shape
		 * of the work every handler then operates against. The server
		 * enforces this too; hiding the button keeps a user from discovering
		 * a refusal as a 403.
		 *
		 * @return {boolean} True when the Install buttons render.
		 *
		 * @spec openspec/changes/store-page-action-visibility/specs/store-page/spec.md#requirement-req-stp-1-the-consuming-app-decides-who-sees-install
		 */
		showInstall() {
			if (typeof this.canInstall === 'boolean') {
				return this.canInstall
			}

			return this.isAdmin
		},

		/**
		 * Where Publish navigates, or null when the app named no destination.
		 * A string is a route NAME, the way manifest menu entries name routes.
		 *
		 * @return {object|null} A vue-router location, or null.
		 *
		 * @spec openspec/changes/store-page-action-visibility/specs/store-page/spec.md#requirement-req-stp-2-the-consuming-app-decides-who-sees-publish-and-where-it-leads
		 */
		publishTarget() {
			if (typeof this.publishRoute === 'string') {
				return this.publishRoute === '' ? null : { name: this.publishRoute }
			}

			if (this.publishRoute !== null && typeof this.publishRoute === 'object') {
				return this.publishRoute
			}

			return null
		},

		/**
		 * Whether Publish shows: a destination is named AND the app allows it
		 * (or, without an answer, the user is an administrator). No
		 * destination means no button, because a button that goes nowhere
		 * is worse than none.
		 *
		 * @return {boolean} True when the Publish button renders.
		 *
		 * @spec openspec/changes/store-page-action-visibility/specs/store-page/spec.md#requirement-req-stp-2-the-consuming-app-decides-who-sees-publish-and-where-it-leads
		 */
		showPublish() {
			if (this.publishTarget === null) {
				return false
			}

			if (typeof this.canPublish === 'boolean') {
				return this.canPublish
			}

			return this.isAdmin
		},

		/**
		 * The kind quick-filters, with an "all" entry first.
		 *
		 * @return {Array<{value: string, label: string}>} The filter options.
		 */
		kindOptions() {
			return [
				{ value: '', label: t('nextcloud-vue', 'All kinds') },
				...this.effectiveKinds.map((value) => ({ value, label: this.kindLabel(value) })),
			]
		},

		/**
		 * The kinds to offer, preferring what the ENGINE served.
		 *
		 * An app declares its kinds in the `store` block of its manifest, next
		 * to the schema allowlist, and the engine returns them with the cards.
		 * That is the single place an app says what its store sells; the
		 * `kinds` PROP remains for a host rendering this component directly and
		 * as the pre-response value, and DEFAULT_STORE_KINDS is the floor.
		 *
		 * A served EMPTY list means the app declared none, which is not the
		 * same as not having asked yet — hence `servedKinds` starts null.
		 *
		 * @return {Array<string>} The kind filter values.
		 */
		effectiveKinds() {
			if (Array.isArray(this.servedKinds) && this.servedKinds.length > 0) {
				return this.servedKinds
			}

			return this.kinds
		},

		/**
		 * The app's own items, shown whenever the remote list is not carrying
		 * the page. Not a network call, and not a Store on their own.
		 *
		 * 🔴 AN EMPTY ANSWER IS STILL AN EMPTY PAGE. This used to hide the
		 * built-ins whenever the engine answered at all, checking only
		 * `not_configured` and the error outcomes. A federated store that
		 * answers `ok` with zero cards — a configured registry that has
		 * published nothing yet — then rendered a heading, a search box and
		 * nothing else, while the app shipped four items it could have shown.
		 * Measured on decidiq, whose store returns `ok` with 0 cards and 4
		 * built-ins declared.
		 *
		 * ADR-080 Decision 4 is explicit that a surface which goes blank was
		 * never a store, so the test is what the reader can SEE, not which
		 * outcome the engine reported.
		 *
		 * @return {Array<object>} The built-in items to render.
		 */
		visibleBuiltIn() {
			if (this.offline === false && this.unreachable === false && this.cards.length > 0) {
				return []
			}

			return this.effectiveBuiltIn
		},

		/**
		 * The app's own items, preferring what the ENGINE served over the page
		 * config.
		 *
		 * An app declares these ONCE, in its `store` manifest block beside the
		 * allowlist, which is where the schema documents them. The `builtIn`
		 * PROP is a second place to write the same list, and an app that
		 * declared them only in the manifest used to render nothing: the
		 * engine parsed them and never sent them.
		 *
		 * Mirrors `effectiveKinds` exactly, for the same reason.
		 *
		 * @return {Array<object>} The items to render.
		 */
		effectiveBuiltIn() {
			if (Array.isArray(this.servedBuiltIn) && this.servedBuiltIn.length > 0) {
				return this.servedBuiltIn
			}

			return this.builtIn
		},

		/**
		 * Heading above the app's own items.
		 *
		 * @return {string} The built-in section heading.
		 */
		builtInHeading() {
			return this.resolvedApp
				? t('nextcloud-vue', 'Included with {app}', { app: this.resolvedApp.charAt(0).toUpperCase() + this.resolvedApp.slice(1) })
				: t('nextcloud-vue', 'Included with this app')
		},

		/**
		 * The no-registry message, which names the built-in fallback only when
		 * there is one. Promising templates below when the list is empty is
		 * how an empty page reads as a broken one.
		 *
		 * @return {string} The not-configured note.
		 */
		notConfiguredMessage() {
			const base = t(
				'nextcloud-vue',
				'No store registry is configured, so nothing was requested from the network. An administrator can connect one under Administration settings.',
			)

			return this.builtIn.length > 0
				? `${base} ${t('nextcloud-vue', 'The items below ship with this app.')}`
				: base
		},

		/**
		 * The registry-error message, on the same rule as above.
		 *
		 * @return {string} The unreachable note.
		 */
		unreachableMessage() {
			const base = t('nextcloud-vue', 'The store registry did not answer.')

			return this.builtIn.length > 0
				? `${base} ${t('nextcloud-vue', 'The items below ship with this app.')}`
				: base
		},
	},

	mounted() {
		this.search()
	},

	/**
	 * Cancel a pending debounced search.
	 *
	 * @return {void}
	 */
	beforeUnmount() {
		if (this.searchTimer !== null) {
			clearTimeout(this.searchTimer)
		}
	},

	methods: {
		/**
		 * Whether a board chip admits a card.
		 *
		 * @param {string} value The chip: all, installed, updates or kind:<id>.
		 * @param {object} card The card.
		 * @return {boolean} True when the card shows under the chip.
		 */
		chipAdmits(value, card) {
			if (value === 'installed') {
				return card.installed === true || card.updateAvailable === true
			}
			if (value === 'updates') {
				return card.updateAvailable === true
			}
			if (value.startsWith('kind:')) {
				return card.kind === value.slice(5)
			}
			return true
		},

		/**
		 * The label of a catalogue card's state pill.
		 *
		 * @param {('installed'|'update'|'')} state The state.
		 * @return {string} The label.
		 */
		stateLabel(state) {
			if (state === 'update') {
				return t('nextcloud-vue', 'Update')
			}
			return state === 'installed' ? t('nextcloud-vue', 'Installed') : t('nextcloud-vue', 'Available')
		},

		/**
		 * The version line of a catalogue card: the installed version, and
		 * the newer one when an update is out.
		 *
		 * @spec openspec/changes/screens-store-page-pq-board/specs/store-page/spec.md#requirement-the-store-page-draws-board-pqstore
		 * @param {object} card The card.
		 * @return {string} The line, or ''.
		 */
		versionLine(card) {
			const current = card.installedVersion || card.version
			if (!current) {
				return ''
			}
			const latest = card.latestVersion
			if (card.updateAvailable === true && latest && latest !== current) {
				return t('nextcloud-vue', 'Version {version}, {latest} is out', { version: current, latest })
			}
			return t('nextcloud-vue', 'Version {version}', { version: current })
		},

		/**
		 * The "<kind> · <publisher>" line of a catalogue card.
		 *
		 * @param {object} card The card.
		 * @return {string} The line, or ''.
		 */
		cardKindLine(card) {
			return [card.typeName || this.kindLabel(card.kind), card.publisher].filter((part) => typeof part === 'string' && part !== '').join(' · ')
		},

		/**
		 * The state a catalogue card shows as a pill: `update` when the item
		 * says an update is available, `installed` when it says it is
		 * installed, none otherwise.
		 *
		 * @param {object} card The card.
		 * @return {('installed'|'update'|'')} The state.
		 */
		cardState(card) {
			if (card.updateAvailable === true) {
				return 'update'
			}
			return card.installed === true ? 'installed' : ''
		},

		/**
		 * The one action in a catalogue card's footer: Update for an item with
		 * an update, Open for an installed one that says where it opens
		 * (`openUrl`), Install for one that is not installed. Nothing when the
		 * viewer may not install and there is nowhere to open.
		 *
		 * @param {object} card The card.
		 * @return {?{id: string, label: string, href?: string}} The action, or null.
		 */
		cardAction(card) {
			const state = this.cardState(card)
			if (state === 'update') {
				return this.showInstall ? { id: 'update', label: t('nextcloud-vue', 'Update') } : null
			}
			if (state === 'installed') {
				return typeof card.openUrl === 'string' && card.openUrl !== '' ? { id: 'open', label: t('nextcloud-vue', 'Open'), href: card.openUrl } : null
			}
			return this.showInstall ? { id: 'install', label: t('nextcloud-vue', 'Install') } : null
		},

		/**
		 * The footer action was clicked: install and update run the install
		 * endpoint; Open is a link and has nothing to run.
		 *
		 * @param {object} card The card.
		 * @param {{id: string}} action The action.
		 * @return {void}
		 */
		onCardAction(card, action) {
			if (action.id === 'install' || action.id === 'update') {
				this.install(card)
			}
		},

		/**
		 * The label of a kind: the library's own for the five kinds of the
		 * default vocabulary ("App template" for `app-template`), else the kind
		 * through the app's translate, so an app with kinds of its own names
		 * them in its catalogue. Never the raw id of a known kind.
		 *
		 * @spec openspec/changes/screens-store-page-translations/specs/store-page/spec.md#requirement-the-store-page-reads-in-the-users-language
		 * @param {string} kind The kind id.
		 * @return {string} The label.
		 */
		kindLabel(kind) {
			const known = {
				'app-template': t('nextcloud-vue', 'App template'),
				adapter: t('nextcloud-vue', 'Adapter'),
				'source-template': t('nextcloud-vue', 'Source template'),
				'configuration-template': t('nextcloud-vue', 'Configuration template'),
				'agent-template': t('nextcloud-vue', 'Agent template'),
			}
			if (typeof kind !== 'string' || kind === '') {
				return ''
			}
			const translated = this.shown(kind)
			// The app's own word for a kind wins over the library's.
			return translated !== kind ? translated : (Object.hasOwn(known, kind) ? known[kind] : kind)
		},

		/**
		 * A manifest label through the injected lookup, or as written.
		 *
		 * @param {string} text The label as written.
		 * @return {string} The label in the user's language.
		 */
		shown(text) {
			return typeof this.cnTranslate === 'function' && typeof text === 'string' && text !== '' ? this.cnTranslate(text) : text
		},

		/**
		 * The `lang` of a label that fell back to its written text in another language.
		 *
		 * @param {string} text The label as written.
		 * @return {string|undefined} The source language, or undefined.
		 */
		langOf(text) {
			return labelLang(this.cnTranslate, text) || undefined
		},

		t,

		/**
		 * Debounce the search so typing does not fire one remote request per
		 * keystroke against somebody else's registry.
		 *
		 * @return {void}
		 */
		onSearchInput() {
			if (this.searchTimer !== null) {
				clearTimeout(this.searchTimer)
			}

			this.searchTimer = setTimeout(() => {
				this.search()
			}, 400)
		},

		/**
		 * Select a kind filter and re-search.
		 *
		 * @param {string} value The kind, or an empty string for all kinds.
		 *
		 * @return {void}
		 */
		selectKind(value) {
			this.kind = value
			this.search()
		},

		/**
		 * Fetch the current page of store cards.
		 *
		 * @return {Promise<void>}
		 */
		async search() {
			// An unconfigured `app` cannot address any endpoint. Reporting
			// not_configured is the honest outcome and costs no request; the
			// alternative is a fetch to /apps//api/... which 404s and reads to
			// the user as a registry that is down.
			if (this.resolvedApp === '') {
				this.outcome = 'not_configured'
				this.cards = []
				this.loading = false
				return
			}

			this.loading = true
			try {
				const params = new URLSearchParams()
				if (this.query) {
					params.set('q', this.query)
				}
				// Under the board look the chips filter the loaded cards, so
				// the registry is asked for every kind.
				if (this.kind && !this.isBoardLook) {
					params.set('kind', this.kind)
				}

				const suffix = params.toString() ? `?${params.toString()}` : ''
				const response = await fetch(
					generateUrl(`/apps/${this.resolvedApp}/api/store/items${suffix}`),
					{
						headers: { requesttoken: window.OC?.requestToken },
					},
				)
				const body = await response.json()

				this.outcome = body.outcome ?? 'store_invalid_response'
				this.cards = Array.isArray(body.cards) ? body.cards : []
				// Present on every arm the engine answers, including
				// not_configured and store_unreachable, so the filters survive
				// a registry that is down.
				this.servedKinds = Array.isArray(body.kinds) ? body.kinds : null
				// Same contract as `kinds`: present on every arm the engine
				// answers, so an app's own items survive a registry that is
				// down — which is exactly when they are all there is to show.
				this.servedBuiltIn = Array.isArray(body.builtIn) ? body.builtIn : null
				if (this.outcome === 'ok') {
					this.checkedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
				}
			} catch {
				this.outcome = 'store_unreachable'
				this.cards = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * Install one item, and report per component.
		 *
		 * A partial install is a real outcome rather than a failure: an item
		 * carrying both configuration and records installs the configuration
		 * and names the records it refused.
		 *
		 * @param {{slug: string, title: string}} card The card to install.
		 *
		 * @return {Promise<void>}
		 */
		async install(card) {
			this.installing = card.slug
			this.report = null

			try {
				const response = await fetch(
					generateUrl(`/apps/${this.resolvedApp}/api/store/items/${encodeURIComponent(card.slug)}/install`),
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							requesttoken: window.OC?.requestToken,
						},
					},
				)
				const body = await response.json()

				if (response.ok !== true) {
					showError(body.message
						?? t('nextcloud-vue', 'The item could not be installed.'))
					return
				}

				const refused = (body.components ?? []).filter((c) => c.status !== 'installed')
				if (refused.length === 0) {
					showSuccess(t('nextcloud-vue', 'Installed.'))
					this.report = null
					return
				}

				this.report = {
					type: body.success === true ? 'info' : 'warning',
					message: t(
						'nextcloud-vue',
						'Some parts were not installed: {schemas}',
						{
							schemas: refused.map((c) => c.schema).join(', '),
						},
					),
				}
			} catch {
				showError(t('nextcloud-vue', 'The item could not be installed.'))
			} finally {
				this.installing = null
			}
		},
	},
}
</script>

<style scoped>
.cn-store-page {
	padding: 16px;
	max-width: 1200px;
}

/* Clear the Nextcloud navigation toggle button (44px wide, absolutely
   positioned at the left edge of .app-content) plus 12px breathing room, as
   CnPageHeader does. Only the header shifts; the body keeps the full width. */
.cn-store-page__header {
	padding-inline-start: 56px;
}

.cn-store-page__heading {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin: 0 0 4px;
}

.cn-store-page__title {
	margin: 0;
}

.cn-store-page__intro {
	color: var(--color-text-maxcontrast);
	margin: 0 0 16px;
}

.cn-store-page__controls {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
	align-items: flex-end;
	margin-bottom: 16px;
}

.cn-store-page__kinds {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.cn-store-page__loading {
	margin: 32px auto;
}

.cn-store-page__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
	gap: 16px;
	list-style: none;
	padding: 0;
	margin: 16px 0 0;
}

.cn-store-page__card {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	background-color: var(--color-main-background);
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-store-page__card-title {
	margin: 0;
	font-size: 1rem;
}

.cn-store-page__card-kind {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 0.85rem;
}

.cn-store-page__card-description {
	margin: 0;
	flex: 1;
}

.cn-store-page__card-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.cn-store-page__card-version {
	color: var(--color-text-maxcontrast);
	font-size: 0.85rem;
}

/* Who published a configuration set matters more than its version does, since
   installing one applies somebody else's schemas and flows to this instance. */
.cn-store-page__card-publisher {
	color: var(--color-text-maxcontrast);
	font-size: 0.85rem;
	margin-inline-end: auto;
}

.cn-store-page__builtin-title {
	margin: 24px 0 0;
}
</style>

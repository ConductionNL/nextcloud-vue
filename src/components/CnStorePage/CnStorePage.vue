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
		<!-- Board look (board PqStore): the page header, buildiq and Publish. -->
		<CnPageHeader
			v-if="isBoardLook"
			:title="resolvedTitle"
			:description="showsPackages ? '' : boardDescription">
			<template #extra>
				<div v-if="showsPackages" class="cn-store-page__header-actions">
					<NcButton v-for="button in shippedButtons"
						:key="button.label"
						variant="secondary"
						:href="button.href"
						data-testid="store-header-link">
						{{ shown(button.label) }}
					</NcButton>
				</div>
				<div v-else class="cn-store-page__header-actions">
					<CnBuildiqEditButton />
					<NcButton
						v-if="showPublish"
						variant="primary"
						data-testid="store-publish"
						:to="publishable ? undefined : publishTarget"
						@click="onPublishClick">
						<template #icon>
							<Upload :size="18" />
						</template>
						{{ t('nextcloud-vue', 'Publish') }}
					</NcButton>
				</div>
			</template>
		</CnPageHeader>
		<div v-else class="cn-store-page__header">
			<div class="cn-store-page__heading">
				<h2 class="cn-store-page__title" :lang="langOf(resolvedTitle)">
					{{ shown(resolvedTitle) }}
				</h2>
				<NcButton
					v-if="showPublish"
					variant="secondary"
					data-testid="store-publish"
					:to="publishable ? undefined : publishTarget"
					@click="onPublishClick">
					{{ t('nextcloud-vue', 'Publish') }}
				</NcButton>
			</div>
			<p v-if="resolvedDescription" class="cn-store-page__intro" :lang="langOf(resolvedDescription)">
				{{ shown(resolvedDescription) }}
			</p>
		</div>

		<CnStorePackages v-if="showsPackages"
			:app="resolvedApp"
			:config="shipped"
			:canInstall="showInstall"
			:tr="shown" />

		<!-- `banner`: the connected register as board LpStore draws it, above the lenses. -->
		<section v-if="showsBanner"
			class="cn-store-page__banner"
			:class="`cn-store-page__banner--${bannerState}`"
			data-testid="store-banner">
			<template v-if="offline">
				<p class="cn-store-page__banner-text" data-testid="store-banner-not-connected">
					{{ t('nextcloud-vue', 'No register is connected, so the marketplace has nothing to show.') }}
				</p>
				<NcButton v-if="banner.settingsUrl"
					variant="secondary"
					:href="banner.settingsUrl"
					data-testid="store-banner-settings">
					{{ banner.settingsLabel ? shown(banner.settingsLabel) : t('nextcloud-vue', 'Connect a register') }}
				</NcButton>
			</template>
			<template v-else>
				<div class="cn-store-page__banner-main">
					<strong class="cn-store-page__banner-name" data-testid="store-banner-name">{{ registryName }}</strong>
					<span v-if="registryAddress" class="cn-store-page__banner-address" data-testid="store-banner-address">{{ registryAddress }}</span>
					<span v-if="checkedLabel" class="cn-store-page__banner-checked" data-testid="store-banner-checked">
						{{ t('nextcloud-vue', 'Last checked {when}', { when: checkedLabel }) }}
					</span>
				</div>
				<span class="cn-store-page__banner-state" data-testid="store-banner-state">
					{{ unreachable ? t('nextcloud-vue', 'Not reachable') : t('nextcloud-vue', 'Connected') }}
				</span>
			</template>
			<p v-if="!showInstall && !offline" class="cn-store-page__banner-note" data-testid="store-banner-note">
				{{ banner.installNote ? shown(banner.installNote) : t('nextcloud-vue', 'Only administrators install for the whole organisation.') }}
			</p>
		</section>

		<div v-if="isBoardLook && !showsPackages && !(showsBanner && offline)" class="cn-store-page__lens-row">
			<div
				class="cn-store-page__lenses"
				role="group"
				:aria-label="t('nextcloud-vue', 'Show')">
				<button
					v-for="option in lensOptions"
					:key="option.value"
					type="button"
					class="cn-store-page__lens"
					:class="{ 'cn-store-page__lens--active': option.value === lens }"
					:aria-pressed="option.value === lens ? 'true' : 'false'"
					:disabled="offline"
					:data-testid="`store-lens-${option.value}`"
					@click="lens = option.value">
					{{ option.label }}
					<span class="cn-store-page__lens-count">{{ option.count }}</span>
				</button>
			</div>
			<div class="cn-store-page__lens-search" role="search">
				<Magnify :size="18" class="cn-store-page__lens-search-icon" />
				<input
					v-model="query"
					type="search"
					class="cn-store-page__lens-search-input"
					:placeholder="t('nextcloud-vue', 'Search the marketplace')"
					:aria-label="t('nextcloud-vue', 'Search the marketplace')"
					:disabled="offline"
					data-testid="store-search"
					@input="onSearchInput">
			</div>
		</div>
		<div v-else-if="!isBoardLook && !showsPackages" class="cn-store-page__controls">
			<NcTextField
				v-model="query"
				:label="t('nextcloud-vue', 'Search the marketplace')"
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

		<!-- `targets`: where an install goes (a world, an administration); the
		     chosen id travels in the install body as `target`. -->
		<div v-if="!showsPackages && showInstall && targetOptions.length > 0"
			class="cn-store-page__target"
			data-testid="store-target">
			<NcSelect
				:inputLabel="resolvedTargetLabel"
				:options="targetOptions"
				:modelValue="selectedTarget"
				:clearable="false"
				label="label"
				@update:modelValue="(option) => targetId = option ? option.id : ''" />
		</div>

		<div v-if="!showsPackages" :class="{ 'cn-store-page__layout': isBoardLook }">
			<div class="cn-store-page__main">
				<NcLoadingIcon v-if="loading" :size="44" class="cn-store-page__loading" />

				<NcNoteCard
					v-else-if="offline && !showsBanner"
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
					v-else-if="visibleCards.length === 0 && !offline"
					:name="t('nextcloud-vue', 'Nothing matches that search')"
					:description="
						t('nextcloud-vue', 'Try a different term, or clear the kind filter.')
					" />

				<ul
					v-if="!loading && visibleCards.length > 0"
					class="cn-store-page__grid"
					:style="gridStyle"
					data-testid="store-results">
					<li
						v-for="card in pagedCards"
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
									<p v-if="cardInstalledIn(card)" class="cn-store-page__card-installed-in" data-testid="store-card-installed-in">
										{{ cardInstalledIn(card) }}
									</p>
									<span
										class="cn-store-page__card-state"
										:class="`cn-store-page__card-state--${cardState(card) || 'available'}`"
										data-testid="store-card-state">
										{{ cardStateLabel(card) }}
									</span>
								</div>
							</div>
							<p class="cn-store-page__card-description">
								{{ card.description }}
							</p>
							<div class="cn-store-page__card-footer" data-testid="store-card-footer">
								<span v-if="card.version" class="cn-store-page__card-version">
									{{ cardVersion(card) }}
								</span>
								<span v-if="cardCount(card.widgets) !== null" class="cn-store-page__card-meta" data-testid="store-card-widgets">
									{{ n('nextcloud-vue', '%n widget', '%n widgets', cardCount(card.widgets)) }}
								</span>
								<span v-if="cardCount(card.usage) !== null" class="cn-store-page__card-meta" data-testid="store-card-usage">
									{{ n('nextcloud-vue', 'Used by %n organisation', 'Used by %n organisations', cardCount(card.usage)) }}
								</span>
								<NcButton
									v-if="cardAction(card)"
									variant="secondary"
									class="cn-store-page__card-action"
									:class="{ 'cn-store-page__card-action--soft': cardAction(card).id !== 'open' }"
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
							<p v-if="cardInstalledIn(card)" class="cn-store-page__card-installed-in" data-testid="store-card-installed-in">
								{{ cardInstalledIn(card) }}
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

				<!-- `pageSize`: the board pages its cards (8 at a time on LpStore). -->
				<nav v-if="!loading && pageCount > 1"
					class="cn-store-page__pager"
					:aria-label="t('nextcloud-vue', 'Pages')"
					data-testid="store-pager">
					<NcButton variant="tertiary"
						:disabled="currentPage <= 1"
						data-testid="store-pager-previous"
						@click="pageIndex = currentPage - 1">
						{{ t('nextcloud-vue', 'Previous') }}
					</NcButton>
					<span class="cn-store-page__pager-label" data-testid="store-pager-label">
						{{ t('nextcloud-vue', 'Page {page} of {pages}', { page: currentPage, pages: pageCount }) }}
					</span>
					<NcButton variant="tertiary"
						:disabled="currentPage >= pageCount"
						data-testid="store-pager-next"
						@click="pageIndex = currentPage + 1">
						{{ t('nextcloud-vue', 'Next') }}
					</NcButton>
				</nav>

				<div
					v-if="!loading && visibleBuiltIn.length > 0"
					class="cn-store-page__builtin">
					<h3 class="cn-store-page__builtin-title">
						{{ builtInHeading }}
					</h3>
					<ul class="cn-store-page__grid" :style="gridStyle" data-testid="store-builtin">
						<li
							v-for="item in visibleBuiltIn"
							:key="item.slug"
							class="cn-store-page__card">
							<h4 class="cn-store-page__card-title" :lang="langOf(item.title)">
								{{ shown(item.title) || item.slug }}
							</h4>
							<p class="cn-store-page__card-description" :lang="langOf(item.description)">
								{{ shown(item.description) }}
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
			<!-- Board look: what is installed, the update check, what ships with the app. -->
			<aside v-if="isBoardLook && !loading && !offline && !unreachable" class="cn-store-page__aside">
				<section class="cn-store-page__side-card" data-testid="store-installed">
					<h2 class="cn-store-page__side-title">
						{{ t('nextcloud-vue', 'Installed from this marketplace') }}
					</h2>
					<p v-if="installedCards.length === 0" class="cn-store-page__side-note">
						{{ t('nextcloud-vue', 'Nothing from this marketplace is installed yet.') }}
					</p>
					<ul v-else class="cn-store-page__installed">
						<li v-for="card in installedCards" :key="card.slug">
							<span class="cn-store-page__installed-title">{{ card.title || card.slug }}</span>
							<span class="cn-store-page__installed-version">{{ card.installedVersion || card.version }}</span>
							<span
								v-if="card.updateAvailable === true"
								class="cn-store-page__card-state cn-store-page__card-state--update"
								data-testid="store-installed-update">
								{{ t('nextcloud-vue', 'Update') }}
							</span>
						</li>
					</ul>
				</section>
				<section class="cn-store-page__side-card" data-testid="store-updates">
					<h2 class="cn-store-page__side-title">
						{{ t('nextcloud-vue', 'Updates') }}
					</h2>
					<p v-if="checkedLabel" class="cn-store-page__side-meta">
						<ClockOutline :size="16" />
						{{ t('nextcloud-vue', 'Last checked {when}', { when: checkedLabel }) }}
					</p>
					<p class="cn-store-page__side-note" data-testid="store-updates-count">
						{{ updateCount === 0
							? t('nextcloud-vue', 'Everything is up to date.')
							: n('nextcloud-vue', '%n update is ready. An update keeps your own changes.', '%n updates are ready. An update keeps your own changes.', updateCount) }}
					</p>
					<NcButton
						variant="secondary"
						wide
						:disabled="loading"
						data-testid="store-check-now"
						@click="search">
						<template #icon>
							<Refresh :size="18" />
						</template>
						{{ t('nextcloud-vue', 'Check now') }}
					</NcButton>
				</section>
				<section v-if="includedLine" class="cn-store-page__side-card" data-testid="store-included">
					<h2 class="cn-store-page__side-title">
						{{ builtInHeading }}
					</h2>
					<p class="cn-store-page__side-text">
						{{ includedLine }}
					</p>
					<p class="cn-store-page__side-note">
						{{ t('nextcloud-vue', 'Only administrators install. An administrator connects the registry under Administration settings.') }}
					</p>
				</section>
			</aside>
		</div>
		<CnStorePublishDialog
			v-if="publishOpen"
			:app="resolvedApp"
			:kinds="effectiveKinds"
			:kindLabel="kindLabel"
			@close="publishOpen = false"
			@published="onPublished" />
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
	NcSelect,
	NcTextField,
} from '@nextcloud/vue'
import ClockOutline from 'vue-material-design-icons/ClockOutline.vue'
import Magnify from 'vue-material-design-icons/Magnify.vue'
import PackageVariantClosed from 'vue-material-design-icons/PackageVariantClosed.vue'
import Refresh from 'vue-material-design-icons/Refresh.vue'
import Upload from 'vue-material-design-icons/Upload.vue'
import CnBuildiqEditButton from '../CnBuildiqEditButton/CnBuildiqEditButton.vue'
import CnPageHeader from '../CnPageHeader/CnPageHeader.vue'
import CnStorePackages from './CnStorePackages.vue'
import CnStorePublishDialog from './CnStorePublishDialog.vue'
import { normalizeLook } from '../../composables/useLook.js'
import { labelLang } from '../../utils/manifestTranslate.js'
import { isOptionsFrom, loadOptionsFrom } from '../../utils/optionsFrom.js'
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

/**
 * The engine's `installed` answer as a map of slug to target ids.
 *
 * Anything else reads as nothing installed: a list, a string, or an entry
 * whose targets are not a list of strings.
 *
 * @param {unknown} value The `installed` key of a search response.
 *
 * @return {{[slug: string]: string[]}}
 * @spec openspec/changes/store-installed-in/specs/store-page/spec.md#requirement-a-card-says-where-its-item-is-installed
 */
function installedMap(value) {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) {
		return {}
	}
	const map = {}
	for (const [slug, targets] of Object.entries(value)) {
		if (Array.isArray(targets)) {
			map[slug] = targets.filter((id) => typeof id === 'string')
		}
	}
	return map
}

export default {
	name: 'CnStorePage',

	components: {
		CnStorePackages,
		ClockOutline,
		CnBuildiqEditButton,
		CnIcon,
		CnPageHeader,
		CnStorePublishDialog,
		Magnify,
		PackageVariantClosed,
		Refresh,
		Upload,
		NcButton,
		NcEmptyContent,
		NcLoadingIcon,
		NcNoteCard,
		NcSelect,
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
		 * Where an install can go (`config.targets`): a list of `{ id, label }`,
		 * or a source in the `optionsFrom` shape (`{ register, schema,
		 * valueField?, labelField? }` or `{ url, ... }`), such as the app's
		 * worlds. With targets the page shows a picker, the first target
		 * chosen, and the install body carries `{ target: <id> }`. Without
		 * any the install is sent as before.
		 *
		 * @spec openspec/changes/store-install-target/specs/store-page/spec.md#requirement-an-install-can-go-into-a-chosen-target
		 * @type {Array<{id: string, label: string}>|object|null}
		 */
		targets: {
			type: [Array, Object],
			default: null,
		},

		/** The picker's label (`config.targetLabel`), through the app's translate; default "Install into". */
		targetLabel: {
			type: String,
			default: '',
		},

		/**
		 * The app's shipped packages (`config.shipped`), drawn under the board
		 * look while no registry is configured, in place of `builtIn`:
		 * `{ title, subtitle?, parts?, notice?: { title, text }, crumbs?, buttons?, aside? }`.
		 * The list reads `/api/store/packages`.
		 *
		 * @spec openspec/changes/store-shipped-packages/specs/store-shipped-packages/spec.md#requirement-without-a-registry-the-board-store-lists-the-shipped-packages
		 * @type {object|null}
		 */
		shipped: {
			type: Object,
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
		 * Extra lens chips under the board look, one per item kind:
		 * `[{ kind: 'connector', label: 'Connectors' }]` (board PqStore). The
		 * label goes through the app's translate.
		 */
		kindLenses: {
			type: Array,
			default: () => [],
		},

		/**
		 * One lens chip per category the served items carry (`card.category`,
		 * a string or a list of strings), after All, Installed and Updates
		 * available, each with its count (board LpStore). Off by default.
		 *
		 * @spec openspec/changes/store-page-register-banner-categories-paging/specs/store-page/spec.md#requirement-the-board-store-offers-a-lens-per-category
		 */
		categoryLenses: {
			type: Boolean,
			default: false,
		},

		/**
		 * Cards per page under the board look; 0 (the default) shows them all.
		 * A pager under the grid moves between the pages.
		 *
		 * @spec openspec/changes/store-page-register-banner-categories-paging/specs/store-page/spec.md#requirement-the-board-store-pages-its-cards
		 */
		pageSize: {
			type: Number,
			default: 0,
		},

		/**
		 * The register banner above the lenses (board LpStore):
		 * `{ settingsUrl?, settingsLabel?, installNote? }`. It names the
		 * register the items response carries (`registry: { name, url }`), its
		 * address, when it was last checked and whether it answered, and tells
		 * whoever may not install that only administrators do. Without a
		 * register it says none is connected and links to `settingsUrl`.
		 * Labels go through the app's translate. Null (the default) draws none.
		 *
		 * @spec openspec/changes/store-page-register-banner-categories-paging/specs/store-page/spec.md#requirement-the-board-store-names-the-connected-register
		 */
		banner: {
			type: Object,
			default: null,
		},

		/**
		 * The app accepts a publish at `/api/store/publish` (and lists what may
		 * be published at `/api/store/publishable`): Publish opens the publish
		 * dialog instead of following `publishRoute`.
		 */
		publishable: {
			type: Boolean,
			default: false,
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
			// Where each item is installed, as the ENGINE served it: item
			// slug to the targets it went into ('' for an install without
			// target). Empty until the first response, or from an engine that
			// does not report it.
			servedInstalled: {},
			// The board look's lens: all, installed, updates or an item kind.
			lens: 'all',
			publishOpen: false,
			// The targets read from a `targets` source, and the chosen one.
			sourcedTargets: [],
			targetId: '',
			// When the registry last answered (`checkedAt` from the engine).
			checkedAt: '',
			// The register the items response names (`registry`), for the banner.
			registry: null,
			// The page of cards shown when `pageSize` is set, 1-based.
			pageIndex: 1,
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
		 * Whether the shipped packages stand in for the marketplace.
		 *
		 * @spec openspec/changes/store-shipped-packages/specs/store-shipped-packages/spec.md#requirement-without-a-registry-the-board-store-lists-the-shipped-packages
		 * @return {boolean}
		 */
		showsPackages() {
			return this.isBoardLook && this.shipped !== null && !this.loading && this.offline
		},

		/**
		 * The header links of the shipped packages view.
		 *
		 * @spec openspec/changes/store-shipped-packages/specs/store-shipped-packages/spec.md#requirement-without-a-registry-the-board-store-lists-the-shipped-packages
		 * @return {Array<{label: string, href: string}>}
		 */
		shippedButtons() {
			return Array.isArray(this.shipped?.buttons) ? this.shipped.buttons : []
		},

		/**
		 * The board track for the cards: `minmax(var(--cn-card-grid-min,
		 * 260px), 1fr)` and `var(--cn-card-grid-gap, 16px)`. Empty without
		 * the look.
		 *
		 * @spec openspec/changes/screens-card-parity/specs/card-board-look/spec.md#requirement-the-card-grid-takes-the-board-track
		 * @return {object}
		 */
		gridStyle() {
			if (!this.isBoardLook) {
				return {}
			}
			return {
				gridTemplateColumns: 'repeat(auto-fill, minmax(var(--cn-card-grid-min, 260px), 1fr))',
				gap: 'var(--cn-card-grid-gap, 16px)',
			}
		},

		/**
		 * The page title, preferring the flattened prop over the page object.
		 *
		 * @return {string} The heading to render.
		 */
		resolvedTitle() {
			return this.title || this.page?.title || t('nextcloud-vue', 'Marketplace')
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
		 * The targets an install can go into, `[{ id, label }]`.
		 *
		 * @return {Array<{id: string, label: string}>}
		 * @spec openspec/changes/store-install-target/specs/store-page/spec.md#requirement-an-install-can-go-into-a-chosen-target
		 */
		targetOptions() {
			if (Array.isArray(this.targets)) {
				return this.targets
					.filter((target) => target && (typeof target.id === 'string' || typeof target.id === 'number') && String(target.id) !== '')
					.map((target) => ({ id: String(target.id), label: this.shown(target.label) || String(target.id) }))
			}
			return this.sourcedTargets
		},

		/** @return {{id: string, label: string}|null} The chosen target, the first by default. */
		selectedTarget() {
			return this.targetOptions.find((target) => target.id === this.targetId) || this.targetOptions[0] || null
		},

		/** @return {string} The picker's label. */
		resolvedTargetLabel() {
			return this.targetLabel ? this.shown(this.targetLabel) : t('nextcloud-vue', 'Install into')
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
			if (this.publishTarget === null && this.publishable !== true) {
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
		/**
		 * The cards the chosen lens shows (board look); every card otherwise.
		 *
		 * @return {Array<object>}
		 */
		visibleCards() {
			if (!this.isBoardLook || this.lens === 'all') {
				return this.cards
			}
			if (this.lens === 'installed') {
				return this.installedCards
			}
			if (this.lens === 'updates') {
				return this.cards.filter((card) => card.updateAvailable === true)
			}
			if (this.lens.startsWith('category:')) {
				const category = this.lens.slice('category:'.length)
				return this.cards.filter((card) => this.categoriesOf(card).includes(category))
			}
			return this.cards.filter((card) => card.kind === this.lens)
		},

		/**
		 * The categories the served items carry, sorted, each with its count.
		 *
		 * @spec openspec/changes/store-page-register-banner-categories-paging/specs/store-page/spec.md#requirement-the-board-store-offers-a-lens-per-category
		 * @return {Array<{category: string, count: number}>}
		 */
		categoryCounts() {
			const counts = new Map()
			for (const card of this.cards) {
				for (const category of this.categoriesOf(card)) {
					counts.set(category, (counts.get(category) || 0) + 1)
				}
			}
			return [...counts.entries()]
				.sort((a, b) => a[0].localeCompare(b[0]))
				.map(([category, count]) => ({ category, count }))
		},

		/**
		 * The number of pages, 1 without `pageSize`.
		 *
		 * @spec openspec/changes/store-page-register-banner-categories-paging/specs/store-page/spec.md#requirement-the-board-store-pages-its-cards
		 * @return {number}
		 */
		pageCount() {
			if (!this.isBoardLook || !(this.pageSize > 0)) {
				return 1
			}
			return Math.max(1, Math.ceil(this.visibleCards.length / this.pageSize))
		},

		/**
		 * The page shown, kept inside 1..pageCount.
		 *
		 * @spec openspec/changes/store-page-register-banner-categories-paging/specs/store-page/spec.md#requirement-the-board-store-pages-its-cards
		 * @return {number}
		 */
		currentPage() {
			return Math.min(Math.max(1, this.pageIndex), this.pageCount)
		},

		/**
		 * The cards of the current page; every visible card without `pageSize`.
		 *
		 * @spec openspec/changes/store-page-register-banner-categories-paging/specs/store-page/spec.md#requirement-the-board-store-pages-its-cards
		 * @return {Array<object>}
		 */
		pagedCards() {
			if (!this.isBoardLook || !(this.pageSize > 0)) {
				return this.visibleCards
			}
			const start = (this.currentPage - 1) * this.pageSize
			return this.visibleCards.slice(start, start + this.pageSize)
		},

		/**
		 * Whether the register banner shows: the board look, a `banner` config,
		 * the first answer in, and no shipped packages standing in.
		 *
		 * @spec openspec/changes/store-page-register-banner-categories-paging/specs/store-page/spec.md#requirement-the-board-store-names-the-connected-register
		 * @return {boolean}
		 */
		showsBanner() {
			return this.isBoardLook && this.banner !== null && typeof this.banner === 'object' && !this.loading && !this.showsPackages
		},

		/**
		 * The banner's state: `not-connected`, `unreachable` or `connected`.
		 *
		 * @spec openspec/changes/store-page-register-banner-categories-paging/specs/store-page/spec.md#requirement-the-board-store-names-the-connected-register
		 * @return {string}
		 */
		bannerState() {
			if (this.offline) {
				return 'not-connected'
			}
			return this.unreachable ? 'unreachable' : 'connected'
		},

		/**
		 * The register's name: the one the response carries, else its host.
		 *
		 * @spec openspec/changes/store-page-register-banner-categories-paging/specs/store-page/spec.md#requirement-the-board-store-names-the-connected-register
		 * @return {string}
		 */
		registryName() {
			const name = this.registry?.name
			if (typeof name === 'string' && name.trim() !== '') {
				return name.trim()
			}
			return this.registryAddress || t('nextcloud-vue', 'Register')
		},

		/**
		 * The register's address without its scheme, query or trailing slash.
		 *
		 * @spec openspec/changes/store-page-register-banner-categories-paging/specs/store-page/spec.md#requirement-the-board-store-names-the-connected-register
		 * @return {string}
		 */
		registryAddress() {
			const url = this.registry?.url
			if (typeof url !== 'string' || url.trim() === '') {
				return ''
			}
			return url.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/[?#].*$/, '').replace(/\/+$/, '')
		},

		installedCards() {
			return this.cards.filter((card) => card.installed === true)
		},

		updateCount() {
			return this.cards.filter((card) => card.updateAvailable === true).length
		},

		/**
		 * The lens chips with their counts.
		 *
		 * @return {Array<{value: string, label: string, count: number}>}
		 */
		lensOptions() {
			return [
				{ value: 'all', label: t('nextcloud-vue', 'All items'), count: this.cards.length },
				{ value: 'installed', label: t('nextcloud-vue', 'Installed'), count: this.installedCards.length },
				{ value: 'updates', label: t('nextcloud-vue', 'Updates available'), count: this.updateCount },
				...this.kindLenses.map((entry) => ({
					value: entry.kind,
					label: this.shown(entry.label),
					count: this.cards.filter((card) => card.kind === entry.kind).length,
				})),
				...(this.categoryLenses
					? this.categoryCounts.map((entry) => ({
							value: `category:${entry.category}`,
							label: this.shown(entry.category),
							count: entry.count,
						}))
					: []),
			]
		},

		/**
		 * The description, with `{count}` filled by the number of items the
		 * registry holds.
		 *
		 * @return {string}
		 */
		boardDescription() {
			return this.shown(this.resolvedDescription).replace('{count}', String(this.cards.length))
		},

		checkedLabel() {
			if (!this.checkedAt) {
				return ''
			}
			const date = new Date(this.checkedAt)
			return isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
		},

		/**
		 * "A, B and C ship with {app}. They show here when no registry is
		 * connected.", or '' when the app ships nothing.
		 *
		 * @return {string}
		 */
		includedLine() {
			const titles = this.effectiveBuiltIn.map((item) => this.shown(item.title) || item.slug).filter(Boolean)
			if (titles.length === 0) {
				return ''
			}
			const list = titles.length === 1
				? titles[0]
				: t('nextcloud-vue', '{list} and {last}', { list: titles.slice(0, -1).join(', '), last: titles[titles.length - 1] })
			return t('nextcloud-vue', '{items} ship with the app. They show here when no registry is connected.', { items: list })
		},

		builtInHeading() {
			return this.resolvedApp
				? t('nextcloud-vue', 'Included with {app}', { app: this.resolvedApp })
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
				'No marketplace registry is configured, so nothing was requested from the network. An administrator can connect one under Administration settings.',
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
			const base = t('nextcloud-vue', 'The marketplace registry did not answer.')

			return this.builtIn.length > 0
				? `${base} ${t('nextcloud-vue', 'The items below ship with this app.')}`
				: base
		},
	},

	watch: {
		/**
		 * Another lens starts at the first page.
		 *
		 * @spec openspec/changes/store-page-register-banner-categories-paging/specs/store-page/spec.md#requirement-the-board-store-pages-its-cards
		 * @return {void}
		 */
		lens() {
			this.pageIndex = 1
		},

		/**
		 * A new answer (a search, Check now) starts at the first page.
		 *
		 * @spec openspec/changes/store-page-register-banner-categories-paging/specs/store-page/spec.md#requirement-the-board-store-pages-its-cards
		 * @return {void}
		 */
		cards() {
			this.pageIndex = 1
		},
	},

	mounted() {
		this.search()
		this.loadTargets()
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
		 * The "<kind> · <publisher>" line of a catalogue card.
		 *
		 * @param {object} card The card.
		 * @return {string} The line, or ''.
		 */
		/**
		 * The footer version: the installed one and the newer one when an
		 * update is out, else the registry's.
		 *
		 * @param {object} card The store item.
		 * @return {string}
		 */
		cardVersion(card) {
			if (card.updateAvailable === true && card.installedVersion) {
				return t('nextcloud-vue', 'Version {version}, {latest} is out', { version: card.installedVersion, latest: card.version })
			}
			return t('nextcloud-vue', 'Version {version}', { version: card.version })
		},

		n,

		/**
		 * The categories of one item: `category` as a string or a list.
		 *
		 * @spec openspec/changes/store-page-register-banner-categories-paging/specs/store-page/spec.md#requirement-the-board-store-offers-a-lens-per-category
		 * @param {object} card The store item.
		 * @return {Array<string>}
		 */
		categoriesOf(card) {
			const raw = Array.isArray(card?.category) ? card.category : [card?.category]
			return [...new Set(raw.filter((value) => typeof value === 'string' && value.trim() !== '').map((value) => value.trim()))]
		},

		/**
		 * A card's count field (`widgets`, `usage`) as a whole number, or null
		 * when the register does not report it.
		 *
		 * @spec openspec/changes/store-page-register-banner-categories-paging/specs/store-page/spec.md#requirement-a-board-store-card-shows-its-widgets-and-its-usage
		 * @param {string|number|null|undefined} value The raw value.
		 * @return {number|null}
		 */
		cardCount(value) {
			const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
			return typeof number === 'number' && Number.isFinite(number) && number >= 0 ? Math.floor(number) : null
		},

		onPublishClick() {
			if (this.publishable) {
				this.publishOpen = true
			}
		},

		onPublished() {
			this.publishOpen = false
			this.search()
		},

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
		 * The words on a catalogue card's state pill: Update, Installed, or
		 * Available for an item that is not installed.
		 *
		 * @param {object} card The card.
		 * @return {string} The label.
		 * @spec openspec/changes/store-page-board-as-drawn/specs/store-page/spec.md#requirement-a-board-look-store-card-shows-its-state-and-its-action-as-drawn
		 */
		cardStateLabel(card) {
			const state = this.cardState(card)
			if (state === 'update') {
				return t('nextcloud-vue', 'Update')
			}
			return state === 'installed' ? t('nextcloud-vue', 'Installed') : t('nextcloud-vue', 'Available')
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
		 * A manifest label through the injected lookup, or as written. The
		 * built-in items' titles and descriptions read through it too.
		 *
		 * @spec openspec/changes/cell-config-growth/specs/cell-config-growth/spec.md#requirement-the-stores-own-items-read-in-the-users-language
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
				if (this.kind) {
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
				this.servedInstalled = installedMap(body.installed)
				this.checkedAt = typeof body.checkedAt === 'string' ? body.checkedAt : ''
				// The register the banner names; never its token (the app sends none).
				this.registry = body.registry !== null && typeof body.registry === 'object' ? body.registry : null
			} catch {
				this.outcome = 'store_unreachable'
				this.cards = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * Read the targets of a `targets` source once; a failed read offers none.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/store-install-target/specs/store-page/spec.md#requirement-an-install-can-go-into-a-chosen-target
		 */
		async loadTargets() {
			if (!isOptionsFrom(this.targets)) {
				return
			}
			try {
				const options = await loadOptionsFrom(this.targets)
				this.sourcedTargets = options.map((option) => ({ id: String(option.id), label: option.label }))
			} catch {
				this.sourcedTargets = []
			}
		},

		/**
		 * The "Installed in" line of a card: the labels of the targets the
		 * engine reports the item installed into. Empty when it is installed
		 * into none, or only without a target.
		 *
		 * @param {{slug: string}} card The card.
		 *
		 * @return {string} The line, or an empty string.
		 * @spec openspec/changes/store-installed-in/specs/store-page/spec.md#requirement-a-card-says-where-its-item-is-installed
		 */
		cardInstalledIn(card) {
			const targets = (this.servedInstalled[card?.slug] ?? []).filter((id) => id !== '')
			if (targets.length === 0) {
				return ''
			}
			const labels = targets.map((id) => this.targetOptions.find((option) => option.id === id)?.label || id)
			return t('nextcloud-vue', 'Installed in {targets}', { targets: labels.join(', ') })
		},

		/**
		 * Remember a whole install, so its card says where it went at once.
		 *
		 * @param {string} slug The installed item.
		 * @param {string} target The target it went into, '' for none.
		 *
		 * @return {void}
		 * @spec openspec/changes/store-installed-in/specs/store-page/spec.md#requirement-a-card-says-where-its-item-is-installed
		 */
		rememberInstall(slug, target) {
			const targets = this.servedInstalled[slug] ?? []
			if (!targets.includes(target)) {
				this.servedInstalled = { ...this.servedInstalled, [slug]: [...targets, target] }
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
			const target = this.selectedTarget

			try {
				const response = await fetch(
					generateUrl(`/apps/${this.resolvedApp}/api/store/items/${encodeURIComponent(card.slug)}/install`),
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							requesttoken: window.OC?.requestToken,
						},
						...(target ? { body: JSON.stringify({ target: target.id }) } : {}),
					},
				)
				const body = await response.json()

				if (response.ok !== true) {
					showError(body.message
						?? t('nextcloud-vue', 'The item could not be installed.'))
					return
				}

				if (body.success === true) {
					this.rememberInstall(card.slug, target ? target.id : '')
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
.cn-store-page__card-installed-in {
	margin: 2px 0 0;
	font-size: var(--cn-font-size-small, 13px);
	color: var(--color-text-maxcontrast);
}

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

.cn-store-page__target {
	max-width: 360px;
	margin-bottom: 12px;
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

/* Board LpStore: the widget count and the usage sit beside the version. */
.cn-store-page__card-meta {
	color: var(--color-text-maxcontrast);
	font-size: 0.85rem;
}

/* Board LpStore: the connected register above the lenses. */
.cn-store-page__banner {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px 16px;
	margin: 0 0 16px;
	padding: 12px 16px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 12px);
	background: var(--color-main-background);
}

.cn-store-page__banner-main {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 4px 12px;
	flex: 1 1 auto;
	min-width: 0;
}

.cn-store-page__banner-address,
.cn-store-page__banner-checked,
.cn-store-page__banner-note {
	color: var(--color-text-maxcontrast);
	font-size: 0.9rem;
}

.cn-store-page__banner-address {
	overflow-wrap: anywhere;
}

.cn-store-page__banner-note {
	flex-basis: 100%;
	margin: 0;
}

.cn-store-page__banner-text {
	flex: 1 1 auto;
	margin: 0;
}

.cn-store-page__banner-state {
	padding: 2px 10px;
	border-radius: var(--border-radius-pill, 999px);
	font-size: 0.85rem;
	background: var(--color-success-hover, var(--color-background-dark));
	color: var(--color-success-text, var(--color-main-text));
}

.cn-store-page__banner--unreachable .cn-store-page__banner-state {
	background: var(--color-warning-hover, var(--color-background-dark));
	color: var(--color-warning-text, var(--color-main-text));
}

/* The pager under the cards. */
.cn-store-page__pager {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12px;
	margin-top: 16px;
}

.cn-store-page__pager-label {
	color: var(--color-text-maxcontrast);
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

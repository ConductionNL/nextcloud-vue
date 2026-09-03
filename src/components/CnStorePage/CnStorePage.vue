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

  A LOCAL-ONLY CARD GRID IS NOT A STORE (ADR-080 Decision 4). With no registry
  configured the engine answers `not_configured` WITHOUT a network call, and
  this page then renders `builtIn`. That fallback is the only reason a surface
  may carry the word Store at all.
-->
<template>
	<div class="cn-store-page" data-testid="store-page">
		<div class="cn-store-page__header">
			<h2 class="cn-store-page__title">
				{{ resolvedTitle }}
			</h2>
			<p v-if="resolvedDescription" class="cn-store-page__intro">
				{{ resolvedDescription }}
			</p>
		</div>

		<div class="cn-store-page__controls">
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
					@click="selectKind(option.value)">
					{{ option.label }}
				</NcButton>
			</div>
		</div>

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
			v-else-if="cards.length === 0"
			:name="t('nextcloud-vue', 'Nothing matches that search')"
			:description="
				t('nextcloud-vue', 'Try a different term, or clear the kind filter.')
			" />

		<ul
			v-if="!loading && cards.length > 0"
			class="cn-store-page__grid"
			data-testid="store-results">
			<li v-for="card in cards" :key="card.slug" class="cn-store-page__card">
				<h3 class="cn-store-page__card-title">
					{{ card.title || card.slug }}
				</h3>
				<p v-if="card.kind" class="cn-store-page__card-kind">
					{{ card.kind }}
				</p>
				<p class="cn-store-page__card-description">
					{{ card.description }}
				</p>
				<div class="cn-store-page__card-footer">
					<span v-if="card.version" class="cn-store-page__card-version">
						{{ card.version }}
					</span>
					<NcButton
						v-if="canInstall"
						variant="primary"
						:disabled="installing === card.slug"
						@click="install(card)">
						{{
							installing === card.slug
								? t('nextcloud-vue', 'Installing…')
								: t('nextcloud-vue', 'Install')
						}}
					</NcButton>
				</div>
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
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import { showError, showSuccess } from '@nextcloud/dialogs'
import { t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import {
	NcButton,
	NcEmptyContent,
	NcLoadingIcon,
	NcNoteCard,
	NcTextField,
} from '@nextcloud/vue'

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
		NcButton,
		NcEmptyContent,
		NcLoadingIcon,
		NcNoteCard,
		NcTextField,
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
		}
	},

	computed: {
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
		 * Only an administrator may install: the components written are the
		 * shape of the work every handler then operates against. The server
		 * enforces this too; hiding the button keeps a non-admin from
		 * discovering it as a 403.
		 *
		 * @return {boolean} True when the current user is an administrator.
		 */
		canInstall() {
			return getCurrentUser()?.isAdmin === true
		},

		/**
		 * The kind quick-filters, with an "all" entry first.
		 *
		 * @return {Array<{value: string, label: string}>} The filter options.
		 */
		kindOptions() {
			return [
				{ value: '', label: t('nextcloud-vue', 'All kinds') },
				...this.effectiveKinds.map((value) => ({ value, label: value })),
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
		 * The app's own items, shown only when the remote list is not the
		 * primary surface. Not a network call, and not a Store on their own.
		 *
		 * @return {Array<object>} The built-in items to render.
		 */
		visibleBuiltIn() {
			if (this.offline === false && this.unreachable === false) {
				return []
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
					generateUrl(
						`/apps/${this.resolvedApp}/api/store/items${suffix}`,
					),
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
					generateUrl(
						`/apps/${this.resolvedApp}/api/store/items/${encodeURIComponent(card.slug)}/install`,
					),
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
					showError(
						body.message
							?? t('nextcloud-vue', 'The item could not be installed.'),
					)
					return
				}

				const refused = (body.components ?? []).filter(
					(c) => c.status !== 'installed',
				)
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

.cn-store-page__title {
	margin: 0 0 4px;
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

.cn-store-page__builtin-title {
	margin: 24px 0 0;
}
</style>

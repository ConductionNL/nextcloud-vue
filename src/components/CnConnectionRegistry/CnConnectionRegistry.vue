<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-connection-registry" data-testid="cn-connection-registry">
		<div class="cn-connection-registry__header">
			<div class="cn-connection-registry__heading">
				<h2 v-if="showTitle" class="cn-connection-registry__title">
					{{ resolvedTitle }}
				</h2>
				<p v-if="!loading && !error" class="cn-connection-registry__summary" data-testid="cn-connection-registry-summary">
					{{ summary }}
				</p>
			</div>
			<div v-if="$slots['header-actions'] || resolvedAddUrl" class="cn-connection-registry__actions">
				<slot name="header-actions" />
				<NcButton
					v-if="resolvedAddUrl"
					variant="primary"
					:href="resolveUrl(resolvedAddUrl)"
					data-testid="cn-connection-registry-add">
					<template #icon>
						<Plus :size="20" />
					</template>
					{{ resolvedAddLabel }}
				</NcButton>
			</div>
		</div>

		<div class="cn-connection-registry__toolbar">
			<div
				class="cn-connection-registry__chips"
				role="group"
				:aria-label="t('nextcloud-vue', 'Status')">
				<button
					v-for="chip in chips"
					:key="chip.key"
					type="button"
					class="cn-connection-registry__chip"
					:class="{ 'cn-connection-registry__chip--active': chip.key === activeStatus }"
					:aria-pressed="String(chip.key === activeStatus)"
					data-testid="cn-connection-registry-chip"
					:data-status="chip.key"
					@click="activeStatus = chip.key">
					{{ chip.label }}
					<span class="cn-connection-registry__chip-count">{{ chip.count }}</span>
				</button>
			</div>
			<div class="cn-connection-registry__search" role="search">
				<NcTextField
					v-model="search"
					:label="t('nextcloud-vue', 'Filter connections')"
					:labelOutside="true"
					:placeholder="t('nextcloud-vue', 'Filter connections')"
					type="search"
					:showTrailingButton="search !== ''"
					:trailingButtonLabel="t('nextcloud-vue', 'Clear filter')"
					@trailingButtonClick="search = ''">
					<template #icon>
						<Magnify :size="20" />
					</template>
				</NcTextField>
			</div>
		</div>

		<div v-if="loading" class="cn-connection-registry__state">
			<NcLoadingIcon :size="32" />
		</div>
		<NcNoteCard v-else-if="error" type="error" data-testid="cn-connection-registry-error">
			{{ error }}
		</NcNoteCard>

		<div v-else class="cn-connection-registry__body">
			<div class="cn-connection-registry__cards">
				<p v-if="visibleConnections.length === 0" class="cn-connection-registry__empty" data-testid="cn-connection-registry-empty">
					{{ connections.length === 0 ? t('nextcloud-vue', 'This app declares no connections.') : t('nextcloud-vue', 'No connection matches this filter.') }}
				</p>
				<article
					v-for="connection in visibleConnections"
					:key="connection.id"
					class="cn-connection-registry__card"
					data-testid="cn-connection-card"
					:aria-labelledby="headingId(connection)">
					<div class="cn-connection-registry__card-head">
						<span class="cn-connection-registry__card-icon" aria-hidden="true">
							<CnIcon :name="connection.icon" :size="20" />
						</span>
						<div class="cn-connection-registry__card-title-area">
							<h3 :id="headingId(connection)" class="cn-connection-registry__card-title">
								{{ connection.title }}
							</h3>
							<span class="cn-connection-registry__card-meta" data-testid="cn-connection-card-meta">{{ connection.meta }}</span>
						</div>
						<CnStatusBadge
							class="cn-connection-registry__card-status"
							:label="connection.statusLabel"
							:variant="connection.statusVariant"
							data-testid="cn-connection-card-status" />
					</div>
					<p v-if="connection.description" class="cn-connection-registry__card-description">
						{{ connection.description }}
					</p>
					<p v-if="connection.statusMessage" class="cn-connection-registry__card-message">
						{{ connection.statusMessage }}
					</p>
					<div class="cn-connection-registry__card-footer">
						<NcButton
							v-if="connection.settingsUrl"
							variant="secondary"
							:href="connection.settingsUrl"
							:aria-label="connection.actionAriaLabel"
							data-testid="cn-connection-card-action">
							{{ connection.actionLabel }}
						</NcButton>
						<span v-else class="cn-connection-registry__card-no-settings">
							{{ t('nextcloud-vue', 'No settings screen yet') }}
						</span>
					</div>
				</article>
			</div>

			<aside class="cn-connection-registry__aside" :aria-label="t('nextcloud-vue', 'About these connections')">
				<section class="cn-connection-registry__aside-card" data-testid="cn-connection-registry-attention">
					<h3 class="cn-connection-registry__aside-title">
						{{ t('nextcloud-vue', 'Needs attention') }}
					</h3>
					<ul v-if="attention.length > 0" class="cn-connection-registry__attention">
						<li v-for="connection in attention" :key="connection.id">
							<span class="cn-connection-registry__attention-head">
								<span class="cn-connection-registry__attention-name">{{ connection.title }}</span>
								<CnStatusBadge :label="connection.statusLabel" :variant="connection.statusVariant" />
							</span>
							<span v-if="connection.statusMessage" class="cn-connection-registry__aside-text">{{ connection.statusMessage }}</span>
						</li>
					</ul>
					<p v-else class="cn-connection-registry__aside-text">
						{{ t('nextcloud-vue', 'Nothing needs attention.') }}
					</p>
				</section>
				<section class="cn-connection-registry__aside-card" data-testid="cn-connection-registry-checked">
					<h3 class="cn-connection-registry__aside-title">
						{{ t('nextcloud-vue', 'Checked by integriq') }}
					</h3>
					<p class="cn-connection-registry__aside-text cn-connection-registry__aside-text--icon">
						<ClockOutline :size="16" aria-hidden="true" />
						{{ lastCheckText }}
					</p>
					<p class="cn-connection-registry__aside-text">
						{{ t('nextcloud-vue', 'integriq tests every connection and sets its status. This app only declares which connections it uses.') }}
					</p>
					<a v-if="config.integriqUrl" class="cn-connection-registry__aside-link" :href="resolveUrl(config.integriqUrl)">
						{{ t('nextcloud-vue', 'Open integriq') }}
					</a>
				</section>
				<section class="cn-connection-registry__aside-card" data-testid="cn-connection-registry-add-help">
					<h3 class="cn-connection-registry__aside-title">
						{{ t('nextcloud-vue', 'Add a connection') }}
					</h3>
					<p class="cn-connection-registry__aside-text">
						{{ t('nextcloud-vue', 'A connection the app does not declare cannot be checked, so new connections are added in integriq.') }}
					</p>
				</section>
			</aside>
		</div>
		<p v-if="config.footnote" class="cn-connection-registry__footnote">
			<InformationOutline :size="16" aria-hidden="true" />
			{{ tr(config.footnote) }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcNoteCard, NcTextField } from '@nextcloud/vue'
import ClockOutline from 'vue-material-design-icons/ClockOutline.vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import Magnify from 'vue-material-design-icons/Magnify.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import { buildHeaders, prefixUrl } from '../../utils/headers.js'
import { CnIcon } from '../CnIcon/index.js'
import { CnStatusBadge } from '../CnStatusBadge/index.js'

let registryUid = 0

/**
 * The status chips, in order, with the stored values each one counts.
 * A status not listed here (simulated, disabled, unavailable) counts under
 * All only.
 */
const STATUS_CHIPS = [
	{ key: 'configured', statuses: ['configured'] },
	{ key: 'limited', statuses: ['limited'] },
	{ key: 'unconfigured', statuses: ['unconfigured'] },
	{ key: 'error', statuses: ['error'] },
]

/**
 * CnConnectionRegistry: the connections one app declares, as integriq
 * checked them; the `type: "connections"` page, and a component an admin
 * settings tab mounts on its own (no CnAppRoot, router or manifest needed). The connections
 * one app declares, as integriq checked them (`integriq` / `app_connection`).
 *
 * Status chips with their counts (All, Set up, Limited, Not set, Error) and a
 * text filter narrow the cards. A card shows the connection's icon, title,
 * kind and last check, its status, description and status message, and opens
 * its settings. Beside the cards: what needs attention, when integriq last
 * checked, and where a connection is added.
 *
 * The list is filtered to one app by `app` (manifest `config.app`), so a
 * route opened without the menu's query still lists that app's connections
 * only. Without `app` the page reads `?app=` from the route.
 *
 * ```vue
 * <CnConnectionRegistry app="pipelinq" app-name="Pipelinq" :show-title="false"
 *   add-url="/apps/integriq/connections?app=pipelinq&link=1" />
 * ```
 *
 * ```json
 * { "id": "Integrations", "route": "/settings/integrations", "type": "connections",
 *   "config": { "app": "pipelinq", "addUrl": "/apps/integriq/connections" } }
 * ```
 */
export default {
	name: 'CnConnectionRegistry',

	components: {
		ClockOutline,
		CnIcon,
		CnStatusBadge,
		InformationOutline,
		Magnify,
		NcButton,
		NcLoadingIcon,
		NcNoteCard,
		NcTextField,
		Plus,
	},

	inject: {
		/** The app's translate function, provided by CnAppRoot. Identity outside one. */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** The whole manifest page, for a host that mounts this component itself. */
		page: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * The app whose connections are listed. Empty reads `?app=` from the
		 * route; with neither, every connection is listed.
		 *
		 * @spec openspec/changes/connection-registry-page/specs/connection-registry-page/spec.md#requirement-the-page-lists-one-apps-connections
		 */
		app: {
			type: String,
			default: '',
		},

		/** The app's name in the line under the heading ("... that Pipelinq declares"). */
		appName: {
			type: String,
			default: '',
		},

		/** Draw the heading; off where the host (an admin settings tab) titles the page. */
		showTitle: {
			type: Boolean,
			default: true,
		},

		/** A muted line under the page, e.g. that the page looks the same in every app. */
		footnote: {
			type: String,
			default: '',
		},

		/** The register holding the connections. */
		register: {
			type: String,
			default: 'integriq',
		},

		/** The schema of a connection. */
		schema: {
			type: String,
			default: 'app_connection',
		},

		/** The heading. Defaults to the page title, else "Integrations". */
		title: {
			type: String,
			default: '',
		},

		/** Where the primary header button goes; no button without it. */
		addUrl: {
			type: String,
			default: '',
		},

		/** The primary header button's label. */
		addLabel: {
			type: String,
			default: '',
		},

		/** Where "Open integriq" goes; no link when empty. */
		integriqUrl: {
			type: String,
			default: '/apps/integriq',
		},
	},

	data() {
		registryUid += 1
		return {
			uid: registryUid,
			connections: [],
			loading: true,
			error: '',
			activeStatus: 'all',
			search: '',
		}
	},

	computed: {
		/**
		 * The config, from the flattened props or from `page.config`. Props win.
		 *
		 * @return {object}
		 */
		config() {
			const fromPage = (this.page && this.page.config) || {}
			const fromProps = {}
			for (const key of ['app', 'appName', 'title', 'addUrl', 'addLabel', 'footnote']) {
				if (this[key]) {
					fromProps[key] = this[key]
				}
			}
			return { register: this.register, schema: this.schema, integriqUrl: this.integriqUrl, ...fromPage, ...fromProps }
		},

		/**
		 * The app the list is filtered to: the config, else the route's `?app=`.
		 *
		 * @return {string}
		 * @spec openspec/changes/connection-registry-page/specs/connection-registry-page/spec.md#requirement-the-page-lists-one-apps-connections
		 */
		effectiveApp() {
			if (this.config.app) {
				return this.config.app
			}
			// Mounted without a router (an admin settings tab) there is no `$route`.
			const route = '$route' in this ? this.$route : null
			const query = route?.query?.app
			return typeof query === 'string' ? query : ''
		},

		/** @return {string} The heading. */
		resolvedTitle() {
			const title = this.config.title || this.page?.title || ''
			return title ? this.tr(title) : t('nextcloud-vue', 'Integrations')
		},

		/** @return {string} The primary header button's label. */
		resolvedAddLabel() {
			return this.config.addLabel ? this.tr(this.config.addLabel) : t('nextcloud-vue', 'Add integration')
		},

		/** @return {string} The header button target, from the config. */
		resolvedAddUrl() {
			return this.config.addUrl || ''
		},

		/**
		 * The line under the heading: how many connections and who checks them.
		 *
		 * @return {string}
		 */
		summary() {
			const params = { shown: this.visibleConnections.length, total: this.connections.length, app: this.config.appName ? this.tr(this.config.appName) : '' }
			return params.app
				? t('nextcloud-vue', '{shown} of {total} connections that {app} declares, checked by integriq', params)
				: t('nextcloud-vue', '{shown} of {total} connections, checked by integriq', params)
		},

		/**
		 * The status chips with their counts.
		 *
		 * @return {Array<{key: string, label: string, count: number}>}
		 * @spec openspec/changes/connection-registry-page/specs/connection-registry-page/spec.md#requirement-status-chips-count-and-filter-the-cards
		 */
		chips() {
			const countOf = (statuses) => this.connections.filter((c) => statuses.includes(c.status)).length
			return [
				{ key: 'all', label: t('nextcloud-vue', 'All connections'), count: this.connections.length },
				...STATUS_CHIPS.map((chip) => ({ key: chip.key, label: this.statusLabel(chip.key), count: countOf(chip.statuses) })),
			]
		},

		/**
		 * The cards the active chip and the text filter leave.
		 *
		 * @return {Array<object>}
		 */
		visibleConnections() {
			const chip = STATUS_CHIPS.find((c) => c.key === this.activeStatus)
			const needle = this.search.trim().toLowerCase()
			return this.connections
				.filter((c) => !chip || chip.statuses.includes(c.status))
				.filter((c) => !needle || [c.title, c.description, c.statusMessage, c.kind].some((v) => String(v || '').toLowerCase().includes(needle)))
		},

		/**
		 * The connections that are limited or failing.
		 *
		 * @return {Array<object>}
		 */
		attention() {
			return this.connections.filter((c) => c.status === 'limited' || c.status === 'error')
		},

		/**
		 * When integriq last checked one of these connections.
		 *
		 * @return {string}
		 */
		lastCheckText() {
			const times = this.connections.map((c) => c.checkedAt).filter(Boolean).map((v) => new Date(v)).filter((d) => !Number.isNaN(d.getTime()))
			if (times.length === 0) {
				return t('nextcloud-vue', 'Not checked yet')
			}
			const last = new Date(Math.max(...times.map((d) => d.getTime())))
			return t('nextcloud-vue', 'Last check {time}', { time: this.formatTime(last) })
		},
	},

	watch: {
		effectiveApp() {
			this.load()
		},
	},

	mounted() {
		this.load()
	},

	methods: {
		t,

		/**
		 * Translate a manifest string through the app's translate function.
		 *
		 * @param {string} value The declared string.
		 * @return {string}
		 */
		tr(value) {
			return typeof value === 'string' && value !== '' ? this.cnTranslate(value) : value
		},

		/**
		 * The chip and card label of a status.
		 *
		 * @param {string} status The stored status.
		 * @return {string}
		 */
		statusLabel(status) {
			switch (status) {
				case 'configured': return t('nextcloud-vue', 'Set up')
				case 'limited': return t('nextcloud-vue', 'Limited')
				case 'unconfigured': return t('nextcloud-vue', 'Not set')
				case 'error': return t('nextcloud-vue', 'Error')
				case 'simulated': return t('nextcloud-vue', 'Simulated')
				case 'disabled': return t('nextcloud-vue', 'Switched off')
				case 'unavailable': return t('nextcloud-vue', 'Not available')
				default: return String(status || '')
			}
		},

		/**
		 * The badge variant of a status.
		 *
		 * @param {string} status The stored status.
		 * @return {string}
		 */
		statusVariant(status) {
			return { configured: 'success', limited: 'warning', error: 'error' }[status] || 'default'
		},

		/**
		 * A date as the cards show it: day, month and time.
		 *
		 * @param {Date} date The date.
		 * @return {string}
		 */
		formatTime(date) {
			return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date)
		},

		/**
		 * An app-absolute path through the instance prefix; a full URL as is.
		 *
		 * @param {string} url The URL.
		 * @return {string}
		 */
		resolveUrl(url) {
			if (!url || /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('#')) {
				return url
			}
			return prefixUrl(url.startsWith('/') ? url : `/${url}`)
		},

		/**
		 * @param {object} connection A card.
		 * @return {string} The id of its heading.
		 */
		headingId(connection) {
			return `cn-connection-${this.uid}-${String(connection.id).replace(/[^A-Za-z0-9_-]/g, '-')}`
		},

		/**
		 * One stored connection as a card.
		 *
		 * @param {object} row The `app_connection` object.
		 * @return {object}
		 * @spec openspec/changes/connection-registry-page/specs/connection-registry-page/spec.md#requirement-a-connection-is-a-status-card
		 */
		toCard(row) {
			const declaration = (row.declaration && typeof row.declaration === 'object') ? row.declaration : {}
			const title = this.tr(row.title || declaration.title || row.key || '')
			const kind = this.tr(row.kind || declaration.kind || '')
			const checked = row.checkedAt ? new Date(row.checkedAt) : null
			const checkedText = checked && !Number.isNaN(checked.getTime())
				? t('nextcloud-vue', 'checked {time}', { time: this.formatTime(checked) })
				: t('nextcloud-vue', 'never checked')
			const settingsUrl = row.settingsUrl || declaration.settingsUrl || ''
			const unset = row.status === 'unconfigured'
			return {
				id: row.id || row['@self']?.id || row.slug || row.key,
				title,
				kind,
				meta: kind ? `${kind} · ${checkedText}` : checkedText,
				icon: row.icon || declaration.icon || 'Connection',
				status: row.status || '',
				statusLabel: this.statusLabel(row.status),
				statusVariant: this.statusVariant(row.status),
				description: this.tr(row.description || declaration.description || ''),
				statusMessage: row.statusMessage || '',
				checkedAt: row.checkedAt || '',
				settingsUrl: settingsUrl ? this.resolveUrl(settingsUrl) : '',
				actionLabel: unset ? t('nextcloud-vue', 'Set up') : t('nextcloud-vue', 'Open settings'),
				actionAriaLabel: unset
					? t('nextcloud-vue', 'Set up {name}', { name: title })
					: t('nextcloud-vue', 'Open settings for {name}', { name: title }),

				order: typeof row.order === 'number' ? row.order : Number.MAX_SAFE_INTEGER,
			}
		},

		/**
		 * Fetch the app's connections.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/connection-registry-page/specs/connection-registry-page/spec.md#requirement-the-page-lists-one-apps-connections
		 */
		async load() {
			this.loading = true
			this.error = ''
			const params = new URLSearchParams({ _limit: '500' })
			if (this.effectiveApp) {
				params.set('app', this.effectiveApp)
			}
			const path = `/apps/openregister/api/objects/${encodeURIComponent(this.config.register)}/${encodeURIComponent(this.config.schema)}?${params}`
			try {
				const response = await fetch(prefixUrl(path), { method: 'GET', headers: buildHeaders() })
				if (!response.ok) {
					this.error = t('nextcloud-vue', 'The connections could not be loaded: {reason}', { reason: response.statusText || response.status })
					this.connections = []
					return
				}
				const data = await response.json()
				const rows = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])
				this.connections = rows
					.filter((row) => row && typeof row === 'object')
					.filter((row) => !this.effectiveApp || !row.app || row.app === this.effectiveApp)
					.map((row) => this.toCard(row))
					.sort((a, b) => a.order - b.order)
			} catch (error) {
				this.error = t('nextcloud-vue', 'The connections could not be loaded: {reason}', { reason: error?.message || t('nextcloud-vue', 'no connection') })
				this.connections = []
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-connection-registry {
	display: flex;
	flex-direction: column;
	gap: 20px;
	padding: 24px 28px;
	box-sizing: border-box;
}

.cn-connection-registry__header {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px 16px;
	/* Clear the navigation toggle at the left edge of the app content. */
	padding-inline-start: 44px;
}

.cn-connection-registry__title {
	margin: 0;
	font-size: 24px;
	font-weight: 700;
	line-height: 1.25;
}

.cn-connection-registry__summary {
	margin: 4px 0 0;
	font-size: 14px;
	color: var(--color-text-maxcontrast);
}

.cn-connection-registry__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.cn-connection-registry__toolbar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 12px 16px;
}

.cn-connection-registry__chips {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.cn-connection-registry__chip {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	min-height: 36px;
	margin: 0;
	padding: 0 14px;
	border: 1px solid var(--color-border-maxcontrast);
	border-radius: var(--border-radius-pill);
	background: var(--color-main-background);
	color: var(--color-main-text);
	font: inherit;
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
}

.cn-connection-registry__chip--active {
	border-color: var(--color-primary-element);
	background: var(--color-primary-element);
	color: var(--color-primary-element-text);
}

.cn-connection-registry__chip:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-connection-registry__chip-count {
	font-weight: 400;
}

.cn-connection-registry__search {
	width: 280px;
	max-width: 100%;
}

.cn-connection-registry__state {
	display: flex;
	justify-content: center;
	padding: 40px 0;
}

.cn-connection-registry__body {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 300px;
	align-items: start;
	gap: 20px;
}

.cn-connection-registry__cards {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	gap: 16px;
}

.cn-connection-registry__empty {
	grid-column: 1 / -1;
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-connection-registry__card,
.cn-connection-registry__aside-card {
	display: flex;
	flex-direction: column;
	gap: 10px;
	min-width: 0;
	padding: 18px 20px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-container-large, 12px);
	background: var(--color-main-background);
	box-sizing: border-box;
}

.cn-connection-registry__card-head {
	display: flex;
	align-items: flex-start;
	gap: 12px;
}

.cn-connection-registry__card-icon {
	display: inline-flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 8px;
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text, var(--color-primary-element));
}

.cn-connection-registry__card-title-area {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.cn-connection-registry__card-title,
.cn-connection-registry__aside-title {
	margin: 0;
	font-size: 16px;
	font-weight: 700;
	line-height: 1.3;
}

.cn-connection-registry__card-meta,
.cn-connection-registry__aside-text,
.cn-connection-registry__card-no-settings {
	margin: 0;
	font-size: 13px;
	line-height: 1.45;
	color: var(--color-text-maxcontrast);
}

.cn-connection-registry__card-status {
	flex: none;
}

.cn-connection-registry__card-description,
.cn-connection-registry__card-message {
	margin: 0;
	font-size: 14px;
	line-height: 1.5;
}

.cn-connection-registry__card-message {
	color: var(--color-text-maxcontrast);
}

.cn-connection-registry__card-footer {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	margin-top: auto;
	min-height: 40px;
}

.cn-connection-registry__aside {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.cn-connection-registry__aside-text--icon {
	display: flex;
	align-items: center;
	gap: 6px;
}

.cn-connection-registry__aside-link {
	font-size: 14px;
	font-weight: 600;
	color: var(--color-primary-element);
}

.cn-connection-registry__attention {
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-connection-registry__attention li {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-connection-registry__attention-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	font-size: 14px;
	font-weight: 600;
}

.cn-connection-registry__footnote {
	display: flex;
	align-items: center;
	gap: 6px;
	margin: 0;
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

@media (max-width: 1024px) {
	.cn-connection-registry__body {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>

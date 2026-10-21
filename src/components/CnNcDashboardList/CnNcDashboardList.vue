<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-nc-dashboard-list" data-testid="cn-nc-dashboard-list">
		<div v-if="config.search || config.create" class="cn-nc-dashboard-list__bar">
			<NcTextField v-if="config.search"
				:modelValue="query"
				:label="text(config.search.label) || t('nextcloud-vue', 'Search')"
				:placeholder="text(config.search.placeholder)"
				data-testid="cn-nc-dashboard-list-search"
				@update:modelValue="onQuery" />
			<NcButton v-if="config.create"
				variant="secondary"
				data-testid="cn-nc-dashboard-list-create"
				@click="openCreate(config.create, null)">
				{{ text(config.create.label) || t('nextcloud-vue', 'New') }}
			</NcButton>
		</div>
		<CnNcDashboardQuickCreate v-if="activeCreate"
			:key="createKey"
			:config="activeCreate"
			:context="createContext || {}"
			cancelable
			@created="onCreated"
			@cancel="closeCreate" />
		<p v-if="copied"
			class="cn-nc-dashboard-list__copied"
			role="status"
			data-testid="cn-nc-dashboard-list-copied">
			{{ t('nextcloud-vue', 'Copied') }}
		</p>
		<p v-if="error"
			class="cn-nc-dashboard-list__error"
			role="status"
			data-testid="cn-nc-dashboard-list-error">
			{{ t('nextcloud-vue', 'This list could not be read.') }}
		</p>
		<CnDataTable v-else
			:rows="rows"
			:columns="columns"
			:loading="loading"
			hideHeader
			borderless
			:emptyText="emptyText"
			@rowClick="onRowClick"
			@rowAuxClick="onRowClick">
			<template v-if="rowActions.length" #row-actions="{ row }">
				<NcActions :aria-label="t('nextcloud-vue', 'Actions for {name}', { name: row.mainText })">
					<template v-for="action in actionsFor(row)" :key="action.id">
						<NcActionLink v-if="action.href" :href="actionHref(action, row)">
							{{ text(action.label) }}
						</NcActionLink>
						<NcActionButton v-else @click="runAction(action, row)">
							{{ text(action.label) }}
						</NcActionButton>
					</template>
				</NcActions>
			</template>
			<template v-if="viewAllHref" #footer>
				<a class="cn-data-table__view-all" :href="viewAllHref" data-testid="cn-nc-dashboard-list-view-all">
					{{ text(config.viewAll.label) || t('nextcloud-vue', 'View all') }} →
				</a>
			</template>
		</CnDataTable>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcActionButton, NcActionLink, NcActions, NcButton, NcTextField } from '@nextcloud/vue'
import CnNcDashboardQuickCreate from '../CnNcDashboardQuickCreate/CnNcDashboardQuickCreate.vue'
import { fetchEndpointSource } from '../../composables/useEndpointSource.js'
import { resolveDue } from '../../utils/dueText.js'
import { fillTemplate } from '../../utils/fillTemplate.js'
import { openRowTarget } from '../../utils/linkNavigation.js'
import { readPath } from '../../utils/readPath.js'
import { resolveDeepTokens } from '../../utils/resolveFilterTokens.js'
import { CnDataTable } from '../CnDataTable/index.js'

const SEARCH_DEBOUNCE_MS = 300
const COPIED_MS = 2000

/** A name and a muted, right-aligned trailing line. */
const COLUMNS = [
	{ key: 'mainText', cellClass: 'cn-cell--strong' },
	{ key: 'subText', cellClass: 'cn-cell--muted cn-cell--end' },
]

/**
 * A url for an anchor: absolute and app-root paths as given, else through `generateUrl`.
 *
 * @param {string} url The url.
 * @return {string}
 */
function appUrl(url) {
	return /^(https?:)?\/\//i.test(url) || url.startsWith('/index.php') ? url : generateUrl(url)
}

/**
 * CnNcDashboardList — the compact list a Nextcloud Dashboard widget shows:
 * a bold name, a muted trailing line, and a "View all" link, read from
 * OpenRegister or any endpoint. Each row opens its record in place (a
 * modifier or middle click opens a new tab), because the Nextcloud Dashboard
 * has no app router. `registerNcDashboardWidgets` mounts it per widget id, so
 * an app's dashboard widgets are configuration rather than one component each.
 *
 * `config`:
 * - `source`: `{ register, schema, params? }` (OpenRegister objects, rows in
 *   `results`) or an endpointSource `{ url, params?, responsePath? }`. Filter
 *   tokens (`@me`, `@today`, `@today-7d`) resolve in `params`, and an operator
 *   map (`{ deadline: { lt: '@today' } }`) goes out as `deadline[lt]=…`.
 * - `itemsPath`: the rows' path in the response, when not `results`.
 * - `limit`: the most rows shown (default 7).
 * - `sources`: several sources in place of `source`, each with its own
 *   `href` and `kind` (a word filled as `{_kind}`, through the translate);
 *   the rows merge and sort newest first by `sortBy` (a dot-path to a date).
 * - `title`, `subtitle`: templates filled from a row (default `{title}`, none).
 *   A `subtitle` list joins its filled parts with a middle dot, an empty part
 *   dropping out with its separator.
 * - `due`: `{ field, withSubtitle?, ...dueText config }`: the trailing line says
 *   how a date stands ("3 days overdue", "Due today", the date or the days
 *   left), in place of `subtitle`, or after it with `withSubtitle` (see `resolveDue`).
 * - `valueLabels`: `{ field: { value: label } }`: a stored value shown by its
 *   label (through the translate) wherever a template names the field.
 * - `href`: a template for a row's page (`/apps/dossiq/cases/{id}`).
 * - `viewAll`: `{ href, label? }`.
 * - `emptyText`: text for an empty list; `search.emptyText` with `{query}`
 *   while a search found nothing.
 * - `search`: `{ label?, placeholder?, param?, emptyText? }`: a search box;
 *   the server searches (`_search`, or `param`) as the user types.
 * - `rowActions`: `[{ id, label, href? | copy? | create? }]`, a menu per row:
 *   `href` a template for a link, `copy` a row field copied to the clipboard
 *   (the action hides while the field is empty), `create` a
 *   CnNcDashboardQuickCreate config opened inline with the row as its context.
 * - `create`: a CnNcDashboardQuickCreate config with a `label`, opened inline
 *   from a button beside the search; the list reads again after a create.
 *
 * Texts go through the host translate.
 */
export default {
	name: 'CnNcDashboardList',

	components: { CnDataTable, CnNcDashboardQuickCreate, NcActionButton, NcActionLink, NcActions, NcButton, NcTextField },

	inject: {
		/** The host app's translate (provided by `registerNcDashboardWidgets`). */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The list's configuration (see the component docs).
		 *
		 * @type {object}
		 */
		config: {
			type: Object,
			default: () => ({}),
		},
	},

	data() {
		return {
			items: [],
			loading: true,
			error: false,
			columns: COLUMNS,
			query: '',
			searchTimer: null,
			loadTicket: 0,
			activeCreate: null,
			createContext: null,
			createKey: 0,
			copied: false,
		}
	},

	computed: {
		/** @return {number} The most rows shown. */
		limit() {
			return Number(this.config.limit) > 0 ? Number(this.config.limit) : 7
		},

		/**
		 * The rows as the table draws them.
		 *
		 * @spec openspec/changes/nc-dashboard-widgets/specs/nc-dashboard-widgets/spec.md#requirement-dashboard-widgets-are-configuration
		 * @return {Array<{id: string, mainText: string, subText: string, href: string}>}
		 */
		rows() {
			return this.items.slice(0, this.limit).map((item, index) => {
				const id = item.id ?? (item['@self'] && item['@self'].id) ?? index
				const href = item._href || this.config.href
				return {
					id: String(id),
					mainText: this.fill(this.config.title || '{title}', item) || String(id),
					subText: this.subtitleOf(item),
					href: href ? appUrl(fillTemplate(href, { ...item, id })) : '',
				}
			})
		},

		/** @return {Map<string, object>} The record behind each drawn row, by row id. */
		itemsById() {
			return new Map(this.items.slice(0, this.limit).map((item, index) => [String(item.id ?? (item['@self'] && item['@self'].id) ?? index), item]))
		},

		/** @return {Array<object>} The declared row actions. */
		rowActions() {
			return (Array.isArray(this.config.rowActions) ? this.config.rowActions : []).filter((action) => action && action.id)
		},

		/** @return {string} The text of an empty list, or of a search that found nothing. */
		emptyText() {
			const search = this.config.search
			if (this.query && search && search.emptyText) {
				return fillTemplate(this.text(search.emptyText), { query: this.query })
			}
			return this.text(this.config.emptyText) || t('nextcloud-vue', 'Nothing to show')
		},

		/** @return {string} The "View all" href, or ''. */
		viewAllHref() {
			const viewAll = this.config.viewAll
			return viewAll && viewAll.href ? appUrl(viewAll.href) : ''
		},
	},

	mounted() {
		this.load()
	},

	beforeUnmount() {
		clearTimeout(this.searchTimer)
	},

	methods: {
		t,

		/**
		 * A config text through the host translate.
		 *
		 * @param {unknown} value The text.
		 * @return {string}
		 */
		text(value) {
			return typeof value === 'string' && value !== '' ? this.cnTranslate(value) : ''
		},

		/**
		 * A row's trailing line: how its due date stands, or the subtitle template.
		 *
		 * @spec openspec/changes/nc-dashboard-due/specs/nc-dashboard-widgets/spec.md#requirement-a-dashboard-row-says-how-its-date-stands
		 * @param {object} item The row.
		 * @return {string}
		 */
		subtitleOf(item) {
			const due = this.config.due
			const parts = Array.isArray(this.config.subtitle)
				? this.config.subtitle.map((part) => this.fill(part, item))
				: [this.fill(this.config.subtitle, item)]
			if (due && typeof due === 'object' && due.field) {
				const resolved = resolveDue(readPath(item, due.field), due, (text) => this.cnTranslate(text))
				const dueText = resolved ? resolved.text : ''
				return due.withSubtitle ? [...parts, dueText].filter(Boolean).join(' · ') : dueText
			}
			return parts.filter(Boolean).join(' · ')
		},

		/**
		 * A template filled from a row, translated first.
		 *
		 * @param {unknown} template The template.
		 * @param {object} item The row.
		 * @return {string}
		 */
		fill(template, item) {
			return typeof template === 'string' && template !== '' ? fillTemplate(this.cnTranslate(template), this.labelled(item)).trim() : ''
		},

		/**
		 * The row with each `valueLabels` field replaced by its translated label.
		 *
		 * @param {object} item The row.
		 * @return {object}
		 */
		labelled(item) {
			const labels = this.config.valueLabels
			if (!labels || typeof labels !== 'object') {
				return item
			}
			const out = { ...item }
			for (const [field, map] of Object.entries(labels)) {
				const label = map && map[item[field]]
				if (typeof label === 'string' && label !== '') {
					out[field] = this.cnTranslate(label)
				}
			}
			return out
		},

		/**
		 * Read the rows: OpenRegister objects or an endpoint.
		 *
		 * @spec openspec/changes/nc-dashboard-widgets/specs/nc-dashboard-widgets/spec.md#requirement-dashboard-widgets-are-configuration
		 * @return {Promise<void>}
		 */
		async load() {
			const sources = Array.isArray(this.config.sources) && this.config.sources.length > 0
				? this.config.sources
				: [this.config.source || {}]
			const ticket = ++this.loadTicket
			this.loading = true
			this.error = false
			try {
				const lists = await Promise.all(sources.map((source) => this.readSource(source)))
				if (ticket !== this.loadTicket) {
					return
				}
				const items = lists.flat()
				const sortBy = this.config.sortBy
				this.items = sortBy
					? items.sort((a, b) => (Date.parse(readPath(b, sortBy)) || 0) - (Date.parse(readPath(a, sortBy)) || 0))
					: items
			} catch {
				if (ticket === this.loadTicket) {
					this.error = true
					this.items = []
				}
			} finally {
				if (ticket === this.loadTicket) {
					this.loading = false
				}
			}
		},

		/**
		 * Read one source's rows, each marked with the source's `href` and `kind`.
		 *
		 * @spec openspec/changes/pl4-nc-dashboard/specs/pl4-nc-dashboard/spec.md#requirement-a-dashboard-list-can-search-act-on-rows-and-merge-sources
		 * @param {object} source The source.
		 * @return {Promise<Array<object>>}
		 */
		async readSource(source) {
			// Tokens nested below an operator map (`'@self': { lastUserActivity: { lt: '@today-7d' } }`)
			// resolve here; the endpoint path resolves one level only.
			const params = resolveDeepTokens(source.params || {}, {})
			const search = this.config.search && this.query ? { [this.config.search.param || '_search']: this.query } : {}
			const request = source.register && source.schema
				? { url: `/apps/openregister/api/objects/${source.register}/${source.schema}`, params: { _limit: this.limit, ...params, ...search } }
				: { url: source.url, responsePath: source.responsePath, params: { ...params, ...search } }
			const data = await fetchEndpointSource(request, {}, { fresh: true })
			const list = readPath(data, this.config.itemsPath || (source.register ? 'results' : '')) ?? data
			const kind = this.text(source.kind)
			return (Array.isArray(list) ? list : [])
				.filter((item) => item && typeof item === 'object')
				.map((item) => (source.href || kind ? { ...item, _href: source.href || '', _kind: kind } : item))
		},

		/**
		 * Search on the server once the user stops typing.
		 *
		 * @param {string} value What was typed.
		 */
		onQuery(value) {
			this.query = String(value || '').trim()
			clearTimeout(this.searchTimer)
			this.searchTimer = setTimeout(() => this.load(), SEARCH_DEBOUNCE_MS)
		},

		/**
		 * The row actions that apply to a row: a copy action only while its field holds a value.
		 *
		 * @param {object} row The drawn row.
		 * @return {Array<object>}
		 */
		actionsFor(row) {
			const item = this.itemsById.get(row.id) || {}
			return this.rowActions.filter((action) => !action.copy || !['', null, undefined].includes(readPath(item, action.copy)))
		},

		/**
		 * A link action's href for a row.
		 *
		 * @param {object} action The action.
		 * @param {object} row The drawn row.
		 * @return {string}
		 */
		actionHref(action, row) {
			return appUrl(fillTemplate(action.href, { ...this.itemsById.get(row.id), id: row.id }))
		},

		/**
		 * Run a copy or create row action.
		 *
		 * @spec openspec/changes/pl4-nc-dashboard/specs/pl4-nc-dashboard/spec.md#requirement-a-dashboard-list-can-search-act-on-rows-and-merge-sources
		 * @param {object} action The action.
		 * @param {object} row The drawn row.
		 * @return {Promise<void>}
		 */
		async runAction(action, row) {
			const item = this.itemsById.get(row.id) || {}
			if (action.create) {
				this.openCreate(action.create, { ...item, id: row.id })
				return
			}
			if (action.copy) {
				try {
					await navigator.clipboard.writeText(String(readPath(item, action.copy)))
					this.copied = true
					setTimeout(() => {
						this.copied = false
					}, COPIED_MS)
				} catch {
					// The clipboard refused; the value is still on screen.
				}
			}
		},

		/**
		 * Open a create form inline.
		 *
		 * @param {object} config The CnNcDashboardQuickCreate config.
		 * @param {object|null} context The row it was opened on.
		 */
		openCreate(config, context) {
			this.activeCreate = config
			this.createContext = context
			this.createKey++
		},

		/**
		 * Close the inline create form.
		 */
		closeCreate() {
			this.activeCreate = null
			this.createContext = null
		},

		/**
		 * A record was created: read the list again.
		 */
		onCreated() {
			this.load()
		},

		/**
		 * Open a row's page.
		 *
		 * @param {object} row The row.
		 * @param {MouseEvent} event The click.
		 */
		onRowClick(row, event) {
			if (row && row.href) {
				openRowTarget(event, row.href)
			}
		},
	},
}
</script>

<style scoped>
.cn-nc-dashboard-list__bar {
	display: flex;
	align-items: flex-end;
	gap: 8px;
	margin-bottom: 8px;
}

.cn-nc-dashboard-list__copied {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-nc-dashboard-list__error {
	margin: 0;
	padding: 8px 0;
	color: var(--color-text-maxcontrast);
}
</style>

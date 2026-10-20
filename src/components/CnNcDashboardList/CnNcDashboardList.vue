<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-nc-dashboard-list" data-testid="cn-nc-dashboard-list">
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
			:emptyText="text(config.emptyText) || t('nextcloud-vue', 'Nothing to show')"
			@rowClick="onRowClick"
			@rowAuxClick="onRowClick">
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
import { fetchEndpointSource } from '../../composables/useEndpointSource.js'
import { resolveDue } from '../../utils/dueText.js'
import { fillTemplate } from '../../utils/fillTemplate.js'
import { openRowTarget } from '../../utils/linkNavigation.js'
import { readPath } from '../../utils/readPath.js'
import { resolveDeepTokens } from '../../utils/resolveFilterTokens.js'
import { CnDataTable } from '../CnDataTable/index.js'

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
 * - `title`, `subtitle`: templates filled from a row (default `{title}`, none).
 * - `due`: `{ field, ...dueText config }`: the trailing line says how a date
 *   stands ("3 days overdue", "Due today", the date or the days left), in
 *   place of `subtitle` (see `resolveDue`).
 * - `href`: a template for a row's page (`/apps/dossiq/cases/{id}`).
 * - `viewAll`: `{ href, label? }`.
 * - `emptyText`: text for an empty list.
 *
 * Texts go through the host translate.
 */
export default {
	name: 'CnNcDashboardList',

	components: { CnDataTable },

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
				return {
					id: String(id),
					mainText: this.fill(this.config.title || '{title}', item) || String(id),
					subText: this.subtitleOf(item),
					href: this.config.href ? appUrl(fillTemplate(this.config.href, { ...item, id })) : '',
				}
			})
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
			if (due && typeof due === 'object' && due.field) {
				const resolved = resolveDue(readPath(item, due.field), due, (text) => this.cnTranslate(text))
				return resolved ? resolved.text : ''
			}
			return this.fill(this.config.subtitle, item)
		},

		/**
		 * A template filled from a row, translated first.
		 *
		 * @param {unknown} template The template.
		 * @param {object} item The row.
		 * @return {string}
		 */
		fill(template, item) {
			return typeof template === 'string' && template !== '' ? fillTemplate(this.cnTranslate(template), item).trim() : ''
		},

		/**
		 * Read the rows: OpenRegister objects or an endpoint.
		 *
		 * @spec openspec/changes/nc-dashboard-widgets/specs/nc-dashboard-widgets/spec.md#requirement-dashboard-widgets-are-configuration
		 * @return {Promise<void>}
		 */
		async load() {
			const source = this.config.source || {}
			this.loading = true
			this.error = false
			try {
				// Tokens nested below an operator map (`'@self': { lastUserActivity: { lt: '@today-7d' } }`)
				// resolve here; the endpoint path resolves one level only.
				const params = resolveDeepTokens(source.params || {}, {})
				const request = source.register && source.schema
					? { url: `/apps/openregister/api/objects/${source.register}/${source.schema}`, params: { _limit: this.limit, ...params } }
					: { ...source, params }
				const data = await fetchEndpointSource(request, {}, { fresh: true })
				const list = readPath(data, this.config.itemsPath || (source.register ? 'results' : '')) ?? data
				this.items = Array.isArray(list) ? list.filter((item) => item && typeof item === 'object') : []
			} catch {
				this.error = true
				this.items = []
			} finally {
				this.loading = false
			}
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
.cn-nc-dashboard-list__error {
	margin: 0;
	padding: 8px 0;
	color: var(--color-text-maxcontrast);
}
</style>

<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-facts-widget" data-testid="cn-facts-widget">
		<p v-if="error" class="cn-facts-widget__muted" data-testid="cn-facts-error">
			{{ tr('Could not load this information') }}
		</p>
		<div v-else-if="loading && !record" class="cn-facts-widget__loading">
			<NcLoadingIcon :size="20" />
		</div>
		<p v-else-if="blocks.length === 0" class="cn-facts-widget__muted" data-testid="cn-facts-empty">
			{{ emptyLabel }}
		</p>
		<template v-else>
			<template v-for="block in blocks" :key="block.key">
				<dl
					v-if="block.kind === 'rows'"
					class="cn-facts-widget__rows">
					<div
						v-for="row in block.rows"
						:key="row.key"
						class="cn-facts-widget__row"
						:data-testid="`cn-fact-${row.key}`">
						<dt class="cn-facts-widget__label">
							{{ row.label }}
						</dt>
						<dd class="cn-facts-widget__value">
							{{ row.value }}
						</dd>
					</div>
				</dl>
				<component
					:is="block.to ? 'router-link' : 'strong'"
					v-else-if="block.kind === 'title'"
					:to="block.to || undefined"
					class="cn-facts-widget__title"
					:data-testid="`cn-fact-${block.key}`">
					{{ block.value }}
				</component>
				<span
					v-else-if="block.kind === 'line'"
					class="cn-facts-widget__line"
					:data-testid="`cn-fact-${block.key}`">
					{{ block.value }}
				</span>
				<div v-else-if="block.kind === 'pill'">
					<CnStatusBadge
						:label="block.value"
						:variant="block.variant"
						size="small"
						:data-testid="`cn-fact-${block.key}`" />
				</div>
			</template>
		</template>
		<component
			:is="link.to ? 'router-link' : 'a'"
			v-if="link && record"
			:to="link.to || undefined"
			:href="link.href || undefined"
			class="cn-facts-widget__link"
			data-testid="cn-facts-link">
			{{ link.label }}
		</component>
	</div>
</template>

<script>
import { NcLoadingIcon } from '@nextcloud/vue'
import CnStatusBadge from '../CnStatusBadge/CnStatusBadge.vue'
import { resolveEndpointRequest } from '../../composables/useEndpointSource.js'
import { isBadgeVariant } from '../../utils/badgeVariants.js'
import { formatBoardDate } from '../../utils/boardDate.js'
import { parseDateValue } from '../../utils/dateVariant.js'
import { readPath } from '../../utils/readPath.js'
import { hasUnresolvedDeepTokens, resolveDeepTokens } from '../../utils/resolveFilterTokens.js'

/** Kinds of entry a `fields[]` item can be. A labelled item without `as` is a row. */
const KINDS = Object.freeze(['row', 'title', 'line', 'pill'])

/**
 * CnFactsWidget — the `facts` widget: a card of facts about ONE object.
 *
 * Renders the configured fields of the current detail-page object, or of one
 * other object named by `content.source`, as the side cards on the screens
 * draw them: label/value rows (a two-column grid, label muted), a bold title
 * line that may link, muted meta lines that join several fields with " · ",
 * a status pill, and one link at the foot.
 *
 * Everything is configuration; nothing in it knows an app:
 *
 * ```json
 * {
 *   "type": "facts",
 *   "title": "Zaak",
 *   "content": {
 *     "source": { "register": "dossiq", "schema": "case", "id": "@object.case" },
 *     "fields": [
 *       { "as": "title", "path": "title", "route": { "name": "CaseDetail", "params": { "id": "@source.id" } } },
 *       { "as": "line", "parts": ["identifier", "caseTypeTitle"] },
 *       { "as": "pill", "path": "status", "map": { "open": "In behandeling" } },
 *       { "path": "deadline", "label": "Termijn", "format": "date" }
 *     ],
 *     "link": { "label": "Naar de zaak", "route": { "name": "CaseDetail", "params": { "id": "@source.id" } } },
 *     "emptyText": "Geen zaak"
 *   }
 * }
 * ```
 *
 * Tokens: `source.id` takes the shared filter tokens; `source.url` takes them
 * inside the url, the endpoint grammar (`/apps/x/api/y/@objectId`)
 * (`@objectId`, `@object.<field>`, `@workspace.<key>`, `@me`, ...). Routes
 * and the link also take `@source.<field>` (a field of the object shown).
 * A source whose id token does not resolve renders the empty text, never a
 * request for the literal token.
 *
 * Labels, map values, the link label and the empty text go through the host
 * app's translate (`cnTranslate`).
 */
export default {
	name: 'CnFactsWidget',

	components: { CnStatusBadge, NcLoadingIcon },

	inject: {
		cnTranslate: { default: () => (key) => key },
		cnObjectContext: { default: null },
		cnWorkspaceContext: { default: null },
	},

	props: {
		/**
		 * The widget configuration.
		 *
		 * - `fields` — the entries, in order. Each is `{ path, label?, as?, format?, map?, itemPath?, parts?, separator?, route?, variant?, variantMap? }`.
		 *   `as` is `row` (default when `label` is set), `title`, `line` or `pill`.
		 *   `format` is `text` (default), `date` (board short date), `date-long` (always with the year) or `list` (an array joined by ", ", each item read at `itemPath`).
		 *   `map` turns a raw value into a label (translated). `parts` (on a `line`) lists paths, or `{ path, label?, format? }`, joined by `separator` (default " · "); empty parts are dropped.
		 * - `source` — `{ register, schema, id }` or `{ url }`; omitted = the current object.
		 * - `link` — `{ label, route? | href? }` at the foot.
		 * - `hideEmpty` — drop an entry whose value is empty (default true).
		 * - `emptyText` — shown when no entry has a value.
		 *
		 * @type {{fields?: Array<object>, source?: object, link?: object, hideEmpty?: boolean, emptyText?: string}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * The current detail-page object, passed by the detail page host.
		 * Read when `content.source` is not set.
		 */
		objectData: {
			type: Object,
			default: null,
		},

		/** The current detail-page object id, for the `@objectId` token. */
		objectId: {
			type: [String, Number],
			default: null,
		},
	},

	data() {
		return {
			fetched: null,
			loading: false,
			error: false,
		}
	},

	computed: {
		/**
		 * The token context: the detail object (prop, else the injected context)
		 * and the page workspace.
		 *
		 * @return {object}
		 */
		tokenCtx() {
			const unwrap = (c) => (c && typeof c === 'object' && 'value' in c ? c.value : c)
			const injected = unwrap(this.cnObjectContext) || {}
			return {
				...injected,
				objectId: this.objectId ?? injected.objectId ?? this.objectData?.id ?? null,
				object: this.objectData || injected.object || null,
				workspace: unwrap(this.cnWorkspaceContext) || {},
			}
		},

		/**
		 * The source declaration with its tokens resolved, or null for the current object.
		 *
		 * @return {object|null}
		 */
		resolvedSource() {
			const source = this.content?.source
			if (!source || typeof source !== 'object') {
				return null
			}
			if (typeof source.url === 'string' && source.url !== '') {
				// The endpoint grammar: tokens INSIDE the url, and a request
				// that is blocked while one leaves an empty path segment.
				const request = resolveEndpointRequest({ url: source.url }, this.tokenCtx)
				return { url: request.blocked ? '' : request.url }
			}
			return resolveDeepTokens(source, this.tokenCtx)
		},

		/**
		 * A stable key of the resolved source, so the widget refetches only when it changes.
		 *
		 * @return {string}
		 */
		sourceKey() {
			return this.resolvedSource ? JSON.stringify(this.resolvedSource) : ''
		},

		/**
		 * The object the facts are read from.
		 *
		 * @return {object|null}
		 */
		record() {
			return this.resolvedSource ? this.fetched : this.objectData
		},

		/**
		 * The entries to draw, consecutive rows grouped into one list.
		 *
		 * @return {Array<object>}
		 */
		blocks() {
			const record = this.record
			if (!record) {
				return []
			}
			const fields = Array.isArray(this.content?.fields) ? this.content.fields : []
			const hideEmpty = this.content?.hideEmpty !== false
			const out = []
			fields.forEach((field, index) => {
				if (!field || typeof field !== 'object') {
					return
				}
				const kind = this.kindOf(field)
				const key = String(field.key || field.path || `${kind}-${index}`).replace(/[^\w-]/g, '-')
				const value = kind === 'line' && Array.isArray(field.parts)
					? this.lineValue(record, field)
					: this.valueOf(record, field)
				if (value === '' && hideEmpty) {
					return
				}
				if (kind === 'row') {
					const last = out[out.length - 1]
					const row = { key, label: this.tr(field.label || ''), value }
					if (last && last.kind === 'rows') {
						last.rows.push(row)
					} else {
						out.push({ kind: 'rows', key: `rows-${index}`, rows: [row] })
					}
					return
				}
				const block = { kind, key, value }
				if (kind === 'title' && field.route) {
					block.to = this.resolveRoute(field.route, record)
				}
				if (kind === 'pill') {
					const raw = readPath(record, field.path)
					const variant = (field.variantMap && field.variantMap[raw]) || field.variant
					block.variant = isBadgeVariant(variant) ? variant : 'default'
				}
				out.push(block)
			})
			return out
		},

		/**
		 * The foot link, resolved, or null.
		 *
		 * @return {{label: string, to?: object, href?: string}|null}
		 */
		link() {
			const link = this.content?.link
			if (!link || typeof link !== 'object' || !link.label) {
				return null
			}
			if (link.route) {
				const to = this.resolveRoute(link.route, this.record)
				return to ? { label: this.tr(link.label), to } : null
			}
			if (typeof link.href === 'string' && link.href !== '') {
				const href = this.resolveTemplate(link.href, this.record)
				return href ? { label: this.tr(link.label), href } : null
			}
			return null
		},

		/**
		 * The empty line.
		 *
		 * @return {string}
		 */
		emptyLabel() {
			return this.tr(this.content?.emptyText || 'Nothing to show yet')
		},
	},

	watch: {
		sourceKey: {
			immediate: true,
			handler() {
				this.load()
			},
		},
	},

	methods: {
		/**
		 * Translate through the host app.
		 *
		 * @param {string} text The text.
		 * @return {string}
		 */
		tr(text) {
			if (typeof text !== 'string' || text === '') {
				return ''
			}
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/**
		 * The kind of a field entry.
		 *
		 * @param {object} field The entry.
		 * @return {string} `row`, `title`, `line` or `pill`.
		 */
		kindOf(field) {
			if (KINDS.includes(field.as)) {
				return field.as
			}
			return field.label ? 'row' : 'line'
		},

		/**
		 * Read the source object.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			const source = this.resolvedSource
			this.error = false
			if (!source) {
				this.fetched = null
				return
			}
			const url = this.sourceUrl(source)
			if (!url) {
				this.fetched = null
				return
			}
			this.loading = true
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const full = url.startsWith('/apps/') || url.startsWith('/ocs/') ? generateUrl(url) : url
				const response = await axios.get(full)
				const data = response && response.data
				this.fetched = data && typeof data === 'object' && !Array.isArray(data) ? data : null
			} catch (e) {
				// eslint-disable-next-line no-console
				console.warn('[CnFactsWidget] the source could not be read:', e?.message || e)
				this.fetched = null
				this.error = true
			} finally {
				this.loading = false
			}
		},

		/**
		 * The URL of a resolved source, or '' when it cannot be read yet.
		 *
		 * @param {object} source The resolved source.
		 * @return {string}
		 */
		sourceUrl(source) {
			if (typeof source.url === 'string') {
				return source.url
			}
			if (hasUnresolvedDeepTokens(source)) {
				return ''
			}
			const { register, schema, id } = source
			if (!register || !schema || id === undefined || id === null || id === '' || typeof id === 'object') {
				return ''
			}
			return `/apps/openregister/api/objects/${encodeURIComponent(register)}/${encodeURIComponent(schema)}/${encodeURIComponent(String(id))}`
		},

		/**
		 * The display text of one field.
		 *
		 * @param {object} record The object.
		 * @param {object} field The entry.
		 * @return {string}
		 */
		valueOf(record, field) {
			const raw = readPath(record, field.path)
			return this.format(raw, field)
		},

		/**
		 * The text of a `line` entry that joins several parts.
		 *
		 * @param {object} record The object.
		 * @param {object} field The entry.
		 * @return {string}
		 */
		lineValue(record, field) {
			const separator = typeof field.separator === 'string' ? field.separator : ' · '
			return field.parts
				.map((part) => {
					const spec = typeof part === 'string' ? { path: part } : (part || {})
					const value = this.format(readPath(record, spec.path), spec)
					if (value === '') {
						return ''
					}
					return spec.label ? `${this.tr(spec.label)} ${value}` : value
				})
				.filter((value) => value !== '')
				.join(separator)
		},

		/**
		 * Format a raw value.
		 *
		 * @param {unknown} raw The value.
		 * @param {object} spec `{ format?, map?, itemPath? }`.
		 * @return {string} The text, '' when empty.
		 */
		format(raw, spec) {
			if (raw === null || raw === undefined || raw === '') {
				return ''
			}
			const format = spec.format || 'text'
			if (format === 'list' || Array.isArray(raw)) {
				const items = (Array.isArray(raw) ? raw : [raw])
					.map((item) => (spec.itemPath && item && typeof item === 'object' ? readPath(item, spec.itemPath) : item))
					.map((item) => this.format(item, { ...spec, format: 'text' }))
					.filter((item) => item !== '')
				return items.join(', ')
			}
			if (format === 'date' || format === 'date-long') {
				const date = parseDateValue(raw)
				if (date === null) {
					return ''
				}
				// A year far from now forces the long form, so date-long reuses the board formatter.
				return format === 'date-long'
					? formatBoardDate(date, new Date(date.getFullYear() + 1, 0, 1))
					: formatBoardDate(date)
			}
			if (typeof raw === 'object') {
				const label = raw.title || raw.name || raw.label || raw.displayName
				return typeof label === 'string' ? label : ''
			}
			if (typeof raw === 'boolean') {
				const mapped = spec.map && spec.map[String(raw)]
				return mapped ? this.tr(mapped) : this.tr(raw ? 'Yes' : 'No')
			}
			if (spec.map && Object.hasOwn(spec.map, String(raw))) {
				return this.tr(spec.map[String(raw)])
			}
			return String(raw)
		},

		/**
		 * Replace `@source.<field>` / `@source.id` and the shared tokens in a string.
		 *
		 * @param {string} value The template.
		 * @param {object|null} record The object shown.
		 * @return {string} The value, '' when a token stays unresolved.
		 */
		resolveTemplate(value, record) {
			if (typeof value !== 'string') {
				return value
			}
			let unresolved = false
			const replaced = value.replace(/@source\.([\w.@]+)/g, (match, path) => {
				const read = record ? (path === 'id' ? (record.id ?? readPath(record, '@self.id')) : readPath(record, path)) : undefined
				if (read === undefined || read === null || read === '') {
					unresolved = true
					return match
				}
				return String(read)
			})
			if (unresolved) {
				return ''
			}
			if (replaced.charAt(0) === '@') {
				const resolved = resolveDeepTokens(replaced, this.tokenCtx)
				return typeof resolved === 'string' && resolved.charAt(0) === '@' ? '' : String(resolved)
			}
			return replaced
		},

		/**
		 * Resolve a route declaration (`{ name, params?, query? }`).
		 *
		 * @param {object} route The declaration.
		 * @param {object|null} record The object shown.
		 * @return {object|null} The route, or null when a param stays unresolved.
		 */
		resolveRoute(route, record) {
			if (!route || typeof route !== 'object' || !route.name) {
				return null
			}
			const out = { name: route.name }
			for (const key of ['params', 'query']) {
				if (route[key] && typeof route[key] === 'object') {
					out[key] = {}
					for (const [name, value] of Object.entries(route[key])) {
						const resolved = this.resolveTemplate(value, record)
						if (resolved === '') {
							return null
						}
						out[key][name] = resolved
					}
				}
			}
			return out
		},
	},
}
</script>

<style scoped>
.cn-facts-widget {
	display: flex;
	flex-direction: column;
	gap: 10px;
	min-width: 0;
}

.cn-facts-widget__rows {
	display: grid;
	grid-template-columns: max-content 1fr;
	gap: 8px 16px;
	margin: 0;
	font-size: 14px;
}

/* Each row is a grid of its own children: the wrapper takes no box. */
.cn-facts-widget__row {
	display: contents;
}

.cn-facts-widget__label {
	color: var(--color-text-maxcontrast);
}

.cn-facts-widget__value {
	margin: 0;
	font-weight: 500;
	min-width: 0;
	overflow-wrap: anywhere;
}

.cn-facts-widget__title {
	font-size: 15px;
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-facts-widget__line {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-facts-widget__muted {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-facts-widget__link {
	font-size: 14px;
	font-weight: 600;
	color: var(--color-primary-element);
	text-decoration: underline;
}
</style>

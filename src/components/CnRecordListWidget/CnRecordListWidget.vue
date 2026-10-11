<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div
		class="cn-record-list"
		:class="`cn-record-list--${presentation}`"
		data-testid="cn-record-list">
		<p v-if="error" class="cn-record-list__error" data-testid="cn-record-list-error">
			{{ errorLabel }}
		</p>
		<div v-else-if="loading && rows.length === 0" class="cn-record-list__loading">
			<NcLoadingIcon :size="20" :name="loadingLabel" />
		</div>
		<p v-else-if="rows.length === 0" class="cn-record-list__empty" data-testid="cn-record-list-empty">
			{{ emptyLabel }}
		</p>
		<ul v-else class="cn-record-list__list">
			<li
				v-for="item in items"
				:key="item.key"
				class="cn-record-list__item"
				data-testid="cn-record-list-item">
				<!-- rows: title and meta, then the pill, the date and a chevron. -->
				<component
					:is="item.tag"
					v-if="presentation === 'rows'"
					class="cn-record-list__row"
					:class="{ 'cn-record-list__row--link': item.tag !== 'div' }"
					v-bind="item.attrs">
					<span class="cn-record-list__main">
						<span v-if="item.title" class="cn-record-list__title">{{ item.title }}</span>
						<span v-if="item.meta" class="cn-record-list__meta">{{ item.meta }}</span>
					</span>
					<span v-if="item.pill || item.trailing" class="cn-record-list__aside">
						<CnStatusBadge
							v-if="item.pill"
							:label="item.pill.label"
							:variant="item.pill.variant"
							size="small" />
						<span v-if="item.trailing" class="cn-record-list__trailing">{{ item.trailing }}</span>
					</span>
					<ChevronRight
						v-if="item.tag !== 'div'"
						class="cn-record-list__chevron"
						:size="18"
						aria-hidden="true" />
				</component>

				<!-- feed: a round icon, a meta line and the text. -->
				<div v-else-if="presentation === 'feed'" class="cn-record-list__feed-row">
					<span class="cn-record-list__feed-icon" aria-hidden="true">
						<CnIcon :name="item.icon" :size="18" />
					</span>
					<component :is="item.tag" class="cn-record-list__main" v-bind="item.attrs">
						<span v-if="item.meta" class="cn-record-list__meta">{{ item.meta }}</span>
						<span v-if="item.text" class="cn-record-list__text">{{ item.text }}</span>
					</component>
				</div>

				<!-- inline: a label and the title, the title a link. -->
				<div v-else class="cn-record-list__inline-row">
					<span v-if="item.label" class="cn-record-list__label">{{ item.label }}</span>
					<component :is="item.tag" class="cn-record-list__inline-title" v-bind="item.attrs">
						{{ item.title }}
					</component>
				</div>
			</li>
		</ul>
	</div>
</template>

<script>
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import CnStatusBadge from '../CnStatusBadge/CnStatusBadge.vue'
import { isBadgeVariant } from '../../utils/badgeVariants.js'
import { fillTemplate, firstFilled } from '../../utils/fillTemplate.js'
import { readPath } from '../../utils/readPath.js'
import { dropOptionalUnresolved, hasUnresolvedTokens, resolveFilterTokens } from '../../utils/resolveFilterTokens.js'

const PAGE_REFRESH_CHANNEL = 'cn:page:refresh'
const PRESENTATIONS = ['rows', 'feed', 'inline']

/**
 * Unwrap a value that may be a ref.
 *
 * @param {unknown} value The value.
 * @return {unknown} The plain value.
 */
function unwrap(value) {
	return value && typeof value === 'object' && 'value' in value ? value.value : value
}

/**
 * CnRecordListWidget — the objects of another schema that point at this
 * record, drawn as the boards draw them (screens-relation-pages).
 *
 * A person page lists its open cases ("Verlichting fietspad Lindelaan,
 * 2026-0082 · Woo-verzoek, In behandeling, Termijn 1 nov"), its latest contact
 * moments (an icon by channel, a meta line, the summary) and its relations
 * ("Secretaris van Buurtvereniging Oost"). Each is a list of another schema's
 * objects filtered on a reference to this record. The source keys are those of
 * `object-list` (`register`, `schema`, `filter` with the `@objectId` /
 * `@object.<field>` / `@workspace.<key>` tokens, `sort`, `limit`, `extend`,
 * `rowRoute`); what differs is the drawing: `presentation` is `rows`, `feed`
 * or `inline`, and each line is a template (`"{identifier} · {caseTypeName}"`,
 * `"Termijn {deadline|date}"`).
 *
 * A content-only catalog type: on a card surface the detail host draws the
 * titled card. The widget emits `header` with `{ link, note }` (the
 * `headerLink` and `headerNote` with `{total}` filled in) for that card's
 * header.
 */
export default {
	name: 'CnRecordListWidget',

	components: { ChevronRight, CnIcon, CnStatusBadge, NcLoadingIcon },

	inject: {
		/** Detail-page object context (`{ objectId, object, register, schema }`). */
		cnObjectContext: { default: null },
		/** Page workspace bag, for `@workspace.<key>` tokens. */
		cnWorkspaceContext: { default: null },
		/** The host app's translate function. */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The list config: `{ register, schema, filter?, sort?, limit?, extend?,
		 * presentation?, title?, meta?, text?, label?, pill?, trailing?, icon?,
		 * rowRoute?, rowIdField?, headerLink?, headerNote?, emptyText?, errorText? }`.
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The current record's id, for the `@objectId` token. */
		objectId: {
			type: [String, Number],
			default: null,
		},

		/** The current record, for `@object.<field>` tokens. */
		objectData: {
			type: Object,
			default: null,
		},
	},

	emits: ['header'],

	data() {
		return {
			rows: [],
			total: 0,
			loading: false,
			error: false,
		}
	},

	computed: {
		/** @return {string} `rows`, `feed` or `inline`. */
		presentation() {
			const value = this.content?.presentation
			return PRESENTATIONS.includes(value) ? value : 'rows'
		},

		/** @return {object} The token context: record, id and workspace. */
		tokenCtx() {
			const injected = unwrap(this.cnObjectContext) || {}
			return {
				...injected,
				objectId: this.objectId ?? injected.objectId ?? this.objectData?.id ?? null,
				object: this.objectData || injected.object || null,
				workspace: unwrap(this.cnWorkspaceContext) || {},
			}
		},

		/** @return {object} The filter with its tokens resolved. */
		resolvedFilter() {
			const filter = this.content?.filter
			return dropOptionalUnresolved(resolveFilterTokens(filter && typeof filter === 'object' ? filter : {}, this.tokenCtx))
		},

		/** @return {boolean} A required token (the record id, say) has no value yet. */
		waiting() {
			return hasUnresolvedTokens(this.resolvedFilter)
		},

		/** @return {number} The fetch cap. */
		limit() {
			const value = Number(this.content?.limit)
			return Number.isFinite(value) && value > 0 ? Math.floor(value) : 5
		},

		/** @return {string} What a fetch depends on; a change fetches again. */
		requestKey() {
			const c = this.content || {}
			return JSON.stringify([c.register, c.schema, this.resolvedFilter, c.sort, this.limit, c.extend, this.waiting])
		},

		/** @return {Array<object>} The rows ready to draw. */
		items() {
			const c = this.content || {}
			return this.rows.slice(0, this.limit).map((row, index) => {
				const link = this.rowLink(row)
				return {
					key: (row && (row.id || row['@self']?.id)) || `row-${index}`,
					tag: link ? 'router-link' : 'div',
					attrs: link ? { to: link } : {},
					title: this.fill(c.title, row),
					meta: this.fill(c.meta, row),
					text: this.fill(c.text, row),
					label: this.fill(c.label, row),
					trailing: c.trailing ? firstFilled(c.trailing, row, this.translate) : '',
					pill: this.pillOf(row),
					icon: this.iconOf(row),
				}
			})
		},

		/** @return {object|null} The header link with `{total}` filled and tokens resolved. */
		headerLink() {
			const link = this.content?.headerLink
			if (!link || typeof link !== 'object' || typeof link.label !== 'string' || link.label === '') {
				return null
			}
			const resolved = { label: this.withTotal(link.label) }
			if (link.route) {
				resolved.route = link.route
				if (link.params && typeof link.params === 'object') {
					resolved.params = resolveFilterTokens(link.params, this.tokenCtx)
				}
				if (link.query && typeof link.query === 'object') {
					resolved.query = resolveFilterTokens(link.query, this.tokenCtx)
				}
			} else if (typeof link.href === 'string') {
				resolved.href = link.href
			}
			return resolved
		},

		/** @return {string} The header note with `{total}` filled. */
		headerNote() {
			const note = this.content?.headerNote
			return typeof note === 'string' && note !== '' ? this.withTotal(note) : ''
		},

		/** @return {string} The empty line. */
		emptyLabel() {
			return this.content?.emptyText ? this.translate(this.content.emptyText) : t('nextcloud-vue', 'Nothing here yet')
		},

		/** @return {string} The error line. */
		errorLabel() {
			return this.content?.errorText ? this.translate(this.content.errorText) : t('nextcloud-vue', 'This list could not be loaded.')
		},

		/** @return {string} The spinner's accessible name. */
		loadingLabel() {
			return t('nextcloud-vue', 'Loading …')
		},
	},

	watch: {
		requestKey() {
			this.fetchRows()
		},
	},

	mounted() {
		this.onRefresh = () => this.fetchRows()
		subscribe(PAGE_REFRESH_CHANNEL, this.onRefresh)
		this.fetchRows()
	},

	beforeUnmount() {
		unsubscribe(PAGE_REFRESH_CHANNEL, this.onRefresh)
	},

	methods: {
		/**
		 * Translate a manifest string through the host app.
		 *
		 * @param {string} text The text.
		 * @return {string} The translation.
		 */
		translate(text) {
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/**
		 * Fill a template from a row, after translating it.
		 *
		 * @param {string} template The template.
		 * @param {object} row The row.
		 * @return {string} The text, '' when a token is empty.
		 */
		fill(template, row) {
			return typeof template === 'string' && template !== '' ? fillTemplate(this.translate(template), row) : ''
		},

		/**
		 * Replace `{total}` in a translated label.
		 *
		 * @param {string} label The label.
		 * @return {string} The text.
		 */
		withTotal(label) {
			return this.translate(label).replace(/\{total\}/g, String(this.total))
		},

		/**
		 * The route a row opens: `rowRoute` with the id at `rowIdField`.
		 *
		 * @param {object} row The row.
		 * @return {object|null} The router location, or null.
		 */
		rowLink(row) {
			const route = this.content?.rowRoute
			if (!route || !this.$router || !row) {
				return null
			}
			const field = this.content?.rowIdField
			const id = field ? readPath(row, field) : (row.id || row['@self']?.id)
			if (id === null || id === undefined || id === '' || typeof id === 'object') {
				return null
			}
			return { name: route, params: { id: String(id) } }
		},

		/**
		 * The row's pill: `{ field, labels?, colorMap?, variant? }`.
		 *
		 * @param {object} row The row.
		 * @return {{label: string, variant: string}|null} The pill, or null.
		 */
		pillOf(row) {
			const pill = this.content?.pill
			if (!pill || typeof pill !== 'object' || !pill.field) {
				return null
			}
			const raw = readPath(row, pill.field)
			if (raw === null || raw === undefined || raw === '' || typeof raw === 'object') {
				return null
			}
			const key = String(raw)
			const labels = pill.labels && typeof pill.labels === 'object' ? pill.labels : {}
			const map = pill.colorMap && typeof pill.colorMap === 'object' ? pill.colorMap : {}
			const found = Object.keys(map).find((k) => k.toLowerCase() === key.toLowerCase())
			const variant = found ? map[found] : pill.variant
			return {
				label: labels[key] ? this.translate(labels[key]) : key,
				variant: isBadgeVariant(variant) ? variant : 'default',
			}
		},

		/**
		 * The feed icon: an icon name, or `{ field, map, default }`.
		 *
		 * @param {object} row The row.
		 * @return {string} The MDI icon name.
		 */
		iconOf(row) {
			const icon = this.content?.icon
			if (typeof icon === 'string' && icon !== '') {
				return icon
			}
			if (icon && typeof icon === 'object') {
				const raw = icon.field ? readPath(row, icon.field) : undefined
				const map = icon.map && typeof icon.map === 'object' ? icon.map : {}
				if (raw !== null && raw !== undefined && map[String(raw)]) {
					return map[String(raw)]
				}
				if (typeof icon.default === 'string' && icon.default !== '') {
					return icon.default
				}
			}
			return 'CircleSmall'
		},

		/** Tell the card around this list what its header shows. */
		emitHeader() {
			/**
			 * @event header Emitted after every read with the card header's parts.
			 * @type {{link: (object|null), note: string}} The header link (resolved, with `{total}` filled) and the note.
			 */
			this.$emit('header', { link: this.headerLink, note: this.headerNote })
		},

		/**
		 * Fetch the list. Sends nothing while a required token is unresolved
		 * or the source is incomplete.
		 *
		 * @return {Promise<void>}
		 */
		async fetchRows() {
			const c = this.content || {}
			if (!c.register || !c.schema || this.waiting) {
				this.rows = []
				this.total = 0
				this.error = false
				this.emitHeader()
				return
			}
			this.loading = true
			this.error = false
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const url = generateUrl('/apps/openregister/api/objects/{register}/{schema}', { register: c.register, schema: c.schema })
				const params = { _limit: this.limit }
				if (c.sort && typeof c.sort === 'object' && c.sort.field) {
					params[`_order[${c.sort.field}]`] = c.sort.dir === 'desc' ? 'desc' : 'asc'
				}
				if (Array.isArray(c.extend)) {
					const extend = c.extend.filter((e) => typeof e === 'string' && e !== '')
					if (extend.length > 0) {
						params._extend = extend
					}
				}
				for (const [key, value] of Object.entries(this.resolvedFilter)) {
					if (value && typeof value === 'object' && !Array.isArray(value)) {
						for (const [op, operand] of Object.entries(value)) {
							params[`${key}[${op}]`] = operand
						}
					} else if (value !== '' && value !== null && value !== undefined) {
						params[key] = value
					}
				}
				const response = await axios.get(url, { params })
				const data = response && response.data ? response.data : {}
				this.rows = Array.isArray(data.results) ? data.results : []
				this.total = typeof data.total === 'number' ? data.total : this.rows.length
			} catch (e) {
				// eslint-disable-next-line no-console
				console.warn('[CnRecordListWidget] failed to load objects:', e)
				this.rows = []
				this.total = 0
				this.error = true
			} finally {
				this.loading = false
				this.emitHeader()
			}
		},
	},
}
</script>

<style scoped>
.cn-record-list__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-record-list__empty,
.cn-record-list__error {
	color: var(--color-text-maxcontrast);
	margin: 0;
}

.cn-record-list__loading {
	display: flex;
	justify-content: center;
	padding: 8px 0;
}

/* rows */
.cn-record-list--rows .cn-record-list__item + .cn-record-list__item {
	border-top: 1px solid var(--color-border);
}

.cn-record-list__row {
	align-items: center;
	color: var(--color-main-text);
	display: flex;
	gap: 16px;
	padding: 12px 0;
	text-decoration: none;
}

.cn-record-list__row--link:hover .cn-record-list__title,
.cn-record-list__row--link:focus-visible .cn-record-list__title {
	text-decoration: underline;
}

.cn-record-list__main {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.cn-record-list__title {
	font-size: 15px;
	font-weight: 700;
}

.cn-record-list__meta {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-record-list__aside {
	align-items: center;
	display: flex;
	flex: none;
	gap: 16px;
}

.cn-record-list__trailing {
	font-size: 14px;
	white-space: nowrap;
}

.cn-record-list__chevron {
	color: var(--color-text-maxcontrast);
	flex: none;
}

/* feed */
.cn-record-list--feed .cn-record-list__item + .cn-record-list__item {
	border-top: 1px solid var(--color-border);
}

.cn-record-list__feed-row {
	align-items: flex-start;
	display: flex;
	gap: 14px;
	padding: 12px 0;
}

.cn-record-list__feed-icon {
	align-items: center;
	background: var(--color-primary-element-light);
	border-radius: 50%;
	color: var(--color-primary-element-light-text, var(--color-primary-element));
	display: flex;
	flex: none;
	height: 36px;
	justify-content: center;
	width: 36px;
}

.cn-record-list__text {
	font-size: 15px;
}

.cn-record-list--feed .cn-record-list__main {
	color: var(--color-main-text);
	text-decoration: none;
}

/* inline */
.cn-record-list__inline-row {
	padding: 4px 0;
}

.cn-record-list__label {
	margin-inline-end: 4px;
}

.cn-record-list__inline-title {
	color: var(--color-main-text);
}

a.cn-record-list__inline-title {
	color: var(--color-primary-element);
	text-decoration: underline;
}
</style>

<style>
/* In a narrow side column a row stacks: title, meta, then pill and date. */
.cn-detail-page__side .cn-record-list__row {
	align-items: flex-start;
	flex-direction: column;
	gap: 6px;
}

.cn-detail-page__side .cn-record-list__row .cn-record-list__title {
	color: var(--color-primary-element);
	text-decoration: underline;
}

.cn-detail-page__side .cn-record-list__chevron {
	display: none;
}
</style>

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
					<span v-if="item.initials"
						class="cn-record-list__avatar"
						aria-hidden="true"
						data-testid="cn-record-list-avatar">{{ item.initials }}</span>
					<span class="cn-record-list__main">
						<span v-if="item.title" class="cn-record-list__title">{{ item.title }}</span>
						<span v-if="item.meta" class="cn-record-list__meta">{{ item.meta }}</span>
					</span>
					<span v-if="item.pill || item.badges.length > 0 || item.due || item.trailing" class="cn-record-list__aside">
						<CnStatusBadge
							v-if="item.pill"
							:label="item.pill.label"
							:variant="item.pill.variant"
							size="small" />
						<CnStatusBadge
							v-for="badge in item.badges"
							:key="badge.key"
							:label="badge.label"
							:variant="badge.variant"
							size="small"
							:data-testid="`cn-record-list-badge-${badge.kind}`" />
						<span
							v-if="item.due"
							class="cn-record-list__due"
							:class="`cn-record-list__due--${item.due.tone}`"
							data-testid="cn-record-list-due">{{ item.due.text }}</span>
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
import { ageInDays } from '../../utils/boardDate.js'
import { resolveDue } from '../../utils/dueText.js'
import { fillTemplate, firstFilled } from '../../utils/fillTemplate.js'
import { initialsOf } from '../../utils/initials.js'
import { pageFilter, pageSort } from '../../utils/pageControls.js'
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
 * `rowRoute`, `pageControls`); `avatar` puts a circle with the initials of a name
 * template before the title; what differs is the drawing: `presentation` is `rows`, `feed`
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
			const filter = pageFilter(this.content?.pageControls, this.tokenCtx.workspace, this.content?.filter)
			return dropOptionalUnresolved(resolveFilterTokens(filter, this.tokenCtx))
		},

		/** @return {boolean} A required token (the record id, say) has no value yet. */
		waiting() {
			return hasUnresolvedTokens(this.resolvedFilter)
		},

		/** @return {object|null} The sort: the page's sort control when the widget listens to one, else its own. */
		effectiveSort() {
			return pageSort(this.content?.pageControls, this.tokenCtx.workspace, this.content?.sort)
		},

		/** @return {number} The fetch cap. */
		limit() {
			const value = Number(this.content?.limit)
			return Number.isFinite(value) && value > 0 ? Math.floor(value) : 5
		},

		/** @return {string} What a fetch depends on; a change fetches again. */
		requestKey() {
			const c = this.content || {}
			return JSON.stringify([c.register, c.schema, this.resolvedFilter, this.effectiveSort, this.limit, c.extend, this.waiting])
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
					initials: this.initialsFor(row),
					title: this.fill(c.title, row),
					meta: this.fill(c.meta, row),
					text: this.fill(c.text, row),
					label: this.fill(c.label, row),
					trailing: c.trailing ? firstFilled(c.trailing, row, this.translate) : '',
					pill: this.pillOf(row),
					badges: this.badgesOf(row),
					due: this.dueOf(row),
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
		 * The initials of the row's avatar (`avatar`: a name template such as
		 * `"{client.name}"`, or `{ text }`), or '' without one.
		 *
		 * @param {object} row The row.
		 * @return {string} One or two letters.
		 * @spec openspec/changes/screens-record-list-avatar/specs/record-list-avatar/spec.md#requirement-a-record-list-row-can-carry-an-avatar
		 */
		initialsFor(row) {
			const avatar = this.content?.avatar
			const template = typeof avatar === 'string' ? avatar : (avatar && typeof avatar === 'object' ? avatar.text : '')
			return initialsOf(this.fill(template, row))
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
		 * The row's due text (`due`: `{ field, todayLabel?, overdueLabel?, emptyText? }`):
		 * "3 dagen te laat" in the danger tone, "Vandaag", the date otherwise,
		 * `emptyText` when the field is empty.
		 *
		 * @param {object} row The row.
		 * @return {{text: string, tone: string}|null} The text and tone, or null.
		 * @spec openspec/changes/screens-due-text/specs/due-text/spec.md#requirement-a-due-date-reads-as-text-with-a-tone
		 */
		dueOf(row) {
			const due = this.content?.due
			if (!due || typeof due !== 'object' || !due.field) {
				return null
			}
			return resolveDue(readPath(row, due.field), due, (text) => this.translate(text))
		},

		/**
		 * The row's extra badges (`badges`): a coloured badge from a field
		 * (`{ field, labels?, colorMap?, variant?, hideValues? }`, the value
		 * shown unless `hideValues` lists it) and an age badge
		 * (`{ kind: "stale", field, afterDays, label?, variant? }`, shown when the
		 * date field is older than `afterDays` whole days; `{days}` in the
		 * label is the age).
		 *
		 * @param {object} row The row.
		 * @return {Array<{key: string, kind: string, label: string, variant: string}>} The badges that apply.
		 * @spec openspec/changes/screens-record-list-badges/specs/record-list-badges/spec.md#requirement-a-record-list-row-can-carry-badges
		 */
		badgesOf(row) {
			const declared = Array.isArray(this.content?.badges) ? this.content.badges : []
			const out = []
			declared.forEach((badge, index) => {
				if (!badge || typeof badge !== 'object' || !badge.field) {
					return
				}
				if (badge.kind === 'stale') {
					const days = ageInDays(readPath(row, badge.field))
					const after = Number(badge.afterDays)
					if (days === null || !Number.isFinite(after) || days <= after) {
						return
					}
					const template = this.translate(badge.label || 'Stale')
					out.push({
						key: `stale-${index}`,
						kind: 'stale',
						label: template.replace(/\{days\}/g, String(days)),
						variant: isBadgeVariant(badge.variant) ? badge.variant : 'warning',
					})
					return
				}
				const made = this.pillOf(row, badge)
				if (made) {
					out.push({ key: `field-${index}`, kind: 'field', ...made })
				}
			})
			return out
		},

		/**
		 * The row's pill: `{ field, labels?, colorMap?, variant?, hideValues? }`.
		 *
		 * @param {object} row The row.
		 * @param {object} [config] A pill config; the widget's `pill` by default.
		 * @return {{label: string, variant: string}|null} The pill, or null.
		 */
		pillOf(row, config) {
			const pill = config || this.content?.pill
			if (!pill || typeof pill !== 'object' || !pill.field) {
				return null
			}
			const raw = readPath(row, pill.field)
			if (raw === null || raw === undefined || raw === '' || typeof raw === 'object') {
				return null
			}
			const key = String(raw)
			if (Array.isArray(pill.hideValues) && pill.hideValues.map(String).includes(key)) {
				return null
			}
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
		 * The rank list of a sort (`{ field, rank: ["urgent", "high", "normal", "low"], then? }`),
		 * or null when the sort has none or the list's own filter already fixes the field.
		 *
		 * @param {object|null} sort The effective sort.
		 * @return {Array<string>|null} The values in rank order.
		 * @spec openspec/changes/screens-enum-rank-sort/specs/enum-rank-sort/spec.md#requirement-a-record-list-can-sort-by-the-rank-of-an-enum-value
		 */
		rankOf(sort) {
			if (!sort || typeof sort !== 'object' || !sort.field || !Array.isArray(sort.rank)) {
				return null
			}
			const rank = sort.rank.filter((value) => typeof value === 'string' && value !== '')
			if (rank.length === 0 || Object.hasOwn(this.resolvedFilter || {}, sort.field)) {
				return null
			}
			return rank
		},

		/**
		 * Read a list in the rank of an enum field. The list endpoint orders a
		 * text field alphabetically ("high", "low", "normal", "urgent"), so the
		 * rows are read one rank at a time, best first, each with the rest of the
		 * sort (`then`) inside it, until the page is full; the rows with a value
		 * outside the rank (or none) follow. The result is exact, not a client-side
		 * sort of a partial page. It costs one request for the total, one per rank
		 * value read and one for the remainder.
		 *
		 * @param {object} axios The axios instance.
		 * @param {string} url The list url.
		 * @param {object} base The params without any order.
		 * @param {{field: string, then?: {field: string, dir?: string}}} sort The sort.
		 * @param {Array<string>} rank The values in rank order.
		 * @return {Promise<{rows: Array<object>, total: number}>} The page and the total.
		 * @spec openspec/changes/screens-enum-rank-sort/specs/enum-rank-sort/spec.md#requirement-a-record-list-can-sort-by-the-rank-of-an-enum-value
		 */
		async fetchRanked(axios, url, base, sort, rank) {
			const order = {}
			if (sort.then && typeof sort.then === 'object' && sort.then.field) {
				order[`_order[${sort.then.field}]`] = sort.then.dir === 'desc' ? 'desc' : 'asc'
			}
			const read = async (extra) => {
				const response = await axios.get(url, { params: { ...base, ...order, ...extra } })
				const data = response && response.data ? response.data : {}
				return { results: Array.isArray(data.results) ? data.results : [], total: data.total }
			}
			const head = await read({ _limit: 1 })
			const rows = []
			const seen = new Set()
			const idOf = (row) => (row && (row.id || row['@self']?.id)) || null
			const take = (list) => {
				for (const row of list) {
					const id = idOf(row)
					if (id !== null && seen.has(id)) {
						continue
					}
					if (id !== null) {
						seen.add(id)
					}
					if (rows.length < this.limit) {
						rows.push(row)
					}
				}
			}
			for (const value of rank) {
				if (rows.length >= this.limit) {
					break
				}
				take((await read({ [sort.field]: value, _limit: this.limit - rows.length })).results)
			}
			if (rows.length < this.limit) {
				take((await read({ _limit: this.limit + rows.length })).results)
			}
			return { rows, total: typeof head.total === 'number' ? head.total : rows.length }
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
			const run = this.fetchRun = (this.fetchRun || 0) + 1
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const url = generateUrl('/apps/openregister/api/objects/{register}/{schema}', { register: c.register, schema: c.schema })
				const sort = this.effectiveSort
				const params = { _limit: this.limit }
				// A rank sort (`sort.rank`) cannot be one `_order`: the list endpoint
				// orders a text field alphabetically. It is read group by group below.
				const rank = this.rankOf(sort)
				if (!rank && sort && typeof sort === 'object' && sort.field) {
					params[`_order[${sort.field}]`] = sort.dir === 'desc' ? 'desc' : 'asc'
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
				if (rank) {
					// Several requests: a fetch started later (the sort changed
					// meanwhile) must not be overwritten by this one.
					const ranked = await this.fetchRanked(axios, url, params, sort, rank)
					if (run !== this.fetchRun) {
						return
					}
					this.rows = ranked.rows
					this.total = ranked.total
					return
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

.cn-record-list__avatar {
	align-items: center;
	background: var(--color-background-hover);
	border-radius: 50%;
	color: var(--color-main-text);
	display: flex;
	flex: none;
	font-size: 12px;
	font-weight: 700;
	height: 36px;
	justify-content: center;
	width: 36px;
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

.cn-record-list__due {
	font-size: 14px;
	white-space: nowrap;
}

.cn-record-list__due--danger {
	color: var(--color-text-error, var(--color-error-text));
	font-weight: 600;
}

.cn-record-list__due--empty {
	color: var(--color-text-maxcontrast);
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

/* A row is a touch target of at least 44px on a phone. */
@media (max-width: 640px) {
	.cn-record-list__row {
		min-height: 44px;
	}
}
</style>

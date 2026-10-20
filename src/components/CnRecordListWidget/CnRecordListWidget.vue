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
		<!-- notice: the rows as sentences in one toned box ("2 waarschuwingen: ..."). -->
		<div
			v-else-if="presentation === 'notice'"
			class="cn-record-list__notice"
			:class="`cn-record-list__notice--${noticeVariant}`"
			role="note"
			data-testid="cn-record-list-notice">
			<CnIcon
				:name="noticeIcon"
				:size="18"
				class="cn-record-list__notice-icon"
				aria-hidden="true" />
			<p class="cn-record-list__notice-text">
				{{ noticeText }}
			</p>
		</div>
		<!-- table: one row per record under a header, one cell per `columns`
		     entry; a cell past its `alertAbove` reads bold in the danger colour. -->
		<table v-else-if="presentation === 'table'" class="cn-record-list__table" data-testid="cn-record-list-table">
			<thead>
				<tr>
					<th
						v-for="col in tableColumns"
						:key="col.key"
						scope="col"
						:class="{ 'cn-record-list__cell--end': col.align === 'end' }">
						{{ col.label }}
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="item in tableRows" :key="item.key" data-testid="cn-record-list-item">
					<td
						v-for="cell in item.cells"
						:key="cell.key"
						:class="{ 'cn-record-list__cell--end': cell.align === 'end', 'cn-record-list__cell--alert': cell.alert }">
						{{ cell.text }}
					</td>
				</tr>
			</tbody>
		</table>
		<ul v-else class="cn-record-list__list">
			<li
				v-for="item in items"
				:key="item.key"
				class="cn-record-list__item"
				data-testid="cn-record-list-item">
				<!-- rows with `rowAction`: the title is the link, and one action
				     ends the row instead of the chevron ("Beoordelen"). -->
				<div
					v-if="presentation === 'rows' && item.action"
					class="cn-record-list__row cn-record-list__row--action">
					<span v-if="item.initials"
						class="cn-record-list__avatar"
						aria-hidden="true"
						data-testid="cn-record-list-avatar">{{ item.initials }}</span>
					<span v-if="item.dot"
						class="cn-record-list__dot"
						:style="{ background: item.dot }"
						aria-hidden="true"
						data-testid="cn-record-list-dot" />
					<span class="cn-record-list__main">
						<component
							:is="item.tag"
							v-if="item.title"
							class="cn-record-list__title"
							:class="{ 'cn-record-list__title--link': item.tag !== 'div' }"
							v-bind="item.attrs">
							{{ item.title }}
						</component>
						<span v-if="item.meta" class="cn-record-list__meta">{{ item.meta }}</span>
					</span>
					<span v-if="item.flag" class="cn-record-list__flag" data-testid="cn-record-list-flag">{{ item.flag }}</span>
					<span v-if="item.pill || item.badges.length > 0" class="cn-record-list__pills">
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
					</span>
					<span
						v-if="item.due"
						class="cn-record-list__due cn-record-list__due--column"
						:class="[`cn-record-list__due--${item.due.tone}`, { 'cn-record-list__due--soon': item.due.soon }]"
						data-testid="cn-record-list-due">{{ item.due.text }}</span>
					<span v-if="item.trailing" class="cn-record-list__trailing">{{ item.trailing }}</span>
					<component
						:is="item.action.tag"
						class="cn-record-list__action"
						v-bind="item.action.attrs"
						data-testid="cn-record-list-action"
						v-on="item.action.tag === 'button' ? { click: () => runRowAction(item.row) } : {}">
						{{ item.action.label }}
					</component>
				</div>
				<!-- rows: title and meta, then the pill, the date and a chevron. -->
				<component
					:is="item.tag"
					v-else-if="presentation === 'rows'"
					class="cn-record-list__row"
					:class="{ 'cn-record-list__row--link': item.tag !== 'div' }"
					v-bind="item.attrs">
					<span v-if="item.initials"
						class="cn-record-list__avatar"
						aria-hidden="true"
						data-testid="cn-record-list-avatar">{{ item.initials }}</span>
					<span v-if="item.dot"
						class="cn-record-list__dot"
						:style="{ background: item.dot }"
						aria-hidden="true"
						data-testid="cn-record-list-dot" />
					<span class="cn-record-list__main">
						<span v-if="item.title" class="cn-record-list__title">{{ item.title }}</span>
						<span v-if="item.meta" class="cn-record-list__meta">{{ item.meta }}</span>
					</span>
					<span v-if="item.pill || item.badges.length > 0 || item.due || item.trailing || item.flag" class="cn-record-list__aside">
						<span v-if="item.flag" class="cn-record-list__flag" data-testid="cn-record-list-flag">{{ item.flag }}</span>
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
							:class="[`cn-record-list__due--${item.due.tone}`, { 'cn-record-list__due--soon': item.due.soon }]"
							data-testid="cn-record-list-due">{{ item.due.text }}</span>
						<span v-if="item.trailing" class="cn-record-list__trailing">{{ item.trailing }}</span>
					</span>
					<ChevronRight
						v-if="item.tag !== 'div'"
						class="cn-record-list__chevron"
						:size="18"
						aria-hidden="true" />
				</component>

				<!-- cards: a framed card per row, the icon and title with the pill
				     beside them, the meta line, and `trailing` as the large figure. -->
				<component
					:is="item.tag"
					v-else-if="presentation === 'cards'"
					class="cn-record-list__card"
					:class="{ 'cn-record-list__card--link': item.tag !== 'div' }"
					v-bind="item.attrs"
					data-testid="cn-record-list-card">
					<span class="cn-record-list__card-head">
						<span class="cn-record-list__card-title">
							<CnIcon
								v-if="cardIcons"
								class="cn-record-list__card-icon"
								:name="item.icon"
								:size="18" />
							<span v-if="item.title" class="cn-record-list__title">{{ item.title }}</span>
						</span>
						<span v-if="item.pill || item.badges.length > 0" class="cn-record-list__card-pills">
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
						</span>
					</span>
					<span v-if="item.meta" class="cn-record-list__meta">{{ item.meta }}</span>
					<span v-if="item.trailing" class="cn-record-list__card-value" data-testid="cn-record-list-card-value">{{ item.trailing }}</span>
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
				<!-- `bar`: a thin track under the row, filled to the row's value
				     against its own maximum or against the largest row. -->
				<span
					v-if="presentation === 'rows' && item.bar"
					class="cn-record-list__bar"
					:class="{ 'cn-record-list__bar--over': item.bar.over }"
					role="meter"
					:aria-label="item.title || null"
					:aria-valuenow="item.bar.value"
					aria-valuemin="0"
					:aria-valuemax="item.bar.max"
					data-testid="cn-record-list-bar">
					<span class="cn-record-list__bar-fill" :style="{ width: `${item.bar.share}%` }" />
				</span>
			</li>
		</ul>
		<p v-if="footnote && !error" class="cn-record-list__footnote" data-testid="cn-record-list-footnote">
			{{ footnote }}
		</p>
		<!-- `footerAction`: one action under the list, also under the empty
		     text ("Beroep registreren"). With `disabledWhen` it greys out and
		     says why (`disabledReason`: "Kan zodra de beslissing is
		     verzonden"). -->
		<div
			v-if="footerAction && !error"
			class="cn-record-list__footer"
			data-testid="cn-record-list-footer">
			<NcButton
				variant="secondary"
				:disabled="footerDisabled"
				:aria-describedby="footerDisabled && footerAction.reason ? footerReasonId : null"
				data-testid="cn-record-list-footer-action"
				@click="runFooterAction">
				<template v-if="footerAction.icon" #icon>
					<CnIcon :name="footerAction.icon" :size="16" />
				</template>
				{{ footerAction.label }}
			</NcButton>
			<span
				v-if="footerDisabled && footerAction.reason"
				:id="footerReasonId"
				class="cn-record-list__footer-reason"
				data-testid="cn-record-list-footer-reason">{{ footerAction.reason }}</span>
		</div>
	</div>
</template>

<script>
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import { inject, ref } from 'vue'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import CnStatusBadge from '../CnStatusBadge/CnStatusBadge.vue'
import { useEndpointSource } from '../../composables/useEndpointSource.js'
import { actionLink, dispatchAction, interpolateActionTarget } from '../../utils/actionsDispatcher.js'
import { isBadgeVariant } from '../../utils/badgeVariants.js'
import { ageInDays } from '../../utils/boardDate.js'
import { resolveDue } from '../../utils/dueText.js'
import { fillTemplate, firstFilled } from '../../utils/fillTemplate.js'
import { unwrapAppConfig } from '../../utils/formatMetric.js'
import { initialsOf } from '../../utils/initials.js'
import { lensUnavailableText, readLensReports } from '../../utils/lensAvailability.js'
import { pageFilter, pageSort } from '../../utils/pageControls.js'
import { readPath } from '../../utils/readPath.js'
import { dropOptionalUnresolved, hasUnresolvedTokens, resolveFilterTokens } from '../../utils/resolveFilterTokens.js'
import { evaluateVisibleWhen } from '../../utils/visibleWhen.js'

const PAGE_REFRESH_CHANNEL = 'cn:page:refresh'

/** Gives each list's footer reason its own element id. */
let footerSeq = 0
const PRESENTATIONS = ['rows', 'feed', 'inline', 'cards', 'notice', 'table']

/** The tones a `notice` list takes. */
const NOTICE_VARIANTS = ['info', 'warning', 'error']

/**
 * A row that is a plain string or number (an endpoint answering `["...", "..."]`)
 * read as `{ value }`, so the templates reach it as `{value}` and a list
 * without a `title` shows the value itself. An object row is returned as is.
 *
 * @param {(object|string|number)} row The row.
 * @return {(object|string|number)} The row, or `{ value }` for a string or number.
 */
function scalarRow(row) {
	return typeof row === 'string' || typeof row === 'number' ? { value: String(row) } : row
}

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
 * `rowRoute`, `pageControls`), or `endpointSource` (an app endpoint whose
 * payload, after `responsePath`, is the array of rows, as on the object table); `avatar` puts a circle with the initials of a name
 * template before the title; what differs is the drawing: `presentation` is `rows`, `feed`
 * or `inline`, and each line is a template (`"{identifier} · {caseTypeName}"`,
 * `"Termijn {deadline|date}"`). `cards` draws a framed card per row in a
 * grid, with `trailing` as the large figure (board ShBank's accounts).
 *
 * A content-only catalog type: on a card surface the detail host or the
 * dashboard page draws the titled card. The widget emits `header` with `{ link, note }` (the
 * `headerLink` and `headerNote` with `{total}` filled in) for that card's
 * header.
 */
export default {
	name: 'CnRecordListWidget',

	components: { ChevronRight, CnIcon, CnStatusBadge, NcButton, NcLoadingIcon },

	inject: {
		/** Detail-page object context (`{ objectId, object, register, schema }`). */
		cnObjectContext: { default: null },
		/** Page workspace bag, for `@workspace.<key>` tokens. */
		cnWorkspaceContext: { default: null },
		/** The host app's translate function. */
		cnTranslate: { default: () => (key) => key },
		/** The page's app config map; its `currency` is the reporting currency of a money token. */
		cnAppConfig: { default: () => ({}) },
		/** The page's pre-bound action dispatcher (CnPageRenderer), for `rowAction`. */
		cnDispatchAction: { default: null },
	},

	props: {
		/**
		 * The list config: `{ register, schema, filter?, sort?, limit?, offset?, extend?,
		 * presentation?, variant?, lead?, title?, meta?, text?, label?, pill?, trailing?, icon?,
		 * rowRoute?, rowIdField?, headerLink?, headerNote?, emptyText?, errorText?,
		 * valueLabels?, endpointSource?, bar? }`. `bar` (`{ valueField, maxField?,
		 * overVariant? }`) draws a thin track under each row: filled to
		 * `valueField` against `maxField` (drawn in the error colour past it
		 * with `overVariant: "error"`), or without `maxField` against the
		 * largest row. `endpointSource` (`{ url, method?,
		 * params?, responsePath? }`) reads the rows from an app endpoint instead
		 * of `register` / `schema`. `valueLabels` maps a field's stored values to the labels
		 * the templates show. `headerNote` and `headerLink.label` fill `{total}`
		 * and `{count:<field>=<value>}`, the loaded rows with that value.
		 * A row that is a plain string or number (an endpoint
		 * answering `["…", "…"]`) is read as `{ value }`: templates reach it as
		 * `{value}`, and without `title` a row shows the value itself.
		 * `presentation: "notice"` draws the rows as sentences in one box toned by
		 * `variant` (`info`, `warning` or `error`), after an optional `lead`
		 * (`{total}` filled in).
		 * `dot` (a field, or `{ field, colorMap? }`) draws a colour dot before
		 * the title; `flags` (`[{ field, label, value? }]`) draws the labels
		 * of the flags a row has ("Start", "End") at its end.
		 * `footerAction` (`{ label, icon?, type, ..., disabledWhen?,
		 * disabledReason? }`) ends the card with one action, also under the
		 * empty text; while the visibleWhen condition `disabledWhen` holds the
		 * button is disabled and `disabledReason` shows under it.
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

	setup(props) {
		const objectCtxRaw = inject('cnObjectContext', null)
		const workspaceRaw = inject('cnWorkspaceContext', null)
		const appConfigRaw = inject('cnAppConfig', ref({}))
		const { data, loading, error } = useEndpointSource(
			() => props.content?.endpointSource || null,
			{
				ctx: () => {
					const injected = unwrap(objectCtxRaw) || {}
					return {
						...injected,
						objectId: props.objectId ?? injected.objectId ?? props.objectData?.id ?? null,
						object: props.objectData || injected.object || null,
						workspace: unwrap(workspaceRaw) || {},
						config: unwrapAppConfig(appConfigRaw) || {},
					}
				},
			},
		)
		return { epData: data, epLoading: loading, epError: error }
	},

	data() {
		return {
			rows: [],
			total: 0,
			loading: false,
			error: false,
			/** Personal-lens reports (`@self.lenses`) of the latest response. */
			lenses: {},
			/** Whether `footerAction.disabledWhen` holds. */
			footerDisabled: false,
			footerReasonId: `cn-record-list-footer-reason-${++footerSeq}`,
		}
	},

	computed: {
		/**
		 * The action under the list (`footerAction`: `{ label, icon?, type,
		 * ..., disabledWhen?, disabledReason? }`), labels through the host
		 * translate, or null without a label.
		 *
		 * @spec openspec/changes/record-list-footer-action/specs/record-list/spec.md#requirement-a-record-list-can-end-with-an-action-that-says-why-it-is-disabled
		 * @return {{label: string, icon: string, reason: string, action: object}|null}
		 */
		footerAction() {
			const action = this.content?.footerAction
			if (!action || typeof action !== 'object' || typeof action.label !== 'string' || action.label === '') {
				return null
			}
			return {
				label: this.translate(action.label),
				icon: typeof action.icon === 'string' ? action.icon : '',
				reason: typeof action.disabledReason === 'string' && action.disabledReason !== '' ? this.translate(action.disabledReason) : '',
				action,
			}
		},

		/**
		 * What `footerAction.disabledWhen` depends on, so it is evaluated again
		 * when the condition, the record or the workspace changes.
		 *
		 * @return {string}
		 */
		footerDisabledKey() {
			const cond = this.content?.footerAction?.disabledWhen
			if (!cond) {
				return ''
			}
			return JSON.stringify({ cond, object: this.tokenCtx.object, workspace: this.tokenCtx.workspace, total: this.total })
		},

		/** @return {string} `rows`, `feed`, `inline` or `cards`. */
		/**
		 * The tone of a `notice` list (`content.variant`): info, warning or error.
		 *
		 * @return {string} The variant, `info` when unset or unknown.
		 * @spec openspec/changes/record-list-string-rows/specs/record-list-string-rows/spec.md#requirement-a-record-list-draws-rows-that-are-plain-strings
		 */
		noticeVariant() {
			const value = this.content?.variant
			return NOTICE_VARIANTS.includes(value) ? value : 'info'
		},

		/** @return {string} The icon of the notice tone. */
		noticeIcon() {
			return this.noticeVariant === 'info' ? 'InformationOutline' : 'AlertOutline'
		},

		/**
		 * The rows of a `notice` list as one paragraph: each row's title, as
		 * sentences, after the optional `lead` with `{total}` filled in.
		 *
		 * @return {string} The text.
		 * @spec openspec/changes/record-list-string-rows/specs/record-list-string-rows/spec.md#requirement-a-record-list-draws-rows-that-are-plain-strings
		 */
		noticeText() {
			const parts = this.items.map((item) => item.title).filter((text) => text !== '')
			const lead = typeof this.content?.lead === 'string' && this.content.lead !== '' ? this.withTotal(this.content.lead) : ''
			return [lead, ...parts].filter(Boolean).join(' ')
		},

		presentation() {
			const value = this.content?.presentation
			return PRESENTATIONS.includes(value) ? value : 'rows'
		},

		/**
		 * Whether a `cards` card leads its title with an icon: only when the
		 * list declares `icon`, so a card without one has no placeholder.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/record-list-cards/specs/record-list-cards/spec.md#requirement-a-record-list-can-draw-its-rows-as-cards
		 */
		cardIcons() {
			const icon = this.content?.icon
			return (typeof icon === 'string' && icon !== '') || (Boolean(icon) && typeof icon === 'object')
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

		/**
		 * What a template may read beside the row: the app config, whose
		 * `currency` is the reporting currency of a `{path|currency}` token.
		 *
		 * @return {{config: object}} The template context.
		 * @spec openspec/changes/screens-currency-format/specs/currency-format/spec.md#requirement-a-money-value-reads-in-its-currency
		 */
		templateContext() {
			return { config: unwrapAppConfig(this.cnAppConfig) }
		},

		/**
		 * Whether the rows come from `endpointSource` rather than OpenRegister.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/endpoint-source-card-grid-record-list/specs/dashboard-page/spec.md#requirement-a-record-list-and-a-card-grid-can-read-an-endpoint
		 */
		endpointActive() {
			const source = this.content?.endpointSource
			return Boolean(source && typeof source === 'object' && source.url)
		},

		/** @return {string} The endpoint read's state, to copy into the list when it changes. */
		endpointKey() {
			return this.endpointActive ? JSON.stringify([this.epData, this.epLoading, this.epError]) : ''
		},

		/** @return {number} The fetch cap. */
		limit() {
			const value = Number(this.content?.limit)
			return Number.isFinite(value) && value > 0 ? Math.floor(value) : 5
		},

		/** @return {number} How many rows of the list to skip first (`content.offset`), 0 by default. */
		offset() {
			const value = Number(this.content?.offset)
			return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
		},

		/** @return {string} What a fetch depends on; a change fetches again. */
		requestKey() {
			const c = this.content || {}
			return JSON.stringify([c.register, c.schema, this.resolvedFilter, this.effectiveSort, this.limit, this.offset, c.extend, this.waiting])
		},

		/** @return {Array<object>} The rows ready to draw. */
		items() {
			const c = this.content || {}
			const barScale = this.barScale
			return this.rows.slice(0, this.limit).map((raw, index) => {
				const row = scalarRow(raw)
				const link = this.rowLink(row)
				return {
					key: (row && (row.id || row['@self']?.id)) || `row-${index}`,
					row,
					action: this.rowActionOf(row),
					tag: link ? 'router-link' : 'div',
					attrs: link ? { to: link } : {},
					initials: this.initialsFor(row),
					title: this.fill(c.title || (row !== raw ? '{value}' : ''), row),
					meta: this.metaOf(row),
					text: this.fill(c.text, row),
					label: this.fill(c.label, row),
					trailing: c.trailing ? firstFilled(c.trailing, row, this.translate, new Date(), this.templateContext) : '',
					pill: this.pillOf(row),
					badges: this.badgesOf(row),
					due: this.dueOf(row),
					icon: this.iconOf(row),
					bar: this.barOf(row, barScale),
					dot: this.dotOf(row),
					flag: this.flagOf(row),
				}
			})
		},

		/**
		 * The `table` presentation's columns: `{ label, value, align?, alertAbove? }`,
		 * `value` a template over the row.
		 *
		 * @return {Array<object>} The columns with a key and a translated label.
		 * @spec openspec/changes/record-list-table/specs/record-list-table/spec.md#requirement-a-record-list-can-draw-its-rows-as-a-small-table
		 */
		tableColumns() {
			const columns = Array.isArray(this.content?.columns) ? this.content.columns : []
			return columns
				.filter((col) => col && typeof col === 'object' && typeof col.value === 'string')
				.map((col, index) => ({ ...col, key: `col-${index}`, label: typeof col.label === 'string' ? this.translate(col.label) : '' }))
		},

		/**
		 * The `table` presentation's rows: one cell per column.
		 *
		 * @return {Array<object>} `{ key, cells: [{ key, text, align, alert }] }`.
		 * @spec openspec/changes/record-list-table/specs/record-list-table/spec.md#requirement-a-record-list-can-draw-its-rows-as-a-small-table
		 */
		tableRows() {
			return this.items.map((item) => ({
				key: item.key,
				cells: this.tableColumns.map((col) => {
					const text = this.fill(col.value, item.row)
					const limit = Number(col.alertAbove)
					const value = Number(text)
					return {
						key: col.key,
						text,
						align: col.align,
						alert: col.alertAbove !== undefined && Number.isFinite(limit) && text !== '' && Number.isFinite(value) && value > limit,
					}
				}),
			}))
		},

		/** @return {string} The note under the list (`footnote`), translated. */
		footnote() {
			const note = this.content?.footnote
			return typeof note === 'string' && note !== '' ? this.translate(note) : ''
		},

		/**
		 * The largest `bar.valueField` over the rows shown, the scale of a
		 * `bar` without `maxField`. 0 without a `bar`.
		 *
		 * @return {number} The largest value.
		 * @spec openspec/changes/record-list-row-bar/specs/record-list-row-bar/spec.md#requirement-a-record-list-row-can-carry-a-bar
		 */
		barScale() {
			const field = this.content?.bar?.valueField
			if (!field) {
				return 0
			}
			return Math.max(0, ...this.rows.slice(0, this.limit).map((row) => Number(readPath(row, field)) || 0))
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

		/**
		 * Why the list is empty when a personal lens could not answer
		 * (`@self.lenses.<lens>.available: false`, as for `filter: { _recent: true }`),
		 * or '' to keep `emptyText`. `lensReasonTexts` holds the app's wording,
		 * keyed `<lens>.<reason>` or `<reason>`.
		 *
		 * @return {string} The explanation, or ''.
		 * @spec openspec/changes/screens-record-list-lens-reason/specs/record-list-lens-reason/spec.md#requirement-a-record-list-says-why-a-lens-is-empty
		 */
		lensReasonText() {
			if (this.rows.length > 0) {
				return ''
			}
			const text = lensUnavailableText(this.lenses, this.content?.lensReasonTexts)
			return text ? this.translate(text) : ''
		},

		/** @return {string} The empty line. */
		emptyLabel() {
			if (this.lensReasonText !== '') {
				return this.lensReasonText
			}
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

		footerDisabledKey: {
			immediate: true,
			handler() {
				this.evaluateFooterDisabled()
			},
		},

		endpointKey() {
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
		 * A row's colour dot (`dot`: a field name, or `{ field, colorMap? }`):
		 * the field's colour, or its value through `colorMap`. Only a hex
		 * colour, an `rgb()`/`hsl()` colour or a `var(--…)` token is drawn.
		 *
		 * @spec openspec/changes/record-list-dot-flags/specs/record-list/spec.md#requirement-a-record-list-row-can-carry-a-colour-dot-and-flag-text
		 * @param {object} row The row.
		 * @return {string} The colour, or ''.
		 */
		dotOf(row) {
			const dot = this.content?.dot
			const def = typeof dot === 'string' ? { field: dot } : dot
			if (!def || typeof def !== 'object' || typeof def.field !== 'string' || def.field === '') {
				return ''
			}
			const raw = readPath(row, def.field)
			if (raw === null || raw === undefined || raw === '') {
				return ''
			}
			const mapped = def.colorMap && typeof def.colorMap === 'object' && typeof def.colorMap[String(raw)] === 'string' ? def.colorMap[String(raw)] : String(raw)
			return /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla)\([^;{}]*\)|var\(--[a-z0-9-]+(,[^;{}]*)?\))$/i.test(mapped.trim()) ? mapped.trim() : ''
		},

		/**
		 * A row's flag text (`flags`: `[{ field, label, value? }]`): the
		 * labels of the flags whose field is set (or equals `value`), through
		 * the host translate and joined with " · " ("Start", "End").
		 *
		 * @spec openspec/changes/record-list-dot-flags/specs/record-list/spec.md#requirement-a-record-list-row-can-carry-a-colour-dot-and-flag-text
		 * @param {object} row The row.
		 * @return {string} The text, or ''.
		 */
		flagOf(row) {
			const flags = Array.isArray(this.content?.flags) ? this.content.flags : []
			return flags
				.filter((flag) => flag && typeof flag.field === 'string' && typeof flag.label === 'string' && flag.label !== '')
				.filter((flag) => {
					const raw = readPath(row, flag.field)
					return flag.value !== undefined ? String(raw) === String(flag.value) : raw === true || raw === 'true' || raw === 1
				})
				.map((flag) => this.translate(flag.label))
				.join(' · ')
		},

		/**
		 * Settle whether the footer action is disabled: `disabledWhen` is a
		 * visibleWhen condition read against the page's record (`field`), the
		 * workspace, an endpoint or a source; `total` is the list's total.
		 *
		 * @spec openspec/changes/record-list-footer-action/specs/record-list/spec.md#requirement-a-record-list-can-end-with-an-action-that-says-why-it-is-disabled
		 * @return {Promise<void>}
		 */
		async evaluateFooterDisabled() {
			const cond = this.content?.footerAction?.disabledWhen
			if (!cond) {
				this.footerDisabled = false
				return
			}
			const ctx = { ...this.tokenCtx, object: { ...(this.tokenCtx.object || {}), total: this.total } }
			const key = this.footerDisabledKey
			const disabled = await evaluateVisibleWhen(cond, ctx)
			if (key === this.footerDisabledKey) {
				this.footerDisabled = disabled
			}
		},

		/**
		 * Run the footer action through the page's dispatcher, with the page's
		 * record as the token context.
		 *
		 * @spec openspec/changes/record-list-footer-action/specs/record-list/spec.md#requirement-a-record-list-can-end-with-an-action-that-says-why-it-is-disabled
		 * @return {unknown} What the dispatcher returns.
		 */
		runFooterAction() {
			const declared = this.footerAction?.action
			if (!declared || this.footerDisabled) {
				return undefined
			}
			const { disabledWhen, disabledReason, ...action } = declared
			if (typeof this.cnDispatchAction === 'function') {
				return this.cnDispatchAction(action)
			}
			return dispatchAction(action, { router: this.$router || null, tokenCtx: this.tokenCtx, source: { register: this.content?.register, schema: this.content?.schema } })
		},

		/**
		 * A row's `bar`: its value, the maximum it is measured against (the
		 * row's `maxField`, else the largest row), the filled share and
		 * whether it is over that maximum. Null without `bar` or a value.
		 *
		 * @param {object} row The row.
		 * @param {number} scale The largest value over the rows shown.
		 * @return {{value: number, max: number, share: number, over: boolean}|null} The bar.
		 * @spec openspec/changes/record-list-row-bar/specs/record-list-row-bar/spec.md#requirement-a-record-list-row-can-carry-a-bar
		 */
		barOf(row, scale) {
			const bar = this.content?.bar
			if (!bar || typeof bar !== 'object' || !bar.valueField) {
				return null
			}
			const value = Number(readPath(row, bar.valueField))
			if (!Number.isFinite(value)) {
				return null
			}
			const ownMax = bar.maxField ? Number(readPath(row, bar.maxField)) : NaN
			const max = bar.maxField ? (Number.isFinite(ownMax) && ownMax > 0 ? ownMax : 0) : scale
			const share = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
			const over = Boolean(bar.maxField) && bar.overVariant === 'error' && max > 0 && value > max
			return { value, max, share, over }
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
			return typeof template === 'string' && template !== '' ? fillTemplate(this.translate(template), this.labelledRow(row), new Date(), this.templateContext) : ''
		},

		/**
		 * The row as the templates read it: a field named in `valueLabels`
		 * (`{ channel: { phone: "Phone", telefoon: "Phone" } }`) shows the
		 * translated label of its stored value, so "{channel}" reads "Telefoon"
		 * for both spellings the data holds. A value without a label stays as
		 * stored. The pill, the badges and the sort read the stored value.
		 *
		 * @param {object} row The row.
		 * @return {object} The row, or a shallow copy with labelled fields.
		 * @spec openspec/changes/screens-record-list-value-labels/specs/record-list-value-labels/spec.md#requirement-a-record-list-template-can-show-a-label-for-a-stored-value
		 */
		labelledRow(row) {
			const map = this.content?.valueLabels
			if (!row || typeof row !== 'object' || !map || typeof map !== 'object') {
				return row
			}
			let out = row
			for (const [field, labels] of Object.entries(map)) {
				const raw = row[field]
				if (!labels || typeof labels !== 'object' || (typeof raw !== 'string' && typeof raw !== 'number')) {
					continue
				}
				const label = labels[String(raw)]
				if (typeof label === 'string' && label !== '') {
					if (out === row) {
						out = { ...row }
					}
					out[field] = this.translate(label)
				}
			}
			return out
		},

		/**
		 * Fill a translated label's counts: `{total}` is the list's total, and
		 * `{count:<field>=<value>}` the loaded rows whose field reads that
		 * value ("{count:status=done} van {total} stappen klaar"). The count
		 * reads the rows the list loaded, so it is exact when `limit` covers
		 * the list.
		 *
		 * @param {string} label The label.
		 * @return {string} The text.
		 */
		withTotal(label) {
			return this.translate(label)
				.replace(/\{total\}/g, String(this.total))
				.replace(/\{count:([^=}]+)=([^}]*)\}/g, (match, field, value) => {
					const wanted = value.trim()
					return String(this.rows.filter((row) => String(readPath(row, field.trim())) === wanted).length)
				})
		},

		/**
		 * The route a row opens: `rowRoute` with the id at `rowIdField`.
		 *
		 * @param {object} row The row.
		 * @return {object|null} The router location, or null.
		 */
		/**
		 * The one action that ends a row (`rowAction`): its label (from
		 * `labels.map` by the row's `labels.field`, else `label`), and how it
		 * renders: a link when it only navigates, else a button that
		 * dispatches. Null without the key or a label.
		 *
		 * @param {object} row The row.
		 * @return {{label: string, tag: string, attrs: object}|null}
		 * @spec openspec/changes/screens-record-list-row-action/specs/record-list/spec.md
		 */
		rowActionOf(row) {
			const action = this.content?.rowAction
			if (!action || typeof action !== 'object' || !row) {
				return null
			}
			let label = typeof action.label === 'string' ? action.label : ''
			const by = action.labels
			if (by && typeof by === 'object' && typeof by.field === 'string' && by.map && typeof by.map === 'object') {
				const raw = readPath(row, by.field)
				if (raw !== null && raw !== undefined && typeof by.map[String(raw)] === 'string') {
					label = by.map[String(raw)]
				}
			}
			if (label === '') {
				return null
			}
			label = this.translate(label)
			const link = this.rowActionLink(action, row)
			if (link) {
				return link.external
					? { label, tag: 'a', attrs: { href: link.href, target: '_blank', rel: 'noopener' } }
					: { label, tag: 'router-link', attrs: { to: link.to } }
			}
			return { label, tag: 'button', attrs: { type: 'button' } }
		},

		/**
		 * The link a `rowAction` that only navigates renders as: `open-page`
		 * opens that page for the row's id, `navigate` reads its
		 * `@object.<field>` / `@objectId` tokens off the row. Null for any
		 * other action, which is dispatched on click.
		 *
		 * @param {object} action The declared row action.
		 * @param {object} row The row.
		 * @return {{href: string, to: (string|object|null), external: boolean}|null}
		 * @spec openspec/changes/screens-record-list-row-action/specs/record-list/spec.md
		 */
		rowActionLink(action, row) {
			if (action.confirm) {
				return null
			}
			if (action.type === 'open-page') {
				const id = this.rowIdOf(row)
				if (!this.$router || id === null || typeof action.target !== 'string' || action.target === '') {
					return null
				}
				const to = { name: action.target, params: { id } }
				try {
					const href = this.$router.resolve(to).href
					return href ? { href, to, external: false } : null
				} catch {
					return null
				}
			}
			if (action.type !== 'navigate') {
				return null
			}
			const target = interpolateActionTarget(action.target, this.rowTokenCtx(row))
			// An external target needs no router; an in-app one does.
			return actionLink({ ...action, target }, { router: this.$router || null })
		},

		/**
		 * The token context of a row: the row is `@object`, its id `@objectId`.
		 *
		 * @param {object} row The row.
		 * @return {object} The token context.
		 */
		rowTokenCtx(row) {
			return { ...this.tokenCtx, objectId: this.rowIdOf(row), object: row }
		},

		/**
		 * The id of a row (`rowIdField`, else `id`, else `@self.id`), or null.
		 *
		 * @param {object} row The row.
		 * @return {string|null} The id.
		 */
		rowIdOf(row) {
			const field = this.content?.rowIdField
			const id = field ? readPath(row, field) : (row && (row.id || row['@self']?.id))
			return (id === null || id === undefined || id === '' || typeof id === 'object') ? null : String(id)
		},

		/**
		 * Run a `rowAction` that is not a plain link through the page's
		 * dispatcher: a `handler` gets the row as its last argument, an
		 * `open-modal` gets it as the `row` prop, an `object-op` acts on it.
		 *
		 * @param {object} row The row.
		 * @return {unknown} What the dispatcher returns.
		 * @spec openspec/changes/screens-record-list-row-action/specs/record-list/spec.md
		 */
		runRowAction(row) {
			const action = this.content?.rowAction
			if (!action || typeof action !== 'object') {
				return undefined
			}
			const type = action.type || 'handler'
			let wrapped = action
			if (type === 'handler') {
				wrapped = { ...action, args: [...(action.args || []), row] }
			} else if (type === 'open-modal') {
				wrapped = { ...action, props: { ...(action.props || {}), row } }
			}
			if (typeof this.cnDispatchAction === 'function') {
				return this.cnDispatchAction(wrapped)
			}
			return dispatchAction(wrapped, { router: this.$router || null, row, tokenCtx: this.rowTokenCtx(row), source: { register: this.content?.register, schema: this.content?.schema } })
		},

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
		 * The row's due text (`due`: `{ field, todayLabel?, overdueLabel?, upcomingLabel?, upcomingWeeksLabel?, upcomingWeeksFrom?, emptyText? }`):
		 * "3 dagen te laat" in the danger tone, "Vandaag", the date or the time
		 * left ("nog 4 dagen") otherwise, `emptyText` when the field is empty.
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
		 * The row's meta line. A string is one template, and one empty token
		 * empties it. `{ parts: ["{identifier}", "{caseTypeName}", "{handler}"],
		 * separator? }` fills each part on its own, drops the empty ones and
		 * joins the rest (default " · "), so a row without a handler still
		 * reads "2026-0082 · Woo-verzoek".
		 *
		 * @param {object} row The row.
		 * @return {string} The meta line, '' when nothing fills.
		 * @spec openspec/changes/screens-record-list-meta-parts/specs/record-list-meta-parts/spec.md#requirement-a-meta-line-of-parts-skips-the-empty-ones
		 */
		metaOf(row) {
			const meta = this.content?.meta
			if (!meta || typeof meta !== 'object' || !Array.isArray(meta.parts)) {
				return this.fill(meta, row)
			}
			const separator = typeof meta.separator === 'string' ? meta.separator : ' · '
			return meta.parts
				.map((part) => this.fill(part, row))
				.filter((text) => text !== '')
				.join(separator)
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
			const header = { link: this.headerLink, note: this.headerNote }
			// `headerCount: true`: the card draws the total as a chip after its title.
			if (this.content?.headerCount === true && !this.error) {
				header.count = this.total
			}
			/**
			 * @event header Emitted after every read with the card header's parts.
			 * @type {{link: (object|null), note: string, count: (number|undefined)}} The header link (resolved, with `{total}` filled), the note, and with `headerCount` the total.
			 */
			this.$emit('header', header)
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
		 * @param {(params: object) => Promise<object>} get Reads the list with the given params.
		 * @param {object} base The params without any order.
		 * @param {{field: string, then?: {field: string, dir?: string}}} sort The sort.
		 * @param {Array<string>} rank The values in rank order.
		 * @return {Promise<{rows: Array<object>, total: number}>} The page and the total.
		 * @spec openspec/changes/screens-enum-rank-sort/specs/enum-rank-sort/spec.md#requirement-a-record-list-can-sort-by-the-rank-of-an-enum-value
		 */
		async fetchRanked(get, base, sort, rank) {
			const order = {}
			if (sort.then && typeof sort.then === 'object' && sort.then.field) {
				order[`_order[${sort.then.field}]`] = sort.then.dir === 'desc' ? 'desc' : 'asc'
			}
			const read = async (extra) => {
				const response = await get({ ...base, ...order, ...extra })
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
		 * Copy the endpoint read into the list: its payload must be an array of
		 * rows (anything else is an empty list), and a failed read is an error.
		 *
		 * @spec openspec/changes/endpoint-source-card-grid-record-list/specs/dashboard-page/spec.md#requirement-a-record-list-and-a-card-grid-can-read-an-endpoint
		 */
		takeEndpointRows() {
			this.rows = Array.isArray(this.epData) ? this.epData : []
			this.total = this.rows.length
			this.loading = this.epLoading === true
			this.error = Boolean(this.epError)
			this.lenses = {}
			if (!this.loading) {
				this.emitHeader()
			}
		},

		/**
		 * Fetch the list. Sends nothing while a required token is unresolved
		 * or the source is incomplete.
		 *
		 * @return {Promise<void>}
		 */
		async fetchRows() {
			const c = this.content || {}
			if (this.endpointActive) {
				this.takeEndpointRows()
				return
			}
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
				if (this.offset > 0) {
					params._offset = this.offset
				}
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
					const ranked = await this.fetchRanked((query) => axios.get(url, { params: query }), params, sort, rank)
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
				this.lenses = readLensReports(data)
			} catch (e) {
				// eslint-disable-next-line no-console
				console.warn('[CnRecordListWidget] failed to load objects:', e)
				this.lenses = {}
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

.cn-record-list__footer {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 6px;
	margin-top: 10px;
}

.cn-record-list__footer-reason {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-record-list__empty,
.cn-record-list__error {
	color: var(--color-text-maxcontrast);
	margin: 0;
}

.cn-record-list__notice {
	display: flex;
	gap: 10px;
	align-items: flex-start;
	padding: 12px 14px;
	border-radius: var(--border-radius-large, 10px);
	background: var(--color-primary-element-light, var(--color-background-dark));
	color: var(--color-main-text);
}

.cn-record-list__notice--warning {
	background: var(--color-warning-light, rgba(255, 196, 0, 0.12));
	color: var(--color-warning-text, var(--color-main-text));
}

.cn-record-list__notice--error {
	background: var(--color-error-light, rgba(219, 0, 0, 0.08));
	color: var(--color-error-text, var(--color-main-text));
}

.cn-record-list__notice-icon {
	flex: 0 0 auto;
	margin-top: 1px;
}

.cn-record-list__notice-text {
	margin: 0;
	line-height: 1.5;
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

.cn-record-list__bar {
	background: var(--color-border);
	border-radius: 3px;
	display: block;
	height: 6px;
	margin: -6px 0 12px;
	overflow: hidden;
}

.cn-record-list__bar-fill {
	background: var(--color-primary-element);
	display: block;
	height: 100%;
}

.cn-record-list__bar--over .cn-record-list__bar-fill {
	background: var(--color-error);
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

.cn-record-list__dot {
	flex: 0 0 14px;
	width: 14px;
	height: 14px;
	border-radius: 50%;
}

.cn-record-list__flag {
	color: var(--color-text-maxcontrast);
	font-size: 14px;
	white-space: nowrap;
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

.cn-record-list__table {
	width: 100%;
	border-collapse: collapse;
	font-size: 14px;
}

.cn-record-list__table th {
	padding: 6px 0;
	border-bottom: 1px solid var(--color-border);
	color: var(--color-text-maxcontrast);
	font-weight: 600;
	text-align: start;
}

.cn-record-list__table td {
	padding: 8px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-record-list__table .cn-record-list__cell--end {
	padding-inline-start: 12px;
	text-align: end;
	font-variant-numeric: tabular-nums;
}

.cn-record-list__table .cn-record-list__cell--alert {
	color: var(--color-text-error, var(--color-error-text));
	font-weight: 700;
}

.cn-record-list__footnote {
	margin: 8px 0 0;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-record-list__due--soon {
	color: var(--color-text-warning, var(--color-warning-text));
	font-weight: 600;
}

.cn-record-list__due--empty {
	color: var(--color-text-maxcontrast);
}

.cn-record-list__row--action {
	flex-wrap: wrap;
	gap: 8px 16px;
	padding: 14px 0;
}

.cn-record-list__row--action .cn-record-list__main {
	flex: 1 1 280px;
	gap: 3px;
}

.cn-record-list__title--link {
	color: var(--color-main-text);
	text-decoration: underline;
}

.cn-record-list__pills {
	display: flex;
	flex: 0 0 120px;
	gap: 6px;
	justify-content: flex-end;
}

.cn-record-list__due--column {
	flex: 0 0 96px;
	font-size: 13px;
	text-align: end;
}

.cn-record-list__action {
	align-items: center;
	background: var(--color-primary-element-light);
	border: 0;
	border-radius: 17px;
	box-sizing: border-box;
	color: var(--color-primary-element-light-text, var(--color-primary-element));
	cursor: pointer;
	display: inline-flex;
	flex: 0 0 150px;
	font-size: 14px;
	font-weight: 600;
	height: 34px;
	justify-content: center;
	padding: 0 14px;
	text-decoration: none;
}

.cn-record-list__action:hover,
.cn-record-list__action:focus-visible {
	background: var(--color-primary-element-light-hover, var(--color-primary-element-light));
}

.cn-record-list__chevron {
	color: var(--color-text-maxcontrast);
	flex: none;
}

/* cards (board ShBank): a grid of framed cards, 240px at the least. */
.cn-record-list--cards .cn-record-list__list {
	align-items: start;
	display: grid;
	gap: 16px;
	grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.cn-record-list__card {
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: 12px;
	box-sizing: border-box;
	color: var(--color-main-text);
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 16px 18px;
	text-decoration: none;
}

.cn-record-list__card--link:hover,
.cn-record-list__card--link:focus-visible {
	border-color: var(--color-border-dark, var(--color-border));
}

.cn-record-list__card--link:hover .cn-record-list__title,
.cn-record-list__card--link:focus-visible .cn-record-list__title {
	text-decoration: underline;
}

.cn-record-list__card-head {
	align-items: center;
	display: flex;
	gap: 8px;
	justify-content: space-between;
}

.cn-record-list__card-title {
	align-items: center;
	display: flex;
	gap: 8px;
	min-width: 0;
}

.cn-record-list__card-icon {
	color: var(--color-primary-element);
	flex: none;
}

.cn-record-list__card-pills {
	display: flex;
	flex: none;
	gap: 6px;
}

.cn-record-list__card-value {
	font-size: 24px;
	font-weight: 700;
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

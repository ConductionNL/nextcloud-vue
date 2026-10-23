<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div
		class="cn-record-list"
		:class="[`cn-record-list--${presentation}`, { 'cn-record-list--compact': content.density === 'compact' }]"
		data-testid="cn-record-list">
		<p v-if="intro && !absent" class="cn-record-list__intro" data-testid="cn-record-list-intro">
			{{ intro }}
		</p>
		<p v-if="absent" class="cn-record-list__empty" data-testid="cn-record-list-absent">
			{{ absentLabel }}
		</p>
		<p v-else-if="error" class="cn-record-list__error" data-testid="cn-record-list-error">
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
		     entry; a cell past its `alertAbove` reads bold in the danger colour,
		     a `tone` cell is a toned label, a `sortable` header sorts the rows. -->
		<table v-else-if="presentation === 'table'" class="cn-record-list__table" data-testid="cn-record-list-table">
			<thead>
				<tr>
					<th
						v-for="col in tableColumns"
						:key="col.key"
						scope="col"
						:aria-sort="col.sortable ? sortStateOf(col.key) : undefined"
						:class="{ 'cn-record-list__cell--end': col.align === 'end' }">
						<button
							v-if="col.sortable"
							type="button"
							class="cn-record-list__sort"
							:data-testid="`cn-record-list-sort-${col.key}`"
							@click="toggleTableSort(col.key)">
							{{ col.label }}
							<span class="cn-record-list__sort-mark" aria-hidden="true">{{ sortMarkOf(col.key) }}</span>
						</button>
						<template v-else>
							{{ col.label }}
						</template>
					</th>
					<th v-if="rowActions.length > 0" scope="col" class="cn-record-list__cell--actions">
						{{ rowActionsHeader }}
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="item in tableRows" :key="item.key" data-testid="cn-record-list-item">
					<td
						v-for="(cell, cellIndex) in item.cells"
						:key="cell.key"
						:style="cellIndex === 0 && item.depth > 0 ? `padding-inline-start: calc(${item.depth} * 16px)` : undefined"
						:class="{ 'cn-record-list__cell--end': cell.align === 'end', 'cn-record-list__cell--alert': cell.alert }">
						<CnStatusBadge
							v-if="cell.tone"
							:label="cell.text"
							:variant="cell.tone"
							size="small" />
						<router-link v-else-if="cellIndex === 0 && item.to" :to="item.to" class="cn-record-list__cell-text">
							{{ cell.text }}
						</router-link>
						<span v-else class="cn-record-list__cell-text">{{ cell.text }}</span>
						<span v-if="cell.sub" class="cn-record-list__cell-sub">{{ cell.sub }}</span>
					</td>
					<td v-if="rowActions.length > 0" class="cn-record-list__cell--actions">
						<NcActions
							v-if="item.rowActions.length > 0"
							:aria-label="rowActionsLabel"
							data-testid="cn-record-list-row-actions">
							<template v-for="entry in item.rowActions" :key="`row-action-${entry.index}`">
								<NcActionLink
									v-if="entry.href"
									:href="entry.href"
									:target="entry.external ? '_blank' : undefined"
									:data-testid="`cn-record-list-row-action-${entry.index}`">
									{{ entry.action.label }}
								</NcActionLink>
								<NcActionButton
									v-else
									:closeAfterClick="true"
									:data-testid="`cn-record-list-row-action-${entry.index}`"
									@click="runRowActionEntry(entry.action, item.row)">
									{{ entry.action.label }}
								</NcActionButton>
							</template>
						</NcActions>
					</td>
				</tr>
			</tbody>
		</table>
		<!-- notes: a field per row for what happened, recorded on the row's
		     own notes endpoint (DqDagAfsluiten "Nog open van vandaag"). -->
		<CnRecordNoteRows
			v-else-if="presentation === 'notes' && noteAction"
			:items="items"
			:action="noteAction"
			:recordAll="noteRecordAll"
			:leaf="content.rowLeaf || null" />
		<!-- `groupBy`: a heading per group, each group its own list, named by
		     its heading. Without it this is one list, as before. -->
		<template v-for="group in itemGroups" v-else :key="group.key">
			<h3
				v-if="group.label"
				:id="group.headingId"
				class="cn-record-list__group-heading"
				data-testid="cn-record-list-group-heading">
				{{ group.label }}
			</h3>
			<ul
				class="cn-record-list__list"
				:aria-labelledby="group.label ? group.headingId : null"
				:data-testid="isGrouped ? 'cn-record-list-group' : null">
				<li
					v-for="item in group.items"
					:key="item.key"
					class="cn-record-list__item"
					data-testid="cn-record-list-item">
					<!-- rows with `rowAction`: the title is the link, and one action
					     ends the row instead of the chevron ("Beoordelen"). -->
					<div
						v-if="presentation === 'rows' && item.action"
						class="cn-record-list__row cn-record-list__row--action">
						<span v-if="item.leading"
							class="cn-record-list__leading"
							data-testid="cn-record-list-leading">{{ item.leading }}</span>
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
					<!-- rows: title, meta and text, then the pill, the date and a chevron. -->
					<component
						:is="item.tag"
						v-else-if="presentation === 'rows'"
						class="cn-record-list__row"
						:class="{ 'cn-record-list__row--link': item.tag !== 'div' }"
						v-bind="item.attrs">
						<span v-if="item.leading"
							class="cn-record-list__leading"
							data-testid="cn-record-list-leading">{{ item.leading }}</span>
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
							<span v-if="item.text" class="cn-record-list__meta" data-testid="cn-record-list-text">{{ item.text }}</span>
							<span v-if="item.links.length > 0" class="cn-record-list__meta" data-testid="cn-record-list-links">
								{{ linksLabel }}
								<template v-for="(link, linkIndex) in item.links" :key="link.id">
									<router-link v-if="link.to" :to="link.to">{{ link.label }}</router-link>
									<span v-else>{{ link.label }}</span><span v-if="linkIndex < item.links.length - 1">, </span>
								</template>
							</span>
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
							v-if="item.tag !== 'div' && content.chevron !== false"
							class="cn-record-list__chevron"
							:size="18"
							aria-hidden="true" />
						<NcActions
							v-if="item.tag === 'div' && item.rowActions.length > 0"
							:aria-label="rowActionsLabel"
							data-testid="cn-record-list-row-actions">
							<template v-for="entry in item.rowActions" :key="`row-action-${entry.index}`">
								<NcActionLink
									v-if="entry.href"
									:href="entry.href"
									:target="entry.external ? '_blank' : undefined"
									:data-testid="`cn-record-list-row-action-${entry.index}`">
									{{ entry.action.label }}
								</NcActionLink>
								<NcActionButton
									v-else
									:closeAfterClick="true"
									:data-testid="`cn-record-list-row-action-${entry.index}`"
									@click="runRowActionEntry(entry.action, item.row)">
									{{ entry.action.label }}
								</NcActionButton>
							</template>
						</NcActions>
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
		</template>
		<p
			v-if="actionError"
			class="cn-record-list__error"
			role="alert"
			data-testid="cn-record-list-action-error">
			{{ actionError }}
		</p>
		<p v-if="footnote && !error && !absent && rows.length > 0" class="cn-record-list__footnote" data-testid="cn-record-list-footnote">
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
import { NcActionButton, NcActionLink, NcActions, NcButton, NcLoadingIcon } from '@nextcloud/vue'
import { inject, ref } from 'vue'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import CnStatusBadge from '../CnStatusBadge/CnStatusBadge.vue'
import CnRecordNoteRows from './CnRecordNoteRows.vue'
import { interpolateUrlTokens, useEndpointSource } from '../../composables/useEndpointSource.js'
import { actionLink, dispatchAction, interpolateActionTarget } from '../../utils/actionsDispatcher.js'
import { isAppInstalled } from '../../utils/appInstalled.js'
import { isBadgeVariant } from '../../utils/badgeVariants.js'
import { ageInDays } from '../../utils/boardDate.js'
import { resolveDue } from '../../utils/dueText.js'
import { fillCountLabel } from '../../utils/fillCountLabel.js'
import { fillTemplate, firstFilled } from '../../utils/fillTemplate.js'
import { unwrapAppConfig } from '../../utils/formatMetric.js'
import { initialsOf } from '../../utils/initials.js'
import { lensUnavailableText, readLensReports } from '../../utils/lensAvailability.js'
import { pageFilter, pageSort } from '../../utils/pageControls.js'
import { readPath } from '../../utils/readPath.js'
import { dropOptionalUnresolved, hasUnresolvedTokens, resolveDeepTokens, resolveFilterTokens } from '../../utils/resolveFilterTokens.js'
import { fetchRowAggregate, isRowAggregate } from '../../utils/rowAggregate.js'
import { evaluateVisibleWhen, evaluateVisibleWhenLocal } from '../../utils/visibleWhen.js'

const PAGE_REFRESH_CHANNEL = 'cn:page:refresh'

/** Gives each list's footer reason its own element id. */
let footerSeq = 0
const PRESENTATIONS = ['rows', 'feed', 'inline', 'cards', 'notice', 'table', 'notes']

/**
 * Compare two table cell texts: as numbers when both read as one, else as text.
 *
 * @param {string} a One cell text.
 * @param {string} b The other.
 * @return {number} Negative, zero or positive.
 */
function compareCells(a, b) {
	const x = Number(a)
	const y = Number(b)
	if (a !== '' && b !== '' && Number.isFinite(x) && Number.isFinite(y)) {
		return x - y
	}
	return String(a).localeCompare(String(b))
}

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

	components: { ChevronRight, CnIcon, CnRecordNoteRows, CnStatusBadge, NcActionButton, NcActionLink, NcActions, NcButton, NcLoadingIcon },

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
		 * presentation?, variant?, lead?, leading?, title?, meta?, text?, label?, pill?, trailing?, icon?, aggregates?,
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
		 * `groupBy` (a field path) draws the rows in groups under a heading
		 * per value, headed by the field's `valueLabels` entry; `groupOrder`
		 * (values) orders the groups and `groupEmptyLabel` heads the rows
		 * without a value.
		 * `density: "compact"` draws the rows 10px above and below, at least
		 * 56px tall, with the title at 500 (DqProcesanalyse).
		 * In `rows`, `text` is a line under the meta line ("12 dagen stil"),
		 * and `chevron: false` leaves the chevron off a linked row
		 * (DqDashboard).
		 * `aggregates` (`{ key: { register, schema, op: "count" | "max",
		 * field?, where, text? } }`, `@self.<path>` in `where` read off the
		 * row) asks a figure over each row's related objects, as a table's
		 * `aggregate` column does, and offers it to the row's templates as
		 * `{key}`; `text` (`{ zero?, one?, other }` with `{count}`) offers a
		 * count as words (DqZaaktype Versies "31 lopende zaken", "geen
		 * lopende zaken").
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
		const { data, loading, error, refetch } = useEndpointSource(
			() => {
				const app = props.content?.requiresApp
				return typeof app === 'string' && app !== '' && !isAppInstalled(app) ? null : (props.content?.endpointSource || null)
			},
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
		return { epData: data, epLoading: loading, epError: error, epRefetch: refetch }
	},

	data() {
		return {
			/** The reader's sort of a `table`: the column key and `ascending` or `descending`. */
			tableSort: { key: '', dir: '' },
			rows: [],
			/** The `aggregates` figures per row id: `{ [rowId]: { [key]: value } }`. */
			aggregateValues: {},
			total: 0,
			loading: false,
			error: false,
			/** Personal-lens reports (`@self.lenses`) of the latest response. */
			lenses: {},
			/** Whether `footerAction.disabledWhen` holds. */
			footerDisabled: false,
			footerReasonId: `cn-record-list-footer-reason-${++footerSeq}`,
			groupIdBase: `cn-record-list-group-${footerSeq}`,
			/** The first `emptyTexts` entry whose condition holds, translated; '' for none. */
			conditionalEmptyText: '',
			/** The refusal of the last row action, as the server said it. */
			actionError: '',
			/** Labels of the records a `links` line names, by id. */
			linkLabels: {},
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
				const row = this.withAggregates(scalarRow(raw))
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
					leading: c.leading ? firstFilled(c.leading, row, this.translate, new Date(), this.templateContext) : '',
					pill: this.pillOf(row),
					badges: this.badgesOf(row),
					due: this.dueOf(row),
					icon: this.iconOf(row),
					bar: this.barOf(row, barScale),
					dot: this.dotOf(row),
					flag: this.flagOf(row),
					links: this.linksOf(row),
					rowActions: this.rowActionsOf(row),
				}
			})
		},

		/** @return {boolean} Whether `content.groupBy` names a field to group the rows by. */
		isGrouped() {
			const field = this.content?.groupBy
			return typeof field === 'string' && field !== ''
		},

		/**
		 * The rows to draw, in groups. With `groupBy` (a field path) one group
		 * per value: in `groupOrder` first, then in the order the rows bring
		 * them, and the rows without a value last. A heading is the value's
		 * `valueLabels` entry for that field, else the value, through the host
		 * translate; the group without a value is headed by `groupEmptyLabel`,
		 * or not at all. Without `groupBy` all rows are one unheaded group.
		 *
		 * @spec openspec/changes/record-list-group-headings/specs/record-list/spec.md#requirement-a-record-list-can-group-its-rows-under-headings
		 * @return {Array<{key: string, label: string, headingId: string, items: Array<object>}>} The groups.
		 */
		itemGroups() {
			if (!this.isGrouped) {
				return [{ key: 'all', label: '', headingId: '', items: this.items }]
			}
			const c = this.content
			const labels = c.valueLabels && typeof c.valueLabels[c.groupBy] === 'object' ? c.valueLabels[c.groupBy] : {}
			const buckets = new Map()
			for (const item of this.items) {
				const raw = readPath(item.row, c.groupBy)
				const value = raw === null || raw === undefined || typeof raw === 'object' ? '' : String(raw)
				if (!buckets.has(value)) {
					buckets.set(value, [])
				}
				buckets.get(value).push(item)
			}
			const order = Array.isArray(c.groupOrder) ? c.groupOrder.map(String) : []
			const values = [...buckets.keys()].filter((v) => v !== '')
			values.sort((a, b) => {
				const ia = order.indexOf(a)
				const ib = order.indexOf(b)
				return (ia === -1 ? order.length : ia) - (ib === -1 ? order.length : ib)
			})
			if (buckets.has('')) {
				values.push('')
			}
			return values.map((value, index) => {
				const named = value === '' ? c.groupEmptyLabel : (labels[value] || value)
				return {
					key: `group-${value}`,
					label: typeof named === 'string' && named !== '' ? this.translate(named) : '',
					headingId: `${this.groupIdBase}-${index}`,
					items: buckets.get(value),
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
			const indentPath = this.content?.indentPath
			const rows = this.items.map((item) => ({
				key: item.key,
				row: item.row,
				rowActions: this.rowActions.length > 0 ? this.rowActionsOf(item.row) : [],
				to: item.attrs.to || null,
				depth: indentPath ? Math.max(0, Math.floor(Number(readPath(item.row, indentPath)) || 0)) : 0,
				cells: this.tableColumns.map((col) => {
					const text = this.fill(col.value, item.row)
					const limit = Number(col.alertAbove)
					const value = Number(text)
					return {
						key: col.key,
						text,
						sub: typeof col.sub === 'string' ? this.fill(col.sub, item.row) : '',
						align: col.align,
						alert: col.alertAbove !== undefined && Number.isFinite(limit) && text !== '' && Number.isFinite(value) && value > limit,
						tone: this.cellToneOf(col, item.row, text),
					}
				}),
			}))
			const { key, dir } = this.tableSort
			const index = this.tableColumns.findIndex((col) => col.key === key)
			if (index < 0 || !dir) {
				return rows
			}
			const sign = dir === 'descending' ? -1 : 1
			return [...rows].sort((a, b) => sign * compareCells(a.cells[index].text, b.cells[index].text))
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
		/**
		 * `noteAction` with its labels through the host translate, or null
		 * (`presentation: "notes"`).
		 *
		 * @spec openspec/changes/record-list-notes/specs/record-list-notes/spec.md#requirement-a-record-list-can-collect-and-record-a-note-per-row
		 * @return {object|null}
		 */
		noteAction() {
			const action = this.content?.noteAction
			if (!action || typeof action !== 'object' || (!action.urlField && !action.url)) {
				return null
			}
			const tr = (text) => (typeof text === 'string' && text !== '' ? this.translate(text) : '')
			return {
				...action,
				label: tr(action.label),
				fieldLabel: tr(action.fieldLabel),
				placeholder: tr(action.placeholder),
				readyLabel: tr(action.readyLabel),
				errorText: tr(action.errorText),
			}
		},

		/**
		 * `noteAction.recordAll` translated, its cancel link as a route, or null.
		 *
		 * @return {object|null}
		 */
		noteRecordAll() {
			const all = this.content?.noteAction?.recordAll
			if (!all || typeof all !== 'object' || !all.label) {
				return null
			}
			const cancel = all.cancel && all.cancel.label && all.cancel.route
				? { label: this.translate(all.cancel.label), to: typeof all.cancel.route === 'string' ? { name: all.cancel.route } : all.cancel.route }
				: null
			return {
				label: this.translate(all.label),
				title: all.title ? this.translate(all.title) : '',
				text: all.text ? this.translate(all.text) : '',
				icon: all.icon || '',
				cancel,
			}
		},

		/**
		 * Whether the app the rows come from is absent (`requiresApp`): the
		 * list then says so (`absentText`) instead of reading anything.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-record-list-can-act-on-its-rows-and-link-onwards
		 */
		absent() {
			const app = this.content?.requiresApp
			return typeof app === 'string' && app !== '' && !isAppInstalled(app)
		},

		/** @return {string} The line shown when the source app is absent. */
		absentLabel() {
			return this.content?.absentText ? this.translate(this.content.absentText) : t('nextcloud-vue', 'The app these come from is not installed')
		},

		/** @return {string} The line above the list (`intro`), translated. */
		intro() {
			const text = this.content?.intro
			return typeof text === 'string' && text !== '' ? this.translate(text) : ''
		},

		/**
		 * The row actions (`rowActions`), labels translated. Each is a page
		 * action (`type`, dispatched with the row) or `{ endpoint, method? }`,
		 * an app URL called for the row.
		 *
		 * @return {Array<object>}
		 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-record-list-can-act-on-its-rows-and-link-onwards
		 */
		rowActions() {
			const list = Array.isArray(this.content?.rowActions) ? this.content.rowActions : []
			return list
				.filter((action) => action && typeof action === 'object' && typeof action.label === 'string' && action.label !== '')
				.map((action) => ({ ...action, label: this.translate(action.label) }))
		},

		/**
		 * The heading of the `table` presentation's actions column.
		 *
		 * @return {string}
		 * @spec openspec/changes/record-list-table-row-actions/specs/record-list-table/spec.md#requirement-a-table-row-can-carry-a-second-line-and-an-actions-menu
		 */
		rowActionsHeader() {
			const own = this.content?.rowActionsHeader
			return typeof own === 'string' && own !== '' ? this.translate(own) : t('nextcloud-vue', 'Actions')
		},

		/** @return {string} The accessible name of a row's actions menu. */
		rowActionsLabel() {
			const own = this.content?.rowActionsLabel
			return typeof own === 'string' && own !== '' ? this.translate(own) : t('nextcloud-vue', 'Actions for this row')
		},

		/** @return {string} The words in front of a `links` line. */
		linksLabel() {
			const label = this.content?.links?.label
			return typeof label === 'string' && label !== '' ? this.translate(label) : ''
		},

		/** @return {string} The ids a `links` line names, to label them when they change. */
		linkIdsKey() {
			const field = this.content?.links?.field
			if (!field) {
				return ''
			}
			const ids = new Set()
			for (const row of this.rows.slice(0, this.limit)) {
				const list = readPath(row, field)
				for (const id of Array.isArray(list) ? list : []) {
					if (typeof id === 'string' && id !== '') {
						ids.add(id)
					}
				}
			}
			return [...ids].join('|')
		},

		emptyLabel() {
			if (this.lensReasonText !== '') {
				return this.lensReasonText
			}
			if (this.conditionalEmptyText !== '') {
				return this.conditionalEmptyText
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

		rows() {
			this.evaluateEmptyTexts()
			this.loadAggregates()
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

		linkIdsKey() {
			this.loadLinkLabels()
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
		/**
		 * Pick the empty text (`emptyTexts`: `[{ when, text }]`, the first whose
		 * visibleWhen condition holds), for a list that is empty for more than
		 * one reason ("Everything you opened today has a note" or "You have not
		 * opened anything today"). `emptyText` stays the fallback.
		 *
		 * @spec openspec/changes/record-list-notes/specs/record-list-notes/spec.md#requirement-a-record-list-can-say-why-it-is-empty
		 * @return {Promise<void>}
		 */
		async evaluateEmptyTexts() {
			const options = Array.isArray(this.content?.emptyTexts) ? this.content.emptyTexts : []
			if (options.length === 0 || this.rows.length > 0) {
				this.conditionalEmptyText = ''
				return
			}
			const run = this.emptyRun = (this.emptyRun || 0) + 1
			for (const option of options) {
				if (!option || typeof option.text !== 'string' || !option.when) {
					continue
				}
				const holds = await evaluateVisibleWhen(option.when, this.tokenCtx)
				if (run !== this.emptyRun) {
					return
				}
				if (holds) {
					this.conditionalEmptyText = this.translate(option.text)
					return
				}
			}
			this.conditionalEmptyText = ''
		},

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
			// A list is candidates: the first that fills ("{summary}", else "{subject}").
			if (Array.isArray(template)) {
				return firstFilled(template, this.labelledRow(row), (text) => this.translate(text), new Date(), this.templateContext)
			}
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
			return fillCountLabel(this.translate(label), this.total, this.rows)
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
			// `rowRouteField`: the route name read from the row, for a list
			// whose rows open different pages (a case and a task).
			const byField = this.content?.rowRouteField ? readPath(row, this.content.rowRouteField) : null
			const route = (typeof byField === 'string' && byField !== '') ? byField : this.content?.rowRoute
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
		 * Ask every `content.aggregates` figure (`{ key: { register, schema,
		 * op: "count" | "max", field?, where } }`, `@self.<path>` in `where`
		 * read off the row) for each row shown, as a table's `aggregate`
		 * column does. A failed figure is left out; a stale batch is dropped.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/record-list-row-aggregates/specs/record-list/spec.md#requirement-a-record-list-row-can-carry-a-figure-over-its-related-objects
		 */
		async loadAggregates() {
			const declared = this.content?.aggregates
			const entries = declared && typeof declared === 'object' ? Object.entries(declared).filter(([, agg]) => isRowAggregate(agg)) : []
			const id = (this.aggregateRequestId = (this.aggregateRequestId || 0) + 1)
			if (entries.length === 0) {
				this.aggregateValues = {}
				return
			}
			const next = {}
			const jobs = []
			for (const raw of this.rows.slice(0, this.limit)) {
				const row = scalarRow(raw)
				const rowId = row && typeof row === 'object' ? (row.id || row['@self']?.id) : null
				if (!rowId) {
					continue
				}
				next[rowId] = {}
				for (const [key, agg] of entries) {
					jobs.push(fetchRowAggregate(agg, row)
						.then((value) => {
							next[rowId][key] = this.aggregateText(agg, value)
						})
						.catch(() => {}))
				}
			}
			await Promise.all(jobs)
			if (id === this.aggregateRequestId) {
				this.aggregateValues = next
			}
		},

		/**
		 * A count read through the aggregate's `text` forms (`{ zero?, one?,
		 * other }`, `{count}` filled in, translated), else the figure itself.
		 *
		 * @param {object} agg The aggregate declaration.
		 * @param {unknown} value The figure.
		 * @return {unknown} The text, or the figure.
		 * @spec openspec/changes/record-list-row-aggregates/specs/record-list/spec.md#requirement-a-record-list-row-can-carry-a-figure-over-its-related-objects
		 */
		aggregateText(agg, value) {
			const forms = agg && agg.text
			const count = Number(value)
			if (!forms || typeof forms !== 'object' || !Number.isFinite(count)) {
				return value
			}
			const form = (count === 0 && forms.zero) || (count === 1 && forms.one) || forms.other || forms.one
			return typeof form === 'string' ? this.translate(form).replace(/\{count\}/g, String(count)) : value
		},

		/**
		 * The row with its `aggregates` figures under their keys.
		 *
		 * @param {object} row The row.
		 * @return {object} The row, its figures added when it has any.
		 * @spec openspec/changes/record-list-row-aggregates/specs/record-list/spec.md#requirement-a-record-list-row-can-carry-a-figure-over-its-related-objects
		 */
		withAggregates(row) {
			if (!row || typeof row !== 'object') {
				return row
			}
			const figures = this.aggregateValues[row.id || row['@self']?.id]
			return figures ? { ...row, ...figures } : row
		},

		/**
		 * A `count` badge: how many entries a row's field holds (a list counts
		 * its items, a number is itself), as `one` or `other` with `{count}`.
		 * Nothing at 0.
		 *
		 * @param {object} row The row.
		 * @param {{field: string, one?: string, other?: string, variant?: string}} badge The declaration.
		 * @param {number} index The badge's place, for its key.
		 * @return {object|null} The badge.
		 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-record-list-can-act-on-its-rows-and-link-onwards
		 */
		countBadgeOf(row, badge, index) {
			const raw = readPath(row, badge.field)
			const count = Array.isArray(raw) ? raw.length : Number(raw)
			if (!Number.isFinite(count) || count < 1) {
				return null
			}
			const template = count === 1 ? (badge.one || badge.other) : (badge.other || badge.one)
			if (typeof template !== 'string' || template === '') {
				return null
			}
			return {
				key: `count-${index}`,
				kind: 'count',
				label: this.translate(template).replace(/\{count\}/g, String(count)),
				variant: isBadgeVariant(badge.variant) ? badge.variant : 'default',
			}
		},

		/**
		 * The badge variant of a `table` cell with a `tone`
		 * (`{ field?, map, default?, override?: { when, tone } }`): the value at
		 * `field` (else the cell text) looked up in `map`, else `default`. While
		 * `override.when` (a condition over the row) holds, the cell takes
		 * `override.tone` instead, so a verdict is never green unless a second
		 * field allows it.
		 *
		 * @param {object} col The column.
		 * @param {object} row The row.
		 * @param {string} text The cell text.
		 * @return {string} A badge variant, or '' for a plain cell.
		 * @spec openspec/changes/record-list-table-shape/specs/record-list-table-shape/spec.md#requirement-a-record-list-table-takes-its-shape-from-the-rows
		 */
		cellToneOf(col, row, text) {
			const tone = col.tone
			if (!tone || typeof tone !== 'object') {
				return ''
			}
			let variant
			if (tone.override && typeof tone.override === 'object' && evaluateVisibleWhenLocal(tone.override.when, row || {})) {
				variant = tone.override.tone
			} else {
				const value = tone.field ? readPath(row, tone.field) : text
				const map = tone.map && typeof tone.map === 'object' ? tone.map : {}
				variant = Object.hasOwn(map, String(value)) ? map[String(value)] : tone.default
			}
			return isBadgeVariant(variant) ? variant : 'default'
		},

		/**
		 * The `aria-sort` of a sortable `table` column.
		 *
		 * @param {string} key The column key.
		 * @return {string} `ascending`, `descending` or `none`.
		 */
		sortStateOf(key) {
			return this.tableSort.key === key && this.tableSort.dir ? this.tableSort.dir : 'none'
		},

		/**
		 * The arrow after a sortable column's label.
		 *
		 * @param {string} key The column key.
		 * @return {string} An up or down arrow, or '' while the column is not the sort.
		 */
		sortMarkOf(key) {
			const state = this.sortStateOf(key)
			if (state === 'ascending') {
				return '▲'
			}
			return state === 'descending' ? '▼' : ''
		},

		/**
		 * Sort the `table` by a column: ascending first, then descending.
		 *
		 * @param {string} key The column key.
		 * @spec openspec/changes/record-list-table-shape/specs/record-list-table-shape/spec.md#requirement-a-record-list-table-takes-its-shape-from-the-rows
		 */
		toggleTableSort(key) {
			const dir = this.tableSort.key === key && this.tableSort.dir === 'ascending' ? 'descending' : 'ascending'
			this.tableSort = { key, dir }
		},

		/**
		 * The rows of a read with `flattenPath` set: each entry of the list at
		 * that path on a record becomes a row, with the record at `@parent`.
		 * A record without the list adds no row. Without `flattenPath` the
		 * records are the rows.
		 *
		 * @param {Array<object>} records The records read.
		 * @return {Array<object>} The rows.
		 * @spec openspec/changes/record-list-table-shape/specs/record-list-table-shape/spec.md#requirement-a-record-list-table-takes-its-shape-from-the-rows
		 */
		flattenRows(records) {
			const path = this.content?.flattenPath
			if (typeof path !== 'string' || path === '') {
				return records
			}
			return records.flatMap((record) => {
				const list = readPath(record, path)
				return Array.isArray(list)
					? list.filter((entry) => entry && typeof entry === 'object').map((entry) => ({ ...entry, '@parent': record }))
					: []
			})
		},

		/**
		 * The row actions shown on one row: those whose `visibleWhen` (a
		 * condition over the row) holds. An `href` action is a template over
		 * the row and shows only when it fills to a web address or an
		 * instance path; a web address opens in a new tab.
		 *
		 * @param {object} row The row.
		 * @return {Array<{action: object, index: number, href: string, external: boolean}>} The visible actions, with their place in `rowActions`.
		 * @spec openspec/changes/record-list-row-rules/specs/record-list-row-rules/spec.md#requirement-a-row-action-can-depend-on-the-row
		 */
		rowActionsOf(row) {
			const shown = []
			this.rowActions.forEach((action, index) => {
				if (action.visibleWhen && !evaluateVisibleWhenLocal(action.visibleWhen, row || {})) {
					return
				}
				if (typeof action.href !== 'string') {
					shown.push({ action, index, href: '', external: false })
					return
				}
				const href = this.fill(action.href, row).trim()
				const external = /^https?:\/\//i.test(href)
				if (external || (href.startsWith('/') && !href.startsWith('//'))) {
					shown.push({ action, index, href, external })
				}
			})
			return shown
		},

		/**
		 * A row's `links` line: the ids at `links.field`, each labelled from
		 * `links.labelSource` (`{ register, schema, template }`) once read, else
		 * `links.fallback`, and routed by `links.route` with `{value}` the id.
		 *
		 * @param {object} row The row.
		 * @return {Array<{id: string, label: string, to: (object|null)}>}
		 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-record-list-can-act-on-its-rows-and-link-onwards
		 */
		linksOf(row) {
			const spec = this.content?.links
			if (!spec || typeof spec !== 'object' || !spec.field) {
				return []
			}
			const list = readPath(row, spec.field)
			if (!Array.isArray(list)) {
				return []
			}
			const fallback = typeof spec.fallback === 'string' ? this.translate(spec.fallback) : ''
			return list.filter((id) => typeof id === 'string' && id !== '').map((id) => {
				let to = null
				if (spec.route && typeof spec.route === 'object' && spec.route.name && this.$router) {
					const params = {}
					for (const [key, value] of Object.entries(spec.route.params || {})) {
						params[key] = value === '{value}' ? id : value
					}
					to = { name: spec.route.name, params }
				}
				return { id, label: this.linkLabels[id] || fallback || id, to }
			})
		},

		/**
		 * Read the labels of the records the `links` lines name, ten at most.
		 * A record that cannot be read keeps the fallback; its link still opens.
		 *
		 * @return {Promise<void>}
		 */
		async loadLinkLabels() {
			const spec = this.content?.links?.labelSource
			if (!spec || !spec.register || !spec.schema || this.linkIdsKey === '') {
				return
			}
			const wanted = this.linkIdsKey.split('|').filter((id) => !this.linkLabels[id]).slice(0, 10)
			const [{ default: axios }, { generateUrl }] = await Promise.all([import('@nextcloud/axios'), import('@nextcloud/router')])
			await Promise.all(wanted.map(async (id) => {
				try {
					const { data } = await axios.get(generateUrl('/apps/openregister/api/objects/{register}/{schema}/{id}', { register: spec.register, schema: spec.schema, id }))
					const label = fillTemplate(this.translate(spec.template || '{title}'), data || {})
					if (label !== '') {
						this.linkLabels = { ...this.linkLabels, [id]: label }
					}
				} catch {
					// The link still opens; only its text stays the fallback.
				}
			}))
		},

		/**
		 * Run one of `rowActions` for a row: an `endpoint` is called with the
		 * row's `{field}` tokens and the page's `@objectId` filled in, then the
		 * list reads again; a refusal shows the server's sentence. Any other
		 * entry is a page action, dispatched as `rowAction` is.
		 *
		 * @param {object} action The entry.
		 * @param {object} row The row.
		 * @return {Promise<void>}
		 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-record-list-can-act-on-its-rows-and-link-onwards
		 */
		async runRowActionEntry(action, row) {
			this.actionError = ''
			if (typeof action.endpoint !== 'string' || action.endpoint === '') {
				const { label, ...declared } = action
				const type = declared.type || 'handler'
				let wrapped = declared
				if (type === 'handler') {
					wrapped = { ...declared, args: [...(declared.args || []), row] }
				} else if (type === 'open-modal') {
					wrapped = { ...declared, props: { ...resolveDeepTokens(declared.props || {}, this.tokenCtx), row } }
				}
				if (typeof this.cnDispatchAction === 'function') {
					this.cnDispatchAction(wrapped)
					return
				}
				dispatchAction(wrapped, { router: this.$router || null, row, tokenCtx: this.rowTokenCtx(row) })
				return
			}
			const [{ default: axios }, { generateUrl }] = await Promise.all([import('@nextcloud/axios'), import('@nextcloud/router')])
			const path = interpolateUrlTokens(action.endpoint, this.tokenCtx).replace(/\{([\w.@]+)\}/g, (_match, field) => encodeURIComponent(String(readPath(row, field) ?? '')))
			const method = typeof action.method === 'string' ? action.method.toLowerCase() : 'post'
			try {
				await axios.request({ method, url: generateUrl(path) })
				if (typeof this.epRefetch === 'function' && this.endpointActive) {
					await this.epRefetch(true)
				} else {
					await this.fetchRows()
				}
			} catch (error) {
				const said = error?.response?.data?.error ?? error?.response?.data?.message
				this.actionError = typeof said === 'string' && said !== ''
					? said
					: (action.errorText ? this.translate(action.errorText) : t('nextcloud-vue', 'This did not work. Try again.'))
			}
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
				if (badge.kind === 'count') {
					const made = this.countBadgeOf(row, badge, index)
					if (made) {
						out.push(made)
					}
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
			// `headerSubtitle`: the counts as the muted line under the card title.
			const subtitle = this.content?.headerSubtitle
			if (typeof subtitle === 'string' && subtitle !== '' && !this.error) {
				header.subtitle = this.withTotal(subtitle)
			}
			// `headerCount: true`: the card draws the total as a chip after its title.
			if (this.content?.headerCount === true && !this.error) {
				header.count = this.total
			}
			/**
			 * @event header Emitted after every read with the card header's parts.
			 * @type {{link: (object|null), note: string, count: (number|undefined), subtitle: (string|undefined)}} The header link (resolved, with `{total}` filled), the note, with `headerCount` the total, and with `headerSubtitle` the line under the title.
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
			this.rows = this.flattenRows(Array.isArray(this.epData) ? this.epData : [])
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
			if (this.absent) {
				this.rows = []
				this.total = 0
				this.error = false
				return
			}
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
					this.rows = this.flattenRows(ranked.rows)
					this.total = this.content?.flattenPath ? this.rows.length : ranked.total
					return
				}
				const response = await axios.get(url, { params })
				const data = response && response.data ? response.data : {}
				this.rows = this.flattenRows(Array.isArray(data.results) ? data.results : [])
				this.total = typeof data.total === 'number' && !this.content?.flattenPath ? data.total : this.rows.length
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

.cn-record-list__group-heading {
	margin: 6px 0 0;
	font-size: 15px;
	font-weight: 700;
	line-height: 1.4;
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

.cn-record-list--compact .cn-record-list__row {
	box-sizing: border-box;
	min-height: 56px;
	padding: 10px 0;
}

.cn-record-list--compact .cn-record-list__title {
	font-weight: 500;
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

.cn-record-list__leading {
	flex: 0 0 52px;
	color: var(--color-text-maxcontrast);
	font-size: 14px;
	font-weight: 600;
	font-variant-numeric: tabular-nums;
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

.cn-record-list__cell-sub {
	display: block;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-record-list__table .cn-record-list__cell--actions {
	width: 1%;
	padding-inline-start: 12px;
	text-align: end;
	white-space: nowrap;
}

.cn-record-list__sort {
	display: inline-flex;
	gap: 4px;
	align-items: center;
	min-height: 0;
	margin: 0;
	padding: 0;
	border: none;
	background: none;
	color: inherit;
	font: inherit;
	cursor: pointer;
}

.cn-record-list__sort:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-record-list__sort-mark {
	font-size: 10px;
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

.cn-record-list__intro {
	margin: 0 0 8px;
	color: var(--color-text-maxcontrast);
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

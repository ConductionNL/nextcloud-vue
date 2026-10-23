<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-facts-widget" data-testid="cn-facts-widget">
		<p v-if="error"
			class="cn-facts-widget__muted"
			role="alert"
			data-testid="cn-facts-error">
			{{ errorLabel }}
			<button
				type="button"
				class="cn-facts-widget__inline-button"
				data-testid="cn-facts-retry"
				@click="load">
				{{ retryLabel }}
			</button>
		</p>
		<div v-else-if="loading && !record" class="cn-facts-widget__loading">
			<NcLoadingIcon :size="20" />
		</div>
		<div v-else-if="blocks.length === 0 && showsEmpty" class="cn-facts-widget__empty">
			<p class="cn-facts-widget__muted" data-testid="cn-facts-empty">
				{{ emptyLabel }}
			</p>
			<button
				v-for="(entry, index) in emptyActions"
				:key="`empty-action-${index}`"
				type="button"
				class="cn-facts-widget__action"
				data-testid="cn-facts-empty-action"
				@click="runAction(entry.action)">
				<CnIcon v-if="entry.icon" :name="entry.icon" :size="16" />
				{{ entry.label }}
			</button>
		</div>
		<template v-else>
			<template v-for="block in blocks" :key="block.key">
				<dl
					v-if="block.kind === 'rows'"
					class="cn-facts-widget__rows"
					:class="{ 'cn-facts-widget__rows--columns': twoColumns }">
					<div
						v-for="row in block.rows"
						:key="row.key"
						class="cn-facts-widget__row"
						:data-testid="`cn-fact-${row.key}`">
						<dt class="cn-facts-widget__label" :class="{ 'cn-facts-widget__label--icon': row.icon }">
							<CnIcon
								v-if="row.icon"
								:name="row.icon"
								:size="18"
								aria-hidden="true" />
							<span :class="{ 'hidden-visually': row.icon }">{{ row.label }}</span>
						</dt>
						<dd class="cn-facts-widget__value">
							<a
								v-if="row.href"
								:href="row.href"
								class="cn-facts-widget__value-link"
								:target="row.external ? '_blank' : undefined"
								:rel="row.external ? 'noopener noreferrer' : undefined">{{ row.value }}</a>
							<router-link
								v-else-if="row.to"
								:to="row.to"
								class="cn-facts-widget__value-link">
								{{ row.masked && !revealed[row.key] ? row.masked : row.value }}
							</router-link>
							<span v-else>{{ row.masked && !revealed[row.key] ? row.masked : row.value }}</span>
							<button
								v-if="row.reveal && !revealed[row.key]"
								type="button"
								class="cn-facts-widget__inline-button"
								:aria-label="revealLabel(row)"
								:data-testid="`cn-fact-reveal-${row.key}`"
								@click="reveal(row)">
								<EyeOutline :size="16" aria-hidden="true" />
								{{ showLabel }}
							</button>
							<button
								v-if="row.copy"
								type="button"
								class="cn-facts-widget__icon-button"
								:aria-label="copyLabel(row)"
								:title="copyLabel(row)"
								:data-testid="`cn-fact-copy-${row.key}`"
								@click="copy(row)">
								<Check v-if="copied === row.key" :size="16" aria-hidden="true" />
								<ContentCopy v-else :size="16" aria-hidden="true" />
							</button>
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
				<span
					v-else-if="block.kind === 'text'"
					class="cn-facts-widget__text"
					:data-testid="`cn-fact-${block.key}`">
					{{ block.value }}
				</span>
				<div
					v-else-if="block.kind === 'lead'"
					class="cn-facts-widget__lead"
					:data-testid="`cn-fact-${block.key}`">
					<span
						class="cn-facts-widget__lead-tile"
						:class="[`cn-facts-widget__lead-tile--${block.tone}`, { 'cn-facts-widget__lead-tile--initials': !block.icon }]"
						aria-hidden="true">
						<CnIcon v-if="block.icon" :name="block.icon" :size="20" />
						<template v-else>{{ block.initials }}</template>
					</span>
					<span class="cn-facts-widget__lead-text">
						<strong class="cn-facts-widget__lead-title">{{ block.value }}</strong>
						<span v-if="block.subtitle" class="cn-facts-widget__lead-subtitle">{{ block.subtitle }}</span>
					</span>
				</div>
				<div
					v-else-if="block.kind === 'meter'"
					class="cn-facts-widget__meter"
					:class="{ 'cn-facts-widget__meter--over': block.over }"
					:data-testid="`cn-fact-${block.key}`">
					<div class="cn-facts-widget__meter-head">
						<span class="cn-facts-widget__meter-label">{{ block.label }}</span>
						<span class="cn-facts-widget__meter-value">{{ block.value }}</span>
					</div>
					<div
						v-if="block.limit !== null"
						class="cn-facts-widget__meter-track"
						role="meter"
						:aria-label="block.label"
						:aria-valuenow="block.amount"
						aria-valuemin="0"
						:aria-valuemax="block.limit"
						:aria-valuetext="block.value"
						:data-testid="`cn-fact-${block.key}-bar`">
						<span class="cn-facts-widget__meter-bar" :style="{ width: `${block.percent}%` }" />
					</div>
				</div>
				<div
					v-else-if="block.kind === 'progress'"
					class="cn-facts-widget__progress"
					:data-testid="`cn-fact-${block.key}`">
					<span
						v-if="block.percent !== null"
						class="cn-facts-widget__meter-track"
						role="progressbar"
						:aria-label="block.label || null"
						:aria-valuenow="block.percent"
						aria-valuemin="0"
						aria-valuemax="100"
						:data-testid="`cn-fact-${block.key}-bar`">
						<span class="cn-facts-widget__meter-bar" :style="{ width: `${block.percent}%` }" />
					</span>
					<span class="cn-facts-widget__line">{{ block.value }}</span>
				</div>
				<div v-else-if="block.kind === 'pill'">
					<CnStatusBadge
						:label="block.value"
						:variant="block.variant"
						size="small"
						:data-testid="`cn-fact-${block.key}`" />
				</div>
			</template>
		</template>
		<NcNoteCard
			v-if="notice && record"
			:type="notice.type"
			class="cn-facts-widget__notice"
			data-testid="cn-facts-notice">
			{{ notice.text }}
		</NcNoteCard>
		<button
			v-if="link && link.sidebarTab && record"
			type="button"
			class="cn-facts-widget__link cn-facts-widget__link--button"
			data-testid="cn-facts-link"
			@click="openSidebarTab(link.sidebarTab)">
			<CnIcon v-if="link.icon" :name="link.icon" :size="18" />
			{{ link.label }}
		</button>
		<component
			:is="link.to ? 'router-link' : 'a'"
			v-else-if="link && record"
			:to="link.to || undefined"
			:href="link.href || undefined"
			:target="link.target || undefined"
			:rel="link.target === '_blank' ? 'noopener noreferrer' : undefined"
			class="cn-facts-widget__link"
			data-testid="cn-facts-link">
			<CnIcon v-if="link.icon" :name="link.icon" :size="18" />
			{{ link.label }}
		</component>
		<button
			v-if="action && record"
			type="button"
			class="cn-facts-widget__action"
			data-testid="cn-facts-action"
			@click="runAction(content.action)">
			<CnIcon v-if="action.icon" :name="action.icon" :size="16" />
			{{ action.label }}
		</button>
		<CnActionButtons
			v-if="drawnActions.length > 0"
			class="cn-facts-widget__actions"
			:actions="drawnActions"
			data-testid="cn-facts-actions" />
	</div>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import { emit, subscribe, unsubscribe } from '@nextcloud/event-bus'
import { formatFileSize } from '@nextcloud/files'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import Check from 'vue-material-design-icons/Check.vue'
import ContentCopy from 'vue-material-design-icons/ContentCopy.vue'
import EyeOutline from 'vue-material-design-icons/EyeOutline.vue'
import CnActionButtons from '../CnActionButtons/CnActionButtons.vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import CnStatusBadge from '../CnStatusBadge/CnStatusBadge.vue'
import { fetchEndpointSource, resolveEndpointRequest } from '../../composables/useEndpointSource.js'
import { useRefLabels } from '../../composables/useRefLabels.js'
import { dispatchAction } from '../../utils/actionsDispatcher.js'
import { isBadgeVariant } from '../../utils/badgeVariants.js'
import { formatBoardDate } from '../../utils/boardDate.js'
import { conditionalLine } from '../../utils/conditionalLine.js'
import { parseDateValue } from '../../utils/dateVariant.js'
import { fetchListTotal } from '../../utils/fetchFilterCounts.js'
import { fillTemplate } from '../../utils/fillTemplate.js'
import { formatMoney, metricLocale, unwrapAppConfig } from '../../utils/formatMetric.js'
import { readPath } from '../../utils/readPath.js'
import { hasUnresolvedDeepTokens, resolveDeepTokens } from '../../utils/resolveFilterTokens.js'
import { userDisplayName } from '../../utils/userDisplayName.js'
import { evaluateVisibleWhen, evaluateVisibleWhenLocal, isLocallyDecidableVisibleWhen } from '../../utils/visibleWhen.js'

/** Event-bus channel of the page-level Refresh, which an api-call or a saved form also sends. */
const PAGE_REFRESH_CHANNEL = 'cn:page:refresh'

/**
 * Replace every `@source.<field>` in a declaration with the field of the
 * record shown, deeply.
 *
 * @param {unknown} value The declaration.
 * @param {object} record The record shown.
 * @return {{value: unknown, unresolved: boolean}} The resolved copy, and whether a token named an empty field.
 * @spec openspec/changes/facts-actions-and-sources/specs/facts-widget/spec.md#requirement-facts-can-carry-declared-actions
 */
function resolveSourceTokens(value, record) {
	let unresolved = false
	const walk = (node) => {
		if (typeof node === 'string') {
			return node.replace(/@source\.([\w.@]+)/g, (match, path) => {
				const read = path === 'id' ? (record.id ?? readPath(record, '@self.id')) : readPath(record, path)
				if (read === undefined || read === null || read === '' || typeof read === 'object') {
					unresolved = true
					return match
				}
				return String(read)
			})
		}
		if (Array.isArray(node)) {
			return node.map(walk)
		}
		if (node && typeof node === 'object') {
			return Object.fromEntries(Object.entries(node).map(([key, entry]) => [key, walk(entry)]))
		}
		return node
	}
	const resolved = walk(value)
	return { value: resolved, unresolved }
}

/** Kinds of entry a `fields[]` item can be. A labelled item without `as` is a row. */
const KINDS = Object.freeze(['row', 'title', 'line', 'pill', 'lead', 'text', 'meter', 'progress'])

/** The schemes a facts link opens, besides a path on this server. */
const LINK_SCHEMES = ['http:', 'https:']

/**
 * A value read as an absolute URL, or null when it is not one (a page path).
 *
 * @param {string} value The value.
 * @return {URL|null}
 */
function absoluteUrl(value) {
	try {
		return new URL(value)
	} catch {
		return null
	}
}

/**
 * The label resolver every facts widget on the page shares, made on first use
 * (the object store needs an active pinia). One batched request per register and
 * schema for the ids it has not seen; a label it has read stays until the page
 * reloads, and an object the store already holds is not fetched at all.
 *
 * @type {{resolve: Function}|null}
 */
let refLabels = null

/**
 * The entry that reads a resolved pill's tone: the same reference, with the
 * referenced object's `toneField` as the field to read.
 *
 * @param {object} spec A facts entry.
 * @return {object|null} `{ path, itemPath, resolve }`, or null when no `toneField` is set.
 */
function toneSpec(spec) {
	const resolve = spec && spec.resolve
	if (!resolve || typeof resolve !== 'object' || typeof resolve.toneField !== 'string' || resolve.toneField === '') {
		return null
	}
	return { path: spec.path, itemPath: spec.itemPath, resolve: { register: resolve.register, schema: resolve.schema, labelField: resolve.toneField } }
}

/** The page-wide reference label resolver. */
function sharedRefLabels() {
	if (!refLabels) {
		refLabels = useRefLabels()
	}
	return refLabels
}

/**
 * Key of a resolved reference in the widget's `labels` data.
 *
 * @param {{register: string, schema: string, labelField?: string}} resolve The entry's `resolve` config.
 * @param {string} id The referenced object's id.
 * @return {string} The key.
 */
function refKey(resolve, id) {
	return `${resolve.register}/${resolve.schema}/${resolve.labelField || ''}/${id}`
}

/** Event-bus channel a reveal of a masked value is announced on, so an app can log it. */
export const FACTS_REVEAL_CHANNEL = 'cn:facts:reveal'

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

	components: { Check, CnActionButtons, CnIcon, CnStatusBadge, ContentCopy, EyeOutline, NcLoadingIcon, NcNoteCard },

	inject: {
		cnTranslate: { default: () => (key) => key },
		cnObjectContext: { default: null },
		/** The detail page's newest change of the record (`recordLastChange`), read as `_lastChange.*`. */
		cnRecordLastChange: { default: null },
		cnWorkspaceContext: { default: null },
		/** The page's app config; its `currency` is the reporting currency a money value falls back to. */
		cnAppConfig: { default: null },
		/** Pre-bound action dispatcher of CnPageRenderer, for `action` / `headerAction`. */
		cnDispatchAction: { default: null },
		/** The page's object sidebar channel; a `link.sidebarTab` opens one of its tabs. */
		objectSidebarState: { default: null },
	},

	props: {
		/**
		 * The widget configuration.
		 *
		 * - `fields` — the entries, in order. Each is `{ path, label?, as?, from?, format?, map?, itemPath?, parts?, separator?, route?, variant?, variantMap?, colorMap?, icon?, copy?, reveal?, text?, title?, subtitle?, initialsPath?, tone? }`.
		 *   `as` is `row` (default when `label` or `icon` is set), `title`, `line`, `text` (a line in the normal ink), `lead` (an icon tile or initials beside `title` and `subtitle`), `pill` or `meter`.
		 *   `countFrom` (`{ register, schema, filter? }`, `@objectId` / `@object.<field>` in the filter) shows how many records that list holds ("Lopende zaken 43"); the row is left out while the count cannot be read.
		 *   A `meter` shows the amount at `path` against the limit at `limitPath` (or a constant `limit`) as "12 of 50" with a bar; past the limit the bar turns red and the text says "over the limit"; without a positive limit it shows the amount and no bar.
		 *   A row's `format` may also be `email`, `phone` or `url` (a link) or `masked` (the last four characters; `reveal: true` adds Show). `copy: true` adds a copy button; `icon` replaces the label.
		 *   A part may be `{ text }`, a constant; a `line` or `text` entry without `path` or `parts` shows its `text`.
		 *   `resolve: { register, schema, labelField? }` on an entry or a part turns a value that is a reference (an id, or a list of ids) into the label of the referenced object (`labelField`, else `title`, then `name`): the case type or status of a task shows its name, not its uuid. The ids are fetched once per register and schema through the object store and shared by every facts widget on the page; the entry stays empty until its label is known, and when no label can be read. A resolved value works as a pill too: `map` is applied to the resolved label, and `variantMap` / `colorMap` look the tone up by the value of `resolve.toneField` on the referenced object when that is set (a status named by its `name`, coloured by its `state`), then by the resolved label, then by the stored value.
		 *   `route` (`{ name, params?, query? }`, `@source.<path>` in a param) on a `title` or a `row` links its value to that route; a param that does not fill leaves it plain.
		 *   `format: 'user'` shows a Nextcloud user id as the user's display name, read once per id; the entry stays empty until the name is known.
		 *   `template` ("{available} {unit}") fills its `{path}` placeholders from the record instead of reading `path`; it is empty when every placeholder is. `suffix` (" kg") is added to a value that is not empty.
		 *   `emptyValue` ("No") is shown, translated, when the entry has no value, so the entry stays drawn whatever `hideEmpty` says (an override that was never set reads "No").
		 * - `action` — an action drawn as a button under the facts; `headerAction` — one drawn in the card header (reported through the `header` event).
		 * - `actions` — action buttons under the facts in the `headerActions` shape (`api-call`, `open-form`, `navigate`, `open-modal`, ...; `confirm`, `variant`). `@source.<field>` names a field of the record shown, and an action whose token names an empty field is not drawn. `visibleWhen` reads the record shown; `adminOnly: true` draws the action for an instance admin only (visibility, never authorisation). An api-call or a saved form refreshes the page, and the facts read their source again.
		 * - `rowsPath` — a path to a list of `{ label, value }` the record holds, drawn as rows after `fields` (a preview the server builds).
		 * - `headerPill` — a status pill in the card header (reported through the `header` event): `{ path?, text?, map?, variant?, variantMap?, colorMap? }`, read from the record like a `pill` entry (DqBezwaar "Advies ontvangen"); nothing shows while the value is empty.
		 * - `notice` — `{ text, variant? }`, a note band inside the card under the facts (`info` by default; `success`, `warning` or `error`); the text is translated.
		 *   `format` is `text` (default), `date` (board short date), `date-long` (always with the year), `list` (an array joined by ", ", each item read at `itemPath`), `bytes` (a size, "1.5 MB"), `number` (in the reader's language, `decimals` fraction digits when set) or `currency` (a money amount in the reader's language, "€ 1.234,50": the code in `currency`, else the record's `currencyField`, else the app's reporting currency, else EUR; `decimals` defaults to 2).
		 *   `map` turns a raw value into a label (translated). `parts` (on a `line`) lists paths, or `{ path, label?, format? }`, joined by `separator` (default " · "); empty parts are dropped.
		 * - `source` — `{ register, schema, id }` or `{ url }`; omitted = the current object. `{ register, schema, filter, sort? }` without `id` reads the first object that matches `filter` in `sort` order (`{ field, dir }`): the latest count of a shift. An entry with `from: "object"` reads the current object even then (a client card that also shows the ticket's channel).
		 * - `endpointSource` — `{ url, method?, params?, responsePath? }`, the block a stat or chart takes: the facts read an app endpoint, shared and cached like those.
		 * - `emptyWhen` — a path; when the record's value there is truthy the card shows `emptyText` (an endpoint that answers `empty: true`).
		 * - `link` — `{ label, route? | href? }` at the foot. `{ label, icon?, sidebarTab }` instead opens the page's object sidebar on that tab (no link without a sidebar).
		 * - `hideEmpty` — drop an entry whose value is empty (default true).
		 * - `columns` — `2` lays the rows out in two columns with the label above the value (board DqContact); a row with `parts` joins them like a line (an address on one row).
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

	emits: ['header', 'reveal'],

	data() {
		return {
			fetched: null,
			loading: false,
			error: false,
			/** Keys of the masked rows the reader chose to show. */
			revealed: {},
			/** Key of the row whose value was just copied. */
			copied: '',
			/** Labels of the referenced objects read so far, by `refKey`. */
			labels: {},
			/** The `countFrom` totals read so far, by `countKey`. */
			counts: {},
			/** The outcome of each `actions[]` condition that needs a request, by action id. */
			remoteVisibility: {},
			/** Sequence of the source reads, so an older answer never replaces a newer one. */
			loadSeq: 0,
		}
	},

	computed: {
		/**
		 * Whether the rows sit in two columns, label above value.
		 *
		 * @spec openspec/changes/facts-columns/specs/facts-widget/spec.md#requirement-facts-rows-can-sit-in-two-columns
		 * @return {boolean}
		 */
		twoColumns() {
			return Number(this.content?.columns) === 2
		},

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
		 * The entries' `countFrom` lists (`{ register, schema, filter? }`), each
		 * once, keyed by what they count on this record.
		 *
		 * @return {string} A stable key of the lists to count.
		 * @spec openspec/changes/facts-entry-count/specs/facts-widget/spec.md#requirement-a-facts-entry-can-count-a-related-list
		 */
		countJobsKey() {
			const fields = Array.isArray(this.content?.fields) ? this.content.fields : []
			const keys = fields
				.filter((field) => field && field.countFrom && typeof field.countFrom === 'object' && field.countFrom.register && field.countFrom.schema)
				.map((field) => this.countKey(field.countFrom))
			return JSON.stringify([...new Set(keys)])
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
		 * @spec openspec/changes/facts-actions-and-sources/specs/facts-widget/spec.md#requirement-facts-can-read-an-app-endpoint
		 */
		sourceKey() {
			if (this.endpointRequest) {
				return JSON.stringify(this.endpointRequest)
			}
			return this.resolvedSource ? JSON.stringify(this.resolvedSource) : ''
		},

		/**
		 * The `endpointSource` request with its tokens resolved, or null without one.
		 *
		 * @return {object|null}
		 * @spec openspec/changes/facts-actions-and-sources/specs/facts-widget/spec.md#requirement-facts-can-read-an-app-endpoint
		 */
		endpointRequest() {
			const config = this.content?.endpointSource
			if (!config || typeof config !== 'object' || typeof config.url !== 'string' || config.url === '') {
				return null
			}
			return resolveEndpointRequest(config, this.tokenCtx)
		},

		/**
		 * The object the facts are read from.
		 *
		 * @return {object|null}
		 * @spec openspec/changes/facts-actions-and-sources/specs/facts-widget/spec.md#requirement-facts-can-read-an-app-endpoint
		 */
		record() {
			let record = this.endpointRequest || this.resolvedSource ? this.fetched : this.objectData
			const provided = this.cnRecordLastChange
			const lastChange = provided && typeof provided === 'object' && 'value' in provided ? provided.value : null
			if (record && record === this.objectData && lastChange) {
				record = { ...record, _lastChange: lastChange }
			}
			const path = this.content?.source?.path
			if (this.resolvedSource && !this.endpointRequest && typeof path === 'string' && path !== '' && record) {
				const inner = readPath(record, path)
				record = inner && typeof inner === 'object' && !Array.isArray(inner) ? inner : null
			}
			const emptyWhen = this.content?.emptyWhen
			if (record && typeof emptyWhen === 'string' && emptyWhen !== '' && readPath(record, emptyWhen)) {
				return null
			}
			return record
		},

		/**
		 * Whether the empty line shows: when the card declares facts or actions
		 * for the empty case. A card that is only a link says nothing without one.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-facts-card-can-act-when-it-is-empty
		 */
		showsEmpty() {
			const fields = this.content?.fields
			return (Array.isArray(fields) && fields.length > 0) || this.emptyActions.length > 0 || (typeof this.content?.emptyText === 'string' && this.content.emptyText !== '')
		},

		/**
		 * The actions under the empty text (`emptyActions`), as drawn.
		 *
		 * @return {Array<{label: string, icon: string, action: object}>}
		 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-facts-card-can-act-when-it-is-empty
		 */
		emptyActions() {
			const list = Array.isArray(this.content?.emptyActions) ? this.content.emptyActions : []
			return list
				.map((action) => ({ view: this.actionView(action), action }))
				.filter((entry) => entry.view)
				.map((entry) => ({ ...entry.view, action: entry.action }))
		},

		/** @return {string} The line shown when the source could not be read. */
		errorLabel() {
			return this.tr(this.content?.errorText || 'Could not load this information')
		},

		/** @return {string} The retry button's text. */
		retryLabel() {
			return t('nextcloud-vue', 'Try again')
		},

		/**
		 * The `actions[]` to draw: `@source.<field>` resolved against the record
		 * shown, `adminOnly` and `visibleWhen` settled here, so the buttons do
		 * not judge them again against the page's object.
		 *
		 * @return {Array<object>}
		 * @spec openspec/changes/facts-actions-and-sources/specs/facts-widget/spec.md#requirement-facts-can-carry-declared-actions
		 */
		drawnActions() {
			const record = this.record
			const actions = Array.isArray(this.content?.actions) ? this.content.actions : []
			if (!record || actions.length === 0) {
				return []
			}
			const admin = this.viewerIsAdmin()
			const out = []
			actions.forEach((action, index) => {
				if (!action || typeof action !== 'object' || (action.adminOnly === true && !admin)) {
					return
				}
				const id = this.actionId(action, index)
				const condition = action.visibleWhen
				if (condition && isLocallyDecidableVisibleWhen(condition) && !evaluateVisibleWhenLocal(condition, record)) {
					return
				}
				if (condition && !isLocallyDecidableVisibleWhen(condition) && this.remoteVisibility[id] !== true) {
					return
				}
				const { value, unresolved } = resolveSourceTokens(action, record)
				if (unresolved) {
					return
				}
				const { visibleWhen, adminOnly, ...drawn } = value
				out.push({ ...drawn, id })
			})
			return out
		},

		/**
		 * The entries to draw, consecutive rows grouped into one list.
		 *
		 * @return {Array<object>}
		 * @spec openspec/changes/facts-actions-and-sources/specs/facts-widget/spec.md#requirement-facts-can-draw-the-rows-the-source-answers
		 * @spec openspec/changes/facts-from-object/specs/facts-widget/spec.md#requirement-an-entry-can-read-the-page-object-on-a-sourced-card
		 */
		blocks() {
			const sourceRecord = this.record
			const fields = Array.isArray(this.content?.fields) ? this.content.fields : []
			// A source that finds nothing still leaves the entries that read the
			// page's own object (`from: "object"`).
			const ownEntries = Boolean(this.objectData) && fields.some((field) => field && field.from === 'object')
			if (!sourceRecord && !ownEntries) {
				return []
			}
			const hideEmpty = this.content?.hideEmpty !== false
			const out = []
			fields.forEach((field, index) => {
				if (!field || typeof field !== 'object') {
					return
				}
				// `from: "object"` reads the page's own object while the card shows a `source`.
				const record = field.from === 'object' && this.objectData ? this.objectData : sourceRecord
				if (!record) {
					return
				}
				if (field.when && !evaluateVisibleWhenLocal(field.when, record)) {
					return
				}
				const kind = this.kindOf(field)
				const key = String(field.key || field.path || `${kind}-${index}`).replace(/[^\w-]/g, '-')
				const value = this.entryValue(record, field, kind)
				if (value === '' && (hideEmpty || kind === 'lead')) {
					return
				}
				if (kind === 'row') {
					const last = out[out.length - 1]
					const row = { key, label: this.tr(field.label || ''), value, ...this.rowExtras(record, field, value) }
					if (field.route && !row.href) {
						row.to = this.resolveRoute(field.route, record)
					}
					if (last && last.kind === 'rows') {
						last.rows.push(row)
					} else {
						out.push({ kind: 'rows', key: `rows-${index}`, rows: [row] })
					}
					return
				}
				const block = { kind, key, value }
				if (kind === 'lead') {
					block.subtitle = this.partsValue(record, field.subtitle)
					block.icon = typeof field.icon === 'string' ? field.icon : ''
					block.initials = block.icon ? '' : this.initialsOf(readPath(record, field.initialsPath))
					block.tone = ['success', 'info', 'warning', 'error'].includes(field.tone) ? field.tone : 'neutral'
				}
				if (kind === 'meter') {
					Object.assign(block, this.meterOf(record, field))
				}
				if (kind === 'progress') {
					Object.assign(block, this.progressOf(record, field))
				}
				if (kind === 'title' && field.route) {
					block.to = this.resolveRoute(field.route, record)
				}
				if (kind === 'pill') {
					const raw = readPath(record, field.path)
					const colours = field.variantMap || field.colorMap
					// A resolved pill looks its tone up by the referenced object's tone field,
					// then by the resolved label, then by the stored value.
					const keys = field.resolve && typeof field.resolve === 'object'
						? [toneSpec(field) ? this.refLabels(raw, toneSpec(field))[0] : undefined, this.refLabels(raw, field)[0], raw]
						: [raw]
					// A boolean looks its tone up as "true" / "false", as `map` reads it.
					const hit = colours ? keys.map((candidate) => (typeof candidate === 'boolean' ? String(candidate) : candidate)).find((candidate) => (typeof candidate === 'string' || typeof candidate === 'number') && Object.hasOwn(colours, candidate)) : undefined
					const variant = hit !== undefined ? colours[hit] : field.variant
					block.variant = isBadgeVariant(variant) ? variant : 'default'
				}
				out.push(block)
			})
			this.answeredRows(sourceRecord, hideEmpty).forEach((row) => {
				const last = out[out.length - 1]
				if (last && last.kind === 'rows') {
					last.rows.push(row)
				} else {
					out.push({ kind: 'rows', key: 'rows-answered', rows: [row] })
				}
			})
			return out
		},

		/**
		 * The foot link, resolved, or null. A `sidebarTab` link needs the
		 * page's object sidebar and is null without one.
		 *
		 * @return {{label: string, to?: object, href?: string, sidebarTab?: string}|null}
		 * @spec openspec/changes/facts-link-opens-sidebar-tab/specs/record-widgets/spec.md#requirement-a-facts-link-can-open-a-sidebar-tab
		 */
		link() {
			const link = this.content?.link
			if (!link || typeof link !== 'object' || !link.label) {
				return null
			}
			if (typeof link.sidebarTab === 'string' && link.sidebarTab !== '') {
				return this.objectSidebarState
					? { label: this.tr(link.label), sidebarTab: link.sidebarTab, icon: typeof link.icon === 'string' ? link.icon : '' }
					: null
			}
			if (link.route) {
				const to = this.resolveRoute(link.route, this.record)
				return to ? { label: this.tr(link.label), to } : null
			}
			if (typeof link.href === 'string' && link.href !== '') {
				const href = this.linkHref(link, this.record)
				return href ? { label: this.tr(link.label), href, target: link.target === '_blank' ? '_blank' : '', icon: typeof link.icon === 'string' ? link.icon : '' } : null
			}
			return null
		},

		/**
		 * The action under the facts, as drawn: `{ label, icon }`, or null.
		 *
		 * @return {{label: string, icon: string}|null}
		 * @spec openspec/changes/screens-relation-pages/specs/relation-pages/spec.md#requirement-the-facts-card-draws-contact-details-identity-and-a-lead
		 */
		action() {
			return this.actionView(this.content?.action)
		},

		/**
		 * The header action, as drawn: `{ label, icon }`, or null.
		 *
		 * @return {{label: string, icon: string}|null}
		 * @spec openspec/changes/screens-relation-pages/specs/relation-pages/spec.md#requirement-the-facts-card-draws-contact-details-identity-and-a-lead
		 */
		headerAction() {
			return this.actionView(this.content?.headerAction)
		},

		/**
		 * The card header's status pill, read from the record like a `pill`
		 * entry, or null when it has no text.
		 *
		 * @return {{label: string, variant: string}|null}
		 */
		headerPill() {
			const pill = this.content?.headerPill
			if (!pill || typeof pill !== 'object' || !this.record) {
				return null
			}
			const raw = typeof pill.path === 'string' && pill.path !== '' ? readPath(this.record, pill.path) : undefined
			const mapped = pill.map && (typeof raw === 'string' || typeof raw === 'number') && Object.hasOwn(pill.map, raw) ? pill.map[raw] : undefined
			const text = mapped ?? pill.text ?? raw
			if (typeof text !== 'string' && typeof text !== 'number') {
				return null
			}
			const label = this.tr(String(text))
			if (label === '') {
				return null
			}
			const colours = pill.variantMap || pill.colorMap
			const hit = colours && (typeof raw === 'string' || typeof raw === 'number') && Object.hasOwn(colours, raw) ? colours[raw] : pill.variant
			return { label, variant: isBadgeVariant(hit) ? hit : 'default' }
		},

		/**
		 * The note band under the facts: its text translated, its NcNoteCard
		 * type from `variant` (info by default), or null without text.
		 *
		 * @return {{text: string, type: string}|null}
		 */
		notice() {
			const notice = this.content?.notice
			const text = notice && typeof notice.text === 'string' ? this.tr(notice.text) : ''
			if (text === '') {
				return null
			}
			return { text, type: ['success', 'warning', 'error'].includes(notice.variant) ? notice.variant : 'info' }
		},

		/** @return {string} The reveal button's text. */
		showLabel() {
			return t('nextcloud-vue', 'Show')
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
		countJobsKey: {
			immediate: true,
			handler() {
				this.loadCounts()
			},
		},

		sourceKey: {
			immediate: true,
			handler() {
				this.load()
			},
		},

		record: {
			immediate: true,
			/**
			 * Read the labels and settle the action conditions of the record shown.
			 *
			 * @spec openspec/changes/facts-actions-and-sources/specs/facts-widget/spec.md#requirement-facts-can-carry-declared-actions
			 */
			handler() {
				this.loadLabels()
				this.evaluateRemoteVisibility()
			},
		},

		headerAction: {
			immediate: true,
			handler() {
				this.emitHeader()
			},
		},

		headerPill: {
			deep: true,
			handler() {
				this.emitHeader()
			},
		},
	},

	mounted() {
		subscribe(PAGE_REFRESH_CHANNEL, this.onPageRefresh)
	},

	beforeUnmount() {
		unsubscribe(PAGE_REFRESH_CHANNEL, this.onPageRefresh)
	},

	methods: {
		/**
		 * Open the page's object sidebar on one of its tabs.
		 *
		 * @param {string} tab The sidebar tab id.
		 * @return {void}
		 * @spec openspec/changes/facts-link-opens-sidebar-tab/specs/record-widgets/spec.md#requirement-a-facts-link-can-open-a-sidebar-tab
		 */
		openSidebarTab(tab) {
			this.objectSidebarState.open = true
			this.objectSidebarState.requestedTab = tab
		},

		/**
		 * The page asked every widget to read again (a dialog that changed what
		 * the source answers, the page's Refresh): read the source again.
		 *
		 * @return {void}
		 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-facts-card-can-act-when-it-is-empty
		 */
		onPageRefresh() {
			if (this.resolvedSource || this.endpointRequest) {
				this.load(true)
			}
		},

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
			return field.label || field.icon ? 'row' : 'line'
		},

		/**
		 * A progress entry: the percentage at `path` (0 to 100) drawn as a bar
		 * when it is a number, and the sentence that says what it means
		 * (`lines`, the first that applies; `conditionalLine`), else the
		 * percentage itself.
		 *
		 * @param {object} record The object.
		 * @param {object} field The entry.
		 * @return {{label: string, value: string, percent: (number|null)}}
		 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-facts-card-can-show-progress
		 */
		progressOf(record, field) {
			const raw = readPath(record, field.path)
			const number = raw === null || raw === undefined || raw === '' ? NaN : Number(raw)
			const barWhen = field.barWhen ? evaluateVisibleWhenLocal(field.barWhen, record) : true
			const percent = Number.isFinite(number) && barWhen ? Math.max(0, Math.min(100, number)) : null
			const line = field.lines ? conditionalLine(field.lines, record, (text) => this.tr(text)) : ''
			return {
				label: this.tr(field.label || ''),
				value: line || (percent !== null ? `${percent}%` : ''),
				percent,
			}
		},

		/**
		 * A link's href: `{field}` tokens filled from the record (and the
		 * `@source.<field>` grammar), a value that is not a URL put under
		 * `hrefBase` (a page path in another app), and only http, https and
		 * paths on this server opened. Anything else is no link.
		 *
		 * @param {{href: string, hrefBase?: string}} link The link declaration.
		 * @param {object|null} record The object shown.
		 * @return {string} The href, or ''.
		 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-facts-link-can-point-into-another-app
		 */
		linkHref(link, record) {
			let value = link.href.includes('{') ? fillTemplate(link.href, record) : this.resolveTemplate(link.href, record)
			value = String(value || '').trim()
			if (value === '') {
				return ''
			}
			const parsed = absoluteUrl(value)
			if (parsed) {
				return LINK_SCHEMES.includes(parsed.protocol) ? parsed.href : ''
			}
			if (typeof link.hrefBase === 'string' && link.hrefBase !== '') {
				const path = link.hrefBase.replace(/\/+$/, '') + '/' + value.replace(/^\/+/, '')
				return generateUrl(path)
			}
			return value.startsWith('/') && !value.startsWith('//') ? value : ''
		},

		/**
		 * A meter entry's parts: the amount at `path` against the limit at
		 * `limitPath` (or a constant `limit`), both formatted with the entry's
		 * `format`. Without a positive numeric limit there is no bar, only the
		 * amount. Past the limit the text says so, so the state never rests on
		 * the bar's colour alone.
		 *
		 * @param {object} record The object.
		 * @param {object} field The entry.
		 * @return {{label: string, value: string, amount: number|null, limit: number|null, percent: number, over: boolean}}
		 * @spec openspec/changes/facts-meter-row/specs/facts-meter-row/spec.md#requirement-a-facts-entry-can-be-a-meter
		 */
		meterOf(record, field) {
			const amount = Number(readPath(record, field.path))
			const rawLimit = typeof field.limitPath === 'string' && field.limitPath !== '' ? readPath(record, field.limitPath) : field.limit
			const limit = rawLimit === null || rawLimit === undefined || rawLimit === '' ? NaN : Number(rawLimit)
			const label = this.tr(field.label || '')
			const value = this.valueOf(record, field)
			if (!Number.isFinite(amount) || !Number.isFinite(limit) || limit <= 0) {
				return { label, value, amount: Number.isFinite(amount) ? amount : null, limit: null, percent: 0, over: false }
			}
			const over = amount > limit
			const limitText = this.format(limit, field, record)
			return {
				label,
				value: over
					? t('nextcloud-vue', '{value} of {limit}, over the limit', { value, limit: limitText })
					: t('nextcloud-vue', '{value} of {limit}', { value, limit: limitText }),

				amount,
				limit,
				percent: Math.max(0, Math.min(100, (amount / limit) * 100)),
				over,
			}
		},

		/**
		 * The display text of an entry of any kind: a lead's title, the parts of
		 * a line or text, a constant `text`, else the value at `path`.
		 *
		 * @param {object} record The object.
		 * @param {object} field The entry.
		 * @param {string} kind The entry's kind.
		 * @return {string}
		 * @spec openspec/changes/screens-relation-pages/specs/relation-pages/spec.md#requirement-the-facts-card-draws-contact-details-identity-and-a-lead
		 * @spec openspec/changes/facts-actions-and-sources/specs/facts-widget/spec.md#requirement-a-facts-entry-can-fill-a-template
		 * @spec openspec/changes/facts-entry-empty-value/specs/facts-widget/spec.md#requirement-a-facts-entry-can-name-its-empty-value
		 */
		/**
		 * The key of one `countFrom` list on this record: register, schema and
		 * the filter with its tokens resolved.
		 *
		 * @param {{register: string, schema: string, filter?: object}} countFrom The list.
		 * @return {string} The key.
		 */
		countKey(countFrom) {
			return JSON.stringify([countFrom.register, countFrom.schema, resolveDeepTokens(countFrom.filter || {}, this.tokenCtx)])
		},

		/**
		 * Count every `countFrom` list with the list endpoint's total. A count
		 * that cannot be read stays unset, so its row is left out.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/facts-entry-count/specs/facts-widget/spec.md#requirement-a-facts-entry-can-count-a-related-list
		 */
		async loadCounts() {
			const fields = Array.isArray(this.content?.fields) ? this.content.fields : []
			const seen = new Set()
			for (const field of fields) {
				const countFrom = field && field.countFrom
				if (!countFrom || typeof countFrom !== 'object' || !countFrom.register || !countFrom.schema) {
					continue
				}
				const key = this.countKey(countFrom)
				if (seen.has(key)) {
					continue
				}
				seen.add(key)
				try {
					const total = await fetchListTotal(countFrom.register, countFrom.schema, countFrom.filter || {}, this.tokenCtx)
					this.counts = { ...this.counts, [key]: total }
				} catch {
					this.counts = { ...this.counts, [key]: null }
				}
			}
		},

		entryValue(record, field, kind) {
			const value = this.bareEntryValue(record, field, kind)
			if (value === '') {
				return typeof field.emptyValue === 'string' && field.emptyValue !== '' ? this.tr(field.emptyValue) : ''
			}
			return typeof field.suffix === 'string' ? `${value}${field.suffix}` : value
		},

		/**
		 * An entry's text before its `suffix`.
		 *
		 * @param {object} record The object.
		 * @param {object} field The entry.
		 * @param {string} kind The entry's kind.
		 * @return {string}
		 * @spec openspec/changes/facts-actions-and-sources/specs/facts-widget/spec.md#requirement-a-facts-entry-can-fill-a-template
		 */
		bareEntryValue(record, field, kind) {
			if (field.countFrom && typeof field.countFrom === 'object') {
				const total = this.counts[this.countKey(field.countFrom)]
				return Number.isFinite(total) ? String(total) : ''
			}
			if (kind === 'progress') {
				return this.progressOf(record, field).value
			}
			if (kind === 'lead') {
				return this.partsValue(record, field.title)
			}
			if (typeof field.template === 'string' && field.template !== '') {
				return this.templateValue(record, field.template)
			}
			if ((kind === 'line' || kind === 'text' || kind === 'row') && Array.isArray(field.parts)) {
				return this.lineValue(record, field)
			}
			if ((kind === 'line' || kind === 'text') && !field.path && typeof field.text === 'string') {
				return this.tr(field.text)
			}
			return this.valueOf(record, field)
		},

		/**
		 * Fill a template's `{path}` placeholders from the record: "{available} {unit}"
		 * reads "12 pcs". Empty when every placeholder is empty.
		 *
		 * @param {object} record The object.
		 * @param {string} template The template.
		 * @return {string}
		 * @spec openspec/changes/facts-actions-and-sources/specs/facts-widget/spec.md#requirement-a-facts-entry-can-fill-a-template
		 */
		templateValue(record, template) {
			let filled = false
			const text = this.tr(template).replace(/\{([\w.@]+)\}/g, (match, path) => {
				const value = this.format(readPath(record, path), {}, record)
				filled = filled || value !== ''
				return value
			})
			return filled ? text.trim() : ''
		},

		/**
		 * The rows the record answers at `rowsPath`: `{ label, value }` items
		 * drawn after the declared fields.
		 *
		 * @param {object} record The object.
		 * @param {boolean} hideEmpty Whether an empty value drops its row.
		 * @return {Array<object>}
		 * @spec openspec/changes/facts-actions-and-sources/specs/facts-widget/spec.md#requirement-facts-can-draw-the-rows-the-source-answers
		 */
		answeredRows(record, hideEmpty) {
			const path = this.content?.rowsPath
			const items = typeof path === 'string' && path !== '' ? readPath(record, path) : null
			if (!Array.isArray(items)) {
				return []
			}
			return items
				.filter((item) => item && typeof item === 'object')
				.map((item, index) => ({ item, index, value: this.format(item.value, { format: item.format }, record) }))
				.filter(({ value }) => !(hideEmpty && value === ''))
				.map(({ item, index, value }) => ({
					key: `answered-${index}`,
					label: typeof item.label === 'string' ? item.label : '',
					value,
					...this.rowExtras(item, { path: 'value' }, value),
				}))
		},

		/**
		 * Whether the viewer administers this instance, for `adminOnly` actions.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/facts-actions-and-sources/specs/facts-widget/spec.md#requirement-facts-can-carry-declared-actions
		 */
		viewerIsAdmin() {
			try {
				return getCurrentUser()?.isAdmin === true
			} catch {
				return false
			}
		},

		/**
		 * The id an `actions[]` entry is drawn and tested by.
		 *
		 * @param {object} action The declaration.
		 * @param {number} index Its place in `actions`.
		 * @return {string}
		 * @spec openspec/changes/facts-actions-and-sources/specs/facts-widget/spec.md#requirement-facts-can-carry-declared-actions
		 */
		actionId(action, index) {
			return typeof action.id === 'string' && action.id !== '' ? action.id : `action-${index}`
		},

		/**
		 * Settle the `actions[]` conditions that need a request (an `endpoint` or
		 * a `source`), against the record shown.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/facts-actions-and-sources/specs/facts-widget/spec.md#requirement-facts-can-carry-declared-actions
		 */
		async evaluateRemoteVisibility() {
			const record = this.record
			const actions = Array.isArray(this.content?.actions) ? this.content.actions : []
			const remote = actions
				.map((action, index) => ({ action, index }))
				.filter(({ action }) => action && action.visibleWhen && !isLocallyDecidableVisibleWhen(action.visibleWhen))
			if (!record || remote.length === 0) {
				return
			}
			const ctx = { ...this.tokenCtx, object: record }
			const outcomes = await Promise.all(remote.map(({ action }) => evaluateVisibleWhen(action.visibleWhen, ctx)))
			const next = {}
			remote.forEach(({ action, index }, at) => {
				next[this.actionId(action, index)] = outcomes[at]
			})
			this.remoteVisibility = next
		},

		/**
		 * A lead's title or subtitle: a path, a part spec, or an array of parts
		 * joined as a line joins them.
		 *
		 * @param {object} record The object.
		 * @param {string|object|Array} spec The declaration.
		 * @return {string}
		 */
		partsValue(record, spec) {
			if (typeof spec === 'string' && spec !== '') {
				return this.valueOf(record, { path: spec })
			}
			if (Array.isArray(spec)) {
				return this.lineValue(record, { parts: spec })
			}
			if (spec && typeof spec === 'object') {
				return this.lineValue(record, { parts: [spec] })
			}
			return ''
		},

		/**
		 * The initials of a name: "Sanne de Vries" reads "SV".
		 *
		 * @param {unknown} name The name.
		 * @return {string}
		 */
		initialsOf(name) {
			if (typeof name !== 'string' || name.trim() === '') {
				return ''
			}
			const words = name.trim().split(/\s+/).filter((word) => /^\p{Lu}/u.test(word))
			const picked = words.length ? words : name.trim().split(/\s+/)
			const first = picked[0].charAt(0)
			const last = picked.length > 1 ? picked[picked.length - 1].charAt(0) : ''
			return (first + last).toUpperCase()
		},

		/**
		 * What a row adds to its value: an icon, a link for the email, phone
		 * and url formats, the masked text, and the copy and reveal buttons.
		 *
		 * @param {object} record The object.
		 * @param {object} field The entry.
		 * @param {string} value The display text.
		 * @return {object}
		 * @spec openspec/changes/screens-relation-pages/specs/relation-pages/spec.md#requirement-the-facts-card-draws-contact-details-identity-and-a-lead
		 */
		rowExtras(record, field, value) {
			const extras = {
				icon: typeof field.icon === 'string' ? field.icon : '',
				path: field.path || '',
				raw: readPath(record, field.path),
				copy: field.copy === true && value !== '',
				reveal: false,
				masked: '',
				href: '',
				external: false,
			}
			if (value === '') {
				return extras
			}
			if (field.format === 'email') {
				extras.href = `mailto:${value}`
			} else if (field.format === 'phone') {
				extras.href = `tel:${value.replace(/[^\d+]/g, '')}`
			} else if (field.format === 'url') {
				extras.href = /^https?:\/\//i.test(value) ? value : `https://${value}`
				extras.external = true
			} else if (field.format === 'masked') {
				extras.masked = value.length > 4 ? '*'.repeat(Math.min(value.length - 4, 5)) + value.slice(-4) : value
				extras.reveal = field.reveal === true && value.length > 4
			}
			return extras
		},

		/**
		 * Show a masked value, and say so: the `reveal` event and the event-bus
		 * channel {@link FACTS_REVEAL_CHANNEL}, so an app can log who saw it.
		 *
		 * @param {object} row The row.
		 * @spec openspec/changes/screens-relation-pages/specs/relation-pages/spec.md#requirement-the-facts-card-draws-contact-details-identity-and-a-lead
		 */
		reveal(row) {
			this.revealed = { ...this.revealed, [row.key]: true }
			const detail = { path: row.path }
			/**
			 * @event reveal Emitted when the reader shows a masked value.
			 * @type {{path: string}} The path of the shown field.
			 */
			this.$emit('reveal', detail)
			emit(FACTS_REVEAL_CHANNEL, { ...detail, objectId: this.tokenCtx.objectId, register: this.tokenCtx.register || null, schema: this.tokenCtx.schema || null })
		},

		/**
		 * Copy a row's value to the clipboard.
		 *
		 * @param {object} row The row.
		 * @return {Promise<void>}
		 */
		async copy(row) {
			const text = row.raw === null || row.raw === undefined || typeof row.raw === 'object' ? row.value : String(row.raw)
			try {
				await navigator.clipboard.writeText(text)
				this.copied = row.key
				setTimeout(() => {
					if (this.copied === row.key) {
						this.copied = ''
					}
				}, 2000)
			} catch (e) {
				// eslint-disable-next-line no-console
				console.warn('[CnFactsWidget] could not copy:', e?.message || e)
			}
		},

		/**
		 * @param {object} row The row.
		 * @return {string} The copy button's accessible name.
		 */
		copyLabel(row) {
			return this.copied === row.key
				? t('nextcloud-vue', 'Copied')
				: t('nextcloud-vue', 'Copy {label}', { label: row.label || row.value })
		},

		/**
		 * @param {object} row The row.
		 * @return {string} The reveal button's accessible name.
		 */
		revealLabel(row) {
			return t('nextcloud-vue', 'Show {label}', { label: row.label || '' }).trim()
		},

		/**
		 * The drawn part of an action declaration.
		 *
		 * @param {object} action The declaration.
		 * @return {{label: string, icon: string}|null}
		 */
		actionView(action) {
			if (!action || typeof action !== 'object' || typeof action.label !== 'string' || action.label === '') {
				return null
			}
			return { label: this.tr(action.label), icon: typeof action.icon === 'string' ? action.icon : '' }
		},

		/**
		 * Dispatch an action with the record's tokens resolved (`@objectId`,
		 * `@object.<field>`), through the page's dispatcher when there is one.
		 *
		 * @param {object} action The declaration.
		 * @return {unknown}
		 * @spec openspec/changes/screens-relation-pages/specs/relation-pages/spec.md#requirement-the-facts-card-draws-contact-details-identity-and-a-lead
		 */
		runAction(action) {
			if (!action || typeof action !== 'object') {
				return undefined
			}
			const resolved = resolveDeepTokens(action, this.tokenCtx)
			if (typeof this.cnDispatchAction === 'function') {
				return this.cnDispatchAction(resolved)
			}
			return dispatchAction(resolved, { router: this.$router || null })
		},

		/** Tell the card around the facts what its header shows (the header action). */
		emitHeader() {
			const view = this.headerAction
			/**
			 * @event header Emitted with the card header's parts: the header action, if any.
			 * @type {{link: null, note: string, action: (object|null), pill: (object|null)}} `action` is `{ label, icon, run }`, `pill` is `{ label, variant }`.
			 */
			this.$emit('header', {
				link: null,
				note: '',
				action: view ? { ...view, run: () => this.runAction(this.content.headerAction) } : null,
				pill: this.headerPill,
			})
		},

		/**
		 * The text of a reference: the labels of the objects its id(s) name, joined
		 * by ", ". An id whose label is not known yet (or cannot be read) adds nothing.
		 *
		 * @param {unknown} raw The id, or a list of ids (or of `{ id }` objects).
		 * @param {object} spec `{ resolve: { register, schema, labelField? }, itemPath? }`.
		 * @return {string}
		 */
		refText(raw, spec) {
			return this.refLabels(raw, spec)
				.map((label) => (spec.map && Object.hasOwn(spec.map, label) ? this.tr(spec.map[label]) : label))
				.join(', ')
		},

		/**
		 * The labels of a reference as read, before `map` is applied: the key a
		 * pill's `variantMap` and `colorMap` look up.
		 *
		 * @param {unknown} raw The id, or a list of ids.
		 * @param {object} spec `{ resolve, itemPath? }`.
		 * @return {string[]}
		 */
		refLabels(raw, spec) {
			return this.refIds(raw, spec)
				.map((id) => this.labels[refKey(spec.resolve, id)])
				.filter((label) => typeof label === 'string' && label !== '')
		},

		/**
		 * The ids a reference value holds.
		 *
		 * @param {unknown} raw The value.
		 * @param {object} spec `{ itemPath? }`.
		 * @return {string[]}
		 */
		refIds(raw, spec) {
			return (Array.isArray(raw) ? raw : [raw])
				.map((item) => (item && typeof item === 'object' ? (spec.itemPath ? readPath(item, spec.itemPath) : (item.id ?? item.uuid)) : item))
				.filter((id) => id !== null && id !== undefined && id !== '' && typeof id !== 'object')
				.map(String)
		},

		/**
		 * Every entry or part that carries `resolve`, with the record's value at its path.
		 *
		 * @param {object} record The object.
		 * @return {Array<{spec: object, raw: unknown}>}
		 */
		refSpecs(record) {
			const fields = Array.isArray(this.content?.fields) ? this.content.fields : []
			const specs = []
			const visit = (spec) => {
				if (!spec || typeof spec !== 'object') {
					return
				}
				if (spec.resolve && typeof spec.resolve === 'object' && spec.path) {
					specs.push({ spec, raw: readPath(record, spec.path) })
					if (toneSpec(spec)) {
						specs.push({ spec: toneSpec(spec), raw: readPath(record, spec.path) })
					}
				}
				const nested = [...(Array.isArray(spec.parts) ? spec.parts : []), ...(Array.isArray(spec.title) ? spec.title : [spec.title]), ...(Array.isArray(spec.subtitle) ? spec.subtitle : [spec.subtitle])]
				nested.forEach(visit)
			}
			fields.forEach(visit)
			return specs
		},

		/**
		 * Read the labels of the referenced objects, one batched request per
		 * register and schema, and keep them in `labels`.
		 *
		 * @param {object|null} record The object shown (defaults to the current record).
		 * @return {Promise<void>}
		 */
		async loadLabels(record = this.record) {
			if (!record) {
				return
			}
			const groups = new Map()
			for (const { spec, raw } of this.refSpecs(record)) {
				const { register, schema, labelField } = spec.resolve
				if (!register || !schema) {
					continue
				}
				const groupKey = `${register}/${schema}/${labelField || ''}`
				const group = groups.get(groupKey) || { resolve: spec.resolve, ids: new Set() }
				this.refIds(raw, spec).forEach((id) => group.ids.add(id))
				groups.set(groupKey, group)
			}
			if (groups.size === 0) {
				return
			}
			const resolver = sharedRefLabels()
			const next = { ...this.labels }
			await Promise.all([...groups.values()].map(async ({ resolve, ids }) => {
				const found = await resolver.resolve(resolve.register, resolve.schema, [...ids], resolve.labelField)
				Object.entries(found).forEach(([id, label]) => {
					next[refKey(resolve, id)] = label
				})
			}))
			this.labels = next
		},

		/**
		 * Read the source object: by id or url, the first match of a query, or
		 * an app endpoint.
		 *
		 * @param {boolean} [force] Read past the shared endpoint cache (a page refresh).
		 * @return {Promise<void>}
		 * @spec openspec/changes/facts-actions-and-sources/specs/facts-widget/spec.md#requirement-facts-can-show-the-first-match-of-a-query
		 */
		async load(force = false) {
			const seq = ++this.loadSeq
			const source = this.resolvedSource
			const endpoint = this.endpointRequest
			this.error = false
			const url = source && !endpoint ? this.sourceUrl(source) : ''
			if ((!endpoint || endpoint.blocked) && !url) {
				this.fetched = null
				return
			}
			this.loading = true
			try {
				const data = endpoint
					? await fetchEndpointSource(this.content.endpointSource, this.tokenCtx, { force })
					: await this.readSource(source, url)
				if (seq === this.loadSeq) {
					this.fetched = data && typeof data === 'object' && !Array.isArray(data) ? data : null
				}
			} catch (e) {
				// eslint-disable-next-line no-console
				console.warn('[CnFactsWidget] the source could not be read:', e?.message || e)
				if (seq === this.loadSeq) {
					this.fetched = null
					this.error = true
				}
			} finally {
				if (seq === this.loadSeq) {
					this.loading = false
				}
			}
		},

		/**
		 * GET a `source`: the object itself, or the first match of its `filter`.
		 *
		 * @param {object} source The resolved source.
		 * @param {string} url Its URL.
		 * @return {Promise<unknown>} The object read, or null.
		 * @spec openspec/changes/facts-actions-and-sources/specs/facts-widget/spec.md#requirement-facts-can-show-the-first-match-of-a-query
		 */
		async readSource(source, url) {
			const [{ default: axios }, { generateUrl }] = await Promise.all([
				import('@nextcloud/axios'),
				import('@nextcloud/router'),
			])
			const full = url.startsWith('/apps/') || url.startsWith('/ocs/') ? generateUrl(url) : url
			const params = this.sourceQuery(source)
			const response = params ? await axios.get(full, { params }) : await axios.get(full)
			const data = response && response.data
			if (!params) {
				return data
			}
			const first = data && Array.isArray(data.results) ? data.results[0] : null
			return first ?? null
		},

		/**
		 * The query of a source that names no `id`: its `filter`, its `sort` as
		 * `_order`, and one result. Null for a source read by id or url.
		 *
		 * @param {object} source The resolved source.
		 * @return {object|null}
		 * @spec openspec/changes/facts-actions-and-sources/specs/facts-widget/spec.md#requirement-facts-can-show-the-first-match-of-a-query
		 */
		sourceQuery(source) {
			if (typeof source.url === 'string' || Object.hasOwn(source, 'id')) {
				return null
			}
			const params = { ...(source.filter && typeof source.filter === 'object' ? source.filter : {}) }
			const sort = source.sort
			if (sort && typeof sort === 'object' && typeof sort.field === 'string' && sort.field !== '') {
				params[`_order[${sort.field}]`] = sort.dir === 'desc' || sort.direction === 'desc' ? 'desc' : 'asc'
			}
			params._limit = 1
			return params
		},

		/**
		 * The URL of a resolved source, or '' when it cannot be read yet.
		 *
		 * @param {object} source The resolved source.
		 * @return {string}
		 * @spec openspec/changes/facts-actions-and-sources/specs/facts-widget/spec.md#requirement-facts-can-show-the-first-match-of-a-query
		 */
		sourceUrl(source) {
			if (typeof source.url === 'string') {
				return source.url
			}
			if (hasUnresolvedDeepTokens(source)) {
				return ''
			}
			const { register, schema, id } = source
			if (register && schema && this.sourceQuery(source)) {
				return `/apps/openregister/api/objects/${encodeURIComponent(register)}/${encodeURIComponent(schema)}`
			}
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
			return this.format(raw, field, record)
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
					// A constant part (`{ text }`): "Handelsregister" after the legal form.
					if (!spec.path && typeof spec.text === 'string') {
						return this.tr(spec.text)
					}
					// A group of parts with its own separator ("Parkstraat 24" inside
					// "Parkstraat 24, 3421 AB Zuiddrecht").
					if (!spec.path && Array.isArray(spec.parts)) {
						return this.lineValue(record, spec)
					}
					const value = this.format(readPath(record, spec.path), spec, record)
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
		 * @param {object} spec `{ format?, map?, itemPath?, currency?, currencyField?, decimals? }`.
		 * @param {object|null} [record] The object shown, which `currencyField` reads.
		 * @return {string} The text, '' when empty.
		 * @spec openspec/changes/facts-currency-format/specs/facts-widget/spec.md#requirement-a-facts-entry-can-show-a-money-amount
		 * @spec openspec/changes/facts-user-format/specs/facts-widget/spec.md#requirement-a-facts-entry-can-show-a-user-by-name
		 * @spec openspec/changes/facts-actions-and-sources/specs/facts-widget/spec.md#requirement-a-facts-entry-can-fill-a-template
		 */
		format(raw, spec, record = null) {
			if (raw === null || raw === undefined || raw === '') {
				return ''
			}
			if (spec.resolve && typeof spec.resolve === 'object') {
				return this.refText(raw, spec)
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
			if (format === 'bytes') {
				const bytes = Number(raw)
				return Number.isFinite(bytes) && bytes >= 0 ? formatFileSize(bytes) : ''
			}
			if (format === 'user') {
				return userDisplayName(raw)
			}
			if (format === 'number') {
				const number = Number(raw)
				if (typeof raw === 'object' || !Number.isFinite(number)) {
					return typeof raw === 'object' ? '' : String(raw)
				}
				const digits = Number.isInteger(spec.decimals) && spec.decimals >= 0 ? { minimumFractionDigits: spec.decimals, maximumFractionDigits: spec.decimals } : {}
				return new Intl.NumberFormat(metricLocale(), digits).format(number)
			}
			if (format === 'currency') {
				const money = formatMoney(raw, { currency: spec.currency, currencyField: spec.currencyField, decimals: spec.decimals }, record, unwrapAppConfig(this.cnAppConfig))
				if (money !== '') {
					return money
				}
				// Not a number: shown as written, never as "[object Object]".
				return typeof raw === 'object' ? '' : String(raw)
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

/* `padding: 0`: Nextcloud's core stylesheet pads every `dl` 12px at the top
   and bottom, which put a side card's facts 24px under its title, against
   the board's 12 (DqZaak "Behandeling", DqZaakDocumenten). */
.cn-facts-widget__rows {
	display: grid;
	grid-template-columns: max-content 1fr;
	gap: 8px 16px;
	margin: 0;
	padding: 0;
	font-size: 14px;
}

/* Each row is a grid of its own children: the wrapper takes no box. */
.cn-facts-widget__row {
	display: contents;
}

/* Nextcloud core styles `dt` and `dd` (text-align end, 12px padding), which
   pushed the label to the right of its column and added 12px around both. The
   class is doubled so these resets outrank that rule, and a dossiq-style
   `:deep()` override in an app is not needed. */
.cn-facts-widget__label.cn-facts-widget__label {
	margin: 0;
	padding: 0;
	text-align: start;
	color: var(--color-text-maxcontrast);
}

.cn-facts-widget__value.cn-facts-widget__value {
	margin: 0;
	padding: 0;
	text-align: start;
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

.cn-facts-widget__meter {
	display: flex;
	flex-direction: column;
	gap: 4px;
	font-size: 14px;
}

.cn-facts-widget__meter-head {
	display: flex;
	justify-content: space-between;
	gap: 16px;
}

.cn-facts-widget__meter-label {
	color: var(--color-text-maxcontrast);
}

.cn-facts-widget__meter-value {
	font-weight: 500;
	text-align: end;
}

.cn-facts-widget__meter-track {
	height: 6px;
	border-radius: 3px;
	background: var(--color-background-darker);
	overflow: hidden;
}

.cn-facts-widget__meter-bar {
	display: block;
	height: 100%;
	border-radius: inherit;
	background: var(--color-primary-element);
}

.cn-facts-widget__meter--over .cn-facts-widget__meter-value {
	color: var(--color-error-text);
}

.cn-facts-widget__meter--over .cn-facts-widget__meter-bar {
	background: var(--color-error);
}

.cn-facts-widget__muted {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-facts-widget__label .hidden-visually {
	clip-path: inset(50%);
	height: 1px;
	overflow: hidden;
	position: absolute;
	white-space: nowrap;
	width: 1px;
}

.cn-facts-widget__label--icon {
	align-items: center;
	display: flex;
}

.cn-facts-widget__value-link {
	color: var(--color-primary-element);
	text-decoration: underline;
}

.cn-facts-widget__inline-button,
.cn-facts-widget__icon-button,
.cn-facts-widget__action {
	align-items: center;
	cursor: pointer;
	display: inline-flex;
	font: inherit;
}

.cn-facts-widget__inline-button {
	background: var(--color-main-background);
	border: 1px solid var(--color-border-dark);
	border-radius: 16px;
	color: var(--color-main-text);
	font-size: 13px;
	font-weight: 600;
	gap: 4px;
	margin-inline-start: 8px;
	min-height: 30px;
	padding: 0 10px;
}

.cn-facts-widget__icon-button {
	background: transparent;
	border: 0;
	border-radius: 6px;
	color: var(--color-text-maxcontrast);
	margin-inline-start: 4px;
	padding: 2px;
	vertical-align: middle;
}

.cn-facts-widget__icon-button:hover,
.cn-facts-widget__icon-button:focus-visible {
	background: var(--color-background-hover);
	color: var(--color-main-text);
}

.cn-facts-widget__text {
	color: var(--color-main-text);
	font-size: 15px;
}

/* A lead: an icon tile or initials beside a bold title and a muted subtitle. */
.cn-facts-widget__lead {
	align-items: center;
	display: flex;
	gap: 12px;
}

.cn-facts-widget__lead-tile {
	align-items: center;
	background: var(--color-background-dark);
	border-radius: 8px;
	color: var(--color-main-text);
	display: flex;
	flex: none;
	font-size: 14px;
	font-weight: 700;
	height: 40px;
	justify-content: center;
	width: 40px;
}

/* Initials stand for a person: round, as an avatar. */
.cn-facts-widget__lead-tile--initials {
	border-radius: 50%;
}

.cn-facts-widget__lead-tile--success {
	background: color-mix(in srgb, var(--color-success) 14%, var(--color-main-background));
	border-radius: 50%;
	color: var(--color-success-text, var(--color-success));
}

.cn-facts-widget__lead-tile--info {
	background: var(--color-primary-element-light);
	border-radius: 50%;
	color: var(--color-primary-element-light-text, var(--color-primary-element));
}

.cn-facts-widget__lead-text {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.cn-facts-widget__lead-title {
	font-size: 15px;
}

.cn-facts-widget__lead-subtitle {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-facts-widget__action {
	align-self: flex-start;
	background: var(--color-primary-element-light);
	border: 0;
	border-radius: 16px;
	color: var(--color-primary-element-light-text, var(--color-primary-element));
	font-size: 13px;
	font-weight: 700;
	gap: 6px;
	min-height: 32px;
	padding: 0 14px;
}

.cn-facts-widget__action:hover,
.cn-facts-widget__action:focus-visible {
	background: var(--color-primary-element-light-hover, var(--color-primary-element-light));
}

.cn-facts-widget__notice {
	margin: 4px 0 0;
}

.cn-facts-widget__link {
	font-size: 14px;
	font-weight: 600;
	color: var(--color-primary-element);
	text-decoration: underline;
}

.cn-facts-widget__link--button {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-height: 0;
	margin: 0;
	padding: 0;
	border: 0;
	background: none;
	font-family: inherit;
	cursor: pointer;
}

/* `columns: 2` (board DqContact): two columns, the label above the value, a
   hairline under each fact; one column on a phone. */
.cn-facts-widget__rows--columns {
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 14px 24px;
	font-size: 15px;
}

.cn-facts-widget__rows--columns .cn-facts-widget__row {
	display: flex;
	flex-direction: column;
	gap: 3px;
	min-width: 0;
	padding-bottom: 10px;
	border-bottom: 1px solid var(--color-border);
}

.cn-facts-widget__rows--columns .cn-facts-widget__label.cn-facts-widget__label {
	font-size: 13px;
}

@media (max-width: 640px) {
	.cn-facts-widget__rows--columns {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>

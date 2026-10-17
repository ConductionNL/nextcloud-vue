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
						:class="`cn-facts-widget__lead-tile--${block.tone}`"
						aria-hidden="true">
						<CnIcon v-if="block.icon" :name="block.icon" :size="20" />
						<template v-else>{{ block.initials }}</template>
					</span>
					<span class="cn-facts-widget__lead-text">
						<strong class="cn-facts-widget__lead-title">{{ block.value }}</strong>
						<span v-if="block.subtitle" class="cn-facts-widget__lead-subtitle">{{ block.subtitle }}</span>
					</span>
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
		<component
			:is="link.to ? 'router-link' : 'a'"
			v-if="link && record"
			:to="link.to || undefined"
			:href="link.href || undefined"
			class="cn-facts-widget__link"
			data-testid="cn-facts-link">
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
	</div>
</template>

<script>
import { emit } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import Check from 'vue-material-design-icons/Check.vue'
import ContentCopy from 'vue-material-design-icons/ContentCopy.vue'
import EyeOutline from 'vue-material-design-icons/EyeOutline.vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import CnStatusBadge from '../CnStatusBadge/CnStatusBadge.vue'
import { resolveEndpointRequest } from '../../composables/useEndpointSource.js'
import { useRefLabels } from '../../composables/useRefLabels.js'
import { dispatchAction } from '../../utils/actionsDispatcher.js'
import { isBadgeVariant } from '../../utils/badgeVariants.js'
import { formatBoardDate } from '../../utils/boardDate.js'
import { parseDateValue } from '../../utils/dateVariant.js'
import { formatMoney, unwrapAppConfig } from '../../utils/formatMetric.js'
import { readPath } from '../../utils/readPath.js'
import { hasUnresolvedDeepTokens, resolveDeepTokens } from '../../utils/resolveFilterTokens.js'
import { userDisplayName } from '../../utils/userDisplayName.js'

/** Kinds of entry a `fields[]` item can be. A labelled item without `as` is a row. */
const KINDS = Object.freeze(['row', 'title', 'line', 'pill', 'lead', 'text'])

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

	components: { Check, CnIcon, CnStatusBadge, ContentCopy, EyeOutline, NcLoadingIcon },

	inject: {
		cnTranslate: { default: () => (key) => key },
		cnObjectContext: { default: null },
		cnWorkspaceContext: { default: null },
		/** The page's app config; its `currency` is the reporting currency a money value falls back to. */
		cnAppConfig: { default: null },
		/** Pre-bound action dispatcher of CnPageRenderer, for `action` / `headerAction`. */
		cnDispatchAction: { default: null },
	},

	props: {
		/**
		 * The widget configuration.
		 *
		 * - `fields` — the entries, in order. Each is `{ path, label?, as?, format?, map?, itemPath?, parts?, separator?, route?, variant?, variantMap?, colorMap?, icon?, copy?, reveal?, text?, title?, subtitle?, initialsPath?, tone? }`.
		 *   `as` is `row` (default when `label` or `icon` is set), `title`, `line`, `text` (a line in the normal ink), `lead` (an icon tile or initials beside `title` and `subtitle`) or `pill`.
		 *   A row's `format` may also be `email`, `phone` or `url` (a link) or `masked` (the last four characters; `reveal: true` adds Show). `copy: true` adds a copy button; `icon` replaces the label.
		 *   A part may be `{ text }`, a constant; a `line` or `text` entry without `path` or `parts` shows its `text`.
		 *   `resolve: { register, schema, labelField? }` on an entry or a part turns a value that is a reference (an id, or a list of ids) into the label of the referenced object (`labelField`, else `title`, then `name`): the case type or status of a task shows its name, not its uuid. The ids are fetched once per register and schema through the object store and shared by every facts widget on the page; the entry stays empty until its label is known, and when no label can be read. A resolved value works as a pill too: `map` is applied to the resolved label, and `variantMap` / `colorMap` look the tone up by the value of `resolve.toneField` on the referenced object when that is set (a status named by its `name`, coloured by its `state`), then by the resolved label, then by the stored value.
		 *   `format: 'user'` shows a Nextcloud user id as the user's display name, read once per id; the entry stays empty until the name is known.
		 * - `action` — an action drawn as a button under the facts; `headerAction` — one drawn in the card header (reported through the `header` event).
		 *   `format` is `text` (default), `date` (board short date), `date-long` (always with the year), `list` (an array joined by ", ", each item read at `itemPath`) or `currency` (a money amount in the reader's language, "€ 1.234,50": the code in `currency`, else the record's `currencyField`, else the app's reporting currency, else EUR; `decimals` defaults to 2).
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
				const value = this.entryValue(record, field, kind)
				if (value === '' && (hideEmpty || kind === 'lead')) {
					return
				}
				if (kind === 'row') {
					const last = out[out.length - 1]
					const row = { key, label: this.tr(field.label || ''), value, ...this.rowExtras(record, field, value) }
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
					const hit = colours ? keys.find((candidate) => (typeof candidate === 'string' || typeof candidate === 'number') && Object.hasOwn(colours, candidate)) : undefined
					const variant = hit !== undefined ? colours[hit] : field.variant
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
		sourceKey: {
			immediate: true,
			handler() {
				this.load()
			},
		},

		record: {
			immediate: true,
			handler() {
				this.loadLabels()
			},
		},

		headerAction: {
			immediate: true,
			handler() {
				this.emitHeader()
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
			return field.label || field.icon ? 'row' : 'line'
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
		 */
		entryValue(record, field, kind) {
			if (kind === 'lead') {
				return this.partsValue(record, field.title)
			}
			if ((kind === 'line' || kind === 'text') && Array.isArray(field.parts)) {
				return this.lineValue(record, field)
			}
			if ((kind === 'line' || kind === 'text') && !field.path && typeof field.text === 'string') {
				return this.tr(field.text)
			}
			return this.valueOf(record, field)
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
			 * @type {{link: null, note: string, action: (object|null)}} `action` is `{ label, icon, run }`.
			 */
			this.$emit('header', {
				link: null,
				note: '',
				action: view ? { ...view, run: () => this.runAction(this.content.headerAction) } : null,
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
			if (format === 'user') {
				return userDisplayName(raw)
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
	font-size: 13px;
	font-weight: 600;
	gap: 4px;
	margin-inline-start: 8px;
	min-height: 28px;
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

.cn-facts-widget__link {
	font-size: 14px;
	font-weight: 600;
	color: var(--color-primary-element);
	text-decoration: underline;
}
</style>

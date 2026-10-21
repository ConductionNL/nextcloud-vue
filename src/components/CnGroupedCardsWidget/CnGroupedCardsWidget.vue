<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-grouped-cards" data-testid="cn-grouped-cards">
		<p v-if="error"
			class="cn-grouped-cards__state"
			role="alert"
			data-testid="cn-grouped-cards-error">
			{{ errorLabel }}
			<NcButton variant="tertiary" data-testid="cn-grouped-cards-retry" @click="retry">
				{{ retryLabel }}
			</NcButton>
		</p>
		<div v-else-if="loading && groups.length === 0" class="cn-grouped-cards__loading">
			<NcLoadingIcon :size="20" :name="loadingLabel" />
		</div>
		<p v-else-if="groups.length === 0 && !extra" class="cn-grouped-cards__state" data-testid="cn-grouped-cards-empty">
			{{ emptyLabel }}
		</p>
		<div
			v-else
			class="cn-grouped-cards__grid"
			:style="{ '--cn-grouped-cards-columns': columns }">
			<section
				v-for="group in groups"
				:key="group.key"
				class="cn-grouped-cards__group"
				:aria-labelledby="group.headingId"
				data-testid="cn-grouped-cards-group">
				<header class="cn-grouped-cards__group-header">
					<h4 :id="group.headingId" class="cn-grouped-cards__group-title">
						{{ group.title }}
					</h4>
					<span v-if="group.count" class="cn-grouped-cards__count" data-testid="cn-grouped-cards-count">{{ group.count }}</span>
				</header>
				<p
					v-for="(line, lineIndex) in group.lines"
					:key="`line-${lineIndex}`"
					class="cn-grouped-cards__group-line"
					data-testid="cn-grouped-cards-group-line">
					{{ line }}
				</p>
				<ul v-if="group.items.length > 0" class="cn-grouped-cards__items">
					<li
						v-for="item in group.items"
						:key="item.key"
						class="cn-grouped-cards__item"
						data-testid="cn-grouped-cards-item">
						<span class="cn-grouped-cards__item-title">{{ item.title }}</span>
						<span v-if="item.meta" class="cn-grouped-cards__item-meta">{{ item.meta }}</span>
						<span v-if="item.flag" class="cn-grouped-cards__item-flag" data-testid="cn-grouped-cards-flag">{{ item.flag }}</span>
					</li>
				</ul>
				<p v-else class="cn-grouped-cards__group-empty">
					{{ groupEmptyLabel }}
				</p>
				<!-- `groupAction`: one action per group ("Add a task" on a phase),
				     its `@group.<path>` tokens filled from the group. -->
				<CnActionButtons
					v-if="group.action"
					class="cn-grouped-cards__group-action"
					:actions="[group.action]"
					data-testid="cn-grouped-cards-group-action" />
			</section>
			<section
				v-if="extra"
				class="cn-grouped-cards__group cn-grouped-cards__group--extra"
				:aria-labelledby="extra.headingId"
				data-testid="cn-grouped-cards-extra">
				<header class="cn-grouped-cards__group-header">
					<h4 :id="extra.headingId" class="cn-grouped-cards__group-title">
						{{ extra.title }}
					</h4>
				</header>
				<p class="cn-grouped-cards__extra-text">
					{{ extra.text }}
				</p>
			</section>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import { inject, ref } from 'vue'
import { useEndpointSource } from '../../composables/useEndpointSource.js'
import { fillTemplate, firstFilled } from '../../utils/fillTemplate.js'
import { unwrapAppConfig } from '../../utils/formatMetric.js'
import { languageMapText } from '../../utils/languageMapText.js'
import { readPath } from '../../utils/readPath.js'
import { CnActionButtons } from '../CnActionButtons/index.js'

let uid = 0

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
 * Whether a value is a language map (`{ nl: "…", en: "…" }`): an object whose
 * keys are all language codes and whose values are all strings. A nested
 * record such as `{ displayName, telephone }` is not one.
 *
 * @param {unknown} value The value.
 * @return {boolean}
 */
function isLanguageMap(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false
	}
	const entries = Object.entries(value)
	return entries.length > 0 && entries.every(([key, entry]) => /^[a-z]{2}([_-][A-Za-z]{2})?$/.test(key) && typeof entry === 'string')
}

/**
 * A row as the templates read it: a language map (`{ nl, en }`) becomes its
 * text in the user's language, and a list of plain values is joined with ", ".
 * Nested objects stay as they are, for a template that reads a deeper path.
 *
 * @param {object} row The row.
 * @return {object} A shallow copy with readable values.
 */
function readable(row) {
	if (!row || typeof row !== 'object') {
		return {}
	}
	const out = {}
	for (const [key, value] of Object.entries(row)) {
		if (Array.isArray(value)) {
			const plain = value.filter((entry) => typeof entry === 'string' || typeof entry === 'number')
			out[key] = plain.length === value.length ? plain.join(', ') : value
		} else if (isLanguageMap(value)) {
			out[key] = languageMapText(value)
		} else {
			out[key] = value
		}
	}
	return out
}

/**
 * CnGroupedCardsWidget — groups of cards side by side, read from an app
 * endpoint: a case type's phases, each with the tasks it runs, and a dashed
 * box of what is available in every phase (board DqZaaktype, Fasen en taken).
 *
 * Content-only on a card surface: the detail host or the dashboard draws the
 * titled card around it.
 */
export default {
	name: 'CnGroupedCardsWidget',

	components: { CnActionButtons, NcButton, NcLoadingIcon },

	inject: {
		/** The host app's translate function. */
		cnTranslate: { default: () => (key) => key },
		/** The page's app config map, for money tokens in a template. */
		cnAppConfig: { default: () => ({}) },
	},

	props: {
		/**
		 * The widget config: `{ endpointSource, groupsPath?, itemsKey?,
		 * groupTitle?, groupCount?, itemTitle?, itemMeta?, columns?,
		 * extraGroup?, emptyText?, groupEmptyText?, errorText? }`.
		 *
		 * - `endpointSource` (`{ url, params?, responsePath? }`) reads the payload; tokens
		 *   such as `@objectId` resolve as on every widget.
		 * - `groupsPath` (default `groups`) is the list of groups in the payload, and
		 *   `itemsKey` (default `items`) the list of cards in each group.
		 * - `groupTitle` and `itemTitle` are templates (`"Phase {order}: {name}"`,
		 *   `"{title}"`); `itemMeta` is a template or a list of templates joined
		 *   with " · ", a part whose token is empty being left out.
		 * - `groupCount` (`{ one, other }`, `{count}` filled in) draws a count pill.
		 * - `extraGroup` (`{ title, path, itemText, join? }`) closes the grid with a
		 *   dashed box whose entries, read at `path` of the payload, are one line.
		 * - `columns` (default 2) is the number of groups side by side.
		 * - `groupAction` is an action drawn at the foot of every group (as
		 *   CnActionButtons draws it), with `@group.<path>` in its strings read
		 *   from that group: `{ type: "open-form", endpoint: { url:
		 *   "/apps/x/api/phases/@group.id/steps", method: "POST" }, ... }`
		 *   adds a card to the group.
		 * - `groupLines` lists templates drawn under a group's title, each left out when it does not fill
		 *   (a list in place of a template is candidates, the first that fills).
		 * - `itemFlag` (`{ field, label }`) marks a card whose `field` is true with `label` ("Overdue").
		 * - `itemsPath` with `itemGroupField` reads the cards from one flat list of the payload instead of
		 *   from each group: a card belongs to the group whose `id` its `itemGroupField` names. Cards
		 *   naming no group gather under `ungroupedTitle`; without that title they are left out.
		 *
		 * A language map (`{ nl, en }`) reads in the user's language, and a list
		 * of plain values reads joined with ", ". Texts go through the app's
		 * translate.
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

	setup(props) {
		const objectCtxRaw = inject('cnObjectContext', null)
		const workspaceRaw = inject('cnWorkspaceContext', null)
		const appConfigRaw = inject('cnAppConfig', ref({}))
		const { data, loading, error, refetch } = useEndpointSource(
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
		uid += 1
		return { payload: data, loading, error, refetch, idPrefix: `cn-grouped-cards-${uid}` }
	},

	computed: {
		/** @return {number} The groups side by side. */
		columns() {
			const value = Number(this.content?.columns)
			return Number.isFinite(value) && value >= 1 ? Math.min(4, Math.floor(value)) : 2
		},

		/**
		 * The groups ready to draw.
		 *
		 * @return {Array<{key: string, headingId: string, title: string, count: string, items: Array<object>}>} The groups.
		 * @spec openspec/changes/grouped-cards-widget/specs/grouped-cards-widget/spec.md#requirement-a-widget-draws-groups-of-cards-from-an-endpoint
		 */
		groups() {
			const c = this.content || {}
			const listed = readPath(this.payload, c.groupsPath || 'groups')
			const list = Array.isArray(listed) ? listed.filter((group) => group && typeof group === 'object') : []
			const flat = typeof c.itemsPath === 'string' && c.itemsPath !== '' ? readPath(this.payload, c.itemsPath) : null
			const groupField = typeof c.itemGroupField === 'string' && c.itemGroupField !== '' ? c.itemGroupField : ''
			const flatItems = Array.isArray(flat) && groupField ? flat.filter((item) => item && typeof item === 'object') : null
			const groupIds = new Set(list.map((group) => String(group.id ?? '')).filter((id) => id !== ''))
			const out = list.map((raw, index) => {
				const group = readable(raw)
				const itemList = flatItems
					? flatItems.filter((item) => String(item[groupField] ?? '') !== '' && String(item[groupField]) === String(raw.id ?? ''))
					: (Array.isArray(raw[c.itemsKey || 'items']) ? raw[c.itemsKey || 'items'] : [])
				const items = this.itemsOf(itemList)
				return {
					key: String(raw.id ?? `group-${index}`),
					headingId: `${this.idPrefix}-group-${index}`,
					title: this.fill(c.groupTitle || '{name}', group),
					lines: this.linesOf(group),
					count: this.countOf(items.length),
					items,
					action: this.groupActionFor(raw, index),
				}
			})
			if (flatItems && typeof c.ungroupedTitle === 'string' && c.ungroupedTitle !== '') {
				const loose = flatItems.filter((item) => !groupIds.has(String(item[groupField] ?? '')))
				if (loose.length > 0) {
					const items = this.itemsOf(loose)
					out.push({
						key: 'ungrouped',
						headingId: `${this.idPrefix}-ungrouped`,
						title: this.translate(c.ungroupedTitle),
						lines: [],
						count: this.countOf(items.length),
						items,
					})
				}
			}
			return out
		},

		/**
		 * The closing box of entries available everywhere, or null.
		 *
		 * @return {{headingId: string, title: string, text: string}|null} The box.
		 * @spec openspec/changes/grouped-cards-widget/specs/grouped-cards-widget/spec.md#requirement-a-widget-draws-groups-of-cards-from-an-endpoint
		 */
		extra() {
			const spec = this.content?.extraGroup
			if (!spec || typeof spec !== 'object' || !spec.path) {
				return null
			}
			const list = readPath(this.payload, spec.path)
			if (!Array.isArray(list) || list.length === 0) {
				return null
			}
			const parts = list
				.map((entry) => (entry && typeof entry === 'object' ? this.fill(spec.itemText || '{label}', readable(entry)) : languageMapText(entry)))
				.filter((text) => text !== '')
			if (parts.length === 0) {
				return null
			}
			return {
				headingId: `${this.idPrefix}-extra`,
				title: this.translate(spec.title || 'Always available'),
				text: parts.join(typeof spec.join === 'string' ? spec.join : ' · '),
			}
		},

		/** @return {string} The empty text. */
		emptyLabel() {
			return this.content?.emptyText ? this.translate(this.content.emptyText) : t('nextcloud-vue', 'Nothing to show yet')
		},

		/** @return {string} The text of a group without cards. */
		groupEmptyLabel() {
			return this.content?.groupEmptyText ? this.translate(this.content.groupEmptyText) : t('nextcloud-vue', 'Nothing here yet')
		},

		/** @return {string} The error text. */
		errorLabel() {
			return this.content?.errorText ? this.translate(this.content.errorText) : t('nextcloud-vue', 'This list could not be loaded.')
		},

		/** @return {string} The retry button's text. */
		retryLabel() {
			return t('nextcloud-vue', 'Try again')
		},

		/** @return {string} The loading label. */
		loadingLabel() {
			return t('nextcloud-vue', 'Loading')
		},
	},

	methods: {
		/**
		 * The `groupAction` for one group, with every `@group.<path>` token in
		 * its strings read from that group, and its id made unique per group.
		 * Null without a `groupAction`, or for a group missing a value a token
		 * names (the action would address no group).
		 *
		 * @param {object} raw The group as read.
		 * @param {number} index The group's position.
		 * @return {object|null} The action.
		 * @spec openspec/changes/grouped-cards-group-action/specs/grouped-cards-group-action/spec.md#requirement-every-group-can-carry-an-action
		 */
		groupActionFor(raw, index) {
			const action = this.content?.groupAction
			if (!action || typeof action !== 'object') {
				return null
			}
			let missing = false
			const fill = (value) => {
				if (typeof value === 'string') {
					return value.replace(/@group\.([\w.]+)/g, (token, path) => {
						const found = readPath(raw, path)
						if (found === undefined || found === null || found === '') {
							missing = true
							return ''
						}
						return encodeURIComponent(String(found))
					})
				}
				if (Array.isArray(value)) {
					return value.map(fill)
				}
				if (value && typeof value === 'object') {
					return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, fill(inner)]))
				}
				return value
			}
			const filled = fill(action)
			return missing ? null : { ...filled, id: `${action.id || 'group-action'}-${index}` }
		},

		/**
		 * Translate a text through the host app's catalogue.
		 *
		 * @param {string} text The text.
		 * @return {string} The translated text.
		 */
		translate(text) {
			const fn = typeof this.cnTranslate === 'function' ? this.cnTranslate : (key) => key
			return fn(text)
		},

		/**
		 * Fill a template from a row, after translating it.
		 *
		 * @param {string} template The template.
		 * @param {object} row The row.
		 * @return {string} The text, '' when a token is empty.
		 */
		fill(template, row) {
			if (Array.isArray(template)) {
				return firstFilled(template, row, (text) => this.translate(text), new Date(), { config: unwrapAppConfig(this.cnAppConfig) })
			}
			if (typeof template !== 'string' || template === '') {
				return ''
			}
			return fillTemplate(this.translate(template), row, new Date(), { config: unwrapAppConfig(this.cnAppConfig) })
		},

		/**
		 * The cards ready to draw.
		 *
		 * @param {Array<object>} list The raw cards.
		 * @return {Array<{key: string, title: string, meta: string, flag: string}>}
		 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-grouped-cards-can-join-a-flat-list-and-flag-a-card
		 */
		itemsOf(list) {
			const c = this.content || {}
			return list.filter((item) => item && typeof item === 'object').map((rawItem, itemIndex) => {
				const item = readable(rawItem)
				const flag = c.itemFlag && typeof c.itemFlag === 'object' && c.itemFlag.field && rawItem[c.itemFlag.field] === true
					? this.translate(c.itemFlag.label || '')
					: ''
				return {
					key: String(rawItem.id ?? `item-${itemIndex}`),
					title: this.fill(c.itemTitle || '{title}', item),
					meta: this.metaOf(item),
					flag,
				}
			})
		},

		/**
		 * The lines under a group's title (`groupLines`), the empty ones left out.
		 *
		 * @param {object} group The group's row.
		 * @return {Array<string>}
		 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-grouped-cards-can-join-a-flat-list-and-flag-a-card
		 */
		linesOf(group) {
			const spec = this.content?.groupLines
			return (Array.isArray(spec) ? spec : []).map((line) => this.fill(line, group)).filter((text) => text !== '')
		},

		/**
		 * Read the endpoint again after a failed read.
		 *
		 * @return {void}
		 */
		retry() {
			if (typeof this.refetch === 'function') {
				this.refetch(true)
			}
		},

		/**
		 * A card's meta line: one template, or several joined with " · ", a
		 * part whose token is empty being left out with its separator.
		 *
		 * @param {object} item The card's row.
		 * @return {string} The line.
		 */
		metaOf(item) {
			const spec = this.content?.itemMeta
			const parts = Array.isArray(spec) ? spec : (typeof spec === 'string' ? [spec] : [])
			return parts.map((part) => this.fill(part, item)).filter((text) => text !== '').join(' · ')
		},

		/**
		 * The count pill of a group (`groupCount: { one, other }`).
		 *
		 * @param {number} count The number of cards.
		 * @return {string} The text, '' without `groupCount`.
		 */
		countOf(count) {
			const spec = this.content?.groupCount
			if (!spec || typeof spec !== 'object') {
				return ''
			}
			const template = count === 1 ? spec.one : spec.other
			return typeof template === 'string' && template !== '' ? this.translate(template).replace(/\{count\}/g, String(count)) : ''
		},
	},
}
</script>

<style scoped>
.cn-grouped-cards__grid {
	display: grid;
	grid-template-columns: repeat(var(--cn-grouped-cards-columns, 2), minmax(0, 1fr));
	gap: 16px;
}

@media (max-width: 700px) {
	.cn-grouped-cards__grid {
		grid-template-columns: minmax(0, 1fr);
	}
}

.cn-grouped-cards__group {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 12px 14px 14px;
	border-radius: var(--border-radius-large, 10px);
	background: var(--color-background-hover);
}

.cn-grouped-cards__group--extra {
	background: transparent;
	border: 1px dashed var(--color-border-dark);
}

.cn-grouped-cards__group-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.cn-grouped-cards__group-title {
	margin: 0;
	font-size: 15px;
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-grouped-cards__group-action {
	margin-top: 8px;
}

.cn-grouped-cards__count {
	padding: 2px 8px;
	border-radius: var(--border-radius-pill, 12px);
	background: var(--color-main-background);
	color: var(--color-text-maxcontrast);
	font-size: 12px;
	font-weight: 600;
	white-space: nowrap;
}

.cn-grouped-cards__items {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-grouped-cards__item {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 10px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 8px);
	background: var(--color-main-background);
}

.cn-grouped-cards__item-title {
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-grouped-cards__item-flag {
	color: var(--color-text-error, var(--color-error-text, var(--color-error)));
	font-size: 13px;
	font-weight: 600;
}

.cn-grouped-cards__group-line {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-grouped-cards__item-meta,
.cn-grouped-cards__extra-text,
.cn-grouped-cards__group-empty,
.cn-grouped-cards__state {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-grouped-cards__loading {
	display: flex;
	justify-content: center;
	padding: 8px 0;
}
</style>

<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-object-links-widget" data-testid="cn-object-links-widget">
		<p v-if="!loading && rows.length === 0" class="cn-object-links-widget__empty" data-testid="cn-object-links-empty">
			{{ emptyLabel }}
		</p>
		<ul v-else class="cn-object-links-widget__rows">
			<li
				v-for="row in rows"
				:key="row.id"
				class="cn-object-links-widget__row"
				:data-testid="`cn-object-links-row-${row.id}`">
				<span class="cn-object-links-widget__text">
					<span v-if="row.label" class="cn-object-links-widget__label">{{ `${row.label} ` }}</span>
					<router-link v-if="row.route" :to="row.route" class="cn-object-links-widget__target">
						{{ row.title }}
					</router-link>
					<span v-else class="cn-object-links-widget__target">{{ row.title }}</span>
				</span>
				<NcActions
					v-if="canRemove"
					:forceMenu="true"
					:disabled="busy"
					:ariaLabel="`${tr('More actions')}: ${row.title}`"
					:data-testid="`cn-object-links-menu-${row.id}`">
					<NcActionButton
						:data-testid="`cn-object-links-remove-${row.id}`"
						@click="removeLink(row)">
						{{ removeLabel }}
					</NcActionButton>
				</NcActions>
			</li>
		</ul>

		<p v-if="notice"
			class="cn-object-links-widget__notice"
			role="alert"
			data-testid="cn-object-links-notice">
			{{ notice }}
		</p>

		<div v-if="canAdd && !inTitle" class="cn-object-links-widget__footer">
			<NcButton
				variant="secondary"
				:disabled="busy"
				data-testid="cn-object-links-add"
				@click="dialogOpen = true">
				<template #icon>
					<Plus :size="16" />
				</template>
				{{ addLabel }}
			</NcButton>
		</div>

		<CnObjectLinkDialog
			v-if="dialogOpen"
			:content="content"
			:objectId="recordId"
			:save="createLink"
			@close="dialogOpen = false" />
	</div>
</template>

<script>
import { NcActionButton, NcActions, NcButton } from '@nextcloud/vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnObjectLinkDialog from './CnObjectLinkDialog.vue'
import { prefixUrl } from '../../utils/headers.js'
import { readPath } from '../../utils/readPath.js'
import { serverErrorMessage } from '../../utils/serverErrorMessage.js'
import { objectsUrl } from './objectLinks.js'

/**
 * CnObjectLinksWidget: the `object-links` widget: a record's links to other
 * records, each kept as an object of a link schema that names this record
 * (`from`) and the other one (`to`). Board PqKlant "Relaties": "Secretaris van
 * Buurtvereniging Oost", "Partner van J. de Vries".
 *
 * A row reads the link's type as words (`types[].label`) and the other
 * record's name, read from the schema its `toType` points at (`targets`), as a
 * link to that record's page. Add opens a dialog (search the targets, pick a
 * type, fill the extra `fields`) and writes the link; with `pair` it writes the
 * inverse link from the other record too, and Remove deletes both. Every write
 * goes to OpenRegister, which decides who may write; a refusal shows in the
 * server's words.
 *
 * @spec openspec/changes/contact-side-cards-generic/specs/contact-side-cards-generic/spec.md#requirement-a-records-links-to-other-records-are-listed-added-and-removed
 */
export default {
	name: 'CnObjectLinksWidget',

	components: { CnObjectLinkDialog, NcActionButton, NcActions, NcButton, Plus },

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget configuration.
		 *
		 * - `register`, `schema` (required): where the link objects live.
		 * - `from`, `to` (required): the link fields naming this record and the other one.
		 * - `fromType`, `toType`, `selfType`: the fields that name each side's kind, and this record's kind.
		 * - `typeField`, `inverseField`, `groupField`: the fields the link's type, its inverse type and
		 *   its group are written to.
		 * - `types`: `[{ value, label, inverse?, group? }]`: the choices, and how a row words its type.
		 * - `targets`: `[{ type, register, schema, titleField?, label?, route? }]`: the kinds of record a
		 *   link may point at; a row reads the name from the target its `toType` names (else the first)
		 *   and links to its `route` with `params.id`.
		 * - `pair`: write and remove the inverse link from the other record as well.
		 * - `fields`: `[{ key, label, type?: 'text'|'textarea'|'date' }]`: extra values the dialog asks.
		 * - `defaults`: values written on every new link.
		 * - `filter`: extra list filters; `limit` (default 100).
		 * - `add`: `{ label?, ariaLabel?, placement?: 'title'|'footer', dialogTitle? }`; `title` reports
		 *   the add for the card's title row on the `header` event.
		 * - `remove`: `{ label? }`: a remove in each row's menu. Omitted: no remove.
		 * - `readOnly`, `emptyText`, `duplicateText`.
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The current detail-page object. */
		objectData: {
			type: Object,
			default: null,
		},

		/** The current object id. */
		objectId: {
			type: [String, Number],
			default: '',
		},
	},

	emits: ['header'],

	data() {
		return {
			links: [],
			/** Target names, by `<type>:<id>`. */
			names: {},
			loading: false,
			busy: false,
			notice: '',
			dialogOpen: false,
		}
	},

	computed: {
		recordId() {
			return String(this.objectId || this.objectData?.id || '')
		},

		/** Whether the configuration names a link list this record can read. */
		configured() {
			const c = this.content
			return Boolean(c.register && c.schema && c.from && c.to && this.recordId)
		},

		readOnly() {
			return this.content.readOnly === true
		},

		canAdd() {
			return this.configured && !this.readOnly
		},

		canRemove() {
			return this.configured && !this.readOnly && Boolean(this.content.remove)
		},

		inTitle() {
			return this.content.add?.placement === 'title'
		},

		addLabel() {
			return this.tr(this.content.add?.label || 'Add')
		},

		removeLabel() {
			return this.tr(this.content.remove?.label || 'Remove')
		},

		emptyLabel() {
			return this.tr(this.content.emptyText || 'Nothing linked yet')
		},

		types() {
			return Array.isArray(this.content.types) ? this.content.types.filter((type) => type && type.value !== undefined) : []
		},

		targets() {
			return Array.isArray(this.content.targets) ? this.content.targets.filter((target) => target && target.register && target.schema) : []
		},

		/**
		 * The rows: the type in words and the other record's name.
		 *
		 * @return {Array<{id: string, link: object, label: string, title: string, targetId: string, route: object|null}>}
		 */
		rows() {
			const c = this.content
			return this.links.map((link) => {
				const targetId = String(readPath(link, c.to) ?? '')
				const target = this.targetOf(link)
				const type = c.typeField ? readPath(link, c.typeField) : undefined
				return {
					id: String(link.id ?? link.uuid ?? targetId),
					link,
					label: this.typeLabel(type),
					title: this.names[this.nameKey(target, targetId)] || targetId,
					targetId,
					route: target && target.route && targetId ? { name: target.route, params: { id: targetId } } : null,
				}
			})
		},

		/**
		 * The card title row's add.
		 *
		 * @return {{actions: Array<object>}}
		 */
		header() {
			if (!this.canAdd || !this.inTitle) {
				return { actions: [] }
			}
			return {
				actions: [{
					label: this.addLabel,
					ariaLabel: this.tr(this.content.add?.ariaLabel || '') || this.addLabel,
					icon: 'Plus',
					variant: 'secondary',
					run: () => {
						this.dialogOpen = true
					},
				}],
			}
		},
	},

	watch: {
		header: {
			immediate: true,
			handler(header) {
				/**
				 * @event header The card's title-row actions, `{ actions }`, for the host to draw.
				 */
				this.$emit('header', header)
			},
		},

		recordId: {
			immediate: true,
			handler() {
				this.load()
			},
		},
	},

	methods: {
		tr(text) {
			if (typeof text !== 'string' || text === '') {
				return ''
			}
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		async http() {
			const { default: axios } = await import('@nextcloud/axios')
			return axios
		},

		/**
		 * The target a link points at: the one its `toType` names, else the first.
		 *
		 * @param {object} link The link object.
		 * @return {object|null}
		 */
		targetOf(link) {
			const kind = this.content.toType ? readPath(link, this.content.toType) : undefined
			return this.targets.find((target) => target.type === kind) || this.targets[0] || null
		},

		nameKey(target, id) {
			return `${target ? target.type : ''}:${id}`
		},

		/**
		 * A link type in words: its `types[].label`, translated, else the stored value.
		 *
		 * @param {unknown} value The stored type.
		 * @return {string}
		 */
		typeLabel(value) {
			if (value === undefined || value === null || value === '') {
				return ''
			}
			const type = this.types.find((candidate) => String(candidate.value) === String(value))
			return type && type.label ? this.tr(type.label) : String(value)
		},

		/**
		 * Read this record's links, then the name of every record they point at.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/contact-side-cards-generic/specs/contact-side-cards-generic/spec.md#requirement-a-records-links-to-other-records-are-listed-added-and-removed
		 */
		async load() {
			if (!this.configured) {
				this.links = []
				return
			}
			const c = this.content
			this.loading = true
			try {
				const axios = await this.http()
				const { data } = await axios.get(prefixUrl(objectsUrl(c.register, c.schema)), {
					params: { ...(c.filter || {}), [c.from]: this.recordId, _limit: c.limit || 100 },
				})
				this.links = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])
				await this.loadNames(axios)
			} catch (e) {
				this.links = []
				this.notice = serverErrorMessage(e)
			} finally {
				this.loading = false
			}
		},

		/**
		 * Read the name of each linked record once.
		 *
		 * @param {object} axios The HTTP client.
		 * @return {Promise<void>}
		 */
		async loadNames(axios) {
			const wanted = new Map()
			for (const link of this.links) {
				const target = this.targetOf(link)
				const id = String(readPath(link, this.content.to) ?? '')
				const key = this.nameKey(target, id)
				if (target && id && !(key in this.names)) {
					wanted.set(key, { target, id })
				}
			}
			const names = { ...this.names }
			await Promise.all([...wanted.entries()].map(async ([key, { target, id }]) => {
				try {
					const { data } = await axios.get(prefixUrl(objectsUrl(target.register, target.schema, id)))
					const title = readPath(data || {}, target.titleField || 'name')
					names[key] = title ? String(title) : id
				} catch {
					names[key] = id
				}
			}))
			this.names = names
		},

		/**
		 * The fields a link object is written with, from one side to the other.
		 *
		 * @param {object} side `{ fromId, fromKind, toId, toKind, type, inverse, group, values }`.
		 * @return {object}
		 */
		linkBody(side) {
			const c = this.content
			const body = { ...(c.defaults || {}), ...(side.values || {}), [c.from]: side.fromId, [c.to]: side.toId }
			const put = (field, value) => {
				if (field && value !== undefined && value !== null && value !== '') {
					body[field] = value
				}
			}
			put(c.fromType, side.fromKind)
			put(c.toType, side.toKind)
			put(c.typeField, side.type)
			put(c.inverseField, side.inverse)
			put(c.groupField, side.group)
			return body
		},

		/**
		 * Write a new link (and with `pair` its inverse), then read the list again.
		 *
		 * @param {{target: {id: string, type?: string}, type: string, values?: object}} pick What the dialog chose.
		 * @return {Promise<{ok: boolean, message?: string}>}
		 * @spec openspec/changes/contact-side-cards-generic/specs/contact-side-cards-generic/spec.md#requirement-a-records-links-to-other-records-are-listed-added-and-removed
		 */
		async createLink(pick) {
			const c = this.content
			if (!this.canAdd || !pick || !pick.target || !pick.target.id) {
				return { ok: false, message: this.tr('This link cannot be saved here.') }
			}
			const exists = this.links.some((link) => String(readPath(link, c.to)) === String(pick.target.id)
				&& (!c.typeField || String(readPath(link, c.typeField)) === String(pick.type)))
			if (exists) {
				return { ok: false, message: this.tr(c.duplicateText || 'This link already exists.') }
			}
			const type = this.types.find((candidate) => String(candidate.value) === String(pick.type))
			const inverse = type && type.inverse !== undefined ? type.inverse : pick.type
			const group = type ? type.group : undefined
			this.busy = true
			try {
				const axios = await this.http()
				const url = prefixUrl(objectsUrl(c.register, c.schema))
				await axios.post(url, this.linkBody({
					fromId: this.recordId,
					fromKind: c.selfType,
					toId: pick.target.id,
					toKind: pick.target.type,
					type: pick.type,
					inverse,
					group,
					values: pick.values,
				}))
				if (c.pair) {
					await axios.post(url, this.linkBody({
						fromId: pick.target.id,
						fromKind: pick.target.type,
						toId: this.recordId,
						toKind: c.selfType,
						type: inverse,
						inverse: pick.type,
						group,
						values: pick.values,
					}))
				}
				await this.load()
				return { ok: true }
			} catch (e) {
				return { ok: false, message: serverErrorMessage(e) }
			} finally {
				this.busy = false
			}
		},

		/**
		 * Delete a link (and with `pair` the inverse from the other record), then read the list again.
		 *
		 * @param {object} row The row.
		 * @return {Promise<void>}
		 * @spec openspec/changes/contact-side-cards-generic/specs/contact-side-cards-generic/spec.md#requirement-a-records-links-to-other-records-are-listed-added-and-removed
		 */
		async removeLink(row) {
			const c = this.content
			if (!this.canRemove || !row) {
				return
			}
			this.busy = true
			this.notice = ''
			try {
				const axios = await this.http()
				await axios.delete(prefixUrl(objectsUrl(c.register, c.schema, row.id)))
				if (c.pair && row.targetId) {
					const type = c.typeField ? readPath(row.link, c.typeField) : undefined
					const inverse = c.inverseField ? readPath(row.link, c.inverseField) : undefined
					const known = this.types.find((candidate) => String(candidate.value) === String(type))
					const inverseType = inverse ?? (known && known.inverse !== undefined ? known.inverse : undefined)
					const { data } = await axios.get(prefixUrl(objectsUrl(c.register, c.schema)), {
						params: { [c.from]: row.targetId, [c.to]: this.recordId, _limit: 10 },
					})
					const back = (Array.isArray(data?.results) ? data.results : [])
						.filter((link) => inverseType === undefined || !c.typeField || String(readPath(link, c.typeField)) === String(inverseType))
					for (const link of back) {
						await axios.delete(prefixUrl(objectsUrl(c.register, c.schema, link.id ?? link.uuid)))
					}
				}
			} catch (e) {
				this.notice = serverErrorMessage(e)
				return
			} finally {
				this.busy = false
			}
			await this.load()
		},
	},
}
</script>

<style scoped>
.cn-object-links-widget {
	display: flex;
	flex-direction: column;
	gap: 10px;
	font-size: 14px;
}

.cn-object-links-widget__rows {
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-object-links-widget__row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	min-height: 20px;
}

.cn-object-links-widget__text {
	min-width: 0;
	overflow-wrap: anywhere;
}

.cn-object-links-widget__empty {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-object-links-widget__notice {
	margin: 0;
	color: var(--color-error-text, var(--color-error));
}

.cn-object-links-widget__footer {
	display: flex;
}
</style>

<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<CnDialog
		:name="text(config.title) || t('nextcloud-vue', 'Confirm')"
		:eyebrow="eyebrowText"
		:subtitle="text(config.subtitle)"
		width="form"
		:noClose="busy"
		data-testid="cn-action-dialog"
		@closing="close">
		<div v-if="!done" class="cn-action-dialog">
			<!-- The record the action is about: its title, a meta line, a badge. -->
			<div v-if="summary" class="cn-action-dialog__summary" data-testid="cn-action-dialog-summary">
				<span class="cn-action-dialog__summary-icon">
					<CnIcon :name="config.summary.icon || 'FolderOutline'" :size="20" />
				</span>
				<span class="cn-action-dialog__summary-text">
					<strong>{{ summary.title }}</strong>
					<span v-if="summary.meta" class="cn-action-dialog__muted">{{ summary.meta }}</span>
				</span>
				<span v-if="summary.badge" class="cn-action-dialog__badge">{{ summary.badge }}</span>
			</div>

			<!-- Facts about the record, in titled groups ("Retention under the case type"). -->
			<section v-for="(section, index) in factSections"
				:key="`facts-${index}`"
				class="cn-action-dialog__section"
				data-testid="cn-action-dialog-facts">
				<h3 v-if="section.title" class="cn-action-dialog__title">
					{{ section.title }}
				</h3>
				<dl class="cn-action-dialog__facts">
					<div v-for="fact in section.facts" :key="fact.label" class="cn-action-dialog__fact">
						<dt>{{ fact.label }}</dt>
						<dd>{{ fact.value }}</dd>
					</div>
				</dl>
			</section>

			<!-- The checklist, read from an endpoint: each item met, not met or
			     unknown. Items named in `required` decide whether the action may
			     run; the others inform. -->
			<section v-if="config.checklist" class="cn-action-dialog__section" data-testid="cn-action-dialog-checklist">
				<h3 v-if="config.checklist.title" class="cn-action-dialog__title">
					{{ text(config.checklist.title) }}
				</h3>
				<p v-if="checklistError" class="cn-action-dialog__muted" role="status">
					{{ checklistError }}
				</p>
				<ul class="cn-action-dialog__checks">
					<li v-for="item in checklist"
						:key="item.id"
						class="cn-action-dialog__check"
						:data-testid="`cn-action-dialog-check-${item.id}`"
						:data-met="String(item.met)">
						<CheckCircle v-if="item.met === true" :size="20" class="cn-action-dialog__check-icon cn-action-dialog__check-icon--met" />
						<HelpCircleOutline v-else-if="item.met === null" :size="20" class="cn-action-dialog__check-icon" />
						<CircleOutline v-else :size="20" class="cn-action-dialog__check-icon" />
						<strong class="cn-action-dialog__check-label">{{ item.label }}</strong>
						<span v-if="item.detail" class="cn-action-dialog__muted">{{ item.detail }}</span>
					</li>
				</ul>
			</section>

			<!-- Fields the action asks for, sent beside the reason. -->
			<div v-for="field in fields"
				:key="field.field"
				class="cn-action-dialog__field"
				:data-testid="`cn-action-dialog-field-${field.field}`">
				<!-- A checkbox field: a tinted box, the label filled from the
				     record, a hint under it (DqArchiveren "Sanne de Vries laten
				     weten..."). -->
				<NcCheckboxRadioSwitch v-if="field.type === 'checkbox'"
					class="cn-action-dialog__checkbox"
					:modelValue="checkboxValue(field)"
					type="checkbox"
					@update:modelValue="(on) => setChecked(field.field, on)">
					<span class="cn-action-dialog__checkbox-text">
						<strong class="cn-action-dialog__checkbox-label">{{ fill(field.label) || field.field }}</strong>
						<span v-if="field.hint" class="cn-action-dialog__muted">{{ fill(field.hint) }}</span>
					</span>
				</NcCheckboxRadioSwitch>
				<!-- A search field: records of `source` found as the reader
				     types (DqZaakKoppelen "Zaak koppelen"). -->
				<CnSearchSelect v-else-if="field.type === 'search'"
					:modelValue="values[field.field] || null"
					:options="searchOptions[field.field] || []"
					:inputLabel="fill(field.label) || field.field"
					:labelOutside="true"
					:loading="searching === field.field"
					:filterable="false"
					:placeholder="fill(field.placeholder)"
					@search="(typed) => onSearch(field, typed)"
					@update:modelValue="(value) => setValue(field.field, value && typeof value === 'object' ? value.id : value)" />
				<!-- An optional select or text field: its label above the control,
				     "(optional)" in grey after it (DqUwWachtrij "Sjabloon (niet
				     verplicht)"). -->
				<CnFormField v-if="labelsOutside(field)"
					:controlId="controlId(field)"
					:text="fill(field.label) || field.field"
					:optional="true" />
				<NcSelect v-if="field.type === 'select'"
					:modelValue="selectedOption(field)"
					:options="optionsOf(field)"
					:inputId="controlId(field)"
					:inputLabel="fill(field.label) || field.field"
					:labelOutside="labelsOutside(field)"
					:placeholder="fill(field.placeholder)"
					:clearable="field.required === false"
					@update:modelValue="(option) => pick(field, option)" />
				<NcTextField v-else-if="field.type === 'secret'"
					:modelValue="values[field.field] || ''"
					type="password"
					autocomplete="new-password"
					:label="text(field.label) || field.field"
					:placeholder="secretStored(field) ? t('nextcloud-vue', 'Stored. Type a new value to replace it.') : ''"
					@update:modelValue="(value) => setValue(field.field, value)" />
				<NcTextField v-else-if="field.type !== 'checkbox' && field.type !== 'search'"
					:id="controlId(field)"
					:modelValue="values[field.field] || ''"
					:type="field.type === 'datetime' ? 'datetime-local' : (field.type === 'date' ? 'date' : 'text')"
					:label="fill(field.label) || field.field"
					:labelOutside="labelsOutside(field)"
					@update:modelValue="(value) => setValue(field.field, value)" />
				<span v-if="field.hint && field.type !== 'checkbox'" class="cn-action-dialog__muted">{{ fill(field.hint) }}</span>
			</div>

			<div v-if="config.reason" class="cn-action-dialog__field">
				<NcTextArea
					:id="reasonId"
					v-model="reason"
					:label="reasonLabel"
					:labelOutside="false"
					:rows="config.reason.rows || 2"
					resize="vertical"
					data-testid="cn-action-dialog-reason" />
				<span v-if="config.reason.hint" class="cn-action-dialog__muted">{{ text(config.reason.hint) }}</span>
			</div>

			<NcNoteCard v-if="config.note"
				:type="noteType"
				:heading="text(config.note.title)"
				data-testid="cn-action-dialog-note">
				<template v-if="config.note.icon" #icon>
					<CnIcon :name="config.note.icon" :size="20" />
				</template>
				{{ text(config.note.text) }}
			</NcNoteCard>

			<p v-if="refusal"
				class="cn-action-dialog__error"
				role="alert"
				data-testid="cn-action-dialog-refusal">
				{{ refusal }}
			</p>
		</div>

		<p v-else role="status" data-testid="cn-action-dialog-done">
			{{ text(config.doneText) || t('nextcloud-vue', 'Done') }}
		</p>

		<template #actions>
			<NcButton :disabled="busy" data-testid="cn-action-dialog-cancel" @click="close">
				{{ done ? t('nextcloud-vue', 'Close') : t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton v-if="!done"
				variant="primary"
				:disabled="!canConfirm"
				data-testid="cn-action-dialog-confirm"
				@click="confirm">
				<template v-if="confirmConfig.icon" #icon>
					<CnIcon :name="confirmConfig.icon" :size="20" />
				</template>
				{{ text(confirmConfig.label) || t('nextcloud-vue', 'Confirm') }}
			</NcButton>
		</template>
	</CnDialog>
</template>

<script>
import axios from '@nextcloud/axios'
import { emit } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcCheckboxRadioSwitch, NcNoteCard, NcSelect, NcTextArea, NcTextField } from '@nextcloud/vue'
import CheckCircle from 'vue-material-design-icons/CheckCircle.vue'
import CircleOutline from 'vue-material-design-icons/CircleOutline.vue'
import HelpCircleOutline from 'vue-material-design-icons/HelpCircleOutline.vue'
import CnFormField from '../CnFormField/CnFormField.vue'
import { fetchEndpointSource, interpolateUrlTokens } from '../../composables/useEndpointSource.js'
import { fillTemplate } from '../../utils/fillTemplate.js'
import { readPath } from '../../utils/readPath.js'
import { CnDialog } from '../CnDialog/index.js'
import { CnIcon } from '../CnIcon/index.js'
import { CnSearchSelect } from '../CnSearchSelect/index.js'

/** How long typing rests before a search field searches, in ms. */
const SEARCH_DELAY = 250

/** The page refresh channel the built-in widgets listen on. */
const PAGE_REFRESH = 'cn:page:refresh'

/** Gives each dialog's reason field its own id. */
let reasonSeq = 0

/**
 * CnActionDialog — the generic "summary, checklist, reason, confirm" dialog
 * for an act on a record, configured from the manifest (an `open-modal`
 * action's props), so an app does not hand-build each one. dossiq's archive
 * dialog (board DqArchiveren) is the first: the case, what its case type
 * keeps, a readiness checklist read from an endpoint, a reason, a read-only
 * note and Archive it.
 *
 * `config`:
 * - `title`, `subtitle`, `doneText`: texts, through the host translate;
 *   `eyebrow` a template filled from the record ("Close off · {identifier}").
 * - `summary`: `{ source?, title, meta?, badge?, icon? }`: templates filled from
 *   the record (`source` an endpointSource to read it from, else `object`).
 * - `facts`: `[{ title?, items: [{ label, value }] }]`, `value` a template.
 * - `checklist`: `{ title?, source, itemsPath?, labels?, required? }`: items
 *   `{ id, met, label?, detail? }` read from `source`; `labels[id]` gives an
 *   item's `{ label, detail?, unmetDetail? }`; the ids in `required` must be
 *   met before the action can run. `met: null` reads as unknown.
 * - `permission`: `{ source, listPath?, match?, allowedPath, reasonPath? }`:
 *   the action runs only while `allowedPath` reads true; `reasonPath` says
 *   why not. With `listPath` the paths read the entry of that list whose
 *   fields equal `match` (`{ act: "archive" }`).
 * - `fields`: `[{ field, type?: "text"|"date"|"datetime"|"select"|"checkbox", label?,
 *   required?, options?: [{ value, label, fills? }], hint?, default? }]`: inputs
 *   sent beside the reason, required by default; a select option's `fills`
 *   sets other fields that are still empty. A `checkbox` is sent as a boolean,
 *   starts at `default` (false), fills its `label` and `hint` from the record,
 *   and is optional unless `required: true` (then it must be ticked). A
 *   `search` field finds records of `source: { register, schema }` as the
 *   reader types, shows each as `optionLabel` with `optionSecondary` under
 *   it (templates on the found record), leaves the record in hand out with
 *   `excludeSelf`, and sends the chosen record's id. Every field's `label`,
 *   `hint` and `placeholder` (search and select) are templates filled from the record.
 *   An optional select or text field (`required: false`) draws its label above
 *   the control with "(optional)" after it.
 * - `reason`: `{ label?, hint?, required?, field?, rows? }`: a text area; required by
 *   default; sent as `field` (default `reason`). `rows` is its height in lines
 *   (default 2; board DqBesluit draws 4).
 * - `note`: `{ variant?, title?, text, icon? }`: a read-only note; `icon` an
 *   icon name in place of the variant's own ("LockOutline").
 * - `confirm`: `{ label, icon?, request?: { method?, url, body? }, action? }`.
 *   `request` posts itself (`body` templates filled with the record and
 *   `{reason}`); `action` dispatches a manifest action through the page.
 *
 * Tokens (`@objectId`, `@object.<field>`) resolve in every url.
 */
export default {
	name: 'CnActionDialog',

	components: { CheckCircle, CircleOutline, CnDialog, CnFormField, CnIcon, CnSearchSelect, HelpCircleOutline, NcButton, NcCheckboxRadioSwitch, NcNoteCard, NcSelect, NcTextArea, NcTextField },

	inject: {
		/** The host app's translate (CnAppRoot `cnTranslate`). */
		cnTranslate: { default: () => (key) => key },
		/** The page's pre-bound action dispatcher (CnPageRenderer), for `confirm.action`. */
		cnDispatchAction: { default: null },
	},

	props: {
		/**
		 * The dialog's configuration (see the component docs).
		 *
		 * @type {object}
		 */
		config: {
			type: Object,
			default: () => ({}),
		},

		/** The record's id, for the `@objectId` token. */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/**
		 * The record, when the host has it: the summary and facts read it.
		 *
		 * @type {object|null}
		 */
		object: {
			type: Object,
			default: null,
		},
	},

	emits: ['close', 'done'],

	data() {
		return {
			record: this.object,
			items: [],
			checklistError: '',
			allowed: true,
			reason: '',
			values: {},
			/** A search field's found options, by field name. */
			searchOptions: {},
			/** The search field whose search runs, or ''. */
			searching: '',
			busy: false,
			refusal: '',
			done: false,
			reasonId: `cn-action-dialog-reason-${++reasonSeq}`,
			fieldIdPrefix: `cn-action-dialog-field-${reasonSeq}`,
		}
	},

	computed: {
		/** @return {object} The token context. */
		tokenCtx() {
			return { objectId: this.recordId, object: this.record || {} }
		},

		/**
		 * The record's id: `objectId`, or the route's `id` when the prop is
		 * empty or a token the opener could not resolve.
		 *
		 * @return {string|number}
		 */
		recordId() {
			const given = this.objectId
			if (given !== '' && given !== null && given !== undefined && !String(given).startsWith('@')) {
				return given
			}
			return (this.$route && this.$route.params && this.$route.params.id) || ''
		},

		/** @return {object} The confirm config. */
		confirmConfig() {
			return this.config.confirm && typeof this.config.confirm === 'object' ? this.config.confirm : {}
		},

		/**
		 * The summary row, or null without one or before the record is known.
		 *
		 * @spec openspec/changes/action-dialog/specs/action-dialog/spec.md#requirement-a-manifest-configures-an-action-dialog
		 * @return {{title: string, meta: string, badge: string}|null}
		 */
		summary() {
			const def = this.config.summary
			if (!def || !this.record) {
				return null
			}
			const title = this.fill(def.title)
			return title ? { title, meta: this.fill(def.meta), badge: this.fill(def.badge) } : null
		},

		/** @return {Array<{title: string, facts: Array<{label: string, value: string}>}>} The fact groups. */
		factSections() {
			if (!Array.isArray(this.config.facts) || !this.record) {
				return []
			}
			const empty = t('nextcloud-vue', 'Not set')
			return this.config.facts.map((section) => ({
				title: this.text(section.title),
				facts: (Array.isArray(section.items) ? section.items : []).map((fact) => ({ label: this.text(fact.label), value: this.fill(fact.value) || empty })),
			}))
		},

		/**
		 * The checklist rows: label and detail from `labels` by id, else the item's own.
		 *
		 * @spec openspec/changes/action-dialog/specs/action-dialog/spec.md#requirement-a-manifest-configures-an-action-dialog
		 * @return {Array<{id: string, met: (boolean|null), label: string, detail: string}>}
		 */
		checklist() {
			const labels = (this.config.checklist && this.config.checklist.labels) || {}
			return this.items.map((item) => {
				const met = item.met === null || item.met === undefined ? null : item.met === true
				const own = labels[item.id] || {}
				const detail = met === false && own.unmetDetail ? own.unmetDetail : (own.detail || item.detail || '')
				return {
					id: String(item.id),
					met,
					label: this.fill(own.label || item.label || String(item.id), item),
					detail: met === null && !item.detail ? t('nextcloud-vue', 'Could not be read') : this.fill(detail, item),
				}
			})
		},

		/** @return {boolean} Whether every required item is met. */
		requiredMet() {
			const required = (this.config.checklist && Array.isArray(this.config.checklist.required)) ? this.config.checklist.required.map(String) : []
			return required.every((id) => this.items.some((item) => String(item.id) === id && item.met === true))
		},

		/** @return {boolean} Whether a reason is asked and needed. */
		reasonNeeded() {
			return Boolean(this.config.reason) && this.config.reason.required !== false
		},

		/** @return {string} The reason field's label. */
		reasonLabel() {
			return this.text(this.config.reason && this.config.reason.label) || t('nextcloud-vue', 'Reason')
		},

		/** @return {string} The note's NcNoteCard type. */
		noteType() {
			const variant = this.config.note && this.config.note.variant
			return ['info', 'warning', 'error', 'success'].includes(variant) ? variant : 'info'
		},

		/**
		 * Whether the action may run: allowed, required items met, a reason
		 * when one is needed, and nothing in flight.
		 *
		 * @spec openspec/changes/action-dialog/specs/action-dialog/spec.md#requirement-a-manifest-configures-an-action-dialog
		 * @return {boolean}
		 */
		canConfirm() {
			return !this.busy && this.allowed && this.requiredMet && this.fieldsFilled && (!this.reasonNeeded || this.reason.trim() !== '')
		},

		/** @return {string} The eyebrow, filled from the record once it is known. */
		eyebrowText() {
			return this.record ? this.fill(this.config.eyebrow) || this.text(this.config.eyebrow) : this.text(this.config.eyebrow)
		},

		/**
		 * The value of every field as sent: a checkbox as a boolean, the
		 * others as entered ('' when empty).
		 *
		 * @return {object} Values by field name.
		 */
		fieldValues() {
			const out = { ...this.values }
			for (const field of this.fields) {
				out[field.field] = field.type === 'checkbox' ? this.checkboxValue(field) : (this.values[field.field] ?? '')
			}
			return out
		},

		/** @return {Array<object>} The fields with a name. */
		fields() {
			return (Array.isArray(this.config.fields) ? this.config.fields : []).filter((f) => f && f.field)
		},

		/**
		 * Whether every required field has a value.
		 *
		 * @spec openspec/changes/action-dialog-fields-and-acts/specs/action-dialog/spec.md#requirement-an-action-dialog-asks-for-fields-and-reads-a-permission-from-a-list
		 * @return {boolean}
		 */
		fieldsFilled() {
			return this.fields.every((f) => {
				if (f.type === 'checkbox') {
					return f.required !== true || this.checkboxValue(f)
				}
				return f.required === false || this.secretStored(f) || String(this.values[f.field] ?? '').trim() !== ''
			})
		},
	},

	watch: {
		record: {
			handler() {
				this.startValues()
			},

			immediate: true,
		},
	},

	async mounted() {
		await Promise.all([this.loadRecord(), this.loadChecklist(), this.loadPermission()])
	},

	beforeUnmount() {
		clearTimeout(this.searchTimer)
	},

	methods: {
		/**
		 * Whether a field's label sits above its control with "(optional)" after
		 * it: a select or a text field the action does not require.
		 *
		 * @spec openspec/changes/action-dialog-optional-fields/specs/action-dialog/spec.md#requirement-an-optional-field-says-so-beside-its-label
		 * @param {object} field The field.
		 * @return {boolean}
		 */
		labelsOutside(field) {
			return field.required === false && !['checkbox', 'search', 'secret'].includes(field.type)
		},

		/**
		 * The id of a field's control, which its outside label points at.
		 *
		 * @param {object} field The field.
		 * @return {string}
		 */
		controlId(field) {
			return `${this.fieldIdPrefix}-${field.field}`
		},

		t,

		/**
		 * A config text through the host translate, '' for anything else.
		 *
		 * @param {unknown} value The text.
		 * @return {string}
		 */
		/**
		 * Search a search field's records once typing rests.
		 *
		 * @param {object} field The field.
		 * @param {string} typed What the reader typed.
		 * @return {void}
		 * @spec openspec/changes/action-dialog-search-field/specs/action-dialog-search-field/spec.md#requirement-an-action-dialog-field-can-search-records
		 */
		onSearch(field, typed) {
			clearTimeout(this.searchTimer)
			this.searchTimer = setTimeout(() => this.searchRecords(field, String(typed || '').trim()), SEARCH_DELAY)
		},

		/**
		 * Read the records of a search field's `source` that match the term.
		 *
		 * @param {object} field The field.
		 * @param {string} term The term.
		 * @return {Promise<void>}
		 */
		async searchRecords(field, term) {
			const source = field.source || {}
			if (!term || !source.register || !source.schema) {
				this.searchOptions = { ...this.searchOptions, [field.field]: [] }
				return
			}
			this.searching = field.field
			try {
				const url = generateUrl(`/apps/openregister/api/objects/${encodeURIComponent(source.register)}/${encodeURIComponent(source.schema)}`)
				const { data } = await axios.get(url, { params: { _search: term, _limit: 10 } })
				const rows = Array.isArray(data) ? data : (data && Array.isArray(data.results) ? data.results : [])
				const self = String(this.recordId || '')
				const options = rows
					.map((row) => ({ row, id: String(row.id || (row['@self'] && row['@self'].id) || '') }))
					.filter(({ id }) => id !== '' && !(field.excludeSelf && id === self))
					.map(({ row, id }) => {
						const option = { id, label: this.fill(field.optionLabel || '{title}', row) || id }
						const secondary = this.fill(field.optionSecondary, row)
						return secondary ? { ...option, secondary } : option
					})
				this.searchOptions = { ...this.searchOptions, [field.field]: options }
			} catch {
				this.searchOptions = { ...this.searchOptions, [field.field]: [] }
			} finally {
				this.searching = ''
			}
		},

		/**
		 * A checkbox field's state: what was ticked, else its `default`.
		 *
		 * @param {object} field The field.
		 * @return {boolean}
		 * @spec openspec/changes/action-dialog-checkbox-field/specs/action-dialog-checkbox-field/spec.md#requirement-an-action-dialog-field-can-be-a-checkbox
		 */
		checkboxValue(field) {
			return field.field in this.values ? this.values[field.field] === true : field.default === true
		},

		/**
		 * Tick or untick a checkbox field.
		 *
		 * @param {string} name The field.
		 * @param {boolean} on Ticked.
		 * @return {void}
		 */
		setChecked(name, on) {
			this.values = { ...this.values, [name]: on === true }
		},

		text(value) {
			return typeof value === 'string' && value !== '' ? this.cnTranslate(value) : ''
		},

		/**
		 * A template filled from a row (the record by default), translated first.
		 *
		 * @param {unknown} template The template.
		 * @param {object} [row] The row.
		 * @return {string}
		 */
		fill(template, row) {
			if (typeof template !== 'string' || template === '') {
				return ''
			}
			return fillTemplate(this.cnTranslate(template), row || this.record || {}).trim()
		},

		/**
		 * Read an endpoint, fresh.
		 *
		 * @param {object} source An endpointSource block.
		 * @return {Promise<unknown>}
		 */
		read(source) {
			return fetchEndpointSource(source, this.tokenCtx, { fresh: true })
		},

		/** @return {Promise<void>} */
		async loadRecord() {
			const source = this.config.summary && this.config.summary.source
			if (!source || !source.url) {
				return
			}
			try {
				const data = await this.read(source)
				this.record = data && typeof data === 'object' ? data : this.record
			} catch {
				// The summary stays empty; the checklist and the action still work.
			}
		},

		/** @return {Promise<void>} */
		async loadChecklist() {
			const def = this.config.checklist
			if (!def || !def.source || !def.source.url) {
				return
			}
			try {
				const data = await this.read(def.source)
				const list = def.itemsPath ? readPath(data, def.itemsPath) : data
				this.items = Array.isArray(list) ? list.filter((item) => item && item.id !== undefined) : []
			} catch {
				this.items = []
				this.checklistError = t('nextcloud-vue', 'Whether this is ready could not be read.')
			}
		},

		/**
		 * The entry of a list whose fields equal `match`, or null.
		 *
		 * @param {unknown} list The list.
		 * @param {object} [match] The fields to match.
		 * @return {object|null}
		 */
		matchIn(list, match) {
			const wanted = Object.entries(match || {})
			return (Array.isArray(list) ? list : []).find((entry) => entry && wanted.every(([key, value]) => String(entry[key]) === String(value))) || null
		},

		/**
		 * A select field's options, labels translated.
		 *
		 * @param {object} field The field.
		 * @return {Array<{id: string, label: string, fills?: object}>}
		 */
		optionsOf(field) {
			return (Array.isArray(field.options) ? field.options : []).map((o) => ({ id: String(o.value), label: this.text(o.label) || String(o.value), fills: o.fills }))
		},

		/**
		 * A select field's chosen option.
		 *
		 * @param {object} field The field.
		 * @return {object|null}
		 */
		selectedOption(field) {
			return this.optionsOf(field).find((o) => o.id === String(this.values[field.field] ?? '')) || null
		},

		/**
		 * Set a field's value.
		 *
		 * @param {string} name The field.
		 * @param {unknown} value The value.
		 */
		setValue(name, value) {
			this.values = { ...this.values, [name]: value === null || value === undefined ? '' : String(value) }
		},

		/**
		 * Choose a select option; its `fills` set the fields still empty.
		 *
		 * @param {object} field The select field.
		 * @param {{id: string, fills?: object}|null} option The option.
		 */
		pick(field, option) {
			this.setValue(field.field, option ? option.id : '')
			for (const [name, value] of Object.entries((option && option.fills) || {})) {
				if (String(this.values[name] ?? '').trim() === '') {
					this.setValue(name, this.text(value) || value)
				}
			}
		},

		/** @return {Promise<void>} */
		async loadPermission() {
			const def = this.config.permission
			if (!def || !def.source || !def.source.url) {
				return
			}
			try {
				const data = await this.read(def.source)
				const entry = def.listPath ? this.matchIn(readPath(data, def.listPath), def.match) : data
				this.allowed = readPath(entry, def.allowedPath || 'allowed') === true
				this.refusal = this.allowed || !def.reasonPath ? '' : String(readPath(entry, def.reasonPath) || '')
			} catch {
				this.allowed = false
			}
		},

		/**
		 * Run the action once: post `confirm.request`, or dispatch
		 * `confirm.action`, then show the done text and refresh the page.
		 *
		 * @spec openspec/changes/action-dialog/specs/action-dialog/spec.md#requirement-a-manifest-configures-an-action-dialog
		 * @return {Promise<void>}
		 */
		async confirm() {
			if (!this.canConfirm) {
				return
			}
			this.busy = true
			this.refusal = ''
			const reason = this.reason.trim()
			try {
				const request = this.confirmConfig.request
				if (request && request.url) {
					const url = interpolateUrlTokens(request.url, this.tokenCtx)
					const body = {}
					for (const [key, value] of Object.entries(request.body || {})) {
						body[key] = typeof value === 'string' ? fillTemplate(value, { ...(this.record || {}), reason }) : value
					}
					if (this.config.reason) {
						body[this.config.reason.field || 'reason'] = reason
					}
					const values = { ...this.fieldValues }
					for (const field of this.fields) {
						if (field.type === 'secret' && String(this.values[field.field] ?? '') === '') {
							delete values[field.field]
						}
					}
					Object.assign(body, values)
					const method = String(request.method || 'POST').toLowerCase()
					await axios[['post', 'put', 'patch', 'delete'].includes(method) ? method : 'post'](/^https?:\/\//i.test(url) ? url : generateUrl(url), body)
				} else if (this.confirmConfig.action && typeof this.cnDispatchAction === 'function') {
					await this.cnDispatchAction({ ...this.confirmConfig.action, args: [...(this.confirmConfig.action.args || []), { ...this.fieldValues, reason }] })
				}
				this.done = true
				emit(PAGE_REFRESH, {})
				/** @event done The action ran. Payload: the field values and `reason`. */
				this.$emit('done', { ...this.fieldValues, reason })
			} catch (failure) {
				const data = failure && failure.response && failure.response.data
				this.refusal = String((data && (data.message || data.error)) || t('nextcloud-vue', 'The action could not be completed.'))
			} finally {
				this.busy = false
			}
		},

		/**
		 * Start each field with `valuePath` from the record, unless it was
		 * already edited.
		 *
		 * @spec openspec/changes/action-dialog-secret-field/specs/action-dialog/spec.md#requirement-a-field-can-start-from-the-record-and-a-secret-is-write-only
		 * @return {void}
		 */
		startValues() {
			if (!this.record) {
				return
			}
			const values = { ...this.values }
			for (const field of this.fields) {
				if (field.valuePath && field.type !== 'secret' && !(field.field in values)) {
					const value = readPath(this.record, field.valuePath)
					if (value !== null && value !== undefined) {
						values[field.field] = String(value)
					}
				}
			}
			this.values = values
		},

		/**
		 * Whether a secret field has a value stored: `storedPath` reads true on the record.
		 *
		 * @param {object} field The field.
		 * @return {boolean}
		 */
		secretStored(field) {
			return field.type === 'secret' && Boolean(field.storedPath && this.record && readPath(this.record, field.storedPath))
		},

		/** Close the dialog, unless the action is running. */
		close() {
			if (this.busy) {
				return
			}
			/** @event close The dialog was closed. */
			this.$emit('close')
		},
	},
}
</script>

<style scoped>
.cn-action-dialog {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.cn-action-dialog__summary {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 14px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 10px);
}

/* The record's icon on a tinted tile (DqArchiveren). */
.cn-action-dialog__summary-icon {
	display: flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 8px;
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text);
}

.cn-action-dialog__summary-text strong {
	font-size: 15px;
	font-weight: 600;
}

.cn-action-dialog__summary-text .cn-action-dialog__muted {
	font-size: 13px;
}

.cn-action-dialog__summary-text {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	min-width: 0;
}

.cn-action-dialog__badge {
	padding: 3px 10px;
	border-radius: 12px;
	background: var(--color-background-dark);
	font-size: 13px;
	font-weight: 600;
	white-space: nowrap;
}

.cn-action-dialog__title {
	margin: 0 0 8px;
	font-size: 14px;
	font-weight: 600;
}

/* Facts in columns of at least 200px, each a label over its value above a
   hairline (DqArchiveren "Bewaring volgens het zaaktype"). */
.cn-action-dialog__facts {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 12px 24px;
	margin: 0;
}

.cn-action-dialog__fact {
	display: flex;
	flex-direction: column;
	gap: 3px;
	padding-bottom: 10px;
	border-bottom: 1px solid var(--color-border);
}

/* The server draws every dt as a 130px right-aligned inline block and pads
   dt and dd 12px; a fact is a label over its value. */
.cn-action-dialog__facts dt,
.cn-action-dialog__facts dd {
	display: block;
	width: auto;
	white-space: normal;
	text-align: start;
}

.cn-action-dialog__facts dt {
	margin: 0;
	padding: 0;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-action-dialog__facts dd {
	margin: 0;
	padding: 0;
	font-size: 15px;
	font-weight: 500;
}

/* Checklist rows divided by hairlines, the detail at the row's end
   (DqArchiveren "Klaar om te archiveren"). */
.cn-action-dialog__checks {
	display: flex;
	flex-direction: column;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-action-dialog__check {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 2px 12px;
	padding: 10px 0;
	border-top: 1px solid var(--color-border);
	font-size: 15px;
}

.cn-action-dialog__check-label {
	flex: 1 1 auto;
	font-weight: 600;
}

.cn-action-dialog__check-icon {
	color: var(--color-text-maxcontrast);
}

.cn-action-dialog__check-icon--met {
	color: var(--color-success-text, var(--color-success));
}

.cn-action-dialog__muted {
	color: var(--color-text-maxcontrast);
	font-size: 14px;
}

/* A checkbox field is a tinted box with a 2px edge, its label bold and its
   hint under it (DqArchiveren). */
.cn-action-dialog__checkbox {
	padding: 12px 14px;
	border: 2px solid var(--color-primary-element);
	border-radius: var(--border-radius-element, 8px);
	background: var(--color-primary-element-light);
}

.cn-action-dialog__checkbox-text {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-action-dialog__checkbox-label {
	font-size: 15px;
	font-weight: 600;
}

.cn-action-dialog__checkbox .cn-action-dialog__muted {
	font-size: 13px;
}

.cn-action-dialog__field {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-action-dialog__error {
	margin: 0;
	color: var(--color-error-text, var(--color-error));
}
</style>

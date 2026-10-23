<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<CnDialog
		:name="text(config.title) || t('nextcloud-vue', 'Assign')"
		:eyebrow="fill(config.eyebrow)"
		:subtitle="text(config.subtitle)"
		width="form"
		:noClose="busy"
		data-testid="cn-assign-dialog"
		@closing="close">
		<div v-if="!done" class="cn-assign-dialog">
			<div class="cn-assign-dialog__field">
				<CnSearchSelect
					:modelValue="picked ? picked.id : null"
					:inputId="assigneeId"
					:inputLabel="assigneeLabel"
					:labelOutside="false"
					:options="shownOptions"
					:loading="searching"
					:filterable="false"
					:placeholder="text(assigneeConfig.placeholder)"
					data-testid="cn-assign-dialog-assignee"
					@search="onSearch"
					@update:modelValue="onPick" />
				<span v-if="assigneeHint" class="cn-assign-dialog__hint">{{ assigneeHint }}</span>
			</div>

			<div v-if="config.note !== false" class="cn-assign-dialog__field">
				<NcTextArea
					:id="noteId"
					v-model="note"
					:label="noteLabel"
					:labelOutside="false"
					:rows="noteConfig.rows || 3"
					resize="vertical"
					data-testid="cn-assign-dialog-note" />
				<span v-if="noteConfig.hint" class="cn-assign-dialog__hint">{{ text(noteConfig.hint) }}</span>
			</div>

			<div v-for="toggle in toggles"
				:key="toggle.field"
				class="cn-assign-dialog__toggle"
				:class="{ 'cn-assign-dialog__toggle--on': flags[toggle.field] }"
				:data-testid="`cn-assign-dialog-toggle-${toggle.field}`">
				<NcCheckboxRadioSwitch :modelValue="flags[toggle.field] === true" @update:modelValue="flags[toggle.field] = $event">
					<span class="cn-assign-dialog__toggle-title">{{ fill(toggle.label) }}</span>
				</NcCheckboxRadioSwitch>
				<span v-if="toggle.note" class="cn-assign-dialog__hint cn-assign-dialog__toggle-note">{{ fill(toggle.note) || text(toggle.noteFallback) }}</span>
			</div>

			<p v-if="refusal"
				class="cn-assign-dialog__error"
				role="alert"
				data-testid="cn-assign-dialog-refusal">
				{{ refusal }}
			</p>
		</div>

		<p v-else role="status" data-testid="cn-assign-dialog-done">
			{{ text(config.doneText) || t('nextcloud-vue', 'Done') }}
		</p>

		<template #actions>
			<NcButton :disabled="busy" data-testid="cn-assign-dialog-cancel" @click="close">
				{{ done ? t('nextcloud-vue', 'Close') : t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton v-if="!done"
				variant="primary"
				:disabled="!canConfirm"
				data-testid="cn-assign-dialog-confirm"
				@click="confirm">
				<template #icon>
					<CnIcon :name="confirmConfig.icon || 'SwapHorizontal'" :size="20" />
				</template>
				{{ text(confirmConfig.label) || t('nextcloud-vue', 'Assign') }}
			</NcButton>
		</template>
	</CnDialog>
</template>

<script>
import axios from '@nextcloud/axios'
import { emit } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcCheckboxRadioSwitch, NcTextArea } from '@nextcloud/vue'
import { fetchEndpointSource, interpolateUrlTokens } from '../../composables/useEndpointSource.js'
import { fillTemplate } from '../../utils/fillTemplate.js'
import { readPath } from '../../utils/readPath.js'
import { searchNextcloudGroups, searchNextcloudUsers } from '../../utils/userAutocomplete.js'
import { CnDialog } from '../CnDialog/index.js'
import { CnIcon } from '../CnIcon/index.js'
import { CnSearchSelect } from '../CnSearchSelect/index.js'

/** The page refresh channel the built-in widgets listen on. */
const PAGE_REFRESH = 'cn:page:refresh'

/** How long typing rests before a search runs, in ms. */
const SEARCH_DELAY = 250

/** Gives each dialog's fields their own ids. */
let fieldSeq = 0

/**
 * The found rows, with what was typed offered as an assignee of its own when
 * no row carries that id or name: where sharing is restricted the search
 * answers nothing, and an endpoint may still take the name.
 *
 * @param {Array<object>} found The rows found.
 * @param {string} typed What was typed.
 * @param {string} label The typed row's label.
 * @return {Array<object>} The rows.
 */
export function withTypedAssignee(found, typed, label) {
	const lower = typed.toLowerCase()
	if (typed === '' || found.some((row) => String(row.id) === typed || String(row.label).toLowerCase() === lower)) {
		return found
	}
	return [...found, { id: typed, label, icon: 'AccountGroupOutline', kind: 'typed' }]
}

/**
 * CnAssignDialog — hand a record to another user or team, with a note and
 * optional switches, configured from the manifest (an `open-modal` action's
 * props). dossiq's case handover (board DqOverdragen: new team, why it moves,
 * "this is a doorzending (Awb 2:3)") is the first; pipelinq tickets and bulk
 * reassignment use the same dialog.
 *
 * `config`:
 * - `title`, `subtitle`, `doneText`: texts, through the host translate;
 *   `eyebrow` a template filled from the record.
 * - `source`: an endpointSource to read the record from, else `object`.
 * - `assignee`: `{ kinds?, label?, placeholder?, hint?, currentPath?,
 *   currentHint?, currentAs?, allowTyped?, field?, kindField? }`. `kinds` is `["group"]`
 *   (default), `["user"]` or both; `currentPath` reads who has it now from the
 *   record and `currentHint` ("Now with {current}.", the placeholder named
 *   by `currentAs`) says so, in place of `hint`; `allowTyped`
 *   offers what was typed as a choice; the id is sent as `field` (default
 *   `assignee`) and its kind as `kindField` when set.
 * - `note`: `{ label?, hint?, required?, field?, rows? }`, required by default and
 *   sent as `field` (default `note`); `false` drops it. `rows` is the text
 *   area's height in lines (default 3, as board DqOverdragen draws it).
 * - `toggles`: `[{ field, label, note?, noteFallback? }]`: switches that start
 *   off and are sent as booleans; `label` and `note` are templates filled from
 *   the record ("{initiatorDisplayName} then gets a message"); `noteFallback`
 *   is shown when the record lacks a value the note names.
 * - `confirm`: `{ label?, icon?, request?: { method?, url, body? }, action? }`.
 *   `request` sends the choice itself (`body` templates filled from the
 *   record); `action` dispatches a manifest action with the choice as its
 *   last argument.
 *
 * Tokens (`@objectId`, `@object.<field>`) resolve in every url. A refusal is
 * shown in the server's own words and the dialog stays open.
 */
export default {
	name: 'CnAssignDialog',

	components: { CnDialog, CnIcon, CnSearchSelect, NcButton, NcCheckboxRadioSwitch, NcTextArea },

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
		 * The record, when the host has it.
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
		const seq = ++fieldSeq
		const flags = {}
		for (const toggle of Array.isArray(this.config.toggles) ? this.config.toggles : []) {
			if (toggle && toggle.field) {
				flags[toggle.field] = false
			}
		}
		return {
			record: this.object,
			options: [],
			picked: null,
			searching: false,
			timer: null,
			searchSeq: 0,
			note: '',
			flags,
			busy: false,
			refusal: '',
			done: false,
			assigneeId: `cn-assign-dialog-assignee-${seq}`,
			noteId: `cn-assign-dialog-note-${seq}`,
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

		/** @return {object} The assignee config. */
		assigneeConfig() {
			return this.config.assignee && typeof this.config.assignee === 'object' ? this.config.assignee : {}
		},

		/** @return {object} The note config. */
		noteConfig() {
			return this.config.note && typeof this.config.note === 'object' ? this.config.note : {}
		},

		/** @return {object} The confirm config. */
		confirmConfig() {
			return this.config.confirm && typeof this.config.confirm === 'object' ? this.config.confirm : {}
		},

		/** @return {Array<object>} The switches with a field. */
		toggles() {
			return (Array.isArray(this.config.toggles) ? this.config.toggles : []).filter((toggle) => toggle && toggle.field)
		},

		/** @return {string[]} The kinds searched: `group`, `user`. */
		kinds() {
			const kinds = Array.isArray(this.assigneeConfig.kinds) ? this.assigneeConfig.kinds.filter((k) => k === 'group' || k === 'user') : []
			return kinds.length ? kinds : ['group']
		},

		/** @return {string} The assignee field's label. */
		assigneeLabel() {
			if (this.assigneeConfig.label) {
				return this.text(this.assigneeConfig.label)
			}
			return this.kinds.length === 1 && this.kinds[0] === 'user' ? t('nextcloud-vue', 'New handler') : t('nextcloud-vue', 'New team')
		},

		/** @return {string} Who has the record now, read from it. */
		current() {
			const path = this.assigneeConfig.currentPath
			const value = path && this.record ? readPath(this.record, path) : ''
			return value === undefined || value === null ? '' : String(value)
		},

		/**
		 * The hint under the assignee field: who has it now, else the configured hint.
		 *
		 * @spec openspec/changes/assign-dialog/specs/assign-dialog/spec.md#requirement-a-manifest-configures-an-assign-dialog
		 * @return {string}
		 */
		assigneeHint() {
			const name = this.assigneeConfig.currentAs || 'current'
			const now = this.current && this.assigneeConfig.currentHint ? fillTemplate(this.cnTranslate(this.assigneeConfig.currentHint), { [name]: this.current }) : ''
			return now || this.text(this.assigneeConfig.hint)
		},

		/** @return {Array<object>} The rows, keeping the picked one listed. */
		shownOptions() {
			if (this.picked && !this.options.some((o) => String(o.id) === String(this.picked.id))) {
				return [this.picked, ...this.options]
			}
			return this.options
		},

		/** @return {boolean} Whether a note is asked and needed. */
		noteNeeded() {
			return this.config.note !== false && this.noteConfig.required !== false
		},

		/** @return {string} The note field's label. */
		noteLabel() {
			return this.text(this.noteConfig.label) || t('nextcloud-vue', 'Why it is moving')
		},

		/**
		 * Whether the assignment may run: an assignee, a note when needed, nothing in flight.
		 *
		 * @spec openspec/changes/assign-dialog/specs/assign-dialog/spec.md#requirement-a-manifest-configures-an-assign-dialog
		 * @return {boolean}
		 */
		canConfirm() {
			return !this.busy && this.picked !== null && (!this.noteNeeded || this.note.trim() !== '')
		},
	},

	async mounted() {
		const source = this.config.source
		if (source && source.url) {
			try {
				const data = await fetchEndpointSource(source, this.tokenCtx, { fresh: true })
				this.record = data && typeof data === 'object' ? data : this.record
			} catch {
				// The hint stays without the current assignee; the dialog still works.
			}
		}
	},

	beforeUnmount() {
		clearTimeout(this.timer)
	},

	methods: {
		t,

		/**
		 * A config text through the host translate, '' for anything else.
		 *
		 * @param {unknown} value The text.
		 * @return {string}
		 */
		text(value) {
			return typeof value === 'string' && value !== '' ? this.cnTranslate(value) : ''
		},

		/**
		 * A template filled from the record, translated first.
		 *
		 * @param {unknown} template The template.
		 * @return {string}
		 */
		fill(template) {
			if (typeof template !== 'string' || template === '') {
				return ''
			}
			return fillTemplate(this.cnTranslate(template), this.record || {}).trim()
		},

		/**
		 * Search after typing rests.
		 *
		 * @param {string} query What was typed.
		 */
		onSearch(query) {
			clearTimeout(this.timer)
			const typed = String(query ?? '').trim()
			if (typed === '') {
				this.options = []
				return
			}
			this.timer = setTimeout(() => this.search(typed), SEARCH_DELAY)
		},

		/**
		 * Search the configured kinds; offer what was typed when allowed.
		 *
		 * @spec openspec/changes/assign-dialog/specs/assign-dialog/spec.md#requirement-a-manifest-configures-an-assign-dialog
		 * @param {string} typed What was typed.
		 * @return {Promise<void>}
		 */
		async search(typed) {
			const seq = ++this.searchSeq
			this.searching = true
			const [groups, users] = await Promise.all([
				this.kinds.includes('group') ? searchNextcloudGroups(typed, { limit: 20 }) : [],
				this.kinds.includes('user') ? searchNextcloudUsers(typed, { limit: 20 }) : [],
			])
			if (seq !== this.searchSeq) {
				return
			}
			const found = [
				...groups.map((g) => ({ id: g.id, label: g.label, secondary: g.subline || '', icon: 'AccountGroupOutline', kind: 'group' })),
				...users.map((u) => ({ id: u.id, label: u.label, secondary: u.subline || '', avatar: true, kind: 'user' })),
			]
			this.options = this.assigneeConfig.allowTyped ? withTypedAssignee(found, typed, t('nextcloud-vue', 'Use "{name}"', { name: typed })) : found
			this.searching = false
		},

		/**
		 * Take the picked row.
		 *
		 * @param {string|null} id The picked id.
		 */
		onPick(id) {
			this.picked = id === null ? null : (this.shownOptions.find((o) => String(o.id) === String(id)) || null)
		},

		/**
		 * The choice as sent: assignee, its kind, the note and the switches.
		 *
		 * @return {object}
		 */
		choice() {
			const out = { [this.assigneeConfig.field || 'assignee']: String(this.picked.id) }
			if (this.assigneeConfig.kindField) {
				out[this.assigneeConfig.kindField] = this.picked.kind === 'typed' ? this.kinds[0] : this.picked.kind
			}
			if (this.config.note !== false) {
				out[this.noteConfig.field || 'note'] = this.note.trim()
			}
			return { ...out, ...this.flags }
		},

		/**
		 * Assign once: send `confirm.request`, or dispatch `confirm.action`,
		 * then show the done text and refresh the page.
		 *
		 * @spec openspec/changes/assign-dialog/specs/assign-dialog/spec.md#requirement-a-manifest-configures-an-assign-dialog
		 * @return {Promise<void>}
		 */
		async confirm() {
			if (!this.canConfirm) {
				return
			}
			this.busy = true
			this.refusal = ''
			const choice = this.choice()
			try {
				const request = this.confirmConfig.request
				if (request && request.url) {
					const url = interpolateUrlTokens(request.url, this.tokenCtx)
					const body = {}
					for (const [key, value] of Object.entries(request.body || {})) {
						body[key] = typeof value === 'string' ? fillTemplate(value, this.record || {}) : value
					}
					const method = String(request.method || 'POST').toLowerCase()
					await axios[['post', 'put', 'patch'].includes(method) ? method : 'post'](/^https?:\/\//i.test(url) ? url : generateUrl(url), { ...body, ...choice })
				} else if (this.confirmConfig.action && typeof this.cnDispatchAction === 'function') {
					await this.cnDispatchAction({ ...this.confirmConfig.action, args: [...(this.confirmConfig.action.args || []), choice] })
				}
				this.done = true
				emit(PAGE_REFRESH, {})
				/** @event done The assignment ran. Payload: the choice as sent. */
				this.$emit('done', choice)
			} catch (failure) {
				const data = failure && failure.response && failure.response.data
				this.refusal = String((data && (data.message || data.error)) || t('nextcloud-vue', 'It was not handed over.'))
			} finally {
				this.busy = false
			}
		},

		/** Close the dialog, unless the assignment is running. */
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
.cn-assign-dialog {
	display: flex;
	flex-direction: column;
	gap: 18px;
}

.cn-assign-dialog__field {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

/* The assignee label sits above its field, as the note's does. */
.cn-assign-dialog__field :deep(.select__label) {
	display: block;
	margin-bottom: 6px;
	font-size: 14px;
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-assign-dialog__hint {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-assign-dialog__toggle {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 12px 14px;
	border: 1px solid var(--color-border-dark);
	border-radius: var(--border-radius-large, 8px);
}

.cn-assign-dialog__toggle--on {
	border: 2px solid var(--color-primary-element);
	background: var(--color-primary-element-light);
}

.cn-assign-dialog__toggle-title {
	font-weight: 600;
}

.cn-assign-dialog__toggle-note {
	padding-inline-start: 44px;
}

.cn-assign-dialog__error {
	margin: 0;
	color: var(--color-error-text, var(--color-error));
}
</style>

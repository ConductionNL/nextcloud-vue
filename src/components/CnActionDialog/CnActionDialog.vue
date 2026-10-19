<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<CnDialog
		:name="text(config.title) || t('nextcloud-vue', 'Confirm')"
		:eyebrow="text(config.eyebrow)"
		:subtitle="text(config.subtitle)"
		width="form"
		:noClose="busy"
		data-testid="cn-action-dialog"
		@closing="close">
		<div v-if="!done" class="cn-action-dialog">
			<!-- The record the action is about: its title, a meta line, a badge. -->
			<div v-if="summary" class="cn-action-dialog__summary" data-testid="cn-action-dialog-summary">
				<CnIcon :name="config.summary.icon || 'FolderOutline'" :size="20" class="cn-action-dialog__summary-icon" />
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
					<div v-for="fact in section.facts" :key="fact.label">
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

			<div v-if="config.reason" class="cn-action-dialog__field">
				<NcTextArea
					:id="reasonId"
					v-model="reason"
					:label="reasonLabel"
					:labelOutside="false"
					resize="vertical"
					data-testid="cn-action-dialog-reason" />
				<span v-if="config.reason.hint" class="cn-action-dialog__muted">{{ text(config.reason.hint) }}</span>
			</div>

			<NcNoteCard v-if="config.note"
				:type="noteType"
				:heading="text(config.note.title)"
				data-testid="cn-action-dialog-note">
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
import { NcButton, NcNoteCard, NcTextArea } from '@nextcloud/vue'
import CheckCircle from 'vue-material-design-icons/CheckCircle.vue'
import CircleOutline from 'vue-material-design-icons/CircleOutline.vue'
import HelpCircleOutline from 'vue-material-design-icons/HelpCircleOutline.vue'
import { fetchEndpointSource, interpolateUrlTokens } from '../../composables/useEndpointSource.js'
import { fillTemplate } from '../../utils/fillTemplate.js'
import { readPath } from '../../utils/readPath.js'
import { CnDialog } from '../CnDialog/index.js'
import { CnIcon } from '../CnIcon/index.js'

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
 * - `title`, `eyebrow`, `subtitle`, `doneText`: texts, through the host translate.
 * - `summary`: `{ source?, title, meta?, badge?, icon? }`: templates filled from
 *   the record (`source` an endpointSource to read it from, else `object`).
 * - `facts`: `[{ title?, items: [{ label, value }] }]`, `value` a template.
 * - `checklist`: `{ title?, source, itemsPath?, labels?, required? }`: items
 *   `{ id, met, label?, detail? }` read from `source`; `labels[id]` gives an
 *   item's `{ label, detail?, unmetDetail? }`; the ids in `required` must be
 *   met before the action can run. `met: null` reads as unknown.
 * - `permission`: `{ source, allowedPath, reasonPath? }`: the action runs only
 *   while `allowedPath` reads true; `reasonPath` says why not.
 * - `reason`: `{ label?, hint?, required?, field? }`: a text area; required by
 *   default; sent as `field` (default `reason`).
 * - `note`: `{ variant?, title?, text }`: a read-only note.
 * - `confirm`: `{ label, icon?, request?: { method?, url, body? }, action? }`.
 *   `request` posts itself (`body` templates filled with the record and
 *   `{reason}`); `action` dispatches a manifest action through the page.
 *
 * Tokens (`@objectId`, `@object.<field>`) resolve in every url.
 */
export default {
	name: 'CnActionDialog',

	components: { CheckCircle, CircleOutline, CnDialog, CnIcon, HelpCircleOutline, NcButton, NcNoteCard, NcTextArea },

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
			busy: false,
			refusal: '',
			done: false,
			reasonId: `cn-action-dialog-reason-${++reasonSeq}`,
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
			return !this.busy && this.allowed && this.requiredMet && (!this.reasonNeeded || this.reason.trim() !== '')
		},
	},

	async mounted() {
		await Promise.all([this.loadRecord(), this.loadChecklist(), this.loadPermission()])
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

		/** @return {Promise<void>} */
		async loadPermission() {
			const def = this.config.permission
			if (!def || !def.source || !def.source.url) {
				return
			}
			try {
				const data = await this.read(def.source)
				this.allowed = readPath(data, def.allowedPath || 'allowed') === true
				this.refusal = this.allowed || !def.reasonPath ? '' : String(readPath(data, def.reasonPath) || '')
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
					const method = String(request.method || 'POST').toLowerCase()
					await axios[['post', 'put', 'patch', 'delete'].includes(method) ? method : 'post'](/^https?:\/\//i.test(url) ? url : generateUrl(url), body)
				} else if (this.confirmConfig.action && typeof this.cnDispatchAction === 'function') {
					await this.cnDispatchAction({ ...this.confirmConfig.action, args: [...(this.confirmConfig.action.args || []), { reason }] })
				}
				this.done = true
				emit(PAGE_REFRESH, {})
				/** @event done The action ran. Payload: `{ reason }`. */
				this.$emit('done', { reason })
			} catch (failure) {
				const data = failure && failure.response && failure.response.data
				this.refusal = String((data && (data.message || data.error)) || t('nextcloud-vue', 'The action could not be completed.'))
			} finally {
				this.busy = false
			}
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
	gap: 10px;
	padding: 12px 14px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 8px);
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
	font-size: 15px;
	font-weight: 700;
}

.cn-action-dialog__facts {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	gap: 8px 16px;
	margin: 0;
}

.cn-action-dialog__facts dt {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-action-dialog__facts dd {
	margin: 0;
}

.cn-action-dialog__checks {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-action-dialog__check {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
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

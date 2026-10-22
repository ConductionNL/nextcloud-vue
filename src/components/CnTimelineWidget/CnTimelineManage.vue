<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  CnTimelineManage — the `manage` mode of CnTimelineWidget: one chronological
  read of OpenRegister's timeline on an object (notes, calls, messages), newest
  first with pinned entries on top, plus what a reader who may manage it can do
  there: filter by kind and visibility, pin, close a follow-up, write a note
  (optionally from a standard text block, optionally visible outside), export
  the shown entries as CSV, and run configured entry actions such as a reply
  dialog.

  The list read is filtered by OpenRegister whether or not a filter is asked
  for; the response says whether the reader may manage (`canManage`), and the
  controls are drawn from that rather than guessed. A failed read is not an
  empty history.
-->
<template>
	<div class="cn-timeline-manage" data-testid="cn-timeline-manage">
		<div class="cn-timeline-manage__header">
			<div class="cn-timeline-manage__heading">
				<h3 class="cn-timeline-manage__title">
					{{ titleText }}
				</h3>
				<p class="cn-timeline-manage__subtitle">
					{{ subtitleText }}
				</p>
			</div>
			<div class="cn-timeline-manage__header-actions">
				<NcButton v-if="canManage && composerEnabled"
					data-testid="cn-timeline-add-note"
					@click="focusComposer">
					<template #icon>
						<Plus :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Add a note') }}
				</NcButton>
				<NcButton data-testid="cn-timeline-export" @click="exportEntries">
					<template #icon>
						<Download :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Export') }}
				</NcButton>
			</div>
		</div>

		<div class="cn-timeline-manage__chips"
			role="group"
			:aria-label="t('nextcloud-vue', 'Kind')"
			data-testid="cn-timeline-kind-filter">
			<button v-for="chip in kindChips"
				:key="chip.key"
				type="button"
				class="cn-timeline-manage__chip"
				:class="{ 'cn-timeline-manage__chip--active': chip.active }"
				:aria-pressed="chip.active ? 'true' : 'false'"
				:data-testid="'cn-timeline-chip-' + chip.key"
				@click="chooseKind(chip.id)">
				{{ chip.label }}
				<span class="cn-timeline-manage__chip-count">{{ chip.count }}</span>
			</button>
		</div>

		<div class="cn-timeline-manage__controls">
			<NcSelect v-if="canManage"
				v-model="visibilityFilter"
				class="cn-timeline-manage__filter"
				:options="visibilityOptions"
				:clearable="true"
				label="label"
				:inputLabel="t('nextcloud-vue', 'Visibility')"
				:placeholder="t('nextcloud-vue', 'Internal and public')"
				data-testid="cn-timeline-visibility-filter"
				@update:modelValue="load" />
		</div>

		<NcLoadingIcon v-if="loading" :size="32" />

		<NcNoteCard v-else-if="error" type="error" data-testid="cn-timeline-error">
			{{ error }}
		</NcNoteCard>

		<NcEmptyContent v-else-if="entries.length === 0"
			:name="t('nextcloud-vue', 'Nothing recorded yet')"
			:description="t('nextcloud-vue', 'Notes, calls and messages appear here in the order they happened.')"
			data-testid="cn-timeline-empty" />

		<ul v-else class="cn-timeline-manage__list" data-testid="cn-timeline-list">
			<li v-for="entry in entries"
				:key="entry.id"
				class="cn-timeline-manage__entry"
				:class="{ 'cn-timeline-manage__entry--pinned': entry.pinned }"
				:data-kind="entry.kind || 'note'"
				data-testid="cn-timeline-entry">
				<div class="cn-timeline-manage__head">
					<span class="cn-timeline-manage__kind">{{ kindLabel(entry) }}</span>
					<span class="cn-timeline-manage__author">{{ entry.author }}</span>
					<span class="cn-timeline-manage__moment">{{ moment(entry.created) }}</span>
					<span v-if="entry.visibility === 'public'"
						class="cn-timeline-manage__badge"
						data-testid="cn-timeline-public">
						{{ publicLabel }}
					</span>
					<span v-if="entry.followUp === 'open'"
						class="cn-timeline-manage__badge cn-timeline-manage__badge--open"
						data-testid="cn-timeline-followup-open">
						{{ t('nextcloud-vue', 'Needs an answer') }}
					</span>
				</div>

				<p class="cn-timeline-manage__message">
					{{ entry.message }}
				</p>

				<p v-if="entry.siblings && entry.siblings.length"
					class="cn-timeline-manage__siblings"
					data-testid="cn-timeline-siblings">
					{{ n('nextcloud-vue', 'Also written on %n other record', 'Also written on %n other records', entry.siblings.length) }}
				</p>

				<div v-if="canManage" class="cn-timeline-manage__actions">
					<NcButton variant="tertiary"
						:data-testid="'cn-timeline-pin-' + entry.id"
						@click="togglePin(entry)">
						{{ entry.pinned ? t('nextcloud-vue', 'Unpin') : t('nextcloud-vue', 'Pin') }}
					</NcButton>
					<NcButton v-for="action in actionsFor(entry)"
						:key="action.id"
						variant="tertiary"
						:data-testid="'cn-timeline-action-' + action.id + '-' + entry.id"
						@click="openAction(action, entry)">
						{{ translate(action.label) }}
					</NcButton>
					<NcButton v-if="entry.followUp === 'open'"
						variant="tertiary"
						:data-testid="'cn-timeline-followup-' + entry.id"
						@click="closeFollowUp(entry)">
						{{ t('nextcloud-vue', 'Mark as answered') }}
					</NcButton>
				</div>
			</li>
		</ul>

		<div v-if="(!loading && !error && allEntries.length > 0) || auditTrailLinkLabel"
			class="cn-timeline-manage__footer">
			<p v-if="!loading && !error && allEntries.length > 0"
				class="cn-timeline-manage__count"
				data-testid="cn-timeline-count">
				{{ t('nextcloud-vue', '{shown} of {total} events', { shown: entries.length, total: allEntries.length }) }}
			</p>
			<NcButton v-if="auditTrailLinkLabel"
				variant="tertiary-no-background"
				class="cn-timeline-manage__audit-link"
				data-testid="cn-timeline-audit-link"
				@click="openAuditTrail">
				{{ auditTrailLinkLabel }}
			</NcButton>
		</div>

		<form v-if="canManage && composerEnabled"
			ref="composer"
			class="cn-timeline-manage__composer"
			data-testid="cn-timeline-composer"
			@submit.prevent="submit">
			<h3 class="cn-timeline-manage__composer-title">
				{{ t('nextcloud-vue', 'Add a note') }}
			</h3>
			<p class="cn-timeline-manage__composer-hint">
				{{ t('nextcloud-vue', 'Goes on the timeline above, internal unless you make it visible') }}
			</p>
			<NcSelect v-if="textBlocks.length"
				v-model="chosenBlock"
				class="cn-timeline-manage__filter"
				:options="blockOptions"
				:clearable="true"
				label="label"
				:inputLabel="t('nextcloud-vue', 'Standard note')"
				:placeholder="t('nextcloud-vue', 'Write your own')"
				data-testid="cn-timeline-block"
				@update:modelValue="pickBlock" />

			<label class="cn-timeline-manage__draft-label" :for="draftId">
				{{ t('nextcloud-vue', 'Write a note on this record') }}
			</label>
			<textarea :id="draftId"
				v-model="draft"
				class="cn-timeline-manage__draft"
				:placeholder="t('nextcloud-vue', 'Write a note on this record')"
				data-testid="cn-timeline-draft" />

			<NcCheckboxRadioSwitch v-model="draftIsPublic" data-testid="cn-timeline-draft-public">
				{{ publicLabel }}
			</NcCheckboxRadioSwitch>

			<NcButton variant="primary"
				type="submit"
				:disabled="saving || !draft.trim()"
				data-testid="cn-timeline-save">
				{{ t('nextcloud-vue', 'Add to the timeline') }}
			</NcButton>
		</form>

		<component :is="activeModal.component"
			v-if="activeModal"
			v-bind="activeModal.props"
			v-on="activeModal.listeners" />
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcSelect } from '@nextcloud/vue'
import Download from 'vue-material-design-icons/Download.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import { prefixUrl } from '../../utils/headers.js'

let instanceCount = 0

/**
 * Read a dotted path off a value.
 *
 * @param {object} value The value.
 * @param {string} path  The path.
 * @return {unknown} What is there, or undefined.
 */
function readPath(value, path) {
	return String(path).split('.').reduce((at, key) => (at === null || at === undefined ? undefined : at[key]), value)
}

export default {
	name: 'CnTimelineManage',

	components: { Download, NcButton, NcCheckboxRadioSwitch, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcSelect, Plus },

	inject: {
		/** The app's component registry; entry actions resolve their modal here. */
		cnRegistry: { default: () => ({}) },
		/** Consumer translation function; manifest labels are authored in English. */
		cnTranslate: { default: () => (key) => key },
		/** The page's object sidebar channel; the audit trail link opens its tab. */
		objectSidebarState: { default: null },
	},

	props: {
		/** Register slug. */
		register: { type: String, default: '' },
		/** Schema slug. */
		schema: { type: String, default: '' },
		/** The object's id. */
		objectId: { type: String, default: '' },
		/** OpenRegister API base. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/**
		 * The widget content: `{ title?, subtitle?, publicLabel?, exportName?,
		 * composer?, textBlocks?, entryActions?, auditTrailLink? }`.
		 * `auditTrailLink` (`true` or a label) draws a footer link that opens
		 * the object sidebar on its audit trail tab, `auditTrailTab` when the
		 * page declares that tab under its own id.
		 */
		content: { type: Object, default: () => ({}) },
	},

	data() {
		instanceCount += 1
		return {
			uid: instanceCount,
			allEntries: [],
			entries: [],
			kinds: [],
			loading: false,
			error: '',
			canManage: false,
			kindFilter: null,
			visibilityFilter: null,
			textBlocks: [],
			chosenBlock: null,
			draft: '',
			draftIsPublic: false,
			saving: false,
			activeModal: null,
		}
	},

	computed: {
		titleText() {
			return this.content.title ? this.translate(this.content.title) : t('nextcloud-vue', 'History')
		},

		subtitleText() {
			return this.content.subtitle ? this.translate(this.content.subtitle) : t('nextcloud-vue', 'What happened, who did it and when, newest first')
		},

		publicLabel() {
			return this.content.publicLabel ? this.translate(this.content.publicLabel) : t('nextcloud-vue', 'Visible to the applicant')
		},

		/**
		 * The audit trail link's words, or '' when it is not drawn.
		 *
		 * @spec openspec/changes/timeline-audit-trail-link/specs/timeline/spec.md#requirement-the-manage-timeline-can-point-at-the-audit-trail-in-the-sidebar
		 * @return {string}
		 */
		auditTrailLinkLabel() {
			const link = this.content.auditTrailLink
			if (!link || !this.objectSidebarState) {
				return ''
			}
			return typeof link === 'string' ? this.translate(link) : t('nextcloud-vue', 'Full audit trail in the sidebar')
		},

		composerEnabled() {
			return this.content.composer !== false
		},

		draftId() {
			return `cn-timeline-draft-${this.uid}`
		},

		/**
		 * The kind options, the plain note first. A note is an entry with NO
		 * kind, so "Note" filters on its absence.
		 *
		 * @return {Array<object>} The options.
		 */
		kindOptions() {
			return [{ id: '', label: t('nextcloud-vue', 'Note') }].concat(this.kinds.map((kind) => ({ id: kind.slug, label: kind.title || kind.slug })))
		},

		/**
		 * All, then every kind the object has entries of, each with its count.
		 *
		 * @spec openspec/changes/timeline-all-chip-host-label/specs/timeline/spec.md#requirement-the-timelines-all-chip-reads-the-hosts-word
		 * @return {Array<object>} The chips.
		 */
		kindChips() {
			const chosen = this.kindFilter ? (this.kindFilter.id || '') : null
			const counts = new Map()
			for (const entry of this.allEntries) {
				const kind = entry.kind || ''
				counts.set(kind, (counts.get(kind) || 0) + 1)
			}
			// The host's word first, as its own filter chips read ("Alles"), then the library's.
			const hostAll = typeof this.cnTranslate === 'function' ? this.cnTranslate('All') : 'All'
			const allLabel = typeof hostAll === 'string' && hostAll !== '' && hostAll !== 'All' ? hostAll : t('nextcloud-vue', 'All')
			const chips = [{ key: 'all', id: null, label: allLabel, count: this.allEntries.length, active: chosen === null }]
			for (const option of this.kindOptions) {
				const count = counts.get(option.id) || 0
				if (count > 0) {
					chips.push({ key: option.id || 'note', id: option.id, label: option.label, count, active: chosen === option.id })
				}
			}
			return chips
		},

		blockOptions() {
			return this.textBlocks.map((block) => ({ id: block.slug, label: block.title || block.slug }))
		},

		visibilityOptions() {
			return [
				{ id: 'internal', label: t('nextcloud-vue', 'Internal only') },
				{ id: 'public', label: this.publicLabel },
			]
		},

		base() {
			return this.apiBase.replace(/\/$/, '')
		},

		timelineUrl() {
			if (!this.objectId || !this.register || !this.schema) {
				return ''
			}
			return prefixUrl(`${this.base}/objects/${this.register}/${this.schema}/${this.objectId}/timeline`)
		},

		entryActions() {
			return Array.isArray(this.content.entryActions) ? this.content.entryActions.filter((action) => action && action.id) : []
		},
	},

	watch: {
		objectId: 'load',
	},

	mounted() {
		this.loadKinds()
		if (this.content.textBlocks !== false) {
			this.loadTextBlocks()
		}
		this.load()
	},

	methods: {
		t,
		n,

		translate(text) {
			return text ? this.cnTranslate(text) : ''
		},

		/** Read the declared kinds, so the filter names them as administered. */
		async loadKinds() {
			try {
				const response = await axios.get(prefixUrl(`${this.base}/timeline/kinds`))
				this.kinds = response.data?.results || []
			} catch {
				this.kinds = []
			}
		},

		/** Read the seeded standard notes. */
		async loadTextBlocks() {
			try {
				const response = await axios.get(prefixUrl(`${this.base}/timeline/text-blocks`))
				this.textBlocks = response.data?.results || []
			} catch {
				this.textBlocks = []
			}
		},

		/**
		 * Note which standard note was picked. The BLOCK is sent, not its body:
		 * OpenRegister fills the object's own values into it on the way in.
		 *
		 * @param {object|null} block The picked option.
		 */
		pickBlock(block) {
			this.chosenBlock = block || null
			if (block) {
				const declared = this.textBlocks.find((entry) => entry.slug === block.id)
				this.draft = declared?.title || block.label
			}
		},

		/**
		 * Write the drafted note onto this object.
		 *
		 * @return {Promise<void>}
		 */
		async submit() {
			if (!this.draft.trim() || !this.timelineUrl) {
				return
			}
			this.saving = true
			this.error = ''
			try {
				const payload = { visibility: this.draftIsPublic ? 'public' : 'internal' }
				if (this.chosenBlock?.id) {
					payload.textBlock = this.chosenBlock.id
				} else {
					payload.message = this.draft
				}
				await axios.post(this.timelineUrl, payload)
				this.draft = ''
				this.chosenBlock = null
				this.draftIsPublic = false
				await this.load()
			} catch {
				this.error = t('nextcloud-vue', 'That note could not be saved.')
			} finally {
				this.saving = false
			}
		},

		/**
		 * Read the timeline with the visibility filter, if one is set.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			if (!this.timelineUrl) {
				return
			}
			this.loading = true
			this.error = ''
			try {
				const params = {}
				if (this.visibilityFilter?.id) {
					params.visibility = this.visibilityFilter.id
				}
				const response = await axios.get(this.timelineUrl, { params })
				this.canManage = response.data?.canManage === true
				this.allEntries = response.data?.results || []
				this.entries = this.applyKindFilter(this.allEntries)
			} catch {
				this.allEntries = []
				this.entries = []
				this.error = t('nextcloud-vue', 'The timeline could not be read. Try again, or ask an administrator to check OpenRegister.')
			} finally {
				this.loading = false
			}
		},

		/**
		 * Show one kind, or every kind for `null`, without reading again.
		 *
		 * @param {string|null} id The kind slug, '' for a note, null for all.
		 */
		chooseKind(id) {
			this.kindFilter = id === null ? null : { id }
			this.entries = this.applyKindFilter(this.allEntries)
		},

		/**
		 * The kind filter is applied in the reading: the list endpoint does not
		 * read a kind parameter, so sending one would be dropped in silence.
		 *
		 * @param {Array<object>} results The entries as read.
		 * @return {Array<object>} The entries to show.
		 */
		applyKindFilter(results) {
			if (!this.kindFilter) {
				return results
			}
			const wanted = this.kindFilter.id || ''
			return results.filter((entry) => (entry.kind || '') === wanted)
		},

		/**
		 * The shown entries as CSV: when, kind, who, visibility and what.
		 *
		 * @return {string} The CSV text.
		 */
		entriesCsv() {
			const cell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
			const rows = [[t('nextcloud-vue', 'When'), t('nextcloud-vue', 'Kind'), t('nextcloud-vue', 'Who'), t('nextcloud-vue', 'Visibility'), t('nextcloud-vue', 'Message')]]
			for (const entry of this.entries) {
				rows.push([entry.created, this.kindLabel(entry), entry.author, entry.visibility, entry.message])
			}
			return rows.map((row) => row.map(cell).join(',')).join('\r\n')
		},

		/** Download the shown entries as a CSV file. */
		exportEntries() {
			const blob = new Blob([this.entriesCsv()], { type: 'text/csv;charset=utf-8' })
			const url = URL.createObjectURL(blob)
			const link = document.createElement('a')
			link.href = url
			link.download = `${this.content.exportName || 'history'}-${this.objectId || 'record'}.csv`
			document.body.appendChild(link)
			link.click()
			link.remove()
			URL.revokeObjectURL(url)
		},

		/**
		 * Open the object sidebar on its audit trail tab.
		 *
		 * @spec openspec/changes/timeline-audit-trail-link/specs/timeline/spec.md#requirement-the-manage-timeline-can-point-at-the-audit-trail-in-the-sidebar
		 */
		openAuditTrail() {
			this.objectSidebarState.open = true
			this.objectSidebarState.requestedTab = this.content.auditTrailTab || 'auditTrail'
		},

		/** Bring the composer into view and focus its text. */
		focusComposer() {
			const form = this.$refs.composer
			if (!form) {
				return
			}
			form.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
			form.querySelector('textarea')?.focus()
		},

		/**
		 * The label of one entry's kind, falling back to "Note".
		 *
		 * @param {object} entry The entry.
		 * @return {string} The label.
		 */
		kindLabel(entry) {
			if (!entry.kind) {
				return t('nextcloud-vue', 'Note')
			}
			const declared = this.kinds.find((kind) => kind.slug === entry.kind)
			return declared?.title || entry.kind
		},

		/**
		 * One moment in the reader's locale.
		 *
		 * @param {string} value An ISO 8601 stamp.
		 * @return {string} The moment, or the raw value.
		 */
		moment(value) {
			if (!value) {
				return ''
			}
			const parsed = new Date(value)
			return isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
		},

		async togglePin(entry) {
			await this.patch(entry, { pinned: !entry.pinned })
		},

		async closeFollowUp(entry) {
			await this.patch(entry, { followUp: 'done' })
		},

		/**
		 * Write one change onto one entry and read the timeline back (pinning
		 * changes the order, so patching in place would look like nothing).
		 *
		 * @param {object} entry   The entry.
		 * @param {object} changes The fields to write.
		 * @return {Promise<void>}
		 */
		async patch(entry, changes) {
			try {
				await axios.patch(`${this.timelineUrl}/${entry.id}`, changes)
				await this.load()
			} catch {
				this.error = t('nextcloud-vue', 'That change could not be saved.')
			}
		},

		/**
		 * The configured entry actions that apply to one entry (`kinds` limits
		 * an action to entries of those kinds).
		 *
		 * @param {object} entry The entry.
		 * @return {Array<object>} The actions.
		 */
		actionsFor(entry) {
			return this.entryActions.filter((action) => !Array.isArray(action.kinds) || action.kinds.includes(entry.kind || ''))
		},

		/**
		 * Resolve `@objectId` and `@row.<path>` tokens in an action's props.
		 *
		 * @param {object} props The props as declared.
		 * @param {object} entry The entry.
		 * @return {object} The resolved props.
		 */
		resolveProps(props, entry) {
			const out = {}
			for (const [key, value] of Object.entries(props || {})) {
				if (value === '@objectId') {
					out[key] = this.objectId
				} else if (typeof value === 'string' && value.startsWith('@row.')) {
					const found = readPath(entry, value.slice('@row.'.length))
					out[key] = found === undefined || found === null ? '' : found
				} else {
					out[key] = value
				}
			}
			return out
		},

		/**
		 * Open an entry action's modal from the app's registry. On its
		 * `doneEvent` (default `done`) the entry's open follow-up is closed when
		 * the action says so; otherwise the timeline is read again.
		 *
		 * @param {object} action The action.
		 * @param {object} entry  The entry.
		 */
		openAction(action, entry) {
			const registered = (this.cnRegistry || {})[action.modal]
			const component = registered && (registered.component || registered)
			if (!component) {
				// eslint-disable-next-line no-console
				console.warn(`[CnTimelineWidget] entry action "${action.id}" names modal "${action.modal}", which the registry does not hold.`)
				return
			}
			const close = () => {
				this.activeModal = null
			}
			const done = async () => {
				this.activeModal = null
				if (action.closesFollowUp === true && entry.followUp === 'open') {
					await this.closeFollowUp(entry)
					return
				}
				await this.load()
			}
			this.activeModal = {
				component,
				props: this.resolveProps(action.props, entry),
				listeners: { [action.doneEvent || 'done']: done, close },
			}
		},
	},
}
</script>

<style scoped>
.cn-timeline-manage__header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
	margin-block-end: 16px;
}

.cn-timeline-manage__heading {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-timeline-manage__header-actions {
	display: flex;
	gap: 8px;
}

.cn-timeline-manage__title {
	margin: 0;
	font-size: 17px;
	font-weight: 700;
	line-height: 1.2;
}

.cn-timeline-manage__subtitle {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 14px;
}

.cn-timeline-manage__chips {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-block-end: 12px;
}

.cn-timeline-manage__chip {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	box-sizing: border-box;
	height: 36px;
	padding: 0 12px;
	border: 1px solid var(--color-border-dark);
	border-radius: 18px;
	background: var(--color-main-background);
	color: var(--color-main-text);
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
}

/* The chosen kind is a filled chip with no outline. */
.cn-timeline-manage__chip--active {
	border: 0;
	background: var(--color-main-text);
	color: var(--color-main-background);
}

.cn-timeline-manage__chip-count {
	padding: 1px 7px;
	border-radius: 10px;
	background: var(--color-border);
	color: var(--color-main-text);
	font-size: 12px;
}

/* On the filled chip the count is a lighter ink bubble with light text. */
.cn-timeline-manage__chip--active .cn-timeline-manage__chip-count {
	background: color-mix(in srgb, var(--color-main-background) 18%, var(--color-main-text));
	color: var(--color-main-background);
}

.cn-timeline-manage__footer {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	margin: 12px 0 0;
}

.cn-timeline-manage__count {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-timeline-manage__composer {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-block-start: 24px;
	padding-block-start: 16px;
	border-block-start: 1px solid var(--color-border);
}

.cn-timeline-manage__composer-title {
	margin: 0;
	font-size: 16px;
	font-weight: bold;
}

.cn-timeline-manage__composer-hint {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-timeline-manage__draft-label {
	font-weight: bold;
}

.cn-timeline-manage__draft {
	width: 100%;
	min-height: 70px;
}

.cn-timeline-manage__controls {
	display: flex;
	gap: 12px;
	flex-wrap: wrap;
	margin-block-end: 12px;
}

.cn-timeline-manage__filter {
	min-width: 200px;
}

.cn-timeline-manage__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-timeline-manage__entry {
	border-block-end: 1px solid var(--color-border);
	padding-block: 12px;
}

.cn-timeline-manage__entry--pinned {
	border-inline-start: 3px solid var(--color-primary-element);
	padding-inline-start: 8px;
}

.cn-timeline-manage__head {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	align-items: baseline;
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}

.cn-timeline-manage__kind {
	font-weight: bold;
	color: var(--color-main-text);
}

.cn-timeline-manage__badge {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 0 6px;
}

.cn-timeline-manage__badge--open {
	border-color: var(--color-warning);
	color: var(--color-warning-text);
}

.cn-timeline-manage__message {
	margin-block: 4px 0;
	white-space: pre-wrap;
}

.cn-timeline-manage__siblings {
	margin-block: 4px 0;
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}

.cn-timeline-manage__actions {
	display: flex;
	gap: 8px;
	margin-block-start: 4px;
}
</style>

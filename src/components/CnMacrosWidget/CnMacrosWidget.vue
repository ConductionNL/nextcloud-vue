<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<!--
  CnMacrosWidget — the macros of a record, each with a button that runs it
  (`type: "macros"`, DqZaakAssistent "Macro's").

  A macro is an object action whose body is a flow or inline steps. The widget
  shows the actions OpenRegister lists for the record
  (`GET /api/objects/{register}/{schema}/{id}/actions`) of kind `flow` or
  `steps`: what the person may not run is absent, what cannot run now is
  disabled with its reason. It runs them through
  `POST /api/objects/{register}/{schema}/{id}/actions/{action}`, asking the
  inputs in CnObjectActionDialog when the action declares any. On an
  OpenRegister without the actions list it reads the schema's declared macros
  (`macro: true` with a flow), as it did before. The last run comes from the
  record's action history (`action.run` and `action.macro`), and after a run
  the page is asked to refresh.
-->
<template>
	<div class="cn-macros-widget" data-testid="cn-macros-widget">
		<p v-if="content.description" class="cn-macros-widget__description">
			{{ tr(content.description) }}
		</p>
		<p v-if="busy" class="cn-macros-widget__muted">
			{{ t('nextcloud-vue', 'Loading …') }}
		</p>
		<p v-else-if="macros.length === 0" class="cn-macros-widget__muted" data-testid="cn-macros-widget-empty">
			{{ content.emptyText ? tr(content.emptyText) : t('nextcloud-vue', 'This record has no macros') }}
		</p>
		<ul v-else class="cn-macros-widget__list">
			<li
				v-for="macro in macros"
				:key="macro.key"
				class="cn-macros-widget__row"
				:data-testid="`cn-macros-widget-row-${macro.key}`">
				<div class="cn-macros-widget__text">
					<span class="cn-macros-widget__name">{{ tr(macro.name) }}</span>
					<span v-if="macro.description" class="cn-macros-widget__hint">{{ tr(macro.description) }}</span>
					<span v-if="!macro.available && macro.reason"
						class="cn-macros-widget__hint"
						:data-testid="`cn-macros-widget-reason-${macro.key}`">{{ macro.reason }}</span>
				</div>
				<NcButton
					:disabled="running !== '' || !macro.available"
					:title="macro.available ? null : macro.reason || null"
					:data-testid="`cn-macros-widget-run-${macro.key}`"
					@click="run(macro)">
					{{ running === macro.key ? t('nextcloud-vue', 'Running …') : t('nextcloud-vue', 'Execute') }}
				</NcButton>
			</li>
		</ul>
		<NcNoteCard
			v-if="error"
			type="error"
			data-testid="cn-macros-widget-error">
			{{ error }}
		</NcNoteCard>
		<NcNoteCard
			v-else-if="lastRun"
			type="success"
			data-testid="cn-macros-widget-last-run">
			{{ t('nextcloud-vue', 'Last run: {name}, {date}', { name: lastRun.name, date: lastRun.date }) }}<template v-if="lastRun.changes.length">
				{{ n('nextcloud-vue', '{count} change: {list}', '{count} changes: {list}', lastRun.changes.length, { count: lastRun.changes.length, list: lastRun.changes.join(', ') }) }}
			</template>
		</NcNoteCard>
		<CnObjectActionDialog
			v-if="dialogAction"
			:action="dialogAction"
			:register="target.register"
			:schema="target.schema"
			:objectId="target.id"
			:currentObject="objectData"
			@done="onDialogDone"
			@close="dialogAction = null" />
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcNoteCard } from '@nextcloud/vue'
import CnObjectActionDialog from '../../dialogs/CnObjectActionDialog.vue'
import { fetchEndpointSource } from '../../composables/useEndpointSource.js'
import { useObjectActions } from '../../composables/useObjectActions.js'
import { declaredMacros, macrosFromActions, pickMacros } from '../../utils/declaredMacros.js'
import { hasActionInputs, readActionHistory } from '../../utils/objectActions.js'
import { readVisibleWhenPath } from '../../utils/visibleWhen.js'

export default {
	name: 'CnMacrosWidget',

	components: {
		CnObjectActionDialog,
		NcButton,
		NcNoteCard,
	},

	inject: {
		cnTranslate: { default: null },
		/** The records the detail page's `visibilityContext` names (a case's case type), as `@context.<name>`. */
		cnDetailVisibilityRows: { default: null },
	},

	props: {
		/**
		 * The widget's content: `description` (the line under the title),
		 * `emptyText`, both translated, and `macrosFrom`: where the list of macro
		 * keys this record shows comes from, in that order. A path on the record
		 * (`@context.caseType.macros`), or an endpoint (`{ url, params?,
		 * responsePath? }`, tokens such as `@objectId` resolved) answering the
		 * list. A record that lists none shows none.
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The bound record. */
		objectData: {
			type: Object,
			default: null,
		},

		/** The bound record's id. */
		objectId: {
			type: [String, Number],
			default: '',
		},
	},

	setup(props) {
		const runner = useObjectActions(() => {
			const self = props.objectData?.['@self'] || {}
			return {
				register: self.register ?? '',
				schema: self.schema ?? '',
				id: props.objectId || self.id || props.objectData?.id || '',
			}
		})
		return { runner }
	},

	data() {
		return {
			/** The schema's declared macros, read only on an OpenRegister without the actions list. */
			declared: [],
			/** The macro whose inputs or confirmation the dialog asks (null = closed). */
			dialogAction: null,
			loading: false,
			running: '',
			error: '',
			lastRun: null,
			// The keys an endpoint `macrosFrom` answered with; undefined until it answers.
			listed: undefined,
		}
	},

	computed: {
		/**
		 * The macros this record shows: the schema's, narrowed to the list
		 * `macrosFrom` names on the record.
		 *
		 * @return {Array<{key: string, name: string, description: string}>}
		 * @spec openspec/changes/macros-per-record/specs/macros-widget/spec.md#requirement-a-record-can-choose-which-macros-it-shows
		 */
		macros() {
			const all = this.available
			if (this.macrosEndpoint) {
				return pickMacros(all, this.listed, true)
			}
			const path = typeof this.content?.macrosFrom === 'string' ? this.content.macrosFrom : ''
			if (path === '') {
				return all
			}
			const rows = this.cnDetailVisibilityRows ? this.cnDetailVisibilityRows.value : undefined
			const data = { ...(this.objectData || {}), ...(rows ? { '@context': rows } : {}) }
			return pickMacros(all, readVisibleWhenPath(data, path), true)
		},

		/**
		 * Every macro of the record before `macrosFrom` narrows it: the flow and
		 * steps actions OpenRegister lists, or, on an instance without that list,
		 * the schema's declared macros.
		 *
		 * @return {Array<{key: string, name: string, description: string, available: boolean, reason: string, action: object|null}>}
		 * @spec openspec/changes/object-actions-ui/specs/object-actions-ui/spec.md#requirement-the-macros-widget-is-a-view-over-the-same-list
		 */
		available() {
			if (this.runner.unsupported.value) {
				return this.declared.map((macro) => ({ ...macro, available: true, reason: '', action: null }))
			}
			return macrosFromActions(this.runner.actions.value)
		},

		/** Whether the list (or the schema) is being read. */
		busy() {
			return this.loading || (this.runner.loading.value && this.runner.actions.value.length === 0)
		},

		/**
		 * `macrosFrom` as an endpoint (`{ url, method?, params?, responsePath? }`,
		 * the endpointSource block), or null when it is a path or unset.
		 *
		 * @return {object|null}
		 * @spec openspec/changes/macros-per-record/specs/macros-widget/spec.md#requirement-a-record-can-choose-which-macros-it-shows
		 */
		macrosEndpoint() {
			const from = this.content?.macrosFrom
			return from && typeof from === 'object' && typeof from.url === 'string' && from.url !== '' ? from : null
		},

		/** @return {{register: string, schema: string, id: string}} Where the record lives. */
		target() {
			const self = this.objectData?.['@self'] || {}
			return {
				register: String(self.register ?? ''),
				schema: String(self.schema ?? ''),
				id: String(this.objectId || self.id || this.objectData?.id || ''),
			}
		},
	},

	watch: {
		target: {
			immediate: true,
			deep: true,
			handler() {
				this.load()
			},
		},

		// An OpenRegister without the actions list: read the schema instead.
		'runner.unsupported.value': function(unsupported) {
			if (unsupported) {
				this.loadDeclared()
			}
		},
	},

	methods: {
		t,
		n,

		/**
		 * Translate an app-supplied text through the host app when it offers it.
		 *
		 * @param {string} text The text.
		 * @return {string} The translated text.
		 */
		tr(text) {
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/**
		 * Read what `macrosFrom` lists and the record's last run. The macros
		 * themselves come from `useObjectActions`.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			const { schema, id } = this.target
			if (schema === '' || id === '') {
				this.declared = []
				return
			}
			if (this.macrosEndpoint) {
				await this.loadListed()
			}
			await this.loadLastRun()
		},

		/**
		 * The schema's declared macros, for an OpenRegister that does not list
		 * object actions yet.
		 *
		 * @return {Promise<void>}
		 */
		async loadDeclared() {
			const { register, schema } = this.target
			if (schema === '') {
				this.declared = []
				return
			}
			this.loading = true
			try {
				const res = await axios.get(generateUrl('/apps/openregister/api/schemas/{schema}', { schema }), register ? { params: { register } } : undefined)
				this.declared = declaredMacros(res?.data || null)
			} catch {
				this.declared = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * Ask the `macrosFrom` endpoint which macro keys this record offers.
		 * A refused or unreadable answer offers none, never every macro.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/macros-per-record/specs/macros-widget/spec.md#requirement-a-record-can-choose-which-macros-it-shows
		 */
		async loadListed() {
			try {
				const ctx = { objectId: this.target.id, object: this.objectData || {} }
				this.listed = await fetchEndpointSource(this.macrosEndpoint, ctx, { force: true })
			} catch {
				this.listed = []
			}
		},

		/**
		 * The record's most recent macro run, from its audit trail. Left empty
		 * when the trail cannot be read: it is a convenience, not a fact the
		 * widget may invent.
		 *
		 * @return {Promise<void>}
		 */
		async loadLastRun() {
			const [entry] = await readActionHistory(this.target, { limit: 5 })
			if (!entry || entry.created === '') {
				this.lastRun = null
				return
			}
			const macro = this.available.find((candidate) => candidate.key === entry.action)
			this.lastRun = {
				name: this.tr(macro ? macro.name : entry.action),
				date: new Date(entry.created).toLocaleString(),
				changes: entry.changes.map((change) => change.step),
			}
		},

		/**
		 * Run one macro as the person, then ask the page to refresh.
		 *
		 * @param {{key: string, name: string}} macro The macro.
		 * @return {Promise<void>}
		 */
		async run(macro) {
			if (macro.available === false) {
				return
			}
			const action = macro.action
			if (action && (hasActionInputs(action) || action.confirm || action.mode === 'async')) {
				this.dialogAction = action
				return
			}
			this.running = macro.key
			this.error = ''
			const result = await this.runner.run(macro.key)
			this.running = ''
			if (!result.ok) {
				this.error = t('nextcloud-vue', 'The macro did not run: {error}', { error: result.message || '' })
				return
			}
			await this.afterRun(macro)
		},

		/**
		 * The dialog ran the macro.
		 *
		 * @return {Promise<void>}
		 */
		async onDialogDone() {
			const macro = this.available.find((candidate) => candidate.key === this.dialogAction?.key)
			await this.afterRun(macro || { name: this.dialogAction?.label || '' })
		},

		/**
		 * Show the run as the last run until its history entry, which says what
		 * it changed, can be read.
		 *
		 * @param {{name: string}} macro The macro that ran.
		 * @return {Promise<void>}
		 */
		async afterRun(macro) {
			const local = { name: this.tr(macro.name), date: new Date().toLocaleString(), changes: [] }
			this.lastRun = local
			await this.loadLastRun()
			this.lastRun = this.lastRun || local
		},
	},
}
</script>

<style scoped>
.cn-macros-widget {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-macros-widget__description,
.cn-macros-widget__muted {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-macros-widget__list {
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-macros-widget__row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding-block: 10px;
	border-top: 1px solid var(--color-border);
}

.cn-macros-widget__text {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.cn-macros-widget__name {
	font-weight: 600;
}

.cn-macros-widget__hint {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}
</style>

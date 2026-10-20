<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<!--
  CnMacrosWidget — the macros a record's schema declares, each with a button
  that runs it (`type: "macros"`, DqZaakAssistent "Macro's").

  A macro is a declared action (`configuration['x-openregister-action']`) with
  `macro: true` and a bound manual flow; OpenRegister runs it as the person,
  under the action's own right, through
  `POST /api/objects/{register}/{schema}/{id}/actions/{action}`. The widget
  lists what the schema declares and runs what is pressed: it adds no rights and
  no list of its own. The last run comes from the record's audit trail
  (`action.macro`), and after a run the page is asked to refresh.
-->
<template>
	<div class="cn-macros-widget" data-testid="cn-macros-widget">
		<p v-if="content.description" class="cn-macros-widget__description">
			{{ tr(content.description) }}
		</p>
		<p v-if="loading" class="cn-macros-widget__muted">
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
				</div>
				<NcButton
					:disabled="running !== ''"
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
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { emit } from '@nextcloud/event-bus'
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcNoteCard } from '@nextcloud/vue'
import { declaredMacros, pickMacros } from '../../utils/declaredMacros.js'
import { readVisibleWhenPath } from '../../utils/visibleWhen.js'

export default {
	name: 'CnMacrosWidget',

	components: {
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
		 * `emptyText`, both translated, and `macrosFrom`, a path on the record
		 * (`@context.caseType.macros`) to the list of macro keys it shows, in
		 * that order; a record that lists none shows none.
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

	data() {
		return {
			declared: [],
			loading: false,
			running: '',
			error: '',
			lastRun: null,
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
			const path = typeof this.content?.macrosFrom === 'string' ? this.content.macrosFrom : ''
			if (path === '') {
				return this.declared
			}
			const rows = this.cnDetailVisibilityRows ? this.cnDetailVisibilityRows.value : undefined
			const data = { ...(this.objectData || {}), ...(rows ? { '@context': rows } : {}) }
			return pickMacros(this.declared, readVisibleWhenPath(data, path), true)
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
		'target.schema': {
			immediate: true,
			handler() {
				this.load()
			},
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
		 * Read the schema's macros and the record's last macro run.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			const { register, schema, id } = this.target
			if (schema === '' || id === '') {
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
			if (this.declared.length > 0) {
				await this.loadLastRun()
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
			const { register, schema, id } = this.target
			try {
				const res = await axios.get(
					generateUrl('/apps/openregister/api/objects/{register}/{schema}/{id}/audit-trails', { register, schema, id }),
					{ params: { action: 'action.macro', _limit: 1, '_sort[created]': 'DESC' } },
				)
				const entry = (res?.data?.results || [])[0]
				const key = entry?.changed?.declaredAction
				const macro = this.declared.find((candidate) => candidate.key === key)
				const changes = Array.isArray(entry?.changed?.changes)
					? entry.changed.changes.map((change) => (change && typeof change.step === 'string' ? change.step : '')).filter(Boolean)
					: []
				this.lastRun = macro && entry.created
					? { name: this.tr(macro.name), date: new Date(entry.created).toLocaleString(), changes }
					: null
			} catch {
				this.lastRun = null
			}
		},

		/**
		 * Run one macro as the person, then ask the page to refresh.
		 *
		 * @param {{key: string, name: string}} macro The macro.
		 * @return {Promise<void>}
		 */
		async run(macro) {
			const { register, schema, id } = this.target
			this.running = macro.key
			this.error = ''
			try {
				await axios.post(generateUrl('/apps/openregister/api/objects/{register}/{schema}/{id}/actions/{action}', { register, schema, id, action: macro.key }))
				this.lastRun = { name: this.tr(macro.name), date: new Date().toLocaleString(), changes: [] }
				emit('cn:page:refresh', { source: 'cn-macros-widget' })
				// The audit entry of this run says what it changed.
				const local = this.lastRun
				await this.loadLastRun()
				this.lastRun = this.lastRun || local
			} catch (e) {
				this.error = t('nextcloud-vue', 'The macro did not run: {error}', { error: e?.response?.data?.error || e?.message || '' })
			} finally {
				this.running = ''
			}
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

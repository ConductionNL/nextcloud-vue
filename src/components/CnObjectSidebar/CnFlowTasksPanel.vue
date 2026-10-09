<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-sidebar-tab cn-flow-tasks" data-testid="cn-flow-tasks-panel">
		<!-- Create a task on the record -->
		<form class="cn-sidebar-tab__section" data-testid="cn-flow-tasks-form" @submit.prevent="addTask">
			<NcTextField
				v-model="title"
				:label="t('nextcloud-vue', 'Add task…')"
				data-testid="cn-flow-tasks-title" />
			<div class="cn-sidebar-tab__grid">
				<NcDateTimePickerNative
					v-model="due"
					:label="t('nextcloud-vue', 'Deadline')"
					type="date" />
				<NcSelect
					v-model="assignee"
					:options="assigneeOptions"
					:inputLabel="t('nextcloud-vue', 'Assignee')"
					:placeholder="t('nextcloud-vue', 'Assignee')"
					:loading="searching"
					:filterable="false"
					:clearable="true"
					label="label"
					data-testid="cn-flow-tasks-assignee"
					@search="searchAssignees" />
			</div>
			<NcTextField
				v-model="description"
				:label="t('nextcloud-vue', 'Description')" />
			<NcNoteCard v-if="formError" type="error" data-testid="cn-flow-tasks-form-error">
				{{ formError }}
			</NcNoteCard>
			<NcButton
				type="submit"
				variant="primary"
				:disabled="!title.trim() || saving"
				data-testid="cn-flow-tasks-add">
				{{ t('nextcloud-vue', 'Add task') }}
			</NcButton>
		</form>

		<NcLoadingIcon v-if="loading" :name="t('nextcloud-vue', 'Loading …')" />
		<template v-else>
			<p v-if="openTasks.length === 0 && doneTasks.length === 0" class="cn-sidebar-tab__empty" data-testid="cn-flow-tasks-empty">
				{{ t('nextcloud-vue', 'No tasks on this record yet. Personal reminders live in the Integrations tab.') }}
			</p>

			<ul v-if="openTasks.length > 0" class="cn-flow-tasks__list" data-testid="cn-flow-tasks-open">
				<li v-for="task in openTasks"
					:key="uuidOf(task)"
					class="cn-flow-tasks__row"
					:data-task="uuidOf(task)">
					<a :href="deepLink(task)" class="cn-flow-tasks__title">{{ task.title }}</a>
					<span class="cn-flow-tasks__meta">{{ whoOf(task) }}</span>
					<span
						v-if="task.dueAt"
						class="cn-flow-tasks__due"
						:class="{ 'cn-flow-tasks__due--overdue': isOverdue(task) }"
						data-testid="cn-flow-tasks-due">
						{{ dueText(task) }}
					</span>
					<span class="cn-flow-tasks__state">{{ stateText(task) }}</span>
					<span class="cn-flow-tasks__verbs">
						<NcButton
							v-for="verb in verbsOf(task)"
							:key="verb"
							variant="secondary"
							:disabled="busy === uuidOf(task)"
							:data-testid="`cn-flow-tasks-verb-${verb}`"
							@click="onVerb(task, verb)">
							{{ verbLabel(verb) }}
						</NcButton>
					</span>
					<NcSelect
						v-if="reassigning === uuidOf(task)"
						:options="userOptions"
						:inputLabel="t('nextcloud-vue', 'Reassign to')"
						:filterable="false"
						label="label"
						data-testid="cn-flow-tasks-reassign-picker"
						@search="searchUsers"
						@update:modelValue="(option) => reassign(task, option)" />
					<p v-if="rowErrors[uuidOf(task)]"
						class="cn-flow-tasks__error"
						role="alert"
						data-testid="cn-flow-tasks-row-error">
						{{ rowErrors[uuidOf(task)] }}
					</p>
				</li>
			</ul>

			<div v-if="doneTasks.length > 0" class="cn-flow-tasks__done">
				<NcButton
					variant="tertiary"
					:aria-expanded="doneOpen ? 'true' : 'false'"
					data-testid="cn-flow-tasks-done-toggle"
					@click="doneOpen = !doneOpen">
					{{ t('nextcloud-vue', 'Done ({count})', { count: doneTasks.length }) }}
				</NcButton>
				<ul v-if="doneOpen" class="cn-flow-tasks__list" data-testid="cn-flow-tasks-done">
					<li v-for="task in doneTasks" :key="uuidOf(task)" class="cn-flow-tasks__row">
						<a :href="deepLink(task)" class="cn-flow-tasks__title">{{ task.title }}</a>
						<span class="cn-flow-tasks__state">{{ stateText(task) }}</span>
					</li>
				</ul>
			</div>
		</template>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDateTimePickerNative, NcLoadingIcon, NcNoteCard, NcSelect, NcTextField } from '@nextcloud/vue'
import { taskDeepLink, taskDueLabel } from '../../composables/indexSources.js'
import { useTaskInboxStore } from '../../composables/useTaskInboxStore.js'
import { searchGroupSharees } from '../../utils/searchGroupSharees.js'
import { searchNextcloudUsers } from '../../utils/userAutocomplete.js'

/** The verbs this panel has a control for, in the order a row shows them. */
const VERBS = ['claim', 'unclaim', 'reassign', 'complete', 'cancel']

/** States after which a task is finished. */
const TERMINAL_STATES = ['completed', 'terminated', 'cancelled', 'canceled']

/**
 * CnFlowTasksPanel — the `flow-tasks` source of `CnTasksTab`: the OpenRegister
 * flow tasks anchored on one record. Lists them (open ones first by due date,
 * finished ones folded under "Done", overdue marked), creates a task on the
 * record with an assignee (a user, or a group as a pool) and a due date, and
 * offers on each row exactly the verbs in the row's `can` list. A verb the
 * server refuses shows its message on the row and leaves the row unchanged.
 * Rendered by `CnTasksTab` when `source="flow-tasks"`.
 */
export default {
	name: 'CnFlowTasksPanel',

	components: { NcButton, NcDateTimePickerNative, NcLoadingIcon, NcNoteCard, NcSelect, NcTextField },

	props: {
		/** Uuid of the record the tasks hang on. */
		objectId: {
			type: String,
			required: true,
		},

		/** Register of the record (sent as `registerId`). */
		register: {
			type: String,
			default: '',
		},

		/** Schema of the record (sent as `schemaId`). */
		schema: {
			type: String,
			default: '',
		},
	},

	emits: ['count'],

	data() {
		return {
			tasks: [],
			loading: false,
			saving: false,
			title: '',
			description: '',
			due: null,
			assignee: null,
			formError: '',
			assigneeOptions: [],
			userOptions: [],
			searching: false,
			rowErrors: {},
			busy: '',
			reassigning: '',
			doneOpen: false,
		}
	},

	computed: {
		openTasks() {
			return this.tasks
				.filter((task) => !this.isFinished(task))
				.sort((a, b) => {
					const left = a.dueAt ? new Date(a.dueAt).getTime() : Infinity
					const right = b.dueAt ? new Date(b.dueAt).getTime() : Infinity
					return left - right
				})
		},

		doneTasks() {
			return this.tasks.filter((task) => this.isFinished(task))
		},
	},

	watch: {
		objectId: {
			immediate: true,
			handler() {
				this.load()
			},
		},

		openTasks(list) {
			/** @event count Emitted with the number of open tasks, for the tab badge. */
			this.$emit('count', list.length)
		},
	},

	methods: {
		t,

		uuidOf(task) {
			return String(task.uuid || task.id || '')
		},

		deepLink(task) {
			return taskDeepLink(this.uuidOf(task))
		},

		isFinished(task) {
			return task.isTerminal === true || TERMINAL_STATES.includes(String(task.state || '').toLowerCase())
		},

		isOverdue(task) {
			if (task.overdue === true) {
				return true
			}
			return !!task.dueAt && !this.isFinished(task) && new Date(task.dueAt).getTime() < Date.now()
		},

		dueText(task) {
			const label = taskDueLabel(task)
			if (label !== '') {
				return label
			}
			const d = new Date(task.dueAt)
			const date = Number.isNaN(d.getTime()) ? String(task.dueAt) : d.toLocaleDateString()
			return this.isOverdue(task) ? t('nextcloud-vue', 'Overdue: {date}', { date }) : date
		},

		stateText(task) {
			return String(task.state || '')
		},

		whoOf(task) {
			if (task.assignee) {
				return task.assigneeName || task.assignee
			}
			const groups = Array.isArray(task.candidateGroups) ? task.candidateGroups : []
			return groups.length > 0 ? t('nextcloud-vue', 'Pool: {groups}', { groups: groups.join(', ') }) : t('nextcloud-vue', 'Unassigned')
		},

		/**
		 * The verbs a row offers: exactly the ones in its `can` list that this
		 * panel has a control for. Nothing is derived from state, assignee or
		 * requester; a row without `can` offers none.
		 *
		 * @param {object} task The task row.
		 * @return {string[]} The verbs, in display order.
		 */
		verbsOf(task) {
			const can = Array.isArray(task.can) ? task.can : []
			return VERBS.filter((verb) => can.includes(verb))
		},

		verbLabel(verb) {
			const labels = {
				claim: t('nextcloud-vue', 'Claim'),
				unclaim: t('nextcloud-vue', 'Unclaim'),
				reassign: t('nextcloud-vue', 'Reassign'),
				complete: t('nextcloud-vue', 'Complete'),
				cancel: t('nextcloud-vue', 'Cancel'),
			}
			return labels[verb] || verb
		},

		async load() {
			if (!this.objectId) {
				return
			}
			this.loading = true
			try {
				const { results } = await useTaskInboxStore().fetchFor({ objectUuid: this.objectId, scope: 'all' })
				this.tasks = results
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error('[CnFlowTasksPanel] Loading the tasks failed', error)
				this.tasks = []
			} finally {
				this.loading = false
			}
		},

		async searchAssignees(query) {
			this.searching = true
			const [users, groups] = await Promise.all([
				searchNextcloudUsers(query || '', { limit: 10 }),
				searchGroupSharees(query || '', { limit: 10 }),
			])
			this.searching = false
			this.assigneeOptions = [
				...users.map((u) => ({ kind: 'user', id: u.id, label: u.label || u.displayName || u.id })),
				...groups.map((g) => ({ kind: 'group', id: g.id, label: t('nextcloud-vue', '{name} (group)', { name: g.label }) })),
			]
		},

		async searchUsers(query) {
			const users = await searchNextcloudUsers(query || '', { limit: 10 })
			this.userOptions = users.map((u) => ({ kind: 'user', id: u.id, label: u.label || u.displayName || u.id }))
		},

		async addTask() {
			if (!this.title.trim() || this.saving) {
				return
			}
			this.saving = true
			this.formError = ''
			const result = await useTaskInboxStore().createTask({
				title: this.title,
				description: this.description,
				dueAt: this.due ? new Date(this.due).toISOString() : '',
				anchor: { objectUuid: this.objectId, registerId: this.register, schemaId: this.schema },
				assignee: this.assignee ? { kind: this.assignee.kind, id: this.assignee.id } : null,
			})
			this.saving = false
			if (!result.ok) {
				this.formError = result.status === 404
					? t('nextcloud-vue', 'You can no longer open this record.')
					: (result.message || t('nextcloud-vue', 'The task could not be created.'))
				return
			}
			this.title = ''
			this.description = ''
			this.due = null
			this.assignee = null
			await this.load()
		},

		async onVerb(task, verb) {
			if (verb === 'reassign') {
				this.reassigning = this.reassigning === this.uuidOf(task) ? '' : this.uuidOf(task)
				return
			}
			await this.run(task, verb, {})
		},

		async reassign(task, option) {
			if (!option || !option.id) {
				return
			}
			this.reassigning = ''
			await this.run(task, 'reassign', { assignee: option.id })
		},

		async run(task, verb, body) {
			const uuid = this.uuidOf(task)
			this.busy = uuid
			this.rowErrors = { ...this.rowErrors, [uuid]: '' }
			const result = await useTaskInboxStore().runVerb(uuid, verb, body)
			this.busy = ''
			if (!result.ok) {
				// The row stays exactly as it was, with the server's words on it.
				this.rowErrors = { ...this.rowErrors, [uuid]: result.message || t('nextcloud-vue', 'The server refused this.') }
				return
			}
			await this.load()
		},
	},
}
</script>

<style scoped>
.cn-flow-tasks__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-flow-tasks__row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 4px 8px;
	padding: 8px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-flow-tasks__title {
	flex: 1 1 100%;
	font-weight: bold;
}

.cn-flow-tasks__meta,
.cn-flow-tasks__state {
	color: var(--color-text-maxcontrast);
}

.cn-flow-tasks__due--overdue {
	color: var(--color-error-text);
	font-weight: bold;
}

.cn-flow-tasks__verbs {
	display: inline-flex;
	gap: 4px;
	flex-wrap: wrap;
}

.cn-flow-tasks__error {
	flex: 1 1 100%;
	margin: 0;
	color: var(--color-error-text);
}
</style>

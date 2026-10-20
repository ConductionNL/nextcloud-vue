<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-tasks-widget" :class="{ 'cn-tasks-widget--list': isList }">
		<!-- One quiet line on failure, never a leaked axios status string
		     (ADR-062). The real error goes to the console. -->
		<p v-if="error" class="cn-tasks-widget__error">
			{{ tr('Could not load the tasks') }}
		</p>
		<div v-else-if="loading && rows.length === 0" class="cn-tasks-widget__loading">
			<NcLoadingIcon :size="24" />
		</div>
		<!-- An empty inbox is the GOOD state, not an error and not a void:
		     one muted line, no illustration. -->
		<template v-else-if="isTable">
			<!-- The create form the header's "New task" opens: a title and a
			     deadline, posted as an open task on this record. -->
			<form
				v-if="createOpen"
				class="cn-tasks-widget__create"
				data-testid="cn-tasks-widget-create"
				@submit.prevent="createTask">
				<NcTextField
					:modelValue="newTitle"
					:label="tr('Task')"
					data-testid="cn-tasks-widget-create-title"
					@update:modelValue="(value) => (newTitle = String(value ?? ''))" />
				<NcTextField
					:modelValue="newDue"
					type="date"
					:label="tr('Deadline')"
					data-testid="cn-tasks-widget-create-due"
					@update:modelValue="(value) => (newDue = String(value ?? ''))" />
				<NcButton
					type="submit"
					variant="primary"
					:disabled="creating || newTitle.trim() === ''"
					data-testid="cn-tasks-widget-create-save">
					{{ tr('Add task') }}
				</NcButton>
			</form>
			<p v-if="tableRows.length === 0" class="cn-tasks-widget__empty">
				{{ emptyLabel }}
			</p>
			<table v-else class="cn-tasks-widget__table" data-testid="cn-tasks-widget-table">
				<thead>
					<tr>
						<th scope="col">
							{{ tr('Task') }}
						</th>
						<th scope="col">
							{{ tr('Handler') }}
						</th>
						<th scope="col">
							{{ tr('Deadline') }}
						</th>
						<th scope="col">
							{{ tr('Status') }}
						</th>
						<th scope="col">
							<span class="hidden-visually">{{ tr('Task actions') }}</span>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="task in tableRows"
						:key="task.uuid"
						class="cn-tasks-widget__table-row"
						:class="{ 'cn-tasks-widget__table-row--done': task.isTerminal === true }"
						:data-state="task.state"
						:data-testid="`cn-tasks-widget-row-${task.uuid}`">
						<td class="cn-tasks-widget__cell-task">
							<CheckCircle
								v-if="task.isTerminal === true"
								:size="20"
								class="cn-tasks-widget__state-icon cn-tasks-widget__state-icon--done" />
							<CircleOutline v-else :size="20" class="cn-tasks-widget__state-icon" />
							<span class="cn-tasks-widget__body">
								<button
									type="button"
									class="cn-tasks-widget__name"
									@click="onRowClick(task, $event)"
									@auxclick="onRowAuxClick(task, $event)">
									{{ titleOf(task) }}
								</button>
								<span v-if="tableMeta(task)" class="cn-tasks-widget__meta">{{ tableMeta(task) }}</span>
							</span>
						</td>
						<td class="cn-tasks-widget__cell-handler">
							<span v-if="task.assignee" class="cn-tasks-widget__handler">
								<NcAvatar
									:user="String(task.assignee)"
									:displayName="handlerName(task)"
									:size="28"
									hideStatus />
								{{ handlerName(task) }}
							</span>
							<span v-else class="cn-tasks-widget__meta">{{ tr('Unassigned') }}</span>
						</td>
						<td
							class="cn-tasks-widget__cell-due"
							:class="{ 'cn-tasks-widget__due--overdue': task.overdue === true && task.isTerminal !== true }">
							{{ dueLabel(task) }}
						</td>
						<td>
							<CnStatusBadge :label="stateLabel(task)" :variant="task.isTerminal === true ? 'default' : 'info'" />
						</td>
						<td class="cn-tasks-widget__cell-actions">
							<NcButton
								v-if="canClaim(task)"
								variant="secondary"
								:data-testid="`cn-tasks-widget-claim-${task.uuid}`"
								@click="claim(task)">
								{{ tr('Claim') }}
							</NcButton>
							<NcButton
								v-else-if="canCompleteRow(task) && outcomesOf(task).length === 1"
								variant="secondary"
								:data-testid="`cn-tasks-widget-complete-${task.uuid}`"
								@click="complete(task, outcomeId(outcomesOf(task)[0]))">
								{{ tr('Complete') }}
							</NcButton>
							<NcActions
								v-if="(canCompleteRow(task) && outcomesOf(task).length > 1) || canCancelRow(task)"
								:forceMenu="true"
								:aria-label="tr('Task actions')">
								<template v-if="canCompleteRow(task) && outcomesOf(task).length > 1">
									<NcActionButton
										v-for="outcome in outcomesOf(task)"
										:key="outcomeId(outcome)"
										:closeAfterClick="true"
										@click="complete(task, outcomeId(outcome))">
										{{ completeLabel(outcome) }}
									</NcActionButton>
								</template>
								<NcActionButton
									v-if="canCancelRow(task)"
									:closeAfterClick="true"
									:data-testid="`cn-tasks-widget-cancel-${task.uuid}`"
									@click="cancel(task)">
									{{ tr('Cancel task') }}
								</NcActionButton>
							</NcActions>
						</td>
					</tr>
				</tbody>
			</table>
		</template>
		<p v-else-if="rows.length === 0" class="cn-tasks-widget__empty">
			{{ emptyLabel }}
		</p>
		<template v-else>
			<!-- The count states the server TOTAL, never the rendered length
			     (ADR-062): the number a person acts on is how much work
			     exists, not how much fits the cell. -->
			<p v-if="!isList" class="cn-tasks-widget__count">
				{{ countLabel }}
			</p>
			<ul class="cn-tasks-widget__list">
				<li
					v-for="task in rows"
					:key="task.uuid"
					class="cn-tasks-widget__row"
					:data-state="task.state"
					@click="onRowClick(task, $event)"
					@mousedown="preventMiddleClickAutoscroll"
					@auxclick="onRowAuxClick(task, $event)">
					<!-- List variant: a checkbox completes the viewer's own task
					     (the task with a declared outcome list keeps the menu, as
					     a checkbox cannot choose an outcome). Other rows get a
					     spacer so the titles stay aligned. -->
					<template v-if="isList">
						<input
							v-if="canCheck(task)"
							type="checkbox"
							class="cn-tasks-widget__check"
							:checked="completing.includes(String(task.uuid))"
							:disabled="completing.includes(String(task.uuid))"
							:aria-label="tr('Mark {title} as done').replace('{title}', titleOf(task))"
							data-testid="cn-tasks-widget-check"
							@click.stop
							@change="check(task)">
						<span v-else class="cn-tasks-widget__check-spacer" aria-hidden="true" />
						<span class="cn-tasks-widget__body">
							<span class="cn-tasks-widget__name">{{ titleOf(task) }}</span>
							<span class="cn-tasks-widget__meta cn-tasks-widget__meta--split">
								<span class="cn-tasks-widget__subject">{{ subjectOf(task) }}</span>
								<span
									class="cn-tasks-widget__due"
									:class="{ 'cn-tasks-widget__due--overdue': task.overdue === true }">
									{{ dueLabel(task) }}
								</span>
							</span>
						</span>
					</template>
					<template v-else>
						<span class="cn-tasks-widget__body">
							<span class="cn-tasks-widget__name">{{ titleOf(task) }}</span>
							<span class="cn-tasks-widget__meta">{{ metaLine(task) }}</span>
						</span>
						<!-- Overdue is carried by the WORDING (taskDueLabel) and by
						     weight; the colour only reinforces it. -->
						<span
							class="cn-tasks-widget__due"
							:class="{ 'cn-tasks-widget__due--overdue': task.overdue === true }">
							{{ dueLabel(task) }}
						</span>
					</template>
					<!-- Only verbs the contract can accept are offered; the
					     server still authorizes, and a refusal is toasted in
					     its own words. Stopped clicks: the menu must not also
					     open the row. -->
					<NcActions
						v-if="(canClaim(task) || canComplete(task)) && !(isList && canCheck(task))"
						class="cn-tasks-widget__actions"
						:forceMenu="true"
						:aria-label="tr('Task actions')"
						@click.stop>
						<NcActionButton
							v-if="canClaim(task)"
							:closeAfterClick="true"
							@click="claim(task)">
							{{ tr('Claim') }}
						</NcActionButton>
						<template v-if="canComplete(task)">
							<NcActionButton
								v-for="outcome in outcomesOf(task)"
								:key="outcomeId(outcome)"
								:closeAfterClick="true"
								@click="complete(task, outcomeId(outcome))">
								{{ completeLabel(outcome) }}
							</NcActionButton>
						</template>
					</NcActions>
				</li>
			</ul>
			<!-- The remainder is a count, never a scrollbar (ADR-062). -->
			<p v-if="hiddenCount > 0" class="cn-tasks-widget__more">
				{{ moreLabel }}
			</p>
		</template>
	</div>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
import { showError } from '@nextcloud/dialogs'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcActionButton, NcActions, NcAvatar, NcButton, NcLoadingIcon, NcTextField } from '@nextcloud/vue'
import { inject, ref } from 'vue'
import CheckCircle from 'vue-material-design-icons/CheckCircle.vue'
import CircleOutline from 'vue-material-design-icons/CircleOutline.vue'
import CnStatusBadge from '../CnStatusBadge/CnStatusBadge.vue'
import { taskDeepLink, taskDueLabel } from '../../composables/indexSources.js'
import { useEndpointSource } from '../../composables/useEndpointSource.js'
import { contentHeaderLink } from '../../utils/contentHeaderLink.js'
import { openRowTarget } from '../../utils/linkNavigation.js'
import { isRowMiddleClick, preventMiddleClickAutoscroll } from '../../utils/rowAuxClick.js'
import { userDisplayName } from '../../utils/userDisplayName.js'

/**
 * The OpenRegister inbox read (openregister flow-task-entity). One endpoint
 * for the whole fleet: every app's human tasks live on OpenRegister's one
 * task store, so the widget is app-agnostic and ships no controller.
 *
 * @type {string}
 */
const FLOW_TASKS_URL = '/apps/openregister/api/flow-tasks'

/**
 * The CMMN states, in the reading a dashboard needs. Labels double as the
 * meta-line words, so state never rests on styling.
 *
 * @type {Record<string, string>}
 */
const STATE_LABELS = {
	available: 'Available',
	enabled: 'Ready to claim',
	active: 'In progress',
	completed: 'Completed',
	terminated: 'Terminated',
	disabled: 'Disabled',
}

/**
 * The priority vocabulary (openregister Task::PRIORITIES).
 *
 * @type {Record<string, string>}
 */
const PRIORITY_LABELS = {
	low: 'Low',
	normal: 'Normal',
	high: 'High',
	urgent: 'Urgent',
}

/**
 * CnTasksWidget — the viewer's open tasks, from OpenRegister's task inbox.
 *
 * Reads `flow-tasks` with `isTerminal=false` (an inbox widget that showed
 * finished tasks would never drain), scoped by `content.scope` and sorted by
 * due date so the most urgent row sits on top. Placed by its registry type
 * key `tasks`:
 *
 * ```js
 * { id: 'my-tasks', type: 'tasks', title: 'My tasks',
 *   content: { scope: 'assigned', limit: 6, pollSeconds: 30 } }
 * ```
 *
 * Why it polls: tasks are handed out, claimed and completed by OTHER people
 * and by flows, so a widget that only reflected its mount moment would be
 * wrong within minutes and look identical to being right. Polling pauses
 * while the tab is hidden.
 *
 * Quick actions offer only what the row's contract can accept: claim on a
 * pooled row, complete (per declared outcome) on the viewer's own open row.
 * The server still authorizes; a refusal surfaces its `error` message as a
 * toast and the widget refetches, so a lost claim race corrects the row.
 *
 * @spec openspec/changes/cn-tasks-entity-source/specs/cn-tasks-entity-source/spec.md
 */
export default {
	name: 'CnTasksWidget',

	components: {
		CheckCircle,
		CircleOutline,
		CnStatusBadge,
		NcActions,
		NcActionButton,
		NcAvatar,
		NcButton,
		NcLoadingIcon,
		NcTextField,
	},

	inject: {
		/**
		 * Host translate function, provided by CnAppRoot (identity by default)
		 * so a library string localises through the consuming app's l10n.
		 */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget's persisted configuration blob.
		 *
		 * - `scope` — whose relationship to list: `assigned` (default),
		 *   `pooled`, `watched` or `all`. Whose INBOX it is stays the
		 *   endpoint's decision; scope never names another user.
		 * - `limit` — rows to request AND show (1–50, default 6). The count
		 *   line always states the server total regardless of this cap.
		 * - `pollSeconds` — refetch interval (default 30; `0` disables).
		 * - `rowRoute` — vue-router route NAME to open on a row click,
		 *   receiving the task uuid as `:id`. Omitted = the click opens the
		 *   task's openregister deep link instead.
		 * - `emptyText` — override for the empty-inbox line.
		 * - `variant` — `list` draws a checkbox list: a checkbox that completes
		 *   the viewer's own task, the title, the subject on a second muted
		 *   line and the due date at its right. Default: the compact rows.
		 * - `viewAllRoute` / `viewAllLabel` — a "View all" text link in the
		 *   card header: a route name or location `{ name, params?, query? }`,
		 *   and its label (default "View all"). `headerLink` works too.
		 * - `objectUuid` — the tasks on one record (`"@objectId"` reads the
		 *   page's record), every assignee's, instead of the viewer's inbox.
		 * - `includeDone` — also list finished tasks (after the open ones).
		 * - `variant: 'table'` — the record's task table (board DqZaakTaken):
		 *   task, handler, deadline, status and the row's verbs, with the
		 *   summary ("1 open, 3 done · sorted by deadline") and a "New task"
		 *   action in the card header.
		 * - `create` — offer "New task": `true`, or `{ appId?, label? }`; the
		 *   task is posted as an open task on `objectUuid`.
		 * - `completeAny` — offer Complete on every open row, not only the
		 *   viewer's own (the server still decides); `cancel` — offer Cancel.
		 *
		 * @type {{scope?: string, limit?: number, pollSeconds?: number, rowRoute?: string, emptyText?: string, variant?: string, viewAllRoute?: (string|object), viewAllLabel?: string, objectUuid?: string, includeDone?: boolean, create?: (boolean|{appId?: string, label?: string}), completeAny?: boolean, cancel?: boolean}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * Widget placement id, so the per-widget Refresh action
		 * (`cn:widget:refresh`) reaches this instance's fetch.
		 */
		widgetId: {
			type: String,
			default: '',
		},

		/** The page's record id, for `objectUuid: "@objectId"`. */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/**
		 * Translate function. Falls back to the injected `cnTranslate`.
		 * Provide explicitly when mounting outside a CnAppRoot ancestor.
		 *
		 * @type {((key: string) => string)|null}
		 */
		translate: {
			type: Function,
			default: null,
		},
	},

	emits: ['header'],

	setup(props) {
		// The shared endpoint engine owns request dedup, the short-TTL cache
		// and the cn:page:refresh / cn:widget:refresh subscriptions — the
		// same binding CnFlowRunsWidget uses, so a page-level Refresh updates
		// this widget with everything else on the page.
		const widgetIdRef = ref(props.widgetId)
		const source = () => {
			const content = props.content || {}
			const objectUuid = recordUuid(content.objectUuid, props.objectId)
			const params = {
				// A record's tasks are everyone's: scoping them to the viewer
				// would make the record look finished while a colleague works.
				scope: objectUuid !== '' && !content.scope ? 'all' : normaliseScope(content.scope),
				// Ascending due date: the most urgent (overdue first) on top.
				sort: 'dueAt',
				limit: normaliseLimit(content.limit),
			}
			if (objectUuid !== '') {
				params.objectUuid = objectUuid
			}
			// An inbox drains: finished tasks leave the widget, unless the
			// widget lists a record's work, done included (`includeDone`).
			if (content.includeDone !== true) {
				params.isTerminal = 'false'
			}
			return { url: FLOW_TASKS_URL, method: 'GET', params }
		}
		const { data, loading, error, refetch } = useEndpointSource(source, {
			widgetId: widgetIdRef,
		})

		// `inject` is re-read in setup so Vue 2.7 and Vue 3 resolve it
		// identically to the Options `inject` block (CnStatWidget precedent).
		const injectedTranslate = inject('cnTranslate', null)

		return {
			payload: data,
			loading,
			error,
			refetch,
			injectedTranslate,
		}
	},

	data() {
		return {
			pollTimer: null,
			/** Uuids of the tasks a checkbox is completing, until the next read. */
			completing: [],
			/** Whether the table's create form is open. */
			createOpen: false,
			/** The new task's title and deadline. */
			newTitle: '',
			newDue: '',
			/** Whether the new task is being posted. */
			creating: false,
		}
	},

	computed: {
		/**
		 * Whether the rows draw as the checkbox list (`content.variant: 'list'`).
		 *
		 * @return {boolean}
		 */
		isList() {
			return this.content.variant === 'list'
		},

		/**
		 * Whether the rows draw as the record's task table (`variant: 'table'`).
		 *
		 * @return {boolean}
		 * @spec openspec/changes/record-task-table/specs/record-task-table/spec.md#requirement-a-records-tasks-show-as-a-table-with-their-summary-and-new-task-in-the-header
		 */
		isTable() {
			return this.content.variant === 'table'
		},

		/**
		 * The table's rows: the open tasks first, then the finished ones, each
		 * in due order as the endpoint sorted them.
		 *
		 * @return {Array<object>} The rows.
		 * @spec openspec/changes/record-task-table/specs/record-task-table/spec.md#requirement-a-records-tasks-show-as-a-table-with-their-summary-and-new-task-in-the-header
		 */
		tableRows() {
			return [...this.rows.filter((task) => task.isTerminal !== true), ...this.rows.filter((task) => task.isTerminal === true)]
		},

		/**
		 * The table's summary for the card header: "1 open, 3 done · sorted by deadline".
		 *
		 * @return {string} The line.
		 * @spec openspec/changes/record-task-table/specs/record-task-table/spec.md#requirement-a-records-tasks-show-as-a-table-with-their-summary-and-new-task-in-the-header
		 */
		summaryLabel() {
			const open = this.rows.filter((task) => task.isTerminal !== true).length
			const done = this.rows.length - open
			return this.tr('{open} open, {done} done · sorted by deadline')
				.replace('{open}', String(open))
				.replace('{done}', String(done))
		},

		/**
		 * The card header's parts: the "View all" link, and for the table the
		 * summary under the title and the "New task" action.
		 *
		 * @return {object} The header.
		 * @spec openspec/changes/record-task-table/specs/record-task-table/spec.md#requirement-a-records-tasks-show-as-a-table-with-their-summary-and-new-task-in-the-header
		 */
		header() {
			const header = { link: this.headerLink, note: '' }
			if (!this.isTable) {
				return header
			}
			header.subtitle = this.loading && this.rows.length === 0 ? '' : this.summaryLabel
			if (this.content.create && this.recordUuid !== '') {
				const label = typeof this.content.create === 'object' && this.content.create.label ? this.tr(this.content.create.label) : this.tr('New task')
				header.action = { label, icon: 'Plus', variant: 'primary', run: this.toggleCreate }
			}
			return header
		},

		/**
		 * The record the table lists tasks for, '' without one.
		 *
		 * @return {string} The uuid.
		 */
		recordUuid() {
			return recordUuid(this.content.objectUuid, this.objectId)
		},

		/**
		 * The header "View all" link the content declares, or null.
		 *
		 * @return {object|null}
		 */
		headerLink() {
			return contentHeaderLink(this.content)
		},

		/**
		 * Effective translate function: the explicit prop, then the injected
		 * host one, then `@nextcloud/l10n` under the library's own app id.
		 *
		 * @return {(key: string) => string}
		 */
		tr() {
			const fn = this.translate ?? this.injectedTranslate ?? this.cnTranslate
			if (typeof fn === 'function') {
				return (key) => fn(key)
			}
			return (key) => t('nextcloud-vue', key)
		},

		/**
		 * The signed-in viewer's uid, for the per-row action offer. Empty
		 * outside a Nextcloud session (the offer then collapses to claim on
		 * pooled rows only, which is the safe reading).
		 *
		 * @return {string} The uid, or ''.
		 */
		viewerUid() {
			return getCurrentUser()?.uid || ''
		},

		/**
		 * The rows to render — the endpoint's bounded page, defensively
		 * re-capped so a wider server default can never overflow the cell.
		 *
		 * @return {Array<object>} The task rows.
		 */
		rows() {
			const results = (this.payload && this.payload.results) || []
			if (Array.isArray(results) === false) {
				return []
			}
			return results.slice(0, normaliseLimit(this.content.limit))
		},

		/**
		 * The server's honest total, independent of the rendered page.
		 *
		 * @return {number} The open-task total (never negative).
		 */
		total() {
			const total = Number((this.payload && this.payload.total) ?? this.rows.length)
			if (Number.isFinite(total) === false) {
				return 0
			}
			return Math.max(0, total)
		},

		/** The count line above the rows. */
		countLabel() {
			if (this.total === 1) {
				return this.tr('1 open task')
			}
			return this.tr('{count} open tasks').replace('{count}', String(this.total))
		},

		/**
		 * How many open tasks exist beyond the rendered rows.
		 *
		 * @return {number} The hidden task count (never negative).
		 */
		hiddenCount() {
			return Math.max(0, this.total - this.rows.length)
		},

		/** The "+N more" line. */
		moreLabel() {
			return this.tr('+{count} more').replace('{count}', String(this.hiddenCount))
		},

		/** The empty-inbox line. */
		emptyLabel() {
			const override = this.content.emptyText
			if (typeof override === 'string' && override !== '') {
				return this.tr(override)
			}
			return this.tr('No open tasks')
		},

		/**
		 * Poll interval in ms, or 0 when polling is off. Floored at 5s so a
		 * mis-authored `pollSeconds: 0.1` cannot turn a dashboard into a
		 * request storm; `0` remains an explicit opt-out.
		 *
		 * @return {number} The interval in milliseconds.
		 */
		pollMs() {
			const raw = this.content.pollSeconds
			const seconds = (raw === undefined || raw === null) ? 30 : Number(raw)
			if (Number.isFinite(seconds) === false || seconds <= 0) {
				return 0
			}
			return Math.max(5, seconds) * 1000
		},
	},

	watch: {
		header: {
			immediate: true,
			handler(header) {
				/**
				 * @event header Emitted with the card header's parts: the "View all" link, if any, and for the table its summary and "New task".
				 * @type {{link: (object|null), note: string, subtitle?: string, action?: object}}
				 */
				this.$emit('header', header)
			},
		},
	},

	mounted() {
		this.startPolling()
		document.addEventListener('visibilitychange', this.onVisibilityChange)
	},

	beforeUnmount() {
		this.stopPolling()
		document.removeEventListener('visibilitychange', this.onVisibilityChange)
	},

	methods: {
		preventMiddleClickAutoscroll,

		/**
		 * Start (or restart) the refetch interval, unless polling is off.
		 *
		 * @return {void}
		 */
		startPolling() {
			this.stopPolling()
			if (this.pollMs === 0 || document.hidden === true) {
				return
			}
			this.pollTimer = setInterval(() => {
				this.refetch(true)
			}, this.pollMs)
		},

		/**
		 * Clear the refetch interval.
		 *
		 * @return {void}
		 */
		stopPolling() {
			if (this.pollTimer !== null) {
				clearInterval(this.pollTimer)
				this.pollTimer = null
			}
		},

		/**
		 * Pause polling while the tab is hidden; refetch once and resume on
		 * return, so the dashboard shows current work rather than whatever
		 * was true when the tab was backgrounded.
		 *
		 * @return {void}
		 */
		onVisibilityChange() {
			if (document.hidden === true) {
				this.stopPolling()
				return
			}
			this.refetch(true)
			this.startPolling()
		},

		/**
		 * The row's display title (server-synthesized when untitled).
		 *
		 * @param {object} task The task row.
		 * @return {string} The title.
		 */
		titleOf(task) {
			return task.displayTitle || task.title || String(task.uuid || '')
		},

		/**
		 * The subject (the case a task sits on), for the list variant's second line.
		 *
		 * @param {object} task The task row.
		 * @return {string} The subject's title, or ''.
		 */
		subjectOf(task) {
			return task.subject && task.subject.title ? String(task.subject.title) : ''
		},

		/**
		 * Whether the list variant draws a checkbox on the row: the viewer's own
		 * open task, with no outcome list to choose from.
		 *
		 * @param {object} task The task row.
		 * @return {boolean}
		 */
		canCheck(task) {
			return this.canComplete(task) && !(Array.isArray(task.outcomes) && task.outcomes.length > 0)
		},

		/**
		 * Complete a task from its checkbox, with the server's default outcome.
		 *
		 * @param {object} task The task row.
		 * @return {Promise<void>}
		 */
		async check(task) {
			const uuid = String(task.uuid || '')
			if (uuid === '' || this.completing.includes(uuid)) {
				return
			}
			this.completing = [...this.completing, uuid]
			await this.postVerb(task, 'complete', { outcome: 'done' })
			this.completing = this.completing.filter((id) => id !== uuid)
		},

		/**
		 * The secondary line: subject, state and priority — whichever of
		 * those the row actually carries, in words.
		 *
		 * @param {object} task The task row.
		 * @return {string} The meta line.
		 */
		metaLine(task) {
			const parts = []
			if (task.subject && task.subject.title) {
				parts.push(String(task.subject.title))
			}
			const state = STATE_LABELS[task.state]
			parts.push(state ? this.tr(state) : String(task.state || ''))
			const priority = PRIORITY_LABELS[task.priority]
			if (priority && task.priority !== 'normal') {
				parts.push(this.tr(priority))
			}
			return parts.join(' · ')
		},

		/**
		 * The due wording for a row, from the server's derived projection.
		 *
		 * @param {object} task The task row.
		 * @return {string} The due label, or '' without a due date.
		 */
		dueLabel(task) {
			return taskDueLabel(task)
		},

		/**
		 * Whether the row offers claim: pooled (no assignee) and still open.
		 *
		 * @param {object} task The task row.
		 * @return {boolean} True when claim is offered.
		 */
		canClaim(task) {
			return !task.assignee && task.isTerminal !== true
		},

		/**
		 * Whether the row offers complete: the viewer's own open task.
		 *
		 * @param {object} task The task row.
		 * @return {boolean} True when complete is offered.
		 */
		canComplete(task) {
			return this.viewerUid !== ''
				&& task.assignee === this.viewerUid
				&& task.isTerminal !== true
		},

		/**
		 * Whether a table row offers Complete: the viewer's own open task, or
		 * any open task with `completeAny` (the server still decides).
		 *
		 * @param {object} task The task row.
		 * @return {boolean}
		 * @spec openspec/changes/record-task-table/specs/record-task-table/spec.md#requirement-a-records-tasks-show-as-a-table-with-their-summary-and-new-task-in-the-header
		 */
		canCompleteRow(task) {
			if (task.isTerminal === true || this.canClaim(task)) {
				return false
			}
			return this.content.completeAny === true || this.canComplete(task)
		},

		/**
		 * Whether a table row offers Cancel (`content.cancel`), for an open task.
		 *
		 * @param {object} task The task row.
		 * @return {boolean}
		 */
		canCancelRow(task) {
			return this.content.cancel === true && task.isTerminal !== true
		},

		/**
		 * Cancel a task.
		 *
		 * @param {object} task The task row.
		 * @return {Promise<void>} Resolves when the verb settled.
		 */
		cancel(task) {
			return this.postVerb(task, 'cancel', {})
		},

		/**
		 * The handler's display name, the uid until it resolves.
		 *
		 * @param {object} task The task row.
		 * @return {string} The name.
		 */
		handlerName(task) {
			return userDisplayName(task.assignee) || String(task.assignee || '')
		},

		/**
		 * A table row's status in words.
		 *
		 * @param {object} task The task row.
		 * @return {string} The label.
		 */
		stateLabel(task) {
			const state = STATE_LABELS[task.state]
			return state ? this.tr(state) : String(task.state || '')
		},

		/**
		 * A table row's second line: its description and a priority above normal.
		 *
		 * @param {object} task The task row.
		 * @return {string} The line, or ''.
		 */
		tableMeta(task) {
			const parts = []
			if (typeof task.description === 'string' && task.description.trim() !== '') {
				parts.push(task.description.trim().split('\n')[0])
			}
			const priority = PRIORITY_LABELS[task.priority]
			if (priority && task.priority !== 'normal') {
				parts.push(this.tr(priority))
			}
			return parts.join(' · ')
		},

		/**
		 * Open or close the create form (the header's "New task").
		 *
		 * @return {void}
		 */
		toggleCreate() {
			this.createOpen = !this.createOpen
		},

		/**
		 * Post the create form as an open task on the record, then refetch.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/record-task-table/specs/record-task-table/spec.md#requirement-a-records-tasks-show-as-a-table-with-their-summary-and-new-task-in-the-header
		 */
		async createTask() {
			const title = this.newTitle.trim()
			if (title === '' || this.recordUuid === '' || this.creating) {
				return
			}
			const create = typeof this.content.create === 'object' && this.content.create ? this.content.create : {}
			const payload = { title, objectUuid: this.recordUuid, state: 'available' }
			if (typeof create.appId === 'string' && create.appId !== '') {
				payload.appId = create.appId
			}
			if (this.newDue !== '') {
				payload.dueAt = this.newDue
			}
			this.creating = true
			try {
				await axios.post(generateUrl(FLOW_TASKS_URL), payload)
				this.newTitle = ''
				this.newDue = ''
				this.createOpen = false
			} catch (error) {
				const message = error?.response?.data?.error
				showError(typeof message === 'string' && message !== '' ? message : this.tr('The task could not be added'))
			}
			this.creating = false
			this.refetch(true)
		},

		/**
		 * The outcomes to offer on complete: the row's declared list, else
		 * one entry for the server's default outcome.
		 *
		 * @param {object} task The task row.
		 * @return {Array<object|string>} The outcome entries.
		 */
		outcomesOf(task) {
			if (Array.isArray(task.outcomes) && task.outcomes.length > 0) {
				return task.outcomes
			}
			return ['done']
		},

		/**
		 * The wire value of one outcome entry (a string, or `{id, label}`).
		 *
		 * @param {object|string} outcome The outcome entry.
		 * @return {string} The outcome id.
		 */
		outcomeId(outcome) {
			if (outcome && typeof outcome === 'object') {
				return String(outcome.id ?? outcome.value ?? outcome.label ?? '')
			}
			return String(outcome ?? '')
		},

		/**
		 * The menu label for one complete entry.
		 *
		 * @param {object|string} outcome The outcome entry.
		 * @return {string} The label.
		 */
		completeLabel(outcome) {
			const id = this.outcomeId(outcome)
			const label = (outcome && typeof outcome === 'object' && outcome.label)
				? String(outcome.label)
				: id
			if (id === 'done') {
				return this.tr('Complete')
			}
			return this.tr('Complete: {outcome}').replace('{outcome}', label)
		},

		/**
		 * Claim a pooled task.
		 *
		 * @param {object} task The task row.
		 * @return {Promise<void>} Resolves when the verb settled.
		 */
		claim(task) {
			return this.postVerb(task, 'claim', {})
		},

		/**
		 * Complete the viewer's own task with an outcome.
		 *
		 * @param {object} task The task row.
		 * @param {string} outcome The chosen outcome id.
		 * @return {Promise<void>} Resolves when the verb settled.
		 */
		complete(task, outcome) {
			return this.postVerb(task, 'complete', { outcome })
		},

		/**
		 * POST one lifecycle verb and refetch either way: on success the row
		 * moved, and on a refusal (a lost claim race, a revoked task) the
		 * list is stale in exactly the way the refusal proves. The refusal
		 * itself is toasted in the SERVER'S words (ADR-062 forbids leaking
		 * the raw status line, and the endpoint's `error` string is written
		 * for people).
		 *
		 * @param {object} task The task row.
		 * @param {string} verb The lifecycle verb.
		 * @param {object} body The verb body.
		 * @return {Promise<void>} Resolves when the verb settled.
		 */
		async postVerb(task, verb, body) {
			const uuid = String(task.uuid || '')
			if (uuid === '') {
				return
			}
			try {
				await axios.post(generateUrl(`${FLOW_TASKS_URL}/${uuid}/${verb}`), body)
			} catch (error) {
				const message = error?.response?.data?.error
				showError(typeof message === 'string' && message !== ''
					? message
					: this.tr('The task action was refused'))
			}
			this.refetch(true)
		},

		/**
		 * Open the clicked task: the configured route with the uuid as `id`,
		 * else the task's openregister deep link. A ctrl/cmd/shift or middle
		 * click opens it in a new tab.
		 *
		 * @param {object} task The clicked task row.
		 * @param {MouseEvent} [event] The originating click/auxclick event.
		 * @return {void}
		 */
		onRowClick(task, event) {
			const uuid = String(task.uuid || '')
			if (uuid === '') {
				return
			}
			const rowRoute = this.content.rowRoute
			if (typeof rowRoute === 'string' && rowRoute !== '' && this.$router) {
				openRowTarget(event, { name: rowRoute, params: { id: uuid } }, this.$router)
				return
			}
			openRowTarget(event, taskDeepLink(uuid))
		},

		/**
		 * Middle click on a task row: open it in a new tab.
		 *
		 * @param {object} task The clicked task row.
		 * @param {MouseEvent} event The auxclick event.
		 * @return {void}
		 */
		onRowAuxClick(task, event) {
			if (isRowMiddleClick(event)) {
				this.onRowClick(task, event)
			}
		},
	},
}

/**
 * Clamp a configured row limit into the range the endpoint accepts.
 *
 * @param {unknown} raw The configured limit.
 * @return {number} A limit between 1 and 50 (default 6).
 */
function normaliseLimit(raw) {
	const n = Number(raw)
	if (Number.isFinite(n) === false || n <= 0) {
		return 6
	}
	return Math.min(50, Math.round(n))
}

/**
 * Clamp a configured scope onto the endpoint's vocabulary.
 *
 * @param {unknown} raw The configured scope.
 * @return {string} One of assigned, pooled, watched, all (default assigned).
 */
function normaliseScope(raw) {
	return ['assigned', 'pooled', 'watched', 'all'].includes(raw) ? raw : 'assigned'
}

/**
 * The record a widget lists tasks for: `objectUuid` as written, with
 * `@objectId` read from the page's record.
 *
 * @param {unknown} configured The `objectUuid` setting.
 * @param {unknown} objectId The page's record id.
 * @return {string} The uuid, or ''.
 */
function recordUuid(configured, objectId) {
	if (typeof configured !== 'string' || configured === '') {
		return ''
	}
	return configured === '@objectId' ? String(objectId ?? '') : configured
}
</script>

<style scoped>
/* The record's task table (`variant: 'table'`, board DqZaakTaken): a head
   row of muted 14px labels on a near-white ground, rows divided by hairlines,
   the title at 600 over a muted line, a finished task struck through. */
.cn-tasks-widget__create {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	gap: 12px;
	margin-block-end: 12px;
}

.cn-tasks-widget__table {
	width: 100%;
	border-collapse: collapse;
	font-size: 14px;
}

.cn-tasks-widget__table th {
	padding: 12px 16px;
	background: color-mix(in srgb, var(--color-background-hover) 40%, var(--color-main-background));
	color: var(--color-text-maxcontrast);
	font-weight: 600;
	text-align: start;
	white-space: nowrap;
}

.cn-tasks-widget__table td {
	padding: 12px 16px;
	border-top: 1px solid var(--color-border);
	vertical-align: middle;
}

.cn-tasks-widget__cell-task {
	display: flex;
	align-items: flex-start;
	gap: 12px;
}

.cn-tasks-widget__state-icon {
	flex: none;
	color: var(--color-primary-element);
}

.cn-tasks-widget__state-icon--done {
	color: var(--color-success-text, var(--color-success));
}

.cn-tasks-widget__table .cn-tasks-widget__name {
	margin: 0;
	padding: 0;
	border: 0;
	background: none;
	color: var(--color-main-text);
	font: inherit;
	font-size: 15px;
	font-weight: 600;
	text-align: start;
	cursor: pointer;
}

.cn-tasks-widget__table .cn-tasks-widget__name:hover,
.cn-tasks-widget__table .cn-tasks-widget__name:focus-visible {
	text-decoration: underline;
}

.cn-tasks-widget__table-row--done .cn-tasks-widget__name {
	text-decoration: line-through;
}

.cn-tasks-widget__handler {
	display: inline-flex;
	align-items: center;
	gap: 8px;
}

.cn-tasks-widget__cell-due {
	white-space: nowrap;
}

.cn-tasks-widget__cell-due.cn-tasks-widget__due--overdue {
	color: var(--color-warning-text, var(--color-warning));
	font-weight: 600;
}

.cn-tasks-widget__cell-actions {
	text-align: end;
	white-space: nowrap;
}

.cn-tasks-widget {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.cn-tasks-widget__loading {
	display: flex;
	justify-content: center;
	padding: 8px 0;
}

.cn-tasks-widget__empty,
.cn-tasks-widget__error,
.cn-tasks-widget__more {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-tasks-widget__more {
	padding-top: 4px;
}

.cn-tasks-widget__count {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 12px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.cn-tasks-widget__list {
	list-style: none;
	margin: 0;
	padding: 0;
	min-width: 0;
}

.cn-tasks-widget__row {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 6px 0;
	border-bottom: 1px solid var(--color-border);
	min-width: 0;
	cursor: pointer;
}

.cn-tasks-widget__row:last-child {
	border-bottom: none;
}

.cn-tasks-widget__body {
	display: flex;
	flex-direction: column;
	min-width: 0;
	flex: 1 1 auto;
}

.cn-tasks-widget__name {
	font-weight: 600;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-tasks-widget__row:hover .cn-tasks-widget__name {
	text-decoration: underline;
}

.cn-tasks-widget__meta {
	color: var(--color-text-maxcontrast);
	font-size: 12px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-tasks-widget__due {
	flex: 0 0 auto;
	color: var(--color-text-maxcontrast);
	font-size: 12px;
	font-variant-numeric: tabular-nums;
}

/* List variant, after the dashboard board's My tasks card: a checkbox, the
   title, the subject on a muted second line and the due date at its right. */
.cn-tasks-widget--list .cn-tasks-widget__row {
	align-items: flex-start;
	gap: 12px;
	padding: 12px 0;
}

.cn-tasks-widget--list .cn-tasks-widget__name {
	font-weight: 400;
	font-size: 15px;
	line-height: 1.35;
	color: var(--color-main-text);
}

.cn-tasks-widget__check,
.cn-tasks-widget__check-spacer {
	flex: none;
	width: 20px;
	height: 20px;
	margin: 1px 0 0;
}

.cn-tasks-widget__check {
	accent-color: var(--color-primary-element);
	cursor: pointer;
}

.cn-tasks-widget__meta--split {
	display: flex;
	justify-content: space-between;
	gap: 8px;
	font-size: 13px;
	overflow: visible;
}

.cn-tasks-widget__subject {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-tasks-widget--list .cn-tasks-widget__due {
	font-size: 13px;
	font-weight: 500;
}

.cn-tasks-widget--list .cn-tasks-widget__due--overdue {
	font-weight: 600;
}

/* Overdue: weight AND colour on top of the wording, which already says
   "Overdue by N days" — the signal survives monochrome. */
.cn-tasks-widget__due--overdue {
	color: var(--color-error, #d91f2d);
	font-weight: 600;
}

.cn-tasks-widget__actions {
	flex: 0 0 auto;
}
</style>

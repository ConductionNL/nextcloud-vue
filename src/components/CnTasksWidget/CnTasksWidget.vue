<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-tasks-widget">
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
		<p v-else-if="rows.length === 0" class="cn-tasks-widget__empty">
			{{ emptyLabel }}
		</p>
		<template v-else>
			<!-- The count states the server TOTAL, never the rendered length
			     (ADR-062): the number a person acts on is how much work
			     exists, not how much fits the cell. -->
			<p class="cn-tasks-widget__count">
				{{ countLabel }}
			</p>
			<ul class="cn-tasks-widget__list">
				<li
					v-for="task in rows"
					:key="task.uuid"
					class="cn-tasks-widget__row"
					:data-state="task.state"
					@click="onRowClick(task)">
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
					<!-- Only verbs the contract can accept are offered; the
					     server still authorizes, and a refusal is toasted in
					     its own words. Stopped clicks: the menu must not also
					     open the row. -->
					<NcActions
						v-if="canClaim(task) || canComplete(task)"
						class="cn-tasks-widget__actions"
						:force-menu="true"
						:aria-label="tr('Task actions')"
						@click.stop>
						<NcActionButton
							v-if="canClaim(task)"
							:close-after-click="true"
							@click="claim(task)">
							{{ tr('Claim') }}
						</NcActionButton>
						<template v-if="canComplete(task)">
							<NcActionButton
								v-for="outcome in outcomesOf(task)"
								:key="outcomeId(outcome)"
								:close-after-click="true"
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
import { inject, ref } from 'vue'
import { NcActions, NcActionButton, NcLoadingIcon } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { getCurrentUser } from '@nextcloud/auth'
import { showError } from '@nextcloud/dialogs'
import { useEndpointSource } from '../../composables/useEndpointSource.js'
import { taskDeepLink, taskDueLabel } from '../../composables/indexSources.js'

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
		NcActions,
		NcActionButton,
		NcLoadingIcon,
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
		 *
		 * @type {{scope?: string, limit?: number, pollSeconds?: number, rowRoute?: string, emptyText?: string}}
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

	setup(props) {
		// The shared endpoint engine owns request dedup, the short-TTL cache
		// and the cn:page:refresh / cn:widget:refresh subscriptions — the
		// same binding CnFlowRunsWidget uses, so a page-level Refresh updates
		// this widget with everything else on the page.
		const widgetIdRef = ref(props.widgetId)
		const source = () => ({
			url: FLOW_TASKS_URL,
			method: 'GET',
			params: {
				scope: normaliseScope(props.content && props.content.scope),
				// An inbox drains: finished tasks leave the widget. The index
				// page's "everything" tab is the place to read history.
				isTerminal: 'false',
				// Ascending due date: the most urgent (overdue first) on top.
				sort: 'dueAt',
				limit: normaliseLimit(props.content && props.content.limit),
			},
		})
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
		}
	},

	computed: {
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

	mounted() {
		this.startPolling()
		document.addEventListener('visibilitychange', this.onVisibilityChange)
	},

	beforeUnmount() {
		this.stopPolling()
		document.removeEventListener('visibilitychange', this.onVisibilityChange)
	},

	methods: {
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
		 * else the task's openregister deep link.
		 *
		 * @param {object} task The clicked task row.
		 * @return {void}
		 */
		onRowClick(task) {
			const uuid = String(task.uuid || '')
			if (uuid === '') {
				return
			}
			const rowRoute = this.content.rowRoute
			if (typeof rowRoute === 'string' && rowRoute !== '' && this.$router) {
				this.$router.push({ name: rowRoute, params: { id: uuid } }).catch(() => {})
				return
			}
			window.location.assign(taskDeepLink(uuid))
		},
	},
}

/**
 * Clamp a configured row limit into the range the endpoint accepts.
 *
 * @param {*} raw The configured limit.
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
 * @param {*} raw The configured scope.
 * @return {string} One of assigned, pooled, watched, all (default assigned).
 */
function normaliseScope(raw) {
	return ['assigned', 'pooled', 'watched', 'all'].includes(raw) ? raw : 'assigned'
}
</script>

<style scoped>
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

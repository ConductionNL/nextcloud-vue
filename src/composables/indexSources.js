/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

import { getCanonicalLocale, translate as t } from '@nextcloud/l10n'
import { generateOcsUrl, generateUrl } from '@nextcloud/router'
import { reactive } from 'vue'
import CalendarClock from 'vue-material-design-icons/CalendarClock.vue'
import Cancel from 'vue-material-design-icons/Cancel.vue'
import Check from 'vue-material-design-icons/Check.vue'
import HandBackRight from 'vue-material-design-icons/HandBackRight.vue'
import LightningBolt from 'vue-material-design-icons/LightningBolt.vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import Undo from 'vue-material-design-icons/Undo.vue'
import { formatRelativeDate } from '../utils/boardDate.js'
import { fetchReferenceObjects } from '../utils/boardReferenceColumns.js'
import { fillTemplate } from '../utils/fillTemplate.js'
import { FLOW_RUN_ERROR_STATUSES, flowRunStatuses } from '../utils/flowRunStatus.js'
import { fetchGroupMembers, fetchPresence, fetchStatuses, fetchUsers } from '../utils/nextcloudDirectory.js'
import { readPath } from '../utils/readPath.js'
import { useFlowStore } from './useFlowStore.js'
import { organisationRecord, useOrganisationStore } from './useOrganisationStore.js'
import { useTaskInboxStore } from './useTaskInboxStore.js'

/**
 * NAMED INDEX SOURCES.
 *
 * `CnIndexPage` has always had two modes: fetch OpenRegister objects itself
 * from `register` + `schema`, or render rows handed in as `:objects`. That
 * second mode is why bespoke list pages exist at all — anything that is not an
 * OpenRegister object needed its own page component whose only real job was to
 * load rows from somewhere else and pass them down.
 *
 * A flow is the clearest case: flow definitions are deliberately NOT stored as
 * OpenRegister objects, so `type: "index"` had nothing to point at, and every
 * app that wanted a flow list shipped a custom page instead.
 *
 * This registry is the third mode. A manifest names an entity source, and the index
 * page loads it — no component, no `type: "custom"`.
 *
 *   { "type": "index", "config": { "entitySource": "flows", "app": "dossiq" } }
 *
 * Each entry supplies the parts an index cannot infer: how to load, where the
 * rows live, and sensible columns and row actions so a manifest does not have
 * to restate them. A manifest that DOES set `columns` still wins — the source
 * only fills in what was left out.
 *
 * WHY A REGISTRY RATHER THAN A BRANCH. `logs`, the AVG register and the other
 * non-object lists are the same shape, and each one added as an `if` in the
 * index page is another reason the page cannot be reasoned about. Adding a
 * source here is a data change; adding one to the page is a behaviour change.
 */

/**
 * Monday 00:00 of the current week, local time, as ISO 8601.
 *
 * "This week" on a flow list is the calendar week a person plans in, not a
 * rolling seven days: on a Monday morning it reads as a fresh count.
 *
 * @param {Date} [now] The reference moment.
 * @return {string} The start of the week.
 */
export function startOfWeek(now = new Date()) {
	const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	const offset = (start.getDay() + 6) % 7
	start.setDate(start.getDate() - offset)
	return start.toISOString()
}

/**
 * How a flow starts, as a label, a muted second line and an icon.
 *
 * `trigger` is a catalogue event id, `schedule` (with `cron`) or `manual`.
 * An event id reads as its catalogue label when the catalogue knows it,
 * else as the id, so a trigger the catalogue has not loaded yet still says
 * something true.
 *
 * @param {object} flow The flow row.
 * @param {Array<object>} catalog The event catalogue (`{id, label}`).
 * @return {{label: string, detail: string, icon: object}} The trigger cell.
 */
export function flowTriggerCell(flow, catalog = []) {
	const trigger = String(flow?.trigger || '')
	if (trigger === 'schedule') {
		return { label: t('nextcloud-vue', 'On a schedule'), detail: String(flow?.cron || ''), icon: CalendarClock }
	}
	if (trigger === '' || trigger === 'manual') {
		return { label: t('nextcloud-vue', 'Run by hand'), detail: '', icon: HandBackRight }
	}
	const entry = (catalog || []).find((item) => item && item.id === trigger)
	return {
		label: (entry && entry.label) || trigger,
		detail: String(flow?.triggerSchema || ''),
		icon: LightningBolt,
	}
}

/**
 * The flow source: OpenRegister's one native flow store.
 *
 * Rows carry the run figures a flow list shows beside each flow (how its
 * last run ended, how often it ran this week), read in one request from
 * the run summary rather than derived from a page of runs.
 *
 * The quick filters (All, Active, Paused, With errors) narrow the loaded
 * list in place: every flow of the app is already loaded, so the counts on
 * the tabs and the rows they show can never disagree.
 *
 * @return {object} The source adapter.
 */
function flowsSource() {
	const store = useFlowStore()
	const view = reactive({ state: 'all', runsRoute: '/flow-runs', flowsRoute: '/flows' })
	const statuses = flowRunStatuses()

	/**
	 * Every flow row with its display fields, before any tab narrows it.
	 *
	 * @return {Array<object>} The rows.
	 */
	const allRows = () => (store.flows || []).map((flow) => {
		const id = flow.id || flow.uuid
		const summary = (store.runSummary || {})[id] || {}
		const lastRun = summary.lastRun || null
		const lastStatus = lastRun ? statuses[lastRun.status] : null
		const trigger = flowTriggerCell(flow, store.eventCatalog)
		return {
			...flow,
			triggerLabel: trigger.label,
			triggerDetail: trigger.detail,
			triggerIcon: trigger.icon,
			lastRunStatus: lastRun ? lastRun.status : '',
			lastRunLabel: lastRun
				? ((lastStatus && lastStatus.label) || String(lastRun.status || ''))
				: t('nextcloud-vue', 'Not run yet'),
			lastRunAt: lastRun ? formatRelativeDate(lastRun.created, { withTime: true }) : '',
			lastRunFailed: !!lastRun && FLOW_RUN_ERROR_STATUSES.includes(lastRun.status),
			runsThisWeek: Number(summary.runsSince) || 0,
			// The switch reads `enabled`; the label is what a screen reader and
			// an export see. A flow with no owner is enabled but cannot start,
			// because a trigger has no acting user to run as.
			statusLabel: flow.enabled === false
				? t('nextcloud-vue', 'Paused')
				: (flow.owner ? t('nextcloud-vue', 'Active') : t('nextcloud-vue', 'No owner')),
		}
	})

	const lastRunColors = {}
	Object.values(statuses).forEach((entry) => {
		lastRunColors[entry.label] = entry.variant
	})

	const filters = {
		all: () => true,
		active: (row) => row.enabled !== false,
		paused: (row) => row.enabled === false,
		errors: (row) => row.lastRunFailed,
	}

	return {
		store,

		/**
		 * Load the flows for the scoped app, then their run summary.
		 *
		 * @param {object} config The page config; `state` is the active tab
		 *   (`all`, `active`, `paused`, `errors`), `runsRoute`/`flowsRoute`
		 *   override where the page tabs lead.
		 *
		 * @return {Promise<void>} Resolves when loaded.
		 */
		load: async (config) => {
			view.state = filters[config?.state] ? config.state : 'all'
			view.runsRoute = config?.runsRoute || '/flow-runs'
			view.flowsRoute = config?.flowsRoute || '/flows'
			await store.load({ app: config?.app })
			await store.loadRunSummary((store.flows || []).map((flow) => flow.id || flow.uuid), startOfWeek())
		},

		/**
		 * @return {Array<object>} The rows of the active tab.
		 */
		rows: () => allRows().filter(filters[view.state] || filters.all),

		/**
		 * @return {boolean} Whether a load is in flight.
		 */
		loading: () => !!store.loading,

		columns: [
			{ key: 'name', label: t('nextcloud-vue', 'Flow'), secondary: 'description' },
			{
				key: 'triggerLabel',
				label: t('nextcloud-vue', 'Trigger'),
				secondary: 'triggerDetail',
				widget: 'iconLabel',
				widgetProps: { icon: (row) => row.triggerIcon },
			},
			{
				key: 'lastRunLabel',
				label: t('nextcloud-vue', 'Last run'),
				secondary: 'lastRunAt',
				widget: 'badge',
				widgetProps: { colorMap: lastRunColors },
			},
			{ key: 'runsThisWeek', label: t('nextcloud-vue', 'Runs this week'), class: 'cn-table-col--end' },
			{
				key: 'statusLabel',
				label: t('nextcloud-vue', 'Status'),
				widget: 'switch',
				widgetProps: {
					checked: (row) => row.enabled !== false,
					onToggle: (row, enabled) => store.setEnabled(row.id || row.uuid, enabled),
				},
			},
		],

		quickFilters: [
			{ label: t('nextcloud-vue', 'All'), filter: { state: 'all' }, default: true },
			{ label: t('nextcloud-vue', 'Active'), filter: { state: 'active' } },
			{ label: t('nextcloud-vue', 'Paused'), filter: { state: 'paused' } },
			{ label: t('nextcloud-vue', 'With errors'), filter: { state: 'errors' } },
		],

		/**
		 * The number on each quick filter, by tab index, from the loaded list.
		 *
		 * @return {Record<number, number>} The counts.
		 */
		tabCounts: () => {
			const rows = allRows()
			return {
				0: rows.length,
				1: rows.filter(filters.active).length,
				2: rows.filter(filters.paused).length,
				3: rows.filter(filters.errors).length,
			}
		},

		/**
		 * The page tabs above the list: the flows and this week's runs.
		 *
		 * @return {Array<{label: string, to: string, count: number}>} The tabs.
		 */
		pageTabs: () => [
			{ id: 'flows', label: t('nextcloud-vue', 'Flows'), to: view.flowsRoute, count: (store.flows || []).length },
			{
				id: 'runs',
				label: t('nextcloud-vue', 'Runs this week'),
				to: view.runsRoute,
				count: Object.values(store.runSummary || {}).reduce((sum, entry) => sum + (Number(entry?.runsSince) || 0), 0),
			},
		],

		footerNote: t('nextcloud-vue', 'A paused flow keeps its steps and history. It starts again when you switch it on.'),

		// ONE Edit, and it NAVIGATES. `action: 'open'` is the source-action
		// grammar CnIndexPage resolves to "open this row where the source says
		// rows live" — the page's configured row target (`config.rowRoute`, via
		// `edit-open`) wins, and `detailRoute` below is the fallback. The flow
		// detail page IS the edit surface AND the view surface, so the source
		// declares no View, and the page's schema-form Edit is suppressed for
		// named sources (a source has no schema, so that modal can only ever
		// render empty).
		rowActions: [
			{ id: 'edit', label: t('nextcloud-vue', 'Edit'), icon: Pencil, action: 'open' },
		],

		/**
		 * Delete one flow row, reloading in the page's scope.
		 *
		 * Read by CnIndexPage's built-in single-delete dialog: a named source
		 * without this hook gets no Delete action at all, because the confirm
		 * would otherwise emit into a manifest page with nobody listening — a
		 * dialog that looks like it deleted and did not.
		 *
		 * @param {object} row The row to delete.
		 * @param {object} config The page's source config (`app` scopes the reload).
		 *
		 * @return {Promise<void>} Resolves when deleted and reloaded.
		 */
		deleteRow: (row, config) => store.remove(row?.id || row?.uuid, { app: config?.app || null }),

		/**
		 * Copy one flow row under a new name, reloading in the page's scope.
		 *
		 * Read by CnIndexPage's built-in single-copy dialog, same contract as
		 * `deleteRow`. The copy is a fresh flow: the server stamps the copier
		 * as owner and lifecycle starts over, so copying a published flow
		 * yields an unpublished one with the same graph.
		 *
		 * @param {object} row The row to copy.
		 * @param {string} newName The copy's name.
		 * @param {object} config The page's source config (`app` scopes the reload).
		 *
		 * @return {Promise<object>} The created flow.
		 */
		copyRow: (row, newName, config) => store.duplicate(row?.id || row?.uuid, newName, { app: config?.app || null }),

		// The surfaces a flow list needs beyond its rows. These are DEFAULTS a
		// manifest can override, not a fixed shape: `detailRoute` is the fleet
		// convention (`/flows/:id`) and the two routes below derive from it.
		//
		// A flow is created by navigating to the editor, NOT by the index page's
		// built-in form dialog — that dialog builds an OpenRegister object, and a
		// flow is not one. CnFlowsPage set `:show-add="false"` and rendered its
		// own button for exactly this reason; expressing it here is what lets the
		// custom page go.
		detailRoute: '/flows',
		addRoute: '/flows/new',
		addLabel: t('nextcloud-vue', 'New flow'),
		description: t('nextcloud-vue', 'A flow runs a series of steps when something happens — an object changes, a schedule fires, or you run it yourself.'),
		title: t('nextcloud-vue', 'Flows'),
	}
}

/**
 * The flow runs source: this week's runs of the app's flows, newest first.
 *
 * The second tab of a flow list. Reads the same run history the flow
 * editor reads, narrowed on the server to the app's flows and the week, so
 * the rows are the runs the flows tab counted. A row opens the run on its
 * flow's canvas (`/flows/:flowId?run=:uuid`), where CnFlowDetail shows it.
 *
 * @return {object} The source adapter.
 */
function flowRunsSource() {
	const store = useFlowStore()
	const view = reactive({ runsRoute: '/flow-runs', flowsRoute: '/flows' })
	const statuses = flowRunStatuses()
	const statusColors = {}
	Object.values(statuses).forEach((entry) => {
		statusColors[entry.label] = entry.variant
	})

	/**
	 * Where a run opens: its flow's canvas in run view.
	 *
	 * @param {object} row The run row.
	 * @return {object|null} A router location, or null without ids.
	 */
	const runTarget = (row) => {
		const flowId = row?.flowId
		const uuid = row?.uuid
		return flowId && uuid
			? { path: `${view.flowsRoute}/${encodeURIComponent(flowId)}`, query: { run: String(uuid) } }
			: null
	}

	return {
		store,

		/**
		 * Load the app's flows, then their runs since the start of the week.
		 *
		 * @param {object} config The page config (`app`, `runsRoute`, `flowsRoute`).
		 * @return {Promise<void>} Resolves when loaded.
		 */
		load: async (config) => {
			view.runsRoute = config?.runsRoute || '/flow-runs'
			view.flowsRoute = config?.flowsRoute || '/flows'
			await store.load({ app: config?.app })
			const ids = (store.flows || []).map((flow) => flow.id || flow.uuid)
			const since = startOfWeek()
			await Promise.all([store.loadRecentRuns(ids, since), store.loadRunSummary(ids, since)])
		},

		/**
		 * @return {Array<object>} The runs, with flow name and status label.
		 */
		rows: () => {
			const names = {}
			;(store.flows || []).forEach((flow) => {
				names[flow.id || flow.uuid] = flow.name
			})
			return (store.recentRuns || []).map((run) => ({
				...run,
				id: run.uuid,
				flowName: names[run.flowId] || run.flowId,
				statusLabel: (statuses[run.status] && statuses[run.status].label) || String(run.status || ''),
				startedAt: formatRelativeDate(run.created, { withTime: true }),
			}))
		},

		/**
		 * @return {boolean} Whether a load is in flight.
		 */
		loading: () => !!store.loading || !!store.recentRunsLoading,

		columns: [
			{ key: 'flowName', label: t('nextcloud-vue', 'Flow'), secondary: 'error' },
			{ key: 'statusLabel', label: t('nextcloud-vue', 'Status'), widget: 'badge', widgetProps: { colorMap: statusColors } },
			{ key: 'startedAt', label: t('nextcloud-vue', 'Started') },
			{ key: 'trigger', label: t('nextcloud-vue', 'Trigger') },
		],

		pageTabs: () => [
			{ id: 'flows', label: t('nextcloud-vue', 'Flows'), to: view.flowsRoute, count: (store.flows || []).length },
			{ id: 'runs', label: t('nextcloud-vue', 'Runs this week'), to: view.runsRoute, count: (store.recentRuns || []).length },
		],

		// A location, not a URL: the canvas is the consuming app's own page,
		// so a plain click pushes on its router and a ctrl/cmd click resolves
		// the same location into a new tab.
		rowTarget: runTarget,
		showAdd: false,
		title: t('nextcloud-vue', 'Runs this week'),
		description: t('nextcloud-vue', 'Every run of this app\'s flows since Monday, newest first.'),
	}
}

/**
 * The absolute deep link for one task.
 *
 * A task's detail page is OpenRegister's, not the consuming app's, so the
 * link is a full URL rather than a route name: the app that renders the
 * inbox is almost never the app that renders the task.
 *
 * @param {string} uuid The task uuid.
 *
 * @return {string} The `/apps/openregister/flow-tasks/{uuid}` URL.
 */
export function taskDeepLink(uuid) {
	return generateUrl(`/apps/openregister/flow-tasks/${uuid}`)
}

/**
 * The human wording for a row's due state.
 *
 * Wording on purpose, never colour: the overdue signal must survive
 * monochrome, a screen reader and a CSV export. Reads the SERVER'S derived
 * projection (`overdue`, `daysOverdue`, `daysUntilDue`) so the cell and any
 * `overdue` filter can never disagree about what overdue means.
 *
 * @param {object} task The task row as the endpoint returned it.
 *
 * @return {string} The due label, or '' for a task without a due date.
 */
export function taskDueLabel(task) {
	if (task?.overdue === true) {
		const days = Number(task.daysOverdue)
		if (Number.isFinite(days) && days > 0) {
			return days === 1
				? t('nextcloud-vue', 'Overdue by 1 day')
				: t('nextcloud-vue', 'Overdue by {days} days', { days })
		}
		return t('nextcloud-vue', 'Overdue')
	}
	const until = Number(task?.daysUntilDue)
	if (Number.isFinite(until) === false || task?.dueAt === null || task?.dueAt === undefined) {
		return ''
	}
	if (until <= 0) {
		return t('nextcloud-vue', 'Due today')
	}
	return until === 1
		? t('nextcloud-vue', 'Due tomorrow')
		: t('nextcloud-vue', 'Due in {days} days', { days: until })
}

/**
 * The CMMN states in which a task is finished: no verb applies to it any more.
 *
 * @type {string[]}
 */
const TASK_TERMINAL_STATES = ['completed', 'terminated', 'disabled']

/**
 * The columns the task inbox sorts by (`TaskController::index` `sort`), by
 * column key: the raw fields and the source's own label columns.
 *
 * @type {{[key: string]: string}}
 */
const TASK_SORT_FIELDS = { dueAt: 'dueAt', dueLabel: 'dueAt', priority: 'priority', priorityLabel: 'priority', created: 'created' }

/**
 * The form the tasks source's Edit verb asks with: the task's own fields the
 * engine lets the people working it change, filled from the task.
 *
 * @param {object} task The task.
 * @return {{schema: object, item: object, fieldOverrides: object}} The form.
 * @spec openspec/changes/task-edit-action/specs/record-source-verbs/spec.md#requirement-a-record-source-verb-can-ask-for-values-first
 */
function taskEditForm(task) {
	const due = typeof task.dueAt === 'string' ? task.dueAt.slice(0, 10) : ''
	return {
		schema: {
			type: 'object',
			required: ['title'],
			properties: {
				title: { type: 'string', title: t('nextcloud-vue', 'Title') },
				description: { type: 'string', format: 'textarea', title: t('nextcloud-vue', 'Description') },
				dueAt: { type: 'string', format: 'date', title: t('nextcloud-vue', 'Due by') },
				priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], title: t('nextcloud-vue', 'Priority') },
			},
		},
		item: { title: task.title || '', description: task.description || '', dueAt: due, priority: task.priority || 'normal' },
		fieldOverrides: {
			priority: { enumLabels: { low: t('nextcloud-vue', 'Low'), normal: t('nextcloud-vue', 'Normal'), high: t('nextcloud-vue', 'High'), urgent: t('nextcloud-vue', 'Urgent') } },
		},
	}
}

/**
 * The tasks source: the caller's inbox on OpenRegister's one task store.
 *
 * The viewer's inbox and nothing else. The endpoint answers from the
 * session and does the authorization; this adapter forwards config through
 * the store's allowlist and never asks for another user.
 *
 * @return {object} The source adapter.
 */
function tasksSource() {
	const store = useTaskInboxStore()

	// Labels and colour maps are built with the SAME t() calls, so the badge
	// colour lookup (keyed on the shown label) holds in every locale. The six
	// states are CMMN's (openregister flow-task-entity): available, enabled,
	// active, completed, terminated, disabled.
	const stateLabels = {
		available: t('nextcloud-vue', 'Available'),
		enabled: t('nextcloud-vue', 'Ready to claim'),
		active: t('nextcloud-vue', 'In progress'),
		completed: t('nextcloud-vue', 'Completed'),
		terminated: t('nextcloud-vue', 'Terminated'),
		disabled: t('nextcloud-vue', 'Disabled'),
	}
	const stateColorMap = {
		[stateLabels.enabled]: 'info',
		[stateLabels.active]: 'primary',
		[stateLabels.completed]: 'success',
		[stateLabels.terminated]: 'error',
	}
	const priorityLabels = {
		low: t('nextcloud-vue', 'Low'),
		normal: t('nextcloud-vue', 'Normal'),
		high: t('nextcloud-vue', 'High'),
		urgent: t('nextcloud-vue', 'Urgent'),
	}
	const priorityColorMap = {
		[priorityLabels.high]: 'warning',
		[priorityLabels.urgent]: 'error',
	}

	/**
	 * A task with the display fields a list row and a detail page read. Keyed
	 * on its uuid, the identity of the task contract.
	 *
	 * @param {object} task The task as the engine returned it.
	 * @return {object} The task with `id`, `title` and the labels.
	 */
	const taskRow = (task) => ({
		...task,
		id: task.uuid,
		title: task.displayTitle || task.title || task.uuid,
		subjectLabel: (task.subject && task.subject.title) || '',
		stateLabel: stateLabels[task.state] || String(task.state || ''),
		priorityLabel: priorityLabels[task.priority] || String(task.priority || ''),
		dueLabel: taskDueLabel(task),
	})

	return {
		store,

		/**
		 * Load the caller's inbox.
		 *
		 * @param {object} config The merged page config (sourceConfig plus the
		 *   active quick-filter tab); only allowlisted keys reach the wire.
		 *
		 * @return {Promise<void>} Resolves when loaded.
		 */
		load: (config) => store.load(config || {}),

		/**
		 * @return {Array<object>} The rows, with the display fields resolved.
		 */
		rows: () => (store.tasks || []).map(taskRow),

		/**
		 * Read one task for a detail page (`type: "detail"` with
		 * `entitySource: "tasks"`).
		 *
		 * @param {string} id The task uuid.
		 * @return {Promise<object|null>} The task, or null when it could not be read.
		 * @spec openspec/changes/tasks-record-source/specs/tasks-record-source/spec.md#requirement-the-tasks-source-reads-one-task
		 */
		loadRecord: (id) => store.fetchRecord(id),

		/**
		 * @param {string} id The task uuid.
		 * @return {object|null} The task read for this id, with the row's display fields, or null.
		 */
		record: (id) => {
			const task = store.records?.[String(id)]
			return task ? taskRow(task) : null
		},

		/**
		 * @param {string} id The task uuid.
		 * @return {number|null} The HTTP status of a failed read of this id, or null.
		 */
		recordError: (id) => store.recordErrors?.[String(id)] ?? null,

		/**
		 * The lifecycle verbs a detail page offers on this task, read off the
		 * row and never guessed at: claim while nobody holds it, hand back
		 * while somebody does, complete and cancel while it is open. A finished
		 * task offers none. Whether the viewer MAY run one is the engine's
		 * call; it refuses with a message the page shows as-is.
		 *
		 * @param {object|null} task The task on the page.
		 * @return {Array<{id: string, label: string, icon: object, menu: boolean, successMessage?: string}>} The verbs, buttons first.
		 * @spec openspec/changes/record-source-verbs/specs/record-source-verbs/spec.md#requirement-a-record-source-offers-header-verbs
		 */
		verbs: (task) => {
			if (!task || TASK_TERMINAL_STATES.includes(String(task.state || ''))) {
				return []
			}
			const held = String(task.assignee || '').trim() !== ''
			return [
				{ id: 'complete', label: t('nextcloud-vue', 'Finish'), icon: Check, menu: false, successMessage: t('nextcloud-vue', 'Task completed') },
				held
					? { id: 'unclaim', label: t('nextcloud-vue', 'Hand back'), icon: Undo, menu: false }
					: { id: 'claim', label: t('nextcloud-vue', 'Pick up'), icon: HandBackRight, menu: false },
				{ id: 'edit', label: t('nextcloud-vue', 'Edit'), icon: Pencil, menu: false, successMessage: t('nextcloud-vue', 'Task saved'), form: taskEditForm(task) },
				{ id: 'cancel', label: t('nextcloud-vue', 'Cancel task'), icon: Cancel, menu: true },
			]
		},

		/**
		 * Run a verb on a task and keep the page's record in step.
		 *
		 * @param {string} id The task uuid.
		 * @param {string} verb The verb id.
		 * @param {{url?: string, body?: object}} [options] An app route to post the verb to instead of the engine's; for `edit`, the new values.
		 * @return {Promise<{ok: boolean, record: (object|null), message: string}>} The outcome.
		 */
		runVerb: (id, verb, options) => (verb === 'edit'
			? store.editRecord(id, options?.body)
			: store.runRecordVerb(id, verb, options || {})),

		/**
		 * Whether this task's checklist can still be ticked: not once it is finished.
		 *
		 * @param {object|null} task The task on the page.
		 * @return {boolean}
		 */
		canCheckItems: (task) => Boolean(task) && !TASK_TERMINAL_STATES.includes(String(task.state || '')),

		/**
		 * Tick or untick one checklist item through the engine.
		 *
		 * @param {string} id The task uuid.
		 * @param {string} itemId The item id.
		 * @param {boolean} checked The new state.
		 * @return {Promise<{ok: boolean, record: (object|null), message: string}>} The outcome.
		 * @spec openspec/changes/record-checklist-widget/specs/record-checklist-widget/spec.md#requirement-a-checklist-widget-ticks-items-through-the-record-source
		 */
		checkItem: (id, itemId, checked) => store.checkRecordItem(id, itemId, checked),

		/**
		 * @return {boolean} Whether a load is in flight.
		 */
		loading: () => !!store.loading,

		// The inbox pages: the page sends `limit` and `offset` and draws the
		// pager from the datastore total.
		pages: true,

		/**
		 * @return {number} The datastore total, independent of the page size.
		 */
		total: () => Number(store.total) || 0,

		/**
		 * Count the inbox for a config without touching the rows on screen,
		 * for a quick-filter tab with `showCount`.
		 *
		 * @param {object} config The merged config, as for `load`.
		 * @return {Promise<number>} The datastore total.
		 */
		count: async (config) => (await store.fetchFor({ ...(config || {}), limit: 1 })).total,

		columns: [
			{ key: 'title', label: t('nextcloud-vue', 'Task') },
			{ key: 'subjectLabel', label: t('nextcloud-vue', 'Subject') },
			{ key: 'stateLabel', label: t('nextcloud-vue', 'State'), widget: 'badge', widgetProps: { colorMap: stateColorMap } },
			{ key: 'priorityLabel', label: t('nextcloud-vue', 'Priority'), widget: 'badge', widgetProps: { colorMap: priorityColorMap }, sortable: true },
			{ key: 'dueLabel', label: t('nextcloud-vue', 'Due'), sortable: true },
			{ key: 'assignee', label: t('nextcloud-vue', 'Assignee') },
		],

		/**
		 * The inbox argument a column header's order becomes: the inbox
		 * sorts by deadline, priority or creation, server side, so a sorted
		 * page is the first page of the whole sorted inbox.
		 *
		 * @param {string} key The column key.
		 * @param {string} order `asc` or `desc`.
		 * @return {{sort: string}|null} The parameter, or null for a column the inbox cannot sort by.
		 * @spec openspec/changes/tasks-source-sorts-on-server/specs/index-sources/spec.md#requirement-a-named-source-can-sort-on-the-server
		 */
		sortParam: (key, order) => {
			const field = TASK_SORT_FIELDS[key]
			return field ? { sort: (order === 'desc' ? '-' : '') + field } : null
		},

		// The scope tabs. Each tab's filter is merged over the page's
		// `sourceConfig` (tab wins on a colliding key) and the merged config
		// goes through the store's allowlist. "Overdue" deliberately carries
		// no scope, so it narrows the endpoint's default: my overdue work.
		quickFilters: [
			{ label: t('nextcloud-vue', 'Assigned to me'), filter: { scope: 'assigned' }, default: true },
			{ label: t('nextcloud-vue', 'Pool'), filter: { scope: 'pooled' } },
			{ label: t('nextcloud-vue', 'Watched'), filter: { scope: 'watched' } },
			{ label: t('nextcloud-vue', 'Everything'), filter: { scope: 'all' } },
			{ label: t('nextcloud-vue', 'Overdue'), filter: { overdue: true } },
		],

		/**
		 * Open a clicked row: the task's deep link, as a full URL.
		 *
		 * `detailRoute` would push on the CONSUMING app's router, and the task
		 * page is OpenRegister's. `row-click` still emits for hosts listening.
		 *
		 * @param {object} row The clicked row.
		 *
		 * @return {void}
		 */
		openRow: (row) => {
			const uuid = row?.uuid || row?.id
			if (!uuid) {
				return
			}
			window.location.assign(taskDeepLink(String(uuid)))
		},

		/**
		 * The URL a clicked row opens, so a ctrl/cmd/shift or middle click can
		 * open it in a new tab.
		 *
		 * @param {object} row The clicked row.
		 *
		 * @return {string|null} The task's deep link, or null without an id.
		 */
		rowTarget: (row) => {
			const uuid = row?.uuid || row?.id
			return uuid ? taskDeepLink(String(uuid)) : null
		},

		// The sidebar fields this inbox can answer, and the argument each one
		// becomes. Measured against `TaskController::index()` and
		// `TaskInboxCriteria`, which take the same predicates for the page and
		// for the total, so a filter that narrows the list narrows the count.
		//
		// 🔴 `assignee` IS DELIBERATELY ABSENT, AND IT IS THE ONE FIELD A TASK
		// SEARCH IS EXPECTED TO HAVE. The inbox has no assignee predicate at
		// all: `scope` is the only assignee-shaped narrowing and it resolves
		// to the CALLING user. Declaring it here would put a picker on screen
		// that quietly answers about everybody. It lands when openregister
		// grows the parameter, and not before.
		searchFields: {
			objectUuid: { param: 'objectUuid', single: true },
			state: { param: 'state', join: ',' },
			priority: { param: 'priority', single: true },
			// Single-valued, like `priority`: the endpoint compares one kind.
			// Joining two into a comma string would match a kind nobody wrote.
			kind: { param: 'kind', single: true },
			dueAt: { range: ['dueAfter', 'dueBefore'] },
		},

		// A task is created by a flow, never by a person clicking Add. Without
		// this the index falls back to its OpenRegister form dialog, which
		// would build an object the task store never reads.
		showAdd: false,
		description: t('nextcloud-vue', 'Your tasks from every app, in one inbox. Claim from the pool, then complete with an outcome.'),
		title: t('nextcloud-vue', 'Tasks'),
	}
}

/**
 * Read a dotted path off a response body.
 *
 * @param {object} body The response body.
 * @param {string} path A dotted path such as `data.items`.
 * @return {unknown} The value, or undefined.
 */
function readRowsPath(body, path) {
	return String(path).split('.').reduce((value, key) => (value && typeof value === 'object' ? value[key] : undefined), body)
}

/**
 * The `sourceConfig` keys the endpoint source reads itself; every other key
 * goes along as a query parameter.
 *
 * @type {Array<string>}
 */
const ENDPOINT_SOURCE_KEYS = ['url', 'rowsPath', 'totalPath', 'searchParam', 'searchFields', 'notePath', 'noteText', 'refusedText', 'facets']

/**
 * The endpoint source: rows from an app's own endpoint
 * (`entitySource: "endpoint"`), for a list that is not OpenRegister objects,
 * such as dossiq's postvak.
 *
 * `sourceConfig.url` is an app path (`/apps/dossiq/api/postvak`), resolved
 * with `generateUrl` and fetched with the session, so the endpoint does its
 * own authorization. `sourceConfig.rowsPath` names where the rows sit in the
 * response (`results` by default; a bare array is taken as is). Every other
 * key, the active tab's filter and the sidebar choices included, goes along
 * as a query parameter. The manifest declares the columns.
 *
 * Without a `sourceConfig.url`, and when the page config itself arrived in
 * its place (CnPageRenderer's fallback for a page that sets no
 * `sourceConfig`, recognisable by its `entitySource` key), nothing is
 * requested: page-config keys must never become query parameters. The list
 * stays empty and one console error names the page.
 *
 * A quick filter with `showCount` is counted with `count(config)`: the same
 * request with that tab's filter, its total read at `sourceConfig.totalPath`
 * (`total` by default), else the number of rows the answer holds.
 *
 * Three more keys shape what the page says around the rows:
 * - `searchParam`: the page's search box sends its term as this parameter
 *   (`sender`), so the endpoint does the searching.
 * - `notePath` and `noteText`: a value read off the answer (`filterOrder`) and
 *   the sentence it is said in ("Filters run in this order: {order}", its one
 *   placeholder taking the value); a list
 *   is joined with commas. Shown above the rows.
 * - `refusedText`: what a refused load (403) says when the endpoint gave no
 *   `message` of its own. A refusal is not an empty list, so the page shows it
 *   instead of the rows, and a failed load is not one either.
 * - `searchFields`: the filters the endpoint takes, in the same shape a
 *   registered source declares them (`{ status: { param: 'status', single:
 *   true } }`), so a filter strip or sidebar on the page narrows the
 *   endpoint's query.
 * - `facets`: the values the endpoint counts in its answer, offered as a
 *   picker after the search (`[{ field, path, label?, allLabel?, labels? }]`,
 *   the answer holding `[{ value, count }]` at `path`). A choice is a page
 *   filter on `field`, so `searchFields` must declare it.
 *
 * @param {object} [declared] The page's `sourceConfig`, for `searchParam` and `searchFields`.
 * @param {object} [context] The page's helpers; `translate` is the app's catalogue.
 * @return {object} The source adapter.
 * @spec openspec/changes/index-endpoint-source/specs/index-page/spec.md#requirement-an-index-page-can-list-rows-from-an-app-endpoint
 */
function endpointSource(declared = {}, context = {}) {
	const state = reactive({ rows: [], loading: false, refusal: '', failed: false, note: '', facets: {} })
	const translate = typeof context.translate === 'function' ? context.translate : (text) => text
	const searchParam = typeof declared.searchParam === 'string' && declared.searchParam !== '' ? declared.searchParam : null
	const searchFields = declared.searchFields && typeof declared.searchFields === 'object' && !Array.isArray(declared.searchFields) ? declared.searchFields : null
	const facetDeclarations = Array.isArray(declared.facets)
		? declared.facets.filter((facet) => facet && typeof facet.field === 'string' && facet.field !== '' && typeof facet.path === 'string' && facet.path !== '')
		: []
	let seq = 0
	let warned = false

	/**
	 * The declared facets read off an answer: `{ <field>: [{ value, count }] }`.
	 *
	 * @param {object} body The response body.
	 * @return {object} The facets.
	 */
	const facetsOf = (body) => {
		const facets = {}
		for (const facet of facetDeclarations) {
			const raw = body && typeof body === 'object' && !Array.isArray(body) ? readRowsPath(body, facet.path) : null
			facets[facet.field] = Array.isArray(raw)
				? raw.filter((entry) => entry && entry.value !== undefined && entry.value !== null && entry.value !== '')
						.map((entry) => ({ value: String(entry.value), count: Number(entry.count) || 0 }))
				: []
		}
		return facets
	}

	/**
	 * The query parameters for a config: every key but the source's own
	 * (`url`, the paths, the texts), empty values left out, a list joined by
	 * commas.
	 *
	 * @param {object} config The config.
	 * @return {object} The parameters.
	 */
	const paramsOf = (config) => {
		const params = {}
		for (const [key, value] of Object.entries(config)) {
			if (ENDPOINT_SOURCE_KEYS.includes(key) || value === undefined || value === null || value === '') {
				continue
			}
			params[key] = Array.isArray(value) ? value.join(',') : (typeof value === 'object' ? JSON.stringify(value) : value)
		}
		return params
	}

	/**
	 * Whether a config can be requested: it names a url and is not the page
	 * config handed over in its place.
	 *
	 * @param {object} config The config.
	 * @return {boolean}
	 */
	const requestable = (config) => {
		const url = config && config.url
		return typeof url === 'string' && url !== '' && !Object.hasOwn(config, 'entitySource')
	}

	/**
	 * The note read off an answer, in the page's sentence.
	 *
	 * @param {object} body The response body.
	 * @param {string} [path] Where the value sits.
	 * @param {string} [text] The sentence, with one `{placeholder}` where the value goes.
	 * @return {string} The note, or '' when there is nothing to say.
	 */
	const noteOf = (body, path, text) => {
		if (!path || !body || typeof body !== 'object' || Array.isArray(body)) {
			return ''
		}
		const raw = readRowsPath(body, path)
		const value = Array.isArray(raw) ? raw.filter((v) => v !== null && v !== undefined && v !== '').join(', ') : (raw === null || raw === undefined ? '' : String(raw))
		if (value === '') {
			return ''
		}
		return text ? translate(text).replace(/\{\w+\}/, value) : value
	}

	/**
	 * The sentence a refused load is said in: the endpoint's own, else the
	 * page's, else the library's.
	 *
	 * @param {object} body The refusal's body.
	 * @param {string} [text] The page's `refusedText`.
	 * @return {string} The sentence.
	 */
	const refusalOf = (body, text) => {
		if (body && typeof body.message === 'string' && body.message.trim() !== '') {
			return body.message
		}
		return text ? translate(text) : t('nextcloud-vue', 'You may not read this list.')
	}

	return {
		/**
		 * The parameter the page's search term is sent as, or null when this
		 * endpoint takes no search.
		 */
		searchParam,

		/**
		 * The page filters this endpoint takes, and the parameter each becomes.
		 */
		searchFields,

		/**
		 * The facets the page offers as pickers, as declared.
		 */
		facetDeclarations,

		/**
		 * Fetch the rows.
		 *
		 * @param {object} config The page's source config with the tab filter merged in.
		 * @return {Promise<void>} Resolves when loaded or refused; a failed request leaves no rows and rethrows.
		 */
		load: async (config) => {
			const { url, rowsPath, notePath, noteText, refusedText } = config || {}
			const mine = ++seq
			if (!requestable(config)) {
				state.rows = []
				if (!warned) {
					warned = true
					const page = (config && (config.title || config.id)) || 'an index page'
					// eslint-disable-next-line no-console
					console.error(`[CnIndexPage] entitySource "endpoint" on "${page}" needs an explicit sourceConfig with a url (an app path such as /apps/<app>/api/<path>); nothing is loaded.`)
				}
				return
			}
			const params = paramsOf(config)
			state.loading = true
			try {
				const { default: axios } = await import('@nextcloud/axios')
				const res = await axios.get(generateUrl(url), { params })
				const body = res ? res.data : null
				const rows = Array.isArray(body) ? body : readRowsPath(body, rowsPath || 'results')
				if (mine === seq) {
					state.rows = Array.isArray(rows) ? rows : []
					state.refusal = ''
					state.failed = false
					state.note = noteOf(body, notePath, noteText)
					state.facets = facetsOf(body)
				}
			} catch (error) {
				if (mine !== seq) {
					return
				}
				state.rows = []
				state.note = ''
				const refused = error && error.response && error.response.status === 403
				state.refusal = refused ? refusalOf(error.response.data, refusedText) : ''
				state.failed = !refused
				if (!refused) {
					throw error
				}
			} finally {
				if (mine === seq) {
					state.loading = false
				}
			}
		},

		/**
		 * Count the rows for a config without touching the rows on screen, for
		 * a quick-filter tab with `showCount`.
		 *
		 * @param {object} config The page's source config with the tab's filter merged in.
		 * @return {Promise<number>} The total, or NaN when nothing can be requested.
		 */
		count: async (config) => {
			if (!requestable(config)) {
				return Number.NaN
			}
			const { url, rowsPath, totalPath } = config
			const { default: axios } = await import('@nextcloud/axios')
			const res = await axios.get(generateUrl(url), { params: paramsOf(config) })
			const body = res ? res.data : null
			const total = body && typeof body === 'object' && !Array.isArray(body) ? readRowsPath(body, totalPath || 'total') : undefined
			if (typeof total === 'number' && Number.isFinite(total)) {
				return total
			}
			const rows = Array.isArray(body) ? body : readRowsPath(body, rowsPath || 'results')
			return Array.isArray(rows) ? rows.length : Number.NaN
		},

		/**
		 * @return {Array<object>} The rows the endpoint returned.
		 */
		rows: () => state.rows,

		/**
		 * @return {boolean} Whether a load is in flight.
		 */
		loading: () => state.loading,

		/**
		 * @return {string} The sentence the last load was refused with, or ''.
		 */
		refusal: () => state.refusal,

		/**
		 * @return {boolean} Whether the last load failed for another reason than a refusal.
		 */
		failed: () => state.failed,

		/**
		 * @return {string} The note read off the last answer, or ''.
		 */
		note: () => state.note,

		/**
		 * @return {object} The declared facets of the last answer, `{ <field>: [{ value, count }] }`.
		 */
		facets: () => state.facets,
	}
}

/**
 * Fill `{field}` placeholders in a link template from a row.
 *
 * @param {string} template A path such as `/apps/dossiq/cases/{id}`.
 * @param {object} row The row.
 * @return {string} The path.
 */
function fillRowTemplate(template, row) {
	return String(template).replace(/\{([\w.@]+)\}/g, (match, path) => {
		const value = readPath(row, path)
		return value === undefined || value === null ? '' : encodeURIComponent(String(value))
	})
}

/**
 * The search source: one search term over several OpenRegister schemas and
 * the reader's files (`entitySource: "search"`), with a quick filter per kind
 * and its count (DqZoekresultaten).
 *
 * `sourceConfig.kinds` lists what is searched:
 * `{ id, label, register, schema, titleField?, subtitleField?, statusField?, statusResolve?, linkedField?, linkedTemplate?, href?, limit? }`
 * for objects (OpenRegister's `_search`, so the reader sees what they may
 * read), or `{ id, label, files: true, limit? }` for the reader's files
 * (Nextcloud's unified search). The term is `sourceConfig.term`, else the
 * address's `?q=` (or `sourceConfig.termQuery`). A kind that fails shows no
 * rows and no count; the others still answer.
 *
 * The kind's `label` goes through the app's translate (the "Soort" cell and
 * the quick filters). `statusResolve: { register?, schema, labelField? }`
 * reads `statusField` as a reference and shows the referenced object's label
 * (`labelField`, else `title`, then `name`); the status column is a pill,
 * coloured by `sourceConfig.statusColorMap`. `linkedTemplate` (a field
 * template, "{case.title}") or `linkedField` (a path) fills the "Linked"
 * column, drawn when a kind declares one; `sourceConfig.linkedLabel` names it.
 * The page's title and count line can name the term as `{term}`, and the
 * count is the active kind's total. Kind, link and status are filterable.
 *
 * @param {object} [config] The page's source config.
 * @param {object} [context] The page's helpers.
 * @param {Function} [context.translate] The app's translate.
 * @return {object} The source adapter.
 * @spec openspec/changes/index-search-source/specs/index-page/spec.md#requirement-an-index-page-can-search-several-schemas-and-files
 */
function searchSource(config = {}, context = {}) {
	const translate = typeof context.translate === 'function' ? context.translate : (text) => text
	const kinds = (Array.isArray(config && config.kinds) ? config.kinds : [])
		.filter((kind) => kind && typeof kind.id === 'string' && kind.id !== '' && (kind.files === true || (kind.register && kind.schema)))
		.map((kind) => ({ ...kind, label: translate(String(kind.label || kind.id)) }))
	const hasLinked = kinds.some((kind) => kind.linkedTemplate || kind.linkedField)
	// The All tab in the app's word when it has one ("Alles" in dossiq, as its
	// other lists say), else the library's.
	const allLabel = () => {
		const own = translate('All')
		return own !== 'All' ? own : t('nextcloud-vue', 'All')
	}
	const state = reactive({ rows: [], totals: {}, loading: false, kind: 'all', term: '', filters: {} })
	let seq = 0
	// Once the page's search box has sent a term, an empty box means no term,
	// not the address's `?q=` again.
	let boxUsed = false
	const addressTerm = () => {
		const query = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
		return String((query && query.get((config && config.termQuery) || 'q')) || '').trim()
	}

	/**
	 * The labels of the objects a kind's status points at, by id: the
	 * referenced schema read once per search.
	 *
	 * @param {object} kind The kind with `statusResolve`.
	 * @return {Promise<Map<string, string>>} Labels by id; empty when it cannot be read.
	 */
	const statusLabels = async (kind) => {
		const resolve = kind.statusResolve
		if (!resolve || !resolve.schema) {
			return new Map()
		}
		const objects = await fetchReferenceObjects({ register: resolve.register || kind.register, schema: resolve.schema }).catch(() => [])
		const labels = new Map()
		for (const object of objects) {
			const id = object.id || object.uuid || (object['@self'] && object['@self'].id)
			const label = readPath(object, resolve.labelField || 'title') ?? object.name
			if (id !== undefined && label !== undefined && label !== null) {
				labels.set(String(id), String(label))
			}
		}
		return labels
	}

	/**
	 * What a row shows in the Linked column.
	 *
	 * @param {object} kind The row's kind.
	 * @param {object} object The found object.
	 * @return {string}
	 */
	/**
	 * What one row is, for the Kind column under `kindAsText`: the kind's
	 * `rowLabel` (a template on the found object, "{objectType}"), else the
	 * kind's label.
	 *
	 * @param {object} kind The row's kind.
	 * @param {object} object The found object or file entry.
	 * @return {string}
	 */
	const kindTextOf = (kind, object) => {
		if (typeof kind.rowLabel === 'string' && kind.rowLabel !== '') {
			const label = translate(kind.rowLabel)
			return kind.rowLabel.includes('{') ? (fillTemplate(label, object || {}) || kind.label) : label
		}
		return kind.label
	}

	/**
	 * What a row shows in the Linked column.
	 *
	 * @param {object} kind The row's kind.
	 * @param {object} object The found object.
	 * @return {string}
	 */
	const linkedOf = (kind, object) => {
		if (kind.linkedTemplate) {
			return fillTemplate(translate(kind.linkedTemplate), object)
		}
		if (kind.linkedField) {
			const value = readPath(object, kind.linkedField)
			return value === undefined || value === null ? '' : String(value)
		}
		return ''
	}

	const searchObjects = async (axios, kind, term) => {
		const url = generateUrl('/apps/openregister/api/objects/{register}/{schema}', { register: kind.register, schema: kind.schema })
		const res = await axios.get(url, { params: { _search: term, _limit: kind.limit || 20 } })
		const body = (res && res.data) || {}
		const results = Array.isArray(body.results) ? body.results : (Array.isArray(body) ? body : [])
		const labels = kind.statusResolve && kind.statusField ? await statusLabels(kind) : null
		return {
			total: typeof body.total === 'number' ? body.total : results.length,
			rows: results.map((object) => {
				const id = object.id || object.uuid || (object['@self'] && object['@self'].id)
				const rawStatus = kind.statusField ? readPath(object, kind.statusField) : undefined
				const status = rawStatus === undefined || rawStatus === null
					? ''
					: (labels ? (labels.get(String(rawStatus)) || '') : String(rawStatus))
				return {
					id: `${kind.id}:${id}`,
					kind: kind.id,
					kindLabel: kind.label,
					kindText: kindTextOf(kind, object),
					title: String(readPath(object, kind.titleField || 'title') ?? object.name ?? id ?? ''),
					subtitle: kind.subtitleField ? String(readPath(object, kind.subtitleField) ?? '') : '',
					status,
					linked: linkedOf(kind, object),
					href: kind.href ? generateUrl(fillRowTemplate(kind.href, { ...object, id })) : '',
					object,
				}
			}),
		}
	}

	const searchFiles = async (axios, kind, term) => {
		const res = await axios.get(generateOcsUrl('search/providers/files/search'), {
			params: { term, limit: kind.limit || 20, format: 'json' },
			headers: { 'OCS-APIRequest': 'true' },
		})
		const entries = (res && res.data && res.data.ocs && res.data.ocs.data && res.data.ocs.data.entries) || []
		return {
			total: entries.length,
			rows: entries.map((entry, index) => ({
				id: `${kind.id}:${entry.resourceUrl || index}`,
				kind: kind.id,
				kindLabel: kind.label,
				kindText: kindTextOf(kind, entry),
				title: entry.title || '',
				subtitle: entry.subline || '',
				status: '',
				linked: '',
				href: entry.resourceUrl || '',
			})),
		}
	}

	return {
		/**
		 * Run the search over every kind, in parallel.
		 *
		 * @param {object} cfg The page's source config with the active tab's `kind` merged in.
		 * @return {Promise<void>} Resolves when every kind answered or failed.
		 */
		load: async (cfg) => {
			state.kind = cfg && typeof cfg.kind === 'string' ? cfg.kind : 'all'
			// The header filters on Kind, Linked and Status narrow the answer
			// already fetched; they do not search again.
			const filters = {}
			for (const key of ['kindLabel', 'kindText', 'linked', 'status']) {
				const value = cfg && cfg[key]
				const values = (Array.isArray(value) ? value : (value === undefined || value === null || value === '' ? [] : [value])).map(String)
				if (values.length > 0) {
					filters[key] = values
				}
			}
			state.filters = filters
			const typed = cfg && typeof cfg.searchTerm === 'string' ? cfg.searchTerm.trim() : ''
			boxUsed = boxUsed || typed !== ''
			const term = typed || (boxUsed ? '' : String((cfg && cfg.term) || addressTerm()).trim())
			const mine = ++seq
			state.term = term
			if (term === '' || kinds.length === 0) {
				state.rows = []
				state.totals = {}
				return
			}
			state.loading = true
			const { default: axios } = await import('@nextcloud/axios')
			const answers = await Promise.all(kinds.map((kind) => (kind.files === true ? searchFiles(axios, kind, term) : searchObjects(axios, kind, term)).catch(() => null)))
			if (mine !== seq) {
				return
			}
			const totals = {}
			const rows = []
			answers.forEach((answer, index) => {
				if (answer) {
					totals[kinds[index].id] = answer.total
					rows.push(...answer.rows)
				}
			})
			state.totals = totals
			state.rows = rows
			state.loading = false
		},

		/**
		 * @return {Array<object>} The results of the active kind, or all of them.
		 */
		rows: () => (state.kind === 'all' ? state.rows : state.rows.filter((row) => row.kind === state.kind))
			.filter((row) => Object.entries(state.filters).every(([key, values]) => values.includes(String(row[key])))),

		/**
		 * @return {string} The term searched for, for a `{term}` in the title or count line.
		 */
		term: () => state.term,

		// The page's search box searches again, and starts out holding the
		// term from the address; the term shows as a removable chip.
		searchParam: 'searchTerm',
		initialSearch: () => String((config && config.term) || addressTerm()).trim(),
		searchChip: true,

		/**
		 * @return {number} The active kind's total, or every kind's together on All.
		 */
		total: () => (state.kind === 'all'
			? Object.values(state.totals).reduce((sum, value) => sum + value, 0)
			: (state.totals[state.kind] || 0)),

		/**
		 * @return {boolean} Whether a search is in flight.
		 */
		loading: () => state.loading,

		columns: [
			{ key: 'title', label: t('nextcloud-vue', 'Result'), secondary: 'subtitle', sortable: true },
			// `kindAsText`: what one row is, as plain text ("Zaak", "Lantaarnpaal",
			// DqZoekresultaten), instead of the plural kind as a pill.
			config && config.kindAsText === true
				? { key: 'kindText', label: t('nextcloud-vue', 'Kind'), sortable: true }
				: { key: 'kindLabel', label: t('nextcloud-vue', 'Kind'), enum: kinds.map((kind) => kind.label), sortable: true },
			...(hasLinked ? [{ key: 'linked', label: config.linkedLabel ? translate(config.linkedLabel) : t('nextcloud-vue', 'Linked'), sortable: true }] : []),
			{
				key: 'status',
				label: t('nextcloud-vue', 'Status'),
				widget: 'badge',
				widgetProps: { colorMap: (config && config.statusColorMap) || {} },
				sortable: true,
			},
		],

		/**
		 * Every column header carries a filter button (DqZoekresultaten); the
		 * filters narrow the answer already fetched (`load`).
		 */
		headerFilters: true,

		/**
		 * The page orders the rows a header asks for: the answer is one fetch,
		 * so there is nothing to ask the servers again.
		 */
		sortsRows: true,

		quickFilters: kinds.length > 0
			? [
					{ label: allLabel(), filter: { kind: 'all' }, default: true },
					...kinds.map((kind) => ({ label: kind.label || kind.id, filter: { kind: kind.id } })),
				]
			: null,

		/**
		 * The number on each kind's quick filter: the total each search
		 * reported, and their sum on All.
		 *
		 * @return {Record<number, number>} The counts by tab index.
		 */
		tabCounts: () => {
			const counts = { 0: Object.values(state.totals).reduce((sum, value) => sum + value, 0) }
			kinds.forEach((kind, index) => {
				if (typeof state.totals[kind.id] === 'number') {
					counts[index + 1] = state.totals[kind.id]
				}
			})
			return counts
		},

		/**
		 * Open a result where it lives.
		 *
		 * @param {object} row The clicked row.
		 * @return {void}
		 */
		openRow: (row) => {
			if (row && row.href) {
				window.location.assign(row.href)
			}
		},

		/**
		 * @param {object} row A row.
		 * @return {string|null} The URL the row opens, for a new tab.
		 */
		rowTarget: (row) => (row && row.href) || null,
	}
}

/**
 * The members that match a search, in the asked order, and the page of them
 * the pager asks for.
 *
 * @param {Array<object>} members The members, by name.
 * @param {object} config `search`, `nameLike`, `rolesLike`, `emailLike`, `today`, `sortKey`, `sortOrder`, `limit`, `offset`.
 * @return {{rows: Array<object>, total: number}} The page and how many match.
 */
function membersPage(members, config = {}) {
	const has = (member, fields, text) => fields.some((field) => String(member[field] || '').toLowerCase().includes(text))
	const term = String(config.search || '').trim().toLowerCase()
	let rows = term === '' ? members.slice() : members.filter((member) => has(member, ['displayname', 'function', 'roles', 'email'], term))
	// The table heads' filters: text contains, and the Today values picked.
	for (const [param, fields] of [['nameLike', ['displayname', 'function']], ['rolesLike', ['roles']], ['emailLike', ['email']]]) {
		const text = String(config[param] || '').trim().toLowerCase()
		if (text !== '') {
			rows = rows.filter((member) => has(member, fields, text))
		}
	}
	const today = (Array.isArray(config.today) ? config.today : (config.today ? [config.today] : [])).map(String)
	if (today.length > 0) {
		rows = rows.filter((member) => today.includes(member.today))
	}
	if (config.sortKey) {
		const sign = config.sortOrder === 'desc' ? -1 : 1
		rows = rows.sort((a, b) => sign * String(a[config.sortKey] ?? '').localeCompare(String(b[config.sortKey] ?? '')))
	}
	const total = rows.length
	const limit = Number(config.limit) || 0
	if (limit > 0) {
		const offset = Number(config.offset) || 0
		rows = rows.slice(offset, offset + limit)
	}
	return { rows, total }
}

/**
 * The users source: the members of a Nextcloud group, with their function,
 * roles, e-mail and whether they are in today (`entitySource: "users"`,
 * DqAfdelingen). Pair it with `folderSidebar: { source: 'groups',
 * filterField: 'group' }`, which lists the groups as the folder tree; the
 * selected group arrives as `group`. `sourceConfig.group` is the group shown
 * before one is picked; without one, All lists every user the reader may
 * list (all users for an admin, their groups' users for a sub-admin).
 *
 * Today is the dav app's out-of-office period when one runs now ("Absent
 * until 14 Oct"), else the user status (present, away) and its message. The
 * function is the profile `headline`, the roles the profile `role`, unless
 * `sourceConfig.functionField` / `rolesField` name other user fields.
 * Listing a group needs an admin or the group's sub-admin; a refused request
 * leaves the list empty.
 *
 * The page gets a pager (`pages`), and the search term and the header's order
 * come as `search` and `sortKey` / `sortOrder`: the group's members are read
 * once and searched, sorted and paged here, so a new page, term or order does
 * not read every member's presence again.
 *
 * @return {object} The source adapter.
 * @spec openspec/changes/index-groups-users-source/specs/index-page/spec.md#requirement-an-index-page-can-list-nextcloud-groups-and-their-members
 */
function usersSource() {
	const state = reactive({ rows: [], loading: false, total: 0 })
	let seq = 0
	// The members last read, for the group and request they were read for.
	let readMembers = []
	let membersKey = null
	const presenceLabels = {
		present: t('nextcloud-vue', 'Present'),
		away: t('nextcloud-vue', 'Away'),
	}
	const presenceColors = {
		[presenceLabels.present]: 'success',
		[presenceLabels.away]: 'info',
	}

	return {
		/**
		 * Load the group's members and their presence.
		 *
		 * @param {object} config The page's source config with the picked `group`.
		 * @return {Promise<void>} Resolves when loaded.
		 */
		load: async (config) => {
			const group = String((config && (config.group || config.defaultGroup)) || '')
			const { search, sortKey, sortOrder, limit, offset, nameLike, rolesLike, emailLike, today, ...request } = config || {}
			const key = JSON.stringify({ ...request, group })
			const narrows = [offset, search, sortKey, nameLike, rolesLike, emailLike, today].some((value) => value !== undefined)
			// A new page, term, order or head filter of the members already read: no request.
			if (key === membersKey && narrows) {
				const page = membersPage(readMembers, config)
				state.rows = page.rows
				state.total = page.total
				return
			}
			const mine = ++seq
			state.loading = true
			try {
				const { default: axios } = await import('@nextcloud/axios')
				const [members, statuses] = await Promise.all([
					group === '' ? fetchUsers(axios, { limit: (config && config.limit) || 500 }) : fetchGroupMembers(axios, group),
					fetchStatuses(axios),
				])
				const functionField = (config && config.functionField) || 'headline'
				const rolesField = (config && config.rolesField) || 'role'
				const rows = await Promise.all(members.map(async (user) => {
					const presence = await fetchPresence(axios, user.id, statuses[user.id] || null)
					let today = ''
					if (presence.state === 'absent') {
						const until = presence.until ? new Date(`${presence.until}T12:00:00`) : null
						today = until
							? t('nextcloud-vue', 'Absent until {date}', { date: until.toLocaleDateString(getCanonicalLocale() || undefined, { day: 'numeric', month: 'short' }) })
							: t('nextcloud-vue', 'Absent')
					} else if (presence.message) {
						today = presence.message
					} else if (presenceLabels[presence.state]) {
						today = presenceLabels[presence.state]
					}
					return {
						id: user.id,
						displayname: user.displayname || user['display-name'] || user.id,
						function: String(user[functionField] || ''),
						roles: String(user[rolesField] || ''),
						email: user.email || '',
						today,
						presence: presence.state,
					}
				}))
				if (mine === seq) {
					readMembers = rows.sort((a, b) => a.displayname.localeCompare(b.displayname))
					membersKey = key
					const page = membersPage(readMembers, config)
					state.rows = page.rows
					state.total = page.total
				}
			} catch (error) {
				if (mine === seq) {
					readMembers = []
					membersKey = null
					state.rows = []
					state.total = 0
				}
				throw error
			} finally {
				if (mine === seq) {
					state.loading = false
				}
			}
		},

		/**
		 * @return {Array<object>} The members on this page.
		 */
		rows: () => state.rows,

		pages: true,

		/**
		 * @return {number} The members that match, on every page.
		 */
		total: () => state.total,

		searchParam: 'search',

		/**
		 * @param {string} key The column.
		 * @param {string} order `asc` or `desc`.
		 * @return {object} The load arguments.
		 */
		sortParam: (key, order) => ({ sortKey: key, sortOrder: order }),

		/**
		 * @return {boolean} Whether a load is in flight.
		 */
		loading: () => state.loading,

		columns: [
			{ key: 'displayname', label: t('nextcloud-vue', 'Employee'), secondary: 'function' },
			{ key: 'roles', label: t('nextcloud-vue', 'Roles') },
			{ key: 'email', label: t('nextcloud-vue', 'E-mail') },
			{ key: 'today', label: t('nextcloud-vue', 'Today'), widget: 'badge', widgetProps: { colorMap: presenceColors, variant: 'warning' } },
		],

		searchFields: {
			group: { param: 'group', single: true },
			'displayname[like]': { param: 'nameLike', single: true },
			'roles[like]': { param: 'rolesLike', single: true },
			'email[like]': { param: 'emailLike', single: true },
			today: { param: 'today' },
		},

		/** A filter button on every head (DqAfdelingen); the members read are narrowed here. */
		headerFilters: true,

		showAdd: false,
	}
}

/**
 * The organisations source: OpenRegister organisations, which are not
 * register/schema objects.
 *
 * The list is the viewer's own organisations and the single read refuses an
 * organisation the viewer has no access to; both are decided by OpenRegister
 * from the session. The adapter forwards nothing that could widen that.
 *
 * It is a RECORD source as well (`loadRecord` + `record`), so a
 * `type: "detail"` page with the same `entitySource` shows one organisation
 * with the header, pills, facts and `@objectId` / `@object.*` tokens an object
 * page has.
 *
 * @return {object} The source adapter.
 * @spec openspec/changes/organisations-entity-source/specs/organisations-entity-source/spec.md
 */
function organisationsSource() {
	const store = useOrganisationStore()

	const statusLabels = {
		provisioning: t('nextcloud-vue', 'Provisioning'),
		active: t('nextcloud-vue', 'Active'),
		suspended: t('nextcloud-vue', 'Suspended'),
		deprovisioning: t('nextcloud-vue', 'Deprovisioning'),
		archived: t('nextcloud-vue', 'Archived'),
		retained: t('nextcloud-vue', 'Retained'),
	}

	return {
		store,

		/**
		 * Load the viewer's organisations. The endpoint takes no parameters.
		 *
		 * @return {Promise<void>} Resolves when loaded.
		 */
		load: () => store.load(),

		/**
		 * @return {Array<object>} The rows, keyed on the organisation uuid.
		 */
		rows: () => (store.organisations || []).map(organisationRecord),

		/**
		 * @return {boolean} Whether a load is in flight.
		 */
		loading: () => !!store.loading,

		/**
		 * Read one organisation for a detail page.
		 *
		 * @param {string} id The organisation uuid.
		 * @return {Promise<object|null>} The organisation, or null when it could not be read.
		 */
		loadRecord: (id) => store.fetchRecord(id),

		/**
		 * @param {string} id The organisation uuid.
		 * @return {object|null} The organisation read for this id, keyed on its uuid, or null.
		 */
		record: (id) => {
			const organisation = store.records?.[String(id)]
			return organisation ? organisationRecord(organisation) : null
		},

		/**
		 * @param {string} id The organisation uuid.
		 * @return {number|null} The HTTP status of a failed read of this id, or null.
		 */
		recordError: (id) => store.recordErrors?.[String(id)] ?? null,

		columns: [
			{ key: 'name', label: t('nextcloud-vue', 'Name') },
			{
				key: 'status',
				label: t('nextcloud-vue', 'Status'),
				enum: Object.keys(statusLabels),
				enumLabels: statusLabels,
				colorMap: { active: 'success', provisioning: 'info', suspended: 'warning', deprovisioning: 'error', archived: 'default', retained: 'default' },
			},
			{ key: 'type', label: t('nextcloud-vue', 'Type') },
			{ key: 'created', label: t('nextcloud-vue', 'Created'), type: 'string', format: 'date-time' },
		],

		// Creating an organisation is not the index's object form, and
		// OpenRegister has no delete for one, so neither action is offered.
		showAdd: false,
		title: t('nextcloud-vue', 'Organisations'),
	}
}

/**
 * The registered sources, by the name a manifest uses.
 *
 * @type {Record<string, () => object>}
 */
export { flowRunStatuses }

export const indexSources = {
	flows: flowsSource,
	flowRuns: flowRunsSource,
	tasks: tasksSource,
	endpoint: endpointSource,
	search: searchSource,
	users: usersSource,
	organisations: organisationsSource,
}

/**
 * Resolve a named source.
 *
 * Returns null for an unknown name rather than throwing, and the caller warns:
 * a typo in a manifest should degrade to the ordinary empty index with a
 * console message naming the source, not white-screen the app. It must NOT
 * silently render an empty list with no explanation, because that is
 * indistinguishable from a source that genuinely has no rows.
 *
 * @param {string} name The source name from `config.source`.
 * @param {object} [config] The page's source config, for a source that builds its tabs from it.
 * @param {object} [context] The page's helpers a source may use, such as `translate` (the app's catalogue).
 *
 * @return {object|null} The adapter, or null when the name is not registered.
 */
export function resolveIndexSource(name, config, context) {
	const key = String(name || '')
	if (!key) {
		return null
	}

	const factory = indexSources[key]
	if (typeof factory !== 'function') {
		// eslint-disable-next-line no-console
		console.warn(`[CnIndexPage] Unknown index source "${key}" — known sources: ${Object.keys(indexSources).join(', ')}. The list will be empty.`)
		return null
	}

	return factory(config || {}, context || {})
}

/**
 * Resolve a named source for ONE record, for a `type: "detail"` page.
 *
 * The same registry as the index: a source that can also read a single record
 * supplies `loadRecord(id)` and `record(id)`, and the detail page names it with
 * the same `entitySource`. A name that is unknown, or a source that cannot read
 * one record, resolves to null with a console warning, and the page shows no
 * record rather than the wrong one.
 *
 * @param {string} name The source name from `config.entitySource`.
 * @return {object|null} The adapter, or null.
 * @spec openspec/changes/organisations-entity-source/specs/organisations-entity-source/spec.md
 */
export function resolveRecordSource(name) {
	const key = String(name || '')
	if (!key) {
		return null
	}
	const factory = indexSources[key]
	const source = typeof factory === 'function' ? factory() : null
	if (!source || typeof source.loadRecord !== 'function' || typeof source.record !== 'function') {
		// eslint-disable-next-line no-console
		console.warn(`[CnDetailPage] entitySource "${key}" is not a source that reads one record. The page shows no record.`)
		return null
	}
	return source
}

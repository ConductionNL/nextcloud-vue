/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import { useFlowStore } from './useFlowStore.js'
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
 * The flow source: OpenRegister's one native flow store.
 *
 * @return {object} The source adapter.
 */
function flowsSource() {
	const store = useFlowStore()

	return {
		store,

		/**
		 * Load the flows for the scoped app.
		 *
		 * @param {object} config The page config.
		 *
		 * @return {Promise<void>} Resolves when loaded.
		 */
		load: (config) => store.load({ app: config?.app }),

		/**
		 * @return {Array<object>} The rows, with the display status resolved.
		 */
		rows: () => (store.flows || []).map((flow) => ({
			...flow,
			// Enabled and dispatchable are NOT the same thing: a trigger fires
			// with no acting user, so a flow with no owner has no identity to
			// run as and will not start however enabled it looks.
			statusLabel: flow.enabled === false
				? t('nextcloud-vue', 'Disabled')
				: (flow.owner ? t('nextcloud-vue', 'Enabled') : t('nextcloud-vue', 'No owner')),
		})),

		/**
		 * @return {boolean} Whether a load is in flight.
		 */
		loading: () => !!store.loading,

		columns: [
			{ key: 'name', label: t('nextcloud-vue', 'Name') },
			{ key: 'description', label: t('nextcloud-vue', 'Description') },
			{ key: 'trigger', label: t('nextcloud-vue', 'Trigger') },
			{ key: 'cron', label: t('nextcloud-vue', 'Schedule') },
			{ key: 'statusLabel', label: t('nextcloud-vue', 'Status') },
		],

		rowActions: [
			{ label: t('nextcloud-vue', 'Edit'), icon: Pencil, action: 'open' },
		],

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
		rows: () => (store.tasks || []).map((task) => ({
			...task,
			// CnIndexPage keys rows on `id` by default; the row contract's
			// identity is the uuid.
			id: task.uuid,
			title: task.displayTitle || task.title || task.uuid,
			subjectLabel: (task.subject && task.subject.title) || '',
			stateLabel: stateLabels[task.state] || String(task.state || ''),
			priorityLabel: priorityLabels[task.priority] || String(task.priority || ''),
			dueLabel: taskDueLabel(task),
		})),

		/**
		 * @return {boolean} Whether a load is in flight.
		 */
		loading: () => !!store.loading,

		columns: [
			{ key: 'title', label: t('nextcloud-vue', 'Task') },
			{ key: 'subjectLabel', label: t('nextcloud-vue', 'Subject') },
			{ key: 'stateLabel', label: t('nextcloud-vue', 'State'), widget: 'badge', widgetProps: { colorMap: stateColorMap } },
			{ key: 'priorityLabel', label: t('nextcloud-vue', 'Priority'), widget: 'badge', widgetProps: { colorMap: priorityColorMap } },
			{ key: 'dueLabel', label: t('nextcloud-vue', 'Due') },
			{ key: 'assignee', label: t('nextcloud-vue', 'Assignee') },
		],

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

		// A task is created by a flow, never by a person clicking Add. Without
		// this the index falls back to its OpenRegister form dialog, which
		// would build an object the task store never reads.
		showAdd: false,
		description: t('nextcloud-vue', 'Your tasks from every app, in one inbox. Claim from the pool, then complete with an outcome.'),
		title: t('nextcloud-vue', 'Tasks'),
	}
}

/**
 * The registered sources, by the name a manifest uses.
 *
 * @type {Record<string, Function>}
 */
export const indexSources = {
	flows: flowsSource,
	tasks: tasksSource,
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
 *
 * @return {object|null} The adapter, or null when the name is not registered.
 */
export function resolveIndexSource(name) {
	const key = String(name || '')
	if (!key) {
		return null
	}

	const factory = indexSources[key]
	if (typeof factory !== 'function') {
		console.warn(`[CnIndexPage] Unknown index source "${key}" — known sources: ${Object.keys(indexSources).join(', ')}. The list will be empty.`)
		return null
	}

	return factory()
}

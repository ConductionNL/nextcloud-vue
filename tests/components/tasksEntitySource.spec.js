/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

/**
 * THE TASKS ENTITY SOURCE (cn-tasks-entity-source).
 *
 * What could go wrong quietly here is the query: an inbox that silently asks
 * for the wrong scope, forwards a smuggled user parameter, or filters a
 * returned page client-side renders a plausible list of the WRONG work. So
 * these tests pin the request, not just the adapter's shape. The named-source
 * quick-filter wiring gets the same treatment: the mount must issue exactly
 * ONE request, and a tab switch must RELOAD rather than re-slice.
 */

var mockGet = jest.fn(() => Promise.resolve({ data: { results: [], total: 0 } }))

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: (...args) => mockGet(...args),
	},
}))

import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'

const { indexSources, resolveIndexSource, taskDueLabel, taskDeepLink } = require('../../src/composables/indexSources.js')
const { useTaskInboxStore } = require('../../src/composables/useTaskInboxStore.js')
const { useNamedSource } = require('../../src/components/CnIndexPage/useNamedSource.js')

/** @return {object} The params of the most recent GET. */
function lastParams() {
	const call = mockGet.mock.calls[mockGet.mock.calls.length - 1]
	return call[1].params
}

beforeEach(() => {
	mockGet.mockClear()
})

describe('the tasks source is registered', () => {
	it('resolves with the adapter fields an index needs', () => {
		const source = resolveIndexSource('tasks')

		expect(source).toBeTruthy()
		expect(typeof source.load).toBe('function')
		expect(typeof source.rows).toBe('function')
		expect(typeof source.loading).toBe('function')
		expect(typeof source.openRow).toBe('function')
		expect(source.showAdd).toBe(false)
		expect(source.columns.map((c) => c.key)).toEqual(['title', 'subjectLabel', 'stateLabel', 'priorityLabel', 'dueLabel', 'assignee'])
	})

	it('supplies the scope tabs with assigned as the default', () => {
		const source = indexSources.tasks()

		const tabs = source.quickFilters
		expect(tabs[0].default).toBe(true)
		expect(tabs[0].filter).toEqual({ scope: 'assigned' })
		expect(tabs.map((t) => t.filter.scope)).toEqual(['assigned', 'pooled', 'watched', 'all', undefined])
		expect(tabs[4].filter).toEqual({ overdue: true })
	})
})

describe('the inbox request', () => {
	it('defaults to the assigned scope, most urgent first', async () => {
		const store = useTaskInboxStore()
		await store.load({})

		expect(mockGet.mock.calls[0][0]).toContain('/apps/openregister/api/flow-tasks')
		expect(lastParams()).toEqual({ scope: 'assigned', sort: '-dueAt' })
	})

	it('forwards the loader config keys the endpoint knows', async () => {
		const store = useTaskInboxStore()
		await store.load({ scope: 'watched', priority: 'high', state: 'active', overdue: true, limit: 10 })

		expect(lastParams()).toEqual({
			scope: 'watched',
			priority: 'high',
			state: 'active',
			overdue: 'true',
			sort: '-dueAt',
			limit: 10,
		})
	})

	/**
	 * Whose inbox it is stays the endpoint's decision. A config that tries
	 * to name another user must be dropped structurally, not by convention.
	 */
	it('never forwards a user-naming parameter', async () => {
		const store = useTaskInboxStore()
		await store.load({ uid: 'someone-else', assignee: 'someone-else', scope: 'assigned' })

		expect(lastParams()).toEqual({ scope: 'assigned', sort: '-dueAt' })
	})

	it('keeps the datastore total, not the page length', async () => {
		mockGet.mockResolvedValueOnce({ data: { results: [{ uuid: 't-1' }], total: 41 } })
		const store = useTaskInboxStore()
		await store.load({})

		expect(store.tasks.length).toBe(1)
		expect(store.total).toBe(41)
	})

	it('surfaces a failed load as an error, not as an empty inbox', async () => {
		const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
		mockGet.mockRejectedValueOnce(new Error('boom'))
		const store = useTaskInboxStore()
		await store.load({})

		expect(store.error).toBeTruthy()
		expect(store.loading).toBe(false)
		expect(consoleError).toHaveBeenCalled()
		consoleError.mockRestore()
	})
})

describe('the row mapping says state, due and priority in words', () => {
	it('maps the server row onto the display fields', () => {
		const source = indexSources.tasks()
		source.store.tasks = [{
			uuid: 't-1',
			displayTitle: 'Beoordeel offerte',
			state: 'active',
			priority: 'urgent',
			assignee: 'alice',
			subject: { uuid: 'o-1', register: 'dossiq', schema: 'case', title: 'Dossier 12' },
			overdue: false,
			daysUntilDue: 2,
			dueAt: '2026-09-03T12:00:00+02:00',
		}]

		const row = source.rows()[0]
		expect(row.id).toBe('t-1')
		expect(row.title).toBe('Beoordeel offerte')
		expect(row.subjectLabel).toBe('Dossier 12')
		expect(row.stateLabel).toBe('In progress')
		expect(row.priorityLabel).toBe('Urgent')
		expect(row.dueLabel).toBe('Due in 2 days')
	})

	it('says overdue in words, with the day count', () => {
		expect(taskDueLabel({ overdue: true, daysOverdue: 3 })).toBe('Overdue by 3 days')
		expect(taskDueLabel({ overdue: true, daysOverdue: 1 })).toBe('Overdue by 1 day')
		expect(taskDueLabel({ overdue: false, daysUntilDue: 0, dueAt: 'x' })).toBe('Due today')
		expect(taskDueLabel({ overdue: false, daysUntilDue: 1, dueAt: 'x' })).toBe('Due tomorrow')
		expect(taskDueLabel({ dueAt: null })).toBe('')
	})

	/**
	 * The pill's colour map is keyed on the SHOWN label, so state can never
	 * rest on colour alone and the lookup survives translation.
	 */
	it('keys the badge colour maps on the shown labels', () => {
		const source = indexSources.tasks()
		const state = source.columns.find((c) => c.key === 'stateLabel')
		const priority = source.columns.find((c) => c.key === 'priorityLabel')

		expect(state.widget).toBe('badge')
		expect(state.widgetProps.colorMap['In progress']).toBe('primary')
		expect(state.widgetProps.colorMap.Terminated).toBe('error')
		expect(priority.widget).toBe('badge')
		expect(priority.widgetProps.colorMap.Urgent).toBe('error')
	})
})

describe('a row opens the task deep link', () => {
	it('navigates to the openregister page, as a full URL', () => {
		const source = indexSources.tasks()
		const original = window.location
		// A full stand-in, not a bare `{ assign }`: `generateUrl` reads
		// `pathname`/`href` off the live location, and a partial stub breaks
		// every later spec in the file, not this one.
		delete window.location
		window.location = { assign: jest.fn(), href: original.href, pathname: original.pathname }

		try {
			source.openRow({ uuid: 't-9' })
			expect(window.location.assign).toHaveBeenCalledWith(taskDeepLink('t-9'))
			expect(taskDeepLink('t-9')).toContain('/apps/openregister/flow-tasks/t-9')

			source.openRow({})
			expect(window.location.assign).toHaveBeenCalledTimes(1)
		} finally {
			window.location = original
		}
	})
})

describe('named-source quick filters', () => {
	/**
	 * Mount a bare host that runs the composable, so onMounted and the
	 * watcher behave exactly as they do inside CnIndexPage.
	 *
	 * @param {object} props The CnIndexPage-shaped props.
	 * @param {import('vue').Ref<number|null>} activeIndex The shared tab index ref.
	 * @return {object} The mounted wrapper with the composable's return on vm.named.
	 */
	function mountHost(props, activeIndex) {
		return mount({
			template: '<div />',
			setup() {
				const named = useNamedSource(props, { activeQuickFilterIndex: activeIndex })
				return { named }
			},
		})
	}

	it('mounts with exactly one request, carrying the default tab scope', async () => {
		const activeIndex = ref(null)
		mountHost({ entitySource: 'tasks', objects: [], quickFilters: null, sourceConfig: null }, activeIndex)
		await nextTick()

		expect(activeIndex.value).toBe(0)
		expect(mockGet).toHaveBeenCalledTimes(1)
		expect(lastParams().scope).toBe('assigned')
	})

	it('reloads with the tab filter when the tab changes, tab winning over sourceConfig', async () => {
		const activeIndex = ref(null)
		mountHost({ entitySource: 'tasks', objects: [], quickFilters: null, sourceConfig: { scope: 'assigned', limit: 10 } }, activeIndex)
		await nextTick()

		activeIndex.value = 1
		await nextTick()
		await nextTick()

		expect(mockGet).toHaveBeenCalledTimes(2)
		expect(lastParams()).toEqual({ scope: 'pooled', sort: '-dueAt', limit: 10 })
	})

	it('lets a manifest tab strip win over the source tabs', async () => {
		const activeIndex = ref(0)
		const wrapper = mountHost({
			entitySource: 'tasks',
			objects: [],
			quickFilters: [
				{ label: 'Urgent', filter: { priority: 'urgent' }, default: true },
			],
			sourceConfig: null,
		}, activeIndex)
		await nextTick()

		expect(wrapper.vm.named.namedQuickFilters.length).toBe(1)
		expect(lastParams().priority).toBe('urgent')
	})

	it('exposes the source tabs for the page strip when the manifest has none', () => {
		const activeIndex = ref(null)
		const wrapper = mountHost({ entitySource: 'tasks', objects: [], quickFilters: null, sourceConfig: null }, activeIndex)

		expect(wrapper.vm.named.namedQuickFilters.map((t) => t.label)[1]).toBe('Pool')
	})

	/**
	 * A TAB FILTER IS A FILTER, so `@today` has to resolve here too.
	 *
	 * Without this the literal string `@today+7d` went over the wire and the
	 * task endpoint either rejected it or answered the wrong window. The
	 * manifest author writing a due-window lens has no way of knowing that
	 * the page behind the label is a named source rather than a self-fetch,
	 * and self-fetch has resolved tokens since the first day.
	 */
	it('resolves sentinel tokens in a tab filter before the request', async () => {
		const activeIndex = ref(0)
		mountHost({
			entitySource: 'tasks',
			objects: [],
			quickFilters: [
				{
					label: 'Due this week',
					filter: { scope: 'all', isTerminal: false, dueAfter: '@today', dueBefore: '@today+7d' },
					default: true,
				},
			],
			sourceConfig: null,
		}, activeIndex)
		await nextTick()

		const params = lastParams()
		const today = new Date()
		const iso = (d) => d.toISOString().slice(0, 10)
		const week = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000))

		expect(params.dueAfter).not.toBe('@today')
		expect(String(params.dueAfter)).toContain(iso(today))
		expect(String(params.dueBefore)).toContain(iso(week))
		// The literal keys around it are untouched.
		expect(params.scope).toBe('all')
		expect(params.isTerminal).toBe('false')
	})

	it('resolves a token in sourceConfig, not only in the tab', async () => {
		const activeIndex = ref(null)
		mountHost({
			entitySource: 'tasks',
			objects: [],
			quickFilters: null,
			sourceConfig: { dueBefore: '@today' },
		}, activeIndex)
		await nextTick()

		expect(lastParams().dueBefore).not.toBe('@today')
	})

	it('leaves a value that is not a token exactly as written', async () => {
		const activeIndex = ref(0)
		mountHost({
			entitySource: 'tasks',
			objects: [],
			quickFilters: [
				{ label: 'Urgent', filter: { priority: 'urgent' }, default: true },
			],
			sourceConfig: null,
		}, activeIndex)
		await nextTick()

		expect(lastParams().priority).toBe('urgent')
	})

	it('keeps the flows source on its old single-load path', async () => {
		const activeIndex = ref(null)
		mountHost({ entitySource: 'flows', objects: [], quickFilters: null, sourceConfig: { app: 'dossiq' } }, activeIndex)
		await nextTick()

		// No tabs: the index is never seeded and no reload watcher exists.
		expect(activeIndex.value).toBe(null)
	})
})

describe('the renderer bridges config to the source loader', () => {
	const resolvedProps = (page) => {
		const CnPageRenderer = require('../../src/components/CnPageRenderer/CnPageRenderer.vue').default
		return CnPageRenderer.computed.resolvedProps.call({
			currentPage: page,
			$route: { params: {} },
			detailPageByRegisterSchema: new Map(),
		})
	}

	it('hands the resolved config to sourceConfig for an entitySource page', () => {
		const props = resolvedProps({
			id: 'inbox',
			type: 'index',
			config: { entitySource: 'tasks', scope: 'pooled', limit: 10 },
		})

		expect(props.sourceConfig).toMatchObject({ scope: 'pooled', limit: 10 })
	})

	it('lets an explicit sourceConfig win unchanged', () => {
		const props = resolvedProps({
			id: 'inbox',
			type: 'index',
			config: { entitySource: 'tasks', scope: 'pooled', sourceConfig: { scope: 'watched' } },
		})

		expect(props.sourceConfig).toEqual({ scope: 'watched' })
	})

	it('adds nothing for an ordinary index page', () => {
		const props = resolvedProps({
			id: 'cases',
			type: 'index',
			config: { register: 'dossiq', schema: 'case' },
		})

		expect(props.sourceConfig).toBeUndefined()
	})
})

describe('the manifest schema accepts the tasks source', () => {
	it('validates entitySource: "tasks" on a v2 index page', () => {
		const { validateManifestV2 } = require('../../src/utils/validateManifest.js')
		const result = validateManifestV2({
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
			version: '2.0.0',
			menu: [],
			pages: [{
				id: 'task-inbox',
				route: '/tasks',
				type: 'index',
				title: 'Tasks',
				config: { entitySource: 'tasks' },
			}],
		})

		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('still rejects an unknown source name', () => {
		const { validateManifestV2 } = require('../../src/utils/validateManifest.js')
		const result = validateManifestV2({
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
			version: '2.0.0',
			menu: [],
			pages: [{
				id: 'task-inbox',
				route: '/tasks',
				type: 'index',
				title: 'Tasks',
				config: { entitySource: 'taskz' },
			}],
		})

		expect(result.valid).toBe(false)
	})
})

/**
 * `isTerminal` reaches the wire.
 *
 * The server has always accepted it — `TaskController` documents
 * "'true'|'false' to restrict on terminality" — and only the store's
 * allowlist withheld it. Without it an app cannot express "closed" or "my
 * open work" as a scope tab, which is two of dossiq's five task lenses.
 */
describe('useTaskInboxStore isTerminal', () => {
	beforeEach(() => {
		mockGet.mockClear()
	})

	it('passes isTerminal through, stringified like overdue', async () => {
		const store = useTaskInboxStore()

		await store.load({ scope: 'all', isTerminal: true })

		const params = mockGet.mock.calls[0][1].params
		expect(params.isTerminal).toBe('true')

		mockGet.mockClear()
		await store.load({ scope: 'assigned', isTerminal: false })
		expect(mockGet.mock.calls[0][1].params.isTerminal).toBe('false')
	})

	it('still drops a key that is not on the allowlist', async () => {
		const store = useTaskInboxStore()

		await store.load({ scope: 'all', assignee: 'someone', nonsense: 1 })

		const params = mockGet.mock.calls[0][1].params
		expect(params).not.toHaveProperty('assignee')
		expect(params).not.toHaveProperty('nonsense')
	})
})

/**
 * The due WINDOW reaches the wire.
 *
 * `overdue` is open-ended in the past, so it answers "what is late" and not
 * "what is due this week". The endpoint grew `dueAfter` / `dueBefore` for
 * the latter (openregister#3581), and without them in this allowlist a lens
 * for the week ahead has no server-side answer — only a client-side filter
 * over a paged window, which silently drops matching rows past the page
 * boundary.
 */
describe('useTaskInboxStore due window', () => {
	beforeEach(() => {
		mockGet.mockClear()
	})

	it('passes both ends of the window through, as given', async () => {
		const store = useTaskInboxStore()

		await store.load({
			scope: 'all',
			dueAfter: '2026-09-01T00:00:00+00:00',
			dueBefore: '2026-09-08T00:00:00+00:00',
		})

		const params = mockGet.mock.calls[0][1].params
		// ISO instants, not stringified booleans: the endpoint parses them
		// and refuses an unparseable one with 400.
		expect(params.dueAfter).toBe('2026-09-01T00:00:00+00:00')
		expect(params.dueBefore).toBe('2026-09-08T00:00:00+00:00')
	})

	it('lets each end stand alone', async () => {
		const store = useTaskInboxStore()

		await store.load({ dueBefore: '2026-09-08T00:00:00+00:00' })

		const params = mockGet.mock.calls[0][1].params
		expect(params.dueBefore).toBe('2026-09-08T00:00:00+00:00')
		expect(params).not.toHaveProperty('dueAfter')
	})
})

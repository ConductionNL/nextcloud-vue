/**
 * Tests for the unified actions dispatcher.
 *
 * Covers REQ-MVR-011 (manifest-v2-renderer):
 * - handler type calls handler fn
 * - missing handler warns
 * - absent type treated as handler
 * - open-modal calls openModal
 * - open-modal unknown target warns
 * - open-page calls router.push with name
 * - navigate calls router.push with target
 * - absent router warns for open-page/navigate
 */

const { dispatchAction } = require('../../src/utils/actionsDispatcher.js')

describe('dispatchAction — handler type', () => {
	it('calls the handler function with spread args', () => {
		const openDialog = jest.fn()
		dispatchAction(
			{ type: 'handler', handler: 'openDialog', args: ['confirm'] },
			{ handlers: { openDialog } },
		)
		expect(openDialog).toHaveBeenCalledWith('confirm')
	})

	it('calls handler with empty args when args is absent', () => {
		const fn = jest.fn()
		dispatchAction(
			{ type: 'handler', handler: 'fn' },
			{ handlers: { fn } },
		)
		expect(fn).toHaveBeenCalledWith()
	})

	it('missing handler emits console.warn and does NOT throw', () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		expect(() => {
			dispatchAction(
				{ handler: 'missingFn' },
				{ handlers: {} },
			)
		}).not.toThrow()
		expect(warnSpy).toHaveBeenCalled()
		warnSpy.mockRestore()
	})

	it('absent type is treated as "handler" (v1 backward compatibility)', () => {
		const fn = jest.fn()
		dispatchAction(
			{ handler: 'fn', args: [1, 2] },
			{ handlers: { fn } },
		)
		expect(fn).toHaveBeenCalledWith(1, 2)
	})
})

describe('dispatchAction — open-modal type', () => {
	it('calls openModal with key and props', () => {
		const openModal = jest.fn()
		dispatchAction(
			{ type: 'open-modal', target: 'confirm-archive', props: { title: 'Archive?' } },
			{
				registry: { 'confirm-archive': { kind: 'modal', component: {} } },
				openModal,
			},
		)
		expect(openModal).toHaveBeenCalledWith('confirm-archive', { title: 'Archive?' })
	})

	it('calls openModal with empty props when props is absent', () => {
		const openModal = jest.fn()
		dispatchAction(
			{ type: 'open-modal', target: 'my-modal' },
			{
				registry: { 'my-modal': { kind: 'modal', component: {} } },
				openModal,
			},
		)
		expect(openModal).toHaveBeenCalledWith('my-modal', {})
	})

	it('warns and does NOT call openModal when target not in registry', () => {
		const openModal = jest.fn()
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		dispatchAction(
			{ type: 'open-modal', target: 'does-not-exist' },
			{ registry: {}, openModal },
		)
		expect(openModal).not.toHaveBeenCalled()
		expect(warnSpy).toHaveBeenCalled()
		warnSpy.mockRestore()
	})

	it('warns when target entry has wrong kind', () => {
		const openModal = jest.fn()
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		dispatchAction(
			{ type: 'open-modal', target: 'my-page' },
			{
				registry: { 'my-page': { kind: 'page', component: {} } },
				openModal,
			},
		)
		expect(openModal).not.toHaveBeenCalled()
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('modal'))
		warnSpy.mockRestore()
	})
})

describe('dispatchAction — open-page type', () => {
	it('calls router.push with { name: target }', () => {
		const push = jest.fn()
		dispatchAction(
			{ type: 'open-page', target: 'meetings-index' },
			{ router: { push } },
		)
		expect(push).toHaveBeenCalledWith({ name: 'meetings-index' })
	})

	it('warns and does NOT throw when router is absent', () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		expect(() => {
			dispatchAction({ type: 'open-page', target: 'home' }, {})
		}).not.toThrow()
		expect(warnSpy).toHaveBeenCalled()
		warnSpy.mockRestore()
	})
})

describe('dispatchAction — navigate type', () => {
	it('calls router.push with target string', () => {
		const push = jest.fn()
		dispatchAction(
			{ type: 'navigate', target: '/apps/decidesk/settings' },
			{ router: { push } },
		)
		expect(push).toHaveBeenCalledWith('/apps/decidesk/settings')
	})

	it('calls router.push with route location object', () => {
		const push = jest.fn()
		const location = { path: '/custom', query: { tab: 'general' } }
		dispatchAction(
			{ type: 'navigate', target: location },
			{ router: { push } },
		)
		expect(push).toHaveBeenCalledWith(location)
	})

	it('warns and does NOT throw when router is absent', () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		expect(() => {
			dispatchAction({ type: 'navigate', target: '/foo' }, {})
		}).not.toThrow()
		expect(warnSpy).toHaveBeenCalled()
		warnSpy.mockRestore()
	})
})

/**
 * object-op — declarative OpenRegister mutation dispatch (ADR-049 /
 * list-widget-enrichment "Declarative row actions include an object-op
 * mutation type"). All verbs dispatch via the shared object store
 * (saveObject for patch/create, deleteObject for delete); the manifest
 * declares INTENT only — authorization-shaped fields have no effect and
 * a rejected write surfaces without local mutation (the store only
 * writes caches on success).
 */
describe('dispatchAction — object-op type', () => {
	/**
	 * Fake useObjectStore-shaped store for dispatch assertions.
	 *
	 * @param {object} [overrides] Method/state overrides.
	 * @return {object} The fake store.
	 */
	function makeStore(overrides = {}) {
		return {
			objectTypeRegistry: {},
			errors: {},
			registerObjectType: jest.fn(function(slug, schemaId, registerId) {
				this.objectTypeRegistry[slug] = {
					schema: schemaId, register: registerId, registerSlug: null, schemaSlug: null,
				}
			}),
			saveObject: jest.fn().mockResolvedValue({ id: '42' }),
			deleteObject: jest.fn().mockResolvedValue(true),
			...overrides,
		}
	}

	const source = { register: 'pipelinq', schema: 'case' }

	it('patch calls saveObject with the row object merged with values against the source type', async () => {
		const store = makeStore()
		const row = { id: '42', title: 'A case', status: 'open' }
		const result = await dispatchAction(
			{ type: 'object-op', op: 'patch', values: { status: 'accepted' } },
			{ objectStore: store, source, row },
		)
		expect(store.registerObjectType).toHaveBeenCalledWith('pipelinq/case', 'case', 'pipelinq')
		expect(store.saveObject).toHaveBeenCalledWith('pipelinq/case', {
			id: '42', title: 'A case', status: 'accepted',
		})
		expect(result).toEqual({ id: '42' })
	})

	it('patch reuses an already-registered type whose config matches the source', async () => {
		const store = makeStore()
		store.objectTypeRegistry = {
			case: { schema: 'case', register: 'pipelinq', registerSlug: null, schemaSlug: null },
		}
		await dispatchAction(
			{ type: 'object-op', op: 'patch', values: { status: 'won' } },
			{ objectStore: store, source, row: { id: '7' } },
		)
		expect(store.registerObjectType).not.toHaveBeenCalled()
		expect(store.saveObject).toHaveBeenCalledWith('case', { id: '7', status: 'won' })
	})

	it('delete calls deleteObject with the row id (with @self.id fallback)', async () => {
		const store = makeStore()
		const ok = await dispatchAction(
			{ type: 'object-op', op: 'delete' },
			{ objectStore: store, source, row: { '@self': { id: 'uuid-9' }, title: 'x' } },
		)
		expect(store.deleteObject).toHaveBeenCalledWith('pipelinq/case', 'uuid-9')
		expect(store.saveObject).not.toHaveBeenCalled()
		expect(ok).toBe(true)
	})

	it('create calls saveObject with values as a new object (no row required)', async () => {
		const store = makeStore()
		await dispatchAction(
			{ type: 'object-op', op: 'create', values: { title: 'New case', status: 'open' } },
			{ objectStore: store, source },
		)
		expect(store.saveObject).toHaveBeenCalledWith('pipelinq/case', { title: 'New case', status: 'open' })
	})

	it('a rejected (RBAC) write resolves to the store failure value and mutates NO local state', async () => {
		const store = makeStore({ saveObject: jest.fn().mockResolvedValue(null) })
		const row = { id: '42', status: 'open' }
		const before = JSON.parse(JSON.stringify(row))
		const result = await dispatchAction(
			{ type: 'object-op', op: 'patch', values: { status: 'accepted' } },
			{ objectStore: store, source, row },
		)
		expect(result).toBeNull()
		// The dispatcher builds a NEW payload — the caller's row is untouched.
		expect(row).toEqual(before)
	})

	it('authorization-shaped fields (role / allow) have NO effect on dispatch', async () => {
		const store = makeStore()
		await dispatchAction(
			{ type: 'object-op', op: 'patch', values: { status: 'accepted' }, role: 'admin', allow: false },
			{ objectStore: store, source, row: { id: '1', status: 'open' } },
		)
		// Dispatched exactly as without the fields — and none of them leak
		// into the payload.
		expect(store.saveObject).toHaveBeenCalledWith('pipelinq/case', { id: '1', status: 'accepted' })
	})

	it('invalid op warns and calls no store method', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const store = makeStore()
		const result = dispatchAction(
			{ type: 'object-op', op: 'truncate' },
			{ objectStore: store, source, row: { id: '1' } },
		)
		expect(result).toBeUndefined()
		expect(store.saveObject).not.toHaveBeenCalled()
		expect(store.deleteObject).not.toHaveBeenCalled()
		expect(warnSpy).toHaveBeenCalled()
		warnSpy.mockRestore()
	})

	it('warns and does NOT throw when objectStore / source / row are missing', () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		expect(() => {
			dispatchAction({ type: 'object-op', op: 'patch', values: {} }, {})
		}).not.toThrow()
		expect(() => {
			dispatchAction({ type: 'object-op', op: 'patch', values: {} }, { objectStore: makeStore() })
		}).not.toThrow()
		expect(() => {
			dispatchAction({ type: 'object-op', op: 'patch', values: {} }, { objectStore: makeStore(), source })
		}).not.toThrow()
		expect(warnSpy).toHaveBeenCalledTimes(3)
		warnSpy.mockRestore()
	})
})

describe('dispatchAction — export (export launcher, Wave 1)', () => {
	it('opens the export launcher via context.openExport with the full action', () => {
		const openExport = jest.fn()
		const action = {
			id: 'report-export',
			label: 'Export report',
			type: 'export',
			entities: [{ id: 'leads', label: 'Leads' }],
			formats: ['excel', 'csv', 'json'],
			handler: 'exportReport',
		}
		dispatchAction(action, { openExport })
		expect(openExport).toHaveBeenCalledWith(action)
	})

	it('warns and no-ops when context.openExport is missing', () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		expect(() => {
			dispatchAction({ type: 'export', entities: [], formats: [] }, {})
		}).not.toThrow()
		expect(warnSpy).toHaveBeenCalled()
		warnSpy.mockRestore()
	})
})

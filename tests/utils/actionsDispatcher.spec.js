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

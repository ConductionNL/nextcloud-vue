/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A `handler` action whose name the manifest's handlers do not answer runs
 * the app's registered handler, called as an index page calls it.
 *
 * @spec openspec/changes/dispatch-registered-handler/specs/dispatch-registered-handler/spec.md#requirement-a-handler-action-falls-back-to-the-registered-handler
 */
const { dispatchAction } = require('../../src/utils/actionsDispatcher.js')

describe('dispatchAction: a registered handler', () => {
	it('calls the registry handler with the row as item when the handlers lack it', () => {
		const claim = jest.fn()
		const row = { id: 'case-7' }
		dispatchAction(
			{ id: 'claim', type: 'handler', handler: 'claimCase', args: [row] },
			{ handlers: {}, registry: { claimCase: { kind: 'handler', handler: claim } } },
		)
		expect(claim).toHaveBeenCalledWith({ actionId: 'claim', item: row, args: [row] })
	})

	it('prefers the context row over the last argument', () => {
		const fn = jest.fn()
		const row = { id: 'r1' }
		dispatchAction({ type: 'handler', handler: 'act', args: ['x'] }, { registry: { act: fn }, row })
		expect(fn).toHaveBeenCalledWith({ actionId: undefined, item: row, args: ['x'] })
	})

	it('keeps a function in handlers first, with spread arguments', () => {
		const own = jest.fn()
		const registered = jest.fn()
		dispatchAction({ type: 'handler', handler: 'act', args: [1, 2] }, { handlers: { act: own }, registry: { act: registered } })
		expect(own).toHaveBeenCalledWith(1, 2)
		expect(registered).not.toHaveBeenCalled()
	})

	it('still warns when neither answers', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		dispatchAction({ type: 'handler', handler: 'nobody' }, { handlers: {}, registry: { nobody: { kind: 'handler' } } })
		expect(warn).toHaveBeenCalled()
		warn.mockRestore()
	})
})

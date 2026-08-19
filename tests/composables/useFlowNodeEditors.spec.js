/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The per-node-type editor registry: a registered type gets its component,
 * every other type gets null — which CnFlowDetail turns into the generic
 * dialog. Registration is by node id, last one wins with a warning.
 */
import {
	registerFlowNodeEditor,
	resolveFlowNodeEditor,
	unregisterFlowNodeEditor,
} from '../../src/composables/useFlowNodeEditors.js'

describe('useFlowNodeEditors', () => {
	afterEach(() => {
		unregisterFlowNodeEditor('openconnector.synchronization-run')
	})

	it('resolves a registered type to its component and everything else to null', () => {
		const editor = { name: 'SyncEditor' }
		registerFlowNodeEditor('openconnector.synchronization-run', editor)

		expect(resolveFlowNodeEditor('openconnector.synchronization-run')).toBe(editor)
		expect(resolveFlowNodeEditor('openregister.end')).toBeNull()
	})

	it('lets the last registration win, warning about the collision', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		registerFlowNodeEditor('openconnector.synchronization-run', { name: 'First' })
		registerFlowNodeEditor('openconnector.synchronization-run', { name: 'Second' })

		expect(resolveFlowNodeEditor('openconnector.synchronization-run').name).toBe('Second')
		expect(warn).toHaveBeenCalled()
		warn.mockRestore()
	})

	it('forgets an unregistered type', () => {
		registerFlowNodeEditor('openconnector.synchronization-run', { name: 'Gone' })
		unregisterFlowNodeEditor('openconnector.synchronization-run')

		expect(resolveFlowNodeEditor('openconnector.synchronization-run')).toBeNull()
	})
})

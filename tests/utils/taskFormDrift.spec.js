/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/flow-task-form-component/tasks.md#task-4
 */
import { taskFormDrift } from '../../src/utils/taskFormDrift.js'

const schema = {
	properties: {
		note: { type: 'string' },
		locked: { type: 'string', readOnly: true },
		secret: { type: 'string', visible: false },
	},
}

describe('taskFormDrift', () => {
	it('flags absent, read-only and hidden fields', () => {
		expect(taskFormDrift(schema, ['note', 'riskScore', { field: 'locked' }, 'secret'])).toEqual([
			{ field: 'riskScore', reason: 'absent' },
			{ field: 'locked', reason: 'readOnly' },
			{ field: 'secret', reason: 'hidden' },
		])
	})

	it('flags nothing for a clean step or without a schema', () => {
		expect(taskFormDrift(schema, ['note'])).toEqual([])
		expect(taskFormDrift(null, ['riskScore'])).toEqual([])
		expect(taskFormDrift(schema, undefined)).toEqual([])
	})
})

import { resolveFilterValue } from '../../src/utils/resolveFilterTokens.js'
import { classifyToken } from '../../src/utils/sentinelTokens.js'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `@now±N(m|h|d)`: an instant relative to now, so a header action can say
 * "only while the booking starts more than an hour from now".
 *
 * @spec openspec/changes/actions-time-windows-and-endpoint-routes/specs/declarative-actions/spec.md#requirement-a-condition-can-compare-against-an-instant-relative-to-now
 */
import { compareVisibleWhen, evaluateVisibleWhenLocal } from '../../src/utils/visibleWhen.js'

describe('@now±N(m|h|d)', () => {
	beforeEach(() => {
		jest.useFakeTimers().setSystemTime(new Date('2026-10-21T10:00:00Z'))
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it('resolves minutes, hours and days from now', () => {
		expect(resolveFilterValue('@now+1h', {})).toBe('2026-10-21T11:00:00.000Z')
		expect(resolveFilterValue('@now-30m', {})).toBe('2026-10-21T09:30:00.000Z')
		expect(resolveFilterValue('@now+2d', {})).toBe('2026-10-23T10:00:00.000Z')
	})

	it('is a known filter token', () => {
		expect(classifyToken('@now+1h')).toEqual({ status: 'known', context: 'filter', deprecation: null })
		expect(classifyToken('@now+1y').status).toBe('unknown')
	})

	it('gates on a date more than an hour away', () => {
		const cond = { field: 'startAt', op: 'gt', value: '@now+1h' }
		expect(evaluateVisibleWhenLocal(cond, { startAt: '2026-10-21T12:00:00Z' })).toBe(true)
		expect(evaluateVisibleWhenLocal(cond, { startAt: '2026-10-21T10:30:00Z' })).toBe(false)
		expect(compareVisibleWhen('2026-10-21T10:30:00Z', 'lt', '@now+1h')).toBe(true)
	})
})

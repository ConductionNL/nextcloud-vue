/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A facts entry with `as: "meter"` shows an amount against a limit, as a quota
 * card does ("12 of 50" with a bar). Past the limit the bar is red and the
 * text says so; without a limit there is no bar, because a bar against nothing
 * draws a proportion that does not exist.
 *
 * @spec openspec/changes/facts-meter-row/specs/facts-meter-row/spec.md#requirement-a-facts-entry-can-be-a-meter
 */
import { mount } from '@vue/test-utils'

import '../../src/components/CnFactsWidget/index.js'

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

const tenant = {
	quota: { users: 50, storage: 2048, requests: null },
	usage: { users: 12, storage: 3072, requests: 340 },
}

/**
 * Mount the widget over the tenant.
 *
 * @param {Array<object>} fields The facts entries.
 * @return {object} The wrapper.
 */
function mountFacts(fields) {
	return mount(CnFactsWidget, {
		propsData: { objectData: tenant, content: { fields } },
		stubs: { NcLoadingIcon: true },
	})
}

describe('CnFactsWidget: a meter entry', () => {
	it('shows the amount against the limit with a bar as wide as the share', () => {
		const w = mountFacts([{ as: 'meter', key: 'users', label: 'Users', path: 'usage.users', limitPath: 'quota.users' }])
		const meter = w.find('[data-testid="cn-fact-users"]')
		const bar = w.find('[data-testid="cn-fact-users-bar"]')

		expect(meter.text()).toContain('Users')
		expect(meter.text()).toContain('12 of 50')
		expect(bar.attributes('role')).toBe('meter')
		expect(bar.attributes('aria-valuenow')).toBe('12')
		expect(bar.attributes('aria-valuemax')).toBe('50')
		expect(bar.find('.cn-facts-widget__meter-bar').attributes('style')).toContain('width: 24%')
		expect(meter.classes()).not.toContain('cn-facts-widget__meter--over')
	})

	it('turns red past the limit, says so, and keeps the bar full', () => {
		const w = mountFacts([{ as: 'meter', key: 'storage', label: 'Storage', path: 'usage.storage', limitPath: 'quota.storage', format: 'bytes' }])
		const meter = w.find('[data-testid="cn-fact-storage"]')

		expect(meter.classes()).toContain('cn-facts-widget__meter--over')
		expect(meter.text()).toContain('3.0 KB of 2.0 KB, over the limit')
		expect(w.find('.cn-facts-widget__meter-bar').attributes('style')).toContain('width: 100%')
	})

	it('shows the amount and no bar without a limit', () => {
		const w = mountFacts([{ as: 'meter', key: 'requests', label: 'Requests', path: 'usage.requests', limitPath: 'quota.requests' }])

		expect(w.find('[data-testid="cn-fact-requests"]').text()).toContain('340')
		expect(w.find('[data-testid="cn-fact-requests-bar"]').exists()).toBe(false)
	})

	it('takes a constant limit', () => {
		const w = mountFacts([{ as: 'meter', key: 'users', label: 'Users', path: 'usage.users', limit: 10 }])

		expect(w.find('[data-testid="cn-fact-users"]').text()).toContain('12 of 10, over the limit')
	})

	it('leaves out a meter whose amount is not known', () => {
		const w = mountFacts([{ as: 'meter', key: 'bandwidth', label: 'Bandwidth', path: 'usage.bandwidth', limit: 100 }])

		expect(w.find('[data-testid="cn-fact-bandwidth"]').exists()).toBe(false)
	})
})

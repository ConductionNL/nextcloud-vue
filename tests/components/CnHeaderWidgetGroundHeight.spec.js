/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A ground greeting takes its own height, so its view switch sits on the
 * heading's line instead of the bottom of a taller grid cell. A banner keeps
 * filling its cell. The alignment itself is measured in e2e/pixel-gaps-3.e2e.js.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-a-ground-greeting-lines-its-switch-up-with-the-heading
 */
import { mount } from '@vue/test-utils'
import CnHeaderWidget from '../../src/components/CnHeaderWidget/CnHeaderWidget.vue'

const VIEWS = { options: [{ label: 'My work', route: 'Dashboard' }, { label: 'My team', route: 'Queue' }] }

function mountHeader(content) {
	return mount(CnHeaderWidget, {
		propsData: { content, now: new Date('2026-10-05T14:00:00') },
		global: { mocks: { $route: { name: 'Dashboard' }, $router: { push: jest.fn() } } },
	})
}

describe('CnHeaderWidget: a ground greeting takes its own height', () => {
	it('fills its cell without ground, as before', () => {
		const w = mountHeader({ greeting: true, showDate: true, plain: true, views: VIEWS })
		expect(w.attributes('style')).toContain('height: 100%')
		expect(w.find('.cn-header-widget__content').attributes('style')).toContain('height: 100%')
	})

	it('takes its own height with ground: true', () => {
		const w = mountHeader({ greeting: true, showDate: true, ground: true, views: VIEWS })
		expect(w.attributes('style')).toContain('height: auto')
		expect(w.find('.cn-header-widget__content').attributes('style')).toContain('height: auto')
		expect(w.find('[data-testid="cn-header-widget-views"]').exists()).toBe(true)
	})
})

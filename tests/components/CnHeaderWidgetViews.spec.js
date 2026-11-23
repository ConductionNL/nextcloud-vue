/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `content.views` puts a segmented view switch ("My work / My team") at the
 * right of the greeting header; its options are routes, the checked one is
 * the current route, and choosing another pushes it. Without the key, or
 * without a router, nothing renders there.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-a-greeting-header-switches-views
 */
import { mount } from '@vue/test-utils'
import CnHeaderWidget from '../../src/components/CnHeaderWidget/CnHeaderWidget.vue'

const VIEWS = {
	ariaLabel: 'View',
	options: [
		{ label: 'My work', route: 'Dashboard' },
		{ label: 'My team', route: 'TeamDashboard', params: { team: 'woo' } },
		{ label: '', route: 'Dropped' },
	],
}

function mountWidget(content, routeName, withRouter = true) {
	const push = jest.fn()
	const wrapper = mount(CnHeaderWidget, {
		propsData: { content },
		global: {
			mocks: { $route: { name: routeName }, ...(withRouter ? { $router: { push } } : {}) },
			provide: { cnTranslate: (key) => (key === 'My team' ? 'Mijn team' : key) },
		},
	})
	return { wrapper, push }
}

const SWITCH = '[data-testid="cn-header-widget-views"]'

describe('CnHeaderWidget — view switch', () => {
	it('renders no switch without views, and none without a router', () => {
		expect(mountWidget({ title: 'Dashboard' }, 'Dashboard').wrapper.find(SWITCH).exists()).toBe(false)
		expect(mountWidget({ title: 'Dashboard', views: VIEWS }, 'Dashboard', false).wrapper.find(SWITCH).exists()).toBe(false)
	})

	it('draws the labelled options with the current route checked', () => {
		const { wrapper } = mountWidget({ greeting: true, plain: true, views: VIEWS }, 'TeamDashboard')
		const options = wrapper.findAll(`${SWITCH} [role="radio"]`)
		expect(options.map((o) => o.text())).toEqual(['My work', 'Mijn team'])
		expect(options[1].attributes('aria-checked')).toBe('true')
		expect(wrapper.find(SWITCH).attributes('aria-label')).toBe('View')
		expect(wrapper.classes()).toContain('cn-header-widget--with-views')
	})

	it('checks the first option on an unlisted route and pushes the chosen route with its params', async () => {
		const { wrapper, push } = mountWidget({ title: 'Dashboard', views: VIEWS }, 'Elsewhere')
		const options = wrapper.findAll(`${SWITCH} [role="radio"]`)
		expect(options[0].attributes('aria-checked')).toBe('true')
		await options[1].trigger('click')
		expect(push).toHaveBeenCalledWith({ name: 'TeamDashboard', params: { team: 'woo' } })
	})
})

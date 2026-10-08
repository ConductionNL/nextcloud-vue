/**
 * The click on an object in the Related widget travels up: the widget emits
 * `select-object`, CnDetailWidgetHost forwards it unchanged, and CnDetailPage
 * re-emits it as `related-object-click` so a manifest host can open the
 * object's own detail page.
 */
import { shallowMount } from '@vue/test-utils'

const CnDetailWidgetHost = require('../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue').default
const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default

const raw = { '@self': { id: 'org-9', register: '20', schema: '33' }, name: 'Vendor' }

describe('related-object click forwarding', () => {
	it('CnDetailWidgetHost re-emits select-object with the raw object', () => {
		const wrapper = shallowMount(CnDetailWidgetHost, {
			propsData: { widget: { id: 'rel', type: 'related', title: 'Related' }, objectId: 'app-1', object: { id: 'app-1' } },
		})
		wrapper.vm.onSelectObject(raw)
		expect(wrapper.emitted('select-object')).toEqual([[raw]])
	})

	it('CnDetailPage re-emits it as related-object-click', () => {
		const wrapper = shallowMount(CnDetailPage, {
			propsData: { title: 'Application', objectId: 'app-1', object: { id: 'app-1' } },
			mocks: { $route: { params: { id: 'app-1' }, query: {} }, $router: { push: jest.fn() } },
		})
		wrapper.vm.onRelatedObjectSelect(raw)
		expect(wrapper.emitted('related-object-click')).toEqual([[raw]])
	})
})

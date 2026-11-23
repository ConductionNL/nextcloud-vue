/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The stage's primary button draws the icon its action declares, as a quick
 * action does (board PqOfferte: "Naar klant sturen" with its send icon). An
 * action without an icon keeps the plain button.
 *
 * @spec openspec/changes/stage-primary-icon/specs/detail-page/spec.md#requirement-the-stage-primary-button-draws-its-actions-icon
 */

import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import { CnIcon } from '../../src/components/CnIcon/index.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

async function mountPage(props) {
	const store = reactive({
		objects: { 'r-s': { o1: { id: 'o1', status: 'draft' } } },
		schemas: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	})
	const wrapper = mount(CnDetailPage, {
		propsData: { register: 'r', schema: 's', objectId: 'o1', objectStore: store, isAdmin: false, ...props },
	})
	await flush()
	await wrapper.vm.$nextTick()
	return wrapper
}

const primary = (wrapper) => wrapper.find('[data-testid="cn-detail-page-primary-action"]')

describe('CnDetailPage: the stage primary button\'s icon', () => {
	it('draws the icon the stage\'s action declares', async () => {
		const wrapper = await mountPage({
			headerActions: [{ id: 'send-quote', type: 'open-modal', label: 'Send to client', icon: 'SendOutline', target: 'Send' }],
			primaryActionByStage: { draft: 'send-quote' },
		})
		expect(primary(wrapper).text()).toBe('Send to client')
		const icon = primary(wrapper).findComponent(CnIcon)
		expect(icon.exists()).toBe(true)
		expect(icon.props('name')).toBe('SendOutline')
	})

	it('keeps the plain button for an action without an icon', async () => {
		const wrapper = await mountPage({
			headerActions: [{ id: 'take-on', type: 'open-modal', label: 'Take on', target: 'TakeOn' }],
			primaryActionByStage: { draft: 'take-on' },
		})
		expect(primary(wrapper).text()).toBe('Take on')
		expect(primary(wrapper).findComponent(CnIcon).exists()).toBe(false)
	})
})

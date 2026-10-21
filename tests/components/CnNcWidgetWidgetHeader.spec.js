/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A Nextcloud dashboard widget drew its own header (icon and title, falling
 * back to the raw id "activity") inside a card that already drew "Recente
 * activiteit" (board DqMijnWerk). It leaves its header out when the card draws
 * a title, or with `content.showHeader: false`.
 *
 * @spec openspec/changes/nc-widget-header/specs/nc-widget-header/spec.md#requirement-a-nextcloud-widget-draws-no-second-heading
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnNcWidgetWidget from '@/components/CnNcWidgetWidget/CnNcWidgetWidget.vue'
import CnWidgetWrapper from '@/components/CnWidgetWrapper/CnWidgetWrapper.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))

const HEADER = '[data-testid="cn-nc-widget-header"]'

/**
 * @param {object} wrapperProps CnWidgetWrapper props.
 * @param {object} content The widget content.
 * @return {object} Wrapper.
 */
function inCard(wrapperProps, content = { widgetId: 'activity', limit: 2 }) {
	return mount({
		components: { CnWidgetWrapper, CnNcWidgetWidget },
		data: () => ({ wrapperProps, content }),
		template: '<CnWidgetWrapper v-bind="wrapperProps"><CnNcWidgetWidget :content="content" /></CnWidgetWrapper>',
	})
}

describe('CnNcWidgetWidget header', () => {
	beforeEach(() => {
		axios.get.mockResolvedValue({ status: 200, data: { ocs: { data: { activity: { items: [{ id: '1', title: 'Item 1' }] } } } } })
	})
	afterEach(() => {
		axios.get.mockReset()
	})

	it('keeps its header on its own, as before', async () => {
		const w = mount(CnNcWidgetWidget, { props: { content: { widgetId: 'activity', limit: 2 } } })
		await flushPromises()
		expect(w.find(HEADER).text()).toBe('activity')
	})

	it('leaves its header out with showHeader: false', async () => {
		const w = mount(CnNcWidgetWidget, { props: { content: { widgetId: 'activity', limit: 2, showHeader: false } } })
		await flushPromises()
		expect(w.find(HEADER).exists()).toBe(false)
	})

	it('leaves its header out inside a card that draws a title, and keeps it in an untitled card', async () => {
		const titled = inCard({ title: 'Recente activiteit' })
		await flushPromises()
		expect(titled.find(HEADER).exists()).toBe(false)
		const untitled = inCard({ title: 'Recente activiteit', showTitle: false })
		await flushPromises()
		expect(untitled.find(HEADER).exists()).toBe(true)
	})
})

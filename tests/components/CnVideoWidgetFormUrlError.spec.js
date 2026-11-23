/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A host's verdict on the video URL (launchpad's POST /api/widgets/video/parse,
 * REQ-VID-005 "Invalid URL error") is shown under the field and blocks saving.
 */

import { mount } from '@vue/test-utils'
import CnVideoWidgetForm from '@/components/CnVideoWidgetForm/CnVideoWidgetForm.vue'

const youtube = { sourceType: 'youtube', videoUrl: 'https://www.youtube.com/embed/ABC123' }

describe('CnVideoWidgetForm urlError', () => {
	it('shows the host\'s error in place of the detected-source hint, and validate returns it', () => {
		const wrapper = mount(CnVideoWidgetForm, { propsData: { value: youtube, urlError: 'Domain not allowed by administrator' } })
		const alert = wrapper.find('.cn-video-form [role="alert"]')
		expect(alert.text()).toBe('Domain not allowed by administrator')
		expect(wrapper.find('.cn-video-form__hint').exists()).toBe(false)
		expect(wrapper.vm.validate()).toEqual(['Domain not allowed by administrator'])
	})

	it('replaces the form\'s own message for an unrecognised URL', () => {
		const wrapper = mount(CnVideoWidgetForm, { propsData: { value: { videoUrl: 'not a valid URL' }, urlError: 'Invalid URL format' } })
		const alerts = wrapper.findAll('[role="alert"]')
		expect(alerts).toHaveLength(1)
		expect(alerts[0].text()).toBe('Invalid URL format')
	})

	it('keeps the form\'s own behaviour without a host error', () => {
		const wrapper = mount(CnVideoWidgetForm, { propsData: { value: youtube } })
		expect(wrapper.find('[role="alert"]').exists()).toBe(false)
		expect(wrapper.vm.validate()).toEqual([])
	})

	it('still asks for a URL first when the field is empty', () => {
		const wrapper = mount(CnVideoWidgetForm, { propsData: { value: { videoUrl: '' }, urlError: 'Invalid URL format' } })
		expect(wrapper.find('[role="alert"]').exists()).toBe(false)
		expect(wrapper.vm.validate()).toEqual(['Video URL is required'])
	})
})

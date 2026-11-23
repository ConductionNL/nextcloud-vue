/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A declared section's title and description go through the app's translate
 * function, as its field texts do (PqBeheer "Leadbeheer", declared as "Lead
 * Management" in pipelinq's adminSections.json).
 *
 * @spec openspec/changes/settings-section-title-translated/specs/settings-section-title-translated/spec.md
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnSettingsFieldsSection from '../../src/components/CnSettingsFieldsSection/CnSettingsFieldsSection.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), request: jest.fn() } }))

const DUTCH = { 'Lead Management': 'Leadbeheer', 'Tune lead staleness.': 'Stel verouderingsdetectie in.', 'Stale after (days)': 'Verouderd na (dagen)' }
const SECTION = { props: ['name', 'description', 'detailedDescription'], template: '<section><h2 class="title">{{ name }}</h2><p class="description">{{ description }}</p><p class="detailed">{{ detailedDescription }}</p><slot /></section>' }

describe('CnSettingsFieldsSection title and description', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.get.mockResolvedValue({ data: {} })
	})

	it('translates the title, the description and the detailed description as it does the field labels', async () => {
		const wrapper = mount(CnSettingsFieldsSection, {
			props: { appId: 'myapp', name: 'Lead Management', description: 'Tune lead staleness.', detailedDescription: 'Lead Management', fields: [{ key: 'days', label: 'Stale after (days)', type: 'number' }] },
			global: {
				stubs: { CnSettingsSection: SECTION, CnSettingsField: { props: ['field'], template: '<span class="label">{{ field.label }}</span>' } },
				provide: { cnTranslate: (key) => DUTCH[key] || key },
			},
		})
		await flushPromises()
		expect(wrapper.find('.title').text()).toBe('Leadbeheer')
		expect(wrapper.find('.description').text()).toBe('Stel verouderingsdetectie in.')
		expect(wrapper.find('.detailed').text()).toBe('Leadbeheer')
		expect(wrapper.find('.label').text()).toBe('Verouderd na (dagen)')
	})

	it('leaves a title the app translated itself as it is', async () => {
		const wrapper = mount(CnSettingsFieldsSection, {
			props: { appId: 'myapp', name: 'Huisstijl', fields: [] },
			global: { stubs: { CnSettingsSection: SECTION }, provide: { cnTranslate: (key) => DUTCH[key] || key } },
		})
		await flushPromises()
		expect(wrapper.find('.title').text()).toBe('Huisstijl')
	})
})

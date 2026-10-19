/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An image field's visible label is optional: `hideLabel: true` keeps it for
 * a screen reader only, for a board that draws the tile and its upload
 * button without a caption.
 */
import { mount } from '@vue/test-utils'
import CnSettingsField from '../../src/components/CnSettingsField/CnSettingsField.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), request: jest.fn() } }))

const STUBS = { NcButton: { template: '<button><slot /></button>' }, NcLoadingIcon: true }
const FIELD = { key: 'logo', label: 'Logo', type: 'image', uploadUrl: '/upload', initials: 'GZ' }

/**
 * @param {object} extra Field keys.
 * @return {object} The wrapper.
 */
function mountField(extra = {}) {
	return mount(CnSettingsField, { props: { field: { ...FIELD, ...extra }, modelValue: '' }, global: { stubs: STUBS } })
}

describe('CnSettingsField image label', () => {
	it('shows the label by default', () => {
		const label = mountField().find('.cn-settings-field__image-label')
		expect(label.text()).toBe('Logo')
		expect(label.classes()).not.toContain('hidden-visually')
	})

	it('keeps the label for a screen reader only with hideLabel', () => {
		const w = mountField({ hideLabel: true })
		const label = w.find('.cn-settings-field__image-label')
		expect(label.text()).toBe('Logo')
		expect(label.classes()).toContain('hidden-visually')
		expect(w.find('[role="group"]').attributes('aria-labelledby')).toBe(label.attributes('id'))
	})
})

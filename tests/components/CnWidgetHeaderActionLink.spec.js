/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A widget header action with `variant: "link"` reads as the card's text
 * link (DqTermijnen "Kwartaalrapport downloaden") and still runs its action.
 *
 * @spec openspec/changes/widget-header-action-link/specs/widget-header-action-link/spec.md#requirement-a-widget-header-action-can-be-a-text-link
 */
import { mount } from '@vue/test-utils'
import CnWidgetHeaderActionButtons from '../../src/components/CnWidgetWrapper/CnWidgetHeaderActionButtons.vue'
import { resolveWidgetHeaderActions } from '../../src/utils/widgetHeaderActions.js'

describe('a link widget header action', () => {
	it('keeps the link variant when resolved', () => {
		const [link, plain] = resolveWidgetHeaderActions({
			headerActions: [
				{ label: 'Download', variant: 'link', icon: 'TrayArrowDown', action: { type: 'export' } },
				{ label: 'Other', variant: 'tertiary', action: { type: 'export' } },
			],
		}, { dispatch: () => {} })
		expect(link.variant).toBe('link')
		expect(plain.variant).toBe('secondary')
	})

	it('draws a link-styled button without an icon that runs the action', async () => {
		const run = jest.fn()
		const w = mount(CnWidgetHeaderActionButtons, {
			props: { actions: [{ key: '0', label: 'Download', icon: 'TrayArrowDown', variant: 'link', run }] },
			global: { stubs: { CnIcon: true } },
		})
		const link = w.find('[data-testid="cn-widget-header-action"]')
		expect(link.element.tagName).toBe('BUTTON')
		expect(link.attributes('type')).toBe('button')
		expect(link.classes()).toContain('cn-widget-header-actions__link')
		expect(link.text()).toBe('Download')
		expect(w.findComponent({ name: 'CnIcon' }).exists()).toBe(false)
		await link.trigger('click')
		expect(run).toHaveBeenCalledTimes(1)
	})

	it('keeps a secondary action a button', () => {
		const w = mount(CnWidgetHeaderActionButtons, {
			props: { actions: [{ key: '0', label: 'Run', icon: '', variant: 'secondary', run: () => {} }] },
			global: { stubs: { CnIcon: true } },
		})
		expect(w.find('.cn-widget-header-actions__link').exists()).toBe(false)
		expect(w.find('[data-testid="cn-widget-header-action"]').exists()).toBe(true)
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A widget header action with `variant: "tonal"` is the card's pill button
 * (PqLoyaliteit "Exporteren als CSV"), and on a dashboard its action reads the
 * page filters through `@workspace.<key>` tokens.
 *
 * @spec openspec/changes/widget-header-action-tonal/specs/widget-header-action-tonal/spec.md#requirement-a-widget-header-action-can-be-a-tonal-pill
 */
import { mount } from '@vue/test-utils'
import CnWidgetHeaderActionButtons from '../../src/components/CnWidgetWrapper/CnWidgetHeaderActionButtons.vue'
import { resolveWidgetHeaderActions } from '../../src/utils/widgetHeaderActions.js'

describe('a tonal widget header action', () => {
	it('keeps the tonal variant when resolved', () => {
		const [pill] = resolveWidgetHeaderActions({
			headerActions: [{ label: 'Export as CSV', variant: 'tonal', icon: 'TrayArrowDown', action: { type: 'export' } }],
		}, { dispatch: () => {} })
		expect(pill.variant).toBe('tonal')
	})

	it('draws a pill button with its icon that runs the action', async () => {
		const run = jest.fn()
		const w = mount(CnWidgetHeaderActionButtons, {
			props: { actions: [{ key: '0', label: 'Export as CSV', icon: 'TrayArrowDown', variant: 'tonal', run }] },
			global: { stubs: { CnIcon: true } },
		})
		const pill = w.find('[data-testid="cn-widget-header-action"]')
		expect(pill.element.tagName).toBe('BUTTON')
		expect(pill.attributes('type')).toBe('button')
		expect(pill.classes()).toContain('cn-widget-header-actions__tonal')
		expect(pill.text()).toBe('Export as CSV')
		expect(w.findComponent({ name: 'CnIcon' }).exists()).toBe(true)
		await pill.trigger('click')
		expect(run).toHaveBeenCalledTimes(1)
	})
})

describe('a widget header action on a dashboard', () => {
	it('resolves the page filters in its action', () => {
		const dispatch = jest.fn()
		const [download] = resolveWidgetHeaderActions({
			headerActions: [{
				label: 'Export as CSV',
				action: { type: 'api-call', method: 'GET', url: '/apps/x/api/report/@workspace.programme/tiers', params: { format: 'csv', days: '@workspace.period?' } },
			}],
		}, { workspace: { programme: 'p-1', period: '90' }, dispatch })
		download.run()
		const [action, extra] = dispatch.mock.calls[0]
		expect(action.params).toEqual({ format: 'csv', days: '90' })
		// The api-call fills its url from the token context it is handed.
		expect(action.url).toBe('/apps/x/api/report/@workspace.programme/tiers')
		expect(extra.tokenCtx.workspace).toEqual({ programme: 'p-1', period: '90' })
	})
})

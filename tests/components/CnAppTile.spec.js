/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAppTile and the `app-tile` widget type: one app as one square, coloured
 * tile with a white icon and no visible text.
 *
 * @spec openspec/changes/app-tile/specs/app-tile/spec.md
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnAppTile from '../../src/components/CnAppTile/CnAppTile.vue'
import CnAppTileWidget from '../../src/components/CnAppTileWidget/CnAppTileWidget.vue'
import CnAppTileWidgetForm from '../../src/components/CnAppTileWidgetForm/CnAppTileWidgetForm.vue'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { clearAppDisplayNames } from '../../src/utils/nextcloudApps.js'

import '../../src/components/CnAppTileWidget/index.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateOcsUrl: (path) => `/ocs/v2.php/${path}` }))
jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params) => String(text).replace(/\{(\w+)\}/g, (_, key) => String((params || {})[key])),
	translatePlural: (app, one, many, count, params) => (count === 1 ? one : many).replace('%n', String(count)).replace(/\{(\w+)\}/g, (_, key) => String((params || {})[key])),
}))

const NAVIGATION = [
	{ id: 'files', app: 'files', name: 'Bestanden', href: '/apps/files/', icon: '/apps/files/img/app.svg' },
	{ id: 'mail', app: 'mail', name: 'Mail', href: '/apps/mail/', icon: '/apps/mail/img/mail.svg' },
]

const NOTIFICATIONS = [{ app: 'mail' }, { app: 'mail' }, { app: 'files' }, { app: 'spreed' }]

beforeEach(() => {
	clearAppDisplayNames()
	axios.get.mockReset()
	axios.get.mockImplementation((url) => Promise.resolve({
		data: { ocs: { data: url.includes('notifications') ? NOTIFICATIONS : NAVIGATION } },
	}))
})

describe('CnAppTile', () => {
	it('is a link named by the app, with a tooltip, a white icon mask and no visible text', () => {
		const wrapper = mount(CnAppTile, { props: { href: '/apps/files/', label: 'Bestanden', icon: '/apps/files/img/app.svg', appId: 'files' } })
		const link = wrapper.get('a')
		expect(link.attributes('href')).toBe('/apps/files/')
		expect(link.attributes('aria-label')).toBe('Bestanden')
		expect(link.attributes('title')).toBe('Bestanden')
		expect(link.text()).toBe('')
		expect(wrapper.get('[data-testid="cn-app-tile-icon"]').attributes('style')).toContain('/apps/files/img/app.svg')
		expect(link.attributes('style')).toContain('var(--cn-app-tile-work-muted, var(--sc-work-muted, #5e6168))')
	})

	it('takes the chosen palette colour', () => {
		const wrapper = mount(CnAppTile, { props: { href: '/x', label: 'X', appId: 'files', colour: 'accent' } })
		expect(wrapper.get('a').attributes('style')).toContain('var(--cn-app-tile-accent, var(--sc-accent, #cc0000))')
	})

	it('shows a count bubble and names the count, capped at 99+', async () => {
		const wrapper = mount(CnAppTile, { props: { href: '/x', label: 'Mail', count: 3 } })
		expect(wrapper.get('[data-testid="cn-app-tile-count"]').text()).toBe('3')
		expect(wrapper.get('a').attributes('aria-label')).toBe('Mail, 3 new items')
		await wrapper.setProps({ count: 150 })
		expect(wrapper.get('[data-testid="cn-app-tile-count"]').text()).toBe('99+')
		await wrapper.setProps({ count: 0 })
		expect(wrapper.find('[data-testid="cn-app-tile-count"]').exists()).toBe(false)
	})

	it('draws a pin and an outage dot in place of the count, and names both', async () => {
		const wrapper = mount(CnAppTile, { props: { href: '/x', label: 'Raadsinformatie', count: 3, pinned: true, down: true }, global: { stubs: { Pin: true } } })
		expect(wrapper.find('[data-testid="cn-app-tile-pin"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-app-tile-outage"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-app-tile-count"]').exists()).toBe(false)
		expect(wrapper.get('a').attributes('aria-label')).toBe('Raadsinformatie, outage, pinned')
		await wrapper.setProps({ down: false })
		expect(wrapper.get('a').attributes('aria-label')).toBe('Mail, 3 new items, pinned'.replace('Mail', 'Raadsinformatie'))
	})
})

describe('CnAppTileWidget', () => {
	it('registers the app-tile type with its form', () => {
		const entry = getWidgetTypeEntry('app-tile')
		expect(entry.renderer).toBe(CnAppTileWidget)
		expect(entry.form).toBe(CnAppTileWidgetForm)
		expect(entry.defaultContent).toEqual({ appId: '', colour: '', showCount: true, pinned: false })
	})

	it('draws the configured app from the navigation with its notification count', async () => {
		const wrapper = mount(CnAppTileWidget, { props: { content: { appId: 'mail', colour: 'work-ink' } } })
		await flushPromises()
		const link = wrapper.get('a')
		expect(link.attributes('href')).toBe('/apps/mail/')
		expect(link.attributes('aria-label')).toBe('Mail, 2 new items')
		expect(link.attributes('style')).toContain('--cn-app-tile-work-ink')
	})

	it('passes the pin and an outage status to the tile', async () => {
		const wrapper = mount(CnAppTileWidget, { props: { content: { appId: 'mail', pinned: true, status: 'down' } } })
		await flushPromises()
		expect(wrapper.get('a').attributes('aria-label')).toBe('Mail, outage, pinned')
	})

	it('leaves the count out when showCount is off', async () => {
		const wrapper = mount(CnAppTileWidget, { props: { content: { appId: 'mail', showCount: false } } })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-app-tile-count"]').exists()).toBe(false)
		expect(axios.get.mock.calls.some(([url]) => url.includes('notifications'))).toBe(false)
	})

	it('says the app is not available when it is not in the reader navigation', async () => {
		const wrapper = mount(CnAppTileWidget, { props: { content: { appId: 'deck' } } })
		await flushPromises()
		expect(wrapper.find('a').exists()).toBe(false)
		expect(wrapper.get('[data-testid="cn-app-tile-widget-missing"]').text()).toBe('This app is not available to you')
	})

	it('draws the tile without a count when the notifications read fails', async () => {
		axios.get.mockImplementation((url) => (url.includes('notifications')
			? Promise.reject(new Error('404'))
			: Promise.resolve({ data: { ocs: { data: NAVIGATION } } })))
		const wrapper = mount(CnAppTileWidget, { props: { content: { appId: 'mail' } } })
		await flushPromises()
		expect(wrapper.get('a').attributes('aria-label')).toBe('Mail')
	})
})

describe('CnAppTileWidgetForm', () => {
	it('needs an app, and emits the app, colour and count switch', async () => {
		const wrapper = mount(CnAppTileWidgetForm, { global: { stubs: { NcSelect: true, NcCheckboxRadioSwitch: true } } })
		await flushPromises()
		expect(wrapper.vm.validate()).toEqual(['Choose the app this tile opens'])
		wrapper.vm.updateField('appId', 'files')
		await wrapper.get('[data-testid="cn-app-tile-form-colour-accent"]').trigger('change')
		wrapper.vm.updateField('pinned', true)
		const emitted = wrapper.emitted('update:content')
		expect(emitted[emitted.length - 1][0]).toEqual({ appId: 'files', colour: 'accent', showCount: true, pinned: true })
		expect(wrapper.findAll('input[type="radio"]')).toHaveLength(8)
		expect(wrapper.vm.validate()).toEqual([])
	})

	it('marks the app default colour when the tile names none', async () => {
		const wrapper = mount(CnAppTileWidgetForm, { props: { value: { appId: 'calendar' } }, global: { stubs: { NcSelect: true, NcCheckboxRadioSwitch: true } } })
		await flushPromises()
		expect(wrapper.get('[data-testid="cn-app-tile-form-colour-primary"]').element.checked).toBe(true)
	})
})

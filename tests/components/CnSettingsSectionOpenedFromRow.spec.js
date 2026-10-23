/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A settings card can be opened from a row (DqInstellingen): the
 * integrations tab lists every connection in one table, and the card that
 * sets one up shows only once its row was followed to `#<card id>`, saying
 * so under its title ("Geopend vanuit de rij Kadaster (BRK) en WOZ"). The
 * card stays reachable from its row; nothing is removed.
 *
 * @spec openspec/changes/settings-section-opened-from-row/specs/settings-section-opened-from-row/spec.md
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(() => Promise.resolve({ data: {} })), request: jest.fn() } }))
const { flushPromises, mount } = require('@vue/test-utils')
const { nextTick } = require('vue')
const CnSettingsSection = require('../../src/components/CnSettingsSection/CnSettingsSection.vue').default

function mountSection(props) {
	return mount(CnSettingsSection, {
		props: { name: 'Kadaster (BRK) and WOZ', description: 'Off until you choose a source.', ...props },
		attrs: { id: 'section-kadaster' },
		slots: { default: '<p class="body">fields</p>' },
	})
}

const description = (w) => w.findComponent({ name: 'NcSettingsSection' }).attributes('description')

afterEach(() => {
	window.location.hash = ''
})

describe('CnSettingsSection opened from a row', () => {
	it('stays closed until its row leads to it', async () => {
		const w = mountSection({ openedFrom: 'Kadaster (BRK) and WOZ' })
		expect(w.find('.body').exists()).toBe(false)

		window.location.hash = '#section-kadaster'
		window.dispatchEvent(new HashChangeEvent('hashchange'))
		await nextTick()
		expect(w.find('.body').exists()).toBe(true)
		expect(description(w)).toBe('Opened from the row Kadaster (BRK) and WOZ')
	})

	it('opens straight away when the page was opened on its id', () => {
		window.location.hash = '#section-kadaster'
		const w = mountSection({ openedFrom: 'Kadaster (BRK) and WOZ' })
		expect(w.find('.body').exists()).toBe(true)
	})

	it('closes again when another row is followed', async () => {
		window.location.hash = '#section-kadaster'
		const w = mountSection({ openedFrom: 'Kadaster (BRK) and WOZ' })
		window.location.hash = '#section-zgw'
		window.dispatchEvent(new HashChangeEvent('hashchange'))
		await nextTick()
		expect(w.find('.body').exists()).toBe(false)
	})

	it('is always open without openedFrom', () => {
		const w = mountSection({})
		expect(w.find('.body').exists()).toBe(true)
		expect(description(w)).toBe('Off until you choose a source.')
	})
})

describe('CnSettingsFieldsSection opened from a row', () => {
	it('hands openedFrom and its id to its card', async () => {
		const CnSettingsFieldsSection = require('../../src/components/CnSettingsFieldsSection/CnSettingsFieldsSection.vue').default
		const w = mount(CnSettingsFieldsSection, {
			props: { appId: 'dossiq', name: 'Kadaster', openedFrom: 'Kadaster (BRK) and WOZ', fields: [{ key: 'mode', label: 'Source' }] },
			attrs: { id: 'section-kadaster' },
		})
		await flushPromises()
		expect(w.find('[data-testid="cn-settings-field-mode"]').exists()).toBe(false)
		window.location.hash = '#section-kadaster'
		window.dispatchEvent(new HashChangeEvent('hashchange'))
		await flushPromises()
		expect(w.find('[data-testid="cn-settings-field-mode"]').exists()).toBe(true)
	})
})

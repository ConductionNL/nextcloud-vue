/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A settings section can end with a link to where its list is managed, at the
 * end of the card (DqVthInstellingen "Koppelingen beheren in integriq", "Leges
 * beheren in shillinq").
 *
 * @spec openspec/changes/settings-section-footer-link/specs/settings-section-footer-link/spec.md
 */
const { mount } = require('@vue/test-utils')
const CnSettingsSection = require('../../src/components/CnSettingsSection/CnSettingsSection.vue').default

/**
 * @param {object} props Extra props.
 * @return {object} The mounted section.
 */
function mountSection(props) {
	return mount(CnSettingsSection, {
		props: { name: 'Fee rules', ...props },
		slots: { default: '<p class="body">rows</p>' },
	})
}

describe('CnSettingsSection footer link', () => {
	it('ends the card with the link, after the content', () => {
		const w = mountSection({ footerLink: { label: 'Manage fees in shillinq', href: '/apps/shillinq/fees' } })
		const link = w.find('[data-testid="cn-settings-section-footer-link"]')
		expect(link.element.tagName).toBe('A')
		expect(link.text()).toBe('Manage fees in shillinq')
		expect(link.attributes('href')).toBe('/apps/shillinq/fees')
		const html = w.html()
		expect(html.indexOf('class="body"')).toBeLessThan(html.indexOf('cn-settings-section-footer-link'))
	})

	it('draws no link without an href or a label, and refuses an unsafe href', () => {
		expect(mountSection({}).find('[data-testid="cn-settings-section-footer-link"]').exists()).toBe(false)
		expect(mountSection({ footerLink: { label: 'x' } }).find('[data-testid="cn-settings-section-footer-link"]').exists()).toBe(false)
		expect(mountSection({ footerLink: { href: '/x' } }).find('[data-testid="cn-settings-section-footer-link"]').exists()).toBe(false)
		const unsafe = mountSection({ footerLink: { label: 'x', href: 'javascript:alert(1)' } }).find('[data-testid="cn-settings-section-footer-link"]')
		expect(unsafe.exists()).toBe(false)
	})
})

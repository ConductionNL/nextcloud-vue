/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The admin settings shell, section cards and version card under the board
 * look. Without the look they render as before.
 *
 * @spec openspec/changes/screens-chrome-parity/specs/settings-board-look/spec.md#requirement-the-admin-settings-shell-takes-the-board-header
 * @spec openspec/changes/screens-chrome-parity/specs/settings-board-look/spec.md#requirement-settings-sections-are-cards-in-a-grid
 * @spec openspec/changes/screens-chrome-parity/specs/settings-board-look/spec.md#requirement-the-version-card-takes-the-board-facts-and-footer
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn(), put: jest.fn() } }))
jest.mock('@nextcloud/dialogs', () => ({ showSuccess: jest.fn(), showError: jest.fn() }))
jest.mock('@nextcloud/initial-state', () => ({ loadState: jest.fn((app, key, def) => def) }))

import { mount } from '@vue/test-utils'
import CnAdminSettingsShell from '../../src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue'
import CnSettingsSection from '../../src/components/CnSettingsSection/CnSettingsSection.vue'
import CnVersionInfoCard from '../../src/components/CnVersionInfoCard/CnVersionInfoCard.vue'

const Square = { name: 'CnBuildiqEditButton', template: '<div class="square" />' }

function mountShell(props = {}, slots = {}) {
	return mount(CnAdminSettingsShell, {
		propsData: { appId: 'pipelinq', appName: 'Pipelinq', docUrl: 'https://docs.example/pipelinq', ...props },
		slots,
		global: { stubs: { CnBuildiqEditButton: Square } },
	})
}

describe('CnAdminSettingsShell: the board header', () => {
	it('draws an h1, the description, Documentation, then the buildiq square, and no NcSettingsSection header', () => {
		const w = mountShell({ look: 'board' })
		expect(w.find('h1.cn-admin-settings-shell__title').text()).toBe('Pipelinq Settings')
		expect(w.find('.cn-admin-settings-shell__description').text()).toBe('Configure your Pipelinq installation')
		const row = w.find('.cn-admin-settings-shell__header-buttons')
		const kids = Array.from(row.element.children)
		expect(kids.map((el) => (el.classList.contains('square') ? 'square' : el.textContent.trim()))).toEqual(['Documentation', 'square'])
		expect(w.find('[data-testid="cn-admin-settings-documentation"]').attributes('href')).toBe('https://docs.example/pipelinq')
		expect(w.find('[data-testid="cn-admin-settings-header"] .settings-section__name').exists()).toBe(false)
	})

	it('omits the Documentation button without a docUrl', () => {
		const w = mountShell({ look: 'board', docUrl: '' })
		expect(w.find('[data-testid="cn-admin-settings-documentation"]').exists()).toBe(false)
	})

	it('renders the header through NcSettingsSection without the look', () => {
		const w = mountShell()
		expect(w.find('.cn-admin-settings-shell__header').exists()).toBe(false)
		expect(w.findComponent({ name: 'NcSettingsSection' }).exists()).toBe(true)
	})

	it('follows the cnLook that CnAppRoot provides', () => {
		const w = mount(CnAdminSettingsShell, {
			propsData: { appId: 'pipelinq', appName: 'Pipelinq' },
			global: { provide: { cnLook: 'board' }, stubs: { CnBuildiqEditButton: Square } },
		})
		expect(w.find('.cn-admin-settings-shell__header').exists()).toBe(true)
	})
})

describe('CnSettingsSection: wide', () => {
	it('marks a wide section so it spans the grid row', () => {
		const w = mount(CnSettingsSection, { propsData: { name: 'Mapping', wide: true } })
		expect(w.classes()).toContain('cn-settings-section--wide')
		const narrow = mount(CnSettingsSection, { propsData: { name: 'Mapping' } })
		expect(narrow.classes()).not.toContain('cn-settings-section--wide')
	})
})

describe('CnVersionInfoCard: the board facts and footer', () => {
	const slots = { actions: '<button class="reimport">Re-import configuration</button>' }

	it('ends in a footer row: the state, then the re-import', () => {
		const w = mount(CnVersionInfoCard, {
			propsData: { appName: 'Pipelinq', appVersion: '1.2.0', configuredVersion: '1.2.0', isUpToDate: true, showUpdateButton: true, look: 'board' },
			slots,
		})
		expect(w.find('.cn-version-info--board').exists()).toBe(true)
		const row = w.find('[data-testid="cn-version-info-footer-row"]')
		expect(row.exists()).toBe(true)
		const texts = Array.from(row.element.children).map((el) => el.textContent.trim())
		expect(texts[texts.length - 1]).toBe('Re-import configuration')
		expect(texts.length).toBe(2)
		// Three facts, not one more.
		expect(w.findAll('.cn-version-info__item').length).toBe(3)
	})

	it('keeps the actions at the top of the section without the look', () => {
		const w = mount(CnVersionInfoCard, {
			propsData: { appName: 'Pipelinq', appVersion: '1.2.0', isUpToDate: true },
			slots,
		})
		expect(w.find('[data-testid="cn-version-info-footer-row"]').exists()).toBe(false)
		expect(w.find('.cn-version-info--board').exists()).toBe(false)
		expect(w.find('.reimport').exists()).toBe(true)
	})
})

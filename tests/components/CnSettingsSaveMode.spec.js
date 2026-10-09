/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A settings page saves in one declared place: `saveMode: "section"` gives
 * each section with fields its own Save, `"page"` one Save in the header and
 * a Changes card, `autosave` none. Without the keys the save bar stays.
 *
 * @spec openspec/changes/screens-chrome-parity/specs/settings-board-look/spec.md#requirement-a-settings-page-saves-in-one-declared-place
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { put: jest.fn(() => Promise.resolve({ data: {} })) } }))

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnSettingsPage from '../../src/components/CnSettingsPage/CnSettingsPage.vue'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const SCHEMA = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

const sections = [
	{ title: 'General', fields: [{ key: 'name', label: 'Name', type: 'string' }] },
	{ title: 'Mail', fields: [{ key: 'host', label: 'Mail host', type: 'string' }] },
	{ title: 'Tracking', fields: [{ key: 'on', label: 'Tracking', type: 'boolean' }] },
]

function mountPage(props = {}) {
	return mount(CnSettingsPage, {
		propsData: { title: 'Settings', showTitle: true, description: 'Your settings.', sections, saveEndpoint: '/save', ...props },
		global: { stubs: { CnBuildiqEditButton: true } },
	})
}

const sectionSaves = (w) => w.findAll('[data-testid="cn-settings-section-save"]').length
const pageSaves = (w) => w.findAll('[data-testid="cn-settings-page-save"]').length
const barSaves = (w) => w.findAll('.cn-settings-page__save-bar').length

describe('CnSettingsPage: saveMode', () => {
	it('keeps the save bar under the last section without the keys', () => {
		const w = mountPage()
		expect(barSaves(w)).toBe(1)
		expect(sectionSaves(w)).toBe(0)
		expect(pageSaves(w)).toBe(0)
	})

	it('section: one Save per section with fields and no page save bar', () => {
		const w = mountPage({ saveMode: 'section' })
		expect(sectionSaves(w)).toBe(3)
		expect(barSaves(w)).toBe(0)
		expect(pageSaves(w)).toBe(0)
	})

	it('page: one Save as the last header button, a Changes card, no section save', async () => {
		const w = mountPage({ saveMode: 'page', look: 'board' })
		expect(pageSaves(w)).toBe(1)
		expect(sectionSaves(w)).toBe(0)
		expect(barSaves(w)).toBe(0)
		const row = w.find('.cn-settings-page__header-buttons')
		expect(row.element.lastElementChild.getAttribute('data-testid')).toBe('cn-settings-page-save')
		expect(w.find('[data-testid="cn-settings-page-changes"]').exists()).toBe(false)

		w.vm.updateField('name', 'Acme')
		w.vm.updateField('host', 'mail.example')
		await w.vm.$nextTick()
		const card = w.find('[data-testid="cn-settings-page-changes"]')
		expect(card.text()).toContain('Name')
		expect(card.text()).toContain('Mail host')
		expect(card.text()).not.toContain('Tracking')
	})

	it('page: puts the Save in its own row when the header is hidden', () => {
		const w = mountPage({ saveMode: 'page', showTitle: false })
		expect(pageSaves(w)).toBe(1)
	})

	it('autosave: no save button at all, and the description says so', () => {
		const w = mountPage({ autosave: true })
		expect(sectionSaves(w) + pageSaves(w) + barSaves(w)).toBe(0)
		expect(w.vm.resolvedDescription).toBe('Your settings. Changes are saved automatically.')
	})

	it('autosave: saves shortly after a change', async () => {
		jest.useFakeTimers()
		const w = mountPage({ autosave: true })
		w.vm.updateField('name', 'Acme')
		w.vm.updateField('name', 'Acme B.V.')
		jest.advanceTimersByTime(700)
		await Promise.resolve()
		expect(axios.put).toHaveBeenCalledTimes(1)
		jest.useRealTimers()
	})
})

describe('manifest validation: one place to save', () => {
	const base = (config) => ({
		$schema: SCHEMA,
		version: '1.0.0',
		menu: [],
		pages: [{ id: 'Settings', route: '/settings', type: 'settings', title: 'Settings', config }],
	})
	const ok = (config) => validateManifestV2(base(config))

	it('accepts section, page and autosave on their own', () => {
		expect(ok({ saveMode: 'section', sections: [{ title: 'A', fields: [] }] }).valid).toBe(true)
		expect(ok({ saveMode: 'page', sections: [] }).valid).toBe(true)
		expect(ok({ autosave: true, sections: [] }).valid).toBe(true)
	})

	it('refuses an unknown saveMode', () => {
		expect(ok({ saveMode: 'both' }).valid).toBe(false)
	})

	it('refuses saveMode together with a section that has its own save', () => {
		expect(ok({ saveMode: 'section', sections: [{ title: 'A', save: true, fields: [] }] }).valid).toBe(false)
		expect(ok({ saveMode: 'page', tabs: [{ id: 't', label: 'T', sections: [{ title: 'A', save: true }] }] }).valid).toBe(false)
	})

	it('allows a section save when no saveMode is set', () => {
		expect(ok({ sections: [{ title: 'A', save: true, fields: [] }] }).valid).toBe(true)
	})

	it('refuses saveMode together with autosave', () => {
		expect(ok({ saveMode: 'page', autosave: true }).valid).toBe(false)
	})
})

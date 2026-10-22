const { mount } = require('@vue/test-utils')
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A settings section can draw its actions in its title row, beside the
 * heading, as the boards do (DqVthInstellingen "Activiteit koppelen",
 * DqInstellingenAlgemeen "Dag toevoegen"); a calendar can leave its own Add
 * day button out so the section's title row carries it.
 *
 * @spec openspec/changes/settings-section-title-actions/specs/settings-section-title-actions/spec.md#requirement-a-settings-section-can-draw-its-actions-in-its-title-row
 */
const fs = require('fs')
const path = require('path')
const CnSettingsSection = require('../../src/components/CnSettingsSection/CnSettingsSection.vue').default

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnSettingsSection/CnSettingsSection.vue'), 'utf8')

function mountSection(props) {
	return mount(CnSettingsSection, {
		props: { name: 'Fee rules', description: 'What a case type costs', ...props },
		slots: { actions: '<button class="add">Add rule</button>', default: '<p class="body">rows</p>' },
	})
}

describe('CnSettingsSection actions in the title row', () => {
	it('marks the section when its actions belong in the title row', () => {
		expect(mountSection({ actionsInTitle: true }).classes()).toContain('cn-settings-section--title-actions')
		expect(mountSection({}).classes()).not.toContain('cn-settings-section--title-actions')
	})

	it('keeps the actions before the content, so the grid can lift them beside the heading', () => {
		const w = mountSection({ actionsInTitle: true })
		const html = w.html()
		expect(html.indexOf('class="add"')).toBeLessThan(html.indexOf('class="body"'))
	})

	it('lays the heading and the actions out in one row, the rest below across the width', () => {
		const css = source.slice(source.indexOf('<style'))
		expect(css).toMatch(/\.cn-settings-section--title-actions\s*\{[^}]*display: grid;[^}]*grid-template-columns: minmax\(0, 1fr\) auto;/)
		expect(css).toMatch(/\.cn-settings-section--title-actions :deep\(> \*\)\s*\{[^}]*grid-column: 1 \/ -1;/)
		expect(css).toMatch(/\.cn-settings-section--title-actions :deep\(> h2\)\s*\{[^}]*grid-column: 1;[^}]*grid-row: 1;/)
		expect(css).toMatch(/\.cn-settings-section--title-actions > \.cn-settings-section__actions\s*\{[^}]*grid-column: 2;[^}]*grid-row: 1;/)
	})
})

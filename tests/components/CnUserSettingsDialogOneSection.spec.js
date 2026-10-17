/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * user-settings-one-section: the board user settings dialog shows only the
 * section of the current navigation entry, as board DqPersoonlijkeInstellingen
 * does; the others stay mounted but hidden, so what was typed survives a
 * switch. Switching moves focus to the shown section's heading and keeps the
 * navigation's current entry marked.
 *
 * @spec openspec/changes/user-settings-one-section/specs/user-settings-board-dialog/spec.md#requirement-the-board-user-settings-dialog-shows-one-section-at-a-time
 */
import { mount } from '@vue/test-utils'
import { h, inject, onMounted } from 'vue'
import CnUserSettingsDialog from '../../src/components/CnUserSettingsDialog/CnUserSettingsDialog.vue'

/**
 * A section that registers itself and draws its heading and an input the way
 * NcAppSettingsSection draws its content.
 *
 * @param {string} id Section id.
 * @param {string} name Section name.
 * @param {number} order Section order.
 * @return {object} Component.
 */
function section(id, name, order) {
	return {
		setup() {
			const registration = inject(Symbol.for('NcAppSettingsDialog:registration'))
			onMounted(() => registration.registerSection(id, name, order))
			return () => h('section', { id: `settings-section_${id}`, class: 'app-settings-section' }, [
				h('h3', { id: `settings-section_${id}--label` }, name),
				h('input', { class: `input-${id}`, 'aria-label': name }),
			])
		},
	}
}

const MENU = section('menu', 'Case types in my menu', 1)
const NOTIFY = section('notify', 'Notifications', 2)

/**
 * @return {Promise<object>} Wrapper with both sections registered.
 */
async function mountDialog() {
	const w = mount(CnUserSettingsDialog, {
		props: { open: true, title: 'User settings', appName: 'Dossiq' },
		slots: { default: () => [h(MENU), h(NOTIFY)] },
		attachTo: document.body,
	})
	await w.vm.$nextTick()
	await w.vm.$nextTick()
	return w
}

const sectionEl = (id) => document.getElementById(`settings-section_${id}`)

describe('CnUserSettingsDialog: one section at a time', () => {
	it('shows only the first section at first', async () => {
		const w = await mountDialog()
		expect(sectionEl('menu').hidden).toBe(false)
		expect(sectionEl('notify').hidden).toBe(true)
		w.unmount()
	})

	it('switches to the picked section, focuses its heading and keeps the other mounted with its input', async () => {
		const w = await mountDialog()
		document.querySelector('.input-menu').value = 'kept'
		await w.find('[data-testid="cn-user-settings-nav-notify"]').trigger('click')
		await w.vm.$nextTick()
		await w.vm.$nextTick()
		expect(sectionEl('notify').hidden).toBe(false)
		expect(sectionEl('menu').hidden).toBe(true)
		expect(document.activeElement).toBe(document.getElementById('settings-section_notify--label'))
		expect(w.find('[data-testid="cn-user-settings-nav-notify"]').attributes('aria-current')).toBe('true')
		expect(w.find('[data-testid="cn-user-settings-nav-menu"]').attributes('aria-current')).toBeUndefined()
		expect(document.querySelector('.input-menu').value).toBe('kept')
		w.unmount()
	})
})

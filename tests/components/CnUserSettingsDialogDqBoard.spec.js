/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The user settings dialog as the DqPersoonlijkeInstellingen board draws it
 * (NcAppInstellingen, Nextcloud's own settings dialog): 900px wide, the title
 * at the top of a tinted navigation column, every section stacked on the
 * white pane with the navigation scrolling to one, a close icon in the
 * corner, and no header or footer.
 *
 * @spec openspec/changes/user-settings-dialog-dq-board/specs/user-settings-dialog-dq-board/spec.md#requirement-the-user-settings-dialog-follows-the-dq-board
 */
import { mount } from '@vue/test-utils'
import { h, inject, onMounted } from 'vue'
import CnDialog from '../../src/components/CnDialog/CnDialog.vue'
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
			onMounted(() => registration.registerSection(id, name, order, [h('svg', { class: `icon-${id}` })]))
			return () => h('section', { id: `settings-section_${id}`, class: 'app-settings-section' }, [
				h('h3', { id: `settings-section_${id}--label` }, name),
				h('input', { class: `input-${id}`, 'aria-label': name }),
			])
		},
	}
}

const MENU = section('menu', 'Views in my menu', 1)
const NOTIFY = section('notify', 'Notifications', 2)
const sectionEl = (id) => document.getElementById(`settings-section_${id}`)

/**
 * @param {object} [props] Dialog props.
 * @return {Promise<object>} Wrapper with both sections registered.
 */
async function mountDialog(props = {}) {
	const w = mount(CnUserSettingsDialog, {
		props: { open: true, title: 'Personal settings', appName: 'Dossiq', ...props },
		slots: { default: () => [h(MENU), h(NOTIFY)] },
		attachTo: document.body,
	})
	await w.vm.$nextTick()
	await w.vm.$nextTick()
	return w
}

beforeEach(() => {
	Element.prototype.scrollIntoView = jest.fn()
})

describe('CnUserSettingsDialog: the DqPersoonlijkeInstellingen board', () => {
	it('is 900px wide and draws no dialog header or footer', async () => {
		const w = await mountDialog()
		const dialog = w.findComponent(CnDialog)
		expect(dialog.props('headless')).toBe(true)
		expect(dialog.find('.stub.NcDialog').element.style.getPropertyValue('--cn-dialog-width')).toBe('900px')
		expect(w.find('[data-testid="cn-dialog-eyebrow"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-dialog-subtitle"]').exists()).toBe(false)
		expect(w.find('.dialog__actions, [data-testid="cn-user-settings-footer"]').exists()).toBe(false)
		w.unmount()
	})

	it('titles the dialog at the top of the navigation column', async () => {
		const w = await mountDialog()
		const title = w.find('[data-testid="cn-user-settings-nav"] > [data-testid="cn-user-settings-title"]')
		expect(title.element.tagName).toBe('H2')
		expect(title.text()).toBe('Personal settings')
		w.unmount()
	})

	it('lists the sections without icons, in the navigation and before the headings', async () => {
		const w = await mountDialog()
		expect(w.find('[data-testid="cn-user-settings-nav-menu"] .icon-menu').exists()).toBe(false)
		expect(document.querySelector('#settings-section_menu--label .icon-menu')).toBeNull()
		w.unmount()
	})

	it('stacks every section and scrolls to the one picked, focusing its heading', async () => {
		const w = await mountDialog()
		expect(sectionEl('menu').hidden).toBe(false)
		expect(sectionEl('notify').hidden).toBe(false)
		await w.find('[data-testid="cn-user-settings-nav-notify"]').trigger('click')
		await w.vm.$nextTick()
		expect(sectionEl('notify').scrollIntoView).toHaveBeenCalled()
		expect(document.activeElement).toBe(document.getElementById('settings-section_notify--label'))
		expect(w.find('[data-testid="cn-user-settings-nav-notify"]').attributes('aria-current')).toBe('true')
		expect(w.find('[data-testid="cn-user-settings-nav-menu"]').attributes('aria-current')).toBeUndefined()
		w.unmount()
	})

	it('closes from the close icon in the corner and says changes save at once under the sections', async () => {
		const w = await mountDialog()
		expect(w.find('[data-testid="cn-user-settings-note"]').text()).toBe('Changes are saved straight away · Dossiq')
		const close = w.find('[data-testid="cn-user-settings-close"]')
		expect(close.attributes('aria-label')).toBe('Close')
		await close.trigger('click')
		expect(w.emitted('update:open')).toEqual([[false]])
		w.unmount()
	})
})

describe('CnDialog headless', () => {
	it('leaves out the board header but keeps the accessible name', () => {
		const w = mount(CnDialog, { global: { provide: { cnLook: 'board' } }, props: { name: 'T', headless: true } })
		expect(w.findComponent({ name: 'CnDialogHeader' }).exists()).toBe(false)
		expect(w.find('.stub.NcDialog').attributes('name')).toBe('T')
	})
})

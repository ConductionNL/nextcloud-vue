/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * user-settings-nav-groups: the board user settings dialog can list
 * Nextcloud's own personal settings first, as links, then one entry named
 * after the app that holds its sections (board DqPersoonlijkeInstellingen).
 *
 * @spec openspec/changes/user-settings-nav-groups/specs/user-settings-board-dialog/spec.md
 */
import { mount } from '@vue/test-utils'
import { h, inject, onMounted } from 'vue'
import CnUserSettingsDialog from '../../src/components/CnUserSettingsDialog/CnUserSettingsDialog.vue'

jest.mock('@nextcloud/router', () => ({ generateUrl: (path, params = {}) => path.replace(/\{(\w+)\}/g, (_, k) => params[k]) }))

/**
 * A section that registers itself and draws its heading the way NcAppSettingsSection does.
 *
 * @param {string} id Section id.
 * @param {string} name Section name.
 * @return {object} Component.
 */
function section(id, name) {
	return {
		setup() {
			const registration = inject(Symbol.for('NcAppSettingsDialog:registration'))
			onMounted(() => registration.registerSection(id, name, undefined, [h('svg', { class: `icon-${id}` })]))
			return () => h('section', { id: `settings-section_${id}` }, [h('h3', { id: `settings-section_${id}--label`, class: 'app-settings-section__name' }, name)])
		},
	}
}

const MENU = section('menu', 'Case types in my menu')

/**
 * @param {object} props Dialog props.
 * @return {object} Wrapper.
 */
function mountDialog(props = {}) {
	return mount(CnUserSettingsDialog, {
		props: { open: true, title: 'User settings', appName: 'Dossiq', ...props },
		slots: { default: () => [h(MENU)] },
		attachTo: document.body,
	})
}

async function flush(w) {
	await w.vm.$nextTick()
	await w.vm.$nextTick()
}

describe('CnUserSettingsDialog: Nextcloud links and the app group', () => {
	it('lists the Nextcloud links first, then the app entry holding its sections', async () => {
		const w = mountDialog({ nextcloudLinks: [{ label: 'Personal info', section: 'personal-info', icon: 'AccountOutline' }, { label: 'Privacy', href: '/settings/user/privacy' }, { label: 'No target' }] })
		await flush(w)
		const links = w.findAll('[data-testid="cn-user-settings-nc-links"] a')
		expect(links.map((a) => [a.text(), a.attributes('href')])).toEqual([['Personal info', '/settings/user/personal-info'], ['Privacy', '/settings/user/privacy']])
		expect(w.find('[data-testid="cn-user-settings-app-group"]').text()).toBe('Dossiq')
		expect(w.find('.cn-user-settings-dialog__group-sections [data-testid="cn-user-settings-nav-menu"]').attributes('aria-current')).toBe('true')
		w.unmount()
	})

	it('keeps the flat navigation without Nextcloud links', async () => {
		const w = mountDialog()
		await flush(w)
		expect(w.find('[data-testid="cn-user-settings-nc-links"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-user-settings-app-group"]').exists()).toBe(false)
		expect(w.find('.cn-user-settings-dialog__group-sections').exists()).toBe(false)
		w.unmount()
	})
})

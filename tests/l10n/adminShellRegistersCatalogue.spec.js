/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * An admin page reads in the user's language without the app registering the
 * library's catalogue. An admin page is its own webpack entry, and five apps'
 * entries never called `registerTranslations()`, so their version card and
 * admin chrome read English for a Dutch user. The shell and the version card
 * now register it themselves, once per page. Runs the real @nextcloud/l10n and
 * never calls `registerTranslations()` before mounting.
 *
 * @spec openspec/changes/admin-shell-registers-catalogue/specs/settings-board-look/spec.md#requirement-an-admin-page-reads-in-the-users-language-without-the-app-registering
 */

import { translate as t } from '@nextcloud/l10n'
import { mount } from '@vue/test-utils'
import CnAdminSettingsShell from '../../src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue'
import CnVersionInfoCard from '../../src/components/CnVersionInfoCard/CnVersionInfoCard.vue'

global.OC = { requestToken: 'token-test' }

describe('an admin page without app registration', () => {
	beforeAll(() => {
		globalThis._nc_l10n_language = 'nl'
	})

	afterAll(() => {
		globalThis._nc_l10n_language = 'en'
	})

	it('reads the library strings in English before anything registers them', () => {
		expect(t('nextcloud-vue', 'Up to date')).toBe('Up to date')
	})

	it('draws the version card in Dutch when it is the only library surface', () => {
		const wrapper = mount(CnVersionInfoCard, {
			props: { appName: 'Pipelinq', appVersion: '2.14.0', configuredVersion: '2.14.0', isUpToDate: true, showUpdateButton: true },
		})
		const labels = wrapper.findAll('.cn-version-info__label').map((label) => label.text())
		expect(labels).toEqual(['Naam van de app:', 'Versie:', 'Ingestelde versie:'])
		expect(wrapper.text()).toContain('Bijgewerkt')
	})

	it('draws the shell chrome in Dutch', () => {
		const wrapper = mount(CnAdminSettingsShell, {
			props: { appName: 'Pipelinq', appVersion: '2.14.0', showVersionCard: true },
			global: { stubs: { CnSetupWizard: true, CnCredentials: true, CnEnvironmentBanner: true } },
		})
		expect(wrapper.text()).toContain('Ondersteuning')
		expect(wrapper.text()).toContain('Voor ondersteuning mail je naar')
		expect(wrapper.text()).not.toMatch(/Support|For support/)
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The admin chrome in Dutch (board PqBeheer): the version card's labels and
 * button, the shell's support footer and titles, and the register mapping's
 * column head and busy states. Runs the real @nextcloud/l10n.
 *
 * @spec openspec/changes/version-card-dutch-and-header/specs/settings-board-look/spec.md#requirement-the-admin-chrome-reads-in-the-readers-language
 */

import { translate as t } from '@nextcloud/l10n'
import { mount } from '@vue/test-utils'
import CnVersionInfoCard from '../../src/components/CnVersionInfoCard/CnVersionInfoCard.vue'
import { registerTranslations } from '../../src/l10n/index.js'

describe('admin chrome in Dutch', () => {
	beforeEach(() => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()
	})

	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('translates the shell and register mapping strings', () => {
		expect(t('nextcloud-vue', 'Up to date')).toBe('Bijgewerkt')
		expect(t('nextcloud-vue', 'Support')).toBe('Ondersteuning')
		expect(t('nextcloud-vue', 'For support, contact us at')).toBe('Voor ondersteuning mail je naar')
		expect(t('nextcloud-vue', '{app} Settings', { app: 'Pipelinq' })).toBe('Pipelinq-instellingen')
		expect(t('nextcloud-vue', 'Configure your {app} installation', { app: 'Pipelinq' })).toBe('Stel je Pipelinq-installatie in')
		expect(t('nextcloud-vue', 'Information about the current {app} installation', { app: 'Pipelinq' })).toBe('Informatie over de huidige Pipelinq-installatie')
		expect(t('nextcloud-vue', 'Object type')).toBe('Soort object')
		expect(t('nextcloud-vue', 'Importing…')).toBe('Importeren…')
		expect(t('nextcloud-vue', 'Loading registers…')).toBe('Registers laden…')
	})

	it('draws the version card in Dutch', () => {
		const wrapper = mount(CnVersionInfoCard, {
			props: { appName: 'Pipelinq', appVersion: '2.14.0', configuredVersion: '2.14.0', isUpToDate: true, showUpdateButton: true },
		})
		const labels = wrapper.findAll('.cn-version-info__label').map((label) => label.text())
		expect(labels).toEqual(['Naam van de app:', 'Versie:', 'Ingestelde versie:'])
		expect(wrapper.text()).toContain('Bijgewerkt')
		expect(wrapper.text()).not.toMatch(/Application Name|Up to date/)
	})

	it('keeps an app label and translates the ones it leaves out', () => {
		const wrapper = mount(CnVersionInfoCard, {
			props: { appName: 'Pipelinq', appVersion: '2.14.0', labels: { version: 'Release' } },
		})
		expect(wrapper.findAll('.cn-version-info__label').map((label) => label.text())).toEqual(['Naam van de app:', 'Release:'])
	})
})

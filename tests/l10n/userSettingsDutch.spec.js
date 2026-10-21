/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The user settings dialog CnAppRoot hosts, in Dutch: its title, its default
 * sections and the navigation entry that opens it. Runs the real
 * @nextcloud/l10n, because a mock that returns its input cannot tell a
 * translated string from an untranslated one. The last test reads every key
 * the dialog's components translate from their source, so a string added
 * later without Dutch fails here too.
 *
 * @spec openspec/changes/dutch-user-settings-dialog/specs/dutch-user-settings-dialog/spec.md#requirement-the-user-settings-dialog-reads-dutch-for-a-dutch-reader
 */

import { translate as t } from '@nextcloud/l10n'
import fs from 'fs'
import path from 'path'
import CnAppRoot from '../../src/components/CnAppRoot/CnAppRoot.vue'
import nl from '../../l10n/nl.json'
import { registerTranslations } from '../../src/l10n/index.js'

/**
 * A stand-in for the component instance, enough for the dialog's copy.
 *
 * @param {Function} translate The app's translate.
 * @return {object} The fake `this`.
 */
function rootWith(translate) {
	const vm = { translate, userSettingsTitle: '' }
	vm.libraryCopy = (key) => CnAppRoot.methods.libraryCopy.call(vm, key)
	return vm
}

/**
 * The keys a component passes to `t('nextcloud-vue', ...)`.
 *
 * @param {string} file Path below src/components.
 * @return {string[]} The keys.
 */
function libraryKeys(file) {
	const source = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'components', file), 'utf8')
	return [...source.matchAll(/\bt\(\s*'nextcloud-vue'\s*,\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1])
}

describe('user settings dialog in Dutch', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	// First on purpose: register() merges catalogues and cannot drop Dutch again
	// once a test above it registered it.
	it('keeps the app\'s wording where the library has no translation of its own', () => {
		const vm = rootWith((key) => `[app]${key}`)

		expect(vm.libraryCopy('Credentials')).toBe('[app]Credentials')
		expect(CnAppRoot.computed.resolvedUserSettingsTitle.call(vm)).toBe('[app]User settings')
	})

	it('names the dialog, its sections and the navigation entry as the boards do', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()

		expect(t('nextcloud-vue', 'User settings')).toBe('Persoonlijke instellingen')
		expect(t('nextcloud-vue', 'Personal settings')).toBe('Persoonlijke instellingen')
		expect(t('nextcloud-vue', 'Credentials')).toBe('Inloggegevens')
		expect(t('nextcloud-vue', 'Notifications')).toBe('Meldingen')
		expect(t('nextcloud-vue', 'Walkthrough')).toBe('Rondleiding')
		expect(t('nextcloud-vue', 'Take the guided tour of this app again.')).toBe('Doe de rondleiding door deze app nog een keer.')
		expect(t('nextcloud-vue', 'Your account')).toBe('Uw account')
		expect(t('nextcloud-vue', 'Only for you. Colleagues keep their own settings.')).toBe('Alleen voor jou. Collega\'s houden hun eigen instellingen.')
		expect(t('nextcloud-vue', 'Changes are saved straight away')).toBe('Wijzigingen worden meteen bewaard')
		expect(t('nextcloud-vue', 'Sections of the settings')).toBe('Onderdelen van de instellingen')
	})

	it('lets the library catalogue win over an app catalogue that gives the word another meaning', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()
		const vm = rootWith((key) => (key === 'Credentials' ? 'Diploma\'s' : key))

		expect(vm.libraryCopy('Credentials')).toBe('Inloggegevens')
		expect(CnAppRoot.computed.resolvedUserSettingsTitle.call(vm)).toBe('Persoonlijke instellingen')
		expect(CnAppRoot.computed.restartWalkthroughSectionName.call(vm)).toBe('Rondleiding')
		expect(CnAppRoot.computed.restartWalkthroughHint.call(vm)).toBe('Doe de rondleiding door deze app nog een keer.')
		expect(CnAppRoot.computed.restartWalkthroughLabel.call(vm)).toBe('Rondleiding opnieuw starten')
	})

	it('keeps an explicit userSettingsTitle', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()
		const vm = { ...rootWith((key) => key), userSettingsTitle: 'Mijn voorkeuren' }

		expect(CnAppRoot.computed.resolvedUserSettingsTitle.call(vm)).toBe('Mijn voorkeuren')
	})

	it('has Dutch for every string the dialog and its default sections translate', () => {
		const root = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'components', 'CnAppRoot', 'CnAppRoot.vue'), 'utf8')
		const rootKeys = [...root.matchAll(/\blibraryCopy\(\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1])
		const keys = [
			...rootKeys,
			...libraryKeys('CnNotificationPreferences/CnNotificationPreferences.vue'),
			...libraryKeys('CnCredentials/CnCredentials.vue'),
			...libraryKeys('CnAppNav/CnAppNav.vue'),
			...libraryKeys('CnUserSettingsDialog/CnUserSettingsDialog.vue'),
		]
		expect(rootKeys.length).toBeGreaterThanOrEqual(6)
		expect([...new Set(keys)].filter((key) => !(key in nl.translations))).toEqual([])
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * appShownName: an app id is not a name. The user settings dialog read
 * "Wat launchpad gebruikt" because CnAppRoot hands the id on when the app
 * gives no display name.
 */
var mockApps = []

jest.mock('@nextcloud/initial-state', () => ({
	__esModule: true,
	loadState: (app, key, fallback) => (app === 'core' && key === 'apps' && mockApps !== null ? mockApps : fallback),
}))

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }))

import { appShownName } from '../../src/utils/appShownName.js'

const CnCredentials = require('../../src/components/CnCredentials/CnCredentials.vue').default

describe('appShownName', () => {
	beforeEach(() => {
		mockApps = []
	})

	test('a real name wins', () => {
		mockApps = [{ id: 'launchpad', name: 'Startpagina' }]
		expect(appShownName('launchpad', 'Pet Store')).toBe('Pet Store')
	})

	test('the id handed on as the name is not a name: the app menu name is used', () => {
		mockApps = [{ id: 'files', name: 'Bestanden' }, { id: 'launchpad', app: 'launchpad', type: 'link', name: 'Startpagina' }]
		expect(appShownName('launchpad', 'launchpad')).toBe('Startpagina')
		expect(appShownName('launchpad')).toBe('Startpagina')
	})

	test('an entry registered by the app under another id counts, a settings entry does not', () => {
		mockApps = { a: { id: 'launchpad-admin', app: 'launchpad', type: 'settings', name: 'Beheer' }, b: { id: 'start', app: 'launchpad', type: 'link', name: 'Start' } }
		expect(appShownName('launchpad')).toBe('Start')
	})

	test('an app the menu does not list gets its id with a capital', () => {
		expect(appShownName('launchpad', 'launchpad')).toBe('Launchpad')
		mockApps = null
		expect(appShownName('pipelinq')).toBe('Pipelinq')
	})

	test('no id: the given name, or nothing', () => {
		expect(appShownName('', 'Pet Store')).toBe('Pet Store')
		expect(appShownName('')).toBe('')
	})

	test('the credentials section never shows the bare id', () => {
		const name = (props) => CnCredentials.computed.appDisplayName.call(props)
		expect(name({ appId: 'launchpad', appName: 'launchpad' })).toBe('Launchpad')
		expect(name({ appId: 'launchpad', appName: 'Launchpad start' })).toBe('Launchpad start')
	})
})

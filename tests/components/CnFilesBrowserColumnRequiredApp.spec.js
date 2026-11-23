/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A declared column can lean on another Nextcloud app (`requiredApp`, one id
 * or a list of which any one will do): without that app the column is left
 * out altogether, as a widget with `requiredApp` is. dossiq's Scan column
 * needs a virus scanner such as files_antivirus; without one every row read
 * "Niet gescand".
 *
 * @spec openspec/changes/files-column-required-app/specs/files-column-required-app/spec.md#requirement-a-file-column-can-require-another-app
 */
import { normaliseFileColumns } from '../../src/components/CnFilesBrowser/filesBrowserColumns.js'
import { __resetAppInstalledCacheForTests } from '../../src/utils/appInstalled.js'

const DECLARATION = [
	'name',
	{ key: 'scanVerdict', label: 'Scan', source: 'row', requiredApp: 'files_antivirus' },
	{ key: 'scanBoth', label: 'Scan (any)', source: 'row', requiredApp: ['files_antivirus', 'files_scanner'] },
	'modified',
]

/**
 * Pretend these apps are enabled for the user.
 *
 * @param {string[]} apps App ids.
 */
function withApps(apps) {
	__resetAppInstalledCacheForTests()
	global.OC = { appswebroots: Object.fromEntries(apps.map((id) => [id, '/apps/' + id])) }
}

describe('a file column that requires another app', () => {
	afterEach(() => {
		delete global.OC
		__resetAppInstalledCacheForTests()
	})

	it('is left out when the app is not enabled', () => {
		withApps(['files'])
		expect(normaliseFileColumns(DECLARATION).map((c) => c.key)).toEqual(['name', 'modified'])
	})

	it('is kept when the app is enabled', () => {
		withApps(['files', 'files_antivirus'])
		expect(normaliseFileColumns(DECLARATION).map((c) => c.key)).toEqual(['name', 'scanVerdict', 'scanBoth', 'modified'])
	})

	it('takes any one app of a list', () => {
		withApps(['files_scanner'])
		expect(normaliseFileColumns(DECLARATION).map((c) => c.key)).toEqual(['name', 'scanBoth', 'modified'])
	})
})

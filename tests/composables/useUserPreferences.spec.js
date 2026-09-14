/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * useUserPreferences: how a person likes the product, stored where Nextcloud
 * already keeps that.
 *
 * Two things are worth testing hard. The three-layer order, because getting
 * it wrong means an administrator's value quietly overrules a person's own.
 * And the instance switch, because the failure it exists to prevent is a
 * preference that is accepted and then not applied.
 *
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), put: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((path) => path),
}))

import {
	readUserPreference,
	resolvePreference,
	USER_PREFERENCE_KEYS,
	userPreferenceUrl,
	useUserPreferences,
	writeUserPreference,
} from '../../src/composables/useUserPreferences.js'

/**
 * A localStorage-shaped store that starts empty.
 *
 * @return {object} The store.
 */
function memoryStorage() {
	const map = new Map()
	return {
		getItem: (k) => (map.has(k) ? map.get(k) : null),
		setItem: (k, v) => map.set(k, v),
		removeItem: (k) => map.delete(k),
	}
}

describe('resolvePreference — the three layers', () => {
	it('lets a person overrule the administrator, who overrules the app', () => {
		expect(resolvePreference({ appDefault: 'a', administered: 'b', personal: 'c' }))
			.toEqual({ value: 'c', source: 'personal', personalApplies: true })
	})

	it('falls to the administered value when the person chose nothing', () => {
		expect(resolvePreference({ appDefault: 'a', administered: 'b' }).source).toBe('administered')
	})

	it('falls to the app default when neither did', () => {
		expect(resolvePreference({ appDefault: 'a' }).source).toBe('app')
	})

	it('answers nothing at all with source none, rather than a misleading default', () => {
		expect(resolvePreference({})).toEqual({ value: undefined, source: 'none', personalApplies: true })
	})

	it('treats false and 0 as choices, not as absences', () => {
		// A person who switched something off must not have it switched back
		// on by the layer below, which is what reading `false` as unset does.
		expect(resolvePreference({ appDefault: true, personal: false }).value).toBe(false)
		expect(resolvePreference({ appDefault: 10, personal: 0 }).value).toBe(0)
	})

	it.each([[null], [undefined], ['']])('treats %p as an absence', (personal) => {
		expect(resolvePreference({ appDefault: 'a', personal }).source).toBe('app')
	})

	it('drops the personal layer when this instance switched customisation off', () => {
		const resolved = resolvePreference({ appDefault: 'a', personal: 'c', personalisationEnabled: false })

		expect(resolved.value).toBe('a')
		expect(resolved.personalApplies).toBe(false)
	})
})

describe('readUserPreference and writeUserPreference', () => {
	let http

	beforeEach(() => {
		http = { get: jest.fn(), put: jest.fn() }
	})

	it('reads the stored value off the app preferences endpoint', async () => {
		http.get.mockResolvedValue({ data: { value: '"Queue"' } })

		const read = await readUserPreference('dossiq', 'cn_landing_page', null, { http, storage: memoryStorage() })

		expect(http.get).toHaveBeenCalledWith('/apps/dossiq/api/preferences/cn_landing_page')
		expect(read).toBe('Queue')
	})

	it('reads and writes the same URL, or a preference reads back as never set forever', () => {
		expect(userPreferenceUrl('dossiq', 'cn_date_display')).toBe('/apps/dossiq/api/preferences/cn_date_display')
	})

	it('round-trips a list, which a plain string store would flatten', async () => {
		const storage = memoryStorage()
		http.put.mockResolvedValue({})
		await writeUserPreference('dossiq', 'cn_menu_order', ['b', 'a'], { http, storage })

		expect(http.put).toHaveBeenCalledWith('/apps/dossiq/api/preferences/cn_menu_order', { value: '["b","a"]' })
		http.get.mockRejectedValue(new Error('offline'))
		expect(await readUserPreference('dossiq', 'cn_menu_order', null, { http, storage })).toEqual(['b', 'a'])
	})

	it('refuses the SPA shell as a stored value', async () => {
		// An app that does not serve this route answers with its HTML page.
		// Reading that as a preference overwrites a real one with markup.
		http.get.mockResolvedValue({ data: '<!DOCTYPE html><html>…' })

		expect(await readUserPreference('dossiq', 'cn_landing_page', 'Cases', { http, storage: memoryStorage() }))
			.toBe('Cases')
	})

	it('falls back to the browser mirror when the endpoint is missing', async () => {
		const storage = memoryStorage()
		http.put.mockRejectedValue(new Error('404'))
		await writeUserPreference('dossiq', 'cn_date_display', 'relative', { http, storage })

		http.get.mockRejectedValue(new Error('404'))

		expect(await readUserPreference('dossiq', 'cn_date_display', 'absolute', { http, storage })).toBe('relative')
	})

	it('answers the fallback when nothing is stored anywhere', async () => {
		http.get.mockResolvedValue({ data: { value: null } })

		expect(await readUserPreference('dossiq', 'cn_date_display', 'absolute', { http, storage: memoryStorage() }))
			.toBe('absolute')
	})

	it('says whether the write reached the server, so a caller can tell', async () => {
		http.put.mockResolvedValue({})
		expect(await writeUserPreference('dossiq', 'k', 1, { http, storage: memoryStorage() })).toBe(true)

		http.put.mockRejectedValue(new Error('500'))
		expect(await writeUserPreference('dossiq', 'k', 1, { http, storage: memoryStorage() })).toBe(false)
	})
})

describe('useUserPreferences', () => {
	let http

	beforeEach(() => {
		http = { get: jest.fn().mockResolvedValue({ data: { value: null } }), put: jest.fn().mockResolvedValue({}) }
	})

	it('reads the app default out of the manifest personalisation block', async () => {
		const prefs = useUserPreferences('dossiq', {
			personalisation: { landingPage: 'Queue' },
			http,
			storage: memoryStorage(),
		})

		expect(await prefs.read(USER_PREFERENCE_KEYS.landingPage)).toBe('Queue')
	})

	it('lets the person overrule it', async () => {
		http.get.mockResolvedValue({ data: { value: '"Cases"' } })
		const prefs = useUserPreferences('dossiq', {
			personalisation: { landingPage: 'Queue' },
			http,
			storage: memoryStorage(),
		})

		expect(await prefs.read(USER_PREFERENCE_KEYS.landingPage)).toBe('Cases')
	})

	it('lets an administered value overrule the app default', async () => {
		const prefs = useUserPreferences('dossiq', {
			personalisation: { dateDisplay: 'absolute' },
			administered: { [USER_PREFERENCE_KEYS.dateDisplay]: 'relative' },
			http,
			storage: memoryStorage(),
		})

		expect(await prefs.read(USER_PREFERENCE_KEYS.dateDisplay)).toBe('relative')
	})
})

describe('useUserPreferences — customisation switched off', () => {
	let http

	beforeEach(() => {
		http = { get: jest.fn().mockResolvedValue({ data: { value: '"Cases"' } }), put: jest.fn().mockResolvedValue({}) }
	})

	/**
	 * A group on an instance with personal customisation switched off.
	 *
	 * @return {object} The group.
	 */
	function switchedOff() {
		return useUserPreferences('dossiq', {
			personalisation: { enabled: false, disabledReason: 'Uw beheerder heeft persoonlijke instellingen uitgezet.', landingPage: 'Queue' },
			http,
			storage: memoryStorage(),
		})
	}

	it('says the personal layer does not apply, so the interface can show why', () => {
		const prefs = switchedOff()

		expect(prefs.personalApplies.value).toBe(false)
		expect(prefs.disabledReason.value).toContain('beheerder')
	})

	it('refuses the write rather than accepting it and not applying it', async () => {
		const prefs = switchedOff()

		expect(await prefs.write(USER_PREFERENCE_KEYS.landingPage, 'Cases')).toBe(false)
		expect(http.put).not.toHaveBeenCalled()
	})

	it('does not even read the personal value, so a stale one cannot leak through', async () => {
		const prefs = switchedOff()

		expect(await prefs.read(USER_PREFERENCE_KEYS.landingPage)).toBe('Queue')
		expect(http.get).not.toHaveBeenCalled()
	})

	it('says nothing about a reason when customisation is on', () => {
		const prefs = useUserPreferences('dossiq', { personalisation: { enabled: true, disabledReason: 'x' }, http })

		expect(prefs.personalApplies.value).toBe(true)
		expect(prefs.disabledReason.value).toBe('')
	})
})

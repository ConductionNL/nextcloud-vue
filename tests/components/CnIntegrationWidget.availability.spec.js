/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Unit tests for the CnIntegrationWidget availability resolver — proves
 * the source order: descriptor `available` → OCS capability providers
 * (with reason) → isAppInstalled fallback.
 */

import { resolveProviderAvailability, readCapabilityProviders } from '../../src/components/CnIntegrationWidget/availability.js'

describe('resolveProviderAvailability', () => {
	it('honours a descriptor-carried available flag first', () => {
		expect(resolveProviderAvailability({ id: 'deck', available: true }, {}))
			.toEqual({ available: true, reason: 'available' })
		expect(resolveProviderAvailability({ id: 'deck', requiredApp: 'deck', available: false }, {}))
			.toEqual({ available: false, reason: 'missing-app' })
	})

	it('reads the OCS capability providers map when the descriptor has no flag', () => {
		const getCapabilities = () => ({
			openregister: { integrations: { providers: [{ id: 'deck', available: true }] } },
		})
		expect(resolveProviderAvailability({ id: 'deck', requiredApp: 'deck' }, { getCapabilities }))
			.toEqual({ available: true, reason: 'available' })
	})

	it('surfaces the OCS-provided reason for an unavailable provider', () => {
		const getCapabilities = () => ({
			openregister: { integrations: { providers: [{ id: 'xwiki', available: false, reason: 'not-configured' }] } },
		})
		expect(resolveProviderAvailability({ id: 'xwiki', group: 'external' }, { getCapabilities }))
			.toEqual({ available: false, reason: 'not-configured' })
	})

	it('falls back to isAppInstalled when no descriptor flag and no OCS entry', () => {
		const getCapabilities = () => ({})
		const isAppInstalled = (id) => id === 'deck'
		expect(resolveProviderAvailability({ id: 'deck', requiredApp: 'deck' }, { getCapabilities, isAppInstalled }))
			.toEqual({ available: true, reason: 'available' })
		expect(resolveProviderAvailability({ id: 'forms', requiredApp: 'forms' }, { getCapabilities, isAppInstalled }))
			.toEqual({ available: false, reason: 'missing-app' })
	})

	it('treats requiredApp-less built-ins as always available', () => {
		expect(resolveProviderAvailability({ id: 'tasks', requiredApp: null }, { getCapabilities: () => ({}) }))
			.toEqual({ available: true, reason: 'available' })
	})

	it('reports unknown when there is no signal at all', () => {
		expect(resolveProviderAvailability({ id: 'deck', requiredApp: 'deck' }, { getCapabilities: () => ({}) }))
			.toEqual({ available: false, reason: 'unknown' })
	})
})

describe('readCapabilityProviders', () => {
	it('normalises an array of providers into a keyed map', () => {
		const getCapabilities = () => ({
			openregister: { integrations: { providers: [{ id: 'a' }, { id: 'b' }] } },
		})
		const map = readCapabilityProviders(getCapabilities)
		expect(Object.keys(map).sort()).toEqual(['a', 'b'])
	})

	it('returns null when the capability is absent', () => {
		expect(readCapabilityProviders(() => ({}))).toBeNull()
		expect(readCapabilityProviders(() => null)).toBeNull()
	})
})

/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The search predicate, the grouping switch and the provider fallback, tested
 * where they live: pure functions over the comparison document, no DOM.
 *
 * The assertions that matter here are the ones about rows NOT disappearing. A
 * dropped row is the failure this module exists to prevent, and it looks
 * exactly like a row nobody wrote.
 */

import {
	defaultGroupMode,
	filterCapabilities,
	groupCapabilities,
	hasProviders,
	labelFor,
	matchesQuery,
	normaliseText,
	overallTallies,
	resolveProvider,
	UNMAPPED_GROUP_KEY,
} from '../../src/utils/capabilityComparison.js'

/**
 * A comparison document carrying every optional field the contract adds.
 *
 * @return {object} The document.
 */
function fullDocument() {
	return {
		systems: [
			{ key: 'dossiq', name: 'Dossiq', isSelf: true },
			{ key: 'opencase', name: 'OpenCase' },
		],
		areas: [
			{ key: 'intake', name: 'Intake', name_nl: 'Intake' },
			{ key: 'documents', name: 'Documents', name_nl: 'Documenten' },
		],
		features: [
			{ key: 'case-types', name: 'Case types', name_nl: 'Zaaktypen' },
			{ key: 'filing', name: 'Filing', name_nl: 'Archivering' },
		],
		providers: [
			{ key: 'dossiq', name: 'Dossiq', kind: 'self' },
			{ key: 'openregister', name: 'OpenRegister', kind: 'app' },
			{ key: 'nextcloud', name: 'Nextcloud', kind: 'platform' },
		],
		capabilities: [
			{
				id: '1.1',
				area: 'intake',
				name: 'Citizen web form per case type',
				name_nl: 'Webformulier voor burgers per zaaktype',
				dossiq: 'partial',
				opencase: 'no',
				provider: 'dossiq',
				feature: 'case-types',
				featureConfidence: 'high',
			},
			{
				id: '4.1',
				area: 'documents',
				name: 'Versioned documents',
				name_nl: 'Documenten met versies',
				dossiq: 'yes',
				opencase: 'yes',
				provider: 'nextcloud',
				feature: 'filing',
				featureConfidence: 'low',
			},
			{
				id: '4.2',
				area: 'documents',
				name: 'Retention schedule per record',
				name_nl: 'Bewaartermijn per record',
				dossiq: 'yes',
				opencase: 'unknown',
				provider: 'openregister',
				feature: 'filing',
			},
		],
	}
}

/**
 * The document every consumer has today: no providers, no features.
 *
 * @return {object} The document.
 */
function legacyDocument() {
	return {
		systems: [{ key: 'dossiq', name: 'Dossiq', isSelf: true }],
		areas: [{ key: 'intake', name: 'Intake' }],
		capabilities: [
			{ id: '1.1', area: 'intake', name: 'Citizen web form', dossiq: 'partial' },
		],
	}
}

describe('normaliseText', () => {
	it('folds case and strips accents so a plain query finds an accented row', () => {
		expect(normaliseText('Eén Zaak')).toBe('een zaak')
	})

	it('survives a null without throwing', () => {
		expect(normaliseText(null)).toBe('')
	})
})

describe('labelFor', () => {
	it('gives a Dutch reader the Dutch name', () => {
		expect(labelFor({ name: 'Documents', name_nl: 'Documenten' }, 'nl_NL')).toBe('Documenten')
	})

	it('falls back to English when the Dutch name is missing', () => {
		expect(labelFor({ name: 'Documents' }, 'nl')).toBe('Documents')
	})
})

describe('resolveProvider', () => {
	it('resolves a declared provider to its name and kind', () => {
		const provider = resolveProvider(fullDocument().capabilities[1], fullDocument())
		expect(provider).toEqual({ key: 'nextcloud', name: 'Nextcloud', kind: 'platform', declared: true })
	})

	it('shows the raw key for a provider the document never declared', () => {
		const document = fullDocument()
		const row = { ...document.capabilities[0], provider: 'thematiq' }
		expect(resolveProvider(row, document)).toEqual({
			key: 'thematiq',
			name: 'thematiq',
			kind: 'unknown',
			declared: false,
		})
	})

	it('treats a kind outside the three as unknown rather than passing it through', () => {
		const document = fullDocument()
		document.providers.push({ key: 'weird', name: 'Weird', kind: 'sidecar' })
		const row = { ...document.capabilities[0], provider: 'weird' }
		expect(resolveProvider(row, document).kind).toBe('unknown')
		expect(resolveProvider(row, document).name).toBe('Weird')
	})

	it('returns null when the row names no provider', () => {
		expect(resolveProvider({ id: '1.1' }, fullDocument())).toBeNull()
	})
})

describe('matchesQuery', () => {
	const document = fullDocument()

	it('matches on the English name', () => {
		expect(matchesQuery(document.capabilities[0], 'web form', document)).toBe(true)
	})

	it('matches on the Dutch name even for an English reader', () => {
		expect(matchesQuery(document.capabilities[0], 'webformulier', document)).toBe(true)
	})

	it('matches on the row id', () => {
		expect(matchesQuery(document.capabilities[1], '4.1', document)).toBe(true)
	})

	it('matches on the area label', () => {
		expect(matchesQuery(document.capabilities[1], 'documenten', document)).toBe(true)
	})

	it('matches on the feature label', () => {
		expect(matchesQuery(document.capabilities[0], 'zaaktypen', document)).toBe(true)
	})

	it('matches on the provider name', () => {
		expect(matchesQuery(document.capabilities[2], 'openregister', document)).toBe(true)
	})

	it('narrows on every term rather than widening', () => {
		expect(matchesQuery(document.capabilities[0], 'intake dossiq', document)).toBe(true)
		expect(matchesQuery(document.capabilities[0], 'intake nextcloud', document)).toBe(false)
	})

	it('matches everything on an empty query', () => {
		expect(matchesQuery(document.capabilities[0], '   ', document)).toBe(true)
	})
})

describe('filterCapabilities', () => {
	it('keeps every row when nothing is typed', () => {
		expect(filterCapabilities(fullDocument(), '')).toHaveLength(3)
	})

	it('keeps only the matching rows', () => {
		const rows = filterCapabilities(fullDocument(), 'retention')
		expect(rows.map((row) => row.id)).toEqual(['4.2'])
	})
})

describe('defaultGroupMode', () => {
	it('opens on features when any row carries one', () => {
		expect(defaultGroupMode(fullDocument())).toBe('feature')
	})

	it('opens on areas for the document every consumer has today', () => {
		expect(defaultGroupMode(legacyDocument())).toBe('area')
	})
})

describe('hasProviders', () => {
	it('is false for a document that predates the field', () => {
		expect(hasProviders(legacyDocument())).toBe(false)
	})

	it('is true as soon as one row names a provider', () => {
		expect(hasProviders(fullDocument())).toBe(true)
	})
})

describe('groupCapabilities by feature', () => {
	it('groups the rows under the features the document declares, in its order', () => {
		const groups = groupCapabilities(fullDocument(), { mode: 'feature' })
		expect(groups.map((group) => group.label)).toEqual(['Case types', 'Filing'])
		expect(groups[1].capabilities.map((row) => row.id)).toEqual(['4.1', '4.2'])
	})

	it('puts a row with no feature in a named bucket instead of dropping it', () => {
		const document = fullDocument()
		document.capabilities.push({ id: '9.9', area: 'intake', name: 'Orphan', dossiq: 'no' })
		const groups = groupCapabilities(document, { mode: 'feature', unmappedLabel: 'Not yet mapped to a feature' })
		const bucket = groups.find((group) => group.key === UNMAPPED_GROUP_KEY)
		expect(bucket.label).toBe('Not yet mapped to a feature')
		expect(bucket.capabilities.map((row) => row.id)).toEqual(['9.9'])
		expect(groups.flatMap((group) => group.capabilities)).toHaveLength(4)
	})

	it('gives a feature key the document never declared a group of its own', () => {
		const document = fullDocument()
		document.capabilities.push({ id: '9.9', area: 'intake', feature: 'invented', name: 'Odd', dossiq: 'no' })
		const groups = groupCapabilities(document, { mode: 'feature' })
		const invented = groups.find((group) => group.key === 'invented')
		expect(invented.label).toBe('invented')
		expect(invented.declared).toBe(false)
		expect(groups.flatMap((group) => group.capabilities)).toHaveLength(4)
	})

	it('drops an empty group so a search leaves no empty heading behind', () => {
		const groups = groupCapabilities(fullDocument(), { mode: 'feature', query: 'retention' })
		expect(groups.map((group) => group.label)).toEqual(['Filing'])
	})
})

describe('groupCapabilities by area', () => {
	it('groups by area in the document order, which is the audit numbering', () => {
		const groups = groupCapabilities(fullDocument(), { mode: 'area' })
		expect(groups.map((group) => group.label)).toEqual(['Intake', 'Documents'])
	})

	it('gives an area key the document never declared a group of its own', () => {
		const document = fullDocument()
		document.capabilities.push({ id: '9.9', area: 'invented-area', name: 'Odd', dossiq: 'no' })
		const groups = groupCapabilities(document, { mode: 'area' })
		expect(groups.map((group) => group.key)).toContain('invented-area')
		expect(groups.flatMap((group) => group.capabilities)).toHaveLength(4)
	})

	it('labels the groups in Dutch for a Dutch reader', () => {
		const groups = groupCapabilities(fullDocument(), { mode: 'area', locale: 'nl' })
		expect(groups.map((group) => group.label)).toEqual(['Intake', 'Documenten'])
	})
})

describe('tallies', () => {
	it('counts a rating outside the three as unknown rather than dropping it', () => {
		const document = fullDocument()
		document.capabilities[0].opencase = 'maybe'
		const totals = overallTallies(document)
		expect(totals.opencase.unknown).toBe(2)
		expect(totals.opencase.total).toBe(3)
	})
})

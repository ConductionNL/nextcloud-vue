/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Reading a record's parties. Ported from dossiq (caseParties, gemachtigdeRole,
 * partyCorrespondence).
 *
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-record-shows-its-parties-by-role
 */
import { documentsOfParty, indicatorsOf, indicatorVerdict, newPartyRecord, partiesInOrder, representedByMap, roleLabel, rolesInOrder, savedUuid } from '../../src/utils/objectParties.js'

const LISTING = {
	results: [],
	byRole: {
		interested: [{ partyUuid: 'p-buur', displayName: 'De buurman' }],
		applicant: [{ partyUuid: 'p-mr', displayName: 'Mr. Advocaat' }, { partyUuid: 'p-jan', displayName: 'Jan de Vries' }],
	},
	roles: [{ key: 'rt-1', label: 'Behandelaar' }],
	primary: 'p-jan',
}

describe('objectParties', () => {
	it('puts the primary party first, and its role group first', () => {
		const groups = rolesInOrder(LISTING)
		expect(groups[0].key).toBe('applicant')
		expect(groups[0].parties[0].displayName).toBe('Jan de Vries')
		expect(groups[1].key).toBe('interested')
	})

	it('leaves the order alone when no party is primary', () => {
		expect(rolesInOrder({ ...LISTING, primary: null })[0].key).toBe('interested')
		expect(partiesInOrder(LISTING.byRole.applicant, null)[0].partyUuid).toBe('p-mr')
	})

	it('labels a role by the app\'s word, then the listing\'s, then its key', () => {
		expect(roleLabel('applicant', LISTING.roles, { applicant: 'Requester' })).toBe('Requester')
		expect(roleLabel('rt-1', LISTING.roles)).toBe('Behandelaar')
		expect(roleLabel('rt-9', LISTING.roles)).toBe('rt-9')
		expect(roleLabel('other', [])).toBe('No role')
	})

	it('gives every indicator a verdict, and warns on an effect it does not know', () => {
		expect(indicatorVerdict({ effect: 'refuse-publication' }).severity).toBe('error')
		expect(indicatorVerdict({ effect: 'refuse-send' }).severity).toBe('error')
		expect(indicatorVerdict({ effect: 'embargo', label: 'Embargo' })).toEqual({ effect: 'embargo', severity: 'warning', label: 'Embargo', verdict: 'Read this before acting on the record' })
		expect(indicatorVerdict({ effect: 'refuse-send' }, { verdictSend: 'No mail' }).verdict).toBe('No mail')
	})

	it('stamps each indicator with its party', () => {
		const found = indicatorsOf([{ id: 'p-buur', name: 'De buurman', indicators: [{ key: 'geheim', effect: 'refuse-publication' }] }, null])
		expect(found).toEqual([{ key: 'geheim', effect: 'refuse-publication', party: 'p-buur', partyName: 'De buurman' }])
	})

	it('maps who represents whom, from either shape of the reference', () => {
		expect(representedByMap([
			{ participant: 'p-mr', representedParty: 'p-jan' },
			{ participant: 'p-x', representedParty: { id: 'p-y' } },
			{ participant: '', representedParty: 'p-z' },
		])).toEqual({ 'p-mr': 'p-jan', 'p-x': 'p-y' })
		expect(representedByMap([{ participant: 'p-gem', delegateFrom: '2026-09-01T00:00:00+00:00' }])).toEqual({})
		expect(representedByMap(null)).toEqual({})
	})

	it('counts the documents a party sent and received', () => {
		const docs = [{ sender: 'p-jan', recipients: [] }, { sender: 'p-jan', recipients: ['p-council'] }, { sender: '', recipients: ['p-jan'] }]
		const jan = documentsOfParty(docs, 'p-jan')
		expect(jan.sent).toHaveLength(2)
		expect(jan.received).toHaveLength(1)
		expect(documentsOfParty(docs, '')).toEqual({ sent: [], received: [] })
	})
})

describe('newPartyRecord', () => {
	const CREATE = {
		fields: [
			{ key: 'givenNames', path: 'name.givenNames' },
			{ key: 'prefix', path: 'name.namePrefix' },
			{ key: 'surname', path: 'name.surname' },
			{ key: 'email', address: { path: 'contactAddresses', kind: 'correspondence', type: 'email' } },
			{ key: 'phone', address: { path: 'contactAddresses', kind: 'correspondence', type: 'phone' } },
			{ key: 'city' },
			{ key: 'houseNumber', path: 'residence.houseNumber', type: 'integer' },
		],
		compose: { displayName: ['name.givenNames', 'name.namePrefix', 'name.surname'] },
	}

	it('writes each value at its path, addresses as a list, and the composed name without gaps', () => {
		expect(newPartyRecord(CREATE, { givenNames: ' Kees ', prefix: '', surname: 'Wit', email: 'kees@example.org', phone: '0612345678', city: 'Zuiddrecht', houseNumber: '31' })).toEqual({
			name: { givenNames: 'Kees', surname: 'Wit' },
			residence: { houseNumber: 31 },
			contactAddresses: [
				{ kind: 'correspondence', type: 'email', value: 'kees@example.org' },
				{ kind: 'correspondence', type: 'phone', value: '0612345678' },
			],
			city: 'Zuiddrecht',
			displayName: 'Kees Wit',
		})
	})

	it('leaves out what was not given and asks for no identifier', () => {
		expect(newPartyRecord(CREATE, { surname: 'Wit' })).toEqual({ name: { surname: 'Wit' }, displayName: 'Wit' })
		expect(newPartyRecord({}, { surname: 'Wit' })).toEqual({})
	})
})

describe('savedUuid', () => {
	it('reads the uuid a create answered with', () => {
		expect(savedUuid({ '@self': { id: 'a' } })).toBe('a')
		expect(savedUuid({ uuid: 'b' })).toBe('b')
		expect(savedUuid({ id: 'c' })).toBe('c')
		expect(savedUuid(null)).toBe('')
	})
})

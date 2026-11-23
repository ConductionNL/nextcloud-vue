/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The reads behind CnObjectPermissionsTab. Every assertion guards a way the
 * tab could be confidently WRONG rather than merely absent:
 *  - a failed read answers null, never [] ("we could not ask" is not "nobody");
 *  - a deny and a grant on the same holder and right are BOTH listed;
 *  - the scopes matrix is read by schema name, not position;
 *  - a 403 keeps its status, because it is an answer, not a failure;
 *  - an inherited grant names its ancestor beside the source, never in it;
 *  - field rules apply to the reader only when OpenRegister said so.
 */

import axios from '@nextcloud/axios'
import {
	asOfRows,
	constraintsOf,
	fetchAccessHistory,
	fetchCallerScope,
	fetchFieldRoleRules,
	fetchObjectGrants,
	fetchObjectPermissions,
	fieldRoleRows,
	grantRows,
	objectPermissionRows,
	roleRuleSentence,
} from '../../src/utils/objectPermissions.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/index.php${p === '/' ? '/' : p}`) }))

const TARGET = { register: 'dossiq', schema: 'case' }

beforeEach(() => {
	axios.get.mockReset()
})

describe('the reads answer null when they cannot be read', () => {
	it('answers null when the grants cannot be read, never an empty list', async () => {
		axios.get.mockRejectedValueOnce(new Error('openregister is down'))
		expect(await fetchObjectGrants(TARGET, 'obj-1')).toBeNull()
	})

	it('answers null when the body is not JSON, because a string has no results', async () => {
		axios.get.mockResolvedValueOnce({ data: '<!DOCTYPE html><html></html>' })
		expect(await fetchObjectGrants(TARGET, 'obj-1')).toBeNull()
	})

	it('answers the grants OpenRegister listed, from the target URL', async () => {
		axios.get.mockResolvedValueOnce({ data: { results: [{ principal: 'behandelaars', actions: ['read'] }] } })
		expect(await fetchObjectGrants(TARGET, 'obj-1')).toEqual([{ principal: 'behandelaars', actions: ['read'] }])
		expect(axios.get.mock.calls[0][0]).toBe('/index.php/apps/openregister/api/objects/dossiq/case/obj-1/shares')
	})

	it('picks the schema row out of the scopes matrix by name, not by position', async () => {
		axios.get.mockResolvedValueOnce({
			data: {
				user: 'alice',
				scopes: [
					{ schema: 'caseType', actions: ['read'] },
					{ schema: 'case', actions: ['read', 'update'], provenance: { read: { granted: true, source: 'role' } } },
				],
			},
		})
		const scope = await fetchCallerScope(TARGET)
		expect(scope.schema).toBe('case')
		expect(scope.user).toBe('alice')
		expect(axios.get.mock.calls[0][1]).toEqual({ params: { register: 'dossiq', schema: 'case' } })
	})

	it('answers null when no scope row names the schema', async () => {
		axios.get.mockResolvedValueOnce({ data: { user: 'alice', scopes: [{ schema: 'caseType' }] } })
		expect(await fetchCallerScope(TARGET)).toBeNull()
	})

	it('keeps the status beside the set, so a 403 is not a failed read', async () => {
		const refusal = new Error('forbidden')
		refusal.response = { status: 403 }
		axios.get.mockRejectedValueOnce(refusal)
		expect(await fetchObjectPermissions(TARGET, 'obj-1')).toEqual({ status: 403, set: null })
	})

	it('reports 0 when nothing answered at all, which is not a refusal', async () => {
		axios.get.mockRejectedValueOnce(new Error('down'))
		expect(await fetchObjectPermissions(TARGET, 'obj-1')).toEqual({ status: 0, set: null })
	})

	it('answers null for a body with no holders list, never an empty set', async () => {
		axios.get.mockResolvedValueOnce({ status: 200, data: { object: 'obj-1' } })
		expect((await fetchObjectPermissions(TARGET, 'obj-1')).set).toBeNull()
	})

	it('answers null for a history body with no change list', async () => {
		axios.get.mockResolvedValueOnce({ status: 200, data: { object: 'obj-1' } })
		expect((await fetchAccessHistory(TARGET, 'obj-1', '2026-03-01')).history).toBeNull()
	})

	it('honours a custom apiBase', async () => {
		axios.get.mockResolvedValueOnce({ data: { results: [] } })
		await fetchObjectGrants({ ...TARGET, apiBase: '/apps/other/api/' }, 'x')
		expect(axios.get.mock.calls[0][0]).toBe('/index.php/apps/other/api/objects/dossiq/case/x/shares')
	})
})

describe('rows restate rules and evaluate none', () => {
	it('lists every holder with the source of their grant', () => {
		const rows = grantRows({
			objectGrants: [
				{ principal: 'noord', actions: ['read'], source: 'group' },
				{ principal: 'zuid', actions: ['read'] },
			],
			roleGrants: { roles: [{ role: 'behandelaar', actions: ['read', 'update'] }] },
			callerScope: null,
			denyRules: null,
		})
		expect(rows).toContainEqual(expect.objectContaining({ holder: 'noord', right: 'read', source: 'group' }))
		expect(rows).toContainEqual(expect.objectContaining({ holder: 'zuid', right: 'read', source: 'share' }))
		expect(rows).toContainEqual(expect.objectContaining({ holder: 'behandelaar', right: 'update', source: 'role' }))
	})

	it('lists a deny beside the grant it will remove, and subtracts nothing', () => {
		const rows = grantRows({
			objectGrants: null,
			roleGrants: { roles: [{ role: 'waarnemers', actions: ['read'] }] },
			callerScope: null,
			denyRules: { enforcing: false, rules: [{ level: 'schema', subject: 'case', action: 'read', principal: 'waarnemers' }] },
		})
		expect(rows.filter((row) => row.holder === 'waarnemers' && row.right === 'read')).toHaveLength(2)
		expect(rows.map((row) => row.source)).toEqual(expect.arrayContaining(['role', 'staged-deny']))
	})

	it('says a refusal is in force when OpenRegister says it is enforcing', () => {
		const rows = grantRows({ objectGrants: null, roleGrants: null, callerScope: null, denyRules: { enforcing: true, rules: [{ action: 'read', principal: 'w' }] } })
		expect(rows[0].source).toBe('deny')
	})

	it("carries the caller's own verdict with the source OpenRegister named", () => {
		const rows = grantRows({
			objectGrants: null,
			roleGrants: null,
			callerScope: { user: 'alice', provenance: { update: { granted: false, source: 'deny' } } },
			denyRules: null,
		})
		expect(rows).toContainEqual(expect.objectContaining({ holder: 'alice', right: 'update', source: 'deny', granted: false }))
	})

	it('names the level and the role on every row of the object set', () => {
		const rows = objectPermissionRows({
			denyEnforcement: 'staging',
			holders: [{ rules: [{ principal: 'behandelaars', action: 'read', level: 'schema', role: 'behandelaar', rule: [{ group: 'behandelaars' }], declared: true }] }],
			denied: [],
		})
		expect(rows).toEqual([expect.objectContaining({ holder: 'behandelaars', right: 'read', source: 'schema', role: 'behandelaar', level: 'schema', declared: true })])
	})

	it('marks a verb the catalogue does not publish as undeclared', () => {
		const rows = objectPermissionRows({ holders: [{ rules: [{ principal: 'a', action: 'obliterate', level: 'object', declared: false }] }] })
		expect(rows[0].declared).toBe(false)
	})

	it('lists a refusal beside the grant in the object set too', () => {
		const rows = objectPermissionRows({
			denyEnforcement: 'enforcing',
			holders: [{ rules: [{ principal: 'w', action: 'read', level: 'register' }] }],
			denied: [{ principal: 'w', action: 'read', level: 'object' }],
		})
		expect(rows.filter((row) => row.holder === 'w' && row.right === 'read')).toHaveLength(2)
		expect(rows.map((row) => row.source)).toContain('deny')
	})

	it('calls a refusal staged while the instance has not switched it on', () => {
		const rows = objectPermissionRows({ denyEnforcement: 'staging', holders: [], denied: [{ principal: 'w', action: 'read' }] })
		expect(rows[0].source).toBe('staged-deny')
	})

	it('does not replay the share, role and deny reads when the object answered', () => {
		const rows = grantRows({
			objectPermissions: { holders: [{ rules: [{ principal: 'b', action: 'read', level: 'schema' }] }] },
			objectGrants: [{ principal: 'b', actions: ['read'] }],
			roleGrants: { roles: [{ role: 'r', actions: ['read'] }] },
			callerScope: null,
			denyRules: { enforcing: true, rules: [{ principal: 'b', action: 'read' }] },
		})
		expect(rows).toHaveLength(1)
		expect(rows[0].source).toBe('schema')
	})

	it("still carries the caller's verdict when the object answered", () => {
		const rows = grantRows({ objectPermissions: { holders: [] }, objectGrants: null, roleGrants: null, callerScope: { user: 'alice', provenance: { read: { granted: true, source: 'role' } } }, denyRules: null })
		expect(rows).toContainEqual(expect.objectContaining({ holder: 'alice', right: 'read' }))
	})
})

describe('an inherited grant names the record it came from', () => {
	it('does not put the ancestor id in the source', () => {
		const rows = grantRows({ objectGrants: [{ principal: 'alice', actions: ['read'], inheritedFrom: 'parent-uuid' }], roleGrants: null, callerScope: null, denyRules: null })
		expect(rows).toHaveLength(1)
		expect(rows[0].source).toBe('inherited')
		expect(rows[0].inheritedFrom).toBe('parent-uuid')
	})

	it('keeps a source OpenRegister named, inherited or not', () => {
		const rows = grantRows({ objectGrants: [{ principal: 'a', actions: ['read'], source: 'group' }, { principal: 'b', actions: ['read'] }], roleGrants: null, callerScope: null, denyRules: null })
		expect(rows.map((row) => row.source)).toEqual(['group', 'share'])
		expect(rows.map((row) => row.inheritedFrom)).toEqual(['', ''])
	})

	it('carries the ancestor through the object permission set too', () => {
		const rows = objectPermissionRows({ holders: [{ rules: [{ principal: 'a', action: 'read', level: 'inherited', inheritedFrom: 'parent-uuid' }] }], denied: [] })
		expect(rows[0].inheritedFrom).toBe('parent-uuid')
	})
})

describe('an end and an area are rendered, never evaluated', () => {
	it('reads the end off a verb grant', () => {
		expect(constraintsOf({ group: 'w', until: '2026-10-01T17:00:00+02:00' }, 'w')).toEqual({ until: '2026-10-01T17:00:00+02:00', scopedTo: null })
	})

	it('picks the holder out of a role grant, which carries the whole list', () => {
		const rule = [{ group: 'b' }, { group: 'w', until: '2026-10-01' }]
		expect(constraintsOf(rule, 'w').until).toBe('2026-10-01')
		expect(constraintsOf(rule, 'b').until).toBe('')
	})

	it('reads the area a grant is confined to', () => {
		expect(constraintsOf({ group: 'x', scopedTo: { registers: ['zaken'] } }, 'x')).toEqual({ until: '', scopedTo: { registers: ['zaken'] } })
	})

	it('renders an end that has already passed, and drops no row for it', () => {
		const rows = objectPermissionRows({ holders: [{ rules: [{ principal: 'w', action: 'read', rule: { group: 'w', until: '1999-01-01T00:00:00+00:00' } }] }] })
		expect(rows).toHaveLength(1)
		expect(rows[0].until).toBe('1999-01-01T00:00:00+00:00')
	})

	it('carries a bare string entry without inventing a constraint', () => {
		expect(constraintsOf('b', 'b')).toEqual({ until: '', scopedTo: null })
	})
})

describe('who held a right on a past date', () => {
	it('reports the holders of that date, with who set them and what changed them after', () => {
		const answer = asOfRows({
			at: '2026-03-01T23:59:59',
			changes: [],
			asOf: { at: '2026-01-05', setBy: 'alice', changedAfterwardsBy: { at: '2026-06-01', by: 'bob' }, holders: [{ rules: [{ principal: 'b', action: 'read', level: 'object' }] }] },
		})
		expect(answer.answered).toBe(true)
		expect(answer.setBy).toBe('alice')
		expect(answer.changedAfterwardsBy.by).toBe('bob')
		expect(answer.rows).toHaveLength(1)
	})

	it('says a date is unanswered rather than reporting that nobody held anything', () => {
		const answer = asOfRows({ at: '2019-03-01', changes: [], asOf: null })
		expect(answer.answered).toBe(false)
		expect(answer.rows).toEqual([])
	})

	it('says a failed history read is unanswered too', () => {
		expect(asOfRows(null).answered).toBe(false)
	})
})

describe('the field rules a role meets', () => {
	const HIDES = { field: 'qualityScore', rule: 'hidden', groups: ['behandelaars'], heldBy: ['coordinators', 'quality'], reason: 'The quality officer scores the handling.' }

	it('keeps a rule that names a field, with both group lists', () => {
		expect(fieldRoleRows([HIDES], null)).toEqual([{ field: 'qualityScore', rule: 'hidden', groups: ['behandelaars'], heldBy: ['coordinators', 'quality'], reason: 'The quality officer scores the handling.', appliesToMe: false }])
	})

	it('drops a row naming no field', () => {
		expect(fieldRoleRows([{ field: '  ', rule: 'hidden' }], null)).toEqual([])
	})

	it('drops a rule whose kind the platform does not read', () => {
		expect(fieldRoleRows([{ field: 'x', rule: 'readonly' }], null)).toEqual([])
	})

	it('marks a row as applying only when OpenRegister said so', () => {
		expect(fieldRoleRows([HIDES], { hidden: ['qualityScore'], readOnly: [] })[0].appliesToMe).toBe(true)
		expect(fieldRoleRows([HIDES], { hidden: [], readOnly: ['qualityScore'] })[0].appliesToMe).toBe(false)
		expect(fieldRoleRows([HIDES], null)[0].appliesToMe).toBe(false)
	})

	it('names both sides in the sentence beside the field', () => {
		const sentence = roleRuleSentence(fieldRoleRows([HIDES], null)[0])
		expect(sentence).toContain('behandelaars')
		expect(sentence).toContain('coordinators')
	})

	it('reads the decision off the object and the declaration off its type object', async () => {
		axios.get
			.mockResolvedValueOnce({ data: { '@self': { fieldRules: { hidden: ['qualityScore'] } }, caseType: { id: 'type-1' } } })
			.mockResolvedValueOnce({ data: { fieldRoleRules: [HIDES] } })
		const answer = await fetchFieldRoleRules(TARGET, 'obj-1', { typeField: 'caseType', typeSchema: 'caseType' })
		expect(answer.decided).toEqual({ hidden: ['qualityScore'] })
		expect(answer.declared).toEqual([HIDES])
		expect(axios.get.mock.calls[1][0]).toBe('/index.php/apps/openregister/api/objects/dossiq/caseType/type-1')
	})

	it('answers declared null when the type object cannot be read', async () => {
		axios.get.mockResolvedValueOnce({ data: { caseType: 'type-1' } }).mockRejectedValueOnce(new Error('x'))
		expect((await fetchFieldRoleRules(TARGET, 'obj-1', { typeField: 'caseType', typeSchema: 'caseType' })).declared).toBeNull()
	})
})

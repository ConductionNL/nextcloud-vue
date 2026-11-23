/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Who holds which right on one OpenRegister object, and where each grant came
 * from. The reads behind CnObjectPermissionsTab.
 *
 * Every function here is a read. Nothing decides who may open an object: the
 * grant, its provenance, the deny and the inheritance live in OpenRegister, and
 * these helpers hand on what it answered. A deny is never subtracted from a
 * grant, a missing answer is never filled with a default, and nothing is
 * cached: a copy of an access decision is a second decision nobody updates.
 *
 * The object's own permission set (`/permissions`) is preferred; an older
 * OpenRegister answers 404 to it, and then five reads are the fallback:
 *
 *   GET {apiBase}/permissions                                  the verb catalogue + deny mode
 *   GET {apiBase}/objects/{register}/{schema}/{id}/shares      grants written on the object
 *   GET {apiBase}/permissions/compare-roles?register=          each role and its verbs
 *   GET {apiBase}/scopes?register=&schema=                     the caller's own verdict + provenance
 *   GET {apiBase}/permissions/deny-preview?register=&schema=   the deny rules as written
 *
 * plus the history read `{...}/{id}/permissions/history?at=` for "who held a
 * right on a date".
 *
 * A failed read answers `null`, never `[]`: "we could not ask" and "nobody
 * holds this" are opposite answers that would otherwise render as the same
 * empty table.
 */
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { prefixUrl } from './headers.js'

/** The OpenRegister API root a target defaults to. */
export const DEFAULT_API_BASE = '/apps/openregister/api'

/**
 * Normalise a target to `{register, schema, apiBase}`.
 *
 * @param {object} target The object's register, schema and optional apiBase.
 * @return {{register: string, schema: string, apiBase: string}} The target.
 */
function normalise(target = {}) {
	return {
		register: String(target.register || ''),
		schema: String(target.schema || ''),
		apiBase: String(target.apiBase || DEFAULT_API_BASE).replace(/\/$/, ''),
	}
}

/**
 * GET one path, keeping the status beside the body.
 *
 * The status is part of the answer: a 403 on the access set means the reader
 * may open the object and may not enumerate who else can, which is not a
 * failed read. A transport failure has no status and reports 0. A non-JSON
 * body (the SPA shell answering 200) is a failed read, not "no rules".
 *
 * @param {string} url    App-absolute URL.
 * @param {object} params Query parameters.
 * @return {Promise<{status: number, data: object|null}>} The status and the body.
 */
async function readResult(url, params = {}) {
	try {
		const response = await axios.get(prefixUrl(url), { params })
		if (typeof response?.data !== 'object' || response.data === null) {
			return { status: response?.status || 0, data: null }
		}
		return { status: response.status || 200, data: response.data }
	} catch (error) {
		return { status: error?.response?.status || 0, data: null }
	}
}

/**
 * GET one path, answering null when it cannot be read.
 *
 * @param {string} url    App-absolute URL.
 * @param {object} params Query parameters.
 * @return {Promise<object|null>} The body, or null.
 */
async function read(url, params = {}) {
	const { data } = await readResult(url, params)
	return data
}

/**
 * The URL of one object, under its target.
 *
 * @param {object} target   The target.
 * @param {string} objectId The object id.
 * @param {string} [schema] A schema other than the target's.
 * @return {string} The URL.
 */
function objectUrl(target, objectId, schema) {
	const { register, apiBase } = normalise(target)
	return `${apiBase}/objects/${register}/${schema || normalise(target).schema}/${objectId}`
}

/**
 * The grantable verbs and the deny enforcement mode.
 *
 * @param {object} target The target (only `apiBase` is read).
 * @return {Promise<object|null>} `{permissions, denyEnforcement}`, or null.
 */
export function fetchPermissionCatalogue(target) {
	return read(`${normalise(target).apiBase}/permissions`)
}

/**
 * The grants written on one object.
 *
 * @param {object} target   The target.
 * @param {string} objectId The object id.
 * @return {Promise<Array|null>} The grants, or null.
 */
export async function fetchObjectGrants(target, objectId) {
	const body = await read(`${objectUrl(target, objectId)}/shares`)
	if (body === null || !Array.isArray(body.results)) {
		return null
	}
	return body.results
}

/**
 * Each role in the register and the verbs it holds.
 *
 * @param {object} target The target.
 * @return {Promise<object|null>} `{roles}`, or null.
 */
export function fetchRoleGrants(target) {
	const { apiBase, register } = normalise(target)
	return read(`${apiBase}/permissions/compare-roles`, { register })
}

/**
 * The caller's own effective verbs on the schema, with their provenance.
 *
 * The endpoint answers a matrix even when narrowed, so the row is picked by
 * schema name rather than by position.
 *
 * @param {object} target The target.
 * @return {Promise<object|null>} The scope entry, or null.
 */
export async function fetchCallerScope(target) {
	const { apiBase, register, schema } = normalise(target)
	const body = await read(`${apiBase}/scopes`, { register, schema })
	if (body === null || !Array.isArray(body.scopes)) {
		return null
	}
	const scope = body.scopes.find((entry) => entry?.schema === schema)
	if (!scope) {
		return null
	}
	return { user: body.user, isAdmin: body.isAdmin, groups: body.groups, ...scope }
}

/**
 * The deny rules as written for the register and schema.
 *
 * @param {object} target The target.
 * @return {Promise<object|null>} `{denyEnforcement, enforcing, rules}`, or null.
 */
export function fetchDenyRules(target) {
	const { apiBase, register, schema } = normalise(target)
	return read(`${apiBase}/permissions/deny-preview`, { register, schema })
}

/**
 * The permission set OpenRegister publishes for this object, with its status.
 *
 * @param {object} target   The target.
 * @param {string} objectId The object id.
 * @return {Promise<{status: number, set: object|null}>} The status and the set.
 */
export async function fetchObjectPermissions(target, objectId) {
	const { status, data } = await readResult(`${objectUrl(target, objectId)}/permissions`)
	if (data === null || Array.isArray(data.holders) === false) {
		return { status, set: null }
	}
	return { status, set: data }
}

/**
 * The set as it stood at a moment, from the object's audit trail.
 *
 * @param {object} target   The target.
 * @param {string} objectId The object id.
 * @param {string} at       An ISO-8601 moment.
 * @return {Promise<{status: number, history: object|null}>} The status and the history.
 */
export async function fetchAccessHistory(target, objectId, at) {
	const { status, data } = await readResult(`${objectUrl(target, objectId)}/permissions/history`, { at })
	if (data === null || Array.isArray(data.changes) === false) {
		return { status, history: null }
	}
	return { status, history: data }
}

/**
 * The end and the area written on one rule, as OpenRegister reported them.
 *
 * Neither is compared to anything: whether an expired grant still answers is
 * resolved in OpenRegister. A role grant carries the whole holder list, so the
 * entry naming this principal is picked out of it.
 *
 * @param {object|Array|string|null} rule      The rule as written.
 * @param {string}                   principal The holder of the row.
 * @return {{until: string, scopedTo: object|null}} The end and the area.
 */
export function constraintsOf(rule, principal) {
	const none = { until: '', scopedTo: null }
	if (rule === null || typeof rule !== 'object') {
		return none
	}

	let entry = rule
	if (Array.isArray(rule)) {
		entry = rule.find((candidate) => candidate === principal
			|| (candidate !== null
				&& typeof candidate === 'object'
				&& [candidate.principal, candidate.group, candidate.role, candidate.user].includes(principal)))
	}

	if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
		return none
	}

	return {
		until: typeof entry.until === 'string' ? entry.until : '',
		scopedTo: entry.scopedTo || null,
	}
}

/**
 * One reported rule as a row.
 *
 * @param {object}  rule      The rule.
 * @param {boolean} refusing  Whether the rule takes a right away.
 * @param {boolean} enforcing Whether refusals are in force.
 * @return {object} The row.
 */
function ruleRow(rule, refusing, enforcing) {
	const principal = rule?.principal || ''
	const { until, scopedTo } = constraintsOf(rule?.rule ?? null, principal)

	let source = rule?.level || 'object'
	if (refusing === true) {
		source = enforcing === true ? 'deny' : 'staged-deny'
	}

	return {
		holder: principal,
		right: rule?.action || '',
		source,
		detail: rule?.role || '',
		inheritedFrom: rule?.inheritedFrom || '',
		level: rule?.level || '',
		role: rule?.role || '',
		declared: rule?.declared !== false,
		conditional: rule?.conditional === true,
		until,
		scopedTo,
	}
}

/**
 * The object's own permission set as rows. A deny is its own row.
 *
 * @param {object|null} set The set from `fetchObjectPermissions`.
 * @return {Array<object>} The rows.
 */
export function objectPermissionRows(set) {
	if (set === null || typeof set !== 'object') {
		return []
	}

	const enforcing = set.denyEnforcement === 'enforcing'
	const rows = []
	for (const holder of set.holders || []) {
		for (const rule of holder?.rules || []) {
			rows.push(ruleRow(rule, false, enforcing))
		}
	}
	for (const rule of set.denied || []) {
		rows.push(ruleRow(rule, true, enforcing))
	}
	return rows
}

/**
 * The set as it stood at the moment asked about.
 *
 * `asOf: null` (the trail does not reach back that far) is "unanswered", never
 * an empty table: an empty table would claim nobody held a right that day.
 *
 * @param {object|null} history The history from `fetchAccessHistory`.
 * @return {{answered: boolean, at: string, rows: Array<object>, setBy: string, changedAfterwardsBy: object|null}} The answer.
 */
export function asOfRows(history) {
	const unanswered = { answered: false, at: history?.at || '', rows: [], setBy: '', changedAfterwardsBy: null }

	const asOf = history?.asOf || null
	if (asOf === null || typeof asOf !== 'object') {
		return unanswered
	}

	const rows = []
	for (const holder of asOf.holders || []) {
		for (const rule of holder?.rules || []) {
			rows.push(ruleRow(rule, false, false))
		}
	}

	return {
		answered: true,
		at: asOf.at || history?.at || '',
		rows,
		setBy: asOf.setBy || '',
		changedAfterwardsBy: asOf.changedAfterwardsBy || null,
	}
}

/**
 * All answers as one list of rows. A renderer, not an evaluator: each row
 * restates ONE reported rule, and no row is the product of two.
 *
 * When the object answered for itself the share, role and deny reads are not
 * replayed on top (the same grant would be counted twice). The caller's own
 * verdict always rides along last, because it is the one answer about this
 * reader rather than a rule about everybody.
 *
 * @param {object}      answers                   The reads.
 * @param {object|null} answers.objectPermissions The object's own set.
 * @param {Array|null}  answers.objectGrants      Grants on the object.
 * @param {object|null} answers.roleGrants        Roles and their verbs.
 * @param {object|null} answers.callerScope       The caller's own verdict.
 * @param {object|null} answers.denyRules         The deny rules.
 * @return {Array<object>} The rows.
 */
export function grantRows({ objectPermissions = null, objectGrants, roleGrants, callerScope, denyRules }) {
	const rows = []

	if (objectPermissions !== null) {
		rows.push(...objectPermissionRows(objectPermissions))
	}

	for (const grant of (objectPermissions === null ? objectGrants : null) || []) {
		for (const right of grant?.actions || []) {
			rows.push({
				holder: grant.principal || grant.userId || grant.groupId || '',
				right,
				// `inheritedFrom` is the id of the ancestor, not a source key.
				source: grant.source || (grant.inheritedFrom ? 'inherited' : 'share'),
				inheritedFrom: grant.inheritedFrom || '',
				detail: grant.expires ? String(grant.expires) : '',
			})
		}
	}

	for (const role of (objectPermissions === null ? roleGrants?.roles : null) || []) {
		for (const right of role?.actions || []) {
			rows.push({ holder: role.role || '', right, source: 'role', detail: '' })
		}
	}

	for (const rule of (objectPermissions === null ? denyRules?.rules : null) || []) {
		rows.push({
			holder: rule.principal || '',
			right: rule.action || '',
			source: denyRules.enforcing ? 'deny' : 'staged-deny',
			detail: rule.level ? `${rule.level}: ${rule.subject || ''}` : '',
		})
	}

	for (const [right, record] of Object.entries(callerScope?.provenance || {})) {
		rows.push({
			holder: callerScope.user || '',
			right,
			source: record?.source || 'unknown',
			granted: record?.granted,
			detail: record?.role || record?.principal || '',
			stagedDeny: record?.stagedDeny || null,
		})
	}

	return rows
}

/**
 * The id a reference carries, as a uuid string or as an expanded object.
 *
 * @param {unknown} value The reference.
 * @return {string} The id, or ''.
 */
function referenceId(value) {
	if (value && typeof value === 'object') {
		return String(value['@self']?.id ?? value.id ?? value.uuid ?? '')
	}
	return String(value ?? '')
}

/**
 * The object's decided field rules, and the per-role field rules its TYPE
 * object declares.
 *
 * Two reads, because they answer different questions: `@self.fieldRules` is
 * what OpenRegister decided for THIS reader, the declaration on the type
 * object is the rule behind it. Neither is evaluated here.
 *
 * @param {object} target          The target.
 * @param {string} objectId        The object id.
 * @param {object} config          Where the declaration lives.
 * @param {string} config.typeField        Field on the object referencing its type object.
 * @param {string} config.typeSchema       Schema of the type object (same register).
 * @param {string} [config.declarationField] Field on the type object holding the rules.
 * @return {Promise<{decided: object|null, declared: Array<object>|null}>} The answer.
 */
export async function fetchFieldRoleRules(target, objectId, config) {
	if (!objectId || !config?.typeField || !config?.typeSchema) {
		return { decided: null, declared: null }
	}

	const object = await read(objectUrl(target, objectId))
	if (object === null) {
		return { decided: null, declared: null }
	}

	const decided = object['@self']?.fieldRules ?? null
	const typeId = referenceId(object[config.typeField])
	if (!typeId) {
		return { decided, declared: null }
	}

	const type = await read(objectUrl(target, typeId, config.typeSchema))
	if (type === null) {
		return { decided, declared: null }
	}

	const declared = type[config.declarationField || 'fieldRoleRules']
	return { decided, declared: Array.isArray(declared) ? declared : [] }
}

/**
 * The two things a role rule can do to a field. The spelling is OpenRegister's
 * contract (`hidden`, `readOnly`); any other rule is dropped.
 */
export const ROLE_RULES = ['hidden', 'readOnly']

/**
 * The reader's word for each field rule.
 *
 * @return {object} The labels, by rule id.
 */
export function roleRuleLabels() {
	return {
		hidden: t('nextcloud-vue', 'Not shown'),
		readOnly: t('nextcloud-vue', 'Cannot be changed'),
	}
}

/**
 * A declared list of names, blanks and repeats removed.
 *
 * @param {unknown} value The list.
 * @return {Array<string>} The names.
 */
function names(value) {
	if (Array.isArray(value) === false) {
		return []
	}
	const found = []
	value.forEach((entry) => {
		const name = String(entry ?? '').trim()
		if (name !== '' && found.includes(name) === false) {
			found.push(name)
		}
	})
	return found
}

/**
 * Whether OpenRegister applied this rule to the reader. False when the object
 * carries no decision at all (an older OpenRegister), never invented.
 *
 * @param {string}      field   The field.
 * @param {string}      rule    The rule.
 * @param {object|null} decided The object's `@self.fieldRules`.
 * @return {boolean} True when the reader met this rule.
 */
function appliesToMe(field, rule, decided) {
	const applied = decided?.[rule]
	if (Array.isArray(applied) === false) {
		return false
	}
	return applied.map((name) => String(name)).includes(field)
}

/**
 * The declared field rules as rows. A row naming no field, or an unknown rule,
 * is dropped rather than rendered blank.
 *
 * @param {Array<object>|null} declared The declaration.
 * @param {object|null}        decided  The object's `@self.fieldRules`.
 * @return {Array<object>} The rows.
 */
export function fieldRoleRows(declared, decided) {
	if (Array.isArray(declared) === false) {
		return []
	}

	return declared
		.filter((rule) => rule && ROLE_RULES.includes(rule.rule) && typeof rule.field === 'string' && rule.field.trim() !== '')
		.map((rule) => {
			const field = rule.field.trim()
			return {
				field,
				rule: rule.rule,
				groups: names(rule.groups),
				heldBy: names(rule.heldBy),
				reason: String(rule.reason ?? '').trim(),
				appliesToMe: appliesToMe(field, rule.rule, decided),
			}
		})
}

/**
 * One field-rule row as a whole sentence (whole sentences, so a translator can
 * reorder the groups).
 *
 * @param {object} row One row from `fieldRoleRows`.
 * @return {string} The sentence.
 */
export function roleRuleSentence(row) {
	const groups = row?.groups?.join(', ') ?? ''
	const heldBy = row?.heldBy?.join(', ') ?? ''

	if (row?.rule === 'hidden' && heldBy !== '') {
		return t('nextcloud-vue', '{groups} do not see this field. {heldBy} do.', { groups, heldBy })
	}
	if (row?.rule === 'hidden') {
		return t('nextcloud-vue', '{groups} do not see this field.', { groups })
	}
	if (heldBy !== '') {
		return t('nextcloud-vue', '{groups} cannot change this field. {heldBy} can.', { groups, heldBy })
	}
	return t('nextcloud-vue', '{groups} cannot change this field.', { groups })
}

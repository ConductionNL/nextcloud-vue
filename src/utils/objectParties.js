/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * objectParties — reading the parties of a record as OpenRegister's party
 * model answers them (`GET .../objects/{register}/{schema}/{id}/parties`:
 * `{ primary, roles, kinds, byRole, results }`, and `GET .../parties/{uuid}`
 * for one party with its indicators).
 *
 * Pure functions, so CnObjectPartiesWidget and its tests read one shape.
 *
 * @module utils/objectParties
 */

import { translate as t } from '@nextcloud/l10n'
import { readPath } from './readPath.js'

/**
 * What a role is called: the app's own word (`roleLabels`), else the label
 * the listing declares, else the key. `other` is a party with no role.
 *
 * @param {string} key The role key.
 * @param {Array<{key: string, label?: string}>} roles The roles the listing declares.
 * @param {Record<string, string>} [roleLabels] The app's words, by key.
 * @return {string} The label.
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-record-shows-its-parties-by-role
 */
export function roleLabel(key, roles, roleLabels = {}) {
	if (roleLabels && typeof roleLabels[key] === 'string' && roleLabels[key] !== '') {
		return roleLabels[key]
	}
	const declared = (roles || []).find((role) => role && role.key === key)
	if (declared && declared.label) {
		return declared.label
	}
	return key === 'other' ? t('nextcloud-vue', 'No role') : key
}

/**
 * The parties of one role, the primary party first.
 *
 * @param {Array<object>} parties The role's rows.
 * @param {string|null} primary The primary party's uuid.
 * @return {Array<object>} The rows.
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-record-shows-its-parties-by-role
 */
export function partiesInOrder(parties, primary) {
	const rows = Array.isArray(parties) ? parties.filter(Boolean) : []
	if (!primary) {
		return rows
	}
	return [
		...rows.filter((row) => row.partyUuid === primary),
		...rows.filter((row) => row.partyUuid !== primary),
	]
}

/**
 * The roles of a listing as groups, the group holding the primary party first.
 *
 * @param {object|null} listing The `/parties` answer.
 * @param {Record<string, string>} [roleLabels] The app's words for the roles.
 * @return {Array<{key: string, label: string, parties: Array<object>}>} The groups.
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-record-shows-its-parties-by-role
 */
export function rolesInOrder(listing, roleLabels = {}) {
	if (!listing || typeof listing !== 'object') {
		return []
	}
	const byRole = listing.byRole && typeof listing.byRole === 'object' ? listing.byRole : {}
	const primary = listing.primary || null
	const groups = Object.keys(byRole).map((key) => ({
		key,
		label: roleLabel(key, listing.roles, roleLabels),
		parties: partiesInOrder(byRole[key], primary),
	}))
	const holdsPrimary = (group) => !!primary && group.parties.some((party) => party.partyUuid === primary)
	return [...groups.filter(holdsPrimary), ...groups.filter((group) => !holdsPrimary(group))]
}

/**
 * What an indicator means for what may be done: an indicator always carries
 * its verdict, never a bare chip. `refuse-publication` and `refuse-send` are
 * blocking (`error`); anything else asks to be read first (`warning`).
 *
 * @param {object} indicator The indicator (`{ key, label, effect }`).
 * @param {object} [labels] The app's words: `verdictPublication`, `verdictSend`, `verdictWarn`.
 * @return {{effect: string, severity: string, label: string, verdict: string}} The verdict.
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-record-shows-its-parties-by-role
 */
export function indicatorVerdict(indicator, labels = {}) {
	const effect = String(indicator?.effect || '').trim()
	const label = String(indicator?.label || indicator?.key || '').trim()
	if (effect === 'refuse-publication') {
		return { effect, severity: 'error', label, verdict: labels.verdictPublication || t('nextcloud-vue', 'Publishing a file on this record is refused') }
	}
	if (effect === 'refuse-send') {
		return { effect, severity: 'error', label, verdict: labels.verdictSend || t('nextcloud-vue', 'A message to this party is refused') }
	}
	return { effect: effect === '' ? 'warn' : effect, severity: 'warning', label, verdict: labels.verdictWarn || t('nextcloud-vue', 'Read this before acting on the record') }
}

/**
 * Every indicator on a set of parties, each knowing whose it is.
 *
 * @param {Array<object>} parties The party records.
 * @return {Array<object>} The indicators with `party` and `partyName`.
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-record-shows-its-parties-by-role
 */
export function indicatorsOf(parties) {
	const found = []
	for (const party of parties || []) {
		if (!party) {
			continue
		}
		for (const indicator of Array.isArray(party.indicators) ? party.indicators : []) {
			if (indicator) {
				found.push({ ...indicator, party: party.id || party.uuid || '', partyName: party.name || party.displayName || '' })
			}
		}
	}
	return found
}

/**
 * Who represents whom: participant uuid to the uuid of the party it acts for,
 * read from role rows (`{ participant, representedParty }`).
 *
 * @param {Array<object>|null} rows The role rows.
 * @return {Record<string, string>} The map.
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-record-shows-its-parties-by-role
 */
export function representedByMap(rows) {
	const map = {}
	for (const row of Array.isArray(rows) ? rows : []) {
		const participant = String(row?.participant || '').trim()
		const represented = String(row?.representedParty?.id || row?.representedParty || '').trim()
		if (participant !== '' && represented !== '') {
			map[participant] = represented
		}
	}
	return map
}

/**
 * The documents a party sent and received: sender is the party, or the party
 * is among the recipients.
 *
 * @param {Array<object>} documents The documents.
 * @param {string} identifier The party's uuid.
 * @param {{senderField?: string, recipientsField?: string}} [fields] Where a document names them.
 * @return {{sent: Array<object>, received: Array<object>}} The two lists.
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-record-shows-its-parties-by-role
 */
export function documentsOfParty(documents, identifier, fields = {}) {
	const id = String(identifier || '').trim()
	const rows = Array.isArray(documents) ? documents : []
	if (id === '') {
		return { sent: [], received: [] }
	}
	const sender = fields.senderField || 'sender'
	const recipients = fields.recipientsField || 'recipients'
	return {
		sent: rows.filter((row) => String(row?.[sender] || '').trim() === id),
		received: rows.filter((row) => (Array.isArray(row?.[recipients]) ? row[recipients] : []).map((entry) => String(entry || '').trim()).includes(id)),
	}
}

/**
 * The code of a party kind (`code`, else `key`).
 *
 * @param {object} kind The kind.
 * @return {string} The code.
 */
export function kindCode(kind) {
	return String(kind?.code || kind?.key || '')
}

/**
 * Write a value at a dotted path, creating the objects on the way.
 *
 * @param {object} target The object written into.
 * @param {string} path The dotted path (`name.surname`).
 * @param {unknown} value The value.
 * @return {void}
 */
function writePath(target, path, value) {
	const keys = String(path).split('.').filter((key) => key !== '')
	let node = target
	keys.slice(0, -1).forEach((key) => {
		if (!node[key] || typeof node[key] !== 'object') {
			node[key] = {}
		}
		node = node[key]
	})
	if (keys.length > 0) {
		node[keys[keys.length - 1]] = value
	}
}

/**
 * The record a new party is saved as, from the fields a host declares.
 *
 * Each field `{ key, path?, address? }` writes its trimmed value at `path`
 * (default `key`); a field with `address: { path, kind, type }` instead adds
 * `{ kind, type, value }` to the list at that path, the shape OpenRegister's
 * party model reads as the party's addresses. `compose` names the paths a
 * derived field joins with a space, skipping the empty ones
 * (`{ displayName: ["name.givenNames", "name.namePrefix", "name.surname"] }`).
 * A field of `type: "integer"` is saved as a number when it reads as one.
 * An empty value is left out.
 *
 * @param {{fields?: Array<object>, compose?: Record<string, Array<string>>}} create The declaration.
 * @param {Record<string, string>} values The values by field key.
 * @return {object} The record.
 * @spec openspec/changes/object-parties-manage/specs/record-widgets/spec.md#requirement-the-parties-widget-can-add-and-remove-parties
 */
export function newPartyRecord(create, values) {
	const record = {}
	for (const field of Array.isArray(create?.fields) ? create.fields : []) {
		const value = String(values?.[field?.key] ?? '').trim()
		if (!field || !field.key || value === '') {
			continue
		}
		if (field.address && field.address.path) {
			const list = readPath(record, field.address.path)
			const entry = { kind: field.address.kind || 'correspondence', type: field.address.type || 'email', value }
			writePath(record, field.address.path, [...(Array.isArray(list) ? list : []), entry])
			continue
		}
		writePath(record, field.path || field.key, field.type === 'integer' && /^-?\d+$/.test(value) ? Number(value) : value)
	}
	for (const [target, paths] of Object.entries(create?.compose && typeof create.compose === 'object' ? create.compose : {})) {
		const joined = (Array.isArray(paths) ? paths : [])
			.map((path) => String(readPath(record, path) ?? '').trim())
			.filter((part) => part !== '')
			.join(' ')
		if (joined !== '') {
			writePath(record, target, joined)
		}
	}
	return record
}

/**
 * The uuid a create answered with: `id`, `uuid` or `@self.id`.
 *
 * @param {object} saved The saved object.
 * @return {string} The uuid, or ''.
 * @spec openspec/changes/object-parties-manage/specs/record-widgets/spec.md#requirement-the-parties-widget-can-add-and-remove-parties
 */
export function savedUuid(saved) {
	return String(saved?.['@self']?.id || saved?.uuid || saved?.id || '')
}

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * detailActionModel: the rules behind a detail page's four action levels and
 * the case surfaces that read the record's stage.
 *
 *   1. the next step: one primary button, chosen by the record's stage,
 *   2. quick actions: at most three always visible buttons,
 *   3. the overflow menu: the rest, in named groups,
 *   4. admin actions: the last group, for admins only.
 *
 * Pure functions, no Vue and no fetch, so CnDetailPage, the widgets and the
 * tests all read one implementation.
 *
 * @module utils/detailActionModel
 */

import { readPath } from './readPath.js'
import { evaluateVisibleWhenLocal } from './visibleWhen.js'

/** The most quick actions a page shows. Later entries are dropped. */
export const MAX_QUICK_ACTIONS = 3

/**
 * The record's stage, as the string a stage map is keyed on.
 *
 * @param {object|null} object The record.
 * @param {string} [stageField] Dot-path to the stage. Defaults to `status`.
 * @return {string} The stage, or '' when the record has none.
 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-primary-action-follows-the-stage
 */
export function stageOf(object, stageField = 'status') {
	if (!object || typeof object !== 'object') {
		return ''
	}
	const value = readPath(object, stageField || 'status')
	if (value === null || value === undefined || typeof value === 'object') {
		return ''
	}
	return String(value)
}

/**
 * Look a stage up in a stage-keyed map. An exact key wins; otherwise the
 * match ignores case, because a status is stored as `in_behandeling` in one
 * register and `In_Behandeling` in the next.
 *
 * @param {object|null} map The stage-keyed map.
 * @param {string} stage The stage.
 * @return {unknown} The entry, or undefined.
 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-primary-action-follows-the-stage
 */
export function stageEntry(map, stage) {
	if (!map || typeof map !== 'object' || Array.isArray(map) || stage === '') {
		return undefined
	}
	if (Object.hasOwn(map, stage)) {
		return map[stage]
	}
	const wanted = stage.toLowerCase()
	const key = Object.keys(map).find((candidate) => candidate.toLowerCase() === wanted)
	return key === undefined ? undefined : map[key]
}

/**
 * Turn a pinned action entry into a descriptor the page can dispatch.
 *
 * An entry is the id of a declared header action, or an action object of its
 * own. An object without an id gets `fallbackId`, since every dispatched
 * action is addressed by id.
 *
 * @param {string|object|null} entry The entry.
 * @param {string} fallbackId Id for an inline action that names none.
 * @return {{id: string, inline: object|null}|null} The id, plus the inline definition when the entry carried one.
 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-quick-actions
 */
export function normalisePinnedAction(entry, fallbackId) {
	if (typeof entry === 'string') {
		return entry === '' ? null : { id: entry, inline: null }
	}
	if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
		return null
	}
	if (typeof entry.label !== 'string' || entry.label === '') {
		return null
	}
	const id = typeof entry.id === 'string' && entry.id !== '' ? entry.id : fallbackId
	return { id, inline: { ...entry, id } }
}

/**
 * Split menu entries into the groups the overflow menu draws.
 *
 * Ungrouped entries come first, under no caption. Named groups follow in the
 * order they first appear. Admin only entries are dropped for everyone else
 * and form the last group for admins, whatever `group` they also name.
 *
 * `adminOnly` hides a control. It is never an authorization decision: the
 * endpoint behind the action decides who may call it.
 *
 * @param {Array<object>} entries Menu-ready entries, each with an `id`.
 * @param {object} actionsById The declared actions by id, carrying `group` / `adminOnly`.
 * @param {{isAdmin?: boolean, adminLabel?: string}} [options] Who is looking, and what the admin group is called.
 * @return {Array<{key: string, label: string, entries: Array<object>}>} The non-empty groups, in render order.
 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-grouped-and-admin-only-menu-actions
 */
export function groupMenuEntries(entries, actionsById = {}, options = {}) {
	const isAdmin = options.isAdmin === true
	const plain = { key: '', label: '', entries: [] }
	const named = []
	const admin = { key: 'cn-admin', label: options.adminLabel || '', entries: [] }
	for (const entry of Array.isArray(entries) ? entries : []) {
		const declared = (entry && actionsById[entry.id]) || {}
		if (declared.adminOnly === true) {
			if (isAdmin) {
				admin.entries.push(entry)
			}
			continue
		}
		const label = typeof declared.group === 'string' ? declared.group.trim() : ''
		if (label === '') {
			plain.entries.push(entry)
			continue
		}
		let group = named.find((candidate) => candidate.label === label)
		if (!group) {
			group = { key: `cn-group-${named.length}`, label, entries: [] }
			named.push(group)
		}
		group.entries.push(entry)
	}
	return [plain, ...named, admin].filter((group) => group.entries.length > 0)
}

/**
 * Whether one checklist item is done for this record.
 *
 * `done` (a literal) wins, then `doneWhen` (a local visibleWhen condition),
 * then `doneField` (truthy, and for a list: not empty).
 *
 * @param {object} item The checklist item.
 * @param {object|null} object The record.
 * @return {boolean} True when the item is done.
 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-next-step-card
 */
export function isChecklistItemDone(item, object) {
	if (!item || typeof item !== 'object') {
		return false
	}
	if (typeof item.done === 'boolean') {
		return item.done
	}
	const data = object && typeof object === 'object' ? object : {}
	if (item.doneWhen && typeof item.doneWhen === 'object') {
		return evaluateVisibleWhenLocal(item.doneWhen, data)
	}
	if (typeof item.doneField === 'string' && item.doneField !== '') {
		const value = readPath(data, item.doneField)
		return Array.isArray(value) ? value.length > 0 : Boolean(value)
	}
	return false
}

/**
 * Resolve the "what now" card for the record's stage.
 *
 * @param {{stages?: object, title?: string}|null} config The `nextStep` config.
 * @param {object|null} object The record.
 * @param {string} [stageField] Dot-path to the stage.
 * @return {{stage: string, title: string, items: Array<{label: string, done: boolean, hint: string}>, after: string}|null} The card, or null when this stage declares no checklist.
 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-next-step-card
 */
export function resolveNextStep(config, object, stageField = 'status') {
	if (!config || typeof config !== 'object') {
		return null
	}
	const stage = stageOf(object, config.field || stageField)
	const declared = stageEntry(config.stages, stage)
	if (!declared || typeof declared !== 'object' || !Array.isArray(declared.checklist)) {
		return null
	}
	const items = declared.checklist
		.filter((item) => item && typeof item === 'object' && typeof item.label === 'string' && item.label !== '')
		.map((item) => ({
			label: item.label,
			done: isChecklistItemDone(item, object),
			hint: typeof item.hint === 'string' ? item.hint : '',
		}))
	if (items.length === 0) {
		return null
	}
	return {
		stage,
		title: typeof declared.title === 'string' ? declared.title : (typeof config.title === 'string' ? config.title : ''),
		items,
		after: typeof declared.after === 'string' ? declared.after : '',
	}
}

/**
 * Resolve a header pill from the record.
 *
 * @param {{field?: string, colorMap?: object, labels?: object, variant?: string}|null} config The pill config.
 * @param {object|null} object The record.
 * @return {{label: string, colorKey: string, colorMap: object|null, variant: string}|null} What CnStatusBadge needs, or null when the field is empty.
 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-header-pills
 */
export function resolvePill(config, object) {
	if (!config || typeof config !== 'object' || typeof config.field !== 'string' || config.field === '') {
		return null
	}
	const raw = stageOf(object, config.field)
	if (raw === '') {
		return null
	}
	const mapped = stageEntry(config.labels, raw)
	return {
		label: typeof mapped === 'string' && mapped !== '' ? mapped : raw,
		colorKey: raw,
		colorMap: config.colorMap && typeof config.colorMap === 'object' ? config.colorMap : null,
		variant: typeof config.variant === 'string' && config.variant !== '' ? config.variant : 'default',
	}
}

/**
 * Resolve a tab's count.
 *
 * `count` (a number) wins. Otherwise `countField` is read off the record: a
 * list counts its items, a number is taken as is.
 *
 * @param {{count?: number, countField?: string}|null} tab The tab declaration.
 * @param {object|null} object The record.
 * @return {number|null} The count, or null when the tab declares none.
 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-tab-counts-and-overflow
 */
export function resolveTabCount(tab, object) {
	if (!tab || typeof tab !== 'object') {
		return null
	}
	if (typeof tab.count === 'number' && Number.isFinite(tab.count)) {
		return tab.count
	}
	if (typeof tab.countField !== 'string' || tab.countField === '') {
		return null
	}
	const value = readPath(object && typeof object === 'object' ? object : {}, tab.countField)
	if (Array.isArray(value)) {
		return value.length
	}
	if (value === null || value === undefined || value === '') {
		return 0
	}
	const number = Number(value)
	return Number.isFinite(number) ? number : null
}

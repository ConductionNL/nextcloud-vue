/*
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * dashboardDownload — a dashboard page saves the figures it shows as CSV.
 *
 * A dashboard with `download: true` offers a "Download" button in its header.
 * The file has the header row `widget,label,value` and one row per figure:
 *
 * - a `stat` tile with an OpenRegister `source`: one row, its label and count;
 * - a `chart` with a `dataSource.aggregate.groupBy` count: one row per group;
 * - an `object-table`: one row per record, its columns joined as the label.
 *
 * The figures are read with the same OpenRegister calls the widgets make
 * (aggregation value, grouped counts, the object list with the widget's
 * filter, order and limit), so the file carries what the page shows. A widget
 * whose read fails writes one row with the value `error`; a widget of another
 * kind, or one reading an app endpoint, is left out.
 *
 * UTF-8 with a byte order mark, so a spreadsheet opens accented labels
 * correctly; comma separated; a cell is quoted when it holds a comma, a quote
 * or a line break.
 *
 * @module utils/dashboardDownload
 * @spec openspec/changes/dashboard-download-csv/specs/dashboard-download-csv/spec.md#requirement-a-dashboard-can-be-downloaded-as-csv
 */

import { fetchAggregateValue, fetchGroupedCounts } from './fetchAggregate.js'
import { fetchListTotal, needsListEndpoint } from './fetchFilterCounts.js'
import { resolveFilterTokens } from './resolveFilterTokens.js'

/** The header row of the file. */
export const DOWNLOAD_HEADER = ['widget', 'label', 'value']

/** The value a widget whose figures could not be read writes. */
export const DOWNLOAD_ERROR_VALUE = 'error'

/**
 * Whether a value is a plain object.
 *
 * @param {unknown} value The value.
 * @return {boolean}
 */
function isObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * What one widget contributes to the file, or null when it contributes nothing.
 *
 * @param {object} def The widget definition (`widgets[]` entry).
 * @param {string} title The title the card shows.
 * @param {function(string): string} [translate] Translates manifest strings.
 * @return {{id: string, title: string, kind: string, label: string, source: object}|null} The plan entry.
 * @spec openspec/changes/dashboard-download-csv/specs/dashboard-download-csv/spec.md#requirement-a-dashboard-can-be-downloaded-as-csv
 */
export function downloadPlanEntry(def, title, translate = (s) => s) {
	if (!isObject(def)) {
		return null
	}
	const content = isObject(def.content) ? def.content : {}
	const id = String(def.id ?? '')
	if (def.type === 'stat') {
		const source = isObject(content.source) ? content.source : null
		// Only the plain OpenRegister count/sum; ratios, formulas and app
		// endpoints compute in the tile and are not read again here.
		if (!source || !source.register || !source.schema || (source.kind && source.kind !== 'aggregate')) {
			return null
		}
		const label = content.label ? translate(content.label) : title
		return { id, title, kind: 'value', label, source }
	}
	if (def.type === 'chart') {
		const ds = isObject(content.dataSource) ? content.dataSource : (isObject(def.dataSource) ? def.dataSource : null)
		const aggregate = ds && isObject(ds.aggregate) ? ds.aggregate : null
		if (!ds || !ds.register || !ds.schema || !aggregate || !aggregate.groupBy || (aggregate.metric && aggregate.metric !== 'count')) {
			return null
		}
		return { id, title, kind: 'grouped', label: title, source: { register: ds.register, schema: ds.schema, groupBy: aggregate.groupBy, filter: isObject(ds.filter) ? ds.filter : {} } }
	}
	if (def.type === 'object-table') {
		if (!content.register || !content.schema) {
			return null
		}
		return { id, title, kind: 'rows', label: title, source: content }
	}
	return null
}

/**
 * The text of one record in a table row: its columns' values joined by " | ".
 *
 * @param {object} record The record.
 * @param {Array<object|string>} columns The table's columns (`{key}` or a key).
 * @return {string}
 */
export function recordLabel(record, columns) {
	const keys = (Array.isArray(columns) ? columns : [])
		.map((column) => (typeof column === 'string' ? column : column && column.key))
		.filter((key) => typeof key === 'string' && key !== '')
	const fields = keys.length > 0 ? keys : ['title', 'name']
	return fields
		.map((key) => record?.[key])
		.filter((value) => value !== undefined && value !== null && value !== '')
		.map((value) => (typeof value === 'object' ? JSON.stringify(value) : String(value)))
		.join(' | ')
}

/**
 * Read the records an object table shows: its filter, its order and its limit.
 *
 * @param {object} source The table's content.
 * @param {object} [client] axios-compatible client (tests inject one).
 * @return {Promise<Array<object>>} The records.
 */
export async function fetchTableRecords(source, client) {
	const [{ default: axios }, { generateUrl }] = await Promise.all([
		client ? Promise.resolve({ default: client }) : import('@nextcloud/axios'),
		import('@nextcloud/router'),
	])
	// The list endpoint's own filter form, as the table sends it: `field=value`,
	// an operator as `field[op]=value`, no value as `field[isnull]=true`.
	const params = {}
	for (const [key, value] of Object.entries(resolveFilterTokens(isObject(source.filter) ? source.filter : {}, {}) || {})) {
		if (isObject(value)) {
			for (const [op, operand] of Object.entries(value)) {
				params[`${key}[${op}]`] = operand
			}
		} else if (value === null) {
			params[`${key}[isnull]`] = 'true'
		} else if (value !== '' && value !== undefined) {
			params[key] = value
		}
	}
	const sort = isObject(source.sort) ? source.sort : null
	if (sort && sort.field) {
		params[`_order[${sort.field}]`] = sort.dir === 'desc' ? 'desc' : 'asc'
	}
	if (Number(source.limit) > 0) {
		params._limit = Number(source.limit)
	}
	const url = generateUrl('/apps/openregister/api/objects/{register}/{schema}', { register: source.register, schema: source.schema })
	const { data } = await axios.get(url, { params })
	const list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
	return Number(source.limit) > 0 ? list.slice(0, Number(source.limit)) : list
}

/** The default readers; tests replace them. */
const DEFAULT_READERS = {
	value: (source) => (needsListEndpoint(source.filter || {}) || source.via === 'list'
		? fetchListTotal(source.register, source.schema, source.filter || {})
		: fetchAggregateValue({ register: source.register, schema: source.schema, metric: source.metric || 'count', field: source.field, filter: source.filter || {} })),
	grouped: (source) => fetchGroupedCounts(source),
	rows: (source) => fetchTableRecords(source),
}

/**
 * Read the figures of every planned widget, in plan order.
 *
 * @param {Array<object>} plan Entries from `downloadPlanEntry()`.
 * @param {object} [readers] `{ value, grouped, rows }` readers.
 * @return {Promise<Array<Array<string|number>>>} The data rows (no header).
 * @spec openspec/changes/dashboard-download-csv/specs/dashboard-download-csv/spec.md#requirement-a-dashboard-can-be-downloaded-as-csv
 */
export async function readDownloadRows(plan, readers = DEFAULT_READERS) {
	const parts = await Promise.all((Array.isArray(plan) ? plan : []).map(async (entry) => {
		try {
			if (entry.kind === 'value') {
				const value = await readers.value(entry.source)
				return [[entry.title, entry.label, value === null || value === undefined ? '' : value]]
			}
			if (entry.kind === 'grouped') {
				const groups = await readers.grouped(entry.source)
				return (Array.isArray(groups) ? groups : []).map((group) => [entry.title, group.key, group.count])
			}
			if (entry.kind === 'rows') {
				const records = await readers.rows(entry.source)
				return (Array.isArray(records) ? records : []).map((record) => [entry.title, recordLabel(record, entry.source.columns), ''])
			}
			return []
		} catch {
			return [[entry.title, entry.label, DOWNLOAD_ERROR_VALUE]]
		}
	}))
	return parts.flat()
}

/**
 * One CSV cell, quoted when it must be.
 *
 * @param {unknown} value The cell value.
 * @return {string}
 */
export function csvCell(value) {
	const text = value === null || value === undefined ? '' : String(value)
	return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * The file content: a byte order mark, the header row and the data rows.
 *
 * @param {Array<Array<string|number>>} rows The data rows.
 * @return {string}
 * @spec openspec/changes/dashboard-download-csv/specs/dashboard-download-csv/spec.md#requirement-a-dashboard-can-be-downloaded-as-csv
 */
export function toCsv(rows) {
	const lines = [DOWNLOAD_HEADER, ...(Array.isArray(rows) ? rows : [])].map((row) => row.map(csvCell).join(','))
	return '﻿' + lines.join('\r\n') + '\r\n'
}

/**
 * The file name: the page's `downloadName` (else "dashboard") and today's date.
 *
 * @param {string} name The `downloadName`.
 * @param {Date} [date] The date (now).
 * @return {string} `<name>-<yyyy-mm-dd>.csv`.
 */
export function downloadFileName(name, date = new Date()) {
	const pad = (n) => String(n).padStart(2, '0')
	const base = typeof name === 'string' && name.trim() !== '' ? name.trim() : 'dashboard'
	return `${base}-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.csv`
}

/**
 * Hand the browser a file to save.
 *
 * @param {string} text The file content.
 * @param {string} fileName The file name.
 * @return {void}
 */
export function saveTextFile(text, fileName) {
	const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = fileName
	document.body.appendChild(link)
	link.click()
	link.remove()
	setTimeout(() => URL.revokeObjectURL(url), 0)
}

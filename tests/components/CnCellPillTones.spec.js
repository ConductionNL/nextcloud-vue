/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The status pills of PqTickets and PqLeads: "Verzoek" in primary, "In
 * behandeling" in purple, "Omgezet naar een zaak" in teal, "Wacht op klant"
 * in warning. The library had six tones and no way to declare the colours
 * on a manifest column, so every pipelinq pill rendered the same grey.
 *
 * @spec openspec/changes/screens-cell-pill-parity/specs/cell-pill-tones/spec.md
 */
const { mount } = require('@vue/test-utils')
const fs = require('fs')
const path = require('path')
const CnStatusBadge = require('../../src/components/CnStatusBadge/CnStatusBadge.vue').default
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default
const { BADGE_VARIANTS, isBadgeVariant } = require('../../src/utils/badgeVariants.js')

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const badgeCss = stripComments(fs.readFileSync(path.join(__dirname, '../../src/css/badge.css'), 'utf8'))
const boardCss = stripComments(fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8'))

const variantOf = (wrapper) => BADGE_VARIANTS.find((v) => wrapper.find('.cn-status-badge--' + v).exists())

describe('pill tones', () => {
	it('lists eight tones, the six roles plus purple and teal', () => {
		expect(BADGE_VARIANTS).toEqual(['default', 'primary', 'success', 'warning', 'error', 'info', 'purple', 'teal'])
		expect(isBadgeVariant('purple')).toBe(true)
		expect(isBadgeVariant('teal')).toBe(true)
		expect(isBadgeVariant('magenta')).toBe(false)
		expect(isBadgeVariant(undefined)).toBe(false)
	})

	it('accepts purple and teal as a variant and through a colorMap', () => {
		const validator = CnStatusBadge.props.variant.validator
		expect(validator('purple')).toBe(true)
		expect(validator('teal')).toBe(true)
		expect(validator('magenta')).toBe(false)

		const byVariant = mount(CnStatusBadge, { propsData: { label: 'In behandeling', variant: 'purple' } })
		expect(variantOf(byVariant)).toBe('purple')
		const byMap = mount(CnStatusBadge, { propsData: { label: 'Omgezet naar een zaak', colorKey: 'converted', colorMap: { converted: 'teal' } } })
		expect(variantOf(byMap)).toBe('teal')
	})

	it('draws purple and teal from tokens that hold the board colours', () => {
		expect(badgeCss).toMatch(/--cn-status-purple-bg:\s*#e8e6f6/)
		expect(badgeCss).toMatch(/--cn-status-purple-text:\s*#4a3f8f/)
		expect(badgeCss).toMatch(/--cn-status-teal-bg:\s*#e3f1f3/)
		expect(badgeCss).toMatch(/--cn-status-teal-text:\s*#1d5e66/)
		expect(badgeCss).toMatch(/\.cn-status-badge--purple\s*\{[^}]*background-color:\s*var\(--cn-status-purple-bg\)[^}]*color:\s*var\(--cn-status-purple-text\)/)
		expect(badgeCss).toMatch(/\.cn-status-badge--teal\s*\{[^}]*background-color:\s*var\(--cn-status-teal-bg\)[^}]*color:\s*var\(--cn-status-teal-text\)/)
	})

	it('sets a primary pill in the deep primary ink only under the board look', () => {
		expect(boardCss).toMatch(/\.cn-look-board \.cn-status-badge--primary:not\(\.cn-status-badge--solid\):not\(\.cn-look-nextcloud \*\)\s*\{\s*color:\s*var\(--color-primary-element-light-text\);/)
		// The default look keeps its primary text.
		expect(badgeCss).toMatch(/\.cn-status-badge--primary\s*\{[^}]*color:\s*var\(--color-primary-element\);/)
	})
})

describe('a manifest column colours its enum pills', () => {
	const schema = {
		properties: {
			status: { type: 'string', enum: ['new', 'in_progress', 'converted'] },
			stage: { type: 'string', enum: ['new', 'qualified'], 'x-color-map': { qualified: 'purple' } },
		},
	}
	const rows = [
		{ id: '1', status: 'in_progress', stage: 'qualified' },
		{ id: '2', status: 'converted', stage: 'new' },
	]
	const mountTable = (columns) => mount(CnDataTable, {
		propsData: { rows, columns, schema, rowKey: 'id' },
		provide: { cnTranslate: (key) => key },
		stubs: { 'router-link': true },
	})
	// Each table holds one column, so the row's only pill is that column's.
	const variants = (wrapper) => wrapper.findAll('tbody tr').map((tr) => {
		const cell = tr.find('.cn-status-badge')
		return cell.exists() ? BADGE_VARIANTS.find((v) => cell.classes().includes('cn-status-badge--' + v)) : null
	})

	it('reads the column colorMap, keyed on the raw value', () => {
		const wrapper = mountTable([{ key: 'status', label: 'Status', colorMap: { new: 'primary', in_progress: 'purple', converted: 'teal' } }])
		expect(variants(wrapper)).toEqual(['purple', 'teal'])
	})

	it('keeps the schema x-color-map when the column declares none, and the column map wins over it', () => {
		expect(variants(mountTable([{ key: 'stage', label: 'Stage' }]))).toEqual(['purple', 'default'])
		expect(variants(mountTable([{ key: 'stage', label: 'Stage', colorMap: { qualified: 'warning' } }]))).toEqual(['warning', 'default'])
	})

	it('renders every pill in the default tone without a colour map, as before', () => {
		expect(variants(mountTable([{ key: 'status', label: 'Status' }]))).toEqual(['default', 'default'])
		expect(variants(mountTable([{ key: 'status', label: 'Status', colorMap: ['not', 'a', 'map'] }]))).toEqual(['default', 'default'])
	})
})

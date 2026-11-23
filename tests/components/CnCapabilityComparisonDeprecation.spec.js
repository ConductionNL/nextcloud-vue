/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The in-app capability comparison is deprecated: publish it on the app's
 * docs site and link to it (dossiq #3312, pipelinq #2195). A development
 * build warns once per page load when a comparison is given; an app that
 * gives none hears nothing, and nothing renders differently.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-the-in-app-capability-comparison-is-deprecated
 */
import { mount } from '@vue/test-utils'

const COMPARISON = { systems: [], areas: [], capabilities: [] }

function freshModules() {
	let mods
	jest.isolateModules(() => {
		mods = {
			util: require('../../src/utils/capabilityComparison.js'),
			Table: require('../../src/components/CnCapabilityTable/CnCapabilityTable.vue').default,
		}
	})
	return mods
}

describe('the capability comparison deprecation', () => {
	let warn
	beforeEach(() => {
		warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => {
		warn.mockRestore()
	})

	const deprecationCalls = () => warn.mock.calls.filter((args) => String(args[0]).includes('deprecated'))

	it('says nothing when no comparison is given', () => {
		const { Table } = freshModules()
		mount(Table, { propsData: { comparison: null } })
		expect(deprecationCalls()).toHaveLength(0)
	})

	it('warns once, however many components carry a comparison', () => {
		const { Table, util } = freshModules()
		mount(Table, { propsData: { comparison: COMPARISON } })
		mount(Table, { propsData: { comparison: COMPARISON } })
		expect(util.warnCapabilityComparisonDeprecated('again')).toBe(false)
		expect(deprecationCalls()).toHaveLength(1)
		expect(deprecationCalls()[0][0]).toContain('docs site')
	})

	it('stays silent in a production build', () => {
		const previous = process.env.NODE_ENV
		process.env.NODE_ENV = 'production'
		try {
			const { util } = freshModules()
			expect(util.warnCapabilityComparisonDeprecated('CnCapabilityTable')).toBe(false)
			expect(deprecationCalls()).toHaveLength(0)
		} finally {
			process.env.NODE_ENV = previous
		}
	})
})

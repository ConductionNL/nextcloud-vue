// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The registry must carry `bareWidget` through registration.
//
// `register()` normalises a descriptor by copying a FIXED key list and
// dropping everything else. A key that is not named in that list never reaches
// a consumer, and nothing anywhere says so.
//
// That is not hypothetical. `bareWidget: true` was set on the notes descriptor,
// survived the build, was present in the shipped bundle, and vanished at
// registration. The tabbed Notes panel silently kept the sidebar component, and
// every static check passed: the source had the flag, the bundle had the flag,
// and the running registry did not.

import { createIntegrationRegistry } from '../../src/integrations/registry.js'

const Comp = { name: 'Stub', render: () => null }

describe('registry bareWidget', () => {
	it('carries bareWidget through registration', () => {
		const reg = createIntegrationRegistry()
		reg.register({ id: 'x', label: 'X', tab: Comp, widget: Comp, bareWidget: true })
		expect(reg.get('x').bareWidget).toBe(true)
	})

	it('defaults to false when the descriptor does not ask for it', () => {
		const reg = createIntegrationRegistry()
		reg.register({ id: 'y', label: 'Y', tab: Comp, widget: Comp })
		// Explicitly false rather than undefined: a consumer reading it should
		// not have to distinguish "not asked for" from "asked for and lost".
		expect(reg.get('y').bareWidget).toBe(false)
	})

	it('only accepts a real true, not a truthy value', () => {
		const reg = createIntegrationRegistry()
		reg.register({ id: 'z', label: 'Z', tab: Comp, widget: Comp, bareWidget: 'yes' })
		expect(reg.get('z').bareWidget).toBe(false)
	})

	it('the notes built-in arrives with it set', () => {
		// The end the whole chain exists for.
		const { notesIntegration } = require('../../src/integrations/builtin/notes.js')
		const reg = createIntegrationRegistry()
		reg.register(notesIntegration)
		expect(reg.get('notes').bareWidget).toBe(true)
	})
})

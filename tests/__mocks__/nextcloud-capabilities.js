/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * `@nextcloud/capabilities` reads Nextcloud's server-rendered initial state out
 * of the DOM (`#initial-state-core-capabilities`). Outside a real Nextcloud page
 * that element does not exist, the lookup returns null, and the library throws
 * `Cannot read properties of null (reading 'toString')` from inside
 * `getCapabilities()`.
 *
 * Individual specs in `tests/components/` already work around this with a
 * per-file `jest.mock('@nextcloud/capabilities', ...)` — five of the CnAppRoot
 * specs do exactly that. The smoke lane mounts EVERY component, so it needs the
 * mock centrally: any component reaching `useAppStatus()` (CnAppRoot, and
 * anything rendering a dependency check) would otherwise throw for a reason
 * that has nothing to do with the component.
 *
 * Returns an empty capability set rather than a populated one on purpose. An
 * empty set is the honest answer for "no Nextcloud server here", and it keeps
 * components on their "capability absent" branch, which is the conservative
 * path. A spec that needs a specific capability should mock it locally, as the
 * existing ones do.
 */

module.exports = {
	getCapabilities: () => ({}),
}

/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * ADR-066 server↔JS leaf parity cross-reference (WARN-only half of the
 * integration-parity gate). Builds a throwaway app-repo tree (lib/**.php with
 * `new LeafDescriptor(...)` + src/**.js with `registerIntegration({ id })`)
 * and asserts the cross-ref flags orphans BOTH ways while staying silent when
 * the two faces correlate — and no-ops entirely on a JS-only repo (no server
 * descriptors), so the nextcloud-vue library's own CI never warns.
 */

import fs from 'fs'
import os from 'os'
import path from 'path'
import {
	collectServerDescriptors,
	collectJsRegistrations,
	collectJsRegistrationSites,
	collectLibraryRegistrations,
	crossReferenceServerLeaves,
	reportCrossRef,
} from '../../scripts/check-integration-parity.js'

/**
 * Build a temp repo dir with the given files.
 *
 * @param {{[key: string]: string}} files Map of `relPath` → file contents.
 * @return {string} The temp repo root path.
 */
function makeRepo(files) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-'))
	for (const [rel, contents] of Object.entries(files)) {
		const abs = path.join(root, rel)
		fs.mkdirSync(path.dirname(abs), { recursive: true })
		fs.writeFileSync(abs, contents)
	}
	return root
}

const PHP_RENDER_SURFACE = (id, useConst = false) => `<?php
use OCA\\OpenRegister\\Service\\Integration\\LeafDescriptor;
class RegisterLeafListener {
	${useConst ? `public const LEAF_ID = '${id}';` : ''}
	public function handle() {
		$descriptor = new LeafDescriptor(
			id: ${useConst ? 'self::LEAF_ID' : `'${id}'`},
			label: 'X',
			icon: 'RobotOutline',
			kinds: [
				LeafDescriptor::KIND_RENDER_SURFACE,
				LeafDescriptor::KIND_AGENT_RUNNER,
			],
			surfaces: ['detail-page'],
		);
	}
}
`

const PHP_DATA_ONLY = (id) => `<?php
use OCA\\OpenRegister\\Service\\Integration\\LeafDescriptor;
$descriptor = new LeafDescriptor(
	id: '${id}',
	label: 'Y',
	icon: 'DatabaseOutline',
	kinds: [LeafDescriptor::KIND_DATA_PROVIDER],
);
`

const JS_REGISTRATION = (id) => `import { registerIntegration } from '@conduction/nextcloud-vue'
import Tab from './Tab.vue'
import Widget from './Widget.vue'
registerIntegration({
	id: '${id}',
	label: 'X',
	tab: Tab,
	widget: Widget,
})
`

describe('check-integration-parity — ADR-066 server↔JS cross-ref', () => {
	it('collects a string-literal id + render-surface flag from PHP', () => {
		const root = makeRepo({ 'lib/Listener/L.php': PHP_RENDER_SURFACE('hermiq-agent') })
		const descriptors = collectServerDescriptors(root)
		expect(descriptors).toHaveLength(1)
		expect(descriptors[0].id).toBe('hermiq-agent')
		expect(descriptors[0].renderSurface).toBe(true)
	})

	it('resolves a self::CONST id from the same PHP file', () => {
		const root = makeRepo({ 'lib/Listener/L.php': PHP_RENDER_SURFACE('hermiq-agent', true) })
		const descriptors = collectServerDescriptors(root)
		expect(descriptors[0].id).toBe('hermiq-agent')
		expect(descriptors[0].renderSurface).toBe(true)
	})

	it('collects registerIntegration CALL ids from JS (never the library definition)', () => {
		const root = makeRepo({
			'src/integration-leaf.js': JS_REGISTRATION('hermiq-agent'),
			// The library's own definition must NOT be counted as a registration.
			'src/registry.js': 'export function registerIntegration(descriptor) { return descriptor }\n',
		})
		const regs = collectJsRegistrations(root)
		expect(regs.map((r) => r.id)).toEqual(['hermiq-agent'])
	})

	it('is silent when a render-surface descriptor and its JS registration correlate', () => {
		const root = makeRepo({
			'lib/Listener/L.php': PHP_RENDER_SURFACE('hermiq-agent'),
			'src/integration-leaf.js': JS_REGISTRATION('hermiq-agent'),
		})
		const { ran, warnings } = crossReferenceServerLeaves(root)
		expect(ran).toBe(true)
		expect(warnings).toEqual([])
	})

	it('flags a PHANTOM render surface: render-surface descriptor with no JS registration', () => {
		const root = makeRepo({
			'lib/Listener/L.php': PHP_RENDER_SURFACE('hermiq-agent'),
		})
		const { ran, warnings } = crossReferenceServerLeaves(root)
		expect(ran).toBe(true)
		expect(warnings).toHaveLength(1)
		expect(warnings[0]).toMatch(/hermiq-agent/)
		expect(warnings[0]).toMatch(/phantom render surface/i)
	})

	it('flags an ORPHAN JS registration with no server descriptor', () => {
		const root = makeRepo({
			// A data-only descriptor keeps `ran` true (server face present) while
			// the JS registration has no descriptor of its own id.
			'lib/Listener/L.php': PHP_DATA_ONLY('some-data-leaf'),
			'src/integration-leaf.js': JS_REGISTRATION('rogue-widget'),
		})
		const { ran, warnings } = crossReferenceServerLeaves(root)
		expect(ran).toBe(true)
		expect(warnings.some((w) => /rogue-widget/.test(w) && /orphan JS/i.test(w))).toBe(true)
	})

	it('does NOT flag a data-provider descriptor with no render surface as a phantom', () => {
		const root = makeRepo({
			'lib/Listener/L.php': PHP_DATA_ONLY('some-data-leaf'),
		})
		const { ran, warnings } = crossReferenceServerLeaves(root)
		expect(ran).toBe(true)
		// No render-surface descriptor → no phantom warning; the data leaf need
		// not have a JS registration.
		expect(warnings).toEqual([])
	})

	it('no-ops (ran=false) on a JS-only repo with no server descriptors', () => {
		const root = makeRepo({
			'src/integration-leaf.js': JS_REGISTRATION('hermiq-agent'),
		})
		const { ran, warnings } = crossReferenceServerLeaves(root)
		expect(ran).toBe(false)
		expect(warnings).toEqual([])
	})

	// --- renderMode cross-layer correlation (openregister#2127, ADR-066) -----

	const PHP_MOUNT_SURFACE = (id) => `<?php
use OCA\\OpenRegister\\Service\\Integration\\LeafDescriptor;
$descriptor = new LeafDescriptor(
	id: '${id}',
	label: 'X',
	kinds: [LeafDescriptor::KIND_RENDER_SURFACE],
	renderMode: LeafDescriptor::RENDER_MODE_MOUNT,
	surfaces: ['detail-page'],
);
`

	const JS_MOUNT_REGISTRATION = (id) => `import { registerIntegration } from '@conduction/nextcloud-vue'
registerIntegration({
	id: '${id}',
	label: 'X',
	renderMode: 'mount',
	mount: (el, props) => {},
	unmount: (el) => {},
})
`

	it('reads renderMode "mount" from a PHP RENDER_MODE_MOUNT descriptor', () => {
		const root = makeRepo({ 'lib/Listener/L.php': PHP_MOUNT_SURFACE('hermiq-agent') })
		const descriptors = collectServerDescriptors(root)
		expect(descriptors[0].renderMode).toBe('mount')
	})

	it('defaults renderMode to "component" for a descriptor that does not opt in', () => {
		const root = makeRepo({ 'lib/Listener/L.php': PHP_RENDER_SURFACE('hermiq-agent') })
		const descriptors = collectServerDescriptors(root)
		expect(descriptors[0].renderMode).toBe('component')
	})

	it('reads renderMode "mount" from a JS registration', () => {
		const root = makeRepo({ 'src/leaf.js': JS_MOUNT_REGISTRATION('hermiq-agent') })
		const regs = collectJsRegistrations(root)
		expect(regs[0].renderMode).toBe('mount')
	})

	it('is silent when server and JS renderMode agree (both mount)', () => {
		const root = makeRepo({
			'lib/Listener/L.php': PHP_MOUNT_SURFACE('hermiq-agent'),
			'src/leaf.js': JS_MOUNT_REGISTRATION('hermiq-agent'),
		})
		const { ran, warnings } = crossReferenceServerLeaves(root)
		expect(ran).toBe(true)
		expect(warnings).toEqual([])
	})

	it('flags a renderMode mismatch across layers (server mount, JS component)', () => {
		const root = makeRepo({
			'lib/Listener/L.php': PHP_MOUNT_SURFACE('hermiq-agent'),
			'src/leaf.js': JS_REGISTRATION('hermiq-agent'), // component-mode JS
		})
		const { ran, warnings } = crossReferenceServerLeaves(root)
		expect(ran).toBe(true)
		expect(warnings.some((w) => /hermiq-agent/.test(w) && /renderMode MUST match/i.test(w))).toBe(true)
	})
})

// ---------------------------------------------------------------------------
// The second server-side leaf face: IntegrationProvider CLASSES.
//
// Every matcher below is paired with a control that proves it can still FAIL —
// a matcher only tested on input it accepts is indistinguishable from one that
// accepts everything.
// ---------------------------------------------------------------------------

const PHP_PROVIDER = (id, { base = 'AbstractIntegrationProvider', useConst = false } = {}) => `<?php

/**
 * A docblock that says the words "new LeafDescriptor(" and
 * "class FakeProvider implements IntegrationProvider" in PROSE.
 */

declare(strict_types=1);

namespace OCA\\OpenRegister\\Service\\Integration\\Providers;

class ${id.replace(/[^a-z]/gi, '')}Provider extends ${base}
{
${useConst ? `    public const ID = '${id}';\n` : ''}
    /**
     * @return string
     */
    public function getId(): string
    {
        return ${useConst ? 'self::ID' : `'${id}'`};
    }//end getId()

}
`

const PHP_PROVIDER_VIA_INTERFACE = (id) => `<?php
namespace OCA\\OpenRegister\\Service\\Integration\\Providers;
use OCA\\OpenRegister\\Service\\Integration\\IntegrationProvider;
class ViaInterface implements IntegrationProvider, JsonSerializable
{
    public function getId(): string
    {
        return '${id}';
    }
}
`

// CONTROL: a class with an identical getId() that is NOT an integration
// provider. If this is collected, the matcher is keying on the method name
// rather than the contract, and every id-bearing service in lib/ becomes a
// "leaf".
const PHP_NOT_A_PROVIDER = (id) => `<?php
namespace OCA\\OpenRegister\\ContextChat;
class ContentProvider implements IContentProvider
{
    public function getId(): string
    {
        return '${id}';
    }
}
`

const PHP_ABSTRACT_BASE = `<?php
namespace OCA\\OpenRegister\\Service\\Integration;
abstract class AbstractIntegrationProvider implements IntegrationProvider
{
    public function getId(): string
    {
        return 'should-never-be-collected';
    }
}
`

const JS_DIRECT_REGISTRATION = (id) => `import Tab from './Tab.vue'
window.OCA.OpenRegister.integrations.register({
	id: '${id}',
	label: 'X',
	tab: Tab,
	widget: Tab,
})
`

describe('check-integration-parity — IntegrationProvider server face', () => {
	it('collects an IntegrationProvider class id from its getId() literal', () => {
		const root = makeRepo({ 'lib/Service/Integration/Providers/XwikiProvider.php': PHP_PROVIDER('xwiki') })
		const descriptors = collectServerDescriptors(root)
		expect(descriptors).toHaveLength(1)
		expect(descriptors[0].id).toBe('xwiki')
		expect(descriptors[0].face).toBe('IntegrationProvider')
	})

	it('resolves a self::CONST id returned by getId()', () => {
		const root = makeRepo({
			'lib/Service/Integration/TimeProvider.php': PHP_PROVIDER('time-tracker', { useConst: true }),
		})
		expect(collectServerDescriptors(root)[0].id).toBe('time-tracker')
	})

	it('collects a provider that names the interface via `implements`', () => {
		const root = makeRepo({ 'lib/Service/Integration/Providers/V.php': PHP_PROVIDER_VIA_INTERFACE('kvk') })
		expect(collectServerDescriptors(root).map((d) => d.id)).toEqual(['kvk'])
	})

	it('CONTROL: does NOT collect a getId() on a class that is not an IntegrationProvider', () => {
		const root = makeRepo({ 'lib/ContextChat/ContentProvider.php': PHP_NOT_A_PROVIDER('openregister') })
		expect(collectServerDescriptors(root)).toEqual([])
	})

	it('CONTROL: does NOT collect the abstract base class itself', () => {
		const root = makeRepo({ 'lib/Service/Integration/AbstractIntegrationProvider.php': PHP_ABSTRACT_BASE })
		expect(collectServerDescriptors(root)).toEqual([])
	})

	it('treats a provider as a render surface but declares its renderMode UNKNOWN', () => {
		const root = makeRepo({ 'lib/Service/Integration/Providers/P.php': PHP_PROVIDER('xwiki') })
		const d = collectServerDescriptors(root)[0]
		// The IntegrationProvider contract has no kinds/surfaces array; every
		// provider is drawn on the object-detail integration surface.
		expect(d.renderSurface).toBe(true)
		expect(d.surfaceSource).toBe('implicit')
		// …and no renderMode member at all, so nothing may be asserted about it.
		expect(d.renderMode).toBeNull()
	})

	it('does NOT invent a renderMode mismatch for a provider whose JS declares mount', () => {
		const root = makeRepo({
			'lib/Service/Integration/Providers/P.php': PHP_PROVIDER('hermiq-agent'),
			'src/leaf.js': `import { registerIntegration } from '@conduction/nextcloud-vue'
registerIntegration({ id: 'hermiq-agent', renderMode: 'mount', mount: () => {}, unmount: () => {} })
`,
		})
		const { ran, warnings } = crossReferenceServerLeaves(root)
		expect(ran).toBe(true)
		expect(warnings).toEqual([])
	})

	it('CONTROL: the renderMode rule still fires for a shape that DOES declare one', () => {
		// Same JS side; a LeafDescriptor server face declares `component`.
		const root = makeRepo({
			'lib/Listener/L.php': PHP_RENDER_SURFACE('hermiq-agent'),
			'src/leaf.js': `import { registerIntegration } from '@conduction/nextcloud-vue'
registerIntegration({ id: 'hermiq-agent', renderMode: 'mount', mount: () => {}, unmount: () => {} })
`,
		})
		const { warnings } = crossReferenceServerLeaves(root)
		expect(warnings.some((w) => /renderMode MUST match/i.test(w))).toBe(true)
	})

	it('reports a provider with no JS face as a phantom, and stays quiet when it has one', () => {
		const phantom = makeRepo({ 'lib/Service/Integration/Providers/P.php': PHP_PROVIDER('kvk') })
		expect(crossReferenceServerLeaves(phantom).warnings.some((w) => /Phantom render surface/i.test(w))).toBe(true)

		const paired = makeRepo({
			'lib/Service/Integration/Providers/P.php': PHP_PROVIDER('kvk'),
			'src/main.js': JS_DIRECT_REGISTRATION('kvk'),
		})
		expect(crossReferenceServerLeaves(paired).warnings).toEqual([])
	})
})

describe('check-integration-parity — both JS registration APIs', () => {
	it('collects the `integrations.register({ id })` form', () => {
		const root = makeRepo({ 'src/main.js': JS_DIRECT_REGISTRATION('xwiki') })
		expect(collectJsRegistrations(root).map((r) => r.id)).toEqual(['xwiki'])
	})

	it('collects the `registerIntegration({ id })` form (unchanged)', () => {
		const root = makeRepo({ 'src/leaf.js': JS_REGISTRATION('hermiq-agent') })
		expect(collectJsRegistrations(root).map((r) => r.id)).toEqual(['hermiq-agent'])
	})

	it('CONTROL: prose in a comment naming the API is not a registration', () => {
		// Measured on the library's own src/integrations/builtin/files.js, whose
		// docblock reads "pass to `integrations.register()`" directly above the
		// descriptor — the probe matched the SENTENCE and reported an id.
		const root = makeRepo({
			'src/integrations/builtin/files.js': `/**
 * \`files\` integration descriptor — pass to \`integrations.register()\`.
 */
export const filesIntegration = {
	id: 'files',
	label: 'Files',
}
`,
		})
		expect(collectJsRegistrations(root)).toEqual([])
	})

	it('CONTROL: registerIntegrationIcons() and integrations.unregister() are not registrations', () => {
		const root = makeRepo({
			'src/main.js': `registerIntegrationIcons({ id: 'not-a-leaf' })
window.OCA.OpenRegister.integrations.unregister('also-not-a-leaf')
`,
		})
		expect(collectJsRegistrations(root)).toEqual([])
	})

	it('CONTROL: the library\'s own registerIntegration DEFINITION is not a registration', () => {
		const root = makeRepo({
			'src/registry.js': `export function registerIntegration(descriptor) {
	return integrations.register(descriptor)
}
export function createIntegrationRegistry() { return {} }
`,
		})
		expect(collectJsRegistrationSites(root).resolved).toEqual([])
		// …and the registry implementation module contributes no unresolvable
		// call sites either — its internal forwards are the API, not a leaf.
		expect(collectJsRegistrationSites(root).unresolved).toEqual([])
	})

	it('resolves a descriptor passed by variable name, with an id held in a const', () => {
		// decidesk's real shape.
		const root = makeRepo({
			'src/integrations/registerDecisionsLeaf.js': `const DECISIONS_INTEGRATION_ID = 'decidesk-decisions'
export const decisionsLeafDescriptor = {
	id: DECISIONS_INTEGRATION_ID,
	label: 'Besluitvorming',
	renderMode: 'mount',
}
export function install(target) {
	target.OCA.OpenRegister.integrations.register(decisionsLeafDescriptor)
}
`,
		})
		const regs = collectJsRegistrations(root)
		expect(regs.map((r) => r.id)).toEqual(['decidesk-decisions'])
		expect(regs[0].renderMode).toBe('mount')
	})

	it('counts — never silently drops — a call site whose id cannot be read', () => {
		// procest's real shape: the id arrives by object spread.
		const root = makeRepo({
			'src/main.js': `import { registerIntegration, fieldInspectionIntegration } from '@conduction/nextcloud-vue'
registerIntegration({
	...fieldInspectionIntegration,
	offlineConfig: { plannedSchema: 'fieldInspection' },
})
`,
		})
		const sites = collectJsRegistrationSites(root)
		expect(sites.resolved).toEqual([])
		expect(sites.unresolved).toHaveLength(1)
		expect(sites.unresolved[0].file).toBe('src/main.js')
	})
})

describe('check-integration-parity — library-contributed JS faces', () => {
	it('contributes nothing to a repo that does not call the helpers', () => {
		const root = makeRepo({ 'src/leaf.js': JS_REGISTRATION('hermiq-agent') })
		expect(collectLibraryRegistrations(root)).toEqual({ ids: [], helpers: [], problems: [] })
	})

	it('CONTROL: a docblock MENTIONING the helper is not a call', () => {
		const root = makeRepo({
			'src/bootstrap.js': `/**
 * Registered by registerLeafIntegrations() in OpenRegister's bootstrap.
 */
export const x = 1
`,
		})
		expect(collectLibraryRegistrations(root).helpers).toEqual([])
	})

	it('resolves this library\'s real leaf + builtin ids when the helpers ARE called', () => {
		const root = makeRepo({
			'src/bootstrap.js': `import { registerBuiltinIntegrations, registerLeafIntegrations } from '@conduction/nextcloud-vue'
export function boot(registry) {
	registerBuiltinIntegrations(registry)
	registerLeafIntegrations(registry)
}
`,
		})
		const lib = collectLibraryRegistrations(root)
		expect(lib.helpers).toEqual(['registerBuiltinIntegrations', 'registerLeafIntegrations'])
		expect(lib.problems).toEqual([])
		// Read from this package's OWN src/integrations/builtin — so this test
		// fails the day a descriptor stops being resolvable to an id.
		expect(lib.ids).toEqual(expect.arrayContaining(['files', 'calendar', 'openproject', 'xwiki']))
		expect(lib.ids.length).toBeGreaterThan(20)
	})

	it('a server descriptor whose only JS face is library-provided is NOT a phantom', () => {
		const root = makeRepo({
			'lib/Service/Integration/Providers/CalendarProvider.php': PHP_PROVIDER('calendar'),
			'src/bootstrap.js': `import { registerLeafIntegrations } from '@conduction/nextcloud-vue'
registerLeafIntegrations(registry)
`,
		})
		const { ran, warnings } = crossReferenceServerLeaves(root)
		expect(ran).toBe(true)
		expect(warnings).toEqual([])
	})

	it('CONTROL: the SAME descriptor IS a phantom when the helper is not called', () => {
		const root = makeRepo({
			'lib/Service/Integration/Providers/CalendarProvider.php': PHP_PROVIDER('calendar'),
			'src/bootstrap.js': 'export const nothing = 1\n',
		})
		const { warnings } = crossReferenceServerLeaves(root)
		expect(warnings.some((w) => /"calendar"/.test(w) && /Phantom render surface/i.test(w))).toBe(true)
	})

	it('does NOT report a library-provided id with no server face as this repo\'s orphan', () => {
		// `version-history` / `field-inspection` exist in the library but have
		// no PHP provider. That is the library's business, not the app's.
		const root = makeRepo({
			'lib/Service/Integration/Providers/CalendarProvider.php': PHP_PROVIDER('calendar'),
			'src/bootstrap.js': `import { registerBuiltinIntegrations } from '@conduction/nextcloud-vue'
registerBuiltinIntegrations(registry)
`,
		})
		const { warnings } = crossReferenceServerLeaves(root)
		expect(warnings.filter((w) => /orphan JS/i.test(w))).toEqual([])
	})
})

describe('check-integration-parity — a correlation that did not run says so', () => {
	/**
	 * Capture everything reportCrossRef prints.
	 *
	 * @param {object} result A crossReferenceServerLeaves() result.
	 * @return {string} The joined console output.
	 */
	function capture(result) {
		const lines = []
		const push = (...args) => lines.push(args.join(' '))
		const spies = [
			jest.spyOn(console, 'log').mockImplementation(push),
			jest.spyOn(console, 'warn').mockImplementation(push),
			jest.spyOn(console, 'error').mockImplementation(push),
		]
		try {
			reportCrossRef(result)
		} finally {
			spies.forEach((s) => s.mockRestore())
		}
		return lines.join('\n')
	}

	it('is LOUD when there is a JS face but no server face to correlate it against', () => {
		const root = makeRepo({ 'src/leaf.js': JS_REGISTRATION('hermiq-agent') })
		const result = crossReferenceServerLeaves(root)
		expect(result.ran).toBe(false)
		const out = capture(result)
		expect(out).toMatch(/NOTHING was correlated/)
		expect(out).toMatch(/this is NOT a pass/)
		expect(out).toMatch(/hermiq-agent/)
		// The old behaviour: printed nothing at all.
		expect(out.length).toBeGreaterThan(0)
	})

	it('says NOT APPLICABLE — out loud — when neither face exists', () => {
		const root = makeRepo({ 'src/app.js': 'export const x = 1\n' })
		const result = crossReferenceServerLeaves(root)
		expect(result.ran).toBe(false)
		const out = capture(result)
		expect(out).toMatch(/NOT APPLICABLE/)
		expect(out).toMatch(/no server↔JS pair/i)
	})

	it('prints the coverage denominators on a PASS, not just a tick', () => {
		const root = makeRepo({
			'lib/Listener/L.php': PHP_RENDER_SURFACE('hermiq-agent'),
			'src/leaf.js': JS_REGISTRATION('hermiq-agent'),
		})
		const out = capture(crossReferenceServerLeaves(root))
		expect(out).toMatch(/^✓ server↔JS leaf parity/m)
		expect(out).toMatch(/correlated 1 server-side leaf face\(s\)/)
		expect(out).toMatch(/1 server id\(s\) matched a JS face/)
	})

	it('names the unresolvable call sites rather than counting them absent', () => {
		const root = makeRepo({
			'src/main.js': `import { registerIntegration, fieldInspectionIntegration } from '@conduction/nextcloud-vue'
registerIntegration({ ...fieldInspectionIntegration })
`,
		})
		const out = capture(crossReferenceServerLeaves(root))
		expect(out).toMatch(/could not be read statically/)
		expect(out).toMatch(/NOT counted as absent/)
		expect(out).toMatch(/src\/main\.js/)
	})
})

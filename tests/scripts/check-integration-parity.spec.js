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
	crossReferenceServerLeaves,
} from '../../scripts/check-integration-parity.js'

/**
 * Build a temp repo dir with the given files.
 *
 * @param {Object<string, string>} files Map of `relPath` → file contents.
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

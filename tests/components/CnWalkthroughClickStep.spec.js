/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnWalkthrough's "the step asks for a click" fixes (WOO-561).
 *
 * Two independent failures made a tour stop that says "open Flows from the
 * menu" impossible to execute, measured on portaliq 2026-09-08:
 *
 *  1. `revealTarget()` picked the WRONG toggle. An element reporting
 *     `aria-expanded="false"` that has no `.app-navigation-entry--collapsible`
 *     ancestor IS the toggle — an NcAppNavigationSettings foldout button is
 *     the fleet's case. The old code fell back to `group = nav` and then
 *     `querySelector`ed the whole navigation, so it clicked the FIRST
 *     collapsed-looking button anywhere in the nav (an unrelated NcActions
 *     trigger, say) and left the real foldout shut.
 *
 *  2. Once the target stayed unmeasurable, the anchored step fell back to the
 *     `--full` dim, which is `pointer-events: auto` — so the overlay swallowed
 *     every click, including the one the step itself instructed the user to
 *     make. Only Back/Finish worked. A centered step keeps the interactive
 *     backdrop (clicking it dismisses); an anchored step that lost its anchor
 *     must let clicks through instead.
 */
const { mount } = require('@vue/test-utils')
const CnWalkthrough = require('../../src/components/CnWalkthrough/CnWalkthrough.vue').default
const { __resetWalkthroughCacheForTests } = require('../../src/composables/useWalkthrough.js')

function manifest(steps) {
	return { version: '1.0.0', walkthrough: { enabled: true, version: 1, tours: [{ id: 'getting-started', trigger: 'first-visit', steps }] } }
}

describe('CnWalkthrough — a step that asks for a click', () => {
	beforeEach(() => {
		__resetWalkthroughCacheForTests()
		document.body.innerHTML = ''
	})

	it('reveals a settings-foldout target instead of an unrelated collapsed button', async () => {
		// An NcActions trigger comes FIRST in document order, the real foldout
		// toggle second — exactly the fleet's app-navigation shape.
		document.body.innerHTML = `
			<div class="app-navigation">
				<nav>
					<ul>
						<li class="app-navigation-entry">
							<button id="unrelated-actions" aria-expanded="false">Actions</button>
						</li>
					</ul>
					<div id="settings-foldout">
						<button id="settings-toggle" aria-expanded="false">Settings</button>
						<div style="display: none">
							<a data-cn-route="Flows" data-testid="nav-flows">Flows</a>
						</div>
					</div>
				</nav>
			</div>`
		const clicked = []
		document.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => clicked.push(b.id)))

		const steps = [{
			id: 'go-flows',
			sinceVersion: '1.0.0',
			placement: 'right',
			task: 'Open Settings, then Flows',
			target: { kind: 'nav-item', ref: 'Flows' },
			advanceOn: { type: 'route-match', route: 'Flows' },
		}]
		const w = mount(CnWalkthrough, { propsData: { appId: 'reveal-app', manifest: manifest(steps) } })
		await w.vm.$nextTick()
		w.vm.revealTarget()

		expect(clicked).toContain('settings-toggle')
	})

	it('lets clicks through the fallback dim when an anchored step lost its anchor', async () => {
		const steps = [{
			id: 'go-flows',
			sinceVersion: '1.0.0',
			placement: 'right',
			task: 'Open Settings, then Flows',
			target: { kind: 'nav-item', ref: 'Flows' },
			advanceOn: { type: 'route-match', route: 'Flows' },
		}]
		const w = mount(CnWalkthrough, { propsData: { appId: 'dim-app', manifest: manifest(steps) } })
		await w.vm.$nextTick()
		// jsdom never lays anything out, so the anchored step has no rect —
		// the same state as a target hidden inside a closed foldout.
		expect(w.vm.rect).toBe(null)
		const dim = w.find('.cn-walkthrough__dim--full')
		expect(dim.exists()).toBe(true)
		expect(dim.classes()).toContain('cn-walkthrough__dim--passthrough')
	})

	it('keeps the fallback dim interactive for a centered step', async () => {
		const steps = [{
			id: 'welcome',
			sinceVersion: '1.0.0',
			placement: 'center',
			title: 'Welcome',
			target: { kind: 'page', ref: 'Home' },
			advanceOn: { type: 'manual' },
		}]
		const w = mount(CnWalkthrough, { propsData: { appId: 'centered-app', manifest: manifest(steps) } })
		await w.vm.$nextTick()
		const dim = w.find('.cn-walkthrough__dim--full')
		expect(dim.exists()).toBe(true)
		expect(dim.classes()).not.toContain('cn-walkthrough__dim--passthrough')
	})
})

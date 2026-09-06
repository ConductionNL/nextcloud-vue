/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Warm the Vite harness before any worker navigates to it.
 *
 * WHY THIS EXISTS
 * ---------------
 * `e2e/harness/App.vue` statically imports every component the suite exercises,
 * so the FIRST page load makes the dev server transform the whole library graph
 * and pre-bundle its dependencies. Measured here on 2026-09-06: a cold
 * `?flow=1` took 23 seconds against a 30 second per-test timeout, and every
 * worker paid it at once because `fullyParallel` starts them together.
 *
 * That is seven seconds of headroom shared by the whole suite, and it is spent
 * by whoever adds the next component to the harness — which is exactly what
 * happened: mounting CnFlowSidebar alongside CnFlowDetail pushed the SIX
 * pre-existing flow-editor tests from 23s to a 30s timeout. They failed
 * together, none of them for a reason in their own file, and the diff that
 * broke them had not touched them.
 *
 * ⚠️ RAISING THE PER-TEST TIMEOUT WOULD HAVE HIDDEN THIS RATHER THAN FIXED IT.
 * A timeout large enough to absorb a cold start is also large enough to absorb
 * a real hang, and every test then pays the wait before it can fail. The cost
 * is a one-off, so it is paid once, here, before the clock any test is measured
 * against starts running.
 *
 * Serial and deliberate: one page, one navigation, a timeout long enough for a
 * cold CI runner. Failing here fails the run loudly, which is the right
 * outcome — if the harness cannot load at all, no assertion below it means
 * anything.
 */
import { chromium } from '@playwright/test'

const WARMUP_TIMEOUT_MS = 180_000

/**
 * Load the harness once so the dev server's transform cache is populated.
 *
 * @param {import('@playwright/test').FullConfig} config The resolved config.
 * @return {Promise<void>}
 */
export default async function globalSetup(config) {
	const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:5199'

	const browser = await chromium.launch()
	try {
		const page = await browser.newPage()

		// The harness is one component with `v-if` branches and STATIC imports,
		// so a single load transforms every branch. `?flow=1` rather than `/`
		// only because it is the heaviest branch to render, and rendering is
		// the part that pulls the lazy chunks.
		await page.goto(`${baseURL}/?flow=1`, {
			waitUntil: 'load',
			timeout: WARMUP_TIMEOUT_MS,
		})

		// Vite can discover a dependency during render and re-optimise, which
		// forces a page reload. Waiting for the canvas means that second pass
		// is paid here too rather than by the first test.
		await page.locator('[data-testid="flow-box"]').waitFor({ timeout: WARMUP_TIMEOUT_MS })
	} finally {
		await browser.close()
	}
}

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Playwright e2e config. Boots the Vite harness (e2e/harness) and runs the
 * specs in e2e/ against it in Chromium. The harness mounts the real library
 * SFCs, so these are genuine in-browser tests (distinct from the jsdom jest
 * component tests under tests/).
 */
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './e2e',
	testMatch: '**/*.e2e.js',
	timeout: 30_000,
	fullyParallel: true,

	// ONE RETRY IN CI, NONE LOCALLY.
	//
	// ⚠️ NOT A LICENCE TO BE FLAKY. A retried-then-passed test is reported as
	// `flaky`, not as `passed`, so a race stays VISIBLE in the run summary
	// instead of being laundered into a green tick — which is the reason to
	// prefer one retry over two, and the reason `trace: 'on-first-retry'` below
	// was already configured before any retry existed to trigger it.
	//
	// The first CI run of this suite failed on exactly one spec, and it was a
	// real bug in the test rather than a machine hiccup: a click followed
	// immediately by `page.evaluate()`, which takes one snapshot and cannot
	// retry. That is fixed at the source in `dashboard-date-chip.e2e.js`. The
	// retry is here for what a shared runner does to timing in general, not as
	// an alternative to fixing races.
	retries: process.env.CI ? 1 : 0,

	reporter: [['list']],
	use: {
		baseURL: 'http://localhost:5199',
		trace: 'on-first-retry',
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
	],
	webServer: {
		command: 'npx vite --config e2e/vite.config.mjs',
		url: 'http://localhost:5199',
		reuseExistingServer: !process.env.CI,
		timeout: 60_000,
	},
})

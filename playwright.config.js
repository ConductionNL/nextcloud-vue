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

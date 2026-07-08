<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
  -
  - Browser harness for the Playwright e2e suite. Mounts the real SFCs (no
  - stubs) so the specs exercise them in a real Chromium — the enriched
  - CnIconPicker, the legacy CnIconPicker, and CnMarkdownEditor in both the
  - default textarea mode and the lazily-loaded Toast UI WYSIWYG mode.
-->
<template>
	<div class="harness">
		<!-- Walkthrough harness (gated behind ?wt=1 so its full-screen overlay
		     doesn't block the icon/markdown sections). -->
		<template v-if="showWalkthrough">
			<h2>Walkthrough</h2>
			<CnWalkthrough app-id="harness" :manifest="wtManifest" seen-version="" />
		</template>

		<template v-else>
		<section data-testid="section-icon-enriched">
			<h2>Icon picker — enriched</h2>
			<CnIconPicker
				v-model="icon"
				searchable
				allow-custom-svg
				clearable
				:placement.sync="placement" />
			<pre data-testid="icon-value">{{ icon === null ? 'null' : icon }}</pre>
			<pre data-testid="icon-placement">{{ placement }}</pre>
		</section>

		<section data-testid="section-icon-legacy">
			<h2>Icon picker — legacy</h2>
			<CnIconPicker v-model="legacyIcon" />
			<pre data-testid="legacy-icon-value">{{ legacyIcon === null ? 'null' : legacyIcon }}</pre>
		</section>

		<section data-testid="section-md-wysiwyg">
			<h2>Markdown — WYSIWYG</h2>
			<CnMarkdownEditor v-model="wysiwyg" mode="wysiwyg" />
			<pre data-testid="wysiwyg-value">{{ wysiwyg }}</pre>
		</section>

		<section data-testid="section-md-default">
			<h2>Markdown — default</h2>
			<CnMarkdownEditor v-model="plain" />
			<pre data-testid="plain-value">{{ plain }}</pre>
		</section>
		</template>
	</div>
</template>

<script>
import CnIconPicker from '../../src/components/CnIconPicker/CnIconPicker.vue'
import CnMarkdownEditor from '../../src/components/CnMarkdownEditor/CnMarkdownEditor.vue'
import CnWalkthrough from '../../src/components/CnWalkthrough/CnWalkthrough.vue'

const wtStep = (id, title, body) => ({ id, sinceVersion: '1.0.0', placement: 'center', title, body, target: { kind: 'page', ref: 'harness' }, advanceOn: { type: 'manual' } })

export default {
	name: 'Harness',
	components: { CnIconPicker, CnMarkdownEditor, CnWalkthrough },
	data() {
		return {
			icon: null,
			placement: 'left',
			legacyIcon: null,
			wysiwyg: '# Hello',
			plain: 'plain text',
			showWalkthrough: (typeof window !== 'undefined' && window.location.search.includes('wt')),
			wtManifest: {
				version: '1.0.0',
				walkthrough: {
					enabled: true,
					version: 1,
					tours: [{
						id: 'getting-started',
						trigger: 'first-visit',
						steps: [
							wtStep('welcome', 'Welcome', 'First step — no Back, Next on the right.'),
							wtStep('middle', 'Second', 'Middle step — Back on the left, Next on the right.'),
							wtStep('done', 'Done', 'Last step — Finish on the right.'),
						],
					}],
				},
			},
		}
	},
}
</script>

<style>
body { font-family: sans-serif; padding: 16px; }
section { margin-bottom: 32px; max-width: 480px; }
pre { background: #f4f4f4; padding: 6px; }
</style>

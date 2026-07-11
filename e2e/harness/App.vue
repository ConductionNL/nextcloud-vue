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

		<!-- CnFormDialog schema-driven widget:'icon' (gated behind ?fd=1). -->
		<template v-else-if="showFormDialog">
			<h2>Form dialog — schema-driven icon field</h2>
			<CnFormDialog
				:fields="fdFields"
				:item="null"
				@confirm="fdResult = $event"
				@close="() => {}" />
			<pre data-testid="fd-result">{{ fdResult ? JSON.stringify(fdResult) : 'none' }}</pre>
		</template>

		<!-- CnFormPage steps + conditional field + validation (manifest-form-logic,
		     gated behind ?fl=1). submitHandler (not submitEndpoint) echoes the
		     dispatched payload into #fl-result — mirrors the ?fd=1 harness's
		     local-capture pattern (no real backend in the Vite harness). -->
		<template v-else-if="showFormLogic">
			<h2>Form logic — wizard + conditional field + validation</h2>
			<CnFormPage
				:fields="flFields"
				:steps="flSteps"
				submit-handler="echoSubmit"
				:custom-components="flCustomComponents"
				mode="public" />
			<pre data-testid="fl-result">{{ flResult ? JSON.stringify(flResult) : 'none' }}</pre>
		</template>

		<template v-else>
		<section data-testid="section-icon-enriched">
			<h2>Icon picker — enriched (multi-source)</h2>
			<CnIconPicker
				v-model="icon"
				searchable
				allow-custom-svg
				clearable
				:sources="sources"
				:catalogues="catalogues"
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
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'
import CnFormPage from '../../src/components/CnFormPage/CnFormPage.vue'
import { fromFontAwesome, fromOpenGemeenten } from '../../src/components/CnIconPicker/iconCatalogues.js'

const wtStep = (id, title, body) => ({ id, sinceVersion: '1.0.0', placement: 'center', title, body, target: { kind: 'page', ref: 'harness' }, advanceOn: { type: 'manual' } })

// Small hand-built sample packs so the FontAwesome / OpenGemeenten source tabs
// render without shipping the real (heavy, separately-licensed) icon packs.
// icon dims (24×24) match the 24-unit sample paths so they render at the right scale.
const faSample = fromFontAwesome({ fas: {
	faHouse: { iconName: 'house', icon: [24, 24, [], 'f015', 'M2 12 12 3l10 9h-3v8h-4v-6H9v6H5v-8Z'] },
	faStar: { iconName: 'star', icon: [24, 24, [], 'f005', 'm12 2 3 7 7 .5-5 5 1.5 7-6.5-4-6.5 4 1.5-7-5-5 7-.5Z'] },
	faUser: { iconName: 'user', icon: [24, 24, [], 'f007', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0Z'] },
} })
const ogSample = fromOpenGemeenten([
	{ name: 'paspoort', label: 'Paspoort', path: 'M6 2h12v20H6Z' },
	{ name: 'afval', label: 'Afval', path: 'M9 3h6l1 2h4v2H4V5h4Z' },
])

export default {
	name: 'Harness',
	components: { CnIconPicker, CnMarkdownEditor, CnWalkthrough, CnFormDialog, CnFormPage },
	data() {
		return {
			icon: null,
			placement: 'left',
			legacyIcon: null,
			wysiwyg: '# Hello',
			plain: 'plain text',
			sources: ['mdi', 'fontawesome', 'opengemeenten'],
			catalogues: { fontawesome: faSample, opengemeenten: ogSample },
			showFormDialog: (typeof window !== 'undefined' && window.location.search.includes('fd')),
			fdResult: null,
			fdFields: [
				{ key: 'icon', widget: 'icon', label: 'Icon', iconSources: ['fontawesome'], catalogues: { fontawesome: faSample }, searchable: true },
			],
			showFormLogic: (typeof window !== 'undefined' && window.location.search.includes('fl')),
			flResult: null,
			flFields: [
				{ key: 'kind', type: 'enum', label: 'Kind', enum: ['person', 'company'] },
				{
					key: 'name',
					type: 'string',
					label: 'Name',
					validation: { required: true, pattern: '^[A-Za-z ]+$', message: 'Only letters allowed' },
				},
				{
					key: 'kvk',
					type: 'string',
					label: 'KvK number',
					visibleWhen: { field: 'kind', op: 'eq', value: 'company' },
				},
				// Always-visible filler on the "details" step so that step is
				// never fully hidden merely because kvk's condition is false —
				// otherwise Next/Submit gating (REQ-MFL-6's "fully-hidden step
				// skipped" rule) would make Next disappear entirely whenever
				// kind !== "company", which is not what this harness exercises.
				{ key: 'amount', type: 'number', label: 'Amount' },
			],
			flSteps: [
				{ id: 'who', title: 'Who', fields: ['kind', 'name'] },
				{ id: 'details', title: 'Details', fields: ['kvk', 'amount'] },
			],
			flCustomComponents: {
				echoSubmit: (formData) => {
					this.flResult = formData
				},
			},
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

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
		<!--
			Dashboard layout harness (?dash=1). Mounts a CnDataTable inside a
			height-constrained scrolling box that stands in for a widget card,
			with more rows than fit. Both things it proves are LAYOUT facts that
			only a real browser can settle: whether the "View all" footer stays
			pinned while the rows scroll under it, and whether the sticky
			positioning resolves against the right scrollport. jsdom computes no
			layout at all, so the jest suite can assert the DOM structure and
			nothing about where anything ends up.
		-->
		<template v-if="showDashboard">
			<h2>Dashboard layout</h2>
			<div class="dash-card" data-testid="dash-card">
				<CnDataTable
					:rows="dashRows"
					:columns="['name']"
					borderless
					:total-row-count="dashRows.length"
					:view-all-route="{ name: 'anything' }"
					view-all-label="View all"
					:limit="5" />
			</div>
		</template>

		<!--
			CnDataTable horizontal-scroll keyboard access (?dtscroll=1).

			Two tables: one in a narrow box so its columns genuinely overflow,
			and one with a single column in the same box so it genuinely does
			not. Only a real browser settles which is which — jsdom computes no
			layout, so `scrollWidth`/`clientWidth` are both 0 there and axe's
			`scrollable-region-focusable` can never fire in the jest a11y lane.
		-->
		<!--
			Vue Flow canvas (?canvas=1).

			The canvas only exists in a REAL browser: Vue Flow measures nodes
			before rendering them, and jsdom has no layout, so a unit test that
			mounts it finds zero node elements. Every geometry and keyboard
			assertion therefore has to run here.

			`readonly=1` renders the same graph with readOnly set, so one page
			serves both the interactive and the refused cases.
		-->
		<template v-else-if="showCanvas">
			<h2>Flow canvas</h2>
			<div class="canvas-box" data-testid="canvas-box">
				<CnGraphCanvas
					:nodes="canvasNodes"
					:edges="canvasEdges"
					:read-only="canvasReadOnly"
					:show-mini-map="true"
					@nodes-change="canvasChanges.push($event)"
					@connect="canvasConnections.push($event)" />
			</div>
			<pre data-testid="canvas-connections">{{ JSON.stringify(canvasConnections) }}</pre>
		</template>

		<template v-else-if="showDtScroll">
			<h2>Data table — horizontal scroll</h2>
			<div class="dt-narrow" data-testid="dt-overflowing">
				<CnDataTable
					:rows="dtRows"
					:columns="dtWideColumns"
					title="Courses"
					borderless />
			</div>
			<h3>Not overflowing</h3>
			<div class="dt-narrow" data-testid="dt-fitting">
				<CnDataTable :rows="dtRows" :columns="dtNarrowColumns" borderless />
			</div>
		</template>

		<!--
			Date-range chip harness (?chip=1). A real CnDashboardPage with the
			range feature on and one custom widget opting into the chip, so the
			popover's From/To inputs are the real NcActionInput date pickers.
			The bug they cover was a TYPE mismatch — a string handed to a
			Date-typed picker model renders EMPTY — which is invisible to jsdom
			because the stub never runs the picker's own formatter.
		-->
		<template v-else-if="showDateChip">
			<h2>Dashboard date chip</h2>
			<CnDashboardPage
				:widgets="chipWidgets"
				:layout="chipLayout"
				:date-range="chipDateRange"
				title="Chip harness">
				<template #widget-chip-widget>
					<p data-testid="chip-widget-body">widget body</p>
				</template>
			</CnDashboardPage>
		</template>

		<!-- Walkthrough harness (gated behind ?wt=1 so its full-screen overlay
		     doesn't block the icon/markdown sections). -->
		<template v-else-if="showWalkthrough">
			<h2>Walkthrough</h2>
			<CnWalkthrough app-id="harness" :manifest="wtManifest" seen-version="" />
		</template>

		<!--
			CnEditDataModal schema deletion (gated behind ?sd=1). The OpenRegister
			calls are stubbed by the spec via page.route(), so the real dialog runs
			against real HTTP responses — including the 409 that offers the cascade.
		-->
		<template v-else-if="showSchemaDelete">
			<h2>Manage data — schema deletion</h2>
			<CnEditDataModal :manifest="sdManifest" @close="() => {}" />
		</template>

		<!--
			CnSchemaFormDialog enum-add (gated behind ?spa=1). Mounts the real schema
			editor with one string property so the e2e can open that property's actions
			menu and click the "Add enum value" ARROW — the affordance that was dead
			when the input listened only for keydown.enter.
		-->
		<template v-else-if="showSchemaForm">
			<h2>Schema editor — add enum value</h2>
			<CnSchemaFormDialog
				:item="spaSchema"
				dialog-title="New schema"
				:available-registers="[]"
				:available-schemas="[]"
				:show-delete="false"
				@confirm="() => {}"
				@close="() => {}" />
		</template>

		<!--
			NcSelect inside a dialog (gated behind ?selz=1).

			`NcSelect.appendToBody` defaults to TRUE, so vue-select teleports its
			menu to <body>. @nextcloud/vue gives that menu
			`--vs-dropdown-z-index: 9999`, while this library raises every dialog
			mask to 10005 — so the dialog paints over its own dropdown.

			Plain NcDialog + plain NcSelect with no library component in between,
			so the spec measures the stacking contract itself rather than some
			wrapper's behaviour.
		-->
		<template v-else-if="showSelectZ">
			<h2>NcSelect inside a dialog</h2>
			<NcDialog name="Select in dialog" :open="true">
				<div style="min-height: 220px;">
					<NcSelect v-model="selZValue"
						input-label="Pick a fruit"
						:options="selZOptions" />
				</div>
			</NcDialog>
			<pre data-testid="selz-value">{{ selZValue === null ? 'null' : selZValue }}</pre>
		</template>

		<!--
			CnSchemaFormDialog schema-reference dropdown (gated behind ?sref=1).
			available-schemas are shaped like Buildiq passes them — keyed by
			title/slug with NO `label` — so the e2e reproduces the "undefined" options
			bug, and a ready-made array-of-object property renders the select at once.
		-->
		<template v-else-if="showSchemaRef">
			<h2>Schema editor — schema reference</h2>
			<CnSchemaFormDialog
				:item="srefSchema"
				dialog-title="New schema"
				:available-registers="srefRegisters"
				:available-schemas="srefSchemas"
				:show-delete="false"
				@confirm="() => {}"
				@close="() => {}" />
		</template>

		<!--
			CnNavCardGrid keyboard activation (gated behind ?navcards=1).
			A real browser is the only honest measurement here: the component
			renders native <a>/<router-link> cards with NO custom keydown
			handler, relying entirely on the browser's native "Enter activates
			a focused link" behaviour — which jsdom does not implement. The
			"start" button before the grid gives the spec a known Tab origin so
			it can prove real Tab order reaches the card, not just that the
			element is present in the DOM.
		-->
		<template v-else-if="showNavCards">
			<h2>Nav card grid — keyboard activation</h2>
			<button type="button" data-testid="navcards-start">Start</button>
			<CnNavCardGrid title="Explore" :entries="navCardEntries" />
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

			<!-- Mounted exactly as the widget config forms do: no icons, no
		     urlIconGroups, no provide. Whatever this offers is what a user gets in
		     a widget's Icon field. -->
			<section data-testid="section-icon-browser">
				<h2>Icon browser — defaults</h2>
				<CnIconBrowser v-model="browserIcon" inline clearable />
				<pre data-testid="browser-icon-value">{{ browserIcon === null ? 'null' : browserIcon }}</pre>
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
import CnGraphCanvas from '../../src/components/CnGraphCanvas/CnGraphCanvas.vue'
import CnIconPicker from '../../src/components/CnIconPicker/CnIconPicker.vue'
import CnIconBrowser from '../../src/components/CnIconBrowser/CnIconBrowser.vue'
import CnMarkdownEditor from '../../src/components/CnMarkdownEditor/CnMarkdownEditor.vue'
import CnWalkthrough from '../../src/components/CnWalkthrough/CnWalkthrough.vue'
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'
import CnFormPage from '../../src/components/CnFormPage/CnFormPage.vue'
import CnEditDataModal from '../../src/dialogs/CnEditDataModal.vue'
import CnSchemaFormDialog from '../../src/components/CnSchemaFormDialog/CnSchemaFormDialog.vue'
import CnDataTable from '../../src/components/CnDataTable/CnDataTable.vue'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
import CnNavCardGrid from '../../src/components/CnNavCardGrid/CnNavCardGrid.vue'
import { NcDialog, NcSelect } from '@nextcloud/vue'
import { installModalStack } from '../../src/utils/modalStack.js'
import { fromFontAwesome, fromOpenGemeenten } from '../../src/components/CnIconPicker/iconCatalogues.js'

const wtStep = (id, title, body) => ({ id, sinceVersion: '1.0.0', placement: 'center', title, body, target: { kind: 'page', ref: 'harness' }, advanceOn: { type: 'manual' } })

// Small hand-built sample packs so the FontAwesome / OpenGemeenten source tabs
// render without shipping the real (heavy, separately-licensed) icon packs.
// icon dims (24×24) match the 24-unit sample paths so they render at the right scale.
const faSample = fromFontAwesome({
	fas: {
		faHouse: { iconName: 'house', icon: [24, 24, [], 'f015', 'M2 12 12 3l10 9h-3v8h-4v-6H9v6H5v-8Z'] },
		faStar: { iconName: 'star', icon: [24, 24, [], 'f005', 'm12 2 3 7 7 .5-5 5 1.5 7-6.5-4-6.5 4 1.5-7-5-5 7-.5Z'] },
		faUser: { iconName: 'user', icon: [24, 24, [], 'f007', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0Z'] },
	},
})
const ogSample = fromOpenGemeenten([
	{ name: 'paspoort', label: 'Paspoort', path: 'M6 2h12v20H6Z' },
	{ name: 'afval', label: 'Afval', path: 'M9 3h6l1 2h4v2H4V5h4Z' },
])

export default {
	name: 'App',
	components: { CnGraphCanvas, CnIconPicker, CnIconBrowser, CnMarkdownEditor, CnWalkthrough, CnFormDialog, CnFormPage, CnEditDataModal, CnSchemaFormDialog, CnDataTable, CnDashboardPage, CnNavCardGrid, NcDialog, NcSelect },
	data() {
		return {
			// Dashboard layout harness (?dash=1) — see the template comment.
			showDashboard: (typeof window !== 'undefined' && window.location.search.includes('dash')),
			// Date-range chip harness (?chip=1) — see the template comment.
			showDateChip: (typeof window !== 'undefined' && window.location.search.includes('chip')),
			// Vue Flow canvas harness (?canvas=1) — see the template comment.
			showCanvas: (typeof window !== 'undefined' && window.location.search.includes('canvas')),
			canvasReadOnly: (typeof window !== 'undefined' && window.location.search.includes('readonly')),
			// A ROUTING node with three exits, because the multi-exit keyboard
			// path is the one that would silently regress.
			canvasNodes: [
				{ id: 'a', type: 'default', position: { x: 40, y: 40 }, data: { label: 'Start' } },
				{
					id: 'b',
					type: 'default',
					position: { x: 260, y: 160 },
					data: { label: 'Route', ports: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }, { id: 'else', label: 'Else' }] },
				},
				{ id: 'c', type: 'default', position: { x: 40, y: 300 }, data: { label: 'End' } },
			],
			canvasEdges: [{ id: 'e1', source: 'a', target: 'b' }],
			canvasChanges: [],
			canvasConnections: [],
			// CnDataTable horizontal-scroll harness (?dtscroll=1).
			showDtScroll: (typeof window !== 'undefined' && window.location.search.includes('dtscroll')),
			// Non-sortable, exactly like scholiq's failing "manage-courses" widget
			// table. A STRING column normalises to `sortable: true`, which puts a
			// tabindex on every <th> — the scrollport then HAS focusable content
			// and axe correctly passes, so a string-column harness cannot
			// reproduce the reported defect at all.
			dtWideColumns: [
				{ key: 'id', label: 'ID', sortable: false },
				{ key: 'name', label: 'Name', sortable: false },
				{ key: 'teacher', label: 'Teacher', sortable: false },
				{ key: 'location', label: 'Location', sortable: false },
				{ key: 'startDate', label: 'Start date', sortable: false },
				{ key: 'endDate', label: 'End date', sortable: false },
				{ key: 'status', label: 'Status', sortable: false },
				{ key: 'description', label: 'Description', sortable: false },
			],
			dtNarrowColumns: [{ key: 'id', label: 'ID', sortable: false }],
			dtRows: [
				{ id: 'c-1', name: 'Introduction to Civics', teacher: 'A. de Vries', location: 'Building A, room 210', startDate: '2026-09-01', endDate: '2026-12-19', status: 'Planned', description: 'A long description column so the table overflows its narrow container.' },
				{ id: 'c-2', name: 'Public Administration', teacher: 'B. Jansen', location: 'Building C, room 4', startDate: '2026-09-08', endDate: '2027-01-30', status: 'Open', description: 'Another long description so the row is comfortably wider than the box.' },
			],
			chipWidgets: [{ id: 'chip-widget', title: 'Chip widget', type: 'custom' }],
			chipLayout: [{ id: 1, widgetId: 'chip-widget', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3, dateChip: true }],
			chipDateRange: {
				enabled: true,
				showHeaderPicker: false,
				default: { preset: 'month' },
				presets: [
					{ id: 'week', label: 'Current week', period: 'week' },
					{ id: 'month', label: 'Current month', period: 'month' },
					{ id: 'quarter', label: 'Current quarter', period: 'quarter' },
					{ id: 'year', label: 'Current year', period: 'year' },
				],
			},
			dashRows: Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: 'Row ' + (i + 1) })),
			// Schema-deletion harness (?sd=1). The register slug is what the modal
			// matches against; the spec's page.route() stubs supply the register.
			showSchemaDelete: (typeof window !== 'undefined' && window.location.search.includes('sd')),
			// Schema editor with one string property, for the enum-add arrow test (?spa=1).
			showSchemaForm: (typeof window !== 'undefined' && window.location.search.includes('spa')),
			spaSchema: { title: 'Cow', properties: { size: { type: 'string' } }, required: [] },
			// Schema-reference dropdown harness (?sref=1).
			// NcSelect-inside-a-dialog stacking harness (?selz=1).
			showSelectZ: (typeof window !== 'undefined' && window.location.search.includes('selz')),
			selZValue: null,
			selZOptions: ['Apple', 'Banana', 'Cherry'],
			showSchemaRef: (typeof window !== 'undefined' && window.location.search.includes('sref')),
			srefSchemas: [
				{ id: 100, slug: 'cow', title: 'Cow' },
				{ id: 101, slug: 'stable', title: 'Stable' },
			],
			srefRegisters: [{ id: 5, title: 'Production' }],
			srefSchema: {
				title: 'Barn',
				properties: {
					cows: {
						type: 'array',
						items: { type: 'object', objectConfiguration: { handling: 'related-schema' } },
					},
				},
				required: [],
			},
			sdManifest: { pages: [{ config: { register: 'harness-register' } }] },
			icon: null,
			placement: 'left',
			legacyIcon: null,
			browserIcon: null,
			wysiwyg: '# Hello',
			plain: 'plain text',
			sources: ['mdi', 'fontawesome', 'opengemeenten'],
			catalogues: { fontawesome: faSample, opengemeenten: ogSample },
			// CnNavCardGrid keyboard-activation harness (?navcards=1).
			showNavCards: (typeof window !== 'undefined' && window.location.search.includes('navcards')),
			navCardEntries: [
				{
					id: 'explore',
					label: 'Explore',
					description: 'Opens an external resource in a new tab',
					href: 'https://example.org/explore',
				},
			],
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
	mounted() {
		// A real app gets the modal stack for free — `CnAppRoot` installs it on
		// mount, and apps that do not mount `CnAppRoot` are told to call this
		// from `main.js`. The harness mounts bare SFCs, so without this the
		// mask keeps @nextcloud/vue's own 9998 and any spec about how something
		// stacks against a dialog would be measuring a layout no user ever sees.
		// Scoped to this scenario so the other harness sections are untouched.
		if (this.showSelectZ) {
			installModalStack()
		}
	},
}
</script>

<style>
/* The canvas needs a REAL box. Vue Flow measures its container and renders
   nodes into that measurement, so a zero-height parent yields a canvas whose
   pane overlays its own nodes and swallows every pointer event — which is
   exactly how the first run of the drag spec failed. */
.canvas-box {
	width: 800px;
	height: 480px;
	border: 1px solid #ccc;
}

/* Stands in for a dashboard widget card: a fixed-height scrolling content area
   with a border. Deliberately SHORTER than its rows, so the footer has to
   survive scrolling rather than merely existing. */
/* Deliberately narrower than the wide table's natural width, so the scrollport
   really does overflow rather than merely being declared scrollable. */
.dt-narrow {
	width: 320px;
	margin-bottom: 24px;
}

.dash-card {
	height: 240px;
	overflow-y: auto;
	border: 1px solid #ccc;
	width: 420px;
}

body { font-family: sans-serif; padding: 16px; }
section { margin-bottom: 32px; max-width: 480px; }
pre { background: #f4f4f4; padding: 6px; }
</style>

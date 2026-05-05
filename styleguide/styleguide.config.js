const path = require('path')
const fs = require('fs')
const webpack = require('webpack')
const { VueLoaderPlugin } = require('vue-loader')

// Root of the library — one level up from this styleguide/ directory
const ROOT = path.resolve(__dirname, '..')

module.exports = {
	title: '@conduction/nextcloud-vue',
	version: require('../package.json').version,

	components: `${ROOT}/src/components/**/*.vue`,

	getExampleFilename(componentPath) {
		const name = path.basename(componentPath, '.vue')
		const kebab = name.replace(/([A-Z])/g, (_, l, offset) => (offset > 0 ? '-' : '') + l.toLowerCase())
		const docsRoot = path.resolve(__dirname, '../docs')

		// docs/components/ is the canonical home — check it first
		const inComponents = path.join(docsRoot, 'components', `${kebab}.md`)
		if (fs.existsSync(inComponents)) return inComponents

		// Fall back to a recursive search across all docs/ subdirectories
		const findInDir = (dir) => {
			for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
				const full = path.join(dir, entry.name)
				if (entry.isDirectory()) {
					const found = findInDir(full)
					if (found) return found
				} else if (entry.name === `${kebab}.md`) {
					return full
				}
			}
			return null
		}

		return findInDir(docsRoot) || inComponents
	},

	// Show usage and examples expanded by default
	usageMode: 'expand',
	exampleMode: 'expand',

	// Build output — relative to this styleguide/ directory
	styleguideDir: 'build',

	// Run the setup script before every example sandbox
	require: [
		path.join(__dirname, 'setup.js'),
	],

	// Webpack overrides
	webpackConfig: {
		module: {
			rules: [
				{
					test: /\.vue$/,
					loader: 'vue-loader',
				},
				{
					// webpack 4 does not understand .mjs (ES module) files by default.
					// Mark them as plain JS so webpack stops complaining about module type.
					test: /\.(mjs|cjs)$/,
					include: /node_modules/,
					type: 'javascript/auto',
				},
				{
					test: /\.(js|mjs|cjs)$/,
					exclude: /node_modules\/(?!(@nextcloud|unified|vfile|lowlight|mdast-util|hast-util|unist-util|remark|rehype|micromark|decode-named-character-reference|bail|is-plain-obj|trim|trough|vfile-message|property-information))/,
					use: {
						loader: 'babel-loader',
						options: {
							presets: [
								['@babel/preset-env', {
									targets: { chrome: '70' },
									bugfixes: true,
								}],
							],
							plugins: [
								'@babel/plugin-proposal-optional-chaining',
								'@babel/plugin-proposal-nullish-coalescing-operator',
							],
							cacheDirectory: true,
						},
					},
				},
				{
					test: /\.css$/,
					use: ['style-loader', 'css-loader'],
				},
				{
					test: /\.scss$/,
					use: [
						'style-loader',
						'css-loader',
						'sass-loader',
					],
				},
				{
					test: /\.postcss$/,
					use: ['style-loader', 'css-loader'],
				},
			],
		},
		plugins: [
			new VueLoaderPlugin(),
			// @nextcloud/vue reads `appName` and `appVersion` as bare webpack globals.
			// Without these, it logs errors and falls back to "missing-app-name".
			new webpack.DefinePlugin({
				appName: JSON.stringify('nextcloud-vue-styleguide'),
				appVersion: JSON.stringify(require('../package.json').version),
			}),
		],
		resolve: {
			// Force all module imports to resolve from the styleguide's own
			// node_modules first, falling back to the root node_modules.
			// This ensures a single Vue instance is used throughout.
			modules: [
				path.join(__dirname, 'node_modules'),
				path.join(ROOT, 'node_modules'),
			],
			extensions: ['.mjs', '.vue', '.json', '.js'],
			mainFields: ['browser', 'main', 'module'],
			symlinks: false,
			alias: {
				// Pin vue to a single instance so vue-styleguidist and the
				// components share the same Vue runtime.
				vue$: path.join(__dirname, 'node_modules/vue/dist/vue.runtime.common.js'),
				// Allow docs examples to import from the library by package name.
				'@conduction/nextcloud-vue': path.resolve(ROOT, 'src/index.js'),
				'@nextcloud/sharing/public': path.resolve(__dirname, 'mocks/empty.js'),
				// webpack 4 cannot resolve "exports" subpath maps; and the real impl crashes without
				// Nextcloud globals. Stub returns original strings untranslated.
				'@nextcloud/l10n/gettext': path.resolve(__dirname, 'mocks/l10n-gettext.js'),
				'@nextcloud/dialogs': path.resolve(__dirname, 'mocks/empty.js'),
				// p-queue 7+ only ships an "exports" map with no "main" field;
				// webpack 4 doesn't understand "exports", so we point it directly.
				'p-queue': path.resolve(__dirname, 'node_modules/p-queue/dist/index.js'),
				'#minpath': require.resolve('path-browserify'),
				'#minurl': require.resolve('url/'),
				// #minproc uses a package "imports" map that webpack 4 doesn't support;
				// point it at the browser stub directly.
				'#minproc': path.resolve(__dirname, 'node_modules/vfile/lib/minproc.browser.js'),
				// devlop uses an "exports" map with a "development" condition that
				// webpack 4 ignores; point it at the production no-op entry directly.
				devlop: path.resolve(__dirname, 'node_modules/devlop/lib/default.js'),
				// unist-util-visit-parents exports `color` via a sub-path that webpack 4
				// can't resolve from the "exports" map; use the source file directly.
				'unist-util-visit-parents/do-not-use-color': path.resolve(__dirname, 'node_modules/unist-util-visit-parents/lib/color.js'),
			},
		},
	},

	// Component sections — matches the taxonomy in CLAUDE.md
	sections: [
		{
			name: 'UI Atoms',
			description: 'Small building blocks used throughout the library.',
			components: [
				`${ROOT}/src/components/CnIcon/CnIcon.vue`,
				`${ROOT}/src/components/CnStatusBadge/CnStatusBadge.vue`,
				`${ROOT}/src/components/CnProgressBar/CnProgressBar.vue`,
				`${ROOT}/src/components/CnCellRenderer/CnCellRenderer.vue`,
				`${ROOT}/src/components/CnRowActions/CnRowActions.vue`,
				`${ROOT}/src/components/CnContextMenu/CnContextMenu.vue`,
			],
		},
		{
			name: 'Data Display',
			description: 'Components for showing lists, tables, and structured data.',
			components: [
				`${ROOT}/src/components/CnDetailGrid/CnDetailGrid.vue`,
				`${ROOT}/src/components/CnDataTable/CnDataTable.vue`,
				`${ROOT}/src/components/CnCardGrid/CnCardGrid.vue`,
				`${ROOT}/src/components/CnObjectCard/CnObjectCard.vue`,
				`${ROOT}/src/components/CnFilterBar/CnFilterBar.vue`,
				`${ROOT}/src/components/CnFacetSidebar/CnFacetSidebar.vue`,
				`${ROOT}/src/components/CnPagination/CnPagination.vue`,
				`${ROOT}/src/components/CnKpiGrid/CnKpiGrid.vue`,
				`${ROOT}/src/components/CnStatsPanel/CnStatsPanel.vue`,
				`${ROOT}/src/components/CnStatsBlock/CnStatsBlock.vue`,
			],
		},
		{
			name: 'Cards',
			description: 'Card containers for settings and detail sections.',
			components: [
				`${ROOT}/src/components/CnDetailCard/CnDetailCard.vue`,
				`${ROOT}/src/components/CnCard/CnCard.vue`,
				`${ROOT}/src/components/CnNoteCard/CnNoteCard.vue`,
				`${ROOT}/src/components/CnSettingsCard/CnSettingsCard.vue`,
				`${ROOT}/src/components/CnConfigurationCard/CnConfigurationCard.vue`,
				`${ROOT}/src/components/CnVersionInfoCard/CnVersionInfoCard.vue`,
			],
		},
		{
			name: 'Navigation',
			description: 'Page headers, action bars, and navigation components.',
			components: [
				`${ROOT}/src/components/CnPageHeader/CnPageHeader.vue`,
				`${ROOT}/src/components/CnActionsBar/CnActionsBar.vue`,
				`${ROOT}/src/components/CnMassActionBar/CnMassActionBar.vue`,
				`${ROOT}/src/components/CnIndexSidebar/CnIndexSidebar.vue`,
			],
		},
		{
			name: 'Dialogs',
			description: 'Single-object and mass-action dialog components.',
			components: [
				`${ROOT}/src/components/CnDeleteDialog/CnDeleteDialog.vue`,
				`${ROOT}/src/components/CnCopyDialog/CnCopyDialog.vue`,
				`${ROOT}/src/components/CnFormDialog/CnFormDialog.vue`,
				`${ROOT}/src/components/CnAdvancedFormDialog/CnAdvancedFormDialog.vue`,
				`${ROOT}/src/components/CnSchemaFormDialog/CnSchemaFormDialog.vue`,
				`${ROOT}/src/components/CnMassDeleteDialog/CnMassDeleteDialog.vue`,
				`${ROOT}/src/components/CnMassCopyDialog/CnMassCopyDialog.vue`,
				`${ROOT}/src/components/CnMassExportDialog/CnMassExportDialog.vue`,
				`${ROOT}/src/components/CnMassImportDialog/CnMassImportDialog.vue`,
			],
		},
		{
			name: 'Viewers & Editors',
			description: 'Code/JSON viewing and color picking.',
			components: [
				`${ROOT}/src/components/CnJsonViewer/CnJsonViewer.vue`,
				`${ROOT}/src/components/CnColorPicker/CnColorPicker.vue`,
			],
		},
		{
			name: 'Object Widgets',
			description: 'Editable and read-only widgets for individual OpenRegister objects.',
			components: [
				`${ROOT}/src/components/CnObjectDataWidget/CnObjectDataWidget.vue`,
				`${ROOT}/src/components/CnObjectMetadataWidget/CnObjectMetadataWidget.vue`,
			],
		},
		{
			name: 'Dashboard',
			description: 'Dashboard page and widget components.',
			components: [
				`${ROOT}/src/components/CnDashboardPage/CnDashboardPage.vue`,
				`${ROOT}/src/components/CnDashboardGrid/CnDashboardGrid.vue`,
				`${ROOT}/src/components/CnWidgetWrapper/CnWidgetWrapper.vue`,
				`${ROOT}/src/components/CnWidgetRenderer/CnWidgetRenderer.vue`,
				`${ROOT}/src/components/CnTileWidget/CnTileWidget.vue`,
				`${ROOT}/src/components/CnChartWidget/CnChartWidget.vue`,
			],
		},
		{
			name: 'Full Pages',
			description: 'Top-level page components — the starting point for most views.',
			components: [
				`${ROOT}/src/components/CnIndexPage/CnIndexPage.vue`,
				`${ROOT}/src/components/CnDetailPage/CnDetailPage.vue`,
			],
		},
		{
			name: 'App Shell',
			description: 'Manifest-driven app shell components.',
			components: [
				`${ROOT}/src/components/CnAppRoot/CnAppRoot.vue`,
				`${ROOT}/src/components/CnAppNav/CnAppNav.vue`,
				`${ROOT}/src/components/CnPageRenderer/CnPageRenderer.vue`,
				`${ROOT}/src/components/CnAppLoading/CnAppLoading.vue`,
				`${ROOT}/src/components/CnDependencyMissing/CnDependencyMissing.vue`,
			],
		},
		{
			name: 'Settings',
			description: 'Components for settings and configuration pages.',
			components: [
				`${ROOT}/src/components/CnSettingsSection/CnSettingsSection.vue`,
				`${ROOT}/src/components/CnRegisterMapping/CnRegisterMapping.vue`,
			],
		},
		{
			name: 'Specialized',
			description: 'Purpose-built components for specific use cases.',
			components: [
				`${ROOT}/src/components/CnTimelineStages/CnTimelineStages.vue`,
				`${ROOT}/src/components/CnUserActionMenu/CnUserActionMenu.vue`,
				`${ROOT}/src/components/CnObjectSidebar/CnObjectSidebar.vue`,
			],
		},
	],

	// Theming — Conduction brand blue
	theme: {
		color: {
			link: '#0082c9',
			linkHover: '#006ea0',
			sidebarBackground: '#f5f7f9',
		},
		fontFamily: {
			base: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
		},
	},

	skipComponentsWithoutExample: false,
}

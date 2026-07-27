#!/usr/bin/env node

/**
 * Dist sideEffects tree-shaking gate.
 *
 * THE BUG THIS GUARDS AGAINST
 * ---------------------------
 * The Vue 3 flavour of the dist (rollup-plugin-vue v6 + preserveModules)
 * splits every SFC into three modules:
 *
 *   X.vue2.js  — the <script> options object (pure)
 *   X.vue3.js  — the compiled render function (pure)
 *   X.vue.js   — a wrapper whose ONLY job is the side effect
 *                `script.render = render` (render-attach glue)
 *
 * `dist/esm/index.js` then emits a bare, side-effect-only
 * `import './X.vue.js';` next to `export { default as X } from
 * './X.vue2.js';`. package.json#sideEffects is an ALLOWLIST: any module it
 * does not match is treated by webpack as pure, and a bare import of a pure
 * module is dropped during production tree-shaking. The pre-fix allowlist
 * only covered `.vue` sources (glob two-star-slash-star-dot-vue), which
 * does NOT match the compiled `*.vue.js` filenames — so consumers' webpack
 * shook away every render-attach wrapper and every Cn component shipped
 * render-less. Vue 3 renders a render-less component as a silent comment
 * node: blank app, zero errors, zero warnings. Observed on hermiq, where it
 * blocked a full e2e suite (consumer workaround at hermiq@a209755e).
 *
 * Two allowlist entries are needed, and BOTH were missing:
 *
 *   1. `dist/esm/index.js` — the barrel itself. A side-effect-free barrel
 *      is bypassed entirely by webpack's re-export hoisting, and its bare
 *      imports die with it — even bare imports of modules that ARE
 *      allowlisted (verified empirically against the published 2.0.7
 *      tarball: wrapper glob alone still failed). This is the same
 *      barrel-skip mechanism that once dropped the dist CSS import — see
 *      scripts/check-css-entry.js.
 *   2. The wrapper glob (dist/ two-star slash star-dot-vue-dot-js) — so
 *      that once the barrel executes, its bare wrapper imports are kept.
 *
 * WHAT THIS DOES
 * --------------
 * Reproduces the consumer side for real instead of guessing statically:
 * bundles a one-line entry that imports { CnAppRoot } from the built
 * `dist/esm/index.js` with webpack in production mode (module-graph
 * sideEffects pruning active, minification off for speed), everything
 * outside the package externalised. It then asserts that the compiled
 * render actually survived into the emitted bundle by grepping for
 * `cn-app-root` — a marker that exists ONLY in the render module
 * (template `data-testid="cn-app-root"` and class names), never in the
 * options module. If the render-attach wrapper is ever shaken again — new
 * rollup output naming, an allowlist edit, a plugin upgrade — the marker
 * disappears and this gate fails the build, instead of consumer apps
 * rendering blank with zero errors.
 *
 * On the Vue 2.7 dist the render lives inside the re-exported `X.vue.js`
 * wrapper itself, so the probe passes there by construction; the gate
 * becomes load-bearing for every dist shape that separates render from
 * options (the Vue 3 branch, and whatever future tooling emits).
 *
 * USAGE
 * -----
 *   node scripts/check-dist-sideeffects.mjs [--root <packageDir>]
 *
 * Runs after `npm run build` (needs dist/). `--root` lets you point the
 * probe at another built copy of the package (e.g. an unpacked npm
 * tarball) — webpack still resolves from this repo's node_modules.
 */

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import webpack from 'webpack'

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const args = process.argv.slice(2)
const rootFlag = args.indexOf('--root')
const pkgRoot = rootFlag !== -1 ? resolve(args[rootFlag + 1]) : scriptRoot

const distIndex = join(pkgRoot, 'dist', 'esm', 'index.js')
if (!existsSync(distIndex)) {
	console.error(`check-dist-sideeffects: ${distIndex} not found — run \`npm run build\` first.`)
	process.exit(1)
}

// Marker that only ever appears in CnAppRoot's compiled RENDER module
// (template attributes/classes), never in its options module. Its presence
// in the bundle proves the render-attach side effect survived tree-shaking.
const MARKER = 'cn-app-root'

const workDir = mkdtempSync(join(tmpdir(), 'ncvue-sideeffects-'))
const entryFile = join(workDir, 'entry.mjs')
writeFileSync(entryFile, [
	`import { CnAppRoot } from ${JSON.stringify(distIndex)}`,
	'console.log(CnAppRoot)',
	'',
].join('\n'))

const compiler = webpack({
	context: workDir,
	entry: entryFile,
	output: {
		path: join(workDir, 'out'),
		filename: 'bundle.js',
	},
	target: 'node',
	mode: 'production',
	devtool: false,
	// Module-graph sideEffects pruning (the optimization under test) is
	// independent of the minimizer; skip terser for speed.
	optimization: { minimize: false },
	// Only the package's own module graph is under test — externalise every
	// bare specifier (vue, @nextcloud/vue, …) exactly like a consumer app
	// treats its own node_modules.
	externals: ({ request }, callback) => {
		if (request && !request.startsWith('.') && !request.startsWith('/') && !/^[a-zA-Z]:[\\/]/.test(request)) {
			return callback(null, 'commonjs ' + request)
		}
		callback()
	},
	module: {
		rules: [
			{ test: /\.css$/i, type: 'asset/resource' },
		],
	},
})

compiler.run((err, stats) => {
	compiler.close(() => {})
	if (err) {
		console.error('check-dist-sideeffects: webpack failed:', err)
		process.exit(1)
	}
	if (stats.hasErrors()) {
		console.error('check-dist-sideeffects: webpack compiled with errors:')
		console.error(stats.toString({ all: false, errors: true }))
		process.exit(1)
	}

	// Scan every emitted JS asset (dynamic imports would emit extra chunks).
	const outDir = join(workDir, 'out')
	let bundled = ''
	for (const asset of stats.toJson({ all: false, assets: true }).assets) {
		if (asset.name.endsWith('.js')) {
			bundled += readFileSync(join(outDir, asset.name), 'utf8')
		}
	}
	const bytes = bundled.length
	const found = bundled.includes(MARKER)
	rmSync(workDir, { recursive: true, force: true })

	if (!found) {
		console.error(`check-dist-sideeffects: FAIL — render marker "${MARKER}" is missing from the tree-shaken consumer bundle (${bytes} bytes).`)
		console.error('')
		console.error('A production webpack build importing { CnAppRoot } from dist/esm/index.js dropped the compiled render function.')
		console.error('This is the *.vue.js render-attach wrapper being tree-shaken: the wrapper is imported for side effects only, and')
		console.error('package.json#sideEffects (an allowlist) no longer matches it — so webpack treats it as pure and prunes it.')
		console.error('Consumers then mount render-less components, which Vue 3 renders as silent comment nodes: blank app, zero errors.')
		console.error('')
		console.error('Fix: package.json#sideEffects must cover BOTH the barrel ("dist/esm/index.js" — a pure barrel is bypassed and its')
		console.error('bare imports die with it) AND the render-attach wrappers (the dist wrapper glob ending in .vue.js). If the emitted')
		console.error('filenames changed, update the globs to the new naming. Keep it an allowlist.')
		process.exit(1)
	}

	console.log(`check-dist-sideeffects: OK — render marker "${MARKER}" survived production tree-shaking (bundle ${bytes} bytes, root ${pathToFileURL(pkgRoot).pathname}).`)
})

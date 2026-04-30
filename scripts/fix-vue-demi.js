#!/usr/bin/env node
/**
 * Run vue-demi-fix on every nested copy of vue-demi in node_modules.
 *
 * We set `ignore-scripts=true` in .npmrc to block 3rd-party install scripts,
 * which means vue-demi's own postinstall (which swaps lib/index.cjs to match
 * the installed Vue version) does not run. Without it, pinia's call to
 * `vueDemi.hasInjectionContext` blows up at runtime because the Vue 2 default
 * entry of vue-demi doesn't export it.
 *
 * Our own package's postinstall script DOES run regardless of `ignore-scripts`,
 * so we use it to invoke each vue-demi's fix script ourselves.
 */
const { execFileSync } = require('child_process')
const { existsSync, readdirSync, statSync } = require('fs')
const { join } = require('path')

function findVueDemis(dir, found = []) {
	let entries
	try {
		entries = readdirSync(dir)
	} catch {
		return found
	}
	for (const entry of entries) {
		const full = join(dir, entry)
		let st
		try {
			st = statSync(full)
		} catch {
			continue
		}
		if (!st.isDirectory()) continue
		if (entry === 'vue-demi' && existsSync(join(full, 'bin/vue-demi-fix.js'))) {
			found.push(full)
			continue
		}
		// Recurse into scoped packages and nested node_modules.
		if (entry.startsWith('@') || entry === 'node_modules') {
			findVueDemis(full, found)
		} else if (existsSync(join(full, 'node_modules'))) {
			findVueDemis(join(full, 'node_modules'), found)
		}
	}
	return found
}

const root = join(__dirname, '..', 'node_modules')
if (!existsSync(root)) process.exit(0)

const copies = findVueDemis(root)
for (const dir of copies) {
	try {
		execFileSync(process.execPath, [join(dir, 'bin/vue-demi-fix.js')], { stdio: 'inherit' })
	} catch (err) {
		console.warn(`[fix-vue-demi] failed for ${dir}: ${err.message}`)
	}
}

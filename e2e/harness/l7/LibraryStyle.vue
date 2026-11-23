<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Two builds of the library on one page (?l7=library-style): the way the
  dashboard and launchpad load several apps' widgets. Each "build" installs
  its stylesheet with installLibraryStyle, as the published entry does; the
  older build styles the probe red with `!important`, the newer one green.
  `&order=new-first` installs the newer build first.
-->
<template>
	<div data-testid="library-style">
		<p class="l7-library-probe" data-testid="library-style-probe">
			Probe
		</p>
	</div>
</template>

<script>
import { installLibraryStyle } from '../../../src/utils/libraryStyle.js'

const OLD = { css: '.l7-library-probe { color: rgb(200, 0, 0) !important; }', built: '2026-09-01T10:00:00.000Z' }
const NEW = { css: '.l7-library-probe { color: rgb(0, 120, 0); }', built: '2026-10-13T10:00:00.000Z' }

export default {
	name: 'LibraryStyle',

	created() {
		const newFirst = typeof window !== 'undefined' && /[?&]order=new-first/.test(window.location.search)
		for (const build of newFirst ? [NEW, OLD] : [OLD, NEW]) {
			installLibraryStyle(build.css, build.built)
		}
	},
}
</script>

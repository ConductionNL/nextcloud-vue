<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-markdown-widget" data-testid="cn-markdown-widget" v-html="html" /><!-- eslint-disable-line vue/no-v-html -- sanitised by cnRenderMarkdown (DOMPurify) -->
</template>

<script>
import { cnRenderMarkdown } from '../../composables/cnRenderMarkdown.js'

/**
 * CnMarkdownWidget — prose inside a grid page. Renders `content.markdown`
 * through the one shared `cnRenderMarkdown` path (marked + DOMPurify), the same
 * renderer `CnWikiPage` uses, so the output is equivalent and a script tag or a
 * `javascript:` URL does not survive. Registered `markdown` and `public: true`,
 * so a public host may mount it.
 *
 * ```js
 * { widgetKey: 'markdown', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3, props: { content: { markdown: '# Welcome' } } }
 * ```
 */
export default {
	name: 'CnMarkdownWidget',

	props: {
		/**
		 * The widget's configuration: `{ markdown }`.
		 *
		 * @type {{markdown?: string}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	computed: {
		html() {
			return cnRenderMarkdown(this.content && this.content.markdown)
		},
	},
}
</script>

<style scoped>
.cn-markdown-widget {
	overflow-wrap: anywhere;
}

.cn-markdown-widget :deep(img) {
	max-width: 100%;
}
</style>

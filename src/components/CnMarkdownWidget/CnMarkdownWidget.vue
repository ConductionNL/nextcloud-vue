<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-markdown-widget" data-testid="cn-markdown-widget" v-html="html" /><!-- eslint-disable-line vue/no-v-html -- sanitised by cnRenderMarkdown (DOMPurify) -->
</template>

<script>
import { cnRenderMarkdown } from '../../composables/cnRenderMarkdown.js'
import { readPath } from '../../utils/readPath.js'

/**
 * CnMarkdownWidget — prose inside a grid page. Renders `content.markdown`
 * through the one shared `cnRenderMarkdown` path (marked + DOMPurify), the same
 * renderer `CnWikiPage` uses, so the output is equivalent and a script tag or a
 * `javascript:` URL does not survive. Registered `markdown` and `public: true`,
 * so a public host may mount it. On a detail page `content.field` names a
 * field of the record (a dot path) to render instead, such as an article's body.
 *
 * ```js
 * { widgetKey: 'markdown', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3, props: { content: { markdown: '# Welcome' } } }
 * { id: 'article-body', type: 'markdown', content: { field: 'body' } }
 * ```
 */
export default {
	name: 'CnMarkdownWidget',

	inject: {
		cnObjectContext: { default: null },
	},

	props: {
		/**
		 * The widget's configuration: `{ markdown }`, or `{ field }` to render
		 * a field of the detail page's record.
		 *
		 * @type {{markdown?: string, field?: string}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * The detail page's record, which `content.field` reads. Without it
		 * the injected detail context's object is read.
		 *
		 * @type {object|null}
		 */
		objectData: {
			type: Object,
			default: null,
		},
	},

	computed: {
		html() {
			const field = this.content && this.content.field
			if (typeof field === 'string' && field !== '') {
				const ctx = this.cnObjectContext && 'value' in this.cnObjectContext ? this.cnObjectContext.value : this.cnObjectContext
				const record = this.objectData || (ctx && ctx.object) || null
				const value = readPath(record, field)
				return cnRenderMarkdown(typeof value === 'string' ? value : '')
			}
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

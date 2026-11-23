<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div ref="root" class="cn-code-widget" data-testid="cn-code-widget">
		<CnQrCode v-if="format === 'qr' && value" :value="value" :size="size" />
		<svg v-else-if="bars"
			class="cn-code-widget__bars"
			role="img"
			:aria-label="t('nextcloud-vue', 'Barcode {value}', { value: shownValue })"
			:viewBox="`0 0 ${bars.length + 20} 60`"
			:width="size * 1.6"
			:height="size * 0.6"
			preserveAspectRatio="none"
			shape-rendering="crispEdges"
			data-testid="cn-code-widget-bars">
			<rect :width="bars.length + 20" height="60" fill="#fff" />
			<rect v-for="run in runs"
				:key="run.x"
				:x="run.x + 10"
				y="0"
				:width="run.width"
				height="60"
				fill="#000" />
		</svg>
		<p v-if="problem"
			class="cn-code-widget__problem"
			role="alert"
			data-testid="cn-code-widget-problem">
			{{ problem }}
		</p>
		<p v-else-if="shownValue && format !== 'qr'" class="cn-code-widget__value">
			{{ shownValue }}
		</p>
		<NcButton v-if="!problem && value"
			variant="tertiary"
			data-testid="cn-code-widget-download"
			@click="downloadSvg">
			{{ t('nextcloud-vue', 'Download as SVG') }}
		</NcButton>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import { encodeCode128, encodeEan13 } from '../../utils/barcode1d.js'
import { interpolateUrlTokens } from '../../utils/interpolateUrlTokens.js'
import { readPath } from '../../utils/readPath.js'
import { CnQrCode } from '../CnQrCode/index.js'

/**
 * CnCodeWidget — a record as a code on a detail page: QR, Code 128 or EAN-13,
 * drawn in the browser (the value never leaves it), with "Download as SVG".
 * Registered as the `code` widget type.
 *
 * `content`: `{ format: "qr" | "code128" | "ean13", source: "field" | "address",
 * field?, url?, size? }`. `field` reads a property of the record; `address`
 * is the record's address: `url` with `@objectId` / `@object.<field>` tokens
 * (a path is taken on this site), else the page the reader is on. Code 128
 * and EAN-13 need a field; EAN-13 takes twelve or thirteen digits.
 *
 * ```json
 * { "type": "code", "content": { "format": "code128", "source": "field", "field": "serienummer" } }
 * ```
 */
export default {
	name: 'CnCodeWidget',

	components: { CnQrCode, NcButton },

	props: {
		/** The widget content (see above). */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The record's id, for `@objectId` in `url`. */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/** The record, for `field` and `@object.<field>`. */
		objectData: {
			type: Object,
			default: null,
		},
	},

	computed: {
		format() {
			return ['qr', 'code128', 'ean13'].includes(this.content.format) ? this.content.format : 'qr'
		},

		size() {
			const size = Number(this.content.size)
			return Number.isFinite(size) && size > 0 ? size : 160
		},

		/**
		 * What the code holds: the field's value, or the record's address.
		 *
		 * @return {string}
		 * @spec openspec/changes/code-widget/specs/code-widget/spec.md#requirement-a-detail-page-can-show-a-record-as-a-code
		 */
		value() {
			if (this.content.source === 'address') {
				if (this.format !== 'qr') {
					return ''
				}
				const url = typeof this.content.url === 'string' && this.content.url !== ''
					? interpolateUrlTokens(this.content.url, { objectId: this.objectId, object: this.objectData || {} })
					: (typeof window !== 'undefined' ? window.location.href : '')
				return url.startsWith('/') && typeof window !== 'undefined' ? window.location.origin + url : url
			}
			const raw = this.content.field && this.objectData ? readPath(this.objectData, this.content.field) : undefined
			return raw === null || raw === undefined || typeof raw === 'object' ? '' : String(raw)
		},

		encoded() {
			if (!this.value || this.format === 'qr') {
				return null
			}
			if (this.format === 'ean13') {
				return encodeEan13(this.value)
			}
			const modules = encodeCode128(this.value)
			return modules ? { modules, digits: this.value } : null
		},

		bars() {
			return this.encoded ? this.encoded.modules : ''
		},

		/** @return {Array<{x: number, width: number}>} The bars as runs. */
		runs() {
			const out = []
			let start = -1
			for (let i = 0; i <= this.bars.length; i++) {
				if (this.bars[i] === '1' && start < 0) {
					start = i
				} else if (this.bars[i] !== '1' && start >= 0) {
					out.push({ x: start, width: i - start })
					start = -1
				}
			}
			return out
		},

		shownValue() {
			return this.encoded ? this.encoded.digits : this.value
		},

		problem() {
			if (this.content.source === 'address' && this.format !== 'qr') {
				return t('nextcloud-vue', 'A Code 128 or EAN-13 code takes a field of the record.')
			}
			if (!this.value) {
				return t('nextcloud-vue', 'This record has no value for the code.')
			}
			if (this.format === 'ean13' && !this.encoded) {
				return t('nextcloud-vue', 'An EAN-13 code takes twelve or thirteen digits with a valid check digit.')
			}
			if (this.format === 'code128' && !this.encoded) {
				return t('nextcloud-vue', 'A Code 128 code takes letters, digits and plain punctuation only.')
			}
			return ''
		},
	},

	methods: {
		t,

		/**
		 * Save the drawn code as an SVG file named after its value.
		 *
		 * @spec openspec/changes/code-widget/specs/code-widget/spec.md#requirement-a-detail-page-can-show-a-record-as-a-code
		 */
		downloadSvg() {
			const svg = this.$refs.root && this.$refs.root.querySelector('svg')
			if (!svg || typeof window === 'undefined' || !window.URL || typeof window.URL.createObjectURL !== 'function') {
				return
			}
			const source = new XMLSerializer().serializeToString(svg)
			const blob = new Blob([source], { type: 'image/svg+xml' })
			const href = window.URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = href
			a.download = `${String(this.shownValue).replace(/[^\w.-]+/g, '-').slice(0, 60) || 'code'}.svg`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			window.URL.revokeObjectURL(href)
		},
	},
}
</script>

<style scoped>
.cn-code-widget {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 8px;
}

.cn-code-widget__value {
	margin: 0;
	font-family: var(--font-face-monospace, monospace);
	letter-spacing: 0.1em;
}

.cn-code-widget__problem {
	margin: 0;
	color: var(--color-text-maxcontrast);
}
</style>

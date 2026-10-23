/*
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * innerHeading — the tag for a heading inside a widget (a group, section or
 * role label). In the board look it follows the outline, one level under the
 * card that holds it (utils/headingLevel.js). Outside the board look, or where
 * no card or page gives a level, it stays h4. Draw it as
 * `<component :is="innerHeadingTag" class="cn-inner-heading">`: the class
 * keeps the h4 size whatever the tag (look-board.css).
 */
import { normalizeLook } from '../composables/useLook.js'
import { HEADING_LEVEL, headingTag } from '../utils/headingLevel.js'

export default {
	inject: {
		cnInnerHeadingLevel: { from: HEADING_LEVEL, default: null },
		cnInnerHeadingLook: { from: 'cnLook', default: 'nextcloud' },
	},

	computed: {
		/**
		 * The inner heading's tag.
		 *
		 * @return {string}
		 */
		innerHeadingTag() {
			if (this.cnInnerHeadingLevel === null || normalizeLook(this.cnInnerHeadingLook) !== 'board') {
				return 'h4'
			}
			return headingTag(this.cnInnerHeadingLevel)
		},
	},
}

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * boardLookSheet: the board-look rules as text, for enableBoardLookStyle().
 *
 * Empty in the source. The published ESM build fills both constants in
 * (rollup.config.js, library-style-module) with the board-look block it cuts
 * out of the stylesheet. Apps import `css/index.css`, which then carries the
 * library sheet WITHOUT that block, and enableBoardLookStyle() puts these
 * rules on the page only where the board look is used. Consumers that bundle
 * the source get every rule from src/css/index.css and keep this empty.
 *
 * @module utils/boardLookSheet
 */

/**
 * The board-look rules (css/look-board*.css, compiled), or '' in the source.
 *
 * @type {string}
 */
// `.trim()` keeps the bundler from treating the value as a known '' and
// dropping the code that reads it before the build fills it in.
export const BOARD_LOOK_CSS = ''.trim()

/**
 * When the build that carries {@link BOARD_LOOK_CSS} was made (ISO 8601), or ''.
 *
 * @type {string}
 */
export const BOARD_LOOK_BUILT = ''.trim()

/**
 * The flags the build put in {@link BOARD_LOOK_CSS} in place of each `:has()`
 * outside a selector's subject, as [flag, compound, key]; [] in the source.
 * hasFlags.js sets them (see utils/hasFlagsTransform.js).
 *
 * @type {Array<Array<string>>}
 */
// JSON.parse keeps the bundler from treating the value as a known [].
export const BOARD_LOOK_HAS = JSON.parse('[]')

/**
 * The attribute names the compounds of {@link BOARD_LOOK_HAS} read; [] in the source.
 *
 * @type {string[]}
 */
export const BOARD_LOOK_HAS_ATTRIBUTES = JSON.parse('[]')

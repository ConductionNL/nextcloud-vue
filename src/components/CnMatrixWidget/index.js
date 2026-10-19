/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnMatrixWidget: the `matrix` widget (a categorical grid with one chosen
 * cell). It is registered in `CnWidgetGrid/registerDashboardWidgets.js`,
 * inline, because a bare side-effect import of this module may be
 * tree-shaken away.
 */

import CnMatrixWidget from './CnMatrixWidget.vue'

export { CnMatrixWidget }
export default CnMatrixWidget

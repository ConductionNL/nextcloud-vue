/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnTeamWorkloadWidget: the `team-workload` widget (the team today, with
 * each person's availability and open count). It is registered in
 * `CnWidgetGrid/registerDashboardWidgets.js`, inline, because a bare
 * side-effect import of this module may be tree-shaken away.
 */

import CnTeamWorkloadWidget from './CnTeamWorkloadWidget.vue'

export { CnTeamWorkloadWidget }
export default CnTeamWorkloadWidget

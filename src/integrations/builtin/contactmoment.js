/**
 * Built-in `contactmoment` integration registration (bespoke).
 *
 * A contactmoment is a logged interaction with a person: a phone call, a
 * counter visit, an email. pipelinq owns them, and already exposes them
 * per-entity at `GET /apps/pipelinq/api/activity/{entityType}/{entityId}`,
 * behind its own per-object owner access policy. This leaf surfaces that on
 * any object a Conduction app shows, so a case handler reads the conversation
 * history without leaving the case.
 *
 * `bareWidget` is set because `CnContactmomentCard` honours `chromeless`: on a
 * tab panel the strip already supplies the card and the title, and a card
 * drawn here would nest inside it and repeat the label.
 *
 * @module integrations/builtin/contactmoment
 */

import { translate as t } from '@nextcloud/l10n'
import CnContactmomentTab from './contactmoment/CnContactmomentTab.vue'
import CnContactmomentCard from './contactmoment/CnContactmomentCard.vue'

/**
 * `contactmoment` integration descriptor.
 *
 * @type {object}
 */
export const contactmomentIntegration = {
	id: 'contactmoment',
	label: t('nextcloud-vue', 'Contact moments'),
	icon: 'PhoneOutline',
	requiredApp: 'pipelinq',
	order: 22,
	group: 'comms',
	referenceType: 'contactmoment',
	tab: CnContactmomentTab,
	widget: CnContactmomentCard,
	bareWidget: true,
	defaultSize: { w: 3, h: 3 },
	appName: 'Pipelinq',
}

export default contactmomentIntegration

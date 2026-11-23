# Proposal: banner-action-dispatch

## Why

DqMijnWerk's "Vandaag eerst" names one case and offers "Termijn opschorten" on it. An attention card's action could only
route, link out or emit an `action` event that no dashboard page handles, so a card could not open a dialog on the case it
names.

## What changes

An attention-card action with a `type` and no `route` or `href` is a manifest action. It is dispatched through the page's
`cnDispatchAction` with its `@subject.<path>` tokens filled from the card's subject. Without a dispatcher, the action
emits `action` as before.

## Scope

nextcloud-vue CnBannerWidget; dossiq's First today card uses it (R22-DASH). The widgetKey form's schema for banner actions
is unchanged; the `type` form passes its content through.

## Why

Woo capability row 13.30, "Every screen says which environment it belongs to,
so acceptance is not mistaken for production". Our column reads `no`: "no
screen states its environment. Nearest: openregister
lib/Service/TenantLifecycleService.php stores an OTAP environment
(development/test/acceptance/production) on an Organisation for promotion
order, and integriq lib/Settings/register.d/environments-and-promotion.json
names an acceptance source; neither renders a banner or label in any UI". The
gap register names the missing half: "Every app screen shows a non dismissable
environment label (development, test, acceptance) read from instance
configuration or the organisation OTAP field; production shows nothing."
Build plan: new spec, wave 1, size S. No Ruben decision governs it.

## What Changes

- `CnAppRoot` and `CnAdminSettingsShell` render a label at the top of every
  screen when the environment is `development`, `test` or `acceptance`: the
  environment's name in words, a distinct colour per environment from
  CSS variables, not dismissable, and announced once as a landmark note. The
  browser tab title gets a prefix (`[ACC]`, `[TEST]`, `[DEV]`), so a tab
  says it too.
- The environment comes from, in order: a new optional `environment` prop on
  `CnAppRoot` and `CnAdminSettingsShell`, which an app fills from its own
  instance setting when it has one; else the active organisation's
  `environment` field that OpenRegister already serves
  (`Organisation::jsonSerialize()` returns `environment`, default
  `production`; read through the existing tenant context,
  `useTenantContext().activeOrganisation`); else nothing.
- `production`, an unknown value, or no value shows nothing.
- A new `CnEnvironmentBanner` component, exported, so an app that does not
  mount `CnAppRoot` can place it itself.

## What it does not do

- No instance-wide setting is added to OpenRegister here. The organisation
  field is the configuration that exists today. An instance-wide key that
  every app reads (an OpenRegister capability such as
  `openregister.environment`) would be an OpenRegister change of its own; it is
  named in the lane report as a follow-up, not specified here, because building
  against a capability that does not exist would compile and do nothing.

## Consuming apps

Every app that mounts `CnAppRoot` or `CnAdminSettingsShell` gets the label on
its next `^2` update, with nothing to change in the app. Measured in the
workspace checkouts, which may lag `development`: openregister, opencatalogi,
integriq, filinq, stackiq, larpinq, launchpad, dossiq, pipelinq, shillinq,
learniq, portaliq, decidiq, buildiq, keepiq, hermiq, humaniq and planninq
mount `CnAppRoot`; thematiq and versioniq do not and would place
`CnEnvironmentBanner` themselves. zaakafhandelapp is out of scope for fleet
sweeps. Portals rendered by portaliq for citizens are not app screens and do
not get the label.

## Not a breaking change

Additive only: a new optional prop on two components, a new component and a
new export. On a production instance, and on every instance where no
organisation sets an environment, nothing renders and the tab title is
unchanged. The release is a minor on the `2.x` line through a `feat:` commit.
A `BREAKING CHANGE:` footer, a `!` in the commit type, or a major version is
not allowed (Ruben, 2026-09-19).

## Fail closed

- The label cannot be dismissed, hidden by a user setting, or scrolled away:
  it is part of the shell, not a notification.
- A failure to read the organisation shows nothing rather than a wrong label,
  and logs one warning. It never shows "production".
- The prop wins over the organisation, so an app that knows its instance is
  acceptance can say so even when an organisation is mislabelled.

## App absent

OpenRegister absent: there is no organisation; only the prop can set the
label. An app on an older `^2` release shows nothing, as today.

## Dependencies and wave

None. Wave 1.

## Done

Merged on `development` with CI green and released as a `2.x` minor. Row 13.30
is `production` once a consuming app ships a store release on that version.

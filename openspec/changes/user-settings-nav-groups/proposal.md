# Proposal: user-settings-nav-groups

## Why

Board DqPersoonlijkeInstellingen draws the user settings with Nextcloud's own personal settings (Persoonlijke info,
Beveiliging, ..., Privacy) first in the left list, then one entry for the app ("Dossiq") holding its sections, and an
icon before each section heading. The board user settings dialog listed only the app's registered sections, and
drew section icons in the navigation only.

## What changes

- `nextcloudLinks` on CnUserSettingsDialog (CnAppRoot `userSettingsNextcloudLinks`): links listed first, then one entry
  named after the app with its sections under it. Nextcloud exposes no API for its personal sections to an app page,
  so the list is configured (`section` id or `href`).
- A section's `#icon` also stands before its heading.
- The dialog provides NcAppSettingsSection's legacy-design key, so a real section no longer warns.

Board look only; without the key the navigation is unchanged. No schema change.

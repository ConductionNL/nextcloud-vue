# A saved view named by its uuid in the address applies

## Why

OpenRegister answers a view with a numeric `id` and its `uuid`. Menu entries and links name the uuid, so `?savedView=<uuid>` found nothing: DqFilterInMenu stayed on "Alle zaken" in COMPDIFF r23 (view 551f656a).

## What changes

`applySavedViewFromRoute` also matches the view's `uuid`.

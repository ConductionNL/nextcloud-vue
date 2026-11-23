# A roadmap can be drawn as three columns

## Why
larpinq's roadmap page shows Gepland, In ontwikkeling and Beschikbaar with counts (`admin-roadmap-page` task 1.1).
CnRoadmapTab drew the open issues as one grid of cards.

## What changes
CnRoadmapTab takes `layout: "columns"` and `inProgressLabels`. In columns it asks the proxy for `state: all` and draws
Planned (open), In development (open with an in-progress label) and Available (closed as completed), each with its
count. CnFeaturesAndRoadmapPage, CnFeaturesAndRoadmapView and CnFeaturesBoard pass `roadmapLayout` and
`roadmapInProgressLabels` through, only when set, so pages that set neither render exactly as before.

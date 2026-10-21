---
kind: code
---

# Proposal: week-view

## Summary

learniq draws timetables in two custom views (MyTimetable, 960 lines, and TimetableLookup, 570): a week of items from
an endpoint as day columns, previous / next / today, a Today / Week switch, times, status badges, a note about the
source, today's changes, and actions per lesson (join online, add a note, manage). CnWeekStripWidget draws a week of
items from OpenRegister with no navigation, badges or actions. It grows into the week view; `fillItemTokens` is the
shared filler of `@item` tokens in actions.

## Scope

CnWeekStripWidget grows; utils/itemTokens.js is new. Docs, jest specs.

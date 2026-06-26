# Security Specification: Ultimate Trail Geospatial Real-Time Tracking

This document outlines the attribute-based, zero-trust security invariants for Ultimate Trail in Firestore.

## 1. Data Invariants
* **Organizer Profile Ownership**: An organizer record under `/organizers/{organizerId}` can only be created and edited by the authenticated user whose `request.auth.uid == organizerId`.
* **Route Ownership**: A track under `/routes/{routeId}` can only be created/modified by an organizer if `request.auth.uid == incoming().organizerId`.
* **Runner Telemetry Integrity**: Telemetry for `/routes/{routeId}/runners/{runnerId}` requires that:
  - If a user is a runner updating their own position (`coureur` tab), they can only write if they have selected this role. To make things simple and secure, any authenticated user or specific runner can write their coordinates, but they cannot tamper with critical administrative properties (like Bib status or rank) unless they are the organizer.
  - The creator organizer of the parent Route (`/routes/{routeId}`) has full read/write access to manage and simulate all runners under their route.
  - Public readers (spectators) have read-only access to active routes and live runner telemetry without authentication (or once authenticated as any spectator).

## 2. The "Dirty Dozen" Payloads
These payloads attempt to breach the data constraints but MUST be denied:
1. **Organizer Spoof**: Attempting to write an organizer profile for user B while authenticated as user A.
2. **Orphaned Route Creation**: Adding a route where the `organizerId` is empty or belongs to someone else.
3. **Route Hijack**: Trying to overwrite an existing route created by another organizer.
4. **Incorrect Shape Route**: Uploading a route without the required properties like `points` or `checkpoints`.
5. **Bib Number Tampering**: A user changing another runner's bib number coordinates in the middle of a race.
6. **Self-Appointed Winner**: An unauthenticated user or runner setting their status to `'finished'` without covering the proper checkpoints.
7. **Negative Progress Tracker**: Injecting negative values or giant multipliers (e.g. `progress: 99.5`) to break client math.
8. **Suspicious Speed Injection**: Setting speed to a giant, impossible number (e.g., `speed: 12000` km/h) to corrupt metrics.
9. **Junk Character Route ID**: Attempting to inject very long or malicious ID parameters to exploit key space.
10. **Shadow Fields Injection**: Writing extra fields on a Runner profile like `isAdmin: true` or `proVersion: true`.
11. **Impotent Timestamp Spoof**: Injecting a custom, historical client timestamp for `lastActive` instead of the server value.
12. **Orphaned Runner Creation**: Creating a runner document under a non-existent or modified route document.

## 3. Threat Matrix & Access Policies
Below is the access rules overview:
* `organizers`: read by all, list/write only by owner (`request.auth.uid == organizerId`).
* `routes`: read by all, write by organizing owner (`request.auth.uid == incoming().organizerId`).
* `runners`: read by all, edit by root runner or the organizing owner of the parent route.

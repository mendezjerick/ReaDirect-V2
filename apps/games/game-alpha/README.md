# ReaDirect Game Alpha

This directory is a contributor-ready, isolated game slot. Work on Game Alpha
stays within this directory until the project owner separately approves an
integration change.

The contributor repository root must match this directory exactly so it can be
merged without relocating files. Before development, complete `GAME_DESIGN.md`
and assign a permanent game key. The frontend must use React with exactly one
approved engine: KAPLAY or PixiJS.

The slot is intentionally inactive. Its frontend route, lobby entry, Laravel
service provider, catalog record, migrations, and APIs are not registered in
the host applications until the game passes the integration checklist.

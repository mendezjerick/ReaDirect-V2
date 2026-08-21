# ReaDirect Game Lobby

This owner-controlled module is the authenticated learner game selection
surface. It owns learner username onboarding, the game registry, queued
achievement presentation, and navigation to registered game modules.

Guest profiles and game saves use the browser-local Guest data adapter. They
never create a server account or appear in staff directories.

Production route: /learner/games (authenticated learners and active Guests)

Only the ReaDirect maintainer may change the registry. A game module must expose
the versioned manifest defined by the game module standard before it can be
registered here.

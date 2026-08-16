# ReaDirect Game Lobby

This owner-controlled module is the authenticated learner game selection
surface. It owns learner username onboarding, the game registry, queued
achievement presentation, and navigation to registered game modules.

Public Guest authentication and persistence are not currently supported.
Anonymous visitors to the production route receive a clear unavailable state;
no Guest account, session, or game-save identity is created.

Production route: /learner/games (authenticated learners)

Only the ReaDirect maintainer may change the registry. A game module must expose
the versioned manifest defined by the game module standard before it can be
registered here.

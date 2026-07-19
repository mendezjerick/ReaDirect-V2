# ReaDirect Game Lobby

This owner-controlled module is the learner and verified-guest game selection
surface. It owns username onboarding, separate learner and guest leaderboard
views, the game registry, queued achievement presentation, and navigation to
registered game modules.

Production route: /learner/games

Only the ReaDirect maintainer may change the registry. A game module must expose
the versioned manifest defined by the game module standard before it can be
registered here.

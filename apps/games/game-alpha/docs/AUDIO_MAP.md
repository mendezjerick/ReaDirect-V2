# Game Alpha Audio Map

The project owner selected these source effects by listening to them. The
mapping is intentional and must not be rearranged based on filename semantics.
Runtime copies use descriptive lowercase kebab-case names only so game code and
asset paths remain maintainable.

The supplied effects are licensed for commercial use with attribution. The
required credit is: **Sound effects by SoundsbyDane.**

| Game event                  | Source basename  | Runtime basename             | Playback rule                         |
| --------------------------- | ---------------- | ---------------------------- | ------------------------------------- |
| Player shot                 | `Shoot2`         | `player-shot`                | Polyphonic, short cooldown            |
| Basic enemy destroyed       | `Enemy_Dies`     | `basic-enemy-destroyed`      | Maximum four voices                   |
| Strong enemy damaged        | `Enemy_Damage`   | `strong-enemy-hit`           | One-shot                              |
| Strong enemy destroyed      | `Thunder`        | `strong-enemy-destroyed`     | Maximum two voices                    |
| Special enemy destroyed     | `Bomb_Explosion` | `special-enemy-destroyed`    | Maximum two voices                    |
| Enemy dive group            | `Scream`         | `enemy-dive`                 | One at a time per group               |
| Normal enemy projectile     | `Shoot`          | `enemy-projectile`           | Maximum three voices                  |
| Special charged attack      | `Charge2`        | `special-charge`             | One at a time                         |
| Player ship explosion       | `Monster1`       | `ship-explosion`             | One at a time                         |
| Alphabet ally hit           | `Magic`          | `ally-hit-warning`           | Play before ship explosion            |
| Formation pulse             | `Find_Money`     | `formation-pulse`            | Scheduled pulse, not a loop           |
| Enemy transformation        | `Magic3`         | `enemy-morph`                | One-shot                              |
| Tractor beam start          | `Encounter`      | `tractor-start`              | One-shot                              |
| Tractor beam active         | `alien`          | `tractor-loop`               | Loop only during active beam          |
| Tractor capture complete    | `Hero_Dies`      | `tractor-capture-complete`   | One-shot                              |
| Player captured             | `Find_Item`      | `player-captured`            | One-shot                              |
| Fighter rescued/double ship | `Item_Appears`   | `fighter-rescued`            | One-shot                              |
| Captured fighter destroyed  | `Monster2`       | `captured-fighter-destroyed` | One-shot                              |
| Menu selection              | `Select`         | `menu-select`                | One-shot                              |
| Menu cancel                 | `Cancel`         | `menu-cancel`                | One-shot                              |
| One-heart warning           | `Health`         | `low-heart-warning`          | Pulse every 800 ms, not seamless loop |

Stage introduction, wave clear, challenge start/result/perfect, extra-life, and
game-over jingles remain intentionally unassigned until suitable music or
jingle assets are supplied.

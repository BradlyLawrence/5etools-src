# Character Creators

Standalone character-creator tools that run on top of this 5etools install. They load rules data from `../data/` and work with the same static server used for the main site.

## Requirements

Serve the repo root (already set up with `npm run serve:dev`):

```bash
npm run serve:dev
```

Then open:

| Page | URL |
|------|-----|
| Hub | http://localhost:5050/character-creators/ |
| D&D 2024 | http://localhost:5050/character-creators/dnd-2024/ |
| Lord of the Rings Roleplaying | http://localhost:5050/character-creators/lotr-rpg/ |

## Features (D&D 2024)

- Guided level-1 creation (species, background, abilities, class)
- Live character sheet
- Level up (1–20, single class)
- Save / load character JSON files
- Export to PDF (or browser print)

## Features (Lord of the Rings Roleplaying)

- Free League homebrew (`TLotRR`) vendored under `lotr-rpg/data/` and listed in `homebrew/`
- Extra table content in `homebrew/Middle-earth Cultures (Homebrew).json` (`MECultures`):
  - Cultures: **Man of Gondor**, **Rider of Rohan**, **Beorning**
  - Elf subculture: **Mirkwood** (under Free League Elf; use official **Dwarf → Erebor** for Dwarves of Erebor)
  - Loaded by the LOTR creator and browsable on the main site (Races / Feats) when local homebrew is active
- Cultures (races + subcultures), backgrounds, callings (classes)
- Starting virtue, level-up virtues/crafts, titles/ways/paths
- Middle-earth skills (Explore, Hunting, Old Lore, Riddle, Travel)
- Shadow score, JSON save/load (`fileType: "5etools-char-lotr"`), PDF export

## Character JSON

- D&D 2024: `fileType: "5etools-char-2024"` — see `shared/schema.md`
- LOTR RPG: `fileType: "5etools-char-lotr"`

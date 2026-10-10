# Pathfinder rules explorer

Self-contained static page. No changes to the D&D or LOTR creators, shared code, hub, dependencies or saved characters are required. No external fonts, scripts, services or browser storage are used.

For a local preview from the repository root:

```powershell
python -m http.server 5052 --bind 127.0.0.1
```

Open http://127.0.0.1:5052/character-creators/pathfinder/ . Stop the preview with Ctrl+C.

Deploy the entire `character-creators/pathfinder` folder to the matching location on the host. Nothing has been published automatically. JavaScript modules must be served with a JavaScript MIME type (`.mjs`). Entry links use URL fragments and need no server routing rules.

The published `data/catalogue.json` is generated from the sibling `pathfinder-core` project. Do not hand-edit it. Refresh from that project:

```powershell
node tools/export-explorer.mjs
```

The export uses the workshop's existing loader, preserving approved rules, saved homebrew, prerequisites, indexes, trait definitions and technology actions. It never exports characters or backups. This is a browsing catalogue, not a complete rules-engine bundle. Classes include all 11 core classes, the four approved additions and the partial Ironwright draft. Races are not yet included. Class references are compiled from the existing local JSON and campaign documents using Python during export. Reference links open the original source; campaign overrides appear above the original class text.

Run explorer checks from this folder with `node --test explorer.test.mjs`.

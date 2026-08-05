# Character JSON schema (`5etools-char-2024`)

| Field | Description |
|-------|-------------|
| `fileType` | Always `"5etools-char-2024"` |
| `schemaVersion` | Integer; currently `1` |
| `identity` | Name, player, alignment, notes |
| `level` | Total character level (1–20) |
| `abilities` | Final scores + `base` scores before background bonuses + method |
| `species` | `{ uid, size, choices }` |
| `background` | `{ uid, abilityChoice, originFeatUid, equipmentPackage, equipmentChoices }` |
| `class` | `{ uid, levels, subclassUid, skillChoices, featureChoices, hp*, equipmentPackage, equipmentChoices }` |
| `equipmentChoices` | Map of package line index → item UID for “choose a gaming set / tool / instrument” rows |
| `feats` | Array of `{ uid, levelGained, choices }` |
| `spells` | Cantrips / prepared / known UIDs + casting ability |
| `equipment` | Free-form list of gear strings |
| `levelHistory` | Audit trail of level-up choices |

Entity references use lowercase UIDs: `name|source` (e.g. `fighter|xphb`).

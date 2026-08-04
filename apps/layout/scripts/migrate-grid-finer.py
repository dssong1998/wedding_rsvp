#!/usr/bin/env python3
"""Rewrite preset JSON files: cellPx 16→8, grid 2×, upscale bg cells & positions."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRESETS = ROOT / "src" / "data" / "presets"
GENERATED = ROOT / "src" / "data" / "generated" / "backgrounds"

LEGACY_CELL_PX = 16
CELL_PX = 8
SCALE = LEGACY_CELL_PX // CELL_PX


def upgrade_doc(doc: dict) -> dict:
    grid = doc.get("grid") or {}
    if grid.get("cellPx") != LEGACY_CELL_PX:
        return doc

    next_doc = json.loads(json.dumps(doc))
    next_doc["grid"] = {
        "cellPx": CELL_PX,
        "width": grid["width"] * SCALE,
        "height": grid["height"] * SCALE,
    }

    bg = next_doc.setdefault("background", {})
    old_cells = bg.get("cells") or {}
    new_cells: dict[str, dict] = {}
    for key, ref in old_cells.items():
        xs, ys = key.split(",", 1)
        x, y = int(xs), int(ys)
        for dy in range(SCALE):
            for dx in range(SCALE):
                new_cells[f"{x * SCALE + dx},{y * SCALE + dy}"] = ref
    bg["cells"] = new_cells

    for item in next_doc.get("items") or []:
        item["x"] = item["x"] * SCALE
        item["y"] = item["y"] * SCALE

    for spawn_key in ("spawnGroom", "spawnBride"):
        if spawn_key in next_doc:
            next_doc[spawn_key]["x"] *= SCALE
            next_doc[spawn_key]["y"] *= SCALE

    for portal in next_doc.get("portals") or []:
        portal["x"] *= SCALE
        portal["y"] *= SCALE

    boundary = next_doc.get("boundary")
    if boundary:
        next_doc["boundary"] = {
            "minX": boundary["minX"] * SCALE,
            "minY": boundary["minY"] * SCALE,
            "maxX": boundary["maxX"] * SCALE + (SCALE - 1),
            "maxY": boundary["maxY"] * SCALE + (SCALE - 1),
        }

    return next_doc


def migrate_file(path: Path) -> None:
    doc = json.loads(path.read_text())
    before = doc.get("grid", {})
    upgraded = upgrade_doc(doc)
    after = upgraded.get("grid", {})
    path.write_text(json.dumps(upgraded, ensure_ascii=False, indent=2) + "\n")
    bg_count = len(upgraded.get("background", {}).get("cells") or {})
    print(
        f"{path.name}: cellPx {before.get('cellPx')}→{after.get('cellPx')}, "
        f"{before.get('width')}×{before.get('height')}→{after.get('width')}×{after.get('height')}, "
        f"{bg_count} bg cells"
    )


def main() -> None:
    for directory in (PRESETS, GENERATED):
        if not directory.is_dir():
            continue
        for path in sorted(directory.glob("*.json")):
            migrate_file(path)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Sample docs/floor_plan PNGs → venue background JSON (grass / path / tree)."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FLOOR = ROOT / "docs" / "floor_plan"
OUT = ROOT / "src" / "data" / "generated" / "backgrounds"

GRID_W = 120
GRID_H = 85
CELL_PX = 16

GRASS = {"sheet": "rpg", "index": 915}
PATH_INDICES = [7, 9]
TREE_INDEX = 531  # RPG 10행 19열 (1-based, 17열에서 2열 뒤)
WALL = {"sheet": "indoor", "index": 16}

VENUES = {
    "campus_map": "full_view.png",
    "side_garden": "side_garden.png",
    "main_garden": "main_garden.png",
    "main_building_1f": "Main_Building.png",
    "w_house": "W_house.png",
}


def classify_pixel(r: int, g: int, b: int) -> str:
    brightness = (r + g + b) / 3
    mx, mn = max(r, g, b), min(r, g, b)
    sat = mx - mn
    if brightness < 70:
        return "dark"
    if g >= max(r, b) + 6 and g > 110 and (g - min(r, b)) > 8:
        return "grass"
    if sat < 45 and 95 < brightness < 240:
        return "path"
    return "tree"


def tile_for(kind: str, x: int, y: int, venue_id: str) -> dict:
    if kind == "grass":
        return dict(GRASS)
    if kind == "path":
        idx = PATH_INDICES[(x + y) % len(PATH_INDICES)]
        return {"sheet": "rpg", "index": idx}
    if kind == "dark":
        if venue_id in ("main_building_1f", "w_house"):
            return dict(WALL)
        idx = PATH_INDICES[(x + y) % len(PATH_INDICES)]
        return {"sheet": "rpg", "index": idx}
    return {"sheet": "rpg", "index": TREE_INDEX}


def sample_venue(venue_id: str, filename: str) -> dict:
    im = Image.open(FLOOR / filename).convert("RGB")
    w, h = im.size
    cells: dict[str, dict] = {}
    kinds: dict[str, int] = {}

    for gy in range(GRID_H):
        for gx in range(GRID_W):
            px = int((gx + 0.5) / GRID_W * w)
            py = int((gy + 0.5) / GRID_H * h)
            r, g, b = im.getpixel((min(px, w - 1), min(py, h - 1)))
            kind = classify_pixel(r, g, b)
            kinds[kind] = kinds.get(kind, 0) + 1
            cells[f"{gx},{gy}"] = tile_for(kind, gx, gy, venue_id)

    default = dict(GRASS)

    print(f"  {venue_id}: {kinds}")

    return {
        "venueId": venue_id,
        "grid": {"cellPx": CELL_PX, "width": GRID_W, "height": GRID_H},
        "defaultTile": default,
        "cells": cells,
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for venue_id, filename in VENUES.items():
        print(filename)
        doc = sample_venue(venue_id, filename)
        out_path = OUT / f"{venue_id}.json"
        out_path.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")))
        print(f"    → {out_path} ({len(doc['cells'])} cells)")


if __name__ == "__main__":
    main()

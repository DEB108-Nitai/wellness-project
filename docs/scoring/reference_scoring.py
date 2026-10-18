"""
Independent reference implementation of the scoring algorithm in PRD §3.3.
The PHP ScoringService must reproduce these numbers exactly (golden tests).

Usage:
  python reference_scoring.py golden [path-to-open-psychometrics-data.csv]
      -> writes golden.json (norm set v1) and golden_v2.json (norm set v2), each with fixed answer
         patterns + 5 real dataset rows

Norm set v1 (ipip16-op2019-v1): factor sten = round half away from zero (2·z + 5.5), clamped 1..10.
Norm set v2 (ipip16-op2019-v2): factor sten read from stens.json (the real score distribution,
standard sten cut-points); z and percentile as in v1. Global domains use 2·z + 5.5 in both.
"""
import csv
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
FACTORS = ["A", "B", "C", "E", "F", "G", "H", "I", "L", "M", "N", "O", "Q1", "Q2", "Q3", "Q4"]

with open(os.path.join(HERE, "norms.json"), encoding="utf-8") as fh:
    NORMS = json.load(fh)
with open(os.path.join(HERE, "stens.json"), encoding="utf-8") as fh:
    STENS = json.load(fh)
VERSIONS = {NORMS["version"]: None, STENS["version"]: STENS["factors"]}

ITEMS = []  # (item_code, factor, keyed)
with open(os.path.join(HERE, "ipip16_items.tsv"), encoding="utf-8") as fh:
    next(fh)
    for line in fh:
        code, factor, keyed, _text = line.rstrip("\n").split("\t", 3)
        ITEMS.append((code, factor, keyed))


def round_half_away(x: float) -> int:
    return int(math.floor(abs(x) + 0.5)) * (1 if x >= 0 else -1)


def sten(z: float) -> int:
    return max(1, min(10, round_half_away(2 * z + 5.5)))


def band(s: int) -> str:
    return "low" if s <= 3 else "high" if s >= 8 else "average"


def score(answers: dict, version: str = NORMS["version"]) -> dict:
    """answers: item_code -> 1..5 for all 163 scored items."""
    table = VERSIONS[version]
    raw = {f: 0 for f in FACTORS}
    for code, factor, keyed in ITEMS:
        value = answers[code]
        raw[factor] += value if keyed == "+" else 6 - value

    factors, z = {}, {}
    for f in FACTORS:
        n = NORMS["factors"][f]
        z[f] = (raw[f] - n["mean"]) / n["sd"]
        s = sten(z[f]) if table is None else table[f][str(raw[f])]
        factors[f] = {
            "raw": raw[f],
            "z": round(z[f], 6),
            "sten": s,
            "percentile": n["percentiles"][str(raw[f])],
            "band": band(s),
        }

    domains = {}
    for code, g in NORMS["globals"].items():
        composite = sum(w * z[f] for f, w in g["weights"].items())
        zg = (composite - g["mean"]) / g["sd"]
        s = sten(zg)
        domains[code] = {"composite": round(composite, 6), "z": round(zg, 6), "sten": s, "band": band(s)}
    return {"factors": factors, "domains": domains}


def golden(data_csv: str | None) -> None:
    for version, name in ((NORMS["version"], "golden.json"), (STENS["version"], "golden_v2.json")):
        write_golden(data_csv, version, name)


def write_golden(data_csv: str | None, version: str, file_name: str) -> None:
    cases = []
    codes = [c for c, _, _ in ITEMS]
    for name, fn in [
        ("all-1", lambda i, c: 1),
        ("all-3", lambda i, c: 3),
        ("all-5", lambda i, c: 5),
        ("cycle-1-to-5", lambda i, c: i % 5 + 1),
        ("agree-positive-keyed", lambda i, c: 5 if ITEMS[i][2] == "+" else 1),
    ]:
        answers = {c: fn(i, c) for i, c in enumerate(codes)}
        cases.append({"name": name, "answers": answers, "expected": score(answers, version)})

    if data_csv:
        with open(data_csv, encoding="utf-8") as fh:
            reader = csv.reader(fh, delimiter="\t")
            header = [h.strip('"') for h in next(reader)]
            col = {h: i for i, h in enumerate(header)}
            taken = 0
            for row in reader:
                try:
                    answers = {c: int(row[col[c]]) for c in codes}
                except (ValueError, IndexError):
                    continue
                if 0 in answers.values():
                    continue
                cases.append({"name": f"dataset-row-{taken + 1}", "answers": answers, "expected": score(answers, version)})
                taken += 1
                if taken == 5:
                    break

    with open(os.path.join(HERE, file_name), "w", encoding="utf-8") as fh:
        json.dump({"norm_version": version, "cases": cases}, fh, indent=1)
    print(f"wrote {len(cases)} golden cases to {file_name}")


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "golden":
        golden(sys.argv[2] if len(sys.argv) > 2 else None)
    else:
        print(__doc__)

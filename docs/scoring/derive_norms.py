"""
Derive IPIP-16PF item key + population norms from the Open Psychometrics dataset.

Source data : https://openpsychometrics.org/_rawdata/16PF.zip  (data.csv, tab separated)
Item key    : https://ipip.ori.org/new16PFKey.htm / new16PFTable.htm
              In the dataset each scale lists its positively keyed items first,
              then its negatively keyed items (counts below match the IPIP table).

Usage:  python derive_norms.py <path-to-data.csv> <path-to-items.txt> <out-dir>
Outputs: ipip16_items.tsv, norms.json  (consumed by the MySQL seed generator)

Standard library only - no pandas required.
"""
import csv
import json
import math
import statistics as st
import sys

DATA, ITEMS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]

NORM_VERSION = "ipip16-op2019-v1"

# dataset scale letter -> (16PF factor code, number of positively keyed items)
SCALES = {
    "A": ("A", 7), "B": ("B", 8), "C": ("C", 5), "D": ("E", 6),
    "E": ("F", 6), "F": ("G", 5), "G": ("H", 5), "H": ("I", 6),
    "I": ("L", 6), "J": ("M", 7), "K": ("N", 5), "L": ("O", 7),
    "M": ("Q1", 5), "N": ("Q2", 7), "O": ("Q3", 5), "P": ("Q4", 7),
}

# Signed membership of primaries in the five 16PF global factors (16PF5 structure)
GLOBALS = {
    "EX": ("Extraversion",     {"A": 1, "F": 1, "H": 1, "N": -1, "Q2": -1}),
    "AX": ("Anxiety",          {"C": -1, "L": 1, "O": 1, "Q4": 1}),
    "TM": ("Tough-Mindedness", {"A": -1, "I": -1, "M": -1, "Q1": -1}),
    "IN": ("Independence",     {"E": 1, "H": 1, "L": 1, "Q1": 1}),
    "SC": ("Self-Control",     {"F": -1, "G": 1, "M": -1, "Q3": 1}),
}

texts = {}
with open(ITEMS, encoding="utf-8") as fh:
    for line in fh:
        code, text = line.rstrip("\n").split("\t", 1)
        texts[code] = text

with open(DATA, encoding="utf-8") as fh:
    rows = list(csv.reader(fh, delimiter="\t"))
hdr = [h.strip('"') for h in rows[0]]
col = {h: i for i, h in enumerate(hdr)}

scale_items = {}
for h in hdr:
    if h[:1] in SCALES and h[1:].isdigit():
        scale_items.setdefault(h[0], []).append(h)
all_items = [h for s in scale_items.values() for h in s]
assert len(all_items) == 163, len(all_items)


def keyed(item):
    return 1 if int(item[1:]) <= SCALES[item[0]][1] else -1


# Keep complete responses from respondents aged 13-100
good = []
for r in rows[1:]:
    try:
        v = {h: int(r[col[h]]) for h in all_items}
        age = int(r[col["age"]])
    except (ValueError, IndexError):
        continue
    if 0 in v.values() or not (13 <= age <= 100):
        continue
    good.append(v)
N = len(good)

factors, raw = {}, {}
for s, items in scale_items.items():
    code = SCALES[s][0]
    scores = [sum(v[h] if keyed(h) == 1 else 6 - v[h] for h in items) for v in good]
    k = len(items)
    item_var = sum(st.pvariance([v[h] if keyed(h) == 1 else 6 - v[h] for v in good]) for h in items)
    alpha = k / (k - 1) * (1 - item_var / st.pvariance(scores))
    # Empirical mid-rank percentile for every attainable raw score
    counts = {}
    for x in scores:
        counts[x] = counts.get(x, 0) + 1
    pct, below = {}, 0
    for x in range(k, 5 * k + 1):
        c = counts.get(x, 0)
        pct[x] = round(100 * (below + c / 2) / N, 1)
        below += c
    raw[code] = scores
    factors[code] = {
        "items": k, "mean": round(st.fmean(scores), 4), "sd": round(st.pstdev(scores), 4),
        "alpha": round(alpha, 3), "percentiles": pct,
    }

z = {f: [(x - factors[f]["mean"]) / factors[f]["sd"] for x in raw[f]] for f in raw}
globals_out = {}
for gcode, (name, weights) in GLOBALS.items():
    comp = [sum(w * z[f][i] for f, w in weights.items()) for i in range(N)]
    globals_out[gcode] = {"name": name, "weights": weights,
                          "mean": round(st.fmean(comp), 4), "sd": round(st.pstdev(comp), 4)}

with open(f"{OUT}/norms.json", "w", encoding="utf-8") as fh:
    json.dump({"version": NORM_VERSION, "n": N, "source": "openpsychometrics.org 16PF dataset",
               "factors": factors, "globals": globals_out}, fh, indent=1)

with open(f"{OUT}/ipip16_items.tsv", "w", encoding="utf-8", newline="") as fh:
    fh.write("item_code\tfactor\tkeyed\ttext\n")
    for h in all_items:
        fh.write(f"{h}\t{SCALES[h[0]][0]}\t{'+' if keyed(h) == 1 else '-'}\t{texts[h]}\n")

print(f"N={N}")
for f, d in factors.items():
    print(f"{f:3} k={d['items']:2} mean={d['mean']:6.2f} sd={d['sd']:5.2f} alpha={d['alpha']:.2f}")
for g, d in globals_out.items():
    print(g, d["name"], d["mean"], d["sd"])

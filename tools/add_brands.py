"""Add Oppo, Vivo, Xiaomi (incl. Redmi/POCO) and Realme models (launch price > ₹15,000) to zipphive-catalog.json.
Repair structure is copied from OnePlus Nord 4; prices are scaled by price tier (illustrative – edit in Admin → Phone prices)."""
import json, copy, math, sys
P = sys.argv[1]
d = json.load(open(P))
brands = {b["name"]: b["id"] for b in d["brands"]}
nid = max(b["id"] for b in d["brands"]) + 1
for name in ["Oppo", "Vivo", "Xiaomi", "Realme"]:
    if name not in brands:
        d["brands"].append({"id": nid, "name": name}); brands[name] = nid; nid += 1

# tier: 1 = ₹15–20k, 2 = ₹20–30k, 3 = ₹30–45k, 4 = ₹45–75k, 5 = ₹75k+
MODELS = {
 "Oppo": [("Find X9 Pro","Find X Series",5),("Find X9","Find X Series",4),("Find X8 Pro","Find X Series",5),("Find X8","Find X Series",4),
          ("Reno 14 Pro","Reno Series",4),("Reno 14","Reno Series",3),("Reno 13 Pro","Reno Series",4),("Reno 13","Reno Series",3),
          ("Reno 12 Pro","Reno Series",3),("Reno 12","Reno Series",3),("Reno 11 Pro","Reno Series",3),("Reno 11","Reno Series",2),
          ("F31 Pro+","F Series",3),("F31 Pro","F Series",2),("F29 Pro","F Series",2),("F29","F Series",2),("F27 Pro+","F Series",2),
          ("K13","K & A Series",1),("A5 Pro","K & A Series",1)],
 "Vivo": [("X300 Pro","X Series",5),("X300","X Series",4),("X200 Pro","X Series",5),("X200","X Series",4),("X200 FE","X Series",4),
          ("X100 Pro","X Series",5),("X100","X Series",4),("V60","V Series",3),("V50","V Series",3),("V50e","V Series",2),
          ("V40 Pro","V Series",4),("V40","V Series",3),("V30 Pro","V Series",3),("V30","V Series",3),
          ("T4 Ultra","T Series",3),("T4","T Series",2),("T3 Ultra","T Series",3),("T3 Pro","T Series",2),("Y300","Y Series",2)],
 "Xiaomi": [("Xiaomi 15 Ultra","Xiaomi Flagship",5),("Xiaomi 15","Xiaomi Flagship",4),("Xiaomi 14 Ultra","Xiaomi Flagship",5),("Xiaomi 14","Xiaomi Flagship",4),
            ("Xiaomi 14 CIVI","Xiaomi Flagship",3),("Redmi Note 14 Pro+","Redmi Note Series",2),("Redmi Note 14 Pro","Redmi Note Series",2),
            ("Redmi Note 14 5G","Redmi Note Series",1),("Redmi Note 13 Pro+","Redmi Note Series",2),("Redmi Note 13 Pro","Redmi Note Series",2),
            ("POCO F7","POCO Series",3),("POCO F6","POCO Series",2),("POCO X7 Pro","POCO Series",2),("POCO X7","POCO Series",1)],
 "Realme": [("GT 8 Pro","GT Series",4),("GT 7 Pro","GT Series",4),("GT 7","GT Series",3),("GT 7T","GT Series",3),("GT 6","GT Series",3),("GT 6T","GT Series",2),
            ("Realme 15 Pro","Number Series",3),("Realme 15","Number Series",2),("Realme 14 Pro+","Number Series",2),("Realme 14 Pro","Number Series",2),
            ("Realme 13 Pro+","Number Series",2),("Realme 13 Pro","Number Series",2),("Realme 12 Pro+","Number Series",2),
            ("P3 Ultra","P Series",2),("P3 Pro","P Series",2),("Narzo 80 Pro","Narzo Series",1)],
}
# template: OnePlus Nord 4 (≈₹30k phone) → tier 3
tpl = next(m for m in d["models"] if m["name"] == "OnePlus Nord 4")
tsku = d["skus"]
# part multipliers per tier: displays scale more steeply than small parts
DISP = {1: .55, 2: .75, 3: 1.0, 4: 1.75, 5: 2.7}
PART = {1: .65, 2: .8, 3: 1.0, 4: 1.35, 5: 1.75}
nice = lambda x: max(99, int(math.ceil(x / 100.0) * 100) - 1)
def mrp_of(p): return nice(p * 1.3)

# collapse colour-specific SKUs of the template into one generic SKU per part type
GENERIC = {"Back Panel": "Back Panel", "Power Button": "Power Button", "Volume Button": "Volume Button"}
mid = max(m["id"] for m in d["models"]) + 1
code = 900001
added = []
for brand, lst in MODELS.items():
    bid = brands[brand]
    for name, series, tier in lst:
        full = name if brand == "Xiaomi" or name.startswith(("Realme", "Redmi", "POCO", "Xiaomi")) else f"{brand} {name}"
        if brand == "Realme" and not name.startswith("Realme"): full = f"Realme {name}"
        if any(m["name"] == full for m in d["models"]): continue
        made = {}   # template sku / generic key -> new sku code
        def newsku(old):
            global code
            k = tsku[old]
            if old.startswith("S") or k["type"] == "Screen Guard" or k["label"] == "Screen Guard":
                return old  # diagnosis and screen guard are shared
            label = k["label"]
            for g in GENERIC:
                if label.startswith(g): label = GENERIC[g]
            if label in made: return made[label]
            if label == "Display Compatible" and tier >= 4: return None   # no compatible panels for flagships
            mult = DISP[tier] if label.startswith("Display") else PART[tier]
            price = nice(k["price"] * mult)
            c = f"Z{code}"; code += 1
            d["skus"][c] = {"label": label, "type": k["type"], "price": price, "mrp": mrp_of(price), "warrantyMonths": k["warrantyMonths"]}
            made[label] = c
            return c
        reps = {}
        for sid, r in tpl["repairs"].items():
            r2 = copy.deepcopy(r)
            if "skus" in r2:
                r2["skus"] = [x for x in dict.fromkeys(newsku(s) for s in r2["skus"]) if x]
            else:
                r2["answers"] = [{**a, "skus": [x for x in dict.fromkeys(newsku(s) for s in a["skus"]) if x]} for a in r2["answers"]]
                r2["answers"] = [a for a in r2["answers"] if a["skus"]]
            reps[sid] = r2
        d["models"].append({"id": mid, "brandId": bid, "name": full, "series": series, "colours": [], "image": "", "repairs": reps})
        added.append((brand, full, tier, d["skus"][made["Display OEM"]]["price"])); mid += 1
d["meta"]["notes"] += " Oppo / Vivo / Xiaomi / Realme models (launch price above ₹15,000) added with illustrative tier-based prices (SKU codes Z9xxxxx)."
json.dump(d, open(P, "w"), ensure_ascii=False, separators=(",", ":"))
for a in added: print(a)
print(len(added), "models added; skus now", len(d["skus"]))

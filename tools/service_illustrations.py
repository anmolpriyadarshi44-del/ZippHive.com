"""ZippHive-themed flat illustrations for every non-cleaning service item (AC, AMC, washing machine,
plumber, electrician, phone repair issues, service covers). Original artwork, same style as
tools/clean_illustrations.py: teal/yellow palette, hexagon pattern, yellow-gloved hand with the Z sleeve logo.

    python3 tools/service_illustrations.py zh-img
"""
import math, os, sys

T, TD, TN, M, M2, Y, YD, CR, W, G = "#0B6E6E", "#074848", "#042F31", "#E6F4F3", "#CFE9E6", "#FFC93C", "#F2B200", "#FFF4CC", "#FFFFFF", "#DCE8E7"
STEEL, BLUE, RED, GREEN = "#A9BDBC", "#7FD3CD", "#E5533D", "#2E9D63"


def hexpts(cx, cy, r):
    return " ".join(f"{cx + r*math.cos(math.radians(a)):.1f},{cy + r*math.sin(math.radians(a)):.1f}" for a in (-90, -30, 30, 90, 150, 210))


def svg(body, warm=False, dark=False):
    bg1, bg2 = (TN, "#0B4F50") if dark else ((CR, "#FFE9A8") if warm else (M, M2))
    stroke, op = ("#fff", ".07") if dark else (T, ".08")
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="800" height="800">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{bg1}"/><stop offset="1" stop-color="{bg2}"/></linearGradient>
<pattern id="hx" width="40" height="46" patternUnits="userSpaceOnUse"><polygon points="{hexpts(20,23,19)}" fill="none" stroke="{stroke}" stroke-opacity="{op}" stroke-width="1.5"/></pattern>
<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9F8F7"/><stop offset="1" stop-color="#BFE3E0"/></linearGradient>
<linearGradient id="scr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0E8080"/><stop offset="1" stop-color="{TN}"/></linearGradient></defs>
<rect width="400" height="400" fill="url(#bg)"/><rect width="400" height="400" fill="url(#hx)"/>
{body}
</svg>'''


def logo(cx, cy, r=9):
    return (f'<polygon points="{hexpts(cx,cy,r)}" fill="{Y}"/><path d="M{cx-r*.38:.1f} {cy-r*.42:.1f}h{r*.76:.1f}l-{r*.6:.1f} {r*.84:.1f}h{r*.6:.1f}" '
            f'fill="none" stroke="{TN}" stroke-width="{r*.22:.1f}" stroke-linejoin="round" stroke-linecap="round"/>')


def glove(x, y, rot=0, hold=""):
    return f'''<g transform="translate({x},{y}) rotate({rot})">
<rect x="-170" y="-24" width="176" height="48" rx="20" fill="{T}"/><rect x="-170" y="-24" width="176" height="12" rx="6" fill="#0E8080" opacity=".6"/>{logo(-60,0,10)}
<rect x="0" y="-27" width="22" height="54" rx="8" fill="{YD}"/>{hold}
<rect x="16" y="-25" width="50" height="50" rx="20" fill="{Y}"/>
<rect x="44" y="-24" width="40" height="13" rx="6.5" fill="{Y}" stroke="{YD}" stroke-width="2"/><rect x="48" y="-11" width="40" height="13" rx="6.5" fill="{Y}" stroke="{YD}" stroke-width="2"/>
<rect x="46" y="2" width="38" height="13" rx="6.5" fill="{Y}" stroke="{YD}" stroke-width="2"/><rect x="40" y="14" width="32" height="12" rx="6" fill="{Y}" stroke="{YD}" stroke-width="2"/>
<ellipse cx="38" cy="-28" rx="18" ry="9" transform="rotate(-20 38 -28)" fill="{Y}" stroke="{YD}" stroke-width="2"/></g>'''


# tools held in hand coordinates (hand points along +x, grip at ~x 60)
WRENCH = f'<rect x="56" y="-7" width="96" height="14" rx="7" fill="{STEEL}"/><path d="M146-20a20 20 0 1 1 0 40l6-12h10v-16h-10z" fill="{STEEL}"/>'
SCREW = f'<rect x="56" y="-9" width="44" height="18" rx="7" fill="{T}"/><rect x="98" y="-3" width="50" height="6" fill="{STEEL}"/><path d="M148-3l10 3-10 3z" fill="{STEEL}"/>'
TESTER = f'<rect x="56" y="-8" width="56" height="16" rx="6" fill="{Y}" stroke="{YD}" stroke-width="2"/><rect x="110" y="-3" width="44" height="6" fill="{STEEL}"/><circle cx="72" cy="0" r="4" fill="{RED}"/>'
NOZZLE = f'<rect x="56" y="-8" width="60" height="16" rx="6" fill="{TN}"/><rect x="114" y="-4" width="26" height="8" rx="3" fill="{STEEL}"/>'
DRILL = f'<rect x="50" y="-20" width="78" height="34" rx="12" fill="{T}"/><rect x="60" y="10" width="22" height="36" rx="8" fill="{TN}"/><rect x="126" y="-8" width="18" height="12" fill="{STEEL}"/><rect x="142" y="-4" width="34" height="5" fill="{STEEL}"/>'
PROBE = f'<rect x="56" y="-6" width="50" height="12" rx="6" fill="{RED}"/><rect x="104" y="-2" width="40" height="4" fill="{STEEL}"/>'
PLUNGER = f'<rect x="56" y="-5" width="120" height="10" rx="5" fill="#C98B4E"/><path d="M174-30q30 30 0 60z" fill="{RED}"/>'
CLOTH = f'<rect x="64" y="-26" width="52" height="40" rx="10" fill="{BLUE}"/><path d="M70-14h40M70 0h40" stroke="#5CBDB5" stroke-width="3"/>'
LEVEL = f'<rect x="56" y="-12" width="120" height="24" rx="6" fill="{Y}" stroke="{YD}" stroke-width="2"/><rect x="104" y="-6" width="24" height="12" rx="6" fill="#B8F0C8" stroke="{GREEN}" stroke-width="2"/>'


def spark(x, y, s=1, c=Y):
    return f'<path transform="translate({x},{y}) scale({s})" d="M0-16C2-4 4-2 16 0 4 2 2 4 0 16-2 4-4 2-16 0-4-2-2-4 0-16z" fill="{c}"/>'


def floor(cy=350, rx=150, op=".13"):
    return f'<ellipse cx="200" cy="{cy}" rx="{rx}" ry="16" fill="{TN}" opacity="{op}"/>'


def drops(pts, c=BLUE):
    return "".join(f'<path transform="translate({x},{y}) scale({s})" d="M0-14C6-4 10 2 10 6a10 10 0 0 1-20 0c0-4 4-10 10-20z" fill="{c}"/>' for x, y, s in pts)


def waves(x, y, s=1, c=T):
    return f'<g transform="translate({x},{y}) scale({s})" fill="none" stroke="{c}" stroke-width="6" stroke-linecap="round"><path d="M0-14q10 14 0 28"/><path d="M14-26q20 26 0 52"/><path d="M28-38q30 38 0 76"/></g>'


# ---------- badge glyphs (drawn around 0,0 inside a yellow hex)
GL = {
    "drop": f'<path d="M0-18C8-6 13 2 13 7a13 13 0 0 1-26 0c0-5 5-13 13-25z" fill="{TN}"/>',
    "bolt": f'<path d="M4-20-12 4h10l-4 16 18-24H2z" fill="{TN}"/>',
    "plus": f'<path d="M0-16v32M-16 0h32" stroke="{TN}" stroke-width="7" stroke-linecap="round"/>',
    "minus": f'<path d="M-16 0h32" stroke="{TN}" stroke-width="7" stroke-linecap="round"/>',
    "check": f'<path d="M-14 0l9 9 19-19" stroke="{TN}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    "x": f'<path d="M-12-12l24 24M12-12l-24 24" stroke="{TN}" stroke-width="7" stroke-linecap="round"/>',
    "wrench": f'<g transform="rotate(-45)"><rect x="-4" y="-4" width="26" height="8" rx="4" fill="{TN}"/><path d="M-6-14a12 12 0 1 0 0 28l4-8h-6v-12h6z" fill="{TN}"/></g>',
    "gear": f'<circle r="11" fill="none" stroke="{TN}" stroke-width="7"/>' + "".join(f'<rect x="-4" y="-20" width="8" height="9" rx="2" fill="{TN}" transform="rotate({a})"/>' for a in range(0, 360, 45)),
    "thermo": f'<rect x="-5" y="-20" width="10" height="28" rx="5" fill="none" stroke="{TN}" stroke-width="4"/><circle cy="12" r="8" fill="{RED}"/><rect x="-2" y="-8" width="4" height="18" fill="{RED}"/>',
    "sound": f'<path d="M-16-6h8l10-8v28l-10-8h-8z" fill="{TN}"/><path d="M8-8q6 8 0 16M14-14q12 14 0 28" stroke="{TN}" stroke-width="4" fill="none" stroke-linecap="round"/>',
    "rotate": f'<path d="M12-8A14 14 0 1 0 14 6" stroke="{TN}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M6-18l10 10-14 2z" fill="{TN}"/>',
    "swap": f'<path d="M-16-6h28M-16 8h28" stroke="{TN}" stroke-width="5" stroke-linecap="round"/><path d="M8-14l10 8-10 8zM-8 0l-10 8 10 8z" fill="{TN}"/>',
    "snow": f'<path d="M0-18v36M-16-9l32 18M-16 9l32-18" stroke="{TN}" stroke-width="5" stroke-linecap="round"/>',
    "shield": f'<path d="M0-18l15 6v8c0 10-6 18-15 22-9-4-15-12-15-22v-8z" fill="{TN}"/><path d="M-6 0l4 4 8-8" stroke="{Y}" stroke-width="4" fill="none" stroke-linecap="round"/>',
    "wifi": f'<path d="M-16-4a22 22 0 0 1 32 0M-10 3a14 14 0 0 1 20 0" stroke="{TN}" stroke-width="5" fill="none" stroke-linecap="round"/><circle cy="12" r="4" fill="{TN}"/>',
    "spark": '<path d="M0-18C2-5 5-2 18 0 5 2 2 5 0 18-2 5-5 2-18 0-5-2-2-5 0-18z" fill="#042F31"/>',
    "block": f'<circle r="14" fill="none" stroke="{TN}" stroke-width="6"/><path d="M-10 10 10-10" stroke="{TN}" stroke-width="6"/>',
    "cal": f'<rect x="-16" y="-14" width="32" height="30" rx="5" fill="none" stroke="{TN}" stroke-width="5"/><path d="M-16-4h32M-8-20v10M8-20v10" stroke="{TN}" stroke-width="5" stroke-linecap="round"/>',
    "q": f'<path d="M-8-8a8 8 0 1 1 10 8c-2 1-2 3-2 6" stroke="{TN}" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="0" cy="15" r="3.5" fill="{TN}"/>',
}


def badge(g, x=330, y=72, r=42):
    return f'<polygon points="{hexpts(x,y,r)}" fill="{Y}" stroke="#fff" stroke-width="5"/><g transform="translate({x},{y})">{GL[g]}</g>'


# ---------- objects
def split_ac(x=60, y=100, w=280, h=96):
    vents = "".join(f'<line x1="{x+24}" y1="{y+h-24+i*8}" x2="{x+w-24}" y2="{y+h-24+i*8}" stroke="{G}" stroke-width="3"/>' for i in range(2))
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="22" fill="#fff" stroke="{G}" stroke-width="3"/><rect x="{x}" y="{y}" width="{w}" height="22" rx="11" fill="#F4FAF9"/>'
            f'{vents}<rect x="{x+w-70}" y="{y+34}" width="40" height="14" rx="5" fill="{TN}"/><text x="{x+w-50}" y="{y+45}" font-family="Arial" font-size="11" font-weight="700" text-anchor="middle" fill="#7FD3CD">24°</text>{logo(x+30,y+42,11)}')


def window_ac(x=110, y=110, w=180, h=150):
    grille = "".join(f'<line x1="{x+18}" y1="{y+22+i*12}" x2="{x+w*0.58}" y2="{y+22+i*12}" stroke="{G}" stroke-width="5" stroke-linecap="round"/>' for i in range(9))
    return (f'<rect x="{x-14}" y="{y-14}" width="{w+28}" height="{h+28}" rx="10" fill="{T}"/><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="16" fill="#fff" stroke="{G}" stroke-width="3"/>{grille}'
            f'<rect x="{x+w*0.66}" y="{y+22}" width="{w*0.26}" height="40" rx="6" fill="{TN}"/><circle cx="{x+w*0.72}" cy="{y+86}" r="9" fill="{G}"/><circle cx="{x+w*0.86}" cy="{y+86}" r="9" fill="{G}"/>{logo(x+w*0.79,y+124,11)}')


def outdoor(x=110, y=170, w=180, h=140):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="#F4FAF9" stroke="{G}" stroke-width="3"/><circle cx="{x+w*0.4}" cy="{y+h/2}" r="{h*0.36}" fill="#fff" stroke="{STEEL}" stroke-width="4"/>'
            + "".join(f'<line x1="{x+w*0.4-h*0.32}" y1="{y+h/2+d}" x2="{x+w*0.4+h*0.32}" y2="{y+h/2+d}" stroke="{G}" stroke-width="3"/>' for d in range(-36, 40, 12))
            + f'<path d="M{x+w*0.4} {y+h/2}l20-26M{x+w*0.4} {y+h/2}l-28 4M{x+w*0.4} {y+h/2}l8 30" stroke="{T}" stroke-width="10" stroke-linecap="round"/><circle cx="{x+w*0.4}" cy="{y+h/2}" r="7" fill="{TN}"/>'
            + f'<rect x="{x+w*0.78}" y="{y+18}" width="{w*0.14}" height="{h-36}" rx="5" fill="{G}"/>')


def washer(x=118, y=82, w=164, h=230, door="water"):
    cx, cy = x + w / 2, y + h * 0.58
    inner = {"water": f'<path d="M{cx-46} {cy+6}q23-14 46 0t46 0v8a48 48 0 0 1-92 0z" fill="{BLUE}"/>',
             "spin": f'<path d="M{cx+30} {cy-16}a36 36 0 1 0 6 26" stroke="{T}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M{cx+22} {cy-30}l18 8-14 14z" fill="{T}"/>',
             "empty": ""}[door]
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="18" fill="#fff" stroke="{G}" stroke-width="3"/><rect x="{x}" y="{y}" width="{w}" height="46" rx="18" fill="#F4FAF9"/>'
            f'<rect x="{x+16}" y="{y+16}" width="52" height="14" rx="5" fill="{TN}"/><circle cx="{x+w-30}" cy="{y+23}" r="11" fill="{G}"/><circle cx="{x+w-30}" cy="{y+23}" r="5" fill="{T}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="58" fill="{T}"/><circle cx="{cx}" cy="{cy}" r="46" fill="url(#glass)"/>{inner}<path d="M{cx-26} {cy-26}l14-12" stroke="#fff" stroke-width="6" stroke-linecap="round"/>'
            f'<rect x="{x+10}" y="{y+h}" width="18" height="10" rx="3" fill="{TN}"/><rect x="{x+w-28}" y="{y+h}" width="18" height="10" rx="3" fill="{TN}"/>')


def tap(x=170, y=150):
    return (f'<rect x="{x-60}" y="{y-80}" width="40" height="40" rx="8" fill="{STEEL}"/><path d="M{x-40} {y-60}h60a26 26 0 0 1 26 26v24" fill="none" stroke="#C8D6D5" stroke-width="22" stroke-linecap="round"/>'
            f'<rect x="{x-10}" y="{y-112}" width="36" height="16" rx="8" fill="{T}"/><rect x="{x+2}" y="{y-98}" width="10" height="26" fill="{STEEL}"/><rect x="{x+34}" y="{y-12}" width="24" height="12" rx="4" fill="{STEEL}"/>')


def basin(x=100, y=220, w=200):
    return (f'<rect x="{x-10}" y="{y-12}" width="{w+20}" height="18" rx="7" fill="#fff" stroke="{G}" stroke-width="2"/><path d="M{x+14} {y+6}h{w-28}c-6 40-36 60-{(w-28)/2} 60s-{(w-28)/2-6}-20-{(w-28)/2} -60z" fill="#fff" stroke="{G}" stroke-width="2"/>'
            f'<rect x="{x+w/2-16}" y="{y+62}" width="32" height="70" rx="8" fill="#fff" stroke="{G}" stroke-width="2"/>')


def pipe_h(y=210, x1=30, x2=370, c=STEEL):
    return f'<rect x="{x1}" y="{y-14}" width="{x2-x1}" height="28" rx="10" fill="{c}"/><rect x="{(x1+x2)/2-22}" y="{y-22}" width="44" height="44" rx="8" fill="{T}"/>'


def flush_tank():
    return (f'<rect x="120" y="70" width="160" height="110" rx="16" fill="#fff" stroke="{G}" stroke-width="3"/><rect x="188" y="58" width="24" height="14" rx="5" fill="{T}"/>'
            f'<rect x="120" y="70" width="160" height="22" rx="11" fill="#F4FAF9"/><path d="M200 180v40" stroke="{STEEL}" stroke-width="16"/>'
            f'<path d="M126 220h148c0 50-30 80-74 80s-74-30-74-80z" fill="#fff" stroke="{G}" stroke-width="3"/><rect x="118" y="212" width="164" height="16" rx="8" fill="{T}"/><rect x="168" y="296" width="64" height="40" rx="8" fill="#fff" stroke="{G}" stroke-width="3"/>')


def geyser():
    return (f'<rect x="138" y="60" width="124" height="220" rx="56" fill="#fff" stroke="{G}" stroke-width="3"/><rect x="138" y="140" width="124" height="34" fill="{T}"/>{logo(200,157,12)}'
            f'<circle cx="200" cy="236" r="16" fill="{TN}"/><circle cx="200" cy="236" r="7" fill="{RED}"/><path d="M170 280v50M230 280v50" stroke="{STEEL}" stroke-width="12"/><path d="M170 330h-50M230 330h50" stroke="{STEEL}" stroke-width="12" stroke-linecap="round"/>'
            f'<circle cx="164" cy="330" r="8" fill="{BLUE}"/><circle cx="236" cy="330" r="8" fill="{RED}"/>')


def motor():
    return (f'<rect x="100" y="210" width="200" height="22" rx="6" fill="{TD}"/><rect x="120" y="140" width="130" height="80" rx="24" fill="{T}"/>'
            + "".join(f'<line x1="{x}" y1="148" x2="{x}" y2="212" stroke="{TD}" stroke-width="4"/>' for x in range(140, 240, 16))
            + f'<rect x="246" y="156" width="40" height="48" rx="10" fill="{STEEL}"/><path d="M286 180h60v-90" stroke="{BLUE}" stroke-width="16" fill="none" stroke-linecap="round"/><path d="M120 180H50v60" stroke="{BLUE}" stroke-width="16" fill="none" stroke-linecap="round"/>{logo(185,180,13)}')


def tank():
    return (f'<path d="M110 120h180l-10 200H120z" fill="{T}"/>' + "".join(f'<line x1="{114+i*0.0}" y1="{150+i*44}" x2="{286}" y2="{150+i*44}" stroke="{TD}" stroke-width="5"/>' for i in range(4))
            + f'<ellipse cx="200" cy="120" rx="90" ry="22" fill="#0E8080"/><ellipse cx="200" cy="114" rx="36" ry="10" fill="{TN}"/>{logo(200,240,22)}')


def switchboard(x=110, y=110, w=180, h=150, sockets=True):
    sw = "".join(f'<rect x="{x+22+i*38}" y="{y+26}" width="28" height="44" rx="6" fill="#F4FAF9" stroke="{G}" stroke-width="2"/><rect x="{x+28+i*38}" y="{y+30}" width="16" height="18" rx="3" fill="{T if i%2 else Y}"/>' for i in range(4))
    so = f'<circle cx="{x+w/2}" cy="{y+108}" r="26" fill="#F4FAF9" stroke="{G}" stroke-width="2"/><circle cx="{x+w/2-10}" cy="{y+102}" r="4" fill="{TN}"/><circle cx="{x+w/2+10}" cy="{y+102}" r="4" fill="{TN}"/><circle cx="{x+w/2}" cy="{y+118}" r="5" fill="{TN}"/>' if sockets else ""
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="16" fill="#fff" stroke="{G}" stroke-width="3"/>{sw}{so}'


def fan(cx=200, cy=150, spin=False):
    blades = "".join(f'<ellipse cx="{cx}" cy="{cy}" rx="120" ry="16" fill="{T}" transform="rotate({a} {cx} {cy}) translate(60 0)"/>' for a in (0, 120, 240))
    return (f'<rect x="{cx-6}" y="20" width="12" height="{cy-40}" fill="{STEEL}"/><rect x="{cx-22}" y="20" width="44" height="12" rx="5" fill="#fff" stroke="{G}" stroke-width="2"/>'
            f'<g transform="scale(1 .45) translate(0 {cy*1.22:.0f})">{blades}</g><circle cx="{cx}" cy="{cy}" r="26" fill="#fff" stroke="{G}" stroke-width="3"/>{logo(cx,cy,12)}'
            + (f'<path d="M{cx-150} {cy+60}a160 60 0 0 0 300 0" stroke="{T}" stroke-width="4" fill="none" stroke-dasharray="10 10"/>' if spin else ""))


def tube_light():
    return (f'<rect x="60" y="120" width="280" height="40" rx="20" fill="#fff" stroke="{G}" stroke-width="3"/><rect x="72" y="128" width="256" height="24" rx="12" fill="#FFF9DF"/>'
            f'<rect x="50" y="116" width="26" height="48" rx="6" fill="{T}"/><rect x="324" y="116" width="26" height="48" rx="6" fill="{T}"/>'
            + "".join(f'<path d="M{x} 182l{d} 40" stroke="{Y}" stroke-width="6" stroke-linecap="round"/>' for x, d in [(110, -14), (160, -6), (200, 0), (240, 6), (290, 14)]))


def mcb():
    br = "".join(f'<rect x="{106+i*48}" y="150" width="40" height="90" rx="6" fill="#fff" stroke="{G}" stroke-width="2"/><rect x="{116+i*48}" y="{168 if i!=2 else 196}" width="20" height="26" rx="4" fill="{Y if i!=2 else RED}"/>' for i in range(4))
    return f'<rect x="84" y="100" width="232" height="200" rx="16" fill="{T}"/><rect x="98" y="138" width="204" height="114" rx="8" fill="{TD}"/>{br}{logo(200,120,10)}'


def inverter():
    return (f'<rect x="70" y="120" width="140" height="160" rx="16" fill="#fff" stroke="{G}" stroke-width="3"/><rect x="88" y="140" width="104" height="40" rx="8" fill="{TN}"/><rect x="98" y="152" width="60" height="16" rx="4" fill="#7FD3CD"/>{logo(140,230,16)}'
            f'<rect x="230" y="160" width="110" height="120" rx="12" fill="{T}"/><rect x="246" y="146" width="20" height="16" rx="3" fill="{RED}"/><rect x="304" y="146" width="20" height="16" rx="3" fill="{TN}"/>'
            f'<path d="M262 220l-12 20h16l-10 22" stroke="{Y}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M210 200c20 0 20-60 46-56" stroke="{RED}" stroke-width="6" fill="none"/>')


def doorbell():
    return (f'<rect x="60" y="40" width="150" height="300" rx="10" fill="{T}"/><circle cx="186" cy="200" r="9" fill="{Y}"/><rect x="230" y="150" width="70" height="110" rx="20" fill="#fff" stroke="{G}" stroke-width="3"/>'
            f'<circle cx="265" cy="205" r="24" fill="{Y}"/><circle cx="265" cy="205" r="10" fill="{YD}"/>{waves(310,205,.9)}')


def phone(x=120, y=40, w=160, h=300, screen="url(#scr)"):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="28" fill="{TN}"/><rect x="{x+9}" y="{y+9}" width="{w-18}" height="{h-18}" rx="21" fill="{screen}"/>'
            f'<rect x="{x+w/2-24}" y="{y+18}" width="48" height="12" rx="6" fill="{TN}"/>')


def phone_back(x=120, y=40, w=160, h=300, glass=T):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="28" fill="{glass}" stroke="{TN}" stroke-width="6"/>'
            f'<rect x="{x+14}" y="{y+14}" width="70" height="80" rx="18" fill="{TN}"/><circle cx="{x+36}" cy="{y+36}" r="13" fill="#1B2B2B" stroke="{STEEL}" stroke-width="3"/>'
            f'<circle cx="{x+36}" cy="{y+72}" r="13" fill="#1B2B2B" stroke="{STEEL}" stroke-width="3"/><circle cx="{x+66}" cy="{y+54}" r="6" fill="{Y}"/>{logo(x+w/2,y+h/2+30,22)}')


def cracks(x=200, y=170):
    return f'<path d="M{x} {y}l-40-60M{x} {y}l50-44M{x} {y}l-60 34M{x} {y}l30 70M{x} {y}l60 20M{x-40} {y-60}l-14 20M{x+50} {y-44}l20 6M{x+30} {y+70}l-18 16" stroke="#fff" stroke-width="3" fill="none" opacity=".9"/>'


def foldable(open_=True):
    if open_:
        return (f'<rect x="60" y="80" width="280" height="230" rx="22" fill="{TN}"/><rect x="70" y="90" width="260" height="210" rx="16" fill="url(#scr)"/>'
                f'<line x1="200" y1="86" x2="200" y2="304" stroke="#0A3B3C" stroke-width="4"/>')
    return phone(130, 50, 140, 290)


def scene(body, g=None, warm=False, dark=False):
    return svg(body + (badge(g) if g else ""), warm, dark)


S = {}
# ---------------- AC (service & repair, installation)
WALL = f'<rect x="0" y="0" width="400" height="400" fill="#fff" opacity=".25"/>'
S["ac-jet"] = scene(f'{split_ac()}{glove(392,262,200,NOZZLE)}<path d="M248 214l-60-60" stroke="{BLUE}" stroke-width="10" stroke-linecap="round" stroke-dasharray="2 14"/>{drops([(150,250,1),(180,280,.8),(210,240,.7)])}<path d="M70 196h260l-30 120H100z" fill="#7FD3CD" opacity=".35"/>{spark(80,70,1.1)}', "drop")
S["ac-foam"] = scene(f'{split_ac()}' + "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fff" stroke="{T}" stroke-opacity=".3" stroke-width="2"/>' for x, y, r in [(110,200,18),(140,212,14),(176,204,20),(212,214,15),(246,204,18),(280,212,13),(310,200,16),(130,236,10),(196,240,12),(266,236,10)]) + f'{glove(392,300,200,NOZZLE)}{spark(80,70,1.1)}', "spark")
S["ac-check"] = scene(f'{split_ac()}<path d="M120 230q10 20 0 40M170 230q10 20 0 40M220 230q10 20 0 40" stroke="{RED}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".7"/>{glove(392,300,200,TESTER)}', "thermo")
cyl = lambda x, full=True: (f'<rect x="{x}" y="180" width="70" height="140" rx="30" fill="{T}"/><rect x="{x+22}" y="160" width="26" height="24" rx="6" fill="{STEEL}"/><text x="{x+35}" y="262" font-family="Arial" font-size="15" font-weight="800" text-anchor="middle" fill="#fff">R32</text>'
                            f'<circle cx="{x+120}" cy="170" r="34" fill="#fff" stroke="{TN}" stroke-width="6"/><path d="M{x+120} 170l{20 if full else -6} -22" stroke="{RED}" stroke-width="5" stroke-linecap="round"/><path d="M{x+48} 172q40-30 40-2" stroke="{TN}" stroke-width="6" fill="none"/>')
S["ac-gastop"] = scene(f'{split_ac(60,40,280,80)}{cyl(110,False)}{floor(330,140)}', "plus")
S["ac-gasfull"] = scene(f'{split_ac(60,40,280,80)}{cyl(90)}<rect x="250" y="250" width="90" height="70" rx="12" fill="{Y}"/><circle cx="295" cy="285" r="18" fill="{TN}"/>{floor(330,150)}', "check")
S["ac-leak"] = scene(f'{split_ac()}{drops([(120,230,1.1),(170,262,.9),(230,236,1.2),(270,280,.8),(150,310,1)])}<ellipse cx="200" cy="340" rx="110" ry="14" fill="{BLUE}" opacity=".6"/>{glove(392,250,200,WRENCH)}', "drop")
S["ac-noise"] = scene(f'<g transform="rotate(-2 200 150)">{split_ac()}</g><path d="M46 110l-14 14 14 14M354 110l14 14-14 14" stroke="{T}" stroke-width="6" fill="none" stroke-linecap="round"/>{waves(70,250,1,RED)}{glove(392,280,200,WRENCH)}', "sound")
pcb = f'<rect x="90" y="190" width="220" height="130" rx="10" fill="#2E8B57"/>' + "".join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="3" fill="{c}"/>' for x, y, w, h, c in [(110,210,50,30,TN),(176,214,26,26,"#222"),(220,208,70,18,STEEL),(116,260,24,40,Y),(156,268,60,12,"#D4AF37"),(232,250,50,50,TN)]) + "".join(f'<path d="M{x} 196v-6" stroke="#D4AF37" stroke-width="3"/>' for x in range(100, 300, 12))
S["ac-pcb"] = scene(f'{split_ac(60,40,280,80)}{pcb}{glove(392,240,200,PROBE)}', "bolt")
S["ac-install"] = scene(f'{split_ac(70,130,260,90)}<path d="M70 100h260" stroke="{T}" stroke-width="6" stroke-dasharray="12 10"/>{glove(20,80,0,DRILL)}{glove(392,270,200,LEVEL)}', "plus", warm=True)
S["ac-uninstall"] = scene(f'<path d="M70 70h260" stroke="{T}" stroke-width="6" stroke-dasharray="12 10"/><g transform="rotate(-6 200 200)">{split_ac(70,150,260,90)}</g><path d="M200 100v36" stroke="{T}" stroke-width="8" stroke-linecap="round"/><path d="M188 126l12 16 12-16z" fill="{T}"/>{floor(330,140)}{glove(392,300,190,SCREW)}', "minus", warm=True)
truck = f'<rect x="60" y="210" width="190" height="100" rx="12" fill="{T}"/><path d="M250 236h60l34 40v34H250z" fill="{TD}"/><rect x="266" y="246" width="40" height="28" rx="5" fill="url(#glass)"/><circle cx="110" cy="318" r="22" fill="{TN}"/><circle cx="110" cy="318" r="9" fill="{STEEL}"/><circle cx="296" cy="318" r="22" fill="{TN}"/><circle cx="296" cy="318" r="9" fill="{STEEL}"/>{logo(155,260,20)}'
S["ac-shift"] = scene(f'{split_ac(80,90,180,64)}{truck}', "swap", warm=True)
S["ac-stand"] = scene(f'<rect x="70" y="60" width="26" height="290" fill="{G}"/>{outdoor(130,120,190,150)}<path d="M96 290h240M96 290l70-70" stroke="{TN}" stroke-width="10" stroke-linecap="round"/>{glove(20,340,-30,WRENCH)}', "wrench", warm=True)
S["ac-split"] = scene(f'{split_ac(60,110,280,100)}<path d="M120 236c10 30 10 60 0 90M200 236c10 30 10 60 0 90M280 236c10 30 10 60 0 90" stroke="{BLUE}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".8"/>{spark(70,70,1.1)}{spark(340,300,.9,"#fff")}', "snow")
S["ac-window"] = scene(f'{window_ac()}{spark(70,70,1.1)}{spark(340,320,.9,"#fff")}', "snow", warm=True)
# ---------------- AMC plans
shield = lambda x, y, s=1: f'<g transform="translate({x},{y}) scale({s})"><path d="M0-90l80 30v50c0 60-34 100-80 120-46-20-80-60-80-120v-50z" fill="{T}"/><path d="M0-72l62 24v38c0 48-26 80-62 96z" fill="#0E8080"/>{logo(0,0,30)}</g>'
S["amc-basic"] = scene(f'{split_ac(60,250,280,80)}{shield(200,130,1)}', "shield")
S["amc-comfort"] = scene(f'{split_ac(60,250,280,80)}{shield(200,130,1)}{spark(80,80,1.3)}{spark(110,170,.8,"#fff")}<rect x="250" y="160" width="70" height="66" rx="10" fill="#fff" stroke="{G}" stroke-width="3"/><path d="M250 180h70" stroke="{T}" stroke-width="6"/><path d="M268 202l8 8 16-16" stroke="{GREEN}" stroke-width="6" fill="none" stroke-linecap="round"/>', "cal", warm=True)
S["amc-family"] = scene(f'{split_ac(30,60,160,56)}{split_ac(210,60,160,56)}{split_ac(30,150,160,56)}{split_ac(210,150,160,56)}{shield(200,300,.6)}', "shield")
S["amc"] = S["amc-comfort"]
# ---------------- Washing machine
S["wm-start"] = scene(f'{washer()}<path d="M282 280c40 0 50 40 80 40" stroke="{TN}" stroke-width="7" fill="none"/><rect x="340" y="300" width="36" height="30" rx="6" fill="{T}"/>{floor(330,140)}', "bolt")
S["wm-spin"] = scene(f'{washer(door="spin")}{floor(330,140)}', "rotate")
S["wm-drain"] = scene(f'{washer()}<path d="M282 280c50 0 40 60 80 60" stroke="{STEEL}" stroke-width="14" fill="none" stroke-linecap="round"/>{drops([(350,300,.9),(360,268,.7)])}{floor(330,140)}', "block")
S["wm-leak"] = scene(f'{washer()}{drops([(130,330,1),(170,346,.8),(250,340,1)])}<ellipse cx="200" cy="352" rx="130" ry="14" fill="{BLUE}" opacity=".6"/>{glove(392,240,200,WRENCH)}', "drop")
S["wm-noise"] = scene(f'<g transform="rotate(-3 200 200)">{washer()}</g><path d="M96 140l-14 14 14 14M304 140l14 14-14 14" stroke="{T}" stroke-width="6" fill="none" stroke-linecap="round"/>{waves(320,240,.9,RED)}{floor(330,140)}', "sound")
S["wm-install"] = scene(f'{washer()}<path d="M118 120H60V40" stroke="{BLUE}" stroke-width="12" fill="none" stroke-linecap="round"/>{glove(392,260,200,WRENCH)}{floor(330,140)}', "plus", warm=True)
S["wm-uninstall"] = scene(f'<g transform="rotate(-8 200 300)">{washer()}</g><path d="M60 330h80" stroke="{T}" stroke-width="8" stroke-linecap="round"/><path d="M60 330l20-14v28z" fill="{T}"/>{floor(340,140)}', "minus", warm=True)
S["wm-service"] = scene(f'{washer()}<rect x="300" y="230" width="44" height="80" rx="10" fill="#fff" stroke="{G}" stroke-width="2"/><rect x="300" y="256" width="44" height="30" fill="{T}"/><rect x="312" y="214" width="20" height="18" rx="4" fill="{Y}"/>{spark(80,90,1.2)}{spark(200,200,1,"#fff")}{floor(330,140)}', "spark")
S["washing"] = S["wm-service"]
# ---------------- Plumber
S["pl-tap"] = scene(f'<rect x="0" y="0" width="400" height="160" fill="#fff" opacity=".3"/>{tap(170,190)}{basin(90,250,220)}{drops([(222,214,.8)])}{glove(392,120,200,WRENCH)}', "wrench")
S["pl-leak"] = scene(f'{pipe_h(170)}{drops([(196,210,1),(204,250,.8),(192,290,1.1)])}<ellipse cx="200" cy="330" rx="90" ry="12" fill="{BLUE}" opacity=".6"/>{glove(392,110,200,WRENCH)}', "drop")
S["pl-block"] = scene(f'{basin(90,170,220)}<ellipse cx="200" cy="196" rx="70" ry="14" fill="#9DB7A8"/>{glove(400,40,150,PLUNGER)}', "block")
S["pl-flush"] = scene(f'{flush_tank()}{glove(392,120,200,SCREW)}', "rotate")
S["pl-basin"] = scene(f'{tap(190,150)}{basin(90,200,220)}{glove(20,330,-20,LEVEL)}', "plus", warm=True)
S["pl-motor"] = scene(f'{motor()}{floor(240,140)}{glove(392,300,200,WRENCH)}', "bolt", warm=True)
S["pl-geyser"] = scene(f'{geyser()}<path d="M290 120q10 14 0 28M310 110q14 20 0 40" stroke="{RED}" stroke-width="5" fill="none" stroke-linecap="round"/>', "thermo", warm=True)
S["pl-tank"] = scene(f'{tank()}{drops([(80,300,.9),(320,300,.9)])}{spark(70,80,1.2)}{spark(330,170,.8,"#fff")}', "spark")
S["plumber"] = S["pl-tap"]
# ---------------- Electrician
S["el-switch"] = scene(f'{switchboard()}{glove(392,200,190,SCREW)}', "bolt", warm=True)
S["el-fan"] = scene(f'{fan(200,150)}{glove(20,330,-40,DRILL)}', "plus")
S["el-fanrep"] = scene(f'{fan(200,150,True)}{glove(392,320,200,SCREW)}', "wrench")
S["el-light"] = scene(f'{tube_light()}{glove(392,320,200,SCREW)}', "plus", warm=True)
S["el-mcb"] = scene(f'{mcb()}{glove(392,320,200,SCREW)}', "bolt")
S["el-wiring"] = scene(f'{switchboard(80,100,170,140)}<path d="M250 170c60 0 40 80 110 80M250 200c50 0 30 70 110 90" stroke="{RED}" stroke-width="7" fill="none"/><path d="M250 185c60 0 40 80 110 82" stroke="{TN}" stroke-width="7" fill="none"/>{glove(20,330,-30,TESTER)}', "bolt", warm=True)
S["el-inverter"] = scene(f'{inverter()}{floor(300,150)}', "bolt")
S["el-bell"] = scene(f'{doorbell()}', "sound", warm=True)
S["electrician"] = S["el-switch"]
# ---------------- Phone repair issues (ids from zipphive-catalog.json)
scr_ui = lambda: f'<rect x="146" y="80" width="108" height="10" rx="5" fill="#7FD3CD" opacity=".7"/><rect x="146" y="98" width="70" height="8" rx="4" fill="#7FD3CD" opacity=".5"/>' + "".join(f'<rect x="{146+c*38}" y="{130+r*40}" width="28" height="28" rx="8" fill="{Y if (r+c)%3==0 else "#0E8080"}"/>' for r in range(4) for c in range(3))
S["ph-1"] = scene(f'{phone()}{scr_ui()}{cracks()}{glove(392,300,200,SCREW)}', "x")                       # Display
S["ph-2"] = scene(f'{foldable(True)}{cracks(160,180)}', "x")                                             # Inner display
S["ph-3"] = scene(f'{foldable(False)}{cracks(200,170)}', "x", warm=True)                                 # Outer display
S["ph-4"] = scene(f'<g transform="rotate(-20 200 200)"><rect x="70" y="90" width="120" height="220" rx="20" fill="{TN}"/><rect x="210" y="90" width="120" height="220" rx="20" fill="{TN}"/><rect x="186" y="110" width="28" height="180" rx="12" fill="{STEEL}"/></g>', "rotate")  # Hinge
S["ph-5"] = scene(f'{phone()}<rect x="166" y="120" width="68" height="140" rx="12" fill="none" stroke="#fff" stroke-width="7"/><rect x="186" y="108" width="28" height="14" rx="4" fill="#fff"/><rect x="176" y="214" width="48" height="36" rx="6" fill="{RED}"/>', "bolt")  # Battery
S["ph-6"] = scene(f'{phone_back()}{cracks(220,230)}', "x", warm=True)                                   # Back glass
S["ph-7"] = scene(f'{phone()}{scr_ui()}<rect x="186" y="340" width="28" height="30" rx="6" fill="{STEEL}"/><path d="M200 370v30" stroke="{TN}" stroke-width="10"/><path d="M196 180l-16 30h22l-12 34" stroke="{Y}" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>', "bolt")  # Charging
S["ph-8"] = scene(f'<g transform="scale(1.25) translate(-40 -28)">{phone_back()}</g>', "q", warm=True)    # Cameras
S["ph-9"] = scene(f'{phone(screen="#0A2A2B")}<circle cx="200" cy="190" r="34" stroke="{Y}" stroke-width="8" fill="none" stroke-dasharray="160 60"/><path d="M200 150v34" stroke="{Y}" stroke-width="8" stroke-linecap="round"/>', "rotate")  # Start / restart
S["ph-10"] = scene(f'<g transform="rotate(14 200 200)">{phone()}{scr_ui()}{cracks(170,120)}{cracks(240,260)}</g>', "x", warm=True)  # Damaged
S["ph-11"] = scene(f'{phone()}{scr_ui()}<path d="M120 250q40-20 80 0t80 0v90H120z" fill="{BLUE}" opacity=".7"/>{drops([(90,120,1),(320,180,1.2),(70,220,.8)])}', "drop")  # Water
S["ph-12"] = scene(f'{phone()}{scr_ui()}{waves(298,190,1)}', "sound", warm=True)                     # Speaker
S["ph-13"] = scene(f'{phone()}{scr_ui()}<rect x="168" y="290" width="64" height="12" rx="6" fill="{TN}"/><circle cx="200" cy="296" r="30" fill="none" stroke="{Y}" stroke-width="5"/>', "sound")  # Mic
S["ph-14"] = scene(f'{phone()}<path d="M160 140v-20h20M240 140v-20h-20M160 240v20h20M240 240v20h-20" stroke="{Y}" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="182" cy="176" r="6" fill="#fff"/><circle cx="218" cy="176" r="6" fill="#fff"/><path d="M180 214q20 16 40 0" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/>', "q", warm=True)  # Face ID
S["ph-15"] = scene(f'{phone_back()}' + "".join(f'<ellipse cx="200" cy="250" rx="{r}" ry="{r*1.25:.0f}" fill="none" stroke="{Y}" stroke-width="4"/>' for r in (8, 16, 24, 32)), "q")  # Fingerprint
S["ph-16"] = scene(f'{phone()}<path d="M140 190a86 86 0 0 1 120 0M162 214a54 54 0 0 1 76 0" stroke="{Y}" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="200" cy="242" r="10" fill="{Y}"/><path d="M150 270l100-110" stroke="{RED}" stroke-width="8" stroke-linecap="round"/>', "wifi", warm=True)  # Connectivity
S["ph-17"] = scene(f'{phone()}{scr_ui()}<rect x="276" y="110" width="12" height="44" rx="5" fill="{Y}"/><rect x="276" y="170" width="12" height="64" rx="5" fill="{Y}"/>{glove(400,130,200,"")}', "wrench")  # Buttons
S["ph-18"] = scene(f'{phone()}{scr_ui()}<circle cx="236" cy="62" r="8" fill="{Y}"/>{waves(260,62,.6,Y)}', "q", warm=True)  # Proximity
S["ph-19"] = scene(f'<g transform="rotate(-6 200 200)">{phone()}{scr_ui()}</g><path d="M96 120l-14 16 14 16M96 230l-14 16 14 16M304 120l14 16-14 16M304 230l14 16-14 16" stroke="{T}" stroke-width="6" fill="none" stroke-linecap="round"/>', "sound")  # Haptics
S["ph-20"] = scene(f'{phone()}{scr_ui()}{glove(392,300,200,SCREW)}', "gear", warm=True)               # Other
S["ph-21"] = scene(f'{phone_back(glass="#0E8080")}{glove(20,320,-30,SCREW)}', "wrench")                   # Back panel
S["ph-22"] = scene(f'{phone()}{scr_ui()}<rect x="120" y="40" width="160" height="300" rx="28" fill="#fff" opacity=".28"/><path d="M150 70l90 90" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".8"/>', "shield", warm=True)  # Screen guard
S["mobile"] = S["ph-1"]
S["ph-other"] = S["ph-20"]

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "zh-img"
    d = os.path.join(out, "svc")
    os.makedirs(d, exist_ok=True)
    for k, v in S.items():
        open(os.path.join(d, f"{k}.svg"), "w").write(v)
    print(len(S), "illustrations written to", d)

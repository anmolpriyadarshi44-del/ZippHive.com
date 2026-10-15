# ZippHive-themed flat illustrations for cleaning cards (original artwork)
import os, sys
OUT = sys.argv[1]
T, TD, TN, M, M2, Y, YD, CR, W, G = "#0B6E6E", "#074848", "#042F31", "#E6F4F3", "#CFE9E6", "#FFC93C", "#F2B200", "#FFF4CC", "#FFFFFF", "#DCE8E7"

def hexpts(cx, cy, r):
    import math
    return " ".join(f"{cx + r*math.cos(math.radians(a)):.1f},{cy + r*math.sin(math.radians(a)):.1f}" for a in (-90, -30, 30, 90, 150, 210))

def base(bg1, bg2, body, dark=False):
    stroke = "#ffffff" if dark else T
    op = ".07" if dark else ".08"
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="800" height="800">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{bg1}"/><stop offset="1" stop-color="{bg2}"/></linearGradient>
<pattern id="hx" width="40" height="46" patternUnits="userSpaceOnUse"><polygon points="{hexpts(20,23,19)}" fill="none" stroke="{stroke}" stroke-opacity="{op}" stroke-width="1.5"/></pattern>
<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9F8F7"/><stop offset="1" stop-color="#BFE3E0"/></linearGradient>
</defs>
<rect width="400" height="400" fill="url(#bg)"/><rect width="400" height="400" fill="url(#hx)"/>
{body}
</svg>'''

def logo(cx, cy, r=9):
    return f'<polygon points="{hexpts(cx,cy,r)}" fill="{Y}"/><path d="M{cx-r*.38:.1f} {cy-r*.42:.1f}h{r*.76:.1f}l-{r*.6:.1f} {r*.84:.1f}h{r*.6:.1f}" fill="none" stroke="{TN}" stroke-width="{r*.22:.1f}" stroke-linejoin="round" stroke-linecap="round"/>'

def glove(x, y, rot=0, flip=False, hold=""):
    """Teal sleeve + yellow glove, hand pointing right from origin; 'hold' drawn in hand coords around (64,0)."""
    sx = -1 if flip else 1
    return f'''<g transform="translate({x},{y}) rotate({rot}) scale({sx},1)">
<rect x="-170" y="-24" width="176" height="48" rx="20" fill="{T}"/><rect x="-170" y="-24" width="176" height="12" rx="6" fill="#0E8080" opacity=".6"/>
{logo(-60,0,10)}
<rect x="0" y="-27" width="22" height="54" rx="8" fill="{YD}"/>
{hold}
<rect x="16" y="-25" width="50" height="50" rx="20" fill="{Y}"/>
<rect x="44" y="-24" width="40" height="13" rx="6.5" fill="{Y}" stroke="{YD}" stroke-width="2"/>
<rect x="48" y="-11" width="40" height="13" rx="6.5" fill="{Y}" stroke="{YD}" stroke-width="2"/>
<rect x="46" y="2" width="38" height="13" rx="6.5" fill="{Y}" stroke="{YD}" stroke-width="2"/>
<rect x="40" y="14" width="32" height="12" rx="6" fill="{Y}" stroke="{YD}" stroke-width="2"/>
<ellipse cx="38" cy="-28" rx="18" ry="9" transform="rotate(-20 38 -28)" fill="{Y}" stroke="{YD}" stroke-width="2"/>
</g>'''

def sponge(x=70, y=-6):
    return f'<rect x="{x}" y="{y-22}" width="56" height="40" rx="9" fill="#7FD3CD"/><rect x="{x}" y="{y+8}" width="56" height="12" rx="5" fill="{T}"/>'

def spark(x, y, s=1, c=Y):
    return f'<path transform="translate({x},{y}) scale({s})" d="M0-16C2-4 4-2 16 0 4 2 2 4 0 16-2 4-4 2-16 0-4-2-2-4 0-16z" fill="{c}"/>'

def bubbles(pts):
    return "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fff" fill-opacity=".85" stroke="{T}" stroke-opacity=".25" stroke-width="2"/><circle cx="{x-r*.35:.1f}" cy="{y-r*.35:.1f}" r="{max(1.5,r*.22):.1f}" fill="#fff"/>' for x, y, r in pts)

def spray(x, y, s=1):
    return f'''<g transform="translate({x},{y}) scale({s})"><rect x="-22" y="0" width="44" height="78" rx="12" fill="#fff" stroke="{G}" stroke-width="2"/><rect x="-22" y="26" width="44" height="28" fill="{T}"/>{logo(0,40,8)}
<rect x="-10" y="-14" width="20" height="16" rx="3" fill="{TD}"/><path d="M-10-14h34l4 8h-38z" fill="{T}"/><rect x="-4" y="-2" width="10" height="16" rx="4" fill="{TD}" transform="rotate(15 0 0)"/></g>'''

def floor(cy=350, rx=150, op=".12"):
    return f'<ellipse cx="200" cy="{cy}" rx="{rx}" ry="16" fill="{TN}" opacity="{op}"/>'

S = {}
# ---------- Bathroom
tiles = "".join(f'<line x1="0" y1="{y}" x2="400" y2="{y}" stroke="#fff" stroke-width="3"/>' for y in range(40, 260, 44)) + "".join(f'<line x1="{x}" y1="0" x2="{x}" y2="256" stroke="#fff" stroke-width="3"/>' for x in range(30, 400, 56))
S["bathroom"] = base(M, M2, f'''{tiles}<rect x="0" y="256" width="400" height="144" fill="{M2}"/>
<rect x="128" y="44" width="144" height="112" rx="56" fill="url(#glass)" stroke="#fff" stroke-width="8"/><path d="M160 92l40-34M168 116l60-52" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".8"/>
<rect x="84" y="226" width="232" height="22" rx="8" fill="#fff"/><path d="M110 248h180c-6 40-40 62-90 62s-84-22-90-62z" fill="#fff" stroke="{G}" stroke-width="2"/>
<rect x="184" y="302" width="32" height="56" rx="8" fill="#fff" stroke="{G}" stroke-width="2"/>
<path d="M200 226v-26h30" fill="none" stroke="#A9BDBC" stroke-width="10" stroke-linecap="round"/><circle cx="200" cy="196" r="9" fill="{T}"/>
{floor(360,120)}
{bubbles([(150,262,12),(172,250,8),(238,258,10),(260,246,6),(128,240,7)])}
{glove(372,232,200,False,sponge())}
{spark(96,92,1.3)}{spark(300,72,.9,"#fff")}{spark(250,190,.7)}''')
# ---------- Kitchen
hx = "".join(f'<polygon points="{hexpts(x + (23 if (r%2) else 0), 60 + r*40, 22)}" fill="#fff" fill-opacity=".55" stroke="{Y}" stroke-opacity=".5" stroke-width="2"/>' for r in range(5) for x in range(0, 420, 46))
S["kitchen"] = base(CR, "#FFE9A8", f'''{hx}
<path d="M160 30h80v36h40l-20 52h-120l-20-52h40z" fill="{T}"/><rect x="140" y="112" width="120" height="8" rx="4" fill="{TD}"/>
<rect x="30" y="248" width="340" height="22" rx="6" fill="{TD}"/><rect x="40" y="270" width="320" height="100" fill="{T}"/>
<line x1="146" y1="270" x2="146" y2="370" stroke="{TD}" stroke-width="4"/><line x1="254" y1="270" x2="254" y2="370" stroke="{TD}" stroke-width="4"/>
<rect x="128" y="300" width="8" height="30" rx="4" fill="{Y}"/><rect x="156" y="300" width="8" height="30" rx="4" fill="{Y}"/><rect x="264" y="300" width="8" height="30" rx="4" fill="{Y}"/>
<rect x="170" y="244" width="96" height="10" rx="5" fill="#9FB5B4"/><path d="M226 244v-46a20 20 0 0 1 40 0v8" fill="none" stroke="#A9BDBC" stroke-width="9" stroke-linecap="round"/>
{spray(84,170,.95)}
<ellipse cx="300" cy="236" rx="40" ry="10" fill="#fff" opacity=".6"/>
{bubbles([(270,232,9),(292,226,6),(318,234,8),(250,238,5)])}
{glove(380,212,195,False,sponge())}
{spark(60,60,1.1,"#fff")}{spark(330,80,1.2)}{spark(200,190,.8)}''')
# ---------- Sofa
S["sofa"] = base(M, M2, f'''{floor(330,170,".15")}
<rect x="62" y="150" width="276" height="110" rx="28" fill="{T}"/>
<rect x="40" y="196" width="56" height="118" rx="24" fill="{TD}"/><rect x="304" y="196" width="56" height="118" rx="24" fill="{TD}"/>
<rect x="80" y="240" width="240" height="64" rx="18" fill="#0E8080"/><line x1="200" y1="244" x2="200" y2="300" stroke="{TD}" stroke-width="4"/>
<rect x="96" y="172" width="70" height="62" rx="16" fill="{Y}" transform="rotate(-10 131 203)"/><rect x="236" y="172" width="70" height="62" rx="16" fill="{CR}" transform="rotate(8 271 203)"/>
<polygon points="{hexpts(271,203,12)}" fill="{Y}" transform="rotate(8 271 203)"/>
<rect x="70" y="312" width="12" height="22" rx="4" fill="{TN}"/><rect x="318" y="312" width="12" height="22" rx="4" fill="{TN}"/>
{bubbles([(110,248,14),(134,240,9),(156,252,11),(176,244,6),(126,262,7)])}
<path d="M222 252 L330 120" stroke="#9FB5B4" stroke-width="12" stroke-linecap="round"/><rect x="196" y="246" width="66" height="18" rx="6" fill="{TN}" transform="rotate(-6 229 255)"/>
{glove(392,92,150,False)}
{spark(240,214,1.1,"#fff")}{spark(290,226,.7,"#fff")}{spark(70,110,1.2)}''')
# ---------- Mattress
stitch = "".join(f'<path d="M{x} 236l20 18-20 18-20-18z" fill="none" stroke="{G}" stroke-width="2" stroke-dasharray="4 4"/>' for x in range(100, 320, 40))
S["mattress"] = base(CR, "#FFE9A8", f'''{floor(330,170,".14")}
<rect x="62" y="96" width="276" height="150" rx="34" fill="{T}"/><rect x="86" y="118" width="228" height="20" rx="10" fill="#0E8080"/>{logo(200,184,18)}
<rect x="50" y="226" width="300" height="64" rx="18" fill="#fff" stroke="{G}" stroke-width="3"/>{stitch}
<rect x="50" y="276" width="300" height="14" rx="7" fill="{M2}"/>
<rect x="60" y="290" width="16" height="36" rx="4" fill="{TN}"/><rect x="324" y="290" width="16" height="36" rx="4" fill="{TN}"/>
{"".join(f'<circle cx="{x}" cy="{y}" r="2.6" fill="#9FA59C"/>' for x,y in [(86,240),(104,262),(122,246),(96,272),(140,256),(116,232)])}
{glove(392,196,172,False,f'<rect x="56" y="-20" width="100" height="40" rx="16" fill="{Y}" stroke="{YD}" stroke-width="2"/><rect x="96" y="-14" width="28" height="28" rx="6" fill="{T}"/><path d="M150-12l34 8v16l-34 8z" fill="{TN}"/>')}
{spark(260,280,.9,"#FFC93C")}{spark(176,250,1,"#FFC93C")}{spark(80,70,1.1)}{spark(330,60,.8,"#fff")}''')
# ---------- Carpet
rugpat = "".join(f'<polygon points="{hexpts(x,y,13)}" fill="none" stroke="{T}" stroke-width="3"/>' for x in range(98, 320, 36) for y in (262, 298))
fringe = "".join(f'<line x1="{x}" y1="{y1}" x2="{x}" y2="{y2}" stroke="{YD}" stroke-width="3"/>' for x in range(64, 344, 10) for (y1, y2) in ((222, 210), (338, 350)))
S["carpet"] = base(M, M2, f'''{fringe}<rect x="56" y="222" width="288" height="116" rx="12" fill="{Y}" stroke="{T}" stroke-width="10"/>{rugpat}
<rect x="66" y="232" width="134" height="96" fill="#fff" opacity=".18"/>
{bubbles([(214,238,10),(236,252,7),(226,276,9),(208,298,6),(244,306,8)])}
<path d="M228 240 L304 70" stroke="#9FB5B4" stroke-width="12" stroke-linecap="round"/>
<rect x="246" y="148" width="40" height="70" rx="14" fill="{T}" transform="rotate(24 266 183)"/>{logo(262,186,10)}
<rect x="180" y="232" width="92" height="26" rx="10" fill="{TN}"/><circle cx="196" cy="260" r="6" fill="#555"/><circle cx="256" cy="260" r="6" fill="#555"/>
{glove(380,40,150,False)}
{spark(110,170,1.2)}{spark(150,250,.8,"#fff")}{spark(330,300,1,"#fff")}''')
# ---------- Windows
grill = "".join(f'<line x1="{x}" y1="70" x2="{x}" y2="290" stroke="{T}" stroke-width="5"/>' for x in range(118, 200, 20))
S["windows"] = base(CR, "#FFE9A8", f'''<rect x="80" y="54" width="240" height="252" rx="14" fill="#fff"/>
<rect x="96" y="70" width="100" height="220" rx="6" fill="#C9D9D7"/><rect x="204" y="70" width="100" height="220" rx="6" fill="url(#glass)"/>
{"".join(f'<path d="M{x} {y}q14 10 30 2" stroke="#A3B3B1" stroke-width="6" fill="none" stroke-linecap="round" opacity=".8"/>' for x,y in [(104,110),(130,170),(108,230),(150,130),(140,260)])}
{grill}
<path d="M222 120l34-30M228 160l58-50" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
<rect x="66" y="300" width="268" height="18" rx="6" fill="{T}"/>
<path d="M120 300c-6-24 2-42 14-52M124 300c4-22 18-34 30-38M118 298c-14-16-18-30-14-44" stroke="#1E8E5E" stroke-width="7" fill="none" stroke-linecap="round"/><rect x="104" y="290" width="38" height="16" rx="4" fill="{Y}"/>
{glove(392,186,180,False,f'<rect x="60" y="-8" width="80" height="16" rx="8" fill="{Y}"/><rect x="134" y="-62" width="14" height="124" rx="7" fill="{TN}"/>')}
{spark(240,250,1.1,"#fff")}{spark(290,96,.8,"#fff")}{spark(350,330,1.2)}''')
# ---------- Fridge / appliance
S["appliance"] = base(M, M2, f'''{floor(354,150,".14")}
<rect x="110" y="40" width="160" height="306" rx="20" fill="#F4FAF9" stroke="{G}" stroke-width="3"/>
<rect x="124" y="56" width="132" height="274" rx="10" fill="#DDF0EE"/>
<line x1="124" y1="130" x2="256" y2="130" stroke="#fff" stroke-width="6"/><line x1="124" y1="204" x2="256" y2="204" stroke="#fff" stroke-width="6"/><line x1="124" y1="270" x2="256" y2="270" stroke="#fff" stroke-width="6"/>
<rect x="136" y="92" width="26" height="38" rx="6" fill="{T}"/><rect x="170" y="100" width="20" height="30" rx="5" fill="{Y}"/><circle cx="222" cy="118" r="12" fill="#F2994A"/>
<rect x="196" y="160" width="46" height="44" rx="8" fill="#fff" stroke="{G}" stroke-width="2"/><ellipse cx="150" cy="196" rx="16" ry="8" fill="#7FD3CD"/>
<rect x="140" y="232" width="34" height="38" rx="6" fill="{Y}"/><rect x="186" y="240" width="56" height="30" rx="8" fill="#9BCB6B"/>
<path d="M270 44l64 22v270l-64 10z" fill="#fff" stroke="{G}" stroke-width="3"/><path d="M280 110l46 10M280 190l46 6M280 270l46 2" stroke="{T}" stroke-width="6" stroke-linecap="round"/>
<rect x="286" y="80" width="12" height="20" rx="3" fill="{Y}"/><rect x="304" y="160" width="12" height="22" rx="3" fill="{T}"/>
{glove(30,226,-20,False,f'<rect x="66" y="-26" width="52" height="40" rx="10" fill="#7FD3CD"/><path d="M70-14h44M70 0h44" stroke="#5CBDB5" stroke-width="3"/>')}
{spark(212,74,1,"#FFC93C")}{spark(242,236,.8,"#fff")}{spark(360,40,1.2)}''')
# ---------- Festive combo (dark)
gar = "".join(f'<circle cx="{x}" cy="{18+ (0.0012*(x-200)**2) * -1 + 60:.1f}" r="11" fill="{"#F28C28" if i%2 else Y}"/>' for i, x in enumerate(range(10, 400, 20)))
diya = lambda x: f'<path d="M{x-30} 330q30 30 60 0z" fill="#C2622D"/><path d="M{x-30} 330h60" stroke="#E07B39" stroke-width="5" stroke-linecap="round"/><path d="M{x} 318c-9-10-6-22 0-34 6 12 9 24 0 34z" fill="{Y}"/><path d="M{x} 316c-4-5-3-11 0-17 3 6 4 12 0 17z" fill="#fff"/>'
S["combo"] = base(TN, "#0B4F50", f'''<path d="M0 22 Q200 92 400 22" stroke="#1E8E5E" stroke-width="3" fill="none"/>{gar}
<polygon points="{hexpts(128,196,86)}" fill="{T}" stroke="{Y}" stroke-width="5"/><polygon points="{hexpts(272,196,86)}" fill="{T}" stroke="{Y}" stroke-width="5"/>
<rect x="84" y="206" width="88" height="14" rx="5" fill="{TN}"/><rect x="104" y="220" width="48" height="30" rx="6" fill="#0E8080"/><path d="M144 206v-34a14 14 0 0 1 28 0" fill="none" stroke="#D5E4E3" stroke-width="7" stroke-linecap="round"/>
<path d="M98 170h40l-6 20h-28z" fill="{Y}"/><rect x="114" y="160" width="8" height="12" fill="{Y}"/>
<path d="M248 150h48" stroke="#D5E4E3" stroke-width="7" stroke-linecap="round"/><path d="M290 150v14" stroke="#D5E4E3" stroke-width="7"/><path d="M276 164h28l-4 10h-20z" fill="#D5E4E3"/>
{"".join(f'<path d="M{x} {y}v12" stroke="#7FD3CD" stroke-width="4" stroke-linecap="round"/>' for x,y in [(280,184),(290,196),(300,184),(285,214),(296,224)])}
<rect x="236" y="228" width="72" height="22" rx="10" fill="#fff"/>
<circle cx="200" cy="196" r="20" fill="{Y}"/><path d="M200 186v20M190 196h20" stroke="{TN}" stroke-width="5" stroke-linecap="round"/>
{diya(70)}{diya(200)}{diya(330)}
{spark(60,120,1.1)}{spark(346,118,1.1)}{spark(200,100,.8,"#fff")}''', dark=True)
# ---------- Something else / full home
S["other"] = base(M, M2, f'''{floor(340,170,".14")}
<path d="M200 66 L330 150 V330 H70 V150 Z" fill="#fff" stroke="{G}" stroke-width="3"/>
<path d="M200 50 L350 148 L330 166 L200 82 L70 166 L50 148 Z" fill="{T}"/>
<rect x="170" y="232" width="60" height="98" rx="8" fill="{Y}"/><circle cx="218" cy="284" r="5" fill="{TN}"/>
<rect x="96" y="184" width="54" height="54" rx="8" fill="url(#glass)" stroke="{T}" stroke-width="5"/><rect x="250" y="184" width="54" height="54" rx="8" fill="url(#glass)" stroke="{T}" stroke-width="5"/>
<path d="M123 184v54M96 211h54M277 184v54M250 211h54" stroke="{T}" stroke-width="4"/>
{logo(200,148,20)}
{spark(64,74,1.3)}{spark(340,70,1)}{spark(110,290,.9,"#FFC93C")}{spark(300,292,1.1,"#FFC93C")}{spark(220,30,.8,"#fff")}''')
# ---------- Phone booking (how it works step 2)
chips = "".join(f'<rect x="{x}" y="{y}" width="58" height="30" rx="10" fill="{c}"/><text x="{x+29}" y="{y+20}" font-family="Arial" font-size="12" font-weight="700" text-anchor="middle" fill="{tc}">{t}</text>' for x, y, t, c, tc in [(132,196,"9 AM",T,"#fff"),(198,196,"10 AM","#fff",T),(132,236,"11 AM","#fff",T),(198,236,"12 PM","#fff",T),(132,276,"2 PM","#fff",T),(198,276,"4 PM","#fff",T)])
S["phone"] = base(CR, "#FFE9A8", f'''{floor(360,110,".14")}
<rect x="112" y="40" width="176" height="310" rx="30" fill="{TN}"/><rect x="122" y="54" width="156" height="282" rx="22" fill="#fff"/>
<rect x="122" y="54" width="156" height="70" rx="22" fill="{T}"/><rect x="122" y="100" width="156" height="24" fill="{T}"/>{logo(150,86,14)}
<rect x="172" y="76" width="80" height="10" rx="5" fill="#fff" opacity=".9"/><rect x="172" y="92" width="52" height="8" rx="4" fill="#fff" opacity=".6"/>
<rect x="132" y="140" width="40" height="44" rx="10" fill="{Y}"/><rect x="180" y="140" width="40" height="44" rx="10" fill="{M}"/><rect x="228" y="140" width="40" height="44" rx="10" fill="{M}"/>
<rect x="138" y="150" width="28" height="6" rx="3" fill="{TN}"/><rect x="142" y="162" width="20" height="12" rx="3" fill="{TN}"/>
{chips}
<rect x="132" y="316" width="136" height="10" rx="5" fill="{G}"/>
<circle cx="296" cy="112" r="30" fill="{Y}"/><path d="M282 112l10 10 18-20" stroke="{TN}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
{spark(70,90,1.2,"#fff")}{spark(330,260,1.1)}{spark(80,300,.9)}''')

os.makedirs(OUT, exist_ok=True)
for k, v in S.items():
    open(os.path.join(OUT, f"clean-{k}.svg" if k != "phone" else "book-phone.svg"), "w").write(v)
print(len(S), "files")

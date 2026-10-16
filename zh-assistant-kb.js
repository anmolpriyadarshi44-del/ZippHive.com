/* ZippHive Assistant – service knowledge & diagnosis layer.
 * Answers "what is the process", "how much time", "what does the technician do",
 * and walks customers through problem diagnosis (AC not cooling, phone not charging, MCB tripping…)
 * in English, Hindi (देवनागरी) and Hinglish. Loaded before zipphive-widget.js; the widget calls
 * window.ZHKB.answer(text, state, ctx) first and falls back to its price engine when this returns null.
 * Times are typical ranges – the technician confirms on site. Prices are read live from the
 * admin price list when the booking flow is on the page (window.ZHBook.catalog).
 */
(function () {
  "use strict";
  const PHONE = "+91 92204 00950";

  // ---------- language
  const HN_WORDS = /\b(hai|hain|kya|kyu|kyon|kaise|kaisa|kitna|kitne|kitni|kab|nahi|nhi|nahin|mera|meri|mere|apna|karna|karte|karta|karti|krna|kr|raha|rahi|rahe|hota|hoti|chahiye|chaiye|bhai|ji|lagta|lagega|lagenge|kaun|kon|batao|bataiye|btao|kijiye|karo|krdo|wala|wali|thanda|garam|pani|paani|bijli|pankha|safai|jaldi|der|samay|ghanta|ghante|kaam|aur|bhi|toh|se|ka|ki|ke|mein|pe|gaya|gayi|gaye|hua|hui|jata|jati|lag|kuch|abhi|bahut|thoda|kyun|sahi|accha|acha|aap|aapka|aapke|aate|aati|hum|mujhe|humko)\b/g;
  function detectLang(raw) {
    if (/[ऀ-ॿ]/.test(raw)) return "hi";
    const m = (" " + raw.toLowerCase() + " ").match(HN_WORDS);
    return m && m.length >= (raw.split(/\s+/).length <= 5 ? 1 : 2) ? "hn" : "en";
  }
  const L = (en, hn, hi) => ({ en, hn, hi });
  const tx = (o, lang) => (o == null ? "" : typeof o === "string" ? o : o[lang] || o.en);

  // ---------- live prices from the booking catalog (if present on the page)
  function priceFrom(svcId, itemIds) {
    try {
      const cat = window.ZHBook && window.ZHBook.catalog;
      const s = cat && cat.services.find((x) => x.id === svcId);
      if (!s || !s.items) return 0;
      let min = 0;
      for (const it of s.items) {
        if (it.active === false || (itemIds && !itemIds.includes(it.id))) continue;
        const vals = it.prices ? Object.values(it.prices) : [it.price];
        for (const v of vals) { const p = Number(v) || 0; if (p > 0 && (!min || p < min)) min = p; }
      }
      return min;
    } catch (e) { return 0; }
  }
  const rs = (n) => "₹" + Number(n).toLocaleString("en-IN");

  // ---------- chips
  const BOOK_NAME = { cleaning: "Home Cleaning", ac: "AC Repair / Service", acinstall: "AC Installation / Uninstallation", amc: "AC AMC Plan", home: "Plumber", washing: "Washing Machine Repair / Install", plumber: "Plumber", electrician: "Electrician", mobile: "Mobile Repair (60 min)" };
  const ZB = { cleaning: "cleaning", ac: "ac", acinstall: "ac", amc: "amc", washing: "home", plumber: "home", electrician: "home", mobile: "mobile" };
  function bookChip(key, lang) {
    if (key === "mobile") return { label: tx(L("📱 Check exact price", "📱 Exact price dekhein", "📱 सही कीमत देखें"), lang), action: { type: "price", target: {} } };
    return { label: tx(L("📅 Book a slot", "📅 Slot book karein", "📅 स्लॉट बुक करें"), lang), action: { type: "zbook", service: ZB[key] || key, fallback: BOOK_NAME[key] || "Plumber" } };
  }
  const waChip = (lang, text) => ({ label: tx(L("💬 Ask on WhatsApp", "💬 WhatsApp pe poochein", "💬 WhatsApp पर पूछें"), lang), action: { type: "wa", text } });
  const sayChip = (label, text) => ({ label, action: { type: "say", text: text || label.replace(/^[^\p{L}\d]+/u, "") } });
  const diagChip = (lang) => sayChip(tx(L("🩺 Diagnose a problem", "🩺 Problem diagnose karein", "🩺 समस्या पहचानें"), lang));

  // ======================================================================
  // SERVICE KNOWLEDGE: process, time, technician steps, tips
  // m = roman/Hinglish regex, d = Devanagari keywords
  // ======================================================================
  const T = [
    // ----- cleaning
    { id: "clean", key: "cleaning", m: /clean|safai|saaf|sofa|bathroom|washroom|toilet clean|kitchen clean|mattress|carpet|rug|deep clean/, d: ["सफाई", "साफ", "सोफा", "बाथरूम", "किचन", "गद्दा", "कालीन"],
      title: L("🧽 Home Cleaning", "🧽 Home Cleaning", "🧽 होम क्लीनिंग"),
      time: L("You choose **30, 45 or 60 minutes** per area. Roughly: 1 bathroom ≈ 30–45 min, kitchen ≈ 45–60 min, 3-seat sofa ≈ 30 min (5-seat ≈ 60 min), 1 room ≈ 30 min. Full 2BHK deep clean ≈ 4–6 hours with 2 cleaners.",
              "Har area ke liye **30, 45 ya 60 minute** choose karte hain. Lagbhag: 1 bathroom ≈ 30–45 min, kitchen ≈ 45–60 min, 3-seat sofa ≈ 30 min (5-seat ≈ 60 min), 1 room ≈ 30 min. Pura 2BHK deep clean ≈ 4–6 ghante, 2 cleaner ke saath.",
              "हर हिस्से के लिए **30, 45 या 60 मिनट** चुनें। लगभग: 1 बाथरूम ≈ 30–45 मिनट, किचन ≈ 45–60 मिनट, 3-सीट सोफा ≈ 30 मिनट (5-सीट ≈ 60 मिनट), 1 कमरा ≈ 30 मिनट। पूरा 2BHK डीप क्लीन ≈ 4–6 घंटे, 2 क्लीनर के साथ।"),
      steps: [L("Cleaner arrives with vacuum, scrubbers, mops & eco-safe chemicals", "Cleaner vacuum, scrubber, mop aur eco-safe chemical le kar aata hai", "क्लीनर वैक्यूम, स्क्रबर, पोछा और सुरक्षित केमिकल साथ लाता है"),
              L("Walk-through with you – what to focus on, stains, delicate surfaces", "Aapke saath area check – kis cheez pe focus, daag, nazuk surface", "आपके साथ जगह देखता है – किस पर ध्यान देना है, दाग, नाज़ुक सतह"),
              L("Dry dusting & vacuum first, then wet scrubbing / shampoo / descaling", "Pehle dusting aur vacuum, phir scrubbing / shampoo / descaling", "पहले डस्टिंग और वैक्यूम, फिर रगड़ाई / शैम्पू / डीस्केलिंग"),
              L("Wipe-down, drying and final check with you – pay after", "Pochha, sukhana aur aapke saath final check – kaam ke baad payment", "पोंछा, सुखाना और आपके साथ अंतिम जाँच – काम के बाद भुगतान")],
      tips: L("Keep water & a power socket available, and move valuables / fragile items. Sofa & carpet take 2–4 hours to dry fully – keep the fan on.",
              "Paani aur bijli ka socket available rakhein, keemti/nazuk saman hata dein. Sofa aur carpet poori tarah sookhne me 2–4 ghante lagte hain – pankha chala dein.",
              "पानी और बिजली का सॉकेट उपलब्ध रखें, कीमती/नाज़ुक सामान हटा दें। सोफा और कालीन पूरी तरह सूखने में 2–4 घंटे लगते हैं – पंखा चला दें।"),
      price: () => priceFrom("cleaning") },
    // ----- AC jet / foam service
    { id: "acservice", key: "ac", m: /(\bac\b|a\.c|air ?condition\w*).*(service|servicing|clean|jet|foam|wash)|(service|servicing|jet|foam).*(\bac\b|a\.c)|jet service|foam service|wet service/, d: ["एसी सर्विस", "एसी की सर्विस", "एसी साफ", "जेट सर्विस"],
      title: L("❄️ AC jet / foam service", "❄️ AC jet / foam service", "❄️ एसी जेट / फोम सर्विस"),
      time: L("**Split AC: 45–60 min**, Window AC: 40–50 min. Foam deep service adds ~15 min. 2 ACs ≈ 1.5–2 hours.",
              "**Split AC: 45–60 min**, Window AC: 40–50 min. Foam deep service me ~15 min extra. 2 AC ≈ 1.5–2 ghante.",
              "**स्प्लिट एसी: 45–60 मिनट**, विंडो एसी: 40–50 मिनट। फोम डीप सर्विस में ~15 मिनट ज़्यादा। 2 एसी ≈ 1.5–2 घंटे।"),
      steps: [L("Checks cooling, airflow and gas pressure before starting", "Shuru karne se pehle cooling, hawa aur gas pressure check", "शुरू करने से पहले कूलिंग, हवा और गैस प्रेशर की जाँच"),
              L("Power off, covers the wall with a jet bag so nothing gets wet", "Power off karke deewar pe jet bag lagata hai taaki kuch geela na ho", "बिजली बंद कर दीवार पर जेट बैग लगाता है ताकि कुछ गीला न हो"),
              L("Filters washed, cooling coil & blower cleaned with a high-pressure jet pump (foam first for deep service)", "Filter dhulte hain, coil aur blower jet pump se saaf (deep service me pehle foam)", "फ़िल्टर धुलते हैं, कॉइल और ब्लोअर जेट पंप से साफ़ (डीप सर्विस में पहले फोम)"),
              L("Drain pipe flushed, outdoor unit coil cleaned", "Drain pipe flush, outdoor unit ki coil saaf", "ड्रेन पाइप साफ़, आउटडोर यूनिट की कॉइल साफ़"),
              L("Reassemble, run test – shows you the cooling temperature", "Wapas fit karke test – cooling temperature aapko dikhata hai", "दोबारा लगाकर टेस्ट – कूलिंग तापमान आपको दिखाता है")],
      tips: L("Service every 4–6 months (before summer is best). Keep a stool/ladder access and a power socket near the AC.",
              "Har 4–6 mahine me service karwayein (garmi se pehle best). AC ke paas ladder rakhne ki jagah aur socket ho.",
              "हर 4–6 महीने में सर्विस कराएँ (गर्मी से पहले सबसे अच्छा)। एसी के पास सीढ़ी की जगह और सॉकेट हो।"),
      price: () => priceFrom("ac", ["jet", "foam"]) },
    // ----- AC gas
    { id: "acgas", key: "ac", m: /gas (refill|top|charg|filling|bharna|bharwana|dalwana|leak)|ac gas|refrigerant|r32|r410|r22/, d: ["गैस"],
      title: L("🧪 AC gas top-up / refill", "🧪 AC gas top-up / refill", "🧪 एसी गैस टॉप-अप / रिफिल"),
      time: L("**Top-up: 45–60 min. Full refill: 1.5–2 hours** (includes leak test and vacuum).", "**Top-up: 45–60 min. Full refill: 1.5–2 ghante** (leak test aur vacuum ke saath).", "**टॉप-अप: 45–60 मिनट। फुल रिफिल: 1.5–2 घंटे** (लीक टेस्ट और वैक्यूम सहित)।"),
      steps: [L("Gauge check – confirms gas is really low (most cooling problems are dirty coils, not gas)", "Gauge se check – sach me gas kam hai ya nahi (zyada tar cooling problem gandi coil se hoti hai)", "गेज से जाँच – सच में गैस कम है या नहीं (ज़्यादातर कूलिंग समस्या गंदी कॉइल से होती है)"),
              L("Leak test with soap foam / nitrogen on joints & coil", "Joints aur coil pe soap foam / nitrogen se leak test", "जोड़ों और कॉइल पर साबुन/नाइट्रोजन से लीक टेस्ट"),
              L("Leak fixed (brazing / flare nut) – **gas without fixing a leak will escape again**", "Leak theek kiya jata hai – **leak theek kiye bina gas fir nikal jayegi**", "लीक ठीक किया जाता है – **लीक ठीक किए बिना गैस फिर निकल जाएगी**"),
              L("Vacuum pump removes air & moisture (full refill), then gas charged by weight/pressure", "Vacuum pump se hawa aur nami nikali jati hai (full refill), phir sahi pressure tak gas", "वैक्यूम पंप से हवा और नमी निकाली जाती है (फुल रिफिल), फिर सही प्रेशर तक गैस"),
              L("Cooling test – you see the temperature drop", "Cooling test – temperature girta hua aap dekhte hain", "कूलिंग टेस्ट – तापमान गिरते हुए आप देखते हैं")],
      tips: L("Healthy ACs don't 'use up' gas – if it is low there is a leak. Ask for the gauge reading before and after.", "Theek AC me gas 'khatam' nahi hoti – kam hai to kahin leak hai. Pehle aur baad ka gauge reading zaroor dekhein.", "सही एसी में गैस 'खत्म' नहीं होती – कम है तो कहीं लीक है। पहले और बाद की गेज रीडिंग ज़रूर देखें।"),
      price: () => priceFrom("ac", ["gastop", "gasfull"]) },
    // ----- AC installation
    { id: "acinstall", key: "acinstall", m: /(install|installation|fitting|lagana|lagwana|uninstall|shift|nikal|utar).*(ac\b|a\.c|air ?condition)|(ac\b|a\.c).*(install|fitting|lagana|lagwana|uninstall|shift|nikalna|utarna)/, d: ["एसी लगवा", "एसी लगा", "एसी फिट", "एसी निकाल", "एसी शिफ्ट"],
      title: L("🛠️ AC installation / uninstall / shifting", "🛠️ AC installation / uninstall / shifting", "🛠️ एसी इंस्टॉलेशन / अनइंस्टॉल / शिफ्टिंग"),
      time: L("**Split install: 2–3 hours. Window install: 1–1.5 hours. Uninstall: 45–60 min. Shifting** (uninstall + reinstall): 3–4 hours.", "**Split install: 2–3 ghante. Window install: 1–1.5 ghante. Uninstall: 45–60 min. Shifting** (uninstall + reinstall): 3–4 ghante.", "**स्प्लिट इंस्टॉल: 2–3 घंटे। विंडो इंस्टॉल: 1–1.5 घंटे। अनइंस्टॉल: 45–60 मिनट। शिफ्टिंग** (निकालना + लगाना): 3–4 घंटे।"),
      steps: [L("Decides indoor & outdoor positions with you (pipe length, drain slope, sunlight)", "Aapke saath indoor/outdoor jagah tay (pipe length, drain ki dhalaan, dhoop)", "आपके साथ इनडोर/आउटडोर जगह तय (पाइप लंबाई, ड्रेन ढलान, धूप)"),
              L("Wall plate fixed, 2.5–3 inch core hole drilled, outdoor stand/bracket fitted", "Wall plate lagti hai, 2.5–3 inch ka hole, outdoor stand fit", "वॉल प्लेट लगती है, 2.5–3 इंच का छेद, आउटडोर स्टैंड फिट"),
              L("Copper pipes, drain pipe & cable connected and insulated", "Copper pipe, drain pipe aur wire jodkar insulation", "कॉपर पाइप, ड्रेन पाइप और तार जोड़कर इंसुलेशन"),
              L("Vacuum done, leak test, gas released, cooling test", "Vacuum, leak test, gas open, cooling test", "वैक्यूम, लीक टेस्ट, गैस खोली जाती है, कूलिंग टेस्ट"),
              L("Uninstall: gas pumped back into the outdoor unit first, so nothing is lost", "Uninstall me pehle gas outdoor unit me pump-down ki jati hai, taaki gas waste na ho", "अनइंस्टॉल में पहले गैस आउटडोर यूनिट में पंप-डाउन की जाती है, ताकि गैस बर्बाद न हो")],
      tips: L("Extra copper pipe beyond the kit length, stand, and dedicated MCB/socket are charged at actual cost – the technician tells you before fitting.", "Kit se zyada copper pipe, stand aur alag MCB/socket ka actual cost lagta hai – fitting se pehle technician bata deta hai.", "किट से ज़्यादा कॉपर पाइप, स्टैंड और अलग MCB/सॉकेट का असली खर्च लगता है – फिटिंग से पहले तकनीशियन बता देता है।"),
      price: () => priceFrom("ac", ["install", "uninstall", "shift", "stand"]) },
    // ----- AMC
    { id: "amc", key: "amc", m: /\bamc\b|annual maintenance|yearly plan|care plan|maintenance plan|saal bhar/, d: ["एएमसी", "सालाना", "प्लान"],
      title: L("🛡️ AC AMC plans", "🛡️ AC AMC plans", "🛡️ एसी एएमसी प्लान"),
      time: L("Each scheduled service takes **45–60 min per AC**. We call you to fix the dates – usually before summer and after monsoon.", "Har scheduled service **45–60 min per AC**. Date fix karne ke liye hum call karte hain – aam taur pe garmi se pehle aur barsaat ke baad.", "हर तय सर्विस **45–60 मिनट प्रति एसी**। तारीख तय करने के लिए हम कॉल करते हैं – आमतौर पर गर्मी से पहले और बारिश के बाद।"),
      steps: [L("Pick a plan and number of ACs, pay once for the year", "Plan aur AC ki ginti chunein, saal bhar ka ek baar payment", "प्लान और एसी की संख्या चुनें, साल भर का एक बार भुगतान"),
              L("We schedule wet services automatically and remind you", "Hum wet service khud schedule karke yaad dilate hain", "हम वेट सर्विस खुद तय करके याद दिलाते हैं"),
              L("Breakdown? Priority visit – Comfort Plus & Family Pack visits are free", "Kharabi aaye to priority visit – Comfort Plus aur Family Pack me visit free", "खराबी आए तो प्राथमिकता से विज़िट – Comfort Plus और Family Pack में विज़िट मुफ़्त"),
              L("Every visit logged with gas pressure & cooling readings", "Har visit ka record – gas pressure aur cooling reading ke saath", "हर विज़िट का रिकॉर्ड – गैस प्रेशर और कूलिंग रीडिंग के साथ")],
      tips: L("AMC pays off if you run the AC daily in summer – 2 services alone usually cost more than Basic Care.", "Garmi me roz AC chalate hain to AMC fayde ka hai – sirf 2 service ka kharcha hi Basic Care se zyada ho jata hai.", "गर्मी में रोज़ एसी चलाते हैं तो एएमसी फ़ायदेमंद है – सिर्फ़ 2 सर्विस का खर्च ही Basic Care से ज़्यादा होता है।"),
      price: () => priceFrom("amc") },
    // ----- washing machine
    { id: "washing", key: "washing", m: /washing|washer|front load|top load|semi ?automatic|drum/, d: ["वॉशिंग", "वाशिंग", "कपड़े धोने"],
      title: L("🧺 Washing machine repair / service", "🧺 Washing machine repair / service", "🧺 वॉशिंग मशीन रिपेयर / सर्विस"),
      time: L("**Diagnosis 15–20 min. Most repairs 45–90 min** (drain pump, inlet valve, belt, door lock). Motor/PCB/bearing work can need a 2nd visit for the part. **Service & descaling: 60–90 min. Installation: 30–45 min.**",
              "**Diagnosis 15–20 min. Zyada tar repair 45–90 min** (drain pump, inlet valve, belt, door lock). Motor/PCB/bearing me part ke liye dusri visit lag sakti hai. **Service & descaling: 60–90 min. Installation: 30–45 min.**",
              "**जाँच 15–20 मिनट। ज़्यादातर रिपेयर 45–90 मिनट** (ड्रेन पंप, इनलेट वाल्व, बेल्ट, डोर लॉक)। मोटर/PCB/बेयरिंग में पार्ट के लिए दूसरी विज़िट लग सकती है। **सर्विस और डीस्केलिंग: 60–90 मिनट। इंस्टॉलेशन: 30–45 मिनट।**"),
      steps: [L("Runs a test cycle and reads the error code", "Test cycle chala ke error code padhta hai", "टेस्ट साइकिल चलाकर एरर कोड पढ़ता है"),
              L("Checks power, door lock, water inlet, drain filter, belt & motor", "Power, door lock, paani inlet, drain filter, belt aur motor check", "बिजली, डोर लॉक, पानी इनलेट, ड्रेन फ़िल्टर, बेल्ट और मोटर की जाँच"),
              L("Tells you the fault and price – work starts only after you approve", "Kharabi aur price batata hai – aapki haan ke baad hi kaam", "खराबी और कीमत बताता है – आपकी हाँ के बाद ही काम"),
              L("Repairs, then runs a full wash/spin test in front of you", "Repair ke baad aapke saamne full wash/spin test", "रिपेयर के बाद आपके सामने पूरा वॉश/स्पिन टेस्ट")],
      tips: L("Keep the machine empty and reachable (pull it ~1 ft from the wall if you can).", "Machine khaali rakhein aur deewar se ~1 ft aage kar dein to aasaan hoga.", "मशीन खाली रखें और हो सके तो दीवार से ~1 फ़ुट आगे कर दें।"),
      price: () => priceFrom("home", ["wm-start", "wm-spin", "wm-drain", "wm-leak", "wm-noise", "wm-service", "wm-install", "wm-uninstall"]) },
    // ----- plumber
    { id: "plumber", key: "plumber", m: /plumb|tap\b|taps|mixer|leak|pipe|flush|cistern|block|choke|jam|drain|basin|sink|geyser|motor|pump|tank|nal\b|toti/, d: ["प्लंबर", "नल", "टोंटी", "लीक", "पाइप", "फ्लश", "जाम", "गीज़र", "गीजर", "टंकी", "मोटर"],
      title: L("🔧 Plumber", "🔧 Plumber", "🔧 प्लंबर"),
      time: L("Tap/mixer: **20–30 min** · Pipe leak: **30–60 min** · Drain/basin blockage: **30–60 min** · Flush tank: **30–45 min** · Wash basin fitting: **60–90 min** · Geyser installation: **60–90 min** · Motor/pump connection: **1–2 hours** · Tank cleaning (1000 L): **1.5–2 hours**.",
              "Nal/mixer: **20–30 min** · Pipe leak: **30–60 min** · Drain/basin jam: **30–60 min** · Flush tank: **30–45 min** · Wash basin fitting: **60–90 min** · Geyser lagana: **60–90 min** · Motor/pump connection: **1–2 ghante** · Tanki safai (1000 L): **1.5–2 ghante**.",
              "नल/मिक्सर: **20–30 मिनट** · पाइप लीक: **30–60 मिनट** · ड्रेन/बेसिन जाम: **30–60 मिनट** · फ्लश टैंक: **30–45 मिनट** · वॉश बेसिन लगाना: **60–90 मिनट** · गीज़र लगाना: **60–90 मिनट** · मोटर/पंप कनेक्शन: **1–2 घंटे** · टंकी सफाई (1000 L): **1.5–2 घंटे**।"),
      steps: [L("Finds the source – checks joints, valves and pressure", "Source dhoondhta hai – joint, valve aur pressure check", "स्रोत ढूँढता है – जोड़, वाल्व और प्रेशर की जाँच"),
              L("Shuts the water supply where needed", "Zaroorat ho to paani ki supply band", "ज़रूरत हो तो पानी की सप्लाई बंद"),
              L("Quotes the job + any part (washer, cartridge, pipe) – you approve", "Kaam + part (washer, cartridge, pipe) ka price batata hai – aap approve karte hain", "काम + पार्ट (वॉशर, कार्ट्रिज, पाइप) की कीमत बताता है – आप मंज़ूरी देते हैं"),
              L("Fixes, seals with Teflon/sealant, runs water to test for leaks", "Theek karke Teflon/sealant lagata hai, paani chala ke leak test", "ठीक करके टेफ़्लॉन/सीलेंट लगाता है, पानी चलाकर लीक टेस्ट")],
      tips: L("Parts are charged at actual cost. For blockages, please don't pour acid – it damages pipes and is dangerous for the plumber.", "Parts ka actual cost lagta hai. Jam me acid na daalein – pipe kharab hoti hai aur plumber ke liye khatarnak hai.", "पार्ट्स का असली खर्च लगता है। जाम में तेज़ाब न डालें – पाइप खराब होती है और प्लंबर के लिए खतरनाक है।"),
      price: () => priceFrom("home", ["pl-tap", "pl-leak", "pl-block", "pl-flush", "pl-basin", "pl-motor", "pl-geyser", "pl-tank"]) },
    // ----- electrician
    { id: "electrician", key: "electrician", m: /electric|bijli|wiring|wire|switch|socket|mcb|fuse|trip|\bfan\b|pankha|light|tube ?light|bulb|inverter|doorbell|bell|short circuit|spark/, d: ["बिजली", "इलेक्ट्रीशियन", "वायरिंग", "स्विच", "सॉकेट", "एमसीबी", "पंखा", "लाइट", "इन्वर्टर", "शॉर्ट"],
      title: L("💡 Electrician", "💡 Electrician", "💡 इलेक्ट्रीशियन"),
      time: L("Switch/socket: **15–20 min each** · Ceiling fan installation: **30–45 min** · Fan repair (capacitor/regulator): **30–60 min** · Light/tube light: **15–30 min** · MCB/fuse: **20–30 min** · Wiring fault: **1–2 hours** (finding the fault takes most time) · Inverter installation: **60–90 min** · Doorbell: **20–30 min**.",
              "Switch/socket: **15–20 min har ek** · Ceiling fan lagana: **30–45 min** · Fan repair (capacitor/regulator): **30–60 min** · Light/tube light: **15–30 min** · MCB/fuse: **20–30 min** · Wiring fault: **1–2 ghante** (fault dhoondhne me sabse zyada time) · Inverter lagana: **60–90 min** · Doorbell: **20–30 min**.",
              "स्विच/सॉकेट: **हर एक 15–20 मिनट** · सीलिंग फैन लगाना: **30–45 मिनट** · फैन रिपेयर (कैपेसिटर/रेगुलेटर): **30–60 मिनट** · लाइट/ट्यूबलाइट: **15–30 मिनट** · MCB/फ़्यूज़: **20–30 मिनट** · वायरिंग खराबी: **1–2 घंटे** (खराबी ढूँढने में सबसे ज़्यादा समय) · इन्वर्टर लगाना: **60–90 मिनट** · डोरबेल: **20–30 मिनट**।"),
      steps: [L("Switches off the MCB and tests with a tester / multimeter", "MCB band karke tester / multimeter se check", "MCB बंद करके टेस्टर / मल्टीमीटर से जाँच"),
              L("Finds the faulty point – switch, joint, appliance or circuit", "Kharab point dhoondhta hai – switch, joint, appliance ya circuit", "खराब पॉइंट ढूँढता है – स्विच, जोड़, उपकरण या सर्किट"),
              L("Quotes the fix + part (ISI-marked) – you approve", "Kaam + part (ISI mark) ka price – aap approve karte hain", "काम + पार्ट (ISI मार्क) की कीमत – आप मंज़ूरी देते हैं"),
              L("Repairs, insulates joints, switches power on and tests every point", "Repair, joint insulation, power on karke har point test", "रिपेयर, जोड़ों पर इंसुलेशन, बिजली चालू कर हर पॉइंट की जाँच")],
      tips: L("If you see sparks, smell burning or an MCB keeps tripping – switch off the main and don't reset it again and again.", "Spark dikhe, jalne ki smell aaye ya MCB baar baar trip ho – main switch band kar dein, baar baar on na karein.", "चिंगारी दिखे, जलने की गंध आए या MCB बार-बार ट्रिप हो – मेन स्विच बंद करें, बार-बार चालू न करें।"),
      price: () => priceFrom("home", ["el-switch", "el-fan", "el-fanrep", "el-light", "el-mcb", "el-wiring", "el-inverter", "el-bell"]) },
    // ----- phone repair
    { id: "phone", key: "mobile", m: /phone|mobile|iphone|galaxy|pixel|oneplus|redmi|vivo|oppo|realme|screen|display|battery|charging/, d: ["फोन", "फ़ोन", "मोबाइल", "स्क्रीन", "डिस्प्ले", "बैटरी", "चार्जिंग"],
      title: L("📱 Mobile repair at your doorstep", "📱 Mobile repair ghar pe", "📱 घर पर मोबाइल रिपेयर"),
      time: L("Screen / display: **30–60 min** · Battery: **30–45 min** · Charging port: **45–60 min** · Back glass: **60–90 min** · Camera / speaker / mic: **30–60 min** · Water damage: diagnosis **30 min**, repair may need a lab visit (24–72 h).",
              "Screen / display: **30–60 min** · Battery: **30–45 min** · Charging port: **45–60 min** · Back glass: **60–90 min** · Camera / speaker / mic: **30–60 min** · Paani ka damage: check **30 min**, repair me lab bhejna pad sakta hai (24–72 ghante).",
              "स्क्रीन / डिस्प्ले: **30–60 मिनट** · बैटरी: **30–45 मिनट** · चार्जिंग पोर्ट: **45–60 मिनट** · बैक ग्लास: **60–90 मिनट** · कैमरा / स्पीकर / माइक: **30–60 मिनट** · पानी से खराबी: जाँच **30 मिनट**, रिपेयर के लिए लैब भेजना पड़ सकता है (24–72 घंटे)।"),
      steps: [L("Technician checks the phone in front of you and confirms the fault", "Technician aapke saamne phone check karke kharabi confirm karta hai", "तकनीशियन आपके सामने फ़ोन जाँचकर खराबी पक्की करता है"),
              L("Shows the exact price & part warranty – you approve", "Exact price aur part warranty dikhata hai – aap approve karte hain", "सही कीमत और पार्ट वारंटी दिखाता है – आप मंज़ूरी देते हैं"),
              L("Opens the phone with proper heat & tools, replaces the part **in front of you** – your data stays on the phone", "Sahi heat aur tools se phone kholkar part **aapke saamne** badalta hai – data phone me hi rehta hai", "सही हीट और टूल से फ़ोन खोलकर पार्ट **आपके सामने** बदलता है – डेटा फ़ोन में ही रहता है"),
              L("Tests touch, display, camera, charging, calls & Face ID/fingerprint", "Touch, display, camera, charging, call aur Face ID/fingerprint test", "टच, डिस्प्ले, कैमरा, चार्जिंग, कॉल और Face ID/फ़िंगरप्रिंट टेस्ट"),
              L("Seals the phone, gives a warranty bill – then you pay", "Phone seal, warranty bill – phir payment", "फ़ोन सील, वारंटी बिल – फिर भुगतान")],
      tips: L("Keep your passcode handy for testing (you can enter it yourself). Back up important data if the phone still works.", "Testing ke liye passcode yaad rakhein (aap khud daal sakte hain). Phone chal raha ho to zaroori data backup kar lein.", "टेस्टिंग के लिए पासकोड याद रखें (आप खुद डाल सकते हैं)। फ़ोन चल रहा हो तो ज़रूरी डेटा बैकअप कर लें।"),
      price: () => 0 },
  ];
  const TBYID = Object.fromEntries(T.map((t) => [t.id, t]));

  // ======================================================================
  // DIAGNOSIS FLOWS: yes/no decision trees. Node = {q, y, n} | result {r, svc, safe?}
  // ======================================================================
  const R = (text, key, extra) => Object.assign({ r: text, key }, extra || {});
  const F = [
    { id: "ac-cool", m: /(\bac\b|a\.c|air ?condition\w*).*(not cool|no cool|cooling (nahi|nhi|kam|less|weak|problem|issue)|thanda nahi|thanda nhi|kam thanda|garam hawa|hot air|warm air)|not cooling|cooling nahi|cooling kam|thanda nahi kar/, d: ["ठंडा नहीं", "ठंडी नहीं", "कूलिंग नहीं", "कूलिंग कम", "गर्म हवा"],
      intro: L("Let's find out why your AC isn't cooling. First, a quick check: **set mode to COOL and temperature to 24°C**, close doors & windows.", "Chaliye dekhte hain AC thanda kyu nahi kar raha. Pehle: **mode COOL aur temperature 24°C** set karein, darwaze-khidki band karein.", "आइए देखें एसी ठंडा क्यों नहीं कर रहा। पहले: **मोड COOL और तापमान 24°C** रखें, दरवाज़े-खिड़की बंद करें।"),
      start: "q1",
      nodes: {
        q1: { q: L("Is the **outdoor unit fan running** (you can hear/see it spinning)?", "Kya **outdoor unit ka pankha chal raha hai** (ghoomta dikh/sun raha hai)?", "क्या **आउटडोर यूनिट का पंखा चल रहा है** (घूमता दिख/सुनाई दे रहा है)?"), y: "q2", n: "rOut" },
        q2: { q: L("Was the AC **serviced / filters cleaned in the last 4 months**?", "Kya **pichhle 4 mahine me AC service / filter safai** hui hai?", "क्या **पिछले 4 महीने में एसी सर्विस / फ़िल्टर सफ़ाई** हुई है?"), y: "q3", n: "rDirty" },
        q3: { q: L("Do you see **ice/frost on the pipes** or is the cooling getting weaker every week?", "Kya **pipe pe barf/jamav** dikhta hai ya cooling har hafte kam ho rahi hai?", "क्या **पाइप पर बर्फ़/जमाव** दिखता है या कूलिंग हर हफ़्ते कम हो रही है?"), y: "rGas", n: "rCheck" },
        rOut: R(L("Likely **outdoor fan motor, capacitor or PCB/relay** fault – the compressor isn't getting power. Please don't keep restarting it. Book a **check-up & repair visit**.", "Lagta hai **outdoor fan motor, capacitor ya PCB/relay** ki kharabi hai – compressor ko power nahi mil rahi. Baar baar restart na karein. **Check-up & repair visit** book karein.", "संभवतः **आउटडोर फैन मोटर, कैपेसिटर या PCB/रिले** की खराबी है – कंप्रेसर को बिजली नहीं मिल रही। बार-बार चालू-बंद न करें। **चेक-अप और रिपेयर विज़िट** बुक करें।"), "ac", { topic: "acservice", items: ["check", "pcb"] }),
        rDirty: R(L("Most likely **dirty filters & cooling coil** – the #1 cause of weak cooling. Wash the filters with plain water today, and book a **jet service** for the coil (45–60 min).", "Sabse zyada chance **gande filter aur coil** ka hai – kam cooling ki sabse badi wajah. Aaj filter saade paani se dho lein, aur coil ke liye **jet service** book karein (45–60 min).", "सबसे ज़्यादा संभावना **गंदे फ़िल्टर और कॉइल** की है – कम कूलिंग की सबसे बड़ी वजह। आज फ़िल्टर सादे पानी से धो लें, और कॉइल के लिए **जेट सर्विस** बुक करें (45–60 मिनट)।"), "ac", { topic: "acservice", items: ["jet", "foam"] }),
        rGas: R(L("Sounds like **low gas due to a leak**. Technician will check gauge pressure, find & fix the leak, then top-up/refill (45 min – 2 h).", "Lagta hai **leak ki wajah se gas kam** hai. Technician gauge se pressure check karke leak theek karega, phir top-up/refill (45 min – 2 ghante).", "लगता है **लीक की वजह से गैस कम** है। तकनीशियन गेज से प्रेशर देखकर लीक ठीक करेगा, फिर टॉप-अप/रिफिल (45 मिनट – 2 घंटे)।"), "ac", { topic: "acgas", items: ["gastop", "gasfull"] }),
        rCheck: R(L("Needs a proper check – could be the **sensor, fan speed, or a weak capacitor**. Book a **check-up & repair visit**; the technician tells you the exact fault and price before any work.", "Proper check chahiye – **sensor, fan speed ya kamzor capacitor** ho sakta hai. **Check-up & repair visit** book karein; kaam se pehle technician exact kharabi aur price batayega.", "ठीक से जाँच चाहिए – **सेंसर, फैन स्पीड या कमज़ोर कैपेसिटर** हो सकता है। **चेक-अप और रिपेयर विज़िट** बुक करें; काम से पहले तकनीशियन सही खराबी और कीमत बताएगा।"), "ac", { topic: "acservice", items: ["check"] }),
      } },
    { id: "ac-leak", m: /(\bac\b|a\.c).*(water|pani|paani|leak|tapak|drip)|(water|pani|paani).{0,25}(drip|leak|tapak|gir).{0,20}(\bac\b|a\.c)/, d: ["एसी से पानी", "एसी पानी", "पानी टपक"],
      intro: L("Water dripping from the indoor AC is usually a **blocked drain pipe** or **dirty coil/tray**.", "Indoor AC se paani girna aam taur pe **block drain pipe** ya **gandi coil/tray** ki wajah se hota hai.", "इनडोर एसी से पानी गिरना आमतौर पर **बंद ड्रेन पाइप** या **गंदी कॉइल/ट्रे** की वजह से होता है।"),
      start: "q1", nodes: {
        q1: { q: L("Is the AC **newly installed or recently moved**?", "Kya AC **naya laga hai ya haal hi me shift** hua hai?", "क्या एसी **नया लगा है या हाल में शिफ्ट** हुआ है?"), y: "rTilt", n: "rDrain" },
        rTilt: R(L("Likely the **indoor unit isn't level** or the drain pipe slope is wrong. Book a **water leakage fix** – re-levelling + drain check (30–45 min).", "Shayad **indoor unit seedha nahi laga** ya drain pipe ki dhalaan galat hai. **Water leakage fix** book karein – levelling + drain check (30–45 min).", "शायद **इनडोर यूनिट सीधी नहीं लगी** या ड्रेन पाइप की ढलान गलत है। **वॉटर लीकेज फ़िक्स** बुक करें – लेवलिंग + ड्रेन जाँच (30–45 मिनट)।"), "ac", { items: ["leak"] }),
        rDrain: R(L("Most likely a **choked drain pipe / dirty tray**. Switch the AC off to protect the wall. A **water leakage fix** (30–45 min) or **jet service** (cleans coil + drain) solves it.", "Sabse zyada chance **drain pipe jam / tray gandi** hone ka hai. Deewar bachane ke liye AC band rakhein. **Water leakage fix** (30–45 min) ya **jet service** (coil + drain safai) se theek ho jata hai.", "सबसे ज़्यादा संभावना **ड्रेन पाइप जाम / ट्रे गंदी** होने की है। दीवार बचाने के लिए एसी बंद रखें। **वॉटर लीकेज फ़िक्स** (30–45 मिनट) या **जेट सर्विस** (कॉइल + ड्रेन सफ़ाई) से ठीक हो जाता है।"), "ac", { items: ["leak", "jet"] }),
      } },
    { id: "wm", m: /(washing|machine|washer).*(not|nahi|nhi|problem|kharab|band|issue|error|leak|noise|awaz|spin|drain|ghoom)/, d: ["वॉशिंग मशीन नहीं", "मशीन नहीं", "मशीन खराब", "मशीन से पानी", "मशीन आवाज"],
      intro: L("Let's narrow down the washing machine problem.", "Washing machine ki problem pakadte hain.", "वॉशिंग मशीन की समस्या पता करते हैं।"),
      start: "q1", nodes: {
        q1: { q: L("Does the machine **power on** (display/lights come on)?", "Kya machine **on hoti hai** (display/light jalti hai)?", "क्या मशीन **चालू होती है** (डिस्प्ले/लाइट जलती है)?"), y: "q2", n: "rPower" },
        q2: { q: L("Is the problem that **water doesn't drain** or **drum doesn't spin**?", "Kya problem ye hai ki **paani nahi nikalta** ya **drum nahi ghoomta**?", "क्या समस्या है कि **पानी नहीं निकलता** या **ड्रम नहीं घूमता**?"), y: "rDrain", n: "q3" },
        q3: { q: L("Is it **leaking water** or making **loud noise/shaking**?", "Kya **paani leak** ho raha hai ya **tez awaz/hilna**?", "क्या **पानी लीक** हो रहा है या **तेज़ आवाज़/हिलना**?"), y: "rLeakNoise", n: "rGeneral" },
        rPower: R(L("Check the socket with another appliance and the plug fuse. If the socket works, it's likely the **door lock, power board or fuse in the machine** – book **'Not starting / no power'**.", "Socket ko kisi aur appliance se check karein. Socket theek hai to **door lock, power board ya machine ka fuse** ho sakta hai – **'Not starting / no power'** book karein.", "सॉकेट किसी और उपकरण से जाँचें। सॉकेट ठीक है तो **डोर लॉक, पावर बोर्ड या मशीन का फ़्यूज़** हो सकता है – **'Not starting / no power'** बुक करें।"), "washing", { items: ["wm-start"] }),
        rDrain: R(L("Try cleaning the **drain filter** (front-load: small door at bottom; keep a towel). Also make sure clothes are spread evenly. Still stuck? Likely **drain pump or belt/motor** – book **'Not spinning' / 'Not draining'** (45–90 min).", "**Drain filter** saaf karke dekhein (front-load: neeche chhota dhakkan; towel rakh lein). Kapde barabar phaila dein. Phir bhi nahi? To **drain pump ya belt/motor** – **'Not spinning' / 'Not draining'** book karein (45–90 min).", "**ड्रेन फ़िल्टर** साफ़ करके देखें (फ्रंट-लोड: नीचे छोटा ढक्कन; तौलिया रख लें)। कपड़े बराबर फैला दें। फिर भी नहीं? तो **ड्रेन पंप या बेल्ट/मोटर** – **'Not spinning' / 'Not draining'** बुक करें (45–90 मिनट)।"), "washing", { items: ["wm-spin", "wm-drain"] }),
        rLeakNoise: R(L("Leaks usually come from the **inlet hose, door gasket or drain pipe**; noise/shaking from **unlevelled legs, transit bolts or worn bearings**. Book **Water leakage** or **Noise / vibration** (45–90 min).", "Leak aam taur pe **inlet pipe, door rubber ya drain pipe** se; awaz/hilna **tedhe pair, transit bolt ya ghise bearing** se. **Water leakage** ya **Noise / vibration** book karein (45–90 min).", "लीक आमतौर पर **इनलेट पाइप, डोर रबर या ड्रेन पाइप** से; आवाज़/हिलना **टेढ़े पैर, ट्रांज़िट बोल्ट या घिसे बेयरिंग** से। **Water leakage** या **Noise / vibration** बुक करें (45–90 मिनट)।"), "washing", { items: ["wm-leak", "wm-noise"] }),
        rGeneral: R(L("Book a visit – technician runs a test cycle, reads the error code and quotes before repairing. If it smells bad or leaves residue, a **service & descaling** (60–90 min) helps.", "Visit book karein – technician test cycle chala ke error code padhega aur repair se pehle price batayega. Badbu ya residue ho to **service & descaling** (60–90 min) karwayein.", "विज़िट बुक करें – तकनीशियन टेस्ट साइकिल चलाकर एरर कोड पढ़ेगा और रिपेयर से पहले कीमत बताएगा। बदबू या जमाव हो तो **सर्विस और डीस्केलिंग** (60–90 मिनट) कराएँ।"), "washing", { items: ["wm-service"] }),
      } },
    { id: "ph-charge", x: /visit charge|inspection charge|extra charge|service charge|charges|charge kitna|charge kya/, m: /\b(not|nahi|nhi|slow|dheere|dhire)\b.{0,12}\bcharg(e|ing)\b|\bcharg(e|ing)\b.{0,12}\b(not|nahi|nhi|slow|dheere|dhire|band)\b/, d: ["चार्ज नहीं", "चार्जिंग नहीं", "चार्जिंग धीमी", "चार्ज धीरे"],
      intro: L("Phone not charging? Let's rule out the simple things first.", "Phone charge nahi ho raha? Pehle chhoti cheezein check karte hain.", "फ़ोन चार्ज नहीं हो रहा? पहले छोटी चीज़ें जाँचते हैं।"),
      start: "q1", nodes: {
        q1: { q: L("Have you tried a **different cable and adapter** (that works on another phone)?", "Kya aapne **dusri cable aur adapter** (jo dusre phone pe chalta ho) try kiya?", "क्या आपने **दूसरी केबल और एडॉप्टर** (जो दूसरे फ़ोन पर चलता हो) आज़माया?"), y: "q2", n: "rCable" },
        q2: { q: L("Does it charge if you **wiggle the cable / hold it at an angle**?", "Kya **cable hilane / tedha pakadne** pe charge hota hai?", "क्या **केबल हिलाने / टेढ़ा पकड़ने** पर चार्ज होता है?"), y: "rPort", n: "rBoard" },
        rCable: R(L("Try another cable & adapter first – faulty cables are very common. Also look inside the port with a torch: **lint/dust** blocks contact (clean very gently with a wooden toothpick, never metal).", "Pehle dusri cable aur adapter try karein – kharab cable bahut aam hai. Torch se port me dekhein: **dhool/rui** contact rokti hai (lakdi ki toothpick se dheere saaf karein, metal kabhi nahi).", "पहले दूसरी केबल और एडॉप्टर आज़माएँ – खराब केबल बहुत आम है। टॉर्च से पोर्ट में देखें: **धूल/रुई** कॉन्टैक्ट रोकती है (लकड़ी की टूथपिक से धीरे साफ़ करें, धातु कभी नहीं)।"), "mobile", { issueId: 7 }),
        rPort: R(L("That points to a **loose/worn charging port**. Port replacement takes **45–60 min** at your door.", "Ye **dheela/ghisa charging port** lagta hai. Port badalne me ghar pe **45–60 min** lagte hain.", "यह **ढीला/घिसा चार्जिंग पोर्ट** लगता है। पोर्ट बदलने में घर पर **45–60 मिनट** लगते हैं।"), "mobile", { issueId: 7 }),
        rBoard: R(L("Could be the **battery or charging IC** – needs a check. Book a doorstep diagnosis; the technician tests with a USB meter and quotes before repairing.", "**Battery ya charging IC** ho sakta hai – check zaroori. Ghar pe diagnosis book karein; technician USB meter se test karke repair se pehle price batayega.", "**बैटरी या चार्जिंग IC** हो सकता है – जाँच ज़रूरी। घर पर जाँच बुक करें; तकनीशियन USB मीटर से टेस्ट करके रिपेयर से पहले कीमत बताएगा।"), "mobile", { issueId: 7 }),
      } },
    { id: "ph-battery", m: /battery.*(drain|jaldi|khatam|fast|backup|swell|phool|garam|heat)|(drain|backup).*(battery)|battery (problem|kharab|issue|low)/, d: ["बैटरी जल्दी", "बैटरी खत्म", "बैटरी फूल", "बैटरी गर्म", "बैकअप"],
      intro: L("Let's check your battery.", "Battery check karte hain.", "बैटरी जाँचते हैं।"),
      start: "q1", nodes: {
        q1: { q: L("Is the phone **swollen** (screen lifting / back bulging) or **very hot**?", "Kya phone **phool gaya** hai (screen utth rahi / back ubhra) ya **bahut garam** hota hai?", "क्या फ़ोन **फूल गया** है (स्क्रीन उठ रही / पीछे उभार) या **बहुत गर्म** होता है?"), y: "rSwell", n: "q2" },
        q2: { q: L("Is the phone **more than 2 years old** (or battery health below 80%)?", "Kya phone **2 saal se purana** hai (ya battery health 80% se kam)?", "क्या फ़ोन **2 साल से पुराना** है (या बैटरी हेल्थ 80% से कम)?"), y: "rOld", n: "rApps" },
        rSwell: R(L("⚠️ **Stop charging and don't press it** – a swollen battery is a fire risk. Keep it away from the bed/pillow. Book a **battery replacement** (30–45 min) as soon as possible.", "⚠️ **Charging band karein aur dabayein nahi** – phooli battery se aag ka khatra hai. Bistar/takiye se door rakhein. Jaldi **battery replacement** book karein (30–45 min).", "⚠️ **चार्जिंग बंद करें और दबाएँ नहीं** – फूली बैटरी से आग का खतरा है। बिस्तर/तकिए से दूर रखें। जल्दी **बैटरी बदलवाएँ** (30–45 मिनट)।"), "mobile", { issueId: 5, safe: true }),
        rOld: R(L("Batteries wear out after ~500 charge cycles (about 2 years). A **battery replacement** takes **30–45 min** at your door and comes with warranty.", "Battery ~500 charge cycle (lagbhag 2 saal) ke baad kamzor ho jati hai. **Battery replacement** ghar pe **30–45 min** me, warranty ke saath.", "बैटरी ~500 चार्ज साइकिल (लगभग 2 साल) बाद कमज़ोर हो जाती है। **बैटरी बदलना** घर पर **30–45 मिनट** में, वारंटी के साथ।"), "mobile", { issueId: 5 }),
        rApps: R(L("Check **Settings → Battery** for an app using a lot of power, turn off unused location/background refresh and update the software. Still draining? Book a battery check.", "**Settings → Battery** me dekhein kaun sa app zyada battery kha raha hai, location/background refresh band karein aur software update karein. Phir bhi drain? Battery check book karein.", "**Settings → Battery** में देखें कौन सा ऐप ज़्यादा बैटरी खा रहा है, लोकेशन/बैकग्राउंड रिफ्रेश बंद करें और सॉफ़्टवेयर अपडेट करें। फिर भी खत्म? बैटरी जाँच बुक करें।"), "mobile", { issueId: 5 }),
      } },
    { id: "ph-water", m: /(phone|mobile|iphone).*(water|pani|paani|wet|bheeg|gir gaya pani|liquid)|(water|pani|paani|liquid).*(phone|mobile|iphone)|water damage/, d: ["फोन पानी", "फ़ोन पानी", "पानी में गिर", "भीग"],
      intro: L("📱💧 Act fast – **do this right now:**\n• **Switch it off** and don't turn it on to check\n• **Don't charge** it\n• Remove case & SIM tray, wipe it dry, keep it standing in air/fan\n• **Don't use rice or a hair dryer** – they push water inside / overheat\n\nCorrosion starts within hours.",
                 "📱💧 Jaldi karein – **abhi ye karein:**\n• **Phone band kar dein**, check karne ke liye on na karein\n• **Charge na karein**\n• Cover aur SIM tray nikal ke pochh dein, pankhe ki hawa me khada rakhein\n• **Chawal ya hair dryer use na karein** – paani andar jata hai / garam hota hai\n\nKuch ghanton me jang (corrosion) shuru ho jata hai.",
                 "📱💧 जल्दी करें – **अभी यह करें:**\n• **फ़ोन बंद कर दें**, जाँचने के लिए चालू न करें\n• **चार्ज न करें**\n• कवर और सिम ट्रे निकालकर पोंछें, पंखे की हवा में खड़ा रखें\n• **चावल या हेयर ड्रायर का इस्तेमाल न करें** – पानी अंदर जाता है / गर्म होता है\n\nकुछ घंटों में जंग (करोज़न) शुरू हो जाता है।"),
      start: "rNow", nodes: { rNow: R(L("Book a **doorstep diagnosis today** – the technician opens and cleans the board (ultrasonic/IPA) and tells you what's recoverable.", "**Aaj hi ghar pe diagnosis** book karein – technician phone khol ke board saaf karega (IPA) aur batayega kya theek ho sakta hai.", "**आज ही घर पर जाँच** बुक करें – तकनीशियन फ़ोन खोलकर बोर्ड साफ़ करेगा (IPA) और बताएगा क्या ठीक हो सकता है।"), "mobile", { issueId: 11, safe: true }) } },
    { id: "ph-dead", m: /(phone|mobile|iphone).*(not (turning|switching) on|won'?t (turn|switch) on|dead|on nahi|on nhi|band ho gaya|chalu nahi|logo|hang|restart)|(on nahi ho raha|switch on nahi)/, d: ["फोन चालू नहीं", "फ़ोन चालू नहीं", "ऑन नहीं", "फोन बंद", "हैंग"],
      intro: L("Phone not turning on? Try a **force restart** first:\n• **iPhone 8 and newer:** press Volume Up, then Volume Down, then hold Side button ~15 s until the logo\n• **Android:** hold **Power + Volume Down** for 15–20 s\nAlso charge it for **20 min with a known-good charger**.",
                 "Phone on nahi ho raha? Pehle **force restart** karein:\n• **iPhone 8 aur naye:** Volume Up dabake chhodein, Volume Down dabake chhodein, phir Side button ~15 sec dabaye rakhein\n• **Android:** **Power + Volume Down** 15–20 sec dabaye rakhein\nAur **20 min sahi charger** se charge karein.",
                 "फ़ोन चालू नहीं हो रहा? पहले **फ़ोर्स रीस्टार्ट** करें:\n• **iPhone 8 और नए:** वॉल्यूम अप दबाकर छोड़ें, वॉल्यूम डाउन दबाकर छोड़ें, फिर साइड बटन ~15 सेकंड दबाए रखें\n• **एंड्रॉयड:** **पावर + वॉल्यूम डाउन** 15–20 सेकंड दबाए रखें\nऔर **20 मिनट सही चार्जर** से चार्ज करें।"),
      start: "q1", nodes: {
        q1: { q: L("Did that bring it back?", "Kya isse phone chalu hua?", "क्या इससे फ़ोन चालू हुआ?"), y: "rOk", n: "rDiag" },
        rOk: R(L("Great! 🎉 If it keeps freezing, update the software and free up storage. If it happens again, book a check.", "Badhiya! 🎉 Baar baar hang ho to software update karein aur storage khaali karein. Phir ho to check book karein.", "बढ़िया! 🎉 बार-बार हैंग हो तो सॉफ़्टवेयर अपडेट करें और स्टोरेज खाली करें। फिर हो तो जाँच बुक करें।"), "mobile", { issueId: 9 }),
        rDiag: R(L("Likely **battery, charging IC or display** (phone may be on with a dead screen – try calling it). Book a **doorstep diagnosis** (30 min); exact price before repair.", "Shayad **battery, charging IC ya display** (phone on ho par screen band – call karke dekhein). **Ghar pe diagnosis** book karein (30 min); repair se pehle exact price.", "शायद **बैटरी, चार्जिंग IC या डिस्प्ले** (फ़ोन चालू हो पर स्क्रीन बंद – कॉल करके देखें)। **घर पर जाँच** बुक करें (30 मिनट); रिपेयर से पहले सही कीमत।"), "mobile", { issueId: 9 }),
      } },
    { id: "mcb", m: /mcb.*(trip|gir|down|off)|trip(ping)? (ho|kar|again)|baar baar (light|bijli) (ja|gay)|short ?circuit|spark|chingari|burning smell|jalne ki/, d: ["एमसीबी", "ट्रिप", "शॉर्ट सर्किट", "चिंगारी", "जलने की"],
      intro: L("⚡ **Safety first:** if you see sparks or smell burning, switch off the **main switch** now and don't touch the board with wet hands.", "⚡ **Pehle safety:** spark dikhe ya jalne ki smell aaye to **main switch** abhi band karein, geele haath se board na chhuein.", "⚡ **पहले सुरक्षा:** चिंगारी दिखे या जलने की गंध आए तो **मेन स्विच** अभी बंद करें, गीले हाथ से बोर्ड न छुएँ।"),
      start: "q1", nodes: {
        q1: { q: L("Does it trip when a **specific appliance** (geyser, AC, iron, heater) is switched on?", "Kya **koi khaas appliance** (geyser, AC, press, heater) on karne pe trip hota hai?", "क्या **कोई खास उपकरण** (गीज़र, एसी, प्रेस, हीटर) चालू करने पर ट्रिप होता है?"), y: "rApp", n: "rWire" },
        rApp: R(L("Keep that appliance unplugged – it may have an **internal short / earth leakage**, or the circuit is **overloaded**. Book an electrician to test the appliance & circuit (30–60 min).", "Us appliance ka plug nikal ke rakhein – usme **andar short / earth leakage** ho sakta hai ya circuit **overload** hai. Appliance aur circuit test ke liye electrician book karein (30–60 min).", "उस उपकरण का प्लग निकालकर रखें – उसमें **अंदर शॉर्ट / अर्थ लीकेज** हो सकता है या सर्किट **ओवरलोड** है। उपकरण और सर्किट जाँच के लिए इलेक्ट्रीशियन बुक करें (30–60 मिनट)।"), "electrician", { items: ["el-mcb", "el-wiring"], safe: true }),
        rWire: R(L("Random tripping usually means a **wiring fault, loose joint or moisture** in a board. Don't keep resetting it. Book a **wiring fault check & fix** (1–2 hours).", "Bina wajah trip hona aam taur pe **wiring fault, dheela joint ya board me nami** hoti hai. Baar baar on na karein. **Wiring fault check & fix** book karein (1–2 ghante).", "बिना वजह ट्रिप होना आमतौर पर **वायरिंग खराबी, ढीला जोड़ या बोर्ड में नमी** होता है। बार-बार चालू न करें। **वायरिंग फ़ॉल्ट चेक और फ़िक्स** बुक करें (1–2 घंटे)।"), "electrician", { items: ["el-wiring", "el-mcb"], safe: true }),
      } },
    { id: "fan", x: /\bac\b|outdoor|exhaust/, m: /(\bfan\b|pankha).*(slow|dheere|dhire|not|nahi|nhi|noise|awaz|hum|kharab|band)/, d: ["पंखा धीरे", "पंखा नहीं", "पंखा खराब", "पंखे की आवाज"],
      intro: L("Let's check the fan.", "Pankha check karte hain.", "पंखा जाँचते हैं।"),
      start: "q1", nodes: {
        q1: { q: L("Does the fan **hum but spin slowly / need a push** to start?", "Kya pankha **hum karta hai par dheere ghoomta / dhakka dene pe chalta** hai?", "क्या पंखा **भनभनाता है पर धीरे घूमता / धक्का देने पर चलता** है?"), y: "rCap", n: "rReg" },
        rCap: R(L("Classic **weak capacitor** – a 30-minute fix. Book **Fan repair**.", "Ye **kamzor capacitor** ki nishani hai – 30 min ka kaam. **Fan repair** book karein.", "यह **कमज़ोर कैपेसिटर** की निशानी है – 30 मिनट का काम। **फैन रिपेयर** बुक करें।"), "electrician", { items: ["el-fanrep"] }),
        rReg: R(L("Could be the **regulator, switch or winding**. Try the fan at full speed with the regulator bypassed (if you have a plain switch). Book **Fan repair** (30–60 min).", "**Regulator, switch ya winding** ho sakta hai. **Fan repair** book karein (30–60 min).", "**रेगुलेटर, स्विच या वाइंडिंग** हो सकता है। **फैन रिपेयर** बुक करें (30–60 मिनट)।"), "electrician", { items: ["el-fanrep"] }),
      } },
    { id: "block", m: /(drain|basin|sink|toilet|commode|bathroom|nali).*(block|jam|choke|band|slow|nahi ja)|(block|choke|jam).*(drain|basin|sink|toilet|nali)/, d: ["नाली जाम", "जाम", "पानी नहीं जा", "ब्लॉक"],
      intro: L("Blocked drain? Pour **hot (not boiling) water** and try a plunger first. **Never use acid** – it damages pipes and can burn.", "Drain jam? Pehle **garam (ubalta nahi) paani** daalein aur plunger try karein. **Acid kabhi na daalein** – pipe kharab hoti hai aur jalne ka khatra hai.", "नाली जाम? पहले **गर्म (उबलता नहीं) पानी** डालें और प्लंजर आज़माएँ। **तेज़ाब कभी न डालें** – पाइप खराब होती है और जलने का खतरा है।"),
      start: "q1", nodes: {
        q1: { q: L("Is **more than one** drain slow (e.g. basin + floor trap)?", "Kya **ek se zyada** drain slow hain (jaise basin + floor ki jaali)?", "क्या **एक से ज़्यादा** नाली धीमी हैं (जैसे बेसिन + फ़र्श की जाली)?"), y: "rMain", n: "rLocal" },
        rMain: R(L("Points to a blockage in the **main line**. Book **Drain / basin blockage** – plumber uses a drain spring/machine (45–60 min).", "**Main line** me jam lagta hai. **Drain / basin blockage** book karein – plumber spring/machine use karega (45–60 min).", "**मेन लाइन** में जाम लगता है। **ड्रेन / बेसिन ब्लॉकेज** बुक करें – प्लंबर स्प्रिंग/मशीन इस्तेमाल करेगा (45–60 मिनट)।"), "plumber", { items: ["pl-block"] }),
        rLocal: R(L("Likely hair/soap build-up in the **trap**. Book **Drain / basin blockage** (30–45 min) if the plunger doesn't clear it.", "Shayad **trap** me baal/sabun jama hai. Plunger se na khule to **Drain / basin blockage** book karein (30–45 min).", "शायद **ट्रैप** में बाल/साबुन जमा है। प्लंजर से न खुले तो **ड्रेन / बेसिन ब्लॉकेज** बुक करें (30–45 मिनट)।"), "plumber", { items: ["pl-block"] }),
      } },
    { id: "geyser", m: /geyser.*(not|nahi|nhi|kharab|band|problem|garam nahi|heat)|water heater.*(not|nahi)|garam paani nahi|hot water (not|nahi)/, d: ["गीज़र गर्म नहीं", "गीजर गर्म नहीं", "गर्म पानी नहीं", "गीज़र खराब", "गीजर खराब"],
      intro: L("Geyser not heating? Check that the **switch and its MCB are on** and the indicator light glows.", "Geyser garam nahi kar raha? **Switch aur uska MCB on** hai aur light jal rahi hai, ye check karein.", "गीज़र गर्म नहीं कर रहा? **स्विच और उसका MCB चालू** है और लाइट जल रही है, यह जाँचें।"),
      start: "q1", nodes: {
        q1: { q: L("Does the **indicator light** come on?", "Kya **indicator light** jalti hai?", "क्या **इंडिकेटर लाइट** जलती है?"), y: "rElem", n: "rPow" },
        rElem: R(L("Light on but no hot water → usually a **burnt heating element or thermostat**. Book an electrician/plumber visit (45–60 min, part extra).", "Light jal rahi par paani garam nahi → aam taur pe **heating element ya thermostat** kharab. Visit book karein (45–60 min, part extra).", "लाइट जल रही पर पानी गर्म नहीं → आमतौर पर **हीटिंग एलिमेंट या थर्मोस्टैट** खराब। विज़िट बुक करें (45–60 मिनट, पार्ट अलग)।"), "electrician", { items: ["el-wiring"] }),
        rPow: R(L("No power reaching the geyser – could be the **socket, wiring or thermal cut-out**. Book an electrician (30–60 min).", "Geyser tak bijli nahi pahunch rahi – **socket, wiring ya thermal cut-out** ho sakta hai. Electrician book karein (30–60 min).", "गीज़र तक बिजली नहीं पहुँच रही – **सॉकेट, वायरिंग या थर्मल कट-आउट** हो सकता है। इलेक्ट्रीशियन बुक करें (30–60 मिनट)।"), "electrician", { items: ["el-switch", "el-wiring"] }),
      } },
  ];
  const FBYID = Object.fromEntries(F.map((f) => [f.id, f]));

  // ---------- general Q&A (technician, warranty process, etc.)
  const GEN = [
    { m: /technician.*(verified|trained|safe|kaun|who|background)|(verified|trained).*technician|bharosa|trust|safe hai/, d: ["तकनीशियन", "भरोसा", "सुरक्षित"],
      a: L("👷 Every ZippHive technician is **ID-verified, trained** on the service they do, and comes in **ZippHive uniform with a tool kit**. You get their name and a **live tracking link** on WhatsApp before they arrive. Work is done in front of you and checked with you before payment.",
           "👷 Har ZippHive technician **ID-verified aur trained** hai, aur **ZippHive uniform aur tool kit** ke saath aata hai. Aane se pehle WhatsApp pe naam aur **live tracking link** milta hai. Kaam aapke saamne hota hai aur payment se pehle aapke saath check hota hai.",
           "👷 हर ZippHive तकनीशियन **ID-सत्यापित और प्रशिक्षित** है, और **ZippHive यूनिफ़ॉर्म व टूल किट** के साथ आता है। आने से पहले WhatsApp पर नाम और **लाइव ट्रैकिंग लिंक** मिलता है। काम आपके सामने होता है और भुगतान से पहले आपके साथ जाँचा जाता है।") },
    { m: /(what|which) services|kya kya (service|kaam)|services (list|kya)|aap kya (karte|repair)/, d: ["कौन सी सेवा", "क्या क्या", "सेवाएं", "सेवाएँ"],
      a: L("We do **mobile repair, AC service/repair/installation, AC AMC plans, washing machine, plumber, electrician and home cleaning** – all at your doorstep. Ask me *how any service works* or *how long it takes*, or say **'diagnose'** if something isn't working.",
           "Hum **mobile repair, AC service/repair/installation, AC AMC plan, washing machine, plumber, electrician aur home cleaning** karte hain – aapke ghar pe. Mujhse poochiye *koi service kaise hoti hai* ya *kitna time lagta hai*, ya kuch kharab ho to **'diagnose'** likhiye.",
           "हम **मोबाइल रिपेयर, एसी सर्विस/रिपेयर/इंस्टॉलेशन, एसी एएमसी प्लान, वॉशिंग मशीन, प्लंबर, इलेक्ट्रीशियन और होम क्लीनिंग** करते हैं – आपके घर पर। मुझसे पूछिए *कोई सेवा कैसे होती है* या *कितना समय लगता है*, या कुछ खराब हो तो **'समस्या पहचानें'** लिखिए।") },
  ];

  // ---------- matching helpers
  const has = (raw, low, item) => !(item.x && item.x.test(low)) && ((item.m && item.m.test(low)) || (item.d && item.d.some((w) => raw.includes(w))));
  const ASK_TIME = /how (long|much time)|kitna (time|samay|waqt)|kitne (time|der|ghante|minute)|kitni der|time lag|samay lag|duration|kab tak|how many (hours|minutes)/;
  const ASK_TIME_HI = /कितना समय|कितनी देर|कितने घंटे|कितने मिनट|समय लग|टाइम लग/;
  const ASK_HOW = /process|procedure|how (does|do|is|will|to)|kaise (hota|hoti|karte|karta|karega|kare|hoga)|kya (karta|karte|karega|hota)|what (does|will) (the )?technician|steps|technician kya|kaam kaise|explain|batao kaise|kya kya hota/;
  const ASK_HOW_HI = /कैसे|प्रक्रिया|क्या करता|क्या करते|क्या होता|तरीका/;
  const DIAG_WORD = /diagnos|problem (hai|h)|kharab|not working|kaam nahi|issue|fault|troubleshoot|check karo|kya problem|why is|kyu nahi|kyun nahi/;
  const DIAG_HI = /खराब|समस्या|काम नहीं|दिक्कत|क्यों नहीं/;
  const END = "(?=$|[\\s,.!?।])";
  const YES = new RegExp("^\\s*(y|yes|yeah|yep|haan|haa|ha|han|hn|ji|ji haan|haan ji|sahi|correct|right|bilkul|हाँ|हां|हा|जी|जी हाँ|बिल्कुल)" + END, "i");
  const NO = new RegExp("^\\s*(n|no|nope|nahi|nahin|nhi|na|nai|not really|bilkul nahi|नहीं|ना|नही)" + END, "i");

  function topicCard(t, lang, focus) {
    const p = t.price && t.price();
    const title = `**${tx(t.title, lang)}**`;
    const time = `⏱️ ${tx(t.time, lang)}`;
    const steps = (lang === "en" ? "👷 **What the technician does:**\n" : lang === "hn" ? "👷 **Technician kya karta hai:**\n" : "👷 **तकनीशियन क्या करता है:**\n") + t.steps.map((s, i) => `${i + 1}. ${tx(s, lang)}`).join("\n");
    const tip = `💡 ${tx(t.tips, lang)}`;
    const pr = p ? (lang === "hi" ? `💰 कीमत ${rs(p)} से` : lang === "hn" ? `💰 Price ${rs(p)} se shuru` : `💰 From ${rs(p)}`) : "";
    const parts = focus === "time" ? [title, time, pr, tip] : [title, time, steps, tip, pr];
    return parts.filter(Boolean).join("\n\n");
  }
  function topicChips(t, lang) {
    const c = [bookChip(t.key, lang)];
    const flow = { ac: "ac-cool", acinstall: null, washing: "wm", plumber: "block", electrician: "mcb", mobile: "ph-charge", cleaning: null, amc: null }[t.key];
    if (flow) c.push(diagChip(lang));
    c.push(waChip(lang, `Hi ZippHive, I have a question about ${tx(t.title, "en").replace(/^\W+/, "")}.`));
    return c;
  }

  function nodeReply(flow, nodeId, lang, prefix) {
    const node = flow.nodes[nodeId];
    if (node.q) {
      const yes = tx(L("✅ Yes", "✅ Haan", "✅ हाँ"), lang), no = tx(L("❌ No", "❌ Nahi", "❌ नहीं"), lang);
      return { reply: { intent: "kb-diag", text: (prefix ? prefix + "\n\n" : "") + "🩺 " + tx(node.q, lang), chips: [sayChip(yes, yes.replace(/^\W+/, "")), sayChip(no, no.replace(/^\W+/, "")), waChip(lang, "Hi ZippHive, I need help diagnosing a problem.")] }, kb: { flow: flow.id, node: nodeId, lang } };
    }
    // result
    const t = node.topic && TBYID[node.topic];
    let p = 0;
    if (node.items) p = priceFrom(ZB[node.key] || node.key, node.items);
    const pr = p ? (lang === "hi" ? `\n\n💰 कीमत ${rs(p)} से` : lang === "hn" ? `\n\n💰 Price ${rs(p)} se shuru` : `\n\n💰 From ${rs(p)}`) : "";
    const after = lang === "hi" ? "\n\nतकनीशियन काम से पहले खराबी और कीमत की पुष्टि करता है – आपकी हाँ के बाद ही काम, और भुगतान काम के बाद।" : lang === "hn" ? "\n\nTechnician kaam se pehle kharabi aur price confirm karta hai – aapki haan ke baad hi kaam, payment kaam ke baad." : "\n\nThe technician confirms the fault and price before starting – work only after you approve, pay after.";
    const chips = [];
    if (node.key === "mobile") chips.push({ label: tx(L("📱 See repair price", "📱 Repair price dekhein", "📱 रिपेयर कीमत देखें"), lang), action: { type: "price", target: node.issueId ? { issueId: node.issueId } : {} } });
    else chips.push(bookChip(node.key, lang));
    if (t) chips.push(sayChip(tx(L("👷 How is it done?", "👷 Kaise hota hai?", "👷 कैसे होता है?"), lang), tx(L("How is " + tx(t.title, "en").replace(/^\W+/, "") + " done", tx(t.title, "hn").replace(/^\W+/, "") + " kaise hota hai", tx(t.title, "hi").replace(/^\W+/, "") + " कैसे होता है"), lang)));
    chips.push(waChip(lang, `Hi ZippHive, I need help: ${tx(node.r, "en").replace(/\*\*/g, "").slice(0, 120)}`));
    return { reply: { intent: "kb-diag-result", text: (prefix ? prefix + "\n\n" : "") + "🩺 " + tx(node.r, lang) + pr + after, chips }, kb: null };
  }

  function diagMenu(lang) {
    const items = [
      ["❄️", L("AC not cooling", "AC thanda nahi kar raha", "एसी ठंडा नहीं कर रहा")],
      ["💧", L("Water dripping from AC", "AC se paani gir raha", "एसी से पानी गिर रहा")],
      ["🧺", L("Washing machine problem", "Washing machine kharab", "वॉशिंग मशीन खराब")],
      ["🔌", L("Phone not charging", "Phone charge nahi ho raha", "फ़ोन चार्ज नहीं हो रहा")],
      ["🔋", L("Battery drains fast", "Battery jaldi khatam", "बैटरी जल्दी खत्म")],
      ["📵", L("Phone not turning on", "Phone on nahi ho raha", "फ़ोन चालू नहीं हो रहा")],
      ["💦", L("Phone fell in water", "Phone pani me gir gaya", "फ़ोन पानी में गिर गया")],
      ["⚡", L("MCB keeps tripping", "MCB baar baar trip", "MCB बार-बार ट्रिप")],
      ["🌀", L("Fan slow / not working", "Pankha dheere chal raha", "पंखा धीरे चल रहा")],
      ["🚿", L("Drain blocked", "Nali jam hai", "नाली जाम है")],
      ["🔥", L("Geyser not heating", "Geyser garam nahi kar raha", "गीज़र गर्म नहीं कर रहा")],
    ];
    return { intent: "kb-diag-menu", text: tx(L("🩺 **I can help diagnose the problem.** What's happening? Pick one or just describe it in your words (English, Hindi or Hinglish).", "🩺 **Main problem pakadne me madad kar sakta hoon.** Kya ho raha hai? Neeche se chunein ya apne shabdon me likhein (English, Hindi ya Hinglish).", "🩺 **मैं समस्या पहचानने में मदद कर सकता हूँ।** क्या हो रहा है? नीचे से चुनें या अपने शब्दों में लिखें (हिंदी, English या Hinglish)।"), lang),
      chips: items.map(([e, l]) => sayChip(`${e} ${tx(l, lang)}`, tx(l, lang))) };
  }

  // ======================================================================
  // main entry – returns {reply, state} or null (let the price engine answer)
  // ======================================================================
  function answer(text, state, ctx) {
    state = state || {};
    ctx = ctx || {};
    const raw = String(text || "").trim();
    if (!raw) return null;
    const low = " " + raw.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ") + " ";
    const prevLang = (state.kb && state.kb.lang) || state.lang;
    const lang = /[ऀ-ॿ]/.test(raw) ? "hi" : prevLang && raw.split(/\s+/).length <= 2 ? prevLang : detectLang(raw);
    const out = (reply, kb) => ({ reply, state: Object.assign({}, state, { awaitModel: false, kb: kb || null, lang }) });

    // 1) continue an active diagnosis
    if (state.kb && state.kb.flow && FBYID[state.kb.flow]) {
      const f = FBYID[state.kb.flow], node = f.nodes[state.kb.node];
      const l2 = state.kb.lang || lang;
      if (node && node.q && (YES.test(raw) || NO.test(raw))) {
        const r = nodeReply(f, YES.test(raw) ? node.y : node.n, l2);
        return out(r.reply, r.kb);
      }
    }
    // 1b) service area – pincode check (list managed by admin on /areas.html via window.ZHArea)
    const pinM = raw.match(/(?:^|\D)([1-9]\d{5})(?!\d)/);
    const areaQ = /service ?area|serviceable|do you (serve|come|cover)|which area|kaun ?se area|kis area|area me|area mein|location|aate ho|aaoge|available (in|at)|pin ?code|pincode|my area|mere area/.test(low) || /पिन|पिनकोड|इलाक|एरिया|क्षेत्र|आते हैं|आएंगे/.test(raw);
    if (pinM && (areaQ || raw.replace(/\D/g, "").length === 6 && raw.length <= 30)) {
      const pin = pinM[1], A = window.ZHArea, ok = A && A.okPin(pin);
      const text = ok
        ? tx(L(`✅ Yes! We serve pincode **${pin}**. Pick a service and time slot to book.`, `✅ Haan! Hum pincode **${pin}** me service dete hain. Service aur time slot chun ke book karein.`, `✅ हाँ! हम पिनकोड **${pin}** में सेवा देते हैं। सेवा और समय चुनकर बुक करें।`), lang)
        : tx(L(`❌ Sorry, we don't serve pincode **${pin}** yet. We're adding new areas every week – tap below and we'll tell you when we start there.`, `❌ Maaf kijiye, abhi pincode **${pin}** me service nahi hai. Hum har hafte naye area jod rahe hain – neeche tap karein, shuru hote hi batayenge.`, `❌ माफ़ कीजिए, अभी पिनकोड **${pin}** में सेवा नहीं है। हम हर हफ़्ते नए इलाके जोड़ रहे हैं – नीचे टैप करें, शुरू होते ही बताएँगे।`), lang);
      const chips = ok ? [sayChip(tx(L("📱 Phone repair price", "📱 Phone repair price", "📱 फ़ोन रिपेयर कीमत"), lang), "Phone repair price"), diagChip(lang), waChip(lang, `Hi ZippHive, I want to book a service. Pincode: ${pin}`)]
                       : [waChip(lang, `Hi ZippHive, please tell me when you start serving pincode ${pin}.`)];
      return out({ intent: "kb-area", text, chips });
    }
    if (areaQ && !/price|kitna|cost|कीमत/.test(low + raw)) {
      return out({ intent: "kb-area-ask", text: tx(L("📍 We serve selected pincodes. Send me your **6-digit pincode** and I'll check it right away.", "📍 Hum chune hue pincode me service dete hain. Apna **6-digit pincode** bhejiye, main turant check kar deta hoon.", "📍 हम चुने हुए पिनकोड में सेवा देते हैं। अपना **6 अंकों का पिनकोड** भेजिए, मैं तुरंत जाँच देता हूँ।"), lang), chips: [waChip(lang, "Hi ZippHive, do you serve my area? Pincode:")] });
    }
    // 2) explicit "diagnose" menu
    if (/^\W*(diagnose( a| my)? problem|diagnose|diagnosis|problem diagnose karein|problem batao|troubleshoot|समस्या पहचानें|समस्या पहचानो)\W*$/i.test(raw)) return out(diagMenu(lang));

    const askTime = ASK_TIME.test(low) || ASK_TIME_HI.test(raw);
    const askHow = ASK_HOW.test(low) || ASK_HOW_HI.test(raw);
    const flow = F.find((f) => has(raw, low, f));

    // 3) symptom → start diagnosis (unless it's a phone-model price query, or a pure "how long / how is it done" question)
    const symptom = /\b(not|nahi|nhi|nahin|kharab|problem|issue|band|slow|dheere|leak|trip|block|jam|dead|swell|phool|gir)\b|नहीं|खराब|समस्या|जाम|ट्रिप|गिर/.test(low + raw);
    if (flow && !(ctx.hasModel && flow.id.startsWith("ph-") && !DIAG_WORD.test(low) && !askHow) && !((askTime || askHow) && !symptom)) {
      const prefix = tx(flow.intro, lang);
      const r = nodeReply(flow, flow.start, lang, prefix);
      return out(r.reply, r.kb);
    }
    // 4) general questions
    const g = GEN.find((x) => has(raw, low, x));
    if (g && (askHow || /\?|kya|kaun|which|what|who|क्या|कौन/.test(low + raw))) return out({ intent: "kb-general", text: tx(g.a, lang), chips: [diagChip(lang), waChip(lang, "Hi ZippHive, I have a question.")] });

    // 5) process / time questions about a service
    if (askTime || askHow) {
      // phone model + time/how → still useful to explain; price engine will be offered via chip
      const order = ["acinstall", "acgas", "acservice", "amc", "washing", "clean", "electrician", "plumber", "phone"];
      const t = order.map((id) => TBYID[id]).find((x) => has(raw, low, x)) || (/\b(ac|a\.c)\b|एसी/.test(low + raw) ? TBYID.acservice : null);
      if (t) return out({ intent: "kb-topic", text: topicCard(t, lang, askTime && !askHow ? "time" : "full"), chips: topicChips(t, lang) });
      if (askTime) {
        const text = tx(L("⏱️ **Typical time at your home:**\n📱 Phone screen/battery: 30–60 min\n❄️ AC jet service: 45–60 min · gas refill: 1.5–2 h · installation: 2–3 h\n🧺 Washing machine repair: 45–90 min\n🔧 Plumber jobs: 20 min – 2 h\n💡 Electrician jobs: 15 min – 2 h\n🧽 Cleaning: you pick 30, 45 or 60 min per area\n\nWe usually reach **the same or next day** at your chosen slot. Which service do you need?",
                            "⏱️ **Ghar pe lagne wala time (lagbhag):**\n📱 Phone screen/battery: 30–60 min\n❄️ AC jet service: 45–60 min · gas refill: 1.5–2 ghante · installation: 2–3 ghante\n🧺 Washing machine repair: 45–90 min\n🔧 Plumber ka kaam: 20 min – 2 ghante\n💡 Electrician ka kaam: 15 min – 2 ghante\n🧽 Cleaning: har area ke liye 30, 45 ya 60 min\n\nHum aam taur pe **usi din ya agle din** aapke slot pe pahunchte hain. Kaun si service chahiye?",
                            "⏱️ **घर पर लगने वाला समय (लगभग):**\n📱 फ़ोन स्क्रीन/बैटरी: 30–60 मिनट\n❄️ एसी जेट सर्विस: 45–60 मिनट · गैस रिफिल: 1.5–2 घंटे · इंस्टॉलेशन: 2–3 घंटे\n🧺 वॉशिंग मशीन रिपेयर: 45–90 मिनट\n🔧 प्लंबर का काम: 20 मिनट – 2 घंटे\n💡 इलेक्ट्रीशियन का काम: 15 मिनट – 2 घंटे\n🧽 सफ़ाई: हर हिस्से के लिए 30, 45 या 60 मिनट\n\nहम आमतौर पर **उसी दिन या अगले दिन** आपके स्लॉट पर पहुँचते हैं। कौन सी सेवा चाहिए?"), lang);
        return out({ intent: "kb-time", text, chips: [diagChip(lang), sayChip("❄️ AC", tx(L("How long does AC service take", "AC service me kitna time lagta hai", "एसी सर्विस में कितना समय लगता है"), lang)), sayChip("📱 Phone", tx(L("How long does phone repair take", "Phone repair me kitna time lagta hai", "फ़ोन रिपेयर में कितना समय लगता है"), lang)), sayChip("🧽 Cleaning", tx(L("How long does cleaning take", "Cleaning me kitna time lagta hai", "सफ़ाई में कितना समय लगता है"), lang))] });
      }
      if (askHow && /process|procedure|how (does|do) (it|you|zipphive) work|kaise kaam|प्रक्रिया/.test(low + raw)) {
        const text = tx(L("**How ZippHive works:**\n1️⃣ Book online, on WhatsApp or by call – pick a time slot\n2️⃣ You get the technician's name & a live tracking link\n3️⃣ Technician checks the problem in front of you and tells the **exact price** – nothing starts without your OK\n4️⃣ Repair/service done at your home with genuine parts\n5️⃣ Tested with you → you pay (UPI/cash/card) → warranty on the bill\n\nAsk me about any service, e.g. *“AC gas refill kaise hota hai?”* or *“sofa cleaning me kitna time lagta hai?”*",
                             "**ZippHive kaise kaam karta hai:**\n1️⃣ Online, WhatsApp ya call se book karein – time slot chunein\n2️⃣ Technician ka naam aur live tracking link milta hai\n3️⃣ Technician aapke saamne problem check karke **exact price** batata hai – aapki haan ke bina kaam shuru nahi\n4️⃣ Ghar pe hi genuine parts ke saath repair/service\n5️⃣ Aapke saath test → payment (UPI/cash/card) → bill pe warranty\n\nKisi bhi service ke baare me poochiye, jaise *“AC gas refill kaise hota hai?”* ya *“sofa cleaning me kitna time lagta hai?”*",
                             "**ZippHive कैसे काम करता है:**\n1️⃣ ऑनलाइन, WhatsApp या कॉल से बुक करें – टाइम स्लॉट चुनें\n2️⃣ तकनीशियन का नाम और लाइव ट्रैकिंग लिंक मिलता है\n3️⃣ तकनीशियन आपके सामने समस्या जाँचकर **सही कीमत** बताता है – आपकी हाँ के बिना काम शुरू नहीं\n4️⃣ घर पर ही असली पार्ट्स के साथ रिपेयर/सर्विस\n5️⃣ आपके साथ टेस्ट → भुगतान (UPI/कैश/कार्ड) → बिल पर वारंटी\n\nकिसी भी सेवा के बारे में पूछिए, जैसे *“एसी गैस रिफिल कैसे होता है?”* या *“सोफा सफ़ाई में कितना समय लगता है?”*"), lang);
        return out({ intent: "kb-how", text, chips: [diagChip(lang), waChip(lang, "Hi ZippHive, I want to book a service.")] });
      }
    }
    // 6) symptom-ish words with a known service but no flow ("AC kharab hai", "fridge problem")
    if (DIAG_WORD.test(low) || DIAG_HI.test(raw)) {
      if (ctx.hasModel) return null; // phone model given → price engine
      const t = /\bac\b|a\.c|एसी/.test(low + raw) ? TBYID.acservice : ["washing", "electrician", "plumber", "phone"].map((id) => TBYID[id]).find((x) => has(raw, low, x));
      if (t) {
        const f = { acservice: "ac-cool", washing: "wm", electrician: "mcb", plumber: "block" }[t.id];
        if (f) { const r = nodeReply(FBYID[f], FBYID[f].start, lang, tx(FBYID[f].intro, lang)); return out(r.reply, r.kb); }
      }
      if (lang !== "en" || /diagnos|troubleshoot/.test(low)) return out(diagMenu(lang));
    }
    // 7) Hindi script with nothing matched → the price engine can't read Devanagari, so reply here
    if (lang === "hi") {
      const t = T.find((x) => has(raw, low, x));
      if (t) return out({ intent: "kb-topic", text: topicCard(t, lang, "full"), chips: topicChips(t, lang) });
      if (/नमस्ते|नमस्कार|हेलो|हाय/.test(raw)) return out({ intent: "kb-greeting", text: "नमस्ते! 🙏 मैं ZippHive असिस्टेंट हूँ। मैं **कीमत**, **सेवा कैसे होती है**, **कितना समय लगता है** बता सकता हूँ और **समस्या पहचानने** में मदद कर सकता हूँ। बताइए क्या चाहिए?", chips: [diagChip("hi"), sayChip("⏱️ कितना समय लगता है?", "कितना समय लगता है"), sayChip("👷 प्रक्रिया क्या है?", "प्रक्रिया क्या है")] });
      return out({ intent: "kb-fallback-hi", text: "मैं मोबाइल रिपेयर, एसी, वॉशिंग मशीन, प्लंबर, इलेक्ट्रीशियन और सफ़ाई के बारे में मदद कर सकता हूँ। अपनी समस्या थोड़ा और बताइए – या WhatsApp पर हमारी टीम से बात करें।", chips: [diagChip("hi"), waChip("hi", "Hi ZippHive, " + raw)] });
    }
    return null;
  }

  window.ZHKB = { answer, detectLang, version: 1 };
})();

/* dave — לוגיקת צד לקוח. כמה שפחות, ובלי ספריות. */

(() => {
  "use strict";

  /* ---------------------------------------------------------------- */
  /* כותרת ותפריט                                                      */
  /* ---------------------------------------------------------------- */

  const header = document.querySelector(".site-header");
  if (header) {
    const onScroll = () => header.classList.toggle("is-stuck", window.scrollY > 8);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
  }

  const burger = document.querySelector(".burger");
  const mobileNav = document.getElementById("mobile-nav");
  if (burger && mobileNav) {
    burger.addEventListener("click", () => {
      const open = burger.getAttribute("aria-expanded") === "true";
      burger.setAttribute("aria-expanded", String(!open));
      mobileNav.hidden = open;
    });
    mobileNav.addEventListener("click", (e) => {
      if (e.target.closest("a")) {
        burger.setAttribute("aria-expanded", "false");
        mobileNav.hidden = true;
      }
    });
  }

  /* ---------------------------------------------------------------- */
  /* תפריט היכולות                                                     */
  /* ---------------------------------------------------------------- */

  /*
   * הפתיחה עצמה היא CSS (hover ו-focus-within), והקוד כאן מוסיף רק את מה ש-CSS לא יודע:
   * לחיצה במכשיר מגע, Escape, וסגירה בלחיצה בחוץ. כך שגם בלי JS התפריט עובד.
   */
  const mega = document.querySelector("[data-mega]");
  if (mega) {
    const btn = mega.querySelector(".mega__btn");
    const setOpen = (on) => {
      mega.toggleAttribute("data-open", on);
      btn.setAttribute("aria-expanded", String(on));
    };
    btn.addEventListener("click", (e) => { e.preventDefault(); setOpen(!mega.hasAttribute("data-open")); });
    document.addEventListener("click", (e) => { if (!mega.contains(e.target)) setOpen(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
    mega.addEventListener("mouseleave", () => setOpen(false));
  }

  /* ---------------------------------------------------------------- */
  /* הופעה בגלילה                                                      */
  /* ---------------------------------------------------------------- */

  if (matchMedia("(prefers-reduced-motion: no-preference)").matches && "IntersectionObserver" in window) {
    const targets = document.querySelectorAll(
      ".pain, .step, .cap, .control__grid li, .split, .channels__group, .plan, .note-card, .extras > div, .detect__item",
    );
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    targets.forEach((t, i) => {
      t.classList.add("reveal");
      t.style.transitionDelay = `${Math.min(i % 4, 3) * 60}ms`;
      io.observe(t);
    });
  }

  /* ---------------------------------------------------------------- */
  /* מתג חודשי / שנתי                                                  */
  /* ---------------------------------------------------------------- */

  const plans = document.querySelector(".plans");
  if (plans) {
    const nums = plans.querySelectorAll(".plan__num[data-monthly]");
    const billed = plans.querySelectorAll("[data-billed]");
    document.querySelectorAll(".toggle__btn").forEach((b) => {
      b.addEventListener("click", () => {
        const period = b.dataset.period;
        document.querySelectorAll(".toggle__btn").forEach((x) => x.classList.toggle("is-on", x === b));
        plans.dataset.period = period;
        nums.forEach((n) => {
          const v = Number(period === "yearly" ? n.dataset.yearly : n.dataset.monthly);
          n.textContent = v.toLocaleString("he-IL");
        });
        billed.forEach((p) => {
          p.textContent = period === "yearly" ? "חיוב שנתי מראש · חודשיים מתנה" : "חיוב חודשי";
        });
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* מחשבון הפניות האבודות                                             */
  /* ---------------------------------------------------------------- */

  /*
   * החישוב כולו נשען על מה שהמבקר הזין, ועל הנחה אחת שהוא עצמו מזיז.
   * זה לא קישוט: מספר שמישהו קבע בעצמו הוא מספר שהוא מאמין לו, וסטטיסטיקה
   * שאולה מאתר אחר היא בדיוק הדבר שמפיל אמון בשיחה הראשונה.
   */
  const calc = document.getElementById("calc");
  if (calc) {
    const copy = (() => {
      const el = document.getElementById("calc-copy");
      try { return el ? JSON.parse(el.textContent) : {}; } catch { return {}; }
    })();

    const $ = (id) => document.getElementById(id);
    const nf = new Intl.NumberFormat("he-IL");
    const ranges = [...calc.querySelectorAll("input[data-calc]")];
    const assume = $("calc-assume");
    const monthEl = $("calc-month");
    const yearEl = $("calc-year");
    const breakEl = $("calc-break");
    const verdictEl = $("calc-verdict");
    const ctaEl = $("calc-cta");
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

    /**
     * מילוי המסילה עד לאגודל, כדי שהמחוון ייראה כמו מדד ולא כמו קו.
     *
     * שתי נקודות עצירה מפורשות ב-`to right` ולא קיצור עם `to left`: המחוון מסובב
     * ל-RTL, כלומר המינימום יושב מימין, והמילוי צריך לגדול משם שמאלה. כתיבה מפורשת
     * של הגבול הפיזי היא הדרך היחידה שבה זה נשאר נכון בשני כיווני הכתיבה.
     */
    const paint = (r) => {
      const pct = ((r.value - r.min) / (r.max - r.min)) * 100;
      const edge = (100 - pct).toFixed(2);
      r.style.background = `linear-gradient(to right, rgb(255 255 255 / .16) 0 ${edge}%, var(--green) ${edge}% 100%)`;
    };

    /**
     * ספירה למספר החדש.
     *
     * הערך הסופי נכתב תמיד קודם, ורק אחר כך מתחילה ההנפשה. זה נראה מיותר והוא לא:
     * requestAnimationFrame לא רץ בלשונית מוסתרת, ובלי הכתיבה המוקדמת המספר היה
     * נשאר תקוע על מקף אצל כל מי שפתח את הדף ברקע.
     */
    const countTo = (el, to) => {
      const from = Number(el.dataset.v || 0);
      el.dataset.v = to;
      el.textContent = nf.format(Math.round(to));
      if (still || document.hidden || !from || Math.abs(to - from) < 2) return;
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 380);
        const eased = 1 - (1 - k) ** 3;
        el.textContent = nf.format(Math.round(from + (to - from) * eased));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const update = () => {
      const v = {};
      for (const r of ranges) { v[r.dataset.calc] = Number(r.value); paint(r); }
      paint(assume);

      const share = Number(calc.querySelector("input[name=afterhours]:checked").value);
      const lostShare = Number(assume.value) / 100;

      const afterHours = v.leads * share;
      const lostLeads = afterHours * lostShare;
      const lostCustomers = lostLeads * (v.close / 10);
      const perMonth = Math.round(lostCustomers * v.value);

      for (const r of ranges) {
        const out = $(`${r.id}-out`);
        if (out) out.textContent = `${r.dataset.prefix || ""}${nf.format(Number(r.value))} ${r.dataset.suffix || ""}`.trim();
      }
      $("calc-assume-out").textContent = `${assume.value}%`;

      countTo(monthEl, perMonth);
      yearEl.textContent = nf.format(perMonth * 12);
      breakEl.textContent = (copy.breakdown || "")
        .replace("{after}", nf.format(Math.round(afterHours)))
        .replace("{lost}", nf.format(Math.round(lostLeads)))
        .replace("{close}", nf.format(Math.round(lostCustomers)));

      /*
       * שלושת הפסקים. הנמוך אומר במפורש "כנראה שלא צריך אותנו" — וזה לא ויתור:
       * מחשבון שתמיד מוכר הוא מחשבון שאף אחד לא מאמין לו.
       */
      const tone = perMonth < 2000 ? "low" : perMonth < 15000 ? "mid" : "high";
      const vd = (copy.verdicts || {})[tone] || {};
      verdictEl.dataset.tone = tone;
      verdictEl.innerHTML = `<h3></h3><p></p>`;
      verdictEl.querySelector("h3").textContent = vd.title || "";
      verdictEl.querySelector("p").textContent = vd.text || "";

      // המספרים עוברים לשיחה: מי שילחץ יגיע לטופס עם ההקשר שלו כבר בפנים.
      const q = new URLSearchParams({
        leads: String(v.leads),
        value: String(v.value),
        close: String(v.close),
        share: String(Math.round(share * 100)),
        lost: String(perMonth),
      });
      ctaEl.href = `demo.html?${q}`;
    };

    for (const el of [...ranges, assume]) el.addEventListener("input", update);
    for (const el of calc.querySelectorAll("input[name=afterhours]")) el.addEventListener("change", update);
    update();
  }

  /* ---------------------------------------------------------------- */
  /* קביעת הדגמה                                                       */
  /* ---------------------------------------------------------------- */

  const form = document.getElementById("booking");
  if (!form) return;

  const readJson = (id, fallback) => {
    const el = document.getElementById(id);
    try {
      return el ? JSON.parse(el.textContent) : fallback;
    } catch {
      return fallback;
    }
  };

  /*
   * המספרים מהמחשבון ממשיכים לשיחה.
   * מי שהגיע מהמחשבון כבר עשה את העבודה הקשה — לתאר את העסק שלו במספרים. לבקש ממנו
   * לכתוב את זה שוב בטופס זה הדרך הבטוחה לאבד אותו, ולכן הטקסט כבר בפנים והוא רק מאשר.
   */
  const fromCalc = new URLSearchParams(location.search);
  if (fromCalc.has("lost")) {
    const about = form.elements.about;
    const n = (k) => Number(fromCalc.get(k) || 0).toLocaleString("he-IL");
    if (about && !about.value) {
      about.value =
        `הגעתי מהמחשבון באתר. נכנסות אלינו בערך ${n("leads")} פניות בחודש, ` +
        `כ-${fromCalc.get("share")}% מהן מחוץ לשעות העבודה. לקוח חדש שווה לנו בערך ${n("value")} ₪, ` +
        `ולפי החישוב מדובר בכ-${n("lost")} ₪ בחודש שממתינים לתשובה.`;
    }
  }

  const cfg = readJson("booking-config", {});
  const copy = readJson("booking-copy", {});
  const daysEl = document.getElementById("days");
  const slotsEl = document.getElementById("slots");
  const slotInput = document.getElementById("slot");
  const errorEl = document.getElementById("booking-error");
  const doneEl = document.getElementById("booking-done");
  const whenEl = document.getElementById("booking-when");

  const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const MONTHS = ["ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני", "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳"];

  const pad = (n) => String(n).padStart(2, "0");

  /** הימים הפנויים: מחר והלאה, רק בימי העבודה שהוגדרו, עד 14 ימים. */
  const buildDays = () => {
    const out = [];
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    cursor.setDate(cursor.getDate() + 1);
    for (let i = 0; i < 28 && out.length < 14; i += 1) {
      if ((cfg.days || [0, 1, 2, 3, 4]).includes(cursor.getDay())) out.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  };

  const buildSlots = () => {
    const out = [];
    const step = cfg.slotMinutes || 30;
    for (let m = (cfg.from || 9) * 60; m + step <= (cfg.to || 18) * 60; m += step) {
      out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
    }
    return out;
  };

  const days = buildDays();
  const slots = buildSlots();
  let chosenDay = days[0] || null;
  let chosenSlot = null;

  const label = (d, t) => `יום ${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} בשעה ${t}`;

  const renderSlots = () => {
    if (!chosenDay) {
      slotsEl.innerHTML = `<p class="booking__empty">${copy.noSlots || ""}</p>`;
      return;
    }
    slotsEl.innerHTML = slots
      .map(
        (t) =>
          `<button type="button" class="slot${t === chosenSlot ? " is-on" : ""}" role="option" aria-selected="${t === chosenSlot}" data-slot="${t}">${t}</button>`,
      )
      .join("");
  };

  const renderDays = () => {
    if (!days.length) return;
    daysEl.innerHTML = days
      .map(
        (d, i) =>
          `<button type="button" class="day${i === 0 ? " is-on" : ""}" role="tab" aria-selected="${i === 0}" data-i="${i}">
             <strong>${d.getDate()}</strong><span>${DAY_NAMES[d.getDay()]} · ${MONTHS[d.getMonth()]}</span>
           </button>`,
      )
      .join("");
  };

  renderDays();
  renderSlots();

  daysEl.addEventListener("click", (e) => {
    const b = e.target.closest(".day");
    if (!b) return;
    chosenDay = days[Number(b.dataset.i)];
    chosenSlot = null;
    slotInput.value = "";
    daysEl.querySelectorAll(".day").forEach((x) => {
      x.classList.toggle("is-on", x === b);
      x.setAttribute("aria-selected", String(x === b));
    });
    renderSlots();
  });

  slotsEl.addEventListener("click", (e) => {
    const b = e.target.closest(".slot");
    if (!b) return;
    chosenSlot = b.dataset.slot;
    slotInput.value = chosenDay
      ? `${chosenDay.getFullYear()}-${pad(chosenDay.getMonth() + 1)}-${pad(chosenDay.getDate())}T${chosenSlot}`
      : "";
    renderSlots();
  });

  const fail = (msg) => {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  };

  /** נפילה בחן: אם אין טופס מחובר, או שהשליחה נכשלה, ממשיכים בוואטסאפ עם כל הפרטים. */
  const whatsappFallback = (v) => {
    const lines = [
      "היי, אשמח לקבוע הדגמה של dave.",
      `שם: ${v.name}`,
      `עסק: ${v.business}`,
      `טלפון: ${v.phone}`,
      `אימייל: ${v.email}`,
      `ערוץ עיקרי: ${v.channel}`,
      v.about ? `על העסק: ${v.about}` : "",
      v.slot_label ? `מועד מועדף: ${v.slot_label}` : "",
    ].filter(Boolean);
    return `${(cfg.whatsapp || "").split("?")[0]}?text=${encodeURIComponent(lines.join("\n"))}`;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    if (!slotInput.value) {
      fail("צריך לבחור יום ושעה למעלה.");
      daysEl.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const data = new FormData(form);
    const values = {
      name: String(data.get("name") || "").trim(),
      business: String(data.get("business") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      email: String(data.get("email") || "").trim(),
      channel: String(data.get("channel") || ""),
      about: String(data.get("about") || "").trim(),
      slot: slotInput.value,
      slot_label: chosenDay && chosenSlot ? label(chosenDay, chosenSlot) : "",
      timezone: cfg.timezone || "Asia/Jerusalem",
    };

    let bad = null;
    for (const key of ["name", "business", "phone", "email"]) {
      const input = form.elements[key];
      const ok = key === "email" ? /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values[key]) : values[key].length > 1;
      input.setAttribute("aria-invalid", String(!ok));
      if (!ok && !bad) bad = input;
    }
    if (bad) {
      fail("צריך למלא שם, שם עסק, טלפון ואימייל תקינים.");
      bad.focus();
      return;
    }

    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = copy.submitting || "שולח...";

    const finish = () => {
      form.hidden = true;
      doneEl.hidden = false;
      if (whenEl) whenEl.textContent = values.slot_label;
      doneEl.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    if (!cfg.endpoint) {
      // אין עדיין טופס מחובר בצד המערכת — לא מאבדים את הפנייה, ממשיכים בוואטסאפ.
      window.open(whatsappFallback(values), "_blank", "noopener");
      finish();
      return;
    }

    try {
      const res = await fetch(cfg.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values: { ...values, _consent: data.get("consent") === "on", _hp_website: data.get("_hp_website") || "" },
          meta: {
            pageUrl: location.href,
            referrer: document.referrer || null,
            utm: Object.fromEntries(new URLSearchParams(location.search)),
          },
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      finish();
    } catch {
      btn.disabled = false;
      btn.textContent = copy.submit || "לקבוע את ההדגמה";
      const link = whatsappFallback(values);
      errorEl.innerHTML = `${copy.errorBody || ""} <a href="${link}" target="_blank" rel="noopener"><strong>פתחו וואטסאפ עם הפרטים</strong></a>`;
      errorEl.hidden = false;
    }
  });
})();

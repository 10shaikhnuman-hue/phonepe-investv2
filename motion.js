/* PhonePe Invest — motion layer
   Reference: legend.xyz (GSAP + ScrollTrigger).

   Desktop (html.story-on): the page between the hero and the ticker is one scroll story —
   a sticky stage driven by one scrubbed timeline. Content stays on the centre line and changes
   through animation; the pills (tubes) are NOT pinned — they travel through the stage at exactly
   scroll speed, so the page always feels like it is scrolling.
     hero phone (clipped in the hero) → the Analyser pill scrolls in with the phone masked inside → the Build card lifts
     out of the screen while the phone leaves through the pill → Build/Review/Optimise change at the
     centre line → Optimise collapses into a dot → the dot blooms behind the sign-up phone → the
     PhonePe mark leaves that phone and becomes "0" → the 0 travels into the ₹0 card → the card
     becomes a phone silhouette → the Solutions pill scrolls in, then the phone appears in it →
     screens change Stocks/ETFs/MF → the banner scrolls in and the phone comes down into the hand.
   Phones / reduced motion: the static Figma layout with light reveals.
   Scrolling is native (no scroll-jacking) for reliability; only the animation is smoothed. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function release() { root.classList.remove("motion-pending"); }

  if (reduce || !window.gsap || !window.ScrollTrigger) {
    root.classList.remove("story-on");
    release();
    return;
  }

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  var desktop = window.matchMedia("(min-width: 768px)");
  var isDesktop = desktop.matches;
  var storyMode = isDesktop && root.classList.contains("story-on");
  root.classList.add("motion");
  if (isDesktop) root.classList.add("motion-desktop");
  desktop.addEventListener("change", function () { window.location.reload(); });

  var EXPO = "expo.out"; // ≈ cubic-bezier(0.19, 1, 0.22, 1)
  var PXS = 800;         // design px of scrolling per second of story timeline
  var SCRUB = 0.3;       // light smoothing of the animation only (scrolling itself is native)
  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); };

  var page = $(".page");
  function fit() { return parseFloat(getComputedStyle(root).getPropertyValue("--fit")) || 1; }
  function VH() { return window.innerHeight / fit(); }
  function layoutY(el) {
    var y = 0;
    while (el && el !== page) { y += el.offsetTop; el = el.offsetParent; }
    return y;
  }
  function at(el, frac, extra) {
    return function () { return (layoutY(el) + (extra || 0)) * fit() - window.innerHeight * frac; };
  }
  function scrollToY(y) { window.scrollTo({ top: y, behavior: "smooth" }); }

  /* ---------- Text helper ---------- */
  function splitWords(el) {
    var words = [];
    if (!el) return words;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part) && part.indexOf(" ") === -1) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement("span");
            w.className = "w";
            w.style.display = "inline-block";
            w.textContent = part;
            frag.appendChild(w);
            words.push(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          walk(child);
        }
      });
    })(el);
    return words;
  }

  /* =========================================================
     Nav — fixed glass pill, theme follows what's under it (throttled, read-only)
     ========================================================= */
  var nav = $(".nav");
  var themed = $$("[data-nav]");
  var navQueued = false, navFloating = null, navTheme = null;
  function updateNav() {
    if (!isDesktop || navQueued) return;
    navQueued = true;
    setTimeout(function () { navQueued = false; readNav(); }, 120);
  }
  function readNav() {
    var floating = window.scrollY > 40;
    if (floating !== navFloating) { navFloating = floating; nav.classList.toggle("is-floating", floating); }
    var probeY = 48 * fit();
    var probeX = window.innerWidth / 2;
    var theme = "light";
    for (var i = 0; i < themed.length; i++) {
      var el = themed[i];
      if (!el.offsetParent) continue;
      var r = el.getBoundingClientRect();
      if (r.top <= probeY && r.bottom > probeY && r.left <= probeX && r.right > probeX && +getComputedStyle(el).opacity > 0.05) {
        theme = el.getAttribute("data-nav");
      }
    }
    if (theme !== navTheme) { navTheme = theme; nav.setAttribute("data-theme", theme); }
  }
  window.addEventListener("scroll", updateNav, { passive: true });

  /* =========================================================
     Hero — entrance, rotating keyword, scroll-out parallax
     ========================================================= */
  var heroPhone = $(".hero__phone");
  var intro = gsap.timeline({ defaults: { ease: EXPO, duration: 1.2 }, delay: 0.15 });
  intro
    .from(".nav > *", { yPercent: -60, opacity: 0, stagger: 0.08, duration: 1 }, 0)
    .from(".hero__title .line > span", { yPercent: 135, duration: 1.4, stagger: 0.12 }, 0.1)
    .from(".hero__sub", { yPercent: 60, opacity: 0 }, 0.45)
    .from(".hero__ctas .btn", { yPercent: 40, opacity: 0, stagger: 0.08 }, 0.55)
    .from(".trust-row li", { yPercent: 60, opacity: 0, stagger: 0.07 }, 0.65)
    .from(".hero__illustration", { yPercent: 25, opacity: 0, duration: 1.8 }, 0.1)
    .from(heroPhone, { yPercent: 50, duration: 1.7 }, 0.3)
    .from(".float-chip", { scale: 0.6, opacity: 0, duration: 1, ease: "back.out(1.7)", stagger: 0.14 }, 1.0)
    .from(".scroll-cue", { opacity: 0, xPercent: -20 }, 1.1);

  var rotator = $(".rotator");
  var KEYWORDS = [["investments.", "#def517"], ["stocks.", "#4cc363"], ["mutual funds.", "#8ec5ff"], ["SIPs.", "#def517"], ["IPOs.", "#4cc363"]];
  var kwIndex = 0;
  var heroVisible = true;
  function nextKeyword() {
    if (!heroVisible || document.hidden) return;
    var current = $(".rotator__word", rotator);
    kwIndex = (kwIndex + 1) % KEYWORDS.length;
    var next = document.createElement("span");
    next.className = "rotator__word";
    next.textContent = KEYWORDS[kwIndex][0];
    next.style.cssText = "position:absolute;left:0;top:0;color:" + KEYWORDS[kwIndex][1];
    rotator.appendChild(next);
    var from = rotator.offsetWidth;
    var to = next.offsetWidth;
    gsap.timeline({ onComplete: function () { current.remove(); next.style.position = ""; gsap.set(rotator, { clearProps: "width" }); } })
      .set(rotator, { width: from })
      .to(current, { yPercent: -70, opacity: 0, duration: 0.6, ease: "power3.in" }, 0)
      .to(rotator, { width: to, duration: 0.9, ease: "expo.inOut" }, 0.15)
      .fromTo(next, { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1, ease: EXPO }, 0.45);
  }
  setTimeout(function () { setInterval(nextKeyword, 3200); }, 2600);
  ScrollTrigger.create({ trigger: ".hero", start: "top top", end: "bottom top", onToggle: function (self) { heroVisible = self.isActive; } });

  if (isDesktop) {
    gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: SCRUB } })
      .to(".hero__copy", { y: -160, opacity: 0, ease: "none" }, 0)
      .to(".hero__illustration", { y: 140, ease: "none" }, 0)
      .to(".float-chip--1", { y: -220, ease: "none" }, 0)
      .to(".float-chip--2", { y: -300, ease: "none" }, 0)
      .to(".float-chip--3", { y: -160, ease: "none" }, 0)
      .to(".scroll-cue", { opacity: 0, ease: "none", duration: 0.3 }, 0);
  }

  // The ring → "0" morph is measured from the real Sora glyph, so the story waits for the font.
  if (storyMode) {
    var fontReady = document.fonts && document.fonts.load ? document.fonts.load("200 200px Sora") : Promise.resolve();
    fontReady.catch(function () {}).then(function () { buildStory(); ScrollTrigger.refresh(); });
  } else {
    buildStatic();
  }

  /* =========================================================
     Footer (both modes) — wordmark rises out of the hairline
     ========================================================= */
  var footer = $(".footer");
  gsap.from(".footer__wordmark", {
    yPercent: 100, ease: "none",
    scrollTrigger: { trigger: footer, start: at(footer, 1, 120), end: at(footer, 0.6, 320), scrub: SCRUB }
  });
  gsap.from(".footer__rule", {
    scaleX: 0, transformOrigin: "0% 50%", duration: 1.6, ease: "expo.inOut",
    scrollTrigger: { trigger: footer, start: at(footer, 0.85, 334), once: true }
  });
  gsap.from([$(".footer__brand"), $$(".footer__links")[0], $$(".footer__links")[1]], {
    y: 24, opacity: 0, duration: 1.1, ease: EXPO, stagger: 0.12,
    scrollTrigger: { trigger: footer, start: at(footer, 0.95, 373), once: true }
  });

  release();
  readNav();
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });

  /* =========================================================
     THE STORY (desktop)
     ========================================================= */
  function buildStory() {
    var story = $(".story");
    var half = VH() / 2; // stage geometry is fixed per load (a real resize rebuilds the page)
    var tl = gsap.timeline({ defaults: { ease: "none" } });

    // -- vocabulary; positions are story seconds (1s = PXS design px of scroll)
    function show(el, t, d, from) {
      return tl.fromTo(el, Object.assign({ opacity: 0 }, from || {}), { opacity: 1, x: 0, y: 0, yPercent: 0, scale: 1, duration: d || 0.25, ease: "power2.out" }, t);
    }
    function lines(container, t, d, stagger) {
      return tl.fromTo($$(".line > span", container), { yPercent: 135 }, { yPercent: 0, duration: d || 0.3, stagger: stagger || 0.08, ease: "power3.out" }, t);
    }
    function riseWords(el, t) {
      return tl.fromTo(splitWords(el), { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.3, stagger: 0.03, ease: "power3.out" }, t);
    }
    function readIn(el, t, span) {
      var w = splitWords(el);
      tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.08 }, t);
      return tl.fromTo(w, { opacity: 0.15 }, { opacity: 1, duration: 0.12, stagger: (span || 0.4) / Math.max(w.length, 1) }, t);
    }
    // Percent insets throughout (so GSAP interpolates cleanly); ±15% clears the 10px end dots.
    var HIDDEN = "inset(-6px 115% -6px -15%)";
    var DRAWN = "inset(-6px -15% -6px -15%)";
    var GONE = "inset(-6px -15% -6px 115%)";
    function draw(conn, t, d) { return tl.fromTo(conn, { clipPath: HIDDEN }, { clipPath: DRAWN, duration: d || 0.25, ease: "power2.inOut" }, t); }
    function retract(conn, t) { return tl.to(conn, { clipPath: GONE, duration: 0.22, ease: "power2.in" }, t); }
    function enterFromBelow(panel, t) {
      return tl.fromTo(panel, { y: half + 520, scale: 0.96, transformOrigin: "50% 0%" }, { y: 0, scale: 1, duration: 0.7, ease: "power2.out" }, t);
    }
    function exitUp(panel, t) { return tl.to(panel, { y: -(half + 560), duration: 0.7, ease: "power2.in" }, t); }

    // A pill that travels up through the stage at exactly scroll speed (ease none, 1:1 with PXS).
    // Its top enters at the stage bottom at t0 and keeps moving until t1. `counter` (optional)
    // moves the other way so its contents stay pinned while the pill's mask slides over them.
    function scrollPill(pill, t0, t1, counter) {
      var dist = (t1 - t0) * PXS;
      tl.fromTo(pill, { y: half + 40 }, { y: half + 40 - dist, duration: t1 - t0 }, t0);
      if (counter) tl.fromTo(counter, { y: -(half + 40) }, { y: -(half + 40) + dist, duration: t1 - t0 }, t0);
      // time at which the pill's top edge reaches stage y = edge
      return function (edge) { return t0 + (half + 40 - edge) / PXS; };
    }

    /* ---- 0–1 · Hero phone stays in the hero (clipped at its edge, as in Figma). The Analyser pill
       scrolls in from its Figma position (beam top at page y 1056) at scroll speed; the phone exists
       only inside it — a hollow mask. The phone rides with the pill until it reaches the centre line,
       then holds while the pill's rounded top keeps rising and reveals it. ---- */
    var pillA = $(".s-tube--analyser");
    var innerA = $(".s-tube__inner", pillA);
    var maskedPhone = $(".s-tube__phone", pillA);
    var A1 = 7.3;
    var pillY0 = 1056 - half;                       // pill top relative to stage centre at scroll 0
    var pinAt = Math.max(0, (651.6 + 429.6 - half) / PXS); // phone image top reaches the centred position
    // The sign-up panel scrolls in at page speed from 6.0s (its top enters at the stage bottom + 40);
    // the pill's rounded bottom runs 100px ahead of it, so the pill ends the way it began.
    pillA.style.height = Math.round(half + 40 - 100 + 6.0 * PXS - pillY0) + "px";
    tl.fromTo(pillA, { y: pillY0 }, { y: pillY0 - A1 * PXS, duration: A1 }, 0);
    tl.fromTo(innerA, { y: 0 }, { y: (A1 - pinAt) * PXS, duration: A1 - pinAt }, pinAt);

    var introL = $(".s-intro-left");
    var introR = $(".s-intro-right");
    show($(".chip", introL), 1.2, 0.2, { y: 16 });
    lines(introL, 1.25, 0.35, 0.1);
    readIn($(".lead-24", introR), 1.3, 0.45);
    show([$(".note", introR), $(".text-link", introR)], 1.75, 0.2, { y: 14 });

    /* ---- 2 · The Build card lifts out of the screen; the phone leaves through the pill's top ---- */
    var cards = $$(".s-card");
    var steps = $$(".s-step").map(function (s) {
      return { label: $(".step-label", s), title: $(".s-mask h3", s), conns: $$(".connector", s), text: $(".s-step-text", s) };
    });
    tl.to([introL, introR], { y: -60, opacity: 0, duration: 0.3, ease: "power2.in" }, 2.05);
    tl.fromTo(cards[0], { x: -69.2, y: 184.9, opacity: 0, boxShadow: "0 0 0 rgba(3,8,26,0)" }, { opacity: 1, duration: 0.04 }, 2.1); // over the widget in the screen
    tl.to(cards[0], { x: 0, y: 0, duration: 0.75, ease: "power2.inOut" }, 2.15);
    tl.to(cards[0], { scale: 1.1, boxShadow: "0 40px 80px rgba(3,8,26,0.35)", duration: 0.35, ease: "power1.out" }, 2.15);
    tl.to(cards[0], { scale: 1, boxShadow: "0 24px 48px rgba(3,8,26,0.28)", duration: 0.4, ease: "power1.inOut" }, 2.5);
    tl.to(maskedPhone, { y: -1000, duration: 0.8, ease: "power2.in" }, 2.15); // leaves through the pill's top

    // Steps: soft, overlapping crossfades — the outgoing step drifts up and fades while the next
    // one rises into place; cards glide along the tube with a gentle scale.
    function stepIn(i, t) {
      var s = steps[i];
      show(s.label, t + 0.05, 0.35, { x: -12 });
      tl.fromTo(s.title, { y: 44, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: "power3.out" }, t);
      draw(s.conns[0], t + 0.15, 0.4);
      draw(s.conns[1], t + 0.35, 0.3);
      readIn(s.text, t + 0.2, 0.4);
    }
    function stepOut(i, t) {
      var s = steps[i];
      tl.to(s.label, { opacity: 0, x: -12, duration: 0.35, ease: "power2.in" }, t);
      tl.to(s.title, { y: -36, opacity: 0, duration: 0.45, ease: "power2.in" }, t);
      retract(s.conns[0], t + 0.05);
      retract(s.conns[1], t + 0.05);
      tl.to(s.text, { opacity: 0, y: -16, duration: 0.4, ease: "power2.in" }, t);
    }
    function cardSwap(a, b, t) {
      tl.to(cards[a], { y: -260, scale: 0.92, opacity: 0, duration: 0.65, ease: "power2.inOut" }, t);
      tl.fromTo(cards[b], { y: 280, scale: 0.92, opacity: 0, boxShadow: "0 24px 48px rgba(3,8,26,0.28)" },
        { y: 0, scale: 1, opacity: 1, duration: 0.75, ease: "power3.out" }, t + 0.2);
    }
    stepIn(0, 2.6);
    stepOut(0, 3.5);
    cardSwap(0, 1, 3.5);
    stepIn(1, 3.85);
    stepOut(1, 4.9);
    cardSwap(1, 2, 4.9);
    stepIn(2, 5.25);

    /* ---- 3 · Optimise collapses into a dot; the dot blooms behind the sign-up phone ---- */
    var signup = $(".s-signup");
    var anchor = $(".s-anchor", signup);
    var sPhone = $(".signup__phone", signup);
    var dot = $(".s-dot");
    // The pill's rounded bottom sweeps up over the Optimise card (the card is masked inside the pill).
    // Its blue button is the one thing that stays: it sits on top of the pill, then shrinks into the dot.
    stepOut(2, 6.25);
    tl.fromTo(signup, { y: half + 520 }, { y: 0, duration: (half + 520) / PXS }, 6.0); // exactly scroll speed
    tl.set(pillA, { autoAlpha: 0 }, A1); // fully covered by the sign-up panel by now
    tl.set(dot, { opacity: 1 }, 6.2);                       // identical to the button underneath it
    // the button grows straight into the sign-up phone's outline (526.19, 63.06 on the panel → stage −416.94)
    tl.to(dot, { x: 526.19 - 648, y: -416.94 - 52, width: 390, height: 797, borderRadius: 54, duration: 0.8, ease: "power2.inOut" }, 6.55);
    tl.fromTo(anchor, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: "power2.out" }, 7.2);
    tl.to(dot, { opacity: 0, duration: 0.25, ease: "power1.inOut" }, 7.35); // the phone takes over the shape
    tl.set(cards[2], { autoAlpha: 0 }, 7.0); // long since masked away
    tl.fromTo(sPhone, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.inOut" }, 7.3);
    show($(".signup__copy .chip", signup), 7.25, 0.2, { y: 14 });
    lines($(".signup__copy", signup), 7.3, 0.35, 0.14);
    show($(".signup__copy .body-16", signup), 7.75, 0.2, { y: 14 });
    $$(".signup-form > *", signup).forEach(function (el, i) { show(el, 7.5 + i * 0.08, 0.22, { y: 18 }); });

    /* ---- 4 · The PhonePe mark leaves the phone, centres, gains a ring, becomes "0" ---- */
    var mark = $(".s-mark");
    var ringSvg = $(".s-ring");
    var ring = $("ellipse", ringSvg);
    var zero = $(".s-zero");
    ring.setAttribute("pathLength", "1");
    gsap.set(ring, { strokeDasharray: 1, attr: { rx: 25, ry: 25 } });
    var glyph = null;
    function zeroGlyph() {
      // Ink box and stroke of "0" (Sora 200 at 200px) relative to the .s-zero text box
      if (glyph) return glyph;
      var c = document.createElement("canvas");
      c.width = 300; c.height = 300;
      var ctx = c.getContext("2d");
      ctx.font = "200 200px Sora";
      var m = ctx.measureText("0");
      var fA = m.fontBoundingBoxAscent || 200 * 0.97;
      var fD = m.fontBoundingBoxDescent || 200 * 0.26;
      var baseline = 110 - (fA + fD) / 2 + fA;
      var left = -m.actualBoundingBoxLeft;
      var right = m.actualBoundingBoxRight;
      var top = baseline - m.actualBoundingBoxAscent;
      var bottom = baseline + m.actualBoundingBoxDescent;
      ctx.fillStyle = "#000";
      ctx.fillText("0", 50, 250);
      var midY = Math.round(250 - (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
      var row = ctx.getImageData(0, midY, 300, 1).data;
      var first = -1, last = -1;
      for (var x = 0; x < 300; x++) {
        if (row[x * 4 + 3] > 128) { if (first < 0) first = x; last = x; } else if (first >= 0) break;
      }
      var sw = first >= 0 ? Math.max(4, last - first + 1) : 9;
      glyph = { cx: (left + right) / 2, cy: (top + bottom) / 2, rx: (right - left) / 2 - sw / 2, ry: (bottom - top) / 2 - sw / 2, sw: sw };
      return glyph;
    }
    tl.fromTo(mark, { opacity: 0 }, { opacity: 1, duration: 0.02 }, 8.4);
    exitUp(signup, 8.45);
    tl.to(mark, { x: 33.3, y: -247.6, scale: 1.3, duration: 0.8, ease: "power2.inOut" }, 8.45);
    tl.fromTo(ring, { strokeDashoffset: 1, rotation: -90, transformOrigin: "50% 50%" }, { strokeDashoffset: 0, rotation: 0, duration: 0.4, ease: "power1.inOut" }, 9.2);
    tl.to(mark, { scale: 0.4, opacity: 0, duration: 0.25, ease: "power2.in" }, 9.5);
    tl.to(ring, {
      attr: {
        cx: function () { return zeroGlyph().cx; }, cy: function () { return zeroGlyph().cy; },
        rx: function () { return zeroGlyph().rx; }, ry: function () { return zeroGlyph().ry; }
      },
      strokeWidth: function () { return zeroGlyph().sw; },
      duration: 0.5, ease: "power2.inOut"
    }, 9.6);
    // one outline at a time: the ring dissolves exactly as the glyph appears
    tl.fromTo(zero, { opacity: 0 }, { opacity: 1, duration: 0.18, ease: "power1.inOut" }, 10.08);
    tl.to(ringSvg, { opacity: 0, duration: 0.18, ease: "power1.inOut" }, 10.08);

    /* ---- 5 · The 0 travels into the ₹0 card as the dark panel rises ---- */
    var offers = $(".s-offers");
    var zcard = $(".s-zcard");
    var zslot = $(".s-zslot", zcard);
    function zeroTarget(axis) {
      var cardX = 529, cardY = -280.18; // the card's resting position (Figma 171:13598)
      return axis === "x" ? cardX + 1 + zslot.offsetLeft - 647 : cardY + 1 + zslot.offsetTop + 110;
    }
    tl.fromTo(offers, { y: half + 520 }, { y: 0, duration: (half + 520) / PXS }, 9.9); // page speed
    tl.fromTo($(".offers__halo", offers), { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.9, ease: "power2.out" }, 10.9);
    show(zcard, 10.95, 0.6, { y: 50, scale: 0.96 });
    tl.to(zero, {
      x: function () { return zeroTarget("x"); }, y: function () { return zeroTarget("y"); },
      fontSize: 176, lineHeight: "176px", letterSpacing: -8, color: "#ffffff",
      duration: 0.75, ease: "power2.inOut"
    }, 10.6);
    show($(".zero-card__rupee", zcard), 11.35, 0.3, { x: -12 });
    show($(".tag-lime", zcard), 11.3, 0.35, { scale: 0.6 });
    $$(".zero-card__list li, .zero-card .fineprint", zcard).forEach(function (el, i) { show(el, 11.4 + i * 0.07, 0.3, { y: 12 }); });
    show($(".eyebrow", offers), 11.45, 0.3, { x: -12 });
    riseWords($("h2", offers), 11.5);
    $$(".trust-list li", offers).forEach(function (el, i) { show(el, 11.7 + i * 0.07, 0.3, { y: 12 }); });
    var users = $(".s-users", offers);
    show(users, 11.6, 0.35, { y: 24 });
    var count = $(".count", users);
    var counter = { v: 0 };
    tl.fromTo(counter, { v: 0 }, { v: 700, duration: 0.55, ease: "power2.out", onUpdate: function () { count.textContent = Math.round(counter.v); } }, 11.6);
    $$(".accordion__item", offers).forEach(function (el, i) { show(el, 11.8 + i * 0.1, 0.3, { y: 16 }); });

    /* ---- 6 · The card becomes a phone silhouette; the Solutions pill scrolls in, THEN the phone ---- */
    var solPhone = $(".s-sol-phone");
    var head = $(".s-sol-head");
    var pillB = $(".s-tube--sol");
    tl.to([$(".tag-lime", zcard), $(".zero-card__amount", zcard), $(".zero-card__details", zcard), zero], { opacity: 0, duration: 0.3, ease: "power1.inOut" }, 12.75);
    tl.to(offers, { y: -(half + 560), duration: (half + 560) / PXS }, 12.7); // page speed
    tl.set(zcard, { backgroundImage: "none", backgroundColor: "rgba(255,255,255,0.08)" }, 12.95);
    // the card becomes the phone's silhouette and waits on the centre line for the pill
    tl.to(zcard, {
      "--x": "612.9px", "--y": "-30.8px", width: 216.2, height: 441.6, borderRadius: 30,
      backgroundColor: "#0a1f44", borderColor: "rgba(255,255,255,0)", padding: 0,
      duration: 0.8, ease: "power2.inOut"
    }, 12.95);
    show($(".chip", head), 13.6, 0.3, { y: 14 });
    riseWords($(".section-head__title", head), 13.65);
    show($(".body-16", head), 13.95, 0.35, { y: 14 });

    var B0 = 13.6;
    var phoneIn = B0 + (half + 40 + 70) / PXS;    // the pill's top has passed the silhouette (+40px margin)
    var R = [phoneIn + 0.9, phoneIn + 2.25, phoneIn + 3.6]; // rows, one at a time on the centre line
    var F0 = R[2] + 0.95;                         // finale: the banner starts scrolling in
    var bannerDur = (half + 436) / PXS;           // banner top travels from the stage bottom to centred
    var END = F0 + bannerDur;
    // Pill bottom ends 100px above the banner's top as both scroll at page speed (Figma leaves white
    // between them): bannerTop(t) = half − (t−F0)·PXS, pillBottom(t) = half + 40 − (t−B0)·PXS + H
    // ⇒ gap = (F0 − B0)·PXS − 40 − H = 100  ⇒  H = (F0 − B0)·PXS − 140
    pillB.style.height = Math.round((F0 - B0) * PXS - 140) + "px";
    scrollPill(pillB, B0, END);

    tl.to(head, { y: -120, opacity: 0, duration: 0.5, ease: "power2.inOut" }, phoneIn - 0.25);
    // silhouette → phone: same size, crossfade, then grow to full size
    tl.fromTo(solPhone, { scale: 0.55, y: 190, opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.inOut" }, phoneIn);
    tl.to(zcard, { opacity: 0, duration: 0.3, ease: "power1.inOut" }, phoneIn);
    tl.to(solPhone, { scale: 1, y: 0, duration: 0.8, ease: "power2.inOut" }, phoneIn + 0.2);

    /* ---- 7 · Stocks → ETFs → Mutual Funds: content changes on the centre line ---- */
    var rows = $$(".s-row").map(function (r) {
      return {
        title: $(".solution__title", r), h3: $(".solution__title h3", r), dot: $(".solution__title img", r),
        conns: $$(".connector", r), copy: $(".solution__copy", r), lead: $(".solution__copy .lead-24", r), pill: $(".link-pill", r)
      };
    });
    function rowIn(i, t) {
      var r = rows[i];
      tl.fromTo(r.title, { opacity: 0 }, { opacity: 1, duration: 0.05 }, t);
      tl.fromTo(r.h3, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, t);
      tl.fromTo(r.dot, { scale: 0 }, { scale: 1, duration: 0.2, ease: "back.out(3)" }, t + 0.05);
      draw(r.conns[0], t + 0.12, 0.3);
      draw(r.conns[1], t + 0.3, 0.2);
      tl.fromTo(r.copy, { opacity: 0 }, { opacity: 1, duration: 0.05 }, t + 0.15);
      readIn(r.lead, t + 0.15, 0.35);
      show(r.pill, t + 0.45, 0.2, { y: 14 });
    }
    function rowOut(i, t) {
      var r = rows[i];
      tl.to(r.title, { opacity: 0, y: -24, duration: 0.25, ease: "power2.in" }, t);
      retract(r.conns[0], t);
      retract(r.conns[1], t);
      tl.to(r.copy, { opacity: 0, y: -24, duration: 0.25, ease: "power2.in" }, t);
    }
    var wipes = $$(".s-wipe", solPhone);
    function screenWipe(i, t) {
      var wrap = wipes[i - 1];
      var img = $("img", wrap);
      tl.fromTo(wrap, { xPercent: -100 }, { xPercent: 0, duration: 0.55, ease: "power2.inOut" }, t);
      tl.fromTo(img, { xPercent: 100 }, { xPercent: 0, duration: 0.55, ease: "power2.inOut" }, t);
    }
    rowIn(0, R[0]);
    rowOut(0, R[1] - 0.45);
    screenWipe(1, R[1] - 0.35);
    rowIn(1, R[1]);
    rowOut(1, R[2] - 0.45);
    screenWipe(2, R[2] - 0.35);
    rowIn(2, R[2]);

    /* ---- 8 · The banner scrolls in (static); the phone comes down into the hand ---- */
    var banner = $(".s-banner");
    rowOut(2, F0 - 0.15);
    tl.fromTo(banner, { y: half + 436 }, { y: 0, duration: bannerDur }, F0); // exactly scroll speed
    tl.to(solPhone, { y: -110, scale: 0.97, duration: bannerDur * 0.3, ease: "power1.out" }, F0);
    tl.to(solPhone, { x: -22, y: -24.7, scale: 0.8793, duration: bannerDur * 0.7, ease: "power2.inOut" }, F0 + bannerDur * 0.3);
    // The phone lands in the (empty) hand exactly as the banner centres; the stage releases here,
    // so banner + phone simply keep scrolling up together with the page.

    /* ---- Wire the timeline to scroll ---- */
    var TOTAL = END;
    story.style.height = (TOTAL * PXS + VH()) + "px";
    ScrollTrigger.create({ animation: tl, start: 0, end: function () { return TOTAL * PXS * fit(); }, scrub: SCRUB });

    var baseW = window.innerWidth, baseH = window.innerHeight, resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (Math.abs(window.innerWidth - baseW) > 40 || Math.abs(window.innerHeight - baseH) > 80) window.location.reload();
      }, 400);
    });

    var MOMENTS = { "#portfolio-analyser": 1.9, "#get-started": 8.1, "#offers": 12.4, "#solutions": R[0] + 0.5, "#get-the-app": END };
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        if (id === "#top") { e.preventDefault(); scrollToY(0); return; }
        if (MOMENTS[id] != null) { e.preventDefault(); scrollToY(MOMENTS[id] * PXS * fit()); }
      });
    });

    root.classList.add("story-ready");
  }

  /* =========================================================
     STATIC layout (phones): light reveals on the Figma sections
     ========================================================= */
  function buildStatic() {
    function rise(el) {
      if (!el) return;
      gsap.from(splitWords(el), {
        yPercent: 70, opacity: 0, duration: 1.2, ease: EXPO, stagger: 0.045,
        scrollTrigger: { trigger: el, start: at(el, 0.88), once: true }
      });
    }
    function readIn(el) {
      if (!el) return;
      gsap.fromTo(splitWords(el), { opacity: 0.15 }, {
        opacity: 1, ease: "none", stagger: 0.1,
        scrollTrigger: { trigger: el, start: at(el, 0.85), end: at(el, 0.5), scrub: SCRUB }
      });
    }
    function fadeUp(list) {
      [].concat(list).filter(Boolean).forEach(function (el) {
        gsap.from(el, { y: 24, opacity: 0, duration: 1.1, ease: EXPO, scrollTrigger: { trigger: el, start: at(el, 0.92), once: true } });
      });
    }
    $$(".analyser h2, .signup__title, .offers h2, .section-head__title").forEach(rise);
    $$(".analyser .lead-24, .step__text, .solution__copy .lead-24").forEach(readIn);
    fadeUp($$(".analyser .chip, .note, .text-link, .step__title, .step__card, .signup .chip, .signup__phone, .signup-form > *, .zero-intro img, .zero-intro__figure, .offers .eyebrow, .trust-list li, .zero-card, .offers .display-56--dim, .accordion__item, .section-head .chip, .section-head .body-16, .solution__title, .solution__phone, .link-pill, .app-banner__hand"));
  }
})();

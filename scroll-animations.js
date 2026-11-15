/* ============================================================================
   OrgHub — scroll animations & scroll UI
   PRMSU College of Engineering · Student Body Organization
   ----------------------------------------------------------------------------
   Self-contained; safe to remove without breaking any other script. Adds:

     1. Reveal-on-scroll: section heads, cards and rows fade/slide in as they
        enter the viewport — including content injected LATER by the
        public-*.js scripts (officers, events, gallery, reports,
        resolutions, evaluations), via a MutationObserver.
     2. Scroll-spy: the nav button of the section currently on screen gets
        the .active state while scrolling.
     3. Header state: header.site gets .scrolled once the page is scrolled
        (the CSS then compacts it slightly).
     4. Scroll progress bar (.scroll-progress span, scaled 0..1).
     5. Back-to-top button (#to-top), shown after 600px of scrolling.
     6. Count-up animation for the "BY THE NUMBERS" statistics
        (#snapshot-officers, #snapshot-activities, #snapshot-resolutions,
        #snapshot-reports) once a real number is written into them.

   Everything respects prefers-reduced-motion: with it, or without
   JavaScript, the page is simply static and fully visible.
   ========================================================================== */
(function () {
  'use strict';

  var docEl = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* Cancels the safety timeout set by the inline <head> script. */
  docEl.classList.add('anim-ready');

  /* ------------------------------------------------------------------ */
  /* 1. Reveal on scroll                                                 */
  /* ------------------------------------------------------------------ */

  var REVEAL_SELECTOR = [
    '.section-head',
    '#view-home .hero-copy > h1',
    '#view-home .hero-copy > p.lede',
    '#view-home .hero-copy > .cta-row',
    '#view-home .hero-panel-wrap',
    '#view-home .wrap > div[style*="grid-template-columns:1fr 1fr"] > div',
    '#home-recent-events .event-row',
    '#events-list .event-row',
    '.officer',
    '.cal',
    '.public-gallery-card',
    '.gallery-grid .cell',
    '.public-report-card',
    '.public-resolution-card',
    '.public-evaluation-card',
    '.eval-box',
    '.transparency-strip .cell',
    '.ledger-row',
    '.footer-glass'
  ].join(',');

  /* The Mission / Vision columns are the two direct children of the
     inline-styled 1fr 1fr grid on the home page. */
  var MISSION_VISION_CONTAINER =
    '#view-home .wrap > div[style*="grid-template-columns:1fr 1fr"]';

  var revealIO = null;
  var revealCounts = new WeakMap();   // parent element -> children already staggered

  /* After the reveal transition ends, drop the animation classes so the
     element's own hover styles (translateY lift, image zoom, ...) work
     again without fighting the reveal transform. */
  function finishReveal(el) {
    el.classList.remove('reveal', 'reveal-left', 'reveal-right', 'reveal-zoom');
    el.style.removeProperty('--reveal-delay');
  }

  function onReveal(entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      revealIO.unobserve(el);
      /* double rAF: make sure the hidden state is painted before the
         transition to the visible state starts */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { el.classList.add('in-view'); });
      });
      el.addEventListener('transitionend', function handler(e) {
        if (e.target !== el) return;
        el.removeEventListener('transitionend', handler);
        finishReveal(el);
      });
    });
  }

  function bindReveal(el) {
    if (el.dataset.revealBound) return;
    el.dataset.revealBound = '1';
    el.classList.add('reveal');

    /* stagger siblings inside the same grid / list, capped at 420ms */
    var parent = el.parentElement;
    var n = revealCounts.get(parent) || 0;
    revealCounts.set(parent, n + 1);
    var delay = Math.min(n * 70, 420);
    if (delay) el.style.setProperty('--reveal-delay', delay + 'ms');

    /* Mission slides in from the left, Vision from the right */
    if (parent && parent.matches && parent.matches(MISSION_VISION_CONTAINER)) {
      el.classList.add(n === 0 ? 'reveal-left' : 'reveal-right');
    }

    revealIO.observe(el);
  }

  function scanReveals() {
    var nodes = document.querySelectorAll(REVEAL_SELECTOR);
    for (var i = 0; i < nodes.length; i++) bindReveal(nodes[i]);
  }

  if (!reduceMotion && hasIO) {
    docEl.classList.add('anim');
    revealIO = new IntersectionObserver(onReveal, {
      rootMargin: '0px 0px -8% 0px',   /* trigger shortly before the element is fully visible */
      threshold: 0.1
    });
    scanReveals();

    /* officers, events, gallery, reports... are injected after page load */
    var scanScheduled = false;
    new MutationObserver(function () {
      if (scanScheduled) return;
      scanScheduled = true;
      setTimeout(function () {
        scanScheduled = false;
        scanReveals();
      }, 160);
    }).observe(document.body, { childList: true, subtree: true });

    window.addEventListener('load', scanReveals);
  }

  /* ------------------------------------------------------------------ */
  /* 2. Scroll-spy: highlight the nav button of the section in view      */
  /* ------------------------------------------------------------------ */

  var navButtons = Array.prototype.slice.call(
    document.querySelectorAll('#primary-nav button[data-view]')
  );
  var dropdownToggle = document.querySelector('#primary-nav .dropdown-toggle');

  function setActiveView(name) {
    navButtons.forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === name);
    });
    /* the REPORTS & TRANSPARENCY button stays lit for reports + resolutions */
    if (dropdownToggle) {
      var group = (dropdownToggle.dataset.group || '').split(' ');
      dropdownToggle.classList.toggle('active', group.indexOf(name) > -1);
    }
  }

  if (hasIO) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && en.target.id) {
          setActiveView(en.target.id.replace('view-', ''));
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

    Array.prototype.forEach.call(
      document.querySelectorAll('main section.view'),
      function (s) { spy.observe(s); }
    );
  }

  /* ------------------------------------------------------------------ */
  /* 3-5. Header state, scroll progress, back-to-top                     */
  /* ------------------------------------------------------------------ */

  var header = document.querySelector('header.site');
  var progressBar = document.querySelector('.scroll-progress span');
  var toTop = document.getElementById('to-top');
  var scrollFrame = 0;

  function onScroll() {
    scrollFrame = 0;
    var y = window.scrollY || window.pageYOffset || 0;

    if (header) header.classList.toggle('scrolled', y > 24);
    if (toTop) toTop.classList.toggle('show', y > 600);

    if (progressBar) {
      var max = docEl.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(y / max, 1) : 0;
      progressBar.style.transform = 'scaleX(' + p + ')';
    }
  }

  window.addEventListener('scroll', function () {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(onScroll);
  }, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 6. Count-up for the "BY THE NUMBERS" statistics                     */
  /* ------------------------------------------------------------------ */

  function animateCount(el, target) {
    var decimals = (target % 1 !== 0) ? 1 : 0;
    var t0 = null;
    var DURATION = 1100;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min((ts - t0) / DURATION, 1);
      var eased = 1 - Math.pow(1 - k, 3);          /* ease-out cubic */
      el.textContent = (target * eased).toFixed(decimals);
      if (k < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = String(target);           /* exact final value */
      }
    }
    requestAnimationFrame(step);
  }

  if (!reduceMotion) {
    ['snapshot-officers', 'snapshot-activities',
     'snapshot-resolutions', 'snapshot-reports'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;

      var observer = new MutationObserver(function () {
        var raw = el.textContent.trim().replace(/,/g, '');
        if (/^\d+(\.\d+)?$/.test(raw)) {
          observer.disconnect();                   /* animate the first real value only */
          animateCount(el, parseFloat(raw));
        }
      });
      observer.observe(el, { childList: true, characterData: true, subtree: true });

      /* the value may already be present when this script runs */
      var initial = el.textContent.trim().replace(/,/g, '');
      if (/^\d+(\.\d+)?$/.test(initial)) {
        observer.disconnect();
        animateCount(el, parseFloat(initial));
      }
    });
  }

})();
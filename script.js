/**
 * Shared infinite-loop slider engine.
 *
 * Centred slide, CSS-transform track, pointer drag, autoplay, pagination dots.
 * Slides are duplicated on BOTH sides so every index has a pixel-identical twin
 * one set away — the loop "reset" is an invisible no-op rather than a jump.
 *
 * options:
 *   wrapper      required  overflow-hidden element that clips the track
 *   track        required  flex row holding the slides
 *   dots         optional  container the pagination dots are rendered into
 *   dotClass     optional  class applied to each generated dot
 *   dotLabel     optional  (i) => aria-label for dot i
 *   autoplayMs   optional  autoplay interval (0 disables)
 *   durationMs   optional  slide transition duration
 *   easing       optional  slide transition easing
 *   onLayout     optional  (slides, wrapper) => void, run before every measure
 */
function createLoopSlider(options) {
  const wrapper = options.wrapper;
  const track = options.track;
  if (!wrapper || !track) return null;

  const originals = Array.from(track.children);
  const total = originals.length;
  if (!total) return null;

  const AUTOPLAY_MS = options.autoplayMs === undefined ? 5000 : options.autoplayMs;
  const DURATION_MS = options.durationMs || 500;
  const EASING = options.easing || 'cubic-bezier(0.25, 1, 0.5, 1)';
  const SWIPE_RATIO = 0.15;   // fraction of a slide that commits a move
  const MAX_STEP = 2;         // slides a single flick may travel
  const FLICK_MS = 90;        // how far ahead release velocity is projected
  const onLayout = options.onLayout || null;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // ---- build the strip: [tail clones][originals][head clones] ----
  // CLONES is the buffer on each side. It only has to exceed the widest
  // on-screen half-window plus the furthest a single flick can throw us, so the
  // strip at index i and index i ± total always renders identically — that is
  // what makes the reset invisible.
  const CLONES = Math.min(total, 6);
  const cloneOf = (node) => {
    const copy = node.cloneNode(true);
    copy.classList.add('clone');
    copy.setAttribute('aria-hidden', 'true');
    return copy;
  };
  const head = document.createDocumentFragment();
  originals.slice(total - CLONES).forEach((n) => head.appendChild(cloneOf(n)));
  track.insertBefore(head, track.firstChild);
  const tail = document.createDocumentFragment();
  originals.slice(0, CLONES).forEach((n) => tail.appendChild(cloneOf(n)));
  track.appendChild(tail);

  const slides = Array.from(track.children);
  const REAL_START = CLONES;   // index of the first non-clone slide

  // ---- geometry (measured once per layout, never during a drag) ----
  let centers = [];
  let viewport = 0;
  let stride = 1;

  const measure = () => {
    if (onLayout) onLayout(slides, wrapper);
    const trackLeft = track.getBoundingClientRect().left;
    centers = slides.map((slide) => {
      const rect = slide.getBoundingClientRect();
      return (rect.left - trackLeft) + rect.width / 2;
    });
    viewport = wrapper.clientWidth;
    stride = centers.length > 1 ? (centers[1] - centers[0]) || 1 : 1;
  };
  const offsetFor = (i) => viewport / 2 - centers[i];

  // ---- transform plumbing ----
  let x = 0;
  let index = REAL_START;
  let animating = false;
  let settleTimer = null;
  let rafId = 0;
  let pendingX = 0;

  const setTransition = (on) => {
    track.style.transition = (on && !reduceMotion.matches)
      ? `transform ${DURATION_MS}ms ${EASING}`
      : 'none';
  };
  const setX = (value) => {
    x = value;
    track.style.transform = `translate3d(${value}px, 0, 0)`;
  };
  const jump = (value) => {
    setTransition(false);
    setX(value);
    void track.offsetWidth;   // flush, so the next glide can't animate the snap
  };
  const glide = (value) => {
    setTransition(true);
    setX(value);
  };
  const readTranslate = () => {
    const value = getComputedStyle(track).transform;
    if (!value || value === 'none') return x;
    try {
      return new DOMMatrixReadOnly(value).m41;
    } catch (_) {
      return x;
    }
  };

  // ---- dots ----
  const dotsHost = options.dots || null;
  const dotClass = options.dotClass || 'loop-dot';
  let dots = [];
  if (dotsHost) {
    dotsHost.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = dotClass;
      dot.dataset.index = String(i);
      dot.setAttribute('aria-label', options.dotLabel ? options.dotLabel(i) : `${i + 1}`);
      dotsHost.appendChild(dot);
    }
    dots = Array.from(dotsHost.children);
  }

  const logicalIndex = () => (((index - REAL_START) % total) + total) % total;
  const updateDots = () => {
    const active = logicalIndex();
    for (let i = 0; i < dots.length; i++) {
      const on = i === active;
      dots[i].classList.toggle('active', on);
      dots[i].setAttribute('aria-current', on ? 'true' : 'false');
    }
  };

  // Off-screen slides may start lazy; pull the neighbours in before they show.
  const ensureLoaded = (i) => {
    for (let d = -3; d <= 3; d++) {
      const slide = slides[i + d];
      if (!slide) continue;
      const img = slide.querySelector('img[loading="lazy"]');
      if (img) img.loading = 'eager';
    }
  };

  // ---- navigation ----
  // Because clones flank the originals, snapping back into range lands on a
  // frame that renders identically — nothing on screen changes.
  const normalize = () => {
    let next = index;
    while (next < REAL_START) next += total;
    while (next >= REAL_START + total) next -= total;
    if (next !== index) {
      index = next;
      jump(offsetFor(index));
      ensureLoaded(index);   // the twin's neighbours are different elements
    }
  };

  const onSettled = () => {
    if (settleTimer) {
      clearTimeout(settleTimer);
      settleTimer = null;
    }
    if (!animating) return;
    animating = false;
    normalize();
  };

  track.addEventListener('transitionend', (event) => {
    // Ignore anything bubbling up from the slides themselves.
    if (event.target !== track || event.propertyName !== 'transform') return;
    onSettled();
  });

  const goTo = (target, animate = true) => {
    index = target;
    updateDots();
    ensureLoaded(index);
    if (settleTimer) {
      clearTimeout(settleTimer);
      settleTimer = null;
    }
    if (!animate || reduceMotion.matches) {
      animating = false;
      jump(offsetFor(index));
      normalize();
      return;
    }
    animating = true;
    glide(offsetFor(index));
    // Safety net: transitionend never fires for a zero-distance move, and
    // background tabs can swallow it entirely. Without this the slider
    // would latch "mid-transition" forever and stop responding.
    settleTimer = setTimeout(onSettled, DURATION_MS + 80);
  };

  // ---- autoplay ----
  let autoTimer = null;
  let dragging = false;
  let tabVisible = !document.hidden;
  let onScreen = true;

  const stopAutoplay = () => {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  };
  const syncAutoplay = () => {
    stopAutoplay();
    if (dragging || !tabVisible || !onScreen) return;
    if (total < 2 || !AUTOPLAY_MS || reduceMotion.matches) return;
    autoTimer = setInterval(() => goTo(index + 1), AUTOPLAY_MS);
  };

  document.addEventListener('visibilitychange', () => {
    tabVisible = !document.hidden;
    if (tabVisible) goTo(index, false);   // re-sync after a throttled tab
    syncAutoplay();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      syncAutoplay();
    }, { threshold: 0.1 }).observe(wrapper);
  }

  // ---- pointer drag (mouse, touch and pen through one code path) ----
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let startOffset = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;
  let axisLocked = false;

  const flushDrag = () => {
    rafId = 0;
    if (dragging) setX(pendingX);
  };

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (dotsHost && dotsHost.contains(event.target)) return;

    dragging = true;
    axisLocked = false;
    pointerId = event.pointerId;
    startX = lastX = event.clientX;
    startY = event.clientY;
    lastT = event.timeStamp;
    velocity = 0;

    stopAutoplay();
    if (settleTimer) {
      clearTimeout(settleTimer);
      settleTimer = null;
    }
    animating = false;

    // Grab the strip exactly where it is, even mid-transition.
    startOffset = readTranslate();
    pendingX = startOffset;
    setTransition(false);
    setX(startOffset);

    try {
      wrapper.setPointerCapture(event.pointerId);
    } catch (_) { /* not fatal */ }
  };

  const onPointerMove = (event) => {
    if (!dragging || event.pointerId !== pointerId) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (!axisLocked) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;   // wait for intent
      if (Math.abs(dy) > Math.abs(dx)) {                  // vertical: hand it back to the page
        endDrag(event, true);
        return;
      }
      axisLocked = true;
    }

    const dt = event.timeStamp - lastT;
    if (dt > 0) velocity = 0.7 * ((event.clientX - lastX) / dt) + 0.3 * velocity;
    lastX = event.clientX;
    lastT = event.timeStamp;

    pendingX = startOffset + dx;
    if (!rafId) rafId = requestAnimationFrame(flushDrag);   // one write per frame
  };

  const endDrag = (event, abort) => {
    if (!dragging) return;
    dragging = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (pointerId !== null) {
      try {
        wrapper.releasePointerCapture(pointerId);
      } catch (_) { /* not fatal */ }
    }
    pointerId = null;

    if (abort || !axisLocked) {
      goTo(index);          // settle back onto the current slide
      syncAutoplay();
      return;
    }

    const travelled = (startOffset - x) / stride;                     // slides moved, forward positive
    const flick = clamp((-velocity * FLICK_MS) / stride, -0.9, 0.9);
    const raw = travelled + flick;
    let step = Math.round(raw);
    if (step === 0 && Math.abs(raw) > SWIPE_RATIO) step = Math.sign(raw);
    step = clamp(step, -MAX_STEP, MAX_STEP);

    goTo(index + step);
    syncAutoplay();
  };

  wrapper.addEventListener('pointerdown', onPointerDown);
  wrapper.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', (event) => endDrag(event, true));

  if (dotsHost) {
    dotsHost.addEventListener('click', (event) => {
      const dot = event.target.closest('.' + dotClass);
      if (!dot) return;
      const want = Number(dot.dataset.index);
      let delta = (want - logicalIndex() + total) % total;
      if (delta > total / 2) delta -= total;   // always take the short way round
      goTo(index + delta);
      syncAutoplay();
    });
  }

  // ---- layout ----
  const relayout = () => {
    measure();
    jump(offsetFor(index));
  };

  if ('ResizeObserver' in window) {
    let resizeRaf = 0;
    new ResizeObserver(() => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        relayout();
      });
    }).observe(wrapper);
  } else {
    window.addEventListener('resize', relayout);
  }

  relayout();
  updateDots();
  ensureLoaded(index);
  syncAutoplay();

  return { next: () => goTo(index + 1), prev: () => goTo(index - 1), relayout };
}

document.addEventListener('DOMContentLoaded', () => {
  // --- CAROUSEL FUNCTIONALITY ---
  const track = document.querySelector('.decor-carousel-track');
  const slides = Array.from(document.querySelectorAll('.decor-carousel-slide'));
  const dots = Array.from(document.querySelectorAll('.decor-carousel-dots .decor-dot'));
  
  if (track && slides.length > 0) {
    const originalSlides = [...slides]; // Keep original order
    let autoPlayTimer = null;
    let startX = 0;
    let isDragging = false;
    let isTransitioning = false;
    let direction = null; // 'forward' or 'back'
    let isMobile = window.innerWidth < 768;

    // Store original index on each slide
    slides.forEach((slide, index) => {
      slide.dataset.index = index;
    });

    const setTrackPosition = (percent, smooth = true) => {
      if (window.innerWidth >= 768) {
        track.style.transition = 'none';
        track.style.transform = 'none';
        return;
      }
      track.style.transition = smooth ? 'transform 0.4s ease-out' : 'none';
      track.style.transform = `translateX(${percent}%)`;
    };

    const updateDots = () => {
      if (window.innerWidth >= 768) return;
      const activeSlide = track.children[1];
      if (!activeSlide) return;
      const logicalIndex = parseInt(activeSlide.dataset.index);
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === logicalIndex);
      });
    };

    const moveLastSlideToStart = () => {
      const lastSlide = track.lastElementChild;
      if (lastSlide) track.insertBefore(lastSlide, track.firstElementChild);
    };

    const moveFirstSlideToEnd = () => {
      const firstSlide = track.firstElementChild;
      if (firstSlide) track.appendChild(firstSlide);
    };

    const animateForward = () => {
      if (isTransitioning || window.innerWidth >= 768) return;
      direction = 'forward';
      isTransitioning = true;
      setTrackPosition(-200, true);
    };

    const animateBackward = () => {
      if (isTransitioning || window.innerWidth >= 768) return;
      direction = 'back';
      isTransitioning = true;
      setTrackPosition(0, true);
    };

    track.addEventListener('transitionend', () => {
      if (window.innerWidth >= 768) {
        isTransitioning = false;
        direction = null;
        return;
      }
      if (direction === 'forward') {
        moveFirstSlideToEnd();
        setTrackPosition(-100, false);
      } else if (direction === 'back') {
        moveLastSlideToStart();
        setTrackPosition(-100, false);
      }
      isTransitioning = false;
      direction = null;
      updateDots();
    });

    const startAutoPlay = () => {
      stopAutoPlay();
      if (window.innerWidth >= 768) return;
      autoPlayTimer = setInterval(() => {
        animateForward();
      }, 4000);
    };

    const stopAutoPlay = () => {
      if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
      }
    };

    const goToSlide = (targetIndex) => {
      if (isTransitioning || window.innerWidth >= 768) return;
      const currentSlides = Array.from(track.children);
      const targetDOMIndex = currentSlides.findIndex(s => parseInt(s.dataset.index) === targetIndex);
      
      if (targetDOMIndex === 1) return; // Already visible
      if (targetDOMIndex === 2) {
        animateForward();
      } else if (targetDOMIndex === 0) {
        animateBackward();
      }
    };

    dots.forEach((dot, index) => {
      dot.addEventListener('click', (event) => {
        event.stopPropagation();
        goToSlide(index);
        startAutoPlay();
      });
    });

    const getPositionX = (event) => {
      if (event.pointerType) return event.clientX;
      if (event.type.includes('mouse')) return event.pageX;
      return (event.touches && event.touches.length > 0) ? event.touches[0].clientX : event.changedTouches[0].clientX;
    };

    const dragStart = (event) => {
      if (isTransitioning || window.innerWidth >= 768) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (event.target.closest('.decor-dot')) return;
      isDragging = true;
      startX = getPositionX(event);
      stopAutoPlay();
      track.style.transition = 'none';
      if (event.pointerId && event.currentTarget.setPointerCapture) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    };

    const dragMove = (event) => {
      if (!isDragging || window.innerWidth >= 768) return;
      const currentX = getPositionX(event);
      const diff = currentX - startX;
      
      const containerWidth = track.parentElement.offsetWidth;
      const translatePercent = (diff / containerWidth) * 100;
      
      // Base position is -100%
      setTrackPosition(-100 + translatePercent, false);
    };

    const dragEnd = (event) => {
      if (!isDragging || window.innerWidth >= 768) return;
      isDragging = false;
      
      const endX = event.pointerType ? event.clientX : (event.type.includes('touch') ? event.changedTouches[0].clientX : event.pageX);
      const diff = endX - startX;
      const containerWidth = track.parentElement.offsetWidth;
      
      if (Math.abs(diff) > containerWidth * 0.15) {
        if (diff > 0) {
          animateBackward();
        } else {
          animateForward();
        }
      } else {
        setTrackPosition(-100, true);
      }
      
      startAutoPlay();
    };

    const setupSliderLayout = () => {
      const currentlyMobile = window.innerWidth < 768;
      if (currentlyMobile) {
        if (!isMobile || track.children[1]?.dataset.index !== '0') {
          // Restore original order S1, S2, S3 first
          originalSlides.forEach(slide => track.appendChild(slide));
          // Move S3 to start
          moveLastSlideToStart();
          setTrackPosition(-100, false);
          updateDots();
          startAutoPlay();
        }
        isMobile = true;
      } else {
        // Desktop state: restore S1, S2, S3 order
        stopAutoPlay();
        originalSlides.forEach(slide => track.appendChild(slide));
        track.style.transition = 'none';
        track.style.transform = 'none';
        isMobile = false;
      }
    };

    // Initialize layout
    setupSliderLayout();

    window.addEventListener('resize', setupSliderLayout);

    const wrapper = document.querySelector('.decor-carousel-wrapper');
    if (wrapper) {
      wrapper.addEventListener('pointerdown', dragStart);
      wrapper.addEventListener('pointermove', dragMove);
      window.addEventListener('pointerup', dragEnd);
      window.addEventListener('pointercancel', dragEnd);

      wrapper.addEventListener('touchstart', dragStart, { passive: true });
      wrapper.addEventListener('touchmove', dragMove, { passive: true });
      wrapper.addEventListener('touchend', dragEnd);
      
      wrapper.addEventListener('mousedown', dragStart);
      wrapper.addEventListener('mousemove', dragMove);
      wrapper.addEventListener('mouseup', dragEnd);
      wrapper.addEventListener('mouseleave', () => {
        if (isDragging) {
          isDragging = false;
          setTrackPosition(-100, true);
          startAutoPlay();
        }
      });
    }
  }

  // --- RANDOM STARS GENERATOR ---
  const generateRandomStars = () => {
    // 1. Handle Free Decor cards (Fixed positions in HTML now, so disabled random generation)
    // 2. Handle Paid Decor cards (Fixed positions in HTML now, so disabled random generation)
  };

  // --- PRODUCT (BOTTLES) SLIDER ---
  // Slide widths are still driven from JS (the track is width:max-content, so
  // the slides cannot size themselves off a percentage) — onLayout runs before
  // every measure so the engine always reads the real geometry.
  createLoopSlider({
    wrapper: document.querySelector('.product-slider-wrapper'),
    track: document.querySelector('.product-slider-track'),
    dots: document.querySelector('.product-dots-container'),
    dotClass: 'product-dot',
    dotLabel: (i) => `商品 ${i + 1}`,
    autoplayMs: 5000,
    onLayout: (slides, wrapper) => {
      const width = window.innerWidth >= 768 ? 480 : wrapper.clientWidth;
      slides.forEach((slide) => {
        slide.style.width = `${width}px`;
      });
    },
  });

  generateRandomStars();

  // --- COMBINATIONS CARDS GENERATOR ---
  const combinationsData = [
    {
      name: "王道かわいい",
      image: "assets/cp-1.png",
      borderColor: "#FF9BBE",
      textColor: "#FF457D",
      bgColor: "#FFECEF",
      shadowColor: "rgba(255, 69, 125, 0.25)",
      icon: "assets/pink.svg"
    },
    {
      name: "天使界隈",
      image: "assets/cp-2.png",
      borderColor: "#164F99",
      textColor: "#164F99",
      bgColor: "#EAF3FF",
      shadowColor: "rgba(74, 144, 226, 0.25)",
      icon: "assets/blue.svg"
    },
    {
      name: "大人フェミニン",
      image: "assets/cp-3.png",
      borderColor: "#FF9595",
      textColor: "#FF6C6C",
      bgColor: "#FFE5E5",
      shadowColor: "rgba(224, 90, 71, 0.25)",
      icon: "assets/kesri.svg"
    },
    {
      name: "華やか上品",
      image: "assets/cp-4.png",
      borderColor: "#F2AA00",
      textColor: "#F2AA00",
      bgColor: "#F8FADD",
      shadowColor: "rgba(184, 157, 24, 0.22)",
      icon: "assets/yellow.svg"
    },
    {
      name: "大人きれい",
      image: "assets/cp-6.png",
      borderColor: "#464646",
      textColor: "#262626",
      bgColor: "#EDEDED",
      shadowColor: "rgba(10, 10, 10, 0.2)",
      icon: "assets/black.svg"
    },
    {
      name: "ダークゴシック",
      image: "assets/cp-5.png",
      borderColor: "#B269C5",
      textColor: "#B269C5",
      bgColor: "#F5E5F9",
      shadowColor: "rgba(138, 43, 226, 0.25)",
      icon: "assets/purple.svg"
    }
  ];

  const combinationsGrid = document.getElementById('combinations-grid');
  if (combinationsGrid) {
    combinationsGrid.innerHTML = combinationsData.map(item => {
      return `
        <div class="combination-card" style="border-color: ${item.borderColor};">
          <div class="combination-card-glow" style="background: radial-gradient(circle, ${item.shadowColor} 0%, rgba(255,255,255,0) 70%);"></div>
          
         

          <div class="combination-card-img-container">
            <img src="${item.image}" alt="${item.name}" class="combination-card-img">
          </div>

          <div class="combination-card-footer" style="background-color: ${item.bgColor}; color: ${item.textColor};">
            <span>${item.name} <img src="${item.icon}" alt="${item.name}" class="combination-card-icon"></span>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- DESIGN COLLECTION SLIDER ---
  // Slide widths come from CSS here (80% on mobile, 3-up on desktop), so the
  // engine needs no layout hook.
  createLoopSlider({
    wrapper: document.querySelector('.dc-showcase-wrapper'),
    track: document.querySelector('.dc-showcase-track'),
    dots: document.querySelector('.dc-dots-container'),
    dotClass: 'dc-dot',
    dotLabel: (i) => `デザイン ${i + 1}`,
    autoplayMs: 5000,
  });

  // --- Q&A ACCORDION FUNCTIONALITY ---
  const qaItems = document.querySelectorAll('.qa-item');
  qaItems.forEach(item => {
    const questionRow = item.querySelector('.qa-question-row');
    const answerRow = item.querySelector('.qa-answer-row');
    
    if (questionRow && answerRow) {
      questionRow.addEventListener('click', () => {
        const isOpen = item.classList.contains('active');
        
        if (isOpen) {
          item.classList.remove('active');
          answerRow.style.maxHeight = '0px';
        } else {
          item.classList.add('active');
          answerRow.style.maxHeight = answerRow.scrollHeight + 'px';
        }
      });
    }
  });
});


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

  // --- PRODUCT SLIDER FUNCTIONALITY ---
  const pWrapper = document.querySelector('.product-slider-wrapper');
  const pTrack = document.querySelector('.product-slider-track');
  const pSlides = Array.from(document.querySelectorAll('.product-slider-slide'));

  if (pWrapper && pTrack && pSlides.length > 0) {
    const originalLength = pSlides.length;
    const firstClone = pSlides[0].cloneNode(true);
    const lastClone = pSlides[originalLength - 1].cloneNode(true);

    firstClone.classList.add('clone');
    lastClone.classList.add('clone');

    pTrack.appendChild(firstClone);
    pTrack.insertBefore(lastClone, pTrack.firstChild);

    const allSlides = Array.from(pTrack.querySelectorAll('.product-slider-slide'));
    
    // Dynamically generate dots based on original slide length
    const pDotsContainer = document.querySelector('.product-dots-container');
    if (pDotsContainer) {
      pDotsContainer.innerHTML = '';
      for (let i = 0; i < originalLength; i++) {
        const dot = document.createElement('span');
        dot.classList.add('product-dot');
        if (i === 0) dot.classList.add('active');
        dot.dataset.index = i;
        pDotsContainer.appendChild(dot);
      }
    }
    const pDots = Array.from(pDotsContainer ? pDotsContainer.querySelectorAll('.product-dot') : []);
    
    let currentIndex = 1;
    let pAutoPlayTimer = null;
    let pIsDragging = false;
    let pStartX = 0;
    let pStartTranslate = 0;
    let isTransitioning = false;

    const getSlideWidth = () => allSlides[1].getBoundingClientRect().width;
    const getTrackOffset = (index) => {
      const width = getSlideWidth();
      const wrapperWidth = pWrapper.offsetWidth;
      const centerOffset = (wrapperWidth - width) / 2;
      return centerOffset - index * width;
    };

    const updateSlideWidths = () => {
      const width = window.innerWidth >= 768 ? 480 : pWrapper.offsetWidth;
      allSlides.forEach(slide => {
        slide.style.width = `${width}px`;
      });
    };

    const setTranslate = (value, smooth = true) => {
      pTrack.style.transition = smooth ? 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)' : 'none';
      pTrack.style.transform = `translateX(${value}px)`;
    };

    const updateProductDots = () => {
      if (window.innerWidth >= 768) return;
      const logicalIndex = (currentIndex - 1 + originalLength) % originalLength;
      pDots.forEach((dot, i) => {
        dot.classList.toggle('active', i === logicalIndex);
      });
    };

    const goToIndex = (index, smooth = true) => {
      if (isTransitioning && smooth) return;
      isTransitioning = smooth;
      currentIndex = index;
      setTranslate(getTrackOffset(currentIndex), smooth);
      updateProductDots();
    };

    pTrack.addEventListener('transitionend', () => {
      if (currentIndex === 0) {
        currentIndex = originalLength;
        setTranslate(getTrackOffset(currentIndex), false);
      } else if (currentIndex === originalLength + 1) {
        currentIndex = 1;
        setTranslate(getTrackOffset(currentIndex), false);
      }
      isTransitioning = false;
      updateProductDots();
    });

    const startAutoPlay = () => {
      stopAutoPlay();
      pAutoPlayTimer = setInterval(() => goToIndex(currentIndex + 1), 5000);
    };

    const stopAutoPlay = () => {
      if (pAutoPlayTimer) {
        clearInterval(pAutoPlayTimer);
        pAutoPlayTimer = null;
      }
    };

    const getPositionX = (event) => {
      if (event.pointerType) return event.clientX;
      if (event.type.includes('mouse')) return event.pageX;
      return (event.touches && event.touches.length > 0) ? event.touches[0].clientX : event.changedTouches[0].clientX;
    };

    const dragStart = (event) => {
      if (isTransitioning) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (event.target.closest('.product-dot')) return;
      pIsDragging = true;
      pStartX = getPositionX(event);
      pStartTranslate = getTrackOffset(currentIndex);
      stopAutoPlay();
      pTrack.style.transition = 'none';
      if (event.pointerId && event.currentTarget.setPointerCapture) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    };

    const dragMove = (event) => {
      if (!pIsDragging) return;
      const currentX = getPositionX(event);
      const diff = currentX - pStartX;
      setTranslate(pStartTranslate + diff, false);
    };

    const dragEnd = (event) => {
      if (!pIsDragging) return;
      pIsDragging = false;
      const endX = getPositionX(event);
      const diff = endX - pStartX;
      const threshold = getSlideWidth() * 0.15;

      if (Math.abs(diff) > threshold) {
        if (diff > 0) {
          goToIndex(currentIndex - 1);
        } else {
          goToIndex(currentIndex + 1);
        }
      } else {
        goToIndex(currentIndex);
      }
      startAutoPlay();
    };

    pDots.forEach((dot, index) => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        goToIndex(index + 1);
        startAutoPlay();
      });
    });

    if (pDotsContainer) {
      pDotsContainer.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
      pDotsContainer.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });
      pDotsContainer.addEventListener('touchend', (e) => e.stopPropagation());
      pDotsContainer.addEventListener('mousedown', (e) => e.stopPropagation());
      pDotsContainer.addEventListener('mousemove', (e) => e.stopPropagation());
      pDotsContainer.addEventListener('mouseup', (e) => e.stopPropagation());
      pDotsContainer.addEventListener('click', (e) => e.stopPropagation());
    }


    pWrapper.addEventListener('pointerdown', dragStart);
    pWrapper.addEventListener('pointermove', dragMove);
    window.addEventListener('pointerup', dragEnd);
    window.addEventListener('pointercancel', dragEnd);
    pWrapper.addEventListener('mouseleave', () => {
      if (pIsDragging) {
        pIsDragging = false;
        goToIndex(currentIndex);
        startAutoPlay();
      }
    });

    window.addEventListener('resize', () => {
      updateSlideWidths();
      goToIndex(currentIndex, false);
      updateProductDots();
    });

    updateSlideWidths();
    setTimeout(() => {
      goToIndex(currentIndex, false);
      updateProductDots();
    }, 50);
    startAutoPlay();
  }

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

  // --- DESIGN COLLECTION CAROUSEL ---
  const dcWrapper = document.querySelector('.dc-showcase-wrapper');
  const dcTrack = document.querySelector('.dc-showcase-track');
  const dcItems = Array.from(document.querySelectorAll('.dc-showcase-item'));
  const dcDots = Array.from(document.querySelectorAll('.dc-dot'));
  
  if (dcWrapper && dcTrack && dcItems.length > 0) {
    const originalLength = dcItems.length;
    
    // Clone first two and last two slides for seamless looping on PC/Mobile
    const firstClone1 = dcItems[0].cloneNode(true);
    const firstClone2 = dcItems[1].cloneNode(true);
    const lastClone1 = dcItems[originalLength - 1].cloneNode(true);
    const lastClone2 = dcItems[originalLength - 2].cloneNode(true);

    firstClone1.classList.add('clone');
    firstClone2.classList.add('clone');
    lastClone1.classList.add('clone');
    lastClone2.classList.add('clone');

    // Prepend last two: lastClone2, then lastClone1
    dcTrack.insertBefore(lastClone1, dcTrack.firstChild);
    dcTrack.insertBefore(lastClone2, dcTrack.firstChild);
    
    // Append first two: firstClone1, then firstClone2
    dcTrack.appendChild(firstClone1);
    dcTrack.appendChild(firstClone2);

    const allDCSlides = Array.from(dcTrack.querySelectorAll('.dc-showcase-item'));

    let dcCurrentIndex = 2; // Start at Slide 1 (index 2)
    let dcStartX = 0;
    let dcIsDragging = false;
    let dcCurrentTranslate = 0;
    let dcPrevTranslate = 0;
    let dcIsTransitioning = false;
    let dcAutoPlayTimer = null;
    let transitionTimeout = null;

    const getPositionX = (event) => {
      if (event.pointerType) return event.clientX;
      if (event.type.includes('mouse')) return event.pageX;
      return (event.touches && event.touches.length > 0) ? event.touches[0].clientX : event.changedTouches[0].clientX;
    };

    const getSlideWidth = () => allDCSlides[2].getBoundingClientRect().width;
    const getGapValue = () => window.innerWidth >= 768 ? 24 : 12;

    const getTrackOffset = (index) => {
      const width = getSlideWidth();
      const gap = getGapValue();
      const wrapperWidth = dcWrapper.offsetWidth;
      const centerOffset = (wrapperWidth - width) / 2;
      return centerOffset - index * (width + gap);
    };

    const setTranslate = (value, smooth = true) => {
      dcTrack.style.transition = smooth ? 'transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)' : 'none';
      dcTrack.style.transform = `translateX(${value}px)`;
      dcCurrentTranslate = value;
      dcPrevTranslate = value;
    };

    const updateDCDots = () => {
      const logicalIndex = (dcCurrentIndex - 2 + originalLength) % originalLength;
      dcDots.forEach((dot, i) => {
        dot.classList.toggle('active', i === logicalIndex);
      });
    };

    const handleTransitionEnd = () => {
      if (dcCurrentIndex <= 1) {
        dcCurrentIndex += originalLength;
        setTranslate(getTrackOffset(dcCurrentIndex), false);
      } else if (dcCurrentIndex >= originalLength + 2) {
        dcCurrentIndex -= originalLength;
        setTranslate(getTrackOffset(dcCurrentIndex), false);
      }
      dcIsTransitioning = false;
      updateDCDots();
    };

    const goToIndex = (index, smooth = true) => {
      if (dcIsTransitioning && smooth) return;
      dcIsTransitioning = smooth;
      dcCurrentIndex = index;
      setTranslate(getTrackOffset(dcCurrentIndex), smooth);
      updateDCDots();
    };

    const startAutoPlay = () => {
      stopAutoPlay();
      dcAutoPlayTimer = setInterval(() => {
        goToIndex(dcCurrentIndex + 1);
      }, 4000);
    };

    const stopAutoPlay = () => {
      if (dcAutoPlayTimer) {
        clearInterval(dcAutoPlayTimer);
        dcAutoPlayTimer = null;
      }
    };

    // Dot click events
    dcDots.forEach((dot, index) => {
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        goToIndex(index + 2);
        startAutoPlay();
      });
    });

    // Touch and mouse drag handlers for swipe
    const dragStart = (event) => {
      if (dcIsTransitioning) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (event.target.closest('.dc-dot')) return;
      dcIsDragging = true;
      dcStartX = getPositionX(event);
      dcPrevTranslate = getTrackOffset(dcCurrentIndex);
      stopAutoPlay();
      dcTrack.style.transition = 'none';
      if (event.pointerId && event.currentTarget.setPointerCapture) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    };

    const dragMove = (event) => {
      if (!dcIsDragging) return;
      const currentX = getPositionX(event);
      const diff = currentX - dcStartX;
      setTranslate(dcPrevTranslate + diff, false);
    };

    const dragEnd = (event) => {
      if (!dcIsDragging) return;
      dcIsDragging = false;
      
      const width = getSlideWidth();
      const threshold = width * 0.15;
      const currentX = getPositionX(event);
      const diff = currentX - dcStartX;
      
      if (Math.abs(diff) > threshold) {
        if (diff > 0) {
          goToIndex(dcCurrentIndex - 1);
        } else {
          goToIndex(dcCurrentIndex + 1);
        }
      } else {
        goToIndex(dcCurrentIndex);
      }
      startAutoPlay();
    };

    if (dcWrapper) {
      dcWrapper.addEventListener('pointerdown', dragStart);
      dcWrapper.addEventListener('pointermove', dragMove);
      window.addEventListener('pointerup', dragEnd);
      window.addEventListener('pointercancel', dragEnd);
      dcWrapper.addEventListener('mouseleave', () => {
        if (dcIsDragging) {
          dcIsDragging = false;
          goToIndex(dcCurrentIndex);
          startAutoPlay();
        }
      });
    }

    // Initialize position and autoplay
    dcTrack.addEventListener('transitionend', handleTransitionEnd);
    setTimeout(() => {
      goToIndex(dcCurrentIndex, false);
      updateDCDots();
      startAutoPlay();
    }, 50);

    // Handle screen resize
    window.addEventListener('resize', () => {
      goToIndex(dcCurrentIndex, false);
      updateDCDots();
    });
  }

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


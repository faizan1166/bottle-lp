document.addEventListener('DOMContentLoaded', () => {
  // --- CAROUSEL FUNCTIONALITY ---
  const track = document.querySelector('.decor-carousel-track');
  const slides = Array.from(document.querySelectorAll('.decor-carousel-slide'));
  const dots = Array.from(document.querySelectorAll('.decor-dot'));
  
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
      dot.addEventListener('click', () => {
        goToSlide(index);
        startAutoPlay();
      });
    });

    const getPositionX = (event) => {
      return event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
    };

    const dragStart = (event) => {
      if (isTransitioning || window.innerWidth >= 768) return;
      isDragging = true;
      startX = getPositionX(event);
      stopAutoPlay();
      track.style.transition = 'none';
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
      
      const endX = event.type.includes('touch') ? event.changedTouches[0].clientX : event.pageX;
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

    // 2. Handle Paid Decor cards: exactly one star and one heart per card
    const paidCards = document.querySelectorAll('.paid-card');
    paidCards.forEach(card => {
      // Remove any existing dynamic elements first
      card.querySelectorAll('.paid-card-sparkle, .paid-card-heart').forEach(el => el.remove());

      // Generate exactly one star and one heart
      const star = document.createElement('span');
      star.className = 'paid-card-sparkle';

      const heart = document.createElement('span');
      heart.className = 'paid-card-heart';

      // Place them on opposite sides (one left, one right) randomly
      const starOnLeft = Math.random() > 0.5;
      if (starOnLeft) {
        star.style.left = `${Math.floor(Math.random() * 10) + 5}%`;
        heart.style.right = `${Math.floor(Math.random() * 10) + 5}%`;
      } else {
        star.style.right = `${Math.floor(Math.random() * 10) + 5}%`;
        heart.style.left = `${Math.floor(Math.random() * 10) + 5}%`;
      }

      // Random vertical offsets: between 15% and 75% to not cover title or footer
      star.style.top = `${Math.floor(Math.random() * 55) + 15}%`;
      heart.style.top = `${Math.floor(Math.random() * 55) + 15}%`;

      card.appendChild(star);
      card.appendChild(heart);
    });
  };

  // --- PRODUCT SLIDER FUNCTIONALITY ---
  const pWrapper = document.querySelector('.product-slider-wrapper');
  const pTrack = document.querySelector('.product-slider-track');
  let pSlides = Array.from(document.querySelectorAll('.product-slider-slide'));

  if (pWrapper && pTrack && pSlides.length > 0) {
    const originalLength = pSlides.length;
    const firstClone = pSlides[0].cloneNode(true);
    const lastClone = pSlides[originalLength - 1].cloneNode(true);

    firstClone.classList.add('clone');
    lastClone.classList.add('clone');

    pTrack.appendChild(firstClone);
    pTrack.insertBefore(lastClone, pTrack.firstChild);

    const allSlides = Array.from(pTrack.querySelectorAll('.product-slider-slide'));
    let currentIndex = 1;
    let pAutoPlayTimer = null;
    let pIsDragging = false;
    let pStartX = 0;
    let pCurrentTranslate = 0;
    let pStartTranslate = 0;
    let isTransitioning = false;

    const getSlideWidth = () => allSlides[0].getBoundingClientRect().width;
    const getSlideGap = () => {
      const slideStyle = getComputedStyle(allSlides[0]);
      return (parseFloat(slideStyle.marginLeft) || 0) + (parseFloat(slideStyle.marginRight) || 0);
    };

    const getSlideOffset = (index) => {
      const width = getSlideWidth();
      const gap = getSlideGap();
      const centerOffset = (pWrapper.offsetWidth - width) / 2;
      return centerOffset - index * (width + gap);
    };

    const setSliderPosition = (translate, smooth = true) => {
      pCurrentTranslate = translate;
      pTrack.style.transition = smooth ? 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)' : 'none';
      pTrack.style.transform = `translateX(${translate}px)`;
    };

    const moveToIndex = (index, smooth = true) => {
      if (isTransitioning && smooth) return;
      if (smooth) isTransitioning = true;
      currentIndex = index;
      setSliderPosition(getSlideOffset(currentIndex), smooth);
    };

    pTrack.addEventListener('transitionend', () => {
      isTransitioning = false;
      if (currentIndex === allSlides.length - 1) {
        currentIndex = 1;
        setSliderPosition(getSlideOffset(currentIndex), false);
      } else if (currentIndex === 0) {
        currentIndex = originalLength;
        setSliderPosition(getSlideOffset(currentIndex), false);
      }
    });

    const startAutoPlay = () => {
      stopAutoPlay();
      pAutoPlayTimer = setInterval(() => moveToIndex(currentIndex + 1), 5000);
    };

    const stopAutoPlay = () => {
      if (pAutoPlayTimer) {
        clearInterval(pAutoPlayTimer);
        pAutoPlayTimer = null;
      }
    };

    const getPositionX = (event) => event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;

    const dragStart = (event) => {
      if (isTransitioning) return;
      pIsDragging = true;
      pStartX = getPositionX(event);
      pStartTranslate = pCurrentTranslate;
      stopAutoPlay();
      pTrack.style.transition = 'none';
    };

    const dragMove = (event) => {
      if (!pIsDragging) return;
      const currentX = getPositionX(event);
      const diff = currentX - pStartX;
      pTrack.style.transform = `translateX(${pStartTranslate + diff}px)`;
    };

    const dragEnd = (event) => {
      if (!pIsDragging) return;
      pIsDragging = false;
      const endX = getPositionX(event);
      const diff = endX - pStartX;
      const threshold = getSlideWidth() * 0.15;

      if (Math.abs(diff) > threshold) {
        if (diff > 0) {
          moveToIndex(currentIndex - 1);
        } else {
          moveToIndex(currentIndex + 1);
        }
      } else {
        moveToIndex(currentIndex);
      }

      startAutoPlay();
    };

    pWrapper.addEventListener('touchstart', dragStart, { passive: true });
    pWrapper.addEventListener('touchmove', dragMove, { passive: true });
    pWrapper.addEventListener('touchend', dragEnd);
    pWrapper.addEventListener('mousedown', dragStart);
    pWrapper.addEventListener('mousemove', dragMove);
    pWrapper.addEventListener('mouseup', dragEnd);
    pWrapper.addEventListener('mouseleave', () => {
      if (pIsDragging) {
        pIsDragging = false;
        moveToIndex(currentIndex);
        startAutoPlay();
      }
    });

    window.addEventListener('resize', () => {
      moveToIndex(currentIndex, false);
    });

    moveToIndex(currentIndex, false);
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
  const dcTrack = document.querySelector('.dc-showcase-track');
  const dcItems = Array.from(document.querySelectorAll('.dc-showcase-item'));
  const dcDots = Array.from(document.querySelectorAll('.dc-dot'));
  
  if (dcTrack && dcItems.length > 0) {
    let dcCurrentIndex = 1; // Default to center slide (DC-2)
    let dcStartX = 0;
    let dcIsDragging = false;
    let dcCurrentTranslate = 0;
    let dcPrevTranslate = 0;

    const getPositionX = (event) => {
      return event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
    };

    const updateDCCarousel = (index, smooth = true) => {
      if (window.innerWidth >= 768) {
        dcTrack.style.transform = '';
        return;
      }
      
      dcCurrentIndex = Math.max(0, Math.min(index, dcItems.length - 1));
      
      const containerWidth = dcTrack.parentElement.offsetWidth;
      const itemWidth = dcItems[0].offsetWidth;
      const gap = 12; // Gap matches CSS
      
      // Calculate translation to center the current item
      const offset = (containerWidth - itemWidth) / 2;
      const translation = offset - (dcCurrentIndex * (itemWidth + gap));
      
      dcTrack.style.transition = smooth ? 'transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)' : 'none';
      dcTrack.style.transform = `translateX(${translation}px)`;
      dcCurrentTranslate = translation;
      dcPrevTranslate = translation;
      
      dcDots.forEach((dot, i) => {
        dot.classList.toggle('active', i === dcCurrentIndex);
      });
    };

    // Dot click events
    dcDots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        updateDCCarousel(index);
      });
    });

    // Touch and mouse drag handlers for swipe
    const dragStart = (event) => {
      if (window.innerWidth >= 768) return;
      dcIsDragging = true;
      dcStartX = getPositionX(event);
      dcTrack.style.transition = 'none';
    };

    const dragMove = (event) => {
      if (!dcIsDragging) return;
      
      const currentX = getPositionX(event);
      const diff = currentX - dcStartX;
      const translation = dcPrevTranslate + diff;
      
      dcTrack.style.transform = `translateX(${translation}px)`;
      dcCurrentTranslate = translation;
    };

    const dragEnd = () => {
      if (!dcIsDragging) return;
      dcIsDragging = false;
      
      const containerWidth = dcTrack.parentElement.offsetWidth;
      const threshold = containerWidth * 0.12;
      const diff = dcCurrentTranslate - dcPrevTranslate;
      
      if (Math.abs(diff) > threshold) {
        if (diff > 0 && dcCurrentIndex > 0) {
          updateDCCarousel(dcCurrentIndex - 1);
        } else if (diff < 0 && dcCurrentIndex < dcItems.length - 1) {
          updateDCCarousel(dcCurrentIndex + 1);
        } else {
          updateDCCarousel(dcCurrentIndex);
        }
      } else {
        updateDCCarousel(dcCurrentIndex);
      }
    };

    // Attach event listeners to track parent
    const dcWrapper = document.querySelector('.dc-showcase-wrapper');
    if (dcWrapper) {
      dcWrapper.addEventListener('touchstart', dragStart, { passive: true });
      dcWrapper.addEventListener('touchmove', dragMove, { passive: true });
      dcWrapper.addEventListener('touchend', dragEnd);
      
      dcWrapper.addEventListener('mousedown', dragStart);
      dcWrapper.addEventListener('mousemove', dragMove);
      dcWrapper.addEventListener('mouseup', dragEnd);
      dcWrapper.addEventListener('mouseleave', () => {
        if (dcIsDragging) {
          dcIsDragging = false;
          updateDCCarousel(dcCurrentIndex);
        }
      });
    }

    // Initialize position
    updateDCCarousel(1, false);

    // Handle screen resize
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 768) {
        dcTrack.style.transform = '';
        dcTrack.style.transition = '';
      } else {
        updateDCCarousel(dcCurrentIndex, false);
      }
    });

    // Make sure layout shifts don't break centering
    setTimeout(() => {
      updateDCCarousel(dcCurrentIndex, false);
    }, 150);
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


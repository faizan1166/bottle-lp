document.addEventListener('DOMContentLoaded', () => {
  // --- CAROUSEL FUNCTIONALITY ---
  const track = document.querySelector('.decor-carousel-track');
  const slides = Array.from(document.querySelectorAll('.decor-carousel-slide'));
  const dots = Array.from(document.querySelectorAll('.decor-dot'));
  
  if (track && slides.length > 0) {
    let currentIndex = 0;
    let autoPlayTimer = null;
    let startX = 0;
    let isDragging = false;

    const updateCarousel = (index) => {
      currentIndex = index;
      if (currentIndex < 0) currentIndex = slides.length - 1;
      if (currentIndex >= slides.length) currentIndex = 0;
      
      track.style.transition = 'transform 0.4s ease-out';
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
      
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentIndex);
      });
    };

    const startAutoPlay = () => {
      stopAutoPlay();
      autoPlayTimer = setInterval(() => {
        updateCarousel(currentIndex + 1);
      }, 4000);
    };

    const stopAutoPlay = () => {
      if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
      }
    };

    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        updateCarousel(index);
        startAutoPlay();
      });
    });

    const getPositionX = (event) => {
      return event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
    };

    const dragStart = (event) => {
      isDragging = true;
      startX = getPositionX(event);
      stopAutoPlay();
      track.style.transition = 'none';
    };

    const dragMove = (event) => {
      if (!isDragging) return;
      const currentX = getPositionX(event);
      const diff = currentX - startX;
      
      const containerWidth = track.parentElement.offsetWidth;
      const translatePercent = (diff / containerWidth) * 100;
      const targetTranslate = -currentIndex * 100 + translatePercent;
      
      track.style.transform = `translateX(${targetTranslate}%)`;
    };

    const dragEnd = (event) => {
      if (!isDragging) return;
      isDragging = false;
      
      const endX = event.type.includes('touch') ? event.changedTouches[0].clientX : event.pageX;
      const diff = endX - startX;
      const containerWidth = track.parentElement.offsetWidth;
      
      if (Math.abs(diff) > containerWidth * 0.15) {
        if (diff > 0) {
          updateCarousel(currentIndex - 1);
        } else {
          updateCarousel(currentIndex + 1);
        }
      } else {
        updateCarousel(currentIndex);
      }
      
      startAutoPlay();
    };

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
          updateCarousel(currentIndex);
          startAutoPlay();
        }
      });
    }

    startAutoPlay();
  }

  // --- RANDOM STARS GENERATOR ---
  const generateRandomStars = () => {
    // 1. Handle Free Decor cards
    const freeCards = document.querySelectorAll('.decor-card');
    freeCards.forEach(card => {
      // Remove any existing hardcoded sparkles first
      const existingSparkles = card.querySelectorAll('.decor-card-sparkle');
      existingSparkles.forEach(s => s.remove());
      
      // Determine number of stars (1 or 2)
      const numStars = Math.floor(Math.random() * 2) + 1; // 1 or 2 stars
      
      for (let i = 0; i < numStars; i++) {
        const star = document.createElement('span');
        star.className = 'decor-card-sparkle';
        
        // Randomize placement: place on left or right margin to keep center clear for product img
        const placeOnLeft = Math.random() > 0.5;
        if (placeOnLeft) {
          star.style.left = `${Math.floor(Math.random() * 12) + 6}%`;
        } else {
          star.style.right = `${Math.floor(Math.random() * 12) + 6}%`;
        }
        
        // Vertical position: between 12% and 72% of the card height
        star.style.top = `${Math.floor(Math.random() * 60) + 12}%`;
        
        card.appendChild(star);
      }
    });

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

    // Clone first and last slides for infinite loop
    const firstClone = pSlides[0].cloneNode(true);
    const lastClone = pSlides[originalLength - 1].cloneNode(true);

    firstClone.classList.add('clone');
    lastClone.classList.add('clone');

    // Prepend last clone and append first clone
    pTrack.insertBefore(lastClone, pSlides[0]);
    pTrack.appendChild(firstClone);

    // Re-select slides to include clones
    const allSlides = Array.from(pTrack.querySelectorAll('.product-slider-slide'));

    let pCurrentIndex = 1; // Start with index 1 (Bar Royal Green Apple) centered
    let pAutoPlayTimer = null;
    let pStartX = 0;
    let pIsDragging = false;
    let pStartTranslate = 0;
    let pCurrentTranslate = 0;
    let isTransitioning = false;

    const getSlideWidthAndGap = () => {
      const isDesktop = window.innerWidth >= 768;
      const slideWidth = isDesktop ? 480 : pWrapper.offsetWidth;
      const gap = isDesktop ? 24 : 0;
      return { slideWidth, gap };
    };

    const updateSlidesWidth = () => {
      const { slideWidth } = getSlideWidthAndGap();
      allSlides.forEach(slide => {
        slide.style.width = `${slideWidth}px`;
      });
    };

    const getTranslateForIndex = (logicalIndex) => {
      const { slideWidth, gap } = getSlideWidthAndGap();
      const wrapperWidth = pWrapper.offsetWidth;
      // DOM index is logicalIndex + 1 (because lastClone is at index 0)
      const domIndex = logicalIndex + 1;
      return (wrapperWidth / 2) - (slideWidth / 2) - domIndex * (slideWidth + gap);
    };

    const updateSlider = (logicalIndex, smooth = true) => {
      if (isTransitioning && smooth) return;
      if (smooth) isTransitioning = true;

      pCurrentIndex = logicalIndex;

      const targetTranslate = getTranslateForIndex(pCurrentIndex);
      pCurrentTranslate = targetTranslate;
      
      pTrack.style.transition = smooth ? 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)' : 'none';
      pTrack.style.transform = `translateX(${targetTranslate}px)`;
    };

    pTrack.addEventListener('transitionend', () => {
      isTransitioning = false;
      
      // Infinite loop jumps
      if (pCurrentIndex === originalLength) {
        updateSlider(0, false);
      } else if (pCurrentIndex === -1) {
        updateSlider(originalLength - 1, false);
      }
    });

    const startAutoPlay = () => {
      stopAutoPlay();
      pAutoPlayTimer = setInterval(() => {
        updateSlider(pCurrentIndex + 1);
      }, 5000);
    };

    const stopAutoPlay = () => {
      if (pAutoPlayTimer) {
        clearInterval(pAutoPlayTimer);
        pAutoPlayTimer = null;
      }
    };

    const getDragPositionX = (event) => {
      return event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
    };

    const dragStart = (event) => {
      if (isTransitioning) return;
      pIsDragging = true;
      pStartX = getDragPositionX(event);
      pStartTranslate = pCurrentTranslate;
      stopAutoPlay();
      pTrack.style.transition = 'none';
    };

    const dragMove = (event) => {
      if (!pIsDragging) return;
      const currentX = getDragPositionX(event);
      const diff = currentX - pStartX;
      pCurrentTranslate = pStartTranslate + diff;
      pTrack.style.transform = `translateX(${pCurrentTranslate}px)`;
    };

    const dragEnd = (event) => {
      if (!pIsDragging) return;
      pIsDragging = false;
      
      const endX = event.type.includes('touch') ? event.changedTouches[0].clientX : event.pageX;
      const diff = endX - pStartX;
      const { slideWidth } = getSlideWidthAndGap();
      const threshold = slideWidth * 0.15;

      if (Math.abs(diff) > threshold) {
        if (diff > 0) {
          updateSlider(pCurrentIndex - 1);
        } else {
          updateSlider(pCurrentIndex + 1);
        }
      } else {
        updateSlider(pCurrentIndex);
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
        updateSlider(pCurrentIndex);
        startAutoPlay();
      }
    });

    window.addEventListener('resize', () => {
      updateSlidesWidth();
      updateSlider(pCurrentIndex, false);
    });

    updateSlidesWidth();
    setTimeout(() => {
      updateSlidesWidth();
      updateSlider(pCurrentIndex, false);
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
});

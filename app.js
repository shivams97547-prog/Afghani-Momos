/**
 * AFGHANI MOMOS • CINEMATIC SCROLL ANIMATION CONTROLLER
 * Ultra-responsive, 60+ FPS lerp-smoothed canvas scroll scrubbing engine
 */

(function () {
  'use strict';

  // --- Configuration ---
  const TOTAL_FRAMES = 240;
  const FRAME_PREFIX = 'frames/ezgif-frame-';
  const FRAME_EXT = '.jpg';

  // --- DOM Elements ---
  const canvas = document.getElementById('momo-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const heroTrack = document.getElementById('hero-track');
  const loader = document.getElementById('loader');
  const progressBar = document.getElementById('progress-bar');
  const loadCountEl = document.getElementById('load-count');
  const loadPercentEl = document.getElementById('load-percent');
  const heroIntro = document.getElementById('hero-intro');
  const hudFrame = document.getElementById('hud-frame');
  const hudPercent = document.getElementById('hud-percent');
  const hudSpeed = document.getElementById('hud-speed');
  const hudProgressFill = document.getElementById('hud-progress-fill');
  const actIndicator = document.getElementById('act-indicator');
  const timelineTrack = document.getElementById('timeline-track');
  const timelineFill = document.getElementById('timeline-fill');
  const timelineHandle = document.getElementById('timeline-handle');
  const scrollCue = document.getElementById('scroll-cue');
  const autoplayBtn = document.getElementById('autoplay-btn');
  const playIcon = document.getElementById('play-icon');
  const playLabel = document.getElementById('play-label');
  const navSoundBtn = document.getElementById('nav-sound-btn');
  const soundIcon = document.getElementById('sound-icon');
  const soundLabel = document.getElementById('sound-label');
  const speedPills = document.querySelectorAll('.speed-pill');
  const cursorScrubBtn = document.getElementById('cursor-scrub-btn');
  const cursorScrubLabel = document.getElementById('cursor-scrub-label');

  const storyCards = [
    { el: document.getElementById('beat-2'), min: 0.28, max: 0.56 },
    { el: document.getElementById('beat-3'), min: 0.53, max: 0.79 },
    { el: document.getElementById('beat-4'), min: 0.77, max: 1.00 }
  ].filter(card => card.el !== null);

  const chapterBtns = document.querySelectorAll('.chapter-btn');
  const chapterLabels = document.querySelectorAll('.ch-label');
  const markers = document.querySelectorAll('.marker');

  // Multi-Level Speed Presets with Expanded Scroll Track Breadth
  const SPEED_CONFIGS = {
    1: { label: '1x CINEMA', lerp: 0.025, frameLerp: 0.03, autoSpeed: 0.0006, trackHeight: '420vh', wheelSens: 0.0001 },
    2: { label: '2x FAST', lerp: 0.07, frameLerp: 0.09, autoSpeed: 0.0015, trackHeight: '340vh', wheelSens: 0.0003 },
    4: { label: '4x TURBO', lerp: 0.15, frameLerp: 0.20, autoSpeed: 0.004, trackHeight: '280vh', wheelSens: 0.0007 },
    8: { label: '8x HYPER ⚡', lerp: 0.35, frameLerp: 0.45, autoSpeed: 0.010, trackHeight: '200vh', wheelSens: 0.0018 }
  };

  // Animation State - Default: 1x Cinema Mode (slow, cinematic)
  const images = [];
  let loadedFrames = 0;
  let targetProgress = 0;
  let currentProgress = 0;
  let currentFrameIndex = 0;
  let currentSpeed = 1;
  let isAutoPlaying = false;
  let isCursorScrubActive = false;
  let lerpFactor = SPEED_CONFIGS[1].lerp;
  let frameLerpFactor = SPEED_CONFIGS[1].frameLerp;
  let autoPlaySpeed = SPEED_CONFIGS[1].autoSpeed;
  let isDraggingTimeline = false;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  // --- Pad helper: 1 -> "001" ---
  function padZero(num, size = 3) {
    let s = num + '';
    while (s.length < size) s = '0' + s;
    return s;
  }

  // --- Frame Preloading ---
  function preloadImages() {
    let firstImageLoaded = false;

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      const frameSrc = `${FRAME_PREFIX}${padZero(i)}${FRAME_EXT}`;
      img.src = frameSrc;

      img.onload = () => {
        loadedFrames++;
        const percent = Math.floor((loadedFrames / TOTAL_FRAMES) * 100);
        
        if (loadCountEl) loadCountEl.textContent = loadedFrames;
        if (loadPercentEl) loadPercentEl.textContent = `${percent}%`;
        if (progressBar) progressBar.style.width = `${percent}%`;

        // Render first frame immediately to avoid blank canvas
        if (!firstImageLoaded && i === 1) {
          firstImageLoaded = true;
          resizeCanvas();
          renderFrame(0);
        }

        // When all or minimum critical frames loaded
        if (loadedFrames === TOTAL_FRAMES) {
          setTimeout(() => {
            if (loader) {
              loader.classList.add('hidden');
            }
          }, 400);
        }
      };

      img.onerror = () => {
        loadedFrames++;
        if (loadedFrames === TOTAL_FRAMES && loader) {
          loader.classList.add('hidden');
        }
      };

      images.push(img);
    }
  }

  // --- Canvas Sizing & High DPI handling ---
  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    renderFrame(currentFrameIndex);
  }

  // --- Render Frame to Canvas with 'Cover' scaling ---
  function renderFrame(index) {
    const safeIndex = Math.min(Math.max(Math.round(index), 0), TOTAL_FRAMES - 1);
    const img = images[safeIndex];

    if (!img || !img.complete || img.naturalWidth === 0) {
      return;
    }

    const cWidth = canvas.width;
    const cHeight = canvas.height;

    // Calculate aspect ratio cover fit
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = cWidth / cHeight;

    let renderW, renderH, offsetX, offsetY;

    if (canvasRatio > imgRatio) {
      renderW = cWidth;
      renderH = cWidth / imgRatio;
      offsetX = 0;
      offsetY = (cHeight - renderH) / 2;
    } else {
      renderH = cHeight;
      renderW = cHeight * imgRatio;
      offsetX = (cWidth - renderW) / 2;
      offsetY = 0;
    }

    // High quality smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(img, offsetX, offsetY, renderW, renderH);

    // Update HUD telemetry
    if (hudFrame) {
      hudFrame.textContent = `${padZero(safeIndex + 1)} / ${TOTAL_FRAMES}`;
    }
  }

  // --- Scroll Tracking ---
  function onScroll() {
    if (isDraggingTimeline) return;

    const rect = heroTrack.getBoundingClientRect();
    const trackHeight = rect.height - window.innerHeight;

    if (trackHeight <= 0) return;

    let progress = -rect.top / trackHeight;
    progress = Math.min(Math.max(progress, 0), 1);
    targetProgress = progress;

    // Hide scroll cue on initial scroll
    if (progress > 0.03 && scrollCue) {
      scrollCue.classList.add('hidden');
    } else if (progress <= 0.03 && scrollCue) {
      scrollCue.classList.remove('hidden');
    }
  }

  // --- Smooth Animation RAF Loop ---
  function animate() {
    // Handle Autoplay mode
    if (isAutoPlaying) {
      targetProgress += autoPlaySpeed;
      if (targetProgress >= 1) {
        targetProgress = 0; // Loop animation
      }
      // Sync window scroll smoothly
      const rect = heroTrack.getBoundingClientRect();
      const trackHeight = rect.height - window.innerHeight;
      const targetScrollY = heroTrack.offsetTop + targetProgress * trackHeight;
      window.scrollTo({ top: targetScrollY, behavior: 'instant' });
    }

    // Lerp progress for ultra-fast, snappy motion
    const delta = targetProgress - currentProgress;
    currentProgress += delta * lerpFactor;

    const targetFrame = currentProgress * (TOTAL_FRAMES - 1);
    const frameDelta = targetFrame - currentFrameIndex;
    currentFrameIndex += frameDelta * frameLerpFactor;

    renderFrame(currentFrameIndex);

    // Update Timeline UI
    const pct = Math.min(Math.max(currentProgress * 100, 0), 100);
    if (timelineFill) timelineFill.style.width = `${pct}%`;
    if (timelineHandle) timelineHandle.style.left = `${pct}%`;
    if (hudProgressFill) hudProgressFill.style.width = `${pct}%`;
    if (hudPercent) hudPercent.textContent = `${Math.round(pct)}%`;

    // Fade Hero Intro heading & subheading (fades away completely by 30% scroll progress)
    if (heroIntro) {
      const fadeLimit = 0.30;
      if (currentProgress < fadeLimit) {
        const alpha = Math.max(0, 1 - (currentProgress / fadeLimit));
        const translateY = -(currentProgress / fadeLimit) * 30;
        heroIntro.style.opacity = alpha.toFixed(3);
        heroIntro.style.transform = `translate(-50%, ${translateY.toFixed(1)}px)`;
        heroIntro.style.visibility = alpha > 0.005 ? 'visible' : 'hidden';
      } else {
        heroIntro.style.opacity = '0';
        heroIntro.style.visibility = 'hidden';
      }
    }

    // Update Story Beat Overlays
    updateStoryBeats(currentProgress);

    // Update Chapter buttons
    updateChapterButtons(currentProgress);

    requestAnimationFrame(animate);
  }

  // --- Story Beats Synchronization ---
  function updateStoryBeats(progress) {
    storyCards.forEach(card => {
      if (!card.el) return;
      if (progress >= card.min && progress <= card.max) {
        if (!card.el.classList.contains('active')) {
          card.el.classList.add('active');
        }
      } else {
        if (card.el.classList.contains('active')) {
          card.el.classList.remove('active');
        }
      }
    });
  }

  // --- Chapter Nav Buttons & ACT Bar Progress ---
  function updateChapterButtons(progress) {
    let currentAct = 'ACT I • THE IMMERSION';
    if (progress >= 0.25 && progress < 0.54) currentAct = 'ACT II • THE COLLISION';
    else if (progress >= 0.54 && progress < 0.78) currentAct = 'ACT III • TEXTURAL HARMONY';
    else if (progress >= 0.78) currentAct = 'ACT IV • THE ROYAL CORONATION';

    if (actIndicator) {
      actIndicator.textContent = currentAct;
    }

    chapterBtns.forEach(btn => {
      const step = parseFloat(btn.getAttribute('data-step'));
      if (isNaN(step)) return;
      let isActive = false;
      if (step === 0 && progress < 0.25) isActive = true;
      else if (step === 0.32 && progress >= 0.25 && progress < 0.54) isActive = true;
      else if (step === 0.65 && progress >= 0.54 && progress < 0.78) isActive = true;
      else if (step === 0.92 && progress >= 0.78) isActive = true;

      btn.classList.toggle('active', isActive);
    });

    chapterLabels.forEach(lbl => {
      const step = parseFloat(lbl.getAttribute('data-step'));
      let isActive = false;
      if (step === 0 && progress < 0.25) isActive = true;
      else if (step === 0.32 && progress >= 0.25 && progress < 0.54) isActive = true;
      else if (step === 0.65 && progress >= 0.54 && progress < 0.78) isActive = true;
      else if (step === 0.95 && progress >= 0.78) isActive = true;

      lbl.classList.toggle('active', isActive);
    });

    markers.forEach(marker => {
      const step = parseFloat(marker.getAttribute('data-step'));
      marker.classList.toggle('active', progress >= step);
    });
  }

  // --- Jump to Chapter / Step ---
  function jumpToStep(step) {
    const rect = heroTrack.getBoundingClientRect();
    const trackHeight = rect.height - window.innerHeight;
    const targetScrollY = heroTrack.offsetTop + step * trackHeight;
    window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
    targetProgress = step;
  }

  // --- Timeline Interactive Scrubbing ---
  function getFractionFromEvent(e) {
    const rect = timelineTrack.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    let fraction = clickX / rect.width;
    return Math.min(Math.max(fraction, 0), 1);
  }

  function initTimelineInteractions() {
    timelineTrack.addEventListener('mousedown', (e) => {
      isDraggingTimeline = true;
      const fraction = getFractionFromEvent(e);
      jumpToStep(fraction);
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDraggingTimeline) return;
      const fraction = getFractionFromEvent(e);
      jumpToStep(fraction);
    });

    window.addEventListener('mouseup', () => {
      if (isDraggingTimeline) {
        isDraggingTimeline = false;
      }
    });

    // Milestone buttons inside timeline
    markers.forEach(marker => {
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        const step = parseFloat(marker.getAttribute('data-step'));
        jumpToStep(step);
      });
    });

    chapterLabels.forEach(lbl => {
      lbl.addEventListener('click', () => {
        const step = parseFloat(lbl.getAttribute('data-step'));
        jumpToStep(step);
      });
    });

    chapterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const step = parseFloat(btn.getAttribute('data-step'));
        jumpToStep(step);
      });
    });
  }

  // --- Autoplay Toggle ---
  function toggleAutoplay() {
    isAutoPlaying = !isAutoPlaying;
    if (isAutoPlaying) {
      if (playIcon) playIcon.textContent = '⏸';
      if (playLabel) playLabel.textContent = 'Pause';
      autoplayBtn.classList.add('active');
    } else {
      if (playIcon) playIcon.textContent = '⚡';
      if (playLabel) playLabel.textContent = 'Hyper Play';
      autoplayBtn.classList.remove('active');
    }
  }

  if (autoplayBtn) {
    autoplayBtn.addEventListener('click', toggleAutoplay);
  }

  // --- Web Audio API: Procedural Culinary Sizzle FX ---
  let audioCtx = null;
  let sizzleGain = null;
  let isSoundActive = false;

  function initSizzleAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();

      // Pink Noise Generator for realistic butter/sauce sizzle
      const bufferSize = audioCtx.sampleRate * 2;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
        b6 = white * 0.115926;
      }

      const whiteNoise = audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Bandpass Filter centered at 3200 Hz for crispy sizzle
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3200, audioCtx.currentTime);
      filter.Q.setValueAtTime(1.8, audioCtx.currentTime);

      sizzleGain = audioCtx.createGain();
      sizzleGain.gain.setValueAtTime(0.001, audioCtx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(sizzleGain);
      sizzleGain.connect(audioCtx.destination);
      whiteNoise.start();

    } catch (err) {
      console.warn('Web Audio initialized with limitation:', err);
    }
  }

  function toggleSound() {
    if (!audioCtx) {
      initSizzleAudio();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    isSoundActive = !isSoundActive;
    if (isSoundActive) {
      navSoundBtn.classList.add('active');
      if (soundIcon) soundIcon.textContent = '🔊';
      if (soundLabel) soundLabel.textContent = 'Sizzle FX: ON';
      if (sizzleGain) {
        sizzleGain.gain.cancelScheduledValues(audioCtx.currentTime);
        sizzleGain.gain.linearRampToValueAtTime(0.07, audioCtx.currentTime + 0.4);
      }
    } else {
      navSoundBtn.classList.remove('active');
      if (soundIcon) soundIcon.textContent = '🔈';
      if (soundLabel) soundLabel.textContent = 'Sizzle FX: OFF';
      if (sizzleGain && audioCtx) {
        sizzleGain.gain.cancelScheduledValues(audioCtx.currentTime);
        sizzleGain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
      }
    }
  }

  if (navSoundBtn) {
    navSoundBtn.addEventListener('click', toggleSound);
  }

  // --- Speed Selector Controller (1x, 2x, 4x, 8x Hyper) ---
  function setSpeed(speed) {
    const numericSpeed = parseInt(speed, 10);
    if (!SPEED_CONFIGS[numericSpeed]) return;

    currentSpeed = numericSpeed;
    const cfg = SPEED_CONFIGS[numericSpeed];

    lerpFactor = cfg.lerp;
    frameLerpFactor = cfg.frameLerp;
    autoPlaySpeed = cfg.autoSpeed;

    if (heroTrack) {
      heroTrack.style.height = cfg.trackHeight;
    }

    if (hudSpeed) {
      hudSpeed.textContent = cfg.label;
    }

    // Update active state on speed pill buttons
    speedPills.forEach(pill => {
      const pSpeed = parseInt(pill.getAttribute('data-speed'), 10);
      pill.classList.toggle('active', pSpeed === numericSpeed);
    });
  }

  speedPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const sp = pill.getAttribute('data-speed');
      setSpeed(sp);
    });
  });

  // --- Cursor Scrub Mode (Glide mouse horizontally to scrub at infinite speed) ---
  function toggleCursorScrub() {
    isCursorScrubActive = !isCursorScrubActive;
    if (cursorScrubBtn) {
      cursorScrubBtn.classList.toggle('active', isCursorScrubActive);
    }
    if (cursorScrubLabel) {
      cursorScrubLabel.textContent = isCursorScrubActive ? 'Scrub: ACTIVE' : 'Cursor Scrub';
    }
  }

  if (cursorScrubBtn) {
    cursorScrubBtn.addEventListener('click', toggleCursorScrub);
  }

  // Cursor scrub on mouse movement across canvas / viewport
  window.addEventListener('mousemove', (e) => {
    if (isCursorScrubActive && !isDraggingTimeline) {
      const fraction = Math.min(Math.max(e.clientX / window.innerWidth, 0), 1);
      targetProgress = fraction;
      const rect = heroTrack.getBoundingClientRect();
      const trackHeight = rect.height - window.innerHeight;
      if (trackHeight > 0) {
        window.scrollTo({ top: heroTrack.offsetTop + fraction * trackHeight, behavior: 'instant' });
      }
    }
  });

  // --- Direct High-Sensitivity Wheel Accelerator ---
  window.addEventListener('wheel', (e) => {
    if (isDraggingTimeline) return;

    const rect = heroTrack.getBoundingClientRect();
    const trackHeight = rect.height - window.innerHeight;

    // If user is scrolled past heroTrack into the website content, allow natural smooth scrolling
    if (window.scrollY > heroTrack.offsetTop + trackHeight + 5) {
      return;
    }

    // If at the end of the animation sequence and scrolling further downwards, let the page scroll into menu
    if (targetProgress >= 0.99 && e.deltaY > 0) {
      return;
    }

    const cfg = SPEED_CONFIGS[currentSpeed];
    if (cfg && currentSpeed >= 2) {
      const step = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY) * cfg.wheelSens, 0.20);
      targetProgress = Math.min(Math.max(targetProgress + step, 0), 1);
      if (trackHeight > 0 && targetProgress < 1) {
        window.scrollTo({ top: heroTrack.offsetTop + targetProgress * trackHeight, behavior: 'instant' });
      }
    }
  }, { passive: true });

  // --- Cart functionality ---
  const cart = [];
  const cartBtn = document.getElementById('cart-btn');
  const cartCountEl = document.getElementById('cart-count');
  function updateCartUI() {
    if (cartCountEl) cartCountEl.textContent = cart.length;
  }
  function handleAddToCart(e) {
    const btn = e.target.closest('.add-to-cart');
    if (!btn) return;
    const name = btn.getAttribute('data-name');
    const price = parseFloat(btn.getAttribute('data-price'));
    cart.push({ name, price });
    updateCartUI();
    const originalText = btn.textContent;
    btn.textContent = 'Added!';
    setTimeout(() => { btn.textContent = originalText; }, 1200);
  }
  document.addEventListener('click', handleAddToCart);


  // --- Keyboard Shortcuts (1-4 for Speed, Space for Play, H for Scrub) ---
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Digit1') {
      setSpeed(1);
    } else if (e.code === 'Digit2') {
      setSpeed(2);
    } else if (e.code === 'Digit3') {
      setSpeed(4);
    } else if (e.code === 'Digit4') {
      setSpeed(8);
    } else if (e.key.toLowerCase() === 'h') {
      toggleCursorScrub();
    } else if (e.code === 'Space') {
      e.preventDefault();
      toggleAutoplay();
    } else if (e.code === 'ArrowDown' || e.code === 'ArrowRight') {
      const step = currentSpeed >= 4 ? 0.25 : 0.15;
      targetProgress = Math.min(targetProgress + step, 1);
      jumpToStep(targetProgress);
    } else if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') {
      const step = currentSpeed >= 4 ? 0.25 : 0.15;
      targetProgress = Math.max(targetProgress - step, 0);
      jumpToStep(targetProgress);
    } else if (e.code === 'Home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // --- Lifecycle Initializers ---
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('scroll', onScroll, { passive: true });

  // Init
  preloadImages();
  resizeCanvas();
  initTimelineInteractions();
  requestAnimationFrame(animate);

})();

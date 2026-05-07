document.addEventListener("DOMContentLoaded", () => {
  // ========== GLOBAL STATE ==========
  let currentLang = 'en';

  // ========== LIVE LOCATION + PARTICLE BACKGROUND ==========
  let userLocation = {
    lat: 22.7196,  // Default Indore
    lon: 75.8577,
    city: 'Indore, MP',
    accuracy: null,
    timestamp: null
  };

  async function getLiveLocation() {
    const geoPromise = new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('Geolocation not supported');
        resolve(userLocation);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`);
            const geoData = await geoRes.json();
            const city = geoData.display_name?.split(',')[0] || 'Your Location';
            const state = geoData.address?.state || 'MP';

            userLocation = {
              lat: latitude,
              lon: longitude,
              city: `${city}, ${state}`,
              accuracy: accuracy,
              timestamp: position.timestamp
            };

            document.getElementById('gw-city-name')?.textContent && (document.getElementById('gw-city-name').textContent = userLocation.city);
            console.log(`✅ Live GPS: ${userLocation.city} (${userLocation.lat.toFixed(4)}, ${userLocation.lon.toFixed(4)}) ±${accuracy.toFixed(0)}m`);
            resolve(userLocation);
          } catch (err) {
            console.warn('City lookup failed, using coords:', err);
            userLocation.city = `Lat:${latitude.toFixed(2)}, Lon:${longitude.toFixed(2)}`;
            resolve(userLocation);
          }
        },
        (error) => {
          console.warn('GPS denied/failed:', error.message);
          resolve(userLocation);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 5 * 60 * 1000 }
      );
    });

    // Race with a 3-second timeout so the app loads immediately
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        console.log('⏱️ Geolocation timeout — using default location:', userLocation.city);
        resolve(userLocation);
      }, 3000);
    });

    return Promise.race([geoPromise, timeoutPromise]);
  }

  // Get location on load
  getLiveLocation();

  // Hero title animation handled via CSS only (gradient-text preserved)

  // Refresh location permission every 5 minutes for live updates
  setInterval(getLiveLocation, 5 * 60 * 1000);

  // ========== BACKGROUND (clean — no particles) ==========

  // ========== SCROLL REVEAL ANIMATIONS ==========
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      } else {
        entry.target.classList.remove('revealed');
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.section, .cta-section, .footer').forEach(section => {
    section.classList.add('reveal-section');
    revealObserver.observe(section);
  });

  // Hero title animation is CSS-only (gradient shift + fadeSlideUp)

  // ========== NAVBAR ==========
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  // Mobile toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  const navLinks = document.getElementById('nav-links');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
  }

  // ========== STAT COUNTER ANIMATION ==========
  const statNumbers = document.querySelectorAll('.stat-number[data-target]');
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target);
        if (el.dataset.animated) return;
        el.dataset.animated = '1';
        let current = 0;
        const step = Math.ceil(target / 30);
        const timer = setInterval(() => {
          current += step;
          if (current >= target) { current = target; clearInterval(timer); }
          el.textContent = current;
        }, 40);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px 0px 0px' });
  statNumbers.forEach(el => statObserver.observe(el));




  // ========== AI CROP SCANNER ==========
  const cropData = {
    wheat: {
      name: 'Leaf Rust (Puccinia triticina)',
      confidence: 87,
      health: 32,
      treatments: ['Apply Propiconazole 25% EC @ 0.1%', 'Use resistant varieties like HD-2967', 'Remove infected debris after harvest', 'Consult nearest KVK for spray schedule']
    },
    rice: {
      name: 'Blast Disease (Magnaporthe oryzae)',
      confidence: 91,
      health: 25,
      treatments: ['Spray Tricyclazole 75% WP @ 0.06%', 'Maintain proper water management', 'Avoid excess nitrogen fertilizer', 'Use disease-free seeds next season']
    },
    tomato: {
      name: 'Early Blight (Alternaria solani)',
      confidence: 78,
      health: 45,
      treatments: ['Spray Mancozeb 75% WP @ 0.25%', 'Practice crop rotation', 'Remove lower infected leaves', 'Ensure adequate plant spacing']
    },
    corn: {
      name: 'Northern Corn Leaf Blight',
      confidence: 83,
      health: 38,
      treatments: ['Apply Azoxystrobin at first symptoms', 'Use Bt-hybrid resistant varieties', 'Ensure balanced NPK nutrition', 'Avoid continuous corn planting']
    }
  };

  let selectedCrop = null;
  let uploadedFile = null;
  const uploadZone = document.getElementById('upload-zone');
  const uploadPreview = document.getElementById('upload-preview');
  const previewImg = document.getElementById('preview-img');
  const cropFileInput = document.getElementById('crop-file-input');
  const uploadBtn = document.getElementById('upload-btn');
  const clearUpload = document.getElementById('clear-upload');
  const scanBtn = document.getElementById('scan-btn');
  const resultPlaceholder = document.getElementById('result-placeholder');
  const resultData = document.getElementById('result-data');

  uploadBtn?.addEventListener('click', (e) => { e.stopPropagation(); cropFileInput.click(); });
  uploadZone?.addEventListener('click', () => cropFileInput.click());

  uploadZone?.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
  uploadZone?.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone?.addEventListener('drop', (e) => {
    e.preventDefault(); uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  cropFileInput?.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  function handleFile(file) {
    // Frontend validation: only accept image files
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/bmp'];
    if (!allowedTypes.includes(file.type)) {
      alert('⚠️ कृपया केवल इमेज फाइल अपलोड करें (JPEG, PNG, WebP)\n\nPlease upload only image files (JPEG, PNG, WebP).\nPDF, DOC, video आदि स्वीकार्य नहीं हैं।');
      return;
    }
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('⚠️ फाइल बहुत बड़ी है (Max 10MB)\nPlease choose a smaller image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      uploadZone.style.display = 'none';
      uploadPreview.style.display = 'block';
      uploadedFile = file;

      // Will be detected by AI, set null for now
      selectedCrop = 'auto';

      scanBtn.disabled = false;
      document.querySelectorAll('.sample-btn').forEach(b => b.classList.remove('active'));
    };
    reader.readAsDataURL(file);
  }

  clearUpload?.addEventListener('click', () => {
    uploadZone.style.display = '';
    uploadPreview.style.display = 'none';
    selectedCrop = null;
    uploadedFile = null;
    cropFileInput.value = ''; // Ensure the file input is cleared so same file can be chosen again
    scanBtn.disabled = true;
  });

  document.querySelectorAll('.sample-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sample-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedCrop = btn.dataset.crop;
      uploadedFile = null;
      scanBtn.disabled = false;
      // Show visually that the sample image is uploaded to prevent user confusion
      uploadZone.style.display = 'none';
      uploadPreview.style.display = 'block';
      // Put a generic placeholder to mimic the sample file
      const cropText = btn.textContent.trim().replace(/[^a-zA-Z]/g, '');
      previewImg.src = `https://placehold.co/400x300/10b981/ffffff?text=${cropText}+Sample`;
    });
  });

  scanBtn?.addEventListener('click', async () => {
    if (!selectedCrop && !uploadedFile) return;
    resultPlaceholder.style.display = 'none';
    resultData.style.display = 'none';

    const scanAnim = document.createElement('div');
    scanAnim.className = 'scanning-anim';
    scanAnim.innerHTML = '<div class="scan-spinner"></div><p style="color:var(--text-muted);">🔬 AI + Soil Analysis in Progress...</p>';
    resultData.parentElement.insertBefore(scanAnim, resultData);

    try {
      // Get latest location
      await getLiveLocation();

      // Fetch disease + soil + crop info (parallel)
      const formData = new FormData();
      const cropForApi = selectedCrop === 'auto' ? 'wheat' : (selectedCrop || 'wheat');
      formData.append('cropType', cropForApi);
      if (uploadedFile) {
        formData.append('cropImage', uploadedFile);
      }

      const diseaseRes = await fetch('/api/crop-disease', {
        method: 'POST',
        body: formData
      });

      const diseaseData = await diseaseRes.json();

      // Check if image was rejected (not a crop/plant image)
      if (diseaseData.success === false) {
        scanAnim.remove();
        resultData.style.display = 'block';
        const isInvalidImage = diseaseData.error === 'NOT_CROP_IMAGE';
        const isInvalidFormat = diseaseData.error === 'INVALID_IMAGE';
        const isUnsupported = diseaseData.error === 'UNSUPPORTED_CROP';
        const isParseError = diseaseData.error === 'AI_PARSE_ERROR';
        const isServiceDown = diseaseData.error === 'AI_SERVICE_UNAVAILABLE';
        const isNoKey = diseaseData.error === 'NO_API_KEY';

        let emoji = '⚠️';
        let title = 'Error';
        if (isInvalidImage) { emoji = '🚫'; title = 'यह फसल/पत्ती की इमेज नहीं है!'; }
        else if (isUnsupported) { emoji = '🌿'; title = 'यह फसल हमारे डेटाबेस में नहीं है!'; }
        else if (isInvalidFormat) { emoji = '📄'; title = 'अमान्य फाइल फॉर्मेट!'; }
        else if (isParseError) { emoji = '🔄'; title = 'AI विश्लेषण में त्रुटि!'; }
        else if (isServiceDown) { emoji = '⏳'; title = 'AI सेवा अस्थायी रूप से बंद है'; }
        else if (isNoKey) { emoji = '🔧'; title = 'AI Key सेट नहीं है'; }

        resultData.innerHTML = `
          <div class="error-result" style="text-align:center; padding:30px;">
            <div style="font-size:4rem; margin-bottom:15px;">${emoji}</div>
            <h3 style="color:#ef4444; margin-bottom:10px;">${title}</h3>
            <p style="color:var(--text-muted); max-width:400px; margin:0 auto 20px; line-height:1.6; white-space:pre-line;">${diseaseData.message}</p>
            <div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.2); border-radius:12px; padding:15px; margin-top:15px;">
              <p style="color:#10b981; font-weight:600; margin-bottom:8px;">✅ कृपया ये अपलोड करें:</p>
              <ul style="text-align:left; color:var(--text-secondary); font-size:0.9rem; list-style:none; padding:0;">
                <li style="margin:5px 0;">🌾 गेहूं, चावल, बाजरा, ज्वार, मक्का</li>
                <li style="margin:5px 0;">🫘 चना, मूंग, उड़द, मोठ, ग्वार, सोयाबीन</li>
                <li style="margin:5px 0;">🍅 टमाटर, प्याज, आलू, मिर्च</li>
                <li style="margin:5px 0;">💛 सरसों, तिल, जीरा, धनिया, मेथी, ईसबगोल</li>
                <li style="margin:5px 0;">🥜 मूंगफली, अरंडी, कपास, गन्ना</li>
                <li style="margin:5px 0;">📸 साफ और स्पष्ट फोटो (JPEG, PNG)</li>
              </ul>
            </div>
          </div>
        `;
        return;
      }

      // Determine final crop type from AI response
      const finalCropType = diseaseData.cropType || cropForApi;

      const [soilRes, cropRes] = await Promise.all([
        fetch(`/api/soil?lat=${userLocation.lat}&lon=${userLocation.lon}&crop=${finalCropType}`),
        fetch(`/api/crop-info/${finalCropType}`).catch(() => null)
      ]);

      const soilData = await soilRes.json();
      let cropInfo;
      try {
        cropInfo = cropRes ? await cropRes.json() : null;
      } catch (e) { cropInfo = null; }

      // If cropInfo failed (unknown crop), create a basic one
      if (!cropInfo || cropInfo.error) {
        cropInfo = {
          name: finalCropType.charAt(0).toUpperCase() + finalCropType.slice(1),
          season: diseaseData.disease?.season || 'N/A',
          avgYield: diseaseData.disease?.expectedYield || 'N/A',
          soil: 'Varies', water: 'Varies'
        };
      }

      scanAnim.remove();
      showEnhancedScanResult(diseaseData, soilData, cropInfo);
    } catch (err) {
      scanAnim.remove();
      resultData.innerHTML = '<div class="error-result" style="text-align:center; padding:30px;"><div style="font-size:3rem; margin-bottom:10px;">⚠️</div><h3 style="color:#ef4444;">API Error</h3><p style="color:var(--text-muted);">Server से कनेक्ट नहीं हो पा रहा। कृपया <code>npm start</code> चलाएं।</p><p style="font-size:0.8rem; color:#999; margin-top:8px;">Error: ' + err.message + '</p></div>';
      resultData.style.display = 'block';
    }
  });

  function showEnhancedScanResult(diseaseData, soil, cropInfo) {
    const disease = diseaseData.disease;
    resultData.style.display = 'block';

    let tipHtml = '';
    if (diseaseData.tip) {
      tipHtml = `<div style="background-color: rgba(245, 158, 11, 0.1); color: #b45309; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 0.9rem; border: 1px solid rgba(245, 158, 11, 0.2);"><i class="fas fa-exclamation-circle"></i> ${diseaseData.tip}</div>`;
    }

    resultData.innerHTML = `
    ${tipHtml}
    <div class="result-header">
      <h3><i class="fas fa-bug"></i> ${disease.name}</h3>
      <span class="confidence-badge ${disease.probability > 85 ? 'high' : disease.probability > 70 ? 'medium' : 'low'}">${disease.probability}% Confidence</span>
    </div>
    
    <div class="result-meters">
      <div class="meter">
        <span class="meter-label">Disease Risk</span>
        <div class="meter-bar danger"><div class="meter-fill" id="disease-meter"></div></div>
        <span id="disease-percent">0%</span>
      </div>
      <div class="meter">
        <span class="meter-label">Crop Health</span>
        <div class="meter-bar health"><div class="meter-fill" id="health-meter"></div></div>
        <span id="health-percent">0%</span>
      </div>
      <div class="meter">
        <span class="meter-label">Soil Fertility</span>
        <div class="meter-bar ${soil.fertility === 'High' ? 'success' : soil.fertility === 'Good' ? 'warning' : 'danger'}">
          <div class="meter-fill" id="soil-meter"></div>
        </div>
        <span id="soil-percent">${soil.fertility}</span>
      </div>
    </div>
    
    <div class="soil-card">
      <h4><i class="fas fa-seedling"></i> मिट्टी जाँच Report (${soil.location})</h4>
      <div class="soil-stats">
        <div><strong>pH:</strong> ${soil.pH}</div>
        <div><strong>NPK:</strong> N${soil.N} P${soil.P} K${soil.K}</div>
        <div><strong>Water:</strong> ${soil.moisture}%</div>
        <div><strong>Type:</strong> ${soil.soilType}</div>
      </div>
    </div>
    
    <div class="treatment-box">
      <h4><i class="fas fa-prescription-bottle-alt"></i> दवा / उपचार (Treatments)</h4>
      <ul id="treatment-list">${disease.treatments.map(t => `<li>${t}</li>`).join('')}</ul>
    </div>
    
    <div class="crop-info-box">
      <h4><i class="fas fa-info-circle"></i> फसल Info (${cropInfo.name})</h4>
      <p><strong>उपज:</strong> ${cropInfo.avgYield} | <strong>मौसम:</strong> ${cropInfo.season}</p>
      <p><strong>Soil:</strong> ${cropInfo.soil} | <strong>Water:</strong> ${cropInfo.water}</p>
    </div>
    
    <div class="recommendations">
      <h4><i class="fas fa-lightbulb"></i> सिफारिशें</h4>
      <ul>${soil.recommendations.map(r => `<li>${r}</li>`).join('')}</ul>
    </div>
  `;

    // Animate meters
    animateMeter('disease-meter', 'disease-percent', disease.probability);
    animateMeter('health-meter', 'health-percent', disease.healthScore);
    animateMeter('soil-meter', 'soil-percent', soil.fertility === 'High' ? 90 : soil.fertility === 'Good' ? 70 : 40);
  }

  function animateMeter(barId, textId, target) {
    const bar = document.getElementById(barId);
    const text = document.getElementById(textId);
    let current = 0;
    const timer = setInterval(() => {
      current += 2;
      if (current >= target) { current = target; clearInterval(timer); }
      bar.style.width = current + '%';
      text.textContent = current + '%';
    }, 20);
  }

  // ========== MARKET PRICE DATA ==========
  let currentMarketFilter = '';
  let allMarketNames = [];

  // Load market names for suggestions
  async function loadMarketNames() {
    try {
      const res = await fetch('/api/markets/list');
      const data = await res.json();
      allMarketNames = data.markets || [];
    } catch (e) { console.warn('Could not load market list'); }
  }
  loadMarketNames();

  async function fetchMarketData(filter = 'all', search = '', market = '') {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('category', filter);
      if (search) params.append('search', search);
      if (market) params.append('market', market);
      const response = await fetch(`/api/market?${params}`);
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      renderMarketTable(data.prices, data.tip, market);
    } catch (error) {
      console.error('Market API error:', error);
      const tipEl = document.getElementById('market-tip-text');
      if (tipEl) tipEl.textContent = 'Server से कनेक्ट नहीं हो पा रहा — कृपया npm start चलाएं';
    }
  }

  // Market location search — LIVE GLOBAL SEARCH (any market worldwide)
  const marketLocInput = document.getElementById('market-location-input');
  const marketLocSuggestions = document.getElementById('market-location-suggestions');
  let marketSearchTimeout;

  // Fuzzy match score — handles typos like "Lunkaransaar" → "Lunkaransar"
  function fuzzyMatch(str, query) {
    str = str.toLowerCase();
    query = query.toLowerCase();
    if (str.includes(query)) return 100; // exact substring
    if (str.startsWith(query)) return 95;
    // Check if all chars exist in order (fuzzy)
    let qi = 0;
    for (let i = 0; i < str.length && qi < query.length; i++) {
      if (str[i] === query[qi]) qi++;
    }
    if (qi === query.length) return 60 + (query.length / str.length) * 30;
    // Check Levenshtein-like: allow 1-2 char differences
    let matches = 0;
    for (let i = 0; i < Math.min(str.length, query.length); i++) {
      if (str[i] === query[i]) matches++;
    }
    const ratio = matches / Math.max(str.length, query.length);
    return ratio > 0.5 ? ratio * 50 : 0;
  }

  // Get local fuzzy matches from hardcoded list — INSTANT
  function getLocalMarketMatches(query) {
    if (!query) return [];
    return allMarketNames
      .map(m => ({ name: m, score: fuzzyMatch(m, query) }))
      .filter(m => m.score > 30)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(m => ({ name: m.name, type: 'registered', detail: 'पंजीकृत मंडी' }));
  }

  // Fetch live locations from OpenStreetMap for ANY place
  async function searchMarketLocations(query) {
    try {
      const localMatches = getLocalMarketMatches(query);

      // Search Nominatim — simple query, no extra keywords
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=10&addressdetails=1&countrycodes=in`);
      const places = await res.json();

      const seen = new Set();
      const results = [];

      // Add local matches first
      localMatches.forEach(m => {
        seen.add(m.name.toLowerCase());
        results.push(m);
      });

      // Add API results
      places.forEach(p => {
        const name = p.display_name?.split(',')[0]?.trim() || '';
        const state = p.address?.state || '';
        const district = p.address?.county || p.address?.state_district || '';
        const town = p.address?.town || p.address?.city || p.address?.village || '';
        const detailParts = [district, state].filter(Boolean);
        const detail = detailParts.join(', ') || 'India';

        if (!seen.has(name.toLowerCase()) && name.length > 1) {
          seen.add(name.toLowerCase());
          results.push({ name, type: 'search', detail });
        }

        // Also add the town/village name if different from main name
        if (town && !seen.has(town.toLowerCase()) && town.toLowerCase() !== name.toLowerCase()) {
          seen.add(town.toLowerCase());
          results.push({ name: town, type: 'search', detail });
        }
      });

      return results.slice(0, 10);
    } catch (e) {
      console.warn('Market search API error:', e);
      return getLocalMarketMatches(query);
    }
  }

  function renderMarketSuggestions(results, query) {
    if (results.length === 0) {
      marketLocSuggestions.innerHTML = `<div style="padding:12px; text-align:center; color:#70757a; font-size:0.85rem;">
        <i class="fas fa-search" style="display:block; font-size:1.2rem; margin-bottom:6px; opacity:0.4;"></i>
        "${query}" — खोज रहे हैं... कृपया 2-3 अक्षर और लिखें
      </div>`;
      marketLocSuggestions.classList.add('active');
      return;
    }

    // Highlight matching text in results
    function highlight(text, q) {
      if (!q) return text;
      const idx = text.toLowerCase().indexOf(q.toLowerCase());
      if (idx === -1) return text;
      return text.substring(0, idx) + '<strong style="color:#1a73e8;">' + text.substring(idx, idx + q.length) + '</strong>' + text.substring(idx + q.length);
    }

    marketLocSuggestions.innerHTML = results.map(r => `
      <div class="market-loc-item" data-market="${r.name}">
        <i class="fas ${r.type === 'registered' ? 'fa-store' : 'fa-map-marker-alt'}" 
           style="color:${r.type === 'registered' ? '#1a73e8' : '#ea4335'}; width:18px; flex-shrink:0;"></i>
        <div style="flex:1; min-width:0;">
          <div style="font-weight:600; font-size:0.88rem;">${highlight(r.name, query)}</div>
          <div style="font-size:0.72rem; color:#70757a;">${r.detail}</div>
        </div>
        ${r.type === 'registered' ? '<span style="font-size:0.65rem; background:#e8f5e9; color:#2e7d32; padding:2px 6px; border-radius:99px; flex-shrink:0;">✓ मंडी</span>' : ''}
      </div>
    `).join('');
    marketLocSuggestions.classList.add('active');

    marketLocSuggestions.querySelectorAll('.market-loc-item').forEach(item => {
      item.addEventListener('click', () => {
        const market = item.dataset.market;
        marketLocInput.value = market;
        marketLocSuggestions.classList.remove('active');
        currentMarketFilter = market;
        fetchMarketData(document.querySelector('.filter-btn.active')?.dataset.filter || 'all',
          document.getElementById('market-search-input')?.value || '', market);
      });
    });
  }

  const TOP_MARKETS = [
    { name: 'Jaipur', type: 'registered', detail: 'Rajasthan, India' },
    { name: 'Jodhpur', type: 'registered', detail: 'Rajasthan, India' },
    { name: 'Kota', type: 'registered', detail: 'Rajasthan, India' },
    { name: 'Bikaner', type: 'registered', detail: 'Rajasthan, India' },
    { name: 'Sriganganagar', type: 'registered', detail: 'Rajasthan, India' }
  ];

  marketLocInput?.addEventListener('focus', () => {
    if (marketLocInput.value.trim().length === 0) {
      renderMarketSuggestions(TOP_MARKETS, '');
    }
  });

  document.addEventListener('click', (e) => {
    if (marketLocInput && marketLocSuggestions && !marketLocInput.contains(e.target) && !marketLocSuggestions.contains(e.target)) {
      marketLocSuggestions.classList.remove('active');
    }
  });

  marketLocInput?.addEventListener('input', (e) => {
    const q = e.target.value.trim();
    clearTimeout(marketSearchTimeout);
    if (q.length < 1) {
      marketLocSuggestions.classList.remove('active');
      currentMarketFilter = '';
      fetchMarketData(document.querySelector('.filter-btn.active')?.dataset.filter || 'all',
        document.getElementById('market-search-input')?.value || '');
      return;
    }

    // Show local fuzzy matches INSTANTLY (no API delay)
    const quickMatches = getLocalMarketMatches(q);
    if (quickMatches.length > 0) {
      renderMarketSuggestions(quickMatches, q);
    } else if (q.length >= 2) {
      // Show "searching..." message
      renderMarketSuggestions([], q);
    }

    // After 250ms, fetch global results from API (fast!)
    marketSearchTimeout = setTimeout(async () => {
      if (q.length >= 2) {
        const results = await searchMarketLocations(q);
        renderMarketSuggestions(results, q);
      }
    }, 250);
  });

  // Show popular markets on focus (hardcoded + nearby)
  marketLocInput?.addEventListener('focus', () => {
    if (marketLocInput.value.trim().length > 0) return;
    if (allMarketNames.length === 0) return;

    const popularMarkets = allMarketNames.slice(0, 15).map(m => ({
      name: m, type: 'registered', detail: 'पंजीकृत मंडी'
    }));

    marketLocSuggestions.innerHTML = '<div style="padding:6px 12px; font-size:0.72rem; color:#70757a; border-bottom:1px solid #e8eaed;"><i class="fas fa-fire" style="color:#f59e0b;"></i> लोकप्रिय मंडियां — कोई भी मंडी खोजें!</div>' +
      popularMarkets.map(r => `
        <div class="market-loc-item" data-market="${r.name}">
          <i class="fas fa-store" style="color:#1a73e8; width:18px; flex-shrink:0;"></i>
          <div style="flex:1;"><div style="font-weight:600; font-size:0.88rem;">${r.name}</div><div style="font-size:0.72rem; color:#70757a;">${r.detail}</div></div>
          <span style="font-size:0.65rem; background:#e8f5e9; color:#2e7d32; padding:2px 6px; border-radius:99px;">✓ मंडी</span>
        </div>
      `).join('');
    marketLocSuggestions.classList.add('active');
    marketLocSuggestions.querySelectorAll('.market-loc-item').forEach(item => {
      item.addEventListener('click', () => {
        const market = item.dataset.market;
        marketLocInput.value = market;
        marketLocSuggestions.classList.remove('active');
        currentMarketFilter = market;
        fetchMarketData(document.querySelector('.filter-btn.active')?.dataset.filter || 'all',
          document.getElementById('market-search-input')?.value || '', market);
      });
    });
  });

  // Hide market suggestions on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#market-location-search')) {
      marketLocSuggestions?.classList.remove('active');
    }
  });

  // Crop search input
  document.getElementById('market-search-input')?.addEventListener('input', (e) => {
    const search = e.target.value.trim();
    const filter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
    fetchMarketData(filter, search, currentMarketFilter);
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const search = document.getElementById('market-search-input')?.value || '';
      fetchMarketData(btn.dataset.filter, search, currentMarketFilter);
    });
  });

  function generateTrend(change) {
    const heights = [];
    for (let i = 0; i < 7; i++) {
      const base = change > 0 ? 6 + i * 2 : 18 - i * 2;
      heights.push(Math.max(4, base + Math.random() * 6));
    }
    return heights.map(h => `<span style="height:${h}px; background:${change >= 0 ? 'var(--primary)' : 'var(--red)'}"></span>`).join('');
  }

  function renderMarketTable(prices, tip, marketFilter) {
    const tbody = document.getElementById('market-tbody');
    if (!tbody) return;

    if (prices.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">
        <i class="fas fa-info-circle" style="font-size:2rem; color:#ccc; display:block; margin-bottom:10px;"></i>
        कोई फसल नहीं मिली। कृपया अलग मंडी या फसल खोजें।
      </td></tr>`;
      return;
    }

    tbody.innerHTML = prices.map(p => {
      const marketName = marketFilter ? p.bestMarket : p.bestMarket;
      const mspTag = p.msp ? `<div style="font-size:0.7rem; color:#10b981;">MSP: ₹${p.msp.toLocaleString()}</div>` : '';
      return `
      <tr>
        <td><strong>${p.emoji} ${p.name}</strong>${mspTag}</td>
        <td>${marketName}</td>
        <td><strong>₹${p.bestPrice.toLocaleString()}</strong></td>
        <td class="${p.change >= 0 ? 'price-up' : 'price-down'}">
          <i class="fas fa-arrow-${p.change >= 0 ? 'up' : 'down'}"></i> ${Math.abs(p.change)}%
        </td>
        <td>₹${p.min.toLocaleString()}</td>
        <td>₹${p.max.toLocaleString()}</td>
        <td><div class="trend-bar">${generateTrend(p.change)}</div></td>
      </tr>
    `}).join('');
    if (tip) {
      const tipEl = document.getElementById('market-tip-text');
      if (tipEl) tipEl.textContent = tip;
    }
  }


  // Load market/schemes immediately
  fetchMarketData();
  loadSchemes();

  // Load weather: try GPS first (5s timeout), then fall back to defaults
  // DILIBERATELY REMOVED: User requested no automatic location fetch on page load.
  /*
  (async () => {
    try {
      const loc = await Promise.race([
        getLiveLocation(),
        new Promise((_, reject) => setTimeout(() => reject('timeout'), 5000))
      ]);
      if (loc && loc.accuracy) {
        console.log('Got GPS location, loading weather for:', loc.city);
        userLocation.lat = loc.lat;
        userLocation.lon = loc.lon;
        userLocation.city = loc.city;
        loadWeather();
        return;
      }
    } catch (e) {
      console.log('GPS unavailable or timeout.');
    }
  })();
  */

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      fetchMarketData(btn.dataset.filter, document.getElementById('market-search-input')?.value || '');
    });
  });

  document.getElementById('market-search-input')?.addEventListener('input', (e) => {
    const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
    fetchMarketData(activeFilter, e.target.value);
  });

  // Market tip rotation
  const marketTips = [
    '📈 Soybean prices are trending 8.3% higher in Ujjain — consider selling this week!',
    '🧅 Onion prices dropping in Nashik — hold stock if possible for better rates.',
    '🍅 Tomato prices surging 12.5% in Kolar — great time to sell!',
    '🌾 Wheat is stable in Indore — steady market expected this week.',
    '💡 Tip: Compare prices across 3+ markets before deciding where to sell.',
  ];
  let tipIndex = 0;
  const tipText = document.getElementById('market-tip-text');
  if (tipText) { tipText.textContent = marketTips[0]; }
  setInterval(() => {
    tipIndex = (tipIndex + 1) % marketTips.length;
    if (tipText) tipText.textContent = marketTips[tipIndex];
  }, 5000);

  // ========== GOOGLE-STYLE LIVE WEATHER WIDGET ==========
  const weatherCodes = {
    0: { desc: 'Clear Sky', icon: '☀️', fa: 'fa-sun' },
    1: { desc: 'Mainly Clear', icon: '🌤️', fa: 'fa-sun' },
    2: { desc: 'Partly Cloudy', icon: '⛅', fa: 'fa-cloud-sun' },
    3: { desc: 'Overcast', icon: '☁️', fa: 'fa-cloud' },
    45: { desc: 'Foggy', icon: '🌫️', fa: 'fa-smog' },
    48: { desc: 'Rime Fog', icon: '🌫️', fa: 'fa-smog' },
    51: { desc: 'Light Drizzle', icon: '🌦️', fa: 'fa-cloud-rain' },
    53: { desc: 'Drizzle', icon: '🌦️', fa: 'fa-cloud-rain' },
    55: { desc: 'Heavy Drizzle', icon: '🌧️', fa: 'fa-cloud-showers-heavy' },
    61: { desc: 'Light Rain', icon: '🌧️', fa: 'fa-cloud-rain' },
    63: { desc: 'Rain', icon: '🌧️', fa: 'fa-cloud-showers-heavy' },
    65: { desc: 'Heavy Rain', icon: '🌧️', fa: 'fa-cloud-showers-heavy' },
    71: { desc: 'Light Snow', icon: '🌨️', fa: 'fa-snowflake' },
    73: { desc: 'Snow', icon: '❄️', fa: 'fa-snowflake' },
    75: { desc: 'Heavy Snow', icon: '❄️', fa: 'fa-snowflake' },
    80: { desc: 'Rain Showers', icon: '🌦️', fa: 'fa-cloud-sun-rain' },
    81: { desc: 'Heavy Showers', icon: '🌧️', fa: 'fa-cloud-showers-heavy' },
    82: { desc: 'Violent Showers', icon: '⛈️', fa: 'fa-cloud-showers-heavy' },
    95: { desc: 'Thunderstorm', icon: '⛈️', fa: 'fa-bolt' },
    96: { desc: 'Thunderstorm + Hail', icon: '⛈️', fa: 'fa-bolt' },
    99: { desc: 'Severe Storm', icon: '⛈️', fa: 'fa-bolt' }
  };

  function getWeatherInfo(code) {
    return weatherCodes[code] || { desc: 'Unknown', icon: '🌡️', fa: 'fa-cloud' };
  }

  let gwSearchTimeout = null;
  const gwCityInput = document.getElementById('gw-city-input');
  const gwSuggestions = document.getElementById('gw-suggestions');
  const gwLocateBtn = document.getElementById('gw-locate-btn');

  // Search with Nominatim OpenStreetMap — finds villages, towns, tehsils, sub-divisions, ANYTHING
  gwCityInput?.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    clearTimeout(gwSearchTimeout);
    if (query.length < 2) { gwSuggestions.classList.remove('active'); return; }
    gwSearchTimeout = setTimeout(() => searchPlaces(query), 400);
  });

  // Show nearby suggestions on focus (based on user's live GPS)
  gwCityInput?.addEventListener('focus', async () => {
    const query = gwCityInput.value.trim();
    if (query.length >= 2) return; // Don't override typed text

    // Language-aware text
    const searchingText = currentLang === 'hi' ? 'आपके नजदीकी शहर खोज रहे हैं...' : 'Searching nearby cities...';
    const nearbyLabel = currentLang === 'hi' ? '📍 आपके नजदीकी शहर' : '📍 Nearby Cities';

    // Show loading suggestions
    gwSuggestions.innerHTML = `<div class="gw-suggestion-item"><i class="fas fa-spinner fa-spin" style="color:#1a73e8;"></i><span class="gw-sug-name">${searchingText}</span></div>`;
    gwSuggestions.classList.add('active');

    try {
      // Get fresh location if available
      const loc = userLocation;
      const res = await fetch(`/api/geocode?lat=${loc.lat}&lon=${loc.lon}`);
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        gwSuggestions.innerHTML = `<div style="padding:8px 16px; font-size:0.75rem; color:#70757a; border-bottom:1px solid #e8eaed;"><i class="fas fa-map-marker-alt"></i> ${nearbyLabel}</div>` +
          data.results.slice(0, 6).map(r => `
            <div class="gw-suggestion-item" data-lat="${r.lat}" data-lon="${r.lon}" data-display="${r.name}, ${r.admin1}">
              <i class="fas fa-map-pin" style="color:#1a73e8; width:20px; text-align:center;"></i>
              <div style="flex:1;">
                <span class="gw-sug-name">${r.name}</span>
                <span class="gw-sug-type" style="display:block;font-size:0.75rem;color:#70757a;">${r.admin1}${r.country ? ', ' + r.country : ''}</span>
              </div>
            </div>
          `).join('');
        gwSuggestions.classList.add('active');

        // Attach click handlers
        gwSuggestions.querySelectorAll('.gw-suggestion-item[data-lat]').forEach(item => {
          item.addEventListener('click', () => {
            const lat = parseFloat(item.dataset.lat);
            const lon = parseFloat(item.dataset.lon);
            const displayName = item.dataset.display;
            gwCityInput.value = displayName;
            gwSuggestions.classList.remove('active');
            fetchGoogleWeather(lat, lon, displayName);
          });
        });
      } else {
        gwSuggestions.classList.remove('active');
      }
    } catch (e) {
      gwSuggestions.classList.remove('active');
    }
  });

  // Also search on Enter key
  gwCityInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Cancel any pending debounced search to prevent interference
      clearTimeout(gwSearchTimeout);
      gwSuggestions.classList.remove('active');
      const query = gwCityInput.value.trim();
      if (query.length >= 2) {
        // Show widget with loading state immediately for user feedback
        const gwWidget = document.getElementById('gw-widget');
        if (gwWidget) gwWidget.style.display = 'block';
        const loading = document.getElementById('gw-loading');
        const content = document.getElementById('gw-content');
        if (loading) {
          loading.innerHTML = `<div class="gw-loading-spinner"></div><p>${currentLang === 'hi' ? 'मौसम डेटा लोड हो रहा है...' : 'Fetching weather data...'}</p>`;
          loading.style.display = '';
        }
        if (content) content.style.display = 'none';
        searchPlaces(query, true);
      }
    }
  });

  async function searchPlaces(query, autoFetchFirst = false) {
    try {
      // Show local searching indicator or clear old
      // Fetch from two free APIs for MAXIMUM coverage (Nominatim OSM + Photon Komoot)
      const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&accept-language=en,hi`;
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`;

      const [nomRes, photonRes] = await Promise.allSettled([
        fetch(nomUrl).then(r => r.json()),
        fetch(photonUrl).then(r => r.json())
      ]);

      let results = [];

      // Parse Nominatim
      if (nomRes.status === 'fulfilled' && nomRes.value && nomRes.value.length > 0) {
        results = [...results, ...nomRes.value.map(r => {
          const addr = r.address || {};
          const placeType = addr.village ? 'Village' : addr.hamlet ? 'Hamlet' : addr.town ? 'Town' :
            addr.suburb ? 'Area' : addr.city ? 'City' : addr.county ? 'District' :
              addr.state_district ? 'Sub-Division' : r.type || 'Place';

          return {
            lat: r.lat,
            lon: r.lon,
            name: r.display_name.split(',').slice(0, 3).join(',').trim(),
            type: placeType,
            district: addr.state_district || addr.county || '',
            state: addr.state || '',
            country: addr.country || '',
            source: 'nom'
          };
        })];
      }

      // Parse Photon (GeoJSON)
      if (photonRes.status === 'fulfilled' && photonRes.value && photonRes.value.features) {
        results = [...results, ...photonRes.value.features.map(f => {
          const p = f.properties;
          const lat = f.geometry.coordinates[1];
          const lon = f.geometry.coordinates[0];
          // capitalize type
          let type = p.osm_value ? p.osm_value.charAt(0).toUpperCase() + p.osm_value.slice(1) : 'Location';

          let nameArr = [p.name || p.street];
          if (p.city || p.town || p.village) nameArr.push(p.city || p.town || p.village);
          if (p.state) nameArr.push(p.state);
          const nameStr = nameArr.filter(Boolean).join(', ');

          return {
            lat: lat,
            lon: lon,
            name: nameStr || 'Unknown Place',
            type: type,
            district: p.county || '',
            state: p.state || '',
            country: p.country || '',
            source: 'photon'
          };
        })];
      }

      // Remove exact duplicates by coordinates (close proximity)
      const uniqueResults = [];
      results.forEach(r => {
        if (!r.name || r.name === 'Unknown Place') return;
        const isDuplicate = uniqueResults.some(u => {
          const dist = Math.sqrt(Math.pow(u.lat - r.lat, 2) + Math.pow(u.lon - r.lon, 2));
          return dist < 0.05 || u.name.toLowerCase() === r.name.toLowerCase(); // roughly 5km or exact name match
        });
        if (!isDuplicate) uniqueResults.push(r);
      });

      if (uniqueResults.length === 0) {
        // Fallback: the user's text itself might be extremely obscure, trying Open Meteo as last resort
        const omUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=4&language=en&format=json`;
        try {
          const omRes = await (await fetch(omUrl)).json();
          if (omRes.results && omRes.results.length > 0) {
            uniqueResults.push(...omRes.results.map(r => ({
              lat: r.latitude,
              lon: r.longitude,
              name: `${r.name}, ${r.admin1 || ''}`,
              type: r.feature_code || 'City',
              district: r.admin2 || '',
              state: r.admin1 || '',
              country: r.country || ''
            })));
          }
        } catch (e) {
          /* ignore */
        }
      }

      if (uniqueResults.length === 0) {
        gwSuggestions.innerHTML = '<div class="gw-suggestion-item"><i class="fas fa-search-minus"></i><span class="gw-sug-name">Location not found. Try adding city/state name.</span></div>';
        gwSuggestions.classList.add('active');
        return;
      }

      // If user hit enter, pick the first one forcefully (result JARUR AANA CHAHIYE)
      // Keep user's original typed text — don't overwrite with API's long name
      if (autoFetchFirst && uniqueResults.length > 0) {
        const u = uniqueResults[0];
        // Use the user's original query as display name (not API's full name)
        const displayName = query;
        gwCityInput.value = displayName;
        gwSuggestions.classList.remove('active');
        fetchGoogleWeather(u.lat, u.lon, displayName);
        return;
      }

      // Render up to 8 max results
      gwSuggestions.innerHTML = uniqueResults.slice(0, 8).map(r => {
        const typeIcon = r.type === 'Village' ? 'fa-home' : r.type === 'College' || r.type === 'School' || r.type === 'University' ? 'fa-graduation-cap' :
          r.type === 'Town' ? 'fa-building' : r.type === 'City' ? 'fa-city' :
            r.type === 'District' ? 'fa-map' : 'fa-map-marker-alt';

        return `
          <div class="gw-suggestion-item" data-lat="${r.lat}" data-lon="${r.lon}" data-display="${r.name}">
            <i class="fas ${typeIcon}" style="color:#1a73e8; width:20px; text-align:center;"></i>
            <div style="flex:1;">
              <span class="gw-sug-name">${r.name}</span>
              <span class="gw-sug-type" style="display:block;font-size:0.75rem;color:#70757a;">
                ${r.type}${r.district ? ' • ' + r.district : ''}${r.state ? ', ' + r.state : ''}
              </span>
            </div>
            <span class="gw-sug-country" style="font-size:0.75rem; color:#9aa0a6;">${r.country}</span>
          </div>
        `;
      }).join('');
      gwSuggestions.classList.add('active');

      // Click handler for each suggestion
      gwSuggestions.querySelectorAll('.gw-suggestion-item[data-lat]').forEach(item => {
        item.addEventListener('click', () => {
          const lat = parseFloat(item.dataset.lat);
          const lon = parseFloat(item.dataset.lon);
          const displayName = item.dataset.display;
          gwCityInput.value = displayName;
          gwSuggestions.classList.remove('active');
          fetchGoogleWeather(lat, lon, displayName);
        });
      });
    } catch (err) {
      console.error('Nominatim search error:', err);
      gwSuggestions.innerHTML = '<div class="gw-suggestion-item"><i class="fas fa-exclamation-triangle"></i><span class="gw-sug-name">Search failed — try again</span></div>';
      gwSuggestions.classList.add('active');
    }
  }

  // Close suggestions on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#gw-search-wrap')) {
      gwSuggestions.classList.remove('active');
    }
  });

  // Search / Locate button — searches typed text OR uses GPS if empty
  gwLocateBtn?.addEventListener('click', async () => {
    gwLocateBtn.classList.add('locating');
    const query = gwCityInput.value.trim();

    if (query.length >= 2) {
      // User typed something — SEARCH that location
      gwSuggestions.classList.remove('active');
      await searchPlaces(query, true); // true = auto-fetch first result
    } else {
      // No text typed — use GPS location
      try {
        await getLiveLocation();
        fetchGoogleWeather(userLocation.lat, userLocation.lon, userLocation.city);
        gwCityInput.value = userLocation.city;
      } catch (err) {
        console.error('Location error:', err);
        gwCityInput.placeholder = 'Location access denied — type a city name';
      }
    }
    setTimeout(() => gwLocateBtn.classList.remove('locating'), 1500);
  });

  // --- Global Weather Data State ---
  let gwCurrentData = null;
  let gwCurrentCityName = '';

  // Main weather fetch function (Uses Open-Meteo)
  async function fetchGoogleWeather(lat, lon, cityName, retries = 1) {
    const gwWidget = document.getElementById('gw-widget');
    if (gwWidget) gwWidget.style.display = 'block';
    
    const loading = document.getElementById('gw-loading');
    const content = document.getElementById('gw-content');

    const loadingText = currentLang === 'hi' ? 'मौसम डेटा लोड हो रहा है...' : 'Fetching weather data...';
    if (loading) {
      loading.innerHTML = `<div class="gw-loading-spinner"></div><p>${loadingText}</p>`;
      loading.style.display = '';
    }
    if (content) content.style.display = 'none';

    try {
      const url = `/api/weather-proxy?lat=${lat}&lon=${lon}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (!data || !data.current || !data.daily) throw new Error('Invalid weather data');

      gwCurrentData = data;
      gwCurrentCityName = cityName;

      if (loading) loading.style.display = 'none';
      if (content) {
        content.style.display = 'flex';
        content.style.animation = 'fadeSlideUp 0.5s ease forwards';
      }

      // Update city input to show what was loaded
      if (gwCityInput && !gwCityInput.value) {
        gwCityInput.value = cityName;
      }

      // Initial Render (Day 0 = Today)
      updateGoogleWeatherUI(0);

    } catch (err) {
      console.error('Weather fetch error:', err);

      if (retries > 0) {
        // Retry after a short delay
        console.log(`⏳ Retrying weather... (${retries} left)`);
        await new Promise(r => setTimeout(r, 1500));
        return fetchGoogleWeather(lat, lon, cityName, retries - 1);
      }

      // All retries exhausted — show default content, not error
      if (loading) loading.style.display = 'none';
      if (content) {
        content.style.display = 'flex';
        // Show last cached data if available, or default placeholder
        if (!gwCurrentData) {
          // No previous data — show a helpful message inside the widget
          const condText = document.getElementById('gw-condition-text');
          if (condText) condText.textContent = currentLang === 'hi' ? 'ऊपर शहर खोजें ☝️' : 'Search a location above ☝️';
          const timeText = document.getElementById('gw-time-text');
          if (timeText) timeText.textContent = currentLang === 'hi' ? 'मौसम डेटा उपलब्ध नहीं' : 'Weather data unavailable';
        }
      }
    }
  }

  window.gwCurrentTab = 'Temperature';
  window.gwCurrentDayIndex = 0;

  window.updateGWTab = function (tabName, el) {
    window.gwCurrentTab = tabName;
    const tabs = document.querySelectorAll('.gw-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    // Re-render just the chart using current day
    updateGoogleWeatherUI(window.gwCurrentDayIndex);
  };

  // Define updateGoogleWeatherUI inside global scope so clicking rows works
  window.updateGoogleWeatherUI = function (dayIndex) {
    if (!gwCurrentData) return;

    // Update global reference
    if (dayIndex !== undefined) window.gwCurrentDayIndex = dayIndex;
    else dayIndex = window.gwCurrentDayIndex;

    const c = gwCurrentData.current;
    const d = gwCurrentData.daily;
    const h = gwCurrentData.hourly;

    // Safety check
    if (dayIndex >= d.time.length) dayIndex = 0;

    // Check if we are viewing today
    const isToday = dayIndex === 0;

    // Use current data for today, otherwise use daily max stats for future days
    const code = isToday ? (c?.weather_code || 0) : (d.weather_code[dayIndex] || 0);
    const info = getWeatherInfo(code);
    const temp = isToday ? Math.round(c?.temperature_2m || 0) : Math.round(d.temperature_2m_max[dayIndex] || 0);

    const precip = isToday ? (c?.precipitation || 0) : (d.precipitation_probability_max[dayIndex] || 0);
    const hum = isToday ? (c?.relative_humidity_2m || 0) : '--'; // No direct humidity in daily, default to --
    const wind = isToday ? Math.round(c?.wind_speed_10m || 0) : Math.round(d.wind_speed_10m_max[dayIndex] || 0);

    // --- Top Row Data ---
    const iconEl = document.getElementById('gw-main-icon');
    if (iconEl) iconEl.textContent = info.icon;

    const tempNum = document.getElementById('gw-temp-num');
    if (tempNum) tempNum.textContent = temp;

    const precipVal = document.getElementById('gw-precip-val');
    if (precipVal) precipVal.textContent = precip + '%';

    const humVal = document.getElementById('gw-humidity-val');
    if (humVal) humVal.textContent = hum === '--' ? '--' : hum + '%';

    const windVal = document.getElementById('gw-wind-val');
    if (windVal) windVal.textContent = wind + ' km/h';

    const timeText = document.getElementById('gw-time-text');
    if (timeText) {
      // Parse YYYY-MM-DD manually to avoid UTC timezone offset issues
      const dp = d.time[dayIndex].split('-');
      const displayDate = new Date(parseInt(dp[0]), parseInt(dp[1]) - 1, parseInt(dp[2]));
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      if (isToday) {
        const now = new Date();
        timeText.textContent = `${days[now.getDay()]}, ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase()}`;
      } else {
        timeText.textContent = `${days[displayDate.getDay()]}`;
      }
    }

    const condText = document.getElementById('gw-condition-text');
    if (condText) condText.textContent = info.desc;

    // --- Hourly Chart for the Specific Day / Tab ---
    const tempsEl = document.getElementById('gw-chart-temps');
    const timesEl = document.getElementById('gw-chart-times');
    const lineEl = document.getElementById('gw-chart-line');
    const fillEl = document.getElementById('gw-chart-fill');

    if (tempsEl && timesEl && lineEl && fillEl && h && h.time) {
      const selectedDateStr = d.time[dayIndex]; // YYYY-MM-DD

      let startIdx = 0;
      for (let i = 0; i < h.time.length; i++) {
        if (h.time[i].startsWith(selectedDateStr)) {
          startIdx = i; break;
        }
      }

      // If viewing today, we start from the current hour. If a future day, show whole day (starting 2am)
      if (isToday) {
        const currentHour = new Date().getHours();
        for (let i = 0; i < h.time.length; i++) {
          const t = new Date(h.time[i]);
          if (t.getHours() >= currentHour && h.time[i].startsWith(selectedDateStr)) {
            startIdx = i; break;
          }
        }
      } else {
        // Shift start idx to ~2 AM to align with 24 hr nicely
        startIdx += 2;
      }

      const chartPoints = [];
      for (let i = 0; i < 8; i++) {
        const idx = startIdx + i * 3;
        if (idx < h.time.length) {
          let val = 0;
          if (window.gwCurrentTab === 'Temperature') val = Math.round(h.temperature_2m[idx]);
          else if (window.gwCurrentTab === 'Precipitation') val = Math.round(h.precipitation_probability[idx]);
          else if (window.gwCurrentTab === 'Wind') val = Math.round(h.wind_speed_10m[idx]);

          chartPoints.push({
            time: new Date(h.time[idx]),
            val: val
          });
        }
      }

      if (chartPoints.length > 0) {
        const minVal = Math.min(...chartPoints.map(p => p.val));
        const maxVal = Math.max(...chartPoints.map(p => p.val));
        let tempRange = maxVal - minVal;

        // Prevent flatline drawing incorrectly if all values are 0 (e.g. 0% precip)
        if (tempRange === 0) tempRange = 1;

        const svgW = 800;
        const svgH = 100;
        const pts = [];

        let tempsHtml = '';
        let timesHtml = '';

        chartPoints.forEach((p, i) => {
          const x = (i / (chartPoints.length - 1)) * svgW;
          // Math logic: if max and min are exactly the same and 0, push down to the bottom
          let y = 80;
          if (maxVal > 0) {
            y = 80 - ((p.val - minVal) / tempRange) * 50;
          }
          pts.push(`${x},${y}`);

          let valStr = p.val;
          if (window.gwCurrentTab === 'Precipitation') valStr += '%';
          if (window.gwCurrentTab === 'Wind') valStr += 'km/h';

          // Style font small for km/h text
          if (window.gwCurrentTab === 'Wind') {
            tempsHtml += `<div class="gw-temp-point" style="font-size:11px;">${valStr}</div>`;
          } else {
            tempsHtml += `<div class="gw-temp-point">${valStr}</div>`;
          }

          let timeStr = '';
          if (isToday && i === 0) timeStr = 'Now';
          else timeStr = p.time.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).toLowerCase().replace(' ', '');
          timesHtml += `<div class="gw-time-point">${timeStr}</div>`;
        });

        // Set colors dynamically based on Tab selected
        if (window.gwCurrentTab === 'Temperature') {
          lineEl.setAttribute('stroke', '#FBC02D'); // Yellow
          fillEl.setAttribute('fill', 'rgba(253, 216, 53, 0.3)');
        } else if (window.gwCurrentTab === 'Precipitation') {
          lineEl.setAttribute('stroke', '#1a73e8'); // Google Blue
          fillEl.setAttribute('fill', 'rgba(26, 115, 232, 0.15)');
        } else if (window.gwCurrentTab === 'Wind') {
          lineEl.setAttribute('stroke', '#00BCD4'); // Cyan
          fillEl.setAttribute('fill', 'rgba(0, 188, 212, 0.2)');
        }

        let pathLine = `M ${pts.join(' L ')}`;
        lineEl.setAttribute('d', pathLine);
        let pathFill = `${pathLine} L ${svgW},${svgH} L 0,${svgH} Z`;
        fillEl.setAttribute('d', pathFill);

        tempsEl.innerHTML = tempsHtml;
        timesEl.innerHTML = timesHtml;
      }
    }
    // --- 7-Day Forecast Rendering Update ---
    const weeklyRow = document.getElementById('gw-forecast-row');
    if (weeklyRow && d && d.time) {
      let weeklyHtml = '';
      // Day name mapping for correct weekday display
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      for (let i = 0; i < 7; i++) {
        if (i < d.time.length) {
          // Parse YYYY-MM-DD correctly (avoid timezone offset issues)
          const dateParts = d.time[i].split('-');
          const t = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
          const dInfo = getWeatherInfo(d.weather_code[i] || 0);
          const max = Math.round(d.temperature_2m_max[i]);
          const min = Math.round(d.temperature_2m_min[i]);
          // Use actual day name from the date — no hardcoding
          const dName = dayNames[t.getDay()];
          const activeClass = i === dayIndex ? 'active' : '';

          weeklyHtml += `
            <div class="gw-forecast-day ${activeClass}" onclick="updateGoogleWeatherUI(${i})" style="cursor:pointer; transition:all 0.2s;">
              <div class="gw-day-name">${dName}</div>
              <div class="gw-day-icon">${dInfo.icon}</div>
              <div class="gw-day-temps">
                <span class="gw-day-hi">${max}°</span>
                <span class="gw-day-lo">${min}°</span>
              </div>
            </div>
          `;
        }
      }
      weeklyRow.innerHTML = weeklyHtml;
    }
  }

  // Old loadWeather function — replaced by fetchGoogleWeather
  async function loadWeather() {
    fetchGoogleWeather(userLocation.lat, userLocation.lon, userLocation.city);
  }

  // ========== MARKETPLACE ==========
  const marketListings = [
    { crop: 'Organic Wheat', qty: '50 qtl', location: 'Dewas, MP', price: '₹2,650', unit: '/qtl', seller: 'Ramesh K.', initials: 'RK', badge: 'Verified', bg: 'linear-gradient(135deg,#f59e0b44,#92400e44)' },
    { crop: 'Fresh Tomatoes', qty: '20 qtl', location: 'Kolar, KA', price: '₹2,400', unit: '/qtl', seller: 'Lakshmi S.', initials: 'LS', badge: 'Fresh', bg: 'linear-gradient(135deg,#ef444444,#b9181844)' },
    { crop: 'Basmati Rice', qty: '100 qtl', location: 'Karnal, HR', price: '₹3,900', unit: '/qtl', seller: 'Gurpreet S.', initials: 'GS', badge: 'Premium', bg: 'linear-gradient(135deg,#22c55e44,#16653444)' },
    { crop: 'Red Onions', qty: '30 qtl', location: 'Nashik, MH', price: '₹1,750', unit: '/qtl', seller: 'Sunil P.', initials: 'SP', badge: 'Bulk', bg: 'linear-gradient(135deg,#a855f744,#7c3aed44)' },
    { crop: 'Green Chillies', qty: '15 qtl', location: 'Guntur, AP', price: '₹3,100', unit: '/qtl', seller: 'Venkat R.', initials: 'VR', badge: 'Hot Deal', bg: 'linear-gradient(135deg,#ef444444,#dc262644)' },
    { crop: 'Fresh Bananas', qty: '40 qtl', location: 'Jalgaon, MH', price: '₹1,550', unit: '/qtl', seller: 'Amol D.', initials: 'AD', badge: 'Organic', bg: 'linear-gradient(135deg,#eab30844,#ca8a0444)' },
  ];

  const marketGrid = document.getElementById('market-grid');
  if (marketGrid) {
    marketGrid.innerHTML = marketListings.map(m => `
    <div class="market-card">
      <div class="mc-image" style="background: ${m.bg};display:flex;align-items:center;justify-content:center;font-size:3rem;">
        ${m.crop.includes('Wheat') ? '🌾' : m.crop.includes('Tomato') ? '🍅' : m.crop.includes('Rice') ? '🍚' : m.crop.includes('Onion') ? '🧅' : m.crop.includes('Chilli') ? '🌶️' : '🍌'}
      </div>
      <div class="mc-badge">${m.badge}</div>
      <div class="mc-body">
        <h3>${m.crop}</h3>
        <div class="mc-meta">
          <span><i class="fas fa-box"></i> ${m.qty}</span>
          <span><i class="fas fa-map-marker-alt"></i> ${m.location}</span>
        </div>
        <div class="mc-price">${m.price} <small>${m.unit}</small></div>
      </div>
      <div class="mc-footer">
        <div class="mc-seller"><div class="mc-avatar">${m.initials}</div><span>${m.seller}</span></div>
        <button class="btn btn-primary btn-sm">Contact</button>
      </div>
    </div>
  `).join('');
  }



  // ========== GOVERNMENT SCHEMES ==========
  async function loadSchemes() {
    try {
      const response = await fetch(`/api/schemes?lang=${currentLang}`);
      const data = await response.json();
      renderSchemes(data.schemes);
    } catch (error) {
      console.error('Schemes API error:', error);
    }
  }

  // Define global to allow toggling to call it
  window.loadSchemes = loadSchemes;

  function renderSchemes(schemes) {
    const schemesGrid = document.getElementById('schemes-grid');
    if (!schemesGrid) return;
    schemesGrid.innerHTML = schemes.map(s => `
    <div class="scheme-card">
      <div class="scheme-icon" style="background: ${s.color}22; color: ${s.color};">${s.icon}</div>
      <h3>${s.name}</h3>
      <p class="scheme-fullname" style="font-size:0.72rem; color:var(--text-muted); margin:-4px 0 6px; font-weight:500;">${s.fullName}</p>
      <p>${s.desc}</p>
      <div style="display:flex; flex-wrap:wrap; gap:6px; margin:8px 0;">
        <span class="scheme-tag" style="background: ${s.color}18; color: ${s.color};">${s.benefit}</span>
        <span class="scheme-tag" style="background: rgba(0,0,0,0.04); color: var(--text-muted); font-size:0.68rem;">👤 ${s.eligibility}</span>
      </div>
      <a href="${s.link}" target="_blank" rel="noopener noreferrer" class="scheme-visit-link" 
         style="display:flex; align-items:center; gap:8px; margin-top:auto; padding:10px 16px; font-size:0.82rem; font-weight:600; color:#fff; background:${s.color}; border-radius:8px; text-decoration:none; transition:all 0.2s;">
        <i class="fas fa-external-link-alt" style="font-size:0.72rem;"></i>
        <span>visit official website</span>
        <i class="fas fa-arrow-right" style="font-size:0.65rem; margin-left:auto; transition:transform 0.2s;"></i>
      </a>
    </div>
  `).join('');
  }


  // Schemes loaded in loadSchemes()


  // ========== VOICE DEMO ==========
  const voiceBtn = document.getElementById('voice-demo-btn');
  const voiceWave = document.getElementById('voice-wave');
  let isRecording = false;

  voiceBtn?.addEventListener('click', () => {
    isRecording = !isRecording;
    voiceBtn.classList.toggle('recording', isRecording);
    voiceWave.classList.toggle('active', isRecording);
    voiceBtn.innerHTML = isRecording
      ? '<i class="fas fa-stop"></i> Listening...'
      : '<i class="fas fa-microphone"></i> Try Voice';

    if (isRecording) {
      setTimeout(() => {
        isRecording = false;
        voiceBtn.classList.remove('recording');
        voiceWave.classList.remove('active');
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i> Try Voice';
        alert('🎙️ Voice command recognized!\n\n"आज मंडी में गेहूं का भाव क्या है?"\n\n→ Wheat price today: ₹2,480/qtl in Indore market (+5.2%)');
      }, 3000);
    }
  });

  // ========== OFFLINE TOGGLE ==========
  const offlineToggle = document.getElementById('offline-toggle');
  const toggleTrack = offlineToggle?.querySelector('.toggle-track');
  const connStatus = document.getElementById('connection-status');
  let isOnline = true;

  offlineToggle?.addEventListener('click', () => {
    isOnline = !isOnline;
    toggleTrack.classList.toggle('off', !isOnline);
    connStatus.textContent = isOnline ? 'Online' : 'Offline';
    connStatus.style.color = isOnline ? 'var(--primary)' : 'var(--red)';
  });

  // ========== SMOOTH SCROLL FOR NAV ==========
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();

      const target = document.querySelector(this.getAttribute('href'));
      const navbar = document.getElementById('navbar');

      if (target && navbar) {
        const offset = navbar.offsetHeight;

        window.scrollTo({
          top: target.offsetTop - offset,
          behavior: 'smooth'
        });
      }

      document.getElementById('nav-links')?.classList.remove('open');
    });
  });

  // ========== GET STARTED / NAV CTA BUTTONS ==========
  document.getElementById('nav-cta-btn')?.addEventListener('click', () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.getElementById('get-started-btn')?.addEventListener('click', () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  console.log('[DEBUG] Before translations');
  // ========== LANGUAGE TOGGLE ==========
  const translations = {
    en: {
      heroTitle: ['Bridging Farms,', 'Markets', 'with Technology'],
      heroDesc: 'One unified platform that connects Farmers 🌾 and Experts 👨‍⚕️ — powered by AI crop detection, live market prices, weather intelligence, soil analysis, and more.',
      explorePlatform: 'Explore Platform',
      tryAiScanner: 'Try AI Scanner',
      statLabels: ['User Groups', 'Core Features', 'Languages'],
      navLinks: ['Features', 'AI Scanner', 'Market Prices', 'Weather', 'Schemes'],
      getStarted: 'Get Started',
      smartPlatformBadge: 'Smart Farmer Support Platform',
      challengeBadge: 'The Challenge',
      challengeTitle: 'Real Problems in Rural India',
      challengeDesc: 'Farmers face fragmented systems, low trust, weak market access, and poor information visibility every day.',
      solutionBadge: 'The Solution',
      solutionTitle: 'AgriVision connects the entire rural ecosystem',
      solutionDesc: 'One platform that brings together farmers and agricultural experts — providing AI-powered tools and removing middlemen.',
      featuresBadge: 'Core Features',
      featuresTitle: '8 Powerful Capabilities',
      featuresDesc: 'Everything farmers need in one unified platform',
      ctaTitle: 'Ready to transform rural India?',
      ctaDesc: 'AgriVision combines AI, digital inclusion, agriculture support, and marketplace access into one meaningful product with real social impact.',
      getStartedNow: 'Get Started Now',
      watchDemo: 'Watch Demo'
    },
    hi: {
      heroTitle: ['खेतों को जोड़ना,', 'बाज़ारों', 'को तकनीक से'],
      heroDesc: 'एक एकीकृत प्लेटफ़ॉर्म जो किसानों 🌾, खरीदारों 🏪, और विशेषज्ञों 👨‍⚕️ को जोड़ता है — AI फसल पहचान, लाइव मंडी भाव, मौसम जानकारी, मिट्टी विश्लेषण और बहुत कुछ।',
      explorePlatform: 'प्लेटफ़ॉर्म देखें',
      tryAiScanner: 'AI स्कैनर आज़माएं',
      statLabels: ['उपयोगकर्ता समूह', 'मुख्य सुविधाएँ', 'भाषाएँ'],
      navLinks: ['सुविधाएँ', 'AI स्कैनर', 'मंडी भाव', 'मौसम', 'योजनाएँ'],
      getStarted: 'शुरू करें',
      smartPlatformBadge: 'स्मार्ट किसान सहायता प्लेटफ़ॉर्म',
      challengeBadge: 'चुनौती',
      challengeTitle: 'ग्रामीण भारत की असली समस्याएँ',
      challengeDesc: 'किसानों को हर दिन बिखरी प्रणालियों, कम विश्वास, कमजोर बाज़ार पहुँच, और खराब जानकारी का सामना करना पड़ता है।',
      solutionBadge: 'समाधान',
      solutionTitle: 'कृषिसेतु पूरे ग्रामीण पारिस्थितिकी तंत्र को जोड़ता है',
      solutionDesc: 'एक प्लेटफ़ॉर्म जो किसानों, खरीदारों और कृषि विशेषज्ञों को एक साथ लाता है — बिचौलियों को हटाता है, और AI-संचालित उपकरण प्रदान करता है।',
      featuresBadge: 'मुख्य सुविधाएँ',
      featuresTitle: '8 शक्तिशाली क्षमताएँ',
      featuresDesc: 'किसानों को जो कुछ भी चाहिए वो एक प्लेटफ़ॉर्म पर',
      ctaTitle: 'ग्रामीण भारत को बदलने के लिए तैयार?',
      ctaDesc: 'कृषिसेतु AI, डिजिटल समावेश, कृषि सहायता, और बाज़ार पहुँच को एक सार्थक उत्पाद में जोड़ता है।',
      getStartedNow: 'अभी शुरू करें',
      watchDemo: 'डेमो देखें'
    }
  };

  // currentLang is now declared at the top of DOMContentLoaded
  const langToggleBtn = document.getElementById('lang-toggle');

  console.log('[DEBUG] After translations, langToggleBtn:', langToggleBtn);
  langToggleBtn?.addEventListener('click', () => {
    currentLang = currentLang === 'en' ? 'hi' : 'en';
    const t = translations[currentLang];

    // Update lang toggle button highlight
    const spans = langToggleBtn.querySelectorAll('span');
    if (currentLang === 'hi') {
      spans[0].style.color = 'var(--primary)';
      spans[0].style.fontWeight = '800';
      spans[1].style.color = 'var(--text-muted)';
      spans[1].style.fontWeight = '400';
    } else {
      spans[1].style.color = 'var(--primary)';
      spans[1].style.fontWeight = '800';
      spans[0].style.color = 'var(--text-muted)';
      spans[0].style.fontWeight = '400';
    }

    // Hero section
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
      heroTitle.innerHTML = `
      <span class="title-line">${t.heroTitle[0]}</span>
      <span class="title-line gradient-text">${t.heroTitle[1]}</span>
      <span class="title-line">${t.heroTitle[2]}</span>
    `;
    }

    const heroDesc = document.querySelector('.hero-desc');
    if (heroDesc) heroDesc.textContent = t.heroDesc;

    // Hero badge
    const heroBadge = document.querySelector('.hero-badge span:last-child');
    if (heroBadge) heroBadge.textContent = t.smartPlatformBadge;

    // Hero buttons
    const exploreBtn = document.getElementById('explore-btn');
    if (exploreBtn) exploreBtn.innerHTML = `<i class="fas fa-compass"></i> ${t.explorePlatform}`;
    const tryAiBtn = document.getElementById('try-ai-btn');
    if (tryAiBtn) tryAiBtn.innerHTML = `<i class="fas fa-camera"></i> ${t.tryAiScanner}`;

    // Stat labels
    const statLabels = document.querySelectorAll('.stat-label');
    statLabels.forEach((label, i) => { if (t.statLabels[i]) label.textContent = t.statLabels[i]; });

    // Nav links
    const navLinkEls = document.querySelectorAll('.nav-link');
    navLinkEls.forEach((link, i) => { if (t.navLinks[i]) link.textContent = t.navLinks[i]; });

    // Get Started button
    const ctaBtn = document.getElementById('nav-cta-btn');
    if (ctaBtn) ctaBtn.innerHTML = `<i class="fas fa-rocket"></i> ${t.getStarted}`;

    // Problem section
    const probBadge = document.querySelector('#problems .section-badge');
    if (probBadge) probBadge.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${t.challengeBadge}`;
    const probTitle = document.querySelector('#problems .section-title');
    if (probTitle) probTitle.textContent = t.challengeTitle;
    const probDesc = document.querySelector('#problems .section-desc');
    if (probDesc) probDesc.textContent = t.challengeDesc;

    // Solution section
    const solBadge = document.querySelector('#solution .section-badge');
    if (solBadge) solBadge.innerHTML = `<i class="fas fa-lightbulb"></i> ${t.solutionBadge}`;
    const solTitle = document.querySelector('#solution .section-title');
    if (solTitle) solTitle.textContent = t.solutionTitle;
    const solDesc = document.querySelector('#solution .section-desc');
    if (solDesc) solDesc.textContent = t.solutionDesc;

    // Features section
    const featBadge = document.querySelector('#features .section-badge');
    if (featBadge) featBadge.innerHTML = `<i class="fas fa-star"></i> ${t.featuresBadge}`;
    const featTitle = document.querySelector('#features .section-title');
    if (featTitle) featTitle.textContent = t.featuresTitle;
    const featDesc = document.querySelector('#features .section-desc');
    if (featDesc) featDesc.textContent = t.featuresDesc;

    // CTA section
    const ctaTitle = document.querySelector('.cta-content h2');
    if (ctaTitle) ctaTitle.textContent = t.ctaTitle;
    const ctaDesc = document.querySelector('.cta-content p');
    if (ctaDesc) ctaDesc.textContent = t.ctaDesc;
    
    // Feature Grid Titles
    const isHi = currentLang === 'hi';
    const featuresCards = document.querySelectorAll('.feature-card h3');
    if (featuresCards.length >= 4) {
        featuresCards[0].textContent = isHi ? 'AI फसल रोग पहचान' : 'AI Crop Disease Detection';
        featuresCards[1].textContent = isHi ? 'मंडी भाव ट्रैकर' : 'Market Price Tracker';
        featuresCards[2].textContent = isHi ? 'मौसम का अनुमान' : 'Weather Prediction';
        featuresCards[3].textContent = isHi ? 'सरकारी योजनाएं' : 'Govt Schemes';
    }

    const featuresDesc = document.querySelectorAll('.feature-card p');
    if (featuresDesc.length >= 4) {
        featuresDesc[0].textContent = isHi ? 'फसल की फोटो अपलोड करें और तुरंत बीमारी की पहचान व उपचार पाएं' : 'Upload a crop image & get instant AI-powered disease identification with treatment suggestions';
        featuresDesc[1].textContent = isHi ? 'सबसे अच्छे बाजार सुझावों के साथ लाइव फसल भाव' : 'Real-time crop prices with best market suggestions';
        featuresDesc[2].textContent = isHi ? 'बारिश का अलर्ट और उचित सिंचाई के सुझाव' : 'Rain alerts and smart irrigation suggestions';
        featuresDesc[3].textContent = isHi ? 'पीएम-किसान, सब्सिडी और समर्थन कार्यक्रमों की जानकारी' : 'PM-Kisan, subsidies, and support program info';
    }
    
    // AI Scanner Section
    const cropTitle = document.querySelector('#crop-scanner h2');
    if (cropTitle) cropTitle.textContent = isHi ? 'AI फसल रोग पहचान' : 'AI Crop Disease Detection';
    const cropBadge = document.querySelector('#crop-scanner .section-badge');
    if (cropBadge) cropBadge.innerHTML = `<i class="fas fa-camera"></i> ${isHi ? 'विशेषता #1' : 'Feature #1'}`;
    const uploadTitle = document.querySelector('.upload-zone h3');
    if (uploadTitle) uploadTitle.textContent = isHi ? 'फसल की छवि अपलोड करें' : 'Upload Crop Image';
    const uploadBtn = document.querySelector('#upload-btn');
    if (uploadBtn) uploadBtn.innerHTML = `<i class="fas fa-image"></i> ${isHi ? 'छवि चुनें' : 'Choose Image'}`;
    const scanBtn = document.querySelector('#scan-btn');
    if (scanBtn) scanBtn.innerHTML = `<i class="fas fa-microscope"></i> ${isHi ? 'बीमारी स्कैन करें' : 'Scan for Disease'}`;
    
    // Market Prices Section
    const marketTitle = document.querySelector('#market-prices h2');
    if (marketTitle) marketTitle.textContent = isHi ? 'लाइव मंडी भाव ट्रैकर' : 'Live Market Price Tracker';
    const marketBadge = document.querySelector('#market-prices .section-badge');
    if (marketBadge) marketBadge.innerHTML = `<i class="fas fa-chart-line"></i> ${isHi ? 'विशेषता #2' : 'Feature #2'}`;
    
    // Weather Section
    const weatherTitle = document.querySelector('#weather h2');
    if (weatherTitle) weatherTitle.textContent = isHi ? 'स्मार्ट मौसम और सिंचाई' : 'Smart Weather & Irrigation';
    const weatherBadge = document.querySelector('#weather .section-badge');
    if (weatherBadge) weatherBadge.innerHTML = `<i class="fas fa-cloud-sun-rain"></i> ${isHi ? 'विशेषता #3' : 'Feature #3'}`;
    
    // Schemes Section
    const schemesTitle = document.querySelector('#schemes h2');
    if (schemesTitle) schemesTitle.textContent = isHi ? 'सरकारी योजनाएं और सब्सिडी' : 'Government Schemes & Subsidies';
    const schemesDesc = document.querySelector('#schemes .section-desc');
    if (schemesDesc) schemesDesc.textContent = isHi ? 'पीएम-किसान, सब्सिडी और समर्थन कार्यक्रमों की पूरी जानकारी प्राप्त करें' : 'Stay informed about PM-Kisan, subsidies, and support programs';
    const schemesBadge = document.querySelector('#schemes .section-badge');
    if (schemesBadge) schemesBadge.innerHTML = `<i class="fas fa-landmark"></i> ${isHi ? 'विशेषता #4' : 'Feature #4'}`;
    
    // Refresh schemes with new language
    if(window.loadSchemes) window.loadSchemes();
    
    const getStartedNowBtn = document.getElementById('get-started-btn');
    if (getStartedNowBtn) getStartedNowBtn.innerHTML = `<i class="fas fa-rocket"></i> ${t.getStartedNow}`;
    const watchDemoBtn = document.getElementById('learn-more-btn');
    if (watchDemoBtn) watchDemoBtn.innerHTML = `<i class="fas fa-play-circle"></i> ${t.watchDemo}`;

    console.log(`🌐 Language switched to: ${currentLang === 'en' ? 'English' : 'हिंदी'}`);
  });

  console.log('🌾 AgriVision loaded successfully!');
});
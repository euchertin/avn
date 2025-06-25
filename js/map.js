// js/map.js - оптимизация

(() => {
  const ignoredProps = new Set(['stroke', 'stroke-width', 'stroke-opacity', 'fill', 'fill-opacity', 'flag', 'z-index']);

  // Границы карты
  const worldBounds = L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180));

  const map = L.map('map', {
    maxBounds: worldBounds,
    maxBoundsViscosity: 0.7,
    minZoom: 3,
    maxZoom: 18,
    worldCopyJump: false,
    zoomControl: false,
    tap: false,
    bubblingMouseEvents: false
  }).setView([30, 0], 3);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    noWrap: true,
    attribution: '© OpenStreetMap',
    subdomains: 'abcd',
  }).addTo(map);

  L.control.zoom({ position: 'topright' }).addTo(map);

  const whiteMachineIcon = L.divIcon({
    className: 'custom-marker',
    html: '<div class="custom-marker-inner"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  function createPopupContent(feature) {
    if (!feature?.properties) return 'Нет данных';
    let html = `<div style="max-width:250px"><div class="flag-container">`;
    if (feature.properties.flag) {
      html += `<img src="${feature.properties.flag}" loading="lazy" alt="Флаг" class="flag-img" onerror="this.parentNode.innerHTML='<div class=\\'no-flag\\'>Флаг не загружен</div>'">`;
    }
    html += `</div><div class="properties-list">`;

    for (const [key, value] of Object.entries(feature.properties)) {
      if (!ignoredProps.has(key)) {
        html += `<div><b>${key}</b> ${value || ''}</div>`;
      }
    }
    return html + '</div></div>';
  }

  async function loadAndRenderGeoJSON() {
    try {
      const response = await fetch('map (11).geojson');
      if (!response.ok) throw new Error(`Ошибка загрузки: ${response.status}`);
      const data = await response.json();

      if (!data.features || !data.features.length) throw new Error('Нет данных в GeoJSON');

      // Сортируем: точки в конец, полигоны в начало, по z-index
      const sortedFeatures = [...data.features].sort((a, b) => {
        const aZ = a.properties?.['z-index'] || 0;
        const bZ = b.properties?.['z-index'] || 0;
        const aIsPoint = a.geometry?.type === 'Point';
        const bIsPoint = b.geometry?.type === 'Point';
        if (aIsPoint && !bIsPoint) return 1;
        if (!aIsPoint && bIsPoint) return -1;
        return aZ - bZ;
      });

      // Упрощение: обрабатываем полигоны — разность (turf.difference), исключая наложения
      let processedPolygons = [];
      for (let i = 0; i < sortedFeatures.length; i++) {
        const f = sortedFeatures[i];
        if (f.geometry?.type.includes('Polygon')) {
          let geom = f.geometry;
          for (let j = i + 1; j < sortedFeatures.length; j++) {
            const next = sortedFeatures[j];
            if (next.geometry?.type.includes('Polygon')) {
              try {
                const diff = turf.difference(geom, next.geometry);
                if (!diff) {
                  geom = null;
                  break;
                }
                geom = diff.geometry;
              } catch {
                // игнорируем ошибки turf.difference
              }
            }
          }
          if (geom) {
            processedPolygons.push({...f, geometry: geom});
          }
        }
      }

      // Добавляем обратно точки после полигона
      const points = sortedFeatures.filter(f => f.geometry?.type === 'Point');
      const finalFeatures = [...processedPolygons, ...points];

      // Создаем слой GeoJSON с поэтапным рендерингом
      const batchSize = 50;
      let index = 0;

      function addBatch() {
        const batch = finalFeatures.slice(index, index + batchSize);
        L.geoJSON(batch, {
          pointToLayer: (feature, latlng) => {
            const marker = L.marker(latlng, { icon: whiteMachineIcon });
            marker.bindPopup(createPopupContent(feature), { className: 'dark-popup', maxWidth: 300 });
            return marker;
          },
          style: feature => {
            const p = feature.properties || {};
            return {
              color: p.stroke || '#555',
              weight: Number(p['stroke-width']) || 2,
              opacity: Number(p['stroke-opacity']) || 0.8,
              fillColor: p.fill || '#333',
              fillOpacity: Number(p['fill-opacity']) || 0.5
            };
          },
          onEachFeature: (feature, layer) => {
            if (feature.geometry?.type !== 'Point') {
              layer.bindPopup(createPopupContent(feature), { className: 'dark-popup', maxWidth: 300 });
            }
          }
        }).addTo(map);

        index += batchSize;
        if (index < finalFeatures.length) {
          requestIdleCallback(addBatch);
        }
      }
      addBatch();

    } catch (err) {
      console.error(err);
      const errDiv = document.getElementById('error');
      errDiv.style.visibility = 'visible';
      errDiv.innerHTML = `<b>Ошибка загрузки данных карты:</b><br>${err.message}`;
    }
  }

  loadAndRenderGeoJSON();
})();
// js/index.js - оптимизация аудиоплеера

(() => {
  const player = document.getElementById('audio-player');
  const playPauseBtn = document.getElementById('play-pause-btn');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const trackTitle = document.getElementById('track-title');
  const currentTimeElem = document.getElementById('current-time');
  const totalTimeElem = document.getElementById('total-time');
  const progressBar = document.getElementById('progress-bar');
  const progressContainer = document.getElementById('progress-container');
  const volumeBtn = document.getElementById('volume-btn');
  const volumeSlider = document.getElementById('volume-slider');
  const minimizeBtn = document.getElementById('minimize-btn');

  const tracks = [
    document.getElementById('track1'),
    document.getElementById('track2'),
    document.getElementById('track3'),
    document.getElementById('track4'),
    document.getElementById('track5')
  ];

  let currentTrackIndex = 0;
  let isPlaying = false;

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function loadTrack(index) {
    if (index < 0) index = tracks.length - 1;
    else if (index >= tracks.length) index = 0;

    if (currentTrackIndex !== index) {
      pauseTrack();
      currentTrackIndex = index;
      updateUIForTrack();
      playTrack();
    }
  }

  function updateUIForTrack() {
    const track = tracks[currentTrackIndex];
    trackTitle.textContent = track.src.split('/').pop() || 'Без названия';

    // Обновим длительность после метаданных
    track.onloadedmetadata = () => {
      totalTimeElem.textContent = formatTime(track.duration);
    };
  }

  function playTrack() {
    const track = tracks[currentTrackIndex];
    track.play();
    isPlaying = true;
    togglePlayPauseIcon();
  }

  function pauseTrack() {
    const track = tracks[currentTrackIndex];
    track.pause();
    isPlaying = false;
    togglePlayPauseIcon();
  }

  function togglePlayPause() {
    if (isPlaying) pauseTrack();
    else playTrack();
  }

  function togglePlayPauseIcon() {
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    if (isPlaying) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'inline';
    } else {
      playIcon.style.display = 'inline';
      pauseIcon.style.display = 'none';
    }
  }

  function updateProgress() {
    const track = tracks[currentTrackIndex];
    const current = track.currentTime;
    const duration = track.duration || 1;
    const percent = (current / duration) * 100;
    progressBar.style.width = `${percent}%`;
    currentTimeElem.textContent = formatTime(current);
  }

  function setProgress(e) {
    const width = this.clientWidth;
    const clickX = e.offsetX;
    const track = tracks[currentTrackIndex];
    const duration = track.duration || 1;
    track.currentTime = (clickX / width) * duration;
  }

  function toggleVolume() {
    const track = tracks[currentTrackIndex];
    if (track.muted) {
      track.muted = false;
      volumeSlider.value = track.volume;
      volumeBtn.querySelector('#volume-high').style.display = 'inline';
      volumeBtn.querySelector('#volume-mute').style.display = 'none';
    } else {
      track.muted = true;
      volumeSlider.value = 0;
      volumeBtn.querySelector('#volume-high').style.display = 'none';
      volumeBtn.querySelector('#volume-mute').style.display = 'inline';
    }
  }

  function setVolume(e) {
    const volume = parseFloat(e.target.value);
    const track = tracks[currentTrackIndex];
    track.volume = volume;
    track.muted = volume === 0;
    volumeBtn.querySelector('#volume-high').style.display = volume === 0 ? 'none' : 'inline';
    volumeBtn.querySelector('#volume-mute').style.display = volume === 0 ? 'inline' : 'none';
  }

  function playNext() {
    loadTrack(currentTrackIndex + 1);
  }

  function playPrev() {
    loadTrack(currentTrackIndex - 1);
  }

  // События
  playPauseBtn.addEventListener('click', togglePlayPause);
  nextBtn.addEventListener('click', playNext);
  prevBtn.addEventListener('click', playPrev);
  tracks.forEach(track => {
    track.addEventListener('timeupdate', updateProgress);
    track.addEventListener('ended', playNext);
  });
  progressContainer.addEventListener('click', setProgress);
  volumeBtn.addEventListener('click', toggleVolume);
  volumeSlider.addEventListener('input', setVolume);

  // Загрузка первого трека
  loadTrack(currentTrackIndex);
})();

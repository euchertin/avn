const worldBounds = L.latLngBounds([-85, -180], [85, 180]);

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
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  subdomains: 'abcd'
}).addTo(map);

L.control.zoom({ position: 'topright' }).addTo(map);

const whiteMachineIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div class="custom-marker-inner"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const ignoredProps = new Set(['stroke', 'stroke-width', 'stroke-opacity', 'fill', 'fill-opacity', 'flag', 'z-index']);

function createPopupContent({ properties }) {
  if (!properties) return "Нет данных";
  let flagHtml = properties.flag
    ? `<img src="${properties.flag}" class="flag-img" alt="Флаг" onerror="this.parentNode.innerHTML='<div class=\\'no-flag\\'>Флаг не загружен</div>'">`
    : '';
  let content = `<div style="max-width:250px"><div class="flag-container">${flagHtml}</div><div class="properties-list">`;
  for (const [k, v] of Object.entries(properties)) {
    if (!ignoredProps.has(k)) content += `<div><b>${k}</b> ${v || ''}</div>`;
  }
 return content + '</div></div>';
}

// Используем глобальный turf
const { difference, booleanIntersects } = turf;

fetch('map (11).geojson')
  .then(res => res.json())
  .then(({ features }) => {
    if (!features) throw new Error("GeoJSON has no features");

    // Фильтруем только полигоны и сортируем по z-index возрастанию
    const polygons = features
      .filter(f => ['Polygon', 'MultiPolygon'].includes(f.geometry?.type))
      .sort((a, b) => {
        const aZ = a.properties?.['z-index'] || 0;
        const bZ = b.properties?.['z-index'] || 0;
        return aZ - bZ;
      });

    // Аггрегация по fill для наследования nameKey и flag
    const ignoredProps = new Set(['stroke', 'stroke-width', 'stroke-opacity', 'fill', 'fill-opacity', 'flag', 'z-index']);
    const colorData = {};
    for (const f of polygons) {
      const props = f.properties || {};
      const fill = props.fill;
      if (!fill) continue;
      if (!colorData[fill]) colorData[fill] = { nameKey: null, flag: null };
      if (!colorData[fill].nameKey) {
        const nameKey = Object.keys(props).find(k => !ignoredProps.has(k));
        colorData[fill].nameKey = nameKey || null;
      }
      if (!colorData[fill].flag && props.flag) {
        colorData[fill].flag = props.flag;
      }
    }

    // Наследуем свойства для полигонов без своих свойств, если есть данные в colorData
    for (const f of polygons) {
      const props = f.properties || {};
      const fill = props.fill;
      if (!fill) continue;
      const d = colorData[fill];
      if (!d) continue;
      // Если нет ни одного "основного" свойства кроме ignoredProps — наследуем
      const hasMainProps = Object.keys(props).some(k => !ignoredProps.has(k));
      if (!hasMainProps && d.nameKey) {
        props[d.nameKey] = '';
      }
      if (!props.flag && d.flag) {
        props.flag = d.flag;
      }
    }

    // Обрезаем полигоны сверху вниз
    const clippedPolygons = [];

    for (let i = 0; i < polygons.length; i++) {
      let baseFeature = polygons[i];
      let baseGeom = baseFeature.geometry;

      for (let j = i + 1; j < polygons.length; j++) {
        const topFeature = polygons[j];

        if (turf.booleanIntersects(baseGeom, topFeature.geometry)) {
          try {
            const diff = turf.difference({ type: 'Feature', geometry: baseGeom }, topFeature);
            if (diff && diff.geometry) {
              baseGeom = diff.geometry;
            } else {
              baseGeom = null;
              break;
            }
          } catch (err) {
            console.warn('turf.difference error, skipping:', err);
          }
        }
      }

      if (baseGeom) {
        clippedPolygons.push({
          ...baseFeature,
          geometry: baseGeom
        });
      }
    }

    // Рендерим обрезанные полигоны
    L.geoJSON({ type: "FeatureCollection", features: clippedPolygons }, {
      style: ({ properties }) => ({
        stroke: true,
        color: properties['stroke'] || '#555',
        weight: +properties['stroke-width'] || 2,
        opacity: +properties['stroke-opacity'] || 0.8,
        fill: true,
        fillColor: properties['fill'] || '#333',
        fillOpacity: +properties['fill-opacity'] || 0.5
      }),
      onEachFeature: (feature, layer) => {
        layer.bindPopup(createPopupContent(feature), { maxWidth: 300, minWidth: 150, className: 'dark-popup' });
      }
    }).addTo(map);

  })
  .catch(err => {
    console.error("Loading error:", err);
    document.getElementById('error').innerHTML = `<b>Ошибка загрузки данных</b><br>${err.message}`;
  });


// === Аудиоплеер (твой оригинальный код, без изменений) ===

const $ = id => document.getElementById(id);

const audioPlayer = $('audio-player'),
  playPauseBtn = $('play-pause-btn'),
  prevBtn = $('prev-btn'),
  nextBtn = $('next-btn'),
  volumeBtn = $('volume-btn'),
  volumeSlider = $('volume-slider'),
  progressContainer = $('progress-container'),
  progressBar = $('progress-bar'),
  currentTimeEl = $('current-time'),
  totalTimeEl = $('total-time'),
  trackTitleEl = $('track-title'),
  minimizeBtn = $('minimize-btn'),
  playIcon = $('play-icon'),
  pauseIcon = $('pause-icon'),
  volumeHighIcon = $('volume-high'),
  volumeMuteIcon = $('volume-mute'),
  expandIcon = $('expand-icon'),
  collapseIcon = $('collapse-icon');

const tracks = [
  { element: $('track1'), title: "TNO OST - Toolbox Theory" },
  { element: $('track2'), title: "The New Order: Russian Fairytale" },
  { element: $('track3'), title: "Half-Life 2: Particle Ghost (Remix)" },
  { element: $('track4'), title: "TNO OST - Burgundian Lullaby" },
  { element: $('track5'), title: "TNO OST - Between the Bombings" }
];

let currentTrackIndex = Math.floor(Math.random() * tracks.length),
  isPlaying = false,
  isDragging = false,
  wasPlaying = false;

const formatTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function updateTrackInfo() {
  const t = tracks[currentTrackIndex].element;
  trackTitleEl.textContent = tracks[currentTrackIndex].title;
  totalTimeEl.textContent = isNaN(t.duration) ? '0:00' : formatTime(t.duration);
}

function updateProgress() {
  if (isDragging) return;
  const t = tracks[currentTrackIndex].element;
  if (!t.duration) return;
  progressBar.style.width = `${(t.currentTime / t.duration) * 100}%`;
  currentTimeEl.textContent = formatTime(t.currentTime);
}

function updatePlayPauseBtn() {
  playIcon.style.display = isPlaying ? 'none' : 'block';
  pauseIcon.style.display = isPlaying ? 'block' : 'none';
}

function updateVolumeBtn() {
  const v = tracks[currentTrackIndex].element.volume;
  volumeHighIcon.style.display = v > 0 ? 'block' : 'none';
  volumeMuteIcon.style.display = v > 0 ? 'none' : 'block';
}

function setVolume(v) {
  v = Math.min(Math.max(v, 0), 1);
  tracks.forEach(t => {
    t.element.volume = v;
  });
  volumeSlider.value = v;
  updateVolumeBtn();
  localStorage.setItem('playerVolume', v);
}

async function playTrack() {
  tracks.forEach(t => {
    t.element.pause();
    t.element.currentTime = 0;
  });
  const t = tracks[currentTrackIndex].element;
  try {
    await t.play();
    isPlaying = true;
    updatePlayPauseBtn();
    updateTrackInfo();
    updateVolumeBtn();
  } catch {
    playNextTrack();
  }
}

function playNextTrack() {
  currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
  playTrack();
}

function playPrevTrack() {
  const t = tracks[currentTrackIndex].element;
  if (t.currentTime > 3) {
    t.currentTime = 0;
    updateProgress();
  } else {
    currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    playTrack();
  }
}

async function togglePlayPause() {
  const t = tracks[currentTrackIndex].element;
  if (isPlaying) {
    t.pause();
    isPlaying = false;
  } else {
    try {
      await t.play();
      isPlaying = true;
    } catch (e) {
      console.error('Ошибка воспроизведения:', e);
    }
  }
  updatePlayPauseBtn();
}

function seekTo(e) {
  if (!isDragging) return;
  const t = tracks[currentTrackIndex].element;
  const rect = progressContainer.getBoundingClientRect();
  const pos = (e.clientX - rect.left) / rect.width;
  t.currentTime = Math.min(Math.max(pos, 0), 1) * t.duration;
  updateProgress();
}

function onSeekStart(e) {
  isDragging = true;
  wasPlaying = isPlaying;
  if (isPlaying) {
    tracks[currentTrackIndex].element.pause();
    isPlaying = false;
    updatePlayPauseBtn();
  }
  seekTo(e);
}

function onSeekEnd() {
  if (!isDragging) return;
  isDragging = false;
  if (wasPlaying) {
    tracks[currentTrackIndex].element.play().then(() => {
      isPlaying = true;
      updatePlayPauseBtn();
    }).catch(e => {
      console.error('Ошибка воспроизведения после seek:', e);
    });
  }
}

playPauseBtn.onclick = togglePlayPause;
prevBtn.onclick = playPrevTrack;
nextBtn.onclick = playNextTrack;

volumeBtn.onclick = () => {
  const v = tracks[currentTrackIndex].element.volume;
  setVolume(v === 0 ? 0.5 : 0);
};

volumeSlider.oninput = e => setVolume(+e.target.value);

progressContainer.onmousedown = onSeekStart;
document.onmousemove = e => { if (isDragging) seekTo(e); };
document.onmouseup = onSeekEnd;

progressContainer.ontouchstart = e => onSeekStart(e.touches[0]);
document.ontouchmove = e => { if (isDragging) seekTo(e.touches[0]); };
document.ontouchend = onSeekEnd;

minimizeBtn.onclick = () => {
  audioPlayer.classList.toggle('minimized');
  audioPlayer.classList.toggle('expanded');
  const minimized = audioPlayer.classList.contains('minimized');
  expandIcon.style.display = minimized ? 'block' : 'none';
  collapseIcon.style.display = minimized ? 'none' : 'block';
};

tracks.forEach(({ element }, i) => {
  element.addEventListener('ended', playNextTrack);
  element.addEventListener('timeupdate', updateProgress);
  element.addEventListener('loadedmetadata', updateTrackInfo);
  element.addEventListener('error', e => {
    console.error(`Ошибка трека ${i}:`, e);
    playNextTrack();
  });
});

setVolume(parseFloat(localStorage.getItem('playerVolume')) || 0.5);

function autoPlayOnInteraction() {
  if (!isPlaying) playTrack();
  ['click', 'keydown', 'touchstart'].forEach(e => document.removeEventListener(e, autoPlayOnInteraction));
}

['click', 'keydown', 'touchstart'].forEach(e => document.addEventListener(e, autoPlayOnInteraction));

updateTrackInfo();

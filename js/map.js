const ignoredProps = new Set([
  'stroke', 'stroke-width', 'stroke-opacity', 'fill', 'fill-opacity', 'flag', 'z-index'
]);

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

let geojsonLayer = null;
window.processedGeoJSON = null; // для скачивания обработанных данных

fetch('map (11).geojson')
  .then(r => r.json())
  .then(data => {
    if (!data.features) throw new Error("GeoJSON has no features");

    // Пример обработки: фильтрация и добавление флагов по умолчанию
    const processedFeatures = data.features.map(feature => {
      // Например, если у фичи нет флага, ставим дефолт
      if (!feature.properties.flag) {
        feature.properties.flag = 'images/default-flag.jpg';
      }
      // Тут можно добавить другие обработки: обрезка, фильтрация, добавление названий и т.п.
      return feature;
    });

    window.processedGeoJSON = {
      type: "FeatureCollection",
      features: processedFeatures
    };

    if (geojsonLayer) geojsonLayer.remove();

    geojsonLayer = L.geoJSON(window.processedGeoJSON, {
      pointToLayer: (feature, latlng) => {
        const icon = L.divIcon({
          className: 'custom-marker',
          html: '<div class="custom-marker-inner"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        const marker = L.marker(latlng, { icon, bubblingMouseEvents: false });
        marker.bindPopup(createPopupContent(feature), { maxWidth: 300, minWidth: 150, className: 'dark-popup' });
        return marker;
      },
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
        if (feature.geometry.type !== 'Point') {
          layer.bindPopup(createPopupContent(feature), { maxWidth: 300, minWidth: 150, className: 'dark-popup' });
        }
      }
    }).addTo(map);
  })
  .catch(err => {
    console.error("Loading error:", err);
    document.getElementById('error').innerHTML = `<b>Ошибка загрузки данных</b><br>${err.message}`;
  });

// Скачивание обработанного GeoJSON
document.getElementById('process-download-btn').addEventListener('click', () => {
  if (!window.processedGeoJSON) {
    alert('Данные карты еще не загружены или не обработаны');
    return;
  }

  const blob = new Blob([JSON.stringify(window.processedGeoJSON, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'processed-map.geojson';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
  alert('Обработанный GeoJSON скачан');
});


// === Аудиоплеер ===

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

// Устанавливаем громкость и обновляем ползунок + иконки
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

// --- КАРТА ---

const worldBounds = L.latLngBounds(
  L.latLng(-85, -180),
  L.latLng(85, 180)
);

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
  if (!feature.properties) return "Нет данных";

  let content = "<div style='max-width:250px'>";
  content += "<div class='flag-container'>";
  if (feature.properties.flag) {
    content += `<img src="${feature.properties.flag}" class="flag-img" alt="Флаг" 
             onerror="this.parentNode.innerHTML='<div class=\\'no-flag\\'>Флаг не загружен</div>'">`;
  }
  content += "</div>";

  const ignoredKeys = ['stroke', 'stroke-width', 'stroke-opacity', 'fill', 'fill-opacity', 'flag', 'z-index'];
  const propsToShow = Object.keys(feature.properties)
    .filter(k => !ignoredKeys.includes(k));

  if (propsToShow.length > 0) {
    content += '<div class="properties-list">';
    propsToShow.forEach(key => {
      content += `<div><b>${key}</b> ${feature.properties[key] || ''}</div>`;
    });
    content += '</div>';
  }

  content += "</div>";
  return content;
}

fetch('map (11).geojson')
  .then(res => res.json())
  .then(data => {
    if (!data.features) throw new Error("GeoJSON has no features");

    // Сортировка: сначала полигоны, потом точки, потом по z-index
    const sorted = [...data.features].sort((a, b) => {
      const aZ = a.properties?.['z-index'] ?? 0;
      const bZ = b.properties?.['z-index'] ?? 0;
      const aIsPoint = a.geometry?.type === "Point";
      const bIsPoint = b.geometry?.type === "Point";
      if (aIsPoint && !bIsPoint) return 1;
      if (!aIsPoint && bIsPoint) return -1;
      return aZ - bZ;
    });

    // Собираем имя и флаг по fill цвету
    const colorDataMap = {};
    const ignoredKeys = ['stroke', 'stroke-width', 'stroke-opacity', 'fill', 'fill-opacity', 'flag', 'z-index'];

    for (const feat of sorted) {
      if (feat.geometry.type === "Polygon" || feat.geometry.type === "MultiPolygon") {
        const props = feat.properties || {};
        const fillColor = props.fill;
        const customNameKey = Object.keys(props).find(k => !ignoredKeys.includes(k));
        const flag = props.flag;

        if (fillColor && (customNameKey || flag)) {
          if (!colorDataMap[fillColor]) colorDataMap[fillColor] = {};
          if (customNameKey) colorDataMap[fillColor].nameKey = customNameKey;
          if (flag) colorDataMap[fillColor].flag = flag;
        }
      }
    }

    for (const feat of sorted) {
      if (feat.geometry.type === "Polygon" || feat.geometry.type === "MultiPolygon") {
        const props = feat.properties || {};
        const fillColor = props.fill;
        const data = colorDataMap[fillColor];
        if (fillColor && data) {
          const hasCustomName = Object.keys(props).some(k => !ignoredKeys.includes(k));
          if (!hasCustomName && data.nameKey) {
            props[data.nameKey] = '';
          }
          if (!props.flag && data.flag) {
            props.flag = data.flag;
          }
        }
      }
    }

    // Обработка перекрытий
    const processed = [];

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      if (!["Polygon", "MultiPolygon"].includes(current.geometry.type)) {
        processed.push(current);
        continue;
      }

      let geom = current;
      for (let j = i + 1; j < sorted.length; j++) {
        const next = sorted[j];
        if (!["Polygon", "MultiPolygon"].includes(next.geometry.type)) continue;

        try {
          const diff = turf.difference(geom, next);
          if (diff) geom = diff;
          else {
            geom = null;
            break;
          }
        } catch (e) {
          console.warn('Ошибка turf.difference:', e);
        }
      }

      if (geom) {
        processed.push({
          ...current,
          geometry: geom.geometry
        });
      }
    }

    const markersLayer = L.layerGroup().addTo(map);

    L.geoJSON({ type: "FeatureCollection", features: processed }, {
      pointToLayer: (feature, latlng) => {
        const marker = L.marker(latlng, {
          icon: whiteMachineIcon,
          bubblingMouseEvents: false
        });
        marker.bindPopup(createPopupContent(feature), {
          maxWidth: 300,
          minWidth: 150,
          className: 'dark-popup'
        });
        markersLayer.addLayer(marker);
        return marker;
      },
      style: (feature) => {
        const props = feature.properties || {};
        return {
          stroke: true,
          color: props['stroke'] || '#555',
          weight: parseInt(props['stroke-width']) || 2,
          opacity: parseFloat(props['stroke-opacity']) || 0.8,
          fill: true,
          fillColor: props['fill'] || '#333',
          fillOpacity: parseFloat(props['fill-opacity']) || 0.5
        };
      },
      onEachFeature: (feature, layer) => {
        if (feature.geometry.type !== 'Point') {
          layer.bindPopup(createPopupContent(feature), {
            maxWidth: 300,
            minWidth: 150,
            className: 'dark-popup'
          });
        }
      }
    }).addTo(map);
  })
  .catch(err => {
    console.error("Ошибка загрузки GeoJSON:", err);
    document.getElementById('error').innerHTML = `<b>Ошибка загрузки данных</b><br>${err.message}`;
  });

// --- ПЛЕЕР ---

const audioPlayer = document.getElementById('audio-player');
const playPauseBtn = document.getElementById('play-pause-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const volumeBtn = document.getElementById('volume-btn');
const volumeSlider = document.getElementById('volume-slider');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');
const trackTitleEl = document.getElementById('track-title');
const minimizeBtn = document.getElementById('minimize-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const volumeHighIcon = document.getElementById('volume-high');
const volumeMuteIcon = document.getElementById('volume-mute');
const expandIcon = document.getElementById('expand-icon');
const collapseIcon = document.getElementById('collapse-icon');

const tracks = [
  { src: "TNO OST - Toolbox Theory.mp3", title: "TNO OST - Toolbox Theory" },
  { src: "The New Order_ Last Days of Europe - Russian Fairytale.mp3", title: "The New Order: Russian Fairytale" },
  { src: "Half-Life 2_ Overcharged - Particle Ghost (Remix).mp3", title: "Half-Life 2: Particle Ghost (Remix)" },
  { src: "TNO OST - Burgundian Lullaby.mp3", title: "TNO OST - Burgundian Lullaby" },
  { src: "The New Order - TNO OST_ Between the Bombings.mp3", title: "TNO OST - Between the Bombings" }
];

const audio = new Audio();
let currentTrackIndex = Math.floor(Math.random() * tracks.length);
let isPlaying = false;
let isDraggingProgress = false;
let wasPlayingBeforeDrag = false;

// Формат времени мм:сс
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Обновляем UI трека
function updateTrackInfo() {
  trackTitleEl.textContent = tracks[currentTrackIndex].title;
  totalTimeEl.textContent = formatTime(audio.duration || 0);
}

// Обновляем прогресс с throttle ~10fps
let lastProgressUpdate = 0;
function updateProgress() {
  if (isDraggingProgress) return;
  const now = performance.now();
  if (now - lastProgressUpdate < 100) return;
  lastProgressUpdate = now;

  const progress = (audio.currentTime / audio.duration) * 100 || 0;
  progressBar.style.width = progress + '%';
  currentTimeEl.textContent = formatTime(audio.currentTime || 0);
}

// Обновляем кнопки Play/Pause
function updatePlayPauseButton() {
  if (isPlaying) {
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
  } else {
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
  }
}

// Обновляем иконку громкости
function updateVolumeButton() {
  if (audio.volume === 0) {
    volumeHighIcon.style.display = 'none';
    volumeMuteIcon.style.display = 'block';
  } else {
    volumeHighIcon.style.display = 'block';
    volumeMuteIcon.style.display = 'none';
  }
}

// Воспроизведение трека
function playTrack() {
  audio.src = tracks[currentTrackIndex].src;
  audio.play().then(() => {
    isPlaying = true;
    updatePlayPauseButton();
    updateTrackInfo();
    updateVolumeButton();
  }).catch(err => {
    console.error("Ошибка воспроизведения:", err);
    playNextTrack();
  });
}

// Следующий трек
function playNextTrack() {
  currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
  playTrack();
}

// Предыдущий трек
function playPrevTrack() {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    updateProgress();
  } else {
    currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    playTrack();
  }
}

// Пауза/Воспроизведение
function togglePlayPause() {
  if (isPlaying) {
    audio.pause();
    isPlaying = false;
  } else {
    audio.play().then(() => {
      isPlaying = true;
    }).catch(console.error);
  }
  updatePlayPauseButton();
}

// Установка громкости
function setVolume(vol) {
  vol = Math.min(Math.max(vol, 0), 1);
  audio.volume = vol;
  volumeSlider.value = vol;
  updateVolumeButton();
  localStorage.setItem('playerVolume', vol);
}

// Перемотка
function seekTo(event) {
  if (!isDraggingProgress) return;
  const rect = progressContainer.getBoundingClientRect();
  let pos = 0;

  if (event.touches) {
    pos = (event.touches[0].clientX - rect.left) / rect.width;
  } else {
    pos = (event.clientX - rect.left) / rect.width;
  }

  pos = Math.min(Math.max(pos, 0), 1);
  audio.currentTime = pos * audio.duration;
  updateProgress();
}

// Обработчики

playPauseBtn.onclick = togglePlayPause;
prevBtn.onclick = playPrevTrack;
nextBtn.onclick = playNextTrack;
volumeBtn.onclick = () => setVolume(audio.volume === 0 ? 0.5 : 0);
volumeSlider.oninput = (e) => setVolume(parseFloat(e.target.value));

progressContainer.onmousedown = (e) => {
  isDraggingProgress = true;
  wasPlayingBeforeDrag = isPlaying;
  if (isPlaying) {
    audio.pause();
    isPlaying = false;
    updatePlayPauseButton();
  }
  seekTo(e);

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
};

function onMouseMove(e) {
  if (isDraggingProgress) seekTo(e);
}

function onMouseUp() {
  if (!isDraggingProgress) return;
  isDraggingProgress = false;
  if (wasPlayingBeforeDrag) {
    audio.play().then(() => {
      isPlaying = true;
      updatePlayPauseButton();
    }).catch(console.error);
  }
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
}

progressContainer.ontouchstart = (e) => {
  isDraggingProgress = true;
  wasPlayingBeforeDrag = isPlaying;
  if (isPlaying) {
    audio.pause();
    isPlaying = false;
    updatePlayPauseButton();
  }
  seekTo(e.touches[0]);

  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd);
};

function onTouchMove(e) {
  if (isDraggingProgress) {
    seekTo(e.touches[0]);
    e.preventDefault();
  }
}

function onTouchEnd() {
  if (!isDraggingProgress) return;
  isDraggingProgress = false;
  if (wasPlayingBeforeDrag) {
    audio.play().then(() => {
      isPlaying = true;
      updatePlayPauseButton();
    }).catch(console.error);
  }
  document.removeEventListener('touchmove', onTouchMove);
  document.removeEventListener('touchend', onTouchEnd);
}

minimizeBtn.onclick = () => {
  audioPlayer.classList.toggle('minimized');
  audioPlayer.classList.toggle('expanded');
  expandIcon.style.display = audioPlayer.classList.contains('minimized') ? 'block' : 'none';
  collapseIcon.style.display = audioPlayer.classList.contains('minimized') ? 'none' : 'block';
};

// События аудио
audio.addEventListener('ended', playNextTrack);
audio.addEventListener('timeupdate', updateProgress);
audio.addEventListener('loadedmetadata', updateTrackInfo);
audio.addEventListener('error', err => {
  console.error("Ошибка трека:", err);
  playNextTrack();
});

// Загрузка сохранённой громкости
const savedVolume = localStorage.getItem('playerVolume');
setVolume(savedVolume !== null ? parseFloat(savedVolume) : 0.5);

// Автовоспроизведение при первом взаимодействии с пользователем
function handleFirstInteraction() {
  if (!isPlaying) playTrack();
  document.removeEventListener('click', handleFirstInteraction);
  document.removeEventListener('keydown', handleFirstInteraction);
  document.removeEventListener('touchstart', handleFirstInteraction);
}
document.addEventListener('click', handleFirstInteraction);
document.addEventListener('keydown', handleFirstInteraction);
document.addEventListener('touchstart', handleFirstInteraction);

// Начальное обновление UI
updateTrackInfo();
updatePlayPauseButton();
updateVolumeButton();

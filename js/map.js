// Границы карты
const worldBounds = L.latLngBounds(
  L.latLng(-85, -180),
  L.latLng(85, 180)
);

// Создаем карту с ограничениями
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

// Добавляем тёмные тайлы в стиле ТНО (CartoDB DarkMatter)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
  noWrap: true,
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  subdomains: 'abcd',
}).addTo(map);

// Добавляем кастомный zoom control
L.control.zoom({
  position: 'topright'
}).addTo(map);

// Иконка для маркеров
const whiteMachineIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div class="custom-marker-inner"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// Функция для создания содержимого popup с флагом
function createPopupContent(feature) {
  if (!feature.properties) return "Нет данных";
  
  let content = "<div style='max-width:250px'>";
  
  // Обработка флага
  content += "<div class='flag-container'>";
  if (feature.properties.flag) {
    content += `<img src="${feature.properties.flag}" class="flag-img" alt="Флаг" 
             onerror="this.parentNode.innerHTML='<div class=\\'no-flag\\'>Флаг не загружен</div>'">`;
  }
  content += "</div>";
  
  // Добавляем остальные свойства
  const propsToShow = Object.keys(feature.properties)
    .filter(k => !['stroke', 'stroke-width', 'stroke-opacity', 'fill', 'fill-opacity', 'flag', 'z-index'].includes(k));
  
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
  .then(response => response.json())
  .then(data => {
    if (!data.features) throw new Error("GeoJSON has no features");

    // Отсортировать полигоны по z-index
    const sorted = [...data.features].sort((a, b) => {
      const aZ = a.properties?.['z-index'] ?? 0;
      const bZ = b.properties?.['z-index'] ?? 0;

      // Сначала полигоны, потом точки
      const aIsPoint = a.geometry?.type === "Point";
      const bIsPoint = b.geometry?.type === "Point";
      if (aIsPoint && !bIsPoint) return 1;
      if (!aIsPoint && bIsPoint) return -1;

      return aZ - bZ;
    });

    const processed = [];

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];

      // Только для полигонов
      if (current.geometry.type !== "Polygon" && current.geometry.type !== "MultiPolygon") {
        processed.push(current);
        continue;
      }

      let geom = current;

      // Вырезать все более верхние полигоны (с большим z-index)
      for (let j = i + 1; j < sorted.length; j++) {
        const next = sorted[j];
        if (next.geometry.type !== "Polygon" && next.geometry.type !== "MultiPolygon") continue;

        try {
          const diff = turf.difference(geom, next);
          if (diff) geom = diff;
          else {
            geom = null;
            break;
          }
        } catch (err) {
          console.warn('Ошибка при difference:', err);
        }
      }

      if (geom) {
        processed.push({
          ...current,
          geometry: geom.geometry
        });
      }
    }

    // Остальной код — отрисовка карты
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
  .catch(error => {
    console.error("Loading error:", error);
    document.getElementById('error').innerHTML =
      `<b>Ошибка загрузки данных</b><br>${error.message}`;
  });



// Управление музыкой
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
const audioPlayer = document.getElementById('audio-player');
const minimizeBtn = document.getElementById('minimize-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const volumeHighIcon = document.getElementById('volume-high');
const volumeMuteIcon = document.getElementById('volume-mute');
const expandIcon = document.getElementById('expand-icon');
const collapseIcon = document.getElementById('collapse-icon');

// Список всех треков с названиями
const tracks = [
  { 
    element: document.getElementById('track1'), 
    title: "TNO OST - Toolbox Theory" 
  },
  { 
    element: document.getElementById('track2'), 
    title: "The New Order: Russian Fairytale" 
  },
  { 
    element: document.getElementById('track3'), 
    title: "Half-Life 2: Particle Ghost (Remix)" 
  },
  { 
    element: document.getElementById('track4'), 
    title: "TNO OST - Burgundian Lullaby" 
  },
  { 
    element: document.getElementById('track5'), 
    title: "TNO OST - Between the Bombings" 
  }
];

let currentTrackIndex = Math.floor(Math.random() * tracks.length);
let isPlaying = false;
let isDraggingProgress = false;
let wasPlayingBeforeDrag = false;

// Форматирование времени (минуты:секунды)
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Обновление информации о треке
function updateTrackInfo() {
  const track = tracks[currentTrackIndex];
  trackTitleEl.textContent = track.title;
  totalTimeEl.textContent = formatTime(track.element.duration || 0);
}

// Обновление прогресса воспроизведения
function updateProgress() {
  if (isDraggingProgress) return;
  
  const track = tracks[currentTrackIndex].element;
  const progress = (track.currentTime / track.duration) * 100;
  progressBar.style.width = `${progress}%`;
  currentTimeEl.textContent = formatTime(track.currentTime);
}

// Обновление состояния кнопки воспроизведения
function updatePlayPauseButton() {
  if (isPlaying) {
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
  } else {
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
  }
}

// Обновление состояния кнопки громкости
function updateVolumeButton() {
  const volume = tracks[currentTrackIndex].element.volume;
  if (volume === 0) {
    volumeHighIcon.style.display = 'none';
    volumeMuteIcon.style.display = 'block';
  } else {
    volumeHighIcon.style.display = 'block';
    volumeMuteIcon.style.display = 'none';
  }
}

// Воспроизведение трека
function playTrack() {
  // Останавливаем все треки
  tracks.forEach(t => {
    t.element.pause();
    t.element.currentTime = 0;
  });
  
  // Воспроизводим текущий трек
  const track = tracks[currentTrackIndex].element;
  track.play()
    .then(() => {
      isPlaying = true;
      updatePlayPauseButton();
      updateTrackInfo();
      updateVolumeButton();
    })
    .catch(error => {
      console.error("Playback failed:", error);
      // Пытаемся воспроизвести следующий трек при ошибке
      playNextTrack();
    });
}

// Воспроизведение следующего трека
function playNextTrack() {
  currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
  playTrack();
}

// Воспроизведение предыдущего трека
function playPrevTrack() {
  const track = tracks[currentTrackIndex].element;
  // Если трек играет больше 3 секунд, перезапускаем его
  if (track.currentTime > 3) {
    track.currentTime = 0;
    updateProgress();
  } else {
    // Иначе переключаем на предыдущий трек
    currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    playTrack();
  }
}

// Переключение воспроизведения/паузы
function togglePlayPause() {
  const track = tracks[currentTrackIndex].element;
  if (isPlaying) {
    track.pause();
    isPlaying = false;
  } else {
    track.play()
      .then(() => {
        isPlaying = true;
      })
      .catch(error => {
        console.error("Playback failed:", error);
      });
  }
  updatePlayPauseButton();
}

// Установка громкости
function setVolume(volume) {
  volume = Math.max(0, Math.min(1, volume));
  tracks.forEach(t => t.element.volume = volume);
  volumeSlider.value = volume;
  updateVolumeButton();
  
  // Сохраняем громкость в localStorage
  localStorage.setItem('playerVolume', volume);
}

// Перемотка трека
function seekTo(event) {
  if (!isDraggingProgress) return;
  
  const track = tracks[currentTrackIndex].element;
  const rect = progressContainer.getBoundingClientRect();
  const pos = (event.clientX - rect.left) / rect.width;
  track.currentTime = pos * track.duration;
  updateProgress();
}

// Обработчики событий
playPauseBtn.addEventListener('click', togglePlayPause);
prevBtn.addEventListener('click', playPrevTrack);
nextBtn.addEventListener('click', playNextTrack);

volumeBtn.addEventListener('click', () => {
  const currentVolume = tracks[currentTrackIndex].element.volume;
  setVolume(currentVolume === 0 ? 0.5 : 0);
});

volumeSlider.addEventListener('input', (e) => {
  setVolume(parseFloat(e.target.value));
});

progressContainer.addEventListener('mousedown', (e) => {
  isDraggingProgress = true;
  wasPlayingBeforeDrag = isPlaying;
  if (isPlaying) {
    tracks[currentTrackIndex].element.pause();
    isPlaying = false;
    updatePlayPauseButton();
  }
  seekTo(e);
});

document.addEventListener('mousemove', (e) => {
  if (isDraggingProgress) {
    seekTo(e);
  }
});

document.addEventListener('mouseup', () => {
  if (isDraggingProgress) {
    isDraggingProgress = false;
    if (wasPlayingBeforeDrag) {
      tracks[currentTrackIndex].element.play()
        .then(() => {
          isPlaying = true;
          updatePlayPauseButton();
        })
        .catch(error => {
          console.error("Playback failed:", error);
        });
    }
  }
});

// Для мобильных устройств
progressContainer.addEventListener('touchstart', (e) => {
  isDraggingProgress = true;
  wasPlayingBeforeDrag = isPlaying;
  if (isPlaying) {
    tracks[currentTrackIndex].element.pause();
    isPlaying = false;
    updatePlayPauseButton();
  }
  seekTo(e.touches[0]);
});

document.addEventListener('touchmove', (e) => {
  if (isDraggingProgress) {
    seekTo(e.touches[0]);
  }
});

document.addEventListener('touchend', () => {
  if (isDraggingProgress) {
    isDraggingProgress = false;
    if (wasPlayingBeforeDrag) {
      tracks[currentTrackIndex].element.play()
        .then(() => {
          isPlaying = true;
          updatePlayPauseButton();
        })
        .catch(error => {
          console.error("Playback failed:", error);
        });
    }
  }
});

minimizeBtn.addEventListener('click', () => {
  audioPlayer.classList.toggle('minimized');
  audioPlayer.classList.toggle('expanded');
  expandIcon.style.display = audioPlayer.classList.contains('minimized') ? 'block' : 'none';
  collapseIcon.style.display = audioPlayer.classList.contains('minimized') ? 'none' : 'block';
});

// Обработчики событий для треков
tracks.forEach((track, index) => {
  track.element.addEventListener('ended', playNextTrack);
  track.element.addEventListener('timeupdate', updateProgress);
  track.element.addEventListener('loadedmetadata', updateTrackInfo);
  track.element.addEventListener('error', (e) => {
    console.error(`Track ${index} error:`, e);
    // Пытаемся воспроизвести следующий трек при ошибке
    playNextTrack();
  });
});

// Загрузка сохранённой громкости
const savedVolume = localStorage.getItem('playerVolume');
if (savedVolume !== null) {
  setVolume(parseFloat(savedVolume));
} else {
  setVolume(0.5); // Громкость по умолчанию 50%
}

// Автоматическое воспроизведение при взаимодействии с страницей
function handleFirstInteraction() {
  if (!isPlaying) {
    playTrack();
  }
  document.removeEventListener('click', handleFirstInteraction);
  document.removeEventListener('keydown', handleFirstInteraction);
  document.removeEventListener('touchstart', handleFirstInteraction);
}

document.addEventListener('click', handleFirstInteraction);
document.addEventListener('keydown', handleFirstInteraction);
document.addEventListener('touchstart', handleFirstInteraction);

// Инициализация информации о треке
updateTrackInfo();
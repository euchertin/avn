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

function createPopupContent({ properties }) {
  if (!properties) return "Нет данных";
  let content = `<div style='max-width:250px'><div class='flag-container'>`;
  if (properties.flag)
    content += `<img src="${properties.flag}" class="flag-img" alt="Флаг" onerror="this.parentNode.innerHTML='<div class=\\'no-flag\\'>Флаг не загружен</div>'">`;
  content += "</div><div class='properties-list'>";
  Object.entries(properties).forEach(([k, v]) => {
    if (!['stroke', 'stroke-width', 'stroke-opacity', 'fill', 'fill-opacity', 'flag', 'z-index'].includes(k))
      content += `<div><b>${k}</b> ${v || ''}</div>`;
  });
  return content + "</div></div>";
}

fetch('map (11).geojson')
  .then(res => res.json())
  .then(({ features }) => {
    if (!features) throw new Error("GeoJSON has no features");
    const sorted = [...features].sort((a, b) => {
      const az = a.properties?.['z-index'] ?? 0, bz = b.properties?.['z-index'] ?? 0;
      const ap = a.geometry?.type === "Point", bp = b.geometry?.type === "Point";
      return ap !== bp ? (ap ? 1 : -1) : az - bz;
    });

    const ignored = ['stroke', 'stroke-width', 'stroke-opacity', 'fill', 'fill-opacity', 'flag', 'z-index'];
    const colorData = {};

    sorted.forEach(f => {
      if (!['Polygon', 'MultiPolygon'].includes(f.geometry?.type)) return;
      const { fill, flag, ...rest } = f.properties || {};
      const nameKey = Object.keys(rest).find(k => !ignored.includes(k));
      if (fill && (nameKey || flag)) {
        colorData[fill] ??= {};
        if (nameKey) colorData[fill].nameKey = nameKey;
        if (flag) colorData[fill].flag = flag;
      }
    });

    sorted.forEach(f => {
      if (!['Polygon', 'MultiPolygon'].includes(f.geometry?.type)) return;
      const { properties } = f;
      const d = colorData[properties.fill];
      if (!d) return;
      if (!Object.keys(properties).some(k => !ignored.includes(k)) && d.nameKey)
        properties[d.nameKey] = '';
      if (!properties.flag && d.flag) properties.flag = d.flag;
    });

    const processed = [];
    for (let i = 0; i < sorted.length; i++) {
      const cur = sorted[i];
      if (!['Polygon', 'MultiPolygon'].includes(cur.geometry?.type)) {
        processed.push(cur);
        continue;
      }
      let geom = cur;
      for (let j = i + 1; j < sorted.length; j++) {
        const next = sorted[j];
        if (!['Polygon', 'MultiPolygon'].includes(next.geometry?.type)) continue;
        try {
          const diff = turf.difference(geom, next);
          if (diff) geom = diff; else { geom = null; break; }
        } catch (err) { console.warn('Ошибка при difference:', err); }
      }
      if (geom) processed.push({ ...cur, geometry: geom.geometry });
    }

    const markersLayer = L.layerGroup().addTo(map);

    L.geoJSON({ type: "FeatureCollection", features: processed }, {
      pointToLayer: (f, latlng) => {
        const m = L.marker(latlng, { icon: whiteMachineIcon, bubblingMouseEvents: false });
        m.bindPopup(createPopupContent(f), { maxWidth: 300, minWidth: 150, className: 'dark-popup' });
        markersLayer.addLayer(m);
        return m;
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
      onEachFeature: (f, l) => {
        if (f.geometry.type !== 'Point')
          l.bindPopup(createPopupContent(f), { maxWidth: 300, minWidth: 150, className: 'dark-popup' });
      }
    }).addTo(map);
  })
  .catch(err => {
    console.error("Loading error:", err);
    document.getElementById('error').innerHTML =
      `<b>Ошибка загрузки данных</b><br>${err.message}`;
  });

  const get = id => document.getElementById(id);

const audioPlayer = get('audio-player'),
  playPauseBtn = get('play-pause-btn'),
  prevBtn = get('prev-btn'),
  nextBtn = get('next-btn'),
  volumeBtn = get('volume-btn'),
  volumeSlider = get('volume-slider'),
  progressContainer = get('progress-container'),
  progressBar = get('progress-bar'),
  currentTimeEl = get('current-time'),
  totalTimeEl = get('total-time'),
  trackTitleEl = get('track-title'),
  minimizeBtn = get('minimize-btn'),
  playIcon = get('play-icon'),
  pauseIcon = get('pause-icon'),
  volumeHighIcon = get('volume-high'),
  volumeMuteIcon = get('volume-mute'),
  expandIcon = get('expand-icon'),
  collapseIcon = get('collapse-icon');

const tracks = [
  { element: get('track1'), title: "TNO OST - Toolbox Theory" },
  { element: get('track2'), title: "The New Order: Russian Fairytale" },
  { element: get('track3'), title: "Half-Life 2: Particle Ghost (Remix)" },
  { element: get('track4'), title: "TNO OST - Burgundian Lullaby" },
  { element: get('track5'), title: "TNO OST - Between the Bombings" }
];

let currentTrackIndex = Math.floor(Math.random() * tracks.length),
  isPlaying = false,
  isDragging = false,
  wasPlaying = false;

const formatTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function updateTrackInfo() {
  const track = tracks[currentTrackIndex];
  trackTitleEl.textContent = track.title;
  totalTimeEl.textContent = formatTime(track.element.duration || 0);
}

function updateProgress() {
  if (isDragging) return;
  const t = tracks[currentTrackIndex].element;
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
  v = Math.max(0, Math.min(1, v));
  tracks.forEach(t => t.element.volume = v);
  volumeSlider.value = v;
  updateVolumeBtn();
  localStorage.setItem('playerVolume', v);
}

function playTrack() {
  tracks.forEach(t => { t.element.pause(); t.element.currentTime = 0; });
  const t = tracks[currentTrackIndex].element;
  t.play().then(() => {
    isPlaying = true;
    updatePlayPauseBtn();
    updateTrackInfo();
    updateVolumeBtn();
  }).catch(err => {
    console.error("Playback failed:", err);
    playNextTrack();
  });
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

function togglePlayPause() {
  const t = tracks[currentTrackIndex].element;
  if (isPlaying) {
    t.pause();
    isPlaying = false;
  } else {
    t.play().then(() => isPlaying = true).catch(err => console.error("Playback failed:", err));
  }
  updatePlayPauseBtn();
}

function seekTo(e) {
  if (!isDragging) return;
  const t = tracks[currentTrackIndex].element;
  const rect = progressContainer.getBoundingClientRect();
  const pos = (e.clientX - rect.left) / rect.width;
  t.currentTime = pos * t.duration;
  updateProgress();
}

function onSeekStart(e) {
  isDragging = true;
  wasPlaying = isPlaying;
  const t = tracks[currentTrackIndex].element;
  if (isPlaying) {
    t.pause();
    isPlaying = false;
    updatePlayPauseBtn();
  }
  seekTo(e);
}

function onSeekEnd() {
  if (isDragging) {
    isDragging = false;
    if (wasPlaying) {
      const t = tracks[currentTrackIndex].element;
      t.play().then(() => {
        isPlaying = true;
        updatePlayPauseBtn();
      }).catch(err => console.error("Playback failed:", err));
    }
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
document.onmousemove = e => isDragging && seekTo(e);
document.onmouseup = onSeekEnd;

progressContainer.ontouchstart = e => onSeekStart(e.touches[0]);
document.ontouchmove = e => isDragging && seekTo(e.touches[0]);
document.ontouchend = onSeekEnd;

minimizeBtn.onclick = () => {
  audioPlayer.classList.toggle('minimized');
  audioPlayer.classList.toggle('expanded');
  const minimized = audioPlayer.classList.contains('minimized');
  expandIcon.style.display = minimized ? 'block' : 'none';
  collapseIcon.style.display = minimized ? 'none' : 'block';
};

tracks.forEach((t, i) => {
  t.element.addEventListener('ended', playNextTrack);
  t.element.addEventListener('timeupdate', updateProgress);
  t.element.addEventListener('loadedmetadata', updateTrackInfo);
  t.element.addEventListener('error', e => {
    console.error(`Track ${i} error:`, e);
    playNextTrack();
  });
});

const savedVolume = localStorage.getItem('playerVolume');
setVolume(savedVolume !== null ? parseFloat(savedVolume) : 0.5);

function autoPlayOnInteraction() {
  if (!isPlaying) playTrack();
  ['click', 'keydown', 'touchstart'].forEach(e => document.removeEventListener(e, autoPlayOnInteraction));
}
['click', 'keydown', 'touchstart'].forEach(e => document.addEventListener(e, autoPlayOnInteraction));

updateTrackInfo();

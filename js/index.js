
document.querySelector('.nav-toggle').addEventListener('click', function() {
  this.classList.toggle('clicked');
  document.querySelector('.menu-links').classList.toggle('show');
});

const carouselItems = document.querySelectorAll('.carousel-item');
const carouselInner = document.querySelector('.carousel-inner');
const indicatorsContainer = document.querySelector('.carousel-indicators');
let currentIndex = 0;

// Функция для определения количества элементов для отображения
function getItemsPerView() {
  const width = window.innerWidth;
  if (width <= 480) {
    return 1; // 1 элемент для мобильных устройств
  } else if (width <= 768) {
    return 2; // 2 элемента для планшетов
  } else {
    return 3; // 3 элемента для ПК
  }
}

// Функция для обновления индикаторов
function updateIndicators() {
  const itemsPerView = getItemsPerView();
  const totalSlides = Math.ceil(carouselItems.length / itemsPerView);
  indicatorsContainer.innerHTML = ''; // Очищаем контейнер перед добавлением

  for (let i = 0; i < totalSlides; i++) {
    const indicator = document.createElement('div');
    indicator.classList.add('indicator');
    if (i === currentIndex) {
      indicator.classList.add('active');
    }
    indicator.addEventListener('click', () => goToSlide(i));
    indicatorsContainer.appendChild(indicator);
  }
}

// Функция для перехода к нужному слайду
function goToSlide(index) {
  const itemsPerView = getItemsPerView();
  const totalSlides = Math.ceil(carouselItems.length / itemsPerView);

  // Обновляем текущий индекс
  currentIndex = (index + totalSlides) % totalSlides; // Зацикливаем индекс

  // Устанавливаем прозрачность элементов
  carouselItems.forEach((item, idx) => {
    if (idx >= currentIndex * itemsPerView && idx < currentIndex * itemsPerView + itemsPerView) {
      item.style.opacity = 0; // Убираем видимость перед переходом
    }
  });

  // Применяем смещение для карусели
  const offset = -currentIndex * itemsPerView * (100 / itemsPerView);
  carouselInner.style.transform = `translateX(${offset}%)`;

  // После установки смещения, показываем элементы плавно
  setTimeout(() => {
    carouselItems.forEach((item, idx) => {
      if (idx >= currentIndex * itemsPerView && idx < currentIndex * itemsPerView + itemsPerView) {
        item.style.opacity = 1; // Восстанавливаем видимость
        item.style.transition = 'opacity 3.5s'; // Устанавливаем плавный переход
      }
    });
  }, 100); // Небольшая задержка для плавного появления
}

// Функция для переключения на следующий набор слайдов
function handleNext() {
  goToSlide(currentIndex + 1); // Переход к следующему индексу
}

// Функция для переключения на предыдущий набор слайдов
function handlePrev() {
  goToSlide(currentIndex - 1); // Переход к предыдущему индексу
}

// События для кнопок
document.querySelector('.carousel-next').addEventListener('click', handleNext);
document.querySelector('.carousel-prev').addEventListener('click', handlePrev);

// Обновляем индикаторы и начинаем с первого слайда
updateIndicators();
goToSlide(currentIndex);

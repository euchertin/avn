document.querySelector('.nav-toggle').addEventListener('click', function() {
  this.classList.toggle('clicked');
  document.querySelector('.menu-links').classList.toggle('show');
});

// Функция для инициализации карусели
function initCarousel(carouselClass, indicatorsClass) {
  const carouselItems = document.querySelectorAll(`${carouselClass} .carousel-item`);
  const carouselInner = document.querySelector(`${carouselClass} .carousel-inner`);
  const indicatorsContainer = document.querySelector(indicatorsClass);
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

    // Обновляем текущий индекс, ограничивая его до максимального значения
    currentIndex = Math.max(0, Math.min(index, totalSlides - 1)); // Ограничиваем текущий индекс

    // Применяем смещение для карусели
    const offset = -currentIndex * itemsPerView * (100 / itemsPerView);
    carouselInner.style.transform = `translateX(${offset}%)`;

    // Обновляем индикаторы
    updateIndicators();

    // Устанавливаем прозрачность элементов для плавного перехода
    carouselItems.forEach((item, idx) => {
      if (idx >= currentIndex * itemsPerView && idx < currentIndex * itemsPerView + itemsPerView) {
        item.style.opacity = 0; // Убираем видимость перед переходом
      } else {
        item.style.opacity = 1; // Восстанавливаем видимость для остальных
      }
    });

    // После установки смещения, показываем элементы плавно
    setTimeout(() => {
      carouselItems.forEach((item, idx) => {
        if (idx >= currentIndex * itemsPerView && idx < currentIndex * itemsPerView + itemsPerView) {
          item.style.transition = 'opacity 0.5s'; // Устанавливаем плавный переход
          item.style.opacity = 1; // Восстанавливаем видимость
        }
      });
    }, 100); // Небольшая задержка для плавного появления
  }

  // Функция для переключения на следующий набор слайдов
  function handleNext() {
    const itemsPerView = getItemsPerView();
    const totalSlides = Math.ceil(carouselItems.length / itemsPerView);
    goToSlide(currentIndex + 1 < totalSlides ? currentIndex + 1 : currentIndex);
  }

  // Функция для переключения на предыдущий набор слайдов
  function handlePrev() {
    goToSlide(currentIndex - 1 >= 0 ? currentIndex - 1 : currentIndex);
  }

  // События для кнопок
  document.querySelector(`${carouselClass} .carousel-next`).addEventListener('click', handleNext);
  document.querySelector(`${carouselClass} .carousel-prev`).addEventListener('click', handlePrev);

  // Обновляем индикаторы и начинаем с первого слайда
  updateIndicators();
  goToSlide(currentIndex);
}

// Инициализация двух каруселей
initCarousel('.second-carousel', '.second-carousel .carousel-indicators');
initCarousel('.first-carousel', '.first-carousel .carousel-indicators');

// Обработка нажатий на элементы второго карусели
document.getElementById("3").onclick = function() {
  window.open("https://vk.com/wall-201784905_1924", "_blank"); 
};

document.getElementById("2").onclick = function() {
  window.open("https://vk.com/wall-201784905_1925", "_blank"); 
};

document.getElementById("1").onclick = function() {
  window.open("https://vk.com/wall-201784905_1926", "_blank"); 
}; 

const menuLinks = document.querySelector('.menu-links');
if (menuLinks) {
  menuLinks.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

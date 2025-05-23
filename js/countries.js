// Получаем элементы
const searchInput = document.querySelector('.search-input');
const countryBlocks = document.querySelectorAll('.country-block');

searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim().toLowerCase();

  countryBlocks.forEach(block => {
    // Берём текст страны из блока (например, внутри .country-text)
    const countryName = block.querySelector('.country-text').textContent.toLowerCase();

    // Показываем блок, если он содержит запрос, иначе скрываем
    if (countryName.includes(query)) {
      block.style.display = 'flex';
    } else {
      block.style.display = 'none';
    }
  });
});

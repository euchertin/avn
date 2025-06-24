const searchInput = document.querySelector('.search-input');

searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim().toLowerCase();

  // Получаем все текущие блоки (вдруг они добавились позже)
  const countryBlocks = document.querySelectorAll('.country-block');

  countryBlocks.forEach(block => {
    const countryTextElement = block.querySelector('.country-text');
    if (!countryTextElement) return;

    const countryName = countryTextElement.textContent.toLowerCase();

    if (countryName.includes(query)) {
      block.style.display = 'flex';
    } else {
      block.style.display = 'none';
    }
  });
});

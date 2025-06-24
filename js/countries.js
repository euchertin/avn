const searchInput = document.querySelector('.search-input');

searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim().toLowerCase();
  const countryBlocks = document.querySelectorAll('.country-block');

  countryBlocks.forEach(block => {
    const countryTextElement = block.querySelector('.country-text');
    if (!countryTextElement) {
      console.warn('Нет элемента .country-text в блоке', block);
      return;
    }

    const countryName = countryTextElement.textContent.trim().toLowerCase();
    console.log('Ищем в:', countryName);

    if (countryName.includes(query)) {
      block.style.display = 'flex';
    } else {
      block.style.display = 'none';
    }
  });
});

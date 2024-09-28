document.querySelector('.nav-toggle').addEventListener('click', function() {
    this.classList.toggle('clicked');
    document.querySelector('.menu-links').classList.toggle('show');
  });
  

firebase.initializeApp(firebaseConfig);

// Уведомления
const notification = document.getElementById('notification');

const showNotification = (message) => {
  notification.textContent = message;
  notification.classList.add('visible');
  setTimeout(() => {
    notification.classList.remove('visible');
  }, 3000);
};

// Обработка отправки формы входа
document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    // Авторизация через Firebase
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    showNotification('Успешный вход!');
    console.log(userCredential.user);
    // Перенаправление на другую страницу
    window.location.href = 'feed.html';
  } catch (error) {
    showNotification(`Неверный логин или пароль`);
  }
});

// Переключение темы
const themeToggle = document.getElementById("themeToggle");

function setTheme() {
  const currentTheme = localStorage.getItem('theme') || 'light';
  document.body.classList.remove('light-mode', 'dark-mode');
  document.body.classList.add(currentTheme + '-mode');

  if (currentTheme === 'dark') {
    themeToggle.querySelector("i").classList.remove("fa-sun");
    themeToggle.querySelector("i").classList.add("fa-moon");
  } else {
    themeToggle.querySelector("i").classList.remove("fa-moon");
    themeToggle.querySelector("i").classList.add("fa-sun");
  }
}

setTheme();

themeToggle.addEventListener("click", function () {
  document.body.classList.toggle("dark-mode");
  document.body.classList.toggle("light-mode");

  const newTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
  localStorage.setItem('theme', newTheme);

  themeToggle.querySelector("i").classList.toggle("fa-sun");
  themeToggle.querySelector("i").classList.toggle("fa-moon");
});

// Переключение видимости пароля
document.getElementById('togglePassword').addEventListener('click', () => {
  const passwordField = document.getElementById('password');
  const passwordIcon = document.getElementById('passwordIcon');
  const isPasswordVisible = passwordField.type === 'text';

  passwordField.type = isPasswordVisible ? 'password' : 'text';
  passwordIcon.classList.toggle('fa-eye', isPasswordVisible);
  passwordIcon.classList.toggle('fa-eye-slash', !isPasswordVisible);
});
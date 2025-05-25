
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
  import {
    getFirestore,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    deleteDoc,
    doc,
    updateDoc
  } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

  const IMGBB_API_KEY = "8991694a4eefb36967a0130b1383d524";
  const VK_BOT_TOKEN = "3Idyx-CQCI-nIY_g16UKqc1lLvBF30lpM2MyveqSmu9fqbo5fEwO5QzvMBXww77SDQtGY2m4nVoQD_10YmZKZK6QeYBMHEWz6y1_Apc2v_vatHjFe63gdw8bOZx2gDTYR89qhvy-w2zJV9bMUdrGXLWQI0Sl-wYkaFUwrh_VFW8KsPv1zk0GaEcXaI2IV_joliBUxiuI9UQ_QLGxAeOHaA";
  const ADMIN_VK_ID = "";

  const firebaseConfig = {
    apiKey: "AIzaSyD1mSa0TpadaUqX5QxNoHaCJWWuJ8sXeLM",
    authDomain: "vgovernments-6c294.firebaseapp.com",
    projectId: "vgovernments-6c294",
    storageBucket: "vgovernments-6c294.appspot.com",
    messagingSenderId: "795317676699",
    appId: "1:795317676699:web:af8649e04af6216d14743e"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // Глобальная функция для превью изображений
  window.previewImage = function(input, fieldClass) {
    const file = input.files[0];
    if (!file) return;

    // Проверка типа файла
    if (!file.type.match('image.*')) {
      alert('Пожалуйста, выберите изображение');
      input.value = '';
      return;
    }

    // Проверка размера файла (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Размер изображения не должен превышать 5MB');
      input.value = '';
      return;
    }

    const container = document.querySelector(`.${fieldClass}`);
    const uploadText = container.querySelector('.upload-text');
    
    if (uploadText) {
      uploadText.style.display = 'none';
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      const oldImg = container.querySelector('img');
      if (oldImg) oldImg.remove();
      
      const img = document.createElement('img');
      img.src = e.target.result;
      container.appendChild(img);
    };
    reader.readAsDataURL(file);
  };

  // Функция для экранирования HTML
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function uploadToImgBB(file) {
    if (!file) return "";
    
    // Дополнительные проверки файла
    if (!file.type.match('image.*')) {
      throw new Error('Недопустимый тип файла. Пожалуйста, загрузите изображение.');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Размер изображения не должен превышать 5MB');
    }

    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Ошибка загрузки на imgBB');
      }
      
      return data.data.url;
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      throw new Error('Не удалось загрузить изображение. Попробуйте ещё раз.');
    }
  }

  async function sendVKNotification(applicationData) {
    try {
      const message = `Новая заявка на вступление:\n\n` +
        `Страна: ${applicationData.unitary}\n` +
        `Форма правления: ${applicationData.ruleForm}\n` +
        `Правитель: ${applicationData.rulerName}\n` +
        `Население: ${applicationData.population}\n\n` +
        `Для принятия ответьте "принять ${applicationData.unitary}"\n` +
        `Для отклонения ответьте "отклонить"`;
      
      const response = await fetch(`https://api.vk.com/method/messages.send?` +
        `access_token=${VK_BOT_TOKEN}&` +
        `user_id=${ADMIN_VK_ID}&` +
        `message=${encodeURIComponent(message)}&` +
        `random_id=${Math.floor(Math.random() * 1000000)}&` +
        `v=5.131`);
      
      const result = await response.json();
      
      if (result.error) {
        console.error('Ошибка отправки уведомления:', result.error);
      }
    } catch (error) {
      console.error('Ошибка отправки уведомления:', error);
    }
  }

  function validateForm(form) {
    if (!form.checkValidity()) {
      form.reportValidity();
      return false;
    }
    
    // Проверка файлов
    const flagFile = document.getElementById('flag-input').files[0];
    const photoFile = document.getElementById('photo-input').files[0];
    const valutaFile = document.getElementById('valuta-input').files[0];
    
    if (!flagFile || !photoFile || !valutaFile) {
      alert('Пожалуйста, загрузите все необходимые изображения');
      return false;
    }
    
    // Проверка размеров файлов
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (flagFile.size > maxSize || photoFile.size > maxSize || valutaFile.size > maxSize) {
      alert('Размер каждого изображения не должен превышать 5MB');
      return false;
    }
    
    return true;
  }

  let currentVkID = localStorage.getItem("vkID") || "";

  async function submitApplication(event) {
    event.preventDefault();
    const form = event.target;

    if (!validateForm(form)) return;

    if (!currentVkID) {
      openPopup();
      return;
    }

    const submitBtn = form.querySelector(".submit-btn");
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Отправка...";

    try {
      // Экранирование всех текстовых полей
      const applicationData = {
        unitary: escapeHtml(form.unitary.value.trim()),
        ruleForm: escapeHtml(form.ruleForm.value.trim()),
        religion: escapeHtml(form.religion.value.trim()),
        population: escapeHtml(form.population.value.trim()),
        recognition: escapeHtml(form.recognition.value.trim()),
        description: escapeHtml(form.description.value.trim()),
        rulerName: escapeHtml(form.rulerName.value.trim()),
        currencyName: escapeHtml(form.currencyName.value.trim()),
        vkID: currentVkID,
        status: "pending", // Статус по умолчанию - на рассмотрении
        timestamp: new Date()
      };

      // Загрузка изображений
      const flagFile = form.flag.files[0];
      const photoFile = form.photo.files[0];
      const valutaFile = form.valuta.files[0];

      const [flagUrl, rulerPhotoUrl, currencyPhotoUrl] = await Promise.all([
        uploadToImgBB(flagFile),
        uploadToImgBB(photoFile),
        uploadToImgBB(valutaFile)
      ]);

      // Добавление URL изображений к данным
      applicationData.flagUrl = flagUrl;
      applicationData.rulerPhotoUrl = rulerPhotoUrl;
      applicationData.currencyPhotoUrl = currencyPhotoUrl;

      // Сохранение в Firestore
      const docRef = await addDoc(collection(db, "applications"), applicationData);
      
      // Отправка уведомления в VK
      await sendVKNotification(applicationData);

      alert("Заявка отправлена успешно! Она будет рассмотрена администратором.");
      form.reset();
      
      // Очищаем превью изображений
      document.querySelectorAll('.flag-field, .photo-field, .valuta-field').forEach(field => {
        const img = field.querySelector('img');
        const text = field.querySelector('.upload-text');
        if (img) img.remove();
        if (text) text.style.display = '';
      });
    } catch (error) {
      console.error("Ошибка при отправке:", error);
      alert("Ошибка: " + error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  }

  // Функция для обработки принятия заявки
  async function approveApplication(countryName) {
    try {
      // Находим заявку по названию страны
      const q = query(
        collection(db, "applications"),
        where("unitary", "==", countryName),
        where("status", "==", "pending")
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log("Заявка не найдена или уже обработана");
        return;
      }
      
      // Обновляем статус заявки
      const docRef = querySnapshot.docs[0].ref;
      await updateDoc(docRef, {
        status: "approved"
      });
      
      console.log(`Заявка для страны "${countryName}" принята`);
    } catch (error) {
      console.error("Ошибка при принятии заявки:", error);
    }
  }

  // Функция для обработки отклонения заявки
  async function rejectApplication() {
    try {
      // Находим последнюю заявку в статусе pending
      const q = query(
        collection(db, "applications"),
        where("status", "==", "pending"),
        orderBy("timestamp", "desc"),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log("Нет заявок на рассмотрении");
        return;
      }
      
      // Удаляем заявку
      const docRef = querySnapshot.docs[0].ref;
      await deleteDoc(docRef);
      
      console.log("Последняя заявка отклонена и удалена");
    } catch (error) {
      console.error("Ошибка при отклонении заявки:", error);
    }
  }

  // Инициализация формы
  const form = document.getElementById("application-form");
  if (form) {
    form.addEventListener("submit", submitApplication);
  }

  // Popup для ввода VK ID
  const popup = document.getElementById("popup");
  const vkInput = document.getElementById("vk-id-input");
  const vkError = document.getElementById("vk-error");
  const popupOkBtn = document.getElementById("popup-ok-btn");

  function openPopup() {
    if (popup) {
      vkInput.value = currentVkID;
      vkError.textContent = "";
      popup.style.display = "flex";
      vkInput.focus();
    }
  }

  function closePopup() {
    if (popup) popup.style.display = "none";
  }

  if (popupOkBtn) {
    popupOkBtn.addEventListener("click", () => {
      const val = vkInput.value.trim();
      if (!val) {
        vkError.textContent = "Пожалуйста, введите ваш VK ID";
        vkInput.focus();
        return;
      }
      
      // Проверка формата VK ID
      if (!/^[a-zA-Z0-9_\-\.]+$/.test(val)) {
        vkError.textContent = "Некорректный формат VK ID";
        vkInput.focus();
        return;
      }
      
      currentVkID = val;
      localStorage.setItem("vkID", val);
      closePopup();
    });
  }

  // Проверка наличия VK ID при загрузке страницы
  window.addEventListener("load", () => {
    if (!currentVkID) {
      openPopup();
    }
  });

  // Привязка кликов к видимым дивам для файлов
  document.querySelectorAll(".flag-field").forEach(div => {
    div.addEventListener("click", () => {
      document.getElementById("flag-input").click();
    });
    div.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        document.getElementById("flag-input").click();
      }
    });
  });

  document.querySelectorAll(".photo-field").forEach(div => {
    div.addEventListener("click", () => {
      document.getElementById("photo-input").click();
    });
    div.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        document.getElementById("photo-input").click();
      }
    });
  });

  document.querySelectorAll(".valuta-field").forEach(div => {
    div.addEventListener("click", () => {
      document.getElementById("valuta-input").click();
    });
    div.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        document.getElementById("valuta-input").click();
      }
    });
  });

  document.getElementById('flag-input')?.addEventListener('change', function() {
  previewImage(this, 'flag-field');
});

document.getElementById('photo-input')?.addEventListener('change', function() {
  previewImage(this, 'photo-field');
});

document.getElementById('valuta-input')?.addEventListener('change', function() {
  previewImage(this, 'valuta-field');
});
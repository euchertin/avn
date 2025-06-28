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

window.previewImage = function(input, fieldClass) {
  const file = input.files[0];
  if (!file) return;
  if (!file.type.match('image.*')) {
    alert('Пожалуйста, выберите изображение');
    input.value = '';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    alert('Размер изображения не должен превышать 5MB');
    input.value = '';
    return;
  }

  const container = document.querySelector(`.${fieldClass}`);
  const uploadText = container.querySelector('.upload-text');
  if (uploadText) uploadText.style.display = 'none';

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
  if (!file.type.match('image.*')) throw new Error('Недопустимый тип файла.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Размер изображения не должен превышать 5MB');

  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Ошибка загрузки');

  return data.data.url;
}

function validateForm(form) {
  if (!form.checkValidity()) {
    form.reportValidity();
    return false;
  }

  const flagFile = document.getElementById('flag-input').files[0];
  const photoFile = document.getElementById('photo-input').files[0];
  const valutaFile = document.getElementById('valuta-input').files[0];

  if (!flagFile || !photoFile || !valutaFile) {
    alert('Пожалуйста, загрузите все необходимые изображения');
    return false;
  }

  const maxSize = 5 * 1024 * 1024;
  if (flagFile.size > maxSize || photoFile.size > maxSize || valutaFile.size > maxSize) {
    alert('Размер каждого изображения не должен превышать 5MB');
    return false;
  }

  return true;
}

const allowedRuleForms = [
  "Президентская республика",
  "Парламентская республика",
  "Смешанная республика",
  "Однопартийная республика",
  "Советская республика",
  "Исламская республика",
  "Военная республика",
  "Абсолютная монархия",
  "Конституционная монархия",
  "Парламентская монархия",
  "Дуалистическая монархия",
  "Военная диктатура",
  "Гражданская диктатура",
  "Хунта",
  "Теократия",
  "Иерархическая теократия",
  "Религиозная монархия",
  "Переходное правительство",
  "Временное правительство",
  "Революционное правительство",
  "Анархия",
  "Технократия",
  "Охлократия",
  "Меритократия",
  "Корпоратократия",
  "Иное (по решению администрации)"
];

const allowedRecognitions = [
  "Унитарное",
  "Федеративное",
  "Конфедеративное"
];


async function submitApplication(event) {
  event.preventDefault();
  const form = event.target;
  if (!validateForm(form)) return;

  const submitBtn = form.querySelector(".submit-btn");
  const originalBtnText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Отправка...";

  try {
    const applicationData = {
      unitary: escapeHtml(form.unitary.value.trim()),
      ruleForm: escapeHtml(form.ruleForm.value.trim()),
      religion: escapeHtml(form.religion.value.trim()),
      population: escapeHtml(form.population.value.trim()),
      recognition: escapeHtml(form.recognition.value.trim()),
      description: escapeHtml(form.description.value.trim()),
      rulerName: escapeHtml(form.rulerName.value.trim()),
      currencyName: escapeHtml(form.currencyName.value.trim()),
      status: "pending",
      timestamp: new Date()
    };

    // Валидация строго по спискам
if (!allowedRuleForms.includes(applicationData.ruleForm)) {
  alert("Пожалуйста, выберите допустимую форму правления из списка.");
  submitBtn.disabled = false;
  submitBtn.textContent = originalBtnText;
  return;
}

if (!allowedRecognitions.includes(applicationData.recognition)) {
  alert("Пожалуйста, выберите допустимый тип устройства государства из списка.");
  submitBtn.disabled = false;
  submitBtn.textContent = originalBtnText;
  return;
}


    const flagFile = form.flag.files[0];
    const photoFile = form.photo.files[0];
    const valutaFile = form.valuta.files[0];

    const [flagUrl, rulerPhotoUrl, currencyPhotoUrl] = await Promise.all([
      uploadToImgBB(flagFile),
      uploadToImgBB(photoFile),
      uploadToImgBB(valutaFile)
    ]);

    applicationData.flagUrl = flagUrl;
    applicationData.rulerPhotoUrl = rulerPhotoUrl;
    applicationData.currencyPhotoUrl = currencyPhotoUrl;

    await addDoc(collection(db, "applications"), applicationData);

    alert("Заявка отправлена успешно!");
    form.reset();

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

async function approveApplication(countryName) {
  try {
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

    const docRef = querySnapshot.docs[0].ref;
    await updateDoc(docRef, { status: "approved" });
    console.log(`Заявка для страны "${countryName}" принята`);
  } catch (error) {
    console.error("Ошибка при принятии заявки:", error);
  }
}

async function rejectApplication() {
  try {
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

    const docRef = querySnapshot.docs[0].ref;
    await deleteDoc(docRef);
    console.log("Последняя заявка отклонена и удалена");
  } catch (error) {
    console.error("Ошибка при отклонении заявки:", error);
  }
}

const form = document.getElementById("application-form");
if (form) form.addEventListener("submit", submitApplication);

["flag", "photo", "valuta"].forEach(type => {
  document.querySelectorAll(`.${type}-field`).forEach(div => {
    div.addEventListener("click", () => document.getElementById(`${type}-input`).click());
    div.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        document.getElementById(`${type}-input`).click();
      }
    });
  });
  document.getElementById(`${type}-input`)?.addEventListener("change", function () {
    previewImage(this, `${type}-field`);
  });
});

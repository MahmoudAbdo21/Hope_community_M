let isAdmin = localStorage.getItem('isAdmin') === 'true';
let currentOpenCategory = { type: null, name: null };
let tempLogoBase64 = null; 
let currentNewsImageBase64 = null;
let currentSchoolImageBase64 = null;
let editingNewsId = null;
let editingItemId = null;
let editingSchoolId = null;

function getExactTime() {
    let now = new Date();
    let datePart = now.toLocaleDateString('ar-EG');
    let timePart = now.toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'});
    return `${datePart} | الساعة: ${timePart}`;
}

window.addEventListener('load', function() {
    setTimeout(function() { document.getElementById('splash-screen').classList.add('hidden'); }, 1500); 
    if(isAdmin) document.getElementById('admin-lock-icon').style.color = '#ff4d4d';

    if (typeof defaultData !== 'undefined' && !localStorage.getItem('isDataLoaded')) {
        for (let key in defaultData) { if (defaultData[key]) localStorage.setItem(key, defaultData[key]); }
        localStorage.setItem('isDataLoaded', 'true');
    }
    applyAdminRights(); loadSettings(); loadProfilePic(); loadNews(); loadCategories('signs'); loadCategories('books'); loadSchools();
});

function switchTab(tabId) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item, .nav-item-mobile').forEach(l => l.classList.remove('active'));
    document.getElementById(tabId + '-tab').classList.add('active');
    document.querySelectorAll(`[onclick="switchTab('${tabId}')"]`).forEach(l => l.classList.add('active'));
    if(window.innerWidth < 1200) { document.getElementById('sidebar').classList.remove('active'); document.getElementById('overlay').classList.remove('active'); }
}
function toggleMenu() { document.getElementById('sidebar').classList.toggle('active'); document.getElementById('overlay').classList.toggle('active'); }

function promptAdminPin() {
    if(isAdmin) { if(confirm("الخروج من وضع الإدارة؟")) { localStorage.setItem('isAdmin', 'false'); location.reload(); } return; }
    let pin = prompt("الرقم السري:");
    if(pin === "2026") { localStorage.setItem('isAdmin', 'true'); alert("تم الدخول!"); location.reload(); } else if(pin !== null) { alert("رمز خاطئ!"); }
}
function applyAdminRights() { if(isAdmin) { document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block'); } }

// ================= نظام تكبير الصور الاحترافي (Lightbox) =================
function openImageModal(src) {
    let modal = document.getElementById('custom-image-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'custom-image-modal';
        modal.innerHTML = `
            <span style="position:absolute; top:20px; right:30px; color:white; font-size:45px; font-weight:bold; cursor:pointer; z-index:10001;" onclick="closeImageModal()">&times;</span>
            <img id="modal-img-content" src="" style="max-width:90%; max-height:90%; border-radius:10px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); object-fit: contain;">
        `;
        Object.assign(modal.style, {
            display: 'none', position: 'fixed', zIndex: '10000', left: '0', top: '0', 
            width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.9)', 
            backdropFilter: 'blur(5px)', justifyContent: 'center', alignItems: 'center'
        });
        modal.onclick = function(e) { if(e.target === modal) closeImageModal(); }; 
        document.body.appendChild(modal);
    }
    document.getElementById('modal-img-content').src = src;
    modal.style.display = 'flex';
}
function closeImageModal() { document.getElementById('custom-image-modal').style.display = 'none'; }

function compressImage(file, callback) {
    if(!file) { callback(null); return; }
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = e => {
        const img = new Image(); img.src = e.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas'); const MAX = 800; 
            let w = img.width; let h = img.height;
            if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } } else { if (h > MAX) { w *= MAX / h; h = MAX; } }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            callback(canvas.toDataURL('image/jpeg', 0.8)); 
        }
    }
}

function convertSmartUrl(url) {
    if (!url) return null;
    let ytMatch = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
    if (ytMatch && ytMatch[2].length == 11) return 'https://www.youtube.com/embed/' + ytMatch[2];
    let driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
    if (driveMatch) return 'https://drive.google.com/file/d/' + driveMatch[1] + '/preview';
    return url;
}

function loadSettings() {
    let name = localStorage.getItem('siteName') || 'مجتمع الأمل'; let logo = localStorage.getItem('siteLogo') || 'img/logo.png';
    document.getElementById('display-name').innerText = name; document.getElementById('display-logo').src = logo; document.getElementById('setting-name').value = name;
}
function previewLogoFile(e) { compressImage(e.target.files[0], data => { tempLogoBase64 = data; alert("تم اختيار اللوجو، اضغط حفظ."); }); }
function saveSiteSettings() {
    let newName = document.getElementById('setting-name').value;
    if(newName) localStorage.setItem('siteName', newName);
    if(tempLogoBase64) { localStorage.setItem('siteLogo', tempLogoBase64); tempLogoBase64 = null; }
    loadSettings(); alert('تم الحفظ!');
}
function loadProfilePic() { let pic = localStorage.getItem('adminProfilePic') || 'img/profile.png'; document.getElementById('home-profile-pic').src = pic; return pic; }
function updateProfilePic(e) { compressImage(e.target.files[0], data => { localStorage.setItem('adminProfilePic', data); loadProfilePic(); loadNews(); alert('تم تغيير الصورة!'); }); }

// ================= المحلل الذكي للروابط (السر هنا) =================
function renderSmartMedia(uploadedImg, linkUrl, originalLink) {
    let imgStyle = 'width: 100%; max-height: 450px; object-fit: cover; border-radius: 12px; margin-top: 15px; cursor: zoom-in; display: block; box-shadow: 0 4px 15px rgba(0,0,0,0.2);';
    let mediaHTML = '';

    // 1. لو رافع صورة من الجهاز هتتعرض هنا
    if (uploadedImg) {
        mediaHTML += `<img src="${uploadedImg}" style="${imgStyle}" onclick="openImageModal(this.src)">`;
    }

    // 2. لو حاطط رابط (بنشوف هو رابط صورة ولا يوتيوب)
    if (linkUrl) {
        // فحص هل الرابط لصورة
        let isImageLink = linkUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || linkUrl.includes('wikimedia') || linkUrl.includes('unsplash');
        
        if (isImageLink && !uploadedImg) {
            // لو رابط صورة، نعرضه كصورة مش كـ iframe
            mediaHTML += `<img src="${linkUrl}" style="${imgStyle}" onclick="openImageModal(this.src)">`;
        } else if (linkUrl.includes('youtube') || linkUrl.includes('preview')) {
            // لو فيديو يوتيوب أو درايف
            mediaHTML += `<iframe src="${linkUrl}" style="width: 100%; height: 300px; border-radius: 15px; margin-top: 15px; border: none; background: #141416;" allowfullscreen></iframe>`;
        } else if (!isImageLink) {
            // لو رابط عادي (زي كتاب PDF)
            mediaHTML += `<a href="${originalLink}" target="_blank" class="btn-outline w-100 mt-3 text-center"><i class="fa-solid fa-link"></i> فتح المرفق / الرابط</a>`;
        }
    }
    return mediaHTML;
}

// ================= الأخبار =================
function previewNewsImage(e) { compressImage(e.target.files[0], data => { currentNewsImageBase64 = data; document.getElementById('news-preview').src = data; document.getElementById('news-preview').style.display = 'block'; }); }

function addNews() {
    let text = document.getElementById('news-text').value; let videoUrlRaw = document.getElementById('news-video-url').value; let videoUrl = convertSmartUrl(videoUrlRaw);
    if(!text && !currentNewsImageBase64 && !videoUrl) return;
    
    let posts = JSON.parse(localStorage.getItem('my_news')) || [];
    let dateStr = getExactTime();

    if (editingNewsId) {
        let index = posts.findIndex(p => p.id === editingNewsId);
        if (index > -1) {
            posts[index].text = text; posts[index].videoUrl = videoUrl; posts[index].originalUrl = videoUrlRaw;
            if (currentNewsImageBase64) posts[index].image = currentNewsImageBase64;
            posts[index].date = dateStr + ' (مُعدل)'; 
        }
        editingNewsId = null; document.querySelector('#news-tab .btn-neon').innerText = "نشر الخبر";
    } else {
        posts.unshift({ id: Date.now(), text: text, image: currentNewsImageBase64, videoUrl: videoUrl, originalUrl: videoUrlRaw, date: dateStr });
    }

    localStorage.setItem('my_news', JSON.stringify(posts));
    document.getElementById('news-text').value = ''; document.getElementById('news-video-url').value = ''; document.getElementById('news-preview').style.display = 'none'; currentNewsImageBase64 = null; loadNews();
}

function editNews(id) {
    let posts = JSON.parse(localStorage.getItem('my_news')) || []; let post = posts.find(p => p.id === id); if(!post) return;
    document.getElementById('news-text').value = post.text || ''; document.getElementById('news-video-url').value = post.originalUrl || post.videoUrl || '';
    if(post.image) { document.getElementById('news-preview').src = post.image; document.getElementById('news-preview').style.display = 'block'; currentNewsImageBase64 = post.image; }
    editingNewsId = id; document.querySelector('#news-tab .btn-neon').innerText = "حفظ التعديلات"; window.scrollTo({ top: 0, behavior: 'smooth' });
}

function loadNews() {
    let posts = JSON.parse(localStorage.getItem('my_news')) || []; let feed = document.getElementById('news-feed'); let pic = loadProfilePic(); feed.innerHTML = '';
    posts.forEach(p => {
        // تشغيل المحلل الذكي هنا
        let mediaContent = renderSmartMedia(p.image, p.videoUrl, p.originalUrl);
        
        let editBtn = isAdmin ? `<button class="btn-warning-outline float-end mt-2 me-2" onclick="editNews(${p.id})"><i class="fa-solid fa-pen"></i></button>` : '';
        let delBtn = isAdmin ? `<button class="btn-danger-outline float-end mt-2" onclick="deleteData('my_news', ${p.id}, loadNews)"><i class="fa-solid fa-trash"></i></button>` : '';
        
        let textHTML = ''; let maxLength = 150; 
        if (p.text && p.text.length > maxLength) {
            let shortText = p.text.substring(0, maxLength) + '...';
            textHTML = `<div class="text-white mt-3" style="font-size: 16px; white-space: pre-wrap;" id="text-short-${p.id}">${shortText} <span class="text-neon fw-bold ms-2" style="cursor: pointer; font-size: 14px;" onclick="toggleText(${p.id}, 'more')">عرض المزيد</span></div>
                        <div class="text-white mt-3" style="font-size: 16px; white-space: pre-wrap; display: none;" id="text-full-${p.id}">${p.text} <span class="text-neon fw-bold ms-2" style="cursor: pointer; font-size: 14px;" onclick="toggleText(${p.id}, 'less')">عرض أقل</span></div>`;
        } else {
            textHTML = `<div class="text-white mt-3" style="font-size: 16px; white-space: pre-wrap;">${p.text || ''}</div>`;
        }
        
        let dateDisplay = p.date || getExactTime();

        feed.innerHTML += `<div class="card-dark mb-4" style="overflow:hidden;"><div class="d-flex align-items-center gap-3"><img src="${pic}" style="width:45px; height:45px; border-radius:50%; border:2px solid var(--neon);"><div><div class="text-white fw-bold">محمود عبدالرحمن</div><div style="font-size:13px; color: var(--neon); margin-top:3px;"><i class="fa-regular fa-clock"></i> ${dateDisplay}</div></div></div>${textHTML}${mediaContent} <div>${delBtn} ${editBtn}</div></div>`;
    });
}

function toggleText(id, action) {
    if (action === 'more') { document.getElementById(`text-short-${id}`).style.display = 'none'; document.getElementById(`text-full-${id}`).style.display = 'block'; } 
    else { document.getElementById(`text-short-${id}`).style.display = 'block'; document.getElementById(`text-full-${id}`).style.display = 'none'; }
}

// ================= الأقسام (إشارات ومكتبة) =================
function addCategory(type) { let input = document.getElementById(`new-${type.slice(0,-1)}-cat-name`); if(!input.value) return; let cats = JSON.parse(localStorage.getItem(`${type}_cats`)) || []; cats.push({ name: input.value, items: [] }); localStorage.setItem(`${type}_cats`, JSON.stringify(cats)); input.value = ''; loadCategories(type); }
function loadCategories(type) { let cats = JSON.parse(localStorage.getItem(`${type}_cats`)) || []; let grid = document.getElementById(`${type}-categories-grid`); grid.innerHTML = ''; cats.forEach((cat, idx) => { let delBtn = isAdmin ? `<i class="fa-solid fa-trash text-danger position-absolute" style="top:10px; left:10px; z-index:5;" onclick="event.stopPropagation(); deleteCategory('${type}', ${idx})"></i>` : ''; grid.innerHTML += `<div class="cat-btn" onclick="openCategory('${type}', '${cat.name}')">${delBtn}${cat.name}</div>`; }); }
function deleteCategory(type, idx) { if(confirm("حذف القسم بمحتوياته؟")) { let cats = JSON.parse(localStorage.getItem(`${type}_cats`)); cats.splice(idx, 1); localStorage.setItem(`${type}_cats`, JSON.stringify(cats)); loadCategories(type); } }
function openCategory(type, name) { currentOpenCategory = { type: type, name: name }; document.getElementById(`${type}-categories-view`).style.display = 'none'; document.getElementById(`${type}-items-view`).style.display = 'block'; document.getElementById(`current-${type.slice(0,-1)}-cat-title`).innerText = name; loadItems(type); }
function goBackToCategories(type) { document.getElementById(`${type}-categories-view`).style.display = 'block'; document.getElementById(`${type}-items-view`).style.display = 'none'; loadCategories(type); }

function addItem(type) {
    let isSign = type === 'signs'; let title = document.getElementById(isSign ? 'sign-title' : 'book-title').value; let desc = document.getElementById(isSign ? 'sign-desc' : 'book-desc').value; let file = document.getElementById(isSign ? 'sign-img' : 'book-img'); let vidRaw = document.getElementById(isSign ? 'sign-video' : 'book-video').value; let vid = convertSmartUrl(vidRaw);
    if(!title) return alert('أدخل العنوان');
    let dateStr = getExactTime();

    let processItem = (imgData) => {
        let cats = JSON.parse(localStorage.getItem(`${type}_cats`)); let idx = cats.findIndex(c => c.name === currentOpenCategory.name);
        if (editingItemId) {
            let itemIndex = cats[idx].items.findIndex(i => i.id === editingItemId);
            if(itemIndex > -1) {
                cats[idx].items[itemIndex].title = title; cats[idx].items[itemIndex].desc = desc; cats[idx].items[itemIndex].videoUrl = vid; cats[idx].items[itemIndex].originalUrl = vidRaw;
                if(imgData) cats[idx].items[itemIndex].image = imgData;
                cats[idx].items[itemIndex].date = dateStr + ' (مُعدل)';
            }
            editingItemId = null; document.querySelector(`#${type}-tab .btn-neon`).innerText = isSign ? "حفظ الإشارة" : "إضافة الكتاب";
        } else {
            cats[idx].items.push({ id: Date.now(), title: title, desc: desc, image: imgData, videoUrl: vid, originalUrl: vidRaw, date: dateStr });
        }
        localStorage.setItem(`${type}_cats`, JSON.stringify(cats)); loadItems(type);
        document.getElementById(isSign ? 'sign-title' : 'book-title').value = ''; document.getElementById(isSign ? 'sign-desc' : 'book-desc').value = ''; file.value = ''; document.getElementById(isSign ? 'sign-video' : 'book-video').value = '';
    };
    if(file.files[0]) compressImage(file.files[0], processItem); else processItem(null);
}

function editItem(type, itemId) {
    let isSign = type === 'signs'; let cats = JSON.parse(localStorage.getItem(`${type}_cats`)); let idx = cats.findIndex(c => c.name === currentOpenCategory.name); let item = cats[idx].items.find(i => i.id === itemId); if(!item) return;
    document.getElementById(isSign ? 'sign-title' : 'book-title').value = item.title; document.getElementById(isSign ? 'sign-desc' : 'book-desc').value = item.desc; document.getElementById(isSign ? 'sign-video' : 'book-video').value = item.originalUrl || item.videoUrl || '';
    editingItemId = itemId; document.querySelector(`#${type}-tab .btn-neon`).innerText = "حفظ التعديلات"; window.scrollTo({ top: 0, behavior: 'smooth' });
}

function loadItems(type) {
    let cats = JSON.parse(localStorage.getItem(`${type}_cats`)) || []; let cat = cats.find(c => c.name === currentOpenCategory.name); let list = document.getElementById(`${type}-items-list`); list.innerHTML = '';
    if(cat && cat.items) {
        cat.items.slice().reverse().forEach(item => {
            // تشغيل المحلل الذكي
            let mediaContent = renderSmartMedia(item.image, item.videoUrl, item.originalUrl);
            
            let dateDisplay = item.date ? `<div style="font-size:13px; color: var(--neon); margin-bottom: 10px;"><i class="fa-regular fa-clock"></i> ${item.date}</div>` : '';
            let editBtn = isAdmin ? `<button class="btn-warning-outline mt-3 w-50" onclick="editItem('${type}', ${item.id})"><i class="fa-solid fa-pen"></i> تعديل</button>` : '';
            let delBtn = isAdmin ? `<button class="btn-danger-outline mt-3 w-50" onclick="deleteItem('${type}', ${item.id})"><i class="fa-solid fa-trash"></i> حذف</button>` : '';
            list.innerHTML += `<div class="col-md-6 mb-3"><div class="card-dark h-100" style="overflow:hidden;"><h4 class="text-neon">${item.title}</h4>${dateDisplay}<p class="text-light mt-2" style="white-space: pre-wrap;">${item.desc}</p>${mediaContent}<div class="d-flex gap-2">${delBtn}${editBtn}</div></div></div>`;
        });
    }
}
function deleteItem(type, id) { if(confirm("تأكيد الحذف؟")) { let cats = JSON.parse(localStorage.getItem(`${type}_cats`)); let idx = cats.findIndex(c => c.name === currentOpenCategory.name); cats[idx].items = cats[idx].items.filter(i => i.id !== id); localStorage.setItem(`${type}_cats`, JSON.stringify(cats)); loadItems(type); } }

// ================= المدارس =================
function previewSchoolImage(e) { compressImage(e.target.files[0], data => { currentSchoolImageBase64 = data; document.getElementById('school-preview').src = data; document.getElementById('school-preview').style.display = 'block'; }); }
function addSchool() {
    let name = document.getElementById('school-name').value; let loc = document.getElementById('school-location').value; let info = document.getElementById('school-info').value; let vidRaw = document.getElementById('school-video').value; let vid = convertSmartUrl(vidRaw);
    if(!name) return alert('أدخل اسم المدرسة');
    let schools = JSON.parse(localStorage.getItem('schools_data')) || []; 

    if(editingSchoolId) {
        let index = schools.findIndex(s => s.id === editingSchoolId);
        if(index > -1) {
            schools[index].name = name; schools[index].loc = loc; schools[index].info = info; schools[index].videoUrl = vid; schools[index].originalUrl = vidRaw;
            if(currentSchoolImageBase64) schools[index].image = currentSchoolImageBase64;
        }
        editingSchoolId = null; document.querySelector('#schools-tab .btn-neon').innerText = "إضافة المدرسة";
    } else {
        schools.unshift({ id: Date.now(), name: name, loc: loc, info: info, image: currentSchoolImageBase64, videoUrl: vid, originalUrl: vidRaw }); 
    }
    localStorage.setItem('schools_data', JSON.stringify(schools)); 
    document.getElementById('school-name').value = ''; document.getElementById('school-location').value = ''; document.getElementById('school-info').value = ''; document.getElementById('school-video').value = ''; document.getElementById('school-preview').style.display = 'none'; currentSchoolImageBase64 = null; loadSchools();
}
function editSchool(id) {
    let schools = JSON.parse(localStorage.getItem('schools_data')) || []; let school = schools.find(s => s.id === id); if(!school) return;
    document.getElementById('school-name').value = school.name; document.getElementById('school-location').value = school.loc || ''; document.getElementById('school-info').value = school.info || ''; document.getElementById('school-video').value = school.originalUrl || school.videoUrl || '';
    if(school.image) { document.getElementById('school-preview').src = school.image; document.getElementById('school-preview').style.display = 'block'; currentSchoolImageBase64 = school.image; }
    editingSchoolId = id; document.querySelector('#schools-tab .btn-neon').innerText = "حفظ التعديلات"; window.scrollTo({ top: 0, behavior: 'smooth' });
}
function loadSchools() {
    let schools = JSON.parse(localStorage.getItem('schools_data')) || []; let list = document.getElementById('schools-list'); list.innerHTML = '';
    schools.forEach(s => {
        let locBtn = s.loc ? `<a href="${s.loc.startsWith('http') ? s.loc : 'http://' + s.loc}" target="_blank" class="btn-outline mt-3"><i class="fa-solid fa-map-location-dot"></i> موقع المدرسة</a>` : '';
        
        // تشغيل المحلل الذكي
        let mediaContent = renderSmartMedia(s.image, s.videoUrl, s.originalUrl);
        
        let editBtn = isAdmin ? `<button class="btn-warning-outline ms-2 mt-3" onclick="editSchool(${s.id})"><i class="fa-solid fa-pen"></i></button>` : '';
        let delBtn = isAdmin ? `<button class="btn-danger-outline ms-2 mt-3" onclick="deleteData('schools_data', ${s.id}, loadSchools)"><i class="fa-solid fa-trash"></i></button>` : '';
        list.innerHTML += `<div class="card-dark mb-4 text-right" style="overflow:hidden;"><h3 class="text-neon">${s.name}</h3><p class="text-light mt-2" style="font-size:16px; white-space: pre-wrap;">${s.info}</p>${mediaContent}<div class="mt-2">${locBtn} ${delBtn} ${editBtn}</div></div>`;
    });
}
function deleteData(key, id, reloadFunc) { if(confirm('تأكيد الحذف؟')) { let data = JSON.parse(localStorage.getItem(key)); localStorage.setItem(key, JSON.stringify(data.filter(i => i.id !== id))); reloadFunc(); } }

// ================= المحادثة والمترجم الذكي =================

// دالة لترجمة النصوص باستخدام API مجاني
async function translateText(text, fromLang, toLang) {
    // استخراج أول حرفين من كود اللغة (مثل: en-US تصبح en)
    let from = fromLang.substring(0, 2);
    let to = toLang.substring(0, 2);
    
    // لو اللغتين زي بعض مش محتاجين ترجمة
    if(from === to) return text; 

    try {
        let res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`);
        let data = await res.json();
        return data.responseData.translatedText;
    } catch(e) {
        console.error("Translation error", e);
        return text; // لو حصل خطأ في النت يعرض النص الأصلي
    }
}

function startRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("متصفحك لا يدعم هذه الميزة. يرجى استخدام Google Chrome.");
    
    let myLang = document.getElementById('my-lang').value;
    let otherLang = document.getElementById('other-lang').value;

    const recognition = new SpeechRecognition(); 
    recognition.lang = otherLang; // بنستمع للغة الطرف الآخر
    recognition.interimResults = false;
    
    let btn = document.getElementById('btn-record'); 
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الاستماع له...'; 
    btn.style.background = "#ff4d4d"; 
    
    recognition.start();
    
    recognition.onresult = async event => {
        let originalText = event.results[0][0].transcript;
        
        // تغيير شكل الزرار أثناء الترجمة
        btn.innerHTML = '<i class="fa-solid fa-language fa-fade"></i> جاري الترجمة...';
        btn.style.background = "#17a2b8"; 

        // ترجمة الكلام من لغة الطرف الآخر إلى لغتي
        let translatedText = await translateText(originalText, otherLang, myLang);
        document.getElementById('stt-result').value = translatedText;
        
        resetMicBtn(btn);
    };
    
    recognition.onspeechend = () => { recognition.stop(); };
    recognition.onerror = event => { alert("خطأ في المايك: " + event.error); resetMicBtn(btn); };
}

function resetMicBtn(btn) {
    btn.innerHTML = '<i class="fa-solid fa-microphone"></i> استماع وترجمة'; 
    btn.style.background = "var(--neon)";
}

async function speakText() {
    let text = document.getElementById('tts-input').value; 
    if(!text) return alert("يرجى كتابة نص أولاً!");
    if (!window.speechSynthesis) return alert("متصفحك لا يدعم قراءة النصوص.");

    let myLang = document.getElementById('my-lang').value;
    let otherLang = document.getElementById('other-lang').value;
    
    let btn = document.getElementById('btn-speak');
    let originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الترجمة...';

    // ترجمة الكلام من لغتي إلى لغة الطرف الآخر
    let translatedText = await translateText(text, myLang, otherLang);
    btn.innerHTML = '<i class="fa-solid fa-volume-high fa-beat"></i> جاري النطق...';

    let utterance = new SpeechSynthesisUtterance(translatedText); 
    utterance.lang = otherLang; // النطق بلغة الطرف الآخر
    utterance.rate = 0.80; // سرعة هادية ومفهومة
    
    utterance.onend = () => { btn.innerHTML = originalHtml; };
    window.speechSynthesis.speak(utterance);
}

// ================= أداة استخراج الكود =================
function generateGithubCode() {
    let data = { siteName: localStorage.getItem('siteName'), siteLogo: localStorage.getItem('siteLogo'), adminProfilePic: localStorage.getItem('adminProfilePic'), my_news: localStorage.getItem('my_news'), signs_cats: localStorage.getItem('signs_cats'), books_cats: localStorage.getItem('books_cats'), schools_data: localStorage.getItem('schools_data') };
    let code = `const defaultData = ${JSON.stringify(data, null, 4)};`;
    navigator.clipboard.writeText(code).then(() => alert('تم نسخ كود البيانات بنجاح!\n\n1. قم بإنشاء ملف باسم data.js\n2. الصق الكود بداخله.\n3. ارفعه مع ملفات المشروع على GitHub.')).catch(err => { alert('حدث خطأ في النسخ، يرجى فتح Console (F12) لنسخه يدوياً.'); console.log(code); });
}
let isAdmin = localStorage.getItem('isAdmin') === 'true';
let currentOpenCategory = { type: null, name: null };
let tempLogoBase64 = null; 
let currentNewsImageBase64 = null;
let currentSchoolImageBase64 = null;

// ================= شاشة التحميل والمبادئ =================
window.addEventListener('load', function() {
    setTimeout(function() { document.getElementById('splash-screen').classList.add('hidden'); }, 1500); 
    
    // تلوين القفل لو أنت مدير
    if(isAdmin) document.getElementById('admin-lock-icon').style.color = '#ff4d4d';

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

// ================= الإدارة: الدخول والخروج من نفس الزر =================
function promptAdminPin() {
    if(isAdmin) { 
        if(confirm("أنت في وضع الإدارة حالياً.. هل تريد تسجيل الخروج؟")) {
            localStorage.setItem('isAdmin', 'false'); location.reload();
        }
        return; 
    }
    let pin = prompt("أدخل الرقم السري:");
    if(pin === "2026") {
        localStorage.setItem('isAdmin', 'true'); alert("مرحباً بك في لوحة التحكم!"); location.reload();
    } else if(pin !== null) { alert("رمز خاطئ!"); }
}

function applyAdminRights() {
    if(isAdmin) { document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block'); }
}

// ================= معالجة الصور والروابط =================
function compressImage(file, callback) {
    if(!file) { callback(null); return; }
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = e => {
        const img = new Image(); img.src = e.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas'); const MAX = 600; 
            let w = img.width; let h = img.height;
            if (w > MAX) { h *= MAX / w; w = MAX; }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            callback(canvas.toDataURL('image/jpeg', 0.6)); 
        }
    }
}

// معالج ذكي جداً لتحويل روابط (يوتيوب، درايف) لتشتغل جوه الموقع مباشرة
function convertSmartUrl(url) {
    if (!url) return null;
    let ytMatch = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
    if (ytMatch && ytMatch[2].length == 11) return 'https://www.youtube.com/embed/' + ytMatch[2];
    let driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
    if (driveMatch) return 'https://drive.google.com/file/d/' + driveMatch[1] + '/preview';
    // لو رابط كتاب PDF عادي، هيرجعه زي ما هو عشان نعمله زرار قراءة
    return url;
}

// ================= الإعدادات =================
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
function loadProfilePic() {
    let pic = localStorage.getItem('adminProfilePic') || 'img/profile.png';
    document.getElementById('home-profile-pic').src = pic; return pic;
}
function updateProfilePic(e) { compressImage(e.target.files[0], data => { localStorage.setItem('adminProfilePic', data); loadProfilePic(); loadNews(); alert('تم تغيير الصورة!'); }); }

// ================= الأخبار الكاملة =================
function previewNewsImage(e) { compressImage(e.target.files[0], data => { currentNewsImageBase64 = data; document.getElementById('news-preview').src = data; document.getElementById('news-preview').style.display = 'block'; }); }
function addNews() {
    let text = document.getElementById('news-text').value; let videoUrl = convertSmartUrl(document.getElementById('news-video-url').value);
    if(!text && !currentNewsImageBase64 && !videoUrl) return;
    let posts = JSON.parse(localStorage.getItem('my_news')) || [];
    posts.unshift({ id: Date.now(), text: text, image: currentNewsImageBase64, videoUrl: videoUrl, date: new Date().toLocaleDateString('ar-EG') });
    localStorage.setItem('my_news', JSON.stringify(posts));
    document.getElementById('news-text').value = ''; document.getElementById('news-video-url').value = ''; document.getElementById('news-preview').style.display = 'none'; currentNewsImageBase64 = null; loadNews();
}
function loadNews() {
    let posts = JSON.parse(localStorage.getItem('my_news')) || []; let feed = document.getElementById('news-feed'); let pic = loadProfilePic(); feed.innerHTML = '';
    posts.forEach(p => {
        let img = p.image ? `<img src="${p.image}" class="media-display">` : ''; let vid = p.videoUrl ? `<iframe src="${p.videoUrl}" class="video-iframe" allowfullscreen></iframe>` : '';
        let delBtn = isAdmin ? `<button class="btn-danger-outline float-end mt-2" onclick="deleteData('my_news', ${p.id}, loadNews)">حذف</button>` : '';
        feed.innerHTML += `<div class="card-dark mb-4"><div class="d-flex align-items-center gap-3"><img src="${pic}" style="width:45px; height:45px; border-radius:50%; border:2px solid var(--neon);"><div><div class="text-white fw-bold">محمود عبدالرحمن</div><div class="text-muted" style="font-size:12px;">${p.date}</div></div></div><div class="text-white mt-3" style="font-size: 16px; white-space: pre-wrap;">${p.text}</div>${img} ${vid} ${delBtn}</div>`;
    });
}

// ================= الأقسام (إشارات / مكتبة كاملة) =================
function addCategory(type) {
    let input = document.getElementById(`new-${type.slice(0,-1)}-cat-name`); if(!input.value) return;
    let cats = JSON.parse(localStorage.getItem(`${type}_cats`)) || []; cats.push({ name: input.value, items: [] });
    localStorage.setItem(`${type}_cats`, JSON.stringify(cats)); input.value = ''; loadCategories(type);
}
function loadCategories(type) {
    let cats = JSON.parse(localStorage.getItem(`${type}_cats`)) || []; let grid = document.getElementById(`${type}-categories-grid`); grid.innerHTML = '';
    cats.forEach((cat, idx) => {
        let delBtn = isAdmin ? `<i class="fa-solid fa-trash text-danger position-absolute" style="top:10px; left:10px; z-index:5;" onclick="event.stopPropagation(); deleteCategory('${type}', ${idx})"></i>` : '';
        grid.innerHTML += `<div class="cat-btn" onclick="openCategory('${type}', '${cat.name}')">${delBtn}${cat.name}</div>`;
    });
}
function deleteCategory(type, idx) { if(confirm("حذف القسم بمحتوياته؟")) { let cats = JSON.parse(localStorage.getItem(`${type}_cats`)); cats.splice(idx, 1); localStorage.setItem(`${type}_cats`, JSON.stringify(cats)); loadCategories(type); } }
function openCategory(type, name) { currentOpenCategory = { type: type, name: name }; document.getElementById(`${type}-categories-view`).style.display = 'none'; document.getElementById(`${type}-items-view`).style.display = 'block'; document.getElementById(`current-${type.slice(0,-1)}-cat-title`).innerText = name; loadItems(type); }
function goBackToCategories(type) { document.getElementById(`${type}-categories-view`).style.display = 'block'; document.getElementById(`${type}-items-view`).style.display = 'none'; loadCategories(type); }

function addItem(type) {
    let isSign = type === 'signs'; let title = document.getElementById(isSign ? 'sign-title' : 'book-title').value; let desc = document.getElementById(isSign ? 'sign-desc' : 'book-desc').value; let file = document.getElementById(isSign ? 'sign-img' : 'book-img'); let vidRaw = document.getElementById(isSign ? 'sign-video' : 'book-video').value;
    let vid = convertSmartUrl(vidRaw);
    if(!title) return alert('أدخل العنوان');
    compressImage(file.files[0], imgData => {
        let cats = JSON.parse(localStorage.getItem(`${type}_cats`)); let idx = cats.findIndex(c => c.name === currentOpenCategory.name);
        // بنحفظ كمان الرابط الأصلي لو كان كتاب PDF عشان نعمله زرار قراءة
        cats[idx].items.push({ id: Date.now(), title: title, desc: desc, image: imgData, videoUrl: vid, originalUrl: vidRaw });
        localStorage.setItem(`${type}_cats`, JSON.stringify(cats)); loadItems(type);
        // تفريغ المدخلات
        document.getElementById(isSign ? 'sign-title' : 'book-title').value = ''; document.getElementById(isSign ? 'sign-desc' : 'book-desc').value = ''; file.value = ''; document.getElementById(isSign ? 'sign-video' : 'book-video').value = '';
    });
}

function loadItems(type) {
    let cats = JSON.parse(localStorage.getItem(`${type}_cats`)) || []; let cat = cats.find(c => c.name === currentOpenCategory.name); let list = document.getElementById(`${type}-items-list`); list.innerHTML = '';
    if(cat && cat.items) {
        cat.items.slice().reverse().forEach(item => {
            let img = item.image ? `<img src="${item.image}" class="media-display">` : ''; 
            
            // معالجة ذكية: لو رابط يوتيوب هيرسمه Iframe، لو رابط PDF هيعمل زرار
            let vid = '';
            if(item.videoUrl) {
                if(item.videoUrl.includes('youtube') || item.videoUrl.includes('preview')) {
                    vid = `<iframe src="${item.videoUrl}" class="video-iframe" allowfullscreen></iframe>`;
                } else {
                    vid = `<a href="${item.originalUrl}" target="_blank" class="btn-outline w-100 mt-3 text-center"><i class="fa-solid fa-book-open"></i> قراءة / تحميل الملف</a>`;
                }
            }
            
            let delBtn = isAdmin ? `<button class="btn-danger-outline mt-3 w-100" onclick="deleteItem('${type}', ${item.id})"><i class="fa-solid fa-trash"></i> حذف العنصر</button>` : '';
            list.innerHTML += `<div class="col-md-6 mb-3"><div class="card-dark h-100"><h4 class="text-neon">${item.title}</h4><p class="text-light mt-2">${item.desc}</p>${img}${vid}${delBtn}</div></div>`;
        });
    }
}
function deleteItem(type, id) { if(confirm("تأكيد الحذف؟")) { let cats = JSON.parse(localStorage.getItem(`${type}_cats`)); let idx = cats.findIndex(c => c.name === currentOpenCategory.name); cats[idx].items = cats[idx].items.filter(i => i.id !== id); localStorage.setItem(`${type}_cats`, JSON.stringify(cats)); loadItems(type); } }

// ================= المدارس الشاملة =================
function previewSchoolImage(e) { compressImage(e.target.files[0], data => { currentSchoolImageBase64 = data; document.getElementById('school-preview').src = data; document.getElementById('school-preview').style.display = 'block'; }); }
function addSchool() {
    let name = document.getElementById('school-name').value; let loc = document.getElementById('school-location').value; let info = document.getElementById('school-info').value; let vid = convertSmartUrl(document.getElementById('school-video').value);
    if(!name) return alert('أدخل اسم المدرسة');
    let schools = JSON.parse(localStorage.getItem('schools_data')) || []; 
    schools.unshift({ id: Date.now(), name: name, loc: loc, info: info, image: currentSchoolImageBase64, videoUrl: vid }); 
    localStorage.setItem('schools_data', JSON.stringify(schools)); 
    
    // تفريغ
    document.getElementById('school-name').value = ''; document.getElementById('school-location').value = ''; document.getElementById('school-info').value = ''; document.getElementById('school-video').value = ''; document.getElementById('school-preview').style.display = 'none'; currentSchoolImageBase64 = null;
    loadSchools();
}
function loadSchools() {
    let schools = JSON.parse(localStorage.getItem('schools_data')) || []; let list = document.getElementById('schools-list'); list.innerHTML = '';
    schools.forEach(s => {
        let locBtn = s.loc ? `<a href="${s.loc.startsWith('http') ? s.loc : 'https://google.com/maps/search/'+s.loc}" target="_blank" class="btn-outline"><i class="fa-solid fa-map-location-dot"></i> الموقع</a>` : '';
        let img = s.image ? `<img src="${s.image}" class="media-display">` : ''; 
        let vid = s.videoUrl ? `<iframe src="${s.videoUrl}" class="video-iframe" allowfullscreen></iframe>` : '';
        let delBtn = isAdmin ? `<button class="btn-danger-outline ms-2" onclick="deleteData('schools_data', ${s.id}, loadSchools)"><i class="fa-solid fa-trash"></i></button>` : '';
        list.innerHTML += `<div class="card-dark mb-4 text-right"><h3 class="text-neon">${s.name}</h3><p class="text-light" style="font-size:16px;">${s.info}</p>${img}${vid}<div class="mt-3">${locBtn} ${delBtn}</div></div>`;
    });
}
function deleteData(key, id, reloadFunc) { if(confirm('تأكيد الحذف؟')) { let data = JSON.parse(localStorage.getItem(key)); localStorage.setItem(key, JSON.stringify(data.filter(i => i.id !== id))); reloadFunc(); } }

// ================= ميزة المحادثة والترجمة الصوتية (مُحسنة اللغات وبطء الصوت) =================
function startRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("عذراً، متصفحك لا يدعم تحويل الصوت لنص. يرجى استخدام Google Chrome."); return; }
    
    const recognition = new SpeechRecognition();
    recognition.lang = document.getElementById('stt-lang').value;
    recognition.interimResults = false;
    
    let btn = document.getElementById('btn-record');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الاستماع...';
    btn.style.background = "#ff4d4d"; 
    
    recognition.start();
    recognition.onresult = function(event) { document.getElementById('stt-result').value = event.results[0][0].transcript; };
    recognition.onspeechend = function() { recognition.stop(); resetMicBtn(btn); };
    recognition.onerror = function(event) { alert("حدث خطأ في المايك: " + event.error); resetMicBtn(btn); };
}
function resetMicBtn(btn) { btn.innerHTML = '<i class="fa-solid fa-microphone"></i> اضغط وتحدث'; btn.style.background = "var(--neon)"; }

function speakText() {
    let text = document.getElementById('tts-input').value;
    if(!text) { alert("يرجى كتابة نص أولاً!"); return; }
    if (!window.speechSynthesis) { alert("عذراً، متصفحك لا يدعم قراءة النصوص."); return; }
    
    let utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = document.getElementById('tts-lang').value;
    // تم إبطاء سرعة الصوت هنا زي ما طلبت (0.75 تعتبر سرعة هادية ومناسبة جداً للسمع بوضوح)
    utterance.rate = 0.75; 
    window.speechSynthesis.speak(utterance);
}

// ================= التصدير والاستيراد =================
function exportData() {
    let data = { siteName: localStorage.getItem('siteName'), siteLogo: localStorage.getItem('siteLogo'), adminProfilePic: localStorage.getItem('adminProfilePic'), my_news: localStorage.getItem('my_news'), signs_cats: localStorage.getItem('signs_cats'), books_cats: localStorage.getItem('books_cats'), schools_data: localStorage.getItem('schools_data') };
    let a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], {type: "application/json"})); a.download = "Hope_Data.json"; a.click();
}
function importData(e) {
    let reader = new FileReader();
    reader.onload = ev => { let d = JSON.parse(ev.target.result); for (let k in d) { if(d[k]) localStorage.setItem(k, d[k]); } alert("تم الاستيراد!"); location.reload(); };
    if(e.target.files[0]) reader.readAsText(e.target.files[0]);
}
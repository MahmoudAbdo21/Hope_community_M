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

    // ================= محرك سحب الداتا العبقري =================
    if (typeof defaultData !== 'undefined') {
        if (!isAdmin) {
            // 1. لو ده زائر عادي: دايماً نفرض عليه أحدث داتا من ملف data.js اللي إنت رفعته
            for (let key in defaultData) { 
                if (defaultData[key]) localStorage.setItem(key, defaultData[key]); 
            }
        } else {
            // 2. لو ده المدير (إنت): نسحب الداتا بس لو الذاكرة فاضية عشان منمسحش شغلك اللي لسه بتضيفه
            let currentNews = localStorage.getItem('my_news');
            if (!currentNews || currentNews === '[]' || currentNews === null) {
                for (let key in defaultData) { 
                    if (defaultData[key]) localStorage.setItem(key, defaultData[key]); 
                }
            }
        }
    }
    // =========================================================
    
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

// ================= نظام تكبير الصور =================
function openImageModal(src) {
    let modal = document.getElementById('custom-image-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'custom-image-modal';
        modal.innerHTML = `
            <span style="position:absolute; top:20px; right:30px; color:white; font-size:45px; font-weight:bold; cursor:pointer; z-index:10001;" onclick="closeImageModal()">&times;</span>
            <img id="modal-img-content" src="" style="max-width:90%; max-height:90%; border-radius:10px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); object-fit: contain;">
        `;
        Object.assign(modal.style, { display: 'none', position: 'fixed', zIndex: '10000', left: '0', top: '0', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(5px)', justifyContent: 'center', alignItems: 'center' });
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
            const canvas = document.createElement('canvas'); const MAX = 1000; 
            let w = img.width; let h = img.height;
            if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } } else { if (h > MAX) { w *= MAX / h; h = MAX; } }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            callback(canvas.toDataURL('image/jpeg', 0.8)); 
        }
    }
}

// ================= نظام عرض المزيد الشيك =================
window.toggleText = function(id, action) {
    if (action === 'more') { document.getElementById(`text-short-${id}`).style.display = 'none'; document.getElementById(`text-full-${id}`).style.display = 'block'; } 
    else { document.getElementById(`text-short-${id}`).style.display = 'block'; document.getElementById(`text-full-${id}`).style.display = 'none'; }
}
function generateTextHTML(text, uniqueId) {
    if (!text) return '';
    let maxLength = 120;
    if (text.length > maxLength) {
        let shortText = text.substring(0, maxLength) + '...';
        return `
            <div class="text-light mt-2" style="font-size: 15px; white-space: pre-wrap; line-height: 1.6;" id="text-short-${uniqueId}">${shortText} <span class="text-neon fw-bold ms-2" style="cursor:pointer; font-size:14px; text-decoration:underline;" onclick="toggleText('${uniqueId}', 'more')">عرض المزيد <i class="fa-solid fa-angle-down"></i></span></div>
            <div class="text-light mt-2" style="font-size: 15px; white-space: pre-wrap; line-height: 1.6; display: none;" id="text-full-${uniqueId}">${text} <span class="text-neon fw-bold ms-2" style="cursor:pointer; font-size:14px; text-decoration:underline;" onclick="toggleText('${uniqueId}', 'less')">عرض أقل <i class="fa-solid fa-angle-up"></i></span></div>
        `;
    }
    return `<div class="text-light mt-2" style="font-size: 15px; white-space: pre-wrap; line-height: 1.6;">${text}</div>`;
}

// ================= المحلل الصارم (البيئة المعزولة ليوتيوب) =================
function renderExplicitMedia(uploadedImg, mediaType, url, oldVideoUrl, oldOriginalUrl) {
    let finalUrl = url || oldVideoUrl || oldOriginalUrl || '';
    let mediaHTML = '';
    
    // ستايل الصور (طبيعي بدون سواد)
    let imgStyle = 'max-width: 100%; max-height: 450px; width: auto; height: auto; border-radius: 12px; margin: 15px auto; display: block; box-shadow: 0 4px 15px rgba(0,0,0,0.15); cursor: zoom-in;';

    if (uploadedImg) {
        mediaHTML += `<img src="${uploadedImg}" style="${imgStyle}" onclick="openImageModal(this.src)">`;
    }

    if (!finalUrl) return mediaHTML;

    let type = mediaType;
    if (!type || type === '') {
        let lowerUrl = finalUrl.toLowerCase();
        if (lowerUrl.includes('youtu')) type = 'youtube';
        else if (lowerUrl.includes('drive')) type = 'drive';
        else if (lowerUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) || lowerUrl.includes('unsplash') || lowerUrl.includes('wikimedia')) type = 'image_link';
        else type = 'link';
    }

    if (type === 'youtube') {
        let ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        let match = finalUrl.match(ytRegex);
        let vidId = match ? match[1] : finalUrl.split('/').pop();
        
        if(vidId) {
            // الكود الرسمي المعزول ليوتيوب (يسمح بالإعلانات والتتبع بشكل كامل)
            mediaHTML += `
            <div style="position: relative; width: 100%; padding-bottom: 56.25%; height: 0; margin: 15px 0 5px 0; border-radius: 12px; overflow: hidden; background: #000; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                <iframe 
                    width="100%" 
                    height="100%" 
                    src="https://www.youtube.com/embed/${vidId}" 
                    title="YouTube video player" 
                    frameborder="0" 
                    style="position: absolute; top: 0; left: 0;"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    referrerpolicy="strict-origin-when-cross-origin" 
                    allowfullscreen>
                </iframe>
            </div>`;
        }
    } 
    else if (type === 'drive') {
        let driveRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/i;
        let match = finalUrl.match(driveRegex);
        let driveUrl = match ? `https://drive.google.com/file/d/${match[1]}/preview` : finalUrl;
        mediaHTML += `<div style="position: relative; width: 100%; padding-bottom: 56.25%; height: 0; margin: 15px 0; border-radius: 12px; overflow: hidden; background: #000; box-shadow: 0 4px 15px rgba(0,0,0,0.3);"><iframe src="${driveUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" allowfullscreen></iframe></div>`;
    } 
    else if (type === 'image_link') {
        mediaHTML += `<img src="${finalUrl}" style="${imgStyle}" onclick="openImageModal(this.src)">`;
    } 
    else {
        let cleanUrl = finalUrl.startsWith('http') ? finalUrl : 'https://' + finalUrl;
        mediaHTML += `<a href="${cleanUrl}" target="_blank" class="btn-outline w-100 mt-3 text-center d-block"><i class="fa-solid fa-link"></i> فتح الرابط المرفق</a>`;
    }

    return mediaHTML;
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
function loadProfilePic() { let pic = localStorage.getItem('adminProfilePic') || 'img/profile.png'; document.getElementById('home-profile-pic').src = pic; return pic; }
function updateProfilePic(e) { compressImage(e.target.files[0], data => { localStorage.setItem('adminProfilePic', data); loadProfilePic(); loadNews(); alert('تم تغيير الصورة!'); }); }

// ================= الأخبار =================
function previewNewsImage(e) { compressImage(e.target.files[0], data => { currentNewsImageBase64 = data; document.getElementById('news-preview').src = data; document.getElementById('news-preview').style.display = 'block'; }); }

function addNews() {
    let titleEl = document.getElementById('news-title'); let title = titleEl ? titleEl.value : '';
    let textEl = document.getElementById('news-text'); let text = textEl ? textEl.value : '';
    let typeEl = document.getElementById('news-media-type'); let mediaType = typeEl ? typeEl.value : '';
    let urlEl = document.getElementById('news-media-url') || document.getElementById('news-video-url'); 
    let mediaUrl = urlEl ? urlEl.value : '';
    
    if(!title && !text && !currentNewsImageBase64 && !mediaUrl) return;
    
    let posts = JSON.parse(localStorage.getItem('my_news')) || [];
    let dateStr = getExactTime();

    if (editingNewsId) {
        let index = posts.findIndex(p => p.id === editingNewsId);
        if (index > -1) {
            if(title) posts[index].title = title; posts[index].text = text; 
            posts[index].mediaType = mediaType; posts[index].mediaUrl = mediaUrl;
            if (currentNewsImageBase64) posts[index].image = currentNewsImageBase64;
            posts[index].date = dateStr + ' (مُعدل)'; 
        }
        editingNewsId = null; document.querySelector('#news-tab .btn-neon').innerText = "نشر الخبر";
    } else {
        posts.unshift({ id: Date.now(), title: title, text: text, mediaType: mediaType, mediaUrl: mediaUrl, image: currentNewsImageBase64, date: dateStr });
    }

    localStorage.setItem('my_news', JSON.stringify(posts));
    if(titleEl) titleEl.value = ''; if(textEl) textEl.value = ''; if(urlEl) urlEl.value = '';
    let previewEl = document.getElementById('news-preview'); if(previewEl) previewEl.style.display = 'none';
    currentNewsImageBase64 = null; loadNews();
}

function editNews(id) {
    let posts = JSON.parse(localStorage.getItem('my_news')) || []; let post = posts.find(p => p.id === id); if(!post) return;
    if(document.getElementById('news-title')) document.getElementById('news-title').value = post.title || '';
    if(document.getElementById('news-text')) document.getElementById('news-text').value = post.text || '';
    if(document.getElementById('news-media-type')) document.getElementById('news-media-type').value = post.mediaType || '';
    let urlEl = document.getElementById('news-media-url') || document.getElementById('news-video-url');
    if(urlEl) urlEl.value = post.mediaUrl || post.videoUrl || post.originalUrl || '';
    if(post.image && document.getElementById('news-preview')) { document.getElementById('news-preview').src = post.image; document.getElementById('news-preview').style.display = 'block'; currentNewsImageBase64 = post.image; }
    editingNewsId = id; document.querySelector('#news-tab .btn-neon').innerText = "حفظ التعديلات"; window.scrollTo({ top: 0, behavior: 'smooth' });
}

function loadNews() {
    let posts = JSON.parse(localStorage.getItem('my_news')) || []; let feed = document.getElementById('news-feed'); if(!feed) return; 
    let pic = loadProfilePic(); feed.innerHTML = '';
    posts.forEach(p => {
        let mediaContent = renderExplicitMedia(p.image, p.mediaType, p.mediaUrl, p.videoUrl, p.originalUrl);
        let textContent = generateTextHTML(p.text, `news-${p.id}`);
        let editBtn = isAdmin ? `<button class="btn-warning-outline float-end mt-2 me-2" onclick="editNews(${p.id})"><i class="fa-solid fa-pen"></i></button>` : '';
        let delBtn = isAdmin ? `<button class="btn-danger-outline float-end mt-2" onclick="deleteData('my_news', ${p.id}, loadNews)"><i class="fa-solid fa-trash"></i></button>` : '';
        let titleHTML = p.title ? `<h4 class="text-neon mt-3 mb-1">${p.title}</h4>` : '';
        
        feed.innerHTML += `<div class="card-dark mb-4" style="overflow:hidden; box-sizing: border-box;">
            <div class="d-flex align-items-center gap-3">
                <img src="${pic}" style="width:45px; height:45px; border-radius:50%; border:2px solid var(--neon);">
                <div><div class="text-white fw-bold">محمود عبدالرحمن</div><div style="font-size:13px; color: var(--neon); margin-top:3px;"><i class="fa-regular fa-clock"></i> ${p.date || getExactTime()}</div></div>
            </div>
            ${titleHTML} ${textContent} ${mediaContent} <div>${delBtn} ${editBtn}</div>
        </div>`;
    });
}

// ================= الأقسام والمكتبة =================
function addCategory(type) { let input = document.getElementById(`new-${type.slice(0,-1)}-cat-name`); if(!input.value) return; let cats = JSON.parse(localStorage.getItem(`${type}_cats`)) || []; cats.push({ name: input.value, items: [] }); localStorage.setItem(`${type}_cats`, JSON.stringify(cats)); input.value = ''; loadCategories(type); }
function loadCategories(type) { let cats = JSON.parse(localStorage.getItem(`${type}_cats`)) || []; let grid = document.getElementById(`${type}-categories-grid`); if(!grid) return; grid.innerHTML = ''; cats.forEach((cat, idx) => { let delBtn = isAdmin ? `<i class="fa-solid fa-trash text-danger position-absolute" style="top:10px; left:10px; z-index:5;" onclick="event.stopPropagation(); deleteCategory('${type}', ${idx})"></i>` : ''; grid.innerHTML += `<div class="cat-btn" onclick="openCategory('${type}', '${cat.name}')">${delBtn}${cat.name}</div>`; }); }
function deleteCategory(type, idx) { if(confirm("حذف القسم بمحتوياته؟")) { let cats = JSON.parse(localStorage.getItem(`${type}_cats`)); cats.splice(idx, 1); localStorage.setItem(`${type}_cats`, JSON.stringify(cats)); loadCategories(type); } }
function openCategory(type, name) { currentOpenCategory = { type: type, name: name }; document.getElementById(`${type}-categories-view`).style.display = 'none'; document.getElementById(`${type}-items-view`).style.display = 'block'; document.getElementById(`current-${type.slice(0,-1)}-cat-title`).innerText = name; loadItems(type); }
function goBackToCategories(type) { document.getElementById(`${type}-categories-view`).style.display = 'block'; document.getElementById(`${type}-items-view`).style.display = 'none'; loadCategories(type); }

function addItem(type) {
    let isSign = type === 'signs'; let prefix = isSign ? 'sign' : 'book';
    let titleEl = document.getElementById(`${prefix}-title`); let title = titleEl ? titleEl.value : '';
    let descEl = document.getElementById(`${prefix}-desc`); let desc = descEl ? descEl.value : '';
    let typeEl = document.getElementById(`${prefix}-media-type`); let mediaType = typeEl ? typeEl.value : '';
    let urlEl = document.getElementById(`${prefix}-media-url`) || document.getElementById(`${prefix}-video`); let mediaUrl = urlEl ? urlEl.value : '';
    let fileEl = document.getElementById(`${prefix}-img`);
    
    if(!title) return alert('أدخل العنوان');
    let dateStr = getExactTime();

    let processItem = (imgData) => {
        let cats = JSON.parse(localStorage.getItem(`${type}_cats`)); let idx = cats.findIndex(c => c.name === currentOpenCategory.name);
        if (editingItemId) {
            let itemIndex = cats[idx].items.findIndex(i => i.id === editingItemId);
            if(itemIndex > -1) {
                cats[idx].items[itemIndex].title = title; cats[idx].items[itemIndex].desc = desc; 
                cats[idx].items[itemIndex].mediaType = mediaType; cats[idx].items[itemIndex].mediaUrl = mediaUrl;
                if(imgData) cats[idx].items[itemIndex].image = imgData;
                cats[idx].items[itemIndex].date = dateStr + ' (مُعدل)';
            }
            editingItemId = null; document.querySelector(`#${type}-tab .btn-neon`).innerText = isSign ? "حفظ الإشارة" : "إضافة الكتاب";
        } else {
            cats[idx].items.push({ id: Date.now(), title: title, desc: desc, mediaType: mediaType, mediaUrl: mediaUrl, image: imgData, date: dateStr });
        }
        localStorage.setItem(`${type}_cats`, JSON.stringify(cats)); loadItems(type);
        if(titleEl) titleEl.value = ''; if(descEl) descEl.value = ''; if(urlEl) urlEl.value = ''; if(fileEl) fileEl.value = '';
    };
    if(fileEl && fileEl.files[0]) compressImage(fileEl.files[0], processItem); else processItem(null);
}

function editItem(type, itemId) {
    let isSign = type === 'signs'; let prefix = isSign ? 'sign' : 'book'; let cats = JSON.parse(localStorage.getItem(`${type}_cats`)); let idx = cats.findIndex(c => c.name === currentOpenCategory.name); let item = cats[idx].items.find(i => i.id === itemId); if(!item) return;
    if(document.getElementById(`${prefix}-title`)) document.getElementById(`${prefix}-title`).value = item.title;
    if(document.getElementById(`${prefix}-desc`)) document.getElementById(`${prefix}-desc`).value = item.desc;
    if(document.getElementById(`${prefix}-media-type`)) document.getElementById(`${prefix}-media-type`).value = item.mediaType || '';
    let urlEl = document.getElementById(`${prefix}-media-url`) || document.getElementById(`${prefix}-video`);
    if(urlEl) urlEl.value = item.mediaUrl || item.originalUrl || item.videoUrl || '';
    editingItemId = itemId; document.querySelector(`#${type}-tab .btn-neon`).innerText = "حفظ التعديلات"; window.scrollTo({ top: 0, behavior: 'smooth' });
}

function loadItems(type) {
    let cats = JSON.parse(localStorage.getItem(`${type}_cats`)) || []; let cat = cats.find(c => c.name === currentOpenCategory.name); let list = document.getElementById(`${type}-items-list`); if(!list) return; list.innerHTML = '';
    if(cat && cat.items) {
        cat.items.slice().reverse().forEach(item => {
            let mediaContent = renderExplicitMedia(item.image, item.mediaType, item.mediaUrl, item.videoUrl, item.originalUrl);
            let textContent = generateTextHTML(item.desc, `item-${item.id}`);
            let dateDisplay = item.date ? `<div style="font-size:13px; color: var(--neon); margin-bottom: 10px;"><i class="fa-regular fa-clock"></i> ${item.date}</div>` : '';
            let editBtn = isAdmin ? `<button class="btn-warning-outline mt-3 w-50" onclick="editItem('${type}', ${item.id})"><i class="fa-solid fa-pen"></i> تعديل</button>` : '';
            let delBtn = isAdmin ? `<button class="btn-danger-outline mt-3 w-50" onclick="deleteItem('${type}', ${item.id})"><i class="fa-solid fa-trash"></i> حذف</button>` : '';
            list.innerHTML += `<div class="col-md-6 mb-3"><div class="card-dark h-100" style="overflow:hidden; box-sizing: border-box;"><h4 class="text-neon">${item.title}</h4>${dateDisplay} ${textContent} ${mediaContent}<div class="d-flex gap-2">${delBtn}${editBtn}</div></div></div>`;
        });
    }
}
function deleteItem(type, id) { if(confirm("تأكيد الحذف؟")) { let cats = JSON.parse(localStorage.getItem(`${type}_cats`)); let idx = cats.findIndex(c => c.name === currentOpenCategory.name); cats[idx].items = cats[idx].items.filter(i => i.id !== id); localStorage.setItem(`${type}_cats`, JSON.stringify(cats)); loadItems(type); } }

// ================= المدارس =================
function previewSchoolImage(e) { compressImage(e.target.files[0], data => { currentSchoolImageBase64 = data; document.getElementById('school-preview').src = data; document.getElementById('school-preview').style.display = 'block'; }); }
function addSchool() {
    let nameEl = document.getElementById('school-name'); let name = nameEl ? nameEl.value : '';
    let locEl = document.getElementById('school-location'); let loc = locEl ? locEl.value : '';
    let infoEl = document.getElementById('school-info'); let info = infoEl ? infoEl.value : '';
    let typeEl = document.getElementById('school-media-type'); let mediaType = typeEl ? typeEl.value : '';
    let urlEl = document.getElementById('school-media-url') || document.getElementById('school-video'); let mediaUrl = urlEl ? urlEl.value : '';
    
    if(!name) return alert('أدخل اسم المدرسة');
    let schools = JSON.parse(localStorage.getItem('schools_data')) || []; 

    if(editingSchoolId) {
        let index = schools.findIndex(s => s.id === editingSchoolId);
        if(index > -1) {
            schools[index].name = name; schools[index].loc = loc; schools[index].info = info; 
            schools[index].mediaType = mediaType; schools[index].mediaUrl = mediaUrl;
            if(currentSchoolImageBase64) schools[index].image = currentSchoolImageBase64;
        }
        editingSchoolId = null; document.querySelector('#schools-tab .btn-neon').innerText = "إضافة المدرسة";
    } else {
        schools.unshift({ id: Date.now(), name: name, loc: loc, info: info, mediaType: mediaType, mediaUrl: mediaUrl, image: currentSchoolImageBase64 }); 
    }
    localStorage.setItem('schools_data', JSON.stringify(schools)); 
    if(nameEl) nameEl.value = ''; if(locEl) locEl.value = ''; if(infoEl) infoEl.value = ''; if(urlEl) urlEl.value = '';
    let previewEl = document.getElementById('school-preview'); if(previewEl) previewEl.style.display = 'none';
    currentSchoolImageBase64 = null; loadSchools();
}
function editSchool(id) {
    let schools = JSON.parse(localStorage.getItem('schools_data')) || []; let school = schools.find(s => s.id === id); if(!school) return;
    if(document.getElementById('school-name')) document.getElementById('school-name').value = school.name;
    if(document.getElementById('school-location')) document.getElementById('school-location').value = school.loc || '';
    if(document.getElementById('school-info')) document.getElementById('school-info').value = school.info || '';
    if(document.getElementById('school-media-type')) document.getElementById('school-media-type').value = school.mediaType || '';
    let urlEl = document.getElementById('school-media-url') || document.getElementById('school-video');
    if(urlEl) urlEl.value = school.mediaUrl || school.originalUrl || school.videoUrl || '';
    if(school.image && document.getElementById('school-preview')) { document.getElementById('school-preview').src = school.image; document.getElementById('school-preview').style.display = 'block'; currentSchoolImageBase64 = school.image; }
    editingSchoolId = id; document.querySelector('#schools-tab .btn-neon').innerText = "حفظ التعديلات"; window.scrollTo({ top: 0, behavior: 'smooth' });
}
function loadSchools() {
    let schools = JSON.parse(localStorage.getItem('schools_data')) || []; let list = document.getElementById('schools-list'); if(!list) return; list.innerHTML = '';
    schools.forEach(s => {
        let locBtn = s.loc ? `<a href="${s.loc.startsWith('http') ? s.loc : 'http://' + s.loc}" target="_blank" class="btn-outline mt-3 w-100 text-center"><i class="fa-solid fa-map-location-dot"></i> موقع المدرسة على الخريطة</a>` : '';
        let mediaContent = renderExplicitMedia(s.image, s.mediaType, s.mediaUrl, s.videoUrl, s.originalUrl);
        let textContent = generateTextHTML(s.info, `school-${s.id}`);
        let editBtn = isAdmin ? `<button class="btn-warning-outline ms-2 mt-3" onclick="editSchool(${s.id})"><i class="fa-solid fa-pen"></i></button>` : '';
        let delBtn = isAdmin ? `<button class="btn-danger-outline ms-2 mt-3" onclick="deleteData('schools_data', ${s.id}, loadSchools)"><i class="fa-solid fa-trash"></i></button>` : '';
        list.innerHTML += `<div class="card-dark mb-4 text-right" style="overflow:hidden; box-sizing: border-box;"><h3 class="text-neon">${s.name}</h3> ${textContent} ${locBtn} ${mediaContent}<div class="mt-2 text-start">${delBtn} ${editBtn}</div></div>`;
    });
}
function deleteData(key, id, reloadFunc) { if(confirm('تأكيد الحذف؟')) { let data = JSON.parse(localStorage.getItem(key)); localStorage.setItem(key, JSON.stringify(data.filter(i => i.id !== id))); reloadFunc(); } }

// ================= المترجم =================
let availableVoices = []; window.speechSynthesis.onvoiceschanged = () => availableVoices = window.speechSynthesis.getVoices();
async function translateText(text, fromLang, toLang) { let from = fromLang.substring(0, 2); let to = toLang.substring(0, 2); if(from === to) return text; try { let res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`); let data = await res.json(); return data.responseData.translatedText || text; } catch(e) { return text; } }
function startRecording() { const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SpeechRecognition) return alert("متصفحك لا يدعم هذه الميزة."); let otherLang = document.getElementById('other-lang').value; let myLang = document.getElementById('my-lang').value; const recognition = new SpeechRecognition(); recognition.lang = otherLang; recognition.interimResults = false; let btn = document.getElementById('btn-record'); let originalHtml = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الاستماع...'; btn.style.background = "#ff4d4d"; recognition.start(); recognition.onresult = async event => { let originalText = event.results[0][0].transcript; btn.innerHTML = '<i class="fa-solid fa-language fa-fade"></i> جاري الترجمة...'; btn.style.background = "#17a2b8"; let translatedText = await translateText(originalText, otherLang, myLang); document.getElementById('stt-result').value = translatedText; btn.innerHTML = originalHtml; btn.style.background = "var(--neon)"; }; recognition.onspeechend = () => recognition.stop(); recognition.onerror = () => { alert("لم يتم سماع شيء بوضوح."); btn.innerHTML = originalHtml; btn.style.background = "var(--neon)"; }; }
async function speakText() { let text = document.getElementById('tts-input').value; if(!text) return alert("اكتب رسالة أولاً!"); if (!window.speechSynthesis) return alert("متصفحك لا يدعم النطق الصوتي."); let myLang = document.getElementById('my-lang').value; let otherLang = document.getElementById('other-lang').value; let btn = document.getElementById('btn-speak'); let originalHtml = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التجهيز...'; let translatedText = await translateText(text, myLang, otherLang); btn.innerHTML = '<i class="fa-solid fa-volume-high fa-beat"></i> جاري النطق...'; let utterance = new SpeechSynthesisUtterance(translatedText); utterance.lang = otherLang; utterance.rate = 0.6; if (availableVoices.length === 0) availableVoices = window.speechSynthesis.getVoices(); let voice = availableVoices.find(v => v.lang.replace('_', '-') === otherLang) || availableVoices.find(v => v.lang.startsWith(otherLang.substring(0, 2))); if (otherLang === 'ar-EG' || otherLang === 'ar-SA') { let arabicVoice = availableVoices.find(v => v.lang === 'ar-EG' || v.name.includes('Egypt') || v.name.includes('Arabic')); if (arabicVoice) voice = arabicVoice; } if (voice) utterance.voice = voice; utterance.onend = () => btn.innerHTML = originalHtml; utterance.onerror = () => btn.innerHTML = originalHtml; window.speechSynthesis.speak(utterance); }
function generateGithubCode() { let data = { siteName: localStorage.getItem('siteName'), siteLogo: localStorage.getItem('siteLogo'), adminProfilePic: localStorage.getItem('adminProfilePic'), my_news: localStorage.getItem('my_news'), signs_cats: localStorage.getItem('signs_cats'), books_cats: localStorage.getItem('books_cats'), schools_data: localStorage.getItem('schools_data') }; let code = `const defaultData = ${JSON.stringify(data, null, 4)};`; navigator.clipboard.writeText(code).then(() => alert('تم النسخ!')).catch(() => alert('حدث خطأ في النسخ.')); }
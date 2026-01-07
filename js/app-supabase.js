// Nexus App - Versión con Supabase Directo
let user = nexusAPI.getCurrentUser();
let activeVidId = null;
let activeChatUserId = null;
let storyTimer = null;

// Inicializar cuando cargue la página
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await nexusAPI.initSession();
        user = nexusAPI.getCurrentUser();
        
        if (user) {
            document.getElementById('authOverlay').style.display = 'none';
            init();
        }
    } catch (error) {
        console.error('Error inicializando:', error);
    }
});

// ==================== AUTENTICACIÓN ====================
async function handleAuth() {
    const email = document.getElementById('authEmail').value.trim().toLowerCase();
    const password = document.getElementById('authPass').value;
    const isReg = document.getElementById('regOnly').style.display !== 'none';
    
    if (!email || !password) {
        alert("Completa todos los campos");
        return;
    }
    
    if (!validEmailFormat(email)) {
        alert("Introduce un correo válido");
        return;
    }
    
    try {
        let result;
        if (isReg) {
            const name = document.getElementById('regName').value.trim();
            if (!name) {
                alert("El nombre es requerido");
                return;
            }
            if (password.length < 8) {
                alert("La contraseña debe tener al menos 8 caracteres");
                return;
            }
            result = await nexusAPI.register(name, email, password);
        } else {
            result = await nexusAPI.login(email, password);
        }
        
        user = result.data.user;
        document.getElementById('authOverlay').style.display = 'none';
        init();
        
    } catch (error) {
        alert(error.message || 'Error en la autenticación');
    }
}

function toggleA() {
    const regOnly = document.getElementById('regOnly');
    const authT = document.getElementById('authT');
    const authL = document.getElementById('authL');
    
    if (regOnly.style.display === 'none') {
        regOnly.style.display = 'block';
        authT.innerText = "Crea tu cuenta de Nexus";
        authL.innerText = "¿Ya tienes cuenta? Inicia sesión";
    } else {
        regOnly.style.display = 'none';
        authT.innerText = "Tu mundo, tus reglas.";
        authL.innerText = "¿Nuevo aquí? Crea una cuenta";
    }
}

async function logout() {
    try {
        await nexusAPI.logout();
        location.reload();
    } catch (error) {
        console.error('Error en logout:', error);
        location.reload();
    }
}

// ==================== INICIALIZACIÓN ====================
async function init() {
    if (!user) return;
    
    setAvatar(document.getElementById('myAvatar'), user);
    setAvatar(document.getElementById('pBigAvatar'), user);
    
    document.getElementById('pNameDisp').innerText = user.name || 'Usuario';
    document.getElementById('pEmailDisp').innerText = user.email;
    
    updateProfileStats();
    renderHome();
    renderStories();
    renderInbox();
}

async function updateProfileStats() {
    if (!user) return;
    
    try {
        // Para Supabase, necesitaríamos implementar estas tablas
        document.getElementById('statFollowers').innerText = '0';
        document.getElementById('statFollowing').innerText = '0';
        document.getElementById('statLikes').innerText = '0';
        
    } catch (error) {
        console.error('Error actualizando estadísticas:', error);
    }
}

function setAvatar(el, u) {
    if (!el) return;
    if (!u) { 
        el.innerText = '?'; 
        el.style.background = '#333'; 
        return; 
    }
    if (u.avatar) {
        el.innerHTML = `<img src="${u.avatar}" style="width:100%; height:100%; object-fit:cover">`;
    } else { 
        el.innerText = u.name ? u.name[0].toUpperCase() : '?'; 
        el.style.background = u.color || '#333'; 
    }
}

// ==================== VIDEOS ====================
async function renderHome() {
    try {
        const result = await nexusAPI.getVideos(1, 20, 'video');
        const videos = result.data.videos;
        const container = document.getElementById('homePage');
        
        container.innerHTML = videos.map(video => `
            <div class="video-card">
                <video src="${video.video_url}" controls preload="metadata"></video>
                <div class="v-body">
                    <div class="avatar-v" style="background:${video.author_color}">
                        ${video.author_avatar ? 
                            `<img src="${video.author_avatar}" style="width:100%;height:100%;object-fit:cover">` : 
                            (video.author_name || 'U')[0]}
                    </div>
                    <div style="flex:1">
                        <b>${escapeHtml(video.title)}</b><br>
                        <small style="color:#666">${escapeHtml(video.author_name || 'Usuario')}</small>
                    </div>
                    ${video.author_email === user.email ? 
                        `<button class="del-btn-mini" onclick="deleteVideo('${video.id}')">Borrar</button>` : 
                        `<button onclick="alert('Función de seguir próximamente')" style="background:var(--blue); color:white; border:none; padding:6px 15px; border-radius:10px; font-weight:600; font-size:12px">
                            Seguir
                        </button>`
                    }
                </div>
                <div class="v-actions">
                    <div class="act-group">
                        <button class="act-btn ${isLikedByUser(video)?'active-l':''}" onclick="toggleLike('${video.id}', this)">
                            <i class="fas fa-heart"></i>
                            <span>${video.likes ? video.likes.length : 0}</span>
                        </button>
                        <button class="act-btn" onclick="openComments('${video.id}')">
                            <i class="fas fa-comment"></i>
                            <span>${video.comments ? video.comments.length : 0}</span>
                        </button>
                        <button class="act-btn" onclick="shareVideo('${video.id}')">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando videos:', error);
    }
}

async function upVideo() {
    const file = document.getElementById('vFile').files[0];
    const title = document.getElementById('vTitle').value.trim();
    const type = document.getElementById('vT').value;
    
    if (!file || !title) {
        alert("Selecciona un archivo y escribe un título");
        return;
    }
    
    try {
        const result = await nexusAPI.uploadVideo(file, title, '', type);
        alert("Video subido exitosamente");
        closeModal('uploadModal');
        renderHome();
        
    } catch (error) {
        alert("Error subiendo video: " + error.message);
    }
}

async function toggleLike(videoId, button) {
    try {
        const result = await nexusAPI.likeVideo(videoId);
        button.classList.toggle('active-l');
        const span = button.querySelector('span');
        if (span) {
            span.innerText = result.data.likesCount;
        }
    } catch (error) {
        console.error('Error en like:', error);
    }
}

async function deleteVideo(videoId) {
    if (!confirm("¿Estás seguro de que quieres borrar este video?")) return;
    
    try {
        await nexusAPI.deleteVideo(videoId);
        alert("Video eliminado");
        renderHome();
    } catch (error) {
        alert("Error eliminando video: " + error.message);
    }
}

// ==================== STORIES ====================
async function renderStories() {
    try {
        const result = await nexusAPI.getStories();
        const stories = result.data.stories;
        const container = document.getElementById('storyBar');
        
        let html = `
            <div class="story-item" onclick="openModal('storyUpModal')" style="text-align:center; font-size:11px">
                <div class="story-ring" style="background:#222">
                    <div class="story-pfp" style="color:var(--blue)">+</div>
                </div>
                <span style="color:#888">Tu historia</span>
            </div>
        `;
        
        stories.forEach(storyGroup => {
            html += `
                <div class="story-item" onclick="viewStoryGroup('${storyGroup.user._id}')" style="text-align:center; font-size:11px">
                    <div class="story-ring">
                        <div class="story-pfp" style="background:${storyGroup.user.color}">
                            ${storyGroup.user.avatar ? 
                                `<img src="${storyGroup.user.avatar}" style="width:100%;height:100%;object-fit:cover">` : 
                                (storyGroup.user.name || 'U')[0]}
                        </div>
                    </div>
                    <span style="font-size:10px; color:#aaa; margin-top:5px; display:block; text-align:center">
                        ${escapeHtml(storyGroup.user.name || 'Usuario')}
                    </span>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error cargando stories:', error);
    }
}

async function upStory() {
    const file = document.getElementById('sFile').files[0];
    if (!file) {
        alert("Selecciona una imagen o video");
        return;
    }
    
    try {
        await nexusAPI.uploadStory(file);
        alert("Story subido exitosamente");
        closeModal('storyUpModal');
        renderStories();
    } catch (error) {
        alert("Error subiendo story: " + error.message);
    }
}

// ==================== CHAT ====================
async function renderInbox() {
    try {
        const result = await nexusAPI.getChats();
        const chats = result.data.chats;
        const container = document.getElementById('chatList');
        
        if (chats.length === 0) {
            container.innerHTML = '<p style="color:#666; text-align:center; padding:20px">No tienes conversaciones</p>';
            return;
        }
        
        container.innerHTML = chats.map(chat => `
            <div class="user-item" onclick="openChat('${chat._id}', '${chat.user.name}', '${chat.user.avatar}', '${chat.user.color}')">
                <div class="avatar-v" style="background:${chat.user.color}; width:50px; height:50px">
                    ${chat.user.avatar ? 
                        `<img src="${chat.user.avatar}" style="width:100%;height:100%;object-fit:cover">` : 
                        (chat.user.name || 'U')[0]}
                </div>
                <div style="flex:1">
                    <b>${chat.user.name || 'Usuario'}</b><br>
                    <small style="color:#666">
                        ${chat.lastMessage.type === 'text' ? 
                            escapeHtml(chat.lastMessage.content) : 
                            'Multimedia'}
                    </small>
                </div>
                ${chat.unreadCount > 0 ? 
                    `<div class="unread-badge">${chat.unreadCount}</div>` : 
                    ''}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando inbox:', error);
    }
}

async function openChat(userId, userName, userAvatar, userColor) {
    activeChatUserId = userId;
    document.getElementById('chatView').style.display = 'flex';
    document.getElementById('chatContactName').innerText = userName || 'Usuario';
    
    const avatarEl = document.getElementById('chatContactAvatar');
    setAvatar(avatarEl, { _id: userId, name: userName, avatar: userAvatar, color: userColor });
    
    loadMessages();
}

async function loadMessages() {
    if (!activeChatUserId) return;
    
    // Para Supabase, necesitaríamos implementar carga de mensajes específicos
    const area = document.getElementById('msgArea');
    area.innerHTML = '<p style="color:#666; text-align:center">Cargando mensajes...</p>';
    
    // TODO: Implementar carga de mensajes de Supabase
}

async function sendTextMsg() {
    const input = document.getElementById('msgInput');
    const content = input.value.trim();
    
    if (!content || !activeChatUserId) return;
    
    try {
        await nexusAPI.sendMessage(activeChatUserId, content, 'text');
        input.value = '';
        loadMessages();
        
    } catch (error) {
        console.error('Error enviando mensaje:', error);
    }
}

async function sendMediaMsg(type) {
    if (!activeChatUserId) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : 'video/*';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                await nexusAPI.sendMessage(activeChatUserId, '', type, file);
                loadMessages();
            } catch (error) {
                alert("Error enviando archivo: " + error.message);
            }
        }
    };
    
    input.click();
}

function closeChat() {
    document.getElementById('chatView').style.display = 'none';
    activeChatUserId = null;
    renderInbox();
}

// ==================== COMENTARIOS ====================
async function openComments(videoId) {
    activeVidId = videoId;
    
    try {
        const result = await nexusAPI.getVideo(videoId);
        const video = result.data.video;
        const comments = video.comments || [];
        
        document.getElementById('commList').innerHTML = comments.map(comment => `
            <div style="margin-bottom:15px; display:flex; gap:10px; align-items:start">
                <div class="avatar-v" style="width:25px; height:25px; font-size:10px; background:#444">
                    ${comment.user_avatar ? 
                        `<img src="${comment.user_avatar}" style="width:100%;height:100%;object-fit:cover">` : 
                        (comment.user || 'U')[0]}
                </div>
                <div>
                    <b style="font-size:12px">${escapeHtml(comment.user || 'Usuario')}</b><br>
                    ${escapeHtml(comment.text)}
                </div>
            </div>
        `).join('') || "<p style='color:#555; text-align:center'>No hay comentarios aún.</p>";
        
        openModal('commentModal');
        
    } catch (error) {
        console.error('Error cargando comentarios:', error);
    }
}

async function postComment() {
    const text = document.getElementById('commInput').value.trim();
    if (!text || !activeVidId) return;
    
    try {
        await nexusAPI.commentVideo(activeVidId, text);
        document.getElementById('commInput').value = '';
        openComments(activeVidId);
        renderHome();
    } catch (error) {
        alert("Error publicando comentario: " + error.message);
    }
}

// ==================== UTILIDADES ====================
function validEmailFormat(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str).replace(/[&<>"'`=\/]/g, function (s) {
        return ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;',
            '`': '&#x60;',
            '=': '&#x3D;'
        })[s];
    });
}

function changePage(id, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
    document.getElementById(id).classList.add('active-page');
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');
    
    if (id === 'inboxPage') renderInbox();
    if (id === 'shortsPage') renderShorts();
    if (id === 'homePage') renderHome();
}

async function renderShorts() {
    try {
        const result = await nexusAPI.getVideos(1, 20, 'short');
        const shorts = result.data.videos;
        const container = document.getElementById('shortsPage');
        
        container.innerHTML = shorts.map(short => `
            <div class="short-frame">
                <video src="${short.video_url}" loop playsinline onclick="this.paused?this.play():this.pause()"></video>
                <div class="short-side">
                    <div class="avatar-v" style="background:${short.author_color}; border:2px solid white">
                        ${short.author_avatar ? 
                            `<img src="${short.author_avatar}" style="width:100%;height:100%;object-fit:cover">` : 
                            (short.author_name || 'U')[0]}
                    </div>
                    <button class="side-btn ${isLikedByUser(short)?'active-l':''}" onclick="toggleLike('${short.id}', this)">
                        <i class="fas fa-heart fa-2x"></i>
                        <span>${short.likes ? short.likes.length : 0}</span>
                    </button>
                    <button class="side-btn" onclick="openComments('${short.id}')">
                        <i class="fas fa-comment fa-2x"></i>
                        <span>${short.comments ? short.comments.length : 0}</span>
                    </button>
                    <button class="side-btn" onclick="shareVideo('${short.id}')">
                        <i class="fas fa-share fa-2x"></i>
                    </button>
                    ${short.author_email === user.email ? 
                        `<button class="side-btn" onclick="deleteVideo('${short.id}')" style="color:#ff3b30">
                            <i class="fas fa-trash fa-lg"></i>
                        </button>` : 
                        ''}
                </div>
                <div style="position:absolute; bottom:30px; left:20px; text-shadow:0 2px 10px #000; pointer-events:none">
                    <b>@${escapeHtml(short.author_name || 'usuario')}</b>
                    <p style="margin:5px 0">${escapeHtml(short.title)}</p>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando shorts:', error);
    }
}

function shareVideo(videoId) {
    // Implementar compartir video
    alert('Función de compartir próximamente');
}

function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

function isLikedByUser(video) {
    if (!user || !video.likes) return false;
    return video.likes.includes(user.email);
}

function viewStoryGroup(userId) {
    // Implementar visualización de stories
    alert('Visualización de stories próximamente');
}

// ==================== BÚSQUEDA ====================
(function() {
    const input = document.getElementById('globalSearch');
    const resultsBox = document.getElementById('searchResultsBox');
    let searchTimeout = null;
    
    input.addEventListener('input', async () => {
        const query = input.value.trim().toLowerCase();
        if (!query) {
            resultsBox.style.display = 'none';
            resultsBox.innerHTML = '';
            return;
        }
        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            try {
                const [usersResult, videosResult] = await Promise.all([
                    nexusAPI.searchUsers(query, 5),
                    nexusAPI.getVideos(1, 5, 'video')
                ]);
                
                const users = usersResult.data.users;
                const videos = videosResult.data.videos.filter(v => 
                    v.title.toLowerCase().includes(query) || 
                    (v.author_name && v.author_name.toLowerCase().includes(query))
                );
                
                resultsBox.innerHTML = '';
                
                if (users.length === 0 && videos.length === 0) {
                    resultsBox.innerHTML = '<div style="padding:8px;color:#aaa">Sin resultados</div>';
                }
                
                users.forEach(u => {
                    resultsBox.innerHTML += `
                        <div style="padding:8px; border-bottom:1px solid #111; cursor:pointer" 
                             onclick="goToUserProfile('${u.email}')">
                            ${escapeHtml(u.name || 'Usuario')} <small style="color:#666">(${escapeHtml(u.email)})</small>
                        </div>
                    `;
                });
                
                videos.forEach(v => {
                    resultsBox.innerHTML += `
                        <div style="padding:8px; border-bottom:1px solid #111; cursor:pointer" 
                             onclick="changePage('homePage'); resultsBox.style.display='none'">
                            ${escapeHtml(v.title)} <small style="color:#666">- ${escapeHtml(v.author_name || 'Usuario')}</small>
                        </div>
                    `;
                });
                
                resultsBox.style.display = 'block';
                
            } catch (error) {
                console.error('Error en búsqueda:', error);
            }
        }, 300);
    });
    
    document.addEventListener('click', (ev) => {
        if (!resultsBox.contains(ev.target) && ev.target !== input) {
            resultsBox.style.display = 'none';
        }
    });
})();

async function goToUserProfile(email) {
    try {
        const result = await nexusAPI.getUser(email);
        const userData = result.data.user;
        
        // Actualizar página de perfil
        changePage('profilePage');
        document.getElementById('pNameDisp').innerText = userData.name || 'Usuario';
        document.getElementById('pEmailDisp').innerText = userData.email;
        
        document.getElementById('searchResultsBox').style.display = 'none';
        
    } catch (error) {
        console.error('Error cargando perfil:', error);
    }
}

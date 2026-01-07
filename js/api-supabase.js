// API Client para Nexus con Supabase Directo
class NexusAPI {
    constructor() {
        // Configuración de Supabase (usa tus credenciales existentes)
        this.supabaseUrl = "https://dmlwrwovwzvcfeoxyxtb.supabase.co";
        this.supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtbHdyd292d3p2Y2Zlb3h5eHRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NjMzNTgsImV4cCI6MjA4MzIzOTM1OH0.hukw5FC7S3gV-4PFh1Bskj9dm_7qsNTrrKVJqh2ORMQ";
        
        this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
        this.user = JSON.parse(localStorage.getItem('nexus_user') || 'null');
        this.session = null;
    }

    // Inicializar sesión
    async initSession() {
        const { data: { session } } = await this.supabase.auth.getSession();
        this.session = session;
        if (session) {
            this.user = session.user.user_metadata;
            localStorage.setItem('nexus_user', JSON.stringify(this.user));
        }
        return session;
    }

    // Guardar usuario
    setUser(user) {
        this.user = user;
        localStorage.setItem('nexus_user', JSON.stringify(user));
    }

    // Limpiar auth
    clearAuth() {
        this.user = null;
        this.session = null;
        localStorage.removeItem('nexus_user');
    }

    // ==================== AUTENTICACIÓN ====================
    async register(name, email, password) {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        color: '#' + Math.floor(Math.random()*16777215).toString(16)
                    }
                }
            });

            if (error) throw error;

            // Crear perfil en la tabla users
            const { error: profileError } = await this.supabase
                .from('users')
                .insert([{
                    email,
                    name,
                    color: '#' + Math.floor(Math.random()*16777215).toString(16),
                    created_at: new Date().toISOString()
                }]);

            if (profileError) console.error('Error creando perfil:', profileError);

            this.setUser(data.user.user_metadata);
            return { success: true, data: { user: data.user.user_metadata } };
        } catch (error) {
            console.error('Error en registro:', error);
            throw error;
        }
    }

    async login(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            this.session = data.session;
            this.setUser(data.user.user_metadata);
            return { success: true, data: { user: data.user.user_metadata } };
        } catch (error) {
            console.error('Error en login:', error);
            throw error;
        }
    }

    async getProfile() {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('email', this.user.email)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (data) {
                this.setUser(data);
            }
            return { success: true, data: { user: data || this.user } };
        } catch (error) {
            console.error('Error obteniendo perfil:', error);
            throw error;
        }
    }

    async updateProfile(profileData) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .update(profileData)
                .eq('email', this.user.email)
                .select()
                .single();

            if (error) throw error;

            this.setUser(data);
            return { success: true, data: { user: data } };
        } catch (error) {
            console.error('Error actualizando perfil:', error);
            throw error;
        }
    }

    async logout() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            this.clearAuth();
            return { success: true };
        } catch (error) {
            console.error('Error en logout:', error);
            this.clearAuth();
            return { success: true };
        }
    }

    // ==================== VIDEOS ====================
    async uploadVideo(file, title, description = '', type = 'video', tags = '') {
        try {
            // Subir archivo a Supabase Storage
            const fileName = `${Date.now()}_${file.name}`;
            const { data: uploadData, error: uploadError } = await this.supabase.storage
                .from('videos')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Obtener URL pública
            const { data: { publicUrl } } = this.supabase.storage
                .from('videos')
                .getPublicUrl(fileName);

            // Crear registro en la tabla videos
            const videoData = {
                title,
                description,
                video_url: publicUrl,
                type,
                author_email: this.user.email,
                author_name: this.user.name,
                author_color: this.user.color,
                author_avatar: this.user.avatar,
                likes: [],
                comments: [],
                views: 0,
                created_at: new Date().toISOString()
            };

            const { data, error } = await this.supabase
                .from('videos')
                .insert([videoData])
                .select()
                .single();

            if (error) throw error;

            return { success: true, data: { video: data } };
        } catch (error) {
            console.error('Error subiendo video:', error);
            throw error;
        }
    }

    async getVideos(page = 1, limit = 10, type = 'video') {
        try {
            const { data, error } = await this.supabase
                .from('videos')
                .select('*')
                .eq('type', type)
                .order('created_at', { ascending: false })
                .range((page - 1) * limit, page * limit - 1);

            if (error) throw error;

            return { success: true, data: { videos: data || [] } };
        } catch (error) {
            console.error('Error obteniendo videos:', error);
            throw error;
        }
    }

    async getVideo(id) {
        try {
            const { data, error } = await this.supabase
                .from('videos')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            // Incrementar vistas
            await this.supabase
                .from('videos')
                .update({ views: (data.views || 0) + 1 })
                .eq('id', id);

            return { success: true, data: { video: data } };
        } catch (error) {
            console.error('Error obteniendo video:', error);
            throw error;
        }
    }

    async likeVideo(id) {
        try {
            const { data: video, error: getError } = await this.supabase
                .from('videos')
                .select('likes')
                .eq('id', id)
                .single();

            if (getError) throw getError;

            const likes = video.likes || [];
            const userEmail = this.user.email;
            const isLiked = likes.includes(userEmail);

            const updatedLikes = isLiked 
                ? likes.filter(email => email !== userEmail)
                : [...likes, userEmail];

            const { data, error } = await this.supabase
                .from('videos')
                .update({ likes: updatedLikes })
                .eq('id', id)
                .select('likes')
                .single();

            if (error) throw error;

            return { 
                success: true, 
                data: { 
                    liked: !isLiked, 
                    likesCount: data.likes.length 
                } 
            };
        } catch (error) {
            console.error('Error en like:', error);
            throw error;
        }
    }

    async commentVideo(id, text) {
        try {
            const { data: video, error: getError } = await this.supabase
                .from('videos')
                .select('comments')
                .eq('id', id)
                .single();

            if (getError) throw getError;

            const comments = video.comments || [];
            const newComment = {
                user: this.user.name,
                user_email: this.user.email,
                user_avatar: this.user.avatar,
                user_color: this.user.color,
                text,
                created_at: new Date().toISOString()
            };

            const updatedComments = [...comments, newComment];

            const { data, error } = await this.supabase
                .from('videos')
                .update({ comments: updatedComments })
                .eq('id', id)
                .select('comments')
                .single();

            if (error) throw error;

            return { success: true, data: { comment: newComment } };
        } catch (error) {
            console.error('Error en comentario:', error);
            throw error;
        }
    }

    async deleteVideo(id) {
        try {
            const { data: video, error: getError } = await this.supabase
                .from('videos')
                .select('*')
                .eq('id', id)
                .single();

            if (getError) throw getError;

            // Verificar si es el autor
            if (video.author_email !== this.user.email) {
                throw new Error('No tienes permisos para eliminar este video');
            }

            // Eliminar archivo del storage
            const fileName = video.video_url.split('/').pop();
            await this.supabase.storage
                .from('videos')
                .remove([fileName]);

            // Eliminar registro
            const { error } = await this.supabase
                .from('videos')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Error eliminando video:', error);
            throw error;
        }
    }

    // ==================== STORIES ====================
    async uploadStory(file) {
        try {
            const fileName = `story_${Date.now()}_${file.name}`;
            const { error: uploadError } = await this.supabase.storage
                .from('stories')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = this.supabase.storage
                .from('stories')
                .getPublicUrl(fileName);

            const storyData = {
                image_url: publicUrl,
                author_email: this.user.email,
                author_name: this.user.name,
                author_color: this.user.color,
                author_avatar: this.user.avatar,
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            const { data, error } = await this.supabase
                .from('stories')
                .insert([storyData])
                .select()
                .single();

            if (error) throw error;

            return { success: true, data: { story: data } };
        } catch (error) {
            console.error('Error subiendo story:', error);
            throw error;
        }
    }

    async getStories() {
        try {
            const { data, error } = await this.supabase
                .from('stories')
                .select('*')
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Agrupar por usuario
            const storiesByUser = {};
            data.forEach(story => {
                const key = story.author_email;
                if (!storiesByUser[key]) {
                    storiesByUser[key] = {
                        user: {
                            _id: story.author_email,
                            name: story.author_name,
                            avatar: story.author_avatar,
                            color: story.author_color
                        },
                        stories: []
                    };
                }
                storiesByUser[key].stories.push(story);
            });

            return { success: true, data: { stories: Object.values(storiesByUser) } };
        } catch (error) {
            console.error('Error obteniendo stories:', error);
            throw error;
        }
    }

    // ==================== USUARIOS ====================
    async searchUsers(query, limit = 10) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
                .limit(limit);

            if (error) throw error;

            return { success: true, data: { users: data || [] } };
        } catch (error) {
            console.error('Error buscando usuarios:', error);
            throw error;
        }
    }

    async getUser(email) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            return { success: true, data: { user: data } };
        } catch (error) {
            console.error('Error obteniendo usuario:', error);
            throw error;
        }
    }

    // ==================== CHAT ====================
    async getChats() {
        try {
            const { data, error } = await this.supabase
                .from('chats')
                .select('*')
                .or(`from_email.eq.${this.user.email},to_email.eq.${this.user.email}`)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Agrupar por chat y obtener último mensaje
            const chatsMap = new Map();
            data.forEach(msg => {
                const otherEmail = msg.from_email === this.user.email ? msg.to_email : msg.from_email;
                if (!chatsMap.has(otherEmail) || new Date(msg.created_at) > new Date(chatsMap.get(otherEmail).created_at)) {
                    chatsMap.set(otherEmail, msg);
                }
            });

            const chats = Array.from(chatsMap.entries()).map(([email, lastMessage]) => ({
                _id: email,
                user: { _id: email, name: lastMessage.from_email === this.user.email ? lastMessage.to_name : lastMessage.from_name },
                lastMessage,
                unreadCount: 0 // TODO: Implementar conteo de no leídos
            }));

            return { success: true, data: { chats } };
        } catch (error) {
            console.error('Error obteniendo chats:', error);
            throw error;
        }
    }

    async sendMessage(toEmail, content, type = 'text', file = null) {
        try {
            let fileUrl = null;
            if (file) {
                const fileName = `chat_${Date.now()}_${file.name}`;
                const { error: uploadError } = await this.supabase.storage
                    .from('chats')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = this.supabase.storage
                    .from('chats')
                    .getPublicUrl(fileName);

                fileUrl = publicUrl;
            }

            const messageData = {
                from_email: this.user.email,
                from_name: this.user.name,
                from_avatar: this.user.avatar,
                to_email,
                to_name: toEmail, // TODO: Obtener nombre real
                content: type === 'text' ? content : null,
                type,
                file_url: fileUrl,
                created_at: new Date().toISOString(),
                read: false
            };

            const { data, error } = await this.supabase
                .from('chats')
                .insert([messageData])
                .select()
                .single();

            if (error) throw error;

            return { success: true, data: { message: data } };
        } catch (error) {
            console.error('Error enviando mensaje:', error);
            throw error;
        }
    }

    // ==================== UTILIDADES ====================
    isAuthenticated() {
        return !!this.user;
    }

    getCurrentUser() {
        return this.user;
    }
}

// Crear instancia global inmediatamente
const nexusAPI = new NexusAPI();

// Exportar para uso en otros scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NexusAPI;
} else {
    window.NexusAPI = NexusAPI;
    window.nexusAPI = nexusAPI;
}

// Forzar disponibilidad global
console.log('nexusAPI cargado:', typeof nexusAPI !== 'undefined');

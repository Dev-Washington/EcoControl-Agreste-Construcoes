// Sistema de Trocar Foto de Perfil
class PhotoManager {
    constructor() {
        this.currentUser = null;
        this.theme = 'light'; // Tema claro fixo
        this.selectedFile = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.loadCurrentPhoto();
        this.applyTheme();
    }

    checkAuth() {
        const user = sessionStorage.getItem('currentUser');
        if (!user) {
            window.location.href = '../login.html';
            return;
        }
        
        this.currentUser = JSON.parse(user);
        this.updateUserInfo();
    }

    updateUserInfo() {
        const userNameEl = document.getElementById('userName');
        const userRoleEl = document.getElementById('userRole');
        if (userNameEl) userNameEl.textContent = this.currentUser.name;
        if (userRoleEl) userRoleEl.textContent = this.getRoleDisplayName(this.currentUser.role);
        document.body.setAttribute('data-user-role', this.currentUser.role);
    }

    getRoleDisplayName(role) {
        const roles = {
            'gestor': 'Gestor',
            'atendente': 'Atendente',
            'motorista': 'Motorista',
            'funcionario': 'Funcionário'
        };
        return roles[role] || role;
    }

    setupEventListeners() {
        // Upload area click
        document.getElementById('uploadArea').addEventListener('click', () => {
            document.getElementById('photoInput').click();
        });

        // File input change
        document.getElementById('photoInput').addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });

        // Drag and drop
        const uploadArea = document.getElementById('uploadArea');
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.handleFileSelect(file);
            } else {
                alert('Por favor, selecione apenas arquivos de imagem.');
            }
        });

        // Save photo button
        document.getElementById('savePhotoBtn').addEventListener('click', () => {
            this.savePhoto();
        });

        // Cancel button
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.cancelSelection();
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettingsModal();
        });
    }

    loadCurrentPhoto() {
        // Carregar foto atual do usuário (se existir)
        const userPhoto = this.currentUser.photo || 'https://via.placeholder.com/200';
        const currentPhotoEl = document.getElementById('currentPhoto');
        const userAvatarEl = document.getElementById('userAvatar');
        if (currentPhotoEl) currentPhotoEl.src = userPhoto;
        if (userAvatarEl) userAvatarEl.src = userPhoto;
    }

    handleFileSelect(file) {
        if (!file) return;

        // Validar tipo de arquivo
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione apenas arquivos de imagem (JPG, PNG, GIF).');
            return;
        }

        // Validar tamanho (5MB máximo)
        if (file.size > 5 * 1024 * 1024) {
            alert('O arquivo deve ter no máximo 5MB.');
            return;
        }

        this.selectedFile = file;

        // Mostrar pré-visualização
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('photoPreview').src = e.target.result;
            document.getElementById('previewSection').style.display = 'block';
            document.getElementById('savePhotoBtn').style.display = 'inline-block';
            document.getElementById('cancelBtn').style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
    }

    savePhoto() {
        if (!this.selectedFile) return;

        // Converter para base64
        const reader = new FileReader();
        reader.onload = (e) => {
            const photoData = e.target.result;
            
            // Atualizar usuário atual
            this.currentUser.photo = photoData;
            sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            // Atualizar lista de usuários no localStorage
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const userIndex = users.findIndex(u => u.id === this.currentUser.id);
            if (userIndex !== -1) {
                users[userIndex].photo = photoData;
                localStorage.setItem('users', JSON.stringify(users));
            }
            
            // Atualizar foto atual
            const currentPhotoEl = document.getElementById('currentPhoto');
            const userAvatarEl = document.getElementById('userAvatar');
            if (currentPhotoEl) currentPhotoEl.src = photoData;
            if (userAvatarEl) userAvatarEl.src = photoData;
            
            // Limpar seleção
            this.cancelSelection();
            
            alert('Foto de perfil atualizada com sucesso!');
        };
        reader.readAsDataURL(this.selectedFile);
    }

    cancelSelection() {
        this.selectedFile = null;
        document.getElementById('photoInput').value = '';
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('savePhotoBtn').style.display = 'none';
        document.getElementById('cancelBtn').style.display = 'none';
    }

    toggleTheme() {
        // Tema claro fixo - funcionalidade desabilitada
        this.setTheme('light');
    }

    setTheme(theme) {
        this.theme = 'light'; // Sempre claro
        localStorage.setItem('theme', 'light');
        this.applyTheme();
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', 'light');
        
        const themeIcon = document.querySelector('#themeToggle i');
        if (themeIcon) {
            themeIcon.className = 'fas fa-sun';
        }
    }

    openSettingsModal() {
        alert('Configurações em desenvolvimento');
    }
}

// Inicializar gerenciador de foto
let photoManager;
document.addEventListener('DOMContentLoaded', () => {
    photoManager = new PhotoManager();
});

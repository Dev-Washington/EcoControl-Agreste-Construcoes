// Sistema de Gerenciamento de Perfil
class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.theme = 'light'; // Tema claro fixo
        this.currentTab = 'personal';
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadUserData();
        this.setupEventListeners();
        this.renderProfile();
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

    checkPermissions() {
        const adminElements = document.querySelectorAll('.admin-only');
        const managerElements = document.querySelectorAll('.manager-only');
        const employeeElements = document.querySelectorAll('.employee-only');
        
        const canAccessAdmin = ['administrador', 'desenvolvedor'].includes(this.currentUser.role);
        const canAccessManager = ['gestor', 'administrador', 'desenvolvedor'].includes(this.currentUser.role);
        const canAccessEmployee = ['motorista', 'operador', 'gestor', 'administrador', 'desenvolvedor'].includes(this.currentUser.role);
        
        // Controle de acesso para administração
        adminElements.forEach(element => {
            element.style.display = canAccessAdmin ? 'block' : 'none';
        });
        
        // Controle de acesso para gestão
        managerElements.forEach(element => {
            element.style.display = canAccessManager ? 'block' : 'none';
        });
        
        // Controle de acesso para funcionários
        employeeElements.forEach(element => {
            element.style.display = canAccessEmployee ? 'block' : 'none';
        });
    }

    loadUserData() {
        // Carregar dados completos do usuário
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const fullUserData = users.find(u => u.id === this.currentUser.id) || this.currentUser;
        this.currentUser = { ...this.currentUser, ...fullUserData };
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Settings modal
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettingsModal();
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.currentTarget.dataset.tab);
            });
        });

        // Edit profile button
        document.getElementById('editProfileBtn').addEventListener('click', () => {
            this.openEditProfileModal();
        });

        // Change avatar button
        document.getElementById('changeAvatarBtn').addEventListener('click', () => {
            this.openChangeAvatarModal();
        });

        // Clickable photo and name - redirect to change photo page
        document.getElementById('profileAvatarContainer').addEventListener('click', () => {
            window.location.href = '../trocar-foto/trocar-foto.html';
        });

        document.getElementById('profileName').addEventListener('click', () => {
            window.location.href = '../trocar-foto/trocar-foto.html';
        });

        // Form submissions
        document.getElementById('changePasswordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePassword();
        });

        document.getElementById('changeEmailForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.changeEmail();
        });

        document.getElementById('editProfileForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProfile();
        });

        // Theme buttons
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const theme = e.currentTarget.dataset.theme;
                this.setTheme(theme);
            });
        });

        // Save preferences
        document.getElementById('savePreferencesBtn').addEventListener('click', () => {
            this.savePreferences();
        });

        // Avatar file input
        document.getElementById('avatarFile').addEventListener('change', (e) => {
            this.handleAvatarFile(e.target.files[0]);
        });

        // Modal events
        this.setupModalEvents();
    }

    setupModalEvents() {
        // Close modals
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal.style.display = 'none';
            });
        });

        // Cancel buttons
        document.getElementById('cancelEditBtn').addEventListener('click', () => {
            document.getElementById('editProfileModal').style.display = 'none';
        });

        document.getElementById('cancelAvatarBtn').addEventListener('click', () => {
            document.getElementById('changeAvatarModal').style.display = 'none';
        });

        // Save avatar
        document.getElementById('saveAvatarBtn').addEventListener('click', () => {
            this.saveAvatar();
        });

        // Remove avatar
        document.getElementById('removeAvatarBtn').addEventListener('click', () => {
            this.removeAvatar();
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });

        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
            if (panel.id === tabName + 'Tab') {
                panel.classList.add('active');
            }
        });
    }

    renderProfile() {
        // Update profile header
        document.getElementById('profileName').textContent = this.currentUser.name;
        document.getElementById('profileRole').textContent = this.getRoleDisplayName(this.currentUser.role);
        document.getElementById('profileEmail').textContent = this.currentUser.email;

        // Update personal information
        document.getElementById('displayName').textContent = this.currentUser.name || '-';
        document.getElementById('displayEmail').textContent = this.currentUser.email || '-';
        document.getElementById('displayPhone').textContent = this.currentUser.phone || '-';
        document.getElementById('displayRole').textContent = this.getRoleDisplayName(this.currentUser.role) || '-';
        document.getElementById('displayCompany').textContent = this.currentUser.company || '-';
        document.getElementById('displayCreatedAt').textContent = this.currentUser.createdAt ? 
            new Date(this.currentUser.createdAt).toLocaleDateString('pt-BR') : '-';
        document.getElementById('displayStatus').textContent = this.currentUser.status === 'active' ? 'Ativo' : 'Inativo';
        document.getElementById('displayLastAccess').textContent = new Date().toLocaleDateString('pt-BR');

        // Update avatar
        const avatarSrc = this.currentUser.avatar || 'https://via.placeholder.com/120';
        const profileAvatarEl = document.getElementById('profileAvatar');
        const userAvatarEl = document.getElementById('userAvatar');
        if (profileAvatarEl) profileAvatarEl.src = avatarSrc;
        if (userAvatarEl) userAvatarEl.src = avatarSrc;
    }

    openEditProfileModal() {
        // Populate form
        document.getElementById('editName').value = this.currentUser.name;
        document.getElementById('editPhone').value = this.currentUser.phone || '';
        document.getElementById('editCompany').value = this.currentUser.company || '';
        
        document.getElementById('editProfileModal').style.display = 'block';
    }

    updateProfile() {
        const formData = new FormData(document.getElementById('editProfileForm'));
        
        const updatedUser = {
            ...this.currentUser,
            name: formData.get('editName'),
            phone: formData.get('editPhone'),
            company: formData.get('editCompany')
        };

        // Update in localStorage
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.id === this.currentUser.id);
        
        if (userIndex !== -1) {
            users[userIndex] = updatedUser;
            localStorage.setItem('users', JSON.stringify(users));
        }

        // Update current user
        this.currentUser = updatedUser;
        sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));

        // Update UI
        this.renderProfile();
        this.updateUserInfo();

        document.getElementById('editProfileModal').style.display = 'none';
        alert('Perfil atualizado com sucesso!');
    }

    openChangeAvatarModal() {
        document.getElementById('changeAvatarModal').style.display = 'block';
    }

    handleAvatarFile(file) {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('avatarPreview').src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    saveAvatar() {
        const fileInput = document.getElementById('avatarFile');
        if (fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const avatarDataUrl = e.target.result;
                
                // Update user avatar
                const updatedUser = {
                    ...this.currentUser,
                    avatar: avatarDataUrl
                };

                // Update in localStorage
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                const userIndex = users.findIndex(u => u.id === this.currentUser.id);
                
                if (userIndex !== -1) {
                    users[userIndex] = updatedUser;
                    localStorage.setItem('users', JSON.stringify(users));
                }

                // Update current user
                this.currentUser = updatedUser;
                sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));

                // Update UI
                this.renderProfile();
                this.updateUserInfo();

                document.getElementById('changeAvatarModal').style.display = 'none';
                alert('Foto de perfil atualizada com sucesso!');
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            alert('Por favor, selecione uma imagem.');
        }
    }

    removeAvatar() {
        const self = this;
        window.showGlobalConfirmModal(
            'Remover Foto de Perfil',
            'Tem certeza que deseja remover sua foto de perfil?',
            () => {
                self.executeRemoveAvatar();
            }
        );
        return;
    }
    
    executeRemoveAvatar() {
        // Update user avatar
        const updatedUser = {
            ...this.currentUser,
            avatar: null
        };

        // Update in localStorage
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.id === this.currentUser.id);
        
        if (userIndex !== -1) {
            users[userIndex] = updatedUser;
            localStorage.setItem('users', JSON.stringify(users));
        }

        // Update current user
        this.currentUser = updatedUser;
        sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));

        // Update UI
        this.renderProfile();
        this.updateUserInfo();

        document.getElementById('changeAvatarModal').style.display = 'none';
        window.showGlobalInfoModal('Sucesso', 'Foto de perfil removida com sucesso!');
        }
    }

    changePassword() {
        const formData = new FormData(document.getElementById('changePasswordForm'));
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        // Validate current password
        if (currentPassword !== this.currentUser.password) {
            alert('Senha atual incorreta!');
            return;
        }

        // Validate new password
        if (newPassword !== confirmPassword) {
            alert('As senhas não coincidem!');
            return;
        }

        if (newPassword.length < 6) {
            alert('A nova senha deve ter pelo menos 6 caracteres!');
            return;
        }

        // Update password
        const updatedUser = {
            ...this.currentUser,
            password: newPassword
        };

        // Update in localStorage
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.id === this.currentUser.id);
        
        if (userIndex !== -1) {
            users[userIndex] = updatedUser;
            localStorage.setItem('users', JSON.stringify(users));
        }

        // Update current user
        this.currentUser = updatedUser;
        sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));

        document.getElementById('changePasswordForm').reset();
        alert('Senha alterada com sucesso!');
    }

    changeEmail() {
        const formData = new FormData(document.getElementById('changeEmailForm'));
        const newEmail = formData.get('newEmail');
        const password = formData.get('emailPassword');

        // Validate password
        if (password !== this.currentUser.password) {
            alert('Senha incorreta!');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            alert('Por favor, insira um email válido!');
            return;
        }

        // Check if email already exists
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const emailExists = users.some(u => u.email === newEmail && u.id !== this.currentUser.id);
        
        if (emailExists) {
            alert('Este email já está sendo usado por outro usuário!');
            return;
        }

        // Create email change request
        const emailChangeRequest = {
            id: Date.now().toString(),
            userId: this.currentUser.id,
            oldEmail: this.currentUser.email,
            newEmail: newEmail,
            status: 'pending',
            requestedAt: new Date().toISOString()
        };

        // Save request
        const emailRequests = JSON.parse(localStorage.getItem('emailChangeRequests') || '[]');
        emailRequests.push(emailChangeRequest);
        localStorage.setItem('emailChangeRequests', JSON.stringify(emailRequests));

        document.getElementById('changeEmailForm').reset();
        alert('Solicitação de alteração de email enviada! Aguarde a aprovação de um administrador.');
    }

    setTheme(theme) {
        this.theme = 'light'; // Sempre claro
        localStorage.setItem('theme', 'light');
        this.applyTheme();
        
        // Update theme buttons
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.theme === 'light') {
                btn.classList.add('active');
            }
        });
    }

    savePreferences() {
        const preferences = {
            theme: this.theme,
            emailNotifications: document.getElementById('emailNotifications').checked,
            systemNotifications: document.getElementById('systemNotifications').checked,
            language: document.getElementById('language').value,
            timezone: document.getElementById('timezone').value
        };

        localStorage.setItem('userPreferences', JSON.stringify(preferences));
        alert('Preferências salvas com sucesso!');
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        this.setTheme(this.theme);
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        
        const themeIcon = document.querySelector('#themeToggle i');
        if (themeIcon) {
            themeIcon.className = 'fas fa-sun';
        }
    }

    openSettingsModal() {
        // Implementar modal de configurações se necessário
        alert('Configurações em desenvolvimento');
    }
}

// Inicializar gerenciador de perfil
document.addEventListener('DOMContentLoaded', () => {
    new ProfileManager();
});

// Sistema de Solicitação de Acesso
class RequestAccessSystem {
    constructor() {
        this.currentUser = null;
        this.theme = 'light'; // Tema claro fixo
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.applyTheme();
    }

    checkAuth() {
        // Permitir acesso sem login para solicitar acesso
        const user = sessionStorage.getItem('currentUser');
        if (user) {
            this.currentUser = JSON.parse(user);
            this.updateUserInfo();
        }
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

    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Settings modal
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettingsModal();
        });

        // Access request form submission
        document.getElementById('accessRequestForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRequestAccess();
        });

        // Phone formatting - apenas números e limite de caracteres
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            // Limitar entrada apenas a números
            phoneInput.addEventListener('keypress', (e) => {
                const char = String.fromCharCode(e.which);
                if (!/[0-9]/.test(char)) {
                    e.preventDefault();
                }
            });
            
            // Formatação e limite de caracteres
            phoneInput.addEventListener('input', (e) => {
                this.formatPhone(e.target);
            });
            
            // Prevenir colar texto não numérico
            phoneInput.addEventListener('paste', (e) => {
                e.preventDefault();
                const paste = (e.clipboardData || window.clipboardData).getData('text');
                const numbers = paste.replace(/\D/g, '');
                if (numbers) {
                    e.target.value = '';
                    e.target.value = numbers.substring(0, 11);
                    this.formatPhone(e.target);
                }
            });
        }
    }

    formatPhone(input) {
        // Remove tudo que não é número
        let value = input.value.replace(/\D/g, '');
        
        // Limita a 11 dígitos (telefone brasileiro: DDD + 9 dígitos)
        if (value.length > 11) {
            value = value.substring(0, 11);
        }
        
        // Aplica formatação
        if (value.length > 0) {
            if (value.length <= 2) {
                value = `(${value}`;
            } else if (value.length <= 7) {
                value = value.replace(/^(\d{2})(\d+)/, '($1) $2');
            } else {
                value = value.replace(/^(\d{2})(\d{5})(\d+)/, '($1) $2-$3');
            }
        }
        
        input.value = value;
    }

    async handleRequestAccess() {
        const form = document.getElementById('accessRequestForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Show loading state
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            const formData = new FormData(form);
            const password = formData.get('password');
            
            // Validar senha (mínimo 6 caracteres)
            if (!password || password.length < 6) {
                throw new Error('A senha deve ter no mínimo 6 caracteres.');
            }

            const requestData = {
                id: 'REQ-' + Date.now(),
                fullName: formData.get('fullName'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                password: password, // Senha solicitada pelo usuário
                desiredRole: formData.get('desiredRole'),
                systemType: formData.get('systemType'),
                reason: formData.get('reason'),
                status: 'pending',
                requestedBy: this.currentUser ? this.currentUser.id : null,
                createdAt: new Date().toISOString()
            };

            // Validate form data
            if (!this.validateRequestData(requestData)) {
                throw new Error('Por favor, preencha todos os campos obrigatórios corretamente.');
            }

            // Save request
            const requests = JSON.parse(localStorage.getItem('accessRequests') || '[]');
            requests.push(requestData);
            localStorage.setItem('accessRequests', JSON.stringify(requests));

            // Show success message
            this.showSuccessMessage();
            
            // Reset form
            form.reset();
            
        } catch (error) {
            this.showErrorMessage(error.message);
        } finally {
            // Remove loading state
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }

    validateRequestData(data) {
        // Check required fields
        if (!data.fullName || !data.email || !data.password || !data.desiredRole || !data.systemType || !data.reason) {
            return false;
        }

        // Validate password (mínimo 6 caracteres)
        if (data.password.length < 6) {
            return false;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            return false;
        }

        // Check if email already has a pending request
        const existingRequests = JSON.parse(localStorage.getItem('accessRequests') || '[]');
        const hasPendingRequest = existingRequests.some(req => 
            req.email === data.email && req.status === 'pending'
        );

        if (hasPendingRequest) {
            throw new Error('Já existe uma solicitação pendente para este email.');
        }

        return true;
    }

    showSuccessMessage() {
        // Remove existing messages
        this.hideMessages();

        const successMessage = document.createElement('div');
        successMessage.className = 'success-message show';
        successMessage.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <div class="success-message-content">
                <h3>Solicitação Enviada com Sucesso!</h3>
                <p>Sua solicitação foi enviada e será analisada pela equipe de administração. Você receberá uma resposta por email em até 48 horas.</p>
            </div>
        `;

        const form = document.getElementById('requestAccessForm');
        form.insertBefore(successMessage, form.firstChild);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            successMessage.remove();
        }, 5000);
    }

    showErrorMessage(message) {
        // Remove existing messages
        this.hideMessages();

        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message show';
        errorMessage.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <div class="error-message-content">
                <h3>Erro ao Enviar Solicitação</h3>
                <p>${message}</p>
            </div>
        `;

        const form = document.getElementById('requestAccessForm');
        form.insertBefore(errorMessage, form.firstChild);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorMessage.remove();
        }, 5000);
    }

    hideMessages() {
        const existingMessages = document.querySelectorAll('.success-message, .error-message');
        existingMessages.forEach(msg => msg.remove());
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

    handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        // Basic validation
        if (!email || !password) {
            this.showLoginError('Por favor, preencha email e senha.');
            return;
        }

        // For now, show development message
        // In a real implementation, this would authenticate against a backend
        alert('Sistema de login em desenvolvimento. Use o botão "Solicitar Acesso" para acessar o formulário.');
    }

    showRequestForm() {
        // Hide login panel
        document.getElementById('loginPanel').style.display = 'none';

        // Show request form panel
        document.getElementById('requestFormPanel').style.display = 'block';

        // Update page header
        const headerContent = document.querySelector('.header-content h1');
        if (headerContent) {
            headerContent.innerHTML = '<i class="fas fa-user-plus"></i> Solicitar Acesso';
        }
        const headerDesc = document.querySelector('.header-content p');
        if (headerDesc) {
            headerDesc.textContent = 'Preencha o formulário para solicitar acesso ao sistema';
        }
    }

    showLoginError(message) {
        // Remove existing messages
        this.hideMessages();

        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message show';
        errorMessage.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <div class="error-message-content">
                <h3>Erro de Login</h3>
                <p>${message}</p>
            </div>
        `;

        const loginForm = document.getElementById('loginForm');
        loginForm.insertBefore(errorMessage, loginForm.firstChild);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorMessage.remove();
        }, 5000);
    }

    openSettingsModal() {
        // Implementar modal de configurações se necessário
        alert('Configurações em desenvolvimento');
    }
}

// Inicializar sistema de solicitação de acesso
document.addEventListener('DOMContentLoaded', () => {
    new RequestAccessSystem();
});

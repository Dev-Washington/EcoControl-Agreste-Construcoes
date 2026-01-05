// Sistema de Login
class LoginSystem {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingSession();
    }

    checkExistingSession() {
        const user = sessionStorage.getItem('currentUser');
        if (user) {
            // User already logged in, redirect to dashboard
            window.location.href = 'front-end/dashboard/dashboard.html';
        }
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Access request form switching
        const requestAccessBtn = document.getElementById('requestAccessBtn');
        const backToLoginBtn = document.getElementById('backToLoginBtn');
        const accessRequestForm = document.getElementById('accessRequestForm');

        if (requestAccessBtn) {
            requestAccessBtn.addEventListener('click', () => {
                this.showRequestForm();
            });
        }

        if (backToLoginBtn) {
            backToLoginBtn.addEventListener('click', () => {
                this.showLoginForm();
            });
        }

        if (accessRequestForm) {
            accessRequestForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAccessRequest();
            });
        }

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

    handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('loginBtn');

        // Basic validation
        if (!email || !password) {
            this.showError('Por favor, preencha email e senha.');
            return;
        }

        // Show loading overlay
        this.showLoading('Verificando credenciais...');
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;

        // Simulate async operation for better UX
        setTimeout(() => {
            try {
                // Buscar usuários do localStorage
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                const employees = JSON.parse(localStorage.getItem('employees') || '[]');
                const allUsers = [...users, ...employees];

                // Verificar credenciais hardcoded do desenvolvedor primeiro
                let user = null;
                if (email.toLowerCase() === 'desenvolvedor@control.com' && password === 'admin123') {
                    // Criar/atualizar usuário desenvolvedor
                    user = {
                        id: 1,
                        name: 'Desenvolvedor',
                        email: 'desenvolvedor@control.com',
                        password: 'admin123',
                        role: 'gestor', // Gestor tem acesso total
                        phone: '(11) 99999-9999',
                        company: 'Agreste Construção',
                        status: 'active',
                        photo: 'img/LOGO1.png',
                        systemType: 'dashboard'
                    };

                    // Garantir que existe no localStorage
                    const existingUserIndex = users.findIndex(u => u.email === 'desenvolvedor@control.com' || u.id === 1);
                    if (existingUserIndex !== -1) {
                        users[existingUserIndex] = { ...users[existingUserIndex], ...user };
                    } else {
                        users.push(user);
                    }
                    localStorage.setItem('users', JSON.stringify(users));

                    // Também garantir em employees para acesso ao sistema de funcionário
                    const existingEmployeeIndex = employees.findIndex(e => e.email === 'desenvolvedor@control.com' || e.id === 1);
                    const employeeUser = { ...user, systemType: 'funcionario' };
                    if (existingEmployeeIndex !== -1) {
                        employees[existingEmployeeIndex] = { ...employees[existingEmployeeIndex], ...employeeUser };
                    } else {
                        employees.push(employeeUser);
                    }
                    localStorage.setItem('employees', JSON.stringify(employees));
                } else {
                    // Buscar usuário por email nos dados salvos
                    user = allUsers.find(u => 
                        u.email && u.email.toLowerCase() === email.toLowerCase()
                    );

                    if (!user) {
                        throw new Error('Email ou senha incorretos.');
                    }

                    // Permitir que funcionários e motoristas também acessem o sistema principal
                    // Verificar se é funcionário ou motorista e permitir acesso
                    const allowedRoles = ['gestor', 'atendente', 'motorista', 'funcionario'];
                    if (!allowedRoles.includes(user.role)) {
                        throw new Error('Acesso não permitido para este tipo de usuário.');
                    }

                    // Verificar senha (simplificado - em produção usar hash)
                    // Por enquanto, aceita qualquer senha se o email existir
                }

                // Login successful
                this.loginUser(user, 'fake_access_token', 'fake_refresh_token');

            } catch (error) {
                this.showError(error.message);
            } finally {
                // Remove loading state
                this.hideLoading();
                loginBtn.classList.remove('loading');
                loginBtn.disabled = false;
            }
        }, 1000); // Simulate 1 second delay
    }

    loginUser(user, accessToken, refreshToken) {
        // Store user session and tokens
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        sessionStorage.setItem('accessToken', accessToken);
        sessionStorage.setItem('refreshToken', refreshToken);

        // Show loading screen for redirect
        this.showLoading('Carregando dashboard...');

        // Redirect to dashboard
        window.location.href = 'dashboard/dashboard.html';
    }

    showError(message) {
        this.hideMessages();

        const errorDiv = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');

        errorText.textContent = message;
        errorDiv.classList.add('show');

        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorDiv.classList.remove('show');
        }, 5000);
    }

    showSuccess(message) {
        this.hideMessages();

        const successDiv = document.getElementById('successMessage');
        const successText = document.getElementById('successText');

        successText.textContent = message;
        successDiv.classList.add('show');
    }

    hideMessages() {
        const errorDiv = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');

        errorDiv.classList.remove('show');
        successDiv.classList.remove('show');
    }

    showRequestForm() {
        const loginForm = document.getElementById('loginForm');
        const requestForm = document.getElementById('accessRequestForm');

        if (loginForm) loginForm.style.display = 'none';
        if (requestForm) requestForm.style.display = 'block';

        // Update header
        const headerTitle = document.querySelector('.login-header h1');
        const headerDesc = document.querySelector('.login-header p');
        const headerIcon = document.querySelector('.login-icon i');

        if (headerTitle) headerTitle.textContent = 'Agreste Construção';
        if (headerDesc) headerDesc.textContent = 'Solicite acesso ao sistema';
        if (headerIcon) headerIcon.className = 'fas fa-user-plus';
    }

    showLoginForm() {
        const loginForm = document.getElementById('loginForm');
        const requestForm = document.getElementById('accessRequestForm');

        if (requestForm) requestForm.style.display = 'none';
        if (loginForm) loginForm.style.display = 'block';

        // Reset header
        const headerTitle = document.querySelector('.login-header h1');
        const headerDesc = document.querySelector('.login-header p');
        const headerIcon = document.querySelector('.login-icon i');

        if (headerTitle) headerTitle.textContent = 'Agreste Construção';
        if (headerDesc) headerDesc.textContent = 'Faça login para acessar o sistema';
        if (headerIcon) headerIcon.className = 'fas fa-sign-in-alt';
    }

    async handleAccessRequest() {
        const fullName = document.getElementById('fullName').value;
        const email = document.getElementById('requestEmail').value;
        const phone = document.getElementById('phone').value;
        const password = document.getElementById('requestPassword').value;
        const desiredRole = document.getElementById('desiredRole').value;
        const systemType = document.getElementById('systemType').value;
        const reason = document.getElementById('reason').value;
        const submitBtn = document.getElementById('submitRequestBtn');

        // Basic validation
        if (!fullName || !email || !password || !desiredRole || !systemType || !reason) {
            this.showRequestError('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        // Validar senha (mínimo 6 caracteres)
        if (password.length < 6) {
            this.showRequestError('A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showRequestError('Por favor, insira um email válido.');
            return;
        }

        // Check if email already has a pending request
        const existingRequests = JSON.parse(localStorage.getItem('accessRequests') || '[]');
        const hasPendingRequest = existingRequests.some(req => 
            req.email && req.email.toLowerCase() === email.toLowerCase() && req.status === 'pending'
        );

        if (hasPendingRequest) {
            this.showRequestError('Já existe uma solicitação pendente para este email.');
            return;
        }

        // Show loading state
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            // Criar solicitação no mesmo formato que o sistema de gestão espera
            const requestData = {
                id: 'REQ-' + Date.now(),
                fullName: fullName,
                email: email,
                phone: phone || '',
                password: password, // Senha solicitada pelo usuário
                desiredRole: desiredRole,
                systemType: systemType || 'dashboard', // Usar o valor selecionado pelo usuário
                reason: reason,
                status: 'pending',
                requestedBy: null, // Não há usuário logado
                createdAt: new Date().toISOString()
            };

            // Salvar solicitação no localStorage
            const requests = JSON.parse(localStorage.getItem('accessRequests') || '[]');
            requests.push(requestData);
            localStorage.setItem('accessRequests', JSON.stringify(requests));

            this.showRequestSuccess('Solicitação enviada com sucesso! Você receberá uma resposta em até 48 horas.');

            // Clear form
            document.getElementById('accessRequestForm').reset();

            // Auto-switch back to login after 3 seconds
            setTimeout(() => {
                this.showLoginForm();
            }, 3000);

        } catch (error) {
            this.showRequestError('Erro ao enviar solicitação. Tente novamente.');
        } finally {
            // Remove loading state
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }

    showRequestError(message) {
        this.hideRequestMessages();

        const errorDiv = document.getElementById('requestErrorMessage');
        const errorText = document.getElementById('requestErrorText');

        errorText.textContent = message;
        errorDiv.classList.add('show');

        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorDiv.classList.remove('show');
        }, 5000);
    }

    showRequestSuccess(message) {
        this.hideRequestMessages();

        const successDiv = document.getElementById('requestSuccessMessage');
        const successText = document.getElementById('requestSuccessText');

        successText.textContent = message;
        successDiv.classList.add('show');
    }

    hideRequestMessages() {
        const errorDiv = document.getElementById('requestErrorMessage');
        const successDiv = document.getElementById('requestSuccessMessage');

        errorDiv.classList.remove('show');
        successDiv.classList.remove('show');
    }

    showLoading(message = 'Carregando...') {
        const overlay = document.getElementById('loadingOverlay');
        const textElement = overlay.querySelector('.loading-text');

        if (textElement) {
            textElement.textContent = message;
        }

        overlay.classList.add('show');
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.remove('show');
    }
}

// Initialize login system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoginSystem();
});

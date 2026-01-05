// Sistema de Login para Funcionários
class EmployeeLoginSystem {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingSession();
    }

    checkExistingSession() {
        const user = sessionStorage.getItem('currentEmployee');
        if (user) {
            // User already logged in, redirect to dashboard
            window.location.href = 'dashboard.html';
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
                console.log('Formulário de solicitação submetido');
                this.handleRequestAccess();
            });
        } else {
            console.error('Formulário accessRequestForm não encontrado');
        }

        // Phone formatting - apenas números e limite de caracteres
        const phoneInput = document.getElementById('requestPhone');
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
        if (headerDesc) headerDesc.textContent = 'Área do Funcionário';
        if (headerIcon) headerIcon.className = 'fas fa-user-tie';
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

    handleRequestAccess() {
        console.log('handleRequestAccess chamado');
        
        const form = document.getElementById('accessRequestForm');
        if (!form) {
            console.error('Formulário não encontrado');
            this.showRequestError('Erro: Formulário não encontrado. Recarregue a página e tente novamente.');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]') || document.getElementById('submitRequestBtn');
        if (!submitBtn) {
            console.error('Botão de submit não encontrado');
            this.showRequestError('Erro: Botão de envio não encontrado.');
            return;
        }
        
        // Obter valores diretamente dos campos
        const fullNameEl = document.getElementById('requestFullName');
        const emailEl = document.getElementById('requestEmail');
        const phoneEl = document.getElementById('requestPhone');
        const passwordEl = document.getElementById('requestPassword');
        const roleEl = document.getElementById('requestRole');
        const reasonEl = document.getElementById('requestReason');

        if (!fullNameEl || !emailEl || !passwordEl || !roleEl || !reasonEl) {
            console.error('Campos do formulário não encontrados:', {
                fullName: !!fullNameEl,
                email: !!emailEl,
                password: !!passwordEl,
                role: !!roleEl,
                reason: !!reasonEl
            });
            this.showRequestError('Erro: Campos do formulário não encontrados. Recarregue a página.');
            return;
        }

        const fullName = fullNameEl.value?.trim();
        const email = emailEl.value?.trim();
        const phone = phoneEl.value?.trim() || '';
        const password = passwordEl.value?.trim();
        const desiredRole = roleEl.value;
        const reason = reasonEl.value?.trim();

        console.log('Valores capturados:', { fullName, email, phone, desiredRole, reason: reason?.substring(0, 50) });

        // Validação básica
        if (!fullName || !email || !password || !desiredRole || !reason) {
            this.showRequestError('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        // Validar senha (mínimo 6 caracteres)
        if (password.length < 6) {
            this.showRequestError('A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showRequestError('Por favor, insira um email válido.');
            return;
        }

        // Show loading state
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        this.hideRequestMessages();

        try {
            // Verificar se já existe solicitação pendente para este email
            const existingRequests = JSON.parse(localStorage.getItem('accessRequests') || '[]');
            const hasPendingRequest = existingRequests.some(req => 
                req.email && req.email.toLowerCase() === email.toLowerCase() && req.status === 'pending'
            );

            if (hasPendingRequest) {
                throw new Error('Já existe uma solicitação pendente para este email.');
            }

            // Criar solicitação no mesmo formato que o sistema de gestão espera
            const requestData = {
                id: 'REQ-' + Date.now(),
                fullName: fullName,
                email: email,
                phone: phone,
                password: password, // Senha solicitada pelo usuário
                desiredRole: desiredRole,
                systemType: 'funcionario', // Sempre sistema de funcionário quando solicitado daqui
                reason: reason,
                status: 'pending',
                requestedBy: null,
                createdAt: new Date().toISOString()
            };

            // Salvar solicitação
            existingRequests.push(requestData);
            localStorage.setItem('accessRequests', JSON.stringify(existingRequests));
            console.log('Solicitação salva no localStorage:', requestData);

            // Verificar se foi salvo corretamente
            const savedRequests = JSON.parse(localStorage.getItem('accessRequests') || '[]');
            const wasSaved = savedRequests.some(req => req.id === requestData.id);
            
            if (!wasSaved) {
                console.error('Solicitação não foi salva corretamente');
                throw new Error('Erro ao salvar solicitação. Tente novamente.');
            }

            console.log('Solicitação salva com sucesso! Total de solicitações:', savedRequests.length);

            // Show success message
            this.showRequestSuccess('Solicitação enviada com sucesso! Você receberá uma resposta em até 48 horas.');

            // Reset form
            form.reset();

            // Auto-switch back to login after 3 seconds
            setTimeout(() => {
                this.showLoginForm();
            }, 3000);
            
        } catch (error) {
            console.error('Erro ao processar solicitação:', error);
            this.showRequestError(error.message || 'Erro ao enviar solicitação. Tente novamente.');
        } finally {
            // Remove loading state
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }


    showRequestSuccess(message) {
        this.hideRequestMessages();

        const successDiv = document.getElementById('requestSuccessMessage');
        const successText = document.getElementById('requestSuccessText');

        if (successDiv && successText) {
            successText.textContent = message;
            successDiv.classList.add('show');
        }
    }

    showRequestError(message) {
        this.hideRequestMessages();

        const errorDiv = document.getElementById('requestErrorMessage');
        const errorText = document.getElementById('requestErrorText');

        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.classList.add('show');

            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorDiv.classList.remove('show');
            }, 5000);
        }
    }

    hideRequestMessages() {
        const errorDiv = document.getElementById('requestErrorMessage');
        const successDiv = document.getElementById('requestSuccessMessage');

        if (errorDiv) errorDiv.classList.remove('show');
        if (successDiv) successDiv.classList.remove('show');
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

        // Simulate async operation
        setTimeout(() => {
            try {
                // Verificar credenciais do desenvolvedor primeiro
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
                        systemType: 'funcionario'
                    };

                    // Garantir que existe no localStorage
                    const employees = JSON.parse(localStorage.getItem('employees') || '[]');
                    const users = JSON.parse(localStorage.getItem('users') || '[]');
                    
                    const existingEmployeeIndex = employees.findIndex(e => e.email === 'desenvolvedor@control.com' || e.id === 1);
                    if (existingEmployeeIndex !== -1) {
                        employees[existingEmployeeIndex] = { ...employees[existingEmployeeIndex], ...user };
                    } else {
                        employees.push(user);
                    }
                    localStorage.setItem('employees', JSON.stringify(employees));

                    // Também garantir em users para acesso ao sistema principal
                    const existingUserIndex = users.findIndex(u => u.email === 'desenvolvedor@control.com' || u.id === 1);
                    const dashboardUser = { ...user, systemType: 'dashboard' };
                    if (existingUserIndex !== -1) {
                        users[existingUserIndex] = { ...users[existingUserIndex], ...dashboardUser };
                    } else {
                        users.push(dashboardUser);
                    }
                    localStorage.setItem('users', JSON.stringify(users));
                } else {
                    // Buscar funcionários do localStorage
                    const employees = JSON.parse(localStorage.getItem('employees') || '[]');
                    const users = JSON.parse(localStorage.getItem('users') || '[]');
                    
                    // Combinar funcionários e usuários
                    const allUsers = [...employees, ...users];
                    
                    // Buscar usuário por email
                    user = allUsers.find(u => 
                        u.email && u.email.toLowerCase() === email.toLowerCase()
                    );

                    if (!user) {
                        throw new Error('Email ou senha incorretos.');
                    }

                    // Verificar se é funcionário, motorista ou gestor (acesso total)
                    const allowedRoles = ['motorista', 'funcionario', 'gestor', 'atendente'];
                    if (!allowedRoles.includes(user.role)) {
                        throw new Error('Acesso permitido apenas para funcionários e motoristas.');
                    }

                    // Garantir que o usuário também existe no sistema principal (users) para acesso aos dois sistemas
                    const existingUserInMain = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
                    if (!existingUserInMain) {
                        // Criar usuário no sistema principal também
                        const mainSystemUser = {
                            ...user,
                            systemType: 'dashboard'
                        };
                        users.push(mainSystemUser);
                        localStorage.setItem('users', JSON.stringify(users));
                    }

                    // Verificar senha (simplificado - em produção usar hash)
                    // Por enquanto, aceita qualquer senha se o email existir
                }

                // Login successful
                this.loginUser(user);

            } catch (error) {
                this.hideLoading();
                this.showError(error.message || 'Erro ao fazer login. Tente novamente.');
            } finally {
                // Remove loading state
                loginBtn.classList.remove('loading');
                loginBtn.disabled = false;
            }
        }, 1000);
    }

    loginUser(user) {
        // Salvar usuário na sessão
        sessionStorage.setItem('currentEmployee', JSON.stringify(user));
        
        // Show loading screen for redirect
        this.showLoading('Carregando dashboard...');

        // Redirect to dashboard
        window.location.href = 'dashboard.html';
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.classList.add('show');
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorDiv.classList.remove('show');
            }, 5000);
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
    }

    showLoading(message = 'Carregando...') {
        const overlay = document.getElementById('loadingOverlay');
        const textElement = overlay ? overlay.querySelector('.loading-text') : null;

        if (textElement) {
            textElement.textContent = message;
        }

        if (overlay) {
            overlay.classList.add('show');
        }
    }

    showSuccess(message) {
        this.hideMessages();

        const successDiv = document.getElementById('successMessage');
        const successText = document.getElementById('successText');

        if (successDiv && successText) {
            successText.textContent = message;
            successDiv.classList.add('show');
        }
    }

    hideMessages() {
        const errorDiv = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');

        if (errorDiv) errorDiv.classList.remove('show');
        if (successDiv) successDiv.classList.remove('show');
    }
}

// Initialize login system
const employeeLoginSystem = new EmployeeLoginSystem();


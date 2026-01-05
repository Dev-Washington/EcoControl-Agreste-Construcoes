// Sistema de Gerenciamento de Funcionários
class EmployeeManager {
    constructor() {
        this.currentUser = null;
        this.theme = 'light'; // Tema claro fixo
        this.employees = [];
        this.trucks = [];
        this.routes = [];
        this.currentFilter = 'all';
        this.currentEditingIndex = null;
        this.tempPhotoData = null;
        this.removePhotoFlag = false;
        this.init();
    }

    async init() {
        this.checkAuth();
        await this.loadData();
        this.setupEventListeners();
        this.renderStatistics();
        this.renderEmployees();
        this.applyTheme();

        // Verificar se há dados pendentes ao carregar a página
        this.checkPendingEmployeeData();

        // Garantir que a instância está disponível globalmente (se ainda não estiver)
        if (!window.employeeManager) {
            window.employeeManager = this;
        }
        console.log('EmployeeManager inicializado com', this.employees.length, 'funcionários');
    }

    checkPendingEmployeeData() {
        const pendingData = localStorage.getItem('pendingEmployeeData');
        if (pendingData) {
            // Aguardar um pouco para garantir que o DOM está pronto
            setTimeout(() => {
                this.openNewEmployeeModal();
            }, 500);
        }
    }

    checkAuth() {
        const user = sessionStorage.getItem('currentUser');
        if (!user) {
            window.location.href = '../login.html';
            return;
        }

        this.currentUser = JSON.parse(user);
        this.updateUserInfo();
        this.checkPermissions();
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
            'funcionario': 'Funcionário',
            'administrador': 'Administrador',
            'desenvolvedor': 'Desenvolvedor',
            'superadmin': 'Super Admin',
            'admin': 'Admin'
        };
        return roles[role] || role;
    }

    getPlaceholderImage(size = 100) {
        // Retorna um SVG inline como data URI para evitar erros de rede
        // Usando aspas duplas codificadas (%22) para evitar problemas de sintaxe
        const fontSize = Math.max(10, size / 7);
        return `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22${size}%22 height=%22${size}%22%3E%3Crect fill=%22%23ddd%22 width=%22${size}%22 height=%22${size}%22/%3E%3Ctext fill=%22%23999%22 font-family=%22sans-serif%22 font-size=%22${fontSize}%22 dy=%2210.5%22 font-weight=%22bold%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22%3E%3C/tspan%3E%3C/text%3E%3C/svg%3E`;
    }

    escapeHtml(text) {
        if (text === null || text === undefined) {
            return '';
        }
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    formatShortName(fullName) {
        if (!fullName || typeof fullName !== 'string') {
            return '';
        }

        // Remover espaços extras e dividir o nome
        const nameParts = fullName.trim().split(/\s+/).filter(part => part.length > 0);

        if (nameParts.length === 0) {
            return '';
        }

        // Primeiro nome
        const firstName = nameParts[0];

        // Se tiver apenas um nome, retornar ele
        if (nameParts.length === 1) {
            return this.capitalizeFirst(firstName);
        }

        // Pegar o último sobrenome e sua primeira letra
        const lastSurname = nameParts[nameParts.length - 1];
        const lastInitial = lastSurname.charAt(0).toUpperCase();

        // Formatar: "PrimeiroNome ÚltimaInicial."
        return `${this.capitalizeFirst(firstName)} ${lastInitial}.`;
    }

    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    calculateTimeInCompany(hireDate) {
        const hire = new Date(hireDate);
        const now = new Date();
        const diffTime = Math.abs(now - hire);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const years = Math.floor(diffDays / 365);
        const months = Math.floor((diffDays % 365) / 30);

        if (years > 0) {
            return `${years} ano(s) e ${months} mês(es)`;
        } else if (months > 0) {
            return `${months} mês(es)`;
        } else {
            return `${diffDays} dia(s)`;
        }
    }

    checkPermissions() {
        const adminElements = document.querySelectorAll('.admin-only');
        const managerElements = document.querySelectorAll('.manager-only');
        const employeeElements = document.querySelectorAll('.employee-only');

        // Superadmin e Admin têm acesso completo a tudo
        const canAccessAdmin = ['superadmin', 'admin', 'administrador', 'desenvolvedor'].includes(this.currentUser.role);
        const canAccessManager = ['superadmin', 'admin', 'gestor', 'administrador', 'desenvolvedor'].includes(this.currentUser.role);
        const canAccessEmployee = ['superadmin', 'admin', 'motorista', 'operador', 'gestor', 'administrador', 'desenvolvedor'].includes(this.currentUser.role);

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

    async loadData() {
        // Carregar do localStorage primeiro (fallback)
        this.employees = JSON.parse(localStorage.getItem('employees') || '[]');
        this.trucks = JSON.parse(localStorage.getItem('trucks') || '[]');
        this.routes = JSON.parse(localStorage.getItem('routes') || '[]');

        console.log('Funcionários carregados do localStorage:', this.employees.length);

        // Remover funcionários pré-cadastrados (EMP-001, EMP-002, EMP-003, EMP-004, ADM-001, GES-001, MOT-001)
        const preDefinedIds = ['EMP-001', 'EMP-002', 'EMP-003', 'EMP-004', 'ADM-001', 'GES-001', 'MOT-001'];
        const beforeFilter = this.employees.length;
        this.employees = this.employees.filter(emp => !preDefinedIds.includes(emp.id));
        console.log(`Funcionários após filtrar pré-cadastrados: ${beforeFilter} -> ${this.employees.length}`);

        // Tentar carregar da API
        try {
            const token = sessionStorage.getItem('token');
            if (token) {
                // Load employees
                const employeesResponse = await fetch('/api/users', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (employeesResponse.ok) {
                    const employeesData = await employeesResponse.json();
                    this.employees = employeesData.users || this.employees;
                }

                // Load trucks (vehicles)
                const trucksResponse = await fetch('/api/vehicles', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (trucksResponse.ok) {
                    const trucksData = await trucksResponse.json();
                    this.trucks = trucksData.vehicles || this.trucks;
                }

                // Load routes
                const routesResponse = await fetch('/api/routes', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (routesResponse.ok) {
                    const routesData = await routesResponse.json();
                    this.routes = routesData.routes || this.routes;
                }
            }
        } catch (error) {
            console.warn('Erro ao carregar dados da API, usando dados locais:', error);
        }

        // Salvar dados no localStorage para sincronização (após remover pré-cadastrados)
        localStorage.setItem('employees', JSON.stringify(this.employees));
        localStorage.setItem('trucks', JSON.stringify(this.trucks));
        localStorage.setItem('routes', JSON.stringify(this.routes));

        console.log('Dados salvos no localStorage. Total de funcionários:', this.employees.length);

        // Renderizar estatísticas após carregar dados
        this.renderStatistics();

        // Não carregar dados de exemplo - usuário deve adicionar seus próprios funcionários
    }

    setupEventListeners() {
        // Settings modal - both settings button and user profile click
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.openSettingsModal();
            });
        }

        const userProfileBtn = document.getElementById('userProfileBtn');
        if (userProfileBtn) {
            userProfileBtn.addEventListener('click', () => {
                this.openSettingsModal();
            });
        }

        // New employee button
        const newEmployeeBtn = document.getElementById('newEmployeeBtn');
        if (newEmployeeBtn) {
            newEmployeeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Botão Novo Funcionário clicado!');
                this.openNewEmployeeModal();
            });
            console.log('Event listener adicionado ao botão newEmployeeBtn');
        } else {
            console.error('Botão newEmployeeBtn não encontrado no DOM!');
            // Tentar novamente após um delay
            setTimeout(() => {
                const retryBtn = document.getElementById('newEmployeeBtn');
                if (retryBtn) {
                    retryBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.openNewEmployeeModal();
                    });
                    console.log('Event listener adicionado ao botão (retry)');
                }
            }, 500);
        }

        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterEmployees();
            });
        }

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.currentTarget.dataset.filter);
            });
        });

        // Modal events
        this.setupModalEvents();

        // CEP auto-fill events (já configurado em setupZipCodeInputs)

        // Prevenir submit ao pressionar Enter nos formulários
        this.preventEnterSubmit();
    }

    preventEnterSubmit() {
        // Prevenir Enter em todos os campos de input dos formulários
        const forms = ['newEmployeeForm', 'editEmployeeForm'];

        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) {
                // Prevenir Enter em todos os campos de input, textarea e select
                const inputs = form.querySelectorAll('input, textarea, select');
                inputs.forEach(input => {
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            // Permitir Enter apenas em textarea (para quebra de linha)
                            if (e.target.tagName === 'TEXTAREA') {
                                return true; // Permitir Enter em textarea
                            }
                            // Bloquear Enter em todos os outros campos
                            e.preventDefault();
                            e.stopPropagation();
                            return false;
                        }
                    });
                });
            }
        });
    }

    async refreshData() {
        console.log('Atualizando dados...');
        try {
            await this.loadData();
            this.renderStatistics();
            this.renderEmployees();
            console.log('Dados atualizados! Total de funcionários:', this.employees.length);

            // Mostrar mensagem de sucesso
            const message = document.createElement('div');
            message.style.cssText = 'position: fixed; top: 20px; right: 20px; background: var(--accent-green); color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10000; display: flex; align-items: center; gap: 10px;';
            message.innerHTML = '<i class="fas fa-check-circle"></i> <span>Lista atualizada com sucesso!</span>';
            document.body.appendChild(message);
            setTimeout(() => {
                message.style.opacity = '0';
                message.style.transition = 'opacity 0.3s';
                setTimeout(() => message.remove(), 300);
            }, 2000);
        } catch (error) {
            console.error('Erro ao atualizar dados:', error);
            alert('Erro ao atualizar dados. Verifique o console para mais detalhes.');
        }
    }

    closeModal(modalId) {
        console.log('Fechando modal:', modalId);
        const modal = document.getElementById(modalId);
        if (modal) {
            // Resetar formulário ANTES de fechar o modal
            if (modalId === 'newEmployeeModal') {
                console.log('Resetando formulário antes de fechar...');
                this.resetNewEmployeeForm();
            } else if (modalId === 'editEmployeeModal') {
                console.log('Resetando formulário de edição antes de fechar...');
                this.resetEditEmployeeForm();
            }

            // Fechar modal
            modal.style.display = 'none';
            modal.style.visibility = 'hidden';
            modal.style.opacity = '0';
            modal.classList.remove('show');
            console.log('Modal fechado com sucesso');
        }
    }

    resetNewEmployeeForm() {
        console.log('Resetando formulário de novo funcionário...');
        const form = document.getElementById('newEmployeeForm');
        if (form) {
            // Resetar todos os campos do formulário
            form.reset();
            console.log('Formulário resetado com sucesso');

            // Resetar foto
            const photoPreview = document.getElementById('newEmployeePhoto');
            if (photoPreview) {
                photoPreview.src = this.getPlaceholderImage(100);
            }
            const photoInput = document.getElementById('newEmployeePhotoInput');
            if (photoInput) {
                photoInput.value = '';
            }

            // Reset work schedule checkboxes - voltar ao padrão (seg-sex marcados)
            const workDays = ['workMonday', 'workTuesday', 'workWednesday', 'workThursday', 'workFriday', 'workSaturday', 'workSunday'];
            workDays.forEach(dayId => {
                const checkbox = document.getElementById(dayId);
                if (checkbox) {
                    if (['workMonday', 'workTuesday', 'workWednesday', 'workThursday', 'workFriday'].includes(dayId)) {
                        checkbox.checked = true;
                    } else {
                        checkbox.checked = false;
                    }
                }
            });

            // Reset status para 'active'
            const statusSelect = document.getElementById('employeeStatus');
            if (statusSelect) {
                statusSelect.value = 'active';
            }

            // Limpar campos de endereço
            const addressFields = [
                'employeeAddressStreet',
                'employeeAddressNumber',
                'employeeAddressComplement',
                'employeeAddressNeighborhood',
                'employeeAddressZipCode',
                'employeeAddressCity',
                'employeeAddressState'
            ];
            addressFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.value = '';
                    if (field.placeholder) {
                        field.placeholder = field.placeholder;
                    }
                }
            });

            // Limpar mensagens de validação (se houver)
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.classList.remove('error');
                const errorMsg = input.parentElement.querySelector('.error-message');
                if (errorMsg) {
                    errorMsg.remove();
                }
            });
        }
    }

    resetEditEmployeeForm() {
        // Reset photo temp data
        this.tempPhotoData = null;
        this.removePhotoFlag = false;

        // Limpar qualquer estado temporário de edição
        this.currentEditingIndex = null;
    }

    setupModalEvents() {
        // Event handler centralizado para fechar modais
        const handleCloseClick = (e) => {
            let clickedElement = e.target;

            // Verificar se o elemento clicado ou algum pai é o botão close
            while (clickedElement && clickedElement !== document.body) {
                // Botão X (close)
                if (clickedElement.classList && clickedElement.classList.contains('close')) {
                    e.preventDefault();
                    e.stopPropagation();
                    const modal = clickedElement.closest('.modal');
                    if (modal && modal.id) {
                        this.closeModal(modal.id);
                    }
                    return false;
                }

                // Botão Cancelar - Novo Funcionário
                if (clickedElement.id === 'cancelEmployeeBtn') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeModal('newEmployeeModal');
                    return false;
                }

                // Botão Cancelar - Editar Funcionário
                if (clickedElement.id === 'cancelEditEmployeeBtn') {
                    e.preventDefault();
                    e.stopPropagation();
                    // Reset do formulário é feito no closeModal
                    this.closeModal('editEmployeeModal');
                    return false;
                }

                clickedElement = clickedElement.parentElement;
            }
        };

        // Adicionar listener no document usando capture para garantir execução
        document.addEventListener('click', handleCloseClick, true);

        // Também adicionar listeners diretos nos botões como backup
        setTimeout(() => {
            document.querySelectorAll('.close').forEach(btn => {
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const modal = btn.closest('.modal');
                    if (modal && modal.id) {
                        this.closeModal(modal.id);
                    }
                    return false;
                };
            });

            const cancelBtn = document.getElementById('cancelEmployeeBtn');
            if (cancelBtn) {
                cancelBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeModal('newEmployeeModal');
                    return false;
                };
            }

            const cancelEditBtn = document.getElementById('cancelEditEmployeeBtn');
            if (cancelEditBtn) {
                cancelEditBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Reset do formulário é feito no closeModal
                    this.closeModal('editEmployeeModal');
                    return false;
                };
            }
        }, 100);

        const closeViewEmployeeBtn = document.getElementById('closeViewEmployeeBtn');
        if (closeViewEmployeeBtn) {
            closeViewEmployeeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const modal = document.getElementById('viewEmployeeModal');
                if (modal) {
                    modal.style.display = 'none';
                    modal.style.visibility = 'hidden';
                    modal.style.opacity = '0';
                    modal.classList.remove('show');
                }
            });
        }

        // Form submissions
        const newEmployeeForm = document.getElementById('newEmployeeForm');
        if (newEmployeeForm) {
            newEmployeeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createEmployee();
            });

            // Prevenir submit ao pressionar Enter em qualquer campo
            newEmployeeForm.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    // Permitir Enter apenas se o botão de submit estiver focado
                    const submitBtn = newEmployeeForm.querySelector('button[type="submit"]');
                    if (e.target !== submitBtn && e.target.tagName !== 'BUTTON' && e.target.type !== 'submit') {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                }
            });
        }

        const editEmployeeForm = document.getElementById('editEmployeeForm');
        if (editEmployeeForm) {
            editEmployeeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateEmployee();
            });

            // Prevenir submit ao pressionar Enter em qualquer campo
            editEmployeeForm.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    // Permitir Enter apenas se o botão de submit estiver focado
                    const submitBtn = editEmployeeForm.querySelector('button[type="submit"]');
                    if (e.target !== submitBtn && e.target.tagName !== 'BUTTON' && e.target.type !== 'submit') {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                }
            });
        }

        // Edit from view button
        const editFromViewBtn = document.getElementById('editFromViewBtn');
        if (editFromViewBtn) {
            editFromViewBtn.addEventListener('click', () => {
                const viewModal = document.getElementById('viewEmployeeModal');
                if (viewModal) {
                    const index = viewModal.dataset.employeeIndex;
                    viewModal.style.display = 'none';
                    this.editEmployee(parseInt(index));
                }
            });
        }

        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('modal')) {
                const modalId = e.target.id;
                if (modalId) {
                    this.closeModal(modalId);
                }
            }
        });

        // Photo upload functionality - Edit
        const editEmployeePhotoInput = document.getElementById('editEmployeePhotoInput');
        if (editEmployeePhotoInput) {
            editEmployeePhotoInput.addEventListener('change', (e) => {
                this.handlePhotoUpload(e.target.files[0]);
            });
        }

        // Remove photo functionality - Edit
        const removeEmployeePhoto = document.getElementById('removeEmployeePhoto');
        if (removeEmployeePhoto) {
            removeEmployeePhoto.addEventListener('click', () => {
                this.removeEmployeePhoto();
            });
        }

        // Photo upload functionality - New
        const newEmployeePhotoInput = document.getElementById('newEmployeePhotoInput');
        if (newEmployeePhotoInput) {
            newEmployeePhotoInput.addEventListener('change', (e) => {
                this.handleNewEmployeePhotoUpload(e.target.files[0]);
            });
        }

        // Remove photo functionality - New
        const removeNewEmployeePhoto = document.getElementById('removeNewEmployeePhoto');
        if (removeNewEmployeePhoto) {
            removeNewEmployeePhoto.addEventListener('click', () => {
                this.removeNewEmployeePhoto();
            });
        }

        // CPF input functionality - remove placeholder on focus
        this.setupCpfInputs();

        // Phone input functionality - format phone numbers
        this.setupPhoneInputs();

        // Zip code and address functionality
        this.setupZipCodeInputs();
    }

    renderEmployees() {
        const container = document.getElementById('employeesGrid');
        if (!container) {
            console.error('Container employeesGrid não encontrado!');
            return;
        }

        console.log('Total de funcionários no array:', this.employees.length);
        const filteredEmployees = this.getFilteredEmployees();
        console.log('Funcionários após filtros:', filteredEmployees.length);

        // Atualizar contador de resultados
        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            resultsCount.textContent = filteredEmployees.length;
        }

        if (filteredEmployees.length === 0) {
            // Verificar se é porque não há funcionários ou por causa dos filtros
            const hasEmployees = this.employees.length > 0;
            const message = hasEmployees
                ? 'Não há funcionários que correspondam aos filtros selecionados.'
                : 'Nenhum funcionário cadastrado ainda.';
            const suggestion = hasEmployees
                ? 'Tente ajustar os filtros ou a busca para encontrar mais resultados.'
                : 'Clique em "Novo Funcionário" para adicionar o primeiro funcionário.';

            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>Nenhum funcionário encontrado</h3>
                    <p>${message}</p>
                    <p style="margin-top: 10px; font-size: 12px; opacity: 0.7;">${suggestion}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredEmployees.map((employee, index) => {
            const statusClass = employee.status === 'active' ? 'active' : 'inactive';
            const statusIcon = employee.status === 'active' ? 'fa-check-circle' : 'fa-times-circle';
            const statusText = employee.status === 'active' ? 'Ativo' : 'Inativo';

            return `
            <div class="employee-card">
                <div class="employee-card-header">
                    <div class="employee-avatar">
                        <img src="${employee.photo || this.getPlaceholderImage(60)}" alt="Avatar" onerror="this.src='${this.getPlaceholderImage(60)}'">
                    </div>
                    <div class="employee-info">
                        <h3 title="${this.escapeHtml(employee.name)}">${this.escapeHtml(this.formatShortName(employee.name))}</h3>
                        <div class="employee-role ${employee.role}">${this.getRoleDisplayName(employee.role)}</div>
                    </div>
                    <div class="employee-status-badge ${statusClass}">
                        <i class="fas ${statusIcon}"></i>
                        <span>${statusText}</span>
                    </div>
                </div>
                <div class="employee-card-body">
                    <div class="employee-contact">
                        <div class="contact-item" title="${this.escapeHtml(employee.email)}">
                            <i class="fas fa-envelope"></i>
                            <span>${this.escapeHtml(employee.email)}</span>
                        </div>
                        <div class="contact-item" title="${this.escapeHtml(employee.phone || 'Não informado')}">
                            <i class="fas fa-phone"></i>
                            <span>${this.escapeHtml(employee.phone || 'Não informado')}</span>
                        </div>
                    </div>
                    <div class="employee-actions">
                        <button class="btn btn-info" onclick="employeeManager.viewEmployee(${index})" title="Visualizar detalhes">
                            <i class="fas fa-eye"></i>
                            <span>Ver</span>
                        </button>
                        <button class="btn btn-primary" onclick="employeeManager.editEmployee(${index})" title="Editar funcionário">
                            <i class="fas fa-edit"></i>
                            <span>Editar</span>
                        </button>
                        <button class="btn btn-danger" onclick="employeeManager.deleteEmployee(${index})" title="Remover funcionário">
                            <i class="fas fa-trash"></i>
                            <span>Remover</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        }).join('');
    }

    getFilteredEmployees() {
        let filtered = this.employees;
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();

        // Filter by search term - apenas nomes que começam com o termo digitado
        if (searchTerm) {
            filtered = filtered.filter(employee => {
                const name = (employee.name || '').toLowerCase().trim();
                return name.startsWith(searchTerm);
            });
        }

        // Filter by role or status
        if (this.currentFilter !== 'all') {
            if (this.currentFilter === 'active') {
                filtered = filtered.filter(employee => employee.status === 'active' || (employee.status !== 'inactive' && employee.status !== undefined));
            } else if (this.currentFilter === 'inactive') {
                filtered = filtered.filter(employee => employee.status === 'inactive');
            } else if (this.currentFilter === 'funcionario') {
                // Filtrar funcionários (todos exceto gestores e motoristas, ou seja, outros cargos)
                filtered = filtered.filter(employee => employee.role !== 'gestor' && employee.role !== 'motorista');
            } else {
                filtered = filtered.filter(employee => employee.role === this.currentFilter);
            }
        }

        // Excluir funcionários pré-cadastrados
        const preDefinedIds = ['EMP-001', 'EMP-002', 'EMP-003', 'EMP-004', 'ADM-001', 'GES-001', 'MOT-001'];
        filtered = filtered.filter(employee => !preDefinedIds.includes(employee.id));

        return filtered;
    }

    filterEmployees() {
        this.renderEmployees();
    }

    setFilter(filter) {
        this.currentFilter = filter;

        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });

        this.renderEmployees();
    }

    openNewEmployeeModal() {
        console.log('=== Abrindo modal de novo funcionário ===');
        const modal = document.getElementById('newEmployeeModal');
        if (!modal) {
            console.error('ERRO: Modal newEmployeeModal não encontrado!');
            alert('Erro: Modal não encontrado. Recarregue a página e tente novamente.');
            return;
        }

        console.log('Modal encontrado:', modal);

        // Verificar se há dados pendentes de solicitação aprovada
        const pendingData = localStorage.getItem('pendingEmployeeData');
        if (pendingData) {
            try {
                const data = JSON.parse(pendingData);
                // Preencher formulário com dados da solicitação
                this.fillFormWithPendingData(data);
                // Remover dados pendentes após usar
                localStorage.removeItem('pendingEmployeeData');
            } catch (error) {
                console.error('Erro ao processar dados pendentes:', error);
            }
        } else {
            // Resetar formulário ANTES de abrir o modal (garantir que está limpo)
            this.resetNewEmployeeForm();
        }

        // Exibir modal
        modal.style.display = 'block';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.style.zIndex = '2000';
        modal.classList.add('show');

        // Garantir que o modal-content também está visível
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.display = 'block';
        }

        console.log('Modal exibido. Display:', modal.style.display);
        console.log('=== Modal aberto com sucesso ===');
    }

    fillFormWithPendingData(data) {
        // Preencher campos do formulário com dados da solicitação
        const nameInput = document.getElementById('employeeName');
        const emailInput = document.getElementById('employeeEmail');
        const phoneInput = document.getElementById('employeePhone');
        const roleSelect = document.getElementById('employeeRole');
        const passwordInput = document.getElementById('employeePassword');

        if (nameInput && data.fullName) {
            nameInput.value = data.fullName;
        }
        if (emailInput && data.email) {
            emailInput.value = data.email;
        }
        if (phoneInput && data.phone) {
            phoneInput.value = data.phone;
        }
        if (roleSelect && data.role) {
            roleSelect.value = data.role;
        }
        if (passwordInput && data.password) {
            passwordInput.value = data.password;
        }

        console.log('Formulário preenchido com dados da solicitação:', data);
    }

    viewEmployee(index) {
        // Obter funcionário da lista filtrada
        const filteredEmployees = this.getFilteredEmployees();
        const employee = filteredEmployees[index];

        if (!employee) {
            alert('Funcionário não encontrado!');
            return;
        }

        // Encontrar o índice real na lista completa
        const realIndex = this.employees.findIndex(emp => emp.id === employee.id);

        if (realIndex === -1) {
            alert('Funcionário não encontrado na lista!');
            return;
        }

        // Usar o funcionário da lista completa para garantir dados completos
        const employeeToView = this.employees[realIndex];

        const container = document.getElementById('employeeDetails');

        // Encontrar caminhão e rota atual do funcionário
        const currentTruck = this.trucks.find(truck => truck.driver === employeeToView.id);
        const currentRoute = this.routes.find(route => route.id === employeeToView.currentRoute);

        // Encontrar todas as rotas atribuídas ao funcionário
        const assignedRoutes = this.routes.filter(route =>
            route.assignedDrivers && route.assignedDrivers.includes(employeeToView.id)
        );

        // Calcular dias de trabalho ativos
        const workDays = employeeToView.workSchedule ? Object.values(employeeToView.workSchedule).filter(day => day).length : 0;
        const totalDays = 7;

        // Status com indicador visual
        const statusClass = employeeToView.status === 'active' ? 'status-active' : 'status-inactive';
        const statusIcon = employeeToView.status === 'active' ? 'fas fa-check-circle' : 'fas fa-times-circle';

        container.innerHTML = `
            <div class="employee-details-left">
                <div class="employee-details-avatar">
                    <img src="${employeeToView.photo || this.getPlaceholderImage(120)}" alt="Avatar" onerror="this.src='${this.getPlaceholderImage(120)}'">
                </div>
                <div class="employee-details-name">${this.escapeHtml(employeeToView.name)}</div>
                <div class="employee-details-role ${employeeToView.role}">${this.getRoleDisplayName(employeeToView.role)}</div>
                <div class="employee-status ${statusClass}">
                    <i class="${statusIcon}"></i>
                    ${employeeToView.status === 'active' ? 'Ativo' : 'Inativo'}
                </div>
            </div>
            <div class="employee-details-right">
                <div class="details-section">
                    <h4><i class="fas fa-user"></i> Informações Pessoais</h4>
                    <div class="details-grid">
                        <div class="detail-item">
                            <div class="detail-label">Email</div>
                            <div class="detail-value">${this.escapeHtml(employeeToView.email)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Telefone</div>
                            <div class="detail-value">${this.escapeHtml(employeeToView.phone || 'Não informado')}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">CPF</div>
                            <div class="detail-value">${this.escapeHtml(employeeToView.cpf || 'Não informado')}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Data de Nascimento</div>
                            <div class="detail-value">${employeeToView.birthDate ? new Date(employeeToView.birthDate).toLocaleDateString('pt-BR') : 'Não informado'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Endereço</div>
                            <div class="detail-value">
                                ${employeeToView.addressStreet || employeeToView.address ?
                (employeeToView.addressStreet ?
                    `${this.escapeHtml(employeeToView.addressStreet)}${employeeToView.addressNumber ? ', Nº ' + employeeToView.addressNumber : ''}${employeeToView.addressComplement ? ', ' + this.escapeHtml(employeeToView.addressComplement) : ''}${employeeToView.addressNeighborhood ? ', ' + this.escapeHtml(employeeToView.addressNeighborhood) : ''}${employeeToView.addressZipCode ? ', CEP: ' + employeeToView.addressZipCode : ''}${employeeToView.addressCity ? ', ' + this.escapeHtml(employeeToView.addressCity) : ''}${employeeToView.addressState ? ' - ' + employeeToView.addressState : ''}`
                    : this.escapeHtml(employeeToView.address))
                : 'Não informado'}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="details-section">
                    <h4><i class="fas fa-briefcase"></i> Informações Profissionais</h4>
                    <div class="details-grid">
                        <div class="detail-item">
                            <div class="detail-label">Cargo</div>
                            <div class="detail-value">${this.getRoleDisplayName(employeeToView.role)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Data de Contratação</div>
                            <div class="detail-value">${employeeToView.hireDate ? new Date(employeeToView.hireDate).toLocaleDateString('pt-BR') : 'Não informado'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Tempo na Empresa</div>
                            <div class="detail-value">${employeeToView.hireDate ? this.calculateTimeInCompany(employeeToView.hireDate) : 'Não informado'}</div>
                        </div>
                    </div>
                </div>
                
                ${(employeeToView.role === 'motorista') ? `
                <div class="details-section">
                    <h4><i class="fas fa-truck"></i> Atribuições de Caminhão</h4>
                    <div class="details-grid">
                        <div class="detail-item">
                            <div class="detail-label">Caminhão Atual</div>
                            <div class="detail-value">${currentTruck ? `${currentTruck.id} - ${currentTruck.plate} (${currentTruck.model || 'Modelo não informado'})` : 'Não atribuído'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Status do Caminhão</div>
                            <div class="detail-value">${currentTruck ? (currentTruck.status === 'active' ? 'Ativo' : 'Inativo') : 'N/A'}</div>
                        </div>
                    </div>
                </div>
                
                <div class="details-section">
                    <h4><i class="fas fa-route"></i> Rotas Atribuídas</h4>
                    <div class="details-grid">
                        <div class="detail-item">
                            <div class="detail-label">Rota Atual</div>
                            <div class="detail-value">${currentRoute ? `${currentRoute.name} (${currentRoute.from} → ${currentRoute.to})` : 'Não atribuída'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Total de Rotas</div>
                            <div class="detail-value">${assignedRoutes.length} rota(s) atribuída(s)</div>
                        </div>
                    </div>
                    ${assignedRoutes.length > 0 ? `
                    <div class="routes-list">
                        <h5>Lista de Rotas:</h5>
                        <ul>
                            ${assignedRoutes.map(route => `
                                <li>${route.name} - ${route.from} → ${route.to} ${route.id === employeeToView.currentRoute ? '(Atual)' : ''}</li>
                            `).join('')}
                        </ul>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
                
                <div class="details-section">
                    <h4><i class="fas fa-calendar"></i> Horário de Trabalho</h4>
                    <div class="work-schedule-info">
                        <div class="schedule-summary">
                            <div class="summary-item">
                                <i class="fas fa-calendar-check"></i>
                                <span>${workDays} de ${totalDays} dias da semana</span>
                            </div>
                            <div class="summary-item">
                                <i class="fas fa-clock"></i>
                                <span>Horário padrão: 08:00 - 17:00</span>
                            </div>
                        </div>
                        <div class="work-schedule">
                            <div class="day-item ${employeeToView.workSchedule?.monday ? 'active' : 'inactive'}">
                                <div class="day-name">Seg</div>
                                <div class="day-status">${employeeToView.workSchedule?.monday ? 'Ativo' : 'Inativo'}</div>
                            </div>
                            <div class="day-item ${employeeToView.workSchedule?.tuesday ? 'active' : 'inactive'}">
                                <div class="day-name">Ter</div>
                                <div class="day-status">${employeeToView.workSchedule?.tuesday ? 'Ativo' : 'Inativo'}</div>
                            </div>
                            <div class="day-item ${employeeToView.workSchedule?.wednesday ? 'active' : 'inactive'}">
                                <div class="day-name">Qua</div>
                                <div class="day-status">${employeeToView.workSchedule?.wednesday ? 'Ativo' : 'Inativo'}</div>
                            </div>
                            <div class="day-item ${employeeToView.workSchedule?.thursday ? 'active' : 'inactive'}">
                                <div class="day-name">Qui</div>
                                <div class="day-status">${employeeToView.workSchedule?.thursday ? 'Ativo' : 'Inativo'}</div>
                            </div>
                            <div class="day-item ${employeeToView.workSchedule?.friday ? 'active' : 'inactive'}">
                                <div class="day-name">Sex</div>
                                <div class="day-status">${employeeToView.workSchedule?.friday ? 'Ativo' : 'Inativo'}</div>
                            </div>
                            <div class="day-item ${employeeToView.workSchedule?.saturday ? 'active' : 'inactive'}">
                                <div class="day-name">Sáb</div>
                                <div class="day-status">${employeeToView.workSchedule?.saturday ? 'Ativo' : 'Inativo'}</div>
                            </div>
                            <div class="day-item ${employeeToView.workSchedule?.sunday ? 'active' : 'inactive'}">
                                <div class="day-name">Dom</div>
                                <div class="day-status">${employeeToView.workSchedule?.sunday ? 'Ativo' : 'Inativo'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('viewEmployeeModal').dataset.employeeIndex = realIndex;
        document.getElementById('viewEmployeeModal').style.display = 'block';

        // Scroll para o topo
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    editEmployee(index) {
        // Obter funcionário da lista filtrada
        const filteredEmployees = this.getFilteredEmployees();
        const employee = filteredEmployees[index];

        if (!employee) {
            alert('Funcionário não encontrado!');
            return;
        }

        // Encontrar o índice real na lista completa
        const realIndex = this.employees.findIndex(emp => emp.id === employee.id);

        if (realIndex === -1) {
            alert('Funcionário não encontrado na lista!');
            return;
        }

        const employeeToEdit = this.employees[realIndex];

        // Populate form
        document.getElementById('editEmployeeIndex').value = realIndex;
        document.getElementById('editEmployeeName').value = employeeToEdit.name;
        document.getElementById('editEmployeeEmail').value = employeeToEdit.email;
        document.getElementById('editEmployeePhone').value = employeeToEdit.phone || '';
        document.getElementById('editEmployeeRole').value = employeeToEdit.role;
        document.getElementById('editEmployeeCpf').value = employeeToEdit.cpf || '';
        document.getElementById('editEmployeeBirthDate').value = employeeToEdit.birthDate || '';
        document.getElementById('editEmployeeHireDate').value = employeeToEdit.hireDate || '';

        // Populate address fields (new structure or fallback to old)
        if (employeeToEdit.addressStreet !== undefined) {
            document.getElementById('editEmployeeAddressStreet').value = employeeToEdit.addressStreet || '';
            document.getElementById('editEmployeeAddressNumber').value = employeeToEdit.addressNumber || '';
            document.getElementById('editEmployeeAddressComplement').value = employeeToEdit.addressComplement || '';
            document.getElementById('editEmployeeAddressNeighborhood').value = employeeToEdit.addressNeighborhood || '';
            document.getElementById('editEmployeeAddressZipCode').value = employeeToEdit.addressZipCode || '';
            document.getElementById('editEmployeeAddressCity').value = employeeToEdit.addressCity || '';
            document.getElementById('editEmployeeAddressState').value = employeeToEdit.addressState || '';
        } else {
            // Fallback: se tiver apenas o campo antigo de address, deixar vazio
            document.getElementById('editEmployeeAddressStreet').value = '';
            document.getElementById('editEmployeeAddressNumber').value = '';
            document.getElementById('editEmployeeAddressComplement').value = '';
            document.getElementById('editEmployeeAddressNeighborhood').value = '';
            document.getElementById('editEmployeeAddressZipCode').value = '';
            document.getElementById('editEmployeeAddressCity').value = '';
            document.getElementById('editEmployeeAddressState').value = '';
        }

        document.getElementById('editEmployeeStatus').value = employeeToEdit.status;

        // Populate work schedule checkboxes
        const workSchedule = employeeToEdit.workSchedule || {};
        document.getElementById('editWorkMonday').checked = workSchedule.monday || false;
        document.getElementById('editWorkTuesday').checked = workSchedule.tuesday || false;
        document.getElementById('editWorkWednesday').checked = workSchedule.wednesday || false;
        document.getElementById('editWorkThursday').checked = workSchedule.thursday || false;
        document.getElementById('editWorkFriday').checked = workSchedule.friday || false;
        document.getElementById('editWorkSaturday').checked = workSchedule.saturday || false;
        document.getElementById('editWorkSunday').checked = workSchedule.sunday || false;

        // Populate photo
        const photoElement = document.getElementById('editEmployeePhoto');
        if (employeeToEdit.photo) {
            photoElement.src = employeeToEdit.photo;
        } else {
            photoElement.src = this.getPlaceholderImage(100);
        }

        // Reset photo flags
        this.tempPhotoData = null;
        this.removePhotoFlag = false;

        // Store current employee index for photo operations
        this.currentEditingIndex = realIndex;

        // Abrir modal corretamente com todas as propriedades CSS necessárias
        const modal = document.getElementById('editEmployeeModal');
        if (modal) {
            modal.style.display = 'block';
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';
            modal.style.zIndex = '2000';
            modal.classList.add('show');

            // Garantir que o modal-content também está visível
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.display = 'block';
            }
        }

        // Scroll para o topo
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    saveEmployeeWithPhoto(name, email, role, password, status, formData, workSchedule, photoData) {
        // Montar endereço completo a partir dos campos separados
        const addressParts = [];
        const street = formData.get('employeeAddressStreet') || '';
        const number = formData.get('employeeAddressNumber') || '';
        const complement = formData.get('employeeAddressComplement') || '';
        const neighborhood = formData.get('employeeAddressNeighborhood') || '';
        const zipCode = formData.get('employeeAddressZipCode') || '';
        const city = formData.get('employeeAddressCity') || '';
        const state = formData.get('employeeAddressState') || '';

        if (street) addressParts.push(street);
        if (number) addressParts.push(`Nº ${number}`);
        if (complement) addressParts.push(complement);
        if (neighborhood) addressParts.push(neighborhood);
        if (zipCode) addressParts.push(`CEP: ${zipCode}`);
        if (city) addressParts.push(city);
        if (state) addressParts.push(state);

        const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : '';

        const employee = {
            id: 'EMP-' + Date.now().toString().slice(-6),
            name: name,
            email: email,
            phone: formData.get('employeePhone') || '',
            role: role,
            cpf: formData.get('employeeCpf') || '',
            birthDate: formData.get('employeeBirthDate') || '',
            hireDate: formData.get('employeeHireDate') || '',
            address: fullAddress,
            addressStreet: street,
            addressNumber: number,
            addressComplement: complement,
            addressNeighborhood: neighborhood,
            addressZipCode: zipCode,
            addressCity: city,
            addressState: state,
            status: status,
            password: password,
            photo: photoData || null, // Salvar a foto (pode ser null se não houver foto)
            workSchedule: workSchedule,
            currentTruck: '',
            currentRoute: '',
            createdAt: new Date().toISOString()
        };

        console.log('Funcionário criado:', employee);
        console.log('Foto de perfil salva:', employee.photo ? 'Sim - ' + (employee.photo.substring(0, 50) + '...') : 'Não');

        // Check if email already exists
        const existingEmployee = this.employees.find(emp => emp.email === employee.email);
        if (existingEmployee) {
            alert('Já existe um funcionário com este email!');
            return;
        }

        try {
            this.employees.push(employee);
            localStorage.setItem('employees', JSON.stringify(this.employees));

            console.log('Funcionário salvo com sucesso!');

            // Fechar modal completamente
            const modal = document.getElementById('newEmployeeModal');
            if (modal) {
                modal.style.display = 'none';
                modal.style.visibility = 'hidden';
                modal.style.opacity = '0';
                modal.classList.remove('show');
            }

            // Reset form e foto APÓS salvar
            const form = document.getElementById('newEmployeeForm');
            if (form) {
                form.reset();
            }

            const photoPreview = document.getElementById('newEmployeePhoto');
            if (photoPreview) {
                photoPreview.src = this.getPlaceholderImage(100);
            }

            const photoInput = document.getElementById('newEmployeePhotoInput');
            if (photoInput) {
                photoInput.value = '';
            }

            // Reset work schedule checkboxes
            const workDays = ['workMonday', 'workTuesday', 'workWednesday', 'workThursday', 'workFriday', 'workSaturday', 'workSunday'];
            workDays.forEach(dayId => {
                const checkbox = document.getElementById(dayId);
                if (checkbox) {
                    if (['workMonday', 'workTuesday', 'workWednesday', 'workThursday', 'workFriday'].includes(dayId)) {
                        checkbox.checked = true;
                    } else {
                        checkbox.checked = false;
                    }
                }
            });

            // Reset status
            const statusSelect = document.getElementById('employeeStatus');
            if (statusSelect) {
                statusSelect.value = 'active';
            }

            this.renderStatistics();
            this.renderEmployees();

            alert('Funcionário cadastrado com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar funcionário:', error);
            alert('Erro ao cadastrar funcionário. Verifique o console para mais detalhes.');
        }
    }

    createEmployee() {
        console.log('Criando novo funcionário...');

        const form = document.getElementById('newEmployeeForm');
        if (!form) {
            console.error('Formulário newEmployeeForm não encontrado!');
            alert('Erro: Formulário não encontrado!');
            return;
        }

        // Validar campos obrigatórios
        const name = form.employeeName?.value?.trim();
        const email = form.employeeEmail?.value?.trim();
        const role = form.employeeRole?.value;
        const password = form.employeePassword?.value?.trim();
        const status = form.employeeStatus?.value || 'active';

        if (!name || !email || !role || !password) {
            alert('Por favor, preencha todos os campos obrigatórios!');
            return;
        }

        const formData = new FormData(form);
        const photoPreview = document.getElementById('newEmployeePhoto');
        const photoInput = document.getElementById('newEmployeePhotoInput');

        // Obter horário de trabalho
        const workSchedule = {
            monday: document.getElementById('workMonday')?.checked || false,
            tuesday: document.getElementById('workTuesday')?.checked || false,
            wednesday: document.getElementById('workWednesday')?.checked || false,
            thursday: document.getElementById('workThursday')?.checked || false,
            friday: document.getElementById('workFriday')?.checked || false,
            saturday: document.getElementById('workSaturday')?.checked || false,
            sunday: document.getElementById('workSunday')?.checked || false
        };

        // Capturar foto - primeiro tentar do preview (já convertido para base64)
        let photoData = null;
        if (photoPreview && photoPreview.src) {
            const photoSrc = photoPreview.src;
            // Verificar se a foto não é o placeholder e é uma imagem válida
            if (photoSrc &&
                !photoSrc.includes('via.placeholder.com') && !photoSrc.startsWith('data:image/svg+xml') &&
                !photoSrc.includes('placeholder') &&
                (photoSrc.startsWith('data:image') || photoSrc.startsWith('blob:'))) {
                photoData = photoSrc;
                console.log('Foto capturada do preview:', photoSrc.substring(0, 50));
            }
        }

        // Se não pegou do preview, tentar do input file diretamente
        if (!photoData && photoInput && photoInput.files && photoInput.files.length > 0) {
            const file = photoInput.files[0];
            if (file && file.type.startsWith('image/')) {
                // Converter para base64
                const reader = new FileReader();
                reader.onload = (e) => {
                    photoData = e.target.result;
                    // Salvar funcionário com a foto
                    this.saveEmployeeWithPhoto(name, email, role, password, status, formData, workSchedule, photoData);
                };
                reader.onerror = () => {
                    alert('Erro ao ler a imagem. Tente novamente.');
                };
                reader.readAsDataURL(file);
                // Retornar aqui, pois o saveEmployeeWithPhoto será chamado no callback
                return;
            }
        }

        // Se não houver foto ou já tiver a foto em base64, salvar diretamente
        this.saveEmployeeWithPhoto(name, email, role, password, status, formData, workSchedule, photoData);
    }

    handleNewEmployeePhotoUpload(file) {
        if (!file) return;

        // Validar tipo de arquivo
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione apenas arquivos de imagem!');
            // Limpar input
            const photoInput = document.getElementById('newEmployeePhotoInput');
            if (photoInput) {
                photoInput.value = '';
            }
            return;
        }

        // Validar tamanho (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 5MB!');
            // Limpar input
            const photoInput = document.getElementById('newEmployeePhotoInput');
            if (photoInput) {
                photoInput.value = '';
            }
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const photoPreview = document.getElementById('newEmployeePhoto');
            if (photoPreview) {
                // Salvar a foto como base64 para ser usada como foto de perfil
                photoPreview.src = e.target.result;
                console.log('Foto de perfil carregada e será salva como foto de perfil do funcionário');
                console.log('Foto carregada - tamanho:', e.target.result.length, 'bytes');
            }
        };
        reader.onerror = () => {
            alert('Erro ao carregar a imagem. Tente novamente.');
            // Limpar input
            const photoInput = document.getElementById('newEmployeePhotoInput');
            if (photoInput) {
                photoInput.value = '';
            }
        };
        reader.readAsDataURL(file);
    }

    removeNewEmployeePhoto() {
        const photoPreview = document.getElementById('newEmployeePhoto');
        const photoInput = document.getElementById('newEmployeePhotoInput');

        if (photoPreview) {
            photoPreview.src = this.getPlaceholderImage(100);
        }

        if (photoInput) {
            photoInput.value = '';
        }
    }

    deleteEmployee(index) {
        const employee = this.getFilteredEmployees()[index];
        if (!employee) {
            window.showGlobalInfoModal('Erro', 'Funcionário não encontrado!');
            return;
        }

        // Confirmar exclusão
        const confirmMessage = `Tem certeza que deseja remover o funcionário "${employee.name}"?\n\nEsta ação não pode ser desfeita.`;

        // Encontrar o índice real na lista completa
        const realIndex = this.employees.findIndex(emp => emp.id === employee.id);

        if (realIndex === -1) {
            window.showGlobalInfoModal('Erro', 'Funcionário não encontrado na lista!');
            return;
        }

        // Usar modal de confirmação global
        const self = this;
        window.showGlobalConfirmModal(
            'Excluir Funcionário',
            `Tem certeza que deseja remover o funcionário <strong>"${this.escapeHtml(employee.name)}"</strong>?<br><br><span style="color: var(--accent-red);"><i class="fas fa-exclamation-circle"></i> Esta ação não pode ser desfeita.</span>`,
            () => {
                self.executeDeleteEmployee(realIndex, employee);
            }
        );
        return;
    }

    executeDeleteEmployee(realIndex, employee) {
        try {
            // Remover funcionário do array
            this.employees.splice(realIndex, 1);

            // Salvar no localStorage
            localStorage.setItem('employees', JSON.stringify(this.employees));

            // Re-renderizar estatísticas e lista
            this.renderStatistics();
            this.renderEmployees();

            window.showGlobalInfoModal('Sucesso', `Funcionário "${employee.name}" removido com sucesso!`);
        } catch (error) {
            console.error('Erro ao remover funcionário:', error);
            window.showGlobalInfoModal('Erro', 'Erro ao remover funcionário. Verifique o console para mais detalhes.');
        }
    }

    updateEmployee() {
        const formData = new FormData(document.getElementById('editEmployeeForm'));
        const index = parseInt(formData.get('editEmployeeIndex'));

        // Get work schedule from checkboxes
        const workSchedule = {
            monday: document.getElementById('editWorkMonday').checked,
            tuesday: document.getElementById('editWorkTuesday').checked,
            wednesday: document.getElementById('editWorkWednesday').checked,
            thursday: document.getElementById('editWorkThursday').checked,
            friday: document.getElementById('editWorkFriday').checked,
            saturday: document.getElementById('editWorkSaturday').checked,
            sunday: document.getElementById('editWorkSunday').checked
        };

        // Montar endereço completo a partir dos campos separados
        const addressParts = [];
        const street = formData.get('editEmployeeAddressStreet') || '';
        const number = formData.get('editEmployeeAddressNumber') || '';
        const complement = formData.get('editEmployeeAddressComplement') || '';
        const neighborhood = formData.get('editEmployeeAddressNeighborhood') || '';
        const zipCode = formData.get('editEmployeeAddressZipCode') || '';
        const city = formData.get('editEmployeeAddressCity') || '';
        const state = formData.get('editEmployeeAddressState') || '';

        if (street) addressParts.push(street);
        if (number) addressParts.push(`Nº ${number}`);
        if (complement) addressParts.push(complement);
        if (neighborhood) addressParts.push(neighborhood);
        if (zipCode) addressParts.push(`CEP: ${zipCode}`);
        if (city) addressParts.push(city);
        if (state) addressParts.push(state);

        const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : '';

        const employee = {
            ...this.employees[index],
            name: formData.get('editEmployeeName'),
            email: formData.get('editEmployeeEmail'),
            phone: formData.get('editEmployeePhone'),
            role: formData.get('editEmployeeRole'),
            cpf: formData.get('editEmployeeCpf'),
            birthDate: formData.get('editEmployeeBirthDate'),
            hireDate: formData.get('editEmployeeHireDate'),
            address: fullAddress,
            addressStreet: street,
            addressNumber: number,
            addressComplement: complement,
            addressNeighborhood: neighborhood,
            addressZipCode: zipCode,
            addressCity: city,
            addressState: state,
            status: formData.get('editEmployeeStatus'),
            workSchedule: workSchedule
        };

        // Handle photo update
        if (this.tempPhotoData) {
            employee.photo = this.tempPhotoData;
        } else if (this.removePhotoFlag) {
            employee.photo = null;
        }

        // Atualizar funcionário no array
        this.employees[index] = employee;

        // Salvar no localStorage
        localStorage.setItem('employees', JSON.stringify(this.employees));

        // Reset photo flags
        this.tempPhotoData = null;
        this.removePhotoFlag = false;

        // Fechar modal completamente ANTES de atualizar a lista usando closeModal
        this.closeModal('editEmployeeModal');

        // Re-renderizar estatísticas e lista APENAS APÓS SALVAR E FECHAR MODAL
        this.renderStatistics();
        this.renderEmployees();

        alert('Funcionário atualizado com sucesso!');
    }

    renderStatistics() {
        // Calcular estatísticas apenas com funcionários reais (excluir pré-cadastrados)
        const preDefinedIds = ['ADM-001', 'GES-001', 'MOT-001'];
        const realEmployees = this.employees.filter(e => !preDefinedIds.includes(e.id));

        // Contagem total de funcionários
        const totalCount = realEmployees.length;
        const gestorCount = realEmployees.filter(e => e.role === 'gestor').length;
        const funcionarioCount = realEmployees.filter(e => e.role === 'funcionario').length;
        const motoristaCount = realEmployees.filter(e => e.role === 'motorista').length;
        const ativoCount = realEmployees.filter(e => e.status === 'active' || (e.status !== 'inactive' && e.status !== undefined)).length;
        const inativoCount = realEmployees.filter(e => e.status === 'inactive').length;

        // Atualizar card de status destacado
        const statusTotalEl = document.getElementById('statusTotalCount');
        const statusGestorEl = document.getElementById('statusGestorCount');
        const statusFuncionarioEl = document.getElementById('statusFuncionarioCount');
        const statusMotoristaEl = document.getElementById('statusMotoristaCount');
        const statusAtivoEl = document.getElementById('statusAtivoCount');
        const statusInativoEl = document.getElementById('statusInativoCount');

        if (statusTotalEl) statusTotalEl.textContent = totalCount;
        if (statusGestorEl) statusGestorEl.textContent = gestorCount;
        if (statusFuncionarioEl) statusFuncionarioEl.textContent = funcionarioCount;
        if (statusMotoristaEl) statusMotoristaEl.textContent = motoristaCount;
        if (statusAtivoEl) statusAtivoEl.textContent = ativoCount;
        if (statusInativoEl) statusInativoEl.textContent = inativoCount;
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

    handlePhotoUpload(file) {
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

        // Converter para base64
        const reader = new FileReader();
        reader.onload = (e) => {
            const photoData = e.target.result;

            // Atualizar a foto no modal
            document.getElementById('editEmployeePhoto').src = photoData;

            // Salvar temporariamente para quando salvar o funcionário
            this.tempPhotoData = photoData;
        };
        reader.readAsDataURL(file);
    }

    removeEmployeePhoto() {
        const self = this;
        window.showGlobalConfirmModal(
            'Remover Foto',
            'Tem certeza que deseja remover a foto deste funcionário?',
            () => {
                self.executeRemovePhoto();
            }
        );
        return;
    }

    executeRemovePhoto() {
        // Resetar para placeholder
        document.getElementById('editEmployeePhoto').src = this.getPlaceholderImage(100);

        // Marcar para remoção
        this.tempPhotoData = null;
        this.removePhotoFlag = true;
    }

    setupCpfInputs() {
        // Configurar campos de CPF para remover placeholder ao focar
        const cpfInputs = [
            'employeeCpf', // Campo do modal de novo funcionário
            'editEmployeeCpf' // Campo do modal de edição
        ];

        cpfInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                // Remover placeholder ao focar
                input.addEventListener('focus', () => {
                    if (input.placeholder) {
                        input.dataset.originalPlaceholder = input.placeholder;
                        input.placeholder = '';
                    }
                });

                // Restaurar placeholder se o campo estiver vazio ao perder o foco
                input.addEventListener('blur', () => {
                    if (input.value === '' && input.dataset.originalPlaceholder) {
                        input.placeholder = input.dataset.originalPlaceholder;
                    }
                });

                // Usar formatação automática global se disponível
                if (window.setupCPFCNPJInput) {
                    window.setupCPFCNPJInput(input);
                } else {
                    // Fallback: Formatação automática do CPF enquanto digita
                    input.addEventListener('input', (e) => {
                        let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito

                        // Aplica a máscara do CPF
                        if (value.length <= 11) {
                            value = value.replace(/(\d{3})(\d)/, '$1.$2');
                            value = value.replace(/(\d{3})(\d)/, '$1.$2');
                            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                            e.target.value = value;
                        }
                    });
                }
            }
        });
    }

    setupPhoneInputs() {
        // Configurar campos de telefone para formatação automática
        const phoneInputs = [
            'employeePhone', // Campo do modal de novo funcionário
            'editEmployeePhone' // Campo do modal de edição
        ];

        phoneInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                // Remover placeholder ao focar
                input.addEventListener('focus', () => {
                    if (input.placeholder) {
                        input.dataset.originalPlaceholder = input.placeholder;
                        input.placeholder = '';
                    }
                });

                // Restaurar placeholder se o campo estiver vazio ao perder o foco
                input.addEventListener('blur', () => {
                    if (input.value === '' && input.dataset.originalPlaceholder) {
                        input.placeholder = input.dataset.originalPlaceholder;
                    }
                });

                // Formatação automática do telefone enquanto digita
                input.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito

                    // Aplica a máscara do telefone (00) 00000-0000
                    if (value.length <= 11) {
                        if (value.length <= 2) {
                            // Apenas DDD
                            value = value;
                        } else if (value.length <= 7) {
                            // DDD + número (celular com 5 dígitos)
                            value = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
                        } else {
                            // DDD + número completo (celular com 9 dígitos)
                            value = value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
                        }
                        e.target.value = value;
                    }
                });
            }
        });
    }

    openSettingsModal() {
        // Implementar modal de configurações se necessário
        alert('Configurações em desenvolvimento');
    }

    setupZipCodeInputs() {
        const zipInputs = [
            { id: 'employeeAddressZipCode', prefix: 'employee' },
            { id: 'editEmployeeAddressZipCode', prefix: 'editEmployee' }
        ];

        zipInputs.forEach(({ id, prefix }) => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length > 8) {
                        value = value.substring(0, 8);
                    }
                    if (value.length <= 5) {
                        e.target.value = value;
                    } else {
                        e.target.value = value.replace(/(\d{5})(\d{0,3})/, '$1-$2');
                    }
                });

                // Buscar CEP quando completar 8 dígitos
                input.addEventListener('blur', async (e) => {
                    const cep = e.target.value.replace(/\D/g, '');
                    if (cep.length === 8) {
                        await this.buscarCEP(cep, prefix);
                    }
                });
            }
        });
    }

    async buscarCEP(cep, prefix) {
        // Remover caracteres não numéricos
        cep = cep.replace(/\D/g, '');

        // Validar CEP (deve ter 8 dígitos)
        if (cep.length !== 8) {
            return;
        }

        const streetInput = document.getElementById(`${prefix}AddressStreet`);
        const neighborhoodInput = document.getElementById(`${prefix}AddressNeighborhood`);
        const cityInput = document.getElementById(`${prefix}AddressCity`);
        const stateInput = document.getElementById(`${prefix}AddressState`);
        const zipCodeInput = document.getElementById(`${prefix}AddressZipCode`);

        try {
            // Mostrar indicador de carregamento
            if (zipCodeInput) {
                zipCodeInput.style.borderColor = '#4a90e2';
                zipCodeInput.style.borderWidth = '2px';
            }

            // Desabilitar campos enquanto busca
            if (streetInput) streetInput.disabled = true;
            if (neighborhoodInput) neighborhoodInput.disabled = true;
            if (cityInput) cityInput.disabled = true;
            if (stateInput) stateInput.disabled = true;

            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (data.erro) {
                this.showMessage('CEP não encontrado. Por favor, preencha o endereço manualmente.', 'error');
                if (zipCodeInput) {
                    zipCodeInput.style.borderColor = '#D0021B';
                }
            } else {
                // Preencher campos com os dados retornados
                if (streetInput && data.logradouro) {
                    streetInput.value = data.logradouro;
                }
                if (neighborhoodInput && data.bairro) {
                    neighborhoodInput.value = data.bairro;
                }
                if (cityInput && data.localidade) {
                    cityInput.value = data.localidade;
                }
                if (stateInput && data.uf) {
                    stateInput.value = data.uf;
                }

                // Se houver complemento na resposta, sugerir
                if (data.complemento) {
                    const complementInput = document.getElementById(`${prefix}AddressComplement`);
                    if (complementInput && !complementInput.value) {
                        complementInput.placeholder = `Sugestão: ${data.complemento}`;
                    }
                }

                // Mostrar mensagem de sucesso
                this.showMessage('Endereço preenchido automaticamente!', 'success');

                if (zipCodeInput) {
                    zipCodeInput.style.borderColor = '#7ED321';
                }
            }

        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            this.showMessage('Erro ao buscar CEP. Por favor, preencha o endereço manualmente.', 'error');
            if (zipCodeInput) {
                zipCodeInput.style.borderColor = '#D0021B';
            }
        } finally {
            // Reabilitar campos sempre
            if (streetInput) streetInput.disabled = false;
            if (neighborhoodInput) neighborhoodInput.disabled = false;
            if (cityInput) cityInput.disabled = false;
            if (stateInput) stateInput.disabled = false;

            // Restaurar borda normal após 2 segundos
            if (zipCodeInput) {
                setTimeout(() => {
                    zipCodeInput.style.borderColor = '';
                    zipCodeInput.style.borderWidth = '';
                }, 2000);
            }
        }
    }

    showMessage(message, type = 'info') {
        // Remover mensagem anterior se existir
        const existingMessage = document.querySelector('.cep-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Criar elemento de mensagem
        const messageEl = document.createElement('div');
        messageEl.className = `cep-message message-${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#7ED321' : type === 'error' ? '#D0021B' : '#4a90e2'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(messageEl);

        // Remover mensagem após 3 segundos
        setTimeout(() => {
            messageEl.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                messageEl.remove();
            }, 300);
        }, 3000);
    }
}

// Instância será criada no HTML quando o DOM estiver pronto
// window.employeeManager será criado no script inline do HTML

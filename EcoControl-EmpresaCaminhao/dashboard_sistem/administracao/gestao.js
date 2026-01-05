// Sistema de Gestão
class ManagementManager {
    constructor() {
        this.currentUser = null;
        this.pendingAction = null; // Armazenar ação pendente de confirmação
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadData();
        this.setupEventListeners();
        this.renderUsers();
        this.renderLogs();
        this.renderAccessRequests();
        this.setupConfirmModalListeners();
    }

    setupConfirmModalListeners() {
        // Fechar modal ao clicar fora dele
        const modal = document.getElementById('confirmModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeConfirmModal();
                }
            });
        }

        // Fechar modal com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('confirmModal');
                if (modal && modal.style.display === 'block') {
                    this.closeConfirmModal();
                }
            }
        });
    }

    checkAuth() {
        const user = sessionStorage.getItem('currentUser');
        if (!user) {
            window.location.href = '../login.html';
            return;
        }

        this.currentUser = JSON.parse(user);
    }

    loadData() {
        this.users = JSON.parse(localStorage.getItem('users') || '[]');
        this.employees = JSON.parse(localStorage.getItem('employees') || '[]');
        this.logs = JSON.parse(localStorage.getItem('systemLogs') || '[]');
        this.accessRequests = JSON.parse(localStorage.getItem('accessRequests') || '[]');

        if (!Array.isArray(this.users)) this.users = [];
        if (!Array.isArray(this.employees)) this.employees = [];
        if (!Array.isArray(this.logs)) this.logs = [];
        if (!Array.isArray(this.accessRequests)) this.accessRequests = [];

        // Garantir que todos tenham ID persistente para evitar problemas de atualização
        let updated = false;
        this.users.forEach(u => {
            if (!u.id) {
                u.id = 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                updated = true;
            }
        });
        this.employees.forEach(e => {
            if (!e.id) {
                e.id = 'emp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                updated = true;
            }
        });

        if (updated) {
            localStorage.setItem('users', JSON.stringify(this.users));
            localStorage.setItem('employees', JSON.stringify(this.employees));
            console.log('IDs gerados e salvos para usuários/funcionários sem ID');
        }

        // Garantir que o usuário master (desenvolvedor) existe
        this.ensureMasterUser();
    }

    ensureMasterUser() {
        const masterEmail = 'desenvolvedor@control.com';
        const masterUser = {
            id: 1,
            name: 'Desenvolvedor',
            email: masterEmail,
            password: 'admin123',
            role: 'gestor', // Gestor tem acesso total a todos os sistemas
            systemType: 'dashboard', // Acesso ao sistema principal
            phone: '(11) 99999-9999',
            company: 'Agreste Construção',
            status: 'active',
            photo: 'img/LOGO1.png',
            createdAt: new Date().toISOString()
        };

        // Verificar quantos usuários master existem
        const masterUsers = this.users.filter(u => u.email === masterEmail || u.id === 1);
        const masterEmployees = this.employees.filter(e => e.email === masterEmail || e.id === 1);

        // Se não existe nenhum usuário master, criar um
        if (masterUsers.length === 0) {
            this.users.push(masterUser);
            localStorage.setItem('users', JSON.stringify(this.users));
        } else if (masterUsers.length === 1) {
            // Se existe apenas um, atualizar informações se necessário
            const userIndex = this.users.findIndex(u => u.email === masterEmail || u.id === 1);
            if (userIndex !== -1) {
                // Manter dados existentes mas garantir campos essenciais
                this.users[userIndex].name = this.users[userIndex].name || masterUser.name;
                this.users[userIndex].email = this.users[userIndex].email || masterUser.email;
                this.users[userIndex].role = 'gestor'; // Sempre gestor para acesso total
                this.users[userIndex].status = this.users[userIndex].status || masterUser.status;
                this.users[userIndex].password = this.users[userIndex].password || masterUser.password;
                localStorage.setItem('users', JSON.stringify(this.users));
            }
        }
        // Se existem múltiplos usuários master, não fazer nada (permitir que o usuário exclua os duplicados)

        // Garantir que também existe em employees para acesso ao sistema de funcionário
        if (masterEmployees.length === 0) {
            const masterEmployee = {
                ...masterUser,
                id: 1,
                systemType: 'funcionario' // Também tem acesso ao sistema de funcionário
            };
            this.employees.push(masterEmployee);
            localStorage.setItem('employees', JSON.stringify(this.employees));
        } else if (masterEmployees.length === 1) {
            // Atualizar employee se necessário
            const employeeIndex = this.employees.findIndex(e => e.email === masterEmail || e.id === 1);
            if (employeeIndex !== -1) {
                this.employees[employeeIndex].name = this.employees[employeeIndex].name || masterUser.name;
                this.employees[employeeIndex].email = this.employees[employeeIndex].email || masterUser.email;
                this.employees[employeeIndex].role = 'gestor'; // Sempre gestor
                this.employees[employeeIndex].status = this.employees[employeeIndex].status || masterUser.status;
                this.employees[employeeIndex].password = this.employees[employeeIndex].password || masterUser.password;
                localStorage.setItem('employees', JSON.stringify(this.employees));
            }
        }
        // Se existem múltiplos employees master, não fazer nada (permitir que o usuário exclua os duplicados)
    }

    setupEventListeners() {
        // Filtros de logs
        const logFilter = document.getElementById('logFilter');
        if (logFilter) {
            logFilter.addEventListener('change', () => this.filterLogs());
        }

        const logDateFilter = document.getElementById('logDateFilter');
        if (logDateFilter) {
            logDateFilter.addEventListener('change', () => this.filterLogs());
        }

        const logSearch = document.getElementById('logSearch');
        if (logSearch) {
            logSearch.addEventListener('input', () => this.filterLogs());
        }

        // Busca e filtros de usuários
        const userSearch = document.getElementById('userSearch');
        if (userSearch) {
            userSearch.addEventListener('input', () => this.filterUsers());
        }

        const userRoleFilter = document.getElementById('userRoleFilter');
        if (userRoleFilter) {
            userRoleFilter.addEventListener('change', () => this.filterUsers());
        }

        const userStatusFilter = document.getElementById('userStatusFilter');
        if (userStatusFilter) {
            userStatusFilter.addEventListener('change', () => this.filterUsers());
        }

        // Fechar modal ao clicar fora
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('editUserModal');
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    renderUsers() {
        const container = document.getElementById('usersList');
        if (!container) return;

        // Combinar usuários e funcionários
        let allUsers = [
            ...this.users.map(u => ({
                id: u.id,
                name: u.name || '',
                email: u.email || '',
                role: u.role || 'funcionario',
                status: u.status || 'active',
                phone: u.phone || '',
                type: 'user'
            })),
            ...this.employees.map(emp => ({
                id: emp.id,
                name: emp.name || '',
                email: emp.email || '',
                role: emp.role || 'funcionario',
                status: emp.status || 'active',
                phone: emp.phone || '',
                type: 'employee'
            }))
        ];

        // Aplicar filtros
        allUsers = this.getFilteredUsers(allUsers);

        // Atualizar estatísticas
        this.updateUsersStats(allUsers);

        if (allUsers.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>Nenhum usuário encontrado.</p></div>';
            return;
        }

        container.innerHTML = allUsers.map(user => {
            // Garantir que todos os campos existam
            const status = user.status || 'active';
            const isActive = status === 'active';
            const role = user.role || 'funcionario';
            const roleIcon = this.getRoleIcon(role);
            const userName = (user.name || '').trim() || 'Nome não informado';
            const userEmail = (user.email || '').trim() || 'Email não informado';
            const userPhone = (user.phone || '').trim();
            const userId = user.id || `user-${Date.now()}-${Math.random()}`;

            return `
            <div class="user-item ${!isActive ? 'user-inactive' : ''}" data-user-id="${userId}" data-user-role="${role}" data-user-status="${status}">
                <div class="user-avatar user-avatar-${role}">
                    <i class="fas ${roleIcon}"></i>
                </div>
                <div class="user-info">
                    <div class="user-name-row">
                        <div class="user-name" title="${userName}">${this.escapeHtml(userName)}</div>
                        <div class="user-badges">
                            <span class="role-badge role-${role}">
                                <i class="fas ${roleIcon}"></i>
                                ${this.getRoleName(role)}
                            </span>
                            <span class="status-badge status-${status}">
                                <i class="fas fa-circle"></i>
                                ${isActive ? 'ATIVO' : 'INATIVO'}
                            </span>
                        </div>
                    </div>
                    <div class="user-details">
                        <div class="user-email" title="${userEmail}">
                            <i class="fas fa-envelope"></i>
                            <span>${this.escapeHtml(userEmail)}</span>
                        </div>
                        ${userPhone ? `
                        <div class="user-phone" title="${userPhone}">
                            <i class="fas fa-phone"></i>
                            <span>${this.escapeHtml(userPhone)}</span>
                        </div>
                        ` : '<div class="user-phone" style="opacity: 0.5;"><i class="fas fa-phone"></i><span>Telefone não informado</span></div>'}
                    </div>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button type="button" 
                            class="btn btn-sm btn-danger" 
                            data-user-id="${userId}"
                            data-action="delete-user"
                            onclick="event.stopPropagation(); managementManager.deleteUser('${userId}')"
                            title="Excluir usuário"
                            style="padding: 6px 12px; font-size: 12px; background: var(--accent-red); color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button type="button" 
                            class="btn-user-menu" 
                            data-user-id="${userId}"
                            data-action="open-panel"
                            title="Gerenciar usuário">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </div>
            </div>
        `;
        }).join('');

        // Adicionar event listeners aos botões de ação após renderizar
        setTimeout(() => {
            document.querySelectorAll('.btn-user-menu[data-action="open-panel"]').forEach(btn => {
                const userId = btn.getAttribute('data-user-id');
                if (userId) {
                    // Remover listeners antigos para evitar duplicação
                    const newBtn = btn.cloneNode(true);
                    btn.parentNode.replaceChild(newBtn, btn);

                    // Adicionar novo listener
                    newBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        console.log('Botão clicado, userId:', userId);
                        if (window.managementManager) {
                            window.managementManager.openUserPanel(userId);
                        } else if (this) {
                            this.openUserPanel(userId);
                        } else {
                            console.error('managementManager não encontrado');
                        }
                    });
                }
            });
        }, 100);
    }

    renderAccessRequests() {
        const container = document.getElementById('accessRequestsList');
        const countBadge = document.getElementById('pendingRequestsCount');
        if (!container || !countBadge) return;

        const pendingRequests = this.accessRequests.filter(req => req.status === 'pending');
        countBadge.textContent = pendingRequests.length;

        if (pendingRequests.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle" style="color: var(--accent-green);"></i><p>Nenhuma solicitação pendente</p></div>';
            return;
        }

        container.innerHTML = pendingRequests.map(req => {
            const date = new Date(req.createdAt).toLocaleString('pt-BR');
            const systemTypeDisplay = req.systemType === 'dashboard' ? 'Sistema Principal' : 'Sistema de Funcionário';
            return `
                <div class="request-card" style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid var(--accent-orange);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                        <div style="flex: 1; min-width: 200px;">
                            <h4 style="margin: 0 0 5px 0; color: var(--text-primary); font-size: 16px;">
                                ${this.escapeHtml(req.fullName || 'Nome não informado')}
                                <span class="badge" style="background: var(--accent-blue); color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px;">
                                    ${this.getRoleName(req.desiredRole || 'funcionario')}
                                </span>
                            </h4>
                            <p style="margin: 5px 0; color: var(--text-secondary); font-size: 13px;">
                                <i class="fas fa-envelope"></i> ${this.escapeHtml(req.email || 'Email não informado')}
                            </p>
                            ${req.phone ? `<p style="margin: 5px 0; color: var(--text-secondary); font-size: 13px;"><i class="fas fa-phone"></i> ${this.escapeHtml(req.phone)}</p>` : ''}
                            <p style="margin: 5px 0; color: var(--text-secondary); font-size: 13px;">
                                <i class="fas fa-desktop"></i> ${systemTypeDisplay}
                            </p>
                            <p style="margin: 10px 0 0 0; color: var(--text-secondary); font-size: 12px;">
                                <i class="fas fa-clock"></i> ${date}
                            </p>
                        </div>
                    </div>
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                        <p style="margin: 0 0 15px 0; color: var(--text-primary); font-size: 14px;">
                            <strong>Motivo:</strong> ${this.escapeHtml(req.reason || 'Não informado')}
                        </p>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <button class="btn btn-success btn-sm" onclick="window.managementManager.approveAccessRequest('${req.id}')" style="flex: 1; min-width: 120px;">
                                <i class="fas fa-check"></i> Aprovar
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="window.managementManager.rejectAccessRequest('${req.id}')" style="flex: 1; min-width: 120px;">
                                <i class="fas fa-times"></i> Recusar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    approveAccessRequest(requestId) {
        const requestIndex = this.accessRequests.findIndex(req => req.id === requestId);
        if (requestIndex === -1) {
            this.showMessage('Solicitação não encontrada.', 'error');
            return;
        }

        const request = this.accessRequests[requestIndex];

        // Armazenar ação pendente
        this.pendingAction = {
            type: 'approveAccessRequest',
            requestId: requestId,
            requestIndex: requestIndex,
            request: request
        };

        // Mostrar modal de confirmação
        const systemTypeName = request.systemType === 'dashboard' ? 'Sistema Principal' : 'Sistema de Funcionário';
        this.showConfirmModal(
            'Aprovar Solicitação',
            `Tem certeza que deseja aprovar o acesso para <strong>"${this.escapeHtml(request.fullName)}"</strong> como <strong>${this.getRoleName(request.desiredRole)}</strong> no <strong>${systemTypeName}</strong>?`
        );
    }

    rejectAccessRequest(requestId) {
        const requestIndex = this.accessRequests.findIndex(req => req.id === requestId);
        if (requestIndex === -1) {
            this.showMessage('Solicitação não encontrada.', 'error');
            return;
        }

        const request = this.accessRequests[requestIndex];

        // Armazenar ação pendente
        this.pendingAction = {
            type: 'rejectAccessRequest',
            requestId: requestId,
            requestIndex: requestIndex,
            request: request
        };

        // Mostrar modal de confirmação
        this.showConfirmModal(
            'Recusar Solicitação',
            `Tem certeza que deseja recusar o acesso para <strong>"${this.escapeHtml(request.fullName)}"</strong>?`
        );
    }

    getFilteredUsers(users) {
        const searchTerm = (document.getElementById('userSearch')?.value || '').toLowerCase();
        const roleFilter = document.getElementById('userRoleFilter')?.value || 'all';
        const statusFilter = document.getElementById('userStatusFilter')?.value || 'all';

        return users.filter(user => {
            const matchesSearch = !searchTerm ||
                (user.name || '').toLowerCase().includes(searchTerm) ||
                (user.email || '').toLowerCase().includes(searchTerm);

            const matchesRole = roleFilter === 'all' || user.role === roleFilter;
            const matchesStatus = statusFilter === 'all' || (user.status || 'active') === statusFilter;

            return matchesSearch && matchesRole && matchesStatus;
        });
    }

    updateUsersStats(users) {
        const total = users.length;
        const active = users.filter(u => (u.status || 'active') === 'active').length;
        const inactive = total - active;

        const totalEl = document.getElementById('totalUsers');
        const activeEl = document.getElementById('activeUsers');
        const inactiveEl = document.getElementById('inactiveUsers');

        if (totalEl) totalEl.textContent = total;
        if (activeEl) activeEl.textContent = active;
        if (inactiveEl) inactiveEl.textContent = inactive;
    }

    renderLogs() {
        const container = document.getElementById('logsList');
        if (!container) return;

        const filteredLogs = this.getFilteredLogs();

        // Atualizar estatísticas
        const totalLogsEl = document.getElementById('totalLogs');
        if (totalLogsEl) {
            totalLogsEl.textContent = filteredLogs.length;
        }

        if (filteredLogs.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>Nenhum log encontrado.</p></div>';
            return;
        }

        // Mostrar logs (mais recentes primeiro)
        const recentLogs = [...filteredLogs].reverse().slice(0, 200);

        container.innerHTML = recentLogs.map(log => {
            const date = new Date(log.timestamp);
            const timeStr = date.toLocaleString('pt-BR');
            const dateStr = date.toLocaleDateString('pt-BR');
            const timeOnly = date.toLocaleTimeString('pt-BR');

            return `
                <div class="log-item">
                    <div class="log-time">
                        <div class="log-date">${dateStr}</div>
                        <div class="log-time-only">${timeOnly}</div>
                    </div>
                    <div class="log-user">
                        <i class="fas fa-user"></i>
                        <span>${log.user || 'Sistema'}</span>
                    </div>
                    <div class="log-action">
                        <i class="fas fa-info-circle"></i>
                        <span>${log.action || 'N/A'}</span>
                    </div>
                    <div class="log-type">
                        <span class="type-badge type-${log.type || 'system'}">
                            <i class="fas fa-${this.getLogIcon(log.type)}"></i>
                            ${this.getLogTypeName(log.type)}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }

    getLogIcon(type) {
        const iconMap = {
            'settings': 'cog',
            'management': 'users-cog',
            'system': 'server',
            'delivery': 'truck',
            'user': 'user'
        };
        return iconMap[type] || 'circle';
    }

    getFilteredLogs() {
        const filter = document.getElementById('logFilter')?.value || 'all';
        const dateFilter = document.getElementById('logDateFilter')?.value || '';
        const searchTerm = (document.getElementById('logSearch')?.value || '').toLowerCase();

        let filtered = this.logs;

        // Filtro por tipo
        if (filter !== 'all') {
            filtered = filtered.filter(log => log.type === filter);
        }

        // Filtro por data
        if (dateFilter) {
            const filterDate = new Date(dateFilter).toDateString();
            filtered = filtered.filter(log => {
                const logDate = new Date(log.timestamp).toDateString();
                return logDate === filterDate;
            });
        }

        // Filtro por busca
        if (searchTerm) {
            filtered = filtered.filter(log => {
                const user = (log.user || '').toLowerCase();
                const action = (log.action || '').toLowerCase();
                return user.includes(searchTerm) || action.includes(searchTerm);
            });
        }

        return filtered;
    }

    filterLogs() {
        this.renderLogs();
    }

    filterUsers() {
        this.renderUsers();
    }

    openUserPanel(userId) {
        console.log('openUserPanel chamado com userId:', userId);

        // Encontrar usuário - tentar por ID primeiro, depois por email
        let user = this.users.find(u => {
            const uId = u.id ? String(u.id) : '';
            const searchId = String(userId);
            return uId === searchId || uId == searchId || u.id === userId;
        });
        let isEmployee = false;

        if (!user) {
            user = this.employees.find(e => {
                const eId = e.id ? String(e.id) : '';
                const searchId = String(userId);
                return eId === searchId || eId == searchId || e.id === userId;
            });
            isEmployee = true;
        }

        // Se ainda não encontrou, tentar buscar por email (para usuário master)
        if (!user) {
            const allUsers = [...this.users, ...this.employees];
            user = allUsers.find(u => {
                const uId = u.id ? String(u.id) : '';
                const searchId = String(userId);
                return uId === searchId || uId == searchId || u.email === userId || u.name === userId;
            });
            if (user) {
                isEmployee = this.employees.some(e => {
                    const eId = e.id ? String(e.id) : '';
                    const uId = user.id ? String(user.id) : '';
                    return eId === uId || e.id === user.id;
                });
            }
        }

        if (!user) {
            console.error('Usuário não encontrado. ID buscado:', userId);
            console.log('Users disponíveis:', this.users.map(u => ({ id: u.id, name: u.name, email: u.email })));
            console.log('Employees disponíveis:', this.employees.map(e => ({ id: e.id, name: e.name, email: e.email })));
            this.showMessage('Usuário não encontrado', 'error');
            return;
        }

        console.log('Usuário encontrado:', user);

        const status = user.status || 'active';
        const isActive = status === 'active';
        const role = user.role || 'funcionario';
        const roleIcon = this.getRoleIcon(role);
        const roleName = this.getRoleName(role);

        // Preencher informações no painel
        document.getElementById('panelUserId').value = userId;
        document.getElementById('panelUserId').dataset.isEmployee = isEmployee;

        // Informações do usuário
        document.getElementById('panelUserName').textContent = user.name || 'Nome não informado';
        document.getElementById('panelUserEmail').textContent = user.email || 'Email não informado';
        document.getElementById('panelUserPhone').textContent = user.phone || 'Telefone não informado';
        document.getElementById('panelUserRole').textContent = roleName;
        document.getElementById('panelUserStatus').textContent = isActive ? 'Ativo' : 'Inativo';
        document.getElementById('panelUserStatus').className = `status-badge status-${status}`;

        // Preencher select de cargo
        const roleSelect = document.getElementById('panelUserRoleSelect');
        if (roleSelect) {
            roleSelect.value = role;
        }

        // Ocultar linhas de edição
        const roleEditRow = document.getElementById('roleEditRow');
        const emailEditRow = document.getElementById('emailEditRow');
        const phoneEditRow = document.getElementById('phoneEditRow');
        if (roleEditRow) roleEditRow.style.display = 'none';
        if (emailEditRow) emailEditRow.style.display = 'none';
        if (phoneEditRow) phoneEditRow.style.display = 'none';

        // Mostrar linhas de exibição
        const roleDisplay = document.getElementById('panelUserRole').parentElement;
        const emailDisplay = document.getElementById('panelUserEmail').parentElement;
        const phoneDisplay = document.getElementById('panelUserPhone').parentElement;
        if (roleDisplay) {
            roleDisplay.style.display = 'flex';
            roleDisplay.style.visibility = 'visible';
        }
        if (emailDisplay) {
            emailDisplay.style.display = 'flex';
            emailDisplay.style.visibility = 'visible';
        }
        if (phoneDisplay) {
            phoneDisplay.style.display = 'flex';
            phoneDisplay.style.visibility = 'visible';
        }

        // Verificar se o usuário atual pode ver senhas (desenvolvedor ou gestor)
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        const canViewPasswords = ['gestor', 'desenvolvedor', 'superadmin'].includes(currentUser.role);

        // Mostrar/ocultar linha de senha no painel
        const passwordRow = document.getElementById('panelPasswordRow');
        const passwordDisplay = document.getElementById('panelUserPassword');
        if (passwordRow && passwordDisplay) {
            if (canViewPasswords) {
                passwordRow.style.display = 'flex';
                // Armazenar senha atual para exibição (não mostrar diretamente por segurança)
                passwordRow.dataset.currentPassword = user.password || '';
                passwordDisplay.textContent = '••••••••';
                passwordDisplay.dataset.showing = 'false';
                // Resetar ícone do botão
                const toggleBtn = passwordRow.querySelector('button');
                if (toggleBtn) {
                    toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Ver';
                }
            } else {
                passwordRow.style.display = 'none';
            }
        }

        // Preencher inputs de edição
        const emailInput = document.getElementById('panelUserEmailInput');
        const phoneInput = document.getElementById('panelUserPhoneInput');
        if (emailInput) emailInput.value = user.email || '';
        if (phoneInput) phoneInput.value = user.phone || '';

        // Avatar
        const avatar = document.getElementById('panelUserAvatar');
        avatar.className = `user-avatar user-avatar-${role}`;
        avatar.innerHTML = `<i class="fas ${roleIcon}"></i>`;

        // Preencher formulário de edição
        document.getElementById('editUserId').value = userId;
        document.getElementById('editUserId').dataset.isEmployee = isEmployee;
        document.getElementById('editUserName').value = user.name || '';
        document.getElementById('editUserEmail').value = user.email || '';
        document.getElementById('editUserRole').value = role;
        document.getElementById('editUserStatus').value = status;

        // Atualizar botão de ativar/desativar
        const toggleBtn = document.getElementById('panelToggleStatus');
        if (toggleBtn) {
            toggleBtn.innerHTML = isActive
                ? '<i class="fas fa-ban"></i> Desativar Usuário'
                : '<i class="fas fa-check"></i> Ativar Usuário';
            toggleBtn.className = isActive ? 'btn btn-warning' : 'btn btn-success';
            toggleBtn.onclick = () => {
                this.toggleUserStatus(userId);
            };
        }

        // Mostrar painel
        const panel = document.getElementById('userPanel');
        if (panel) {
            panel.style.display = 'block';
            console.log('Painel de usuário aberto');

            // Scroll automático para o painel (modais fixos precisam de tratamento especial)
            setTimeout(() => {
                // Para modais fixos, rolar a página para o topo para garantir visibilidade
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
        } else {
            console.error('Painel userPanel não encontrado no DOM');
        }
    }

    openEditUserModal(userId) {
        // Encontrar usuário
        let user = this.users.find(u => u.id === userId);
        let isEmployee = false;

        if (!user) {
            user = this.employees.find(e => e.id === userId);
            isEmployee = true;
        }

        if (!user) {
            this.showMessage('Usuário não encontrado', 'error');
            return;
        }

        // Verificar se o usuário atual pode ver/alterar senhas (desenvolvedor ou gestor)
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        const canManagePasswords = ['gestor', 'desenvolvedor', 'superadmin'].includes(currentUser.role);

        // Mostrar/ocultar campo de senha
        const passwordGroup = document.getElementById('editPasswordGroup');
        if (passwordGroup) {
            passwordGroup.style.display = canManagePasswords ? 'block' : 'none';
        }

        // Preencher formulário
        const editUserId = document.getElementById('editUserId');
        const editUserName = document.getElementById('editUserName');
        const editUserEmail = document.getElementById('editUserEmail');
        const editUserRole = document.getElementById('editUserRole');
        const editUserStatus = document.getElementById('editUserStatus');
        const editUserPassword = document.getElementById('editUserPassword');

        if (editUserId) {
            editUserId.value = userId;
            editUserId.dataset.isEmployee = isEmployee;
            // Marcar se o painel está aberto
            const panel = document.getElementById('userPanel');
            editUserId.dataset.panelOpen = (panel && panel.style.display === 'block') ? 'true' : 'false';
        }
        if (editUserName) editUserName.value = user.name || '';
        if (editUserEmail) editUserEmail.value = user.email || '';
        if (editUserRole) editUserRole.value = user.role || 'funcionario';
        if (editUserStatus) editUserStatus.value = user.status || 'active';
        if (editUserPassword && canManagePasswords) {
            // Não preencher a senha por segurança, deixar em branco
            editUserPassword.value = '';
        }

        // Mostrar modal
        const modal = document.getElementById('editUserModal');
        if (modal) {
            modal.style.display = 'block';

            // Scroll automático para o topo da página para garantir que o modal fique visível
            // Modais fixos sempre aparecem no centro da viewport, então rolamos para o topo
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
        }
    }

    saveUser() {
        const userId = document.getElementById('editUserId').value;
        const isEmployee = document.getElementById('editUserId').dataset.isEmployee === 'true';
        const name = document.getElementById('editUserName').value;
        const email = document.getElementById('editUserEmail').value;
        const role = document.getElementById('editUserRole').value;
        const status = document.getElementById('editUserStatus').value;
        const newPassword = document.getElementById('editUserPassword')?.value?.trim() || '';

        if (!name || !email) {
            this.showMessage('Por favor, preencha todos os campos obrigatórios.', 'error');
            return;
        }

        // Verificar se o usuário atual pode alterar senhas
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        const canManagePasswords = ['gestor', 'desenvolvedor', 'superadmin'].includes(currentUser.role);

        // Validar senha se foi fornecida
        if (newPassword && canManagePasswords) {
            if (newPassword.length < 6) {
                this.showMessage('A senha deve ter no mínimo 6 caracteres.', 'error');
                return;
            }
        }

        if (isEmployee) {
            const employeeIndex = this.employees.findIndex(e => String(e.id) === String(userId));
            if (employeeIndex !== -1) {
                this.employees[employeeIndex].name = name;
                this.employees[employeeIndex].email = email;
                this.employees[employeeIndex].role = role;
                this.employees[employeeIndex].status = status;
                // Atualizar senha se fornecida
                if (newPassword && canManagePasswords) {
                    this.employees[employeeIndex].password = newPassword;
                }
                localStorage.setItem('employees', JSON.stringify(this.employees));
            } else {
                this.showMessage('Funcionário não encontrado para atualização', 'error');
                return;
            }
        } else {
            const userIndex = this.users.findIndex(u => String(u.id) === String(userId));
            if (userIndex !== -1) {
                this.users[userIndex].name = name;
                this.users[userIndex].email = email;
                this.users[userIndex].role = role;
                this.users[userIndex].status = status;
                // Atualizar senha se fornecida
                if (newPassword && canManagePasswords) {
                    this.users[userIndex].password = newPassword;
                }
                localStorage.setItem('users', JSON.stringify(this.users));
            } else {
                this.showMessage('Usuário não encontrado para atualização', 'error');
                return;
            }
        }

        const passwordMessage = (newPassword && canManagePasswords) ? ' (senha alterada)' : '';
        this.logAction(`Usuário ${name} atualizado${passwordMessage}`);
        this.renderUsers();
        document.getElementById('editUserModal').style.display = 'none';
        const successMessage = newPassword && canManagePasswords
            ? 'Usuário atualizado com sucesso! Senha alterada.'
            : 'Usuário atualizado com sucesso!';
        this.showMessage(successMessage, 'success');
        // Atualizar painel se estiver aberto
        const panel = document.getElementById('userPanel');
        const panelWasOpen = document.getElementById('editUserId').dataset.panelOpen === 'true';
        if (panelWasOpen && panel) {
            this.openUserPanel(userId);
        }
    }

    toggleUserStatus(userId) {
        let user = this.users.find(u => u.id === userId);
        let isEmployee = false;

        if (!user) {
            user = this.employees.find(e => e.id === userId);
            isEmployee = true;
        }

        if (!user) {
            this.showMessage('Usuário não encontrado', 'error');
            return;
        }

        const currentStatus = user.status || 'active';
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const action = newStatus === 'active' ? 'ativado' : 'desativado';
        const actionVerb = newStatus === 'active' ? 'ativar' : 'desativar';
        const userName = user.name || 'Usuário';

        // Armazenar ação pendente
        this.pendingAction = {
            type: 'toggleUserStatus',
            userId: userId,
            userName: userName,
            isEmployee: isEmployee,
            newStatus: newStatus,
            action: action
        };

        // Mostrar modal de confirmação
        this.showConfirmModal(
            `${actionVerb === 'ativar' ? 'Ativar' : 'Desativar'} Usuário`,
            `Tem certeza que deseja <strong>${actionVerb}</strong> o usuário <strong>"${this.escapeHtml(userName)}"</strong>?`
        );
    }

    exportLogs() {
        const logs = this.getFilteredLogs();
        const csv = this.convertLogsToCSV(logs);
        this.downloadCSV(csv, `logs_${new Date().toISOString().split('T')[0]}.csv`);
        this.logAction('Logs exportados');
    }

    convertLogsToCSV(logs) {
        const headers = ['Data/Hora', 'Usuário', 'Ação', 'Tipo'];
        const rows = logs.map(log => [
            new Date(log.timestamp).toLocaleString('pt-BR'),
            log.user || 'Sistema',
            log.action || 'N/A',
            this.getLogTypeName(log.type)
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    clearLogs() {
        // Armazenar ação pendente
        this.pendingAction = {
            type: 'clearLogs'
        };

        // Mostrar modal de confirmação
        this.showConfirmModal(
            'Limpar Logs',
            `Tem certeza que deseja limpar todos os logs?<br><br>Esta ação não pode ser desfeita!`
        );
    }

    addLog(action, description, type = 'system') {
        const logs = JSON.parse(localStorage.getItem('systemLogs') || '[]');
        logs.push({
            timestamp: new Date().toISOString(),
            user: this.currentUser ? (this.currentUser.name || this.currentUser.email) : 'Sistema',
            action: action,
            description: description,
            type: type
        });

        if (logs.length > 1000) {
            logs.shift();
        }

        localStorage.setItem('systemLogs', JSON.stringify(logs));
        this.logs = logs;
    }

    logAction(action) {
        this.addLog(action, action, 'management');
    }

    getRoleName(role) {
        const roleMap = {
            'gestor': 'Gestor',
            'motorista': 'Motorista',
            'funcionario': 'Funcionário',
            'atendente': 'Atendente',
            'administrador': 'Administrador',
            'desenvolvedor': 'Desenvolvedor',
            'superadmin': 'Super Admin',
            'admin': 'Admin'
        };
        return roleMap[role] || role;
    }

    getRoleIcon(role) {
        const iconMap = {
            'gestor': 'fa-user-tie',
            'motorista': 'fa-user',
            'funcionario': 'fa-user-friends',
            'atendente': 'fa-headset',
            'administrador': 'fa-user-shield',
            'desenvolvedor': 'fa-code',
            'superadmin': 'fa-crown',
            'admin': 'fa-user-cog'
        };
        return iconMap[role] || 'fa-user';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getLogTypeName(type) {
        const typeMap = {
            'settings': 'Configurações',
            'management': 'Gestão',
            'system': 'Sistema',
            'delivery': 'Entrega',
            'user': 'Usuário'
        };
        return typeMap[type] || type || 'Sistema';
    }

    editRole() {
        const roleEditRow = document.getElementById('roleEditRow');
        const roleDisplay = document.getElementById('panelUserRole').parentElement;
        if (roleEditRow && roleDisplay) {
            roleDisplay.style.display = 'none';
            roleEditRow.style.display = 'flex';
        }
    }

    cancelRoleEdit() {
        const roleEditRow = document.getElementById('roleEditRow');
        const roleDisplay = document.getElementById('panelUserRole').parentElement;
        if (roleEditRow && roleDisplay) {
            roleEditRow.style.display = 'none';
            roleDisplay.style.display = 'flex';
        }
    }

    editEmail() {
        const emailEditRow = document.getElementById('emailEditRow');
        const emailDisplay = document.getElementById('panelUserEmail').parentElement;
        if (emailEditRow && emailDisplay) {
            emailDisplay.style.display = 'none';
            emailEditRow.style.display = 'flex';
        }
    }

    cancelEmailEdit() {
        const emailEditRow = document.getElementById('emailEditRow');
        const emailDisplay = document.getElementById('panelUserEmail').parentElement;
        if (emailEditRow && emailDisplay) {
            emailEditRow.style.display = 'none';
            emailDisplay.style.display = 'flex';
        }
    }

    saveEmail() {
        const userId = document.getElementById('panelUserId').value;
        const isEmployee = document.getElementById('panelUserId').dataset.isEmployee === 'true';
        const newEmail = document.getElementById('panelUserEmailInput').value.trim();

        if (!userId || !newEmail) {
            this.showMessage('Por favor, preencha o email', 'error');
            return;
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            this.showMessage('Por favor, insira um email válido', 'error');
            return;
        }

        // Encontrar usuário
        let user = this.users.find(u => u.id === userId || u.id == userId);
        let isEmployeeFlag = isEmployee;

        if (!user) {
            user = this.employees.find(e => e.id === userId || e.id == userId);
            isEmployeeFlag = true;
        }

        if (!user) {
            this.showMessage('Usuário não encontrado', 'error');
            return;
        }

        // Atualizar email
        if (isEmployeeFlag) {
            const employeeIndex = this.employees.findIndex(e => String(e.id) === String(userId));
            if (employeeIndex !== -1) {
                this.employees[employeeIndex].email = newEmail;
                localStorage.setItem('employees', JSON.stringify(this.employees));
            } else {
                this.showMessage('Funcionário não encontrado', 'error');
                return;
            }
        } else {
            const userIndex = this.users.findIndex(u => String(u.id) === String(userId));
            if (userIndex !== -1) {
                this.users[userIndex].email = newEmail;
                localStorage.setItem('users', JSON.stringify(this.users));
            } else {
                this.showMessage('Usuário não encontrado', 'error');
                return;
            }
        }

        this.logAction(`Email do usuário ${user.name || 'Usuário'} alterado para ${newEmail}`);
        this.loadData();
        this.renderUsers();
        this.showMessage('Email atualizado com sucesso!', 'success');

        // Atualizar painel
        this.openUserPanel(userId);
    }

    editPhone() {
        const phoneEditRow = document.getElementById('phoneEditRow');
        const phoneDisplay = document.getElementById('panelUserPhone').parentElement;
        if (phoneEditRow && phoneDisplay) {
            phoneDisplay.style.display = 'none';
            phoneEditRow.style.display = 'flex';
        }
    }

    cancelPhoneEdit() {
        const phoneEditRow = document.getElementById('phoneEditRow');
        const phoneDisplay = document.getElementById('panelUserPhone').parentElement;
        if (phoneEditRow && phoneDisplay) {
            phoneEditRow.style.display = 'none';
            phoneDisplay.style.display = 'flex';
        }
    }

    editName() {
        const nameEditRow = document.getElementById('nameEditRow');
        const nameDisplay = document.getElementById('panelUserName');
        const nameInput = document.getElementById('panelUserNameInput');

        if (nameEditRow && nameDisplay && nameInput) {
            // Preencher input com nome atual
            nameInput.value = nameDisplay.textContent.trim();
            nameEditRow.style.display = 'block';
        }
    }

    cancelNameEdit() {
        const nameEditRow = document.getElementById('nameEditRow');
        if (nameEditRow) {
            nameEditRow.style.display = 'none';
        }
    }

    saveName() {
        const userId = document.getElementById('panelUserId').value;
        const isEmployee = document.getElementById('panelUserId').dataset.isEmployee === 'true';
        const newName = document.getElementById('panelUserNameInput').value.trim();

        if (!userId || !newName) {
            this.showMessage('Por favor, preencha o nome', 'error');
            return;
        }

        if (newName.length < 2) {
            this.showMessage('O nome deve ter no mínimo 2 caracteres', 'error');
            return;
        }

        // Encontrar usuário
        let user = this.users.find(u => u.id === userId || u.id == userId);
        let isEmployeeFlag = isEmployee;

        if (!user) {
            user = this.employees.find(e => e.id === userId || e.id == userId);
            isEmployeeFlag = true;
        }

        if (!user) {
            this.showMessage('Usuário não encontrado', 'error');
            return;
        }

        const oldName = user.name || 'Usuário';

        // Atualizar nome
        if (isEmployeeFlag) {
            const employeeIndex = this.employees.findIndex(e => String(e.id) === String(userId));
            if (employeeIndex !== -1) {
                this.employees[employeeIndex].name = newName;
                localStorage.setItem('employees', JSON.stringify(this.employees));
            } else {
                this.showMessage('Funcionário não encontrado', 'error');
                return;
            }
        } else {
            const userIndex = this.users.findIndex(u => String(u.id) === String(userId));
            if (userIndex !== -1) {
                this.users[userIndex].name = newName;
                localStorage.setItem('users', JSON.stringify(this.users));
            } else {
                this.showMessage('Usuário não encontrado', 'error');
                return;
            }
        }

        this.logAction(`Nome do usuário alterado de "${oldName}" para "${newName}"`);
        this.loadData();
        this.renderUsers();
        this.showMessage('Nome atualizado com sucesso!', 'success');

        // Atualizar painel
        this.openUserPanel(userId);
    }

    savePhone() {
        const userId = document.getElementById('panelUserId').value;
        const isEmployee = document.getElementById('panelUserId').dataset.isEmployee === 'true';
        const newPhone = document.getElementById('panelUserPhoneInput').value.trim();

        if (!userId) {
            this.showMessage('Erro ao salvar telefone', 'error');
            return;
        }

        // Encontrar usuário
        let user = this.users.find(u => u.id === userId || u.id == userId);
        let isEmployeeFlag = isEmployee;

        if (!user) {
            user = this.employees.find(e => e.id === userId || e.id == userId);
            isEmployeeFlag = true;
        }

        if (!user) {
            this.showMessage('Usuário não encontrado', 'error');
            return;
        }

        // Atualizar telefone
        if (isEmployeeFlag) {
            const employeeIndex = this.employees.findIndex(e => String(e.id) === String(userId));
            if (employeeIndex !== -1) {
                this.employees[employeeIndex].phone = newPhone;
                localStorage.setItem('employees', JSON.stringify(this.employees));
            } else {
                this.showMessage('Funcionário não encontrado', 'error');
                return;
            }
        } else {
            const userIndex = this.users.findIndex(u => String(u.id) === String(userId));
            if (userIndex !== -1) {
                this.users[userIndex].phone = newPhone;
                localStorage.setItem('users', JSON.stringify(this.users));
            } else {
                this.showMessage('Usuário não encontrado', 'error');
                return;
            }
        }

        this.logAction(`Telefone do usuário ${user.name || 'Usuário'} alterado para ${newPhone || 'não informado'}`);
        this.loadData();
        this.renderUsers();
        this.showMessage('Telefone atualizado com sucesso!', 'success');

        // Atualizar painel
        this.openUserPanel(userId);
    }

    saveRole() {
        const userId = document.getElementById('panelUserId').value;
        const isEmployee = document.getElementById('panelUserId').dataset.isEmployee === 'true';
        const newRole = document.getElementById('panelUserRoleSelect').value;

        if (!userId || !newRole) {
            this.showMessage('Erro ao salvar cargo', 'error');
            return;
        }

        // Encontrar usuário
        let user = this.users.find(u => u.id === userId || u.id == userId);
        let isEmployeeFlag = isEmployee;

        if (!user) {
            user = this.employees.find(e => e.id === userId || e.id == userId);
            isEmployeeFlag = true;
        }

        if (!user) {
            this.showMessage('Usuário não encontrado', 'error');
            return;
        }

        // Atualizar cargo
        if (isEmployeeFlag) {
            const employeeIndex = this.employees.findIndex(e => String(e.id) === String(userId));
            if (employeeIndex !== -1) {
                this.employees[employeeIndex].role = newRole;
                localStorage.setItem('employees', JSON.stringify(this.employees));
            } else {
                this.showMessage('Funcionário não encontrado', 'error');
                return;
            }
        } else {
            const userIndex = this.users.findIndex(u => String(u.id) === String(userId));
            if (userIndex !== -1) {
                this.users[userIndex].role = newRole;
                localStorage.setItem('users', JSON.stringify(this.users));
            } else {
                this.showMessage('Usuário não encontrado', 'error');
                return;
            }
        }

        this.logAction(`Cargo do usuário ${user.name || 'Usuário'} alterado para ${this.getRoleName(newRole)}`);
        this.loadData();
        this.renderUsers();
        this.showMessage('Cargo atualizado com sucesso!', 'success');

        // Ocultar linha de edição e mostrar linha de exibição imediatamente
        const roleEditRow = document.getElementById('roleEditRow');
        const roleDisplay = document.getElementById('panelUserRole').parentElement;
        if (roleEditRow) {
            roleEditRow.style.display = 'none';
        }
        if (roleDisplay) {
            roleDisplay.style.display = 'flex';
            roleDisplay.style.visibility = 'visible';
        }

        // Atualizar painel mantendo a exibição correta
        setTimeout(() => {
            this.openUserPanel(userId);
        }, 100);
    }

    togglePasswordVisibility() {
        const passwordInput = document.getElementById('editUserPassword');
        const toggleIcon = document.getElementById('passwordToggleIcon');

        if (passwordInput && toggleIcon) {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleIcon.classList.remove('fa-eye');
                toggleIcon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                toggleIcon.classList.remove('fa-eye-slash');
                toggleIcon.classList.add('fa-eye');
            }
        }
    }

    togglePasswordView() {
        const passwordRow = document.getElementById('panelPasswordRow');
        const passwordDisplay = document.getElementById('panelUserPassword');
        const toggleBtn = passwordRow?.querySelector('button');

        if (passwordRow && passwordDisplay && toggleBtn) {
            const currentPassword = passwordRow.dataset.currentPassword || '';
            const isShowing = passwordDisplay.dataset.showing === 'true';

            if (isShowing) {
                // Ocultar senha
                passwordDisplay.textContent = '••••••••';
                passwordDisplay.dataset.showing = 'false';
                toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Ver';
            } else {
                // Mostrar senha
                passwordDisplay.textContent = currentPassword || 'Não definida';
                passwordDisplay.dataset.showing = 'true';
                toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Ocultar';
            }
        }
    }

    changeUserPassword() {
        // Mostrar campo de nova senha
        const passwordChangeRow = document.getElementById('passwordChangeRow');
        const passwordInput = document.getElementById('panelNewPassword');

        if (passwordChangeRow && passwordInput) {
            passwordChangeRow.style.display = 'flex';
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    cancelPasswordChange() {
        // Ocultar campo de nova senha
        const passwordChangeRow = document.getElementById('passwordChangeRow');
        const passwordInput = document.getElementById('panelNewPassword');

        if (passwordChangeRow) {
            passwordChangeRow.style.display = 'none';
        }
        if (passwordInput) {
            passwordInput.value = '';
        }
    }

    deleteUser(userId) {
        if (!userId) {
            this.showMessage('Erro ao identificar usuário', 'error');
            return;
        }

        // Encontrar usuário
        let user = this.users.find(u => u.id === userId || u.id == userId);
        let isEmployee = false;

        if (!user) {
            user = this.employees.find(e => e.id === userId || e.id == userId);
            isEmployee = true;
        }

        if (!user) {
            this.showMessage('Usuário não encontrado', 'error');
            return;
        }

        const userName = user.name || 'Usuário';

        // Armazenar ação pendente
        this.pendingAction = {
            type: 'deleteUser',
            userId: userId,
            userName: userName,
            isEmployee: isEmployee
        };

        // Mostrar modal de confirmação
        this.showConfirmModal(
            'Confirmar Exclusão',
            `Tem certeza que deseja EXCLUIR permanentemente o usuário <strong>"${this.escapeHtml(userName)}"</strong>?<br><br>Esta ação não pode ser desfeita!`
        );
    }

    showConfirmModal(title, message) {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmTitle');
        const messageEl = document.getElementById('confirmMessage');

        if (modal && titleEl && messageEl) {
            titleEl.textContent = title;
            messageEl.innerHTML = message;
            modal.style.display = 'block';
            modal.style.zIndex = '10000';
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';

            // Scroll para o topo
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
        } else {
            console.error('Modal de confirmação não encontrado:', {
                modal: !!modal,
                titleEl: !!titleEl,
                messageEl: !!messageEl
            });
        }
    }

    closeConfirmModal() {
        const modal = document.getElementById('confirmModal');
        if (modal) {
            modal.style.display = 'none';
            this.pendingAction = null;
        }
    }

    executeConfirmedAction() {
        if (!this.pendingAction) {
            this.closeConfirmModal();
            return;
        }

        const action = this.pendingAction;

        if (action.type === 'deleteUser') {
            // Verificar se é o usuário atual logado
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
            const userToDelete = action.isEmployee
                ? this.employees.find(e => e.id === action.userId || e.id == action.userId)
                : this.users.find(u => u.id === action.userId || u.id == action.userId);

            if (userToDelete && currentUser.id && (userToDelete.id == currentUser.id || userToDelete.email === currentUser.email)) {
                this.showMessage('Você não pode excluir seu próprio usuário enquanto estiver logado!', 'error');
                this.closeConfirmModal();
                return;
            }

            // Remover usuário
            if (action.isEmployee) {
                const employeeIndex = this.employees.findIndex(e => e.id === action.userId || e.id == action.userId);
                if (employeeIndex !== -1) {
                    this.employees.splice(employeeIndex, 1);
                    localStorage.setItem('employees', JSON.stringify(this.employees));
                }
            } else {
                const userIndex = this.users.findIndex(u => u.id === action.userId || u.id == action.userId);
                if (userIndex !== -1) {
                    this.users.splice(userIndex, 1);
                    localStorage.setItem('users', JSON.stringify(this.users));
                }
            }

            // Log e mensagem
            this.logAction(`Usuário ${action.userName} excluído permanentemente`);
            this.showMessage(`Usuário "${action.userName}" excluído com sucesso!`, 'success');

            // Fechar painel e modal de confirmação
            const userPanel = document.getElementById('userPanel');
            if (userPanel) {
                userPanel.style.display = 'none';
            }
            this.closeConfirmModal();

            // Recarregar lista (sem recriar usuários master duplicados)
            this.loadData();
            // Não chamar ensureMasterUser aqui para evitar recriar usuários master
            this.renderUsers();
        } else if (action.type === 'approveAccessRequest') {
            // Aprovar solicitação
            const request = action.request;

            // Salvar dados da solicitação para preencher o formulário de funcionário
            const requestData = {
                fullName: request.fullName,
                email: request.email,
                phone: request.phone || '',
                password: request.password || 'senha123',
                role: request.desiredRole,
                systemType: request.systemType
            };

            // Salvar dados no localStorage para preencher formulário
            localStorage.setItem('pendingEmployeeData', JSON.stringify(requestData));

            // Atualizar status da solicitação
            this.accessRequests[action.requestIndex].status = 'approved';
            localStorage.setItem('accessRequests', JSON.stringify(this.accessRequests));

            this.logAction(`Acesso aprovado para ${request.fullName} (${request.email}) como ${this.getRoleName(request.desiredRole)} no sistema ${request.systemType}`);
            this.loadData();
            this.renderUsers();
            this.renderAccessRequests();

            this.closeConfirmModal();

            // Redirecionar para página de funcionários
            this.showMessage(`Redirecionando para adicionar funcionário...`, 'info');
            setTimeout(() => {
                window.location.href = '../funcionarios/funcionarios.html';
            }, 1000);
        } else if (action.type === 'toggleUserStatus') {
            // Ativar/Desativar usuário
            if (action.isEmployee) {
                const employeeIndex = this.employees.findIndex(e => e.id === action.userId || e.id == action.userId);
                if (employeeIndex !== -1) {
                    this.employees[employeeIndex].status = action.newStatus;
                    localStorage.setItem('employees', JSON.stringify(this.employees));
                }
            } else {
                const userIndex = this.users.findIndex(u => u.id === action.userId || u.id == action.userId);
                if (userIndex !== -1) {
                    this.users[userIndex].status = action.newStatus;
                    localStorage.setItem('users', JSON.stringify(this.users));
                }
            }

            this.logAction(`Usuário ${action.userName} ${action.action}`);
            this.loadData();
            this.renderUsers();
            this.showMessage(`Usuário ${action.action} com sucesso!`, 'success');
            this.closeConfirmModal();

            // Atualizar painel se estiver aberto
            const panel = document.getElementById('userPanel');
            if (panel && panel.style.display === 'block') {
                setTimeout(() => {
                    this.openUserPanel(action.userId);
                }, 100);
            }
        } else if (action.type === 'rejectAccessRequest') {
            // Recusar solicitação
            this.accessRequests[action.requestIndex].status = 'rejected';
            localStorage.setItem('accessRequests', JSON.stringify(this.accessRequests));

            this.logAction(`Acesso recusado para ${action.request.fullName} (${action.request.email})`);
            this.loadData();
            this.renderAccessRequests();
            this.showMessage(`Acesso de ${action.request.fullName} recusado.`, 'info');
            this.closeConfirmModal();
        } else if (action.type === 'clearLogs') {
            // Limpar logs
            localStorage.setItem('systemLogs', JSON.stringify([]));
            this.logs = [];
            this.renderLogs();
            this.logAction('Logs limpos');
            this.showMessage('Logs limpos com sucesso!', 'success');
            this.closeConfirmModal();
        } else if (action.type === 'changePassword') {
            // Alterar senha
            const { userId, newPassword, isEmployee } = action;

            if (isEmployee) {
                const employeeIndex = this.employees.findIndex(e => String(e.id) === String(userId));
                if (employeeIndex !== -1) {
                    this.employees[employeeIndex].password = newPassword;
                    localStorage.setItem('employees', JSON.stringify(this.employees));
                }
            } else {
                const userIndex = this.users.findIndex(u => String(u.id) === String(userId));
                if (userIndex !== -1) {
                    this.users[userIndex].password = newPassword;
                    localStorage.setItem('users', JSON.stringify(this.users));
                }
            }

            const user = (isEmployee ? this.employees : this.users).find(u => String(u.id) === String(userId));
            this.logAction(`Senha do usuário ${user ? user.name : userId} alterada`);
            this.showMessage('Senha alterada com sucesso!', 'success');

            // Ocultar campo de alteração de senha
            const passwordChangeRow = document.getElementById('passwordChangeRow');
            if (passwordChangeRow) passwordChangeRow.style.display = 'none';

            this.closeConfirmModal();

            // Atualizar dados e painel
            this.loadData();
            this.openUserPanel(userId);
        }

        this.pendingAction = null;
    }

    saveNewPassword() {
        const userId = document.getElementById('panelUserId').value;
        const isEmployee = document.getElementById('panelUserId').dataset.isEmployee === 'true';
        const newPassword = document.getElementById('panelNewPassword').value.trim();

        if (!userId) {
            this.showMessage('Erro ao identificar usuário', 'error');
            return;
        }

        if (!newPassword) {
            this.showMessage('Por favor, digite uma nova senha', 'error');
            return;
        }

        // Validar senha (mínimo 6 caracteres)
        if (newPassword.length < 6) {
            this.showMessage('A senha deve ter no mínimo 6 caracteres', 'error');
            return;
        }

        // Verificar se o usuário atual pode alterar senhas
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        const canManagePasswords = ['gestor', 'desenvolvedor', 'superadmin'].includes(currentUser.role);

        if (!canManagePasswords) {
            this.showMessage('Você não tem permissão para alterar senhas', 'error');
            return;
        }

        // Armazenar ação pendente
        this.pendingAction = {
            type: 'changePassword',
            userId: userId,
            newPassword: newPassword,
            isEmployee: isEmployee
        };

        // Mostrar modal de confirmação
        this.showConfirmModal(
            'Alterar Senha',
            `Tem certeza que deseja alterar a senha deste usuário?`
        );
    }

    showMessage(message, type) {
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#7ED321' : '#D0021B'};
            color: white;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;

        document.body.appendChild(messageEl);

        setTimeout(() => {
            messageEl.remove();
        }, 3000);
    }
}

// Inicializar quando DOM estiver pronto
let managementManager;
document.addEventListener('DOMContentLoaded', () => {
    managementManager = new ManagementManager();
    window.managementManager = managementManager;
});


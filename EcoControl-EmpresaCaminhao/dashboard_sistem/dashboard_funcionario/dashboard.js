// Sistema de Dashboard para Funcionários e Motoristas
class EmployeeDashboard {
    constructor() {
        this.currentUser = null;
        this.deliveries = [];
        this.trucks = [];
        this.employees = [];
        this.routes = [];
        this.currentDelivery = null;
        this.currentTruck = null;
        this.currentRoute = null;
        this.messages = [];
        this.notifications = [];
        this.photoUpdateInterval = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadData();
        this.setupEventListeners();
        this.renderDashboard();
        this.loadMessages();
        this.loadNotifications();
        
        // Forçar atualização da foto ao carregar
        setTimeout(() => this.updateUserInfo(), 500);
        
        // Monitorar mudanças no localStorage para atualizar foto automaticamente
        this.setupPhotoUpdateListener();
        
        // Verificar notificações periodicamente
        setInterval(() => this.loadNotifications(), 30000); // A cada 30 segundos
    }
    
    setupPhotoUpdateListener() {
        // Limpar intervalo anterior se existir
        if (this.photoUpdateInterval) {
            clearInterval(this.photoUpdateInterval);
        }
        
        // Verificar atualizações periódicas na foto do funcionário
        this.photoUpdateInterval = setInterval(() => {
            if (!this.currentUser || !this.currentUser.id) return;
            
            const employees = JSON.parse(localStorage.getItem('employees') || '[]');
            const updatedEmployee = employees.find(emp => 
                emp.id === this.currentUser.id ||
                (emp.email && this.currentUser.email && emp.email.toLowerCase() === this.currentUser.email.toLowerCase())
            );
            
            if (updatedEmployee) {
                const newPhoto = updatedEmployee.photo || updatedEmployee.profilePhoto || null;
                const currentPhoto = this.currentUser.photo || this.currentUser.profilePhoto || null;
                
                // Se a foto mudou, atualizar
                if (newPhoto !== currentPhoto) {
                    this.currentUser.photo = updatedEmployee.photo || null;
                    this.currentUser.profilePhoto = updatedEmployee.profilePhoto || null;
                    this.updateUserInfo();
                }
            }
        }, 2000); // Verificar a cada 2 segundos
    }

    checkAuth() {
        const user = sessionStorage.getItem('currentEmployee');
        if (!user) {
            window.location.href = './login.html';
            return;
        }
        
        this.currentUser = JSON.parse(user);
        
        // Buscar dados completos do funcionário no localStorage para garantir que temos o ID correto
        const employees = JSON.parse(localStorage.getItem('employees') || '[]');
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        
        // Buscar em employees primeiro
        let fullEmployeeData = employees.find(emp => 
            (emp.email && this.currentUser.email && emp.email.toLowerCase() === this.currentUser.email.toLowerCase()) ||
            emp.id === this.currentUser.id ||
            (emp.name && this.currentUser.name && emp.name === this.currentUser.name)
        );
        
        // Se não encontrou em employees, buscar em users
        if (!fullEmployeeData) {
            fullEmployeeData = users.find(user => 
                (user.email && this.currentUser.email && user.email.toLowerCase() === this.currentUser.email.toLowerCase()) ||
                user.id === this.currentUser.id ||
                (user.name && this.currentUser.name && user.name === this.currentUser.name)
            );
        }
        
        if (fullEmployeeData) {
            // Atualizar com dados completos do funcionário, priorizando o ID do localStorage
            this.currentUser = { 
                ...this.currentUser, 
                ...fullEmployeeData,
                id: fullEmployeeData.id || this.currentUser.id // Garantir que temos um ID válido
            };
            console.log('Dados completos do funcionário encontrados:', this.currentUser);
        } else {
            console.warn('Funcionário não encontrado no localStorage. Usando dados da sessão:', this.currentUser);
        }
        
        // Garantir que temos um ID
        if (!this.currentUser.id) {
            console.error('ERRO: Usuário sem ID!', this.currentUser);
            // Tentar gerar um ID temporário baseado no email
            if (this.currentUser.email) {
                const emailHash = this.currentUser.email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                this.currentUser.id = 'temp_' + emailHash;
                console.warn('ID temporário gerado:', this.currentUser.id);
            }
        }
        
        console.log('Usuário logado (final):', this.currentUser);
        this.updateUserInfo();
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
        
        // Se tiver apenas uma parte, retornar ela
        if (nameParts.length === 1) {
            return nameParts[0];
        }
        
        // Primeiro nome sempre completo (capitalizado)
        let formatted = this.capitalizeFirst(nameParts[0]);
        
        // Meio do nome: apenas iniciais com ponto
        for (let i = 1; i < nameParts.length - 1; i++) {
            if (nameParts[i].length > 0) {
                formatted += ' ' + nameParts[i].charAt(0).toUpperCase() + '.';
            }
        }
        
        // Último nome sempre completo (sobrenome)
        if (nameParts.length > 1) {
            formatted += ' ' + this.capitalizeFirst(nameParts[nameParts.length - 1]);
        }
        
        return formatted;
    }

    capitalizeFirst(str) {
        if (!str || typeof str !== 'string') return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    updateUserInfo() {
        const userNameEl = document.getElementById('sidebarUserName');
        const userRoleEl = document.getElementById('sidebarUserRole');
        const userAvatarEl = document.querySelector('.user-avatar-sidebar');
        
        if (userNameEl) {
            const fullName = this.currentUser.name || 'Funcionário';
            userNameEl.textContent = this.formatShortName(fullName);
            userNameEl.title = fullName; // Tooltip com nome completo
        }
        if (userRoleEl) {
            const roleNames = {
                'gestor': 'Gestor',
                'atendente': 'Atendente',
                'motorista': 'Motorista',
                'funcionario': 'Funcionário'
            };
            userRoleEl.textContent = roleNames[this.currentUser.role] || this.currentUser.role;
        }
        
        // Atualizar avatar com foto do perfil (sempre verificar do localStorage primeiro)
        if (userAvatarEl) {
            // Buscar foto atualizada do localStorage
            const employees = JSON.parse(localStorage.getItem('employees') || '[]');
            const currentEmployee = employees.find(emp => 
                emp.id === this.currentUser.id ||
                (emp.email && this.currentUser.email && emp.email.toLowerCase() === this.currentUser.email.toLowerCase())
            );
            
            const employeePhoto = currentEmployee ? 
                (currentEmployee.photo || currentEmployee.profilePhoto || null) :
                (this.currentUser.photo || this.currentUser.profilePhoto || null);
            
            if (employeePhoto) {
                // Verificar se já existe uma imagem e se é a mesma
                const existingImg = userAvatarEl.querySelector('img');
                if (existingImg && existingImg.src === employeePhoto) {
                    // Foto já está exibida, não precisa atualizar
                    return;
                }
                
                // Criar nova imagem
                const img = document.createElement('img');
                img.src = employeePhoto;
                img.alt = this.currentUser.name || 'Funcionário';
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.borderRadius = '50%';
                img.style.objectFit = 'cover';
                img.onerror = () => {
                    userAvatarEl.innerHTML = '<i class="fas fa-user"></i>';
                };
                
                // Limpar e adicionar nova imagem
                userAvatarEl.innerHTML = '';
                userAvatarEl.appendChild(img);
            } else {
                // Verificar se já está exibindo o ícone padrão
                const existingIcon = userAvatarEl.querySelector('i.fa-user');
                if (!existingIcon) {
                    userAvatarEl.innerHTML = '<i class="fas fa-user"></i>';
                }
            }
        }
    }

    loadData() {
        this.deliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
        this.trucks = JSON.parse(localStorage.getItem('trucks') || '[]');
        this.employees = JSON.parse(localStorage.getItem('employees') || '[]');
        this.routes = JSON.parse(localStorage.getItem('routes') || '[]');
        
        if (!Array.isArray(this.deliveries)) this.deliveries = [];
        if (!Array.isArray(this.trucks)) this.trucks = [];
        if (!Array.isArray(this.employees)) this.employees = [];
        if (!Array.isArray(this.routes)) this.routes = [];
    }

    loadMessages() {
        // Carregar mensagens do localStorage
        const allMessages = JSON.parse(localStorage.getItem('employeeMessages') || '[]');
        const userId = this.currentUser.id;
        
        // Filtrar mensagens do usuário atual
        let messages = allMessages.filter(msg => 
            msg.fromEmployeeId === userId || 
            msg.toEmployeeId === userId ||
            String(msg.fromEmployeeId) === String(userId) ||
            String(msg.toEmployeeId) === String(userId)
        );
        
        // Carregar registros de momentos do usuário
        const allMoments = JSON.parse(localStorage.getItem('deliveryMoments') || '[]');
        const userMoments = allMoments.filter(moment => 
            moment.employeeId === userId || 
            String(moment.employeeId) === String(userId)
        );
        
        // Converter momentos em formato de mensagem para exibição
        const momentMessages = userMoments.map(moment => {
            const truck = this.trucks.find(t => t.id === moment.truckId);
            const route = this.routes.find(r => r.id === moment.routeId);
            
            const truckInfo = truck ? `${truck.plate || truck.id} - ${truck.model || ''}` : moment.truckPlate || 'N/A';
            const routeInfo = route ? (route.code || route.id) : moment.routeCode || 'N/A';
            const typeLabel = moment.type === 'saida' ? 'Saiu para Entrega' : 'Entregou';
            
            return {
                id: moment.id,
                type: 'moment',
                fromEmployeeId: moment.employeeId,
                fromEmployeeName: moment.employeeName,
                toEmployeeId: null,
                toEmployeeName: 'Sistema',
                subject: `Registro: ${typeLabel}`,
                content: `Caminhão: ${truckInfo}\nRota: ${routeInfo}\nData: ${moment.date} às ${moment.time}`,
                priority: moment.type === 'saida' ? 'normal' : 'alta',
                read: true, // Momentos são sempre lidos (são do próprio funcionário)
                createdAt: moment.datetime || moment.createdAt,
                momentType: moment.type,
                momentData: moment
            };
        });
        
        // Combinar mensagens e momentos, ordenar por data
        this.messages = [...messages, ...momentMessages].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        this.updateMessagesBadge();
        this.renderMessages();
    }

    updateMessagesBadge() {
        const badge = document.getElementById('messagesBadge');
        const navBadge = document.getElementById('navMessagesBadge');
        const userId = this.currentUser.id;
        const unreadCount = this.messages.filter(msg => 
            (msg.toEmployeeId === userId || String(msg.toEmployeeId) === String(userId)) && !msg.read
        ).length;
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
        
        // Atualizar badge da navegação
        if (navBadge) {
            if (unreadCount > 0) {
                navBadge.textContent = unreadCount;
                navBadge.style.display = 'flex';
            } else {
                navBadge.style.display = 'none';
            }
        }
    }

    setupEventListeners() {
        // Fechar modal ao clicar no X
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });

        // Fechar modal ao clicar fora
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        // Listener para atualização de status de rota
        window.addEventListener('routeStatusUpdated', (event) => {
            console.log('Rota atualizada:', event.detail);
            // Recarregar dados e dashboard
            this.loadData();
            this.renderDashboard();
        });

        // Listener para atualização de status de entrega
        window.addEventListener('deliveryStatusUpdated', (event) => {
            console.log('Entrega(s) atualizada(s):', event.detail);
            // Recarregar dados e dashboard
            this.loadData();
            this.renderDashboard();
        });

        // Listener para mudanças no localStorage (sincronização entre abas)
        window.addEventListener('storage', (event) => {
            if (event.key === 'routes' || event.key === 'deliveries') {
                console.log('Storage atualizado (outra aba):', event.key);
                // Recarregar dados e dashboard
                this.loadData();
                this.renderDashboard();
            }
        });

        // Listener para atualização de localStorage na mesma aba
        window.addEventListener('localStorageUpdated', (event) => {
            if (event.detail && (event.detail.key === 'routes' || event.detail.key === 'deliveries')) {
                console.log('LocalStorage atualizado (mesma aba):', event.detail.key);
                // Atualizar dados diretamente
                if (event.detail.key === 'routes') {
                    this.routes = event.detail.value;
                } else if (event.detail.key === 'deliveries') {
                    this.deliveries = event.detail.value;
                }
                // Recarregar dashboard
                this.renderDashboard();
            }
        });
    }

    renderDashboard() {
        this.findCurrentRoute(); // Buscar rota primeiro (pode ter caminhão vinculado)
        this.findCurrentDelivery();
        this.findCurrentTruck(); // Buscar caminhão após encontrar entrega/rota (para pegar caminhão da entrega/rota)
        // Se não encontrou caminhão pela entrega, buscar pela rota
        if (!this.currentTruck && this.currentRoute && this.currentRoute.truckId) {
            this.currentTruck = this.trucks.find(truck => {
                const matches = truck.id === this.currentRoute.truckId ||
                               String(truck.id) === String(this.currentRoute.truckId);
                if (matches) {
                    console.log('Caminhão encontrado pela rota:', truck.id);
                }
                return matches;
            });
        }
        this.renderTruckInfo();
        this.renderDeliveryInfo();
        this.renderRouteInfo();
        this.renderQuickStats();
    }

    renderQuickStats() {
        const userId = this.currentUser.id;
        
        // Filtrar TODAS as entregas do usuário logado (incluindo concluídas para contagem)
        const allUserDeliveries = this.deliveries.filter(d => {
            const isAssigned = d.driverId === userId || 
                              d.employeeId === userId ||
                              String(d.driverId) === String(userId) ||
                              String(d.employeeId) === String(userId);
            return isAssigned;
        });
        
        // Filtrar apenas entregas que NÃO estão concluídas (para "hoje" e "em andamento")
        const activeUserDeliveries = allUserDeliveries.filter(d => {
            const isNotCompleted = d.status !== 'entregue' && d.status !== 'concluida';
            return isNotCompleted;
        });
        
        // Entregas hoje (apenas entregas ativas do usuário logado)
        const today = new Date().toLocaleDateString('pt-BR');
        const todayDeliveries = activeUserDeliveries.filter(d => {
            if (!d.scheduledDate && !d.deliveryDate) return false;
            const date = new Date(d.scheduledDate || d.deliveryDate);
            return date.toLocaleDateString('pt-BR') === today;
        }).length;
        
        // Entregas concluídas (TODAS as entregas concluídas do usuário, não apenas as ativas)
        const completedDeliveries = allUserDeliveries.filter(d => 
            d.status === 'entregue' || d.status === 'concluida'
        ).length;
        
        // Entregas em andamento (apenas entregas ativas do usuário logado)
        const inProgressDeliveries = activeUserDeliveries.filter(d => 
            ['em_percurso', 'em_carregamento'].includes(d.status)
        ).length;
        
        // KM rodados (do caminhão atual do usuário)
        const totalMileage = this.currentTruck ? (this.currentTruck.mileage || 0) : 0;
        
        // Atualizar elementos
        const todayEl = document.getElementById('todayDeliveriesCount');
        const completedEl = document.getElementById('completedDeliveriesCount');
        const inProgressEl = document.getElementById('inProgressDeliveriesCount');
        const mileageEl = document.getElementById('totalMileage');
        
        if (todayEl) todayEl.textContent = todayDeliveries;
        if (completedEl) completedEl.textContent = completedDeliveries;
        if (inProgressEl) inProgressEl.textContent = inProgressDeliveries;
        if (mileageEl) mileageEl.textContent = totalMileage.toLocaleString('pt-BR') + ' km';
    }

    findCurrentTruck() {
        // Buscar caminhão atribuído ao funcionário/motorista logado
        const userId = this.currentUser.id;
        console.log('Buscando caminhão para usuário ID:', userId);
        
        // Primeiro, buscar caminhão diretamente atribuído ao motorista
        this.currentTruck = this.trucks.find(truck => {
            const isAssigned = truck.driver === userId || 
                              truck.driverId === userId ||
                              String(truck.driver) === String(userId) ||
                              String(truck.driverId) === String(userId);
            
            if (isAssigned) {
                console.log('Caminhão encontrado:', truck.id, 'para usuário:', userId);
            }
            return isAssigned;
        });
        
        // Se não encontrou caminhão direto, buscar pelo caminhão da entrega ativa
        if (!this.currentTruck && this.currentDelivery && this.currentDelivery.truckId) {
            this.currentTruck = this.trucks.find(truck => {
                const matches = truck.id === this.currentDelivery.truckId ||
                               String(truck.id) === String(this.currentDelivery.truckId);
                if (matches) {
                    console.log('Caminhão encontrado pela entrega:', truck.id);
                }
                return matches;
            });
        }
        
        if (!this.currentTruck) {
            console.log('Nenhum caminhão encontrado para o usuário:', userId);
            console.log('Caminhões disponíveis:', this.trucks.map(t => ({ id: t.id, driver: t.driver, driverId: t.driverId })));
        }
    }

    findCurrentDelivery() {
        // Buscar entrega atribuída ao funcionário/motorista logado
        const userId = this.currentUser.id;
        console.log('Buscando entrega para usuário ID:', userId);
        
        // Filtrar apenas entregas que NÃO estão concluídas
        const activeDeliveries = this.deliveries.filter(delivery => {
            const isAssigned = delivery.driverId === userId || 
                              delivery.employeeId === userId ||
                              String(delivery.driverId) === String(userId) ||
                              String(delivery.employeeId) === String(userId);
            const isNotCompleted = delivery.status !== 'entregue' && delivery.status !== 'concluida';
            
            return isAssigned && isNotCompleted;
        });
        
        // Priorizar entregas pendentes ou em percurso
        this.currentDelivery = activeDeliveries.find(delivery => {
            const isActive = ['pendente', 'em_percurso', 'em_carregamento'].includes(delivery.status);
            
            if (isActive) {
                console.log('Entrega ativa encontrada:', delivery.code || delivery.id, 'para usuário:', userId);
            }
            return isActive;
        });

        // Se não encontrar ativa, buscar a mais recente atribuída ao usuário (que não esteja concluída)
        if (!this.currentDelivery && activeDeliveries.length > 0) {
            activeDeliveries.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            this.currentDelivery = activeDeliveries[0];
            console.log('Entrega mais recente encontrada:', this.currentDelivery.code || this.currentDelivery.id);
        } else if (!this.currentDelivery) {
            console.log('Nenhuma entrega ativa encontrada para o usuário:', userId);
        }
    }

    findCurrentRoute() {
        // Buscar rota atribuída ao funcionário/motorista logado
        const userId = this.currentUser.id;
        console.log('Buscando rota para usuário ID:', userId);
        
        // Filtrar apenas rotas que NÃO estão concluídas E estão atribuídas ao usuário
        const activeRoutes = this.routes.filter(route => {
            const isAssigned = route.driverId === userId ||
                              String(route.driverId) === String(userId) ||
                              route.employeeId === userId ||
                              String(route.employeeId) === String(userId) ||
                              (route.assignedDrivers && Array.isArray(route.assignedDrivers) && 
                               (route.assignedDrivers.includes(userId) || route.assignedDrivers.includes(String(userId))));
            const isNotCompleted = route.status !== 'entregue' && route.status !== 'concluida';
            return isAssigned && isNotCompleted;
        });
        
        // Buscar rota pelo caminhão atribuído
        if (this.currentTruck) {
            this.currentRoute = activeRoutes.find(route => 
                route.truckId === this.currentTruck.id || 
                String(route.truckId) === String(this.currentTruck.id)
            );
            
            if (this.currentRoute) {
                console.log('Rota encontrada pelo caminhão:', this.currentRoute.code || this.currentRoute.id);
            }
        }
        
        // Se não encontrou pelo caminhão, buscar diretamente pelo motorista ou funcionário
        if (!this.currentRoute && activeRoutes.length > 0) {
            // Priorizar rotas ativas (pendente, em_percurso, em_carregamento)
            this.currentRoute = activeRoutes.find(route => {
                const isActive = ['pendente', 'em_percurso', 'em_carregamento'].includes(route.status);
                return isActive;
            });
            
            // Se não encontrou ativa, pegar a mais recente
            if (!this.currentRoute) {
                activeRoutes.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                this.currentRoute = activeRoutes[0];
            }
            
            if (this.currentRoute) {
                console.log('Rota encontrada pelo motorista/funcionário:', this.currentRoute.code || this.currentRoute.id);
            }
        } else if (!this.currentRoute) {
            console.log('Nenhuma rota ativa encontrada para o usuário:', userId);
        }
    }

    renderTruckInfo() {
        const noTruckEl = document.getElementById('noTruck');
        const truckContentEl = document.getElementById('truckContent');
        
        if (!this.currentTruck) {
            if (noTruckEl) noTruckEl.style.display = 'block';
            if (truckContentEl) truckContentEl.style.display = 'none';
            return;
        }

        if (noTruckEl) noTruckEl.style.display = 'none';
        if (truckContentEl) truckContentEl.style.display = 'block';

        // Renderizar HTML do caminhão
        const truckImageSection = this.currentTruck.image 
            ? `<div class="truck-image-section">
                <img src="${this.escapeHtml(this.currentTruck.image)}" alt="Foto do caminhão" class="truck-image" id="truckImage" onerror="this.style.display='none'">
               </div>`
            : '';

        const truckDetailsHTML = `
            ${truckImageSection}
            <div class="truck-details-section">
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">
                            <i class="fas fa-hashtag"></i>
                            <span>ID</span>
                        </div>
                        <div class="info-value" id="truckId">${this.escapeHtml(this.currentTruck.id || '-')}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">
                            <i class="fas fa-car"></i>
                            <span>Placa</span>
                        </div>
                        <div class="info-value" id="truckPlate">${this.formatPlate(this.currentTruck.plate) || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">
                            <i class="fas fa-truck"></i>
                            <span>Modelo</span>
                        </div>
                        <div class="info-value" id="truckModel">${this.escapeHtml(this.currentTruck.model || '-')}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">
                            <i class="fas fa-calendar"></i>
                            <span>Ano</span>
                        </div>
                        <div class="info-value" id="truckYear">${this.currentTruck.year || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">
                            <i class="fas fa-tachometer-alt"></i>
                            <span>Quilometragem</span>
                        </div>
                        <div class="info-value" id="truckMileage">${this.currentTruck.mileage 
            ? `${this.currentTruck.mileage.toLocaleString('pt-BR')} km` 
                            : '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">
                            <i class="fas fa-info-circle"></i>
                            <span>Status</span>
                        </div>
                        <div class="info-value">
                            <select id="truckStatusSelect" class="status-select" onchange="employeeDashboard.updateTruckStatus()">
                                <option value="disponivel" ${this.currentTruck.status === 'disponivel' ? 'selected' : ''}>Disponível</option>
                                <option value="em_rota" ${this.currentTruck.status === 'em_rota' ? 'selected' : ''}>Em Rota</option>
                                <option value="parado" ${this.currentTruck.status === 'parado' ? 'selected' : ''}>Parado</option>
                                <option value="manutencao" ${this.currentTruck.status === 'manutencao' ? 'selected' : ''}>Em Manutenção</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (truckContentEl) {
            truckContentEl.innerHTML = truckDetailsHTML;
        }
    }

    renderDeliveryInfo() {
        const noDeliveryEl = document.getElementById('noDelivery');
        const deliveryContentEl = document.getElementById('deliveryContent');
        
        // Se não há entrega, verificar se há rota atribuída para mostrar informações
        if (!this.currentDelivery && this.currentRoute) {
            // Mostrar informações da rota no card de entrega
            this.renderRouteAsDelivery();
            return;
        }
        
        // Mostrar apenas entregas (não rotas)
        if (!this.currentDelivery) {
            if (noDeliveryEl) {
                noDeliveryEl.innerHTML = `
                    <i class="fas fa-box"></i>
                    <h3>Nenhuma entrega atribuída</h3>
                    <p>Você ainda não possui uma entrega atribuída no momento.</p>
                `;
                noDeliveryEl.style.display = 'block';
            }
            if (deliveryContentEl) deliveryContentEl.style.display = 'none';
            return;
        }

        if (noDeliveryEl) noDeliveryEl.style.display = 'none';
        if (deliveryContentEl) deliveryContentEl.style.display = 'block';

        // Informações básicas
        const deliveryCode = this.currentDelivery.code || this.currentDelivery.id || this.currentDelivery.trackingCode || '-';
        const status = this.currentDelivery.status || 'pendente';
        
        const deliveryHeaderHTML = `
            <div class="delivery-header-info">
                <div class="delivery-code-section">
                    <span class="delivery-code-label">Código:</span>
                    <span class="delivery-code-value" id="deliveryCode">${this.escapeHtml(deliveryCode)}</span>
                </div>
                <div class="delivery-status-section">
                    <span class="status-label">Status:</span>
                    <select id="deliveryStatusSelect" class="status-select" onchange="employeeDashboard.updateDeliveryStatus()">
                        <option value="pendente" ${status === 'pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="em_carregamento" ${status === 'em_carregamento' ? 'selected' : ''}>Em Carregamento</option>
                        <option value="em_percurso" ${status === 'em_percurso' ? 'selected' : ''}>Em Percurso</option>
                        <option value="entregue" ${status === 'entregue' ? 'selected' : ''}>Entregue</option>
                    </select>
                </div>
            </div>
        `;

        const addressParts = [
            this.currentDelivery.destinationStreet,
            this.currentDelivery.destinationNumber,
            this.currentDelivery.destinationComplement,
            this.currentDelivery.destinationNeighborhood
        ].filter(Boolean);
        
        const deliverySectionsHTML = `
            <div class="delivery-sections">
                <div class="delivery-section">
                    <h3><i class="fas fa-info-circle"></i> Informações</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">
                                <i class="fas fa-calendar-alt"></i>
                                <span>Data Prevista</span>
                            </div>
                            <div class="info-value" id="deliveryScheduledDate">${this.currentDelivery.scheduledDate
                                ? new Date(this.currentDelivery.scheduledDate).toLocaleDateString('pt-BR')
                                : '-'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>Prioridade</span>
                            </div>
                            <div class="info-value" id="deliveryPriority">${this.getPriorityDisplayName(this.currentDelivery.priority)}</div>
                        </div>
                    </div>
                </div>

                <div class="delivery-section">
                    <h3><i class="fas fa-user"></i> Cliente</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">
                                <i class="fas fa-user-tie"></i>
                                <span>Nome</span>
                            </div>
                            <div class="info-value" id="deliveryCustomerName">${this.escapeHtml(this.currentDelivery.customerName || '-')}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">
                                <i class="fas fa-id-card"></i>
                                <span>CPF/CNPJ</span>
                            </div>
                            <div class="info-value" id="deliveryCustomerDocument">${this.escapeHtml(this.currentDelivery.customerDocument || '-')}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">
                                <i class="fas fa-phone"></i>
                                <span>Telefone</span>
                            </div>
                            <div class="info-value" id="deliveryCustomerPhone">${this.escapeHtml(this.currentDelivery.customerPhone || '-')}</div>
                        </div>
                    </div>
                </div>

                <div class="delivery-section">
                    <h3><i class="fas fa-map-marker-alt"></i> Destino</h3>
                    <div class="info-grid">
                        <div class="info-item full-width">
                            <div class="info-label">
                                <i class="fas fa-road"></i>
                                <span>Endereço</span>
                            </div>
                            <div class="info-value" id="deliveryAddress">${this.escapeHtml(addressParts.length > 0
                                ? addressParts.join(', ')
                                : '-')}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">
                                <i class="fas fa-city"></i>
                                <span>Cidade</span>
                            </div>
                            <div class="info-value" id="deliveryCity">${this.escapeHtml(this.currentDelivery.destinationCity || '-')}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">
                                <i class="fas fa-map"></i>
                                <span>Estado</span>
                            </div>
                            <div class="info-value" id="deliveryState">${this.escapeHtml(this.currentDelivery.destinationState || '-')}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">
                                <i class="fas fa-mail-bulk"></i>
                                <span>CEP</span>
                            </div>
                            <div class="info-value" id="deliveryZipCode">${this.escapeHtml(this.currentDelivery.destinationZipCode || '-')}</div>
                        </div>
                    </div>
                </div>

                <div class="delivery-section">
                    <h3><i class="fas fa-boxes"></i> Carga</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">
                                <i class="fas fa-tag"></i>
                                <span>Tipo</span>
                            </div>
                            <div class="info-value" id="deliveryCargoType">${this.escapeHtml(this.currentDelivery.cargoType || '-')}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">
                                <i class="fas fa-weight"></i>
                                <span>Peso</span>
                            </div>
                            <div class="info-value" id="deliveryCargoWeight">${this.currentDelivery.cargoWeight
            ? `${this.currentDelivery.cargoWeight.toLocaleString('pt-BR', {minimumFractionDigits: 2})} kg`
                                : '-'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">
                                <i class="fas fa-dollar-sign"></i>
                                <span>Valor Total</span>
                            </div>
                            <div class="info-value" id="deliveryTotalValue">${this.currentDelivery.finalValue || this.currentDelivery.totalValue
            ? `R$ ${(this.currentDelivery.finalValue || this.currentDelivery.totalValue).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
                                : '-'}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (deliveryContentEl) {
            deliveryContentEl.innerHTML = deliveryHeaderHTML + deliverySectionsHTML + `
                <div class="delivery-actions">
                    <button class="btn btn-primary" onclick="employeeDashboard.viewInvoice()">
                        <i class="fas fa-file-invoice"></i>
                        <span>Ver Nota Fiscal</span>
                    </button>
                    <button class="btn btn-secondary" onclick="employeeDashboard.viewFullDetails()">
                        <i class="fas fa-info-circle"></i>
                        <span>Ver Detalhes</span>
                    </button>
                </div>
            `;
        }
    }

    renderRouteAsDelivery() {
        const noDeliveryEl = document.getElementById('noDelivery');
        const deliveryContentEl = document.getElementById('deliveryContent');
        
        if (!this.currentRoute) return;

        if (noDeliveryEl) noDeliveryEl.style.display = 'none';
        if (deliveryContentEl) deliveryContentEl.style.display = 'block';

        const routeCode = this.currentRoute.code || this.currentRoute.id || '-';
        const status = this.currentRoute.status || 'pendente';
        const destinations = this.currentRoute.destinations || [];
        
        // Calcular peso total e materiais
        let totalWeight = 0;
        const materials = [];
        destinations.forEach(dest => {
            if (dest.items && Array.isArray(dest.items)) {
                dest.items.forEach(item => {
                    // Peso pode estar em item.weight (string formatada ou número)
                    let itemWeight = 0;
                    if (item.weight) {
                        // Se for string, remover "kg" e converter vírgula para ponto
                        const weightStr = String(item.weight).replace(/[^\d,.-]/g, '').replace(',', '.');
                        itemWeight = parseFloat(weightStr) || 0;
                    }
                    
                    const quantity = parseFloat(item.quantity) || 1;
                    // Peso total do item = peso unitário * quantidade
                    const totalItemWeight = itemWeight * quantity;
                    totalWeight += totalItemWeight;
                    
                    if (item.name || item.type) {
                        const materialName = item.name || item.type;
                        const existingMaterial = materials.find(m => m.name === materialName);
                        if (!existingMaterial) {
                            materials.push({
                                name: materialName,
                                quantity: quantity,
                                weight: totalItemWeight
                            });
                        } else {
                            existingMaterial.quantity += quantity;
                            existingMaterial.weight += totalItemWeight;
                        }
                    }
                });
            }
        });

        // Calcular distância aproximada (pode ser melhorado com API de mapas)
        const originCity = this.currentRoute.originCity || '';
        const firstDestination = destinations[0];
        const destinationCity = firstDestination ? (firstDestination.city || '') : '';
        // Distância estimada (pode ser calculada ou obtida de uma API)
        const estimatedDistance = this.calculateEstimatedDistance(originCity, destinationCity, destinations);

        const routeHeaderHTML = `
            <div class="delivery-header-info">
                <div class="delivery-code-section">
                    <span class="delivery-code-label">Código da Rota:</span>
                    <span class="delivery-code-value">${this.escapeHtml(routeCode)}</span>
                </div>
                <div class="delivery-status-section">
                    <span class="status-label">Status:</span>
                    <span class="status-badge status-${status}">${this.getRouteStatusDisplayName(status)}</span>
                </div>
            </div>
        `;

        const routeSectionsHTML = `
            <div class="delivery-sections">
                <div class="delivery-section cargo-section">
                    <h3><i class="fas fa-boxes"></i> Informações da Carga</h3>
                    <div class="info-grid">
                        <div class="info-item full-width">
                            <div class="info-label">
                                <i class="fas fa-list"></i>
                                <span>Materiais</span>
                            </div>
                            <div class="info-value materials-list">
                                ${materials.length > 0 
                                    ? materials.map(m => `
                                        <span class="material-badge">
                                            <i class="fas fa-box"></i>
                                            ${this.escapeHtml(m.name)} 
                                            <span class="material-quantity">${m.quantity}x</span>
                                            ${m.weight > 0 ? `<span class="material-weight">${m.weight.toLocaleString('pt-BR', {minimumFractionDigits: 2})} kg</span>` : ''}
                                        </span>
                                    `).join('')
                                    : '<span class="no-materials">Nenhum material cadastrado</span>'
                                }
                            </div>
                        </div>
                        <div class="info-item highlight-item">
                            <div class="info-label">
                                <i class="fas fa-weight-hanging"></i>
                                <span>Peso Total</span>
                            </div>
                            <div class="info-value weight-value">
                                ${totalWeight > 0 
                                    ? `${totalWeight.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kg`
                                    : '-'
                                }
                            </div>
                        </div>
                        <div class="info-item highlight-item">
                            <div class="info-label">
                                <i class="fas fa-route"></i>
                                <span>Distância até Destino</span>
                            </div>
                            <div class="info-value distance-value">
                                ${estimatedDistance > 0 
                                    ? `${estimatedDistance.toLocaleString('pt-BR')} km`
                                    : 'Não calculada'
                                }
                            </div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">
                                <i class="fas fa-flag-checkered"></i>
                                <span>Total de Destinos</span>
                            </div>
                            <div class="info-value">${destinations.length}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>Origem</span>
                            </div>
                            <div class="info-value">${this.escapeHtml(originCity)} - ${this.escapeHtml(this.currentRoute.originState || '')}</div>
                        </div>
                        ${firstDestination ? `
                            <div class="info-item">
                                <div class="info-label">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <span>Primeiro Destino</span>
                                </div>
                                <div class="info-value">${this.escapeHtml(firstDestination.city || '')} - ${this.escapeHtml(firstDestination.state || '')}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        if (deliveryContentEl) {
            deliveryContentEl.innerHTML = routeHeaderHTML + routeSectionsHTML;
        }
    }

    calculateEstimatedDistance(originCity, destinationCity, destinations) {
        // Esta é uma função simplificada. Em produção, você pode usar APIs como Google Maps ou OpenRouteService
        // Por enquanto, retorna uma estimativa baseada no número de destinos
        if (!originCity || !destinationCity) return 0;
        
        // Estimativa: 50km por destino (pode ser ajustado)
        const baseDistance = 50;
        const totalDistance = baseDistance * Math.max(1, destinations.length);
        
        return totalDistance;
    }

    renderRouteInfo() {
        const routeCard = document.getElementById('routeCard');
        const routeContent = document.getElementById('routeContent');
        
        if (!this.currentRoute || !routeCard || !routeContent) {
            if (routeCard) routeCard.style.display = 'none';
            return;
        }

        routeCard.style.display = 'block';
        
        // Obter informações da rota
        const routeCode = this.currentRoute.code || this.currentRoute.id || '-';
        const originCity = this.currentRoute.originCity || '-';
        const originState = this.currentRoute.originState || '-';
        const status = this.currentRoute.status || 'pendente';
        const destinations = this.currentRoute.destinations || [];
        const scheduledDate = this.currentRoute.scheduledDate 
            ? new Date(this.currentRoute.scheduledDate).toLocaleDateString('pt-BR')
            : '-';
        
        // Contar total de itens
        let totalItems = 0;
        destinations.forEach(dest => {
            if (dest.items && Array.isArray(dest.items)) {
                totalItems += dest.items.length;
            }
        });
        
        // Listar destinos com layout melhorado
        const destinationsList = destinations.length > 0
            ? destinations.map((dest, idx) => {
                const customerName = dest.customerName || 'Cliente';
                const customerDocument = dest.customerDocument || '';
                const city = dest.city || '-';
                const state = dest.state || '-';
                const zipCode = dest.zipCode || '';
                const street = dest.street || '';
                const number = dest.number || '';
                const neighborhood = dest.neighborhood || '';
                const phone = dest.phone || '';
                const destItems = dest.items || [];
                const destItemsCount = destItems.length;
                
                // Calcular valor total dos itens deste destino
                let destTotalValue = 0;
                destItems.forEach(item => {
                    const quantity = parseFloat(item.quantity) || 0;
                    const value = parseFloat(item.value) || 0;
                    destTotalValue += quantity * value;
                });
                
                return `
                    <div class="destination-card">
                        <div class="destination-card-header">
                            <div class="destination-number">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>Destino ${idx + 1}</span>
                            </div>
                            <div class="destination-items-count">
                                <i class="fas fa-box"></i>
                                <span>${destItemsCount} item${destItemsCount !== 1 ? 's' : ''}</span>
                            </div>
                        </div>
                        <div class="destination-card-body">
                            <div class="destination-customer-info">
                                <div class="destination-customer-name">
                                    <i class="fas fa-user-tie"></i>
                                    <span>${this.escapeHtml(customerName)}</span>
                                </div>
                                ${customerDocument ? `
                                    <div class="destination-customer-doc">
                                        <i class="fas fa-id-card"></i>
                                        <span>${this.escapeHtml(customerDocument)}</span>
                                    </div>
                                ` : ''}
                                ${phone ? `
                                    <div class="destination-customer-phone">
                                        <i class="fas fa-phone"></i>
                                        <span>${this.escapeHtml(phone)}</span>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="destination-location">
                                <div class="destination-location-main">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <div class="destination-location-text">
                                        <span class="destination-city">${this.escapeHtml(city)}/${this.escapeHtml(state)}</span>
                                        ${zipCode ? `<span class="destination-zip">CEP: ${this.escapeHtml(zipCode)}</span>` : ''}
                                    </div>
                                </div>
                                ${street ? `
                                    <div class="destination-address">
                                        <i class="fas fa-road"></i>
                                        <span>${this.escapeHtml(street)}${number ? `, ${this.escapeHtml(number)}` : ''}${neighborhood ? ` - ${this.escapeHtml(neighborhood)}` : ''}</span>
                                    </div>
                                ` : ''}
                            </div>
                            ${destItemsCount > 0 ? `
                                <div class="destination-items-preview">
                                    <div class="destination-items-header">
                                        <i class="fas fa-boxes"></i>
                                        <span>Itens (${destItemsCount})</span>
                                        ${destTotalValue > 0 ? `
                                            <span class="destination-total-value">R$ ${destTotalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                        ` : ''}
                                    </div>
                                    <div class="destination-items-list">
                                        ${destItems.slice(0, 3).map(item => `
                                            <div class="destination-item-preview">
                                                <span class="item-name">${this.escapeHtml(item.name || item.type || 'Item')}</span>
                                                ${item.quantity ? `<span class="item-quantity">Qtd: ${item.quantity}</span>` : ''}
                                            </div>
                                        `).join('')}
                                        ${destItemsCount > 3 ? `
                                            <div class="destination-item-more">
                                                <i class="fas fa-ellipsis-h"></i>
                                                <span>+${destItemsCount - 3} item${destItemsCount - 3 !== 1 ? 's' : ''}</span>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('')
            : '<div class="destinations-empty"><i class="fas fa-inbox"></i><p>Nenhum destino cadastrado</p></div>';
        
        const routeHTML = `
            <div class="route-header-info">
                <div class="route-code-section">
                    <span class="route-code-label">Código:</span>
                    <span class="route-code-value">${this.escapeHtml(routeCode)}</span>
                </div>
                <div class="route-status-section">
                    <span class="status-label">
                        <i class="fas fa-info-circle"></i>
                        Status:
                    </span>
                    <select id="routeStatusSelect" class="status-select" onchange="employeeDashboard.updateRouteStatus()">
                        <option value="pendente" ${status === 'pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="em_carregamento" ${status === 'em_carregamento' ? 'selected' : ''}>Em Carregamento</option>
                        <option value="em_percurso" ${status === 'em_percurso' ? 'selected' : ''}>Em Percurso</option>
                        <option value="entregue" ${status === 'entregue' ? 'selected' : ''}>Entregue</option>
                    </select>
                </div>
            </div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>Origem</span>
                    </div>
                    <div class="info-value">${this.escapeHtml(originCity)} - ${this.escapeHtml(originState)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">
                        <i class="fas fa-calendar-alt"></i>
                        <span>Data Prevista</span>
                    </div>
                    <div class="info-value">${scheduledDate}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">
                        <i class="fas fa-flag-checkered"></i>
                        <span>Total de Destinos</span>
                    </div>
                    <div class="info-value">${destinations.length}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">
                        <i class="fas fa-boxes"></i>
                        <span>Total de Itens</span>
                    </div>
                    <div class="info-value">${totalItems}</div>
                </div>
            </div>
            <div class="destinations-section">
                <div class="destinations-section-header">
                    <h3><i class="fas fa-flag-checkered"></i> Destinos da Rota</h3>
                    <span class="destinations-count-badge">${destinations.length} destino${destinations.length !== 1 ? 's' : ''}</span>
                </div>
                <div class="destinations-list">
                    ${destinationsList}
                </div>
            </div>
        `;

        routeContent.innerHTML = routeHTML;
    }
    
    getRouteStatusDisplayName(status) {
        const statusMap = {
            'pendente': 'Pendente',
            'em_percurso': 'Em Percurso',
            'em_carregamento': 'Em Carregamento',
            'entregue': 'Entregue'
        };
        return statusMap[status] || status;
    }

    updateTruckStatus() {
        if (!this.currentTruck) {
            alert('Nenhum caminhão atribuído.');
            return;
        }

        const statusSelect = document.getElementById('truckStatusSelect');
        if (!statusSelect) return;

        const newStatus = statusSelect.value;
        const truckIndex = this.trucks.findIndex(t => t.id === this.currentTruck.id);
        
        if (truckIndex === -1) {
            alert('Caminhão não encontrado.');
            return;
        }

        // Atualizar status
        this.trucks[truckIndex].status = newStatus;
        this.currentTruck.status = newStatus;
        
        // Salvar no localStorage
        localStorage.setItem('trucks', JSON.stringify(this.trucks));
        
        // Log da ação
        this.logAction(`Status do caminhão ${this.currentTruck.id} alterado para ${this.getTruckStatusDisplayName(newStatus)}`);
        
        // Mostrar mensagem de sucesso
        this.showMessage(`Status do caminhão atualizado para "${this.getTruckStatusDisplayName(newStatus)}"!`, 'success');
        
        // Re-renderizar estatísticas
        this.renderQuickStats();
    }

    updateDeliveryStatus() {
        if (!this.currentDelivery) {
            alert('Nenhuma entrega atribuída.');
            return;
        }

        const statusSelect = document.getElementById('deliveryStatusSelect');
        if (!statusSelect) return;

        const newStatus = statusSelect.value;
        const deliveryIndex = this.deliveries.findIndex(d => 
            (d.id === this.currentDelivery.id) || 
            (d.code === this.currentDelivery.code) ||
            (d.trackingCode === this.currentDelivery.trackingCode)
        );
        
        if (deliveryIndex === -1) {
            alert('Entrega não encontrada.');
            return;
        }

        // Atualizar status
        this.deliveries[deliveryIndex].status = newStatus;
        this.currentDelivery.status = newStatus;
        
        // Se status for "entregue", adicionar data de entrega
        if (newStatus === 'entregue' && !this.deliveries[deliveryIndex].deliveryDate) {
            this.deliveries[deliveryIndex].deliveryDate = new Date().toISOString();
        }
        
        // Salvar no localStorage
        localStorage.setItem('deliveries', JSON.stringify(this.deliveries));
        
        // Log da ação
        this.logAction(`Status da entrega ${this.currentDelivery.code || this.currentDelivery.id} alterado para ${this.getStatusDisplayName(newStatus)}`);
        
        // Mostrar mensagem de sucesso
        this.showMessage(`Status da entrega atualizado para "${this.getStatusDisplayName(newStatus)}"!`, 'success');
        
        // Se status for "entregue", recarregar dashboard completo para remover a entrega
        if (newStatus === 'entregue') {
            // Limpar entrega atual
            this.currentDelivery = null;
            // Recarregar dashboard completo
            setTimeout(() => {
                this.renderDashboard();
            }, 500);
        } else {
            // Re-renderizar apenas se não for entregue
            this.renderDeliveryInfo();
            this.renderQuickStats();
        }
    }

    refreshDelivery() {
        this.findCurrentDelivery();
        this.renderDeliveryInfo();
        this.renderQuickStats();
        this.showMessage('Informações atualizadas!', 'success');
    }

    updateRouteStatus() {
        if (!this.currentRoute) {
            alert('Nenhuma rota atribuída.');
            return;
        }

        const statusSelect = document.getElementById('routeStatusSelect');
        if (!statusSelect) return;

        const newStatus = statusSelect.value;
        const routeIndex = this.routes.findIndex(r => 
            (r.id === this.currentRoute.id) || 
            (r.code === this.currentRoute.code)
        );
        
        if (routeIndex === -1) {
            alert('Rota não encontrada.');
            return;
        }

        // Atualizar status
        this.routes[routeIndex].status = newStatus;
        this.currentRoute.status = newStatus;
        
        // Se status for "entregue", adicionar data de entrega
        if (newStatus === 'entregue' && !this.routes[routeIndex].deliveryDate) {
            this.routes[routeIndex].deliveryDate = new Date().toISOString();
        }
        
        // Salvar no localStorage
        localStorage.setItem('routes', JSON.stringify(this.routes));
        
        // Log da ação
        this.logAction(`Status da rota ${this.currentRoute.code || this.currentRoute.id} alterado para ${this.getRouteStatusDisplayName(newStatus)}`);
        
        // Mostrar mensagem de sucesso
        this.showMessage(`Status da rota atualizado para "${this.getRouteStatusDisplayName(newStatus)}"!`, 'success');
        
        // Se status for "entregue", recarregar dashboard completo para remover a rota
        if (newStatus === 'entregue') {
            // Limpar rota atual
            this.currentRoute = null;
            // Recarregar dashboard completo
            setTimeout(() => {
                this.renderDashboard();
            }, 500);
        } else {
            // Re-renderizar apenas se não for entregue
            this.renderRouteInfo();
            this.renderQuickStats();
        }
    }

    // Sistema de Mensagens
    openMessagesModal() {
        const modal = document.getElementById('messagesModal');
        if (modal) {
            modal.style.display = 'block';
            this.renderMessages();
            // Marcar mensagens como lidas
            this.markMessagesAsRead();
            
            // Atualizar item de navegação ativo
            const navItem = document.getElementById('navMessages');
            const dashboardNav = document.querySelector('.nav-item.active');
            if (dashboardNav) dashboardNav.classList.remove('active');
            if (navItem && navItem.parentElement) {
                navItem.parentElement.classList.add('active');
            }
        }
    }

    closeMessagesModal() {
        const modal = document.getElementById('messagesModal');
        if (modal) {
            modal.style.display = 'none';
            
            // Restaurar item de navegação ativo
            const navItem = document.getElementById('navMessages');
            if (navItem && navItem.parentElement) {
                navItem.parentElement.classList.remove('active');
            }
            const dashboardNav = document.querySelector('.nav-item:first-child');
            if (dashboardNav) dashboardNav.classList.add('active');
        }
    }

    renderMessages() {
        const messagesList = document.getElementById('messagesList');
        if (!messagesList) return;

        if (this.messages.length === 0) {
            messagesList.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-comments"></i>
                    <h3>Nenhuma mensagem</h3>
                    <p>Você ainda não possui mensagens.</p>
                </div>
            `;
            return;
        }

        messagesList.innerHTML = this.messages.map(msg => {
            const isUnread = msg.toEmployeeId === this.currentUser.id && !msg.read;
            const isFromMe = msg.fromEmployeeId === this.currentUser.id;
            const priorityClass = msg.priority || 'normal';
            const isMoment = msg.type === 'moment';
            const momentIcon = isMoment ? (msg.momentType === 'saida' ? 'fa-sign-out-alt' : 'fa-check-circle') : 'fa-comments';
            const momentColor = isMoment ? (msg.momentType === 'saida' ? '#4a90e2' : '#2ed573') : 'var(--accent-blue)';
            
            return `
                <div class="message-item ${isUnread ? 'unread' : ''} ${isMoment ? 'moment-message' : ''}">
                    <div class="message-header">
                        <div class="message-subject" style="display: flex; align-items: center; gap: 8px;">
                            ${isMoment ? `<i class="fas ${momentIcon}" style="color: ${momentColor};"></i>` : ''}
                            <span>${this.escapeHtml(msg.subject || 'Sem assunto')}</span>
                        </div>
                        <div class="message-date">${new Date(msg.createdAt).toLocaleString('pt-BR')}</div>
                    </div>
                    <div class="message-content" style="${isMoment ? 'white-space: pre-line;' : ''}">${isMoment ? this.escapeHtml(msg.content || '').replace(/\n/g, '<br>') : this.escapeHtml(msg.content || '')}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                        <span class="message-priority ${priorityClass}">${this.getPriorityDisplayName(msg.priority || 'normal')}</span>
                        ${isFromMe ? `<span style="font-size: 12px; color: var(--text-muted);"><i class="fas ${isMoment ? 'fa-clock' : 'fa-paper-plane'}"></i> ${isMoment ? 'Registro' : 'Enviada'}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    sendMessage(event) {
        event.preventDefault();
        
        const subject = document.getElementById('messageSubject').value.trim();
        const content = document.getElementById('messageContent').value.trim();
        const priority = document.getElementById('messagePriority').value;

        if (!subject || !content) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        // Criar mensagem
        const message = {
            id: 'MSG-' + Date.now(),
            fromEmployeeId: this.currentUser.id,
            fromEmployeeName: this.currentUser.name,
            toEmployeeId: null, // null = para gestor/suporte
            toEmployeeName: 'Gestor/Suporte',
            subject: subject,
            content: content,
            priority: priority,
            read: false,
            createdAt: new Date().toISOString()
        };

        // Carregar mensagens existentes
        const allMessages = JSON.parse(localStorage.getItem('employeeMessages') || '[]');
        allMessages.push(message);
        localStorage.setItem('employeeMessages', JSON.stringify(allMessages));

        // Atualizar lista local
        this.messages.unshift(message);
        this.renderMessages();

        // Limpar formulário
        document.getElementById('newMessageForm').reset();

        // Mostrar mensagem de sucesso
        this.showMessage('Mensagem enviada com sucesso!', 'success');
        
        // Log da ação
        this.logAction(`Mensagem enviada para suporte/gestor: ${subject}`);
    }

    // Sistema de Notificações
    loadNotifications() {
        const allNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        const userId = this.currentUser.id;
        
        // Filtrar notificações direcionadas ao funcionário
        this.notifications = allNotifications.filter(notif => {
            // Notificações direcionadas especificamente ao funcionário
            if (notif.targetEmployeeId && (notif.targetEmployeeId === userId || String(notif.targetEmployeeId) === String(userId))) {
                return true;
            }
            // Notificações de rotas/entregas atribuídas ao funcionário
            if (notif.relatedType === 'route' || notif.relatedType === 'delivery') {
                if (notif.metadata && (notif.metadata.employeeId === userId || String(notif.metadata.employeeId) === String(userId))) {
                    return true;
                }
            }
            return false;
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        this.updateNotificationsBadge();
        
        // Se o modal estiver aberto, atualizar lista
        const modal = document.getElementById('notificationsModal');
        if (modal && modal.style.display === 'block') {
            this.renderNotifications();
        }
    }

    updateNotificationsBadge() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notificationsBadge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    openNotificationsModal() {
        const modal = document.getElementById('notificationsModal');
        if (modal) {
            modal.style.display = 'block';
            this.renderNotifications();
        }
    }

    closeNotificationsModal() {
        const modal = document.getElementById('notificationsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    renderNotifications() {
        const list = document.getElementById('notificationsList');
        if (!list) return;

        if (this.notifications.length === 0) {
            list.innerHTML = `
                <div class="empty-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>Nenhuma notificação</p>
                </div>
            `;
            return;
        }

        list.innerHTML = this.notifications.map(notif => {
            const date = new Date(notif.createdAt);
            const timeAgo = this.getTimeAgo(date);
            const isUnread = !notif.read;
            
            return `
                <div class="notification-item ${isUnread ? 'unread' : ''}" data-notification-id="${notif.id}">
                    <div class="notification-icon ${notif.type}">
                        <i class="fas ${this.getNotificationIcon(notif.type)}"></i>
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">${this.escapeHtml(notif.title)}</div>
                        <div class="notification-message">${this.formatNotificationMessage(notif.message)}</div>
                        <div class="notification-time">${timeAgo}</div>
                    </div>
                    ${isUnread ? '<div class="notification-dot"></div>' : ''}
                </div>
            `;
        }).join('');

        // Adicionar event listeners
        list.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const notifId = item.dataset.notificationId;
                this.markNotificationAsRead(notifId);
            });
        });
    }

    getNotificationIcon(type) {
        const icons = {
            'rota': 'fa-route',
            'entrega': 'fa-box',
            'delivery_moment': 'fa-clock',
            'default': 'fa-bell'
        };
        return icons[type] || icons.default;
    }

    formatNotificationMessage(message) {
        if (!message) return '';
        return this.escapeHtml(message).replace(/\n/g, '<br>');
    }

    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} dia${days > 1 ? 's' : ''} atrás`;
        if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''} atrás`;
        if (minutes > 0) return `${minutes} minuto${minutes > 1 ? 's' : ''} atrás`;
        return 'Agora';
    }

    markNotificationAsRead(notifId) {
        const allNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        const notification = allNotifications.find(n => n.id === notifId);
        
        if (notification && !notification.read) {
            notification.read = true;
            localStorage.setItem('notifications', JSON.stringify(allNotifications));
            this.loadNotifications();
        }
    }

    markMessagesAsRead() {
        let updated = false;
        this.messages.forEach(msg => {
            if (msg.toEmployeeId === this.currentUser.id && !msg.read) {
                msg.read = true;
                updated = true;
            }
        });

        if (updated) {
            // Salvar no localStorage
            const allMessages = JSON.parse(localStorage.getItem('employeeMessages') || '[]');
            this.messages.forEach(msg => {
                const index = allMessages.findIndex(m => m.id === msg.id);
                if (index !== -1) {
                    allMessages[index] = msg;
                }
            });
            localStorage.setItem('employeeMessages', JSON.stringify(allMessages));
            
            this.updateMessagesBadge();
        }
    }

    viewInvoice() {
        if (!this.currentDelivery) {
            alert('Nenhuma entrega selecionada.');
            return;
        }

        // Encontrar o índice da entrega no array de entregas
        const deliveryIndex = this.deliveries.findIndex(d => 
            (d.id === this.currentDelivery.id) || 
            (d.code === this.currentDelivery.code) ||
            (d.trackingCode === this.currentDelivery.trackingCode)
        );
        
        if (deliveryIndex === -1) {
            alert('Entrega não encontrada.');
            return;
        }

        this.generateInvoice(deliveryIndex);
    }

    generateInvoice(index) {
        const delivery = index !== undefined ? this.deliveries[index] : this.currentDelivery;
        if (!delivery) return;

        const truck = this.trucks.find(t => t.id === delivery.truckId);
        const driver = this.employees.find(e => e.id === delivery.driverId) || this.currentUser;
        const employee = delivery.employeeId ? this.employees.find(e => e.id === delivery.employeeId) : null;
        const destCityName = delivery.destinationCity || '';
        const destCityState = delivery.destinationState || '';
        
        const paymentMethodNames = {
            'dinheiro': 'Dinheiro',
            'pix': 'PIX',
            'cartao_debito': 'Cartão de Débito',
            'cartao_credito': 'Cartão de Crédito',
            'transferencia': 'Transferência Bancária',
            'boleto': 'Boleto',
            'cheque': 'Cheque',
            'credito_loja': 'Crédito na Loja',
            'outros': 'Outros'
        };

        // Obter o caminho base para a logo
        const currentPath = window.location.pathname;
        let logoPath;
        
        if (currentPath.includes('/dashboard_funcionario/')) {
            const basePath = window.location.origin + currentPath.substring(0, currentPath.indexOf('/dashboard_funcionario'));
            logoPath = basePath + '/logo_agreste.jpg';
        } else {
            logoPath = window.location.origin + '/logo_agreste.jpg';
        }

        const invoiceHTML = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Nota Fiscal - ${delivery.trackingCode || delivery.code || delivery.id}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        padding: 15px;
                        color: #333;
                        font-size: 11px;
                    }
                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                    .invoice-header {
                        text-align: center;
                        border-bottom: 2px solid #333;
                        padding-bottom: 10px;
                        margin-bottom: 10px;
                    }
                    .invoice-logo {
                        max-width: 150px;
                        max-height: 70px;
                        margin-bottom: 8px;
                        display: block;
                        margin-left: auto;
                        margin-right: auto;
                    }
                    .invoice-header h1 {
                        font-size: 18px;
                        margin-bottom: 5px;
                    }
                    .invoice-header p {
                        font-size: 11px;
                        margin: 0;
                    }
                    .invoice-info {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 12px;
                    }
                    .info-section {
                        flex: 1;
                        margin: 0 8px;
                    }
                    .info-section h3 {
                        border-bottom: 1px solid #ccc;
                        padding-bottom: 3px;
                        margin-bottom: 5px;
                        font-size: 11px;
                    }
                    .info-section p {
                        margin: 2px 0;
                        font-size: 10px;
                        line-height: 1.3;
                    }
                    .invoice-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 10px;
                    }
                    .invoice-table th,
                    .invoice-table td {
                        border: 1px solid #ddd;
                        padding: 4px;
                        text-align: left;
                        font-size: 9px;
                    }
                    .invoice-table th {
                        background-color: #f5f5f5;
                        font-weight: bold;
                    }
                    .invoice-totals {
                        text-align: right;
                        margin-top: 10px;
                        margin-bottom: 10px;
                    }
                    .invoice-totals table {
                        margin-left: auto;
                        width: 250px;
                    }
                    .invoice-totals td {
                        padding: 3px 8px;
                        font-size: 10px;
                    }
                    .invoice-totals .total-row {
                        font-weight: bold;
                        font-size: 11px;
                        border-top: 2px solid #333;
                    }
                    .invoice-signatures {
                        margin-top: 15px;
                        display: flex;
                        justify-content: space-between;
                        border-top: 1px solid #ddd;
                        padding-top: 10px;
                    }
                    .signature-box {
                        flex: 1;
                        text-align: center;
                        margin: 0 10px;
                        min-height: 70px;
                        border-bottom: 1px solid #333;
                        padding-bottom: 3px;
                    }
                    .signature-box:first-child {
                        margin-left: 0;
                    }
                    .signature-box:last-child {
                        margin-right: 0;
                    }
                    .signature-label {
                        font-weight: bold;
                        font-size: 10px;
                        margin-bottom: 35px;
                        color: #333;
                    }
                    .signature-name {
                        font-size: 9px;
                        color: #666;
                        margin-top: 3px;
                    }
                    .invoice-footer {
                        margin-top: 10px;
                        text-align: center;
                        font-size: 9px;
                        color: #666;
                    }
                    .notes-section {
                        margin-top: 8px;
                        font-size: 10px;
                    }
                    .notes-section h3 {
                        font-size: 11px;
                        margin-bottom: 3px;
                    }
                    .notes-section p {
                        font-size: 10px;
                        line-height: 1.3;
                    }
                    @media print {
                        body {
                            padding: 0;
                            margin: 0;
                        }
                        .no-print {
                            display: none;
                        }
                        * {
                            page-break-inside: avoid;
                        }
                        .invoice-signatures {
                            page-break-inside: avoid;
                        }
                        @page {
                            margin: 10mm;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="invoice-header">
                    <img src="${logoPath}" alt="Logo Agreste Construção" class="invoice-logo" onerror="this.style.display='none'">
                    <h1>NOTA FISCAL</h1>
                    <p>Agreste Construções - Control Development</p>
                </div>

                <div class="invoice-info">
                    <div class="info-section">
                        <h3>DADOS DA ENTREGA</h3>
                        <p><strong>Código de Rastreamento:</strong> ${delivery.trackingCode || delivery.code || delivery.id || '-'}</p>
                        <p><strong>Data Prevista:</strong> ${delivery.scheduledDate ? new Date(delivery.scheduledDate).toLocaleDateString('pt-BR') : '-'}</p>
                        <p><strong>Data de Entrega:</strong> ${delivery.deliveryDate ? new Date(delivery.deliveryDate).toLocaleDateString('pt-BR') : '-'}</p>
                        <p><strong>Status:</strong> ${this.getStatusDisplayName(delivery.status)}</p>
                    </div>
                    <div class="info-section">
                        <h3>CLIENTE</h3>
                        <p><strong>Nome:</strong> ${delivery.customerName || '-'}</p>
                        <p><strong>CPF/CNPJ:</strong> ${delivery.customerDocument || '-'}</p>
                        <p><strong>Email:</strong> ${delivery.customerEmail || '-'}</p>
                        <p><strong>Telefone:</strong> ${delivery.customerPhone || '-'}</p>
                    </div>
                </div>

                <div class="invoice-info">
                    <div class="info-section">
                        <h3>DESTINO</h3>
                        <p><strong>Cidade:</strong> ${destCityName || '-'}</p>
                        <p><strong>Estado:</strong> ${destCityState || '-'}</p>
                        <p><strong>CEP:</strong> ${delivery.destinationZipCode || '-'}</p>
                        ${delivery.destinationStreet ? `<p><strong>Logradouro:</strong> ${delivery.destinationStreet}</p>` : ''}
                        ${delivery.destinationNumber ? `<p><strong>Número:</strong> ${delivery.destinationNumber}</p>` : ''}
                        ${delivery.destinationComplement ? `<p><strong>Complemento:</strong> ${delivery.destinationComplement}</p>` : ''}
                        ${delivery.destinationNeighborhood ? `<p><strong>Bairro:</strong> ${delivery.destinationNeighborhood}</p>` : ''}
                    </div>
                </div>

                <div class="invoice-info">
                    <div class="info-section">
                        <h3>VEÍCULO E EQUIPE</h3>
                        <p><strong>Caminhão:</strong> ${truck ? `${truck.id} - ${truck.plate}` : '-'}</p>
                        <p><strong>Motorista:</strong> ${driver ? driver.name : '-'}</p>
                        <p><strong>Funcionário:</strong> ${employee ? employee.name : '-'}</p>
                    </div>
                    <div class="info-section">
                        <h3>MATERIAL</h3>
                        <p><strong>Tipo:</strong> ${this.getCargoTypeName(delivery.cargoType)}</p>
                        <p><strong>Peso:</strong> ${delivery.cargoWeight ? `${delivery.cargoWeight.toLocaleString()} kg` : '-'}</p>
                        <p><strong>Descrição:</strong> ${delivery.cargoDescription || '-'}</p>
                    </div>
                </div>

                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>Descrição</th>
                            <th>Quantidade</th>
                            <th>Valor Unitário</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Serviço de Transporte - ${this.getCargoTypeName(delivery.cargoType)}</td>
                            <td>1</td>
                            <td>R$ ${(delivery.totalValue || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td>R$ ${(delivery.totalValue || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="invoice-totals">
                    <table>
                        <tr>
                            <td>Subtotal:</td>
                            <td>R$ ${(delivery.totalValue || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        </tr>
                        ${delivery.discount ? `
                        <tr>
                            <td>Desconto:</td>
                            <td>- R$ ${delivery.discount.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        </tr>
                        ` : ''}
                        <tr class="total-row">
                            <td>Total:</td>
                            <td>R$ ${(delivery.finalValue || delivery.totalValue || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        </tr>
                        <tr>
                            <td>Método de Pagamento:</td>
                            <td>${paymentMethodNames[delivery.paymentMethod] || delivery.paymentMethod || '-'}</td>
                        </tr>
                    </table>
                </div>

                ${delivery.notes ? `
                <div class="notes-section">
                    <h3>Observações:</h3>
                    <p>${delivery.notes}</p>
                </div>
                ` : ''}

                <div class="invoice-signatures">
                    <div class="signature-box">
                        <div class="signature-label">MOTORISTA</div>
                        <div class="signature-name"></div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-label">CLIENTE</div>
                        <div class="signature-name"></div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-label">GESTOR</div>
                        <div class="signature-name"></div>
                    </div>
                </div>

                <div class="invoice-footer">
                    <p>Documento gerado automaticamente pelo sistema Agreste Construção</p>
                    <p>Data de emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 250);
    }

    viewFullDetails() {
        if (!this.currentDelivery) {
            alert('Nenhuma entrega selecionada.');
            return;
        }

        const delivery = this.currentDelivery;
        const modal = document.getElementById('detailsModal');
        const content = document.getElementById('fullDetailsContent');

        const detailsHTML = `
            <div class="details-content">
                <div class="details-section">
                    <h3>Informações Gerais</h3>
                    <div class="details-grid">
                        <div class="detail-item">
                            <span class="detail-label">Código:</span>
                            <span class="detail-value">${delivery.code || delivery.id || delivery.trackingCode || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Status:</span>
                            <span class="detail-value"><span class="status-badge ${delivery.status || 'pendente'}">${this.getStatusDisplayName(delivery.status)}</span></span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Data Prevista:</span>
                            <span class="detail-value">${delivery.scheduledDate ? new Date(delivery.scheduledDate).toLocaleDateString('pt-BR') : '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Data de Entrega:</span>
                            <span class="detail-value">${delivery.deliveryDate ? new Date(delivery.deliveryDate).toLocaleDateString('pt-BR') : '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Prioridade:</span>
                            <span class="detail-value">${this.getPriorityDisplayName(delivery.priority)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Método de Pagamento:</span>
                            <span class="detail-value">${this.getPaymentMethodDisplayName(delivery.paymentMethod)}</span>
                        </div>
                    </div>
                </div>

                <div class="details-section">
                    <h3>Cliente</h3>
                    <div class="details-grid">
                        <div class="detail-item">
                            <span class="detail-label">Nome:</span>
                            <span class="detail-value">${this.escapeHtml(delivery.customerName || '-')}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">CPF/CNPJ:</span>
                            <span class="detail-value">${this.escapeHtml(delivery.customerDocument || '-')}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Email:</span>
                            <span class="detail-value">${this.escapeHtml(delivery.customerEmail || '-')}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Telefone:</span>
                            <span class="detail-value">${this.escapeHtml(delivery.customerPhone || '-')}</span>
                        </div>
                    </div>
                </div>

                <div class="details-section">
                    <h3>Destino</h3>
                    <div class="details-grid">
                        <div class="detail-item full-width">
                            <span class="detail-label">Endereço Completo:</span>
                            <span class="detail-value">${this.escapeHtml([
                                delivery.destinationStreet,
                                delivery.destinationNumber,
                                delivery.destinationComplement,
                                delivery.destinationNeighborhood,
                                delivery.destinationCity,
                                delivery.destinationState,
                                delivery.destinationZipCode ? `CEP: ${delivery.destinationZipCode}` : ''
                            ].filter(Boolean).join(', ') || '-')}</span>
                        </div>
                    </div>
                </div>

                <div class="details-section">
                    <h3>Carga</h3>
                    <div class="details-grid">
                        <div class="detail-item">
                            <span class="detail-label">Tipo:</span>
                            <span class="detail-value">${this.escapeHtml(delivery.cargoType || '-')}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Peso:</span>
                            <span class="detail-value">${delivery.cargoWeight ? `${delivery.cargoWeight.toLocaleString('pt-BR', {minimumFractionDigits: 2})} kg` : '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Descrição:</span>
                            <span class="detail-value">${this.escapeHtml(delivery.cargoDescription || '-')}</span>
                        </div>
                    </div>
                </div>

                <div class="details-section">
                    <h3>Valores</h3>
                    <div class="details-grid">
                        <div class="detail-item">
                            <span class="detail-label">Valor Total:</span>
                            <span class="detail-value">R$ ${(delivery.totalValue || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Desconto:</span>
                            <span class="detail-value">R$ ${(delivery.discount || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Valor Final:</span>
                            <span class="detail-value"><strong>R$ ${(delivery.finalValue || delivery.totalValue || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong></span>
                        </div>
                    </div>
                </div>

                ${delivery.notes ? `
                <div class="details-section">
                    <h3>Observações</h3>
                    <p>${this.escapeHtml(delivery.notes)}</p>
                </div>
                ` : ''}
            </div>
        `;

        if (content) content.innerHTML = detailsHTML;
        if (modal) modal.style.display = 'block';
    }

    getStatusDisplayName(status) {
        const statusNames = {
            'pendente': 'Pendente',
            'em_percurso': 'Em Percurso',
            'em_carregamento': 'Em Carregamento',
            'entregue': 'Entregue',
            'planejada': 'Planejada',
            'em_andamento': 'Em Andamento',
            'concluida': 'Concluída'
        };
        return statusNames[status] || status || 'Pendente';
    }

    getTruckStatusDisplayName(status) {
        const statusNames = {
            'disponivel': 'Disponível',
            'em_rota': 'Em Rota',
            'parado': 'Parado',
            'manutencao': 'Em Manutenção'
        };
        return statusNames[status] || status || 'Disponível';
    }

    getRouteStatusDisplayName(status) {
        const statusNames = {
            'planejada': 'Planejada',
            'em_andamento': 'Em Andamento',
            'concluida': 'Concluída',
            'cancelada': 'Cancelada'
        };
        return statusNames[status] || status || 'Planejada';
    }

    getPriorityDisplayName(priority) {
        const priorities = {
            'baixa': 'Baixa',
            'normal': 'Normal',
            'alta': 'Alta',
            'urgente': 'Urgente'
        };
        return priorities[priority] || priority || 'Normal';
    }

    getPaymentMethodDisplayName(method) {
        const methods = {
            'dinheiro': 'Dinheiro',
            'cartao': 'Cartão',
            'pix': 'PIX',
            'transferencia': 'Transferência',
            'cheque': 'Cheque'
        };
        return methods[method] || method || '-';
    }

    getCargoTypeName(cargoType) {
        const cargoTypes = {
            'material_construcao': 'Material de Construção',
            'cimento': 'Cimento',
            'areia': 'Areia',
            'pedra': 'Pedra',
            'tijolo': 'Tijolo',
            'ferro': 'Ferro',
            'madeira': 'Madeira',
            'outros': 'Outros'
        };
        return cargoTypes[cargoType] || cargoType || 'Material de Construção';
    }

    formatPlate(plate) {
        if (!plate) return '';
        // Formatar placa brasileira (ABC-1234 ou ABC1D23)
        const cleanPlate = plate.replace(/\D/g, '');
        if (cleanPlate.length === 7) {
            // Mercosul
            return plate.substring(0, 3).toUpperCase() + '-' + plate.substring(3).toUpperCase();
        } else if (cleanPlate.length === 6) {
            // Antiga
            return plate.substring(0, 3).toUpperCase() + '-' + plate.substring(3).toUpperCase();
        }
        return plate.toUpperCase();
    }

    escapeHtml(text) {
        if (text === null || text === undefined) {
            return '';
        }
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    showMessage(message, type = 'info') {
        // Criar elemento de mensagem
        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--accent-green)' : type === 'error' ? 'var(--accent-red)' : 'var(--accent-blue)'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 400px;
            animation: slideInRight 0.3s ease;
        `;
        messageEl.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${this.escapeHtml(message)}</span>
        `;
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.style.opacity = '0';
            messageEl.style.transition = 'opacity 0.3s';
            setTimeout(() => messageEl.remove(), 300);
        }, 3000);
    }

    logAction(action) {
        const logs = JSON.parse(localStorage.getItem('employeeLogs') || '[]');
        logs.unshift({
            id: 'LOG-' + Date.now(),
            employeeId: this.currentUser.id,
            employeeName: this.currentUser.name,
            action: action,
            timestamp: new Date().toISOString()
        });
        // Manter apenas os últimos 100 logs
        if (logs.length > 100) {
            logs.splice(100);
        }
        localStorage.setItem('employeeLogs', JSON.stringify(logs));
    }

    logout() {
        const self = this;
        window.showGlobalConfirmModal(
            'Confirmar Saída',
            'Deseja realmente sair?',
            () => {
                self.executeLogout();
            }
        );
        return;
    }
    
    executeLogout() {
        sessionStorage.removeItem('currentEmployee');
        window.location.href = './login.html';
    }
}

// Initialize dashboard
let employeeDashboard;
document.addEventListener('DOMContentLoaded', () => {
    employeeDashboard = new EmployeeDashboard();
    window.employeeDashboard = employeeDashboard;
});

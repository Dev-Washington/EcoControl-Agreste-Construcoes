// Sistema de Registro de Momentos da Entrega
class MomentsManager {
    constructor() {
        this.currentUser = null;
        this.deliveries = [];
        this.trucks = [];
        this.routes = [];
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadData();
        this.setupMomentsSystem();
        this.updateUserInfo();
    }

    checkAuth() {
        const user = sessionStorage.getItem('currentEmployee');
        if (!user) {
            window.location.href = './login.html';
            return;
        }

        this.currentUser = JSON.parse(user);

        // Buscar dados completos do funcionário no localStorage
        const employees = JSON.parse(localStorage.getItem('employees') || '[]');
        const users = JSON.parse(localStorage.getItem('users') || '[]');

        let fullEmployeeData = employees.find(emp =>
            (emp.email && this.currentUser.email && emp.email.toLowerCase() === this.currentUser.email.toLowerCase()) ||
            emp.id === this.currentUser.id ||
            (emp.name && this.currentUser.name && emp.name === this.currentUser.name)
        );

        if (!fullEmployeeData) {
            fullEmployeeData = users.find(user =>
                (user.email && this.currentUser.email && user.email.toLowerCase() === this.currentUser.email.toLowerCase()) ||
                user.id === this.currentUser.id ||
                (user.name && this.currentUser.name && user.name === this.currentUser.name)
            );
        }

        if (fullEmployeeData) {
            this.currentUser = {
                ...this.currentUser,
                ...fullEmployeeData,
                id: fullEmployeeData.id || this.currentUser.id
            };
        }

        if (!this.currentUser.id) {
            if (this.currentUser.email) {
                const emailHash = this.currentUser.email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                this.currentUser.id = 'temp_' + emailHash;
            }
        }
    }

    loadData() {
        this.deliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
        this.trucks = JSON.parse(localStorage.getItem('trucks') || '[]');
        this.routes = JSON.parse(localStorage.getItem('routes') || '[]');

        if (!Array.isArray(this.deliveries)) this.deliveries = [];
        if (!Array.isArray(this.trucks)) this.trucks = [];
        if (!Array.isArray(this.routes)) this.routes = [];
    }

    updateUserInfo() {
        const userNameEl = document.getElementById('sidebarUserName');
        const userRoleEl = document.getElementById('sidebarUserRole');

        if (userNameEl && this.currentUser) {
            userNameEl.textContent = this.currentUser.name || 'Funcionário';
        }

        if (userRoleEl && this.currentUser) {
            userRoleEl.textContent = this.currentUser.role || 'Funcionário';
        }
    }

    setupMomentsSystem() {
        this.populateMomentsSelects();
        this.renderMomentsHistory();
    }

    populateMomentsSelects() {
        const truckSelect = document.getElementById('momentTruck');
        const routeSelect = document.getElementById('momentRoute');

        if (!truckSelect || !routeSelect) return;

        const userId = this.currentUser.id;

        // Filtrar apenas rotas atribuídas ao funcionário e que não estão concluídas
        const assignedRoutes = this.routes.filter(route => {
            const isAssigned = route.driverId === userId ||
                String(route.driverId) === String(userId) ||
                route.employeeId === userId ||
                String(route.employeeId) === String(userId) ||
                (route.assignedDrivers && Array.isArray(route.assignedDrivers) &&
                    (route.assignedDrivers.includes(userId) || route.assignedDrivers.includes(String(userId))));
            const isNotCompleted = route.status !== 'entregue' && route.status !== 'concluida';
            return isAssigned && isNotCompleted;
        });

        // Filtrar entregas atribuídas ao funcionário e que não estão concluídas
        const assignedDeliveries = this.deliveries.filter(delivery => {
            const isAssigned = delivery.driverId === userId ||
                String(delivery.driverId) === String(userId) ||
                delivery.employeeId === userId ||
                String(delivery.employeeId) === String(userId);
            const isNotCompleted = delivery.status !== 'entregue' && delivery.status !== 'concluida';
            return isAssigned && isNotCompleted;
        });

        // Coletar IDs de rotas relacionadas às entregas atribuídas
        const routeIdsFromDeliveries = new Set();
        assignedDeliveries.forEach(delivery => {
            if (delivery.routeId) {
                routeIdsFromDeliveries.add(String(delivery.routeId));
            }
        });

        // Adicionar rotas relacionadas às entregas (se não estiverem já na lista)
        routeIdsFromDeliveries.forEach(routeId => {
            const relatedRoute = this.routes.find(r =>
                (String(r.id) === routeId) &&
                r.status !== 'entregue' &&
                r.status !== 'concluida'
            );
            if (relatedRoute && !assignedRoutes.find(r => String(r.id) === String(relatedRoute.id))) {
                assignedRoutes.push(relatedRoute);
            }
        });

        // Se não houver rotas atribuídas NEM entregas atribuídas, deixar selects vazios com mensagem
        if (assignedRoutes.length === 0 && assignedDeliveries.length === 0) {
            truckSelect.innerHTML = '<option value="">Nenhuma rota/entrega atribuída</option>';
            routeSelect.innerHTML = '<option value="">Nenhuma rota/entrega atribuída</option>';
            truckSelect.disabled = true;
            routeSelect.disabled = true;
            return;
        }

        // Habilitar selects se houver rotas OU entregas
        truckSelect.disabled = false;
        routeSelect.disabled = false;

        // Coletar IDs dos caminhões das rotas atribuídas
        const assignedTruckIds = new Set();
        assignedRoutes.forEach(route => {
            if (route.truckId) {
                assignedTruckIds.add(String(route.truckId));
            }
        });

        // Também coletar caminhões das entregas atribuídas
        assignedDeliveries.forEach(delivery => {
            if (delivery.truckId) {
                assignedTruckIds.add(String(delivery.truckId));
            }
        });

        // Popular caminhões apenas dos que estão nas rotas/entregas atribuídas
        truckSelect.innerHTML = '<option value="">Selecione o caminhão</option>';
        if (assignedTruckIds.size > 0) {
            this.trucks.forEach(truck => {
                const truckIdStr = String(truck.id);
                if (assignedTruckIds.has(truckIdStr)) {
                    const option = document.createElement('option');
                    option.value = truck.id;
                    option.textContent = `${truck.id} - ${truck.plate || 'Sem placa'} - ${truck.model || 'Sem modelo'}`;
                    truckSelect.appendChild(option);
                }
            });
        } else {
            // Se não encontrou caminhão nos recursos, mas tem entrega/rota, tentar mostrar algo genérico ou vazio
            // Mas se o usuário foi atribuído e não tem caminhão vinculado, pode ser um problema de dados
        }


        // Popular selects: Combinação de Rotas e Entregas Individuais
        routeSelect.innerHTML = '<option value="">Selecione a rota ou entrega</option>';

        // Adicionar Rotas (Grupo)
        if (assignedRoutes.length > 0) {
            const groupOpt = document.createElement('optgroup');
            groupOpt.label = "Rotas";
            assignedRoutes.forEach(route => {
                const option = document.createElement('option');
                option.value = 'ROUTE|' + route.id; // Prefixo para identificar que é ROTA
                const routeName = route.code || route.id || 'Rota sem código';
                option.textContent = `Rota: ${routeName}`;
                groupOpt.appendChild(option);
            });
            routeSelect.appendChild(groupOpt);
        }

        // Adicionar Entregas Individuais (que não estão nas rotas listadas, ou mostrar todas para garantir)
        // Para simplificar e garantir que o usuário veja tudo, listamos as entregas também
        if (assignedDeliveries.length > 0) {
            const groupOpt = document.createElement('optgroup');
            groupOpt.label = "Entregas Individuais";
            assignedDeliveries.forEach(delivery => {
                // Verificar se esta entrega já faz parte de uma rota listada acima para evitar duplicidade visual óbvia
                // Mas o usuário pediu "entrega ou por rota", então mostrar as entregas é importante
                const option = document.createElement('option');
                option.value = 'DELIVERY|' + (delivery.id || delivery.code); // Prefixo para identifica que é ENTREGA
                const deliveryName = delivery.code || delivery.id || 'Entrega sem código';
                const dest = delivery.destinationCity || 'Destino n/d';
                option.textContent = `Entrega: ${deliveryName} - ${dest}`;
                groupOpt.appendChild(option);
            });
            routeSelect.appendChild(groupOpt);
        }
    }

    registerMomentType(type) {
        const truckSelect = document.getElementById('momentTruck');
        const routeSelect = document.getElementById('momentRoute');

        if (!truckSelect || !routeSelect) {
            alert('Erro: Campos não encontrados');
            return;
        }

        const truckId = truckSelect.value;
        const rawValue = routeSelect.value;

        if (!truckId || !rawValue) {
            alert('Por favor, selecione o caminhão e a rota/entrega antes de registrar o momento.');
            return;
        }

        const [selectedType, selectedId] = rawValue.includes('|') ? rawValue.split('|') : ['ROUTE', rawValue];

        const truck = this.trucks.find(t => String(t.id) === String(truckId));
        let route = null;
        let delivery = null;

        if (selectedType === 'ROUTE') {
            route = this.routes.find(r => String(r.id) === String(selectedId));
        } else if (selectedType === 'DELIVERY') {
            delivery = this.deliveries.find(d => String(d.id) === String(selectedId) || String(d.code) === String(selectedId));
            // Tentar encontrar a rota vinculada a esta entrega
            if (delivery && delivery.routeId) {
                route = this.routes.find(r => String(r.id) === String(delivery.routeId));
            }
        }

        if (!truck) {
            alert('Caminhão não encontrado.');
            return;
        }

        if (!route && !delivery) {
            alert('Rota ou entrega não encontrada.');
            return;
        }

        // Obter data e hora atual
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR');
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Criar registro do momento
        const moment = {
            id: 'MOMENT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            type: type, // 'saida' ou 'entrega'
            employeeId: this.currentUser.id,
            employeeName: this.currentUser.name || 'Funcionário',
            truckId: truckId,
            truckPlate: truck.plate || truck.id,
            truckModel: truck.model || 'Sem modelo',
            routeId: route ? route.id : (delivery ? delivery.routeId || delivery.id : selectedId),
            routeCode: route ? (route.code || route.id) : (delivery ? delivery.code || delivery.id : selectedId),
            selectedType: selectedType,
            targetId: selectedId,
            date: dateStr,
            time: timeStr,
            datetime: now.toISOString(),
            createdAt: now.toISOString()
        };

        // Salvar no localStorage
        const moments = JSON.parse(localStorage.getItem('deliveryMoments') || '[]');
        moments.unshift(moment);
        localStorage.setItem('deliveryMoments', JSON.stringify(moments));

        // Processar atualizações de status
        if (selectedType === 'ROUTE') {
            const routeId = selectedId;
            if (type === 'saida') {
                this.updateRouteStatusToInTransit(routeId);
                this.updateRelatedDeliveriesStatusToInTransit(routeId);
            } else if (type === 'entrega') {
                this.updateRouteStatusToDelivered(routeId);
                this.updateRelatedDeliveriesStatus(routeId);
            }
        } else if (selectedType === 'DELIVERY') {
            const deliveryId = selectedId;
            if (type === 'saida') {
                this.updateSingleDeliveryStatus(deliveryId, 'em_percurso');
            } else if (type === 'entrega') {
                this.updateSingleDeliveryStatus(deliveryId, 'entregue');
            }
        }

        // Criar notificação para gestão
        this.createMomentNotification(moment, truck, route || delivery || { id: selectedId, code: selectedId });

        // Atualizar histórico local
        this.renderMomentsHistory();

        // Notificar o dashboard do funcionário se estiver na mesma aba
        if (window.employeeDashboard) {
            if (typeof window.employeeDashboard.loadData === 'function') window.employeeDashboard.loadData();
            if (typeof window.employeeDashboard.renderDashboard === 'function') window.employeeDashboard.renderDashboard();
            if (typeof window.employeeDashboard.loadNotifications === 'function') window.employeeDashboard.loadNotifications();
        }

        // Mostrar mensagem de sucesso
        const typeLabel = type === 'saida' ? 'Saída para entrega' : 'Entrega realizada';
        this.showMessage(`${typeLabel} registrada com sucesso!`, 'success');

        // Log da ação
        this.logAction(`Momento registrado: ${typeLabel} - Caminhão: ${truck.plate || truck.id} - ${selectedType}: ${moment.routeCode}`);
    }

    updateRouteStatusToInTransit(routeId) {
        // Atualizar status da rota para 'em_percurso'
        const routeIndex = this.routes.findIndex(r => r.id === routeId);

        if (routeIndex !== -1) {
            const route = this.routes[routeIndex];
            const previousStatus = route.status;
            route.status = 'em_percurso';

            // Adicionar data de saída se não existir
            if (!route.departureDate) {
                route.departureDate = new Date().toISOString();
            }

            // Salvar no localStorage
            localStorage.setItem('routes', JSON.stringify(this.routes));

            // Disparar evento customizado para notificar outras páginas/abas
            window.dispatchEvent(new CustomEvent('routeStatusUpdated', {
                detail: {
                    routeId: routeId,
                    routeCode: route.code || route.id,
                    status: 'em_percurso',
                    previousStatus: previousStatus,
                    departureDate: route.departureDate
                }
            }));

            // Disparar evento customizado para atualizar na mesma aba
            window.dispatchEvent(new CustomEvent('localStorageUpdated', {
                detail: {
                    key: 'routes',
                    value: this.routes
                }
            }));

            this.showMessage(`Rota ${route.code || route.id} atualizada para "Em Percurso"!`, 'success');
            console.log(`Rota ${route.code || route.id} atualizada para status: em_percurso`);
        }
    }

    updateRelatedDeliveriesStatusToInTransit(routeId) {
        // Atualizar status de entregas relacionadas à rota para 'em_percurso'
        const route = this.routes.find(r => r.id === routeId);
        if (!route) return;

        // Buscar entregas que podem estar relacionadas à rota
        let updatedCount = 0;

        this.deliveries.forEach((delivery, index) => {
            // Verificar se a entrega está relacionada à rota
            const isRelated =
                delivery.routeId === routeId ||
                String(delivery.routeId) === String(routeId) ||
                delivery.routeCode === route.code ||
                delivery.code === route.code ||
                (delivery.metadata && delivery.metadata.routeId === routeId);

            // Atualizar apenas se não estiver entregue ou concluída
            if (isRelated && delivery.status !== 'entregue' && delivery.status !== 'concluida') {
                const previousStatus = this.deliveries[index].status;
                this.deliveries[index].status = 'em_percurso';

                // Adicionar data de saída se não existir
                if (!this.deliveries[index].departureDate) {
                    this.deliveries[index].departureDate = new Date().toISOString();
                }

                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            // Salvar no localStorage
            localStorage.setItem('deliveries', JSON.stringify(this.deliveries));

            // Disparar evento customizado para notificar outras páginas/abas
            window.dispatchEvent(new CustomEvent('deliveryStatusUpdated', {
                detail: {
                    routeId: routeId,
                    status: 'em_percurso',
                    updatedCount: updatedCount
                }
            }));

            // Disparar evento customizado para atualizar na mesma aba
            window.dispatchEvent(new CustomEvent('localStorageUpdated', {
                detail: {
                    key: 'deliveries',
                    value: this.deliveries
                }
            }));

            this.showMessage(`${updatedCount} entrega(s) relacionada(s) atualizada(s) para "Em Percurso"!`, 'success');
            console.log(`${updatedCount} entrega(s) relacionada(s) atualizada(s) para status: em_percurso`);
        }
    }

    updateRouteStatusToDelivered(routeId) {
        // Atualizar status da rota para 'entregue'
        const routeIndex = this.routes.findIndex(r => r.id === routeId);

        if (routeIndex !== -1) {
            const route = this.routes[routeIndex];
            route.status = 'entregue';

            // Adicionar data de entrega se não existir
            if (!route.deliveryDate) {
                route.deliveryDate = new Date().toISOString();
            }

            // Salvar no localStorage
            localStorage.setItem('routes', JSON.stringify(this.routes));

            // Disparar evento customizado para notificar outras páginas/abas
            window.dispatchEvent(new CustomEvent('routeStatusUpdated', {
                detail: {
                    routeId: routeId,
                    routeCode: route.code || route.id,
                    status: 'entregue',
                    deliveryDate: route.deliveryDate
                }
            }));

            // Disparar evento customizado para atualizar na mesma aba
            window.dispatchEvent(new CustomEvent('localStorageUpdated', {
                detail: {
                    key: 'routes',
                    value: this.routes
                }
            }));

            console.log(`Rota ${route.code || route.id} atualizada para status: entregue`);
        }
    }

    updateRelatedDeliveriesStatus(routeId) {
        // ... (existing code logic remains similar)
        let updatedCount = 0;
        this.deliveries.forEach((delivery, index) => {
            const isRelated = delivery.routeId === routeId || String(delivery.routeId) === String(routeId);
            if (isRelated && delivery.status !== 'entregue' && delivery.status !== 'concluida') {
                this.deliveries[index].status = 'entregue';
                if (!this.deliveries[index].deliveryDate) this.deliveries[index].deliveryDate = new Date().toISOString();
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            localStorage.setItem('deliveries', JSON.stringify(this.deliveries));
            window.dispatchEvent(new CustomEvent('deliveryStatusUpdated', { detail: { routeId: routeId, updatedCount: updatedCount } }));
            window.dispatchEvent(new CustomEvent('localStorageUpdated', { detail: { key: 'deliveries', value: this.deliveries } }));
        }
    }

    updateSingleDeliveryStatus(deliveryId, status) {
        const index = this.deliveries.findIndex(d => String(d.id) === String(deliveryId) || String(d.code) === String(deliveryId));
        if (index !== -1) {
            this.deliveries[index].status = status;
            if (status === 'em_percurso' && !this.deliveries[index].departureDate) {
                this.deliveries[index].departureDate = new Date().toISOString();
            } else if (status === 'entregue' && !this.deliveries[index].deliveryDate) {
                this.deliveries[index].deliveryDate = new Date().toISOString();
            }

            localStorage.setItem('deliveries', JSON.stringify(this.deliveries));

            // Disparar eventos
            window.dispatchEvent(new CustomEvent('deliveryStatusUpdated', {
                detail: { deliveryId: deliveryId, status: status }
            }));
            window.dispatchEvent(new CustomEvent('localStorageUpdated', {
                detail: { key: 'deliveries', value: this.deliveries }
            }));

            console.log(`Entrega ${deliveryId} atualizada para: ${status}`);
        }
    }

    createMomentNotification(moment, truck, route) {
        // Carregar notificações existentes
        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');

        const typeLabel = moment.type === 'saida' ? 'Saiu para Entrega' : 'Entregou';

        const notification = {
            id: 'NOTIF-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            type: 'entrega',
            title: `${typeLabel} - ${moment.employeeName}`,
            message: `Motorista ${moment.employeeName} ${moment.type === 'saida' ? 'saiu para entrega' : 'realizou a entrega'}.\nCaminhão: ${truck.plate || truck.id}\nRota: ${route.code || route.id}\nData: ${moment.date} às ${moment.time}`,
            priority: moment.type === 'saida' ? 'media' : 'alta',
            read: false,
            createdAt: new Date().toISOString(),
            relatedId: moment.id,
            relatedType: 'delivery_moment',
            metadata: {
                momentType: moment.type,
                employeeId: moment.employeeId,
                employeeName: moment.employeeName,
                truckId: moment.truckId,
                truckPlate: moment.truckPlate,
                routeId: moment.routeId,
                routeCode: moment.routeCode,
                date: moment.date,
                time: moment.time
            }
        };

        notifications.unshift(notification);
        localStorage.setItem('notifications', JSON.stringify(notifications));
    }

    renderMomentsHistory() {
        const historyList = document.getElementById('momentsHistoryList');
        if (!historyList) return;

        // Carregar momentos do dia atual
        const allMoments = JSON.parse(localStorage.getItem('deliveryMoments') || '[]');
        const today = new Date().toLocaleDateString('pt-BR');

        // Filtrar momentos do funcionário logado do dia atual
        const todayMoments = allMoments.filter(moment => {
            const momentDate = moment.date || new Date(moment.createdAt).toLocaleDateString('pt-BR');
            const isToday = momentDate === today;
            const isEmployee = moment.employeeId === this.currentUser.id ||
                String(moment.employeeId) === String(this.currentUser.id);
            return isToday && isEmployee;
        });

        // Ordenar por data/hora (mais recente primeiro)
        todayMoments.sort((a, b) => {
            const dateA = new Date(a.datetime || a.createdAt);
            const dateB = new Date(b.datetime || b.createdAt);
            return dateB - dateA;
        });

        if (todayMoments.length === 0) {
            historyList.innerHTML = `
                <div class="empty-moments">
                    <i class="fas fa-clock"></i>
                    <p>Nenhum registro hoje</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = todayMoments.map(moment => {
            const truck = this.trucks.find(t => t.id === moment.truckId);
            const route = this.routes.find(r => r.id === moment.routeId);

            const truckDisplay = truck ? `${truck.plate || truck.id} - ${truck.model || ''}` : moment.truckPlate || 'N/A';
            const routeDisplay = route ? (route.code || route.id) : moment.routeCode || 'N/A';

            return `
                <div class="moment-item ${moment.type}">
                    <div class="moment-info">
                        <div class="moment-type ${moment.type}">
                            <i class="fas ${moment.type === 'saida' ? 'fa-sign-out-alt' : 'fa-check-circle'}"></i>
                            <span class="moment-type-label">${moment.type === 'saida' ? 'Saiu para Entrega' : 'Entregou'}</span>
                        </div>
                        <div class="moment-details">
                            <div class="moment-detail-item">
                                <i class="fas fa-truck"></i>
                                <span>${truckDisplay}</span>
                            </div>
                            <div class="moment-detail-item">
                                <i class="fas fa-route"></i>
                                <span>${routeDisplay}</span>
                            </div>
                        </div>
                    </div>
                    <div class="moment-time">
                        <div class="moment-time-date">${moment.date}</div>
                        <div class="moment-time-hour">${moment.time}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    registerMoment(event) {
        if (event) {
            event.preventDefault();
        }
    }

    showMessage(message, type = 'info') {
        // Criar elemento de mensagem
        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: ${type === 'success' ? '#2ed573' : type === 'error' ? '#ff4757' : '#4a90e2'};
            color: white;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            font-weight: 600;
            animation: slideInRight 0.3s ease;
        `;
        messageEl.textContent = message;

        document.body.appendChild(messageEl);

        setTimeout(() => {
            messageEl.style.animation = 'slideOutRight 0.3s ease';
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
        localStorage.setItem('employeeLogs', JSON.stringify(logs));
    }

    logout() {
        if (confirm('Deseja realmente sair?')) {
            sessionStorage.removeItem('currentEmployee');
            window.location.href = './login.html';
        }
    }
}

// Inicializar quando a página carregar
const momentsManager = new MomentsManager();


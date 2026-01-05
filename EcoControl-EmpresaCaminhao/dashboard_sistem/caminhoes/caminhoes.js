// Sistema de Gerenciamento de Caminhões
class TruckManager {
    constructor() {
        this.currentUser = null;
        this.theme = 'light'; // Tema claro fixo
        this.trucks = [];
        this.employees = [];
        this.routes = [];
        this.currentFilter = 'all';
        this.selectedEmployees = [];
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadData();
        // Aguardar um pouco para garantir que o DOM está pronto
        setTimeout(() => {
            this.setupEventListeners();
            this.renderStatistics();
            this.renderTrucks();
            this.applyTheme();
        }, 100);
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
            'funcionario': 'Funcionário'
        };
        return roles[role] || role;
    }

    checkPermissions() {
        const adminElements = document.querySelectorAll('.admin-only');
        const managerElements = document.querySelectorAll('.manager-only');
        const employeeElements = document.querySelectorAll('.employee-only');
        
        // Gestor e Desenvolvedor têm acesso completo a tudo
        const canAccessAdmin = ['gestor', 'desenvolvedor'].includes(this.currentUser.role);
        const canAccessManager = ['gestor', 'desenvolvedor', 'atendente'].includes(this.currentUser.role);
        const canAccessEmployee = ['gestor', 'desenvolvedor', 'atendente', 'motorista', 'funcionario'].includes(this.currentUser.role);
        
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

    loadData() {
        this.trucks = JSON.parse(localStorage.getItem('trucks') || '[]');
        this.employees = JSON.parse(localStorage.getItem('employees') || '[]');
        this.routes = JSON.parse(localStorage.getItem('routes') || '[]');
    }

    setupEventListeners() {
        // Theme toggle (se existir)
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Settings modal (se existir)
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.openSettingsModal();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // New truck button
        const newTruckBtn = document.getElementById('newTruckBtn');
        if (newTruckBtn) {
            newTruckBtn.addEventListener('click', () => {
                this.openNewTruckModal();
            });
        } else {
            console.error('Botão newTruckBtn não encontrado!');
        }

        // Request maintenance button
        const requestMaintenanceBtn = document.getElementById('requestMaintenanceBtn');
        if (requestMaintenanceBtn) {
            requestMaintenanceBtn.addEventListener('click', () => {
                this.openMaintenanceModal();
            });
        } else {
            console.error('Botão requestMaintenanceBtn não encontrado!');
        }

        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterTrucks();
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
    }

    setupModalEvents() {
        // Close modals
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal.style.display = 'none';
                if (modal.id === 'newTruckModal' || modal.id === 'editTruckModal') {
                    this.selectedEmployees = [];
                }
            });
        });

        // Cancel buttons
        const cancelTruckBtn = document.getElementById('cancelTruckBtn');
        if (cancelTruckBtn) {
            cancelTruckBtn.addEventListener('click', () => {
                const modal = document.getElementById('newTruckModal');
                if (modal) modal.style.display = 'none';
                this.selectedEmployees = [];
            });
        }

        const cancelMaintenanceBtn = document.getElementById('cancelMaintenanceBtn');
        if (cancelMaintenanceBtn) {
            cancelMaintenanceBtn.addEventListener('click', () => {
                const modal = document.getElementById('maintenanceModal');
                if (modal) modal.style.display = 'none';
            });
        }

        const cancelEditTruckBtn = document.getElementById('cancelEditTruckBtn');
        if (cancelEditTruckBtn) {
            cancelEditTruckBtn.addEventListener('click', () => {
                const modal = document.getElementById('editTruckModal');
                if (modal) modal.style.display = 'none';
                this.selectedEmployees = [];
            });
        }

        // Form submissions
        const newTruckForm = document.getElementById('newTruckForm');
        if (newTruckForm) {
            newTruckForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createTruck();
            });
        }

        const maintenanceForm = document.getElementById('maintenanceForm');
        if (maintenanceForm) {
            maintenanceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createMaintenanceRequest();
            });
        }

        const editTruckForm = document.getElementById('editTruckForm');
        if (editTruckForm) {
            editTruckForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateTruck();
            });
        }

        // Cancel settings button
        const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
        if (cancelSettingsBtn) {
            cancelSettingsBtn.addEventListener('click', () => {
                const modal = document.getElementById('settingsModal');
                if (modal) modal.style.display = 'none';
            });
        }

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
                if (e.target.id === 'newTruckModal' || e.target.id === 'editTruckModal') {
                    this.selectedEmployees = [];
                }
            }
        });
    }

    renderTrucks() {
        const container = document.getElementById('trucksGrid');
        if (!container) {
            console.error('Container trucksGrid não encontrado!');
            return;
        }
        
        const filteredTrucks = this.getFilteredTrucks();
        
        // Atualizar contador de resultados
        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            resultsCount.textContent = filteredTrucks.length;
        }

        if (filteredTrucks.length === 0) {
            // Verificar se é porque não há caminhões ou por causa dos filtros
            const hasTrucks = this.trucks.length > 0;
            const message = hasTrucks 
                ? 'Não há caminhões que correspondam aos filtros selecionados.'
                : 'Nenhum caminhão cadastrado ainda.';
            const suggestion = hasTrucks
                ? 'Tente ajustar os filtros ou a busca para encontrar mais resultados.'
                : 'Clique em "Novo Caminhão" para adicionar o primeiro caminhão.';
            
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-truck"></i>
                    <h3>Nenhum caminhão encontrado</h3>
                    <p>${message}</p>
                    <p style="margin-top: 10px; font-size: 12px; opacity: 0.7;">${suggestion}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredTrucks.map((truck, index) => `
            <div class="truck-card">
                ${truck.image ? `
                    <div class="truck-image-container">
                        <img src="${truck.image}" alt="Foto do ${truck.id}" class="truck-image">
                    </div>
                ` : ''}
                <div class="truck-card-header">
                    <div class="truck-icon">
                        <i class="fas fa-truck"></i>
                    </div>
                    <div class="truck-info">
                        <div class="truck-title-row">
                            <h3>${truck.id}</h3>
                            <div class="truck-status ${truck.status}">${this.getStatusDisplayName(truck.status)}</div>
                        </div>
                        <p>${this.formatPlate(truck.plate)} • ${truck.model}</p>
                    </div>
                </div>
                <div class="truck-card-body">
                    <div class="truck-details">
                        ${truck.cargoDescription ? `
                            <div class="detail-item">
                                <i class="fas fa-info-circle"></i>
                                <span>${truck.cargoDescription}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="truck-metrics">
                        <div class="metric-item">
                            <div class="metric-icon">
                                <i class="fas fa-tachometer-alt"></i>
                            </div>
                            <div class="metric-info">
                                <div class="metric-label">KM Rodados</div>
                                <div class="metric-value">${(truck.mileage || 0).toLocaleString()}</div>
                            </div>
                        </div>
                        ${truck.capacity ? `
                            <div class="metric-item">
                                <div class="metric-icon">
                                    <i class="fas fa-weight-hanging"></i>
                                </div>
                                <div class="metric-info">
                                    <div class="metric-label">Capacidade</div>
                                    <div class="metric-value">${truck.capacity.toLocaleString()} kg</div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="truck-actions">
                        <button class="btn btn-primary" onclick="truckManager.editTruck(${index})">
                            <i class="fas fa-edit"></i>
                            Editar
                        </button>
                        <button class="btn btn-danger" onclick="truckManager.deleteTruck('${truck.id}')">
                            <i class="fas fa-trash"></i>
                            Remover
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getFilteredTrucks() {
        let filtered = this.trucks;
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(truck => {
                return (
                    truck.id.toLowerCase().includes(searchTerm) ||
                    truck.plate.toLowerCase().includes(searchTerm) ||
                    truck.model.toLowerCase().includes(searchTerm) ||
                    (truck.cargoDescription && truck.cargoDescription.toLowerCase().includes(searchTerm))
                );
            });
        }

        // Filter by status
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(truck => truck.status === this.currentFilter);
        }

        return filtered;
    }

    filterTrucks() {
        this.renderTrucks();
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

        this.renderTrucks();
    }

    getStatusDisplayName(status) {
        const statusNames = {
            'disponivel': 'DISPONÍVEL',
            'em_rota': 'EM ROTA',
            'parado': 'PARADO',
            'manutencao': 'EM MANUTENÇÃO'
        };
        return statusNames[status] || status;
    }

    formatPlate(plate) {
        if (!plate) return '';
        // Remove todos os caracteres não alfanuméricos
        const cleanPlate = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        
        // Formato Mercosul: ABCS-9F02 (4 letras + 1 número + 1 letra + 2 números)
        if (cleanPlate.length === 7) {
            return `${cleanPlate.substring(0, 4)}-${cleanPlate.substring(4)}`;
        }
        // Formato antigo: ABC-1234 (3 letras + 4 números)
        else if (cleanPlate.length === 7 && /^[A-Z]{3}[0-9]{4}$/.test(cleanPlate)) {
            return `${cleanPlate.substring(0, 3)}-${cleanPlate.substring(3)}`;
        }
        // Se não corresponder aos formatos, retorna formatado de qualquer forma
        else if (cleanPlate.length >= 4) {
            return `${cleanPlate.substring(0, 4)}-${cleanPlate.substring(4)}`;
        }
        
        return plate;
    }

    openNewTruckModal() {
        const modal = document.getElementById('newTruckModal');
        if (!modal) {
            console.error('Modal newTruckModal não encontrado!');
            return;
        }
        this.selectedEmployees = [];
        const form = document.getElementById('newTruckForm');
        if (form) form.reset();
        modal.style.display = 'block';
    }

    openMaintenanceModal() {
        const modal = document.getElementById('maintenanceModal');
        if (!modal) {
            console.error('Modal maintenanceModal não encontrado!');
            return;
        }
        this.populateTruckSelect('maintenanceTruck');
        const form = document.getElementById('maintenanceForm');
        if (form) form.reset();
        modal.style.display = 'block';
    }

    editTruck(index) {
        const truck = this.trucks[index];
        
        // Populate form
        document.getElementById('editTruckIndex').value = index;
        document.getElementById('editTruckId').value = truck.id;
        document.getElementById('editTruckPlate').value = truck.plate;
        document.getElementById('editTruckModel').value = truck.model;
        document.getElementById('editTruckYear').value = truck.year || '';
        document.getElementById('editTruckCapacity').value = truck.capacity || '';
        document.getElementById('editTruckStatus').value = truck.status;
        document.getElementById('editTruckCargoDescription').value = truck.cargoDescription || '';
        
        // Carregar imagem se existir
        const imagePreview = document.getElementById('editTruckImagePreview');
        const imagePreviewImg = document.getElementById('editTruckImagePreviewImg');
        if (truck.image) {
            imagePreviewImg.src = truck.image;
            imagePreview.style.display = 'block';
        } else {
            imagePreview.style.display = 'none';
        }
        
        this.selectedEmployees = [];
        document.getElementById('editTruckModal').style.display = 'block';
    }


    populateTruckSelect(selectId) {
        const select = document.getElementById(selectId);
        if (!select) {
            console.error(`Select ${selectId} não encontrado!`);
            return;
        }
        
        select.innerHTML = '<option value="">Selecione um caminhão</option>';
        this.trucks.forEach(truck => {
            const option = document.createElement('option');
            option.value = truck.id;
            option.textContent = `${truck.id} - ${this.formatPlate(truck.plate)}`;
            select.appendChild(option);
        });
    }

    createTruck() {
        const formData = new FormData(document.getElementById('newTruckForm'));
        const imagePreview = document.getElementById('newTruckImagePreviewImg');
        
        const truck = {
            id: formData.get('truckId'),
            plate: formData.get('truckPlate'),
            model: formData.get('truckModel'),
            year: parseInt(formData.get('truckYear')) || null,
            capacity: parseInt(formData.get('truckCapacity')) || null,
            mileage: 0,
            status: formData.get('truckStatus'),
            cargoDescription: formData.get('truckCargoDescription') || '',
            image: imagePreview.src || null,
            createdAt: new Date().toISOString()
        };

        // Check if ID already exists
        if (this.trucks.find(t => t.id === truck.id)) {
            alert('Já existe um caminhão com este número de identificação!');
            return;
        }

        this.trucks.push(truck);
        localStorage.setItem('trucks', JSON.stringify(this.trucks));
        
        document.getElementById('newTruckModal').style.display = 'none';
        document.getElementById('newTruckForm').reset();
        document.getElementById('newTruckImagePreview').style.display = 'none';
        this.selectedEmployees = [];
        this.renderTrucks();
        this.renderStatistics();
        
        alert('Caminhão cadastrado com sucesso!');
    }

    updateTruck() {
        const formData = new FormData(document.getElementById('editTruckForm'));
        const index = parseInt(formData.get('editTruckIndex'));
        const oldTruck = this.trucks[index];
        const imagePreview = document.getElementById('editTruckImagePreviewImg');

        const truck = {
            ...oldTruck,
            id: formData.get('editTruckId'),
            plate: formData.get('editTruckPlate'),
            model: formData.get('editTruckModel'),
            year: parseInt(formData.get('editTruckYear')) || null,
            capacity: parseInt(formData.get('editTruckCapacity')) || null,
            mileage: oldTruck.mileage || 0,
            status: formData.get('editTruckStatus'),
            cargoDescription: formData.get('editTruckCargoDescription') || '',
            image: imagePreview.src && imagePreview.src !== 'data:,' ? imagePreview.src : (oldTruck.image || null)
        };

        // Se o status foi alterado para "manutenção", criar manutenção pendente automaticamente
        if (truck.status === 'manutencao' && oldTruck.status !== 'manutencao') {
            this.createAutomaticMaintenance(truck);
        }

        this.trucks[index] = truck;
        localStorage.setItem('trucks', JSON.stringify(this.trucks));

        document.getElementById('editTruckModal').style.display = 'none';
        this.renderTrucks();
        this.renderStatistics();

        alert('Caminhão atualizado com sucesso!');
    }

    createAutomaticMaintenance(truck) {
        const maintenance = {
            id: Date.now().toString(),
            truckId: truck.id,
            type: 'corretiva',
            priority: 'media',
            description: `Caminhão ${truck.id} (${this.formatPlate(truck.plate)}) colocado em manutenção automaticamente`,
            date: new Date().toISOString().split('T')[0],
            cost: 0,
            status: 'pendente',
            requestedBy: this.currentUser.id,
            createdAt: new Date().toISOString(),
            automatic: true
        };

        const maintenanceRequests = JSON.parse(localStorage.getItem('maintenance') || '[]');
        maintenanceRequests.push(maintenance);
        localStorage.setItem('maintenance', JSON.stringify(maintenanceRequests));
        
        console.log(`Manutenção automática criada para o caminhão ${truck.id}`);
    }

    createMaintenanceRequest() {
        const formData = new FormData(document.getElementById('maintenanceForm'));
        const maintenance = {
            id: Date.now().toString(),
            truckId: formData.get('maintenanceTruck'),
            type: formData.get('maintenanceType'),
            priority: formData.get('maintenancePriority'),
            description: formData.get('maintenanceDescription'),
            date: formData.get('maintenanceDate'),
            cost: parseFloat(formData.get('maintenanceCost')) || 0,
            status: 'pendente',
            requestedBy: this.currentUser.id,
            createdAt: new Date().toISOString()
        };

        const maintenanceRequests = JSON.parse(localStorage.getItem('maintenance') || '[]');
        maintenanceRequests.push(maintenance);
        localStorage.setItem('maintenance', JSON.stringify(maintenanceRequests));
        
        document.getElementById('maintenanceModal').style.display = 'none';
        document.getElementById('maintenanceForm').reset();
        
        alert('Solicitação de manutenção enviada com sucesso!');
    }



    deleteTruck(truckId) {
        // Encontrar o caminhão pelo ID
        const truckIndex = this.trucks.findIndex(truck => truck.id === truckId);
        
        if (truckIndex === -1) {
            window.showGlobalInfoModal('Erro', 'Caminhão não encontrado!');
            return;
        }
        
        const truck = this.trucks[truckIndex];
        
        // Confirmar exclusão
        const confirmMessage = `Tem certeza que deseja remover o caminhão ${truck.id} (${this.formatPlate(truck.plate)})?\n\nEsta ação não pode ser desfeita.`;
        
        const self = this;
        window.showGlobalConfirmModal(
            'Excluir Caminhão',
            confirmMessage.replace(/\n/g, '<br>'),
            () => {
                self.executeDeleteTruck(truckId);
            }
        );
        return;
    }
    
    executeDeleteTruck(truckId) {
        // Encontrar o caminhão pelo ID
        const truckIndex = this.trucks.findIndex(truck => truck.id === truckId);
        
        if (truckIndex === -1) {
            window.showGlobalInfoModal('Erro', 'Caminhão não encontrado!');
            return;
        }
        
        const truck = this.trucks[truckIndex];
        
        // Remover caminhão do array
        this.trucks.splice(truckIndex, 1);
        
        // Salvar no localStorage
        localStorage.setItem('trucks', JSON.stringify(this.trucks));
        
        // Re-renderizar a lista
        this.renderTrucks();
        this.renderStatistics();
        
        window.showGlobalInfoModal('Sucesso', `Caminhão ${truck.id} removido com sucesso!`);
    }

    getEmployeeName(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        return employee ? employee.name : 'Não atribuído';
    }

    getRouteName(routeId) {
        const route = this.routes.find(r => r.id === routeId);
        return route ? route.name : routeId;
    }

    getCargoTypeName(cargoType) {
        const cargoTypes = {
            'cimento': 'Cimento',
            'areia': 'Areia',
            'brita': 'Brita',
            'tijolos': 'Tijolos',
            'blocos': 'Blocos',
            'ferro': 'Ferro/Aço',
            'madeira': 'Madeira',
            'misto': 'Misto',
            'outros': 'Outros'
        };
        return cargoTypes[cargoType] || cargoType;
    }

    renderStatistics() {
        // Calcular estatísticas
        const totalTrucks = this.trucks.length;
        const disponivelTrucks = this.trucks.filter(t => t.status === 'disponivel').length;
        const inRouteTrucks = this.trucks.filter(t => t.status === 'em_rota').length;
        const stoppedTrucks = this.trucks.filter(t => t.status === 'parado').length;
        const maintenanceTrucks = this.trucks.filter(t => t.status === 'manutencao').length;
        
        // Atualizar card de status destacado
        const statusDisponivelEl = document.getElementById('statusDisponivelCount');
        const statusEmRotaEl = document.getElementById('statusEmRotaCount');
        const statusParadoEl = document.getElementById('statusParadoCount');
        const statusManutencaoEl = document.getElementById('statusManutencaoCount');
        
        if (statusDisponivelEl) statusDisponivelEl.textContent = disponivelTrucks;
        if (statusEmRotaEl) statusEmRotaEl.textContent = inRouteTrucks;
        if (statusParadoEl) statusParadoEl.textContent = stoppedTrucks;
        if (statusManutencaoEl) statusManutencaoEl.textContent = maintenanceTrucks;
        
        const totalMileage = this.trucks.reduce((sum, truck) => sum + (truck.mileage || 0), 0);
        
        // Atualizar valores
        const totalMileageEl = document.getElementById('totalMileage');
        if (totalMileageEl) {
            totalMileageEl.innerHTML = `
                <span class="value-number">${totalMileage.toLocaleString('pt-BR')}</span>
                <span class="value-unit">km</span>
            `;
        }
        
        // Atualizar rotas ativas (usando routes do localStorage)
        const routes = JSON.parse(localStorage.getItem('routes') || '[]');
        const activeRoutesCount = routes.filter(r => r.status === 'ativa').length;
        const activeRoutesEl = document.getElementById('activeRoutes');
        if (activeRoutesEl) {
            activeRoutesEl.innerHTML = `
                <span class="value-number">${activeRoutesCount}</span>
                <span class="value-unit">rotas</span>
            `;
        }
        
        // Renderizar gráfico de status (gráfico vazio por enquanto)
        this.renderStatusChart({
            disponivel: disponivelTrucks,
            em_rota: inRouteTrucks,
            parado: stoppedTrucks,
            manutencao: maintenanceTrucks
        });
        
        // Renderizar gráfico de quilometragem (gráfico vazio por enquanto)
        this.renderMileageChart();
        
        // Renderizar gráfico de rotas (gráfico vazio por enquanto)
        this.renderRoutesChart();
    }

    renderStatusChart(data) {
        const canvas = document.getElementById('statusChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 70;
        
        // Limpar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Desenhar gráfico vazio (círculo cinza)
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#dee2e6';
        ctx.lineWidth = 20;
        ctx.stroke();
        
        // Texto central
        ctx.fillStyle = '#6c757d';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Aguardando', centerX, centerY - 5);
        ctx.fillText('dados...', centerX, centerY + 10);
        
        // Atualizar legenda
        const legend = document.getElementById('statusLegend');
        if (legend) {
            const statusLabels = {
                'ativo': { label: 'Ativo', color: '#7ED321' },
                'em_rota': { label: 'Em Rota', color: '#4A90E2' },
                'parado': { label: 'Parado', color: '#6c757d' },
                'manutencao': { label: 'Manutenção', color: '#D0021B' }
            };
            
            legend.innerHTML = Object.entries(statusLabels).map(([key, info]) => `
                <div class="legend-item">
                    <div class="legend-color" style="background-color: ${info.color};"></div>
                    <span class="legend-label">${info.label}:</span>
                    <span class="legend-value">${data[key] || 0}</span>
                </div>
            `).join('');
        }
    }

    renderMileageChart() {
        const canvas = document.getElementById('mileageChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Limpar canvas
        ctx.clearRect(0, 0, width, height);
        
        // Desenhar gráfico vazio (linha horizontal)
        ctx.strokeStyle = '#dee2e6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(20, height / 2);
        ctx.lineTo(width - 20, height / 2);
        ctx.stroke();
        
        // Texto
        ctx.fillStyle = '#6c757d';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Gráfico de quilometragem aguardando dados...', width / 2, height / 2);
    }

    renderRoutesChart() {
        const canvas = document.getElementById('routesChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Limpar canvas
        ctx.clearRect(0, 0, width, height);
        
        // Desenhar gráfico vazio (linha horizontal)
        ctx.strokeStyle = '#dee2e6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(20, height / 2);
        ctx.lineTo(width - 20, height / 2);
        ctx.stroke();
        
        // Texto
        ctx.fillStyle = '#6c757d';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Gráfico de rotas aguardando dados...', width / 2, height / 2);
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', 'light');
    }

    toggleTheme() {
        // Tema claro fixo - funcionalidade desabilitada
        this.applyTheme();
    }

    openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            // Preencher dados do perfil
            const profileName = document.getElementById('profileName');
            const profileEmail = document.getElementById('profileEmail');
            const profileRole = document.getElementById('profileRole');
            
            if (profileName && this.currentUser) profileName.value = this.currentUser.name || '';
            if (profileEmail && this.currentUser) profileEmail.value = this.currentUser.email || '';
            if (profileRole && this.currentUser) profileRole.value = this.getRoleDisplayName(this.currentUser.role) || '';
            
            modal.style.display = 'block';
        }
    }

    handleLogout() {
        window.showGlobalConfirmModal(
            'Confirmar Saída',
            'Tem certeza que deseja sair do sistema?',
            () => {
                sessionStorage.clear();
                window.location.href = '../login.html';
            }
        );
    }

    handleImageUpload(event, mode) {
        const file = event.target.files[0];
        if (!file) return;

        // Validar tipo de arquivo
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione apenas arquivos de imagem!');
            event.target.value = '';
            return;
        }

        // Validar tamanho (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 5MB!');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = e.target.result;
            const previewId = mode === 'new' ? 'newTruckImagePreview' : 'editTruckImagePreview';
            const previewImgId = mode === 'new' ? 'newTruckImagePreviewImg' : 'editTruckImagePreviewImg';
            
            const preview = document.getElementById(previewId);
            const previewImg = document.getElementById(previewImgId);
            
            previewImg.src = imageData;
            preview.style.display = 'block';
        };
        reader.onerror = () => {
            alert('Erro ao carregar a imagem. Tente novamente.');
            event.target.value = '';
        };
        reader.readAsDataURL(file);
    }

    removeImage(mode) {
        const previewId = mode === 'new' ? 'newTruckImagePreview' : 'editTruckImagePreview';
        const previewImgId = mode === 'new' ? 'newTruckImagePreviewImg' : 'editTruckImagePreviewImg';
        const inputId = mode === 'new' ? 'truckImage' : 'editTruckImage';
        
        const preview = document.getElementById(previewId);
        const previewImg = document.getElementById(previewImgId);
        const input = document.getElementById(inputId);
        
        previewImg.src = '';
        preview.style.display = 'none';
        input.value = '';
    }

}

// Inicializar gerenciador de caminhões
let truckManager;
document.addEventListener('DOMContentLoaded', () => {
    truckManager = new TruckManager();
});

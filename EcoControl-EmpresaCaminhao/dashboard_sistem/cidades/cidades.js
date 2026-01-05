// Sistema de Gerenciamento de Cidades
class CityManager {
    constructor() {
        this.currentUser = null;
        this.theme = 'light'; // Tema claro fixo
        this.cities = [];
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadData();
        this.setupEventListeners();
        this.renderCities();
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

    async loadData() {
        try {
            const response = await fetch('/api/cities', {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.cities = data.cities || [];
            } else {
                console.error('Erro ao carregar cidades:', response.statusText);
                // Fallback para localStorage
                const localCities = localStorage.getItem('cities');
                this.cities = localCities ? JSON.parse(localCities) : [];
            }
        } catch (error) {
            console.error('Erro ao carregar cidades:', error);
            // Fallback para localStorage
            const localCities = localStorage.getItem('cities');
            this.cities = localCities ? JSON.parse(localCities) : [];
        }
        
        // Salvar no localStorage como backup
        if (this.cities.length > 0) {
            localStorage.setItem('cities', JSON.stringify(this.cities));
        }
        
        this.updateStatistics();
        this.populateStateFilter();
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

        // New city button
        document.getElementById('newCityBtn').addEventListener('click', () => {
            this.openNewCityModal();
        });

        // Search input
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterCities();
        });

        // Filter selects
        const filterStatus = document.getElementById('filterStatus');
        const filterState = document.getElementById('filterState');
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        
        if (filterStatus) {
            filterStatus.addEventListener('change', () => {
                this.filterCities();
            });
        }
        
        if (filterState) {
            filterState.addEventListener('change', () => {
                this.filterCities();
            });
        }
        
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }

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
        document.getElementById('cancelCityBtn').addEventListener('click', () => {
            document.getElementById('newCityModal').style.display = 'none';
        });

        document.getElementById('cancelEditCityBtn').addEventListener('click', () => {
            document.getElementById('editCityModal').style.display = 'none';
        });

        // Form submissions
        document.getElementById('newCityForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createCity();
        });

        document.getElementById('editCityForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateCity();
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        // CEP formatting
        document.getElementById('cityCep').addEventListener('input', (e) => {
            this.formatCep(e.target);
        });

        document.getElementById('editCityCep').addEventListener('input', (e) => {
            this.formatCep(e.target);
        });
    }

    formatCep(input) {
        let value = input.value.replace(/\D/g, '');
        value = value.replace(/^(\d{5})(\d)/, '$1-$2');
        input.value = value;
    }

    renderCities() {
        const container = document.getElementById('citiesGrid');
        const filteredCities = this.getFilteredCities();

        if (filteredCities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-map-marker-alt"></i>
                    <h3>Nenhuma cidade encontrada</h3>
                    <p>Não há cidades que correspondam aos filtros selecionados.</p>
                    ${this.cities.length > 0 ? '<button class="btn btn-primary" onclick="cityManager.clearFilters()">Limpar Filtros</button>' : ''}
                </div>
            `;
            return;
        }

        container.innerHTML = filteredCities.map((city, index) => {
            const originalIndex = this.cities.findIndex(c => c.id === city.id);
            return `
            <div class="city-card">
                <div class="city-card-header">
                    <div class="city-icon">
                        <i class="fas fa-map-marker-alt"></i>
                    </div>
                    <div class="city-info">
                        <h3>${city.name}</h3>
                        <div class="city-location">
                            <span class="city-state">${city.state}</span>
                            ${city.cep ? `<span class="city-cep">${city.cep}</span>` : ''}
                            ${city.region ? `<span class="city-region">${this.getRegionName(city.region)}</span>` : ''}
                        </div>
                        <div class="city-status ${city.status}">${city.status === 'ativa' ? 'Ativa' : 'Inativa'}</div>
                    </div>
                </div>
                <div class="city-card-body">
                    <div class="city-details">
                        ${city.latitude && city.longitude ? `
                        <div class="detail-item">
                            <i class="fas fa-globe"></i>
                            <span>Coordenadas: ${city.latitude}, ${city.longitude}</span>
                        </div>
                        ` : ''}
                        ${city.population ? `
                        <div class="detail-item">
                            <i class="fas fa-users"></i>
                            <span>População: ${city.population.toLocaleString('pt-BR')} hab.</span>
                        </div>
                        ` : ''}
                        ${city.area ? `
                        <div class="detail-item">
                            <i class="fas fa-map"></i>
                            <span>Área: ${city.area.toLocaleString('pt-BR', {minimumFractionDigits: 2})} km²</span>
                        </div>
                        ` : ''}
                        ${city.timezone ? `
                        <div class="detail-item">
                            <i class="fas fa-clock"></i>
                            <span>Fuso: ${city.timezone}</span>
                        </div>
                        ` : ''}
                        ${city.description ? `
                        <div class="detail-item description-item">
                            <i class="fas fa-info-circle"></i>
                            <span>${city.description}</span>
                        </div>
                        ` : ''}
                    </div>
                    <div class="city-actions">
                        <button class="btn btn-primary" onclick="cityManager.editCity(${originalIndex})" title="Editar cidade">
                            <i class="fas fa-edit"></i>
                            Editar
                        </button>
                        <button class="btn ${city.status === 'ativa' ? 'btn-warning' : 'btn-success'}" 
                                onclick="cityManager.toggleCityStatus(${originalIndex})" 
                                title="${city.status === 'ativa' ? 'Desativar' : 'Ativar'} cidade">
                            <i class="fas fa-${city.status === 'ativa' ? 'pause' : 'play'}"></i>
                            ${city.status === 'ativa' ? 'Desativar' : 'Ativar'}
                        </button>
                        <button class="btn btn-danger" onclick="cityManager.deleteCity('${city.id || originalIndex}')" title="Remover cidade">
                            <i class="fas fa-trash"></i>
                            Remover
                        </button>
                    </div>
                </div>
            </div>
        `;
        }).join('');
    }

    getFilteredCities() {
        let filtered = [...this.cities];
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const statusFilter = document.getElementById('filterStatus').value;
        const stateFilter = document.getElementById('filterState').value;

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(city => 
                city.name.toLowerCase().includes(searchTerm) ||
                city.state.toLowerCase().includes(searchTerm) ||
                (city.cep && city.cep.includes(searchTerm)) ||
                (city.description && city.description.toLowerCase().includes(searchTerm))
            );
        }

        // Filter by status
        if (statusFilter) {
            filtered = filtered.filter(city => city.status === statusFilter);
        }

        // Filter by state
        if (stateFilter) {
            filtered = filtered.filter(city => city.state === stateFilter);
        }

        return filtered;
    }

    filterCities() {
        this.renderCities();
        this.updateStatistics();
    }

    clearFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('filterStatus').value = '';
        document.getElementById('filterState').value = '';
        this.filterCities();
    }

    updateStatistics() {
        const total = this.cities.length;
        const active = this.cities.filter(c => c.status === 'ativa').length;
        const inactive = this.cities.filter(c => c.status === 'inativa').length;
        const states = new Set(this.cities.map(c => c.state).filter(Boolean)).size;

        const totalEl = document.getElementById('totalCities');
        const activeEl = document.getElementById('activeCities');
        const inactiveEl = document.getElementById('inactiveCities');
        const statesEl = document.getElementById('totalStates');
        
        if (totalEl) totalEl.textContent = total;
        if (activeEl) activeEl.textContent = active;
        if (inactiveEl) inactiveEl.textContent = inactive;
        if (statesEl) statesEl.textContent = states;
    }

    populateStateFilter() {
        const stateSelect = document.getElementById('filterState');
        if (!stateSelect) return;
        
        const states = [...new Set(this.cities.map(c => c.state).filter(Boolean))].sort();
        
        // Manter a opção "Todos os Estados"
        const firstOption = stateSelect.querySelector('option');
        if (firstOption) {
            stateSelect.innerHTML = '';
            stateSelect.appendChild(firstOption);
            
            states.forEach(state => {
                const option = document.createElement('option');
                option.value = state;
                option.textContent = state;
                stateSelect.appendChild(option);
            });
        }
    }

    openNewCityModal() {
        document.getElementById('newCityModal').style.display = 'block';
    }

    editCity(index) {
        const city = this.cities[index];
        
        // Populate form
        document.getElementById('editCityIndex').value = index;
        document.getElementById('editCityName').value = city.name;
        document.getElementById('editCityState').value = city.state;
        document.getElementById('editCityCep').value = city.cep || '';
        document.getElementById('editCityStatus').value = city.status;
        document.getElementById('editCityLatitude').value = city.latitude || '';
        document.getElementById('editCityLongitude').value = city.longitude || '';
        document.getElementById('editCityPopulation').value = city.population || '';
        document.getElementById('editCityArea').value = city.area || '';
        document.getElementById('editCityRegion').value = city.region || '';
        document.getElementById('editCityTimezone').value = city.timezone || 'UTC-3';
        document.getElementById('editCityDescription').value = city.description || '';
        document.getElementById('editCityNotes').value = city.notes || '';
        
        document.getElementById('editCityModal').style.display = 'block';
    }

    getRegionName(region) {
        const regions = {
            'norte': 'Norte',
            'nordeste': 'Nordeste',
            'centro-oeste': 'Centro-Oeste',
            'sudeste': 'Sudeste',
            'sul': 'Sul'
        };
        return regions[region] || region;
    }

    async toggleCityStatus(index) {
        const city = this.cities[index];
        const newStatus = city.status === 'ativa' ? 'inativa' : 'ativa';
        const confirmMessage = newStatus === 'ativa' ?
            `Tem certeza que deseja ativar a cidade ${city.name}?` :
            `Tem certeza que deseja desativar a cidade ${city.name}?`;

        const self = this;
        window.showGlobalConfirmModal(
            newStatus === 'ativa' ? 'Ativar Cidade' : 'Desativar Cidade',
            confirmMessage.replace(/\n/g, '<br>'),
            async () => {
                await self.executeToggleCityStatus(city, index, newStatus);
            }
        );
        return;
    }
    
    async executeToggleCityStatus(city, index, newStatus) {
        try {
            const response = await fetch(`/api/cities/${city.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                },
                body: JSON.stringify({ ...city, status: newStatus })
            });

            if (response.ok) {
                const result = await response.json();
                this.cities[index] = result.city || { ...city, status: newStatus };
            } else {
                // Fallback: atualizar localmente
                this.cities[index] = { ...city, status: newStatus };
            }
            
            localStorage.setItem('cities', JSON.stringify(this.cities));
            this.updateStatistics();
            this.renderCities();
            const statusText = newStatus === 'ativa' ? 'ativada' : 'desativada';
            window.showGlobalInfoModal('Sucesso', `Cidade ${statusText} com sucesso!`);
        } catch (error) {
            console.error('Erro ao alterar status:', error);
            // Fallback: atualizar localmente
            this.cities[index] = { ...city, status: newStatus };
            localStorage.setItem('cities', JSON.stringify(this.cities));
            this.updateStatistics();
            this.renderCities();
            window.showGlobalInfoModal('Informação', 'Status alterado localmente!');
        }
    }

    async createCity() {
        const formData = new FormData(document.getElementById('newCityForm'));
        const cityData = {
            id: `CITY-${Date.now()}`,
            name: formData.get('cityName'),
            state: formData.get('cityState'),
            cep: formData.get('cityCep'),
            status: formData.get('cityStatus'),
            latitude: formData.get('cityLatitude') || null,
            longitude: formData.get('cityLongitude') || null,
            population: formData.get('cityPopulation') ? parseInt(formData.get('cityPopulation')) : null,
            area: formData.get('cityArea') ? parseFloat(formData.get('cityArea')) : null,
            region: formData.get('cityRegion') || null,
            timezone: formData.get('cityTimezone') || 'UTC-3',
            description: formData.get('cityDescription') || '',
            notes: formData.get('cityNotes') || '',
            createdAt: new Date().toISOString()
        };

        try {
            const response = await fetch('/api/cities', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                },
                body: JSON.stringify(cityData)
            });

            if (response.ok) {
                const result = await response.json();
                this.cities.push(result.city || cityData);
            } else {
                // Fallback: salvar localmente
                this.cities.push(cityData);
            }
            
            localStorage.setItem('cities', JSON.stringify(this.cities));
            document.getElementById('newCityModal').style.display = 'none';
            document.getElementById('newCityForm').reset();
            this.updateStatistics();
            this.populateStateFilter();
            this.renderCities();
            alert('Cidade cadastrada com sucesso!');
        } catch (error) {
            console.error('Erro ao criar cidade:', error);
            // Fallback: salvar localmente
            this.cities.push(cityData);
            localStorage.setItem('cities', JSON.stringify(this.cities));
            this.updateStatistics();
            this.populateStateFilter();
            this.renderCities();
            alert('Cidade cadastrada localmente!');
        }
    }

    async updateCity() {
        const formData = new FormData(document.getElementById('editCityForm'));
        const index = parseInt(formData.get('editCityIndex'));
        const oldCity = this.cities[index];
        const cityId = oldCity.id;

        const cityData = {
            ...oldCity,
            name: formData.get('editCityName'),
            state: formData.get('editCityState'),
            cep: formData.get('editCityCep'),
            status: formData.get('editCityStatus'),
            latitude: formData.get('editCityLatitude') || null,
            longitude: formData.get('editCityLongitude') || null,
            population: formData.get('editCityPopulation') ? parseInt(formData.get('editCityPopulation')) : null,
            area: formData.get('editCityArea') ? parseFloat(formData.get('editCityArea')) : null,
            region: formData.get('editCityRegion') || null,
            timezone: formData.get('editCityTimezone') || 'UTC-3',
            description: formData.get('editCityDescription') || '',
            notes: formData.get('editCityNotes') || '',
            updatedAt: new Date().toISOString()
        };

        try {
            const response = await fetch(`/api/cities/${cityId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                },
                body: JSON.stringify(cityData)
            });

            if (response.ok) {
                const result = await response.json();
                this.cities[index] = result.city || cityData;
            } else {
                // Fallback: atualizar localmente
                this.cities[index] = cityData;
            }
            
            localStorage.setItem('cities', JSON.stringify(this.cities));
            document.getElementById('editCityModal').style.display = 'none';
            this.updateStatistics();
            this.populateStateFilter();
            this.renderCities();
            alert('Cidade atualizada com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar cidade:', error);
            // Fallback: atualizar localmente
            this.cities[index] = cityData;
            localStorage.setItem('cities', JSON.stringify(this.cities));
            this.updateStatistics();
            this.populateStateFilter();
            this.renderCities();
            alert('Cidade atualizada localmente!');
        }
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

    async deleteCity(cityId) {
        // Encontrar a cidade pelo ID ou índice
        let cityIndex = this.cities.findIndex(city => city.id === cityId);
        
        // Se não encontrou por ID, tenta usar como índice
        if (cityIndex === -1 && !isNaN(cityId)) {
            cityIndex = parseInt(cityId);
        }

        if (cityIndex === -1 || cityIndex >= this.cities.length) {
            window.showGlobalInfoModal('Erro', 'Cidade não encontrada!');
            return;
        }

        const city = this.cities[cityIndex];

        // Confirmar exclusão
        const confirmMessage = `Tem certeza que deseja remover a cidade ${city.name} (${city.state})?\n\nEsta ação não pode ser desfeita.`;

        const self = this;
        window.showGlobalConfirmModal(
            'Excluir Cidade',
            confirmMessage.replace(/\n/g, '<br>'),
            async () => {
                await self.executeDeleteCity(city, cityIndex);
            }
        );
        return;
    }
    
    async executeDeleteCity(city, cityIndex) {
        try {
            if (city.id) {
                const response = await fetch(`/api/cities/${city.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    console.warn('Erro ao remover no servidor, removendo localmente');
                }
            }
            
            // Remover cidade do array (sempre, mesmo se a API falhar)
            this.cities.splice(cityIndex, 1);
            localStorage.setItem('cities', JSON.stringify(this.cities));
            
            // Re-renderizar a lista
            this.updateStatistics();
            this.populateStateFilter();
            this.renderCities();

            window.showGlobalInfoModal('Sucesso', `Cidade ${city.name} removida com sucesso!`);
        } catch (error) {
            console.error('Erro ao remover cidade:', error);
            // Remover localmente mesmo em caso de erro
            this.cities.splice(cityIndex, 1);
            localStorage.setItem('cities', JSON.stringify(this.cities));
            this.updateStatistics();
            this.populateStateFilter();
            this.renderCities();
            window.showGlobalInfoModal('Informação', 'Cidade removida localmente!');
        }
    }

    openSettingsModal() {
        // Implementar modal de configurações se necessário
        window.showGlobalInfoModal('Informação', 'Configurações em desenvolvimento');
    }
}

// Inicializar gerenciador de cidades
let cityManager;
document.addEventListener('DOMContentLoaded', () => {
    cityManager = new CityManager();
});

// Sistema de Dashboard
class Dashboard {
    constructor() {
        this.currentUser = null;
        this.theme = 'light';
        this.charts = {};
        this.init();
    }

    init() {
        this.hideLoginLoading();
        this.checkAuth();
        this.setupEventListeners();
        this.loadDashboardData();
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

        // Gestor, Desenvolvedor e Atendente podem ver Administração
        // Motorista e funcionário NÃO podem ver
        const canAccessAdmin = ['gestor', 'desenvolvedor', 'atendente'].includes(this.currentUser.role);
        const canAccessManager = ['gestor', 'desenvolvedor', 'atendente'].includes(this.currentUser.role);
        const canAccessEmployee = ['gestor', 'desenvolvedor', 'atendente', 'motorista', 'funcionario'].includes(this.currentUser.role);

        adminElements.forEach(element => {
            element.style.display = canAccessAdmin ? 'block' : 'none';
        });

        managerElements.forEach(element => {
            element.style.display = canAccessManager ? 'block' : 'none';
        });

        employeeElements.forEach(element => {
            element.style.display = canAccessEmployee ? 'block' : 'none';
        });
    }

    setupEventListeners() {
        const closeBtn = document.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeSettingsModal();
            });
        }

        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSettingsModal();
            });
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('settingsModal');
            if (e.target === modal) {
                this.closeSettingsModal();
            }
        });
    }

    loadDashboardData() {
        this.loadDeliveries();
        this.loadTrucks();
        this.loadEmployees();
        this.loadCustomers();
        this.renderCharts();
    }

    loadDeliveries() {
        const deliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
        
        const total = deliveries.length;
        const delivered = deliveries.filter(d => d.status === 'entregue').length;
        const inTransit = deliveries.filter(d => d.status === 'em_percurso').length;
        const loading = deliveries.filter(d => d.status === 'em_carregamento').length;
        
        // Calcular receitas
        const totalRevenue = deliveries.reduce((sum, d) => {
            return sum + (d.finalValue || d.totalValue || 0);
        }, 0);
        
        // Receita do mês atual
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthRevenue = deliveries
            .filter(d => {
                if (!d.deliveryDate) return false;
                const date = new Date(d.deliveryDate);
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            })
            .reduce((sum, d) => sum + (d.finalValue || d.totalValue || 0), 0);
        
        // Entregas hoje
        const today = new Date().toLocaleDateString('pt-BR');
        const todayDeliveries = deliveries.filter(d => {
            if (!d.deliveryDate) return false;
            return new Date(d.deliveryDate).toLocaleDateString('pt-BR') === today;
        }).length;
        
        // Taxa de entrega (entregues / total)
        const deliveryRate = total > 0 ? ((delivered / total) * 100).toFixed(1) : 0;
        
        // Média por entrega
        const avgDeliveryValue = total > 0 ? (totalRevenue / total) : 0;
        
        // Atualizar cards
        document.getElementById('totalDeliveries').textContent = total;
        document.getElementById('deliveriesStatus').textContent = `${delivered} entregues`;
        document.getElementById('totalRevenue').textContent = `R$ ${totalRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('monthRevenue').textContent = `Este mês: R$ ${monthRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('deliveryRate').textContent = `${deliveryRate}%`;
        document.getElementById('avgDeliveryValue').textContent = `R$ ${avgDeliveryValue.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('todayDeliveries').textContent = todayDeliveries;
        document.getElementById('inTransitCount').textContent = inTransit;
        
        // Últimas entregas
        this.displayRecentDeliveries(deliveries);
        
        // Top cidades
        this.displayTopCities(deliveries);
        
        // Dados para gráficos
        this.deliveriesData = {
            total,
            delivered,
            inTransit,
            loading,
            totalRevenue,
            monthRevenue,
            deliveries
        };
    }

    loadTrucks() {
        const trucks = JSON.parse(localStorage.getItem('trucks') || '[]');
        const activeTrucks = trucks.filter(truck => truck.status === 'ativo' || truck.status === 'em_rota');
        
        document.getElementById('totalTrucks').textContent = trucks.length;
        document.getElementById('activeTrucks').textContent = `${activeTrucks.length} ativos`;
        
        this.displayTrucksInOperation(activeTrucks);
        
        this.trucksData = trucks;
    }

    loadEmployees() {
        const employees = JSON.parse(localStorage.getItem('employees') || '[]');
        const drivers = employees.filter(emp => emp.role === 'motorista' || emp.role === 'driver');
        
        document.getElementById('totalEmployees').textContent = employees.length;
        document.getElementById('driversCount').textContent = `${drivers.length} motoristas`;
    }

    loadCustomers() {
        const customers = JSON.parse(localStorage.getItem('customers') || '[]');
        document.getElementById('totalCustomers').textContent = customers.length;
    }

    displayRecentDeliveries(deliveries) {
        const container = document.getElementById('recentDeliveries');
        const recent = deliveries
            .sort((a, b) => {
                const dateA = new Date(b.deliveryDate || b.scheduledDate || 0);
                const dateB = new Date(a.deliveryDate || a.scheduledDate || 0);
                return dateA - dateB;
            })
            .slice(0, 5);
        
        if (recent.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box"></i>
                    <p>Nenhuma entrega registrada</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = recent.map(delivery => {
            const statusClass = {
                'entregue': 'delivered',
                'em_percurso': 'in-transit',
                'em_carregamento': 'loading'
            }[delivery.status] || 'pending';
            
            const statusText = {
                'entregue': 'Entregue',
                'em_percurso': 'Em Percurso',
                'em_carregamento': 'Em Carregamento'
            }[delivery.status] || delivery.status;
            
            const date = delivery.deliveryDate || delivery.scheduledDate;
            const dateText = date ? new Date(date).toLocaleDateString('pt-BR') : '-';
            const value = delivery.finalValue || delivery.totalValue || 0;
            
            return `
                <div class="delivery-item">
                    <div class="delivery-info">
                        <div class="delivery-code">${delivery.trackingCode}</div>
                        <div class="delivery-details">
                            <span>${delivery.customerName || 'Cliente não informado'}</span>
                            <span class="delivery-date">${dateText}</span>
                        </div>
                    </div>
                    <div class="delivery-meta">
                        <span class="delivery-value">R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    displayTrucksInOperation(trucks) {
        const container = document.getElementById('trucksInOperation');
        
        if (trucks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-truck"></i>
                    <p>Nenhum caminhão em operação</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = trucks.slice(0, 5).map(truck => `
            <div class="truck-item">
                <div class="truck-icon">
                    <i class="fas fa-truck"></i>
                </div>
                <div class="truck-info">
                    <div class="truck-id">${truck.id}</div>
                    <div class="truck-plate">${truck.plate} • ${truck.model || ''}</div>
                </div>
                <div class="status-badge ${truck.status === 'ativo' ? 'active' : 'route'}">
                    ${truck.status === 'ativo' ? 'Ativo' : 'Em Rota'}
                </div>
            </div>
        `).join('');
    }

    displayTopCities(deliveries) {
        const container = document.getElementById('topCities');
        
        const cityCounts = {};
        deliveries.forEach(delivery => {
            const city = delivery.destinationCity || 'Não informado';
            cityCounts[city] = (cityCounts[city] || 0) + 1;
        });
        
        const topCities = Object.entries(cityCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        if (topCities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-map-marked-alt"></i>
                    <p>Sem dados disponíveis</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = topCities.map(([city, count]) => `
            <div class="city-item">
                <div class="city-name">${city}</div>
                <div class="city-count">${count} ${count === 1 ? 'entrega' : 'entregas'}</div>
            </div>
        `).join('');
    }

    renderCharts() {
        this.renderDeliveriesStatusChart();
        this.renderRevenueChart();
        this.renderTrucksStatusChart();
        this.renderDeliveriesByMonthChart();
    }

    renderDeliveriesStatusChart() {
        const canvas = document.getElementById('deliveriesStatusChart');
        if (!canvas || !this.deliveriesData) return;
        
        const ctx = canvas.getContext('2d');
        const data = this.deliveriesData;
        
        if (this.charts.deliveriesStatus) {
            this.charts.deliveriesStatus.destroy();
        }
        
        this.charts.deliveriesStatus = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Entregues', 'Em Percurso', 'Em Carregamento'],
                datasets: [{
                    data: [data.delivered, data.inTransit, data.loading],
                    backgroundColor: ['#7ED321', '#4A90E2', '#F5A623'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
        
        // Atualizar legenda
        const legend = document.getElementById('deliveriesStatusLegend');
        if (legend) {
            legend.innerHTML = `
                <div class="legend-item">
                    <div class="legend-color" style="background-color: #7ED321;"></div>
                    <span>Entregues: ${data.delivered}</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background-color: #4A90E2;"></div>
                    <span>Em Percurso: ${data.inTransit}</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background-color: #F5A623;"></div>
                    <span>Em Carregamento: ${data.loading}</span>
                </div>
            `;
        }
    }

    renderRevenueChart() {
        const canvas = document.getElementById('revenueChart');
        if (!canvas || !this.deliveriesData) return;
        
        const ctx = canvas.getContext('2d');
        const deliveries = this.deliveriesData.deliveries;
        
        // Calcular receitas dos últimos 6 meses
        const months = [];
        const revenues = [];
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const month = date.getMonth();
            const year = date.getFullYear();
            
            const monthRevenue = deliveries
                .filter(d => {
                    if (!d.deliveryDate) return false;
                    const dDate = new Date(d.deliveryDate);
                    return dDate.getMonth() === month && dDate.getFullYear() === year;
                })
                .reduce((sum, d) => sum + (d.finalValue || d.totalValue || 0), 0);
            
            months.push(`${monthNames[month]}/${year.toString().slice(-2)}`);
            revenues.push(monthRevenue);
        }
        
        if (this.charts.revenue) {
            this.charts.revenue.destroy();
        }
        
        this.charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Receita (R$)',
                    data: revenues,
                    borderColor: '#4A90E2',
                    backgroundColor: 'rgba(74, 144, 226, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toLocaleString('pt-BR');
                            }
                        }
                    }
                }
            }
        });
    }

    renderTrucksStatusChart() {
        const canvas = document.getElementById('trucksStatusChart');
        if (!canvas || !this.trucksData) return;
        
        const ctx = canvas.getContext('2d');
        const trucks = this.trucksData;
        
        const statusCounts = {
            'ativo': trucks.filter(t => t.status === 'ativo').length,
            'em_rota': trucks.filter(t => t.status === 'em_rota').length,
            'parado': trucks.filter(t => t.status === 'parado').length,
            'manutencao': trucks.filter(t => t.status === 'manutencao').length
        };
        
        if (this.charts.trucksStatus) {
            this.charts.trucksStatus.destroy();
        }
        
        this.charts.trucksStatus = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Ativo', 'Em Rota', 'Parado', 'Manutenção'],
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: ['#7ED321', '#4A90E2', '#888888', '#D0021B'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
        
        // Atualizar legenda
        const legend = document.getElementById('trucksStatusLegend');
        if (legend) {
            legend.innerHTML = `
                <div class="legend-item">
                    <div class="legend-color" style="background-color: #7ED321;"></div>
                    <span>Ativo: ${statusCounts.ativo}</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background-color: #4A90E2;"></div>
                    <span>Em Rota: ${statusCounts.em_rota}</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background-color: #888888;"></div>
                    <span>Parado: ${statusCounts.parado}</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background-color: #D0021B;"></div>
                    <span>Manutenção: ${statusCounts.manutencao}</span>
                </div>
            `;
        }
    }

    renderDeliveriesByMonthChart() {
        const canvas = document.getElementById('deliveriesByMonthChart');
        if (!canvas || !this.deliveriesData) return;
        
        const ctx = canvas.getContext('2d');
        const deliveries = this.deliveriesData.deliveries;
        
        // Calcular entregas dos últimos 6 meses
        const months = [];
        const counts = [];
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const month = date.getMonth();
            const year = date.getFullYear();
            
            const monthCount = deliveries.filter(d => {
                const dDate = new Date(d.deliveryDate || d.scheduledDate);
                return dDate.getMonth() === month && dDate.getFullYear() === year;
            }).length;
            
            months.push(`${monthNames[month]}/${year.toString().slice(-2)}`);
            counts.push(monthCount);
        }
        
        if (this.charts.deliveriesByMonth) {
            this.charts.deliveriesByMonth.destroy();
        }
        
        this.charts.deliveriesByMonth = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Entregas',
                    data: counts,
                    backgroundColor: '#4A90E2',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', 'light');
    }

    openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'block';
            if (this.currentUser) {
                document.getElementById('profileName').value = this.currentUser.name || '';
                document.getElementById('profileEmail').value = this.currentUser.email || '';
                document.getElementById('profileRole').value = this.getRoleDisplayName(this.currentUser.role) || '';
            }
        }
    }

    closeSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    saveSettingsModal() {
        // Salvar configurações se necessário
        this.closeSettingsModal();
    }

    logout() {
        sessionStorage.removeItem('currentUser');
        window.location.href = '../login.html';
    }

    hideLoginLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
    }
}

// Inicializar dashboard quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});

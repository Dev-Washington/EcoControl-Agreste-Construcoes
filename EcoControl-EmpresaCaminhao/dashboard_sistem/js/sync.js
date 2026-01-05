// Sistema de Sincronização de Dados
class DataSync {
    constructor() {
        this.init();
    }

    init() {
        this.syncAllData();
    }

    syncAllData() {
        // Sincronizar dados de caminhões com funcionários
        this.syncTrucksWithEmployees();
        
        // Sincronizar dados de rotas com cidades
        this.syncRoutesWithCities();
        
        // Sincronizar dados de funcionários com caminhões
        this.syncEmployeesWithTrucks();
        
        // Validar integridade dos dados
        this.validateDataIntegrity();
    }

    syncTrucksWithEmployees() {
        const trucks = JSON.parse(localStorage.getItem('trucks') || '[]');
        const employees = JSON.parse(localStorage.getItem('employees') || '[]');
        
        trucks.forEach(truck => {
            if (truck.driver) {
                const driver = employees.find(emp => emp.id === truck.driver);
                if (driver) {
                    // Atualizar funcionário com caminhão atual
                    driver.currentTruck = truck.id;
                    driver.currentRoute = truck.route;
                }
            }
        });
        
        localStorage.setItem('employees', JSON.stringify(employees));
    }

    syncRoutesWithCities() {
        const routes = JSON.parse(localStorage.getItem('routes') || '[]');
        const cities = JSON.parse(localStorage.getItem('cities') || '[]');
        
        routes.forEach(route => {
            if (route.cities && route.cities.length > 0) {
                // Filtrar apenas cidades ativas
                const activeCities = route.cities.filter(cityId => {
                    const city = cities.find(c => c.id === cityId);
                    return city && city.status === 'ativa';
                });
                
                if (activeCities.length !== route.cities.length) {
                    route.cities = activeCities;
                }
            }
        });
        
        localStorage.setItem('routes', JSON.stringify(routes));
    }

    syncEmployeesWithTrucks() {
        const employees = JSON.parse(localStorage.getItem('employees') || '[]');
        const trucks = JSON.parse(localStorage.getItem('trucks') || '[]');
        
        employees.forEach(employee => {
            if (employee.currentTruck) {
                const truck = trucks.find(t => t.id === employee.currentTruck);
                if (truck) {
                    // Sincronizar dados do caminhão com o funcionário
                    truck.driver = employee.id;
                }
            }
        });
        
        localStorage.setItem('trucks', JSON.stringify(trucks));
    }

    validateDataIntegrity() {
        // Validar IDs únicos
        this.validateUniqueIds();
        
        // Validar referências
        this.validateReferences();
        
        // Limpar dados órfãos
        this.cleanOrphanedData();
    }

    validateUniqueIds() {
        const dataTypes = ['trucks', 'employees', 'cities', 'routes', 'users'];
        
        dataTypes.forEach(type => {
            const data = JSON.parse(localStorage.getItem(type) || '[]');
            const ids = data.map(item => item.id);
            const uniqueIds = [...new Set(ids)];
            
            if (ids.length !== uniqueIds.length) {
                console.warn(`IDs duplicados encontrados em ${type}`);
                // Remover duplicatas
                const cleanedData = data.filter((item, index) => 
                    ids.indexOf(item.id) === index
                );
                localStorage.setItem(type, JSON.stringify(cleanedData));
            }
        });
    }

    validateReferences() {
        const trucks = JSON.parse(localStorage.getItem('trucks') || '[]');
        const employees = JSON.parse(localStorage.getItem('employees') || '[]');
        const routes = JSON.parse(localStorage.getItem('routes') || '[]');
        const cities = JSON.parse(localStorage.getItem('cities') || '[]');
        
        // Validar referências de motoristas
        trucks.forEach(truck => {
            if (truck.driver) {
                const driver = employees.find(emp => emp.id === truck.driver);
                if (!driver) {
                    truck.driver = '';
                    console.warn(`Motorista não encontrado para caminhão ${truck.id}`);
                }
            }
        });
        
        // Validar referências de rotas
        trucks.forEach(truck => {
            if (truck.route) {
                const route = routes.find(r => r.id === truck.route);
                if (!route) {
                    truck.route = '';
                    console.warn(`Rota não encontrada para caminhão ${truck.id}`);
                }
            }
        });
        
        // Validar referências de cidades nas rotas
        routes.forEach(route => {
            if (route.cities) {
                route.cities = route.cities.filter(cityId => {
                    const city = cities.find(c => c.id === cityId);
                    return city !== undefined;
                });
            }
        });
        
        localStorage.setItem('trucks', JSON.stringify(trucks));
        localStorage.setItem('routes', JSON.stringify(routes));
    }

    cleanOrphanedData() {
        // Limpar solicitações antigas (mais de 30 dias)
        const requests = JSON.parse(localStorage.getItem('accessRequests') || '[]');
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const cleanedRequests = requests.filter(request => {
            const requestDate = new Date(request.createdAt);
            return requestDate > thirtyDaysAgo;
        });
        
        if (cleanedRequests.length !== requests.length) {
            localStorage.setItem('accessRequests', JSON.stringify(cleanedRequests));
            console.log(`Removidas ${requests.length - cleanedRequests.length} solicitações antigas`);
        }
    }

    // Método para forçar sincronização
    forceSync() {
        this.syncAllData();
        console.log('Sincronização forçada concluída');
    }

    // Método para exportar todos os dados
    exportAllData() {
        const data = {
            trucks: JSON.parse(localStorage.getItem('trucks') || '[]'),
            employees: JSON.parse(localStorage.getItem('employees') || '[]'),
            cities: JSON.parse(localStorage.getItem('cities') || '[]'),
            routes: JSON.parse(localStorage.getItem('routes') || '[]'),
            users: JSON.parse(localStorage.getItem('users') || '[]'),
            accessRequests: JSON.parse(localStorage.getItem('accessRequests') || '[]'),
            maintenance: JSON.parse(localStorage.getItem('maintenance') || '[]'),
            adminSettings: JSON.parse(localStorage.getItem('adminSettings') || '{}'),
            permissions: JSON.parse(localStorage.getItem('permissions') || '{}'),
            userPreferences: JSON.parse(localStorage.getItem('userPreferences') || '{}'),
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `agreste_construcao_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    // Método para importar dados
    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Validar estrutura dos dados
                if (this.validateImportedData(data)) {
                    // Importar dados
                    Object.keys(data).forEach(key => {
                        if (key !== 'exportDate' && typeof data[key] === 'object') {
                            localStorage.setItem(key, JSON.stringify(data[key]));
                        }
                    });
                    
                    // Sincronizar dados importados
                    this.syncAllData();
                    
                    alert('Dados importados com sucesso!');
                    // Recarregar página para aplicar mudanças
                    window.location.reload();
                } else {
                    alert('Arquivo de dados inválido!');
                }
            } catch (error) {
                alert('Erro ao importar dados: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    validateImportedData(data) {
        const requiredKeys = ['trucks', 'employees', 'cities', 'routes', 'users'];
        return requiredKeys.every(key => Array.isArray(data[key]));
    }
}

// Inicializar sincronização quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new DataSync();
});

// Disponibilizar globalmente para uso em outras páginas
window.DataSync = DataSync;

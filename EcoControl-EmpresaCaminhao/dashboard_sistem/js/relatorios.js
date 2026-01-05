// Sistema de Geração de Relatórios
class ReportGenerator {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Adicionar botões de relatório ao dashboard se existirem
        const reportButtons = document.querySelectorAll('[data-report]');
        reportButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reportType = e.currentTarget.dataset.report;
                this.generateReport(reportType);
            });
        });
    }

    generateReport(type) {
        switch (type) {
            case 'trucks':
                this.generateTruckReport();
                break;
            case 'employees':
                this.generateEmployeeReport();
                break;
            case 'routes':
                this.generateRouteReport();
                break;
            case 'cities':
                this.generateCityReport();
                break;
            case 'maintenance':
                this.generateMaintenanceReport();
                break;
            case 'summary':
                this.generateSummaryReport();
                break;
            default:
                console.log('Tipo de relatório não reconhecido:', type);
        }
    }

    generateTruckReport() {
        const trucks = JSON.parse(localStorage.getItem('trucks') || '[]');
        const employees = JSON.parse(localStorage.getItem('employees') || '[]');
        const maintenance = JSON.parse(localStorage.getItem('maintenance') || '[]');
        
        const reportData = trucks.map(truck => {
            const driver = employees.find(emp => emp.id === truck.driver);
            // Buscar manutenções relacionadas a este caminhão
            const truckMaintenances = maintenance.filter(m => m.truckId === truck.id);
            const inMaintenance = truck.status === 'manutencao';
            const lastMaintenance = truckMaintenances.length > 0 
                ? truckMaintenances.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0]
                : null;
            
            let maintenanceInfo = 'Não';
            if (inMaintenance && lastMaintenance) {
                maintenanceInfo = `Sim - ${this.getMaintenanceTypeDisplayName(lastMaintenance.type)}: ${lastMaintenance.description || 'Sem descrição'}`;
            } else if (inMaintenance) {
                maintenanceInfo = 'Sim - Sem detalhes';
            } else if (lastMaintenance) {
                maintenanceInfo = `Não (última: ${this.getMaintenanceTypeDisplayName(lastMaintenance.type)})`;
            }
            
            return {
                'ID do Caminhão': truck.id,
                'Placa': truck.plate,
                'Modelo': truck.model,
                'Ano': truck.year || '-',
                'Capacidade (kg)': truck.capacity || '-',
                'Quilometragem (km)': truck.mileage ? truck.mileage.toLocaleString('pt-BR') + ' km' : '0 km',
                'Combustível (L)': truck.fuel || 0,
                'Status': this.getStatusDisplayName(truck.status),
                'Em Manutenção': inMaintenance ? 'Sim' : 'Não',
                'Informações de Manutenção': maintenanceInfo,
                'Motorista': driver ? driver.name : 'Não atribuído',
                'Rota': truck.route || 'Não atribuída',
                'Data de Cadastro': truck.createdAt ? new Date(truck.createdAt).toLocaleDateString('pt-BR') : '-'
            };
        });

        this.exportToExcel(reportData, 'Relatorio_Caminhoes');
    }

    generateCityReport() {
        const cities = JSON.parse(localStorage.getItem('cities') || '[]');
        const reportData = cities.map(city => ({
            'Nome da Cidade': city.name,
            'Estado': city.state,
            'CEP': city.cep || '-',
            'Status': city.status === 'ativa' ? 'Ativa' : (city.status === 'inativa' ? 'Inativa' : '-'),
            'Descrição': city.description || '-',
            'Data de Cadastro': city.createdAt ? new Date(city.createdAt).toLocaleDateString('pt-BR') : '-'
        }));

        this.exportToExcel(reportData, 'Relatorio_Cidades');
    }

    generateEmployeeReport() {
        const employees = JSON.parse(localStorage.getItem('employees') || '[]');
        const trucks = JSON.parse(localStorage.getItem('trucks') || '[]');
        
        const reportData = employees.map(employee => {
            const assignedTruck = trucks.find(truck => truck.driver === employee.id);
            return {
                'Nome': employee.name,
                'Email': employee.email,
                'Telefone': employee.phone || '-',
                'Cargo': this.getRoleDisplayName(employee.role),
                'CPF': employee.cpf || '-',
                'Data de Nascimento': employee.birthDate ? new Date(employee.birthDate).toLocaleDateString('pt-BR') : '-',
                'Data de Contratação': employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('pt-BR') : '-',
                'Status': employee.status === 'active' ? 'Ativo' : 'Inativo',
                'Caminhão Atribuído': assignedTruck ? `${assignedTruck.id} - ${assignedTruck.plate}` : 'Não atribuído',
                'Data de Cadastro': employee.createdAt ? new Date(employee.createdAt).toLocaleDateString('pt-BR') : '-'
            };
        });

        this.exportToExcel(reportData, 'Relatorio_Funcionarios');
    }

    generateRouteReport() {
        const routes = JSON.parse(localStorage.getItem('routes') || '[]');
        const cities = JSON.parse(localStorage.getItem('cities') || '[]');
        
        const reportData = routes.map(route => {
            const routeCities = cities.filter(city => route.cities && route.cities.includes(city.id));
            return {
                'Nome da Rota': route.name,
                'Descrição': route.description || '-',
                'Distância (km)': route.distance || 0,
                'Tempo Estimado (h)': route.time || 0,
                'Pontos de Coleta': route.points || 0,
                'Número de Cidades': route.cities ? route.cities.length : 0,
                'Cidades': routeCities.map(city => `${city.name}/${city.state}`).join(', ') || 'Nenhuma',
                'Status': route.status === 'ativa' ? 'Ativa' : 'Inativa',
                'Data de Criação': route.createdAt ? new Date(route.createdAt).toLocaleDateString('pt-BR') : '-'
            };
        });

        this.exportToExcel(reportData, 'Relatorio_Rotas');
    }

    generateMaintenanceReport() {
        const maintenance = JSON.parse(localStorage.getItem('maintenance') || '[]');
        const trucks = JSON.parse(localStorage.getItem('trucks') || '[]');
        const employees = JSON.parse(localStorage.getItem('employees') || '[]');
        
        const reportData = maintenance.map(maintenanceItem => {
            const truck = trucks.find(t => t.id === maintenanceItem.truckId);
            const requester = employees.find(emp => emp.id === maintenanceItem.requestedBy);
            return {
                'ID da Manutenção': maintenanceItem.id,
                'Caminhão': truck ? `${truck.id} - ${truck.plate}` : maintenanceItem.truckId,
                'Tipo': this.getMaintenanceTypeDisplayName(maintenanceItem.type),
                'Prioridade': this.getPriorityDisplayName(maintenanceItem.priority),
                'Descrição': maintenanceItem.description,
                'Data Prevista': maintenanceItem.date ? new Date(maintenanceItem.date).toLocaleDateString('pt-BR') : '-',
                'Custo Estimado': maintenanceItem.cost ? `R$ ${maintenanceItem.cost.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '-',
                'Status': this.getMaintenanceStatusDisplayName(maintenanceItem.status),
                'Solicitado por': requester ? requester.name : 'Sistema',
                'Data de Solicitação': maintenanceItem.createdAt ? new Date(maintenanceItem.createdAt).toLocaleDateString('pt-BR') : '-'
            };
        });

        this.exportToExcel(reportData, 'Relatorio_Manutencoes');
    }

    generateSummaryReport() {
        const trucks = JSON.parse(localStorage.getItem('trucks') || '[]');
        const employees = JSON.parse(localStorage.getItem('employees') || '[]');
        const routes = JSON.parse(localStorage.getItem('routes') || '[]');
        const cities = JSON.parse(localStorage.getItem('cities') || '[]');
        const maintenance = JSON.parse(localStorage.getItem('maintenance') || '[]');

        // Estatísticas gerais
        const totalTrucks = trucks.length;
        const activeTrucks = trucks.filter(t => t.status === 'ativo' || t.status === 'em_rota').length;
        const totalEmployees = employees.length;
        const activeEmployees = employees.filter(e => e.status === 'active').length;
        const totalRoutes = routes.length;
        const activeRoutes = routes.filter(r => r.status === 'ativa').length;
        const totalCities = cities.length;
        const activeCities = cities.filter(c => c.status === 'ativa').length;
        const pendingMaintenance = maintenance.filter(m => m.status === 'pendente').length;

        // Quilometragem total
        const totalMileage = trucks.reduce((sum, truck) => sum + (truck.mileage || 0), 0);
        const averageMileage = totalTrucks > 0 ? totalMileage / totalTrucks : 0;

        // Combustível total
        const totalFuel = trucks.reduce((sum, truck) => sum + (truck.fuel || 0), 0);

        const reportData = [
            {
                'Métrica': 'Total de Caminhões',
                'Valor': totalTrucks,
                'Detalhes': `${activeTrucks} ativos`
            },
            {
                'Métrica': 'Total de Funcionários',
                'Valor': totalEmployees,
                'Detalhes': `${activeEmployees} ativos`
            },
            {
                'Métrica': 'Total de Rotas',
                'Valor': totalRoutes,
                'Detalhes': `${activeRoutes} ativas`
            },
            {
                'Métrica': 'Total de Cidades',
                'Valor': totalCities,
                'Detalhes': `${activeCities} ativas`
            },
            {
                'Métrica': 'Manutenções Pendentes',
                'Valor': pendingMaintenance,
                'Detalhes': 'Aguardando atendimento'
            },
            {
                'Métrica': 'Quilometragem Total',
                'Valor': totalMileage.toLocaleString() + ' km',
                'Detalhes': `Média: ${averageMileage.toLocaleString()} km por caminhão`
            },
            {
                'Métrica': 'Combustível Total',
                'Valor': totalFuel.toLocaleString() + ' L',
                'Detalhes': 'Em todos os caminhões'
            },
            {
                'Métrica': 'Data do Relatório',
                'Valor': new Date().toLocaleDateString('pt-BR'),
                'Detalhes': new Date().toLocaleTimeString('pt-BR')
            }
        ];

        this.exportToExcel(reportData, 'Relatorio_Resumo_Geral');
    }

    getStatusDisplayName(status) {
        const statusNames = {
            'ativo': 'Ativo',
            'em_rota': 'Em Rota',
            'parado': 'Parado',
            'manutencao': 'Manutenção'
        };
        return statusNames[status] || status;
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

    getMaintenanceTypeDisplayName(type) {
        const types = {
            'preventiva': 'Preventiva',
            'corretiva': 'Corretiva',
            'emergencial': 'Emergencial',
            'revisao': 'Revisão',
            'troca_oleo': 'Troca de Óleo',
            'pneu': 'Pneu',
            'eletrica': 'Elétrica',
            'mecanica': 'Mecânica'
        };
        return types[type] || type || 'Não especificado';
    }

    getPriorityDisplayName(priority) {
        const priorities = {
            'baixa': 'Baixa',
            'media': 'Média',
            'alta': 'Alta',
            'urgente': 'Urgente'
        };
        return priorities[priority] || priority;
    }

    getMaintenanceStatusDisplayName(status) {
        const statuses = {
            'pendente': 'Pendente',
            'em_andamento': 'Em Andamento',
            'concluida': 'Concluída',
            'cancelada': 'Cancelada'
        };
        return statuses[status] || status;
    }

    exportToExcel(data, filename) {
        if (data.length === 0) {
            alert('Não há dados para gerar o relatório.');
            return;
        }

        const headers = Object.keys(data[0]);

        // Se a biblioteca XLSX estiver disponível, gerar XLSX com auto-ajuste de colunas
        if (typeof window !== 'undefined' && window.XLSX) {
            const aoa = [headers];
            for (const row of data) {
                aoa.push(headers.map(h => row[h] != null ? row[h] : ''));
            }

            const ws = XLSX.utils.aoa_to_sheet(aoa);

            // Auto-ajuste de largura das colunas (em caracteres)
            const colWidths = headers.map((h, i) => {
                const headerWidth = String(h).length;
                const dataWidth = data.reduce((max, row) => {
                    const cell = row[h] != null ? String(row[h]) : '';
                    return Math.max(max, cell.length);
                }, 0);
                return { wch: Math.max(10, Math.min(60, Math.max(headerWidth, dataWidth) + 2)) };
            });
            ws['!cols'] = colWidths;

            const wb = XLSX.utils.book_new();
            const safeName = this.sanitizeFileName(filename).slice(0, 31) || 'Relatorio';
            XLSX.utils.book_append_sheet(wb, ws, safeName);

            const finalName = `${this.sanitizeFileName(filename)}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, finalName);
            alert(`Relatório "${filename}" (XLSX) gerado com sucesso!`);
            return;
        }

        // Fallback: gerar CSV
        let csvContent = headers.join(',') + '\n';
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csvContent += values.join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${this.sanitizeFileName(filename)}_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        alert(`Relatório "${filename}" (CSV) gerado com sucesso!`);
    }

    sanitizeFileName(name) {
        return String(name)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9_\-]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }

    // Método para gerar relatório em PDF (simulação)
    generatePDFReport(type) {
        alert('Funcionalidade de PDF será implementada em versão futura. Por enquanto, use a exportação em Excel.');
    }
}

// Inicializar gerador de relatórios
let reportGenerator;
document.addEventListener('DOMContentLoaded', () => {
    reportGenerator = new ReportGenerator();
});

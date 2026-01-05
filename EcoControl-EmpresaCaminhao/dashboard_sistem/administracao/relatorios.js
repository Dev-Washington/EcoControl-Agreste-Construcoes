// Sistema de Relatórios
class ReportsManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadData();
        this.setupEventListeners();
        this.renderKPIs();
        this.renderCharts();
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
        this.deliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
        this.employees = JSON.parse(localStorage.getItem('employees') || '[]');
        this.trucks = JSON.parse(localStorage.getItem('trucks') || '[]');
        this.customers = JSON.parse(localStorage.getItem('customers') || '[]');
        
        if (!Array.isArray(this.deliveries)) this.deliveries = [];
        if (!Array.isArray(this.employees)) this.employees = [];
        if (!Array.isArray(this.trucks)) this.trucks = [];
        if (!Array.isArray(this.customers)) this.customers = [];
    }

    setupEventListeners() {
        // Botões de gerar relatório
        document.querySelectorAll('[data-report-type]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reportType = e.currentTarget.dataset.reportType;
                const format = e.currentTarget.dataset.format || 'print';
                this.generateReport(reportType, format);
            });
        });

        // Filtros
        const periodSelect = document.getElementById('reportPeriod');
        if (periodSelect) {
            periodSelect.addEventListener('change', (e) => {
                if (e.target.value === 'custom') {
                    document.getElementById('customDateRange').style.display = 'block';
                    document.getElementById('customDateRangeEnd').style.display = 'block';
                } else {
                    document.getElementById('customDateRange').style.display = 'none';
                    document.getElementById('customDateRangeEnd').style.display = 'none';
                }
            });
        }

        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.applyFilters();
            });
        }

        // Modal de relatório personalizado
        const openAdvancedBtn = document.getElementById('openAdvancedReportBtn');
        if (openAdvancedBtn) {
            openAdvancedBtn.addEventListener('click', () => {
                this.openAdvancedReportModal();
            });
        }

        const cancelAdvancedBtn = document.getElementById('cancelAdvancedReportBtn');
        if (cancelAdvancedBtn) {
            cancelAdvancedBtn.addEventListener('click', () => {
                document.getElementById('advancedReportModal').style.display = 'none';
            });
        }

        const advancedForm = document.getElementById('advancedReportForm');
        if (advancedForm) {
            advancedForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.generateAdvancedReport();
            });
        }

        // Fechar modais
        document.querySelectorAll('.close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }

    generateReport(type, format) {
        switch(type) {
            case 'deliveries':
                this.generateDeliveriesReport(format);
                break;
            case 'employees':
                this.generateEmployeesReport(format);
                break;
            case 'trucks':
                this.generateTrucksReport(format);
                break;
            case 'financial':
                this.generateFinancialReport(format);
                break;
            default:
                alert('Tipo de relatório não reconhecido');
        }
    }

    // Exportação em Excel
    exportAsExcel(data, filename) {
        if (typeof XLSX === 'undefined') {
            alert('Biblioteca XLSX não carregada. Usando CSV como alternativa.');
            this.exportAsCSV(data, filename);
            return;
        }

        try {
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
            XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
            this.logAction(`Relatório exportado como Excel: ${filename}`);
        } catch (error) {
            console.error('Erro ao exportar Excel:', error);
            alert('Erro ao exportar Excel. Tente novamente.');
        }
    }

    exportAsCSV(data, filename) {
        if (!data || data.length === 0) {
            alert('Não há dados para exportar.');
            return;
        }

        const headers = Object.keys(data[0]);
        let csvContent = headers.join(',') + '\n';
        
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value || '';
            });
            csvContent += values.join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    generateDeliveriesReport(format = 'print') {
        const totalDeliveries = this.deliveries.length;
        const delivered = this.deliveries.filter(d => d.status === 'entregue').length;
        const pending = this.deliveries.filter(d => d.status === 'pendente').length;
        const inTransit = this.deliveries.filter(d => d.status === 'em_transito').length;
        const cancelled = this.deliveries.filter(d => d.status === 'cancelada').length;
        
        const totalValue = this.deliveries.reduce((sum, d) => {
            const value = parseFloat(d.totalValue) || 0;
            const discount = parseFloat(d.discount) || 0;
            return sum + (value - discount);
        }, 0);

        const reportContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Relatório de Entregas</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #4A90E2; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #4A90E2; color: white; }
                    .summary { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
                    .summary-item { margin: 10px 0; }
                </style>
            </head>
            <body>
                <h1>Relatório de Entregas - Agreste Construção</h1>
                <p>Data de geração: ${new Date().toLocaleString('pt-BR')}</p>
                
                <div class="summary">
                    <h2>Resumo</h2>
                    <div class="summary-item"><strong>Total de Entregas:</strong> ${totalDeliveries}</div>
                    <div class="summary-item"><strong>Entregues:</strong> ${delivered}</div>
                    <div class="summary-item"><strong>Pendentes:</strong> ${pending}</div>
                    <div class="summary-item"><strong>Em Trânsito:</strong> ${inTransit}</div>
                    <div class="summary-item"><strong>Canceladas:</strong> ${cancelled}</div>
                    <div class="summary-item"><strong>Valor Total:</strong> R$ ${totalValue.toFixed(2).replace('.', ',')}</div>
                </div>

                <h2>Detalhes das Entregas</h2>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Cliente</th>
                            <th>Destino</th>
                            <th>Status</th>
                            <th>Valor</th>
                            <th>Data</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.deliveries.map(d => `
                            <tr>
                                <td>${d.id || 'N/A'}</td>
                                <td>${d.customerName || 'N/A'}</td>
                                <td>${d.destinationCity || 'N/A'}</td>
                                <td>${this.getStatusName(d.status)}</td>
                                <td>R$ ${((parseFloat(d.totalValue) || 0) - (parseFloat(d.discount) || 0)).toFixed(2).replace('.', ',')}</td>
                                <td>${d.date ? new Date(d.date).toLocaleDateString('pt-BR') : 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        if (format === 'json') {
            this.exportAsJSON(this.getDeliveriesData(), 'relatorio_entregas');
        } else if (format === 'pdf') {
            this.exportAsPDF('Relatório de Entregas', this.getDeliveriesData());
        } else if (format === 'excel') {
            const excelData = this.deliveries.map(d => ({
                'ID': d.id || 'N/A',
                'Cliente': d.customerName || 'N/A',
                'Destino': d.destinationCity || 'N/A',
                'Status': this.getStatusName(d.status),
                'Valor': ((parseFloat(d.totalValue) || 0) - (parseFloat(d.discount) || 0)).toFixed(2),
                'Data': d.date ? new Date(d.date).toLocaleDateString('pt-BR') : 'N/A'
            }));
            this.exportAsExcel(excelData, 'relatorio_entregas');
        } else {
            this.openReportWindow(reportContent, 'Relatório de Entregas');
        }
    }

    getDeliveriesData() {
        const totalDeliveries = this.deliveries.length;
        const delivered = this.deliveries.filter(d => d.status === 'entregue').length;
        const pending = this.deliveries.filter(d => d.status === 'pendente').length;
        const inTransit = this.deliveries.filter(d => d.status === 'em_transito').length;
        const cancelled = this.deliveries.filter(d => d.status === 'cancelada').length;
        
        const totalValue = this.deliveries.reduce((sum, d) => {
            const value = parseFloat(d.totalValue) || 0;
            const discount = parseFloat(d.discount) || 0;
            return sum + (value - discount);
        }, 0);

        return {
            tipo: 'Relatório de Entregas',
            dataGeracao: new Date().toISOString(),
            resumo: {
                total: totalDeliveries,
                entregues: delivered,
                pendentes: pending,
                emTransito: inTransit,
                canceladas: cancelled,
                valorTotal: totalValue
            },
            detalhes: this.deliveries.map(d => ({
                id: d.id || 'N/A',
                cliente: d.customerName || 'N/A',
                destino: d.destinationCity || 'N/A',
                status: this.getStatusName(d.status),
                valor: (parseFloat(d.totalValue) || 0) - (parseFloat(d.discount) || 0),
                data: d.date || 'N/A'
            }))
        };
    }

    generateEmployeesReport(format = 'print') {
        const totalEmployees = this.employees.length;
        const active = this.employees.filter(e => e.status === 'active').length;
        const inactive = this.employees.filter(e => e.status === 'inactive').length;
        
        const byRole = {};
        this.employees.forEach(emp => {
            byRole[emp.role] = (byRole[emp.role] || 0) + 1;
        });

        const reportContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Relatório de Funcionários</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #4A90E2; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #4A90E2; color: white; }
                    .summary { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
                    .summary-item { margin: 10px 0; }
                </style>
            </head>
            <body>
                <h1>Relatório de Funcionários - Agreste Construção</h1>
                <p>Data de geração: ${new Date().toLocaleString('pt-BR')}</p>
                
                <div class="summary">
                    <h2>Resumo</h2>
                    <div class="summary-item"><strong>Total de Funcionários:</strong> ${totalEmployees}</div>
                    <div class="summary-item"><strong>Ativos:</strong> ${active}</div>
                    <div class="summary-item"><strong>Inativos:</strong> ${inactive}</div>
                    <h3>Por Cargo:</h3>
                    ${Object.entries(byRole).map(([role, count]) => 
                        `<div class="summary-item"><strong>${this.getRoleName(role)}:</strong> ${count}</div>`
                    ).join('')}
                </div>

                <h2>Lista de Funcionários</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Cargo</th>
                            <th>Status</th>
                            <th>Telefone</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.employees.map(e => `
                            <tr>
                                <td>${e.name || 'N/A'}</td>
                                <td>${e.email || 'N/A'}</td>
                                <td>${this.getRoleName(e.role)}</td>
                                <td>${e.status === 'active' ? 'Ativo' : 'Inativo'}</td>
                                <td>${e.phone || 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        if (format === 'json') {
            this.exportAsJSON(this.getEmployeesData(), 'relatorio_funcionarios');
        } else if (format === 'pdf') {
            this.exportAsPDF('Relatório de Funcionários', this.getEmployeesData());
        } else if (format === 'excel') {
            const excelData = this.employees.map(e => ({
                'Nome': e.name || 'N/A',
                'Email': e.email || 'N/A',
                'Telefone': e.phone || 'N/A',
                'Cargo': this.getRoleName(e.role),
                'Status': e.status === 'active' ? 'Ativo' : 'Inativo'
            }));
            this.exportAsExcel(excelData, 'relatorio_funcionarios');
        } else {
            this.openReportWindow(reportContent, 'Relatório de Funcionários');
        }
    }

    getEmployeesData() {
        const totalEmployees = this.employees.length;
        const active = this.employees.filter(e => e.status === 'active').length;
        const inactive = this.employees.filter(e => e.status === 'inactive').length;
        
        const byRole = {};
        this.employees.forEach(emp => {
            byRole[emp.role] = (byRole[emp.role] || 0) + 1;
        });

        return {
            tipo: 'Relatório de Funcionários',
            dataGeracao: new Date().toISOString(),
            resumo: {
                total: totalEmployees,
                ativos: active,
                inativos: inactive,
                porCargo: byRole
            },
            detalhes: this.employees.map(e => ({
                nome: e.name || 'N/A',
                email: e.email || 'N/A',
                cargo: this.getRoleName(e.role),
                status: e.status === 'active' ? 'Ativo' : 'Inativo',
                telefone: e.phone || 'N/A'
            }))
        };
    }

    generateTrucksReport(format = 'print') {
        const totalTrucks = this.trucks.length;
        const active = this.trucks.filter(t => t.status === 'ativo').length;
        const inactive = this.trucks.filter(t => t.status === 'inativo').length;
        const maintenance = this.trucks.filter(t => t.status === 'manutencao').length;
        
        // Carregar dados de manutenção
        const maintenanceData = JSON.parse(localStorage.getItem('maintenance') || '[]');

        const reportContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Relatório de Caminhões</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #4A90E2; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #4A90E2; color: white; }
                    .summary { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
                    .summary-item { margin: 10px 0; }
                    .maintenance-info { font-size: 0.9em; color: #666; }
                </style>
            </head>
            <body>
                <h1>Relatório de Caminhões - Agreste Construção</h1>
                <p>Data de geração: ${new Date().toLocaleString('pt-BR')}</p>
                
                <div class="summary">
                    <h2>Resumo</h2>
                    <div class="summary-item"><strong>Total de Caminhões:</strong> ${totalTrucks}</div>
                    <div class="summary-item"><strong>Ativos:</strong> ${active}</div>
                    <div class="summary-item"><strong>Inativos:</strong> ${inactive}</div>
                    <div class="summary-item"><strong>Em Manutenção:</strong> ${maintenance}</div>
                </div>

                <h2>Lista de Caminhões</h2>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Placa</th>
                            <th>Modelo</th>
                            <th>Ano</th>
                            <th>Status</th>
                            <th>Quilometragem</th>
                            <th>Em Manutenção</th>
                            <th>Informações de Manutenção</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.trucks.map(t => {
                            const truckMaintenances = maintenanceData.filter(m => m.truckId === t.id);
                            const inMaintenance = t.status === 'manutencao';
                            const lastMaintenance = truckMaintenances.length > 0 
                                ? truckMaintenances.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0]
                                : null;
                            
                            let maintenanceInfo = 'Não';
                            if (inMaintenance && lastMaintenance) {
                                const maintenanceType = this.getMaintenanceTypeDisplayName(lastMaintenance.type);
                                maintenanceInfo = `Sim - ${maintenanceType}: ${lastMaintenance.description || 'Sem descrição'}`;
                            } else if (inMaintenance) {
                                maintenanceInfo = 'Sim - Sem detalhes';
                            } else if (lastMaintenance) {
                                const maintenanceType = this.getMaintenanceTypeDisplayName(lastMaintenance.type);
                                maintenanceInfo = `Não (última: ${maintenanceType})`;
                            }
                            
                            return `
                            <tr>
                                <td>${t.id || 'N/A'}</td>
                                <td>${t.plate || 'N/A'}</td>
                                <td>${t.model || 'N/A'}</td>
                                <td>${t.year || 'N/A'}</td>
                                <td>${this.getTruckStatusName(t.status)}</td>
                                <td>${t.mileage ? t.mileage.toLocaleString('pt-BR') + ' km' : '0 km'}</td>
                                <td>${inMaintenance ? 'Sim' : 'Não'}</td>
                                <td class="maintenance-info">${maintenanceInfo}</td>
                            </tr>
                        `;
                        }).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        if (format === 'json') {
            this.exportAsJSON(this.getTrucksData(), 'relatorio_caminhoes');
        } else if (format === 'pdf') {
            this.exportAsPDF('Relatório de Caminhões', this.getTrucksData());
        } else if (format === 'excel') {
            const excelData = this.trucks.map(t => ({
                'ID': t.id || 'N/A',
                'Placa': t.plate || 'N/A',
                'Modelo': t.model || 'N/A',
                'Ano': t.year || 'N/A',
                'Status': this.getTruckStatusName(t.status),
                'Quilometragem': t.mileage ? `${t.mileage.toLocaleString('pt-BR')} km` : '0 km'
            }));
            this.exportAsExcel(excelData, 'relatorio_caminhoes');
        } else {
            this.openReportWindow(reportContent, 'Relatório de Caminhões');
        }
    }

    getTrucksData() {
        const totalTrucks = this.trucks.length;
        const active = this.trucks.filter(t => t.status === 'ativo').length;
        const inactive = this.trucks.filter(t => t.status === 'inativo').length;
        const maintenance = this.trucks.filter(t => t.status === 'manutencao').length;
        
        // Carregar dados de manutenção
        const maintenanceData = JSON.parse(localStorage.getItem('maintenance') || '[]');

        return {
            tipo: 'Relatório de Caminhões',
            dataGeracao: new Date().toISOString(),
            resumo: {
                total: totalTrucks,
                ativos: active,
                inativos: inactive,
                emManutencao: maintenance
            },
            detalhes: this.trucks.map(t => {
                const truckMaintenances = maintenanceData.filter(m => m.truckId === t.id);
                const inMaintenance = t.status === 'manutencao';
                const lastMaintenance = truckMaintenances.length > 0 
                    ? truckMaintenances.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0]
                    : null;
                
                let maintenanceInfo = 'Não';
                if (inMaintenance && lastMaintenance) {
                    const maintenanceType = this.getMaintenanceTypeDisplayName(lastMaintenance.type);
                    maintenanceInfo = `Sim - ${maintenanceType}: ${lastMaintenance.description || 'Sem descrição'}`;
                } else if (inMaintenance) {
                    maintenanceInfo = 'Sim - Sem detalhes';
                } else if (lastMaintenance) {
                    const maintenanceType = this.getMaintenanceTypeDisplayName(lastMaintenance.type);
                    maintenanceInfo = `Não (última: ${maintenanceType})`;
                }
                
                return {
                    id: t.id || 'N/A',
                    placa: t.plate || 'N/A',
                    modelo: t.model || 'N/A',
                    ano: t.year || 'N/A',
                    status: this.getTruckStatusName(t.status),
                    quilometragem: t.mileage ? `${t.mileage.toLocaleString('pt-BR')} km` : '0 km',
                    emManutencao: inMaintenance ? 'Sim' : 'Não',
                    informacoesManutencao: maintenanceInfo
                };
            })
        };
    }

    generateFinancialReport(format = 'print') {
        const totalRevenue = this.deliveries.reduce((sum, d) => {
            const value = parseFloat(d.totalValue) || 0;
            const discount = parseFloat(d.discount) || 0;
            return sum + (value - discount);
        }, 0);

        const deliveredRevenue = this.deliveries
            .filter(d => d.status === 'entregue')
            .reduce((sum, d) => {
                const value = parseFloat(d.totalValue) || 0;
                const discount = parseFloat(d.discount) || 0;
                return sum + (value - discount);
            }, 0);

        const pendingRevenue = this.deliveries
            .filter(d => d.status === 'pendente' || d.status === 'em_transito')
            .reduce((sum, d) => {
                const value = parseFloat(d.totalValue) || 0;
                const discount = parseFloat(d.discount) || 0;
                return sum + (value - discount);
            }, 0);

        const reportContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Relatório Financeiro</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #4A90E2; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #4A90E2; color: white; }
                    .summary { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
                    .summary-item { margin: 10px 0; font-size: 16px; }
                    .positive { color: #7ED321; }
                    .pending { color: #F5A623; }
                </style>
            </head>
            <body>
                <h1>Relatório Financeiro - Agreste Construção</h1>
                <p>Data de geração: ${new Date().toLocaleString('pt-BR')}</p>
                
                <div class="summary">
                    <h2>Resumo Financeiro</h2>
                    <div class="summary-item"><strong>Receita Total:</strong> <span class="positive">R$ ${totalRevenue.toFixed(2).replace('.', ',')}</span></div>
                    <div class="summary-item"><strong>Receita Realizada (Entregues):</strong> <span class="positive">R$ ${deliveredRevenue.toFixed(2).replace('.', ',')}</span></div>
                    <div class="summary-item"><strong>Receita Pendente:</strong> <span class="pending">R$ ${pendingRevenue.toFixed(2).replace('.', ',')}</span></div>
                </div>

                <h2>Entregas por Status</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Quantidade</th>
                            <th>Valor Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.getStatusSummary().map(s => `
                            <tr>
                                <td>${s.status}</td>
                                <td>${s.count}</td>
                                <td>R$ ${s.value.toFixed(2).replace('.', ',')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        if (format === 'json') {
            this.exportAsJSON(this.getFinancialData(), 'relatorio_financeiro');
        } else if (format === 'pdf') {
            this.exportAsPDF('Relatório Financeiro', this.getFinancialData());
        } else if (format === 'excel') {
            const excelData = this.getStatusSummary().map(s => ({
                'Status': s.status,
                'Quantidade': s.count,
                'Valor Total': `R$ ${s.value.toFixed(2).replace('.', ',')}`
            }));
            this.exportAsExcel(excelData, 'relatorio_financeiro');
        } else {
            this.openReportWindow(reportContent, 'Relatório Financeiro');
        }
    }

    getFinancialData() {
        const totalRevenue = this.deliveries.reduce((sum, d) => {
            const value = parseFloat(d.totalValue) || 0;
            const discount = parseFloat(d.discount) || 0;
            return sum + (value - discount);
        }, 0);

        const deliveredRevenue = this.deliveries
            .filter(d => d.status === 'entregue')
            .reduce((sum, d) => {
                const value = parseFloat(d.totalValue) || 0;
                const discount = parseFloat(d.discount) || 0;
                return sum + (value - discount);
            }, 0);

        const pendingRevenue = this.deliveries
            .filter(d => d.status === 'pendente' || d.status === 'em_transito')
            .reduce((sum, d) => {
                const value = parseFloat(d.totalValue) || 0;
                const discount = parseFloat(d.discount) || 0;
                return sum + (value - discount);
            }, 0);

        return {
            tipo: 'Relatório Financeiro',
            dataGeracao: new Date().toISOString(),
            resumo: {
                receitaTotal: totalRevenue,
                receitaRealizada: deliveredRevenue,
                receitaPendente: pendingRevenue
            },
            porStatus: this.getStatusSummary().map(s => ({
                status: s.status,
                quantidade: s.count,
                valorTotal: s.value
            }))
        };
    }

    getStatusSummary() {
        const statusMap = {};
        this.deliveries.forEach(d => {
            const status = this.getStatusName(d.status);
            if (!statusMap[status]) {
                statusMap[status] = { count: 0, value: 0 };
            }
            statusMap[status].count++;
            const value = parseFloat(d.totalValue) || 0;
            const discount = parseFloat(d.discount) || 0;
            statusMap[status].value += (value - discount);
        });

        return Object.entries(statusMap).map(([status, data]) => ({
            status,
            ...data
        }));
    }

    openReportWindow(content, title) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.focus();
        
        // Aguardar carregamento e então imprimir
        setTimeout(() => {
            printWindow.print();
        }, 250);
    }

    getStatusName(status) {
        const statusMap = {
            'pendente': 'Pendente',
            'em_transito': 'Em Trânsito',
            'entregue': 'Entregue',
            'cancelada': 'Cancelada'
        };
        return statusMap[status] || status;
    }

    getRoleName(role) {
        const roleMap = {
            'gestor': 'Gestor',
            'motorista': 'Motorista',
            'funcionario': 'Funcionário',
            'administrador': 'Administrador',
            'desenvolvedor': 'Desenvolvedor'
        };
        return roleMap[role] || role;
    }

    getTruckStatusName(status) {
        const statusMap = {
            'ativo': 'Ativo',
            'inativo': 'Inativo',
            'manutencao': 'Em Manutenção',
            'disponivel': 'Disponível',
            'disponível': 'Disponível'
        };
        return statusMap[status] || status;
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

    exportAsJSON(data, filename) {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.logAction(`Relatório exportado como JSON: ${filename}`);
    }

    exportAsPDF(title, data) {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            let y = 20;
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 20;
            const maxWidth = pageWidth - (margin * 2);

            // Título
            doc.setFontSize(18);
            doc.setTextColor(74, 144, 226);
            doc.text(title, margin, y);
            y += 10;

            // Data de geração
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Data de geração: ${new Date().toLocaleString('pt-BR')}`, margin, y);
            y += 15;

            // Resumo
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text('Resumo', margin, y);
            y += 8;

            doc.setFontSize(10);
            if (data.resumo) {
                Object.entries(data.resumo).forEach(([key, value]) => {
                    if (y > 270) {
                        doc.addPage();
                        y = 20;
                    }
                    const text = `${this.formatKey(key)}: ${this.formatValue(value)}`;
                    doc.text(text, margin + 5, y);
                    y += 7;
                });
            }

            y += 10;

            // Detalhes
            if (data.detalhes && data.detalhes.length > 0) {
                if (y > 250) {
                    doc.addPage();
                    y = 20;
                }
                doc.setFontSize(14);
                doc.text('Detalhes', margin, y);
                y += 8;

                doc.setFontSize(9);
                data.detalhes.slice(0, 20).forEach((item, index) => {
                    if (y > 270) {
                        doc.addPage();
                        y = 20;
                    }
                    Object.entries(item).forEach(([key, value]) => {
                        const text = `${this.formatKey(key)}: ${this.formatValue(value)}`;
                        const lines = doc.splitTextToSize(text, maxWidth - 10);
                        doc.text(lines, margin + 5, y);
                        y += lines.length * 5;
                    });
                    y += 3;
                });

                if (data.detalhes.length > 20) {
                    doc.text(`... e mais ${data.detalhes.length - 20} itens`, margin, y);
                }
            }

            // Salvar PDF
            doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
            this.logAction(`Relatório exportado como PDF: ${title}`);
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            alert('Erro ao gerar PDF. Certifique-se de que a biblioteca jsPDF está carregada.');
        }
    }

    formatKey(key) {
        const keyMap = {
            'total': 'Total',
            'entregues': 'Entregues',
            'pendentes': 'Pendentes',
            'emTransito': 'Em Trânsito',
            'canceladas': 'Canceladas',
            'valorTotal': 'Valor Total',
            'ativos': 'Ativos',
            'inativos': 'Inativos',
            'emManutencao': 'Em Manutenção',
            'receitaTotal': 'Receita Total',
            'receitaRealizada': 'Receita Realizada',
            'receitaPendente': 'Receita Pendente',
            'nome': 'Nome',
            'email': 'Email',
            'cargo': 'Cargo',
            'status': 'Status',
            'telefone': 'Telefone',
            'id': 'ID',
            'cliente': 'Cliente',
            'destino': 'Destino',
            'valor': 'Valor',
            'data': 'Data',
            'placa': 'Placa',
            'modelo': 'Modelo',
            'ano': 'Ano',
            'quilometragem': 'Quilometragem'
        };
        return keyMap[key] || key;
    }

    formatValue(value) {
        if (typeof value === 'number') {
            if (value >= 1000) {
                return `R$ ${value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
            }
            return value.toString();
        }
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
        }
        return value.toString();
    }

    logAction(action) {
        try {
            const user = sessionStorage.getItem('currentUser');
            const userData = user ? JSON.parse(user) : { name: 'Sistema', email: 'system' };
            
            const logs = JSON.parse(localStorage.getItem('systemLogs') || '[]');
            logs.push({
                timestamp: new Date().toISOString(),
                user: userData.name || userData.email || 'Sistema',
                action: action,
                type: 'delivery'
            });

            if (logs.length > 1000) {
                logs.shift();
            }

            localStorage.setItem('systemLogs', JSON.stringify(logs));
        } catch (error) {
            console.error('Erro ao registrar log:', error);
        }
    }

    // Renderizar KPIs
    renderKPIs() {
        const kpisGrid = document.getElementById('kpisGrid');
        if (!kpisGrid) return;

        const totalDeliveries = this.deliveries.length;
        const delivered = this.deliveries.filter(d => d.status === 'entregue').length;
        const totalRevenue = this.deliveries.reduce((sum, d) => {
            const value = parseFloat(d.totalValue) || 0;
            const discount = parseFloat(d.discount) || 0;
            return sum + (value - discount);
        }, 0);
        const activeTrucks = this.trucks.filter(t => t.status === 'ativo' || t.status === 'disponivel').length;
        const totalEmployees = this.employees.filter(e => e.status === 'active').length;
        const pendingMaintenances = JSON.parse(localStorage.getItem('maintenance') || '[]')
            .filter(m => m.status === 'pendente').length;

        const deliveryRate = totalDeliveries > 0 ? ((delivered / totalDeliveries) * 100).toFixed(1) : 0;

        kpisGrid.innerHTML = `
            <div class="kpi-card">
                <div class="kpi-header">
                    <div class="kpi-title">Total de Entregas</div>
                    <div class="kpi-icon info">
                        <i class="fas fa-box"></i>
                    </div>
                </div>
                <div class="kpi-value">${totalDeliveries}</div>
                <div class="kpi-change positive">
                    <i class="fas fa-arrow-up"></i>
                    ${delivered} entregues
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-header">
                    <div class="kpi-title">Receita Total</div>
                    <div class="kpi-icon positive">
                        <i class="fas fa-dollar-sign"></i>
                    </div>
                </div>
                <div class="kpi-value">R$ ${totalRevenue.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}</div>
                <div class="kpi-change positive">
                    <i class="fas fa-chart-line"></i>
                    Receita acumulada
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-header">
                    <div class="kpi-title">Taxa de Entrega</div>
                    <div class="kpi-icon ${deliveryRate >= 80 ? 'positive' : 'warning'}">
                        <i class="fas fa-percentage"></i>
                    </div>
                </div>
                <div class="kpi-value">${deliveryRate}%</div>
                <div class="kpi-change ${deliveryRate >= 80 ? 'positive' : 'negative'}">
                    <i class="fas fa-${deliveryRate >= 80 ? 'check' : 'exclamation'}"></i>
                    ${deliveryRate >= 80 ? 'Bom desempenho' : 'Atenção necessária'}
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-header">
                    <div class="kpi-title">Caminhões Ativos</div>
                    <div class="kpi-icon info">
                        <i class="fas fa-truck"></i>
                    </div>
                </div>
                <div class="kpi-value">${activeTrucks}</div>
                <div class="kpi-change">
                    <i class="fas fa-info-circle"></i>
                    De ${this.trucks.length} total
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-header">
                    <div class="kpi-title">Funcionários Ativos</div>
                    <div class="kpi-icon info">
                        <i class="fas fa-users"></i>
                    </div>
                </div>
                <div class="kpi-value">${totalEmployees}</div>
                <div class="kpi-change">
                    <i class="fas fa-info-circle"></i>
                    Total de funcionários
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-header">
                    <div class="kpi-title">Manutenções Pendentes</div>
                    <div class="kpi-icon ${pendingMaintenances > 0 ? 'danger' : 'positive'}">
                        <i class="fas fa-wrench"></i>
                    </div>
                </div>
                <div class="kpi-value">${pendingMaintenances}</div>
                <div class="kpi-change ${pendingMaintenances > 0 ? 'negative' : 'positive'}">
                    <i class="fas fa-${pendingMaintenances > 0 ? 'exclamation-triangle' : 'check'}"></i>
                    ${pendingMaintenances > 0 ? 'Atenção necessária' : 'Tudo em dia'}
                </div>
            </div>
        `;
    }

    // Renderizar Gráficos
    renderCharts() {
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js não carregado. Gráficos não serão exibidos.');
            return;
        }

        this.renderDeliveriesStatusChart();
        this.renderRevenueChart();
        this.renderEmployeesRoleChart();
        this.renderTrucksStatusChart();
    }

    renderDeliveriesStatusChart() {
        const ctx = document.getElementById('deliveriesStatusChart');
        if (!ctx) return;

        const delivered = this.deliveries.filter(d => d.status === 'entregue').length;
        const pending = this.deliveries.filter(d => d.status === 'pendente').length;
        const inTransit = this.deliveries.filter(d => d.status === 'em_transito').length;
        const cancelled = this.deliveries.filter(d => d.status === 'cancelada').length;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Entregues', 'Pendentes', 'Em Trânsito', 'Canceladas'],
                datasets: [{
                    data: [delivered, pending, inTransit, cancelled],
                    backgroundColor: [
                        '#7ed321',
                        '#f5a623',
                        '#4a90e2',
                        '#ff6b6b'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    renderRevenueChart() {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        // Agrupar receita por mês
        const monthlyRevenue = {};
        this.deliveries.forEach(d => {
            if (d.status === 'entregue' && d.date) {
                const date = new Date(d.date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const value = (parseFloat(d.totalValue) || 0) - (parseFloat(d.discount) || 0);
                monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + value;
            }
        });

        const months = Object.keys(monthlyRevenue).sort();
        const revenues = months.map(m => monthlyRevenue[m]);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: months.map(m => {
                    const [year, month] = m.split('-');
                    return new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
                }),
                datasets: [{
                    label: 'Receita (R$)',
                    data: revenues,
                    borderColor: '#4a90e2',
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
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toFixed(2).replace('.', ',');
                            }
                        }
                    }
                }
            }
        });
    }

    renderEmployeesRoleChart() {
        const ctx = document.getElementById('employeesRoleChart');
        if (!ctx) return;

        const byRole = {};
        this.employees.forEach(emp => {
            byRole[emp.role] = (byRole[emp.role] || 0) + 1;
        });

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(byRole).map(r => this.getRoleName(r)),
                datasets: [{
                    label: 'Quantidade',
                    data: Object.values(byRole),
                    backgroundColor: [
                        '#4a90e2',
                        '#7ed321',
                        '#f5a623',
                        '#ff6b6b',
                        '#50c9c3'
                    ]
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

    renderTrucksStatusChart() {
        const ctx = document.getElementById('trucksStatusChart');
        if (!ctx) return;

        const active = this.trucks.filter(t => t.status === 'ativo' || t.status === 'disponivel').length;
        const inRoute = this.trucks.filter(t => t.status === 'em_rota').length;
        const maintenance = this.trucks.filter(t => t.status === 'manutencao').length;
        const inactive = this.trucks.filter(t => t.status === 'inativo' || t.status === 'parado').length;

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Ativos', 'Em Rota', 'Manutenção', 'Inativos'],
                datasets: [{
                    data: [active, inRoute, maintenance, inactive],
                    backgroundColor: [
                        '#7ed321',
                        '#4a90e2',
                        '#f5a623',
                        '#95a5a6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Aplicar filtros
    applyFilters() {
        const period = document.getElementById('reportPeriod').value;
        const status = document.getElementById('reportStatus').value;
        
        // Aqui você pode implementar a lógica de filtragem
        // Por enquanto, apenas recarregar os dados
        this.loadData();
        this.renderKPIs();
        this.renderCharts();
        
        alert('Filtros aplicados!');
    }

    // Relatório personalizado
    openAdvancedReportModal() {
        document.getElementById('advancedReportModal').style.display = 'block';
    }

    generateAdvancedReport() {
        const reportType = document.getElementById('customReportType').value;
        const format = document.getElementById('customFormat').value;
        const startDate = document.getElementById('customStartDate').value;
        const endDate = document.getElementById('customEndDate').value;

        if (!reportType) {
            alert('Selecione um tipo de relatório.');
            return;
        }

        // Fechar modal
        document.getElementById('advancedReportModal').style.display = 'none';

        // Gerar relatório com filtros
        this.generateReport(reportType, format);
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new ReportsManager();
});


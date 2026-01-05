// Sistema de Diagnóstico do Agreste Construção
class DiagnosticSystem {
    constructor() {
        this.logs = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialData();
        this.runDiagnostic();
    }

    setupEventListeners() {
        // Botão executar diagnóstico
        document.getElementById('runDiagnosticBtn').addEventListener('click', () => {
            this.runDiagnostic();
        });

        // Botão limpar logs
        document.getElementById('clearLogsBtn').addEventListener('click', () => {
            this.clearLogs();
        });

        // Botão exportar logs
        document.getElementById('exportLogsBtn').addEventListener('click', () => {
            this.exportLogs();
        });

        // Botão atualizar
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.runDiagnostic();
        });
    }

    loadInitialData() {
        // Carregar logs existentes do localStorage
        const storedLogs = localStorage.getItem('systemLogs');
        if (storedLogs) {
            this.logs = JSON.parse(storedLogs);
        }
    }

    addLog(level, message) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level,
            message: message
        };
        
        this.logs.unshift(logEntry);
        
        // Manter apenas os últimos 100 logs
        if (this.logs.length > 100) {
            this.logs = this.logs.slice(0, 100);
        }
        
        // Salvar no localStorage
        localStorage.setItem('systemLogs', JSON.stringify(this.logs));
    }

    runDiagnostic() {
        this.addLog('info', 'Iniciando diagnóstico do sistema...');
        
        // Limpar resultados anteriores
        this.clearResults();
        
        // Executar verificações
        this.checkStorage();
        this.checkUsers();
        this.checkSystemHealth();
        
        this.addLog('info', 'Diagnóstico concluído com sucesso');
    }

    clearResults() {
        document.getElementById('storageStatus').innerHTML = '';
        document.getElementById('usersStatus').innerHTML = '';
        document.getElementById('systemLogs').innerHTML = '';
    }

    checkStorage() {
        const storageStatus = document.getElementById('storageStatus');
        
        try {
            // Verificar localStorage
            const localStorageSize = this.getLocalStorageSize();
            const localStorageStatus = this.checkLocalStorage();
            
            // Verificar sessionStorage
            const sessionStorageSize = this.getSessionStorageSize();
            const sessionStorageStatus = this.checkSessionStorage();
            
            // Verificar dados específicos
            const usersData = this.checkUsersData();
            const trucksData = this.checkTrucksData();
            const routesData = this.checkRoutesData();
            const citiesData = this.checkCitiesData();
            
            storageStatus.innerHTML = `
                <div class="status-item ${localStorageStatus.status}">
                    <h5>Local Storage</h5>
                    <p>Armazenamento local do navegador</p>
                    <div class="status-value ${localStorageStatus.status}">${localStorageSize}</div>
                </div>
                <div class="status-item ${sessionStorageStatus.status}">
                    <h5>Session Storage</h5>
                    <p>Armazenamento da sessão atual</p>
                    <div class="status-value ${sessionStorageStatus.status}">${sessionStorageSize}</div>
                </div>
                <div class="status-item ${usersData.status}">
                    <h5>Usuários</h5>
                    <p>Dados de usuários cadastrados</p>
                    <div class="status-value ${usersData.status}">${usersData.count}</div>
                </div>
                <div class="status-item ${trucksData.status}">
                    <h5>Caminhões</h5>
                    <p>Dados da frota de caminhões</p>
                    <div class="status-value ${trucksData.status}">${trucksData.count}</div>
                </div>
                <div class="status-item ${routesData.status}">
                    <h5>Rotas</h5>
                    <p>Dados de rotas cadastradas</p>
                    <div class="status-value ${routesData.status}">${routesData.count}</div>
                </div>
                <div class="status-item ${citiesData.status}">
                    <h5>Cidades</h5>
                    <p>Dados de cidades cadastradas</p>
                    <div class="status-value ${citiesData.status}">${citiesData.count}</div>
                </div>
            `;
            
        } catch (error) {
            this.addLog('error', `Erro ao verificar armazenamento: ${error.message}`);
            storageStatus.innerHTML = '<div class="status-item error"><h5>Erro</h5><p>Falha ao verificar armazenamento</p></div>';
        }
    }

    checkUsers() {
        const usersStatus = document.getElementById('usersStatus');
        
        try {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
            
            let usersHtml = '';
            
            if (users.length === 0) {
                usersHtml = '<div class="user-status-item"><h6>Nenhum usuário encontrado</h6></div>';
            } else {
                users.forEach(user => {
                    const isActive = user.status === 'active';
                    const isCurrent = user.id === currentUser.id;
                    
                    usersHtml += `
                        <div class="user-status-item">
                            <h6>${user.name}</h6>
                            <p>${user.email}</p>
                            <span class="status-badge ${isActive ? 'active' : 'inactive'}">
                                ${isActive ? 'Ativo' : 'Inativo'}
                            </span>
                            ${isCurrent ? '<br><small>Usuário Atual</small>' : ''}
                        </div>
                    `;
                });
            }
            
            usersStatus.innerHTML = usersHtml;
            
        } catch (error) {
            this.addLog('error', `Erro ao verificar usuários: ${error.message}`);
            usersStatus.innerHTML = '<div class="user-status-item"><h6>Erro</h6><p>Falha ao carregar usuários</p></div>';
        }
    }

    checkSystemHealth() {
        this.displayLogs();
    }

    displayLogs() {
        const systemLogs = document.getElementById('systemLogs');
        
        if (this.logs.length === 0) {
            systemLogs.innerHTML = '<div class="log-entry">Nenhum log disponível</div>';
            return;
        }
        
        const logsHtml = this.logs.map(log => `
            <div class="log-entry">
                <span class="log-timestamp">${new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                <span class="log-level ${log.level}">[${log.level.toUpperCase()}]</span>
                <span class="log-message">${log.message}</span>
            </div>
        `).join('');
        
        systemLogs.innerHTML = logsHtml;
    }

    getLocalStorageSize() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        return this.formatBytes(total);
    }

    getSessionStorageSize() {
        let total = 0;
        for (let key in sessionStorage) {
            if (sessionStorage.hasOwnProperty(key)) {
                total += sessionStorage[key].length + key.length;
            }
        }
        return this.formatBytes(total);
    }

    checkLocalStorage() {
        try {
            const testKey = 'diagnostic_test';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return { status: 'success' };
        } catch (error) {
            return { status: 'error' };
        }
    }

    checkSessionStorage() {
        try {
            const testKey = 'diagnostic_test';
            sessionStorage.setItem(testKey, 'test');
            sessionStorage.removeItem(testKey);
            return { status: 'success' };
        } catch (error) {
            return { status: 'error' };
        }
    }

    checkUsersData() {
        try {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            return {
                status: users.length > 0 ? 'success' : 'warning',
                count: users.length
            };
        } catch (error) {
            return { status: 'error', count: 0 };
        }
    }

    checkTrucksData() {
        try {
            const trucks = JSON.parse(localStorage.getItem('trucks') || '[]');
            return {
                status: trucks.length > 0 ? 'success' : 'warning',
                count: trucks.length
            };
        } catch (error) {
            return { status: 'error', count: 0 };
        }
    }

    checkRoutesData() {
        try {
            const routes = JSON.parse(localStorage.getItem('routes') || '[]');
            return {
                status: routes.length > 0 ? 'success' : 'warning',
                count: routes.length
            };
        } catch (error) {
            return { status: 'error', count: 0 };
        }
    }

    checkCitiesData() {
        try {
            const cities = JSON.parse(localStorage.getItem('cities') || '[]');
            return {
                status: cities.length > 0 ? 'success' : 'warning',
                count: cities.length
            };
        } catch (error) {
            return { status: 'error', count: 0 };
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    clearLogs() {
        if (confirm('Tem certeza que deseja limpar todos os logs?')) {
            this.logs = [];
            localStorage.removeItem('systemLogs');
            this.displayLogs();
            this.addLog('info', 'Logs limpos com sucesso');
        }
    }

    exportLogs() {
        if (this.logs.length === 0) {
            alert('Nenhum log disponível para exportar');
            return;
        }

        const logsText = this.logs.map(log => 
            `[${new Date(log.timestamp).toLocaleString('pt-BR')}] [${log.level.toUpperCase()}] ${log.message}`
        ).join('\n');

        const blob = new Blob([logsText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agreste-construcao-logs-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.addLog('info', 'Logs exportados com sucesso');
    }
}

// Inicializar sistema de diagnóstico
document.addEventListener('DOMContentLoaded', () => {
    new DiagnosticSystem();
});

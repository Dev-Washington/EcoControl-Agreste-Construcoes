// Sistema de Chat Logs
class ChatLogsManager {
    constructor() {
        this.currentUser = null;
        this.logs = [];
        this.backupLogs = [];
        this.employees = [];
        this.deliveries = [];
        this.filteredLogs = [];
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadData();
        this.setupEventListeners();
        this.cleanOldBackups();
        this.loadBackupLogs();
        this.populateEmployeeFilter();
        this.renderStats();
        this.renderLogs();
        this.updateLogsCount();
        
        // Limpeza automática a cada hora
        setInterval(() => {
            this.cleanOldBackups();
        }, 60 * 60 * 1000);
    }

    checkAuth() {
        const user = sessionStorage.getItem('currentUser');
        if (!user) {
            window.location.href = '../login.html';
            return;
        }
        
        this.currentUser = JSON.parse(user);
        
        // Verificar permissões
        const canAccess = this.currentUser.role === 'gestor' || 
                        this.currentUser.role === 'desenvolvedor' || 
                        this.currentUser.email === 'desenvolvedor@control.com';
        
        if (!canAccess) {
            alert('Você não tem permissão para acessar esta página.');
            window.location.href = '../dashboard/dashboard.html';
            return;
        }
    }

    loadData() {
        this.employees = JSON.parse(localStorage.getItem('employees') || '[]');
        this.deliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
        this.logs = JSON.parse(localStorage.getItem('chatActionLogs') || '[]');
        this.backupLogs = JSON.parse(localStorage.getItem('chatBackupLogs') || '[]');
        
        if (!Array.isArray(this.logs)) this.logs = [];
        if (!Array.isArray(this.backupLogs)) this.backupLogs = [];
    }

    setupEventListeners() {
        // Interceptar ações do chat para criar logs
        this.setupChatInterceptors();
    }

    setupChatInterceptors() {
        // Monitorar mudanças no localStorage de mensagens
        const originalSetItem = localStorage.setItem;
        const self = this;
        
        localStorage.setItem = function(key, value) {
            originalSetItem.apply(this, arguments);
            
            if (key === 'employeeMessages') {
                self.onMessagesUpdated();
            }
        };
    }

    onMessagesUpdated() {
        // Esta função será chamada quando mensagens forem atualizadas
        // Os logs serão criados diretamente nas funções de envio/exclusão
    }

    cleanOldBackups() {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        this.backupLogs = this.backupLogs.filter(backup => {
            const backupDate = new Date(backup.backupDate);
            return backupDate >= thirtyDaysAgo;
        });
        
        localStorage.setItem('chatBackupLogs', JSON.stringify(this.backupLogs));
    }

    loadBackupLogs() {
        // Carregar logs de backup e adicionar aos logs principais
        this.backupLogs.forEach(backup => {
            if (backup.logs && Array.isArray(backup.logs)) {
                this.logs.push(...backup.logs);
            }
        });
        
        // Remover duplicatas baseado em ID
        const uniqueLogs = [];
        const seenIds = new Set();
        
        this.logs.forEach(log => {
            if (!seenIds.has(log.id)) {
                seenIds.add(log.id);
                uniqueLogs.push(log);
            }
        });
        
        this.logs = uniqueLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    populateEmployeeFilter() {
        const filter = document.getElementById('employeeFilter');
        if (!filter) return;
        
        filter.innerHTML = '<option value="">Todos</option>';
        
        this.employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = emp.name || 'Funcionário';
            filter.appendChild(option);
        });
    }

    createLog(action, data) {
        try {
            const log = {
                id: 'LOG-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                timestamp: new Date().toISOString(),
                action: action, // 'message_sent', 'message_received', 'chat_deleted', 'chat_attended'
                userId: this.currentUser ? this.currentUser.id : (data.userId || 'system'),
                userName: this.currentUser ? (this.currentUser.name || this.currentUser.email) : (data.userName || 'Sistema'),
                fromEmployeeId: data.fromEmployeeId || null,
                fromEmployeeName: data.fromEmployeeName || null,
                toEmployeeId: data.toEmployeeId || null,
                toEmployeeName: data.toEmployeeName || null,
                messageId: data.messageId || null,
                messageContent: data.messageContent || null,
                messageSubject: data.messageSubject || null,
                deliveryId: data.deliveryId || null,
                deliveryName: data.deliveryName || null,
                duration: data.duration || null, // em segundos
                conversationId: data.conversationId || null,
                metadata: data.metadata || {},
                hasImage: data.hasImage || false
            };
            
            this.logs.unshift(log);
            
            // Manter apenas últimos 1000 logs em memória
            if (this.logs.length > 1000) {
                const logsToBackup = this.logs.splice(1000);
                this.addToBackup(logsToBackup);
            }
            
            localStorage.setItem('chatActionLogs', JSON.stringify(this.logs));
            
            // Atualizar renderização se estiver na página
            if (document.getElementById('logsTableBody')) {
                this.renderLogs();
                this.renderStats();
            }
            
            return log;
        } catch (error) {
            console.error('Erro ao criar log:', error);
            return null;
        }
    }

    addToBackup(logs) {
        const backup = {
            id: 'BACKUP-' + Date.now(),
            backupDate: new Date().toISOString(),
            logs: logs
        };
        
        this.backupLogs.push(backup);
        localStorage.setItem('chatBackupLogs', JSON.stringify(this.backupLogs));
    }

    filterLogs() {
        const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase();
        const actionType = document.getElementById('actionTypeFilter')?.value || '';
        const period = document.getElementById('periodFilter')?.value || 'all';
        const employeeId = document.getElementById('employeeFilter')?.value || '';
        
        let filtered = [...this.logs];
        
        // Filtro de busca
        if (searchTerm) {
            filtered = filtered.filter(log => 
                (log.fromEmployeeName && log.fromEmployeeName.toLowerCase().includes(searchTerm)) ||
                (log.toEmployeeName && log.toEmployeeName.toLowerCase().includes(searchTerm)) ||
                (log.messageContent && log.messageContent.toLowerCase().includes(searchTerm)) ||
                (log.messageSubject && log.messageSubject.toLowerCase().includes(searchTerm)) ||
                (log.deliveryName && log.deliveryName.toLowerCase().includes(searchTerm))
            );
        }
        
        // Filtro de tipo de ação
        if (actionType) {
            filtered = filtered.filter(log => log.action === actionType);
        }
        
        // Filtro de período
        if (period !== 'all') {
            const now = new Date();
            let startDate;
            
            switch(period) {
                case 'today':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
                    break;
                case 'month':
                    startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                    break;
            }
            
            filtered = filtered.filter(log => {
                const logDate = new Date(log.timestamp);
                return logDate >= startDate;
            });
        }
        
        // Filtro de funcionário
        if (employeeId) {
            filtered = filtered.filter(log => 
                log.fromEmployeeId === employeeId || log.toEmployeeId === employeeId
            );
        }
        
        this.filteredLogs = filtered;
        this.renderLogs();
        this.updateLogsCount();
    }

    renderStats() {
        const totalMessages = this.logs.filter(log => 
            log.action === 'message_sent' || log.action === 'message_received'
        ).length;
        
        const conversations = new Set(
            this.logs
                .filter(log => log.conversationId)
                .map(log => log.conversationId)
        ).size;
        
        const totalDeleted = this.logs.filter(log => log.action === 'chat_deleted').length;
        const totalAttended = this.logs.filter(log => log.action === 'chat_attended').length;
        
        document.getElementById('totalMessages').textContent = totalMessages;
        document.getElementById('totalConversations').textContent = conversations;
        document.getElementById('totalDeleted').textContent = totalDeleted;
        document.getElementById('totalAttended').textContent = totalAttended;
    }

    renderLogs() {
        const tbody = document.getElementById('logsTableBody');
        if (!tbody) return;
        
        const logsToRender = this.filteredLogs.length > 0 ? this.filteredLogs : this.logs;
        
        if (logsToRender.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <h3>Nenhum log encontrado</h3>
                            <p>Os logs de chat aparecerão aqui quando houver atividade</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = logsToRender.map(log => {
            const date = new Date(log.timestamp);
            const dateStr = date.toLocaleDateString('pt-BR');
            const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            const actionNames = {
                'message_sent': 'Mensagem Enviada',
                'message_received': 'Mensagem Recebida',
                'chat_deleted': 'Chat Excluído',
                'chat_attended': 'Chat Atendido'
            };
            
            const fromEmployee = this.employees.find(emp => emp.id === log.fromEmployeeId);
            const toEmployee = this.employees.find(emp => emp.id === log.toEmployeeId);
            
            const durationStr = log.duration ? this.formatDuration(log.duration) : '-';
            const deliveryLink = log.deliveryId ? 
                `<a href="../entregas/entregas.html" class="log-delivery-link" onclick="event.preventDefault();">${this.escapeHtml(log.deliveryName || 'Entrega #' + log.deliveryId)}</a>` : 
                '-';
            
            return `
                <tr>
                    <td>
                        <div>${dateStr}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">${timeStr}</div>
                    </td>
                    <td>
                        <span class="log-action-badge ${log.action}">${actionNames[log.action] || log.action}</span>
                    </td>
                    <td>
                        ${log.fromEmployeeId ? `
                            <div class="log-user-info">
                                <div class="log-user-avatar">
                                    ${fromEmployee && fromEmployee.photo ? 
                                        `<img src="${this.escapeHtml(fromEmployee.photo)}" alt="${this.escapeHtml(log.fromEmployeeName)}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-user\\'></i>'">` :
                                        '<i class="fas fa-user"></i>'
                                    }
                                </div>
                                <span class="log-user-name">${this.escapeHtml(log.fromEmployeeName || 'N/A')}</span>
                            </div>
                        ` : '-'}
                    </td>
                    <td>
                        ${log.toEmployeeId ? `
                            <div class="log-user-info">
                                <div class="log-user-avatar">
                                    ${toEmployee && toEmployee.photo ? 
                                        `<img src="${this.escapeHtml(toEmployee.photo)}" alt="${this.escapeHtml(log.toEmployeeName)}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-user\\'></i>'">` :
                                        '<i class="fas fa-user"></i>'
                                    }
                                </div>
                                <span class="log-user-name">${this.escapeHtml(log.toEmployeeName || 'N/A')}</span>
                            </div>
                        ` : '-'}
                    </td>
                    <td>
                        <div class="log-message-preview" title="${this.escapeHtml(log.messageContent || log.messageSubject || '-')}">
                            ${log.messageSubject ? `<strong>${this.escapeHtml(log.messageSubject)}:</strong> ` : ''}
                            ${this.escapeHtml((log.messageContent || '-').substring(0, 50))}${(log.messageContent || '').length > 50 ? '...' : ''}
                        </div>
                    </td>
                    <td>${deliveryLink}</td>
                    <td><span class="log-duration">${durationStr}</span></td>
                    <td>
                        <div class="log-actions">
                            <button class="log-action-btn" onclick="chatLogsManager.viewLogDetails('${log.id}')" title="Ver Detalhes">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    viewLogDetails(logId) {
        const log = this.logs.find(l => l.id === logId);
        if (!log) return;
        
        const modal = document.getElementById('logDetailsModal');
        const content = document.getElementById('logDetailsContent');
        if (!modal || !content) return;
        
        const date = new Date(log.timestamp);
        const dateStr = date.toLocaleString('pt-BR');
        
        const actionNames = {
            'message_sent': 'Mensagem Enviada',
            'message_received': 'Mensagem Recebida',
            'chat_deleted': 'Chat Excluído',
            'chat_attended': 'Chat Atendido'
        };
        
        content.innerHTML = `
            <div class="log-details-grid">
                <div class="log-detail-item">
                    <div class="log-detail-label">Data e Hora</div>
                    <div class="log-detail-value">${dateStr}</div>
                </div>
                <div class="log-detail-item">
                    <div class="log-detail-label">Ação</div>
                    <div class="log-detail-value">
                        <span class="log-action-badge ${log.action}">${actionNames[log.action] || log.action}</span>
                    </div>
                </div>
                <div class="log-detail-item">
                    <div class="log-detail-label">Remetente</div>
                    <div class="log-detail-value">${this.escapeHtml(log.fromEmployeeName || 'N/A')}</div>
                </div>
                <div class="log-detail-item">
                    <div class="log-detail-label">Destinatário</div>
                    <div class="log-detail-value">${this.escapeHtml(log.toEmployeeName || 'N/A')}</div>
                </div>
                <div class="log-detail-item">
                    <div class="log-detail-label">Quem Registrou</div>
                    <div class="log-detail-value">${this.escapeHtml(log.userName)}</div>
                </div>
                <div class="log-detail-item">
                    <div class="log-detail-label">Duração</div>
                    <div class="log-detail-value">${log.duration ? this.formatDuration(log.duration) : 'N/A'}</div>
                </div>
                <div class="log-detail-item">
                    <div class="log-detail-label">Entrega</div>
                    <div class="log-detail-value">${log.deliveryName || 'N/A'}</div>
                </div>
                <div class="log-detail-item">
                    <div class="log-detail-label">ID do Log</div>
                    <div class="log-detail-value" style="font-size: 11px; font-family: monospace;">${log.id}</div>
                </div>
            </div>
            
            ${log.messageSubject || log.messageContent ? `
                <div class="log-full-message">
                    <h3>Mensagem Completa</h3>
                    ${log.messageSubject ? `<div style="margin-bottom: 10px;"><strong>Assunto:</strong> ${this.escapeHtml(log.messageSubject)}</div>` : ''}
                    <div class="log-full-message-content">${this.escapeHtml(log.messageContent || '')}</div>
                </div>
            ` : ''}
        `;
        
        modal.style.display = 'block';
    }

    closeDetailsModal() {
        const modal = document.getElementById('logDetailsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    updateLogsCount() {
        const count = this.filteredLogs.length > 0 ? this.filteredLogs.length : this.logs.length;
        const countEl = document.getElementById('logsCount');
        if (countEl) {
            countEl.textContent = `${count} registro${count !== 1 ? 's' : ''}`;
        }
    }

    formatDuration(seconds) {
        if (!seconds) return '-';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    cleanOldLogs() {
        const self = this;
        window.showGlobalConfirmModal(
            'Limpar Logs Antigos',
            'Tem certeza que deseja limpar logs antigos (mais de 30 dias)?<br><br><span style="color: var(--accent-red);"><i class="fas fa-exclamation-circle"></i> Esta ação não pode ser desfeita.</span>',
            () => {
                self.executeCleanOldLogs();
            }
        );
        return;
    }
    
    executeCleanOldLogs() {
        
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        const beforeCount = this.logs.length;
        this.logs = this.logs.filter(log => {
            const logDate = new Date(log.timestamp);
            return logDate >= thirtyDaysAgo;
        });
        
        const afterCount = this.logs.length;
        const removed = beforeCount - afterCount;
        
        localStorage.setItem('chatActionLogs', JSON.stringify(this.logs));
        
        this.renderStats();
        this.renderLogs();
        this.updateLogsCount();
        
        if (removed > 0) {
            window.showGlobalInfoModal('Sucesso', `${removed} log(s) antigo(s) foram removidos.`);
        } else {
            window.showGlobalInfoModal('Informação', 'Nenhum log antigo encontrado para remover.');
        }
    }

    exportLogs() {
        const logsToExport = this.filteredLogs.length > 0 ? this.filteredLogs : this.logs;
        
        if (logsToExport.length === 0) {
            alert('Não há logs para exportar.');
            return;
        }
        
        const csv = this.convertToCSV(logsToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `chat_logs_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    convertToCSV(logs) {
        const headers = ['Data/Hora', 'Ação', 'Remetente', 'Destinatário', 'Assunto', 'Mensagem', 'Entrega', 'Duração', 'ID'];
        const rows = logs.map(log => {
            const date = new Date(log.timestamp);
            return [
                date.toLocaleString('pt-BR'),
                log.action,
                log.fromEmployeeName || '',
                log.toEmployeeName || '',
                log.messageSubject || '',
                (log.messageContent || '').replace(/\n/g, ' ').substring(0, 100),
                log.deliveryName || '',
                log.duration ? this.formatDuration(log.duration) : '',
                log.id
            ];
        });
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        return csvContent;
    }

    escapeHtml(text) {
        if (text === null || text === undefined) {
            return '';
        }
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }
}

// Initialize
let chatLogsManager;
document.addEventListener('DOMContentLoaded', () => {
    chatLogsManager = new ChatLogsManager();
    window.chatLogsManager = chatLogsManager;
});

// Funções globais para serem chamadas pelo sistema de chat
// Esta função será sobrescrita pelo script global se ele estiver carregado
if (!window.createChatLog) {
    window.createChatLog = function(action, data) {
        if (window.chatLogsManager) {
            return window.chatLogsManager.createLog(action, data);
        } else {
            // Fallback: criar log diretamente no localStorage
            try {
                const logs = JSON.parse(localStorage.getItem('chatActionLogs') || '[]');
                const userStr = sessionStorage.getItem('currentUser');
                let currentUser = { id: 'system', name: 'Sistema', email: 'system' };
                
                if (userStr) {
                    try {
                        currentUser = JSON.parse(userStr);
                    } catch (e) {
                        console.warn('Erro ao parsear usuário:', e);
                    }
                }
                
                const log = {
                    id: 'LOG-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                    timestamp: new Date().toISOString(),
                    action: action,
                    userId: currentUser.id || 'system',
                    userName: currentUser.name || currentUser.email || 'Sistema',
                    fromEmployeeId: data.fromEmployeeId || null,
                    fromEmployeeName: data.fromEmployeeName || null,
                    toEmployeeId: data.toEmployeeId || null,
                    toEmployeeName: data.toEmployeeName || null,
                    messageId: data.messageId || null,
                    messageContent: data.messageContent || null,
                    messageSubject: data.messageSubject || null,
                    deliveryId: data.deliveryId || null,
                    deliveryName: data.deliveryName || null,
                    duration: data.duration || null,
                    conversationId: data.conversationId || null,
                    metadata: data.metadata || {},
                    hasImage: data.hasImage || false
                };
                
                logs.unshift(log);
                
                if (logs.length > 1000) {
                    const logsToBackup = logs.splice(1000);
                    const backupLogs = JSON.parse(localStorage.getItem('chatBackupLogs') || '[]');
                    const backup = {
                        id: 'BACKUP-' + Date.now(),
                        backupDate: new Date().toISOString(),
                        logs: logsToBackup
                    };
                    backupLogs.push(backup);
                    localStorage.setItem('chatBackupLogs', JSON.stringify(backupLogs));
                }
                
                localStorage.setItem('chatActionLogs', JSON.stringify(logs));
                return log;
            } catch (error) {
                console.error('Erro ao criar log de chat:', error);
                return null;
            }
        }
    };
}


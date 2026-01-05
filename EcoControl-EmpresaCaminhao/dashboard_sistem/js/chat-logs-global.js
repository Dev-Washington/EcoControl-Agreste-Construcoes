// Sistema Global de Chat Logs
// Este arquivo garante que a função createChatLog esteja sempre disponível

(function() {
    'use strict';
    
    // Inicializar função global se não existir
    if (!window.createChatLog) {
        window.createChatLog = function(action, data) {
            try {
                // Carregar logs existentes
                const logs = JSON.parse(localStorage.getItem('chatActionLogs') || '[]');
                
                // Obter usuário atual
                const userStr = sessionStorage.getItem('currentUser');
                let currentUser = { id: 'system', name: 'Sistema', email: 'system' };
                
                if (userStr) {
                    try {
                        currentUser = JSON.parse(userStr);
                    } catch (e) {
                        console.warn('Erro ao parsear usuário:', e);
                    }
                }
                
                // Criar log
                const log = {
                    id: 'LOG-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                    timestamp: new Date().toISOString(),
                    action: action, // 'message_sent', 'message_received', 'chat_deleted', 'chat_attended'
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
                
                // Adicionar log ao início do array
                logs.unshift(log);
                
                // Manter apenas últimos 1000 logs em memória
                if (logs.length > 1000) {
                    const logsToBackup = logs.splice(1000);
                    
                    // Adicionar ao backup
                    const backupLogs = JSON.parse(localStorage.getItem('chatBackupLogs') || '[]');
                    const backup = {
                        id: 'BACKUP-' + Date.now(),
                        backupDate: new Date().toISOString(),
                        logs: logsToBackup
                    };
                    backupLogs.push(backup);
                    localStorage.setItem('chatBackupLogs', JSON.stringify(backupLogs));
                }
                
                // Salvar logs
                localStorage.setItem('chatActionLogs', JSON.stringify(logs));
                
                // Se o chatLogsManager estiver disponível, atualizar
                if (window.chatLogsManager && typeof window.chatLogsManager.loadData === 'function') {
                    window.chatLogsManager.loadData();
                    if (typeof window.chatLogsManager.renderLogs === 'function') {
                        window.chatLogsManager.renderLogs();
                    }
                    if (typeof window.chatLogsManager.renderStats === 'function') {
                        window.chatLogsManager.renderStats();
                    }
                }
                
                return log;
            } catch (error) {
                console.error('Erro ao criar log de chat:', error);
                return null;
            }
        };
    }
    
    // Limpeza automática de logs antigos (30 dias)
    function cleanOldBackups() {
        try {
            const backupLogs = JSON.parse(localStorage.getItem('chatBackupLogs') || '[]');
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
            
            const filteredBackups = backupLogs.filter(backup => {
                const backupDate = new Date(backup.backupDate);
                return backupDate >= thirtyDaysAgo;
            });
            
            if (filteredBackups.length !== backupLogs.length) {
                localStorage.setItem('chatBackupLogs', JSON.stringify(filteredBackups));
            }
        } catch (error) {
            console.error('Erro ao limpar backups antigos:', error);
        }
    }
    
    // Executar limpeza ao carregar e a cada hora
    cleanOldBackups();
    setInterval(cleanOldBackups, 60 * 60 * 1000);
    
    console.log('Sistema global de Chat Logs inicializado');
})();




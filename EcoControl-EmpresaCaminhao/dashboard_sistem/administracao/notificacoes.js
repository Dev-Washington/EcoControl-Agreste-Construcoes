// Sistema de Notificações
class NotificationsManager {
    constructor() {
        this.currentUser = null;
        this.notifications = [];
        this.filters = {
            type: 'all',
            status: 'all',
            priority: 'all',
            dateStart: null,
            dateEnd: null
        };
        this.settings = {
            email: {
                manutencao: true,
                entrega: true,
                documento: true,
                sistema: true
            },
            system: {
                manutencao: true,
                entrega: true,
                documento: true,
                alerta: true
            },
            sound: 'enabled',
            autoMarkRead: 'disabled'
        };
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadData();
        this.loadSettings();
        this.setupEventListeners();
        this.checkSystemNotifications();
        this.renderNotifications();
        this.updateStats();
        
        // Verificar notificações a cada 30 segundos
        setInterval(() => {
            this.checkSystemNotifications();
        }, 30000);
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
        this.notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        
        // Ordenar por data (mais recentes primeiro)
        this.notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('notificationSettings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
    }

    saveData() {
        localStorage.setItem('notifications', JSON.stringify(this.notifications));
    }

    saveSettings() {
        localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
    }

    setupEventListeners() {
        // Filtros
        document.getElementById('filterType').addEventListener('change', (e) => {
            this.filters.type = e.target.value;
            this.renderNotifications();
        });

        document.getElementById('filterStatus').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.renderNotifications();
        });

        document.getElementById('filterPriority').addEventListener('change', (e) => {
            this.filters.priority = e.target.value;
            this.renderNotifications();
        });

        document.getElementById('filterDateStart').addEventListener('change', (e) => {
            this.filters.dateStart = e.target.value || null;
            this.renderNotifications();
        });

        document.getElementById('filterDateEnd').addEventListener('change', (e) => {
            this.filters.dateEnd = e.target.value || null;
            this.renderNotifications();
        });

        document.getElementById('clearFiltersBtn').addEventListener('click', () => {
            this.filters = { type: 'all', status: 'all', priority: 'all', dateStart: null, dateEnd: null };
            document.getElementById('filterType').value = 'all';
            document.getElementById('filterStatus').value = 'all';
            document.getElementById('filterPriority').value = 'all';
            document.getElementById('filterDateStart').value = '';
            document.getElementById('filterDateEnd').value = '';
            this.renderNotifications();
        });

        // Ações
        document.getElementById('markAllReadBtn').addEventListener('click', () => {
            this.markAllAsRead();
        });

        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.clearAllNotifications();
        });

        // Modal de configurações
        const settingsBtn = document.getElementById('openSettingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.openSettingsModal();
            });
        }

        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.saveNotificationSettings();
        });

        document.getElementById('cancelSettingsBtn').addEventListener('click', () => {
            this.closeSettingsModal();
        });

        // Fechar modal ao clicar no X
        document.querySelectorAll('.close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }

    checkSystemNotifications() {
        // Verificar manutenções pendentes
        const maintenances = JSON.parse(localStorage.getItem('maintenance') || '[]');
        const pendingMaintenances = maintenances.filter(m => m.status === 'pendente');
        
        pendingMaintenances.forEach(maintenance => {
            const existingNotif = this.notifications.find(n => 
                n.type === 'manutencao' && 
                n.relatedId === maintenance.id &&
                !n.read
            );
            
            if (!existingNotif) {
                this.createNotification({
                    type: 'manutencao',
                    title: 'Manutenção Pendente',
                    message: `A manutenção do caminhão ${maintenance.truckId} está pendente`,
                    priority: maintenance.priority || 'media',
                    relatedId: maintenance.id,
                    relatedType: 'maintenance'
                });
            }
        });

        // Verificar documentos vencendo (exemplo - pode ser expandido)
        const trucks = JSON.parse(localStorage.getItem('trucks') || '[]');
        trucks.forEach(truck => {
            // Aqui você pode adicionar lógica para verificar documentos vencendo
            // Por exemplo, se tiver campo de vencimento de documentos
        });

        // Verificar entregas atrasadas
        const deliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        deliveries.forEach(delivery => {
            if (delivery.status === 'pendente' || delivery.status === 'em_transito') {
                const deliveryDate = new Date(delivery.date);
                deliveryDate.setHours(0, 0, 0, 0);
                
                if (deliveryDate < today) {
                    const existingNotif = this.notifications.find(n => 
                        n.type === 'entrega' && 
                        n.relatedId === delivery.id &&
                        !n.read
                    );
                    
                    if (!existingNotif) {
                        this.createNotification({
                            type: 'entrega',
                            title: 'Entrega Atrasada',
                            message: `A entrega ${delivery.id} está atrasada`,
                            priority: 'alta',
                            relatedId: delivery.id,
                            relatedType: 'delivery'
                        });
                    }
                }
            }
        });

        this.saveData();
        this.renderNotifications();
        this.updateStats();
    }

    createNotification(data) {
        const notification = {
            id: 'NOTIF-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            type: data.type,
            title: data.title,
            message: data.message,
            priority: data.priority || 'media',
            read: false,
            createdAt: new Date().toISOString(),
            relatedId: data.relatedId || null,
            relatedType: data.relatedType || null
        };

        this.notifications.unshift(notification);
        this.saveData();
        
        // Atualizar badge se necessário
        this.updateBadge();
        
        // Tocar som se ativado
        if (this.settings.sound === 'enabled') {
            this.playNotificationSound();
        }

        return notification;
    }

    playNotificationSound() {
        // Criar um som de notificação simples
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    }

    getFilteredNotifications() {
        return this.notifications.filter(notif => {
            // Filtro por tipo
            if (this.filters.type !== 'all' && notif.type !== this.filters.type) {
                return false;
            }

            // Filtro por status
            if (this.filters.status === 'unread' && notif.read) {
                return false;
            }
            if (this.filters.status === 'read' && !notif.read) {
                return false;
            }

            // Filtro por prioridade
            if (this.filters.priority !== 'all' && notif.priority !== this.filters.priority) {
                return false;
            }

            // Filtro por data
            if (this.filters.dateStart || this.filters.dateEnd) {
                const notifDate = new Date(notif.createdAt);
                // Extrair apenas a data (YYYY-MM-DD) para comparação
                const notifDateStr = notifDate.toISOString().split('T')[0];

                if (this.filters.dateStart) {
                    const startDateStr = this.filters.dateStart;
                    // Comparar strings de data (formato YYYY-MM-DD)
                    // Se a data da notificação for anterior à data inicial, excluir
                    if (notifDateStr < startDateStr) {
                        return false;
                    }
                }

                if (this.filters.dateEnd) {
                    const endDateStr = this.filters.dateEnd;
                    // Comparar strings de data (formato YYYY-MM-DD)
                    // Se a data da notificação for posterior à data final, excluir
                    if (notifDateStr > endDateStr) {
                        return false;
                    }
                }
            }

            return true;
        });
    }

    renderNotifications() {
        const container = document.getElementById('notificationsList');
        const emptyState = document.getElementById('emptyState');
        const filtered = this.getFilteredNotifications();

        if (filtered.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'block';
        emptyState.style.display = 'none';

        container.innerHTML = filtered.map(notif => {
            const timeAgo = this.getTimeAgo(new Date(notif.createdAt));
            const iconClass = this.getIconClass(notif.type);
            const icon = this.getIcon(notif.type);

            return `
                <div class="notification-item ${notif.read ? '' : 'unread'} ${notif.priority}" 
                     onclick="notificationsManager.toggleRead('${notif.id}')">
                    <div class="notification-icon ${iconClass}">
                        <i class="${icon}"></i>
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">${this.escapeHtml(notif.title)}</div>
                        <div class="notification-message">${this.escapeHtml(notif.message)}</div>
                        <div class="notification-meta">
                            <span class="notification-time">
                                <i class="fas fa-clock"></i>
                                ${timeAgo}
                            </span>
                            <span class="notification-priority ${notif.priority}">
                                ${this.getPriorityName(notif.priority)}
                            </span>
                        </div>
                    </div>
                    <div class="notification-actions">
                        <button class="notification-action-btn" 
                                onclick="event.stopPropagation(); notificationsManager.deleteNotification('${notif.id}')"
                                title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        this.updateStats();
    }

    toggleRead(id) {
        const notif = this.notifications.find(n => n.id === id);
        if (notif) {
            notif.read = !notif.read;
            this.saveData();
            this.renderNotifications();
            this.updateBadge();
        }
    }

    markAllAsRead() {
        this.notifications.forEach(notif => {
            notif.read = true;
        });
        this.saveData();
        this.renderNotifications();
        this.updateBadge();
    }

    deleteNotification(id) {
        if (confirm('Tem certeza que deseja excluir esta notificação?')) {
            this.notifications = this.notifications.filter(n => n.id !== id);
            this.saveData();
            this.renderNotifications();
            this.updateBadge();
        }
    }

    clearAllNotifications() {
        if (confirm('Tem certeza que deseja limpar todas as notificações? Esta ação não pode ser desfeita.')) {
            this.notifications = [];
            this.saveData();
            this.renderNotifications();
            this.updateBadge();
        }
    }

    updateStats() {
        const unread = this.notifications.filter(n => !n.read).length;
        const total = this.notifications.length;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayCount = this.notifications.filter(n => {
            const notifDate = new Date(n.createdAt);
            notifDate.setHours(0, 0, 0, 0);
            return notifDate.getTime() === today.getTime();
        }).length;

        document.getElementById('unreadCount').textContent = unread;
        document.getElementById('totalCount').textContent = total;
        document.getElementById('todayCount').textContent = todayCount;

        this.updateBadge();
    }

    updateBadge() {
        const unread = this.notifications.filter(n => !n.read).length;
        const badge = document.getElementById('navNotificationsBadge');
        if (badge) {
            if (unread > 0) {
                badge.textContent = unread > 99 ? '99+' : unread;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return 'Agora';
        if (minutes < 60) return `${minutes} min atrás`;
        if (hours < 24) return `${hours}h atrás`;
        if (days < 7) return `${days} dias atrás`;
        
        return date.toLocaleDateString('pt-BR');
    }

    getIconClass(type) {
        const iconMap = {
            'manutencao': 'manutencao',
            'entrega': 'entrega',
            'documento': 'documento',
            'sistema': 'sistema',
            'alerta': 'alerta',
            'info': 'info'
        };
        return iconMap[type] || 'info';
    }

    getIcon(type) {
        const iconMap = {
            'manutencao': 'fas fa-wrench',
            'entrega': 'fas fa-box',
            'documento': 'fas fa-file-alt',
            'sistema': 'fas fa-cog',
            'alerta': 'fas fa-exclamation-triangle',
            'info': 'fas fa-info-circle'
        };
        return iconMap[type] || 'fas fa-bell';
    }

    getPriorityName(priority) {
        const priorityMap = {
            'urgente': 'Urgente',
            'alta': 'Alta',
            'media': 'Média',
            'baixa': 'Baixa'
        };
        return priorityMap[priority] || 'Média';
    }

    openSettingsModal() {
        // Carregar configurações atuais
        document.getElementById('emailManutencao').checked = this.settings.email.manutencao;
        document.getElementById('emailEntrega').checked = this.settings.email.entrega;
        document.getElementById('emailDocumento').checked = this.settings.email.documento;
        document.getElementById('emailSistema').checked = this.settings.email.sistema;
        
        document.getElementById('systemManutencao').checked = this.settings.system.manutencao;
        document.getElementById('systemEntrega').checked = this.settings.system.entrega;
        document.getElementById('systemDocumento').checked = this.settings.system.documento;
        document.getElementById('systemAlerta').checked = this.settings.system.alerta;
        
        document.getElementById('notificationSound').value = this.settings.sound;
        document.getElementById('autoMarkRead').value = this.settings.autoMarkRead;

        document.getElementById('notificationSettingsModal').style.display = 'block';
    }

    closeSettingsModal() {
        document.getElementById('notificationSettingsModal').style.display = 'none';
    }

    saveNotificationSettings() {
        this.settings.email = {
            manutencao: document.getElementById('emailManutencao').checked,
            entrega: document.getElementById('emailEntrega').checked,
            documento: document.getElementById('emailDocumento').checked,
            sistema: document.getElementById('emailSistema').checked
        };

        this.settings.system = {
            manutencao: document.getElementById('systemManutencao').checked,
            entrega: document.getElementById('systemEntrega').checked,
            documento: document.getElementById('systemDocumento').checked,
            alerta: document.getElementById('systemAlerta').checked
        };

        this.settings.sound = document.getElementById('notificationSound').value;
        this.settings.autoMarkRead = document.getElementById('autoMarkRead').value;

        this.saveSettings();
        this.closeSettingsModal();
        alert('Configurações salvas com sucesso!');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Inicializar quando DOM estiver pronto
let notificationsManager;
document.addEventListener('DOMContentLoaded', () => {
    notificationsManager = new NotificationsManager();
});


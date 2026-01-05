// Sistema de Notificações na Sidebar
class SidebarNotifications {
    constructor() {
        this.notifications = [];
        this.maxVisible = 5;
        this.notificationsUrl = this.getNotificationsUrl();
        this.init();
    }

    getNotificationsUrl() {
        // Detectar o caminho correto para a página de notificações baseado na URL atual
        const currentPath = window.location.pathname;
        const pathParts = currentPath.split('/').filter(p => p);
        
        // Se estamos em uma subpasta (dashboard, funcionarios, caminhoes, etc)
        if (pathParts.length > 1 && pathParts[pathParts.length - 2] !== 'dashboard_sistem') {
            return '../administracao/notificacoes.html';
        }
        // Se estamos na raiz do dashboard_sistem
        return 'administracao/notificacoes.html';
    }

    init() {
        // Aguardar um pouco para garantir que o DOM está totalmente carregado
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initialize();
            });
        } else {
            // DOM já está pronto
            setTimeout(() => {
                this.initialize();
            }, 100);
        }
    }

    initialize() {
        // Verificar se estamos em uma página de administração
        if (!this.isAdministrationPage()) {
            // Remover container de notificações se existir (caso tenha sido criado antes)
            const existingContainer = document.getElementById('sidebarNotificationsContainer');
            if (existingContainer) {
                existingContainer.remove();
            }
            return; // Não criar notificações em páginas que não são de administração
        }
        
        this.loadNotifications();
        this.setupEventListeners();
        this.renderSidebarNotifications();
        
        // Atualizar a cada 30 segundos
        setInterval(() => {
            this.loadNotifications();
            this.renderSidebarNotifications();
        }, 30000);
    }

    isAdministrationPage() {
        // Verificar se estamos em uma página de administração
        const currentPath = window.location.pathname.toLowerCase();
        const currentHref = window.location.href.toLowerCase();
        
        // Páginas de administração onde as notificações devem aparecer
        const adminPages = [
            'administracao/relatorios',
            'administracao/configuracoes',
            'administracao/gestao',
            'administracao/chatlogs',
            'administracao/notificacoes'
        ];
        
        // Verificar se a URL contém alguma das páginas de administração
        const isAdmin = adminPages.some(page => 
            currentPath.includes(page) || currentHref.includes(page)
        );
        
        return isAdmin;
    }

    loadNotifications() {
        try {
            this.notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
            // Ordenar por data (mais recentes primeiro)
            this.notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } catch (error) {
            console.error('Erro ao carregar notificações:', error);
            this.notifications = [];
        }
    }

    setupEventListeners() {
        // Verificar se o container existe
        const container = document.getElementById('sidebarNotificationsContainer');
        if (!container) {
            // Criar container se não existir
            this.createNotificationsContainer();
        }
    }

    createNotificationsContainer() {
        const navigation = document.querySelector('.navigation');
        if (!navigation) {
            // Tentar novamente após um delay se a navegação ainda não estiver carregada
            setTimeout(() => {
                this.createNotificationsContainer();
            }, 500);
            return;
        }

        // Verificar se já existe
        if (document.getElementById('sidebarNotificationsContainer')) return;

        const container = document.createElement('div');
        container.id = 'sidebarNotificationsContainer';
        container.className = 'sidebar-notifications-container';
        
        // Inserir após o menu de navegação, antes do final da navigation
        const navMenu = navigation.querySelector('.nav-menu');
        if (navMenu && navMenu.parentNode) {
            // Inserir após o nav-menu
            if (navMenu.nextSibling) {
                navMenu.parentNode.insertBefore(container, navMenu.nextSibling);
            } else {
                navMenu.parentNode.appendChild(container);
            }
        } else {
            navigation.appendChild(container);
        }
        
        // Renderizar notificações após criar o container
        this.renderSidebarNotifications();
    }

    renderSidebarNotifications() {
        let container = document.getElementById('sidebarNotificationsContainer');
        if (!container) {
            this.createNotificationsContainer();
            container = document.getElementById('sidebarNotificationsContainer');
            if (!container) return; // Se ainda não existir, sair
        }

        const unreadNotifications = this.notifications.filter(n => !n.read);
        const recentNotifications = this.notifications.slice(0, this.maxVisible);

        if (recentNotifications.length === 0) {
            container.innerHTML = `
                <div class="sidebar-notifications-section">
                    <div class="sidebar-notifications-header">
                        <h3 class="sidebar-notifications-title">
                            <i class="fas fa-bell"></i>
                            <span>Notificações</span>
                        </h3>
                    </div>
                    <div class="sidebar-notifications-empty">
                        <i class="fas fa-bell-slash"></i>
                        <p>Nenhuma notificação</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="sidebar-notifications-section">
                <div class="sidebar-notifications-header">
                    <h3 class="sidebar-notifications-title">
                        <i class="fas fa-bell"></i>
                        <span>Notificações</span>
                        ${unreadNotifications.length > 0 ? `<span class="sidebar-notifications-badge">${unreadNotifications.length > 99 ? '99+' : unreadNotifications.length}</span>` : ''}
                    </h3>
                    <a href="${this.notificationsUrl}" class="sidebar-notifications-view-all" title="Ver todas">
                        <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
                <div class="sidebar-notifications-list">
                    ${recentNotifications.map((notif, index) => {
                        const safeId = this.escapeHtml(String(notif.id || index));
                        return `
                        <div class="sidebar-notification-item ${notif.read ? '' : 'unread'}" 
                             data-notification-id="${safeId}"
                             title="${this.escapeHtml(notif.title)}">
                            <div class="sidebar-notification-icon ${this.getIconClass(notif.type)}">
                                <i class="${this.getIcon(notif.type)}"></i>
                            </div>
                            <div class="sidebar-notification-content">
                                <div class="sidebar-notification-title-text">${this.escapeHtml(notif.title)}</div>
                                <div class="sidebar-notification-message">${this.escapeHtml(this.truncateText(notif.message, 40))}</div>
                                <div class="sidebar-notification-time">${this.getTimeAgo(new Date(notif.createdAt))}</div>
                            </div>
                            ${!notif.read ? '<div class="sidebar-notification-dot"></div>' : ''}
                        </div>
                    `;
                    }).join('')}
                </div>
                ${this.notifications.length > this.maxVisible ? `
                    <div class="sidebar-notifications-footer">
                        <a href="${this.notificationsUrl}" class="sidebar-notifications-more">
                            Ver todas as notificações (${this.notifications.length})
                        </a>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Anexar event listeners após renderizar
        this.attachNotificationListeners();
    }

    attachNotificationListeners() {
        // Usar event delegation para lidar com cliques nas notificações
        const container = document.getElementById('sidebarNotificationsContainer');
        if (container) {
            // Remover listeners anteriores para evitar duplicação
            const newContainer = container.cloneNode(true);
            container.parentNode.replaceChild(newContainer, container);
            
            // Adicionar novo listener
            newContainer.addEventListener('click', (e) => {
                const item = e.target.closest('.sidebar-notification-item');
                if (item) {
                    const notificationId = item.getAttribute('data-notification-id');
                    if (notificationId && window.sidebarNotifications) {
                        window.sidebarNotifications.handleNotificationClick(notificationId);
                    }
                }
            });
        }
    }

    handleNotificationClick(notificationId) {
        // Recarregar notificações para garantir que temos a versão mais recente
        this.loadNotifications();
        
        // Marcar como lida - tentar encontrar por ID ou por índice
        const notif = this.notifications.find(n => String(n.id) === String(notificationId)) || 
                     this.notifications[parseInt(notificationId)];
        
        if (notif && !notif.read) {
            notif.read = true;
            localStorage.setItem('notifications', JSON.stringify(this.notifications));
            this.renderSidebarNotifications();
        }

        // Navegar para a página de notificações
        window.location.href = this.notificationsUrl;
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

    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return 'Agora';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        if (days < 7) return `${days}d`;
        
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Inicializar quando DOM estiver pronto
let sidebarNotifications;

// Função para garantir inicialização mesmo se o script for carregado após o DOMContentLoaded
function initSidebarNotifications() {
    if (!sidebarNotifications) {
        sidebarNotifications = new SidebarNotifications();
        // Exportar globalmente para acesso via onclick
        window.sidebarNotifications = sidebarNotifications;
    }
}

// Tentar inicializar imediatamente se o DOM já estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebarNotifications);
} else {
    // DOM já está pronto
    initSidebarNotifications();
}


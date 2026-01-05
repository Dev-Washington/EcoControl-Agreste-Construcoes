// Função para controlar abertura/fechamento de submenu
function toggleSubmenu(itemId) {
    const navItem = document.getElementById(itemId);
    if (navItem) {
        const isOpen = navItem.classList.contains('open');
        
        // Fechar todos os outros submenus
        document.querySelectorAll('.nav-item.has-submenu').forEach(item => {
            if (item.id !== itemId) {
                item.classList.remove('open');
            }
        });
        
        // Toggle do submenu atual
        if (isOpen) {
            navItem.classList.remove('open');
        } else {
            navItem.classList.add('open');
        }
    }
}

// Função global para log de ações do sistema
function logSystemAction(action, type = 'system') {
    try {
        const user = sessionStorage.getItem('currentUser');
        const userData = user ? JSON.parse(user) : { name: 'Sistema', email: 'system' };
        
        const logs = JSON.parse(localStorage.getItem('systemLogs') || '[]');
        logs.push({
            timestamp: new Date().toISOString(),
            user: userData.name || userData.email || 'Sistema',
            action: action,
            type: type
        });

        // Manter apenas os últimos 1000 logs
        if (logs.length > 1000) {
            logs.shift();
        }

        localStorage.setItem('systemLogs', JSON.stringify(logs));
    } catch (error) {
        console.error('Erro ao registrar log:', error);
    }
}

// Sistema de transição de páginas
function initPageTransitions() {
    // Adicionar classe de entrada quando a página carrega - apenas no conteúdo principal
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.classList.add('page-enter');
    }
    
    // Interceptar cliques em links de navegação
    document.querySelectorAll('a[href^="../"], a[href^="./"]').forEach(link => {
        // Ignorar links que não são de navegação (como links de ação)
        if (link.hasAttribute('onclick') && link.getAttribute('onclick').includes('event.preventDefault')) {
            return;
        }
        
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Ignorar links vazios, âncoras ou javascript
            if (!href || href === '#' || href.startsWith('javascript:') || href.startsWith('#')) {
                return;
            }
            
            // Adicionar animação de saída apenas no conteúdo principal
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.classList.add('page-exit');
                mainContent.classList.remove('page-enter');
                
                // Aguardar animação antes de navegar (reduzido para 200ms)
                setTimeout(() => {
                    window.location.href = href;
                }, 200);
            } else {
                // Se não encontrar main-content, navegar normalmente
                window.location.href = href;
            }
        });
    });
}

// Fechar submenu ao clicar fora
document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(e) {
        const adminNavItem = document.getElementById('adminNavItem');
        if (adminNavItem && !adminNavItem.contains(e.target)) {
            adminNavItem.classList.remove('open');
        }
    });
    
    // Verificar permissões e mostrar/ocultar item de administração
    // Usar setTimeout para garantir que seja executado após outros scripts
    setTimeout(function() {
        const user = sessionStorage.getItem('currentUser');
        if (user) {
            const userData = JSON.parse(user);
            const adminOnlyElements = document.querySelectorAll('.admin-only');
            // Apenas gestor e atendente podem ver Administração
            // Motorista e funcionário NÃO podem ver
            const canAccessAdmin = ['gestor', 'desenvolvedor', 'atendente'].includes(userData.role);
            
            adminOnlyElements.forEach(element => {
                if (canAccessAdmin) {
                    element.style.display = 'block';
                } else {
                    element.style.display = 'none';
                }
            });
        } else {
            // Se não estiver logado, ocultar
            const adminOnlyElements = document.querySelectorAll('.admin-only');
            adminOnlyElements.forEach(element => {
                element.style.display = 'none';
            });
        }
    }, 100);
    
    // Inicializar transições de página
    initPageTransitions();
});


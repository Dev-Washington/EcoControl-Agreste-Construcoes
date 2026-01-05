// Script para atualizar badge de chat em todas as páginas
function updateChatBadge() {
    try {
        const messages = JSON.parse(localStorage.getItem('employeeMessages') || '[]');
        
        // Contar mensagens não lidas (enviadas por funcionários para gestor/suporte)
        const unreadCount = messages.filter(msg => 
            msg.fromEmployeeId && !msg.toEmployeeId && !msg.read
        ).length;
        
        // Atualizar badge em todas as páginas
        const badges = document.querySelectorAll('#navChatBadge');
        badges.forEach(badge => {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        });
    } catch (error) {
        console.error('Erro ao atualizar badge de chat:', error);
    }
}

// Atualizar badge quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    updateChatBadge();
    
    // Atualizar a cada 5 segundos
    setInterval(updateChatBadge, 5000);
});

// Atualizar quando houver mudanças no localStorage (de outras abas)
window.addEventListener('storage', (e) => {
    if (e.key === 'employeeMessages') {
        updateChatBadge();
    }
});




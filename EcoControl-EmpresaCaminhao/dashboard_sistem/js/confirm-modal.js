// Sistema Global de Modais de Confirmação e Informação
(function() {
    'use strict';
    
    // Criar modais se não existirem
    function createModals() {
        // Verificar se já existem
        if (document.getElementById('globalConfirmModal')) return;
        
        // Modal de Confirmação
        const confirmModal = document.createElement('div');
        confirmModal.className = 'modal';
        confirmModal.id = 'globalConfirmModal';
        confirmModal.style.display = 'none';
        confirmModal.innerHTML = `
            <div class="modal-content modal-small">
                <div class="modal-header">
                    <h2 id="globalConfirmModalTitle">
                        <i class="fas fa-exclamation-triangle"></i> Confirmar Ação
                    </h2>
                    <span class="close" onclick="window.closeGlobalConfirmModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="confirm-message" id="globalConfirmModalMessage">
                        Tem certeza que deseja realizar esta ação?
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-danger" id="globalConfirmModalConfirm">
                        <i class="fas fa-check"></i> Confirmar
                    </button>
                    <button class="btn btn-secondary" onclick="window.closeGlobalConfirmModal()">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                </div>
            </div>
        `;
        
        // Modal de Informação
        const infoModal = document.createElement('div');
        infoModal.className = 'modal';
        infoModal.id = 'globalInfoModal';
        infoModal.style.display = 'none';
        infoModal.innerHTML = `
            <div class="modal-content modal-small">
                <div class="modal-header">
                    <h2 id="globalInfoModalTitle">
                        <i class="fas fa-info-circle"></i> Informação
                    </h2>
                    <span class="close" onclick="window.closeGlobalInfoModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="info-message" id="globalInfoModalMessage">
                        Informação
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="window.closeGlobalInfoModal()">
                        <i class="fas fa-check"></i> OK
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(confirmModal);
        document.body.appendChild(infoModal);
    }
    
    // Função para escapar HTML
    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }
    
    // Função global para mostrar modal de confirmação
    window.showGlobalConfirmModal = function(title, message, onConfirm) {
        createModals();
        
        const modal = document.getElementById('globalConfirmModal');
        const titleEl = document.getElementById('globalConfirmModalTitle');
        const messageEl = document.getElementById('globalConfirmModalMessage');
        const confirmBtn = document.getElementById('globalConfirmModalConfirm');
        
        if (titleEl) titleEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${escapeHtml(title)}`;
        if (messageEl) messageEl.innerHTML = message;
        
        // Remover listeners anteriores
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        // Adicionar novo listener
        newConfirmBtn.addEventListener('click', () => {
            if (onConfirm && typeof onConfirm === 'function') {
                onConfirm();
            }
            window.closeGlobalConfirmModal();
        });
        
        if (modal) modal.style.display = 'block';
    };
    
    // Função global para fechar modal de confirmação
    window.closeGlobalConfirmModal = function() {
        const modal = document.getElementById('globalConfirmModal');
        if (modal) modal.style.display = 'none';
    };
    
    // Função global para mostrar modal de informação
    window.showGlobalInfoModal = function(title, message) {
        createModals();
        
        const modal = document.getElementById('globalInfoModal');
        const titleEl = document.getElementById('globalInfoModalTitle');
        const messageEl = document.getElementById('globalInfoModalMessage');
        
        if (titleEl) titleEl.innerHTML = `<i class="fas fa-info-circle"></i> ${escapeHtml(title)}`;
        if (messageEl) messageEl.innerHTML = message;
        
        if (modal) modal.style.display = 'block';
    };
    
    // Função global para fechar modal de informação
    window.closeGlobalInfoModal = function() {
        const modal = document.getElementById('globalInfoModal');
        if (modal) modal.style.display = 'none';
    };
    
    // Fechar modais ao clicar fora
    document.addEventListener('click', (e) => {
        const confirmModal = document.getElementById('globalConfirmModal');
        const infoModal = document.getElementById('globalInfoModal');
        
        if (e.target === confirmModal) {
            window.closeGlobalConfirmModal();
        }
        if (e.target === infoModal) {
            window.closeGlobalInfoModal();
        }
    });
    
    // Fechar modais com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            window.closeGlobalConfirmModal();
            window.closeGlobalInfoModal();
        }
    });
    
    console.log('Sistema global de modais de confirmação inicializado');
})();




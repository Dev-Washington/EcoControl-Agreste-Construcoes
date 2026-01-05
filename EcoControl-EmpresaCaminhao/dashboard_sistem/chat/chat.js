// Sistema de Chat - Estilo WhatsApp
class ChatManager {
    constructor() {
        this.currentUser = null;
        this.messages = [];
        this.employees = [];
        this.conversations = [];
        this.currentConversation = null;
        this.isManager = false;
        this.filteredEmployees = [];
        this.selectedImage = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadData();
        this.setupEventListeners();
        this.setupModalListeners();
        this.loadConversations();
        this.renderConversations();
        this.checkIfManager();
        if (this.isManager) {
            this.renderEmployees();
        }
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
        this.messages = JSON.parse(localStorage.getItem('employeeMessages') || '[]');
        this.employees = JSON.parse(localStorage.getItem('employees') || '[]');
        
        if (!Array.isArray(this.messages)) this.messages = [];
        if (!Array.isArray(this.employees)) this.employees = [];
    }

    setupEventListeners() {
        // Busca de conversas
        const searchInput = document.getElementById('searchChatInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterConversations(e.target.value);
            });
        }

        // Busca de funcionários
        const searchEmployeeInput = document.getElementById('searchEmployeeInput');
        if (searchEmployeeInput) {
            searchEmployeeInput.addEventListener('input', (e) => {
                this.filterEmployees(e.target.value);
            });
        }

        // Enviar mensagem
        const sendBtn = document.getElementById('sendMessageBtn');
        const messageInput = document.getElementById('chatMessageInput');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }
        
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
    }

    loadConversations() {
        // Agrupar mensagens por funcionário/motorista
        const conversationsMap = new Map();
        const currentUserId = this.currentUser.id;
        
        this.messages.forEach(msg => {
            let employeeId = null;
            let isFromEmployee = false;
            
            // Mensagens enviadas por funcionários/motoristas (para gestor/suporte)
            if (msg.fromEmployeeId && (!msg.toEmployeeId || msg.toEmployeeId === null)) {
                employeeId = msg.fromEmployeeId;
                isFromEmployee = true;
            }
            // Mensagens enviadas pelo gestor (respostas para funcionários)
            else if (msg.toEmployeeId && msg.fromEmployeeId === currentUserId) {
                employeeId = msg.toEmployeeId;
                isFromEmployee = false;
            }
            // Mensagens recebidas pelo gestor de funcionários
            else if (msg.fromEmployeeId && msg.toEmployeeId === currentUserId) {
                employeeId = msg.fromEmployeeId;
                isFromEmployee = true;
            }
            
            if (!employeeId) return;
            
            // Criar conversa se não existir
            if (!conversationsMap.has(employeeId)) {
                const employee = this.employees.find(emp => 
                    emp.id === employeeId || 
                    String(emp.id) === String(employeeId)
                );
                
                if (employee || msg.fromEmployeeName) {
                    // Buscar foto do funcionário do localStorage
                    let employeePhoto = null;
                    if (employee) {
                        employeePhoto = employee.photo || employee.profilePhoto || null;
                    }
                    
                    conversationsMap.set(employeeId, {
                        employeeId: employeeId,
                        employeeName: employee ? (employee.name || msg.fromEmployeeName) : (msg.fromEmployeeName || 'Funcionário'),
                        employeeRole: employee ? (employee.role || 'funcionario') : 'funcionario',
                        employeePhoto: employeePhoto,
                        messages: [],
                        unreadCount: 0,
                        lastMessage: null,
                        lastMessageTime: null
                    });
                }
            }
            
            const conversation = conversationsMap.get(employeeId);
            if (conversation) {
                conversation.messages.push(msg);
                
                // Verificar se não foi lida (mensagens de funcionários para gestor)
                if (isFromEmployee && !msg.read && (!msg.toEmployeeId || msg.toEmployeeId === currentUserId)) {
                    conversation.unreadCount++;
                }
                
                // Atualizar última mensagem
                const msgTime = new Date(msg.createdAt);
                if (!conversation.lastMessageTime || msgTime > conversation.lastMessageTime) {
                    conversation.lastMessageTime = msgTime;
                    conversation.lastMessage = msg;
                }
            }
        });
        
        // Converter para array e ordenar por última mensagem
        this.conversations = Array.from(conversationsMap.values())
            .sort((a, b) => {
                if (!a.lastMessageTime && !b.lastMessageTime) return 0;
                if (!a.lastMessageTime) return 1;
                if (!b.lastMessageTime) return -1;
                return b.lastMessageTime - a.lastMessageTime;
            });
        
        this.updateNavBadge();
        
        // Atualizar lista de funcionários se for gestor
        if (this.isManager) {
            this.renderEmployees();
        }
    }

    updateNavBadge() {
        const totalUnread = this.conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
        const badge = document.getElementById('navChatBadge');
        
        if (badge) {
            if (totalUnread > 0) {
                badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    filterConversations(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        
        if (!term) {
            this.renderConversations();
            return;
        }
        
        const filtered = this.conversations.filter(conv => 
            conv.employeeName.toLowerCase().includes(term) ||
            (conv.lastMessage && conv.lastMessage.subject && conv.lastMessage.subject.toLowerCase().includes(term)) ||
            (conv.lastMessage && conv.lastMessage.content && conv.lastMessage.content.toLowerCase().includes(term))
        );
        
        this.renderConversations(filtered);
    }

    renderConversations(conversations = null) {
        const list = document.getElementById('conversationsList');
        if (!list) return;
        
        const convsToRender = conversations || this.conversations;
        
        if (convsToRender.length === 0) {
            list.innerHTML = `
                <div class="chat-empty-state" style="padding: 40px 20px;">
                    <i class="fas fa-comments"></i>
                    <p>Nenhuma conversa encontrada</p>
                </div>
            `;
            return;
        }
        
        list.innerHTML = convsToRender.map(conv => {
            const lastMsg = conv.lastMessage;
            const preview = lastMsg ? (lastMsg.content || '').substring(0, 50) : 'Nenhuma mensagem';
            const time = lastMsg ? this.formatMessageTime(new Date(lastMsg.createdAt)) : '';
            const isActive = this.currentConversation && this.currentConversation.employeeId === conv.employeeId;
            
            return `
                <div class="conversation-item ${isActive ? 'active' : ''}" onclick="chatManager.openConversation('${conv.employeeId}')">
                    <div class="conversation-avatar">
                        ${conv.employeePhoto ? 
                            `<img src="${this.escapeHtml(conv.employeePhoto)}" alt="${this.escapeHtml(conv.employeeName)}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-user\\'></i>'">` :
                            `<i class="fas fa-user"></i>`
                        }
                        ${conv.unreadCount > 0 ? `<span class="unread-badge">${conv.unreadCount > 99 ? '99+' : conv.unreadCount}</span>` : ''}
                    </div>
                    <div class="conversation-info">
                        <div class="conversation-header">
                            <span class="conversation-name">${this.escapeHtml(conv.employeeName)}</span>
                            ${time ? `<span class="conversation-time">${time}</span>` : ''}
                        </div>
                        <div class="conversation-preview">
                            ${lastMsg ? `
                                <span class="conversation-preview-text">${this.escapeHtml(preview)}${preview.length >= 50 ? '...' : ''}</span>
                                ${lastMsg.priority && lastMsg.priority !== 'normal' ? 
                                    `<span class="conversation-preview-badge">${this.getPriorityDisplayName(lastMsg.priority)}</span>` : 
                                    ''
                                }
                            ` : '<span class="conversation-preview-text">Nenhuma mensagem</span>'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    openConversation(employeeId) {
        const conversation = this.conversations.find(c => 
            c.employeeId === employeeId || String(c.employeeId) === String(employeeId)
        );
        if (!conversation) return;
        
        this.currentConversation = conversation;
        
        // Marcar mensagens como lidas
        this.markConversationAsRead(employeeId);
        
        // Renderizar conversa
        this.renderChat();
        this.renderConversations();
        
        // Atualizar lista de funcionários se for gestor
        if (this.isManager) {
            this.renderEmployees();
        }
    }

    markConversationAsRead(employeeId) {
        let updated = false;
        const unreadMessages = [];
        
        this.messages.forEach(msg => {
            if (msg.fromEmployeeId === employeeId && !msg.toEmployeeId && !msg.read) {
                msg.read = true;
                updated = true;
                unreadMessages.push(msg);
            }
        });
        
        if (updated) {
            localStorage.setItem('employeeMessages', JSON.stringify(this.messages));
            this.loadConversations();
            this.updateNavBadge();
            
            // Criar log de chat atendido
            if (window.createChatLog && unreadMessages.length > 0) {
                const conversation = this.conversations.find(c => c.employeeId === employeeId);
                const firstMessageTime = unreadMessages[0] ? new Date(unreadMessages[0].createdAt) : new Date();
                const duration = Math.floor((new Date() - firstMessageTime) / 1000);
                
                window.createChatLog('chat_attended', {
                    fromEmployeeId: employeeId,
                    fromEmployeeName: conversation ? conversation.employeeName : 'Funcionário',
                    toEmployeeId: this.currentUser.id,
                    toEmployeeName: this.currentUser.name || 'Gestor',
                    conversationId: employeeId,
                    duration: duration,
                    metadata: {
                        messagesRead: unreadMessages.length,
                        attendedAt: new Date().toISOString()
                    }
                });
            }
        }
    }

    renderChat() {
        const emptyState = document.getElementById('chatEmptyState');
        const chatActive = document.getElementById('chatActive');
        
        if (!this.currentConversation) {
            if (emptyState) emptyState.style.display = 'flex';
            if (chatActive) chatActive.style.display = 'none';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        if (chatActive) chatActive.style.display = 'flex';
        
        // Atualizar header
        const userName = document.getElementById('chatUserName');
        const userRole = document.getElementById('chatUserRole');
        const chatAvatar = document.querySelector('.chat-header .chat-avatar');
        
        if (userName) userName.textContent = this.currentConversation.employeeName;
        if (userRole) {
            const roleNames = {
                'gestor': 'Gestor',
                'atendente': 'Atendente',
                'motorista': 'Motorista',
                'funcionario': 'Funcionário'
            };
            userRole.textContent = roleNames[this.currentConversation.employeeRole] || this.currentConversation.employeeRole;
        }
        
        // Atualizar foto do avatar
        if (chatAvatar) {
            if (this.currentConversation.employeePhoto) {
                chatAvatar.innerHTML = `<img src="${this.escapeHtml(this.currentConversation.employeePhoto)}" alt="${this.escapeHtml(this.currentConversation.employeeName)}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-user\\'></i>'">`;
            } else {
                chatAvatar.innerHTML = '<i class="fas fa-user"></i>';
            }
        }
        
        // Renderizar mensagens
        this.renderMessages();
    }

    renderMessages() {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer || !this.currentConversation) return;
        
        const messages = this.currentConversation.messages
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="chat-empty-state" style="height: auto; padding: 40px;">
                    <i class="fas fa-comments"></i>
                    <p>Nenhuma mensagem ainda</p>
                </div>
            `;
            return;
        }
        
        // Agrupar mensagens por data
        const groupedMessages = this.groupMessagesByDate(messages);
        
        messagesContainer.innerHTML = Object.keys(groupedMessages).map(date => {
            const dateMessages = groupedMessages[date];
            const dateHeader = this.formatDateHeader(new Date(date));
            
            return `
                <div class="message-date-divider">
                    <span>${dateHeader}</span>
                </div>
                ${dateMessages.map(msg => this.renderMessage(msg)).join('')}
            `;
        }).join('');
        
        // Scroll para o final
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    groupMessagesByDate(messages) {
        const grouped = {};
        
        messages.forEach(msg => {
            const date = new Date(msg.createdAt);
            const dateKey = date.toDateString();
            
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            
            grouped[dateKey].push(msg);
        });
        
        return grouped;
    }

    renderMessage(msg) {
        const isSent = msg.fromEmployeeId === this.currentUser.id;
        const msgDate = new Date(msg.createdAt);
        const time = this.formatTime(msgDate);
        const date = msgDate.toLocaleDateString('pt-BR');
        
        return `
            <div class="message ${isSent ? 'sent' : 'received'}">
                <div class="message-bubble">
                    ${!isSent ? `
                        <div class="message-header">
                            <span class="message-sender">${this.escapeHtml(msg.fromEmployeeName || 'Funcionário')}</span>
                            <span class="message-time">${time}</span>
                        </div>
                        ${msg.subject ? `
                            <div class="message-subject">
                                <i class="fas fa-tag"></i>
                                ${this.escapeHtml(msg.subject)}
                                ${msg.priority && msg.priority !== 'normal' ? 
                                    `<span class="message-priority ${msg.priority}">${this.getPriorityDisplayName(msg.priority)}</span>` : 
                                    ''
                                }
                            </div>
                        ` : ''}
                    ` : ''}
                    ${msg.image ? `
                        <div class="message-image-container">
                            <img src="${this.escapeHtml(msg.image)}" alt="Imagem enviada" class="message-image" onclick="chatManager.openImageModal('${this.escapeHtml(msg.image)}')">
                        </div>
                    ` : ''}
                    ${msg.content ? `<div class="message-content">${this.escapeHtml(msg.content)}</div>` : ''}
                    ${(msg.deliveryName || msg.truckName) ? `
                        <div class="message-metadata" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.1); font-size: 0.85em; opacity: 0.8; color: #666;">
                            ${msg.deliveryName ? `
                                <div style="margin-bottom: 4px;">
                                    <i class="fas fa-box"></i> Entrega: ${this.escapeHtml(msg.deliveryName)}
                                </div>
                            ` : ''}
                            ${msg.truckName ? `
                                <div>
                                    <i class="fas fa-truck"></i> Caminhão: ${this.escapeHtml(msg.truckName)}
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                    ${isSent ? `
                        <div class="message-footer">
                            <span class="message-time">${time}</span>
                            <span class="message-status read">
                                <i class="fas fa-check-double"></i>
                            </span>
                        </div>
                    ` : `
                        <div class="message-footer">
                            <span class="message-time">${time}</span>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    openImageModal(imageSrc) {
        // Criar modal para visualizar imagem em tamanho maior
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            cursor: pointer;
        `;
        
        modal.innerHTML = `
            <div style="position: relative; max-width: 90%; max-height: 90%;">
                <img src="${this.escapeHtml(imageSrc)}" alt="Imagem" style="max-width: 100%; max-height: 90vh; border-radius: 8px;">
                <button onclick="this.closest('.image-modal').remove()" style="
                    position: absolute;
                    top: -40px;
                    right: 0;
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                ">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    }

    handleImageSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validar tipo de arquivo
        if (!file.type.startsWith('image/')) {
            this.showMessage('Por favor, selecione apenas arquivos de imagem!', 'error');
            event.target.value = '';
            return;
        }

        // Validar tamanho (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showMessage('A imagem deve ter no máximo 5MB!', 'error');
            event.target.value = '';
            return;
        }

        // Converter para base64
        const reader = new FileReader();
        reader.onload = (e) => {
            this.selectedImage = e.target.result;
            this.showImagePreview(this.selectedImage);
        };
        reader.readAsDataURL(file);
    }

    showImagePreview(imageData) {
        const preview = document.getElementById('imagePreviewChat');
        const previewImg = document.getElementById('imagePreviewChatImg');
        
        if (preview && previewImg) {
            previewImg.src = imageData;
            preview.style.display = 'flex';
        }
    }

    removeImagePreview() {
        this.selectedImage = null;
        const preview = document.getElementById('imagePreviewChat');
        const fileInput = document.getElementById('chatImageInput');
        
        if (preview) {
            preview.style.display = 'none';
        }
        if (fileInput) {
            fileInput.value = '';
        }
    }

    sendMessage() {
        const input = document.getElementById('chatMessageInput');
        if (!this.currentConversation) return;
        
        const content = input ? input.value.trim() : '';
        
        // Verificar se há conteúdo ou imagem
        if (!content && !this.selectedImage) return;
        
        // Criar mensagem
        const message = {
            id: 'MSG-' + Date.now(),
            fromEmployeeId: this.currentUser.id,
            fromEmployeeName: this.currentUser.name || 'Gestor',
            toEmployeeId: this.currentConversation.employeeId,
            toEmployeeName: this.currentConversation.employeeName,
            subject: null,
            content: content || '',
            image: this.selectedImage || null,
            priority: 'normal',
            read: false,
            createdAt: new Date().toISOString()
        };
        
        // Salvar mensagem
        this.messages.push(message);
        localStorage.setItem('employeeMessages', JSON.stringify(this.messages));
        
        // Criar log de mensagem enviada
        if (window.createChatLog) {
            const startTime = this.currentConversation.lastMessageTime ? new Date(this.currentConversation.lastMessageTime) : new Date();
            const duration = Math.floor((new Date() - startTime) / 1000);
            
            window.createChatLog('message_sent', {
                fromEmployeeId: this.currentUser.id,
                fromEmployeeName: this.currentUser.name || 'Gestor',
                toEmployeeId: this.currentConversation.employeeId,
                toEmployeeName: this.currentConversation.employeeName,
                messageId: message.id,
                messageContent: content || '[Imagem]',
                messageSubject: null,
                hasImage: !!this.selectedImage,
                duration: duration,
                conversationId: this.currentConversation.employeeId
            });
        }
        
        // Recarregar conversas para incluir a nova mensagem
        this.loadConversations();
        
        // Atualizar conversa atual
        const updatedConv = this.conversations.find(c => c.employeeId === this.currentConversation.employeeId);
        if (updatedConv) {
            this.currentConversation = updatedConv;
        }
        
        // Limpar input e imagem
        if (input) input.value = '';
        this.removeImagePreview();
        
        // Re-renderizar
        this.renderMessages();
        this.renderConversations();
        this.updateNavBadge();
        
        // Atualizar lista de funcionários se for gestor
        if (this.isManager) {
            this.renderEmployees();
        }
        
        // Log
        this.logAction(`Mensagem enviada para ${this.currentConversation.employeeName}`);
    }

    formatMessageTime(date) {
        const now = new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Ontem';
        } else if (diffDays < 7) {
            return date.toLocaleDateString('pt-BR', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        }
    }

    formatTime(date) {
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    formatDateHeader(date) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Hoje';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Ontem';
        } else {
            return date.toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long',
                year: 'numeric'
            });
        }
    }

    getPriorityDisplayName(priority) {
        const priorities = {
            'baixa': 'Baixa',
            'normal': 'Normal',
            'alta': 'Alta',
            'urgente': 'Urgente'
        };
        return priorities[priority] || priority || 'Normal';
    }

    escapeHtml(text) {
        if (text === null || text === undefined) {
            return '';
        }
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    showConversationInfo() {
        if (!this.currentConversation) return;
        
        const info = `
            <div style="line-height: 1.8;">
                <div><strong>Nome:</strong> ${this.escapeHtml(this.currentConversation.employeeName)}</div>
                <div><strong>Cargo:</strong> ${this.escapeHtml(this.getRoleDisplayName(this.currentConversation.employeeRole))}</div>
                <div><strong>Total de Mensagens:</strong> ${this.currentConversation.messages.length}</div>
                <div><strong>Mensagens Não Lidas:</strong> ${this.currentConversation.unreadCount}</div>
                <div><strong>Última Mensagem:</strong> ${this.currentConversation.lastMessage ? new Date(this.currentConversation.lastMessage.createdAt).toLocaleString('pt-BR') : 'N/A'}</div>
            </div>
        `.trim();
        
        this.showInfoModal('Informações da Conversa', info);
    }
    
    showConfirmModal(title, message, onConfirm) {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmModalTitle');
        const messageEl = document.getElementById('confirmModalMessage');
        const confirmBtn = document.getElementById('confirmModalConfirm');
        
        if (titleEl) titleEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${this.escapeHtml(title)}`;
        if (messageEl) messageEl.innerHTML = message;
        
        // Remover listeners anteriores
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        // Adicionar novo listener
        newConfirmBtn.addEventListener('click', () => {
            if (onConfirm && typeof onConfirm === 'function') {
                onConfirm();
            }
            this.closeConfirmModal();
        });
        
        if (modal) modal.style.display = 'block';
    }
    
    closeConfirmModal() {
        const modal = document.getElementById('confirmModal');
        if (modal) modal.style.display = 'none';
    }
    
    showInfoModal(title, message) {
        const modal = document.getElementById('infoModal');
        const titleEl = document.getElementById('infoModalTitle');
        const messageEl = document.getElementById('infoModalMessage');
        
        if (titleEl) titleEl.innerHTML = `<i class="fas fa-info-circle"></i> ${this.escapeHtml(title)}`;
        if (messageEl) messageEl.innerHTML = message;
        
        if (modal) modal.style.display = 'block';
    }
    
    closeInfoModal() {
        const modal = document.getElementById('infoModal');
        if (modal) modal.style.display = 'none';
    }
    
    setupModalListeners() {
        // Fechar modal ao clicar fora
        window.addEventListener('click', (e) => {
            const confirmModal = document.getElementById('confirmModal');
            const infoModal = document.getElementById('infoModal');
            
            if (e.target === confirmModal) {
                this.closeConfirmModal();
            }
            if (e.target === infoModal) {
                this.closeInfoModal();
            }
        });
        
        // Fechar modal com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeConfirmModal();
                this.closeInfoModal();
            }
        });
    }

    getRoleDisplayName(role) {
        const roleNames = {
            'gestor': 'Gestor',
            'atendente': 'Atendente',
            'motorista': 'Motorista',
            'funcionario': 'Funcionário'
        };
        return roleNames[role] || role;
    }

    deleteConversation() {
        if (!this.currentConversation) return;
        
        const employeeName = this.currentConversation.employeeName;
        const confirmMessage = `
            <div style="line-height: 1.8;">
                <p>Tem certeza que deseja excluir todas as mensagens da conversa com <strong>${this.escapeHtml(employeeName)}</strong>?</p>
                <p style="color: var(--accent-red); margin-top: 12px;"><i class="fas fa-exclamation-circle"></i> Esta ação não pode ser desfeita.</p>
            </div>
        `;
        
        this.showConfirmModal(
            'Excluir Conversa',
            confirmMessage,
            () => {
                this.executeDeleteConversation();
            }
        );
    }
    
    executeDeleteConversation() {
        if (!this.currentConversation) return;
        
        const employeeName = this.currentConversation.employeeName;
        
        // Contar mensagens antes de excluir
        const employeeId = this.currentConversation.employeeId;
        const currentUserId = this.currentUser.id;
        const messagesToDelete = this.messages.filter(msg => {
            const isFromEmployee = msg.fromEmployeeId === employeeId && (!msg.toEmployeeId || msg.toEmployeeId === currentUserId);
            const isToEmployee = msg.toEmployeeId === employeeId && msg.fromEmployeeId === currentUserId;
            return isFromEmployee || isToEmployee;
        });
        
        // Remover todas as mensagens desta conversa
        this.messages = this.messages.filter(msg => {
            // Manter apenas mensagens que NÃO são desta conversa
            const isFromEmployee = msg.fromEmployeeId === employeeId && (!msg.toEmployeeId || msg.toEmployeeId === currentUserId);
            const isToEmployee = msg.toEmployeeId === employeeId && msg.fromEmployeeId === currentUserId;
            
            return !(isFromEmployee || isToEmployee);
        });
        
        // Salvar mensagens atualizadas
        localStorage.setItem('employeeMessages', JSON.stringify(this.messages));
        
        // Criar log de chat excluído
        if (window.createChatLog) {
            window.createChatLog('chat_deleted', {
                fromEmployeeId: employeeId,
                fromEmployeeName: employeeName,
                toEmployeeId: currentUserId,
                toEmployeeName: this.currentUser.name || 'Gestor',
                conversationId: employeeId,
                metadata: {
                    messagesDeleted: messagesToDelete.length,
                    deletedAt: new Date().toISOString()
                }
            });
        }
        
        // Recarregar conversas
        this.loadConversations();
        
        // Fechar conversa atual
        this.currentConversation = null;
        this.renderChat();
        this.renderConversations();
        
        // Atualizar lista de funcionários se for gestor
        if (this.isManager) {
            this.renderEmployees();
        }
        
        // Log
        this.logAction(`Conversa excluída com ${employeeName}`);
        
        // Mostrar mensagem de sucesso
        this.showMessage('Conversa excluída com sucesso!', 'success');
    }

    showMessage(message, type = 'info') {
        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--accent-green)' : type === 'error' ? 'var(--accent-red)' : 'var(--accent-blue)'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 400px;
            animation: slideInRight 0.3s ease;
        `;
        messageEl.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${this.escapeHtml(message)}</span>
        `;
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.style.opacity = '0';
            messageEl.style.transition = 'opacity 0.3s';
            setTimeout(() => messageEl.remove(), 300);
        }, 3000);
    }

    logAction(action) {
        const logs = JSON.parse(localStorage.getItem('systemLogs') || '[]');
        logs.unshift({
            timestamp: new Date().toISOString(),
            user: this.currentUser.name || this.currentUser.email,
            action: action,
            type: 'chat'
        });
        if (logs.length > 1000) logs.splice(1000);
        localStorage.setItem('systemLogs', JSON.stringify(logs));
    }

    checkIfManager() {
        const role = this.currentUser.role || '';
        this.isManager = role === 'gestor' || role === 'desenvolvedor';
        
        const employeesSection = document.getElementById('employeesSection');
        if (employeesSection) {
            employeesSection.style.display = this.isManager ? 'block' : 'none';
        }
    }

    renderEmployees() {
        if (!this.isManager) return;
        
        const employeesList = document.getElementById('employeesList');
        if (!employeesList) return;
        
        // Filtrar apenas funcionários e motoristas (não gestores)
        const availableEmployees = this.employees.filter(emp => {
            const empRole = emp.role || '';
            return empRole !== 'gestor' && empRole !== 'desenvolvedor';
        });
        
        this.filteredEmployees = availableEmployees;
        
        if (availableEmployees.length === 0) {
            employeesList.innerHTML = `
                <div class="chat-empty-state" style="padding: 20px;">
                    <i class="fas fa-users"></i>
                    <p>Nenhum funcionário encontrado</p>
                </div>
            `;
            return;
        }
        
        employeesList.innerHTML = availableEmployees.map(emp => {
            const employeePhoto = emp.photo || emp.profilePhoto || null;
            const employeeName = emp.name || 'Funcionário';
            const employeeRole = emp.role || 'funcionario';
            const roleNames = {
                'gestor': 'Gestor',
                'atendente': 'Atendente',
                'motorista': 'Motorista',
                'funcionario': 'Funcionário'
            };
            const roleDisplay = roleNames[employeeRole] || employeeRole;
            
            // Verificar se já existe conversa com este funcionário
            const hasConversation = this.conversations.some(conv => 
                conv.employeeId === emp.id || String(conv.employeeId) === String(emp.id)
            );
            
            return `
                <div class="employee-item" onclick="chatManager.openEmployeeConversation('${emp.id}')">
                    <div class="conversation-avatar">
                        ${employeePhoto ? 
                            `<img src="${this.escapeHtml(employeePhoto)}" alt="${this.escapeHtml(employeeName)}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-user\\'></i>'">` :
                            `<i class="fas fa-user"></i>`
                        }
                    </div>
                    <div class="conversation-info">
                        <div class="conversation-header">
                            <span class="conversation-name">${this.escapeHtml(employeeName)}</span>
                            ${hasConversation ? '<span class="conversation-badge"><i class="fas fa-comment"></i></span>' : ''}
                        </div>
                        <div class="conversation-preview">
                            <span class="conversation-preview-text">${this.escapeHtml(roleDisplay)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    filterEmployees(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        
        if (!term) {
            this.filteredEmployees = this.employees.filter(emp => {
                const empRole = emp.role || '';
                return empRole !== 'gestor' && empRole !== 'desenvolvedor';
            });
        } else {
            this.filteredEmployees = this.employees.filter(emp => {
                const empRole = emp.role || '';
                if (empRole === 'gestor' || empRole === 'desenvolvedor') return false;
                const name = (emp.name || '').toLowerCase();
                return name.includes(term);
            });
        }
        
        this.renderFilteredEmployees();
    }

    renderFilteredEmployees() {
        const employeesList = document.getElementById('employeesList');
        if (!employeesList) return;
        
        if (this.filteredEmployees.length === 0) {
            employeesList.innerHTML = `
                <div class="chat-empty-state" style="padding: 20px;">
                    <i class="fas fa-search"></i>
                    <p>Nenhum funcionário encontrado</p>
                </div>
            `;
            return;
        }
        
        employeesList.innerHTML = this.filteredEmployees.map(emp => {
            const employeePhoto = emp.photo || emp.profilePhoto || null;
            const employeeName = emp.name || 'Funcionário';
            const employeeRole = emp.role || 'funcionario';
            const roleNames = {
                'gestor': 'Gestor',
                'atendente': 'Atendente',
                'motorista': 'Motorista',
                'funcionario': 'Funcionário'
            };
            const roleDisplay = roleNames[employeeRole] || employeeRole;
            
            // Verificar se já existe conversa com este funcionário
            const hasConversation = this.conversations.some(conv => 
                conv.employeeId === emp.id || String(conv.employeeId) === String(emp.id)
            );
            
            return `
                <div class="employee-item" onclick="chatManager.openEmployeeConversation('${emp.id}')">
                    <div class="conversation-avatar">
                        ${employeePhoto ? 
                            `<img src="${this.escapeHtml(employeePhoto)}" alt="${this.escapeHtml(employeeName)}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-user\\'></i>'">` :
                            `<i class="fas fa-user"></i>`
                        }
                    </div>
                    <div class="conversation-info">
                        <div class="conversation-header">
                            <span class="conversation-name">${this.escapeHtml(employeeName)}</span>
                            ${hasConversation ? '<span class="conversation-badge"><i class="fas fa-comment"></i></span>' : ''}
                        </div>
                        <div class="conversation-preview">
                            <span class="conversation-preview-text">${this.escapeHtml(roleDisplay)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    openEmployeeConversation(employeeId) {
        // Verificar se já existe conversa
        let conversation = this.conversations.find(c => 
            c.employeeId === employeeId || String(c.employeeId) === String(employeeId)
        );
        
        // Se não existe, criar uma nova conversa
        if (!conversation) {
            const employee = this.employees.find(emp => 
                emp.id === employeeId || String(emp.id) === String(employeeId)
            );
            
            if (!employee) return;
            
            const employeePhoto = employee.photo || employee.profilePhoto || null;
            conversation = {
                employeeId: employeeId,
                employeeName: employee.name || 'Funcionário',
                employeeRole: employee.role || 'funcionario',
                employeePhoto: employeePhoto,
                messages: [],
                unreadCount: 0,
                lastMessage: null,
                lastMessageTime: null
            };
            
            // Adicionar à lista de conversas
            this.conversations.unshift(conversation);
        }
        
        // Abrir a conversa
        this.currentConversation = conversation;
        this.renderChat();
        this.renderConversations();
        if (this.isManager) {
            this.renderEmployees();
        }
        
        // Scroll para o topo
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Initialize chat
let chatManager;
document.addEventListener('DOMContentLoaded', () => {
    chatManager = new ChatManager();
    window.chatManager = chatManager;
});


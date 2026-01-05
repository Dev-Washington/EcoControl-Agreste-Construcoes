// Sistema de Chat - Estilo WhatsApp para Funcionários
class EmployeeChat {
    constructor() {
        this.currentUser = null;
        this.messages = [];
        this.currentConversation = null;
        this.selectedImage = null;
        this.deliveries = [];
        this.trucks = [];
        this.handleDeliveryChange = null;
        this.photoUpdateInterval = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadData();
        this.setupEventListeners();
        this.loadConversations();
        this.renderConversations();
        
        // Forçar atualização da foto ao carregar
        setTimeout(() => this.updateUserInfo(), 500);
    }

    checkAuth() {
        const user = sessionStorage.getItem('currentEmployee');
        if (!user) {
            window.location.href = './login.html';
            return;
        }
        
        this.currentUser = JSON.parse(user);
        
        // Buscar dados completos do funcionário (sempre do localStorage para ter a foto atualizada)
        const employees = JSON.parse(localStorage.getItem('employees') || '[]');
        const fullEmployeeData = employees.find(emp => 
            (emp.email && this.currentUser.email && emp.email.toLowerCase() === this.currentUser.email.toLowerCase()) ||
            emp.id === this.currentUser.id ||
            (emp.name && this.currentUser.name && emp.name === this.currentUser.name)
        );
        
        if (fullEmployeeData) {
            // Garantir que a foto seja sempre do localStorage (mais atualizada)
            this.currentUser = { 
                ...this.currentUser, 
                ...fullEmployeeData, 
                id: fullEmployeeData.id || this.currentUser.id,
                photo: fullEmployeeData.photo || fullEmployeeData.profilePhoto || this.currentUser.photo || this.currentUser.profilePhoto || null
            };
            // Atualizar sessionStorage com dados atualizados
            sessionStorage.setItem('currentEmployee', JSON.stringify(this.currentUser));
        }
        
        this.updateUserInfo();
        
        // Monitorar mudanças no localStorage para atualizar foto automaticamente
        this.setupPhotoUpdateListener();
    }
    
    setupPhotoUpdateListener() {
        // Limpar intervalo anterior se existir
        if (this.photoUpdateInterval) {
            clearInterval(this.photoUpdateInterval);
        }
        
        // Verificar atualizações periódicas na foto do funcionário
        this.photoUpdateInterval = setInterval(() => {
            if (!this.currentUser || !this.currentUser.id) return;
            
            const employees = JSON.parse(localStorage.getItem('employees') || '[]');
            const updatedEmployee = employees.find(emp => 
                emp.id === this.currentUser.id ||
                (emp.email && this.currentUser.email && emp.email.toLowerCase() === this.currentUser.email.toLowerCase())
            );
            
            if (updatedEmployee) {
                const newPhoto = updatedEmployee.photo || updatedEmployee.profilePhoto || null;
                const currentPhoto = this.currentUser.photo || this.currentUser.profilePhoto || null;
                
                // Se a foto mudou, atualizar
                if (newPhoto !== currentPhoto) {
                    this.currentUser.photo = updatedEmployee.photo || null;
                    this.currentUser.profilePhoto = updatedEmployee.profilePhoto || null;
                    this.updateUserInfo();
                }
            }
        }, 2000); // Verificar a cada 2 segundos
    }

    formatShortName(fullName) {
        if (!fullName || typeof fullName !== 'string') {
            return '';
        }
        
        // Remover espaços extras e dividir o nome
        const nameParts = fullName.trim().split(/\s+/).filter(part => part.length > 0);
        
        if (nameParts.length === 0) {
            return '';
        }
        
        // Se tiver apenas uma parte, retornar ela
        if (nameParts.length === 1) {
            return nameParts[0];
        }
        
        // Primeiro nome sempre completo (capitalizado)
        let formatted = this.capitalizeFirst(nameParts[0]);
        
        // Meio do nome: apenas iniciais com ponto
        for (let i = 1; i < nameParts.length - 1; i++) {
            if (nameParts[i].length > 0) {
                formatted += ' ' + nameParts[i].charAt(0).toUpperCase() + '.';
            }
        }
        
        // Último nome sempre completo (sobrenome)
        if (nameParts.length > 1) {
            formatted += ' ' + this.capitalizeFirst(nameParts[nameParts.length - 1]);
        }
        
        return formatted;
    }

    capitalizeFirst(str) {
        if (!str || typeof str !== 'string') return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    updateUserInfo() {
        const userNameEl = document.getElementById('sidebarUserName');
        const userRoleEl = document.getElementById('sidebarUserRole');
        const userAvatarEl = document.querySelector('.user-avatar-sidebar');
        
        if (userNameEl) {
            const fullName = this.currentUser.name || 'Funcionário';
            userNameEl.textContent = this.formatShortName(fullName);
            userNameEl.title = fullName; // Tooltip com nome completo
        }
        if (userRoleEl) {
            const roleNames = {
                'gestor': 'Gestor',
                'atendente': 'Atendente',
                'motorista': 'Motorista',
                'funcionario': 'Funcionário'
            };
            userRoleEl.textContent = roleNames[this.currentUser.role] || this.currentUser.role;
        }
        
        // Atualizar avatar com foto do perfil (sempre verificar do localStorage primeiro)
        if (userAvatarEl) {
            // Buscar foto atualizada do localStorage
            const employees = JSON.parse(localStorage.getItem('employees') || '[]');
            const currentEmployee = employees.find(emp => 
                emp.id === this.currentUser.id ||
                (emp.email && this.currentUser.email && emp.email.toLowerCase() === this.currentUser.email.toLowerCase())
            );
            
            const employeePhoto = currentEmployee ? 
                (currentEmployee.photo || currentEmployee.profilePhoto || null) :
                (this.currentUser.photo || this.currentUser.profilePhoto || null);
            
            if (employeePhoto) {
                // Verificar se já existe uma imagem e se é a mesma
                const existingImg = userAvatarEl.querySelector('img');
                if (existingImg && existingImg.src === employeePhoto) {
                    // Foto já está exibida, não precisa atualizar
                    return;
                }
                
                // Criar nova imagem
                const img = document.createElement('img');
                img.src = employeePhoto;
                img.alt = this.currentUser.name || 'Funcionário';
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.borderRadius = '50%';
                img.style.objectFit = 'cover';
                img.onerror = () => {
                    userAvatarEl.innerHTML = '<i class="fas fa-user"></i>';
                };
                
                // Limpar e adicionar nova imagem
                userAvatarEl.innerHTML = '';
                userAvatarEl.appendChild(img);
            } else {
                // Verificar se já está exibindo o ícone padrão
                const existingIcon = userAvatarEl.querySelector('i.fa-user');
                if (!existingIcon) {
                    userAvatarEl.innerHTML = '<i class="fas fa-user"></i>';
                }
            }
        }
    }

    loadData() {
        this.messages = JSON.parse(localStorage.getItem('employeeMessages') || '[]');
        this.deliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
        this.trucks = JSON.parse(localStorage.getItem('trucks') || '[]');
        
        if (!Array.isArray(this.messages)) this.messages = [];
        if (!Array.isArray(this.deliveries)) this.deliveries = [];
        if (!Array.isArray(this.trucks)) this.trucks = [];
    }

    setupEventListeners() {
        // Busca de conversas
        const searchInput = document.getElementById('searchChatInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterConversations(e.target.value);
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

        // Fechar modal
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    loadConversations() {
        // Agrupar mensagens com gestor/suporte
        const conversationsMap = new Map();
        const currentUserId = this.currentUser.id;
        
        this.messages.forEach(msg => {
            // Mensagens enviadas pelo funcionário (para gestor/suporte)
            if (msg.fromEmployeeId === currentUserId && (!msg.toEmployeeId || msg.toEmployeeId === null)) {
                // Criar conversa com "Suporte/Gestor"
                const conversationKey = 'suporte';
                
                if (!conversationsMap.has(conversationKey)) {
                    conversationsMap.set(conversationKey, {
                        conversationKey: conversationKey,
                        conversationName: 'Suporte/Gestor',
                        conversationRole: 'Administração',
                        messages: [],
                        unreadCount: 0,
                        lastMessage: null,
                        lastMessageTime: null
                    });
                }
                
                const conversation = conversationsMap.get(conversationKey);
                conversation.messages.push(msg);
                
                // Atualizar última mensagem
                const msgTime = new Date(msg.createdAt);
                if (!conversation.lastMessageTime || msgTime > conversation.lastMessageTime) {
                    conversation.lastMessageTime = msgTime;
                    conversation.lastMessage = msg;
                }
            }
            // Mensagens recebidas do gestor (respostas)
            else if (msg.toEmployeeId === currentUserId && msg.fromEmployeeId !== currentUserId) {
                const conversationKey = 'suporte';
                
                if (!conversationsMap.has(conversationKey)) {
                    conversationsMap.set(conversationKey, {
                        conversationKey: conversationKey,
                        conversationName: 'Suporte/Gestor',
                        conversationRole: 'Administração',
                        messages: [],
                        unreadCount: 0,
                        lastMessage: null,
                        lastMessageTime: null
                    });
                }
                
                const conversation = conversationsMap.get(conversationKey);
                conversation.messages.push(msg);
                
                // Verificar se não foi lida
                if (!msg.read) {
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
        
        // Converter para array
        this.conversations = Array.from(conversationsMap.values())
            .sort((a, b) => {
                if (!a.lastMessageTime && !b.lastMessageTime) return 0;
                if (!a.lastMessageTime) return 1;
                if (!b.lastMessageTime) return -1;
                return b.lastMessageTime - a.lastMessageTime;
            });
        
        this.updateNavBadge();
    }

    updateNavBadge() {
        const totalUnread = this.conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
        const badge = document.getElementById('navMessagesBadge');
        
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
            conv.conversationName.toLowerCase().includes(term) ||
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
                <div class="chat-empty-state" style="padding: 40px 20px; height: auto;">
                    <i class="fas fa-comments"></i>
                    <p>Nenhuma conversa ainda</p>
                    <p style="font-size: 12px; margin-top: 8px;">Envie uma nova mensagem para começar</p>
                </div>
            `;
            return;
        }
        
        list.innerHTML = convsToRender.map(conv => {
            const lastMsg = conv.lastMessage;
            const preview = lastMsg ? (lastMsg.content || '').substring(0, 50) : 'Nenhuma mensagem';
            const time = lastMsg ? this.formatMessageTime(new Date(lastMsg.createdAt)) : '';
            const isActive = this.currentConversation && this.currentConversation.conversationKey === conv.conversationKey;
            
            return `
                <div class="conversation-item ${isActive ? 'active' : ''}" onclick="employeeChat.openConversation('${conv.conversationKey}')">
                    <div class="conversation-avatar">
                        <i class="fas fa-user-shield"></i>
                        ${conv.unreadCount > 0 ? `<span class="unread-badge">${conv.unreadCount > 99 ? '99+' : conv.unreadCount}</span>` : ''}
                    </div>
                    <div class="conversation-info">
                        <div class="conversation-header">
                            <span class="conversation-name">${this.escapeHtml(conv.conversationName)}</span>
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

    openConversation(conversationKey) {
        const conversation = this.conversations.find(c => c.conversationKey === conversationKey);
        if (!conversation) {
            // Se não existe, criar conversa com suporte
            this.currentConversation = {
                conversationKey: 'suporte',
                conversationName: 'Suporte/Gestor',
                conversationRole: 'Administração',
                messages: [],
                unreadCount: 0,
                lastMessage: null,
                lastMessageTime: null
            };
        } else {
            this.currentConversation = conversation;
        }
        
        // Marcar mensagens como lidas
        this.markConversationAsRead();
        
        // Renderizar conversa
        this.renderChat();
        this.renderConversations();
    }

    markConversationAsRead() {
        if (!this.currentConversation) return;
        
        let updated = false;
        const currentUserId = this.currentUser.id;
        
        this.messages.forEach(msg => {
            if (msg.toEmployeeId === currentUserId && !msg.read) {
                msg.read = true;
                updated = true;
            }
        });
        
        if (updated) {
            localStorage.setItem('employeeMessages', JSON.stringify(this.messages));
            this.loadConversations();
            this.updateNavBadge();
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
                    <p style="font-size: 12px; margin-top: 8px;">Envie uma mensagem para suporte/gestão</p>
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
        
        return `
            <div class="message ${isSent ? 'sent' : 'received'}">
                <div class="message-bubble">
                    ${!isSent ? `
                        <div class="message-header">
                            <span class="message-sender">${this.escapeHtml(msg.fromEmployeeName || 'Suporte/Gestor')}</span>
                            <span class="message-time">${time}</span>
                        </div>
                    ` : ''}
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
                    ${msg.image ? `
                        <div class="message-image-container">
                            <img src="${this.escapeHtml(msg.image)}" alt="Imagem enviada" class="message-image" onclick="employeeChat.openImageModal('${this.escapeHtml(msg.image)}')">
                        </div>
                    ` : ''}
                    ${msg.content ? `<div class="message-content">${this.escapeHtml(msg.content)}</div>` : ''}
                    ${(msg.deliveryName || msg.truckName) ? `
                        <div class="message-metadata" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.85em; opacity: 0.8;">
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
                            <span class="message-status ${msg.read ? 'read' : ''}">
                                <i class="fas ${msg.read ? 'fa-check-double' : 'fa-check'}"></i>
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

    sendMessage() {
        const input = document.getElementById('chatMessageInput');
        if (!input) return;
        
        // Se não há conversa ativa, criar uma nova
        if (!this.currentConversation) {
            this.openNewMessageModal();
            return;
        }
        
        const content = input.value.trim();
        if (!content) return;
        
        // Criar mensagem
        const message = {
            id: 'MSG-' + Date.now(),
            fromEmployeeId: this.currentUser.id,
            fromEmployeeName: this.currentUser.name || 'Funcionário',
            toEmployeeId: null, // null = para gestor/suporte
            toEmployeeName: 'Gestor/Suporte',
            subject: null,
            content: content,
            priority: 'normal',
            read: false,
            createdAt: new Date().toISOString()
        };
        
        // Salvar mensagem
        this.messages.push(message);
        localStorage.setItem('employeeMessages', JSON.stringify(this.messages));
        
        // Criar log de mensagem enviada
        if (window.createChatLog) {
            window.createChatLog('message_sent', {
                fromEmployeeId: this.currentUser.id,
                fromEmployeeName: this.currentUser.name || 'Funcionário',
                toEmployeeId: null,
                toEmployeeName: 'Gestor/Suporte',
                messageId: message.id,
                messageContent: content,
                messageSubject: null,
                hasImage: false,
                conversationId: 'suporte'
            });
        }
        
        // Recarregar conversas
        this.loadConversations();
        
        // Atualizar conversa atual
        const updatedConv = this.conversations.find(c => c.conversationKey === 'suporte');
        if (updatedConv) {
            this.currentConversation = updatedConv;
        }
        
        // Limpar input
        input.value = '';
        
        // Re-renderizar
        this.renderMessages();
        this.renderConversations();
        this.updateNavBadge();
    }

    openNewMessageModal() {
        const modal = document.getElementById('newMessageModal');
        if (modal) {
            modal.style.display = 'block';
            document.getElementById('newMessageForm').reset();
            this.populateDeliveryAndTruckSelects();
        }
    }

    closeNewMessageModal() {
        const modal = document.getElementById('newMessageModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    populateDeliveryAndTruckSelects() {
        const userId = this.currentUser.id;
        
        // Filtrar entregas do motorista que não estão concluídas
        const userDeliveries = this.deliveries.filter(d => {
            const isAssigned = d.driverId === userId || 
                              d.employeeId === userId ||
                              String(d.driverId) === String(userId) ||
                              String(d.employeeId) === String(userId);
            const isNotCompleted = d.status !== 'entregue' && d.status !== 'concluida';
            return isAssigned && isNotCompleted;
        });
        
        // Preencher select de entregas
        const deliverySelect = document.getElementById('newMessageDelivery');
        if (deliverySelect) {
            deliverySelect.innerHTML = '<option value="">Selecione a entrega...</option>';
            userDeliveries.forEach(delivery => {
                const option = document.createElement('option');
                const deliveryCode = delivery.trackingCode || delivery.code || delivery.id;
                const customerName = delivery.customerName || 'Cliente';
                option.value = delivery.id || deliveryCode;
                option.textContent = `${deliveryCode} - ${customerName}`;
                option.dataset.truckId = delivery.truckId || '';
                deliverySelect.appendChild(option);
            });
            
            // Adicionar event listener para atualizar caminhão quando entrega mudar
            if (this.handleDeliveryChange) {
                deliverySelect.removeEventListener('change', this.handleDeliveryChange);
            }
            this.handleDeliveryChange = (e) => {
                this.updateTruckSelect(e.target.value);
            };
            deliverySelect.addEventListener('change', this.handleDeliveryChange);
        }
        
        // Inicializar select de caminhões vazio
        const truckSelect = document.getElementById('newMessageTruck');
        if (truckSelect) {
            truckSelect.innerHTML = '<option value="">Selecione a entrega primeiro...</option>';
            truckSelect.disabled = true;
        }
    }
    
    updateTruckSelect(deliveryId) {
        const truckSelect = document.getElementById('newMessageTruck');
        if (!truckSelect) return;
        
        if (!deliveryId) {
            truckSelect.innerHTML = '<option value="">Selecione a entrega primeiro...</option>';
            truckSelect.disabled = true;
            return;
        }
        
        // Buscar a entrega selecionada
        const selectedDelivery = this.deliveries.find(d => 
            d.id === deliveryId || 
            d.trackingCode === deliveryId || 
            d.code === deliveryId
        );
        
        if (!selectedDelivery || !selectedDelivery.truckId) {
            truckSelect.innerHTML = '<option value="">Nenhum caminhão atribuído a esta entrega</option>';
            truckSelect.disabled = true;
            return;
        }
        
        // Buscar o caminhão da entrega
        const truck = this.trucks.find(t => 
            t.id === selectedDelivery.truckId ||
            String(t.id) === String(selectedDelivery.truckId)
        );
        
        if (!truck) {
            truckSelect.innerHTML = '<option value="">Caminhão não encontrado</option>';
            truckSelect.disabled = true;
            return;
        }
        
        // Preencher com o caminhão da entrega
        truckSelect.innerHTML = '';
        const option = document.createElement('option');
        option.value = truck.id;
        option.textContent = `${truck.id} - ${truck.plate || 'Sem placa'}`;
        option.selected = true;
        truckSelect.appendChild(option);
        truckSelect.disabled = false;
    }

    handleNewMessageImageSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validar tipo de arquivo
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione apenas arquivos de imagem!');
            event.target.value = '';
            return;
        }

        // Validar tamanho (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 5MB!');
            event.target.value = '';
            return;
        }

        // Converter para base64
        const reader = new FileReader();
        reader.onload = (e) => {
            this.selectedImage = e.target.result;
            const preview = document.getElementById('imagePreviewNewMessage');
            const previewImg = document.getElementById('imagePreviewNewMessageImg');
            
            if (preview && previewImg) {
                previewImg.src = this.selectedImage;
                preview.style.display = 'flex';
            }
        };
        reader.readAsDataURL(file);
    }

    removeNewMessageImagePreview() {
        this.selectedImage = null;
        const preview = document.getElementById('imagePreviewNewMessage');
        const fileInput = document.getElementById('newMessageImage');
        
        if (preview) {
            preview.style.display = 'none';
        }
        if (fileInput) {
            fileInput.value = '';
        }
    }

    sendNewMessage(event) {
        event.preventDefault();
        
        const subject = document.getElementById('newMessageSubject').value.trim();
        const content = document.getElementById('newMessageContent').value.trim();
        const priority = document.getElementById('newMessagePriority').value;
        const deliveryId = document.getElementById('newMessageDelivery')?.value || null;
        const truckId = document.getElementById('newMessageTruck')?.value || null;

        if (!subject || (!content && !this.selectedImage)) {
            alert('Por favor, preencha o assunto e a mensagem ou anexe uma imagem.');
            return;
        }

        // Buscar informações da entrega e caminhão selecionados
        const selectedDelivery = deliveryId ? this.deliveries.find(d => 
            d.id === deliveryId || 
            d.trackingCode === deliveryId || 
            d.code === deliveryId
        ) : null;
        
        const selectedTruck = truckId ? this.trucks.find(t => t.id === truckId) : null;

        // Criar mensagem
        const message = {
            id: 'MSG-' + Date.now(),
            fromEmployeeId: this.currentUser.id,
            fromEmployeeName: this.currentUser.name || 'Funcionário',
            toEmployeeId: null, // null = para gestor/suporte
            toEmployeeName: 'Gestor/Suporte',
            subject: subject,
            content: content || '',
            image: this.selectedImage || null,
            priority: priority,
            deliveryId: deliveryId,
            deliveryName: selectedDelivery ? (selectedDelivery.trackingCode || selectedDelivery.code || selectedDelivery.id) : null,
            truckId: truckId,
            truckName: selectedTruck ? `${selectedTruck.id} - ${selectedTruck.plate || ''}` : null,
            read: false,
            createdAt: new Date().toISOString()
        };
        
        // Limpar imagem após enviar
        this.removeNewMessageImagePreview();

        // Salvar mensagem
        this.messages.push(message);
        localStorage.setItem('employeeMessages', JSON.stringify(this.messages));
        
        // Criar log de mensagem enviada
        if (window.createChatLog) {
            window.createChatLog('message_sent', {
                fromEmployeeId: this.currentUser.id,
                fromEmployeeName: this.currentUser.name || 'Funcionário',
                toEmployeeId: null,
                toEmployeeName: 'Gestor/Suporte',
                messageId: message.id,
                messageContent: content,
                messageSubject: subject,
                hasImage: !!message.image,
                deliveryId: deliveryId,
                deliveryName: message.deliveryName,
                truckId: truckId,
                truckName: message.truckName,
                conversationId: 'suporte'
            });
        }

        // Fechar modal
        this.closeNewMessageModal();

        // Recarregar conversas e abrir conversa
        this.loadConversations();
        
        // Aguardar um pouco para garantir que as conversas foram carregadas
        setTimeout(() => {
            this.openConversation('suporte');
            // Mostrar mensagem de sucesso
            this.showMessage('Mensagem enviada com sucesso!', 'success');
        }, 100);
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

    logout() {
        const self = this;
        window.showGlobalConfirmModal(
            'Confirmar Saída',
            'Deseja realmente sair?',
            () => {
                self.executeLogout();
            }
        );
        return;
    }
    
    executeLogout() {
        sessionStorage.removeItem('currentEmployee');
        window.location.href = './login.html';
    }
}

// Initialize chat
let employeeChat;
document.addEventListener('DOMContentLoaded', () => {
    employeeChat = new EmployeeChat();
    window.employeeChat = employeeChat;
    
    // Setup logout button event listener
    // Logout agora é tratado via onclick no HTML
});


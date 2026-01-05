// Sistema de Gerenciamento de Clientes
class CustomerManager {
    constructor() {
        this.currentUser = null;
        this.customers = [];
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadData();
        this.setupEventListeners();
        this.updateStatusCounts();
        this.renderCustomers();
    }

    checkAuth() {
        const user = sessionStorage.getItem('currentUser');
        if (!user) {
            window.location.href = '../login.html';
            return;
        }
        
        this.currentUser = JSON.parse(user);
        this.updateUserInfo();
    }

    updateUserInfo() {
        const userNameEl = document.getElementById('userName');
        const userRoleEl = document.getElementById('userRole');
        
        if (userNameEl) userNameEl.textContent = this.currentUser.name;
        if (userRoleEl) userRoleEl.textContent = this.getRoleDisplayName(this.currentUser.role);
    }

    getRoleDisplayName(role) {
        const roles = {
            'desenvolvedor': 'Desenvolvedor',
            'administrador': 'Administrador',
            'gestor': 'Gestor',
            'motorista': 'Motorista',
            'funcionario': 'Funcionário',
            'operador': 'Operador'
        };
        return roles[role] || role;
    }

    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    loadData() {
        this.customers = JSON.parse(localStorage.getItem('customers') || '[]');
        if (!Array.isArray(this.customers)) this.customers = [];
    }

    setupEventListeners() {
        document.getElementById('newCustomerBtn').addEventListener('click', () => {
            this.openNewCustomerModal();
        });

        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.performSearch();
            }
        });

        document.getElementById('searchInput').addEventListener('input', () => {
            this.renderCustomers();
        });

        document.getElementById('clearSearchBtn').addEventListener('click', () => {
            this.clearSearch();
        });

        // Filtros
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remover active de todos
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                // Adicionar active no clicado
                e.currentTarget.classList.add('active');
                // Aplicar filtro
                this.renderCustomers();
            });
        });

        this.setupModalEvents();
        this.setupDocumentInputs();
        this.setupPhoneInputs();
        this.setupZipCodeInputs();
        this.setupCustomerTypeToggle();
    }

    setupModalEvents() {
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal.style.display = 'none';
            });
        });

        document.getElementById('cancelCustomerBtn').addEventListener('click', () => {
            document.getElementById('newCustomerModal').style.display = 'none';
        });

        document.getElementById('cancelEditCustomerBtn').addEventListener('click', () => {
            document.getElementById('editCustomerModal').style.display = 'none';
        });

        document.getElementById('newCustomerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createCustomer();
        });

        document.getElementById('editCustomerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateCustomer();
        });

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    setupDocumentInputs() {
        const documentInputs = [
            'customerDocument',
            'editCustomerDocument'
        ];

        // Usar a formatação automática global
        documentInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input && window.setupCPFCNPJInput) {
                window.setupCPFCNPJInput(input);
            }
        });

        // Atualizar placeholder quando o tipo mudar
        ['customerType', 'editCustomerType'].forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.addEventListener('change', () => {
                    const docInputId = selectId === 'customerType' ? 'customerDocument' : 'editCustomerDocument';
                    const docInput = document.getElementById(docInputId);
                    if (docInput) {
                        docInput.placeholder = select.value === 'pf' 
                            ? '000.000.000-00' 
                            : '00.000.000/0000-00';
                    }
                    this.toggleCustomerTypeFields(select.value, selectId === 'customerType' ? 'new' : 'edit');
                });
            }
        });
    }

    setupPhoneInputs() {
        const phoneInputs = [
            'customerPhone', 'customerCellphone',
            'editCustomerPhone', 'editCustomerCellphone'
        ];

        phoneInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    
                    if (value.length > 11) {
                        value = value.substring(0, 11);
                    }
                    
                    if (value.length <= 11) {
                        if (value.length <= 2) {
                            value = value;
                        } else if (value.length <= 7) {
                            value = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
                        } else {
                            value = value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
                        }
                        e.target.value = value;
                    }
                });
            }
        });
    }

    setupZipCodeInputs() {
        const zipInputs = [
            { id: 'customerAddressZipCode', prefix: 'customer' },
            { id: 'editCustomerAddressZipCode', prefix: 'editCustomer' }
        ];

        zipInputs.forEach(({ id, prefix }) => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length > 8) {
                        value = value.substring(0, 8);
                    }
                    if (value.length <= 5) {
                        e.target.value = value;
                    } else {
                        e.target.value = value.replace(/(\d{5})(\d{0,3})/, '$1-$2');
                    }
                });

                // Buscar CEP quando completar 8 dígitos
                input.addEventListener('blur', async (e) => {
                    const cep = e.target.value.replace(/\D/g, '');
                    if (cep.length === 8) {
                        await this.buscarCEP(cep, prefix);
                    }
                });
            }
        });
    }

    async buscarCEP(cep, prefix) {
        const streetInput = document.getElementById(`${prefix}AddressStreet`);
        const neighborhoodInput = document.getElementById(`${prefix}AddressNeighborhood`);
        const cityInput = document.getElementById(`${prefix}AddressCity`);
        const stateInput = document.getElementById(`${prefix}AddressState`);

        try {
            // Desabilitar campos enquanto busca
            if (streetInput) streetInput.disabled = true;
            if (neighborhoodInput) neighborhoodInput.disabled = true;
            if (cityInput) cityInput.disabled = true;
            if (stateInput) stateInput.disabled = true;

            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (data.erro) {
                alert('CEP não encontrado. Por favor, verifique o CEP informado.');
            } else {
                // Preencher campos com os dados retornados
                if (streetInput && data.logradouro) {
                    streetInput.value = data.logradouro;
                }
                if (neighborhoodInput && data.bairro) {
                    neighborhoodInput.value = data.bairro;
                }
                if (cityInput && data.localidade) {
                    cityInput.value = data.localidade;
                }
                if (stateInput && data.uf) {
                    stateInput.value = data.uf;
                }

                // Se houver complemento na resposta, sugerir
                if (data.complemento) {
                    const complementInput = document.getElementById(`${prefix}AddressComplement`);
                    if (complementInput && !complementInput.value) {
                        complementInput.placeholder = `Sugestão: ${data.complemento}`;
                    }
                }
            }

        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            alert('Erro ao buscar CEP. Por favor, tente novamente.');
        } finally {
            // Reabilitar campos sempre
            if (streetInput) streetInput.disabled = false;
            if (neighborhoodInput) neighborhoodInput.disabled = false;
            if (cityInput) cityInput.disabled = false;
            if (stateInput) stateInput.disabled = false;
        }
    }

    setupCustomerTypeToggle() {
        // Inicializar campos baseado no tipo padrão
        ['customerType', 'editCustomerType'].forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const isNew = selectId === 'customerType';
                select.addEventListener('change', () => {
                    this.toggleCustomerTypeFields(select.value, isNew ? 'new' : 'edit');
                });
            }
        });
    }

    toggleCustomerTypeFields(type, formType) {
        const prefix = formType === 'new' ? 'customer' : 'editCustomer';
        
        // Campos que aparecem apenas para PJ
        const pjOnlyFields = [
            `${prefix}NameFantasyGroup`,
            `${prefix}StateRegistrationGroup`,
            `${prefix}ContactPersonGroup`
        ];
        
        // Campos que aparecem apenas para PF
        const pfOnlyFields = [
            `${prefix}BirthDateGroup`
        ];

        if (type === 'pj') {
            // Mostrar campos de PJ
            pjOnlyFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) field.style.display = 'block';
            });
            // Ocultar campos de PF
            pfOnlyFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) field.style.display = 'none';
            });
        } else if (type === 'pf') {
            // Ocultar campos de PJ
            pjOnlyFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) field.style.display = 'none';
            });
            // Mostrar campos de PF
            pfOnlyFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) field.style.display = 'block';
            });
        }
    }

    performSearch() {
        const searchTerm = document.getElementById('searchInput').value.trim();
        
        if (!searchTerm) {
            this.clearSearch();
            return;
        }

        const results = this.searchCustomers(searchTerm);
        this.displaySearchResults(results, searchTerm);
    }

    searchCustomers(searchTerm) {
        const cleanSearch = searchTerm.replace(/\D/g, ''); // Remove caracteres não numéricos
        const lowerSearch = searchTerm.toLowerCase();

        // Busca exata por ID
        const exactIdMatch = this.customers.find(c => 
            c.id.toLowerCase() === searchTerm.toLowerCase()
        );
        if (exactIdMatch) {
            return [exactIdMatch];
        }

        // Busca exata por CPF ou CNPJ (sem formatação)
        const exactDocumentMatch = this.customers.find(c => {
            const cleanDoc = c.document.replace(/\D/g, '');
            return cleanDoc === cleanSearch;
        });
        if (exactDocumentMatch) {
            return [exactDocumentMatch];
        }

        // Busca parcial por nome, email, telefone ou cidade
        const partialMatches = this.customers.filter(c => {
            const nameMatch = c.name.toLowerCase().includes(lowerSearch);
            const emailMatch = c.email && c.email.toLowerCase().includes(lowerSearch);
            const phoneMatch = (c.phone && c.phone.replace(/\D/g, '').includes(cleanSearch)) ||
                              (c.cellphone && c.cellphone.replace(/\D/g, '').includes(cleanSearch));
            const cityMatch = c.address && c.address.city && 
                             c.address.city.toLowerCase().includes(lowerSearch);
            const nameFantasyMatch = c.nameFantasy && 
                                     c.nameFantasy.toLowerCase().includes(lowerSearch);
            
            return nameMatch || emailMatch || phoneMatch || cityMatch || nameFantasyMatch;
        });

        return partialMatches;
    }

    displaySearchResults(results, searchTerm) {
        const resultsContainer = document.getElementById('searchResults');
        const resultsContent = document.getElementById('searchResultsContent');

        if (results.length === 0) {
            resultsContent.innerHTML = `
                <div class="empty-search">
                    <i class="fas fa-search"></i>
                    <p>Nenhum cliente encontrado para "${searchTerm}"</p>
                </div>
            `;
        } else {
            resultsContent.innerHTML = results.map((customer, index) => {
                const customerIndex = this.customers.findIndex(c => c.id === customer.id);
                const documentDisplay = customer.document || '-';
                const typeDisplay = customer.type === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica';
                const createdDate = customer.createdAt 
                    ? new Date(customer.createdAt).toLocaleDateString('pt-BR')
                    : '-';

                return `
                    <div class="search-result-item">
                        <div class="result-info">
                            <div class="result-main">
                                <strong>${customer.name}</strong>
                                <span class="result-id">ID: ${customer.id}</span>
                            </div>
                            <div class="result-details">
                                <span><i class="fas fa-id-card"></i> ${documentDisplay}</span>
                                <span><i class="fas fa-tag"></i> ${typeDisplay}</span>
                                <span><i class="fas fa-calendar"></i> ${createdDate}</span>
                            </div>
                        </div>
                        <div class="result-actions">
                            <button class="action-btn edit" onclick="customerManager.editCustomer(${customerIndex})">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="action-btn delete" onclick="customerManager.deleteCustomer(${customerIndex})">
                                <i class="fas fa-trash"></i> Excluir
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        resultsContainer.style.display = 'block';
        
        // Scroll para os resultados
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    clearSearch() {
        document.getElementById('searchInput').value = '';
        document.getElementById('searchResults').style.display = 'none';
        this.renderCustomers();
    }

    openNewCustomerModal() {
        document.getElementById('newCustomerModal').style.display = 'block';
        document.getElementById('newCustomerForm').reset();
        // Resetar visibilidade dos campos condicionais
        this.toggleCustomerTypeFields('', 'new');
    }

    createCustomer() {
        const formData = new FormData(document.getElementById('newCustomerForm'));
        const id = formData.get('customerId').trim().toUpperCase();
        const documentValue = formData.get('customerDocument').trim();

        // Verificar se ID já existe
        if (this.customers.some(c => c.id.toLowerCase() === id.toLowerCase())) {
            alert('Este ID já está em uso. Por favor, escolha outro ID.');
            return;
        }

        // Verificar se documento já existe
        const cleanDoc = documentValue.replace(/\D/g, '');
        if (this.customers.some(c => {
            const existingCleanDoc = c.document.replace(/\D/g, '');
            return existingCleanDoc === cleanDoc;
        })) {
            alert('Este CPF/CNPJ já está cadastrado.');
            return;
        }

        const customer = {
            id: id,
            name: formData.get('customerName').trim(),
            nameFantasy: formData.get('customerNameFantasy')?.trim() || null,
            document: documentValue,
            stateRegistration: formData.get('customerStateRegistration')?.trim() || null,
            type: formData.get('customerType'),
            birthDate: formData.get('customerBirthDate') || null,
            email: formData.get('customerEmail').trim(),
            phone: formData.get('customerPhone')?.trim() || null,
            cellphone: formData.get('customerCellphone')?.trim() || null,
            contactPerson: formData.get('customerContactPerson')?.trim() || null,
            address: {
                street: formData.get('customerAddressStreet').trim(),
                number: formData.get('customerAddressNumber')?.trim() || null,
                complement: formData.get('customerAddressComplement')?.trim() || null,
                neighborhood: formData.get('customerAddressNeighborhood').trim(),
                zipCode: formData.get('customerAddressZipCode').trim(),
                city: formData.get('customerAddressCity').trim(),
                state: formData.get('customerAddressState')
            },
            status: formData.get('customerStatus') || 'ativo',
            notes: formData.get('customerNotes')?.trim() || null,
            createdAt: new Date().toISOString()
        };

        this.customers.push(customer);
        localStorage.setItem('customers', JSON.stringify(this.customers));
        
        document.getElementById('newCustomerModal').style.display = 'none';
        document.getElementById('newCustomerForm').reset();
        this.renderCustomers();
        
        alert('Cliente cadastrado com sucesso!');
    }

    editCustomer(index) {
        const customer = this.customers[index];
        
        document.getElementById('editCustomerIndex').value = index;
        document.getElementById('editCustomerId').value = customer.id || '';
        document.getElementById('editCustomerName').value = customer.name || '';
        document.getElementById('editCustomerDocument').value = customer.document || '';
        document.getElementById('editCustomerType').value = customer.type || '';
        document.getElementById('editCustomerNameFantasy').value = customer.nameFantasy || '';
        document.getElementById('editCustomerStateRegistration').value = customer.stateRegistration || '';
        document.getElementById('editCustomerBirthDate').value = customer.birthDate || '';
        document.getElementById('editCustomerEmail').value = customer.email || '';
        document.getElementById('editCustomerPhone').value = customer.phone || '';
        document.getElementById('editCustomerCellphone').value = customer.cellphone || '';
        document.getElementById('editCustomerContactPerson').value = customer.contactPerson || '';
        
        // Endereço
        if (customer.address) {
            document.getElementById('editCustomerAddressStreet').value = customer.address.street || '';
            document.getElementById('editCustomerAddressNumber').value = customer.address.number || '';
            document.getElementById('editCustomerAddressComplement').value = customer.address.complement || '';
            document.getElementById('editCustomerAddressNeighborhood').value = customer.address.neighborhood || '';
            document.getElementById('editCustomerAddressZipCode').value = customer.address.zipCode || '';
            document.getElementById('editCustomerAddressCity').value = customer.address.city || '';
            document.getElementById('editCustomerAddressState').value = customer.address.state || '';
        }
        
        document.getElementById('editCustomerStatus').value = customer.status || 'ativo';
        document.getElementById('editCustomerNotes').value = customer.notes || '';

        // Ajustar campos visíveis baseado no tipo
        this.toggleCustomerTypeFields(customer.type, 'edit');

        document.getElementById('editCustomerModal').style.display = 'block';
    }

    updateCustomer() {
        const formData = new FormData(document.getElementById('editCustomerForm'));
        const index = parseInt(document.getElementById('editCustomerIndex').value);
        const customer = this.customers[index];
        
        const id = formData.get('editCustomerId').trim().toUpperCase();
        const documentValue = formData.get('editCustomerDocument').trim();

        // Verificar se ID já existe (exceto o próprio cliente sendo editado)
        const existingIdIndex = this.customers.findIndex(c => 
            c.id.toLowerCase() === id.toLowerCase() && c.id !== customer.id
        );
        if (existingIdIndex !== -1) {
            alert('Este ID já está em uso. Por favor, escolha outro ID.');
            return;
        }

        // Verificar se documento já existe (exceto o próprio cliente sendo editado)
        const cleanDoc = documentValue.replace(/\D/g, '');
        const existingDocIndex = this.customers.findIndex(c => {
            const existingCleanDoc = c.document.replace(/\D/g, '');
            return existingCleanDoc === cleanDoc && c.id !== customer.id;
        });
        if (existingDocIndex !== -1) {
            alert('Este CPF/CNPJ já está cadastrado.');
            return;
        }

        this.customers[index] = {
            ...customer,
            id: id,
            name: formData.get('editCustomerName').trim(),
            nameFantasy: formData.get('editCustomerNameFantasy')?.trim() || null,
            document: documentValue,
            stateRegistration: formData.get('editCustomerStateRegistration')?.trim() || null,
            type: formData.get('editCustomerType'),
            birthDate: formData.get('editCustomerBirthDate') || null,
            email: formData.get('editCustomerEmail').trim(),
            phone: formData.get('editCustomerPhone')?.trim() || null,
            cellphone: formData.get('editCustomerCellphone')?.trim() || null,
            contactPerson: formData.get('editCustomerContactPerson')?.trim() || null,
            address: {
                street: formData.get('editCustomerAddressStreet').trim(),
                number: formData.get('editCustomerAddressNumber')?.trim() || null,
                complement: formData.get('editCustomerAddressComplement')?.trim() || null,
                neighborhood: formData.get('editCustomerAddressNeighborhood').trim(),
                zipCode: formData.get('editCustomerAddressZipCode').trim(),
                city: formData.get('editCustomerAddressCity').trim(),
                state: formData.get('editCustomerAddressState')
            },
            status: formData.get('editCustomerStatus') || 'ativo',
            notes: formData.get('editCustomerNotes')?.trim() || null
        };

        localStorage.setItem('customers', JSON.stringify(this.customers));
        document.getElementById('editCustomerModal').style.display = 'none';
        this.renderCustomers();
        this.clearSearch(); // Limpar busca para mostrar tabela atualizada
        
        alert('Cliente atualizado com sucesso!');
    }

    deleteCustomer(index) {
        const customer = this.customers[index];
        
        const self = this;
        window.showGlobalConfirmModal(
            'Excluir Cliente',
            `Tem certeza que deseja excluir o cliente <strong>${this.escapeHtml(customer.name)}</strong> (${this.escapeHtml(customer.id)})?<br><br><span style="color: var(--accent-red);"><i class="fas fa-exclamation-circle"></i> Esta ação não pode ser desfeita.</span>`,
            () => {
                self.executeDeleteCustomer(index);
            }
        );
        return;
    }
    
    executeDeleteCustomer(index) {
        this.customers.splice(index, 1);
        localStorage.setItem('customers', JSON.stringify(this.customers));
        this.renderCustomers();
        this.clearSearch();
        
        window.showGlobalInfoModal('Sucesso', 'Cliente excluído com sucesso!');
    }

    updateStatusCounts() {
        // Calcular estatísticas
        const totalCustomers = this.customers.length;
        const activeCustomers = this.customers.filter(c => c.status === 'ativo').length;
        const inactiveCustomers = this.customers.filter(c => c.status === 'inativo').length;
        const pfCustomers = this.customers.filter(c => c.type === 'pf').length;
        const pjCustomers = this.customers.filter(c => c.type === 'pj').length;
        
        // Atualizar card de status destacado
        const statusTotalEl = document.getElementById('statusTotalCount');
        const statusAtivoEl = document.getElementById('statusAtivoCount');
        const statusInativoEl = document.getElementById('statusInativoCount');
        const statusPfEl = document.getElementById('statusPfCount');
        const statusPjEl = document.getElementById('statusPjCount');
        
        if (statusTotalEl) statusTotalEl.textContent = totalCustomers;
        if (statusAtivoEl) statusAtivoEl.textContent = activeCustomers;
        if (statusInativoEl) statusInativoEl.textContent = inactiveCustomers;
        if (statusPfEl) statusPfEl.textContent = pfCustomers;
        if (statusPjEl) statusPjEl.textContent = pjCustomers;
    }

    renderCustomers() {
        const tbody = document.getElementById('customersTableBody');
        const resultsCountEl = document.getElementById('resultsCount');

        // Atualizar contadores de status
        this.updateStatusCounts();

        // Obter filtro ativo
        const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
        
        // Obter termo de busca
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';

        // Filtrar clientes
        let filteredCustomers = this.customers.filter(customer => {
            // Aplicar filtro de status/tipo
            if (activeFilter !== 'all') {
                if (activeFilter === 'ativo' && customer.status !== 'ativo') return false;
                if (activeFilter === 'inativo' && customer.status !== 'inativo') return false;
                if (activeFilter === 'pf' && customer.type !== 'pf') return false;
                if (activeFilter === 'pj' && customer.type !== 'pj') return false;
            }

            // Aplicar busca
            if (searchTerm) {
                const searchFields = [
                    customer.id,
                    customer.name,
                    customer.document,
                    customer.email,
                    customer.phone,
                    customer.cellphone
                ].filter(f => f).map(f => String(f).toLowerCase());
                
                if (!searchFields.some(field => field.includes(searchTerm))) {
                    return false;
                }
            }

            return true;
        });

        // Atualizar contador de resultados
        if (resultsCountEl) {
            resultsCountEl.textContent = filteredCustomers.length;
        }

        if (filteredCustomers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state-cell">
                        <div class="empty-state">
                            <i class="fas fa-user-tie"></i>
                            <h3>Nenhum cliente encontrado</h3>
                            <p>${this.customers.length === 0 ? 'Clique em "Novo Cliente" para começar a cadastrar.' : 'Tente ajustar os filtros ou a busca.'}</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredCustomers.map((customer, index) => {
            // Encontrar o índice real do cliente no array original
            const realIndex = this.customers.findIndex(c => c.id === customer.id);
            const documentDisplay = customer.document || '-';
            const typeDisplay = customer.type === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica';
            const emailDisplay = customer.email || '-';
            const phoneDisplay = customer.cellphone || customer.phone || '-';
            const statusDisplay = customer.status === 'ativo' ? 'Ativo' : 'Inativo';
            const statusClass = customer.status === 'ativo' ? 'ativo' : 'inativo';
            const createdDate = customer.createdAt 
                ? new Date(customer.createdAt).toLocaleDateString('pt-BR')
                : '-';

            return `
                <tr>
                    <td>${customer.id}</td>
                    <td><strong>${customer.name}</strong></td>
                    <td>${documentDisplay}</td>
                    <td><span class="type-badge ${customer.type}">${typeDisplay}</span></td>
                    <td>${emailDisplay}</td>
                    <td>${phoneDisplay}</td>
                    <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
                    <td>${createdDate}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn edit" onclick="customerManager.editCustomer(${realIndex})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" onclick="customerManager.deleteCustomer(${realIndex})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

let customerManager;
document.addEventListener('DOMContentLoaded', () => {
    customerManager = new CustomerManager();
});


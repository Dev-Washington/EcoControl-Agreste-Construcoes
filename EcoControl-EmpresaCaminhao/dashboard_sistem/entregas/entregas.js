// Sistema de Gerenciamento de Entregas
class DeliveryManager {
    constructor() {
        this.currentUser = null;
        this.deliveries = [];
        this.trucks = [];
        this.employees = [];
        this.cities = [];
        this.customers = [];
        this.currentFilter = 'all';
        this.brazilianCitiesCache = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadData();
        this.setupEventListeners();
        this.updateStatusCounts();
        this.renderDeliveries();
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
            'gestor': 'Gestor',
            'atendente': 'Atendente',
            'motorista': 'Motorista',
            'funcionario': 'Funcionário'
        };
        return roles[role] || role;
    }

    loadData() {
        this.deliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
        this.trucks = JSON.parse(localStorage.getItem('trucks') || '[]');
        this.employees = JSON.parse(localStorage.getItem('employees') || '[]');
        this.cities = JSON.parse(localStorage.getItem('cities') || '[]');
        this.customers = JSON.parse(localStorage.getItem('customers') || '[]');
        this.products = JSON.parse(localStorage.getItem('products') || '[]');

        // Se não houver dados, inicializar arrays vazios
        if (!Array.isArray(this.deliveries)) this.deliveries = [];
        if (!Array.isArray(this.trucks)) this.trucks = [];
        if (!Array.isArray(this.employees)) this.employees = [];
        if (!Array.isArray(this.cities)) this.cities = [];
        if (!Array.isArray(this.customers)) this.customers = [];
        if (!Array.isArray(this.products)) this.products = [];
    }

    setupEventListeners() {
        document.getElementById('newDeliveryBtn').addEventListener('click', () => {
            this.openNewDeliveryModal();
        });

        document.querySelectorAll('.status-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.currentTarget.dataset.filter);
            });
        });

        document.getElementById('searchInput').addEventListener('input', () => {
            this.renderDeliveries();
        });

        // Event listeners para filtros de data
        const dateStart = document.getElementById('dateStart');
        const dateEnd = document.getElementById('dateEnd');
        if (dateStart) {
            dateStart.addEventListener('change', () => {
                this.renderDeliveries();
            });
        }
        if (dateEnd) {
            dateEnd.addEventListener('change', () => {
                this.renderDeliveries();
            });
        }

        this.setupModalEvents();
        this.setupPhoneInputs();
        this.setupPaymentCalculation();
        this.setupCustomerSearch();
        this.setupProductSearch();
        this.setupZipCodeInputs();
        this.setupCitySearch();
        this.setupCityBlurSearch();
    }

    setupCityBlurSearch() {
        // Quando o usuário sair do campo de cidade de destino, buscar estado e CEP automaticamente
        const cityInputs = [
            { inputId: 'deliveryDestinationCity', stateId: 'deliveryDestinationState', zipId: 'deliveryDestinationZipCode' },
            { inputId: 'editDeliveryDestinationCity', stateId: 'editDeliveryDestinationState', zipId: 'editDeliveryDestinationZipCode' }
        ];

        cityInputs.forEach(({ inputId, stateId, zipId }) => {
            const input = document.getElementById(inputId);
            const stateSelect = document.getElementById(stateId);

            if (input && stateSelect) {
                input.addEventListener('blur', async (e) => {
                    const cityName = e.target.value.trim();
                    if (cityName) {
                        // Se há nome de cidade, buscar estado e CEP sempre (atualizar mesmo que já tenha valor)
                        await this.searchCityAndFillStateAndZip(cityName, stateSelect, zipId);
                    }
                });
            }
        });
    }

    setupCitySearch() {
        const cityInputs = [
            { inputId: 'deliveryDestinationCity', resultsId: 'deliveryDestinationCityResults', stateId: 'deliveryDestinationState', zipId: 'deliveryDestinationZipCode' },
            { inputId: 'editDeliveryDestinationCity', resultsId: 'editDeliveryDestinationCityResults', stateId: 'editDeliveryDestinationState', zipId: 'editDeliveryDestinationZipCode' }
        ];

        cityInputs.forEach(({ inputId, resultsId, stateId, zipId }) => {
            const input = document.getElementById(inputId);
            const results = document.getElementById(resultsId);

            if (input && results) {
                this.setupCitySearchInput(input, results, stateId, zipId);
            }
        });
    }

    setupCitySearchInput(input, resultsContainer, stateSelectId, zipInputId) {
        let searchTimeout;
        let selectedCity = null;

        input.addEventListener('input', (e) => {
            const query = e.target.value.trim();

            clearTimeout(searchTimeout);

            if (query.length < 2) {
                resultsContainer.style.display = 'none';
                selectedCity = null;
                return;
            }

            searchTimeout = setTimeout(() => {
                this.searchBrazilianCities(query, resultsContainer, stateSelectId, zipInputId, input);
            }, 300);
        });

        // Fechar resultados ao clicar fora
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !resultsContainer.contains(e.target)) {
                resultsContainer.style.display = 'none';
            }
        });

        // Fechar ao pressionar Escape
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                resultsContainer.style.display = 'none';
            }
        });
    }

    async searchBrazilianCities(query, resultsContainer, stateSelectId, zipInputId, cityInput) {
        try {
            // Normalizar query para busca
            const normalize = (str) => {
                return str.toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .trim();
            };

            const normalizedQuery = normalize(query);

            // Carregar cache de cidades (carrega uma vez e reutiliza)
            const allCities = await this.loadBrazilianCitiesCache();

            // Filtrar cidades que começam com o texto digitado (case-insensitive, sem acentos)
            const filteredCities = allCities.filter(city => {
                const normalizedCityName = normalize(city.nome);
                return normalizedCityName.startsWith(normalizedQuery);
            });

            if (filteredCities.length === 0) {
                resultsContainer.innerHTML = '<div class="city-search-no-results">Nenhuma cidade encontrada</div>';
                resultsContainer.style.display = 'block';
                return;
            }

            // Ordenar por nome e limitar a 10 resultados
            const limitedCities = filteredCities
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
                .slice(0, 10);

            resultsContainer.innerHTML = limitedCities.map(city => {
                const stateCode = city.microrregiao.mesorregiao.UF.sigla;
                const stateName = city.microrregiao.mesorregiao.UF.nome;
                return `
                    <div class="city-search-result-item" data-city-name="${city.nome}" data-state="${stateCode}" data-city-id="${city.id}">
                        <div class="result-name">${city.nome}</div>
                        <div class="result-info">
                            <span class="result-state">${stateName} (${stateCode})</span>
                        </div>
                    </div>
                `;
            }).join('');

            // Adicionar event listeners aos itens
            resultsContainer.querySelectorAll('.city-search-result-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const cityName = item.dataset.cityName;
                    const stateCode = item.dataset.state;

                    cityInput.value = cityName;

                    // Preencher estado automaticamente
                    const stateSelect = document.getElementById(stateSelectId);
                    if (stateSelect) {
                        stateSelect.value = stateCode;
                    }

                    // Buscar CEP exato da cidade selecionada
                    await this.searchZipCodeByCity(cityName, stateCode, zipInputId);

                    resultsContainer.style.display = 'none';
                });
            });

            resultsContainer.style.display = 'block';
        } catch (error) {
            console.error('Erro ao buscar cidades:', error);
            resultsContainer.innerHTML = '<div class="city-search-no-results">Erro ao buscar cidades. Tente novamente.</div>';
            resultsContainer.style.display = 'block';
        }
    }

    async loadBrazilianCitiesCache() {
        if (this.brazilianCitiesCache) {
            return this.brazilianCitiesCache;
        }

        try {
            // Carregar todas as cidades do Brasil uma vez e cachear
            const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome`);
            const cities = await response.json();
            this.brazilianCitiesCache = cities;
            return cities;
        } catch (error) {
            console.error('Erro ao carregar cidades do Brasil:', error);
            return [];
        }
    }

    async searchZipCodeByCity(cityName, stateCode, zipInputId) {
        const zipInput = document.getElementById(zipInputId);
        if (!zipInput) return;

        // Normalizar nome da cidade para busca
        const normalize = (str) => {
            return str.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim();
        };

        // Tentar buscar CEP usando proxy CORS ou API alternativa
        // Se falhar, o campo ficará vazio (usuário pode preencher manualmente)
        try {
            // Usar um proxy CORS público ou tentar diretamente
            const proxyUrl = `https://cors-anywhere.herokuapp.com/https://viacep.com.br/ws/${stateCode}/${encodeURIComponent(cityName)}/json/`;
            const directUrl = `https://viacep.com.br/ws/${stateCode}/${encodeURIComponent(cityName)}/json/`;

            let response = null;
            let data = null;

            // Tentar primeiro com fetch direto (pode funcionar em alguns ambientes)
            try {
                response = await fetch(directUrl, {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-cache'
                });

                if (response && response.ok) {
                    data = await response.json();
                }
            } catch (directError) {
                // Se falhar, tentar com proxy (pode não estar disponível)
                try {
                    response = await fetch(proxyUrl, {
                        method: 'GET',
                        mode: 'cors',
                        cache: 'no-cache'
                    });

                    if (response && response.ok) {
                        data = await response.json();
                    }
                } catch (proxyError) {
                    // Se ambos falharem, não fazer nada (campo ficará vazio)
                    return;
                }
            }

            if (data && !data.erro) {
                if (Array.isArray(data) && data.length > 0) {
                    const normalizedCityName = normalize(cityName);

                    // Tentar encontrar CEP que corresponde exatamente à cidade
                    let matchingCep = data.find(item => {
                        const normalizedItemCity = normalize(item.localidade);
                        return normalizedItemCity === normalizedCityName;
                    });

                    // Se não encontrou exato, pegar o primeiro
                    if (!matchingCep) {
                        matchingCep = data[0];
                    }

                    if (matchingCep && matchingCep.cep && zipInput) {
                        zipInput.value = matchingCep.cep.replace(/(\d{5})(\d{3})/, '$1-$2');
                    }
                } else if (data.cep && zipInput) {
                    zipInput.value = data.cep.replace(/(\d{5})(\d{3})/, '$1-$2');
                }
            }
        } catch (error) {
            // Silenciar erro - o CEP simplesmente não será preenchido automaticamente
            // O usuário pode preencher manualmente se necessário
        }
    }

    setupPaymentCalculation() {
        // Formatar valores monetários enquanto digita
        const formatCurrencyInput = (input) => {
            input.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value === '') {
                    e.target.value = '';
                    return;
                }

                // Converte para número e divide por 100 para ter centavos
                const number = parseFloat(value) / 100;
                // Formata como moeda brasileira
                e.target.value = number.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            });

            input.addEventListener('blur', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value === '') {
                    e.target.value = '0,00';
                    return;
                }
                const number = parseFloat(value) / 100;
                e.target.value = number.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            });
        };

        // Configurar formatação para todos os campos monetários
        const totalValueInput = document.getElementById('deliveryTotalValue');
        const discountInput = document.getElementById('deliveryDiscount');
        const editTotalValueInput = document.getElementById('editDeliveryTotalValue');
        const editDiscountInput = document.getElementById('editDeliveryDiscount');

        if (totalValueInput) formatCurrencyInput(totalValueInput);
        if (discountInput) formatCurrencyInput(discountInput);
        if (editTotalValueInput) formatCurrencyInput(editTotalValueInput);
        if (editDiscountInput) formatCurrencyInput(editDiscountInput);

        // Calcular valor final automaticamente
        const calculateFinalValue = (prefix) => {
            const totalValueInput = document.getElementById(`${prefix}TotalValue`);
            const discountInput = document.getElementById(`${prefix}Discount`);

            // Extrair valor numérico dos campos formatados
            const totalValue = totalValueInput ? parseFloat(totalValueInput.value.replace(/\./g, '').replace(',', '.')) || 0 : 0;
            const discount = discountInput ? parseFloat(discountInput.value.replace(/\./g, '').replace(',', '.')) || 0 : 0;
            const finalValue = Math.max(0, totalValue - discount);

            const finalValueInput = document.getElementById(`${prefix}FinalValue`);
            if (finalValueInput) {
                finalValueInput.value = finalValue.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            }
        };

        // Para novo formulário
        if (totalValueInput) {
            totalValueInput.addEventListener('input', () => calculateFinalValue('delivery'));
        }
        if (discountInput) {
            discountInput.addEventListener('input', () => calculateFinalValue('delivery'));
        }

        // Para formulário de edição
        if (editTotalValueInput) {
            editTotalValueInput.addEventListener('input', () => calculateFinalValue('editDelivery'));
        }
        if (editDiscountInput) {
            editDiscountInput.addEventListener('input', () => calculateFinalValue('editDelivery'));
        }

        // Formatação de peso com "kg"
        const formatWeightInput = (input) => {
            if (!input) return;

            input.addEventListener('blur', (e) => {
                let value = e.target.value.replace(/\s*kg\s*/gi, '').trim();
                if (value === '') {
                    e.target.value = '';
                    return;
                }

                // Remove pontos e substitui vírgula por ponto para parseFloat
                const numericValue = parseFloat(value.replace(/\./g, '').replace(',', '.'));
                if (!isNaN(numericValue)) {
                    e.target.value = `${numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
                }
            });
        };

        const cargoWeightInput = document.getElementById('deliveryCargoWeight');
        const editCargoWeightInput = document.getElementById('editDeliveryCargoWeight');

        if (cargoWeightInput) formatWeightInput(cargoWeightInput);
        if (editCargoWeightInput) formatWeightInput(editCargoWeightInput);
    }

    setupCustomerSearch() {
        // Configurar busca para novo formulário
        const newSearchInput = document.getElementById('deliveryCustomerSearch');
        const newSearchResults = document.getElementById('deliveryCustomerSearchResults');

        if (newSearchInput && newSearchResults) {
            this.setupCustomerSearchInput(newSearchInput, newSearchResults, 'delivery');
        }

        // Configurar busca para formulário de edição
        const editSearchInput = document.getElementById('editDeliveryCustomerSearch');
        const editSearchResults = document.getElementById('editDeliveryCustomerSearchResults');

        if (editSearchInput && editSearchResults) {
            this.setupCustomerSearchInput(editSearchInput, editSearchResults, 'editDelivery');
        }
    }

    setupCustomerSearchInput(searchInput, searchResults, prefix) {
        let searchTimeout;

        // Mostrar todos os clientes ao focar no campo
        searchInput.addEventListener('focus', (e) => {
            const query = e.target.value.trim();
            if (query.length === 0) {
                // Se o campo estiver vazio, mostrar todos os clientes
                this.searchCustomers('', searchResults, prefix);
            } else {
                // Se já tiver texto, filtrar
                this.searchCustomers(query, searchResults, prefix);
            }
        });

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();

            clearTimeout(searchTimeout);

            // Sempre buscar, mesmo se vazio (mostra todos)
            searchTimeout = setTimeout(() => {
                this.searchCustomers(query, searchResults, prefix);
            }, 200);
        });

        // Fechar resultados ao clicar fora
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });

        // Fechar ao pressionar Escape
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchResults.style.display = 'none';
            }
        });
    }

    searchCustomers(query, resultsContainer, prefix) {
        // Normalizar nome do cliente para busca (remover acentos)
        const normalize = (str) => {
            if (!str) return '';
            return str.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim();
        };

        let matches = [];

        // Se query estiver vazio, mostrar todos os clientes
        if (!query || query.trim().length === 0) {
            matches = this.customers.slice(0, 50); // Limitar a 50 para performance
        } else {
            const lowerQuery = query.toLowerCase().trim();
            const cleanQuery = query.replace(/\D/g, ''); // Remove tudo que não é número
            const isNumericQuery = /^\d+$/.test(query.trim()); // Verifica se a query é apenas números
            const normalizedQuery = normalize(query);

            if (isNumericQuery) {
                // Se a busca é apenas numérica, priorizar busca por ID exato ou parcial
                matches = this.customers.filter(customer => {
                    const customerId = (customer.id || '').toLowerCase();
                    // Buscar por ID exato primeiro
                    if (customerId === lowerQuery) {
                        return true;
                    }
                    // Depois buscar por ID parcial
                    return customerId.includes(lowerQuery);
                });

                // Se não encontrou por ID, buscar por CPF/CNPJ
                if (matches.length === 0 && cleanQuery.length > 0) {
                    matches = this.customers.filter(customer => {
                        const customerDoc = (customer.document || '').replace(/\D/g, '');
                        return customerDoc.includes(cleanQuery);
                    });
                }
            } else {
                // Se não é numérico, buscar por nome que COMEÇA com a letra/palavra digitada
                matches = this.customers.filter(customer => {
                    // Buscar por ID (pode ser parcial)
                    const customerId = (customer.id || '').toLowerCase();
                    const idMatch = customerId.includes(lowerQuery);

                    // Buscar por nome - apenas clientes que COMEÇAM com a letra/palavra digitada
                    const customerNameNormalized = normalize(customer.name);
                    const nameMatch = customerNameNormalized.startsWith(normalizedQuery);

                    // Buscar por CPF/CNPJ formatado
                    const docFormattedMatch = (customer.document || '').toLowerCase().includes(lowerQuery);

                    // Buscar por CPF/CNPJ sem formatação (se houver números na query)
                    let docMatch = false;
                    if (cleanQuery.length > 0) {
                        const customerDoc = (customer.document || '').replace(/\D/g, '');
                        docMatch = customerDoc.includes(cleanQuery);
                    }

                    return idMatch || nameMatch || docFormattedMatch || docMatch;
                });
            }
        }

        // Limitar a 50 resultados
        matches = matches.slice(0, 50);

        if (matches.length === 0) {
            resultsContainer.innerHTML = '<div class="customer-search-no-results">Nenhum cliente encontrado</div>';
            resultsContainer.style.display = 'block';
            return;
        }

        resultsContainer.innerHTML = matches.map(customer => {
            const city = customer.address?.city || 'N/A';
            return `
                <div class="customer-search-result-item" data-customer-id="${customer.id}">
                    <div class="result-name">${customer.name}</div>
                    <div class="result-info">
                        <span class="result-id">ID: ${customer.id}</span>
                        <span class="result-document">${customer.document}</span>
                        <span class="result-city">${city}</span>
                    </div>
                </div>
            `;
        }).join('');

        // Adicionar event listeners aos itens
        resultsContainer.querySelectorAll('.customer-search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const customerId = item.dataset.customerId;
                this.selectCustomer(customerId, prefix);
                resultsContainer.style.display = 'none';
            });
        });

        resultsContainer.style.display = 'block';
    }

    selectCustomer(customerId, prefix) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;

        // Preencher campos do cliente
        document.getElementById(`${prefix}CustomerId`).value = customer.id || '';
        document.getElementById(`${prefix}CustomerName`).value = customer.name || '';
        document.getElementById(`${prefix}CustomerDocument`).value = customer.document || '';
        document.getElementById(`${prefix}CustomerEmail`).value = customer.email || '';
        document.getElementById(`${prefix}CustomerPhone`).value = customer.phone || customer.cellphone || '';

        // Endereço
        const address = customer.address || {};
        const addressParts = [];
        if (address.street) addressParts.push(address.street);
        if (address.number) addressParts.push(`Nº ${address.number}`);
        if (address.complement) addressParts.push(address.complement);
        if (address.neighborhood) addressParts.push(address.neighborhood);
        if (address.city) addressParts.push(address.city);
        if (address.state) addressParts.push(address.state);
        if (address.zipCode) addressParts.push(`CEP: ${address.zipCode}`);

        document.getElementById(`${prefix}CustomerAddress`).value = addressParts.join(', ') || '';
        document.getElementById(`${prefix}CustomerAddressCity`).value = address.city || '';

        // Limpar campo de busca
        document.getElementById(`${prefix}CustomerSearch`).value = '';

        // Não preencher cidade de destino automaticamente - usuário deve preencher manualmente
    }

    setupProductSearch() {
        // Configurar busca para novo formulário
        const newProductInput = document.getElementById('deliveryCargoType');
        const newProductResults = document.getElementById('deliveryProductSearchResults');

        if (newProductInput && newProductResults) {
            this.setupProductSearchInput(newProductInput, newProductResults, 'delivery');
        }

        // Configurar busca para formulário de edição
        const editProductInput = document.getElementById('editDeliveryCargoType');
        const editProductResults = document.getElementById('editDeliveryProductSearchResults');

        if (editProductInput && editProductResults) {
            this.setupProductSearchInput(editProductInput, editProductResults, 'editDelivery');
        }
    }

    setupProductSearchInput(searchInput, searchResults, prefix) {
        let searchTimeout;

        // Mostrar todos os produtos ao focar no campo
        searchInput.addEventListener('focus', (e) => {
            const query = e.target.value.trim();
            if (query.length === 0) {
                // Se o campo estiver vazio, mostrar todos os produtos
                this.searchProducts('', searchResults, prefix);
            } else {
                // Se já tiver texto, filtrar
                this.searchProducts(query, searchResults, prefix);
            }
        });

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();

            clearTimeout(searchTimeout);

            // Sempre buscar, mesmo se vazio (mostra todos)
            searchTimeout = setTimeout(() => {
                this.searchProducts(query, searchResults, prefix);
            }, 300);
        });

        // Fechar resultados ao clicar fora
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });

        // Fechar ao pressionar Escape
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchResults.style.display = 'none';
            }
        });
    }

    searchProducts(query, resultsContainer, prefix) {
        // Normalizar nome do produto para busca (remover acentos)
        const normalize = (str) => {
            if (!str) return '';
            return str.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim();
        };

        let matches = [];

        // Se query estiver vazio, mostrar todos os produtos
        if (!query || query.trim().length === 0) {
            matches = this.products.slice(0, 50); // Limitar a 50 para performance
        } else {
            const lowerQuery = query.toLowerCase().trim();
            const cleanQuery = query.replace(/\D/g, '');
            const normalizedQuery = normalize(query);

            matches = this.products.filter(product => {
                // Busca por ID (pode ser parcial)
                const idMatch = product.id.toLowerCase().includes(lowerQuery);
                const idNumMatch = cleanQuery && product.id.replace(/\D/g, '').includes(cleanQuery);

                // Busca por nome - apenas produtos que COMEÇAM com a letra/palavra digitada
                const productNameNormalized = normalize(product.name);
                const nameMatch = productNameNormalized.startsWith(normalizedQuery);

                return idMatch || nameMatch || idNumMatch;
            }).slice(0, 50); // Limitar a 50 resultados
        }

        if (matches.length === 0) {
            resultsContainer.innerHTML = '<div class="customer-search-no-results">Nenhum produto encontrado</div>';
            resultsContainer.style.display = 'block';
            return;
        }

        resultsContainer.innerHTML = matches.map(product => {
            return `
                <div class="customer-search-result-item" data-product-id="${product.id}" data-product-name="${this.escapeHtml(product.name)}">
                    <div class="result-name">${this.escapeHtml(product.name)}</div>
                    <div class="result-info">
                        <span class="result-id">ID: ${product.id}</span>
                    </div>
                </div>
            `;
        }).join('');

        // Adicionar event listeners aos itens
        resultsContainer.querySelectorAll('.customer-search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const productId = item.dataset.productId;
                const productName = item.dataset.productName;
                this.selectProduct(productId, productName, prefix);
                resultsContainer.style.display = 'none';
            });
        });

        resultsContainer.style.display = 'block';
    }

    selectProduct(productId, productName, prefix) {
        // Preencher campo de tipo de material
        document.getElementById(`${prefix}CargoType`).value = productName;
        const hiddenIdInput = document.getElementById(`${prefix}CargoTypeId`);
        if (hiddenIdInput) {
            hiddenIdInput.value = productId;
        }

        // Buscar unidade do produto se disponível
        const product = this.products.find(p => p.id === productId);
        if (product && product.unit) {
            const unitInput = document.getElementById(`${prefix}CargoUnit`);
            if (unitInput) {
                unitInput.value = product.unit;
            }
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async setDestinationCityFromCustomer(cityName, prefix) {
        if (!cityName) return;

        const destinationInput = document.getElementById(`${prefix}DestinationCity`);
        const destinationStateSelect = document.getElementById(`${prefix}DestinationState`);

        if (destinationInput) {
            destinationInput.value = cityName;

            // Sempre buscar estado e CEP da cidade de destino
            await this.searchCityAndFillStateAndZip(cityName, destinationStateSelect, `${prefix}DestinationZipCode`);
        }
    }

    async searchCityAndFillStateAndZip(cityName, stateSelect, zipInputId) {
        try {
            // Normalizar nome da cidade para busca
            const normalize = (str) => {
                return str.toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .trim();
            };

            const normalizedCityName = normalize(cityName);

            // Primeiro tenta buscar no sistema de cidades local
            let matchingCity = this.cities.find(city => {
                const normalizedCity = normalize(city.name);
                return normalizedCity === normalizedCityName;
            });

            if (matchingCity && matchingCity.state) {
                if (stateSelect) {
                    stateSelect.value = matchingCity.state;
                }
                // Buscar CEP usando o estado encontrado
                await this.searchZipCodeByCity(cityName, matchingCity.state, zipInputId);
            } else {
                // Se não encontrou no sistema local, busca na API do IBGE
                const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome&nome=${encodeURIComponent(cityName)}`);
                const cities = await response.json();

                if (cities.length > 0) {
                    // Tentar encontrar correspondência exata primeiro
                    let city = cities.find(c => {
                        const normalizedApiCity = normalize(c.nome);
                        return normalizedApiCity === normalizedCityName;
                    });

                    // Se não encontrou exata, pega a primeira
                    if (!city) {
                        city = cities[0];
                    }

                    const stateCode = city.microrregiao.mesorregiao.UF.sigla;

                    if (stateSelect) {
                        stateSelect.value = stateCode;
                    }

                    // Buscar CEP usando o estado encontrado e nome exato da cidade
                    await this.searchZipCodeByCity(city.nome, stateCode, zipInputId);
                }
            }
        } catch (error) {
            console.error('Erro ao buscar cidade:', error);
        }
    }

    setupModalEvents() {
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal.style.display = 'none';
            });
        });

        document.getElementById('cancelDeliveryBtn').addEventListener('click', () => {
            document.getElementById('newDeliveryModal').style.display = 'none';
        });

        document.getElementById('cancelEditDeliveryBtn').addEventListener('click', () => {
            document.getElementById('editDeliveryModal').style.display = 'none';
        });

        document.getElementById('newDeliveryForm').addEventListener('submit', (e) => {
            e.preventDefault();

            // Validar se um cliente foi selecionado
            const customerId = document.getElementById('deliveryCustomerId').value.trim();
            if (!customerId) {
                alert('Por favor, selecione um cliente antes de salvar a entrega.');
                document.getElementById('deliveryCustomerSearch').focus();
                return;
            }

            // Validar se o formulário está válido
            const form = document.getElementById('newDeliveryForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            this.createDelivery();
        });

        document.getElementById('editDeliveryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateDelivery();
        });

        // Event listener para mudança de status no modal de edição
        const editStatusSelect = document.getElementById('editDeliveryStatus');
        if (editStatusSelect) {
            editStatusSelect.addEventListener('change', (e) => {
                this.updateStatusSelectColor('editDeliveryStatus', e.target.value);
            });
        }

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    openNewDeliveryModal() {
        this.populateTruckSelect('deliveryTruck');
        this.populateDriverSelect('deliveryDriver');
        this.populateEmployeeSelect('deliveryEmployee');

        // Resetar campos de cálculo
        document.getElementById('deliveryFinalValue').value = '0,00';

        // Limpar campos de cliente
        document.getElementById('deliveryCustomerSearch').value = '';
        document.getElementById('deliveryCustomerId').value = '';
        document.getElementById('deliveryCustomerName').value = '';
        document.getElementById('deliveryCustomerDocument').value = '';
        document.getElementById('deliveryCustomerEmail').value = '';
        document.getElementById('deliveryCustomerPhone').value = '';
        document.getElementById('deliveryCustomerAddress').value = '';
        document.getElementById('deliveryCustomerAddressCity').value = '';
        document.getElementById('deliveryCustomerSearchResults').style.display = 'none';

        // Limpar campos de cidade, estado e CEP
        document.getElementById('deliveryDestinationCity').value = '';
        document.getElementById('deliveryDestinationZipCode').value = '';
        document.getElementById('deliveryDestinationState').value = '';
        document.getElementById('deliveryDestinationStreet').value = '';
        document.getElementById('deliveryDestinationNumber').value = '';
        document.getElementById('deliveryDestinationComplement').value = '';
        document.getElementById('deliveryDestinationNeighborhood').value = '';
        document.getElementById('deliveryDestinationCityResults').style.display = 'none';

        // Recarregar clientes para garantir dados atualizados
        this.loadData();

        document.getElementById('newDeliveryModal').style.display = 'block';
    }


    setupZipCodeInputs() {
        const zipInputs = [
            { id: 'deliveryDestinationZipCode', cityInput: 'deliveryDestinationCity', stateSelect: 'deliveryDestinationState' },
            { id: 'editDeliveryDestinationZipCode', cityInput: 'editDeliveryDestinationCity', stateSelect: 'editDeliveryDestinationState' }
        ];

        zipInputs.forEach(({ id, cityInput, stateSelect }) => {
            const input = document.getElementById(id);
            if (!input) return;

            // Formatar CEP enquanto digita
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
                    await this.buscarCEP(cep, '', cityInput, stateSelect);
                }
            });
        });
    }

    async buscarCEP(cep, prefix, cityInputId, stateSelectId) {
        const cityInput = document.getElementById(cityInputId);
        const stateSelect = document.getElementById(stateSelectId);

        // Determinar prefixo baseado no ID do campo de cidade
        let addressPrefix = '';
        if (cityInputId.includes('editDeliveryOrigin')) {
            addressPrefix = 'editDeliveryOrigin';
        } else if (cityInputId.includes('editDeliveryDestination')) {
            addressPrefix = 'editDeliveryDestination';
        } else if (cityInputId.includes('Origin')) {
            addressPrefix = 'deliveryOrigin';
        } else if (cityInputId.includes('Destination')) {
            addressPrefix = 'deliveryDestination';
        }

        try {
            // Desabilitar campos enquanto busca
            if (cityInput) cityInput.disabled = true;
            if (stateSelect) stateSelect.disabled = true;

            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (data.erro) {
                alert('CEP não encontrado. Por favor, verifique o CEP informado.');
            } else {
                // Preencher estado
                if (stateSelect && data.uf) {
                    stateSelect.value = data.uf;
                }

                // Preencher cidade
                if (cityInput && data.localidade) {
                    cityInput.value = data.localidade;
                }

                // Preencher campos de endereço
                if (addressPrefix) {
                    const streetInput = document.getElementById(`${addressPrefix}Street`);
                    const neighborhoodInput = document.getElementById(`${addressPrefix}Neighborhood`);

                    if (streetInput && data.logradouro) {
                        streetInput.value = data.logradouro;
                    }
                    if (neighborhoodInput && data.bairro) {
                        neighborhoodInput.value = data.bairro;
                    }
                }
            }

        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            alert('Erro ao buscar CEP. Por favor, tente novamente.');
        } finally {
            // Reabilitar campos sempre
            if (cityInput) cityInput.disabled = false;
            if (stateSelect) stateSelect.disabled = false;
        }
    }


    populateTruckSelect(selectId, selectedValue = '') {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Selecione um caminhão</option>';

        // Filtrar apenas caminhões disponíveis
        const availableTrucks = this.trucks.filter(truck =>
            truck.status === 'disponivel' || truck.status === 'disponível' || truck.status === 'DISPONIVEL' || truck.status === 'DISPONÍVEL'
        );

        availableTrucks.forEach(truck => {
            const option = document.createElement('option');
            option.value = truck.id;
            option.textContent = `${truck.id} - ${truck.plate}`;
            if (truck.id === selectedValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    populateDriverSelect(selectId, selectedValue = '') {
        const select = document.getElementById(selectId);
        const drivers = this.employees.filter(emp => emp.role === 'motorista');

        select.innerHTML = '<option value="">Selecione um motorista</option>';
        drivers.forEach(driver => {
            const option = document.createElement('option');
            option.value = driver.id;
            option.textContent = driver.name;
            if (driver.id === selectedValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    populateEmployeeSelect(selectId, selectedValue = '') {
        const select = document.getElementById(selectId);
        // Filtrar funcionários (excluir motoristas, pois já tem campo específico)
        const employees = this.employees.filter(emp => emp.role !== 'motorista');

        select.innerHTML = '<option value="">Selecione um funcionário</option>';
        employees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = `${employee.name} (${this.getRoleDisplayName(employee.role)})`;
            if (employee.id === selectedValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    populateCitySelect(selectId, selectedValue = '') {
        const select = document.getElementById(selectId);
        const currentValue = select.innerHTML;
        if (!currentValue.includes('Selecione')) {
            select.innerHTML = '<option value="">Selecione uma cidade</option>';
        }

        this.cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city.id;
            option.textContent = `${city.name} - ${city.state}`;
            if (city.id === selectedValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    createDelivery() {
        const formData = new FormData(document.getElementById('newDeliveryForm'));

        const totalValue = parseFloat(formData.get('deliveryTotalValue')) || 0;
        const discount = parseFloat(formData.get('deliveryDiscount')) || 0;
        const finalValue = Math.max(0, totalValue - discount);

        const delivery = {
            id: 'ENT-' + Date.now(),
            trackingCode: 'TRK-' + Date.now(),
            truckId: formData.get('deliveryTruck') || null,
            driverId: formData.get('deliveryDriver') || null,
            employeeId: formData.get('deliveryEmployee') || null,
            destinationCity: formData.get('deliveryDestinationCity') || '',
            destinationState: formData.get('deliveryDestinationState') || '',
            destinationZipCode: formData.get('deliveryDestinationZipCode') || '',
            destinationStreet: formData.get('deliveryDestinationStreet') || '',
            destinationNumber: formData.get('deliveryDestinationNumber') || '',
            destinationComplement: formData.get('deliveryDestinationComplement') || '',
            destinationNeighborhood: formData.get('deliveryDestinationNeighborhood') || '',
            cargoType: formData.get('deliveryCargoType') || '',
            cargoTypeId: formData.get('deliveryCargoTypeId') || null,
            cargoWeight: formData.get('deliveryCargoWeight') ? parseFloat(formData.get('deliveryCargoWeight').replace(/\./g, '').replace(',', '.').replace(/\s*[a-z³t]+\s*/gi, '')) || null : null,
            cargoUnit: formData.get('deliveryCargoUnit') || '',
            cargoDescription: formData.get('deliveryCargoDescription') || '',
            totalValue: totalValue,
            discount: discount,
            finalValue: finalValue,
            paymentMethod: formData.get('deliveryPaymentMethod') || '',
            customerId: formData.get('deliveryCustomerId') || null,
            customerName: formData.get('deliveryCustomerName') || '',
            customerDocument: formData.get('deliveryCustomerDocument') || '',
            customerEmail: formData.get('deliveryCustomerEmail') || '',
            customerPhone: formData.get('deliveryCustomerPhone') || '',
            customerAddress: formData.get('deliveryCustomerAddress') || '',
            customerAddressCity: formData.get('deliveryCustomerAddressCity') || '',
            scheduledDate: formData.get('deliveryScheduledDate') || null,
            priority: formData.get('deliveryPriority') || 'normal',
            status: formData.get('deliveryStatus') || 'pendente',
            notes: formData.get('deliveryNotes') || '',
            createdAt: new Date().toISOString()
        };

        this.deliveries.push(delivery);
        localStorage.setItem('deliveries', JSON.stringify(this.deliveries));

        // Criar notificação se entrega foi atribuída a motorista/funcionário
        if (delivery.driverId || delivery.employeeId) {
            this.createDeliveryAssignmentNotification(delivery, 'created');
        }

        document.getElementById('newDeliveryModal').style.display = 'none';
        document.getElementById('newDeliveryForm').reset();
        this.renderDeliveries();

        alert('Entrega salva com sucesso!');
    }

    createDeliveryAssignmentNotification(delivery, action = 'created') {
        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        const employees = JSON.parse(localStorage.getItem('employees') || '[]');
        const trucks = JSON.parse(localStorage.getItem('trucks') || '[]');

        const truck = trucks.find(t => t.id === delivery.truckId);
        const truckInfo = truck ? `${truck.id} - ${truck.plate || 'Sem placa'}` : 'N/A';

        // Notificar motorista se houver
        if (delivery.driverId) {
            const driver = employees.find(e => e.id === delivery.driverId || String(e.id) === String(delivery.driverId));
            if (driver) {
                const notification = {
                    id: 'NOTIF-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                    type: 'entrega',
                    title: action === 'created' ? 'Nova Entrega Atribuída' : 'Entrega Atualizada',
                    message: action === 'created'
                        ? `Uma nova entrega foi atribuída a você.\nCódigo de Rastreamento: ${delivery.trackingCode || delivery.id}\nCliente: ${delivery.customerName || 'N/A'}\nCaminhão: ${truckInfo}\nDestino: ${delivery.destinationCity || 'N/A'} - ${delivery.destinationState || 'N/A'}\n${delivery.scheduledDate ? `Data Prevista: ${new Date(delivery.scheduledDate).toLocaleDateString('pt-BR')}` : ''}`
                        : `A entrega ${delivery.trackingCode || delivery.id} foi atualizada.\nCliente: ${delivery.customerName || 'N/A'}\nCaminhão: ${truckInfo}\nDestino: ${delivery.destinationCity || 'N/A'} - ${delivery.destinationState || 'N/A'}`,
                    priority: 'alta',
                    read: false,
                    createdAt: new Date().toISOString(),
                    relatedId: delivery.id,
                    relatedType: 'delivery',
                    targetEmployeeId: delivery.driverId,
                    metadata: {
                        deliveryId: delivery.id,
                        trackingCode: delivery.trackingCode,
                        customerName: delivery.customerName,
                        truckId: delivery.truckId,
                        truckInfo: truckInfo,
                        destinationCity: delivery.destinationCity,
                        destinationState: delivery.destinationState,
                        scheduledDate: delivery.scheduledDate,
                        action: action
                    }
                };
                notifications.unshift(notification);
            }
        }

        // Notificar funcionário se houver (e for diferente do motorista)
        if (delivery.employeeId && delivery.employeeId !== delivery.driverId) {
            const employee = employees.find(e => e.id === delivery.employeeId || String(e.id) === String(delivery.employeeId));
            if (employee) {
                const notification = {
                    id: 'NOTIF-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                    type: 'entrega',
                    title: action === 'created' ? 'Nova Entrega Atribuída' : 'Entrega Atualizada',
                    message: action === 'created'
                        ? `Uma nova entrega foi atribuída a você.\nCódigo de Rastreamento: ${delivery.trackingCode || delivery.id}\nCliente: ${delivery.customerName || 'N/A'}\nCaminhão: ${truckInfo}\nDestino: ${delivery.destinationCity || 'N/A'} - ${delivery.destinationState || 'N/A'}\n${delivery.scheduledDate ? `Data Prevista: ${new Date(delivery.scheduledDate).toLocaleDateString('pt-BR')}` : ''}`
                        : `A entrega ${delivery.trackingCode || delivery.id} foi atualizada.\nCliente: ${delivery.customerName || 'N/A'}\nCaminhão: ${truckInfo}\nDestino: ${delivery.destinationCity || 'N/A'} - ${delivery.destinationState || 'N/A'}`,
                    priority: 'alta',
                    read: false,
                    createdAt: new Date().toISOString(),
                    relatedId: delivery.id,
                    relatedType: 'delivery',
                    targetEmployeeId: delivery.employeeId,
                    metadata: {
                        deliveryId: delivery.id,
                        trackingCode: delivery.trackingCode,
                        customerName: delivery.customerName,
                        truckId: delivery.truckId,
                        truckInfo: truckInfo,
                        destinationCity: delivery.destinationCity,
                        destinationState: delivery.destinationState,
                        scheduledDate: delivery.scheduledDate,
                        action: action
                    }
                };
                notifications.unshift(notification);
            }
        }

        localStorage.setItem('notifications', JSON.stringify(notifications));
    }

    updateDelivery() {
        const formData = new FormData(document.getElementById('editDeliveryForm'));
        const index = parseInt(document.getElementById('editDeliveryIndex').value);

        // Extrair valores numéricos dos campos formatados
        const totalValueStr = formData.get('editDeliveryTotalValue') || '0';
        const discountStr = formData.get('editDeliveryDiscount') || '0';
        const totalValue = parseFloat(totalValueStr.replace(/\./g, '').replace(',', '.')) || 0;
        const discount = parseFloat(discountStr.replace(/\./g, '').replace(',', '.')) || 0;
        const finalValue = Math.max(0, totalValue - discount);

        const oldDelivery = this.deliveries[index];
        const newDriverId = formData.get('editDeliveryDriver') || null;
        const newEmployeeId = formData.get('editDeliveryEmployee') || null;

        this.deliveries[index] = {
            ...this.deliveries[index],
            truckId: formData.get('editDeliveryTruck') || null,
            driverId: newDriverId,
            employeeId: newEmployeeId,
            destinationCity: formData.get('editDeliveryDestinationCity') || '',
            destinationState: formData.get('editDeliveryDestinationState') || '',
            destinationZipCode: formData.get('editDeliveryDestinationZipCode') || '',
            destinationStreet: formData.get('editDeliveryDestinationStreet') || '',
            destinationNumber: formData.get('editDeliveryDestinationNumber') || '',
            destinationComplement: formData.get('editDeliveryDestinationComplement') || '',
            destinationNeighborhood: formData.get('editDeliveryDestinationNeighborhood') || '',
            cargoType: formData.get('editDeliveryCargoType') || '',
            cargoTypeId: formData.get('editDeliveryCargoTypeId') || null,
            cargoWeight: formData.get('editDeliveryCargoWeight') ? parseFloat(formData.get('editDeliveryCargoWeight').replace(/\./g, '').replace(',', '.').replace(/\s*[a-z³t]+\s*/gi, '')) || null : null,
            cargoUnit: formData.get('editDeliveryCargoUnit') || '',
            cargoDescription: formData.get('editDeliveryCargoDescription') || '',
            totalValue: totalValue,
            discount: discount,
            finalValue: finalValue,
            paymentMethod: formData.get('editDeliveryPaymentMethod') || '',
            customerId: formData.get('editDeliveryCustomerId') || null,
            customerName: formData.get('editDeliveryCustomerName') || '',
            customerDocument: formData.get('editDeliveryCustomerDocument') || '',
            customerEmail: formData.get('editDeliveryCustomerEmail') || '',
            customerPhone: formData.get('editDeliveryCustomerPhone') || '',
            customerAddress: formData.get('editDeliveryAddress') || '',
            customerAddressCity: formData.get('editDeliveryCustomerAddressCity') || '',
            scheduledDate: formData.get('editDeliveryScheduledDate') || null,
            deliveryDate: formData.get('editDeliveryDate') || null,
            priority: formData.get('editDeliveryPriority') || 'normal',
            status: formData.get('editDeliveryStatus') || 'pendente',
            notes: formData.get('editDeliveryNotes') || ''
        };

        localStorage.setItem('deliveries', JSON.stringify(this.deliveries));

        // Criar notificação se motorista/funcionário foi atribuído ou alterado
        const driverChanged = String(oldDelivery.driverId) !== String(newDriverId);
        const employeeChanged = String(oldDelivery.employeeId) !== String(newEmployeeId);

        if (driverChanged || employeeChanged) {
            this.createDeliveryAssignmentNotification(this.deliveries[index], 'updated');
        }

        document.getElementById('editDeliveryModal').style.display = 'none';
        this.renderDeliveries();

        alert('Entrega salva com sucesso!');
    }

    editDelivery(index) {
        const delivery = this.deliveries[index];

        document.getElementById('editDeliveryIndex').value = index;

        this.populateTruckSelect('editDeliveryTruck', delivery.truckId);
        this.populateDriverSelect('editDeliveryDriver', delivery.driverId);
        this.populateEmployeeSelect('editDeliveryEmployee', delivery.employeeId || '');
        // Preencher cidades, estados e CEPs
        document.getElementById('editDeliveryDestinationCity').value = delivery.destinationCity || delivery.destinationCityId || '';
        document.getElementById('editDeliveryDestinationState').value = delivery.destinationState || '';
        document.getElementById('editDeliveryDestinationZipCode').value = delivery.destinationZipCode || '';
        document.getElementById('editDeliveryDestinationStreet').value = delivery.destinationStreet || '';
        document.getElementById('editDeliveryDestinationNumber').value = delivery.destinationNumber || '';
        document.getElementById('editDeliveryDestinationComplement').value = delivery.destinationComplement || '';
        document.getElementById('editDeliveryDestinationNeighborhood').value = delivery.destinationNeighborhood || '';

        // Se houver destinationCityId antigo, tentar buscar o nome da cidade
        if (delivery.destinationCityId && !delivery.destinationCity) {
            const destCity = this.cities.find(c => c.id === delivery.destinationCityId);
            if (destCity) {
                document.getElementById('editDeliveryDestinationCity').value = destCity.name;
                if (!delivery.destinationState && destCity.state) {
                    document.getElementById('editDeliveryDestinationState').value = destCity.state;
                }
            }
        }

        // Informações do Material
        document.getElementById('editDeliveryCargoType').value = delivery.cargoType || '';
        const editCargoTypeIdInput = document.getElementById('editDeliveryCargoTypeId');
        if (editCargoTypeIdInput) {
            editCargoTypeIdInput.value = delivery.cargoTypeId || '';
        }
        // Formatar peso
        const cargoWeight = delivery.cargoWeight || '';
        if (cargoWeight) {
            document.getElementById('editDeliveryCargoWeight').value = cargoWeight.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else {
            document.getElementById('editDeliveryCargoWeight').value = '';
        }
        document.getElementById('editDeliveryCargoUnit').value = delivery.cargoUnit || '';
        document.getElementById('editDeliveryCargoDescription').value = delivery.cargoDescription || '';

        // Informações do Cliente
        document.getElementById('editDeliveryCustomerId').value = delivery.customerId || '';
        document.getElementById('editDeliveryCustomerName').value = delivery.customerName || '';
        document.getElementById('editDeliveryCustomerDocument').value = delivery.customerDocument || '';
        document.getElementById('editDeliveryCustomerEmail').value = delivery.customerEmail || '';
        document.getElementById('editDeliveryCustomerPhone').value = delivery.customerPhone || '';
        document.getElementById('editDeliveryCustomerAddress').value = delivery.customerAddress || '';
        document.getElementById('editDeliveryCustomerAddressCity').value = delivery.customerAddressCity || '';

        // Se houver customerId, tentar buscar o cliente atualizado
        if (delivery.customerId) {
            const customer = this.customers.find(c => c.id === delivery.customerId);
            if (customer) {
                // Atualizar com dados mais recentes do cliente
                document.getElementById('editDeliveryCustomerName').value = customer.name || delivery.customerName || '';
                document.getElementById('editDeliveryCustomerDocument').value = customer.document || delivery.customerDocument || '';
                document.getElementById('editDeliveryCustomerEmail').value = customer.email || delivery.customerEmail || '';
                document.getElementById('editDeliveryCustomerPhone').value = customer.phone || customer.cellphone || delivery.customerPhone || '';

                const address = customer.address || {};
                if (address.city) {
                    document.getElementById('editDeliveryCustomerAddressCity').value = address.city;
                    // Não preencher cidade de destino automaticamente - usuário deve preencher manualmente
                }

                if (address.street || address.number || address.neighborhood || address.city) {
                    const addressParts = [];
                    if (address.street) addressParts.push(address.street);
                    if (address.number) addressParts.push(`Nº ${address.number}`);
                    if (address.complement) addressParts.push(address.complement);
                    if (address.neighborhood) addressParts.push(address.neighborhood);
                    if (address.city) addressParts.push(address.city);
                    if (address.state) addressParts.push(address.state);
                    if (address.zipCode) addressParts.push(`CEP: ${address.zipCode}`);
                    document.getElementById('editDeliveryCustomerAddress').value = addressParts.join(', ') || delivery.customerAddress || '';
                }
            }
        }

        // Informações de Pagamento
        // Formatar valores monetários ao carregar
        const totalValue = delivery.totalValue || delivery.noteValue || 0;
        const discount = delivery.discount || 0;
        const finalValue = Math.max(0, totalValue - discount);

        document.getElementById('editDeliveryTotalValue').value = totalValue.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        document.getElementById('editDeliveryDiscount').value = discount.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        document.getElementById('editDeliveryPaymentMethod').value = delivery.paymentMethod || '';
        document.getElementById('editDeliveryFinalValue').value = finalValue.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        // Informações da Entrega
        document.getElementById('editDeliveryScheduledDate').value = delivery.scheduledDate || '';
        document.getElementById('editDeliveryDate').value = delivery.deliveryDate || '';
        document.getElementById('editDeliveryPriority').value = delivery.priority || 'normal';
        document.getElementById('editDeliveryStatus').value = delivery.status || 'pendente';
        // Aplicar cor do status ao select
        this.updateStatusSelectColor('editDeliveryStatus', delivery.status || 'pendente');
        document.getElementById('editDeliveryNotes').value = delivery.notes || '';

        // Limpar campo de busca
        document.getElementById('editDeliveryCustomerSearch').value = '';
        document.getElementById('editDeliveryCustomerSearchResults').style.display = 'none';

        // Recarregar clientes para garantir dados atualizados
        this.loadData();

        document.getElementById('editDeliveryModal').style.display = 'block';
    }

    deleteDelivery(index) {
        const delivery = this.deliveries[index];

        const self = this;
        window.showGlobalConfirmModal(
            'Excluir Entrega',
            `Tem certeza que deseja deletar a entrega <strong>${this.escapeHtml(delivery.trackingCode)}</strong>?<br><br><span style="color: var(--accent-red);"><i class="fas fa-exclamation-circle"></i> Esta ação não pode ser desfeita.</span>`,
            () => {
                self.executeDeleteDelivery(index);
            }
        );
        return;
    }

    executeDeleteDelivery(index) {
        this.deliveries.splice(index, 1);
        localStorage.setItem('deliveries', JSON.stringify(this.deliveries));
        this.renderDeliveries();

        window.showGlobalInfoModal('Sucesso', 'Entrega deletada com sucesso!');
    }

    setFilter(filter) {
        this.currentFilter = filter;

        document.querySelectorAll('.status-filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });

        this.renderDeliveries();
    }

    updateStatusSelectColor(selectId, status) {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Remover todas as classes de status
        select.classList.remove('status-pendente', 'status-em_percurso', 'status-em_carregamento', 'status-entregue');

        // Adicionar classe correspondente ao status
        if (status) {
            select.classList.add(`status-${status}`);
        }
    }

    getFilteredDeliveries() {
        let filtered = this.deliveries;
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();

        // Filtrar por status primeiro
        if (this.currentFilter === 'all') {
            // Quando "all" está selecionado, excluir entregas com status "entregue"
            filtered = filtered.filter(delivery => delivery.status !== 'entregue');
        } else {
            // Quando um filtro específico está selecionado, mostrar apenas esse status
            filtered = filtered.filter(delivery => delivery.status === this.currentFilter);
        }

        // Aplicar busca por termo
        if (searchTerm) {
            filtered = filtered.filter(delivery => {
                const destCityName = delivery.destinationCity || (delivery.destinationCityId ? this.cities.find(c => c.id === delivery.destinationCityId)?.name : '');
                const truck = this.trucks.find(t => t.id === delivery.truckId);
                const driver = this.employees.find(e => e.id === delivery.driverId);

                return (
                    delivery.trackingCode.toLowerCase().includes(searchTerm) ||
                    (delivery.customerName && delivery.customerName.toLowerCase().includes(searchTerm)) ||
                    (destCityName && destCityName.toLowerCase().includes(searchTerm)) ||
                    (truck && truck.plate.toLowerCase().includes(searchTerm)) ||
                    (driver && driver.name.toLowerCase().includes(searchTerm))
                );
            });
        }

        // Filtrar por datas
        const dateStart = document.getElementById('dateStart')?.value;
        const dateEnd = document.getElementById('dateEnd')?.value;

        if (dateStart || dateEnd) {
            filtered = filtered.filter(delivery => {
                // Usar scheduledDate ou createdAt como data de referência
                const deliveryDate = delivery.scheduledDate || delivery.createdAt || delivery.deliveryDate;
                if (!deliveryDate) return false;

                const deliveryDateObj = new Date(deliveryDate);
                deliveryDateObj.setHours(0, 0, 0, 0);

                if (dateStart) {
                    const startDate = new Date(dateStart);
                    startDate.setHours(0, 0, 0, 0);
                    if (deliveryDateObj < startDate) return false;
                }

                if (dateEnd) {
                    const endDate = new Date(dateEnd);
                    endDate.setHours(23, 59, 59, 999);
                    if (deliveryDateObj > endDate) return false;
                }

                return true;
            });
        }

        return filtered;
    }

    clearDateFilters() {
        const dateStart = document.getElementById('dateStart');
        const dateEnd = document.getElementById('dateEnd');
        if (dateStart) dateStart.value = '';
        if (dateEnd) dateEnd.value = '';
        this.renderDeliveries();
    }

    updateStatusCounts() {
        // Calcular estatísticas
        const totalDeliveries = this.deliveries.length;
        const pendenteDeliveries = this.deliveries.filter(d => d.status === 'pendente').length;
        const emTransitoDeliveries = this.deliveries.filter(d => d.status === 'em_transito').length;
        const entregueDeliveries = this.deliveries.filter(d => d.status === 'entregue').length;
        const canceladaDeliveries = this.deliveries.filter(d => d.status === 'cancelada').length;

        // Atualizar card de status destacado
        const statusTotalEl = document.getElementById('statusTotalCount');
        const statusPendenteEl = document.getElementById('statusPendenteCount');
        const statusEmTransitoEl = document.getElementById('statusEmTransitoCount');
        const statusEntregueEl = document.getElementById('statusEntregueCount');
        const statusCanceladaEl = document.getElementById('statusCanceladaCount');

        if (statusTotalEl) statusTotalEl.textContent = totalDeliveries;
        if (statusPendenteEl) statusPendenteEl.textContent = pendenteDeliveries;
        if (statusEmTransitoEl) statusEmTransitoEl.textContent = emTransitoDeliveries;
        if (statusEntregueEl) statusEntregueEl.textContent = entregueDeliveries;
        if (statusCanceladaEl) statusCanceladaEl.textContent = canceladaDeliveries;
    }

    renderDeliveries() {
        const tbody = document.getElementById('deliveriesTableBody');
        const resultsCountEl = document.getElementById('resultsCount');
        const filteredDeliveries = this.getFilteredDeliveries();

        // Atualizar contadores de status
        this.updateStatusCounts();

        // Atualizar contador de resultados
        if (resultsCountEl) {
            resultsCountEl.textContent = filteredDeliveries.length;
        }

        if (filteredDeliveries.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="12" class="empty-state">
                        <i class="fas fa-box"></i>
                        <h3>Nenhuma entrega encontrada</h3>
                        <p>Não há entregas que correspondam aos filtros selecionados.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredDeliveries.map((delivery) => {
            // Encontrar o índice real no array original
            const realIndex = this.deliveries.findIndex(d => d.trackingCode === delivery.trackingCode);
            const truck = this.trucks.find(t => t.id === delivery.truckId);
            const driver = this.employees.find(e => e.id === delivery.driverId);
            const employee = delivery.employeeId ? this.employees.find(e => e.id === delivery.employeeId) : null;
            const destCityName = delivery.destinationCity || (delivery.destinationCityId ? this.cities.find(c => c.id === delivery.destinationCityId)?.name : '');
            const destCityState = delivery.destinationState || (delivery.destinationCityId ? this.cities.find(c => c.id === delivery.destinationCityId)?.state : '');

            const scheduledDate = delivery.scheduledDate ? new Date(delivery.scheduledDate).toLocaleDateString('pt-BR') : '-';
            const deliveryDate = delivery.deliveryDate ? new Date(delivery.deliveryDate).toLocaleDateString('pt-BR') : '-';
            const finalValue = delivery.finalValue || delivery.noteValue || 0;
            const noteValue = finalValue ? `R$ ${finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';

            return `
                <tr>
                    <td>${delivery.trackingCode}</td>
                    <td>${delivery.customerName || 'N/A'}</td>
                    <td>${truck ? `${truck.id} - ${truck.plate}` : 'N/A'}</td>
                    <td>${driver ? driver.name : 'N/A'}</td>
                    <td>${employee ? employee.name : '-'}</td>
                    <td>${destCityName && destCityState ? `${destCityName} - ${destCityState}` : (destCityName || 'N/A')}</td>
                    <td>${this.getCargoTypeName(delivery.cargoType)}</td>
                    <td>${delivery.cargoWeight ? delivery.cargoWeight.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'} ${delivery.cargoUnit || ''}</td>
                    <td>${noteValue}</td>
                    <td><span class="status-badge ${delivery.status}">${this.getStatusDisplayName(delivery.status)}</span></td>
                    <td>${deliveryDate}</td>
                    <td>
                        <div class="action-buttons">
                            <div class="action-buttons-column">
                                <button class="action-btn edit" onclick="deliveryManager.editDelivery(${realIndex})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                                <button class="action-btn print" onclick="deliveryManager.generateInvoice(${realIndex})" title="Gerar Nota Fiscal">
                                    <i class="fas fa-print"></i>
                                </button>
                            </div>
                            <div class="action-buttons-column">
                                <button class="action-btn delete" onclick="deliveryManager.deleteDelivery(${realIndex})" title="Deletar">
                                <i class="fas fa-trash"></i>
                            </button>
                                <button class="action-btn view" onclick="deliveryManager.viewDeliveryDetails(${realIndex})" title="Ver Detalhes">
                                    <i class="fas fa-eye"></i>
                            </button>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getStatusDisplayName(status) {
        const statusNames = {
            'pendente': 'Pendente',
            'em_percurso': 'Em Percurso',
            'em_carregamento': 'Em Carregamento',
            'entregue': 'Entregue'
        };
        return statusNames[status] || status;
    }

    getCargoTypeName(cargoType) {
        // Retorna o valor direto, pois agora é texto livre
        return cargoType || '-';
    }

    generateInvoice(index) {
        const delivery = this.deliveries[index];
        if (!delivery) return;

        const truck = this.trucks.find(t => t.id === delivery.truckId);
        const driver = this.employees.find(e => e.id === delivery.driverId);
        const employee = delivery.employeeId ? this.employees.find(e => e.id === delivery.employeeId) : null;
        const destCityName = delivery.destinationCity || (delivery.destinationCityId ? this.cities.find(c => c.id === delivery.destinationCityId)?.name : '');
        const destCityState = delivery.destinationState || (delivery.destinationCityId ? this.cities.find(c => c.id === delivery.destinationCityId)?.state : '');

        const paymentMethodNames = {
            'dinheiro': 'Dinheiro',
            'pix': 'PIX',
            'cartao_debito': 'Cartão de Débito',
            'cartao_credito': 'Cartão de Crédito',
            'transferencia': 'Transferência Bancária',
            'boleto': 'Boleto',
            'cheque': 'Cheque',
            'credito_loja': 'Crédito na Loja',
            'outros': 'Outros'
        };

        // Obter o caminho base para a logo
        // A logo está na raiz do projeto front-end
        const currentPath = window.location.pathname;
        let logoPath;

        if (currentPath.includes('/dashboard_sistem/')) {
            // Se estiver dentro de dashboard_sistem, subir dois níveis
            const basePath = window.location.origin + currentPath.substring(0, currentPath.indexOf('/dashboard_sistem'));
            logoPath = basePath + '/logo_agreste.jpg';
        } else {
            // Se estiver na raiz, usar caminho direto
            logoPath = window.location.origin + '/logo_agreste.jpg';
        }

        const invoiceHTML = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Nota Fiscal - ${delivery.trackingCode}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        padding: 15px;
                        color: #333;
                        font-size: 11px;
                    }
                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                    .invoice-header {
                        text-align: center;
                        border-bottom: 2px solid #333;
                        padding-bottom: 10px;
                        margin-bottom: 10px;
                    }
                    .invoice-logo {
                        max-width: 150px;
                        max-height: 70px;
                        margin-bottom: 8px;
                        display: block;
                        margin-left: auto;
                        margin-right: auto;
                    }
                    .invoice-header h1 {
                        font-size: 18px;
                        margin-bottom: 5px;
                    }
                    .invoice-header p {
                        font-size: 11px;
                        margin: 0;
                    }
                    .invoice-info {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 12px;
                    }
                    .info-section {
                        flex: 1;
                        margin: 0 8px;
                    }
                    .info-section h3 {
                        border-bottom: 1px solid #ccc;
                        padding-bottom: 3px;
                        margin-bottom: 5px;
                        font-size: 11px;
                    }
                    .info-section p {
                        margin: 2px 0;
                        font-size: 10px;
                        line-height: 1.3;
                    }
                    .invoice-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 10px;
                    }
                    .invoice-table th,
                    .invoice-table td {
                        border: 1px solid #ddd;
                        padding: 4px;
                        text-align: left;
                        font-size: 9px;
                    }
                    .invoice-table th {
                        background-color: #f5f5f5;
                        font-weight: bold;
                    }
                    .invoice-totals {
                        text-align: right;
                        margin-top: 10px;
                        margin-bottom: 10px;
                    }
                    .invoice-totals table {
                        margin-left: auto;
                        width: 250px;
                    }
                    .invoice-totals td {
                        padding: 3px 8px;
                        font-size: 10px;
                    }
                    .invoice-totals .total-row {
                        font-weight: bold;
                        font-size: 11px;
                        border-top: 2px solid #333;
                    }
                    .invoice-signatures {
                        margin-top: 15px;
                        display: flex;
                        justify-content: space-between;
                        border-top: 1px solid #ddd;
                        padding-top: 10px;
                    }
                    .signature-box {
                        flex: 1;
                        text-align: center;
                        margin: 0 10px;
                        min-height: 70px;
                        border-bottom: 1px solid #333;
                        padding-bottom: 3px;
                    }
                    .signature-box:first-child {
                        margin-left: 0;
                    }
                    .signature-box:last-child {
                        margin-right: 0;
                    }
                    .signature-label {
                        font-weight: bold;
                        font-size: 10px;
                        margin-bottom: 35px;
                        color: #333;
                    }
                    .signature-name {
                        font-size: 9px;
                        color: #666;
                        margin-top: 3px;
                    }
                    .invoice-footer {
                        margin-top: 10px;
                        text-align: center;
                        font-size: 9px;
                        color: #666;
                    }
                    .notes-section {
                        margin-top: 8px;
                        font-size: 10px;
                    }
                    .notes-section h3 {
                        font-size: 11px;
                        margin-bottom: 3px;
                    }
                    .notes-section p {
                        font-size: 10px;
                        line-height: 1.3;
                    }
                    @media print {
                        body {
                            padding: 0;
                            margin: 0;
                        }
                        .no-print {
                            display: none;
                        }
                        * {
                            page-break-inside: avoid;
                        }
                        .invoice-signatures {
                            page-break-inside: avoid;
                        }
                        @page {
                            margin: 10mm;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="invoice-header">
                    <img src="${logoPath}" alt="Logo Agreste Construção" class="invoice-logo" onerror="this.style.display='none'">
                    <h1>NOTA FISCAL</h1>
                    <p>Agreste Construções - Control Development</p>
                </div>

                <div class="invoice-info">
                    <div class="info-section">
                        <h3>DADOS DA ENTREGA</h3>
                        <p><strong>Código de Rastreamento:</strong> ${delivery.trackingCode}</p>
                        <p><strong>Data Prevista:</strong> ${delivery.scheduledDate ? new Date(delivery.scheduledDate).toLocaleDateString('pt-BR') : '-'}</p>
                        <p><strong>Data de Entrega:</strong> ${delivery.deliveryDate ? new Date(delivery.deliveryDate).toLocaleDateString('pt-BR') : '-'}</p>
                        <p><strong>Status:</strong> ${this.getStatusDisplayName(delivery.status)}</p>
                    </div>
                    <div class="info-section">
                        <h3>CLIENTE</h3>
                        <p><strong>Nome:</strong> ${delivery.customerName || '-'}</p>
                        <p><strong>CPF/CNPJ:</strong> ${delivery.customerDocument || '-'}</p>
                        <p><strong>Email:</strong> ${delivery.customerEmail || '-'}</p>
                        <p><strong>Telefone:</strong> ${delivery.customerPhone || '-'}</p>
                    </div>
                </div>

                <div class="invoice-info">
                    <div class="info-section">
                        <h3>DESTINO</h3>
                        <p><strong>Cidade:</strong> ${destCityName || '-'}</p>
                        <p><strong>Estado:</strong> ${destCityState || '-'}</p>
                        <p><strong>CEP:</strong> ${delivery.destinationZipCode || '-'}</p>
                        ${delivery.destinationStreet ? `<p><strong>Logradouro:</strong> ${delivery.destinationStreet}</p>` : ''}
                        ${delivery.destinationNumber ? `<p><strong>Número:</strong> ${delivery.destinationNumber}</p>` : ''}
                        ${delivery.destinationComplement ? `<p><strong>Complemento:</strong> ${delivery.destinationComplement}</p>` : ''}
                        ${delivery.destinationNeighborhood ? `<p><strong>Bairro:</strong> ${delivery.destinationNeighborhood}</p>` : ''}
                    </div>
                </div>

                <div class="invoice-info">
                    <div class="info-section">
                        <h3>VEÍCULO E EQUIPE</h3>
                        <p><strong>Caminhão:</strong> ${truck ? `${truck.id} - ${truck.plate}` : '-'}</p>
                        <p><strong>Motorista:</strong> ${driver ? driver.name : '-'}</p>
                        <p><strong>Funcionário:</strong> ${employee ? employee.name : '-'}</p>
                    </div>
                    <div class="info-section">
                        <h3>MATERIAL</h3>
                        <p><strong>Tipo:</strong> ${this.getCargoTypeName(delivery.cargoType)}</p>
                        <p><strong>Quantidade / Peso:</strong> ${delivery.cargoWeight ? `${delivery.cargoWeight.toLocaleString()} ${delivery.cargoUnit || ''}` : '-'}</p>
                        <p><strong>Descrição:</strong> ${delivery.cargoDescription || '-'}</p>
                    </div>
                </div>

                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>Descrição</th>
                            <th>Quantidade</th>
                            <th>Valor Unitário</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Serviço de Transporte - ${this.getCargoTypeName(delivery.cargoType)}</td>
                            <td>1</td>
                            <td>R$ ${(delivery.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td>R$ ${(delivery.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="invoice-totals">
                    <table>
                        <tr>
                            <td>Subtotal:</td>
                            <td>R$ ${(delivery.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        ${delivery.discount ? `
                        <tr>
                            <td>Desconto:</td>
                            <td>- R$ ${delivery.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        ` : ''}
                        <tr class="total-row">
                            <td>Total:</td>
                            <td>R$ ${(delivery.finalValue || delivery.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                            <td>Método de Pagamento:</td>
                            <td>${paymentMethodNames[delivery.paymentMethod] || delivery.paymentMethod || '-'}</td>
                        </tr>
                    </table>
                </div>

                ${delivery.notes ? `
                <div class="notes-section">
                    <h3>Observações:</h3>
                    <p>${delivery.notes}</p>
                </div>
                ` : ''}

                <div class="invoice-signatures">
                    <div class="signature-box">
                        <div class="signature-label">MOTORISTA</div>
                        <div class="signature-name"></div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-label">CLIENTE</div>
                        <div class="signature-name"></div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-label">GESTOR</div>
                        <div class="signature-name"></div>
                    </div>
                </div>

                <div class="invoice-footer">
                    <p>Documento gerado automaticamente pelo sistema Agreste Construção</p>
                    <p>Data de emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        printWindow.focus();

        // Aguardar o conteúdo carregar antes de imprimir
        setTimeout(() => {
            printWindow.print();
        }, 250);
    }

    viewDeliveryDetails(index) {
        const delivery = this.deliveries[index];
        if (!delivery) return;

        const truck = this.trucks.find(t => t.id === delivery.truckId);
        const driver = this.employees.find(e => e.id === delivery.driverId);
        const employee = delivery.employeeId ? this.employees.find(e => e.id === delivery.employeeId) : null;
        const destCityName = delivery.destinationCity || (delivery.destinationCityId ? this.cities.find(c => c.id === delivery.destinationCityId)?.name : '');
        const destCityState = delivery.destinationState || (delivery.destinationCityId ? this.cities.find(c => c.id === delivery.destinationCityId)?.state : '');
        const destZipCode = delivery.destinationZipCode || '';

        const paymentMethodNames = {
            'dinheiro': 'Dinheiro',
            'pix': 'PIX',
            'cartao_debito': 'Cartão de Débito',
            'cartao_credito': 'Cartão de Crédito',
            'transferencia': 'Transferência Bancária',
            'boleto': 'Boleto',
            'cheque': 'Cheque',
            'credito_loja': 'Crédito na Loja',
            'outros': 'Outros'
        };

        const priorityNames = {
            'normal': 'Normal',
            'alta': 'Alta',
            'urgente': 'Urgente'
        };

        const detailsHTML = `
                <div class="details-section">
                    <h3>Informações Gerais</h3>
                    <div class="details-grid">
                        <div class="detail-item">
                            <span class="detail-label">Código de Rastreamento:</span>
                            <span class="detail-value">${delivery.trackingCode}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Status:</span>
                            <span class="detail-value status-badge ${delivery.status}">${this.getStatusDisplayName(delivery.status)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Data Prevista:</span>
                            <span class="detail-value">${delivery.scheduledDate ? new Date(delivery.scheduledDate).toLocaleDateString('pt-BR') : '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Data de Entrega:</span>
                            <span class="detail-value">${delivery.deliveryDate ? new Date(delivery.deliveryDate).toLocaleDateString('pt-BR') : '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Prioridade:</span>
                            <span class="detail-value">${priorityNames[delivery.priority] || delivery.priority || 'Normal'}</span>
                        </div>
                    </div>
                </div>

                <div class="details-section">
                    <h3>Informações do Cliente</h3>
                    <div class="details-grid">
                        <div class="detail-item">
                            <span class="detail-label">Nome:</span>
                            <span class="detail-value">${delivery.customerName || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">CPF/CNPJ:</span>
                            <span class="detail-value">${delivery.customerDocument || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Email:</span>
                            <span class="detail-value">${delivery.customerEmail || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Telefone:</span>
                            <span class="detail-value">${delivery.customerPhone || '-'}</span>
                        </div>
                        <div class="detail-item full-width">
                            <span class="detail-label">Endereço:</span>
                            <span class="detail-value">${delivery.customerAddress || '-'}</span>
                        </div>
                    </div>
                </div>

                <div class="details-section">
                    <h3>Localização</h3>
                    <div class="details-grid">
                        <div class="detail-item">
                            <span class="detail-label">Cidade de Destino:</span>
                            <span class="detail-value">${destCityName || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Estado de Destino:</span>
                            <span class="detail-value">${destCityState || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">CEP de Destino:</span>
                            <span class="detail-value">${destZipCode || '-'}</span>
                        </div>
                        ${delivery.destinationStreet ? `
                        <div class="detail-item">
                            <span class="detail-label">Logradouro:</span>
                            <span class="detail-value">${delivery.destinationStreet}</span>
                        </div>
                        ` : ''}
                        ${delivery.destinationNumber ? `
                        <div class="detail-item">
                            <span class="detail-label">Número:</span>
                            <span class="detail-value">${delivery.destinationNumber}</span>
                        </div>
                        ` : ''}
                        ${delivery.destinationComplement ? `
                        <div class="detail-item">
                            <span class="detail-label">Complemento:</span>
                            <span class="detail-value">${delivery.destinationComplement}</span>
                        </div>
                        ` : ''}
                        ${delivery.destinationNeighborhood ? `
                        <div class="detail-item">
                            <span class="detail-label">Bairro:</span>
                            <span class="detail-value">${delivery.destinationNeighborhood}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <div class="details-section">
                    <h3>Veículo e Equipe</h3>
                    <div class="details-grid">
                        <div class="detail-item">
                            <span class="detail-label">Caminhão:</span>
                            <span class="detail-value">${truck ? `${truck.id} - ${truck.plate}` : '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Motorista:</span>
                            <span class="detail-value">${driver ? driver.name : '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Funcionário:</span>
                            <span class="detail-value">${employee ? employee.name : '-'}</span>
                        </div>
                    </div>
                </div>

                <div class="details-section">
                    <h3>Material</h3>
                    <div class="details-grid">
                        <div class="detail-item">
                            <span class="detail-label">Tipo:</span>
                            <span class="detail-value">${this.getCargoTypeName(delivery.cargoType)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Quantidade / Peso:</span>
                            <span class="detail-value">${delivery.cargoWeight ? `${delivery.cargoWeight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${delivery.cargoUnit || ''}` : '-'}</span>
                        </div>
                        <div class="detail-item full-width">
                            <span class="detail-label">Descrição:</span>
                            <span class="detail-value">${delivery.cargoDescription || '-'}</span>
                        </div>
                    </div>
                </div>

                <div class="details-section">
                    <h3>Pagamento</h3>
                    <div class="details-grid">
                        <div class="detail-item">
                            <span class="detail-label">Valor Total:</span>
                            <span class="detail-value">R$ ${(delivery.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Desconto:</span>
                            <span class="detail-value">R$ ${(delivery.discount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Valor Final:</span>
                            <span class="detail-value"><strong>R$ ${(delivery.finalValue || delivery.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Método de Pagamento:</span>
                            <span class="detail-value">${paymentMethodNames[delivery.paymentMethod] || delivery.paymentMethod || '-'}</span>
                        </div>
                    </div>
                </div>

                ${delivery.notes ? `
                <div class="details-section">
                    <h3>Observações</h3>
                    <p class="notes-text">${delivery.notes}</p>
                </div>
                ` : ''}
        `;

        // Criar ou atualizar o modal de detalhes
        let detailsModal = document.getElementById('deliveryDetailsModal');
        if (!detailsModal) {
            detailsModal = document.createElement('div');
            detailsModal.id = 'deliveryDetailsModal';
            detailsModal.className = 'modal';
            detailsModal.innerHTML = `
                <div class="modal-content modal-large">
                    <div class="modal-header">
                        <h2>Detalhes da Entrega</h2>
                        <span class="close">&times;</span>
                    </div>
                    <div id="deliveryDetailsContent" class="delivery-details-content"></div>
                </div>
            `;
            document.body.appendChild(detailsModal);

            // Fechar modal ao clicar no X
            detailsModal.querySelector('.close').addEventListener('click', () => {
                detailsModal.style.display = 'none';
            });

            // Fechar modal ao clicar fora
            detailsModal.addEventListener('click', (e) => {
                if (e.target === detailsModal) {
                    detailsModal.style.display = 'none';
                }
            });
        }

        document.getElementById('deliveryDetailsContent').innerHTML = detailsHTML;
        detailsModal.style.display = 'block';
    }

    setupPhoneInputs() {
        // Configurar campos de telefone para formatação automática
        const phoneInputs = [
            'deliveryCustomerPhone', // Campo do modal de nova entrega
            'editDeliveryCustomerPhone' // Campo do modal de edição
        ];

        phoneInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                // Remover placeholder ao focar
                input.addEventListener('focus', () => {
                    if (input.placeholder) {
                        input.dataset.originalPlaceholder = input.placeholder;
                        input.placeholder = '';
                    }
                });

                // Restaurar placeholder se o campo estiver vazio ao perder o foco
                input.addEventListener('blur', () => {
                    if (input.value === '' && input.dataset.originalPlaceholder) {
                        input.placeholder = input.dataset.originalPlaceholder;
                    }
                });

                // Formatação automática do telefone enquanto digita
                input.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito

                    // Limitar a 11 dígitos (DDD + 9 dígitos)
                    if (value.length > 11) {
                        value = value.substring(0, 11);
                    }

                    // Aplica a máscara do telefone (00) 00000-0000
                    if (value.length <= 11) {
                        if (value.length <= 2) {
                            // Apenas DDD
                            value = value;
                        } else if (value.length <= 7) {
                            // DDD + número (fixo com 5 dígitos)
                            value = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
                        } else {
                            // DDD + número completo (celular com 9 dígitos)
                            value = value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
                        }
                        e.target.value = value;
                    }
                });

                // Permitir apenas números, parênteses, espaços e hífen
                input.addEventListener('keypress', (e) => {
                    const char = String.fromCharCode(e.which);
                    if (!/[0-9]/.test(char) && !/[()\s-]/.test(char)) {
                        e.preventDefault();
                    }
                });
            }
        });
    }
}

let deliveryManager;
document.addEventListener('DOMContentLoaded', () => {
    deliveryManager = new DeliveryManager();
});


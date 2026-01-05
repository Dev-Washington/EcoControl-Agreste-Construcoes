// Sistema de Gerenciamento de Rotas
class RouteManager {
    constructor() {
        this.currentUser = null;
        this.routes = [];
        this.trucks = [];
        this.employees = [];
        this.customers = [];
        this.destinationCounter = 0;
        this.itemCounter = 0;
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadData();
        this.setupEventListeners();
        this.setupCitySearch();
        this.setupStatusSelect();
        this.updateStatusCounts();
        this.renderRoutes();
        this.brazilianCitiesCache = null;
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
        this.routes = JSON.parse(localStorage.getItem('routes') || '[]');
        this.trucks = JSON.parse(localStorage.getItem('trucks') || '[]');
        this.employees = JSON.parse(localStorage.getItem('employees') || '[]');
        this.customers = JSON.parse(localStorage.getItem('customers') || '[]');
        this.products = JSON.parse(localStorage.getItem('products') || '[]');

        if (!Array.isArray(this.routes)) this.routes = [];
        if (!Array.isArray(this.trucks)) this.trucks = [];
        if (!Array.isArray(this.employees)) this.employees = [];
        if (!Array.isArray(this.customers)) this.customers = [];
        if (!Array.isArray(this.products)) this.products = [];
    }

    setupEventListeners() {
        document.getElementById('newRouteBtn').addEventListener('click', () => {
            this.openNewRouteModal();
        });

        document.getElementById('searchInput').addEventListener('input', () => {
            this.renderRoutes();
        });

        // Event listeners para filtros de status
        document.querySelectorAll('.status-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.currentTarget.dataset.filter);
            });
        });

        // Event listeners para filtros de data
        const dateStart = document.getElementById('routeDateStart');
        const dateEnd = document.getElementById('routeDateEnd');
        if (dateStart) {
            dateStart.addEventListener('change', () => {
                this.renderRoutes();
            });
        }
        if (dateEnd) {
            dateEnd.addEventListener('change', () => {
                this.renderRoutes();
            });
        }

        // Formatador e busca de CEP para origem
        const originZipInputs = [
            { id: 'routeOriginZipCode', cityId: 'routeOriginCity', stateId: 'routeOriginState' },
            { id: 'editRouteOriginZipCode', cityId: 'editRouteOriginCity', stateId: 'editRouteOriginState' }
        ];

        originZipInputs.forEach(({ id, cityId, stateId }) => {
            const input = document.getElementById(id);
            if (input) {
                // Formatador de CEP
                input.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length > 5) {
                        value = value.replace(/^(\d{5})(\d{3})$/, '$1-$2');
                    }
                    e.target.value = value;

                    // Buscar CEP quando completo (8 dígitos)
                    const zipCode = value.replace(/\D/g, '');
                    if (zipCode.length === 8) {
                        this.buscarCEPOrigem(zipCode, cityId, stateId);
                    }
                });

                // Buscar CEP ao perder o foco se tiver 8 dígitos
                input.addEventListener('blur', (e) => {
                    const zipCode = e.target.value.replace(/\D/g, '');
                    if (zipCode.length === 8) {
                        this.buscarCEPOrigem(zipCode, cityId, stateId);
                    }
                });
            }
        });

        document.getElementById('addDestinationBtn').addEventListener('click', () => {
            this.addDestination('destinationsContainer');
        });

        document.getElementById('addEditDestinationBtn').addEventListener('click', () => {
            this.addDestination('editDestinationsContainer');
        });

        document.getElementById('newRouteForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createRoute();
        });

        document.getElementById('editRouteForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateRoute();
        });

        document.getElementById('cancelRouteBtn').addEventListener('click', () => {
            document.getElementById('newRouteModal').style.display = 'none';
        });

        document.getElementById('cancelEditRouteBtn').addEventListener('click', () => {
            document.getElementById('editRouteModal').style.display = 'none';
        });

        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal.style.display = 'none';
            });
        });

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    openNewRouteModal() {
        this.populateTruckSelect('routeTruck');
        this.populateDriverSelect('routeDriver');
        this.populateEmployeeSelect('routeEmployee');

        // Limpar destinos
        document.getElementById('destinationsContainer').innerHTML = '';
        this.destinationCounter = 0;

        // Adicionar primeiro destino
        this.addDestination('destinationsContainer');

        // Limpar formulário
        document.getElementById('newRouteForm').reset();
        document.getElementById('routeOriginState').value = 'PE';
        document.getElementById('routeStatus').value = 'pendente';
        this.updateStatusSelectColor('routeStatus', 'pendente');

        document.getElementById('newRouteModal').style.display = 'block';
    }

    createDestinationHTML(destId, destNumber) {
        return `
            <div class="destination-card" data-destination-id="${destId}">
                <div class="destination-header">
                    <h4><i class="fas fa-map-marker-alt"></i> Destino ${destNumber}</h4>
                    <button type="button" class="btn-remove-destination" onclick="routeManager.removeDestination('${destId}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="destination-content">
                    <h5 class="destination-subtitle">Informações do Cliente</h5>
                    <div class="form-row">
                        <div class="form-group" style="grid-column: 1 / 3;">
                            <label>Buscar Cliente (ID, Nome ou CPF/CNPJ) *</label>
                            <div class="customer-search-wrapper">
                                <input type="text" class="customer-search-input" data-dest-id="${destId}" placeholder="Digite ID, nome ou CPF/CNPJ..." autocomplete="off">
                                <div class="customer-search-results" style="display: none;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>ID do Cliente *</label>
                            <input type="text" class="dest-customer-id" data-dest-id="${destId}" readonly required>
                        </div>
                        <div class="form-group">
                            <label>Nome/Razão Social</label>
                            <input type="text" class="dest-customer-name" data-dest-id="${destId}" readonly>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>CPF/CNPJ</label>
                            <input type="text" class="dest-customer-document" data-dest-id="${destId}" readonly>
                        </div>
                        <div class="form-group">
                            <label>Telefone</label>
                            <input type="tel" class="dest-customer-phone" data-dest-id="${destId}" readonly>
                        </div>
                    </div>
                    
                    <h5 class="destination-subtitle">Endereço de Destino</h5>
                    <div class="form-row">
                        <div class="form-group">
                            <label>CEP</label>
                            <input type="text" class="dest-zip-code" data-dest-id="${destId}" placeholder="00000-000" maxlength="9">
                        </div>
                        <div class="form-group">
                            <label>Cidade *</label>
                            <input type="text" class="dest-city" data-dest-id="${destId}" placeholder="Cidade" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Estado</label>
                            <select class="dest-state" data-dest-id="${destId}">
                                <option value="">Selecione</option>
                                <option value="PE">Pernambuco</option>
                                <option value="AC">Acre</option>
                                <option value="AL">Alagoas</option>
                                <option value="AP">Amapá</option>
                                <option value="AM">Amazonas</option>
                                <option value="BA">Bahia</option>
                                <option value="CE">Ceará</option>
                                <option value="DF">Distrito Federal</option>
                                <option value="ES">Espírito Santo</option>
                                <option value="GO">Goiás</option>
                                <option value="MA">Maranhão</option>
                                <option value="MT">Mato Grosso</option>
                                <option value="MS">Mato Grosso do Sul</option>
                                <option value="MG">Minas Gerais</option>
                                <option value="PA">Pará</option>
                                <option value="PB">Paraíba</option>
                                <option value="PR">Paraná</option>
                                <option value="PI">Piauí</option>
                                <option value="RJ">Rio de Janeiro</option>
                                <option value="RN">Rio Grande do Norte</option>
                                <option value="RS">Rio Grande do Sul</option>
                                <option value="RO">Rondônia</option>
                                <option value="RR">Roraima</option>
                                <option value="SC">Santa Catarina</option>
                                <option value="SP">São Paulo</option>
                                <option value="SE">Sergipe</option>
                                <option value="TO">Tocantins</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Logradouro</label>
                            <input type="text" class="dest-street" data-dest-id="${destId}" placeholder="Rua, Avenida, etc.">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Número</label>
                            <input type="text" class="dest-number" data-dest-id="${destId}" placeholder="123">
                        </div>
                        <div class="form-group">
                            <label>Complemento</label>
                            <input type="text" class="dest-complement" data-dest-id="${destId}" placeholder="Apto, Bloco, etc.">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Bairro</label>
                            <input type="text" class="dest-neighborhood" data-dest-id="${destId}" placeholder="Bairro">
                        </div>
                    </div>
                    
                    <h5 class="destination-subtitle">Itens para este Destino</h5>
                    <div class="items-container" data-dest-id="${destId}">
                        <!-- Itens serão adicionados aqui -->
                    </div>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="routeManager.addItem('${destId}')" style="margin-top: 10px;">
                        <i class="fas fa-plus"></i> Adicionar Item
                    </button>
                </div>
            </div>
        `;
    }

    addDestination(containerId) {
        const container = document.getElementById(containerId);
        const destId = `dest_${Date.now()}_${this.destinationCounter++}`;

        const destinationHTML = this.createDestinationHTML(destId, this.destinationCounter);
        container.insertAdjacentHTML('beforeend', destinationHTML);

        // Configurar busca de cliente
        const searchInput = container.querySelector(`[data-dest-id="${destId}"].customer-search-input`);
        if (searchInput) {
            this.setupCustomerSearch(searchInput, destId);
        }

        // Configurar busca de CEP
        const zipCodeInput = container.querySelector(`[data-dest-id="${destId}"].dest-zip-code`);
        if (zipCodeInput) {
            zipCodeInput.addEventListener('blur', () => {
                const zipCode = zipCodeInput.value.replace(/\D/g, '');
                if (zipCode.length === 8) {
                    this.buscarCEP(zipCode, destId);
                }
            });
        }

        // Adicionar primeiro item
        this.addItem(destId);
    }

    removeDestination(destId) {
        const card = document.querySelector(`[data-destination-id="${destId}"]`);
        if (card) {
            card.remove();
        }
    }

    createItemHTML(itemId, destId) {
        return `
            <div class="item-row" data-item-id="${itemId}" data-dest-id="${destId}">
                <div class="form-row">
                    <div class="form-group" style="flex: 2;">
                        <label>Tipo de Material (Buscar Produto) *</label>
                        <div class="customer-search-wrapper">
                            <input type="text" class="item-type" data-item-id="${itemId}" placeholder="Digite ID ou nome do produto..." autocomplete="off" required>
                            <input type="hidden" class="item-type-id" data-item-id="${itemId}">
                            <div class="item-product-search-results" data-item-id="${itemId}" style="display: none;"></div>
                        </div>
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>Quantidade / Peso</label>
                        <input type="text" class="item-weight" data-item-id="${itemId}" placeholder="0,00">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>Unidade</label>
                        <input type="text" class="item-unit" data-item-id="${itemId}" placeholder="un, kg...">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>Valor Unit. (R$)</label>
                        <input type="text" class="item-value" data-item-id="${itemId}" placeholder="0,00">
                    </div>
                    <div class="form-group" style="flex: 0 0 auto; align-self: flex-end;">
                        <button type="button" class="btn-remove-item" onclick="routeManager.removeItem('${itemId}')" title="Remover item">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group" style="grid-column: 1 / 3;">
                        <label>Descrição</label>
                        <textarea class="item-description" data-item-id="${itemId}" rows="2" placeholder="Descrição do item..."></textarea>
                    </div>
                </div>
            </div>
        `;
    }

    addItem(destId) {
        const container = document.querySelector(`[data-dest-id="${destId}"].items-container`);
        if (!container) return;

        const itemId = `item_${Date.now()}_${this.itemCounter++}`;
        const itemHTML = this.createItemHTML(itemId, destId);
        container.insertAdjacentHTML('beforeend', itemHTML);

        // Configurar busca de produtos para este item
        this.setupProductSearchForItem(itemId);

        // Configurar formatação de peso e valor
        const itemWeightInput = container.querySelector(`.item-weight[data-item-id="${itemId}"]`);
        const itemValueInput = container.querySelector(`.item-value[data-item-id="${itemId}"]`);

        if (itemWeightInput) {
            itemWeightInput.addEventListener('input', (e) => {
                this.formatWeightInput(e.target);
            });
        }

        if (itemValueInput) {
            itemValueInput.addEventListener('input', (e) => {
                this.formatCurrencyInput(e.target);
            });
        }
    }

    removeItem(itemId) {
        const item = document.querySelector(`[data-item-id="${itemId}"]`);
        if (item) {
            item.remove();
        }
    }

    setupCustomerSearch(input, destId) {
        let searchTimeout;
        const resultsContainer = input.nextElementSibling;

        // Mostrar todos os clientes ao focar no campo
        input.addEventListener('focus', (e) => {
            const query = e.target.value.trim();
            if (query.length === 0) {
                // Se o campo estiver vazio, mostrar todos os clientes
                this.searchCustomers('', resultsContainer, destId);
            } else {
                // Se já tiver texto, filtrar
                this.searchCustomers(query, resultsContainer, destId);
            }
        });

        input.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            clearTimeout(searchTimeout);

            // Sempre buscar, mesmo se vazio (mostra todos)
            searchTimeout = setTimeout(() => {
                this.searchCustomers(query, resultsContainer, destId);
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

    searchCustomers(query, resultsContainer, destId) {
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
            const cleanQuery = query.replace(/\D/g, '');
            const normalizedQuery = normalize(query);

            matches = this.customers.filter(customer => {
                // Busca por ID (pode ser parcial)
                const idMatch = customer.id.toLowerCase().includes(lowerQuery);

                // Busca por documento (pode ser parcial)
                const docMatch = customer.document && customer.document.replace(/\D/g, '').includes(cleanQuery);

                // Busca por nome - apenas clientes que COMEÇAM com a letra/palavra digitada
                const customerNameNormalized = normalize(customer.name);
                const nameMatch = customerNameNormalized.startsWith(normalizedQuery);

                return idMatch || nameMatch || docMatch;
            }).slice(0, 50); // Limitar a 50 resultados
        }

        if (matches.length === 0) {
            resultsContainer.innerHTML = '<div class="customer-search-no-results">Nenhum cliente encontrado</div>';
            resultsContainer.style.display = 'block';
            return;
        }

        resultsContainer.innerHTML = matches.map(customer => {
            return `
                <div class="customer-search-result-item" data-customer-id="${customer.id}" data-dest-id="${destId}">
                    <div class="result-name">${this.escapeHtml(customer.name)}</div>
                    <div class="result-info">
                        <span class="result-id">ID: ${customer.id}</span>
                        ${customer.document ? `<span class="result-document">${this.escapeHtml(customer.document)}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        resultsContainer.querySelectorAll('.customer-search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const customerId = item.dataset.customerId;
                this.selectCustomer(customerId, destId);
                resultsContainer.style.display = 'none';
            });
        });

        resultsContainer.style.display = 'block';
    }

    selectCustomer(customerId, destId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;

        document.querySelector(`[data-dest-id="${destId}"].dest-customer-id`).value = customer.id || '';
        document.querySelector(`[data-dest-id="${destId}"].dest-customer-name`).value = customer.name || '';
        document.querySelector(`[data-dest-id="${destId}"].dest-customer-document`).value = customer.document || '';
        document.querySelector(`[data-dest-id="${destId}"].dest-customer-phone`).value = customer.phone || customer.cellphone || '';

        const address = customer.address || {};
        if (address.zipCode) {
            document.querySelector(`[data-dest-id="${destId}"].dest-zip-code`).value = address.zipCode;
        }
        if (address.city) {
            document.querySelector(`[data-dest-id="${destId}"].dest-city`).value = address.city;
        }
        if (address.state) {
            document.querySelector(`[data-dest-id="${destId}"].dest-state`).value = address.state;
        }
        if (address.street) {
            document.querySelector(`[data-dest-id="${destId}"].dest-street`).value = address.street;
        }
        if (address.number) {
            document.querySelector(`[data-dest-id="${destId}"].dest-number`).value = address.number;
        }
        if (address.complement) {
            document.querySelector(`[data-dest-id="${destId}"].dest-complement`).value = address.complement;
        }
        if (address.neighborhood) {
            document.querySelector(`[data-dest-id="${destId}"].dest-neighborhood`).value = address.neighborhood;
        }

        document.querySelector(`[data-dest-id="${destId}"].customer-search-input`).value = '';
    }

    populateTruckSelect(selectId, selectedValue = '') {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Selecione um caminhão</option>';

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
        select.innerHTML = '<option value="">Selecione um motorista</option>';

        const drivers = this.employees.filter(emp => emp.role === 'motorista');
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

    setupCitySearch() {
        // Configurar busca de cidade para origem (novo)
        const originCityInput = document.getElementById('routeOriginCity');
        const originCityResults = document.getElementById('routeOriginCityResults');
        const originStateSelect = document.getElementById('routeOriginState');
        const originZipInput = document.getElementById('routeOriginZipCode');

        if (originCityInput && originCityResults) {
            this.setupCitySearchInput(originCityInput, originCityResults, 'routeOriginState', 'routeOriginZipCode');
        }

        // Configurar busca de cidade para origem (edição)
        const editOriginCityInput = document.getElementById('editRouteOriginCity');
        const editOriginCityResults = document.getElementById('editRouteOriginCityResults');

        if (editOriginCityInput && editOriginCityResults) {
            this.setupCitySearchInput(editOriginCityInput, editOriginCityResults, 'editRouteOriginState', 'editRouteOriginZipCode');
        }
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
            const normalize = (str) => {
                return str.toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .trim();
            };

            const normalizedQuery = normalize(query);
            const allCities = await this.loadBrazilianCitiesCache();

            const filteredCities = allCities.filter(city => {
                const normalizedCityName = normalize(city.nome);
                return normalizedCityName.startsWith(normalizedQuery);
            });

            if (filteredCities.length === 0) {
                resultsContainer.innerHTML = '<div class="city-search-no-results">Nenhuma cidade encontrada</div>';
                resultsContainer.style.display = 'block';
                return;
            }

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

            resultsContainer.querySelectorAll('.city-search-result-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const cityName = item.dataset.cityName;
                    const stateCode = item.dataset.state;

                    cityInput.value = cityName;

                    const stateSelect = document.getElementById(stateSelectId);
                    if (stateSelect) {
                        stateSelect.value = stateCode;
                    }

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

        const normalize = (str) => {
            return str.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim();
        };

        try {
            const directUrl = `https://viacep.com.br/ws/${stateCode}/${encodeURIComponent(cityName)}/json/`;

            let response = null;
            let data = null;

            try {
                response = await fetch(directUrl, {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-cache'
                });

                if (response && response.ok) {
                    data = await response.json();
                }
            } catch (error) {
                return;
            }

            if (data && !data.erro && data.length > 0) {
                const firstResult = Array.isArray(data) ? data[0] : data;
                if (firstResult.cep) {
                    zipInput.value = firstResult.cep.replace(/\D/g, '').replace(/^(\d{5})(\d{3})$/, '$1-$2');
                }
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
        }
    }

    setupStatusSelect() {
        const statusSelects = ['routeStatus', 'editRouteStatus'];

        statusSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                // Aplicar cor inicial
                this.updateStatusSelectColor(selectId, select.value);

                // Atualizar cor quando mudar
                select.addEventListener('change', (e) => {
                    this.updateStatusSelectColor(selectId, e.target.value);
                });
            }
        });
    }

    updateStatusSelectColor(selectId, status) {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Remover todas as classes de status
        select.classList.remove('status-pendente', 'status-em_percurso', 'status-em_carregamento', 'status-entregue');

        // Adicionar classe correspondente
        if (status) {
            select.classList.add(`status-${status}`);
        }
    }

    populateEmployeeSelect(selectId, selectedValue = '') {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Selecione um funcionário</option>';

        // Filtrar apenas funcionários com cargo "funcionario"
        const funcionarios = this.employees.filter(emp =>
            emp.role === 'funcionario' ||
            emp.role === 'Funcionário' ||
            emp.role === 'FUNCIONARIO' ||
            emp.position === 'funcionario' ||
            emp.position === 'Funcionário' ||
            emp.position === 'FUNCIONARIO'
        );

        funcionarios.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = employee.name;
            if (employee.id === selectedValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    async buscarCEPOrigem(zipCode, cityInputId, stateSelectId) {
        const cityInput = document.getElementById(cityInputId);
        const stateSelect = document.getElementById(stateSelectId);

        if (!cityInput || !stateSelect) {
            return;
        }

        // Remover caracteres não numéricos
        zipCode = zipCode.replace(/\D/g, '');

        if (zipCode.length !== 8) {
            return;
        }

        try {
            // Mostrar indicador de carregamento
            if (cityInput) {
                cityInput.style.borderColor = '#4a90e2';
                cityInput.placeholder = 'Buscando...';
            }

            // Desabilitar campos enquanto busca
            if (cityInput) cityInput.disabled = true;
            if (stateSelect) stateSelect.disabled = true;

            const response = await fetch(`https://viacep.com.br/ws/${zipCode}/json/`);

            if (!response.ok) {
                throw new Error('Erro ao buscar CEP');
            }

            const data = await response.json();

            if (data.erro) {
                alert('CEP não encontrado. Por favor, verifique o CEP informado.');
                if (cityInput) {
                    cityInput.placeholder = 'Digite o nome da cidade...';
                }
            } else {
                // Preencher cidade
                if (cityInput && data.localidade) {
                    cityInput.value = data.localidade;
                }

                // Preencher estado
                if (stateSelect && data.uf) {
                    stateSelect.value = data.uf;
                }
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            alert('Erro ao buscar CEP. Por favor, tente novamente.');
            if (cityInput) {
                cityInput.placeholder = 'Digite o nome da cidade...';
            }
        } finally {
            // Reabilitar campos sempre
            if (cityInput) {
                cityInput.disabled = false;
                cityInput.style.borderColor = '';
                if (!cityInput.value) {
                    cityInput.placeholder = 'Digite o nome da cidade...';
                }
            }
            if (stateSelect) stateSelect.disabled = false;
        }
    }

    async buscarCEP(cep, destId) {
        const zipCode = cep.replace(/\D/g, '');

        if (zipCode.length !== 8) {
            return;
        }

        const cityInput = document.querySelector(`[data-dest-id="${destId}"].dest-city`);
        const stateSelect = document.querySelector(`[data-dest-id="${destId}"].dest-state`);
        const streetInput = document.querySelector(`[data-dest-id="${destId}"].dest-street`);
        const neighborhoodInput = document.querySelector(`[data-dest-id="${destId}"].dest-neighborhood`);

        try {
            // Tentar buscar via ViaCEP
            const response = await fetch(`https://viacep.com.br/ws/${zipCode}/json/`);

            if (!response.ok) {
                throw new Error('Erro ao buscar CEP');
            }

            const data = await response.json();

            if (data.erro) {
                alert('CEP não encontrado.');
                return;
            }

            // Preencher campos
            if (cityInput && data.localidade) {
                cityInput.value = data.localidade;
            }

            if (stateSelect && data.uf) {
                stateSelect.value = data.uf;
            }

            if (streetInput && data.logradouro) {
                streetInput.value = data.logradouro;
            }

            if (neighborhoodInput && data.bairro) {
                neighborhoodInput.value = data.bairro;
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            // Não bloquear o usuário, apenas logar o erro
        }
    }

    setupProductSearchForItem(itemId) {
        const itemTypeInput = document.querySelector(`.item-type[data-item-id="${itemId}"]`);
        const itemResults = document.querySelector(`.item-product-search-results[data-item-id="${itemId}"]`);

        if (!itemTypeInput || !itemResults) return;

        let searchTimeout;

        // Mostrar todos os produtos ao focar no campo
        itemTypeInput.addEventListener('focus', (e) => {
            const query = e.target.value.trim();
            if (query.length === 0) {
                // Se o campo estiver vazio, mostrar todos os produtos
                this.searchProductsForItem('', itemResults, itemId);
            } else {
                // Se já tiver texto, filtrar
                this.searchProductsForItem(query, itemResults, itemId);
            }
        });

        itemTypeInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();

            clearTimeout(searchTimeout);

            // Sempre buscar, mesmo se vazio (mostra todos)
            searchTimeout = setTimeout(() => {
                this.searchProductsForItem(query, itemResults, itemId);
            }, 300);
        });

        // Fechar resultados ao clicar fora
        document.addEventListener('click', (e) => {
            if (!itemTypeInput.contains(e.target) && !itemResults.contains(e.target)) {
                itemResults.style.display = 'none';
            }
        });

        // Fechar ao pressionar Escape
        itemTypeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                itemResults.style.display = 'none';
            }
        });
    }

    searchProductsForItem(query, resultsContainer, itemId) {
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
                <div class="customer-search-result-item" data-product-id="${product.id}" data-product-name="${this.escapeHtml(product.name)}" data-item-id="${itemId}">
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
                const targetItemId = item.dataset.itemId;
                this.selectProductForItem(productId, productName, targetItemId);
                resultsContainer.style.display = 'none';
            });
        });

        resultsContainer.style.display = 'block';
    }

    selectProductForItem(productId, productName, itemId) {
        const itemTypeInput = document.querySelector(`.item-type[data-item-id="${itemId}"]`);
        const itemTypeIdInput = document.querySelector(`.item-type-id[data-item-id="${itemId}"]`);

        if (itemTypeInput) {
            itemTypeInput.value = productName;
        }
        if (itemTypeIdInput) {
            itemTypeIdInput.value = productId;
        }

        // Buscar unidade do produto se disponível
        const product = this.products.find(p => p.id === productId);
        if (product && product.unit) {
            const unitInput = document.querySelector(`.item-unit[data-item-id="${itemId}"]`);
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

    formatWeightInput(input) {
        if (!input) return;

        // Se já tem listener, não adicionar novamente
        if (input.dataset.formatted === 'true') return;
        input.dataset.formatted = 'true';

        input.addEventListener('blur', (e) => {
            let value = e.target.value.replace(/\s*[a-z³t]+\s*/gi, '').trim();
            if (value === '') {
                e.target.value = '';
                return;
            }

            // Remove pontos e substitui vírgula por ponto para parseFloat
            const numericValue = parseFloat(value.replace(/\./g, '').replace(',', '.'));
            if (!isNaN(numericValue)) {
                e.target.value = `${numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
        });
    }

    formatCurrencyInput(input) {
        if (!input) return;

        // Se já tem listener, não adicionar novamente
        if (input.dataset.formatted === 'true') return;
        input.dataset.formatted = 'true';

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
    }

    createRoute() {
        const formData = new FormData(document.getElementById('newRouteForm'));

        // Coletar destinos
        const destinations = [];
        const destinationCards = document.querySelectorAll('#destinationsContainer .destination-card');

        destinationCards.forEach(card => {
            const destId = card.dataset.destinationId;

            // Coletar itens deste destino
            const items = [];
            const itemRows = card.querySelectorAll(`[data-dest-id="${destId}"].item-row`);

            itemRows.forEach(itemRow => {
                const itemId = itemRow.dataset.itemId;
                const type = itemRow.querySelector(`[data-item-id="${itemId}"].item-type`)?.value || '';
                const typeId = itemRow.querySelector(`.item-type-id[data-item-id="${itemId}"]`)?.value || '';
                const weight = itemRow.querySelector(`[data-item-id="${itemId}"].item-weight`)?.value || '';
                const unit = itemRow.querySelector(`[data-item-id="${itemId}"].item-unit`)?.value || '';
                const value = itemRow.querySelector(`[data-item-id="${itemId}"].item-value`)?.value || '';
                const description = itemRow.querySelector(`[data-item-id="${itemId}"].item-description`)?.value || '';

                if (type) {
                    items.push({
                        type,
                        typeId: typeId || null,
                        weight: weight ? parseFloat(weight.replace(/\./g, '').replace(',', '.').replace(/\s*[a-z³t]+\s*/gi, '')) : null,
                        unit,
                        value: value ? parseFloat(value.replace(/\./g, '').replace(',', '.')) : null,
                        description
                    });
                }
            });

            if (items.length > 0) {
                destinations.push({
                    customerId: card.querySelector(`[data-dest-id="${destId}"].dest-customer-id`)?.value || '',
                    customerName: card.querySelector(`[data-dest-id="${destId}"].dest-customer-name`)?.value || '',
                    customerDocument: card.querySelector(`[data-dest-id="${destId}"].dest-customer-document`)?.value || '',
                    customerPhone: card.querySelector(`[data-dest-id="${destId}"].dest-customer-phone`)?.value || '',
                    zipCode: card.querySelector(`[data-dest-id="${destId}"].dest-zip-code`)?.value || '',
                    city: card.querySelector(`[data-dest-id="${destId}"].dest-city`)?.value || '',
                    state: card.querySelector(`[data-dest-id="${destId}"].dest-state`)?.value || '',
                    street: card.querySelector(`[data-dest-id="${destId}"].dest-street`)?.value || '',
                    number: card.querySelector(`[data-dest-id="${destId}"].dest-number`)?.value || '',
                    complement: card.querySelector(`[data-dest-id="${destId}"].dest-complement`)?.value || '',
                    neighborhood: card.querySelector(`[data-dest-id="${destId}"].dest-neighborhood`)?.value || '',
                    items
                });
            }
        });

        if (destinations.length === 0) {
            alert('Adicione pelo menos um destino com itens.');
            return;
        }

        const route = {
            id: 'ROT-' + Date.now(),
            code: 'ROT-' + Date.now(),
            truckId: formData.get('routeTruck') || null,
            driverId: formData.get('routeDriver') || null,
            employeeId: formData.get('routeEmployee') || null,
            originCity: formData.get('routeOriginCity') || '',
            originState: formData.get('routeOriginState') || '',
            originZipCode: formData.get('routeOriginZipCode') || '',
            destinations,
            scheduledDate: formData.get('routeScheduledDate') || null,
            status: formData.get('routeStatus') || 'pendente',
            createdAt: new Date().toISOString()
        };

        this.routes.push(route);
        localStorage.setItem('routes', JSON.stringify(this.routes));

        // Criar notificação se rota foi atribuída a motorista/funcionário
        if (route.driverId || route.employeeId) {
            this.createRouteAssignmentNotification(route, 'created');
        }

        document.getElementById('newRouteModal').style.display = 'none';
        document.getElementById('newRouteForm').reset();
        this.renderRoutes();

        alert('Rota salva com sucesso!');
    }

    createRouteAssignmentNotification(route, action = 'created') {
        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        const employees = JSON.parse(localStorage.getItem('employees') || '[]');
        const trucks = JSON.parse(localStorage.getItem('trucks') || '[]');

        const truck = trucks.find(t => t.id === route.truckId);
        const truckInfo = truck ? `${truck.id} - ${truck.plate || 'Sem placa'}` : 'N/A';

        // Notificar motorista se houver
        if (route.driverId) {
            const driver = employees.find(e => e.id === route.driverId || String(e.id) === String(route.driverId));
            if (driver) {
                const notification = {
                    id: 'NOTIF-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                    type: 'rota',
                    title: action === 'created' ? 'Nova Rota Atribuída' : 'Rota Atualizada',
                    message: action === 'created'
                        ? `Uma nova rota foi atribuída a você.\nCódigo: ${route.code || route.id}\nCaminhão: ${truckInfo}\nOrigem: ${route.originCity || 'N/A'} - ${route.originState || 'N/A'}\n${route.scheduledDate ? `Data Prevista: ${new Date(route.scheduledDate).toLocaleDateString('pt-BR')}` : ''}`
                        : `A rota ${route.code || route.id} foi atualizada.\nCaminhão: ${truckInfo}\nOrigem: ${route.originCity || 'N/A'} - ${route.originState || 'N/A'}`,
                    priority: 'alta',
                    read: false,
                    createdAt: new Date().toISOString(),
                    relatedId: route.id,
                    relatedType: 'route',
                    targetEmployeeId: route.driverId,
                    metadata: {
                        routeId: route.id,
                        routeCode: route.code,
                        truckId: route.truckId,
                        truckInfo: truckInfo,
                        originCity: route.originCity,
                        originState: route.originState,
                        scheduledDate: route.scheduledDate,
                        action: action
                    }
                };
                notifications.unshift(notification);
            }
        }

        // Notificar funcionário se houver (e for diferente do motorista)
        if (route.employeeId && route.employeeId !== route.driverId) {
            const employee = employees.find(e => e.id === route.employeeId || String(e.id) === String(route.employeeId));
            if (employee) {
                const notification = {
                    id: 'NOTIF-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                    type: 'rota',
                    title: action === 'created' ? 'Nova Rota Atribuída' : 'Rota Atualizada',
                    message: action === 'created'
                        ? `Uma nova rota foi atribuída a você.\nCódigo: ${route.code || route.id}\nCaminhão: ${truckInfo}\nOrigem: ${route.originCity || 'N/A'} - ${route.originState || 'N/A'}\n${route.scheduledDate ? `Data Prevista: ${new Date(route.scheduledDate).toLocaleDateString('pt-BR')}` : ''}`
                        : `A rota ${route.code || route.id} foi atualizada.\nCaminhão: ${truckInfo}\nOrigem: ${route.originCity || 'N/A'} - ${route.originState || 'N/A'}`,
                    priority: 'alta',
                    read: false,
                    createdAt: new Date().toISOString(),
                    relatedId: route.id,
                    relatedType: 'route',
                    targetEmployeeId: route.employeeId,
                    metadata: {
                        routeId: route.id,
                        routeCode: route.code,
                        truckId: route.truckId,
                        truckInfo: truckInfo,
                        originCity: route.originCity,
                        originState: route.originState,
                        scheduledDate: route.scheduledDate,
                        action: action
                    }
                };
                notifications.unshift(notification);
            }
        }

        localStorage.setItem('notifications', JSON.stringify(notifications));
    }

    updateStatusCounts() {
        // Calcular estatísticas
        const totalRoutes = this.routes.length;
        const pendenteRoutes = this.routes.filter(r => r.status === 'pendente').length;
        const emPercursoRoutes = this.routes.filter(r => r.status === 'em_percurso').length;
        const emCarregamentoRoutes = this.routes.filter(r => r.status === 'em_carregamento').length;
        const entregueRoutes = this.routes.filter(r => r.status === 'entregue').length;

        // Atualizar card de status destacado
        const statusTotalEl = document.getElementById('statusTotalCount');
        const statusPendenteEl = document.getElementById('statusPendenteCount');
        const statusEmPercursoEl = document.getElementById('statusEmPercursoCount');
        const statusEmCarregamentoEl = document.getElementById('statusEmCarregamentoCount');
        const statusEntregueEl = document.getElementById('statusEntregueCount');

        if (statusTotalEl) statusTotalEl.textContent = totalRoutes;
        if (statusPendenteEl) statusPendenteEl.textContent = pendenteRoutes;
        if (statusEmPercursoEl) statusEmPercursoEl.textContent = emPercursoRoutes;
        if (statusEmCarregamentoEl) statusEmCarregamentoEl.textContent = emCarregamentoRoutes;
        if (statusEntregueEl) statusEntregueEl.textContent = entregueRoutes;
    }

    renderRoutes() {
        const tbody = document.getElementById('routesTableBody');
        const resultsCountEl = document.getElementById('resultsCount');
        const filteredRoutes = this.getFilteredRoutes();

        // Atualizar contadores de status
        this.updateStatusCounts();

        // Atualizar contador de resultados
        if (resultsCountEl) {
            resultsCountEl.textContent = filteredRoutes.length;
        }

        if (filteredRoutes.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-state">
                        <i class="fas fa-route"></i>
                        <h3>Nenhuma rota encontrada</h3>
                        <p>Comece criando uma nova rota</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredRoutes.map((route, index) => {
            const truck = this.trucks.find(t => t.id === route.truckId);
            const driver = this.employees.find(e => e.id === route.driverId);
            const totalItems = route.destinations ? route.destinations.reduce((sum, dest) => sum + (dest.items ? dest.items.length : 0), 0) : 0;
            const destinationsCount = route.destinations ? route.destinations.length : 0;
            const scheduledDate = route.scheduledDate ? new Date(route.scheduledDate).toLocaleDateString('pt-BR') : '-';

            // Coletar nomes dos clientes
            let clientsNames = 'N/A';
            if (route.destinations && route.destinations.length > 0) {
                const names = route.destinations
                    .map(dest => dest.customerName)
                    .filter(name => name)
                    .slice(0, 3); // Mostrar até 3 clientes

                if (names.length > 0) {
                    clientsNames = names.join(', ');
                    if (route.destinations.length > 3) {
                        clientsNames += ` +${route.destinations.length - 3} mais`;
                    }
                }
            }

            return `
                <tr>
                    <td>${route.code || 'N/A'}</td>
                    <td>${clientsNames}</td>
                    <td>${truck ? `${truck.id} - ${truck.plate}` : 'N/A'}</td>
                    <td>${driver ? driver.name : 'N/A'}</td>
                    <td>${route.originCity ? `${route.originCity} - ${route.originState}` : 'N/A'}</td>
                    <td>${destinationsCount} destino(s)</td>
                    <td>${totalItems} item(ns)</td>
                    <td><span class="status-badge ${route.status || 'pendente'}">${this.getStatusDisplayName(route.status || 'pendente')}</span></td>
                    <td>${scheduledDate}</td>
                    <td>
                        <div class="action-buttons">
                            <div class="action-buttons-column">
                                <button class="action-btn edit" onclick="routeManager.editRoute(${index})" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn print" onclick="routeManager.showDestinationInvoices(${index})" title="Gerar Notas Fiscais">
                                    <i class="fas fa-print"></i>
                                </button>
                            </div>
                            <div class="action-buttons-column">
                                <button class="action-btn delete" onclick="routeManager.deleteRoute(${index})" title="Deletar">
                                    <i class="fas fa-trash"></i>
                                </button>
                                <button class="action-btn view" onclick="routeManager.viewRouteDetails(${index})" title="Ver Detalhes">
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
            'entregue': 'Entregue',
            // Compatibilidade com status antigos
            'planejada': 'Pendente',
            'em_andamento': 'Em Percurso',
            'concluida': 'Entregue',
            'cancelada': 'Cancelada'
        };
        return statusNames[status] || status;
    }

    setFilter(filter) {
        this.currentFilter = filter;

        document.querySelectorAll('.status-filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });

        this.renderRoutes();
    }

    clearDateFilters() {
        document.getElementById('routeDateStart').value = '';
        document.getElementById('routeDateEnd').value = '';
        this.renderRoutes();
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

    getFilteredRoutes() {
        let filtered = this.routes;
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();

        // Filtrar por status primeiro
        if (this.currentFilter === 'all') {
            // Quando "all" está selecionado, excluir rotas com status "entregue"
            filtered = filtered.filter(route => route.status !== 'entregue');
        } else {
            // Quando um filtro específico está selecionado, mostrar apenas esse status
            // Também verificar status antigos para compatibilidade
            filtered = filtered.filter(route => {
                const routeStatus = route.status || 'pendente';
                if (this.currentFilter === 'pendente') {
                    return routeStatus === 'pendente' || routeStatus === 'planejada';
                } else if (this.currentFilter === 'em_percurso') {
                    return routeStatus === 'em_percurso' || routeStatus === 'em_andamento';
                } else if (this.currentFilter === 'entregue') {
                    return routeStatus === 'entregue' || routeStatus === 'concluida';
                } else {
                    return routeStatus === this.currentFilter;
                }
            });
        }

        // Aplicar busca por termo
        if (searchTerm) {
            filtered = filtered.filter(route => {
                const code = (route.code || '').toLowerCase();
                const truck = this.trucks.find(t => t.id === route.truckId);
                const truckPlate = truck ? truck.plate.toLowerCase() : '';
                const driver = this.employees.find(e => e.id === route.driverId);
                const driverName = driver ? driver.name.toLowerCase() : '';

                return code.includes(searchTerm) ||
                    truckPlate.includes(searchTerm) ||
                    driverName.includes(searchTerm);
            });
        }

        // Filtrar por data
        const dateStart = document.getElementById('routeDateStart')?.value;
        const dateEnd = document.getElementById('routeDateEnd')?.value;

        if (dateStart || dateEnd) {
            filtered = filtered.filter(route => {
                const routeDate = route.scheduledDate || route.createdAt;
                if (!routeDate) return false;

                const routeDateObj = new Date(routeDate);
                routeDateObj.setHours(0, 0, 0, 0);

                if (dateStart) {
                    const startDate = new Date(dateStart);
                    startDate.setHours(0, 0, 0, 0);
                    if (routeDateObj < startDate) return false;
                }

                if (dateEnd) {
                    const endDate = new Date(dateEnd);
                    endDate.setHours(23, 59, 59, 999);
                    if (routeDateObj > endDate) return false;
                }

                return true;
            });
        }

        return filtered;
    }

    viewRouteDetails(index) {
        const route = this.routes[index];
        if (!route) return;

        const truck = this.trucks.find(t => t.id === route.truckId);
        const driver = this.employees.find(e => e.id === route.driverId);
        const employee = route.employeeId ? this.employees.find(e => e.id === route.employeeId) : null;

        let detailsHTML = `
            <div class="route-details-content">
                <div class="details-section">
                    <h3>Informações Gerais</h3>
                    <div class="details-grid">
                        <div class="detail-item">
                            <span class="detail-label">Código da Rota:</span>
                            <span class="detail-value">${route.code || '-'}</span>
                        </div>
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
                        <div class="detail-item">
                            <span class="detail-label">Origem:</span>
                            <span class="detail-value">${route.originCity || '-'} - ${route.originState || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Status:</span>
                            <span class="detail-value"><span class="status-badge ${route.status || 'pendente'}">${this.getStatusDisplayName(route.status || 'pendente')}</span></span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Data Prevista:</span>
                            <span class="detail-value">${route.scheduledDate ? new Date(route.scheduledDate).toLocaleDateString('pt-BR') : '-'}</span>
                        </div>
                    </div>
                </div>
        `;

        if (route.destinations && route.destinations.length > 0) {
            detailsHTML += '<div class="details-section"><h3>Destinos e Itens</h3>';
            route.destinations.forEach((dest, destIndex) => {
                const totalValue = dest.items ? dest.items.reduce((sum, item) => {
                    const itemValue = (item.value || 0) * (item.quantity || 1);
                    return sum + itemValue;
                }, 0) : 0;

                detailsHTML += `
                    <div class="destination-detail-card">
                        <div class="destination-detail-header">
                            <h4><i class="fas fa-map-marker-alt"></i> Destino ${destIndex + 1}: ${dest.customerName || 'N/A'}</h4>
                            <button class="btn btn-primary btn-sm" onclick="routeManager.generateDestinationInvoice(${index}, ${destIndex})">
                                <i class="fas fa-print"></i> Gerar Nota Fiscal
                            </button>
                        </div>
                        <div class="destination-detail-body">
                            <div class="detail-item">
                                <span class="detail-label">Cliente:</span>
                                <span class="detail-value">${dest.customerName || '-'} (${dest.customerDocument || '-'})</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Telefone:</span>
                                <span class="detail-value">${dest.customerPhone || '-'}</span>
                            </div>
                            <div class="detail-item full-width">
                                <span class="detail-label">Endereço:</span>
                                <span class="detail-value">${dest.street || ''} ${dest.number || ''}, ${dest.complement || ''}, ${dest.neighborhood || ''}, ${dest.city || ''} - ${dest.state || ''}, CEP: ${dest.zipCode || '-'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Total de Itens:</span>
                                <span class="detail-value">${dest.items ? dest.items.length : 0}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Valor Total:</span>
                                <span class="detail-value">R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <h5 style="margin-top: 15px; margin-bottom: 10px;">Itens:</h5>
                            <table class="items-table">
                                <thead>
                                    <tr>
                                        <th>Tipo</th>
                                        <th>Quantidade / Peso</th>
                                        <th>Unidade</th>
                                        <th>Valor Unit.</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;

                if (dest.items && dest.items.length > 0) {
                    dest.items.forEach(item => {
                        const itemTotal = (item.value || 0) * (item.weight || item.quantity || 1);
                        detailsHTML += `
                            <tr>
                                <td>${item.type || '-'}${item.description ? `<br><small style="color: #666;">${item.description}</small>` : ''}</td>
                                <td>${item.weight ? item.weight.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : (item.quantity || 1)}</td>
                                <td>${item.unit || 'un'}</td>
                                <td>${item.value ? `R$ ${item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</td>
                                <td>R$ ${itemTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        `;
                    });
                }

                detailsHTML += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            });
            detailsHTML += '</div>';
        }

        detailsHTML += '</div>';

        // Criar modal de detalhes
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'routeDetailsModal';
        modal.innerHTML = `
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h2>Detalhes da Rota: ${route.code}</h2>
                    <span class="close" onclick="document.getElementById('routeDetailsModal').remove()">&times;</span>
                </div>
                <div class="modal-body-scrollable">
                    ${detailsHTML}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('routeDetailsModal').remove()">Fechar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    showDestinationInvoices(index) {
        const route = this.routes[index];
        if (!route || !route.destinations || route.destinations.length === 0) {
            alert('Esta rota não possui destinos.');
            return;
        }

        let optionsHTML = '<div style="padding: 20px;"><h3>Selecione o destino para gerar a nota fiscal:</h3><ul style="list-style: none; padding: 0;">';

        route.destinations.forEach((dest, destIndex) => {
            optionsHTML += `
                <li style="margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 8px; cursor: pointer;" 
                    onclick="routeManager.generateDestinationInvoice(${index}, ${destIndex}); document.getElementById('invoiceSelectionModal').remove();">
                    <strong>Destino ${destIndex + 1}:</strong> ${dest.customerName || 'N/A'}<br>
                    <small>${dest.city || ''} - ${dest.state || ''}</small>
                </li>
            `;
        });

        optionsHTML += '</ul></div>';

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'invoiceSelectionModal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>Gerar Nota Fiscal</h2>
                    <span class="close" onclick="document.getElementById('invoiceSelectionModal').remove()">&times;</span>
                </div>
                ${optionsHTML}
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('invoiceSelectionModal').remove()">Cancelar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    generateDestinationInvoice(routeIndex, destinationIndex) {
        const route = this.routes[routeIndex];
        if (!route || !route.destinations || !route.destinations[destinationIndex]) return;

        const destination = route.destinations[destinationIndex];
        const truck = this.trucks.find(t => t.id === route.truckId);
        const driver = this.employees.find(e => e.id === route.driverId);
        const employee = route.employeeId ? this.employees.find(e => e.id === route.employeeId) : null;

        // Calcular totais
        const totalValue = destination.items ? destination.items.reduce((sum, item) => {
            const itemValue = (item.value || 0) * (item.quantity || 1);
            return sum + itemValue;
        }, 0) : 0;

        // Obter caminho da logo
        const currentPath = window.location.pathname;
        let logoPath;
        if (currentPath.includes('/dashboard_sistem/')) {
            const basePath = window.location.origin + currentPath.substring(0, currentPath.indexOf('/dashboard_sistem'));
            logoPath = basePath + '/logo_agreste.jpg';
        } else {
            logoPath = window.location.origin + '/logo_agreste.jpg';
        }

        let invoiceHTML = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Nota Fiscal - ${route.code} - Destino ${destinationIndex + 1}</title>
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
                    .invoice-title {
                        font-size: 14px;
                        font-weight: bold;
                        margin-top: 5px;
                    }
                    .invoice-info {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 15px;
                        margin: 15px 0;
                    }
                    .info-section {
                        background: #f5f5f5;
                        padding: 10px;
                        border-radius: 5px;
                    }
                    .info-section h3 {
                        font-size: 12px;
                        margin-bottom: 8px;
                        color: #4a90e2;
                        border-bottom: 1px solid #ddd;
                        padding-bottom: 5px;
                    }
                    .info-section p {
                        margin: 4px 0;
                        font-size: 10px;
                    }
                    .invoice-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                        font-size: 10px;
                    }
                    .invoice-table th,
                    .invoice-table td {
                        border: 1px solid #ddd;
                        padding: 6px;
                        text-align: left;
                    }
                    .invoice-table th {
                        background: #4a90e2;
                        color: white;
                        font-weight: bold;
                    }
                    .invoice-table tbody tr:nth-child(even) {
                        background: #f9f9f9;
                    }
                    .text-right {
                        text-align: right;
                    }
                    .invoice-total {
                        margin-top: 15px;
                        text-align: right;
                        font-size: 12px;
                        font-weight: bold;
                    }
                    .invoice-signatures {
                        display: grid;
                        grid-template-columns: 1fr 1fr 1fr;
                        gap: 15px;
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 2px solid #333;
                    }
                    .signature-box {
                        text-align: center;
                        padding: 10px;
                    }
                    .signature-label {
                        font-weight: bold;
                        margin-bottom: 40px;
                        font-size: 10px;
                    }
                    .signature-name {
                        border-top: 1px solid #333;
                        padding-top: 5px;
                        margin-top: 5px;
                        font-size: 10px;
                    }
                    @media print {
                        body {
                            padding: 0;
                        }
                        .no-print {
                            display: none;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="invoice-header">
                    <img src="${logoPath}" alt="Logo" class="invoice-logo" onerror="this.style.display='none'">
                    <div class="invoice-title">Agreste Construções - Control Development</div>
                    <div style="font-size: 12px; margin-top: 5px;">NOTA FISCAL DE ENTREGA</div>
                    <div style="font-size: 10px; margin-top: 3px;">Rota: ${route.code} - Destino ${destinationIndex + 1}</div>
                </div>

                <div class="invoice-info">
                    <div class="info-section">
                        <h3>CLIENTE</h3>
                        <p><strong>Nome:</strong> ${destination.customerName || '-'}</p>
                        <p><strong>CPF/CNPJ:</strong> ${destination.customerDocument || '-'}</p>
                        <p><strong>Telefone:</strong> ${destination.customerPhone || '-'}</p>
                    </div>
                    <div class="info-section">
                        <h3>DESTINO</h3>
                        <p><strong>Cidade:</strong> ${destination.city || '-'}</p>
                        <p><strong>Estado:</strong> ${destination.state || '-'}</p>
                        <p><strong>CEP:</strong> ${destination.zipCode || '-'}</p>
                        <p><strong>Endereço:</strong> ${destination.street || ''} ${destination.number || ''}, ${destination.complement || ''}</p>
                        <p><strong>Bairro:</strong> ${destination.neighborhood || '-'}</p>
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
                        <h3>ORIGEM</h3>
                        <p><strong>Cidade:</strong> ${route.originCity || '-'}</p>
                        <p><strong>Estado:</strong> ${route.originState || '-'}</p>
                        <p><strong>Data:</strong> ${route.scheduledDate ? new Date(route.scheduledDate).toLocaleDateString('pt-BR') : '-'}</p>
                    </div>
                </div>

                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>Descrição</th>
                            <th>Quantidade / Peso</th>
                            <th>Unidade</th>
                            <th>Valor Unitário</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (destination.items && destination.items.length > 0) {
            destination.items.forEach(item => {
                const itemTotal = (item.value || 0) * (item.weight || item.quantity || 1);
                invoiceHTML += `
                    <tr>
                        <td>${item.type || '-'}${item.description ? `<br><small>${item.description}</small>` : ''}</td>
                        <td>${item.weight ? item.weight.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : (item.quantity || 1)}</td>
                        <td>${item.unit || 'un'}</td>
                        <td>${item.value ? `R$ ${item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</td>
                        <td>R$ ${itemTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                `;
            });
        }

        invoiceHTML += `
                    </tbody>
                </table>

                <div class="invoice-total">
                    <p><strong>VALOR TOTAL: R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
                </div>

                <div class="invoice-signatures">
                    <div class="signature-box">
                        <div class="signature-label">MOTORISTA</div>
                        <div class="signature-name">${driver ? driver.name : '_________________'}</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-label">CLIENTE</div>
                        <div class="signature-name">${destination.customerName || '_________________'}</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-label">GESTOR</div>
                        <div class="signature-name">_________________</div>
                    </div>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 250);
    }

    editRoute(index) {
        const route = this.routes[index];
        if (!route) return;

        document.getElementById('editRouteIndex').value = index;

        this.populateTruckSelect('editRouteTruck', route.truckId);
        this.populateDriverSelect('editRouteDriver', route.driverId);
        this.populateEmployeeSelect('editRouteEmployee', route.employeeId || '');

        document.getElementById('editRouteOriginCity').value = route.originCity || '';
        document.getElementById('editRouteOriginState').value = route.originState || '';
        document.getElementById('editRouteScheduledDate').value = route.scheduledDate || '';
        const routeStatus = route.status || 'pendente';
        // Converter status antigos para novos
        let newStatus = routeStatus;
        if (routeStatus === 'planejada') newStatus = 'pendente';
        else if (routeStatus === 'em_andamento') newStatus = 'em_percurso';
        else if (routeStatus === 'concluida') newStatus = 'entregue';

        document.getElementById('editRouteStatus').value = newStatus;
        // Aplicar cor do status ao select
        this.updateStatusSelectColor('editRouteStatus', newStatus);

        // Preencher CEP de origem se existir
        const originZipCode = document.getElementById('editRouteOriginZipCode');
        if (originZipCode && route.originZipCode) {
            originZipCode.value = route.originZipCode;
        }

        // Limpar destinos existentes
        const editContainer = document.getElementById('editDestinationsContainer');
        editContainer.innerHTML = '';
        this.destinationCounter = 0;
        this.itemCounter = 0;

        // Adicionar destinos existentes
        if (route.destinations && route.destinations.length > 0) {
            route.destinations.forEach((destination, destIndex) => {
                const destId = `edit_dest_${Date.now()}_${destIndex}`;
                this.destinationCounter++;

                // Criar HTML do destino diretamente
                const destinationHTML = this.createDestinationHTML(destId, this.destinationCounter);
                editContainer.insertAdjacentHTML('beforeend', destinationHTML);

                // Configurar busca de cliente
                const searchInput = editContainer.querySelector(`[data-dest-id="${destId}"].customer-search-input`);
                if (searchInput) {
                    this.setupCustomerSearch(searchInput, destId);
                }

                // Configurar busca de CEP
                const zipCodeInput = editContainer.querySelector(`[data-dest-id="${destId}"].dest-zip-code`);
                if (zipCodeInput) {
                    zipCodeInput.addEventListener('blur', () => {
                        const zipCode = zipCodeInput.value.replace(/\D/g, '');
                        if (zipCode.length === 8) {
                            this.buscarCEP(zipCode, destId);
                        }
                    });
                }

                // Preencher dados do destino
                this.populateDestination(destId, destination);
            });
        } else {
            // Se não houver destinos, adicionar um vazio
            this.addDestination('editDestinationsContainer');
        }

        document.getElementById('editRouteModal').style.display = 'block';
    }

    populateDestination(destId, destination) {
        // Preencher dados do cliente
        const customerIdInput = document.querySelector(`[data-dest-id="${destId}"].dest-customer-id`);
        const customerNameInput = document.querySelector(`[data-dest-id="${destId}"].dest-customer-name`);
        const customerDocumentInput = document.querySelector(`[data-dest-id="${destId}"].dest-customer-document`);
        const customerPhoneInput = document.querySelector(`[data-dest-id="${destId}"].dest-customer-phone`);

        if (customerIdInput) customerIdInput.value = destination.customerId || '';
        if (customerNameInput) customerNameInput.value = destination.customerName || '';
        if (customerDocumentInput) customerDocumentInput.value = destination.customerDocument || '';
        if (customerPhoneInput) customerPhoneInput.value = destination.customerPhone || '';

        // Preencher endereço
        const zipCodeInput = document.querySelector(`[data-dest-id="${destId}"].dest-zip-code`);
        const cityInput = document.querySelector(`[data-dest-id="${destId}"].dest-city`);
        const stateSelect = document.querySelector(`[data-dest-id="${destId}"].dest-state`);
        const streetInput = document.querySelector(`[data-dest-id="${destId}"].dest-street`);
        const numberInput = document.querySelector(`[data-dest-id="${destId}"].dest-number`);
        const complementInput = document.querySelector(`[data-dest-id="${destId}"].dest-complement`);
        const neighborhoodInput = document.querySelector(`[data-dest-id="${destId}"].dest-neighborhood`);

        if (zipCodeInput) zipCodeInput.value = destination.zipCode || '';
        if (cityInput) cityInput.value = destination.city || '';
        if (stateSelect) stateSelect.value = destination.state || '';
        if (streetInput) streetInput.value = destination.street || '';
        if (numberInput) numberInput.value = destination.number || '';
        if (complementInput) complementInput.value = destination.complement || '';
        if (neighborhoodInput) neighborhoodInput.value = destination.neighborhood || '';

        // Limpar itens existentes e adicionar os itens do destino
        const itemsContainer = document.querySelector(`[data-dest-id="${destId}"].items-container`);
        if (itemsContainer) {
            itemsContainer.innerHTML = '';

            if (destination.items && destination.items.length > 0) {
                destination.items.forEach((item, itemIndex) => {
                    const itemId = `edit_item_${Date.now()}_${itemIndex}`;
                    this.itemCounter++;

                    // Criar HTML do item diretamente
                    const itemHTML = this.createItemHTML(itemId, destId);
                    itemsContainer.insertAdjacentHTML('beforeend', itemHTML);

                    // Configurar busca de produtos para este item (antes de popular)
                    this.setupProductSearchForItem(itemId);

                    // Configurar formatação de peso e valor (antes de popular)
                    const itemWeightInput = itemsContainer.querySelector(`.item-weight[data-item-id="${itemId}"]`);
                    const itemValueInput = itemsContainer.querySelector(`.item-value[data-item-id="${itemId}"]`);

                    if (itemWeightInput) {
                        itemWeightInput.addEventListener('input', (e) => {
                            this.formatWeightInput(e.target);
                        });
                    }

                    if (itemValueInput) {
                        itemValueInput.addEventListener('input', (e) => {
                            this.formatCurrencyInput(e.target);
                        });
                    }

                    // Preencher dados do item (depois de configurar listeners)
                    this.populateItem(itemId, item);
                });
            } else {
                // Se não houver itens, adicionar um vazio
                this.addItem(destId);
            }
        }
    }

    populateItem(itemId, item) {
        const typeInput = document.querySelector(`[data-item-id="${itemId}"].item-type`);
        const typeIdInput = document.querySelector(`.item-type-id[data-item-id="${itemId}"]`);
        const weightInput = document.querySelector(`[data-item-id="${itemId}"].item-weight`);
        const unitInput = document.querySelector(`[data-item-id="${itemId}"].item-unit`);
        const valueInput = document.querySelector(`[data-item-id="${itemId}"].item-value`);
        const descriptionInput = document.querySelector(`[data-item-id="${itemId}"].item-description`);

        if (typeInput) typeInput.value = item.type || '';
        if (typeIdInput && item.typeId) typeIdInput.value = item.typeId || '';

        // Busca de produtos já foi configurada antes de chamar populateItem
        if (weightInput) {
            if (item.weight) {
                weightInput.value = `${item.weight.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            } else if (item.quantity) {
                weightInput.value = item.quantity;
            } else {
                weightInput.value = '';
            }
        }
        if (unitInput) unitInput.value = item.unit || '';
        if (valueInput) {
            if (item.value) {
                valueInput.value = item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            } else {
                valueInput.value = '';
            }
        }
        if (descriptionInput) descriptionInput.value = item.description || '';
    }

    updateRoute() {
        const formData = new FormData(document.getElementById('editRouteForm'));
        const index = parseInt(document.getElementById('editRouteIndex').value);

        // Coletar destinos
        const destinations = [];
        const destinationCards = document.querySelectorAll('#editDestinationsContainer .destination-card');

        destinationCards.forEach(card => {
            const destId = card.dataset.destinationId;

            // Coletar itens deste destino
            const items = [];
            const itemRows = card.querySelectorAll(`[data-dest-id="${destId}"].item-row`);

            itemRows.forEach(itemRow => {
                const itemId = itemRow.dataset.itemId;
                const type = itemRow.querySelector(`[data-item-id="${itemId}"].item-type`)?.value || '';
                const typeId = itemRow.querySelector(`.item-type-id[data-item-id="${itemId}"]`)?.value || '';
                const weight = itemRow.querySelector(`[data-item-id="${itemId}"].item-weight`)?.value || '';
                const unit = itemRow.querySelector(`[data-item-id="${itemId}"].item-unit`)?.value || '';
                const value = itemRow.querySelector(`[data-item-id="${itemId}"].item-value`)?.value || '';
                const description = itemRow.querySelector(`[data-item-id="${itemId}"].item-description`)?.value || '';

                if (type) {
                    items.push({
                        type,
                        typeId: typeId || null,
                        weight: weight ? parseFloat(weight.replace(/\./g, '').replace(',', '.').replace(/\s*[a-z³t]+\s*/gi, '')) : null,
                        unit,
                        value: value ? parseFloat(value.replace(/\./g, '').replace(',', '.')) : null,
                        description
                    });
                }
            });

            if (items.length > 0) {
                destinations.push({
                    customerId: card.querySelector(`[data-dest-id="${destId}"].dest-customer-id`)?.value || '',
                    customerName: card.querySelector(`[data-dest-id="${destId}"].dest-customer-name`)?.value || '',
                    customerDocument: card.querySelector(`[data-dest-id="${destId}"].dest-customer-document`)?.value || '',
                    customerPhone: card.querySelector(`[data-dest-id="${destId}"].dest-customer-phone`)?.value || '',
                    zipCode: card.querySelector(`[data-dest-id="${destId}"].dest-zip-code`)?.value || '',
                    city: card.querySelector(`[data-dest-id="${destId}"].dest-city`)?.value || '',
                    state: card.querySelector(`[data-dest-id="${destId}"].dest-state`)?.value || '',
                    street: card.querySelector(`[data-dest-id="${destId}"].dest-street`)?.value || '',
                    number: card.querySelector(`[data-dest-id="${destId}"].dest-number`)?.value || '',
                    complement: card.querySelector(`[data-dest-id="${destId}"].dest-complement`)?.value || '',
                    neighborhood: card.querySelector(`[data-dest-id="${destId}"].dest-neighborhood`)?.value || '',
                    items
                });
            }
        });

        if (destinations.length === 0) {
            alert('Adicione pelo menos um destino com itens.');
            return;
        }

        const oldRoute = this.routes[index];
        const newDriverId = formData.get('editRouteDriver') || null;
        const newEmployeeId = formData.get('editRouteEmployee') || null;

        this.routes[index] = {
            ...this.routes[index],
            truckId: formData.get('editRouteTruck') || null,
            driverId: newDriverId,
            employeeId: newEmployeeId,
            originCity: formData.get('editRouteOriginCity') || '',
            originState: formData.get('editRouteOriginState') || '',
            originZipCode: formData.get('editRouteOriginZipCode') || '',
            destinations,
            scheduledDate: formData.get('editRouteScheduledDate') || null,
            status: formData.get('editRouteStatus') || 'pendente'
        };

        localStorage.setItem('routes', JSON.stringify(this.routes));

        // Criar notificação se motorista/funcionário foi atribuído ou alterado
        const driverChanged = String(oldRoute.driverId) !== String(newDriverId);
        const employeeChanged = String(oldRoute.employeeId) !== String(newEmployeeId);

        if (driverChanged || employeeChanged) {
            this.createRouteAssignmentNotification(this.routes[index], 'updated');
        }

        document.getElementById('editRouteModal').style.display = 'none';
        this.renderRoutes();

        alert('Rota atualizada com sucesso!');
    }

    deleteRoute(index) {
        const self = this;
        window.showGlobalConfirmModal(
            'Excluir Rota',
            'Tem certeza que deseja deletar esta rota?<br><br><span style="color: var(--accent-red);"><i class="fas fa-exclamation-circle"></i> Esta ação não pode ser desfeita.</span>',
            () => {
                self.executeDeleteRoute(index);
            }
        );
        return;
    }

    executeDeleteRoute(index) {
        this.routes.splice(index, 1);
        localStorage.setItem('routes', JSON.stringify(this.routes));
        this.renderRoutes();

        window.showGlobalInfoModal('Sucesso', 'Rota deletada com sucesso!');
    }
}

let routeManager;
document.addEventListener('DOMContentLoaded', () => {
    routeManager = new RouteManager();
});

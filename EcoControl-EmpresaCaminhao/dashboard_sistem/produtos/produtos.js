// Sistema de Gerenciamento de Produtos
class ProductManager {
    constructor() {
        this.currentUser = null;
        this.products = [];
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadData();
        this.setupEventListeners();
        this.renderProducts();
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
        this.products = JSON.parse(localStorage.getItem('products') || '[]');

        if (!Array.isArray(this.products)) {
            this.products = [];
        }
    }

    generateProductId() {
        if (this.products.length === 0) {
            return '01';
        }

        // Encontrar o maior ID numérico
        const maxId = this.products.reduce((max, product) => {
            const idNum = parseInt(product.id) || 0;
            return idNum > max ? idNum : max;
        }, 0);

        // Gerar próximo ID com zero à esquerda
        const nextId = maxId + 1;
        return nextId.toString().padStart(2, '0');
    }

    setupEventListeners() {
        document.getElementById('newProductBtn').addEventListener('click', () => {
            this.openNewProductModal();
        });

        document.getElementById('searchInput').addEventListener('input', () => {
            this.renderProducts();
        });

        document.getElementById('newProductForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createProduct();
        });

        document.getElementById('editProductForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProduct();
        });

        document.getElementById('cancelProductBtn').addEventListener('click', () => {
            document.getElementById('newProductModal').style.display = 'none';
        });

        document.getElementById('cancelEditProductBtn').addEventListener('click', () => {
            document.getElementById('editProductModal').style.display = 'none';
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

    openNewProductModal() {
        document.getElementById('newProductForm').reset();
        document.getElementById('newProductModal').style.display = 'block';
        document.getElementById('productName').focus();
    }

    createProduct() {
        const formData = new FormData(document.getElementById('newProductForm'));
        const productName = formData.get('productName').trim();
        const productWeight = parseFloat(formData.get('productWeight'));
        const productUnit = formData.get('productUnit');

        if (!productName || isNaN(productWeight) || !productUnit) {
            alert('Por favor, preencha todos os campos obrigatórios corretamente.');
            return;
        }

        // Verificar se já existe produto com mesmo nome
        const existingProduct = this.products.find(p =>
            p.name.toLowerCase() === productName.toLowerCase()
        );

        if (existingProduct) {
            alert('Já existe um produto com este nome.');
            return;
        }
        const product = {
            id: this.generateProductId(),
            name: productName,
            weight: productWeight,
            unit: productUnit,
            createdAt: new Date().toISOString()
        };

        this.products.push(product);
        localStorage.setItem('products', JSON.stringify(this.products));

        document.getElementById('newProductModal').style.display = 'none';
        document.getElementById('newProductForm').reset();
        this.renderProducts();

        alert('Produto cadastrado com sucesso!');
    }

    getFilteredProducts() {
        let filtered = this.products;
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();

        if (searchTerm) {
            filtered = filtered.filter(product => {
                const idMatch = product.id.toLowerCase().includes(searchTerm);
                const nameMatch = product.name.toLowerCase().includes(searchTerm);
                return idMatch || nameMatch;
            });
        }

        // Ordenar por ID
        return filtered.sort((a, b) => {
            const idA = parseInt(a.id) || 0;
            const idB = parseInt(b.id) || 0;
            return idA - idB;
        });
    }

    renderProducts() {
        const tbody = document.getElementById('productsTableBody');
        const filteredProducts = this.getFilteredProducts();

        if (filteredProducts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <i class="fas fa-boxes"></i>
                        <h3>Nenhum produto encontrado</h3>
                        <p>Comece cadastrando um novo produto</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredProducts.map((product, index) => {
            const realIndex = this.products.findIndex(p => p.id === product.id);
            const createdDate = product.createdAt ? new Date(product.createdAt).toLocaleDateString('pt-BR') : '-';

            return `
                <tr>
                    <td><strong>${product.id}</strong></td>
                    <td>${this.escapeHtml(product.name)}</td>
                    <td>${product.weight ? product.weight.toFixed(2).replace('.', ',') : '0,00'} kg</td>
                    <td>${this.escapeHtml(product.unit || 'kg').toUpperCase()}</td>
                    <td>${createdDate}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn edit" onclick="productManager.editProduct(${realIndex})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" onclick="productManager.deleteProduct(${realIndex})" title="Deletar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    editProduct(index) {
        const product = this.products[index];
        if (!product) return;

        document.getElementById('editProductIndex').value = index;
        document.getElementById('editProductId').value = product.id;
        document.getElementById('editProductName').value = product.name;
        document.getElementById('editProductWeight').value = product.weight || '';
        document.getElementById('editProductUnit').value = product.unit || 'kg';

        document.getElementById('editProductModal').style.display = 'block';
    }

    updateProduct() {
        const formData = new FormData(document.getElementById('editProductForm'));
        const index = parseInt(document.getElementById('editProductIndex').value);
        const productName = formData.get('editProductName').trim();
        const productWeight = parseFloat(formData.get('editProductWeight'));
        const productUnit = formData.get('editProductUnit');

        if (!productName || isNaN(productWeight) || !productUnit) {
            alert('Por favor, preencha todos os campos obrigatórios corretamente.');
            return;
        }

        // Verificar se já existe produto com mesmo nome (exceto o atual)
        const existingProduct = this.products.find((p, i) =>
            i !== index && p.name.toLowerCase() === productName.toLowerCase()
        );

        if (existingProduct) {
            alert('Já existe um produto com este nome.');
            return;
        }

        this.products[index] = {
            ...this.products[index],
            name: productName,
            weight: productWeight,
            unit: productUnit
        };

        localStorage.setItem('products', JSON.stringify(this.products));

        document.getElementById('editProductModal').style.display = 'none';
        this.renderProducts();

        alert('Produto atualizado com sucesso!');
    }

    deleteProduct(index) {
        const self = this;
        window.showGlobalConfirmModal(
            'Excluir Produto',
            'Tem certeza que deseja deletar este produto?<br><br><span style="color: var(--accent-red);"><i class="fas fa-exclamation-circle"></i> Esta ação não pode ser desfeita.</span>',
            () => {
                self.executeDeleteProduct(index);
            }
        );
        return;
    }

    executeDeleteProduct(index) {
        this.products.splice(index, 1);
        localStorage.setItem('products', JSON.stringify(this.products));
        this.renderProducts();

        window.showGlobalInfoModal('Sucesso', 'Produto deletado com sucesso!');
    }
}

let productManager;
document.addEventListener('DOMContentLoaded', () => {
    productManager = new ProductManager();
});


// Sistema de Configurações
class SettingsManager {
    constructor() {
        this.currentUser = null;
        this.settings = {};
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadSettings();
        this.setupEventListeners();
        this.renderSettings();
    }

    checkAuth() {
        const user = sessionStorage.getItem('currentUser');
        if (!user) {
            window.location.href = '../login.html';
            return;
        }
        
        this.currentUser = JSON.parse(user);
    }

    loadSettings() {
        // Carregar configurações do localStorage
        const savedSettings = localStorage.getItem('systemSettings');
        if (savedSettings) {
            this.settings = JSON.parse(savedSettings);
        } else {
            // Configurações padrão
            this.settings = {
                company: {
                    name: 'Agreste Construção',
                    cnpj: '',
                    address: '',
                    phone: '',
                    email: ''
                },
                notifications: {
                    email: true,
                    delivery: true,
                    maintenance: true,
                    system: true
                },
                security: {
                    passwordMinLength: 8,
                    requireUppercase: true,
                    requireNumbers: true,
                    sessionTimeout: 30
                },
                backup: {
                    autoBackup: false,
                    backupFrequency: 'daily',
                    lastBackup: null
                }
            };
        }
    }

    setupEventListeners() {
        // Salvar configurações da empresa
        const saveCompanyBtn = document.getElementById('saveCompanySettings');
        if (saveCompanyBtn) {
            saveCompanyBtn.addEventListener('click', () => this.saveCompanySettings());
        }

        // Salvar configurações de notificações
        const saveNotificationsBtn = document.getElementById('saveNotificationsSettings');
        if (saveNotificationsBtn) {
            saveNotificationsBtn.addEventListener('click', () => this.saveNotificationsSettings());
        }

        // Salvar configurações de segurança
        const saveSecurityBtn = document.getElementById('saveSecuritySettings');
        if (saveSecurityBtn) {
            saveSecurityBtn.addEventListener('click', () => this.saveSecuritySettings());
        }

        // Botões de backup com formatos
        document.querySelectorAll('[data-backup-format]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.currentTarget.dataset.backupFormat;
                this.exportBackup(format);
            });
        });

        // Restaurar backup do arquivo
        const restoreFileInput = document.getElementById('restoreFileInput');
        if (restoreFileInput) {
            restoreFileInput.addEventListener('change', (e) => {
                this.handleRestoreFile(e.target.files[0]);
            });
        }

        // Restaurar do último backup
        const restoreBtn = document.getElementById('restoreBackupBtn');
        if (restoreBtn) {
            restoreBtn.addEventListener('click', () => this.restoreBackup());
        }
    }

    renderSettings() {
        // Renderizar configurações da empresa
        if (this.settings.company) {
            const companyName = document.getElementById('companyName');
            const companyCnpj = document.getElementById('companyCnpj');
            const companyAddress = document.getElementById('companyAddress');
            const companyPhone = document.getElementById('companyPhone');
            const companyEmail = document.getElementById('companyEmail');

            if (companyName) companyName.value = this.settings.company.name || '';
            if (companyCnpj) companyCnpj.value = this.settings.company.cnpj || '';
            if (companyAddress) companyAddress.value = this.settings.company.address || '';
            if (companyPhone) companyPhone.value = this.settings.company.phone || '';
            if (companyEmail) companyEmail.value = this.settings.company.email || '';
        }

        // Renderizar notificações
        if (this.settings.notifications) {
            const notifEmail = document.getElementById('notifEmail');
            const notifDelivery = document.getElementById('notifDelivery');
            const notifMaintenance = document.getElementById('notifMaintenance');
            const notifSystem = document.getElementById('notifSystem');

            if (notifEmail) notifEmail.checked = this.settings.notifications.email !== false;
            if (notifDelivery) notifDelivery.checked = this.settings.notifications.delivery !== false;
            if (notifMaintenance) notifMaintenance.checked = this.settings.notifications.maintenance !== false;
            if (notifSystem) notifSystem.checked = this.settings.notifications.system !== false;
        }

        // Renderizar segurança
        if (this.settings.security) {
            const passwordLength = document.getElementById('passwordLength');
            const requireUppercase = document.getElementById('requireUppercase');
            const requireNumbers = document.getElementById('requireNumbers');
            const sessionTimeout = document.getElementById('sessionTimeout');

            if (passwordLength) passwordLength.value = this.settings.security.passwordMinLength || 8;
            if (requireUppercase) requireUppercase.checked = this.settings.security.requireUppercase !== false;
            if (requireNumbers) requireNumbers.checked = this.settings.security.requireNumbers !== false;
            if (sessionTimeout) sessionTimeout.value = this.settings.security.sessionTimeout || 30;
        }

        // Renderizar informações de backup
        this.updateBackupInfo();
    }

    saveCompanySettings() {
        this.settings.company = {
            name: document.getElementById('companyName').value,
            cnpj: document.getElementById('companyCnpj').value,
            address: document.getElementById('companyAddress').value,
            phone: document.getElementById('companyPhone').value,
            email: document.getElementById('companyEmail').value
        };

        this.saveSettings();
        this.showMessage('Configurações da empresa salvas com sucesso!', 'success');
    }

    saveNotificationsSettings() {
        this.settings.notifications = {
            email: document.getElementById('notifEmail').checked,
            delivery: document.getElementById('notifDelivery').checked,
            maintenance: document.getElementById('notifMaintenance').checked,
            system: document.getElementById('notifSystem').checked
        };

        this.saveSettings();
        this.showMessage('Configurações de notificações salvas com sucesso!', 'success');
    }

    saveSecuritySettings() {
        this.settings.security = {
            passwordMinLength: parseInt(document.getElementById('passwordLength').value) || 8,
            requireUppercase: document.getElementById('requireUppercase').checked,
            requireNumbers: document.getElementById('requireNumbers').checked,
            sessionTimeout: parseInt(document.getElementById('sessionTimeout').value) || 30
        };

        this.saveSettings();
        this.showMessage('Configurações de segurança salvas com sucesso!', 'success');
    }

    saveSettings() {
        localStorage.setItem('systemSettings', JSON.stringify(this.settings));
        this.logAction('Configurações atualizadas');
    }

    getBackupData() {
        return {
            timestamp: new Date().toISOString(),
            version: '1.0',
            system: 'Agreste Construção - Gestão de Frotas',
            data: {
                deliveries: JSON.parse(localStorage.getItem('deliveries') || '[]'),
                employees: JSON.parse(localStorage.getItem('employees') || '[]'),
                trucks: JSON.parse(localStorage.getItem('trucks') || '[]'),
                customers: JSON.parse(localStorage.getItem('customers') || '[]'),
                users: JSON.parse(localStorage.getItem('users') || '[]'),
                settings: this.settings,
                logs: JSON.parse(localStorage.getItem('systemLogs') || '[]')
            }
        };
    }

    exportBackup(format) {
        const backupData = this.getBackupData();

        // Salvar backup no localStorage para restauração
        const backups = JSON.parse(localStorage.getItem('backups') || '[]');
        backups.push(backupData);
        
        if (backups.length > 10) {
            backups.shift();
        }
        
        localStorage.setItem('backups', JSON.stringify(backups));
        localStorage.setItem('lastBackup', backupData.timestamp);
        this.settings.backup.lastBackup = backupData.timestamp;
        this.saveSettings();
        this.updateBackupInfo();

        switch(format) {
            case 'print':
                this.exportBackupPrint(backupData);
                break;
            case 'pdf':
                this.exportBackupPDF(backupData);
                break;
            case 'json':
                this.exportBackupJSON(backupData);
                break;
            case 'backend':
                this.exportBackupBackend(backupData);
                break;
        }

        this.logAction(`Backup exportado em formato ${format.toUpperCase()}`);
        this.showMessage(`Backup exportado com sucesso em formato ${format.toUpperCase()}!`, 'success');
    }

    exportBackupPrint(backupData) {
        const printContent = this.generateBackupHTML(backupData);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 250);
    }

    exportBackupPDF(backupData) {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            let y = 20;
            const margin = 20;
            const pageWidth = doc.internal.pageSize.getWidth();
            const maxWidth = pageWidth - (margin * 2);

            // Título
            doc.setFontSize(18);
            doc.setTextColor(74, 144, 226);
            doc.text('Backup Completo do Sistema', margin, y);
            y += 10;

            // Informações do backup
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Data: ${new Date(backupData.timestamp).toLocaleString('pt-BR')}`, margin, y);
            y += 7;
            doc.text(`Sistema: ${backupData.system}`, margin, y);
            y += 7;
            doc.text(`Versão: ${backupData.version}`, margin, y);
            y += 15;

            // Resumo
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text('Resumo dos Dados', margin, y);
            y += 10;

            doc.setFontSize(10);
            const summary = {
                'Entregas': backupData.data.deliveries.length,
                'Funcionários': backupData.data.employees.length,
                'Caminhões': backupData.data.trucks.length,
                'Clientes': backupData.data.customers.length,
                'Usuários': backupData.data.users.length,
                'Logs': backupData.data.logs.length
            };

            Object.entries(summary).forEach(([key, value]) => {
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }
                doc.text(`${key}: ${value}`, margin + 5, y);
                y += 7;
            });

            // Detalhes por seção
            y += 10;
            const sections = [
                { title: 'Entregas', data: backupData.data.deliveries, limit: 5 },
                { title: 'Funcionários', data: backupData.data.employees, limit: 5 },
                { title: 'Caminhões', data: backupData.data.trucks, limit: 5 },
                { title: 'Clientes', data: backupData.data.customers, limit: 5 }
            ];

            sections.forEach(section => {
                if (y > 250) {
                    doc.addPage();
                    y = 20;
                }

                doc.setFontSize(12);
                doc.text(section.title, margin, y);
                y += 8;

                doc.setFontSize(9);
                section.data.slice(0, section.limit).forEach((item, index) => {
                    if (y > 270) {
                        doc.addPage();
                        y = 20;
                    }
                    const summary = this.getItemSummary(item);
                    const lines = doc.splitTextToSize(summary, maxWidth - 10);
                    doc.text(lines, margin + 5, y);
                    y += lines.length * 5 + 2;
                });

                if (section.data.length > section.limit) {
                    doc.text(`... e mais ${section.data.length - section.limit} itens`, margin + 5, y);
                    y += 7;
                }
                y += 5;
            });

            doc.save(`backup_sistema_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            alert('Erro ao gerar PDF. Certifique-se de que a biblioteca jsPDF está carregada.');
        }
    }

    exportBackupJSON(backupData) {
        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup_sistema_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    exportBackupBackend(backupData) {
        // Formato otimizado para importação em backend
        const backendFormat = {
            metadata: {
                exportDate: backupData.timestamp,
                system: backupData.system,
                version: backupData.version,
                recordCounts: {
                    deliveries: backupData.data.deliveries.length,
                    employees: backupData.data.employees.length,
                    trucks: backupData.data.trucks.length,
                    customers: backupData.data.customers.length,
                    users: backupData.data.users.length
                }
            },
            collections: {
                deliveries: backupData.data.deliveries,
                employees: backupData.data.employees,
                trucks: backupData.data.trucks,
                customers: backupData.data.customers,
                users: backupData.data.users
            },
            configuration: backupData.data.settings,
            logs: backupData.data.logs
        };

        const jsonString = JSON.stringify(backendFormat, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup_backend_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    generateBackupHTML(backupData) {
        const date = new Date(backupData.timestamp).toLocaleString('pt-BR');
        const summary = {
            'Entregas': backupData.data.deliveries.length,
            'Funcionários': backupData.data.employees.length,
            'Caminhões': backupData.data.trucks.length,
            'Clientes': backupData.data.customers.length,
            'Usuários': backupData.data.users.length,
            'Logs': backupData.data.logs.length
        };

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Backup do Sistema</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #4A90E2; }
                    .summary { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
                    .summary-item { margin: 10px 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #4A90E2; color: white; }
                    .section { margin: 30px 0; }
                </style>
            </head>
            <body>
                <h1>Backup Completo do Sistema</h1>
                <p><strong>Data:</strong> ${date}</p>
                <p><strong>Sistema:</strong> ${backupData.system}</p>
                <p><strong>Versão:</strong> ${backupData.version}</p>
                
                <div class="summary">
                    <h2>Resumo dos Dados</h2>
                    ${Object.entries(summary).map(([key, value]) => 
                        `<div class="summary-item"><strong>${key}:</strong> ${value}</div>`
                    ).join('')}
                </div>

                ${this.generateSectionHTML('Entregas', backupData.data.deliveries)}
                ${this.generateSectionHTML('Funcionários', backupData.data.employees)}
                ${this.generateSectionHTML('Caminhões', backupData.data.trucks)}
                ${this.generateSectionHTML('Clientes', backupData.data.customers)}
            </body>
            </html>
        `;
    }

    generateSectionHTML(title, data) {
        if (data.length === 0) return '';

        const headers = Object.keys(data[0] || {});
        return `
            <div class="section">
                <h2>${title} (${data.length})</h2>
                <table>
                    <thead>
                        <tr>
                            ${headers.map(h => `<th>${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${data.slice(0, 50).map(item => `
                            <tr>
                                ${headers.map(h => `<td>${this.formatCellValue(item[h])}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${data.length > 50 ? `<p>... e mais ${data.length - 50} itens</p>` : ''}
            </div>
        `;
    }

    formatCellValue(value) {
        if (value === null || value === undefined) return 'N/A';
        if (typeof value === 'object') return JSON.stringify(value);
        return value.toString();
    }

    getItemSummary(item) {
        if (!item) return 'N/A';
        const keys = Object.keys(item).slice(0, 3);
        return keys.map(k => `${k}: ${item[k] || 'N/A'}`).join(', ');
    }

    handleRestoreFile(file) {
        if (!file) return;

        const fileInfo = document.getElementById('restoreFileInfo');
        fileInfo.textContent = `Arquivo selecionado: ${file.name}`;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const backupData = JSON.parse(e.target.result);
                this.restoreFromData(backupData);
            } catch (error) {
                console.error('Erro ao ler arquivo:', error);
                this.showMessage('Erro ao ler arquivo. Verifique se é um arquivo JSON válido.', 'error');
                fileInfo.textContent = '';
            }
        };
        reader.readAsText(file);
    }

    restoreFromData(backupData) {
        if (!confirm('Tem certeza que deseja restaurar este backup? Todos os dados atuais serão substituídos.')) {
            return;
        }

        try {
            // Verificar formato do backup
            let dataToRestore;
            if (backupData.collections) {
                // Formato backend
                dataToRestore = {
                    deliveries: backupData.collections.deliveries || [],
                    employees: backupData.collections.employees || [],
                    trucks: backupData.collections.trucks || [],
                    customers: backupData.collections.customers || [],
                    users: backupData.collections.users || [],
                    settings: backupData.configuration || this.settings,
                    logs: backupData.logs || []
                };
            } else if (backupData.data) {
                // Formato padrão
                dataToRestore = backupData.data;
            } else {
                throw new Error('Formato de backup inválido');
            }

            localStorage.setItem('deliveries', JSON.stringify(dataToRestore.deliveries));
            localStorage.setItem('employees', JSON.stringify(dataToRestore.employees));
            localStorage.setItem('trucks', JSON.stringify(dataToRestore.trucks));
            localStorage.setItem('customers', JSON.stringify(dataToRestore.customers));
            localStorage.setItem('users', JSON.stringify(dataToRestore.users || []));
            localStorage.setItem('systemSettings', JSON.stringify(dataToRestore.settings));
            localStorage.setItem('systemLogs', JSON.stringify(dataToRestore.logs || []));

            this.settings = dataToRestore.settings;
            this.logAction('Backup restaurado de arquivo');
            this.showMessage('Backup restaurado com sucesso! A página será recarregada.', 'success');
            
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            console.error('Erro ao restaurar backup:', error);
            this.showMessage('Erro ao restaurar backup. Verifique o formato do arquivo.', 'error');
        }
    }

    restoreBackup() {
        const backups = JSON.parse(localStorage.getItem('backups') || '[]');
        if (backups.length === 0) {
            this.showMessage('Nenhum backup disponível para restaurar.', 'error');
            return;
        }

        if (!confirm('Tem certeza que deseja restaurar o último backup? Todos os dados atuais serão substituídos.')) {
            return;
        }

        try {
            const lastBackup = backups[backups.length - 1];
            
            localStorage.setItem('deliveries', JSON.stringify(lastBackup.data.deliveries));
            localStorage.setItem('employees', JSON.stringify(lastBackup.data.employees));
            localStorage.setItem('trucks', JSON.stringify(lastBackup.data.trucks));
            localStorage.setItem('customers', JSON.stringify(lastBackup.data.customers));
            localStorage.setItem('systemSettings', JSON.stringify(lastBackup.data.settings));

            this.settings = lastBackup.data.settings;
            this.logAction('Backup restaurado');
            this.showMessage('Backup restaurado com sucesso! A página será recarregada.', 'success');
            
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            console.error('Erro ao restaurar backup:', error);
            this.showMessage('Erro ao restaurar backup. Tente novamente.', 'error');
        }
    }

    updateBackupInfo() {
        const lastBackupEl = document.getElementById('lastBackupInfo');
        if (lastBackupEl) {
            const lastBackup = localStorage.getItem('lastBackup');
            if (lastBackup) {
                const date = new Date(lastBackup);
                lastBackupEl.textContent = `Último backup: ${date.toLocaleString('pt-BR')}`;
            } else {
                lastBackupEl.textContent = 'Nenhum backup criado ainda';
            }
        }
    }

    logAction(action) {
        const logs = JSON.parse(localStorage.getItem('systemLogs') || '[]');
        logs.push({
            timestamp: new Date().toISOString(),
            user: this.currentUser.name || this.currentUser.email,
            action: action,
            type: 'settings'
        });

        // Manter apenas os últimos 1000 logs
        if (logs.length > 1000) {
            logs.shift();
        }

        localStorage.setItem('systemLogs', JSON.stringify(logs));
    }

    showMessage(message, type) {
        // Criar elemento de mensagem
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#7ED321' : '#D0021B'};
            color: white;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;

        document.body.appendChild(messageEl);

        setTimeout(() => {
            messageEl.remove();
        }, 3000);
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new SettingsManager();
});


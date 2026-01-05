// Formatação automática de CPF/CNPJ para todo o sistema

/**
 * Remove todos os caracteres não numéricos
 */
function cleanDocument(value) {
    return value.replace(/\D/g, '');
}

/**
 * Formata CPF: 000.000.000-00
 */
function formatCPF(value) {
    const cleaned = cleanDocument(value);
    if (cleaned.length <= 3) {
        return cleaned;
    } else if (cleaned.length <= 6) {
        return cleaned.slice(0, 3) + '.' + cleaned.slice(3);
    } else if (cleaned.length <= 9) {
        return cleaned.slice(0, 3) + '.' + cleaned.slice(3, 6) + '.' + cleaned.slice(6);
    } else {
        return cleaned.slice(0, 3) + '.' + cleaned.slice(3, 6) + '.' + cleaned.slice(6, 9) + '-' + cleaned.slice(9, 11);
    }
}

/**
 * Formata CNPJ: 00.000.000/0000-00
 */
function formatCNPJ(value) {
    const cleaned = cleanDocument(value);
    if (cleaned.length <= 2) {
        return cleaned;
    } else if (cleaned.length <= 5) {
        return cleaned.slice(0, 2) + '.' + cleaned.slice(2);
    } else if (cleaned.length <= 8) {
        return cleaned.slice(0, 2) + '.' + cleaned.slice(2, 5) + '.' + cleaned.slice(5);
    } else if (cleaned.length <= 12) {
        return cleaned.slice(0, 2) + '.' + cleaned.slice(2, 5) + '.' + cleaned.slice(5, 8) + '/' + cleaned.slice(8);
    } else {
        return cleaned.slice(0, 2) + '.' + cleaned.slice(2, 5) + '.' + cleaned.slice(5, 8) + '/' + cleaned.slice(8, 12) + '-' + cleaned.slice(12, 14);
    }
}

/**
 * Formata CPF ou CNPJ automaticamente baseado no número de dígitos
 * CPF: até 11 dígitos -> 000.000.000-00
 * CNPJ: mais de 11 dígitos -> 00.000.000/0000-00
 */
function formatCPForCNPJ(value) {
    const cleaned = cleanDocument(value);
    
    // Se tiver 11 dígitos ou menos, formata como CPF
    if (cleaned.length <= 11) {
        return formatCPF(value);
    } else {
        // Se tiver mais de 11 dígitos, formata como CNPJ
        return formatCNPJ(value);
    }
}

/**
 * Aplica formatação automática em um campo de input
 */
function setupCPFCNPJInput(inputElement) {
    if (!inputElement) return;
    
    // Limitar apenas números
    inputElement.addEventListener('keypress', function(e) {
        const char = String.fromCharCode(e.which);
        if (!/[0-9]/.test(char)) {
            e.preventDefault();
        }
    });
    
    // Formatação enquanto digita
    inputElement.addEventListener('input', function(e) {
        const cursorPosition = e.target.selectionStart;
        const oldValue = e.target.value;
        const oldLength = oldValue.length;
        
        // Formatar o valor
        const formatted = formatCPForCNPJ(e.target.value);
        e.target.value = formatted;
        
        // Ajustar posição do cursor
        const newLength = formatted.length;
        const lengthDiff = newLength - oldLength;
        const newCursorPosition = cursorPosition + lengthDiff;
        
        // Manter cursor na posição correta
        e.target.setSelectionRange(newCursorPosition, newCursorPosition);
    });
    
    // Limpar ao colar e formatar
    inputElement.addEventListener('paste', function(e) {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        const numbers = cleanDocument(paste);
        if (numbers) {
            e.target.value = '';
            e.target.value = formatCPForCNPJ(numbers);
        }
    });
}

/**
 * Inicializa formatação em todos os campos de CPF/CNPJ da página
 */
function initCPFCNPJFormatters() {
    // Seletores comuns para campos de CPF/CNPJ
    const selectors = [
        'input[id*="cpf" i]',
        'input[id*="cnpj" i]',
        'input[id*="document" i]',
        'input[name*="cpf" i]',
        'input[name*="cnpj" i]',
        'input[name*="document" i]',
        'input[placeholder*="CPF" i]',
        'input[placeholder*="CNPJ" i]',
        'input[placeholder*="000.000.000-00" i]',
        'input[placeholder*="00.000.000/0000-00" i]',
        '.dest-customer-document',
        'input.customer-document',
        'input.employee-cpf'
    ];
    
    selectors.forEach(selector => {
        const inputs = document.querySelectorAll(selector);
        inputs.forEach(input => {
            // Verificar se o campo realmente é de CPF/CNPJ
            const label = input.closest('.form-group')?.querySelector('label')?.textContent || '';
            const placeholder = input.placeholder || '';
            const id = input.id || '';
            const name = input.name || '';
            
            const isCPFCNPJField = 
                /cpf|cnpj|document/i.test(label) ||
                /cpf|cnpj|document/i.test(placeholder) ||
                /cpf|cnpj|document/i.test(id) ||
                /cpf|cnpj|document/i.test(name) ||
                selector.includes('document') ||
                selector.includes('cpf');
            
            if (isCPFCNPJField && !input.hasAttribute('data-cpf-cnpj-formatted')) {
                setupCPFCNPJInput(input);
                input.setAttribute('data-cpf-cnpj-formatted', 'true');
            }
        });
    });
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    initCPFCNPJFormatters();
    
    // Re-inicializar após um pequeno delay para garantir que todos os elementos estejam carregados
    setTimeout(initCPFCNPJFormatters, 500);
});

// Exportar funções para uso global
window.formatCPF = formatCPF;
window.formatCNPJ = formatCNPJ;
window.formatCPForCNPJ = formatCPForCNPJ;
window.setupCPFCNPJInput = setupCPFCNPJInput;
window.initCPFCNPJFormatters = initCPFCNPJFormatters;




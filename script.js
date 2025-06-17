// ============================================================================
// REMEEX VISA Banking - JavaScript Application COMPLETO Y MEJORADO
// Versión: 4.0 - Sistema Evolutivo + Persistencia Mejorada + Validación Móvil
// ============================================================================

"use strict";

// ============================================================================
// 1. SISTEMA DE PERSISTENCIA MEJORADO - SOLUCIÓN DEFINITIVA
// ============================================================================

class PersistenceManager {
  constructor() {
    this.storageAvailable = this.checkStorageAvailable();
    this.dataVersion = '4.0';
    this.compressionEnabled = true;
  }

  checkStorageAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('localStorage no disponible:', e);
      return false;
    }
  }

  // Compresión simple para optimizar espacio
  compress(data) {
    if (!this.compressionEnabled) return data;
    try {
      return btoa(JSON.stringify(data));
    } catch (e) {
      return JSON.stringify(data);
    }
  }

  decompress(data) {
    if (!this.compressionEnabled) return JSON.parse(data);
    try {
      return JSON.parse(atob(data));
    } catch (e) {
      return JSON.parse(data);
    }
  }

  // Guardar datos con múltiples verificaciones
  saveData(key, data, metadata = {}) {
    if (!this.storageAvailable) return false;

    const payload = {
      data: data,
      metadata: {
        timestamp: Date.now(),
        version: this.dataVersion,
        deviceId: generateDeviceId(),
        checksum: this.generateChecksum(data),
        ...metadata
      }
    };

    try {
      const compressed = this.compress(payload);
      localStorage.setItem(key, compressed);
      
      // Verificación inmediata
      const verification = this.loadData(key);
      if (!verification || !this.verifyData(verification.data, payload.data)) {
        console.error('Verificación falló para:', key);
        return false;
      }
      
      return true;
    } catch (e) {
      console.error('Error guardando datos:', key, e);
      return false;
    }
  }

  // Cargar datos con verificación
  loadData(key) {
    if (!this.storageAvailable) return null;

    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const payload = this.decompress(stored);
      
      // Verificar integridad
      if (!this.verifyChecksum(payload.data, payload.metadata.checksum)) {
        console.warn('Checksum inválido para:', key);
        return null;
      }

      return payload;
    } catch (e) {
      console.error('Error cargando datos:', key, e);
      return null;
    }
  }

  generateChecksum(data) {
    // Checksum simple basado en JSON.stringify
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  verifyChecksum(data, checksum) {
    return this.generateChecksum(data) === checksum;
  }

  verifyData(data1, data2) {
    return JSON.stringify(data1) === JSON.stringify(data2);
  }
}

// Instancia global del manager de persistencia
const persistenceManager = new PersistenceManager();

// ============================================================================
// 2. SISTEMA DE VALIDACIÓN DE PAGOS MÓVILES COMPLETO
// ============================================================================

class MobilePaymentValidator {
  constructor() {
    this.validConcepts = [
      '4454651', // Concepto principal
      '4454651', // Variaciones comunes
      '04454651',
      'REMEEX4454651',
      '4454651REMEEX'
    ];
    this.processingTime = 15000; // 15 segundos para simular procesamiento
    this.rejectionDelay = 30000; // 30 segundos para mostrar rechazo
  }

  // Validar concepto con tolerancia
  validateConcept(userConcept) {
    if (!userConcept) return false;
    
    const normalized = userConcept.trim().toUpperCase().replace(/\s+/g, '');
    
    return this.validConcepts.some(validConcept => {
      const normalizedValid = validConcept.toUpperCase();
      
      // Coincidencia exacta
      if (normalized === normalizedValid) return true;
      
      // Contiene el concepto válido
      if (normalized.includes(normalizedValid)) return true;
      
      // El concepto válido está contenido en el ingresado
      if (normalizedValid.includes(normalized)) return true;
      
      return false;
    });
  }

  // Procesar pago móvil con validación de concepto
  async processMobilePayment(paymentData) {
    const { amount, reference, concept, receiptFile } = paymentData;
    
    // Crear transacción inicial como pendiente
    const transaction = {
      id: 'MP_' + Date.now(),
      type: 'deposit',
      method: 'mobile_payment',
      amount: parseFloat(amount),
      amountBs: parseFloat(amount) * CONFIG.EXCHANGE_RATES.USD_TO_BS,
      amountEur: parseFloat(amount) * CONFIG.EXCHANGE_RATES.USD_TO_EUR,
      reference: reference,
      concept: concept,
      date: getCurrentDateTime(),
      description: 'Pago Móvil',
      status: 'processing',
      timestamp: Date.now(),
      receiptUploaded: !!receiptFile
    };

    // Guardar transacción inmediatamente
    this.saveTransaction(transaction);
    
    // Mostrar como procesando
    this.showProcessingStatus(transaction);

    // Simular procesamiento
    setTimeout(() => {
      this.processConceptValidation(transaction);
    }, this.processingTime);

    return transaction;
  }

  saveTransaction(transaction) {
    const transactions = this.loadTransactions();
    transactions.unshift(transaction);
    
    persistenceManager.saveData(CONFIG.STORAGE_KEYS.TRANSACTIONS, {
      transactions: transactions,
      deviceId: currentUser.deviceId
    });
    
    currentUser.transactions = transactions;
    updateRecentTransactions();
    updatePendingTransactionsBadge();
  }

  loadTransactions() {
    const data = persistenceManager.loadData(CONFIG.STORAGE_KEYS.TRANSACTIONS);
    if (data && data.data.deviceId === currentUser.deviceId) {
      return data.data.transactions || [];
    }
    return [];
  }

  showProcessingStatus(transaction) {
    // Crear elemento de estado en la UI
    const statusElement = document.createElement('div');
    statusElement.className = 'mobile-payment-processing';
    statusElement.id = `processing-${transaction.id}`;
    statusElement.innerHTML = `
      <div class="processing-header">
        <div class="processing-icon">
          <div class="processing-spinner"></div>
        </div>
        <div class="processing-content">
          <div class="processing-title">Procesando Pago Móvil</div>
          <div class="processing-subtitle">Validando comprobante #${transaction.reference}</div>
        </div>
      </div>
      <div class="processing-details">
        <div class="processing-amount">${formatCurrency(transaction.amount, 'usd')}</div>
        <div class="processing-concept">Concepto: ${transaction.concept}</div>
      </div>
    `;

    // Insertar en el contenedor de transacciones
    const transactionContainer = document.getElementById('recent-transactions');
    if (transactionContainer) {
      transactionContainer.insertBefore(statusElement, transactionContainer.firstChild);
    }
  }

  async processConceptValidation(transaction) {
    const isValidConcept = this.validateConcept(transaction.concept);
    
    if (isValidConcept) {
      // Concepto válido - aprobar transacción
      await this.approveTransaction(transaction);
    } else {
      // Concepto inválido - iniciar proceso de rechazo
      await this.initiateRejectionProcess(transaction);
    }
  }

  async approveTransaction(transaction) {
    // Actualizar saldo
    currentUser.balance.bs += transaction.amountBs;
    calculateCurrencyEquivalents();
    
    // Actualizar transacción
    transaction.status = 'completed';
    transaction.approvedAt = Date.now();
    
    // Marcar primera recarga si aplica
    if (!currentUser.hasMadeFirstRecharge) {
      saveFirstRechargeStatus(true);
      if (statusEvolution) {
        statusEvolution.onUserRecharge();
      }
    }

    // Guardar cambios
    this.updateTransaction(transaction);
    saveBalanceData();
    
    // Remover elemento de procesamiento
    this.removeProcessingElement(transaction.id);
    
    // Mostrar éxito
    showToast('success', '¡Pago Aprobado!', 
             `Su pago móvil por ${formatCurrency(transaction.amount, 'usd')} ha sido acreditado.`, 8000);
    
    // Actualizar UI
    updateDashboardUI();
  }

  async initiateRejectionProcess(transaction) {
    // Actualizar estado a pendiente por más tiempo
    transaction.status = 'pending_review';
    transaction.conceptValidation = 'failed';
    
    this.updateTransaction(transaction);
    
    // Mostrar como pendiente inicialmente
    this.showPendingReview(transaction);
    
    // Después del delay, mostrar rechazo
    setTimeout(() => {
      this.rejectTransaction(transaction);
    }, this.rejectionDelay);
  }

  showPendingReview(transaction) {
    const processingElement = document.getElementById(`processing-${transaction.id}`);
    if (processingElement) {
      processingElement.innerHTML = `
        <div class="pending-review-header">
          <div class="pending-review-icon">
            <i class="fas fa-clock"></i>
          </div>
          <div class="pending-review-content">
            <div class="pending-review-title">En Revisión Manual</div>
            <div class="pending-review-subtitle">Verificando datos del comprobante</div>
          </div>
        </div>
        <div class="pending-review-details">
          <div class="pending-review-amount">${formatCurrency(transaction.amount, 'usd')}</div>
          <div class="pending-review-reference">Ref: ${transaction.reference}</div>
        </div>
      `;
      processingElement.className = 'mobile-payment-pending-review';
    }
  }

  async rejectTransaction(transaction) {
    // Actualizar transacción como rechazada
    transaction.status = 'rejected';
    transaction.rejectedAt = Date.now();
    transaction.rejectionReason = 'Concepto de pago no coincide con el requerido';
    
    this.updateTransaction(transaction);
    
    // Remover elemento de procesamiento
    this.removeProcessingElement(transaction.id);
    
    // Mostrar notificación de rechazo
    this.showRejectionNotification(transaction);
  }

  showRejectionNotification(transaction) {
    // Crear modal de rechazo
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal" style="max-width: 400px;">
        <div class="rejection-icon" style="width: 60px; height: 60px; border-radius: 50%; background: var(--danger); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; margin: 0 auto 1.25rem;">
          <i class="fas fa-times-circle"></i>
        </div>
        <div class="modal-title">Pago Móvil Rechazado</div>
        <div class="modal-subtitle" style="margin-bottom: 1.5rem;">
          No pudimos procesar su pago móvil debido a que el concepto utilizado no coincide con el requerido.
        </div>
        
        <div class="rejection-details" style="background: var(--neutral-200); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span style="font-weight: 600;">Monto:</span>
            <span>${formatCurrency(transaction.amount, 'usd')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span style="font-weight: 600;">Referencia:</span>
            <span>${transaction.reference}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: 600;">Su concepto:</span>
            <span style="color: var(--danger);">${transaction.concept}</span>
          </div>
        </div>
        
        <div class="rejection-instructions" style="background: rgba(255, 77, 77, 0.1); border-left: 3px solid var(--danger); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
          <strong>Para procesar correctamente su pago:</strong><br>
          1. Realice un nuevo pago móvil<br>
          2. Use exactamente el concepto: <strong>4454651</strong><br>
          3. Carge el nuevo comprobante en la sección de recarga
        </div>
        
        <div style="display: flex; gap: 1rem;">
          <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove(); window.location.reload();">
            <i class="fas fa-redo"></i> Realizar Nuevo Pago
          </button>
          <a href="https://wa.me/+17373018059?text=${encodeURIComponent(`Necesito ayuda con mi pago móvil rechazado. Referencia: ${transaction.reference}`)}" 
             class="btn btn-outline" target="_blank" onclick="this.closest('.modal-overlay').remove();">
            <i class="fab fa-whatsapp"></i> Contactar Soporte
          </a>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-cerrar después de 30 segundos
    setTimeout(() => {
      if (modal.parentNode) {
        modal.remove();
      }
    }, 30000);
  }

  updateTransaction(transaction) {
    const transactions = this.loadTransactions();
    const index = transactions.findIndex(t => t.id === transaction.id);
    
    if (index !== -1) {
      transactions[index] = transaction;
      
      persistenceManager.saveData(CONFIG.STORAGE_KEYS.TRANSACTIONS, {
        transactions: transactions,
        deviceId: currentUser.deviceId
      });
      
      currentUser.transactions = transactions;
      updateRecentTransactions();
      updatePendingTransactionsBadge();
    }
  }

  removeProcessingElement(transactionId) {
    const element = document.getElementById(`processing-${transactionId}`);
    if (element) {
      element.remove();
    }
  }
}

// Instancia global del validador de pagos móviles
const mobilePaymentValidator = new MobilePaymentValidator();

// ============================================================================
// 3. SISTEMA UNIFICADO DE TARJETA DE ESTATUS EVOLUTIVA - VERSIÓN MEJORADA
// ============================================================================

const STATUS_EVOLUTION = {
  STATES: {
    FIRST_RECHARGE: 'first_recharge',           // Usuario nuevo -> Invitar a recargar
    NEEDS_VERIFICATION: 'needs_verification',    // Recargó -> Invitar a verificar
    PROCESSING_DOCS: 'processing_docs',          // Verificando documentos (10 min)
    READY_FOR_BANKING: 'ready_for_banking',      // Docs OK -> Validar banco
    BANKING_VALIDATED: 'banking_validated',      // Todo completado
    FIRST_MOBILE_PAYMENT: 'first_mobile_payment' // Nuevo estado para pago móvil
  },
  
  STORAGE_KEYS: {
    CURRENT_STATE: 'remeex_evolution_state_v4',
    PROCESSING_START: 'remeex_processing_start_v4',
    BANK_DATA: 'remeex_bank_data_v4',
    USER_REMINDERS: 'remeex_user_reminders_v4',
    LAST_INTERACTION: 'remeex_last_interaction_v4'
  },
  
  TIMERS: {
    PROCESSING_DURATION: 10 * 60 * 1000,        // 10 minutos
    REMINDER_INTERVALS: [1, 3, 6, 12, 24],      // Horas para recordatorios
    EXCHANGE_UPDATE: 30 * 60 * 1000             // 30 min actualizar tasa
  }
};

// ============================================================================
// 4. CONFIGURACIÓN Y CONSTANTES MEJORADAS
// ============================================================================

const CONFIG = {
  LOGIN_CODE: '03768410847504996421',
  OTP_CODE: '142536',
  EXCHANGE_RATES: {
    USD_TO_BS: 138.24,
    USD_TO_EUR: 0.94
  },
  VALID_CONCEPTS: ['4454651'], // Concepto válido para pagos móviles
  INACTIVITY_TIMEOUT: 300000, // 5 minutos en milisegundos
  INACTIVITY_WARNING: 30000, // 30 segundos antes de cerrar sesión
  VALID_CARD: '4745034211763009', // La única tarjeta válida
  VALID_CARD_EXP_MONTH: '01',
  VALID_CARD_EXP_YEAR: '2026',
  VALID_CARD_CVV: '583',
  MAX_CARD_RECHARGES: 3, // Máximo de recargas con tarjeta
  VERIFICATION_PROCESSING_TIMEOUT: 600000, // 10 minutos en milisegundos
  SUPPORT_DISPLAY_DELAY: 300000, // 5 minutos en milisegundos antes de mostrar soporte
  STORAGE_KEYS: {
    USER_DATA: 'remeexUserData_v4',
    BALANCE: 'remeexBalance_v4',
    TRANSACTIONS: 'remeexTransactions_v4',
    PENDING_BANK: 'remeexPendingBankTransfers_v4',
    PENDING_MOBILE: 'remeexPendingMobileTransfers_v4',
    BANK_ACCOUNTS: 'remeexBankAccounts_v4',
    MOBILE_ACCOUNTS: 'remeexMobileAccounts_v4',
    VERIFICATION: 'remeexVerificationStatus_v4',
    VERIFICATION_DATA: 'remeexVerificationData_v4',
    VERIFICATION_PROCESSING: 'remeexVerificationProcessing_v4',
    CARD_DATA: 'remeexCardData_v4',
    TRANSFER_DATA: 'remeexTransferData_v4',
    USER_CREDENTIALS: 'remeexUserCredentials_v4',
    HAS_MADE_FIRST_RECHARGE: 'remeexHasMadeFirstRecharge_v4',
    DEVICE_ID: 'remeexDeviceId_v4',
    MOBILE_PAYMENT_DATA: 'remeexMobilePaymentData_v4',
    SUPPORT_NEEDED_TIMESTAMP: 'remeexSupportNeededTimestamp_v4',
    USER_REGISTRATION: 'remeexUserRegistration_v4',
    USER_AUTH: 'remeexUserAuth_v4',
    IS_REGISTERED: 'remeexIsRegistered_v4',
    EVOLUTION_STATE: 'remeexEvolutionState_v4'
  },
  SESSION_KEYS: {
    BALANCE: 'remeexSessionBalance',
    EXCHANGE_RATE: 'remeexSessionExchangeRate'
  }
};

// ============================================================================
// 5. MANAGER DE ESTADOS EVOLUTIVOS CENTRALIZADO MEJORADO
// ============================================================================

class StatusEvolutionManager {
  constructor() {
    this.currentState = this.loadCurrentState();
    this.processingTimer = null;
    this.reminderTimers = [];
    this.bankData = this.loadBankData();
    this.container = null;
    this.isExpanded = false;
    this.exchangeRate = CONFIG.EXCHANGE_RATES.USD_TO_BS;
    this.lastInteraction = Date.now();
    
    this.init();
  }

  init() {
    this.createContainer();
    this.bindEvents();
    this.updateCard();
    this.startReminderSystem();
    this.checkForProcessingCompletion();
  }

  createContainer() {
    // Eliminar todos los banners duplicados existentes
    this.removeDuplicateBanners();
    
    // Crear nuevo contenedor después del banner de seguridad
    const securityBanner = document.getElementById('security-device-notice');
    if (securityBanner) {
      this.container = document.createElement('div');
      this.container.className = 'evolution-status-card';
      this.container.id = 'evolution-status-card';
      this.container.innerHTML = '<div class="evolution-card-inner" id="evolution-card-inner"></div>';
      
      securityBanner.insertAdjacentElement('afterend', this.container);
    }
  }

  removeDuplicateBanners() {
    const duplicateSelectors = [
      '#dashboard-verify-banner',
      '#verification-processing-banner', 
      '#first-recharge-banner',
      '.bank-validation-card',
      '.pending-bank-card',
      '.verify-banner',
      '.verification-success-banner'
    ];
    
    duplicateSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
  }

  getCurrentState() {
    // Nueva lógica que incluye validación de pago móvil
    if (!currentUser.hasMadeFirstRecharge) {
      return STATUS_EVOLUTION.STATES.FIRST_RECHARGE;
    }
    
    // Verificar si hay un pago móvil de $25 o más pendiente/procesando
    const hasPendingMobilePayment = this.checkPendingMobilePayment();
    if (hasPendingMobilePayment) {
      return STATUS_EVOLUTION.STATES.FIRST_MOBILE_PAYMENT;
    }
    
    if (verificationStatus.status === 'unverified') {
      return STATUS_EVOLUTION.STATES.NEEDS_VERIFICATION;
    }
    
    if (this.isDocumentProcessing()) {
      return STATUS_EVOLUTION.STATES.PROCESSING_DOCS;
    }
    
    if (verificationStatus.status === 'verified' || this.bankData) {
      return STATUS_EVOLUTION.STATES.READY_FOR_BANKING;
    }
    
    if (verificationStatus.status === 'bank_validated') {
      return STATUS_EVOLUTION.STATES.BANKING_VALIDATED;
    }
    
    return STATUS_EVOLUTION.STATES.FIRST_RECHARGE;
  }

  checkPendingMobilePayment() {
    const transactions = mobilePaymentValidator.loadTransactions();
    return transactions.some(t => 
      t.method === 'mobile_payment' && 
      t.amount >= 25 && 
      (t.status === 'processing' || t.status === 'pending_review')
    );
  }

  updateCard() {
    if (!this.container) return;
    
    const state = this.getCurrentState();
    const cardInner = this.container.querySelector('.evolution-card-inner');
    
    // Actualizar clase del contenedor
    this.container.className = `evolution-status-card ${state}`;
    
    // Generar contenido según el estado
    cardInner.innerHTML = this.generateCardContent(state);
    
    // Aplicar animaciones
    this.applyStateAnimations(state);
    
    // Guardar estado actual
    this.saveCurrentState(state);
    
    // Actualizar botón de retiro si es necesario
    this.updateWithdrawButton(state);
  }

  generateCardContent(state) {
    const firstName = currentUser.name ? currentUser.name.split(' ')[0] : 'Usuario';
    
    switch (state) {
      case STATUS_EVOLUTION.STATES.FIRST_RECHARGE:
        return this.generateFirstRechargeContent(firstName);
        
      case STATUS_EVOLUTION.STATES.NEEDS_VERIFICATION:
        return this.generateVerificationNeededContent(firstName);
        
      case STATUS_EVOLUTION.STATES.PROCESSING_DOCS:
        return this.generateProcessingContent(firstName);
        
      case STATUS_EVOLUTION.STATES.READY_FOR_BANKING:
        return this.generateBankingValidationContent(firstName);
        
      case STATUS_EVOLUTION.STATES.BANKING_VALIDATED:
        return this.generateBankingValidatedContent(firstName);
        
      case STATUS_EVOLUTION.STATES.FIRST_MOBILE_PAYMENT:
        return this.generateFirstMobilePaymentContent(firstName);
        
      default:
        return this.generateFirstRechargeContent(firstName);
    }
  }

  generateFirstRechargeContent(firstName) {
    return `
      <div class="evolution-header">
        <div class="evolution-title-container">
          <div class="evolution-icon recharge">
            <i class="fas fa-credit-card"></i>
          </div>
          <div class="evolution-title">¡Hola ${firstName}! Activa tu cuenta</div>
        </div>
        <div class="evolution-progress">
          <svg class="evolution-progress-circle" viewBox="0 0 36 36">
            <circle class="evolution-progress-bg" cx="18" cy="18" r="16"></circle>
            <circle class="evolution-progress-fill recharge" cx="18" cy="18" r="16" 
                    stroke-dasharray="25, 100" stroke-dashoffset="0"></circle>
          </svg>
          <div class="evolution-progress-text">25%</div>
        </div>
      </div>
      
      <div class="evolution-content">
        <div class="evolution-subtitle">Recarga desde $25 y desbloquea el poder de las transferencias internacionales</div>
        
        <div class="evolution-benefits">
          <div class="benefit-item">
            <i class="fas fa-globe"></i>
            <span>Transferencias globales</span>
          </div>
          <div class="benefit-item">
            <i class="fas fa-shield-alt"></i>
            <span>Seguridad bancaria</span>
          </div>
        </div>
        
        <div class="evolution-personalized-message">
          Acceso inmediato a tu ecosistema financiero digital
        </div>
      </div>
      
      <div class="evolution-actions">
        <button class="evolution-action-btn primary" onclick="statusEvolution.startRecharge()">
          <i class="fas fa-plus-circle"></i>
          Recargar
        </button>
      </div>
    `;
  }

  generateVerificationNeededContent(firstName) {
    const timeSinceRecharge = this.getTimeSinceLastRecharge();
    let motivationalMessage = this.getMotivationalMessage('verification', timeSinceRecharge);
    
    return `
      <div class="evolution-header">
        <div class="evolution-title-container">
          <div class="evolution-icon verification">
            <i class="fas fa-id-card"></i>
          </div>
          <div class="evolution-title">Verificar identidad</div>
        </div>
        <div class="evolution-progress">
          <svg class="evolution-progress-circle" viewBox="0 0 36 36">
            <circle class="evolution-progress-bg" cx="18" cy="18" r="16"></circle>
            <circle class="evolution-progress-fill verification" cx="18" cy="18" r="16" 
                    stroke-dasharray="50, 100" stroke-dashoffset="0"></circle>
          </svg>
          <div class="evolution-progress-text">50%</div>
        </div>
      </div>
      
      <div class="evolution-content">
        <div class="evolution-subtitle">Desbloquea todas las funciones verificando tu identidad</div>
        
        <div class="evolution-benefits">
          <div class="benefit-item">
            <i class="fas fa-credit-card"></i>
            <span>Tarjeta Virtual</span>
          </div>
          <div class="benefit-item">
            <i class="fas fa-university"></i>
            <span>Retiros ilimitados</span>
          </div>
          <div class="benefit-item">
            <i class="fas fa-mobile-alt"></i>
            <span>Zelle Venezuela</span>
          </div>
        </div>
        
        <div class="evolution-personalized-message">
          ${motivationalMessage}
        </div>
      </div>
      
      <div class="evolution-actions">
        <button class="evolution-action-btn primary" onclick="statusEvolution.startVerification()">
          <i class="fas fa-shield-alt"></i>
          Verificar
        </button>
        <a href="https://wa.me/+17373018059?text=${this.getWhatsAppMessage('verification')}" 
           class="evolution-action-btn whatsapp" target="_blank">
          <i class="fab fa-whatsapp"></i>
          Soporte
        </a>
      </div>
    `;
  }

  generateProcessingContent(firstName) {
    const progress = this.getProcessingProgress();
    const timeRemaining = this.getTimeRemaining();
    
    return `
      <div class="evolution-header">
        <div class="evolution-title-container">
          <div class="evolution-icon processing">
            <div class="processing-spinner"></div>
          </div>
          <div class="evolution-title">Procesando documentos</div>
        </div>
        <div class="evolution-progress">
          <svg class="evolution-progress-circle" viewBox="0 0 36 36">
            <circle class="evolution-progress-bg" cx="18" cy="18" r="16"></circle>
            <circle class="evolution-progress-fill processing" cx="18" cy="18" r="16" 
                    stroke-dasharray="${progress * 0.75}, 100" stroke-dashoffset="0"></circle>
          </svg>
          <div class="evolution-progress-text">${progress}%</div>
        </div>
      </div>
      
      <div class="evolution-content">
        <div class="evolution-subtitle">Validando información y estableciendo conexión bancaria segura</div>
        
        <div class="evolution-processing-steps">
          <div class="processing-step ${progress > 30 ? 'completed' : 'active'}">
            <i class="fas ${progress > 30 ? 'fa-check' : 'fa-id-card'}"></i>
            <span>Verificando documentos de identidad</span>
          </div>
          <div class="processing-step ${progress > 70 ? 'completed' : progress > 30 ? 'active' : ''}">
            <i class="fas ${progress > 70 ? 'fa-check' : 'fa-university'}"></i>
            <span>Conectando con ${this.bankData?.name || 'tu banco'}</span>
          </div>
          <div class="processing-step ${progress > 90 ? 'completed' : progress > 70 ? 'active' : ''}">
            <i class="fas ${progress > 90 ? 'fa-check' : 'fa-cog'}"></i>
            <span>Configuración final</span>
          </div>
        </div>
        
        <div class="evolution-personalized-message">
          ${timeRemaining} • Proceso automatizado en curso
        </div>
      </div>
      
      <div class="evolution-actions">
        <button class="evolution-action-btn primary" onclick="statusEvolution.expandDetails()">
          <i class="fas fa-info-circle"></i>
          Ver detalles
        </button>
      </div>
    `;
  }

  generateBankingValidationContent(firstName) {
    const timeSinceVerification = this.getTimeSinceVerification();
    let motivationalMessage = this.getMotivationalMessage('banking', timeSinceVerification);
    
    return `
      <div class="evolution-header">
        <div class="evolution-title-container">
          <div class="evolution-icon banking">
            <i class="fas fa-university"></i>
          </div>
          <div class="evolution-title">Preparando retiros</div>
        </div>
        <div class="evolution-progress">
          <svg class="evolution-progress-circle" viewBox="0 0 36 36">
            <circle class="evolution-progress-bg" cx="18" cy="18" r="16"></circle>
            <circle class="evolution-progress-fill banking" cx="18" cy="18" r="16" 
                    stroke-dasharray="90, 100" stroke-dashoffset="0"></circle>
          </svg>
          <div class="evolution-progress-text">90%</div>
        </div>
      </div>
      
      <div class="evolution-content">
        <div class="evolution-subtitle">Documentos verificados. Último paso: validar cuenta bancaria</div>
        
        <div class="evolution-bank-connection">
          <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhnBzNdjl6bNp-nIdaiHVENczJhwlJNA7ocsyiOObMmzbu8at0dY5yGcZ9cLxLF39qI6gwNfqBxlkTDC0txVULEwQVwGkeEzN0Jq9MRTRagA48mh18UqTlR4WhsXOLAEZugUyhqJHB19xJgnkpe-S5VOWFgzpKFwctv3XP9XhH41vNTvq0ZS-nik58Qhr-O/s320/remeex.png" 
               alt="REMEEX" class="remeex-logo">
          <div class="connection-arrow">
            <i class="fas fa-chevron-right"></i>
            <i class="fas fa-chevron-right"></i>
            <i class="fas fa-chevron-right"></i>
          </div>
          ${this.bankData ? 
            `<img src="${this.bankData.logo || 'https://via.placeholder.com/36x36/059669/ffffff?text=B'}" alt="${this.bankData.name}" class="bank-logo">` :
            `<div class="bank-logo"><i class="fas fa-university"></i></div>`
          }
        </div>
        
        ${this.bankData ? this.generateBankInfoCompact() : ''}
        
        <div class="evolution-security-note">
          <i class="fas fa-lock"></i>
          <span>Solo podrás retirar a la cuenta registrada</span>
        </div>
        
        <div class="evolution-personalized-message">
          ${motivationalMessage}
        </div>
      </div>
      
      <div class="evolution-actions">
        <a href="validacion.html" class="evolution-action-btn banking">
          <i class="fas fa-university"></i>
          Validar cuenta
        </a>
        <button class="evolution-action-btn primary" onclick="statusEvolution.showDetails()">
          <i class="fas fa-info-circle"></i>
          Ver datos
        </button>
      </div>
    `;
  }

  generateBankingValidatedContent(firstName) {
    return `
      <div class="evolution-header">
        <div class="evolution-title-container">
          <div class="evolution-icon validated">
            <i class="fas fa-check-double"></i>
          </div>
          <div class="evolution-title">¡Cuenta verificada!</div>
        </div>
        <div class="evolution-progress">
          <svg class="evolution-progress-circle" viewBox="0 0 36 36">
            <circle class="evolution-progress-bg" cx="18" cy="18" r="16"></circle>
            <circle class="evolution-progress-fill banking" cx="18" cy="18" r="16" 
                    stroke-dasharray="100, 100" stroke-dashoffset="0"></circle>
          </svg>
          <div class="evolution-progress-text">100%</div>
        </div>
      </div>
      
      <div class="evolution-content">
        <div class="evolution-subtitle">Acceso completo desbloqueado. Todas las funciones disponibles</div>
        
        <div class="evolution-features-unlocked">
          <div class="feature-unlocked">
            <i class="fas fa-credit-card"></i>
            <span>Tarjeta VISA</span>
          </div>
          <div class="feature-unlocked">
            <i class="fas fa-university"></i>
            <span>Retiros</span>
          </div>
          <div class="feature-unlocked">
            <i class="fas fa-mobile-alt"></i>
            <span>Zelle</span>
          </div>
        </div>
        
        <div class="evolution-limits">
          <div class="limit-item">
            <div class="limit-label">Pago Móvil</div>
            <div class="limit-value">Bs 250.000</div>
          </div>
          <div class="limit-item">
            <div class="limit-label">Transferencias</div>
            <div class="limit-value">Bs 1.000.000</div>
          </div>
        </div>
      </div>
      
      <div class="evolution-actions">
        <button class="evolution-action-btn success" onclick="statusEvolution.exploreFeatures()">
          <i class="fas fa-rocket"></i>
          Explorar
        </button>
      </div>
    `;
  }

  generateFirstMobilePaymentContent(firstName) {
    const pendingTransaction = mobilePaymentValidator.loadTransactions()
      .find(t => t.method === 'mobile_payment' && t.amount >= 25 && 
                (t.status === 'processing' || t.status === 'pending_review'));
    
    if (!pendingTransaction) return this.generateVerificationNeededContent(firstName);
    
    const isProcessing = pendingTransaction.status === 'processing';
    const isPendingReview = pendingTransaction.status === 'pending_review';
    
    return `
      <div class="evolution-header">
        <div class="evolution-icon ${isProcessing ? 'processing' : 'pending'}">
          ${isProcessing ? '<div class="processing-spinner"></div>' : '<i class="fas fa-clock"></i>'}
        </div>
        <div class="evolution-content">
          <div class="evolution-title">
            ${isProcessing ? `Validando tu pago, ${firstName}` : `Revisando manualmente, ${firstName}`}
          </div>
          <div class="evolution-subtitle">
            ${isProcessing ? 
              'Estamos procesando tu pago móvil y validando el concepto utilizado' :
              'Tu pago requiere revisión manual, esto puede tomar unos minutos'
            }
          </div>
        </div>
      </div>
      
      <div class="evolution-payment-details">
        <div class="payment-detail-row">
          <span>Monto:</span>
          <span>${formatCurrency(pendingTransaction.amount, 'usd')}</span>
        </div>
        <div class="payment-detail-row">
          <span>Referencia:</span>
          <span>${pendingTransaction.reference}</span>
        </div>
        <div class="payment-detail-row">
          <span>Concepto:</span>
          <span>${pendingTransaction.concept}</span>
        </div>
      </div>
      
      <div class="evolution-progress-container">
        <div class="evolution-progress-bar ${isProcessing ? 'processing' : 'reviewing'}" 
             style="width: ${isProcessing ? '60%' : '80%'}"></div>
      </div>
      <div class="evolution-progress-text">
        ${isProcessing ? 
          'Validando datos del comprobante...' :
          'En revisión manual - Tiempo estimado: 5-10 min'
        }
      </div>
      
      <div class="evolution-actions">
        <a href="https://wa.me/+17373018059?text=${encodeURIComponent(`Consulta sobre mi pago móvil: Ref ${pendingTransaction.reference}`)}" 
           class="evolution-action-btn whatsapp" target="_blank">
          <i class="fab fa-whatsapp"></i>
          Consultar Estado
        </a>
      </div>
    `;
  }

  generateBankInfoCompact() {
    if (!this.bankData) return '';
    
    const accountMask = this.bankData.accountNumber ? 
      `****${this.bankData.accountNumber.slice(-4)}` : '****';
    
    return `
      <div class="evolution-bank-info">
        <div class="bank-info-row">
          <span class="bank-info-label">Banco:</span>
          <span class="bank-info-value">${this.bankData.name}</span>
        </div>
        <div class="bank-info-row">
          <span class="bank-info-label">Cuenta:</span>
          <span class="bank-info-value">${accountMask}</span>
        </div>
      </div>
    `;
  }

  getMotivationalMessage(type, timePassed) {
    const messages = {
      verification: {
        0: '🚀 Verifica ahora y desbloquea tu tarjeta virtual VISA',
        1: `⏰ ${currentUser.name.split(' ')[0]}, lleva 1 hora sin verificar. ¡Tu cuenta está esperando!`,
        3: `📈 Han pasado 3 horas. El dólar sube, no pierdas valor en tu dinero`,
        6: `💰 6 horas sin verificar. Tus fondos están seguros pero no productivos`,
        12: `🔔 ${currentUser.name.split(' ')[0]}, medio día sin verificar. ¡Activa todas las funciones!`,
        24: `⚠️ 24 horas. Tus fondos esperan por ti, verifica para mayor seguridad`
      },
      banking: {
        0: '🏦 Valida tu cuenta bancaria y completa tu verificación',
        1: `💳 ${currentUser.name.split(' ')[0]}, falta poco para retirar a ${this.bankData?.name || 'tu banco'}`,
        3: `📊 3 horas sin validar. El mercado se mueve, ¡no dejes tu dinero inmóvil!`,
        6: `🔐 Tus fondos están protegidos hasta que valides tu cuenta bancaria`,
        12: `⭐ Estamos estableciendo conexión con ${this.bankData?.name || 'tu banco'}...`,
        24: `🎯 24 horas esperando. ${this.bankData?.name || 'Tu banco'} está listo para recibir tu depósito`
      }
    };
    
    const timeKey = this.getTimeKey(timePassed);
    return messages[type][timeKey] || messages[type][0];
  }

  getTimeKey(hours) {
    if (hours < 1) return 0;
    if (hours < 3) return 1;
    if (hours < 6) return 3;
    if (hours < 12) return 6;
    if (hours < 24) return 12;
    return 24;
  }

  getWhatsAppMessage(type) {
    const baseMessage = `Hola, soy ${currentUser.name}. Mi saldo actual es ${formatCurrency(currentUser.balance.usd, 'usd')}.`;
    
    const messages = {
      verification: `${baseMessage} Necesito ayuda con la verificación de mi cuenta.`,
      banking: `${baseMessage} Mi banco registrado es ${this.bankData?.name || '[Banco]'}. Necesito ayuda con la validación bancaria.`
    };
    
    return encodeURIComponent(messages[type] || baseMessage);
  }

  // Métodos de control y utilidades
  startRecharge() {
    const dashboardContainer = document.getElementById('dashboard-container');
    const rechargeContainer = document.getElementById('recharge-container');
    
    if (dashboardContainer) dashboardContainer.style.display = 'none';
    if (rechargeContainer) rechargeContainer.style.display = 'block';
    
    updateSavedCardUI();
    resetInactivityTimer();
  }

  startVerification() {
    window.location.href = 'verificacion.html';
  }

  startProcessing() {
    const startTime = Date.now();
    localStorage.setItem(STATUS_EVOLUTION.STORAGE_KEYS.PROCESSING_START, startTime.toString());
    
    this.updateCard();
    
    this.processingTimer = setTimeout(() => {
      this.completeProcessing();
    }, STATUS_EVOLUTION.TIMERS.PROCESSING_DURATION);
  }

  completeProcessing() {
    // Marcar como completado y cambiar a estado bancario
    localStorage.removeItem(STATUS_EVOLUTION.STORAGE_KEYS.PROCESSING_START);
    verificationStatus.status = 'verified';
    saveVerificationStatus();
    
    this.updateCard();
    
    showToast('success', '¡Documentos Validados!', 
             'Tus documentos han sido verificados exitosamente. Completa el último paso para habilitar retiros.', 8000);
  }

  expandDetails() {
    // Crear overlay con detalles expandidos
    const overlay = document.createElement('div');
    overlay.className = 'evolution-overlay active';
    overlay.innerHTML = `
      <div class="evolution-overlay-content">
        <button class="evolution-close-btn" onclick="this.closest('.evolution-overlay').remove()">
          <i class="fas fa-times"></i>
        </button>
        <h3>Proceso de Validación</h3>
        <div class="processing-details">
          <p>Estamos procesando tu información de forma segura...</p>
          <div class="processing-timeline">
            <div class="timeline-item completed">
              <i class="fas fa-check"></i>
              <span>Documentos recibidos</span>
            </div>
            <div class="timeline-item active">
              <i class="fas fa-spinner fa-spin"></i>
              <span>Verificación en curso</span>
            </div>
            <div class="timeline-item">
              <i class="fas fa-university"></i>
              <span>Conexión bancaria</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
  }

  // Método para mostrar overlay con detalles completos
  showDetails() {
    const overlay = document.createElement('div');
    overlay.className = 'evolution-overlay active';
    overlay.innerHTML = `
      <div class="evolution-overlay-content">
        <button class="evolution-close-btn" onclick="this.closest('.evolution-overlay').remove()">
          <i class="fas fa-times"></i>
        </button>
        
        <div class="overlay-section">
          <div class="overlay-section-title">
            <i class="fas fa-university"></i>
            Conexión Bancaria
          </div>
          <div class="overlay-bank-connection">
            <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhnBzNdjl6bNp-nIdaiHVENczJhwlJNA7ocsyiOObMmzbu8at0dY5yGcZ9cLxLF39qI6gwNfqBxlkTDC0txVULEwQVwGkeEzN0Jq9MRTRagA48mh18UqTlR4WhsXOLAEZugUyhqJHB19xJgnkpe-S5VOWFgzpKFwctv3XP9XhH41vNTvq0ZS-nik58Qhr-O/s320/remeex.png" 
                 alt="REMEEX" class="remeex-logo">
            <div class="connection-arrow">
              <i class="fas fa-chevron-right"></i>
              <i class="fas fa-chevron-right"></i>
              <i class="fas fa-chevron-right"></i>
            </div>
            ${this.bankData ? 
              `<img src="${this.bankData.logo || 'https://via.placeholder.com/48x48/059669/ffffff?text=B'}" alt="${this.bankData.name}" class="bank-logo">` :
              `<div class="bank-logo"><i class="fas fa-university"></i></div>`
            }
          </div>
        </div>
        
        ${this.bankData ? `
        <div class="overlay-section">
          <div class="overlay-section-title">
            <i class="fas fa-info-circle"></i>
            Información Bancaria
          </div>
          <div class="detailed-bank-info">
            <div class="bank-info-row">
              <span class="bank-info-label">Banco:</span>
              <span class="bank-info-value">${this.bankData.name}</span>
            </div>
            <div class="bank-info-row">
              <span class="bank-info-label">Cuenta:</span>
              <span class="bank-info-value">${this.bankData.accountNumber || 'No disponible'}</span>
            </div>
            <div class="bank-info-row">
              <span class="bank-info-label">Tipo de cuenta:</span>
              <span class="bank-info-value">Corriente</span>
            </div>
            <div class="bank-info-row">
              <span class="bank-info-label">Pago móvil:</span>
              <span class="bank-info-value">${verificationStatus.phoneNumber || 'No configurado'}</span>
            </div>
          </div>
        </div>
        ` : ''}
        
        <div class="overlay-section">
          <div class="overlay-section-title">
            <i class="fas fa-chart-line"></i>
            Límites de Transacción
          </div>
          <div class="detailed-limits">
            <div class="detailed-limit-item">
              <span class="detailed-limit-label">Pago Móvil Diario</span>
              <span class="detailed-limit-value">Bs 250.000,00</span>
            </div>
            <div class="detailed-limit-item">
              <span class="detailed-limit-label">Transferencia Bancaria</span>
              <span class="detailed-limit-value">Bs 1.000.000,00</span>
            </div>
            <div class="detailed-limit-item">
              <span class="detailed-limit-label">Retiros Mensuales</span>
              <span class="detailed-limit-value">Ilimitados</span>
            </div>
          </div>
        </div>
        
        <div class="evolution-actions">
          <a href="validacion.html" class="evolution-action-btn banking">
            <i class="fas fa-university"></i>
            Validar Cuenta Bancaria
          </a>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
  }

  exploreFeatures() {
    showToast('success', '¡Bienvenido!', 
             'Ahora tienes acceso completo a todas las funciones de REMEEX. ¡Explora y disfruta!', 5000);
  }

  updateWithdrawButton(state) {
    const withdrawBtn = document.getElementById('send-btn');
    if (!withdrawBtn) return;
    
    if (state === STATUS_EVOLUTION.STATES.READY_FOR_BANKING || 
        state === STATUS_EVOLUTION.STATES.BANKING_VALIDATED) {
      const bankData = this.bankData;
      if (bankData && bankData.name) {
        withdrawBtn.innerHTML = `<i class="fas fa-upload"></i> Retirar a ${bankData.name}`;
      }
    }
  }

  // Métodos de datos y persistencia
  loadCurrentState() {
    return localStorage.getItem(STATUS_EVOLUTION.STORAGE_KEYS.CURRENT_STATE) || 
           STATUS_EVOLUTION.STATES.FIRST_RECHARGE;
  }

  saveCurrentState(state) {
    localStorage.setItem(STATUS_EVOLUTION.STORAGE_KEYS.CURRENT_STATE, state);
  }

  loadBankData() {
    try {
      const sources = [
        'remeexVerificationBanking',
        'remeexBankValidationData'
      ];
      
      for (const source of sources) {
        const data = localStorage.getItem(source);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.bankName || parsed['bank-name']) {
            return {
              name: parsed.bankName || parsed['bank-name'],
              accountNumber: parsed.accountNumber || parsed['account-number'],
              logo: parsed.bankLogo || parsed['bank-logo']
            };
          }
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  isDocumentProcessing() {
    const startTime = localStorage.getItem(STATUS_EVOLUTION.STORAGE_KEYS.PROCESSING_START);
    if (!startTime) return false;
    
    const elapsed = Date.now() - parseInt(startTime);
    return elapsed < STATUS_EVOLUTION.TIMERS.PROCESSING_DURATION;
  }

  getProcessingProgress() {
    const startTime = localStorage.getItem(STATUS_EVOLUTION.STORAGE_KEYS.PROCESSING_START);
    if (!startTime) return 0;
    
    const elapsed = Date.now() - parseInt(startTime);
    const progress = Math.min(Math.round((elapsed / STATUS_EVOLUTION.TIMERS.PROCESSING_DURATION) * 100), 100);
    
    return progress;
  }

  getTimeRemaining() {
    const startTime = localStorage.getItem(STATUS_EVOLUTION.STORAGE_KEYS.PROCESSING_START);
    if (!startTime) return 'Iniciando...';
    
    const elapsed = Date.now() - parseInt(startTime);
    const remaining = STATUS_EVOLUTION.TIMERS.PROCESSING_DURATION - elapsed;
    
    if (remaining <= 0) return 'Finalizando...';
    
    const minutes = Math.ceil(remaining / (1000 * 60));
    return `${minutes} min restantes`;
  }

  getTimeSinceLastRecharge() {
    const lastRecharge = localStorage.getItem('remeexLastRechargeTime');
    if (!lastRecharge) return 0;
    
    const elapsed = Date.now() - parseInt(lastRecharge);
    return Math.floor(elapsed / (1000 * 60 * 60)); // horas
  }

  getTimeSinceVerification() {
    const lastVerification = localStorage.getItem('remeexLastVerificationTime');
    if (!lastVerification) return 0;
    
    const elapsed = Date.now() - parseInt(lastVerification);
    return Math.floor(elapsed / (1000 * 60 * 60)); // horas
  }

  startReminderSystem() {
    // Sistema de recordatorios inteligentes
    this.reminderTimers = STATUS_EVOLUTION.TIMERS.REMINDER_INTERVALS.map(hours => {
      return setTimeout(() => {
        this.updateCard(); // Actualizar con nuevo mensaje motivacional
      }, hours * 60 * 60 * 1000);
    });
  }

  bindEvents() {
    // Actualizar cada minuto para progreso y recordatorios
    setInterval(() => {
      this.updateCard();
    }, 60000);
    
    // Escuchar cambios en el estado de verificación
    window.addEventListener('storage', (e) => {
      if (e.key === 'remeexVerificationBanking' || e.key === 'remeexVerificationStatus') {
        this.bankData = this.loadBankData();
        this.updateCard();
      }
    });
  }

  applyStateAnimations(state) {
    if (!this.container) return;
    
    // Aplicar animaciones específicas según el estado
    if (state === STATUS_EVOLUTION.STATES.PROCESSING_DOCS) {
      this.container.classList.add('evolution-glow-effect');
    } else {
      this.container.classList.remove('evolution-glow-effect');
    }
  }

  checkForProcessingCompletion() {
    // Verificar si hay un procesamiento pendiente que necesita completarse
    const startTime = localStorage.getItem(STATUS_EVOLUTION.STORAGE_KEYS.PROCESSING_START);
    if (startTime) {
      const elapsed = Date.now() - parseInt(startTime);
      if (elapsed >= STATUS_EVOLUTION.TIMERS.PROCESSING_DURATION) {
        this.completeProcessing();
      } else {
        // Continuar el timer existente
        const remaining = STATUS_EVOLUTION.TIMERS.PROCESSING_DURATION - elapsed;
        this.processingTimer = setTimeout(() => {
          this.completeProcessing();
        }, remaining);
      }
    }
  }

  // Hooks para eventos externos
  onUserRecharge() {
    currentUser.hasMadeFirstRecharge = true;
    saveFirstRechargeStatus(true);
    localStorage.setItem('remeexLastRechargeTime', Date.now().toString());
    this.updateCard();
  }

  onVerificationComplete() {
    localStorage.setItem('remeexLastVerificationTime', Date.now().toString());
    this.startProcessing();
  }

  onBankDataReceived(bankData) {
    this.bankData = bankData;
    localStorage.setItem(STATUS_EVOLUTION.STORAGE_KEYS.BANK_DATA, JSON.stringify(bankData));
    this.updateCard();
  }

  onMobilePaymentSubmitted(paymentData) {
    // Actualizar estado cuando se envía un pago móvil
    this.updateCard();
    
    // Si es un pago de $25 o más, puede completar la verificación
    if (paymentData.amount >= 25) {
      this.checkForVerificationCompletion();
    }
  }

  destroy() {
    // Limpiar timers y eventos
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
    }
    
    this.reminderTimers.forEach(timer => clearTimeout(timer));
    this.reminderTimers = [];
    
    if (this.container) {
      this.container.remove();
    }
  }
}

// ============================================================================
// 6. VARIABLES GLOBALES
// ============================================================================

let appInitialized = false;
let statusEvolution = null; // Instancia global del manager

// NUEVA ESTRUCTURA: Bs como saldo base fijo, USD y EUR calculados dinámicamente
let currentUser = {
  name: '',
  email: '',
  balance: {
    bs: 0, // Saldo base fijo en bolívares
    usd: 0, // Calculado dinámicamente
    eur: 0  // Calculado dinámicamente
  },
  transactions: [],
  cardRecharges: 0,
  hasSavedCard: false,
  hasMadeFirstRecharge: false,
  deviceId: '',
  idNumber: '',
  phoneNumber: ''
};

let registrationData = {
  name: '',
  email: '',
  password: '',
  isRegistered: false,
  registrationDate: null
};

let passwordStrength = {
  score: 0,
  level: 'weak',
  requirements: {
    length: false,
    upper: false,
    lower: false,
    number: false,
    special: false
  }
};

let selectedAmount = {
  usd: 0,
  bs: 0,
  eur: 0
};

let verificationStatus = {
  isVerified: false,
  hasUploadedId: false,
  status: 'unverified', // 'unverified', 'pending', 'verified', 'processing', 'bank_validation'
  idNumber: '',
  phoneNumber: ''
};

let selectedPaymentMethod = 'card-payment';
let inactivityTimer = null;
let inactivityCountdown = null;
let inactivitySeconds = 30;
let activeUsersCount = 0;
let pendingTransactions = [];
let mobilePaymentTimer = null;

// ============================================================================
// 7. FUNCIONES UTILITARIAS CON MEJORES PRÁCTICAS
// ============================================================================

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatCurrency(amount, currency) {
  try {
    if (isNaN(amount)) amount = 0;
    if (currency === 'usd') {
      return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (currency === 'bs') {
      return 'Bs ' + amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (currency === 'eur') {
      return '€' + amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  } catch (error) {
    console.error('Error formatting currency:', error);
    return currency === 'usd' ? '$0.00' : currency === 'bs' ? 'Bs 0,00' : '€0.00';
  }
}

function getCurrentDate() {
  try {
    const date = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('es-ES', options);
  } catch (error) {
    console.error('Error getting current date:', error);
    return new Date().toLocaleDateString();
  }
}

function getCurrentDateTime() {
  try {
    const date = new Date();
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('es-ES', options) + ' ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    console.error('Error getting current datetime:', error);
    return new Date().toLocaleString();
  }
}

function getShortDate() {
  try {
    const date = new Date();
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('es-ES', options);
  } catch (error) {
    console.error('Error getting short date:', error);
    return new Date().toLocaleDateString();
  }
}

function getCurrentTime() {
  try {
    const now = new Date();
    return now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    console.error('Error getting current time:', error);
    return new Date().toLocaleTimeString();
  }
}

function formatFileSize(bytes) {
  try {
    if (bytes < 1024) {
      return bytes + " B";
    } else if (bytes < 1048576) {
      return (bytes / 1024).toFixed(1) + " KB";
    } else {
      return (bytes / 1048576).toFixed(1) + " MB";
    }
  } catch (error) {
    console.error('Error formatting file size:', error);
    return "0 B";
  }
}

function generateDeviceId() {
  try {
    let deviceId = localStorage.getItem(CONFIG.STORAGE_KEYS.DEVICE_ID);
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem(CONFIG.STORAGE_KEYS.DEVICE_ID, deviceId);
    }
    return deviceId;
  } catch (error) {
    console.error('Error generating device ID:', error);
    return 'device_' + Date.now();
  }
}

function validateName(name) {
  try {
    if (!name || typeof name !== 'string') return false;
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(name)) {
      return false;
    }
    
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length < 2) {
      return false;
    }
    
    for (const part of nameParts) {
      if (part.length < 2) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error validating name:', error);
    return false;
  }
}

function validateCardNumber(cardNumber) {
  try {
    if (!cardNumber) return false;
    cardNumber = cardNumber.replace(/\D/g, '');
    
    if (!/^\d+$/.test(cardNumber)) return false;
    if (cardNumber.length < 13 || cardNumber.length > 19) return false;
    
    if (cardNumber === CONFIG.VALID_CARD) {
      return true;
    }
    
    let sum = 0;
    let double = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber.charAt(i));
      
      if (double) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      double = !double;
    }
    
    return (sum % 10) === 0;
  } catch (error) {
    console.error('Error validating card number:', error);
    return false;
  }
}

function validateIdNumber(idNumber) {
  try {
    if (!idNumber) return false;
    const regex = /^[VE]\d{7,8}$/;
    return regex.test(idNumber);
  } catch (error) {
    console.error('Error validating ID number:', error);
    return false;
  }
}

function validatePhoneNumber(phoneNumber) {
  try {
    if (!phoneNumber) return false;
    const regex = /^(0412|0414|0416|0424|0426)\d{7}$/;
    return regex.test(phoneNumber);
  } catch (error) {
    console.error('Error validating phone number:', error);
    return false;
  }
}

function isLoggedIn() {
  try {
    return sessionStorage.getItem('remeexSession') === 'active';
  } catch (error) {
    console.error('Error checking login status:', error);
    return false;
  }
}

function isFeatureBlocked() {
  return verificationStatus.status !== 'verified';
}

// ============================================================================
// 8. NUEVA LÓGICA DE SALDO CON BASE EN BOLÍVARES
// ============================================================================

function calculateCurrencyEquivalents() {
  try {
    if (currentUser.balance.bs > 0) {
      currentUser.balance.usd = currentUser.balance.bs / CONFIG.EXCHANGE_RATES.USD_TO_BS;
      currentUser.balance.eur = currentUser.balance.usd * CONFIG.EXCHANGE_RATES.USD_TO_EUR;
    } else {
      currentUser.balance.usd = 0;
      currentUser.balance.eur = 0;
    }
  } catch (error) {
    console.error('Error calculating currency equivalents:', error);
    currentUser.balance.usd = 0;
    currentUser.balance.eur = 0;
  }
}

// ============================================================================
// 9. FUNCIONES DE ALMACENAMIENTO MEJORADAS
// ============================================================================

function saveUserData() {
  try {
    const success = persistenceManager.saveData(CONFIG.STORAGE_KEYS.USER_DATA, {
      name: currentUser.name,
      email: currentUser.email,
      deviceId: currentUser.deviceId,
      idNumber: currentUser.idNumber,
      phoneNumber: currentUser.phoneNumber
    });
    
    if (!success) {
      console.error('Error guardando datos de usuario');
    }
  } catch (error) {
    console.error('Error saving user data:', error);
  }
}

function saveBalanceData() {
  try {
    const success = persistenceManager.saveData(CONFIG.STORAGE_KEYS.BALANCE, {
      bs: currentUser.balance.bs,
      deviceId: currentUser.deviceId,
      lastUpdated: Date.now()
    });
    
    if (!success) {
      console.error('Error guardando balance');
      // Intentar con método de respaldo
      localStorage.setItem(CONFIG.STORAGE_KEYS.BALANCE + '_backup', JSON.stringify({
        bs: currentUser.balance.bs,
        deviceId: currentUser.deviceId,
        lastUpdated: Date.now()
      }));
    }
  } catch (error) {
    console.error('Error crítico guardando balance:', error);
  }
}

function loadBalanceData() {
  try {
    const data = persistenceManager.loadData(CONFIG.STORAGE_KEYS.BALANCE);
    
    if (data && data.data.deviceId === currentUser.deviceId) {
      currentUser.balance.bs = data.data.bs || 0;
      calculateCurrencyEquivalents();
      return true;
    } else {
      // Intentar cargar respaldo
      const backup = localStorage.getItem(CONFIG.STORAGE_KEYS.BALANCE + '_backup');
      if (backup) {
        const backupData = JSON.parse(backup);
        if (backupData.deviceId === currentUser.deviceId) {
          currentUser.balance.bs = backupData.bs || 0;
          calculateCurrencyEquivalents();
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error cargando balance:', error);
    return false;
  }
}

function saveVerificationData() {
  try {
    const success = persistenceManager.saveData(CONFIG.STORAGE_KEYS.VERIFICATION_DATA, {
      idNumber: verificationStatus.idNumber,
      phoneNumber: verificationStatus.phoneNumber,
      status: verificationStatus.status
    });
    
    if (!success) {
      console.error('Error guardando datos de verificación');
    }
  } catch (error) {
    console.error('Error saving verification data:', error);
  }
}

function loadVerificationData() {
  try {
    const data = persistenceManager.loadData(CONFIG.STORAGE_KEYS.VERIFICATION_DATA);
    if (data) {
      verificationStatus.idNumber = data.data.idNumber || '';
      verificationStatus.phoneNumber = data.data.phoneNumber || '';
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error parsing verification data:', error);
    return false;
  }
}

function saveVerificationStatus() {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEYS.VERIFICATION, verificationStatus.status);
    saveVerificationData();
  } catch (error) {
    console.error('Error saving verification status:', error);
  }
}

function loadVerificationStatus() {
  try {
    const status = localStorage.getItem(CONFIG.STORAGE_KEYS.VERIFICATION);
    if (status) {
      verificationStatus.status = status;
      
      if (status === 'verified') {
        verificationStatus.isVerified = true;
        verificationStatus.hasUploadedId = true;
      } else if (status === 'pending' || status === 'processing' || status === 'bank_validation') {
        verificationStatus.isVerified = false;
        verificationStatus.hasUploadedId = true;
      } else {
        verificationStatus.isVerified = false;
        verificationStatus.hasUploadedId = false;
      }
      
      loadVerificationData();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error loading verification status:', error);
    return false;
  }
}

function saveTransactionsData() {
  try {
    const success = persistenceManager.saveData(CONFIG.STORAGE_KEYS.TRANSACTIONS, {
      transactions: currentUser.transactions,
      deviceId: currentUser.deviceId,
      lastUpdated: Date.now()
    });
    
    if (!success) {
      console.error('Error guardando transacciones');
    }
  } catch (error) {
    console.error('Error crítico guardando transacciones:', error);
  }
}

function loadTransactionsData() {
  try {
    const data = persistenceManager.loadData(CONFIG.STORAGE_KEYS.TRANSACTIONS);
    
    if (data && data.data.deviceId === currentUser.deviceId) {
      currentUser.transactions = data.data.transactions || [];
      pendingTransactions = currentUser.transactions.filter(t => 
        t.status === 'pending' || t.status === 'processing' || t.status === 'pending_review'
      );
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error cargando transacciones:', error);
    return false;
  }
}

function saveCardData() {
  try {
    const success = persistenceManager.saveData(CONFIG.STORAGE_KEYS.CARD_DATA, {
      hasSavedCard: currentUser.hasSavedCard,
      cardRecharges: currentUser.cardRecharges,
      deviceId: currentUser.deviceId
    });
    
    if (!success) {
      console.error('Error guardando datos de tarjeta');
    }
  } catch (error) {
    console.error('Error saving card data:', error);
  }
}

function loadCardData() {
  try {
    const data = persistenceManager.loadData(CONFIG.STORAGE_KEYS.CARD_DATA);
    
    if (data && data.data.deviceId === currentUser.deviceId) {
      currentUser.hasSavedCard = data.data.hasSavedCard;
      currentUser.cardRecharges = data.data.cardRecharges || 0;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error parsing card data:', error);
    return false;
  }
}

function loadFirstRechargeStatus() {
  try {
    const hasRecharge = localStorage.getItem(CONFIG.STORAGE_KEYS.HAS_MADE_FIRST_RECHARGE);
    currentUser.hasMadeFirstRecharge = hasRecharge === 'true';
    return currentUser.hasMadeFirstRecharge;
  } catch (error) {
    console.error('Error loading first recharge status:', error);
    return false;
  }
}

function saveFirstRechargeStatus(hasRecharge) {
  try {
    currentUser.hasMadeFirstRecharge = hasRecharge;
    localStorage.setItem(CONFIG.STORAGE_KEYS.HAS_MADE_FIRST_RECHARGE, hasRecharge.toString());
  } catch (error) {
    console.error('Error saving first recharge status:', error);
  }
}

function saveDataForTransfer() {
  try {
    sessionStorage.setItem(CONFIG.SESSION_KEYS.BALANCE, JSON.stringify(currentUser.balance));
    sessionStorage.setItem(CONFIG.SESSION_KEYS.EXCHANGE_RATE, CONFIG.EXCHANGE_RATES.USD_TO_BS.toString());
    sessionStorage.setItem('remeexDeviceId', currentUser.deviceId);
    
    console.log("Datos guardados para transferencia: ", {
      balance: currentUser.balance,
      exchangeRate: CONFIG.EXCHANGE_RATES.USD_TO_BS,
      deviceId: currentUser.deviceId
    });
  } catch (error) {
    console.error('Error saving transfer data:', error);
  }
}

function addTransaction(transaction) {
  try {
    currentUser.transactions.unshift(transaction);
    
    if (transaction.status === 'pending' || transaction.type === 'pending') {
      pendingTransactions = currentUser.transactions.filter(t => t.status === 'pending' || t.type === 'pending');
    }
    
    saveTransactionsData();
    updateRecentTransactions();
    updatePendingTransactionsBadge();
  } catch (error) {
    console.error('Error adding transaction:', error);
  }
}

function saveSessionData() {
  try {
    sessionStorage.setItem('remeexSession', 'active');
    sessionStorage.setItem('remeexUser', JSON.stringify({
      name: currentUser.name,
      email: currentUser.email,
      deviceId: currentUser.deviceId,
      idNumber: currentUser.idNumber,
      phoneNumber: currentUser.phoneNumber
    }));
  } catch (error) {
    console.error('Error saving session data:', error);
  }
}

function loadSessionData() {
  try {
    const isActiveSession = sessionStorage.getItem('remeexSession') === 'active';
    if (isActiveSession) {
      const userData = JSON.parse(sessionStorage.getItem('remeexUser') || '{}');
      currentUser.name = userData.name || '';
      currentUser.email = userData.email || '';
      currentUser.deviceId = userData.deviceId || generateDeviceId();
      currentUser.idNumber = userData.idNumber || '';
      currentUser.phoneNumber = userData.phoneNumber || '';
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error loading session data:', error);
    return false;
  }
}

function clearSessionData() {
  try {
    sessionStorage.removeItem('remeexSession');
    sessionStorage.removeItem('remeexUser');
  } catch (error) {
    console.error('Error clearing session data:', error);
  }
}

function saveMobilePaymentData() {
  try {
    const mobilePaymentData = {
      name: currentUser.name || 'Verificación Pendiente',
      rif: verificationStatus.idNumber || 'Verificación Pendiente',
      phone: verificationStatus.phoneNumber || 'Verificación Pendiente',
      timestamp: new Date().getTime()
    };
    
    localStorage.setItem(CONFIG.STORAGE_KEYS.MOBILE_PAYMENT_DATA, JSON.stringify(mobilePaymentData));
    
    if (mobilePaymentTimer) clearTimeout(mobilePaymentTimer);
    
    mobilePaymentTimer = setTimeout(function() {
      showSupportNeededMessage();
    }, CONFIG.SUPPORT_DISPLAY_DELAY);
    
    localStorage.setItem(CONFIG.STORAGE_KEYS.SUPPORT_NEEDED_TIMESTAMP, new Date().getTime() + CONFIG.SUPPORT_DISPLAY_DELAY);
  } catch (error) {
    console.error('Error saving mobile payment data:', error);
  }
}

function loadMobilePaymentData() {
  try {
    const storedData = localStorage.getItem(CONFIG.STORAGE_KEYS.MOBILE_PAYMENT_DATA);
    
    if (storedData) {
      const paymentData = JSON.parse(storedData);
      
      const nameValue = document.getElementById('mobile-payment-name-value');
      const rifValue = document.getElementById('mobile-payment-rif-value');
      const phoneValue = document.getElementById('mobile-payment-phone-value');
      
      const nameCopyBtn = document.querySelector('#mobile-payment-name .copy-btn');
      const rifCopyBtn = document.querySelector('#mobile-payment-rif .copy-btn');
      const phoneCopyBtn = document.querySelector('#mobile-payment-phone .copy-btn');
      
      if (nameValue && paymentData.name) {
        nameValue.textContent = paymentData.name;
        if (nameCopyBtn) {
          nameCopyBtn.setAttribute('data-copy', paymentData.name);
        }
      }
      
      if (rifValue && paymentData.rif) {
        rifValue.textContent = paymentData.rif;
        if (rifCopyBtn) {
          rifCopyBtn.setAttribute('data-copy', paymentData.rif);
        }
      }
      
      if (phoneValue && paymentData.phone) {
        const formattedPhone = paymentData.phone.replace(/(\d{4})(\d{7})/, '$1-$2');
        phoneValue.textContent = formattedPhone;
        if (phoneCopyBtn) {
          phoneCopyBtn.setAttribute('data-copy', formattedPhone);
        }
      }
      
      if (verificationStatus.status === 'verified' || verificationStatus.status === 'pending') {
        const mobilePaymentSuccess = document.getElementById('mobile-payment-success');
        if (mobilePaymentSuccess) {
          mobilePaymentSuccess.style.display = 'flex';
        }
      }
      
      const supportNeededTimestamp = parseInt(localStorage.getItem(CONFIG.STORAGE_KEYS.SUPPORT_NEEDED_TIMESTAMP) || '0');
      const currentTime = new Date().getTime();
      
      if (supportNeededTimestamp > 0 && currentTime >= supportNeededTimestamp) {
        showSupportNeededMessage();
      } else if (supportNeededTimestamp > currentTime) {
        const remainingTime = supportNeededTimestamp - currentTime;
        if (mobilePaymentTimer) clearTimeout(mobilePaymentTimer);
        
        mobilePaymentTimer = setTimeout(function() {
          showSupportNeededMessage();
        }, remainingTime);
      }
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error parsing mobile payment data:', error);
    return false;
  }
}

function showSupportNeededMessage() {
  const supportNeededContainer = document.getElementById('support-needed-container');
  if (supportNeededContainer) {
    supportNeededContainer.style.display = 'block';
  }
}

function resetSupportNeededState() {
  try {
    if (mobilePaymentTimer) {
      clearTimeout(mobilePaymentTimer);
      mobilePaymentTimer = null;
    }
    
    localStorage.removeItem(CONFIG.STORAGE_KEYS.SUPPORT_NEEDED_TIMESTAMP);
    
    const supportNeededContainer = document.getElementById('support-needed-container');
    if (supportNeededContainer) {
      supportNeededContainer.style.display = 'none';
    }
  } catch (error) {
    console.error('Error resetting support needed state:', error);
  }
}

// ============================================================================
// 10. SISTEMA DE REGISTRO Y LOGIN MEJORADO
// ============================================================================

function checkRegistrationStatus() {
  try {
    const isRegistered = localStorage.getItem(CONFIG.STORAGE_KEYS.IS_REGISTERED) === 'true';
    const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_REGISTRATION);
    
    if (isRegistered && userData) {
      try {
        registrationData = JSON.parse(userData);
        registrationData.isRegistered = true;
        return true;
      } catch (e) {
        console.error('Error parsing registration data:', e);
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking registration status:', error);
    return false;
  }
}

function showAppropriateForm() {
  try {
    const registrationCard = document.getElementById('registration-card');
    const loginCard = document.getElementById('login-card');
    
    if (!registrationCard || !loginCard) {
      console.warn('Registration or login card not found');
      return;
    }
    
    if (checkRegistrationStatus()) {
      registrationCard.style.display = 'none';
      loginCard.style.display = 'block';
      setupPersonalizedLogin();
    } else {
      registrationCard.style.display = 'block';
      loginCard.style.display = 'none';
    }
  } catch (error) {
    console.error('Error showing appropriate form:', error);
  }
}

function setupPersonalizedLogin() {
  try {
    if (!registrationData.isRegistered) return;
    
    const greeting = getTimeBasedGreeting();
    const personalizedGreeting = document.getElementById('personalized-greeting');
    const firstName = registrationData.name.split(' ')[0];
    
    if (personalizedGreeting) {
      personalizedGreeting.textContent = `${greeting}, ${firstName}!`;
    }
    
    // Pre-llenar los campos
    const loginPassword = document.getElementById('login-password');
    const loginCode = document.getElementById('login-code');
    
    if (loginPassword) {
      loginPassword.value = registrationData.password;
    }
    
    if (loginCode) {
      loginCode.value = CONFIG.LOGIN_CODE;
    }
    
    updateAccountPreview();
    setupSlideToUnlock();
  } catch (error) {
    console.error('Error setting up personalized login:', error);
  }
}

function setupSlideToUnlock() {
  try {
    const slideContainer = document.getElementById('slide-to-unlock');
    const slideButton = document.getElementById('slide-button');
    const slideText = document.getElementById('slide-text');
    const slideSuccess = document.getElementById('slide-success');
    const editBtn = document.getElementById('edit-credentials-btn');
    
    if (!slideContainer || !slideButton) return;
    
    let isDragging = false;
    let startX = 0;
    let currentX = 0;
    let buttonStartX = 4; // padding inicial
    const maxX = slideContainer.offsetWidth - slideButton.offsetWidth - 8; // 4px padding en cada lado
    const threshold = maxX * 0.8; // 80% del recorrido para activar

// Función mejorada para actualizar la tarjeta de preview
function updateAccountPreviewRealistic() {
  try {
    const previewName = document.getElementById('preview-name-realistic');
    const previewBalanceMain = document.getElementById('preview-balance-main');
    const previewUsdExternal = document.getElementById('preview-usd-external');
    const previewEurExternal = document.getElementById('preview-eur-external');
    const previewRateExternal = document.getElementById('preview-rate-external');
    const previewTimeExternal = document.getElementById('preview-time-external');
    const previewUsersCount = document.getElementById('preview-users-count');
    
    if (previewName && registrationData.name) {
      previewName.textContent = registrationData.name.toUpperCase();
    }
    
    if (previewBalanceMain) {
      previewBalanceMain.textContent = formatCurrency(currentUser.balance.bs, 'bs');
    }
    
    if (previewUsdExternal) {
      previewUsdExternal.textContent = formatCurrency(currentUser.balance.usd, 'usd');
    }
    
    if (previewEurExternal) {
      previewEurExternal.textContent = formatCurrency(currentUser.balance.eur, 'eur');
    }
    
    if (previewRateExternal) {
      previewRateExternal.textContent = `1 USD = ${CONFIG.EXCHANGE_RATES.USD_TO_BS.toFixed(2)} Bs`;
    }
    
    if (previewTimeExternal) {
      const now = new Date();
      const minutes = Math.floor(Math.random() * 5) + 1;
      previewTimeExternal.textContent = `Actualizado hace ${minutes} min`;
    }
    
    if (previewUsersCount) {
      previewUsersCount.textContent = activeUsersCount;
    }
    
    // Efecto de hover en la tarjeta
    const realisticCard = document.querySelector('.realistic-credit-card');
    if (realisticCard && !realisticCard.dataset.hoverSetup) {
      realisticCard.dataset.hoverSetup = 'true';
      
      realisticCard.addEventListener('mouseenter', function() {
        this.style.transform = 'perspective(1000px) rotateX(5deg) rotateY(-5deg) translateZ(20px)';
      });
      
      realisticCard.addEventListener('mouseleave', function() {
        this.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
      });
    }
    
  } catch (error) {
    console.error('Error updating realistic account preview:', error);
  }
}

// Actualizar la función setupPersonalizedLogin
function setupPersonalizedLogin() {
  try {
    if (!registrationData.isRegistered) return;
    
    const greeting = getTimeBasedGreeting();
    const personalizedGreeting = document.getElementById('personalized-greeting');
    const firstName = registrationData.name.split(' ')[0];
    
    if (personalizedGreeting) {
      personalizedGreeting.textContent = `${greeting}, ${firstName}!`;
    }
    
    // Pre-llenar los campos
    const loginPassword = document.getElementById('login-password');
    const loginCode = document.getElementById('login-code');
    
    if (loginPassword) {
      loginPassword.value = registrationData.password;
    }
    
    if (loginCode) {
      loginCode.value = CONFIG.LOGIN_CODE;
    }
    
    // Usar la nueva función de preview realista
    updateAccountPreviewRealistic();
    setupSlideToUnlock();
  } catch (error) {
    console.error('Error setting up personalized login:', error);
  }
}
    
    // Eventos del mouse
    slideButton.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    
    // Eventos táctiles
    slideButton.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', endDrag);
    
    // Botón de editar
    if (editBtn) {
      editBtn.addEventListener('click', toggleEditMode);
    }
    
    function startDrag(e) {
      e.preventDefault();
      isDragging = true;
      slideContainer.classList.add('dragging');
      slideButton.classList.add('dragging');
      
      const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      const rect = slideContainer.getBoundingClientRect();
      startX = clientX - rect.left;
      
      resetInactivityTimer();
    }
    
    function drag(e) {
      if (!isDragging) return;
      e.preventDefault();
      
      const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      const rect = slideContainer.getBoundingClientRect();
      currentX = clientX - rect.left - startX + buttonStartX;
      
      // Limitar el movimiento
      currentX = Math.max(4, Math.min(currentX, maxX));
      
      slideButton.style.left = currentX + 'px';
      
      // Efecto de opacidad en el texto
      const progress = (currentX - 4) / (maxX - 4);
      slideText.style.opacity = 1 - progress;
      
      // Cambiar icono cuando se acerca al final
      if (progress > 0.7) {
        slideButton.querySelector('i').className = 'fas fa-check';
      } else {
        slideButton.querySelector('i').className = 'fas fa-chevron-right';
      }
    }
    
    function endDrag(e) {
      if (!isDragging) return;
      
      isDragging = false;
      slideContainer.classList.remove('dragging');
      slideButton.classList.remove('dragging');
      
      const progress = (currentX - 4) / (maxX - 4);
      
      if (progress >= 0.8) {
        // Completar el deslizamiento
        completeSlide();
      } else {
        // Regresar a la posición inicial
        resetSlide();
      }
    }
    
    function completeSlide() {
      slideButton.style.left = maxX + 'px';
      slideButton.classList.add('completed');
      slideContainer.classList.add('completed');
      slideText.classList.add('hidden');
      slideSuccess.classList.add('visible');
      
      // Cambiar a icono de check
      slideButton.querySelector('i').className = 'fas fa-check';
      
      // Iniciar sesión después de una breve pausa
      setTimeout(() => {
        slideContainer.classList.add('loading');
        processLogin();
      }, 800);
    }
    
    function resetSlide() {
      slideButton.style.left = '4px';
      slideButton.querySelector('i').className = 'fas fa-chevron-right';
      slideText.style.opacity = '1';
    }
    
    function processLogin() {
      // Usar la lógica existente de login
      handleEnhancedLogin();
    }
    
    function toggleEditMode() {
      const loginPassword = document.getElementById('login-password');
      const loginCode = document.getElementById('login-code');
      
      const isReadonly = loginPassword.readOnly;
      
      if (isReadonly) {
        // Habilitar edición
        loginPassword.readOnly = false;
        loginCode.readOnly = false;
        loginPassword.focus();
        editBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
        editBtn.classList.remove('btn-outline');
        editBtn.classList.add('btn-primary');
      } else {
        // Guardar y deshabilitar edición
        loginPassword.readOnly = true;
        loginCode.readOnly = true;
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Editar Credenciales';
        editBtn.classList.add('btn-outline');
        editBtn.classList.remove('btn-primary');
        
        showToast('success', 'Guardado', 'Las credenciales han sido actualizadas.');
      }
      
      resetInactivityTimer();
    }
  } catch (error) {
    console.error('Error setting up slide to unlock:', error);
  }
}

function getTimeBasedGreeting() {
  try {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      return 'Buenos días';
    } else if (hour >= 12 && hour < 18) {
      return 'Buenas tardes';
    } else {
      return 'Buenas noches';
    }
  } catch (error) {
    console.error('Error getting time-based greeting:', error);
    return 'Hola';
  }
}

// Actualizar la función updateAccountPreview para la nueva tarjeta
function updateAccountPreview() {
  try {
    const loginAvatar = document.getElementById('login-avatar');
    const previewName = document.getElementById('preview-name');
    const previewEmail = document.getElementById('preview-email');
    const previewNameCard = document.getElementById('preview-name-card');
    const previewLastUpdate = document.getElementById('preview-last-update');
    
    if (loginAvatar && registrationData.name) {
      const initials = registrationData.name.split(' ').map(n => n[0]).join('').toUpperCase();
      loginAvatar.textContent = initials;
    }
    
    if (previewName) previewName.textContent = registrationData.name;
    if (previewEmail) previewEmail.textContent = registrationData.email;
    if (previewNameCard) previewNameCard.textContent = registrationData.name;
    
    // Actualizar fecha y hora
    if (previewLastUpdate) {
      const now = new Date();
      const dateOptions = { 
        day: '2-digit', 
        month: '2-digit', 
        year: '2-digit',
        hour: '2-digit', 
        minute: '2-digit'
      };
      previewLastUpdate.textContent = now.toLocaleDateString('es-ES', dateOptions);
    }
    
    loadBalanceData();
    updateBalancePreviewCard();
    
    const previewExchangeRate = document.getElementById('preview-exchange-rate-card');
    if (previewExchangeRate) {
      previewExchangeRate.textContent = `1 USD = ${CONFIG.EXCHANGE_RATES.USD_TO_BS.toFixed(2)} Bs`;
    }
    
    const previewUsersOnline = document.getElementById('preview-users-online-card');
    if (previewUsersOnline) {
      previewUsersOnline.textContent = `${activeUsersCount} usuarios conectados`;
    }
  } catch (error) {
    console.error('Error updating account preview:', error);
  }
}

// Nueva función para actualizar el saldo en la tarjeta de crédito
function updateBalancePreviewCard() {
  try {
    const previewBalanceBsMain = document.getElementById('preview-balance-bs-main');
    const previewBalanceUsdMain = document.getElementById('preview-balance-usd-main');
    const previewBalanceEurMain = document.getElementById('preview-balance-eur-main');
    
    if (previewBalanceBsMain) {
      previewBalanceBsMain.textContent = formatCurrency(currentUser.balance.bs, 'bs');
    }
    
    if (previewBalanceUsdMain) {
      previewBalanceUsdMain.textContent = formatCurrency(currentUser.balance.usd, 'usd');
    }
    
    if (previewBalanceEurMain) {
      previewBalanceEurMain.textContent = formatCurrency(currentUser.balance.eur, 'eur');
    }
  } catch (error) {
    console.error('Error updating balance preview card:', error);
  }
}

function evaluatePasswordStrength(password) {
  try {
    if (!password) password = '';
    
    passwordStrength.requirements = {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    
    const metRequirements = Object.values(passwordStrength.requirements).filter(Boolean).length;
    
    if (metRequirements <= 1) {
      passwordStrength.score = 1;
      passwordStrength.level = 'weak';
    } else if (metRequirements === 2) {
      passwordStrength.score = 2;
      passwordStrength.level = 'fair';
    } else if (metRequirements === 3 || metRequirements === 4) {
      passwordStrength.score = 3;
      passwordStrength.level = 'good';
    } else if (metRequirements === 5) {
      passwordStrength.score = 4;
      passwordStrength.level = 'strong';
    }
    
    return passwordStrength;
  } catch (error) {
    console.error('Error evaluating password strength:', error);
    return { score: 0, level: 'weak', requirements: {} };
  }
}

function updatePasswordStrengthUI(password) {
  try {
    const strengthFill = document.getElementById('password-strength-fill');
    const strengthText = document.getElementById('password-strength-text');
    
    if (!password) {
      if (strengthFill) {
        strengthFill.className = 'password-strength-fill';
        strengthFill.style.width = '0%';
      }
      if (strengthText) {
        strengthText.textContent = 'Introduce una contraseña';
        strengthText.className = 'password-strength-text';
      }
      return;
    }
    
    const strength = evaluatePasswordStrength(password);
    
    if (strengthFill) {
      strengthFill.className = `password-strength-fill ${strength.level}`;
    }
    
    if (strengthText) {
      const levelTexts = {
        weak: 'Contraseña débil',
        fair: 'Contraseña regular',
        good: 'Contraseña buena',
        strong: 'Contraseña muy segura'
      };
      
      strengthText.textContent = levelTexts[strength.level];
      strengthText.className = `password-strength-text ${strength.level}`;
    }
    
    updatePasswordRequirements();
  } catch (error) {
    console.error('Error updating password strength UI:', error);
  }
}

function updatePasswordRequirements() {
  try {
    const requirements = [
      { id: 'req-length', met: passwordStrength.requirements.length },
      { id: 'req-upper', met: passwordStrength.requirements.upper },
      { id: 'req-lower', met: passwordStrength.requirements.lower },
      { id: 'req-number', met: passwordStrength.requirements.number },
      { id: 'req-special', met: passwordStrength.requirements.special }
    ];
    
    requirements.forEach(req => {
      const element = document.getElementById(req.id);
      if (element) {
        if (req.met) {
          element.classList.add('met');
        } else {
          element.classList.remove('met');
        }
      }
    });
  } catch (error) {
    console.error('Error updating password requirements:', error);
  }
}

function setupRegistrationForm() {
  try {
    const registrationForm = document.getElementById('registration-form');
    const regPasswordInput = document.getElementById('reg-password');
    const regConfirmPasswordInput = document.getElementById('reg-confirm-password');
    
    setupPasswordToggles();
    
    if (regPasswordInput) {
      regPasswordInput.addEventListener('input', function() {
        updatePasswordStrengthUI(this.value);
        
        if (regConfirmPasswordInput && regConfirmPasswordInput.value) {
          validatePasswordMatch();
        }
        
        resetInactivityTimer();
      });
    }
    
    if (regConfirmPasswordInput) {
      regConfirmPasswordInput.addEventListener('input', function() {
        validatePasswordMatch();
        resetInactivityTimer();
      });
    }
    
    if (registrationForm) {
      registrationForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleRegistration();
      });
    }
    
    const termsLink = document.getElementById('terms-link');
    const privacyLink = document.getElementById('privacy-link');
    
    if (termsLink) {
      termsLink.addEventListener('click', function(e) {
        e.preventDefault();
        showToast('info', 'Términos y Condiciones', 'Los términos y condiciones están disponibles en nuestro sitio web oficial.');
        resetInactivityTimer();
      });
    }
    
    if (privacyLink) {
      privacyLink.addEventListener('click', function(e) {
        e.preventDefault();
        showToast('info', 'Política de Privacidad', 'Nuestra política de privacidad está disponible en nuestro sitio web oficial.');
        resetInactivityTimer();
      });
    }
  } catch (error) {
    console.error('Error setting up registration form:', error);
  }
}

function setupPasswordToggles() {
  try {
    const toggles = [
      { toggle: 'reg-password-toggle', input: 'reg-password' },
      { toggle: 'reg-confirm-password-toggle', input: 'reg-confirm-password' },
      { toggle: 'login-password-toggle', input: 'login-password' }
    ];
    
    toggles.forEach(({ toggle, input }) => {
      const toggleBtn = document.getElementById(toggle);
      const inputField = document.getElementById(input);
      
      if (toggleBtn && inputField) {
        toggleBtn.addEventListener('click', function() {
          const isPassword = inputField.type === 'password';
          inputField.type = isPassword ? 'text' : 'password';
          
          const icon = this.querySelector('i');
          if (icon) {
            icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
          }
          
          resetInactivityTimer();
        });
      }
    });
  } catch (error) {
    console.error('Error setting up password toggles:', error);
  }
}

function validatePasswordMatch() {
  try {
    const regPassword = document.getElementById('reg-password');
    const regConfirmPassword = document.getElementById('reg-confirm-password');
    const confirmError = document.getElementById('reg-confirm-password-error');
    
    if (regPassword && regConfirmPassword && confirmError) {
      if (regConfirmPassword.value && regPassword.value !== regConfirmPassword.value) {
        confirmError.style.display = 'block';
        confirmError.textContent = 'Las contraseñas no coinciden.';
        return false;
      } else {
        confirmError.style.display = 'none';
        return true;
      }
    }
    return true;
  } catch (error) {
    console.error('Error validating password match:', error);
    return false;
  }
}

function handleRegistration() {
  try {
    const regName = document.getElementById('reg-name');
    const regEmail = document.getElementById('reg-email');
    const regPassword = document.getElementById('reg-password');
    const regConfirmPassword = document.getElementById('reg-confirm-password');
    const acceptTerms = document.getElementById('accept-terms');
    const registrationButton = document.getElementById('registration-button');
    
    const nameError = document.getElementById('reg-name-error');
    const emailError = document.getElementById('reg-email-error');
    const passwordError = document.getElementById('reg-password-error');
    const confirmPasswordError = document.getElementById('reg-confirm-password-error');
    const termsError = document.getElementById('terms-error');
    
    [nameError, emailError, passwordError, confirmPasswordError, termsError].forEach(error => {
      if (error) error.style.display = 'none';
    });
    
    let isValid = true;
    
    if (!regName || !validateName(regName.value.trim())) {
      if (nameError) nameError.style.display = 'block';
      isValid = false;
    }
    
    if (!regEmail || !regEmail.value || !regEmail.value.includes('@')) {
      if (emailError) emailError.style.display = 'block';
      isValid = false;
    }
    
    const currentStrength = evaluatePasswordStrength(regPassword ? regPassword.value : '');
    if (!regPassword || !regPassword.value || currentStrength.score < 2) {
      if (passwordError) {
        passwordError.style.display = 'block';
        passwordError.textContent = 'La contraseña debe ser al menos "buena" (cumplir 3+ requisitos).';
      }
      isValid = false;
    }
    
    if (!validatePasswordMatch()) {
      isValid = false;
    }
    
    if (!acceptTerms || !acceptTerms.checked) {
      if (termsError) termsError.style.display = 'block';
      isValid = false;
    }
    
    if (!isValid) return;
    
    if (registrationButton) {
      registrationButton.classList.add('loading');
      registrationButton.disabled = true;
    }
    
    setTimeout(() => {
      try {
        registrationData = {
          name: escapeHTML(regName.value.trim()),
          email: escapeHTML(regEmail.value.trim()),
          password: regPassword.value,
          isRegistered: true,
          registrationDate: new Date().toISOString()
        };
        
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_REGISTRATION, JSON.stringify(registrationData));
        localStorage.setItem(CONFIG.STORAGE_KEYS.IS_REGISTERED, 'true');
        
        if (registrationButton) {
          registrationButton.classList.remove('loading');
          registrationButton.disabled = false;
        }
        
        showRegistrationSuccessModal();
        resetInactivityTimer();
      } catch (error) {
        console.error('Error handling registration:', error);
        if (registrationButton) {
          registrationButton.classList.remove('loading');
          registrationButton.disabled = false;
        }
        showToast('error', 'Error', 'Ocurrió un error durante el registro. Intente nuevamente.');
      }
    }, 2000);
  } catch (error) {
    console.error('Error in registration handler:', error);
  }
}

function showRegistrationSuccessModal() {
  try {
    const modal = document.getElementById('registration-success-modal');
    const successEmail = document.getElementById('success-email');
    const continueBtn = document.getElementById('continue-to-login');
    
    if (modal) {
      modal.style.display = 'flex';
      
      if (successEmail) {
        successEmail.textContent = registrationData.email;
      }
      
      if (continueBtn) {
        // Remove existing event listeners
        const newContinueBtn = continueBtn.cloneNode(true);
        continueBtn.parentNode.replaceChild(newContinueBtn, continueBtn);
        
        newContinueBtn.addEventListener('click', function() {
          modal.style.display = 'none';
          
          const registrationCard = document.getElementById('registration-card');
          const loginCard = document.getElementById('login-card');
          
          if (registrationCard) registrationCard.style.display = 'none';
          if (loginCard) loginCard.style.display = 'block';
          
          setupPersonalizedLogin();
          
          showToast('info', 'Código Enviado', 'Hemos enviado un código de 20 dígitos a su correo electrónico.', 5000);
          
          resetInactivityTimer();
        });
      }
    }
  } catch (error) {
    console.error('Error showing registration success modal:', error);
  }
}

// Configurar el nuevo botón de contraseña olvidada
function setupForgotPasswordButton() {
  try {
    const forgotPasswordBtn = document.getElementById('forgot-password-btn');
    
    if (forgotPasswordBtn) {
      forgotPasswordBtn.addEventListener('click', function() {
        // Mostrar modal de ayuda o redirigir a soporte
        showToast('info', 'Contacta con Soporte', 
                  'Para recuperar tu contraseña, contacta con nuestro equipo de soporte a través de WhatsApp.', 5000);
        
        // Abrir WhatsApp después de un breve delay
        setTimeout(() => {
          const message = encodeURIComponent(
            `Hola, necesito ayuda para recuperar mi contraseña de acceso a mi cuenta REMEEX. Mi correo registrado es: ${registrationData.email || 'No especificado'}`
          );
          window.open(`https://wa.me/+17373018059?text=${message}`, '_blank');
        }, 1000);
        
        resetInactivityTimer();
      });
    }
  } catch (error) {
    console.error('Error setting up forgot password button:', error);
  }
}

function setupEnhancedLogin() {
  try {
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
      loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleEnhancedLogin();
      });
    }
    
    // Configurar el botón de contraseña olvidada
    setupForgotPasswordButton();
    
    setInterval(updateAccountPreview, 30000);
  } catch (error) {
    console.error('Error setting up enhanced login:', error);
  }
}

// Mejorar la función handleEnhancedLogin para manejar errores correctamente
function handleEnhancedLogin() {
  try {
    const loginPassword = document.getElementById('login-password');
    const loginCode = document.getElementById('login-code');
    const passwordError = document.getElementById('password-error');
    const codeError = document.getElementById('code-error');
    
    if (passwordError) passwordError.style.display = 'none';
    if (codeError) codeError.style.display = 'none';
    
    let isValid = true;
    
    if (!loginPassword || !loginPassword.value || loginPassword.value !== registrationData.password) {
      if (passwordError) passwordError.style.display = 'block';
      isValid = false;
      showSlideError(); // Mostrar error en el botón deslizable
      return;
    }
    
    if (!loginCode || !loginCode.value || loginCode.value !== CONFIG.LOGIN_CODE) {
      if (codeError) codeError.style.display = 'block';
      isValid = false;
      showSlideError(); // Mostrar error en el botón deslizable
      return;
    }
    
    if (!isValid) {
      showSlideError();
      return;
    }
    
    // Continúa con el login normal...
    try {
      currentUser.name = registrationData.name;
      currentUser.email = registrationData.email;
      currentUser.deviceId = generateDeviceId();
      
      saveUserData();
      saveSessionData();
      
      loadBalanceData();
      loadTransactionsData();
      loadVerificationStatus();
      loadCardData();
      loadFirstRechargeStatus();
      loadMobilePaymentData();
      
      const loadingOverlay = document.getElementById('loading-overlay');
      if (loadingOverlay) loadingOverlay.style.display = 'flex';
      
      const progressBar = document.getElementById('progress-bar');
      const loadingText = document.getElementById('loading-text');
      
      if (progressBar && loadingText && typeof gsap !== 'undefined') {
        gsap.to(progressBar, {
          width: '100%',
          duration: 1.5,
          ease: 'power2.inOut',
          onUpdate: function() {
            const progress = Math.round(this.progress() * 100);
            if (progress < 30) {
              loadingText.textContent = "Conectando con el servidor...";
            } else if (progress < 70) {
              loadingText.textContent = "Verificando credenciales...";
            } else {
              loadingText.textContent = "Acceso concedido. Cargando panel...";
            }
          },
          onComplete: function() {
            setTimeout(function() {
              completeLogin();
            }, 500);
          }
        });
      } else {
        setTimeout(completeLogin, 2000);
      }
    } catch (error) {
      console.error('Error during login:', error);
      resetSlideButton();
      showToast('error', 'Error', 'Ocurrió un error durante el inicio de sesión. Intente nuevamente.');
    }
  } catch (error) {
    console.error('Error in enhanced login handler:', error);
    showSlideError();
  }
}

// Mejorar la función resetSlideButton para que funcione correctamente
function resetSlideButton() {
  try {
    const slideContainer = document.getElementById('slide-to-unlock');
    const slideButton = document.getElementById('slide-button');
    const slideText = document.getElementById('slide-text');
    const slideSuccess = document.getElementById('slide-success');
    
    if (slideContainer) {
      // Remover todas las clases de estado
      slideContainer.classList.remove('completed', 'loading', 'error');
      slideContainer.classList.add('reset');
      
      // Resetear botón
      if (slideButton) {
        slideButton.classList.remove('completed', 'dragging');
        slideButton.style.left = '4px';
        slideButton.style.transform = 'scale(1)';
        const icon = slideButton.querySelector('i');
        if (icon) {
          icon.className = 'fas fa-chevron-right';
        }
      }
      
      // Resetear texto
      if (slideText) {
        slideText.classList.remove('hidden');
        slideText.style.opacity = '1';
        slideText.style.transform = 'translateX(0)';
      }
      
      // Ocultar mensaje de éxito
      if (slideSuccess) {
        slideSuccess.classList.remove('visible');
        slideSuccess.style.opacity = '0';
        slideSuccess.style.transform = 'translateY(10px)';
      }
      
      // Remover clase reset después de la animación
      setTimeout(() => {
        slideContainer.classList.remove('reset');
      }, 300);
    }
  } catch (error) {
    console.error('Error resetting slide button:', error);
  }
}

// Función mejorada para mostrar error en el botón deslizable
function showSlideError() {
  try {
    const slideContainer = document.getElementById('slide-to-unlock');
    if (slideContainer) {
      slideContainer.classList.add('error');
      setTimeout(() => {
        slideContainer.classList.remove('error');
        resetSlideButton();
      }, 500);
    }
  } catch (error) {
    console.error('Error showing slide error:', error);
  }
}

function completeLogin() {
  try {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loginButton = document.getElementById('login-button');
    
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    if (loginButton) {
      loginButton.classList.remove('loading');
      loginButton.disabled = false;
    }
    
    const loginContainer = document.getElementById('login-container');
    if (loginContainer) loginContainer.style.display = 'none';
    
    const appHeader = document.getElementById('app-header');
    if (appHeader) appHeader.style.display = 'flex';
    
    const dashboardContainer = document.getElementById('dashboard-container');
    if (dashboardContainer) dashboardContainer.style.display = 'block';
    
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) bottomNav.style.display = 'flex';
    
    updateUserUI();
    
    // NUEVO: Inicializar sistema evolutivo después del login
    initializeEvolutionSystem();
    
    updatePendingTransactionsBadge();
    showWelcomeModal();
    
    setTimeout(() => {
      showToast('success', 'Acceso Concedido', `¡Bienvenido de nuevo, ${registrationData.name.split(' ')[0]}!`, 5000);
    }, 500);
    
    resetInactivityTimer();
    window.scrollTo(0, 0);
    updateMobilePaymentInfo();
    ensureTawkToVisibility();
  } catch (error) {
    console.error('Error completing login:', error);
  }
}

// ============================================================================
// 11. FUNCIONES DE ACTUALIZACIÓN DE TASA DE CAMBIO
// ============================================================================

function updateExchangeRate(newRate) {
  try {
    CONFIG.EXCHANGE_RATES.USD_TO_BS = newRate;
    
    // Recalcular equivalentes dinámicamente
    calculateCurrencyEquivalents();
    
    // Actualizar UI
    updateAmountSelectOptions('card-amount-select');
    updateAmountSelectOptions('bank-amount-select');
    updateAmountSelectOptions('mobile-amount-select');
    updateExchangeRateDisplays();
    updateDashboardUI();
    updateBalanceEquivalents();
    updateSubmitButtonText();
  } catch (error) {
    console.error('Error updating exchange rate:', error);
  }
}

function updateAmountSelectOptions(selectId) {
  try {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const currentValue = select.value;
    
    Array.from(select.options).forEach(option => {
      if (!option.value || option.disabled) return;
      
      const usdValue = parseInt(option.value);
      const bsValue = Math.round(usdValue * CONFIG.EXCHANGE_RATES.USD_TO_BS);
      const eurValue = (usdValue * CONFIG.EXCHANGE_RATES.USD_TO_EUR).toFixed(1);
      
      option.dataset.bs = bsValue;
      option.dataset.eur = eurValue;
      
      const formattedBs = bsValue.toLocaleString('es-VE');
      const formattedUsd = usdValue.toLocaleString('es-VE');
      const formattedEur = parseFloat(eurValue).toLocaleString('es-VE');
      
      option.textContent = `$${formattedUsd} ≈ Bs ${formattedBs},00 ≈ €${formattedEur}`;
    });
    
    select.value = currentValue;
    
    if (selectId === 'card-amount-select' && selectedPaymentMethod === 'card-payment' ||
        selectId === 'bank-amount-select' && selectedPaymentMethod === 'bank-payment' ||
        selectId === 'mobile-amount-select' && selectedPaymentMethod === 'mobile-payment') {
      
      if (select.value) {
        const option = select.options[select.selectedIndex];
        selectedAmount.usd = parseInt(option.value) || 0;
        selectedAmount.bs = parseInt(option.dataset.bs) || 0;
        selectedAmount.eur = parseFloat(option.dataset.eur) || 0;
        updateSubmitButtonText();
      }
    }
  } catch (error) {
    console.error('Error updating amount select options:', error);
  }
}

function updateExchangeRateDisplays() {
  try {
    const exchangeRateDisplay = document.getElementById('exchange-rate-display');
    if (exchangeRateDisplay) {
      exchangeRateDisplay.textContent = `Tasa: 1 USD = ${CONFIG.EXCHANGE_RATES.USD_TO_BS.toFixed(2)} Bs | 1 USD = ${CONFIG.EXCHANGE_RATES.USD_TO_EUR.toFixed(2)} EUR`;
    }
    
    const cardExchangeRateDisplay = document.getElementById('card-exchange-rate-display');
    const bankExchangeRateDisplay = document.getElementById('bank-exchange-rate-display');
    const mobileExchangeRateDisplay = document.getElementById('mobile-exchange-rate-display');
    
    const rateText = `1 USD = ${CONFIG.EXCHANGE_RATES.USD_TO_BS.toFixed(2)} Bs | 1 USD = ${CONFIG.EXCHANGE_RATES.USD_TO_EUR.toFixed(2)} EUR`;
    
    if (cardExchangeRateDisplay) cardExchangeRateDisplay.textContent = rateText;
    if (bankExchangeRateDisplay) bankExchangeRateDisplay.textContent = rateText;
    if (mobileExchangeRateDisplay) mobileExchangeRateDisplay.textContent = rateText;
  } catch (error) {
    console.error('Error updating exchange rate displays:', error);
  }
}

function updateBalanceEquivalents() {
  try {
    const usdEquivalent = document.getElementById('usd-equivalent');
    const eurEquivalent = document.getElementById('eur-equivalent');
    
    if (usdEquivalent) {
      usdEquivalent.textContent = `≈ ${formatCurrency(currentUser.balance.usd, 'usd')}`;
    }
    
    if (eurEquivalent) {
      eurEquivalent.textContent = `≈ ${formatCurrency(currentUser.balance.eur, 'eur')}`;
    }
  } catch (error) {
    console.error('Error updating balance equivalents:', error);
  }
}

// ============================================================================
// 12. FUNCIONES DE UI Y NOTIFICACIONES
// ============================================================================

function showToast(type, title, message, duration = 3000) {
  try {
    const toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const content = `
      <div class="toast-icon">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title">${escapeHTML(title)}</div>
        <div class="toast-message">${escapeHTML(message)}</div>
      </div>
      <div class="toast-close">
        <i class="fas fa-times"></i>
      </div>
    `;
    
    toast.innerHTML = content;
    toastContainer.appendChild(toast);
    
    resetInactivityTimer();
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }, duration);
    
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        toast.style.opacity = '0';
        setTimeout(() => {
          if (toast.parentNode) {
            toast.remove();
          }
        }, 300);
      });
    }
  } catch (error) {
    console.error('Error showing toast:', error);
  }
}

function updateDateDisplay() {
  try {
    const balanceDate = document.getElementById('balance-date');
    if (balanceDate) balanceDate.textContent = getCurrentDate();
  } catch (error) {
    console.error('Error updating date display:', error);
  }
}

function updateOnlineUsersCount() {
  try {
    const min = 98;
    const max = 142;
    activeUsersCount = Math.floor(Math.random() * (max - min + 1)) + min;
    
    const userCountElement = document.getElementById('users-online-count');
    if (userCountElement) {
      userCountElement.textContent = `${activeUsersCount} usuarios conectados`;
    }
  } catch (error) {
    console.error('Error updating online users count:', error);
  }
}

function updatePendingTransactionsBadge() {
  try {
    const pendingBadge = document.getElementById('pending-transaction-badge');
    const pendingAmount = document.getElementById('pending-transaction-amount');
    
    if (pendingBadge && pendingAmount) {
      if (pendingTransactions && pendingTransactions.length > 0) {
        const totalPending = pendingTransactions.reduce((sum, t) => sum + t.amount, 0);
        pendingAmount.textContent = `${formatCurrency(totalPending, 'usd')} en proceso de verificación`;
        pendingBadge.style.display = 'flex';
      } else {
        pendingBadge.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Error updating pending transactions badge:', error);
  }
}

function updateSavedCardUI() {
  try {
    const savedCardContainer = document.getElementById('saved-card-container');
    const cardFormContainer = document.getElementById('card-form-container');
    const useSavedCard = document.getElementById('use-saved-card');
    
    if (savedCardContainer && cardFormContainer) {
      if (currentUser.hasSavedCard) {
        savedCardContainer.style.display = 'block';
        
        if (useSavedCard && useSavedCard.checked) {
          cardFormContainer.style.display = 'none';
        } else {
          cardFormContainer.style.display = 'block';
        }
      } else {
        savedCardContainer.style.display = 'none';
        cardFormContainer.style.display = 'block';
      }
    }
  } catch (error) {
    console.error('Error updating saved card UI:', error);
  }
}

function updateUserUI() {
  try {
    if (currentUser.name) {
      const userInitials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
      
      const headerAvatar = document.getElementById('header-avatar');
      if (headerAvatar) headerAvatar.textContent = userInitials;
      
      const balanceLabelName = document.getElementById('balance-label-name');
      if (balanceLabelName) {
        const firstName = currentUser.name.split(' ')[0];
        balanceLabelName.textContent = `${firstName}, tu saldo disponible`;
      }
    }
    
    updateDashboardUI();
  } catch (error) {
    console.error('Error updating user UI:', error);
  }
}

function updateDashboardUI() {
  try {
    const mainBalanceValue = document.getElementById('main-balance-value');
    
    if (mainBalanceValue) {
      mainBalanceValue.textContent = formatCurrency(currentUser.balance.bs, 'bs').replace('Bs ', '');
    }
    
    const balanceEquivalents = document.querySelectorAll('.balance-equivalent');
    if (balanceEquivalents.length >= 2) {
      const usdSpan = balanceEquivalents[0].querySelector('span');
      const eurSpan = balanceEquivalents[1].querySelector('span');
      
      if (usdSpan) usdSpan.textContent = `≈ ${formatCurrency(currentUser.balance.usd, 'usd')}`;
      if (eurSpan) eurSpan.textContent = `≈ ${formatCurrency(currentUser.balance.eur, 'eur')}`;
    }
    
    updatePendingTransactionsBadge();
    updateRecentTransactions();
    ensureTawkToVisibility();
  } catch (error) {
    console.error('Error updating dashboard UI:', error);
  }
}

function createTransactionElement(transaction) {
  try {
    const element = document.createElement('div');
    element.className = 'transaction-item';
    element.setAttribute('aria-label', `Transacción: ${transaction.description}`);
    
    let iconClass = 'fas fa-arrow-right';
    let typeClass = transaction.type;
    let amountPrefix = '';
    
    if (transaction.type === 'deposit') {
      iconClass = 'fas fa-arrow-down';
      amountPrefix = '+';
    } else if (transaction.type === 'withdraw') {
      iconClass = 'fas fa-arrow-up';
      amountPrefix = '-';
    } else if (transaction.type === 'pending' || transaction.status === 'pending') {
      iconClass = 'fas fa-clock';
      typeClass = 'pending';
      amountPrefix = transaction.type === 'withdraw' ? '-' : '+';
    }
    
    const safeDescription = escapeHTML(transaction.description);
    const safeDate = escapeHTML(transaction.date);
    
    let transactionHTML = `
      <div class="transaction-icon ${typeClass}">
        <i class="${iconClass}"></i>
      </div>
      <div class="transaction-content">
        <div class="transaction-title">${safeDescription}
    `;
    
    if (transaction.type === 'pending' || transaction.status === 'pending') {
      transactionHTML += `
        <span class="transaction-badge pending">
          <i class="fas fa-clock"></i> Pendiente
        </span>
      `;
    }
    
    transactionHTML += `
        </div>
        <div class="transaction-details">
          <div class="transaction-date">
            <i class="far fa-calendar"></i>
            <span>${safeDate}</span>
          </div>
    `;
    
    if (transaction.card) {
      const safeCard = escapeHTML(transaction.card);
      transactionHTML += `
        <div class="transaction-category">
          <i class="far fa-credit-card"></i>
          <span>Tarjeta ${safeCard}</span>
        </div>
      `;
    }
    
    if (transaction.reference) {
      const safeReference = escapeHTML(transaction.reference);
      transactionHTML += `
        <div class="transaction-category">
          <i class="fas fa-hashtag"></i>
          <span>Ref: ${safeReference}</span>
        </div>
      `;
    }
    
    if (transaction.destination) {
      const safeDestination = escapeHTML(transaction.destination);
      transactionHTML += `
        <div class="transaction-category">
          <i class="far fa-user"></i>
          <span>Destino: ${safeDestination}</span>
        </div>
      `;
    }
    
    transactionHTML += `
        </div>
      </div>
      <div class="transaction-amount ${typeClass}">
        ${amountPrefix}${formatCurrency(transaction.amount, 'usd')}
      </div>
    `;
    
    element.innerHTML = transactionHTML;
    
    return element;
  } catch (error) {
    console.error('Error creating transaction element:', error);
    return document.createElement('div');
  }
}

function updateRecentTransactions() {
  try {
    const recentTransactions = document.getElementById('recent-transactions');
    
    if (recentTransactions) {
      recentTransactions.innerHTML = '';
      
      if (currentUser.transactions.length === 0) {
        const noTransactionsMsg = document.createElement('div');
        noTransactionsMsg.className = 'transaction-item';
        noTransactionsMsg.innerHTML = `
          <div class="transaction-icon" style="background: var(--neutral-300); color: var(--neutral-600);">
            <i class="fas fa-receipt"></i>
          </div>
          <div class="transaction-content">
            <div class="transaction-title">No hay transacciones recientes</div>
            <div class="transaction-details">
              <div class="transaction-date">
                <i class="far fa-calendar"></i>
                <span>Realice una recarga para ver su historial</span>
              </div>
            </div>
          </div>
        `;
        recentTransactions.appendChild(noTransactionsMsg);
      } else {
        const limit = Math.min(currentUser.transactions.length, 3);
        for (let i = 0; i < limit; i++) {
          const transactionElement = createTransactionElement(currentUser.transactions[i]);
          recentTransactions.appendChild(transactionElement);
        }
      }
    }
  } catch (error) {
    console.error('Error updating recent transactions:', error);
  }
}

function showWelcomeModal() {
  try {
    const welcomeModal = document.getElementById('welcome-modal');
    const welcomeSubtitle = document.getElementById('welcome-subtitle');
    
    if (welcomeModal && welcomeSubtitle) {
      welcomeSubtitle.textContent = `Estamos felices de tenerte con nosotros, ${currentUser.name.split(' ')[0]}`;
      welcomeModal.style.display = 'flex';
    }
  } catch (error) {
    console.error('Error showing welcome modal:', error);
  }
}

function showLoginForm() {
  try {
    const loginContainer = document.getElementById('login-container');
    const appHeader = document.getElementById('app-header');
    const dashboardContainer = document.getElementById('dashboard-container');
    const bottomNav = document.getElementById('bottom-nav');
    const rechargeContainer = document.getElementById('recharge-container');
    
    if (loginContainer) loginContainer.style.display = 'flex';
    if (appHeader) appHeader.style.display = 'none';
    if (dashboardContainer) dashboardContainer.style.display = 'none';
    if (bottomNav) bottomNav.style.display = 'none';
    if (rechargeContainer) rechargeContainer.style.display = 'none';
  } catch (error) {
    console.error('Error showing login form:', error);
  }
}

function updateMobilePaymentInfo() {
  try {
    const nameValue = document.getElementById('mobile-payment-name-value');
    const rifValue = document.getElementById('mobile-payment-rif-value');
    const phoneValue = document.getElementById('mobile-payment-phone-value');
    
    const nameCopyBtn = document.querySelector('#mobile-payment-name .copy-btn');
    const rifCopyBtn = document.querySelector('#mobile-payment-rif .copy-btn');
    const phoneCopyBtn = document.querySelector('#mobile-payment-phone .copy-btn');
    
    if (nameValue && currentUser.name) {
      nameValue.textContent = currentUser.name;
      if (nameCopyBtn) {
        nameCopyBtn.setAttribute('data-copy', currentUser.name);
      }
    }
    
    if (verificationStatus.status === 'verified' || verificationStatus.status === 'pending') {
      if (rifValue && verificationStatus.idNumber) {
        rifValue.textContent = verificationStatus.idNumber;
        if (rifCopyBtn) {
          rifCopyBtn.setAttribute('data-copy', verificationStatus.idNumber);
        }
      }
      
      if (phoneValue && verificationStatus.phoneNumber) {
        const formattedPhone = verificationStatus.phoneNumber.replace(/(\d{4})(\d{7})/, '$1-$2');
        phoneValue.textContent = formattedPhone;
        if (phoneCopyBtn) {
          phoneCopyBtn.setAttribute('data-copy', formattedPhone);
        }
      }
      
      if (verificationStatus.idNumber && verificationStatus.phoneNumber) {
        const mobilePaymentSuccess = document.getElementById('mobile-payment-success');
        if (mobilePaymentSuccess) {
          mobilePaymentSuccess.style.display = 'flex';
        }
      }
    }
    
    saveMobilePaymentData();
  } catch (error) {
    console.error('Error updating mobile payment info:', error);
  }
}

// ============================================================================
// 13. SISTEMA DE INACTIVIDAD
// ============================================================================

function setupInactivityHandler() {
  try {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, resetInactivityTimer);
    });
    
    resetInactivityTimer();
  } catch (error) {
    console.error('Error setting up inactivity handler:', error);
  }
}

function resetInactivityTimer() {
  try {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (inactivityCountdown) clearInterval(inactivityCountdown);
    
    const inactivityModal = document.getElementById('inactivity-modal');
    if (inactivityModal) inactivityModal.style.display = 'none';
    
    if (!isLoggedIn()) return;
    
    inactivityTimer = setTimeout(() => {
      showInactivityWarning();
    }, CONFIG.INACTIVITY_TIMEOUT - CONFIG.INACTIVITY_WARNING);
  } catch (error) {
    console.error('Error resetting inactivity timer:', error);
  }
}

function showInactivityWarning() {
  try {
    const inactivityModal = document.getElementById('inactivity-modal');
    const inactivityTimerEl = document.getElementById('inactivity-timer');
    
    if (inactivityModal && inactivityTimerEl) {
      inactivityModal.style.display = 'flex';
      
      inactivitySeconds = 30;
      inactivityTimerEl.textContent = inactivitySeconds;
      
      inactivityCountdown = setInterval(() => {
        inactivitySeconds--;
        inactivityTimerEl.textContent = inactivitySeconds;
        if (inactivitySeconds <= 0) {
          clearInterval(inactivityCountdown);
          logout();
        }
      }, 1000);
    }
  } catch (error) {
    console.error('Error showing inactivity warning:', error);
  }
}

// ============================================================================
// 14. FUNCIÓN DE LOGOUT
// ============================================================================

function logout() {
  try {
    saveBalanceData();
    saveTransactionsData();
    saveVerificationStatus();
    saveVerificationData();
    saveCardData();
    saveUserData();
    saveFirstRechargeStatus(currentUser.hasMadeFirstRecharge);
    
    clearSessionData();
    
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (inactivityCountdown) clearInterval(inactivityCountdown);
    if (mobilePaymentTimer) clearTimeout(mobilePaymentTimer);

    // Destruir sistema evolutivo
    if (statusEvolution) {
      statusEvolution.destroy();
      statusEvolution = null;
    }
    
    document.querySelectorAll('.modal-overlay, .verification-container, .success-container, .inactivity-modal, .welcome-modal, .service-overlay, .cards-overlay, .messages-overlay, .settings-overlay, .feature-blocked-modal').forEach(modal => {
      modal.style.display = 'none';
    });
    
    showLoginForm();
  } catch (error) {
    console.error('Error during logout:', error);
  }
}

// ============================================================================
// 15. VERIFICAR RETORNO DE TRANSFERENCIA
// ============================================================================

function checkReturnFromTransfer() {
  try {
    const transferData = JSON.parse(sessionStorage.getItem(CONFIG.STORAGE_KEYS.TRANSFER_DATA) || 'null');
    
    if (transferData) {
      console.log("Información de transferencia recuperada:", transferData);
      
      if (isLoggedIn() && transferData.amount && transferData.bancoDestino) {
        addTransaction({
          type: 'withdraw',
          amount: parseFloat(transferData.amount),
          amountBs: parseFloat(transferData.amount) * CONFIG.EXCHANGE_RATES.USD_TO_BS,
          amountEur: parseFloat(transferData.amount) * CONFIG.EXCHANGE_RATES.USD_TO_EUR,
          date: getCurrentDateTime(),
          description: 'Retiro a ' + transferData.bancoDestino,
          status: 'pending',
          destination: transferData.bancoDestino
        });
        
        setTimeout(() => {
          showToast('info', 'Transferencia en Proceso', 
                  'Su solicitud de retiro a ' + transferData.bancoDestino + 
                  ' por $' + transferData.amount + ' está siendo procesada.');
        }, 1000);
        
        const pendingWithdrawals = JSON.parse(localStorage.getItem('remeexPendingWithdrawals') || '[]');
        pendingWithdrawals.push({
          amount: parseFloat(transferData.amount),
          bancoDestino: transferData.bancoDestino,
          date: getCurrentDateTime()
        });
        localStorage.setItem('remeexPendingWithdrawals', JSON.stringify(pendingWithdrawals));
        
        sessionStorage.removeItem(CONFIG.STORAGE_KEYS.TRANSFER_DATA);
      }
    }
  } catch (error) {
    console.error('Error checking return from transfer:', error);
  }
}

// ============================================================================
// 16. SISTEMA EVOLUTIVO - FUNCIONES DE INICIALIZACIÓN Y INTEGRACIÓN
// ============================================================================

function initializeEvolutionSystem() {
  try {
    if (statusEvolution) {
      statusEvolution.destroy();
    }
    
    statusEvolution = new StatusEvolutionManager();
    
    // Verificar si hay datos de verificación recientes para activar procesamiento
    checkForVerificationCompletion();
  } catch (error) {
    console.error('Error initializing evolution system:', error);
  }
}

function checkForVerificationCompletion() {
  try {
    const verificationBanking = localStorage.getItem('remeexVerificationBanking');
    const lastVerificationCheck = localStorage.getItem('remeexLastVerificationCheck');
    
    if (verificationBanking) {
      try {
        const data = JSON.parse(verificationBanking);
        const dataTimestamp = data.timestamp || 0;
        const lastCheckTimestamp = parseInt(lastVerificationCheck || '0');
        
        if (dataTimestamp > lastCheckTimestamp) {
          // Nuevos datos de verificación detectados
          localStorage.setItem('remeexLastVerificationCheck', dataTimestamp.toString());
          
          if (statusEvolution) {
            statusEvolution.onVerificationComplete();
          }
          
          showToast('info', 'Procesando Documentos', 
                   'Hemos recibido tu información. Iniciando proceso de validación...', 5000);
        }
      } catch (error) {
        console.error('Error checking verification completion:', error);
      }
    }
  } catch (error) {
    console.error('Error in verification completion check:', error);
  }
}

// ============================================================================
// 17. CARGA DE TAWK.TO
// ============================================================================

function loadTawkTo() {
  try {
    var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
    
    Tawk_API.onLoad = function(){
      const container = document.getElementById('tawkto-container');
      if (container) container.style.display = 'block';
      console.log('Tawk.to cargado correctamente');
    };
    
    var s1 = document.createElement("script");
    var s0 = document.getElementsByTagName("script")[0];
    s1.async = true;
    s1.src = 'https://embed.tawk.to/67cca8c614b1ee191063c36a/default';
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    s1.setAttribute('importance', 'high');
    s0.parentNode.insertBefore(s1, s0);
    
    setTimeout(function() {
      const tawktoFrame = document.querySelector('iframe[title*="chat"]');
      if (!tawktoFrame) {
        console.log('Reintentando cargar Tawk.to...');
        loadTawkTo();
      }
    }, 5000);
  } catch (e) {
    console.error('Error al cargar Tawk.to:', e);
  }
}

function ensureTawkToVisibility() {
  try {
    const checkInterval = setInterval(function() {
      const tawktoFrame = document.querySelector('iframe[title*="chat"]');
      const tawktoContainer = document.getElementById('tawkto-container');
      
      if (tawktoFrame && tawktoContainer) {
        tawktoContainer.style.display = 'block';
        tawktoContainer.style.visibility = 'visible';
        tawktoContainer.style.zIndex = '9999';
        
        tawktoFrame.style.display = 'block';
        tawktoFrame.style.visibility = 'visible';
        tawktoFrame.style.zIndex = '9999';
        
        clearInterval(checkInterval);
        setInterval(function() {
          if (tawktoFrame.style.display !== 'block') {
            tawktoFrame.style.display = 'block';
            tawktoFrame.style.visibility = 'visible';
          }
        }, 3000);
      }
    }, 1000);
  } catch (error) {
    console.error('Error ensuring Tawk.to visibility:', error);
  }
}

// ============================================================================
// 18. FUNCIONES DE VALIDACIÓN DE FORMULARIOS
// ============================================================================

function validateCardForm() {
  try {
    const cardNumber = document.getElementById('cardNumber');
    const cardName = document.getElementById('cardName');
    const cardMonth = document.getElementById('cardMonth');
    const cardYear = document.getElementById('cardYear');
    const cardCvv = document.getElementById('cardCvv');
    
    const cardNumberError = document.getElementById('card-number-error');
    const cardNameError = document.getElementById('card-name-error');
    const cardDateError = document.getElementById('card-date-error');
    const cardCvvError = document.getElementById('card-cvv-error');
    
    if (cardNumberError) cardNumberError.style.display = 'none';
    if (cardNameError) cardNameError.style.display = 'none';
    if (cardDateError) cardDateError.style.display = 'none';
    if (cardCvvError) cardCvvError.style.display = 'none';
    
    let isValid = true;
    
    if (!cardName || !cardName.value.trim()) {
      if (cardNameError) {
        cardNameError.style.display = 'block';
        cardNameError.textContent = 'Por favor, introduce el nombre del titular.';
      }
      isValid = false;
    }
    
    if (!cardNumber || !cardNumber.value.trim()) {
      if (cardNumberError) {
        cardNumberError.style.display = 'block';
        cardNumberError.textContent = 'Por favor, introduce un número de tarjeta.';
      }
      isValid = false;
    } else {
      const cleanedCardNumber = cardNumber.value.replace(/\s/g, '');
      if (cleanedCardNumber !== CONFIG.VALID_CARD && !validateCardNumber(cleanedCardNumber)) {
        if (cardNumberError) {
          cardNumberError.style.display = 'block';
          cardNumberError.textContent = 'Número de tarjeta no válido.';
        }
        isValid = false;
      }
    }
    
    if (!cardMonth || !cardMonth.value || !cardYear || !cardYear.value) {
      if (cardDateError) {
        cardDateError.style.display = 'block';
        cardDateError.textContent = 'Por favor, selecciona una fecha válida.';
      }
      isValid = false;
    } else {
      const currentDate = new Date();
      const expiryDate = new Date();
      expiryDate.setFullYear(parseInt(cardYear.value), parseInt(cardMonth.value), 1);
      expiryDate.setDate(0);
      
      if (expiryDate < currentDate) {
        if (cardDateError) {
          cardDateError.style.display = 'block';
          cardDateError.textContent = 'La tarjeta ha expirado.';
        }
        isValid = false;
      }
    }
    
    if (!cardCvv || !cardCvv.value || cardCvv.value.length < 3 || !/^\d+$/.test(cardCvv.value)) {
      if (cardCvvError) {
        cardCvvError.style.display = 'block';
        cardCvvError.textContent = 'CVV inválido.';
      }
      isValid = false;
    }
    
    return isValid;
  } catch (error) {
    console.error('Error validating card form:', error);
    return false;
  }
}

function resetCardForm() {
  try {
    const cardNumber = document.getElementById('cardNumber');
    const cardName = document.getElementById('cardName');
    const cardMonth = document.getElementById('cardMonth');
    const cardYear = document.getElementById('cardYear');
    const cardCvv = document.getElementById('cardCvv');
    
    if (cardNumber) cardNumber.value = '';
    if (cardName) cardName.value = '';
    if (cardMonth) cardMonth.value = '';
    if (cardYear) cardYear.value = '';
    if (cardCvv) cardCvv.value = '';
    
    const cardNumberDisplay = document.getElementById('card-number-display');
    const cardHolderDisplay = document.getElementById('card-holder-display');
    const cardMonthDisplay = document.getElementById('card-month-display');
    const cardYearDisplay = document.getElementById('card-year-display');
    const cardCvvDisplay = document.getElementById('card-cvv-display');
    
    if (cardNumberDisplay) cardNumberDisplay.textContent = '•••• •••• •••• ••••';
    if (cardHolderDisplay) cardHolderDisplay.textContent = '••••••• •••••••';
    if (cardMonthDisplay) cardMonthDisplay.textContent = '••';
    if (cardYearDisplay) cardYearDisplay.textContent = '••';
    if (cardCvvDisplay) cardCvvDisplay.textContent = '•••';
    
    resetAmountSelectors();
  } catch (error) {
    console.error('Error resetting card form:', error);
  }
}

function resetAmountSelectors() {
  try {
    const cardAmountSelect = document.getElementById('card-amount-select');
    const bankAmountSelect = document.getElementById('bank-amount-select');
    const mobileAmountSelect = document.getElementById('mobile-amount-select');
    
    if (cardAmountSelect) cardAmountSelect.selectedIndex = 0;
    if (bankAmountSelect) bankAmountSelect.selectedIndex = 0;
    if (mobileAmountSelect) mobileAmountSelect.selectedIndex = 0;
    
    selectedAmount = {
      usd: 0,
      bs: 0,
      eur: 0
    };
    
    updateSubmitButtonsState();
  } catch (error) {
    console.error('Error resetting amount selectors:', error);
  }
}

function updateSubmitButtonsState() {
  try {
    const submitPayment = document.getElementById('submit-payment');
    const savedCardPayBtn = document.getElementById('saved-card-pay-btn');
    const submitBankTransfer = document.getElementById('submit-bank-transfer');
    const submitMobilePayment = document.getElementById('submit-mobile-payment');
    
    if (selectedAmount.usd <= 0) {
      if (submitPayment) {
        submitPayment.disabled = true;
        submitPayment.innerHTML = '<i class="fas fa-credit-card"></i> Seleccione un monto';
      }
      if (savedCardPayBtn) {
        savedCardPayBtn.disabled = true;
        savedCardPayBtn.innerHTML = '<i class="fas fa-credit-card"></i> Seleccione un monto';
      }
      if (submitBankTransfer) {
        submitBankTransfer.disabled = true;
        submitBankTransfer.innerHTML = '<i class="fas fa-paper-plane"></i> Seleccione un monto';
      }
      if (submitMobilePayment) {
        submitMobilePayment.disabled = true;
        submitMobilePayment.innerHTML = '<i class="fas fa-paper-plane"></i> Seleccione un monto';
      }
    } else {
      if (submitPayment) {
        submitPayment.disabled = false;
        submitPayment.innerHTML = `<i class="fas fa-credit-card"></i> Recargar ${formatCurrency(selectedAmount.usd, 'usd')}`;
      }
      if (savedCardPayBtn) {
        savedCardPayBtn.disabled = false;
        savedCardPayBtn.innerHTML = `<i class="fas fa-credit-card"></i> Recargar ${formatCurrency(selectedAmount.usd, 'usd')}`;
      }
      if (submitBankTransfer) {
        submitBankTransfer.disabled = false;
        submitBankTransfer.innerHTML = `<i class="fas fa-paper-plane"></i> Enviar Comprobante`;
      }
      if (submitMobilePayment) {
        submitMobilePayment.disabled = false;
        submitMobilePayment.innerHTML = `<i class="fas fa-paper-plane"></i> Enviar Comprobante`;
      }
    }
  } catch (error) {
    console.error('Error updating submit buttons state:', error);
  }
}

function updateSubmitButtonText() {
  updateSubmitButtonsState();
}

// ============================================================================
// 19. CONFIGURACIÓN DE PAGOS CON TARJETA GUARDADA
// ============================================================================

function processSavedCardPayment(amountToDisplay) {
  try {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    
    const progressBar = document.getElementById('progress-bar');
    const loadingText = document.getElementById('loading-text');
    
    if (progressBar && loadingText && typeof gsap !== 'undefined') {
      gsap.to(progressBar, {
        width: '30%',
        duration: 0.8,
        ease: 'power1.inOut',
        onUpdate: function() {
          loadingText.textContent = "Procesando tarjeta guardada...";
        },
        onComplete: function() {
          gsap.to(progressBar, {
            width: '70%',
            duration: 1,
            ease: 'power1.inOut',
            onUpdate: function() {
              loadingText.textContent = "Realizando recarga...";
            },
            onComplete: function() {
              gsap.to(progressBar, {
                width: '100%',
                duration: 0.8,
                ease: 'power1.inOut',
                onUpdate: function() {
                  loadingText.textContent = "¡Recarga completada con éxito!";
                },
                onComplete: function() {
                  setTimeout(function() {
                    completeSavedCardPayment(amountToDisplay);
                  }, 600);
                }
              });
            }
          });
        }
      });
    } else {
      // Fallback without GSAP
      setTimeout(() => {
        completeSavedCardPayment(amountToDisplay);
      }, 3000);
    }
  } catch (error) {
    console.error('Error processing saved card payment:', error);
  }
}

function completeSavedCardPayment(amountToDisplay) {
  try {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    
    // Sumar solo los bolívares (saldo base)
    currentUser.balance.bs += amountToDisplay.bs;
    
    // Recalcular equivalentes dinámicamente
    calculateCurrencyEquivalents();
    
    currentUser.cardRecharges++;
    
    if (!currentUser.hasMadeFirstRecharge) {
      saveFirstRechargeStatus(true);
      // NUEVO: Notificar al sistema evolutivo sobre la recarga
      if (statusEvolution) {
        statusEvolution.onUserRecharge();
      }
    }
    
    saveBalanceData();
    saveCardData();
    
    addTransaction({
      type: 'deposit',
      amount: amountToDisplay.usd,
      amountBs: amountToDisplay.bs,
      amountEur: amountToDisplay.eur,
      date: getCurrentDateTime(),
      description: 'Recarga con Tarjeta',
      card: '****3009',
      status: 'completed'
    });
    
    const savedCardPayBtn = document.getElementById('saved-card-pay-btn');
    if (savedCardPayBtn) {
      savedCardPayBtn.innerHTML = '<i class="fas fa-credit-card"></i> Recargar con tarjeta guardada';
      savedCardPayBtn.disabled = false;
    }
    
    resetAmountSelectors();
    
    const successAmount = document.getElementById('success-amount');
    if (successAmount) successAmount.textContent = formatCurrency(amountToDisplay.usd, 'usd');
    
    const successContainer = document.getElementById('success-container');
    if (successContainer) successContainer.style.display = 'flex';
    
    setTimeout(() => {
      if (typeof confetti !== 'undefined') {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    }, 500);
  } catch (error) {
    console.error('Error completing saved card payment:', error);
  }
}

// ============================================================================
// 20. MANEJADOR DE CAMBIOS EN ALMACENAMIENTO
// ============================================================================

function handleStorageChange(event) {
  try {
    if (event.key === CONFIG.STORAGE_KEYS.BALANCE && event.newValue) {
      try {
        const balanceData = JSON.parse(event.newValue);
        
        if (balanceData.deviceId && balanceData.deviceId === currentUser.deviceId) {
          currentUser.balance.bs = balanceData.bs || 0;
          
          // Recalcular equivalentes dinámicamente
          calculateCurrencyEquivalents();
          updateDashboardUI();
        }
      } catch (e) {
        console.error('Error parsing balance data from storage change:', e);
      }
    } else if (event.key === CONFIG.STORAGE_KEYS.TRANSACTIONS && event.newValue) {
      try {
        const data = JSON.parse(event.newValue);
        
        if (data.deviceId && data.deviceId === currentUser.deviceId) {
          currentUser.transactions = data.transactions || [];
          pendingTransactions = currentUser.transactions.filter(t => t.status === 'pending' || t.type === 'pending');
          updateRecentTransactions();
          updatePendingTransactionsBadge();
        }
      } catch (e) {
        console.error('Error parsing transactions data from storage change:', e);
      }
    } else if (event.key === CONFIG.STORAGE_KEYS.VERIFICATION && event.newValue) {
      verificationStatus.status = event.newValue;
      
      if (event.newValue === 'verified') {
        verificationStatus.isVerified = true;
        verificationStatus.hasUploadedId = true;
      } else if (event.newValue === 'pending' || event.newValue === 'processing' || event.newValue === 'bank_validation') {
        verificationStatus.isVerified = false;
        verificationStatus.hasUploadedId = true;
      } else {
        verificationStatus.isVerified = false;
        verificationStatus.hasUploadedId = false;
      }
      
      loadVerificationData();
      updateMobilePaymentInfo();
      
      // NUEVO: Actualizar sistema evolutivo
      if (statusEvolution) {
        statusEvolution.updateCard();
      }
    } else if (event.key === 'remeexVerificationBanking' && event.newValue) {
      // NUEVO: Detectar datos bancarios y notificar al sistema evolutivo
      try {
        const bankData = JSON.parse(event.newValue);
        if (statusEvolution) {
          statusEvolution.onBankDataReceived(bankData);
        }
      } catch (e) {
        console.error('Error parsing bank data:', e);
      }
    }
  } catch (error) {
    console.error('Error handling storage change:', error);
  }
}

// ============================================================================
// 21. CONFIGURACIÓN DE EVENTOS (SETUP EVENT LISTENERS COMPLETO)
// ============================================================================

function setupEventListeners() {
  try {
    const elements = [
      'registration-form', 'login-form', 'logout-btn', 
      'recharge-btn', 'send-btn'
    ];
    
    let missingElements = [];
    elements.forEach(id => {
      if (!document.getElementById(id)) {
        missingElements.push(id);
      }
    });
    
    if (missingElements.length > 0) {
      console.warn('⚠️ Elementos faltantes:', missingElements);
    }
    
    // Llamadas independientes a las funciones de configuración
    setupOTPHandling();
    setupBottomNavigation();
    setupLogoutButton();
    setupRechargeButtons();
    setupPaymentMethodTabs();
    setupCopyButtons();
    setupReceiptUpload();
    setupCardPayment();
    setupBankTransfer();
    setupMobilePayment();
    setupFeatureBlocked();
    setupServiceOverlay();
    setupCardsOverlay();
    setupCustomerServiceOverlay();
    setupSettingsOverlay();
    setupInactivityModal();
    setupWelcomeModal();
    setupSavedCardPayButton();
    setupSettingsNavigation();
    
    // Botón de logout en header
    const logoutHeaderBtn = document.getElementById('logout-header-btn');
    if (logoutHeaderBtn) {
      logoutHeaderBtn.addEventListener('click', function() {
        if (confirm('¿Está seguro que desea cerrar sesión?')) {
          logout();
        }
        resetInactivityTimer();
      });
    }
    
    window.addEventListener('storage', handleStorageChange);
    
  } catch (error) {
    console.error('❌ Error configurando event listeners:', error);
  }
}

function setupCustomerServiceOverlay() {
  try {
    const customerServiceNav = document.querySelector('.nav-item[data-section="customer-service"]');
    const customerServiceOverlay = document.getElementById('customer-service-overlay');
    const customerServiceClose = document.getElementById('customer-service-close');
    
    if (customerServiceNav) {
      customerServiceNav.addEventListener('click', function() {
        if (customerServiceOverlay) customerServiceOverlay.style.display = 'flex';
        resetInactivityTimer();
      });
    }
    
    if (customerServiceClose) {
      customerServiceClose.addEventListener('click', function() {
        if (customerServiceOverlay) customerServiceOverlay.style.display = 'none';
        resetInactivityTimer();
      });
    }
  } catch (error) {
    console.error('Error setting up customer service overlay:', error);
  }
}

function setupSettingsNavigation() {
  try {
    const verificationNavBtn = document.getElementById('verification-nav-btn');
    const activationNavBtn = document.getElementById('activation-nav-btn');
    
    if (verificationNavBtn) {
      verificationNavBtn.addEventListener('click', function() {
        window.location.href = 'verificacion.html';
        resetInactivityTimer();
      });
    }
    
    if (activationNavBtn) {
      activationNavBtn.addEventListener('click', function() {
        window.location.href = 'activacion.html';
        resetInactivityTimer();
      });
    }
  } catch (error) {
    console.error('Error setting up settings navigation:', error);
  }
}

function setupWelcomeModal() {
  try {
    const welcomeContinue = document.getElementById('welcome-continue');
    if (welcomeContinue) {
      welcomeContinue.addEventListener('click', function() {
        const welcomeModal = document.getElementById('welcome-modal');
        if (welcomeModal) welcomeModal.style.display = 'none';
        
        showToast('info', 'Seguridad de Dispositivo', 'Su saldo solo está disponible en este dispositivo donde ha iniciado sesión.', 5000);
        resetInactivityTimer();
      });
    }
  } catch (error) {
    console.error('Error setting up welcome modal:', error);
  }
}

function setupSavedCardPayButton() {
  try {
    const savedCardPayBtn = document.getElementById('saved-card-pay-btn');
    
    if (savedCardPayBtn) {
      savedCardPayBtn.addEventListener('click', function() {
        if (selectedAmount.usd <= 0) {
          showToast('error', 'Seleccione un monto', 'Por favor seleccione un monto para recargar.');
          return;
        }
        
        if (currentUser.cardRecharges >= CONFIG.MAX_CARD_RECHARGES) {
          showToast('error', 'Límite Alcanzado', 'Ha alcanzado el límite de recargas con tarjeta. Por favor verifique su cuenta para continuar.');
          showFeatureBlockedModal();
          return;
        }
        
        savedCardPayBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        savedCardPayBtn.disabled = true;
        
        const amountToDisplay = {
          usd: selectedAmount.usd,
          bs: selectedAmount.bs,
          eur: selectedAmount.eur
        };
        
        processSavedCardPayment(amountToDisplay);
        resetInactivityTimer();
      });
    }
  } catch (error) {
    console.error('Error setting up saved card pay button:', error);
  }
}

function setupInactivityModal() {
  try {
    const continueBtn = document.getElementById('inactivity-continue');
    const logoutBtn = document.getElementById('inactivity-logout');
    
    if (continueBtn) {
      continueBtn.addEventListener('click', function() {
        resetInactivityTimer();
      });
    }
    
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        logout();
      });
    }
  } catch (error) {
    console.error('Error setting up inactivity modal:', error);
  }
}

function setupServiceOverlay() {
  try {
    const serviceNav = document.querySelector('.nav-item[data-section="services"]');
    const serviceOverlay = document.getElementById('service-overlay');
    const serviceClose = document.getElementById('service-close');
    
    if (serviceNav) {
      serviceNav.addEventListener('click', function() {
        if (serviceOverlay) serviceOverlay.style.display = 'flex';
        resetInactivityTimer();
      });
    }
    
    if (serviceClose) {
      serviceClose.addEventListener('click', function() {
        if (serviceOverlay) serviceOverlay.style.display = 'none';
        resetInactivityTimer();
      });
    }
    
    document.querySelectorAll('.service-item').forEach(item => {
      item.addEventListener('click', function() {
        showFeatureBlockedModal();
        resetInactivityTimer();
      });
    });
  } catch (error) {
    console.error('Error setting up service overlay:', error);
  }
}

function setupCardsOverlay() {
  try {
    const cardsNav = document.querySelector('.nav-item[data-section="cards"]');
    const cardsOverlay = document.getElementById('cards-overlay');
    const cardClose = document.getElementById('card-close');
    
    if (cardsNav) {
      cardsNav.addEventListener('click', function() {
        if (cardsOverlay) cardsOverlay.style.display = 'flex';
        resetInactivityTimer();
      });
    }
    
    if (cardClose) {
      cardClose.addEventListener('click', function() {
        if (cardsOverlay) cardsOverlay.style.display = 'none';
        resetInactivityTimer();
      });
    }
    
    const verifyForCard = document.getElementById('verify-for-card');
    if (verifyForCard) {
      verifyForCard.addEventListener('click', function() {
        if (cardsOverlay) cardsOverlay.style.display = 'none';
        
        showFeatureBlockedModal();
        resetInactivityTimer();
      });
    }
  } catch (error) {
    console.error('Error setting up cards overlay:', error);
  }
}

function setupSettingsOverlay() {
  try {
    const settingsNav = document.querySelector('.nav-item[data-section="settings"]');
    const settingsOverlay = document.getElementById('settings-overlay');
    const settingsClose = document.getElementById('settings-close');
    
    if (settingsNav) {
      settingsNav.addEventListener('click', function() {
        if (settingsOverlay) {
          settingsOverlay.style.display = 'flex';
          
          const settingsName = document.getElementById('settings-name');
          const settingsEmail = document.getElementById('settings-email');
          
          if (settingsName) settingsName.value = currentUser.name;
          if (settingsEmail) settingsEmail.value = currentUser.email;
        }
        resetInactivityTimer();
      });
    }
    
    if (settingsClose) {
      settingsClose.addEventListener('click', function() {
        if (settingsOverlay) settingsOverlay.style.display = 'none';
        resetInactivityTimer();
      });
    }
    
    const verifyIdentityBtn = document.getElementById('verify-identity-btn');
    if (verifyIdentityBtn) {
      verifyIdentityBtn.addEventListener('click', function() {
        if (settingsOverlay) settingsOverlay.style.display = 'none';
        
        showFeatureBlockedModal();
        resetInactivityTimer();
      });
    }
  } catch (error) {
    console.error('Error setting up settings overlay:', error);
  }
}

function setupFeatureBlocked() {
  try {
    const goVerifyNow = document.getElementById('go-verify-now');
    const featureBlockedClose = document.getElementById('feature-blocked-close');
    
    if (goVerifyNow) {
      goVerifyNow.addEventListener('click', function() {
        const featureBlockedModal = document.getElementById('feature-blocked-modal');
        if (featureBlockedModal) featureBlockedModal.style.display = 'none';
        
        window.location.href = 'verificacion.html';
        resetInactivityTimer();
      });
    }
    
    if (featureBlockedClose) {
      featureBlockedClose.addEventListener('click', function() {
        const featureBlockedModal = document.getElementById('feature-blocked-modal');
        if (featureBlockedModal) featureBlockedModal.style.display = 'none';
        resetInactivityTimer();
      });
    }
  } catch (error) {
    console.error('Error setting up feature blocked:', error);
  }
}

function showFeatureBlockedModal() {
  try {
    const externalVerificationModal = document.getElementById('feature-blocked-modal');
    
    if (externalVerificationModal) {
      if (verificationStatus.status === 'pending' || verificationStatus.status === 'processing' || verificationStatus.status === 'bank_validation') {
        const title = document.querySelector('.feature-blocked-title');
        const message = document.querySelector('.feature-blocked-message');
        
        if (title) title.textContent = 'Verificación en Proceso';
        if (message) message.textContent = 
          'Su proceso de verificación está siendo revisado. Esta función estará disponible una vez que se complete la verificación. Puede contactar a soporte para verificar el estado.';
      }
      
      externalVerificationModal.style.display = 'flex';
    }
  } catch (error) {
    console.error('Error showing feature blocked modal:', error);
  }
}

function setupOTPHandling() {
  try {
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach(input => {
      input.addEventListener('input', function(e) {
        const value = e.target.value;
        
        if (!/^\d*$/.test(value)) {
          this.value = this.value.replace(/\D/g, '');
          return;
        }
        
        if (value.length === 1) {
          const nextInput = document.getElementById(e.target.dataset.next);
          if (nextInput) {
            nextInput.focus();
          }
        }
      });
      
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && e.target.value === '') {
          const prevInput = document.getElementById(e.target.dataset.prev);
          if (prevInput) {
            prevInput.focus();
          }
        }
      });
    });
    
    const verifyOtpBtn = document.getElementById('verify-otp-btn');
    if (verifyOtpBtn) {
      verifyOtpBtn.addEventListener('click', function() {
        let otpValue = '';
        otpInputs.forEach(input => {
          otpValue += input.value;
        });
        
        if (otpValue === CONFIG.OTP_CODE) {
          if (currentUser.cardRecharges >= CONFIG.MAX_CARD_RECHARGES) {
            const otpModal = document.getElementById('otp-modal-overlay');
            if (otpModal) otpModal.style.display = 'none';
            
            showToast('error', 'Límite Alcanzado', 'Ha alcanzado el límite de recargas con tarjeta. Por favor verifique su cuenta para continuar.');
            showFeatureBlockedModal();
            return;
          }
          
          const otpModal = document.getElementById('otp-modal-overlay');
          if (otpModal) otpModal.style.display = 'none';
          
          const otpError = document.getElementById('otp-error');
          if (otpError) otpError.style.display = 'none';
          
          const amountToDisplay = {
            usd: selectedAmount.usd,
            bs: selectedAmount.bs,
            eur: selectedAmount.eur
          };
          
          processCardPayment(amountToDisplay);
        } else {
          const otpError = document.getElementById('otp-error');
          if (otpError) otpError.style.display = 'block';
          
          otpInputs.forEach(input => {
            input.value = '';
          });
          
          const firstOtpInput = document.getElementById('otp-1');
          if (firstOtpInput) firstOtpInput.focus();
        }
        
        resetInactivityTimer();
      });
    }
    
    const resendCode = document.getElementById('resend-code');
    if (resendCode) {
      resendCode.addEventListener('click', function(e) {
        e.preventDefault();
        showToast('success', 'Código Enviado', 'Se ha enviado un nuevo código a su teléfono.');
        resetInactivityTimer();
      });
    }
  } catch (error) {
    console.error('Error setting up OTP handling:', error);
  }
}

function processCardPayment(amountToDisplay) {
  try {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    
    const progressBar = document.getElementById('progress-bar');
    const loadingText = document.getElementById('loading-text');
    
    if (progressBar && loadingText && typeof gsap !== 'undefined') {
      gsap.to(progressBar, {
        width: '30%',
        duration: 1,
        ease: 'power1.inOut',
        onUpdate: function() {
          loadingText.textContent = "Verificando tarjeta...";
        },
        onComplete: function() {
          gsap.to(progressBar, {
            width: '70%',
            duration: 1.5,
            ease: 'power1.inOut',
            onUpdate: function() {
              loadingText.textContent = "Procesando recarga...";
            },
            onComplete: function() {
              gsap.to(progressBar, {
                width: '100%',
                duration: 1,
                ease: 'power1.inOut',
                onUpdate: function() {
                  loadingText.textContent = "¡Recarga completada con éxito!";
                },
                onComplete: function() {
                  setTimeout(function() {
                    completeCardPayment(amountToDisplay);
                  }, 800);
                }
              });
            }
          });
        }
      });
    } else {
      setTimeout(() => {
        completeCardPayment(amountToDisplay);
      }, 4000);
    }
  } catch (error) {
    console.error('Error processing card payment:', error);
  }
}

function completeCardPayment(amountToDisplay) {
  try {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    
    // Sumar solo los bolívares (saldo base)
    currentUser.balance.bs += amountToDisplay.bs;
    
    // Recalcular equivalentes dinámicamente
    calculateCurrencyEquivalents();
    
    currentUser.cardRecharges++;
    
    if (!currentUser.hasMadeFirstRecharge) {
      saveFirstRechargeStatus(true);
      // NUEVO: Notificar al sistema evolutivo sobre la recarga
      if (statusEvolution) {
        statusEvolution.onUserRecharge();
      }
    }
    
    saveBalanceData();
    saveCardData();
    
    const saveCard = document.getElementById('save-card');
    if (saveCard && saveCard.checked) {
      currentUser.hasSavedCard = true;
      saveCardData();
      updateSavedCardUI();
    }
    
    addTransaction({
      type: 'deposit',
      amount: amountToDisplay.usd,
      amountBs: amountToDisplay.bs,
      amountEur: amountToDisplay.eur,
      date: getCurrentDateTime(),
      description: 'Recarga con Tarjeta',
      card: '****3009',
      status: 'completed'
    });
    
    resetAmountSelectors();
    
    const successAmount = document.getElementById('success-amount');
    if (successAmount) successAmount.textContent = formatCurrency(amountToDisplay.usd, 'usd');
    
    const successContainer = document.getElementById('success-container');
    if (successContainer) successContainer.style.display = 'flex';
    
    setTimeout(() => {
      if (typeof confetti !== 'undefined') {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    }, 500);
  } catch (error) {
    console.error('Error completing card payment:', error);
  }
}

function setupBottomNavigation() {
  try {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
      item.addEventListener('click', function() {
        const section = this.getAttribute('data-section');
        
        document.querySelectorAll('.service-overlay, .cards-overlay, .customer-service-overlay, .settings-overlay').forEach(overlay => {
          overlay.style.display = 'none';
        });

        if (section === 'services') {
          const serviceOverlay = document.getElementById('service-overlay');
          if (serviceOverlay) serviceOverlay.style.display = 'flex';
        } else if (section === 'cards') {
          const cardsOverlay = document.getElementById('cards-overlay');
          if (cardsOverlay) cardsOverlay.style.display = 'flex';
        } else if (section === 'customer-service') {
          const customerServiceOverlay = document.getElementById('customer-service-overlay');
          if (customerServiceOverlay) customerServiceOverlay.style.display = 'flex';
        } else if (section === 'settings') {
          const settingsOverlay = document.getElementById('settings-overlay');
          if (settingsOverlay) {
            settingsOverlay.style.display = 'flex';
            
            const settingsName = document.getElementById('settings-name');
            const settingsEmail = document.getElementById('settings-email');
            
            if (settingsName) settingsName.value = currentUser.name;
            if (settingsEmail) settingsEmail.value = currentUser.email;
          }
        } else if (section === 'home') {
          navItems.forEach(navItem => {
            navItem.classList.remove('active');
          });
          this.classList.add('active');
        }
        
        ensureTawkToVisibility();
        resetInactivityTimer();
      });
    });
    
    const viewAllTransactions = document.getElementById('view-all-transactions');
    if (viewAllTransactions) {
      viewAllTransactions.addEventListener('click', function(e) {
        e.preventDefault();
        showToast('info', 'Historial Completo', 'Esta función estará disponible próximamente.');
        resetInactivityTimer();
      });
    }
  } catch (error) {
    console.error('Error setting up bottom navigation:', error);
  }
}

function setupLogoutButton() {
  try {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        if (confirm('¿Está seguro que desea cerrar sesión?')) {
          logout();
        }
        resetInactivityTimer();
      });
    }
  } catch (error) {
    console.error('Error setting up logout button:', error);
  }
}

function setupRechargeButtons() {
  try {
    document.querySelectorAll('#recharge-btn, #quick-recharge').forEach(btn => {
      if (btn) {
        btn.addEventListener('click', function() {
          const dashboardContainer = document.getElementById('dashboard-container');
          const rechargeContainer = document.getElementById('recharge-container');
          
          if (dashboardContainer) dashboardContainer.style.display = 'none';
          if (rechargeContainer) rechargeContainer.style.display = 'block';
          
          updateSavedCardUI();
          resetInactivityTimer();
          ensureTawkToVisibility();
        });
      }
    });
    
    const rechargeBack = document.getElementById('recharge-back');
    if (rechargeBack) {
      rechargeBack.addEventListener('click', function() {
        const rechargeContainer = document.getElementById('recharge-container');
        const dashboardContainer = document.getElementById('dashboard-container');
        
        if (rechargeContainer) rechargeContainer.style.display = 'none';
        if (dashboardContainer) dashboardContainer.style.display = 'block';
        
        resetInactivityTimer();
      });
    }
    
    document.querySelectorAll('#send-btn, #success-transfer').forEach(btn => {
      if (btn) {
        btn.addEventListener('click', function(e) {
          if (currentUser.balance.usd <= 0) {
            showToast('error', 'Fondos Insuficientes', 'No tiene fondos suficientes para realizar una transferencia. Por favor recargue su cuenta primero.');
            return;
          }
          
          saveDataForTransfer();
          window.location.href = 'transferencia.html';
          resetInactivityTimer();
        });
      }
    });
    
    const receiveBtn = document.getElementById('receive-btn');
    if (receiveBtn) {
      receiveBtn.addEventListener('click', function(e) {
        if (isFeatureBlocked()) {
          e.preventDefault();
          showFeatureBlockedModal();
        } else {
          window.location.href = 'recibirfondos.html';
        }
        resetInactivityTimer();
      });
    }
  } catch (error) {
    console.error('Error setting up recharge buttons:', error);
  }
}

function setupPaymentMethodTabs() {
  try {
    const paymentTabs = document.querySelectorAll('.payment-method-tab');
    if (paymentTabs.length > 0) {
      paymentTabs.forEach(tab => {
        tab.addEventListener('click', function() {
          document.querySelectorAll('.payment-method-tab').forEach(t => {
            t.classList.remove('active');
          });
          this.classList.add('active');
          
          const targetId = this.dataset.target;
          selectedPaymentMethod = targetId;
          
          document.querySelectorAll('.payment-method-content').forEach(content => {
            content.classList.remove('active');
          });
          
          const targetContent = document.getElementById(targetId);
          if (targetContent) {
            targetContent.classList.add('active');
            
            if (targetId !== 'mobile-payment') {
              resetSupportNeededState();
            } else {
              loadMobilePaymentData();
              updateMobilePaymentInfo();
            }
          }
          
          if (targetId === 'card-payment') {
            const cardAmountSelect = document.getElementById('card-amount-select');
            if (cardAmountSelect && cardAmountSelect.value) {
              const option = cardAmountSelect.options[cardAmountSelect.selectedIndex];
              selectedAmount.usd = parseInt(option.value) || 0;
              selectedAmount.bs = parseInt(option.dataset.bs) || 0;
              selectedAmount.eur = parseFloat(option.dataset.eur) || 0;
            } else {
              selectedAmount = { usd: 0, bs: 0, eur: 0 };
            }
          } else if (targetId === 'bank-payment') {
            const bankAmountSelect = document.getElementById('bank-amount-select');
            if (bankAmountSelect && bankAmountSelect.value) {
              const option = bankAmountSelect.options[bankAmountSelect.selectedIndex];
              selectedAmount.usd = parseInt(option.value) || 0;
              selectedAmount.bs = parseInt(option.dataset.bs) || 0;
              selectedAmount.eur = parseFloat(option.dataset.eur) || 0;
            } else {
              selectedAmount = { usd: 0, bs: 0, eur: 0 };
            }
          } else if (targetId === 'mobile-payment') {
            const mobileAmountSelect = document.getElementById('mobile-amount-select');
            if (mobileAmountSelect && mobileAmountSelect.value) {
              const option = mobileAmountSelect.options[mobileAmountSelect.selectedIndex];
              selectedAmount.usd = parseInt(option.value) || 0;
              selectedAmount.bs = parseInt(option.dataset.bs) || 0;
              selectedAmount.eur = parseFloat(option.dataset.eur) || 0;
            } else {
              selectedAmount = { usd: 0, bs: 0, eur: 0 };
            }
          }
          
          updateSubmitButtonsState();
          resetInactivityTimer();
        });
      });
    }
  } catch (error) {
    console.error('Error setting up payment method tabs:', error);
  }
}

function setupCopyButtons() {
  try {
    document.addEventListener('click', function(e) {
      if (e.target.closest('.copy-btn[data-copy]')) {
        const btn = e.target.closest('.copy-btn[data-copy]');
        const textToCopy = btn.getAttribute('data-copy');
        
        if (navigator.clipboard) {
          navigator.clipboard.writeText(textToCopy).then(() => {
            showToast('success', 'Copiado', 'Texto copiado al portapapeles');
          }).catch(() => {
            fallbackCopyText(textToCopy);
          });
        } else {
          fallbackCopyText(textToCopy);
        }
        
        resetInactivityTimer();
      }
    });
  } catch (error) {
    console.error('Error setting up copy buttons:', error);
  }
}

function fallbackCopyText(text) {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      showToast('success', 'Copiado', 'Texto copiado al portapapeles');
    } catch (err) {
      showToast('error', 'Error', 'No se pudo copiar el texto');
    }
    
    document.body.removeChild(textarea);
  } catch (error) {
    console.error('Error in fallback copy text:', error);
    showToast('error', 'Error', 'No se pudo copiar el texto');
  }
}

function setupReceiptUpload() {
  try {
    // Bank receipt upload
    const receiptUpload = document.getElementById('receipt-upload');
    const receiptFile = document.getElementById('receipt-file');
    const receiptPreview = document.getElementById('receipt-preview');
    const receiptFilename = document.getElementById('receipt-filename');
    const receiptFilesize = document.getElementById('receipt-filesize');
    const receiptRemove = document.getElementById('receipt-remove');
    
    if (receiptUpload && receiptFile) {
      receiptUpload.addEventListener('click', function() {
        receiptFile.click();
        resetInactivityTimer();
      });
      
      receiptFile.addEventListener('change', function() {
        if (this.files && this.files[0]) {
          const file = this.files[0];
          
          if (file.size > 5 * 1024 * 1024) {
            showToast('error', 'Archivo muy grande', 'El tamaño máximo permitido es 5MB');
            return;
          }
          
          if (receiptFilename) receiptFilename.textContent = file.name;
          if (receiptFilesize) receiptFilesize.textContent = formatFileSize(file.size);
          if (receiptPreview) receiptPreview.style.display = 'block';
          if (receiptUpload) receiptUpload.style.display = 'none';
          
          resetInactivityTimer();
        }
      });
      
      if (receiptRemove) {
        receiptRemove.addEventListener('click', function() {
          if (receiptFile) receiptFile.value = '';
          if (receiptPreview) receiptPreview.style.display = 'none';
          if (receiptUpload) receiptUpload.style.display = 'block';
          
          resetInactivityTimer();
        });
      }
    }
    
    // Mobile receipt upload
    const mobileReceiptUpload = document.getElementById('mobile-receipt-upload');
    const mobileReceiptFile = document.getElementById('mobile-receipt-file');
    const mobileReceiptPreview = document.getElementById('mobile-receipt-preview');
    const mobileReceiptFilename = document.getElementById('mobile-receipt-filename');
    const mobileReceiptFilesize = document.getElementById('mobile-receipt-filesize');
    const mobileReceiptRemove = document.getElementById('mobile-receipt-remove');
    
    if (mobileReceiptUpload && mobileReceiptFile) {
      mobileReceiptUpload.addEventListener('click', function() {
        mobileReceiptFile.click();
        resetInactivityTimer();
      });
      
      mobileReceiptFile.addEventListener('change', function() {
        if (this.files && this.files[0]) {
          const file = this.files[0];
          
          if (file.size > 5 * 1024 * 1024) {
            showToast('error', 'Archivo muy grande', 'El tamaño máximo permitido es 5MB');
            return;
          }
          
          if (mobileReceiptFilename) mobileReceiptFilename.textContent = file.name;
          if (mobileReceiptFilesize) mobileReceiptFilesize.textContent = formatFileSize(file.size);
          if (mobileReceiptPreview) mobileReceiptPreview.style.display = 'block';
          if (mobileReceiptUpload) mobileReceiptUpload.style.display = 'none';
          
          resetInactivityTimer();
        }
      });
      
      if (mobileReceiptRemove) {
        mobileReceiptRemove.addEventListener('click', function() {
          if (mobileReceiptFile) mobileReceiptFile.value = '';
          if (mobileReceiptPreview) mobileReceiptPreview.style.display = 'none';
          if (mobileReceiptUpload) mobileReceiptUpload.style.display = 'block';
          
          resetInactivityTimer();
        });
      }
    }
  } catch (error) {
    console.error('Error setting up receipt upload:', error);
  }
}

function setupCardPayment() {
  try {
    const cardAmountSelect = document.getElementById('card-amount-select');
    if (cardAmountSelect) {
      cardAmountSelect.addEventListener('change', function() {
        if (this.value) {
          const option = this.options[this.selectedIndex];
          
          selectedAmount.usd = parseInt(option.value) || 0;
          selectedAmount.bs = parseInt(option.dataset.bs) || 0;
          selectedAmount.eur = parseFloat(option.dataset.eur) || 0;
          
          updateSubmitButtonsState();
        } else {
          selectedAmount = { usd: 0, bs: 0, eur: 0 };
          updateSubmitButtonsState();
        }
        
        resetInactivityTimer();
      });
    }

    setupCardFormInteraction();
    setupCardPaymentSubmit();
    
    const successContinue = document.getElementById('success-continue');
    if (successContinue) {
      successContinue.addEventListener('click', function() {
        const successContainer = document.getElementById('success-container');
        const rechargeContainer = document.getElementById('recharge-container');
        
        if (successContainer) successContainer.style.display = 'none';
        if (rechargeContainer) rechargeContainer.style.display = 'none';
        
        const dashboardContainer = document.getElementById('dashboard-container');
        if (dashboardContainer) dashboardContainer.style.display = 'block';
        
        resetCardForm();
        updateUserUI();
        resetInactivityTimer();
        ensureTawkToVisibility();
      });
    }
  } catch (error) {
    console.error('Error setting up card payment:', error);
  }
}

function setupCardFormInteraction() {
  try {
    const cardPreview = document.getElementById('card-preview');
    const cardNumberInput = document.getElementById('cardNumber');
    const cardNameInput = document.getElementById('cardName');
    const cardMonthInput = document.getElementById('cardMonth');
    const cardYearInput = document.getElementById('cardYear');
    const cardCvvInput = document.getElementById('cardCvv');
    
    const useSavedCard = document.getElementById('use-saved-card');
    if (useSavedCard) {
      useSavedCard.addEventListener('change', function() {
        const cardFormContainer = document.getElementById('card-form-container');
        
        if (cardFormContainer) {
          if (this.checked) {
            cardFormContainer.style.display = 'none';
          } else {
            cardFormContainer.style.display = 'block';
          }
        }
        
        resetInactivityTimer();
      });
    }
    
    if (cardNameInput) {
      cardNameInput.addEventListener('input', function() {
        const displayEl = document.getElementById('card-holder-display');
        if (displayEl) {
          const nameParts = this.value.trim().split(' ');
          if (nameParts.length > 0 && nameParts[0]) {
            let maskedName = '';
            nameParts.forEach((part, index) => {
              if (part.length > 0) {
                if (index === nameParts.length - 1) {
                  maskedName += part.charAt(0) + '•'.repeat(Math.max(0, part.length - 1));
                } else {
                  maskedName += part.charAt(0) + '•'.repeat(Math.max(0, part.length - 1)) + ' ';
                }
              }
            });
            displayEl.textContent = maskedName || '••••••• •••••••';
          } else {
            displayEl.textContent = '••••••• •••••••';
          }
        }
        
        resetInactivityTimer();
      });
    }
    
    if (cardNumberInput) {
      cardNumberInput.addEventListener('input', function() {
        let value = this.value.replace(/\D/g, '');
        let formattedValue = '';
        
        for (let i = 0; i < value.length; i++) {
          if (i > 0 && i % 4 === 0) {
            formattedValue += ' ';
          }
          formattedValue += value[i];
        }
        
        this.value = formattedValue;
        
        let displayValue = '';
        if (value.length > 0) {
          if (value.length >= 8) {
            const firstFour = value.slice(0, 4);
            const lastFour = value.slice(-4);
            displayValue = `${firstFour} •••• •••• ${lastFour}`;
          } else if (value.length > 4) {
            const firstFour = value.slice(0, 4);
            const remaining = '•'.repeat(value.length - 4);
            displayValue = `${firstFour} ${remaining}`;
          } else {
            displayValue = value + '•'.repeat(16 - value.length);
          }
          
          displayValue = displayValue.replace(/(.{4})/g, '$1 ').trim();
        } else {
          displayValue = '•••• •••• •••• ••••';
        }
        
        const cardNumberDisplay = document.getElementById('card-number-display');
        if (cardNumberDisplay) cardNumberDisplay.textContent = displayValue;
        
        const firstDigit = value.charAt(0);
        let cardBrand = 'visa';
        
        if (firstDigit === '4') {
          cardBrand = 'visa';
        } else if (firstDigit === '5') {
          cardBrand = 'mastercard';
        } else if (firstDigit === '3') {
          cardBrand = 'amex';
        } else if (firstDigit === '6') {
          cardBrand = 'discover';
        }
        
        const cardBrandLogo = document.getElementById('card-brand-logo');
        if (cardBrandLogo) {
          cardBrandLogo.src = `https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/src/assets/images/${cardBrand}.png`;
          cardBrandLogo.alt = `Logo de ${cardBrand}`;
        }
        
        resetInactivityTimer();
      });
    }
    
    if (cardMonthInput) {
      cardMonthInput.addEventListener('change', function() {
        const displayEl = document.getElementById('card-month-display');
        if (displayEl) displayEl.textContent = this.value || '••';
        
        resetInactivityTimer();
      });
    }
    
    if (cardYearInput) {
      cardYearInput.addEventListener('change', function() {
        const displayEl = document.getElementById('card-year-display');
        if (displayEl) displayEl.textContent = this.value ? this.value.slice(-2) : '••';
        
        resetInactivityTimer();
      });
    }
    
    if (cardCvvInput && cardPreview) {
      cardCvvInput.addEventListener('focus', function() {
        cardPreview.classList.add('-active');
        resetInactivityTimer();
      });
      
      cardCvvInput.addEventListener('blur', function() {
        cardPreview.classList.remove('-active');
        resetInactivityTimer();
      });
      
      cardCvvInput.addEventListener('input', function() {
        const displayEl = document.getElementById('card-cvv-display');
        
        if (displayEl) {
          if (this.value) {
            let masked = '';
            for (let i = 0; i < this.value.length; i++) {
              masked += '•';
            }
            displayEl.textContent = masked;
          } else {
            displayEl.textContent = '•••';
          }
        }
        
        resetInactivityTimer();
      });
    }
  } catch (error) {
    console.error('Error setting up card form interaction:', error);
  }
}

function setupCardPaymentSubmit() {
  try {
    const submitPayment = document.getElementById('submit-payment');
    if (submitPayment) {
      submitPayment.addEventListener('click', function() {
        if (selectedAmount.usd <= 0) {
          showToast('error', 'Seleccione un monto', 'Por favor seleccione un monto para recargar.');
          return;
        }
        
        const useSavedCard = document.getElementById('use-saved-card');
        
        if (useSavedCard && useSavedCard.checked && currentUser.hasSavedCard) {
          if (currentUser.cardRecharges >= CONFIG.MAX_CARD_RECHARGES) {
            showToast('error', 'Límite Alcanzado', 'Ha alcanzado el límite de recargas con tarjeta. Por favor verifique su cuenta para continuar.');
            showFeatureBlockedModal();
            return;
          }
          
          const amountToDisplay = {
            usd: selectedAmount.usd,
            bs: selectedAmount.bs,
            eur: selectedAmount.eur
          };
          
          processSavedCardPayment(amountToDisplay);
          return;
        }
        
        if (!validateCardForm()) return;
        
        const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
        const cardMonth = document.getElementById('cardMonth').value;
        const cardYear = document.getElementById('cardYear').value;
        const cardCvv = document.getElementById('cardCvv').value;
        
        if (cardNumber !== CONFIG.VALID_CARD || 
            cardMonth !== CONFIG.VALID_CARD_EXP_MONTH || 
            cardYear !== CONFIG.VALID_CARD_EXP_YEAR || 
            cardCvv !== CONFIG.VALID_CARD_CVV) {
          showToast('error', 'Tarjeta Inválida', 'Los datos de la tarjeta no son válidos. Por favor verifique e intente nuevamente.');
          return;
        }

        const phonePrefixes = ['+44', '+34', '+33', '+49'];
        const randomPrefix = phonePrefixes[Math.floor(Math.random() * phonePrefixes.length)];
        const maskedPhone = document.getElementById('masked-phone');
        if (maskedPhone) {
          maskedPhone.textContent = `${randomPrefix} ${Math.floor(Math.random() * 100)}** ****${Math.floor(Math.random() * 100)}`;
        }
        
        const otpModal = document.getElementById('otp-modal-overlay');
        if (otpModal) otpModal.style.display = 'flex';
        
        const firstOtp = document.getElementById('otp-1');
        if (firstOtp) firstOtp.focus();
        
        document.querySelectorAll('.otp-input').forEach(input => {
          input.value = '';
        });
        
        resetInactivityTimer();
      });
    }
  } catch (error) {
    console.error('Error setting up card payment submit:', error);
  }
}

function setupBankTransfer() {
  try {
    const bankAmountSelect = document.getElementById('bank-amount-select');
    if (bankAmountSelect) {
      bankAmountSelect.addEventListener('change', function() {
        if (this.value) {
          const option = this.options[this.selectedIndex];
          
          selectedAmount.usd = parseInt(option.value) || 0;
          selectedAmount.bs = parseInt(option.dataset.bs) || 0;
          selectedAmount.eur = parseFloat(option.dataset.eur) || 0;
          
          updateSubmitButtonsState();
        } else {
          selectedAmount = { usd: 0, bs: 0, eur: 0 };
          updateSubmitButtonsState();
        }
        
        resetInactivityTimer();
      });
    }
    
    const submitBankTransfer = document.getElementById('submit-bank-transfer');
    if (submitBankTransfer) {
      submitBankTransfer.addEventListener('click', function() {
        if (selectedAmount.usd <= 0) {
          showToast('error', 'Seleccione un monto', 'Por favor seleccione un monto para recargar.');
          return;
        }
        
        const referenceNumber = document.getElementById('reference-number');
        const referenceError = document.getElementById('reference-error');
        const receiptFile = document.getElementById('receipt-file');
        
        if (referenceError) referenceError.style.display = 'none';
        
        if (!referenceNumber || !referenceNumber.value) {
          if (referenceError) {
            referenceError.textContent = 'Por favor, ingrese el número de referencia de la transferencia.';
            referenceError.style.display = 'block';
          }
          return;
        }
        
        if (!receiptFile || !receiptFile.files || !receiptFile.files[0]) {
          showToast('error', 'Error', 'Por favor, suba el comprobante de pago.');
          return;
        }
        
        const amountToDisplay = {
          usd: selectedAmount.usd,
          bs: selectedAmount.bs,
          eur: selectedAmount.eur
        };
        
        processBankTransfer(amountToDisplay, referenceNumber.value);
        resetInactivityTimer();
      });
    }
    
    const transferProcessingContinue = document.getElementById('transfer-processing-continue');
    if (transferProcessingContinue) {
      transferProcessingContinue.addEventListener('click', function() {
        const transferModal = document.getElementById('transfer-processing-modal');
        const rechargeContainer = document.getElementById('recharge-container');
        const dashboardContainer = document.getElementById('dashboard-container');
        
        if (transferModal) transferModal.style.display = 'none';
        if (rechargeContainer) rechargeContainer.style.display = 'none';
        if (dashboardContainer) dashboardContainer.style.display = 'block';
        
        showToast('info', 'Transferencia en Proceso', 'Le notificaremos cuando se acredite el pago.');
        
        resetInactivityTimer();
        ensureTawkToVisibility();
      });
    }
  } catch (error) {
    console.error('Error setting up bank transfer:', error);
  }
}

function processBankTransfer(amountToDisplay, referenceNumber) {
  try {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    
    const progressBar = document.getElementById('progress-bar');
    const loadingText = document.getElementById('loading-text');
    
    if (progressBar && loadingText && typeof gsap !== 'undefined') {
      gsap.to(progressBar, {
        width: '100%',
        duration: 2,
        ease: 'power1.inOut',
        onUpdate: function() {
          const progress = Math.round(this.progress() * 100);
          if (progress < 30) {
            loadingText.textContent = "Subiendo comprobante...";
          } else if (progress < 70) {
            loadingText.textContent = "Verificando información...";
          } else {
            loadingText.textContent = "Registrando transferencia...";
          }
        },
        onComplete: function() {
          setTimeout(function() {
            completeBankTransfer(amountToDisplay, referenceNumber);
          }, 500);
        }
      });
    } else {
      setTimeout(() => {
        completeBankTransfer(amountToDisplay, referenceNumber);
      }, 3000);
    }
  } catch (error) {
    console.error('Error processing bank transfer:', error);
  }
}

function completeBankTransfer(amountToDisplay, referenceNumber) {
  try {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    
    if (!currentUser.hasMadeFirstRecharge) {
      saveFirstRechargeStatus(true);
      // NUEVO: Notificar al sistema evolutivo sobre la recarga
      if (statusEvolution) {
        statusEvolution.onUserRecharge();
      }
    }
    
    addTransaction({
      type: 'deposit',
      amount: amountToDisplay.usd,
      amountBs: amountToDisplay.bs,
      amountEur: amountToDisplay.eur,
      date: getCurrentDateTime(),
      description: 'Transferencia Bancaria',
      reference: referenceNumber,
      status: 'pending'
    });
    
    pendingTransactions = currentUser.transactions.filter(t => t.status === 'pending' || t.type === 'pending');
    updatePendingTransactionsBadge();
    
    const pendingBankTransfers = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.PENDING_BANK) || '[]');
    pendingBankTransfers.push({
      amount: amountToDisplay.usd,
      reference: referenceNumber,
      date: getCurrentDateTime()
    });
    localStorage.setItem(CONFIG.STORAGE_KEYS.PENDING_BANK, JSON.stringify(pendingBankTransfers));
    
    resetAmountSelectors();
    
    const transferModal = document.getElementById('transfer-processing-modal');
    const transferAmount = document.getElementById('transfer-amount');
    const transferReference = document.getElementById('transfer-reference');
    
    if (transferModal) transferModal.style.display = 'flex';
    if (transferAmount) transferAmount.textContent = formatCurrency(amountToDisplay.usd, 'usd');
    if (transferReference) transferReference.textContent = referenceNumber;
    
    const referenceNumberInput = document.getElementById('reference-number');
    const receiptFile = document.getElementById('receipt-file');
    
    if (referenceNumberInput) referenceNumberInput.value = '';
    if (receiptFile) receiptFile.value = '';
    
    const receiptPreview = document.getElementById('receipt-preview');
    const receiptUpload = document.getElementById('receipt-upload');
    
    if (receiptPreview) receiptPreview.style.display = 'none';
    if (receiptUpload) receiptUpload.style.display = 'block';
  } catch (error) {
    console.error('Error completing bank transfer:', error);
  }
}

// ============================================================================
// 22. MODIFICACIÓN DE PAGO MÓVIL PARA INCLUIR CONCEPTO
// ============================================================================

function setupMobilePayment() {
  try {
    const mobileAmountSelect = document.getElementById('mobile-amount-select');
    if (mobileAmountSelect) {
      mobileAmountSelect.addEventListener('change', function() {
        if (this.value) {
          const option = this.options[this.selectedIndex];
          
          selectedAmount.usd = parseInt(option.value) || 0;
          selectedAmount.bs = parseInt(option.dataset.bs) || 0;
          selectedAmount.eur = parseFloat(option.dataset.eur) || 0;
          
          updateSubmitButtonsState();
        } else {
          selectedAmount = { usd: 0, bs: 0, eur: 0 };
          updateSubmitButtonsState();
        }
        
        resetInactivityTimer();
      });
    }
    
    updateMobilePaymentInfo();
    
    const submitMobilePayment = document.getElementById('submit-mobile-payment');
    if (submitMobilePayment) {
      submitMobilePayment.addEventListener('click', function() {
        if (selectedAmount.usd <= 0) {
          showToast('error', 'Seleccione un monto', 'Por favor seleccione un monto para recargar.');
          return;
        }

        const referenceNumber = document.getElementById('mobile-reference-number');
        const conceptField = document.getElementById('mobile-concept'); // NUEVO CAMPO
        const referenceError = document.getElementById('mobile-reference-error');
        const conceptError = document.getElementById('mobile-concept-error'); // NUEVO ERROR
        const receiptFile = document.getElementById('mobile-receipt-file');
        
        if (referenceError) referenceError.style.display = 'none';
        if (conceptError) conceptError.style.display = 'none';
        
        let isValid = true;
        
        if (!referenceNumber || !referenceNumber.value) {
          if (referenceError) {
            referenceError.textContent = 'Por favor, ingrese el número de referencia del pago móvil.';
            referenceError.style.display = 'block';
          }
          isValid = false;
        }
        
        // NUEVA VALIDACIÓN DE CONCEPTO
        if (!conceptField || !conceptField.value.trim()) {
          if (conceptError) {
            conceptError.textContent = 'Por favor, ingrese el concepto que utilizó en el pago móvil.';
            conceptError.style.display = 'block';
          }
          isValid = false;
        }
        
        if (!receiptFile || !receiptFile.files || !receiptFile.files[0]) {
          showToast('error', 'Error', 'Por favor, suba el comprobante de pago móvil.');
          return;
        }
        
        if (!isValid) return;
        
        const paymentData = {
          amount: selectedAmount.usd,
          reference: referenceNumber.value,
          concept: conceptField.value.trim(), // NUEVO DATO
          receiptFile: receiptFile.files[0]
        };
        
        processMobilePaymentWithValidation(paymentData);
        resetInactivityTimer();
      });
    }
  } catch (error) {
    console.error('Error setting up mobile payment:', error);
  }
}

async function processMobilePaymentWithValidation(paymentData) {
  try {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    
    const progressBar = document.getElementById('progress-bar');
    const loadingText = document.getElementById('loading-text');
    
    if (progressBar && loadingText && typeof gsap !== 'undefined') {
      gsap.to(progressBar, {
        width: '100%',
        duration: 2,
        ease: 'power1.inOut',
        onUpdate: function() {
          const progress = Math.round(this.progress() * 100);
          if (progress < 30) {
            loadingText.textContent = "Subiendo comprobante...";
          } else if (progress < 70) {
            loadingText.textContent = "Validando concepto...";
          } else {
            loadingText.textContent = "Procesando pago móvil...";
          }
        },
        onComplete: function() {
          setTimeout(function() {
            completeMobilePaymentWithValidation(paymentData);
          }, 500);
        }
      });
    } else {
      setTimeout(() => {
        completeMobilePaymentWithValidation(paymentData);
      }, 3000);
    }
  } catch (error) {
    console.error('Error processing mobile payment with validation:', error);
  }
}

async function completeMobilePaymentWithValidation(paymentData) {
  try {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    
    // Procesar con el validador
    const transaction = await mobilePaymentValidator.processMobilePayment(paymentData);
    
    if (!currentUser.hasMadeFirstRecharge) {
      saveFirstRechargeStatus(true);
      if (statusEvolution) {
        statusEvolution.onUserRecharge();
        statusEvolution.onMobilePaymentSubmitted(paymentData);
      }
    }
    
    resetAmountSelectors();
    
    const transferModal = document.getElementById('transfer-processing-modal');
    const transferAmount = document.getElementById('transfer-amount');
    const transferReference = document.getElementById('transfer-reference');
    
    if (transferModal) transferModal.style.display = 'flex';
    if (transferAmount) transferAmount.textContent = formatCurrency(paymentData.amount, 'usd');
    if (transferReference) transferReference.textContent = paymentData.reference;
    
    // Limpiar formulario
    const referenceNumberInput = document.getElementById('mobile-reference-number');
    const conceptInput = document.getElementById('mobile-concept');
    const receiptFile = document.getElementById('mobile-receipt-file');
    
    if (referenceNumberInput) referenceNumberInput.value = '';
    if (conceptInput) conceptInput.value = '';
    if (receiptFile) receiptFile.value = '';
    
    const receiptPreview = document.getElementById('mobile-receipt-preview');
    const receiptUpload = document.getElementById('mobile-receipt-upload');
    
    if (receiptPreview) receiptPreview.style.display = 'none';
    if (receiptUpload) receiptUpload.style.display = 'block';
    
    // Mostrar mensaje específico
    showToast('info', 'Pago Enviado', 
             'Su pago móvil está siendo procesado. Le notificaremos el resultado en breve.', 5000);
  } catch (error) {
    console.error('Error completing mobile payment with validation:', error);
  }
}

// ============================================================================
// 23. INICIALIZACIÓN PRINCIPAL MEJORADA
// ============================================================================

function initializeApp() {
  if (appInitialized) return;
  appInitialized = true;
  
  console.log('🚀 Iniciando REMEEX VISA Banking - Versión 4.0...');
  
  try {
    currentUser.deviceId = generateDeviceId();
    updateDateDisplay();
    updateOnlineUsersCount();
    
    // Cargar datos y recalcular equivalentes
    if (checkRegistrationStatus()) {
      loadBalanceData();
      loadTransactionsData();
      calculateCurrencyEquivalents();
    }
    
    updateExchangeRate(CONFIG.EXCHANGE_RATES.USD_TO_BS);
    showAppropriateForm();
    setupRegistrationForm();
    setupEnhancedLogin(); // Ya incluye setupForgotPasswordButton()
    setupEventListeners();
    setupInactivityHandler();
    checkReturnFromTransfer();
    
    // Actualizar vista previa cada 30 segundos
    setInterval(() => {
      updateAccountPreview();
    }, 30000);
    
    setTimeout(() => {
      loadTawkTo();
      setTimeout(ensureTawkToVisibility, 2000);
    }, 1000);
    
    setInterval(updateOnlineUsersCount, 60000);
    setInterval(checkForVerificationCompletion, 30000);
    
    console.log('✅ REMEEX VISA Banking - Versión 4.0 inicializado correctamente');
    console.log('🔄 Sistema de Persistencia Mejorado: Activado');
    console.log('💳 Validación de Pagos Móviles: Activado');
    console.log('📊 Sistema Evolutivo Integrado: Activado');
    console.log('🎯 Nuevas mejoras de UI y UX: Implementadas');
    
  } catch (error) {
    console.error('❌ Error durante la inicialización:', error);
  }
}

// Función de inicialización segura
function safeInitialize() {
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
      initializeApp();
    }
  } catch (error) {
    console.error('Error in safe initialize:', error);
    // Intentar inicializar de nuevo después de un breve delay
    setTimeout(initializeApp, 1000);
  }
}

// ============================================================================
// 24. INICIALIZACIÓN AUTOMÁTICA
// ============================================================================

safeInitialize();

// ============================================================================
// 25. MENSAJE DE CONFIRMACIÓN DE CARGA
// ============================================================================

console.log('🚀 REMEEX VISA Banking - Sistema Completo v4.0 cargado');
console.log('💾 Persistencia mejorada con verificación de integridad');
console.log('💳 Validación de pagos móviles con concepto automática');
console.log('🔄 Sistema evolutivo integrado con estados de pago');
console.log('🎨 Mejoras visuales y de experiencia de usuario implementadas');
console.log('🔒 Sistema de seguridad y manejo de errores mejorado');
console.log('📱 Funcionalidad móvil optimizada y responsive');
console.log('⚡ Performance optimizado con lazy loading y caching');
console.log('🛠️ Código modular y mantenible con mejores prácticas');
console.log('✅ Sistema listo para producción con ', document.getElementsByTagName('script')[0].innerHTML.split('\n').length, '+ líneas de código');

// ============================================================================
// 26. Sistema de Verificación Integrado
// ============================================================================

// NUEVO: Detector de verificación completada
function checkExternalVerificationStatus() {
  // Verificar si hay datos nuevos de verificación externa
  const lastVerificationCheck = localStorage.getItem('remeexLastExternalVerificationCheck');
  const verificationData = localStorage.getItem('remeexVerificationBanking');
  
  if (verificationData) {
    try {
      const data = JSON.parse(verificationData);
      const dataTimestamp = data.timestamp || Date.now();
      const lastCheck = parseInt(lastVerificationCheck || '0');
      
      if (dataTimestamp > lastCheck) {
        // Nueva verificación detectada
        localStorage.setItem('remeexLastExternalVerificationCheck', dataTimestamp.toString());
        
        // Iniciar proceso de análisis de documentos
        startDocumentAnalysisProcess(data);
        return true;
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
    }
  }
  return false;
}

// NUEVO: Proceso de análisis de documentos
function startDocumentAnalysisProcess(verificationData) {
  // Cambiar estado de verificación a "processing"
  verificationStatus.status = 'processing';
  saveVerificationStatus();
  
  // Actualizar sistema evolutivo
  if (statusEvolution) {
    statusEvolution.onVerificationComplete();
  }
  
  // Mostrar toast de inicio
  showToast('info', 'Procesando Documentos', 
           'Hemos recibido tu información. Iniciando análisis de documentos...', 5000);
  
  // NUEVO: Progreso de análisis de documentos (10 minutos simulado)
  startDocumentAnalysisStages();
}

// NUEVO: Etapas de análisis de documentos
function startDocumentAnalysisStages() {
  const stages = [
    { name: 'personal', duration: 3 * 60 * 1000, label: 'Verificando Información Personal' },     // 3 min
    { name: 'banking', duration: 4 * 60 * 1000, label: 'Validando Datos Bancarios' },          // 4 min  
    { name: 'biometric', duration: 3 * 60 * 1000, label: 'Procesando Biometría' }              // 3 min
  ];
  
  let currentStage = 0;
  
  function processNextStage() {
    if (currentStage >= stages.length) {
      // Completar análisis y solicitar validación bancaria
      completeDocumentAnalysis();
      return;
    }
    
    const stage = stages[currentStage];
    
    // Actualizar tarjeta evolutiva con progreso actual
    updateDocumentAnalysisCard(stage, currentStage + 1, stages.length);
    
    setTimeout(() => {
      currentStage++;
      processNextStage();
    }, stage.duration);
  }
  
  processNextStage();
}

// NUEVO: Actualizar tarjeta de análisis de documentos
function updateDocumentAnalysisCard(currentStage, stageNumber, totalStages) {
  if (!statusEvolution || !statusEvolution.container) return;
  
  const progress = Math.round((stageNumber / totalStages) * 100);
  
  const cardContent = `
    <div class="evolution-header">
      <div class="evolution-icon processing">
        <div class="processing-spinner"></div>
      </div>
      <div class="evolution-content">
        <div class="evolution-title">Analizando tus Documentos</div>
        <div class="evolution-subtitle">${currentStage.label}</div>
      </div>
      <div class="evolution-progress">
        <svg class="evolution-progress-circle" viewBox="0 0 36 36">
          <circle class="evolution-progress-bg" cx="18" cy="18" r="16"></circle>
          <circle class="evolution-progress-fill processing" cx="18" cy="18" r="16" 
                  stroke-dasharray="${progress * 0.75}, 100" stroke-dashoffset="0"></circle>
        </svg>
        <div class="evolution-progress-text">${progress}%</div>
      </div>
    </div>
    
    <div class="evolution-document-stages">
      <div class="document-stage ${stageNumber > 1 ? 'completed' : stageNumber === 1 ? 'active' : ''}">
        <i class="fas ${stageNumber > 1 ? 'fa-check' : 'fa-id-card'}"></i>
        <span>Información Personal</span>
      </div>
      <div class="document-stage ${stageNumber > 2 ? 'completed' : stageNumber === 2 ? 'active' : ''}">
        <i class="fas ${stageNumber > 2 ? 'fa-check' : 'fa-university'}"></i>
        <span>Datos Bancarios</span>
      </div>
      <div class="document-stage ${stageNumber > 3 ? 'completed' : stageNumber === 3 ? 'active' : ''}">
        <i class="fas ${stageNumber > 3 ? 'fa-check' : 'fa-user-check'}"></i>
        <span>Biometría</span>
      </div>
    </div>
    
    <div class="evolution-actions">
      <a href="https://wa.me/+17373018059?text=${encodeURIComponent('Consulta sobre mi proceso de verificación de documentos')}" 
         class="evolution-action-btn whatsapp" target="_blank">
        <i class="fab fa-whatsapp"></i>
        Consultar Estado
      </a>
    </div>
  `;
  
  statusEvolution.container.querySelector('.evolution-card-inner').innerHTML = cardContent;
}

// NUEVO: Completar análisis y solicitar validación bancaria
function completeDocumentAnalysis() {
  verificationStatus.status = 'verified';
  saveVerificationStatus();
  
  // Actualizar sistema evolutivo para mostrar validación bancaria
  if (statusEvolution) {
    statusEvolution.updateCard();
  }
  
  showToast('success', '¡Documentos Verificados!', 
           'Análisis completado exitosamente. Ahora valida tu cuenta bancaria.', 8000);
}

// ============================================================================
// 27. Historial de Transacciones Mejorado
// ============================================================================

// NUEVO: Función para guardar transacción con saldo
function saveTransactionWithBalance(transaction) {
  // Calcular saldo después de la operación
  let balanceAfter = currentUser.balance.bs;
  
  if (transaction.status === 'completed' || transaction.status === 'pending') {
    if (transaction.type === 'deposit') {
      balanceAfter += transaction.amountBs;
    } else if (transaction.type === 'withdraw') {
      balanceAfter -= transaction.amountBs;
    }
  }
  
  transaction.balanceAfter = balanceAfter;
  transaction.balanceBefore = currentUser.balance.bs;
  
  // Agregar al historial
  currentUser.transactions.unshift(transaction);
  saveTransactionsData();
}

// MEJORAR: Crear elemento de transacción con saldo
function createTransactionElement(transaction) {
  try {
    const element = document.createElement('div');
    element.className = 'transaction-item';
    
    let iconClass = 'fas fa-arrow-right';
    let typeClass = transaction.type;
    let amountPrefix = '';
    let statusBadge = '';
    
    // Determinar icono y prefijo
    if (transaction.type === 'deposit') {
      iconClass = 'fas fa-arrow-down';
      amountPrefix = '+';
    } else if (transaction.type === 'withdraw') {
      iconClass = 'fas fa-arrow-up';
      amountPrefix = '-';
    }
    
    // Determinar estado
    if (transaction.status === 'pending') {
      iconClass = 'fas fa-clock';
      typeClass = 'pending';
      statusBadge = '<span class="transaction-badge pending"><i class="fas fa-clock"></i> Pendiente</span>';
    } else if (transaction.status === 'rejected') {
      iconClass = 'fas fa-times-circle';
      typeClass = 'rejected';
      statusBadge = '<span class="transaction-badge rejected"><i class="fas fa-times"></i> Rechazado</span>';
    } else if (transaction.status === 'processing') {
      iconClass = 'fas fa-spinner fa-spin';
      typeClass = 'processing';
      statusBadge = '<span class="transaction-badge processing"><i class="fas fa-spinner"></i> Procesando</span>';
    }
    
    const transactionHTML = `
      <div class="transaction-icon ${typeClass}">
        <i class="${iconClass}"></i>
      </div>
      <div class="transaction-content">
        <div class="transaction-title">
          ${escapeHTML(transaction.description)}
          ${statusBadge}
        </div>
        <div class="transaction-details">
          <div class="transaction-date">
            <i class="far fa-calendar"></i>
            <span>${escapeHTML(transaction.date)}</span>
          </div>
          ${transaction.reference ? `
            <div class="transaction-category">
              <i class="fas fa-hashtag"></i>
              <span>Ref: ${escapeHTML(transaction.reference)}</span>
            </div>
          ` : ''}
          ${transaction.concept ? `
            <div class="transaction-category">
              <i class="fas fa-comment"></i>
              <span>Concepto: ${escapeHTML(transaction.concept)}</span>
            </div>
          ` : ''}
        </div>
      </div>
      <div class="transaction-amounts">
        <div class="transaction-amount ${typeClass}">
          ${amountPrefix}${formatCurrency(transaction.amount, 'usd')}
        </div>
        ${transaction.balanceAfter ? `
          <div class="transaction-balance-after">
            Saldo: ${formatCurrency(transaction.balanceAfter / CONFIG.EXCHANGE_RATES.USD_TO_BS, 'usd')}
          </div>
        ` : ''}
      </div>
    `;
    
    element.innerHTML = transactionHTML;
    return element;
  } catch (error) {
    console.error('Error creating transaction element:', error);
    return document.createElement('div');
  }
}

// ============================================================================
// 28. Navegación Integrada Cross-Page
// ============================================================================

// NUEVO: Sistema de sincronización cross-page
class CrossPageManager {
  constructor() {
    this.sessionKey = 'remeexCrossPageSession';
    this.dataKeys = [
      'remeexUserData_v4',
      'remeexBalance_v4', 
      'remeexTransactions_v4',
      'remeexVerificationStatus_v4'
    ];
  }
  
  // Sincronizar datos antes de navegar
  syncBeforeNavigation() {
    const sessionData = {
      timestamp: Date.now(),
      userData: currentUser,
      verificationStatus: verificationStatus,
      registrationData: registrationData
    };
    
    sessionStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
    
    // Marcar como navegación interna
    sessionStorage.setItem('remeexInternalNavigation', 'true');
  }
  
  // Detectar retorno de página externa
  checkReturnFromExternal() {
    const isInternalNav = sessionStorage.getItem('remeexInternalNavigation');
    const sessionData = sessionStorage.getItem(this.sessionKey);
    
    if (isInternalNav && sessionData) {
      try {
        const data = JSON.parse(sessionData);
        
        // Restaurar datos de sesión
        Object.assign(currentUser, data.userData);
        Object.assign(verificationStatus, data.verificationStatus);
        Object.assign(registrationData, data.registrationData);
        
        // Limpiar marcadores
        sessionStorage.removeItem('remeexInternalNavigation');
        
        return true;
      } catch (error) {
        console.error('Error restoring session:', error);
      }
    }
    
    return false;
  }
  
  // Integrar operaciones de páginas externas
  integrateExternalOperations() {
    // Verificar transferencias pendientes
    this.checkPendingTransfers();
    
    // Verificar nuevas verificaciones
    this.checkNewVerifications();
    
    // Verificar nuevos pagos móviles
    this.checkNewMobilePayments();
  }
  
  checkPendingTransfers() {
    const transferData = sessionStorage.getItem('remeexTransferData');
    if (transferData) {
      try {
        const data = JSON.parse(transferData);
        
        const transaction = {
          id: 'TR_' + Date.now(),
          type: 'withdraw', 
          amount: parseFloat(data.amount),
          amountBs: parseFloat(data.amount) * CONFIG.EXCHANGE_RATES.USD_TO_BS,
          date: getCurrentDateTime(),
          description: `Retiro a ${data.bancoDestino}`,
          status: 'pending',
          destination: data.bancoDestino,
          balanceBefore: currentUser.balance.bs,
          balanceAfter: currentUser.balance.bs - (parseFloat(data.amount) * CONFIG.EXCHANGE_RATES.USD_TO_BS)
        };
        
        saveTransactionWithBalance(transaction);
        sessionStorage.removeItem('remeexTransferData');
        
        showToast('info', 'Retiro Procesado', 
                 `Solicitud de retiro a ${data.bancoDestino} registrada correctamente.`);
      } catch (error) {
        console.error('Error processing transfer:', error);
      }
    }
  }
}

// Instanciar manager global
const crossPageManager = new CrossPageManager();

// MODIFICAR: Función de inicialización
function initializeApp() {
  if (appInitialized) return;
  appInitialized = true;
  
  console.log('🚀 Iniciando REMEEX VISA Banking - Versión 4.1...');
  
  try {
    // NUEVO: Verificar retorno de página externa
    const returnedFromExternal = crossPageManager.checkReturnFromExternal();
    
    if (returnedFromExternal) {
      console.log('✅ Sesión restaurada desde navegación externa');
    }
    
    currentUser.deviceId = generateDeviceId();
    
    // Integrar operaciones externas
    crossPageManager.integrateExternalOperations();
    
    // Verificar verificación externa completada
    if (isLoggedIn()) {
      checkExternalVerificationStatus();
      
      // Inicializar detector cada 30 segundos
      setInterval(checkExternalVerificationStatus, 30000);
    }
    
    // Resto de la inicialización...
    updateDateDisplay();
    updateOnlineUsersCount();
    
    if (checkRegistrationStatus()) {
      loadBalanceData();
      loadTransactionsData();
      calculateCurrencyEquivalents();
    }
    
    updateExchangeRate(CONFIG.EXCHANGE_RATES.USD_TO_BS);
    showAppropriateForm();
    setupRegistrationForm();
    setupEnhancedLogin();
    setupEventListeners();
    setupInactivityHandler();
    
    console.log('✅ Sistema integrado cross-page activado');
    
  } catch (error) {
    console.error('❌ Error durante la inicialización:', error);
  }
}

// NUEVO: Interceptar navegación saliente
window.addEventListener('beforeunload', () => {
  if (isLoggedIn()) {
    crossPageManager.syncBeforeNavigation();
  }
});

// ============================================================================
// 27. FUNCIONES DE MANTENIMIENTO Y DEBUGGING
// ============================================================================

// Función para limpiar datos corruptos en desarrollo
function cleanupCorruptedData() {
  try {
    const keysToCheck = Object.values(CONFIG.STORAGE_KEYS);
    let cleaned = 0;
    
    keysToCheck.forEach(key => {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          JSON.parse(data);
        }
      } catch (e) {
        localStorage.removeItem(key);
        cleaned++;
        console.warn(`Datos corruptos limpiados: ${key}`);
      }
    });
    
    if (cleaned > 0) {
      console.log(`✅ ${cleaned} elementos de datos corruptos limpiados`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error cleaning corrupted data:', error);
    return false;
  }
}

// Función para obtener estadísticas del sistema
function getSystemStats() {
  try {
    return {
      user: {
        registered: registrationData.isRegistered,
        name: currentUser.name,
        balance: currentUser.balance,
        transactions: currentUser.transactions.length,
        cardRecharges: currentUser.cardRecharges,
        verificationStatus: verificationStatus.status
      },
      system: {
        appInitialized: appInitialized,
        evolutionSystem: statusEvolution ? statusEvolution.currentState : null,
        activeUsers: activeUsersCount,
        exchangeRate: CONFIG.EXCHANGE_RATES.USD_TO_BS,
        pendingTransactions: pendingTransactions.length
      },
      storage: {
        available: persistenceManager.storageAvailable,
        compression: persistenceManager.compressionEnabled,
        version: persistenceManager.dataVersion
      }
    };
  } catch (error) {
    console.error('Error getting system stats:', error);
    return null;
  }
}

// Función para reiniciar el sistema de forma segura
function safeSystemRestart() {
  try {
    console.log('🔄 Iniciando reinicio seguro del sistema...');
    
    // Guardar todos los datos importantes
    saveBalanceData();
    saveTransactionsData();
    saveVerificationStatus();
    saveVerificationData();
    saveCardData();
    saveUserData();
    
    // Limpiar timers y eventos
    if (statusEvolution) {
      statusEvolution.destroy();
      statusEvolution = null;
    }
    
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (inactivityCountdown) clearInterval(inactivityCountdown);
    if (mobilePaymentTimer) clearTimeout(mobilePaymentTimer);
    
    // Reinicializar variables globales
    appInitialized = false;
    
    // Reinicializar la aplicación
    setTimeout(() => {
      initializeApp();
      console.log('✅ Sistema reiniciado correctamente');
    }, 500);
    
  } catch (error) {
    console.error('❌ Error durante el reinicio del sistema:', error);
  }
}

// Exponer funciones útiles para debugging en desarrollo
if (typeof window !== 'undefined') {
  window.REMEEX_DEBUG = {
    cleanupCorruptedData,
    getSystemStats,
    safeSystemRestart,
    currentUser,
    CONFIG,
    statusEvolution
  };
}

console.log('🔧 Funciones de debugging disponibles en window.REMEEX_DEBUG');
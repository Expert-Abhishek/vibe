import React, { createContext, useContext, useState, ReactNode } from 'react';
import AppModal, { ModalVariant } from '../components/ui/AppModal';

export interface ModalConfig {
  title: string;
  description: string;
  variant?: ModalVariant;
  primaryButtonText: string;
  onPrimaryAction: () => void | Promise<void>;
  secondaryButtonText?: string;
  onSecondaryAction?: () => void;
}

export interface ModalOptions {
  title: string;
  description?: string;
  variant?: ModalVariant;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface AppModalContextType {
  showModal: (config: ModalConfig | ModalOptions) => void;
  hideModal: () => void;
  showWarning: (title: string, description?: string, onConfirm?: () => void | Promise<void>) => void;
  showError: (title: string, description?: string, onConfirm?: () => void | Promise<void>) => void;
  showSuccess: (title: string, description?: string, onConfirm?: () => void | Promise<void>) => void;
  showInfo: (title: string, description?: string, onConfirm?: () => void | Promise<void>) => void;
  confirm: (options: ModalOptions) => void;
}

const ModalContext = createContext<AppModalContextType | undefined>(undefined);

let globalShowModalHandler: ((config: ModalConfig | ModalOptions) => void) | null = null;

export const triggerGlobalModal = (config: ModalConfig | ModalOptions) => {
  if (globalShowModalHandler) {
    globalShowModalHandler(config);
  } else {
    console.warn('triggerGlobalModal called before AppModalProvider mounted.');
  }
};

export function AppModalProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [activeConfig, setActiveConfig] = useState<{
    title: string;
    description: string;
    variant: ModalVariant;
    confirmText: string;
    cancelText?: string;
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
  } | null>(null);

  const showModal = (input: ModalConfig | ModalOptions) => {
    const isModalConfig = 'primaryButtonText' in input;
    const title = input.title;
    const description = input.description || '';
    const variant = input.variant || 'info';
    const confirmText = isModalConfig ? (input as ModalConfig).primaryButtonText : ((input as ModalOptions).confirmText || 'OK');
    const cancelText = isModalConfig ? (input as ModalConfig).secondaryButtonText : (input as ModalOptions).cancelText;
    const onConfirm = isModalConfig ? (input as ModalConfig).onPrimaryAction : (input as ModalOptions).onConfirm;
    const onCancel = isModalConfig ? (input as ModalConfig).onSecondaryAction : (input as ModalOptions).onCancel;

    setActiveConfig({
      title,
      description,
      variant,
      confirmText,
      cancelText,
      onConfirm,
      onCancel,
    });
    setVisible(true);
  };

  globalShowModalHandler = showModal;

  const hideModal = () => {
    setVisible(false);
    setActiveConfig(null);
  };

  const showWarning = (title: string, description?: string, onConfirm?: () => void | Promise<void>) => {
    showModal({ title, description, variant: 'warning', confirmText: 'OK', onConfirm });
  };

  const showError = (title: string, description?: string, onConfirm?: () => void | Promise<void>) => {
    showModal({ title, description, variant: 'error', confirmText: 'OK', onConfirm });
  };

  const showSuccess = (title: string, description?: string, onConfirm?: () => void | Promise<void>) => {
    showModal({ title, description, variant: 'success', confirmText: 'OK', onConfirm });
  };

  const showInfo = (title: string, description?: string, onConfirm?: () => void | Promise<void>) => {
    showModal({ title, description, variant: 'info', confirmText: 'OK', onConfirm });
  };

  const confirm = (options: ModalOptions) => {
    showModal({
      ...options,
      variant: options.variant || 'warning',
      cancelText: options.cancelText || 'Cancel',
      confirmText: options.confirmText || 'Confirm',
    });
  };

  return (
    <ModalContext.Provider
      value={{
        showModal,
        hideModal,
        showWarning,
        showError,
        showSuccess,
        showInfo,
        confirm,
      }}
    >
      {children}
      {activeConfig && (
        <AppModal
          visible={visible}
          title={activeConfig.title}
          description={activeConfig.description}
          variant={activeConfig.variant}
          confirmText={activeConfig.confirmText}
          cancelText={activeConfig.cancelText}
          onConfirm={activeConfig.onConfirm}
          onCancel={activeConfig.onCancel}
          onClose={hideModal}
        />
      )}
    </ModalContext.Provider>
  );
}

// Export ModalProvider alias for backward compatibility
export const ModalProvider = AppModalProvider;

export function useAppModal(): AppModalContextType {
  const context = useContext(ModalContext);
  if (!context) {
    return {
      showModal: triggerGlobalModal,
      hideModal: () => {},
      showWarning: (title, description, onConfirm) => triggerGlobalModal({ title, description, variant: 'warning', confirmText: 'OK', onConfirm }),
      showError: (title, description, onConfirm) => triggerGlobalModal({ title, description, variant: 'error', confirmText: 'OK', onConfirm }),
      showSuccess: (title, description, onConfirm) => triggerGlobalModal({ title, description, variant: 'success', confirmText: 'OK', onConfirm }),
      showInfo: (title, description, onConfirm) => triggerGlobalModal({ title, description, variant: 'info', confirmText: 'OK', onConfirm }),
      confirm: (options) => triggerGlobalModal({ ...options, cancelText: options.cancelText || 'Cancel' }),
    };
  }
  return context;
}

// Export useModal alias for backward compatibility
export const useModal = useAppModal;

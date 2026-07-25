import React, { createContext, useContext, useState, ReactNode } from 'react';
import AppModal, { ModalVariant } from '../components/ui/AppModal';

export interface ModalOptions {
  title: string;
  description?: string;
  variant?: ModalVariant;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ModalContextType {
  showModal: (options: ModalOptions) => void;
  hideModal: () => void;
  showWarning: (title: string, description?: string, onConfirm?: () => void) => void;
  showError: (title: string, description?: string, onConfirm?: () => void) => void;
  showSuccess: (title: string, description?: string, onConfirm?: () => void) => void;
  showInfo: (title: string, description?: string, onConfirm?: () => void) => void;
  confirm: (options: ModalOptions) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

// Standalone global trigger listener for non-hook callers
let globalShowModalHandler: ((options: ModalOptions) => void) | null = null;

export const triggerGlobalModal = (options: ModalOptions) => {
  if (globalShowModalHandler) {
    globalShowModalHandler(options);
  } else {
    console.warn('triggerGlobalModal called before ModalProvider mounted.');
  }
};

export function ModalProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [modalOptions, setModalOptions] = useState<ModalOptions>({
    title: '',
    description: '',
    variant: 'info',
  });

  const showModal = (options: ModalOptions) => {
    setModalOptions(options);
    setVisible(true);
  };

  globalShowModalHandler = showModal;

  const hideModal = () => {
    setVisible(false);
  };

  const showWarning = (title: string, description?: string, onConfirm?: () => void) => {
    showModal({ title, description, variant: 'warning', onConfirm });
  };

  const showError = (title: string, description?: string, onConfirm?: () => void) => {
    showModal({ title, description, variant: 'error', onConfirm });
  };

  const showSuccess = (title: string, description?: string, onConfirm?: () => void) => {
    showModal({ title, description, variant: 'success', onConfirm });
  };

  const showInfo = (title: string, description?: string, onConfirm?: () => void) => {
    showModal({ title, description, variant: 'info', onConfirm });
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
      <AppModal
        visible={visible}
        title={modalOptions.title}
        description={modalOptions.description}
        variant={modalOptions.variant || 'info'}
        confirmText={modalOptions.confirmText || 'OK'}
        cancelText={modalOptions.cancelText}
        onConfirm={modalOptions.onConfirm}
        onCancel={modalOptions.onCancel}
        onClose={hideModal}
      />
    </ModalContext.Provider>
  );
}

export function useModal(): ModalContextType {
  const context = useContext(ModalContext);
  if (!context) {
    // Provide safe fallback for components rendered outside ModalProvider
    return {
      showModal: triggerGlobalModal,
      hideModal: () => {},
      showWarning: (title, description, onConfirm) => triggerGlobalModal({ title, description, variant: 'warning', onConfirm }),
      showError: (title, description, onConfirm) => triggerGlobalModal({ title, description, variant: 'error', onConfirm }),
      showSuccess: (title, description, onConfirm) => triggerGlobalModal({ title, description, variant: 'success', onConfirm }),
      showInfo: (title, description, onConfirm) => triggerGlobalModal({ title, description, variant: 'info', onConfirm }),
      confirm: (options) => triggerGlobalModal({ ...options, cancelText: options.cancelText || 'Cancel' }),
    };
  }
  return context;
}

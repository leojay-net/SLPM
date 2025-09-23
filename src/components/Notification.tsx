import React from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface NotificationProps {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    isVisible: boolean;
    onClose: () => void;
    autoClose?: boolean;
    duration?: number;
}

export default function Notification({
    type,
    title,
    message,
    isVisible,
    onClose,
    autoClose = true,
    duration = 5000
}: NotificationProps) {
    React.useEffect(() => {
        if (isVisible && autoClose) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, autoClose, duration, onClose]);

    if (!isVisible) return null;

    const typeConfig = {
        success: {
            icon: CheckCircleIcon,
            bgColor: 'bg-green-500/10',
            borderColor: 'border-green-500/20',
            iconColor: 'text-green-400',
            titleColor: 'text-green-300'
        },
        error: {
            icon: XCircleIcon,
            bgColor: 'bg-red-500/10',
            borderColor: 'border-red-500/20',
            iconColor: 'text-red-400',
            titleColor: 'text-red-300'
        },
        warning: {
            icon: ExclamationTriangleIcon,
            bgColor: 'bg-yellow-500/10',
            borderColor: 'border-yellow-500/20',
            iconColor: 'text-yellow-400',
            titleColor: 'text-yellow-300'
        },
        info: {
            icon: InformationCircleIcon,
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/20',
            iconColor: 'text-blue-400',
            titleColor: 'text-blue-300'
        }
    };

    const config = typeConfig[type];
    const Icon = config.icon;

    return (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
            <div
                className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4 shadow-lg transition-all duration-300 transform ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
                    }`}
            >
                <div className="flex items-start space-x-3">
                    <Icon className={`w-6 h-6 ${config.iconColor} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold ${config.titleColor}`}>{title}</h4>
                        <p className="text-sm text-gray-300 mt-1">{message}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <XCircleIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

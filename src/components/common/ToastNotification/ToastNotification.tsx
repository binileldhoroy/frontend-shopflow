import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@hooks/useRedux';
import { removeNotification } from '@store/slices/uiSlice';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastNotification: React.FC = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(state => state.ui.notifications);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    notifications.forEach(notification => {
      if (notification.duration) {
        const timer = setTimeout(() => {
          dispatch(removeNotification(notification.id));
        }, notification.duration);
        timers.push(timer);
      }
    });
    return () => timers.forEach(clearTimeout);
  }, [notifications, dispatch]);

  if (notifications.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <XCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getColorClasses = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-success-600 text-white';
      case 'error':
        return 'bg-danger-600 text-white';
      case 'warning':
        return 'bg-warning-600 text-white';
      default:
        return 'bg-info-600 text-white';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] max-w-md animate-fadeIn ${getColorClasses(notification.type)}`}
          role="alert"
        >
          {getIcon(notification.type)}
          <div className="flex-1 text-sm font-medium">
            {notification.message}
          </div>
          <button
            type="button"
            className="p-1 hover:bg-white/20 rounded transition-colors duration-200"
            onClick={() => dispatch(removeNotification(notification.id))}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastNotification;

import React, { createContext, useContext, useState, useCallback } from 'react';
import Notification from './Notification';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((type, message, duration = 4000) => {
    const id = Date.now() + Math.random();
    const notification = { id, type, message, duration };
    
    setNotifications(prev => [...prev, notification]);
    
    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const success = useCallback((message, duration) => {
    return addNotification('success', message, duration);
  }, [addNotification]);

  const error = useCallback((message, duration) => {
    return addNotification('error', message, duration);
  }, [addNotification]);

  const warning = useCallback((message, duration) => {
    return addNotification('warning', message, duration);
  }, [addNotification]);

  const info = useCallback((message, duration) => {
    return addNotification('info', message, duration);
  }, [addNotification]);

  const value = {
    success,
    error,
    warning,
    info,
    removeNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div style={{ position: 'fixed', top: 0, right: 0, zIndex: 9999 }}>
        {notifications.map((notification, index) => (
          <div
            key={notification.id}
            style={{
              marginBottom: '8px',
              transform: `translateY(${index * 80}px)`
            }}
          >
            <Notification
              type={notification.type}
              message={notification.message}
              duration={notification.duration}
              onClose={() => removeNotification(notification.id)}
            />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

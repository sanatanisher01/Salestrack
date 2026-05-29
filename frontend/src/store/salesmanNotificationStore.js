// Re-export the shared notification store for backward compatibility.
// Both owner and salesman use the same notification mechanism.
export { useNotificationStore as useSalesmanNotificationStore } from './notificationStore';

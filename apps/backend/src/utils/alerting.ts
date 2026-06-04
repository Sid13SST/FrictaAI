export interface Alert {
  id: string;
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  timestamp: string;
  resolved: boolean;
}

const activeAlerts: Alert[] = [];

export function addAlert(name: string, severity: Alert['severity'], message: string) {
  const alert: Alert = {
    id: Math.random().toString(36).substring(2, 15),
    name,
    severity,
    message,
    timestamp: new Date().toISOString(),
    resolved: false
  };
  activeAlerts.push(alert);
  // Keep only the last 100 alerts
  if (activeAlerts.length > 100) {
    activeAlerts.shift();
  }
  return alert;
}

export function getAlerts() {
  return activeAlerts;
}

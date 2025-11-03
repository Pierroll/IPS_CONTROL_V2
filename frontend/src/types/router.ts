// Interfaz basada en NetworkDevice
export interface Router {
    id: string
    code: string
    name: string
    deviceType: string
    brand: string | null
    model: string | null
    ipAddress: string
    port: number
    apiPort: number | null
    connectionType: string
    useTls: boolean
    normalProfile: string | null
    cutProfile: string | null
    location: string | null
    district: string | null
    province: string | null
    department: string | null
    coordinates: string | null
    status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'FAILED'
    lastSeen: string | null
    uptime: number | null
    firmware: string | null
    serialNumber: string | null
    macAddress: string | null
    monitoringEnabled: boolean
    alertsEnabled: boolean
    cpuLoad: number | null
    memoryUsage: number | null
    activeConnections: number | null
    totalCustomers: number | null
    createdAt: string
    updatedAt: string
    _count?: {
      pppoeAccounts: number
      queueRules: number
      routerLogs: number
      alerts: number
    }
  }
  
  export interface RouterZone {
    zone: string
    district: string | null
    province: string | null
    department: string | null
    routers: Router[]
    totalRouters: number
    onlineRouters: number
    totalCustomers: number
    activeConnections: number
  }
  
  export interface RouterStatus {
    id: string
    name: string
    location: string | null
    district: string | null
    online: boolean
    info?: {
      name: string
      uptime: string
      version: string
      cpu: number
      memory: number
      totalMemory: number
    }
    error?: string
  }
  
  export interface PPPoEUser {
    name: string
    profile: string
    service: string
    disabled: string
    'remote-address'?: string
  }
  
  export interface ActiveSession {
    name: string
    address: string
    uptime: string
    'caller-id': string
    encoding?: string
  }
  
  export interface RouterLog {
    id: string
    deviceId: string
    action: string
    username: string | null
    success: boolean
    message: string | null
    metadata: any
    createdAt: string
  }
  
  export interface RouterStatistics {
    activeConnections: number
    dhcpLeases: number
    totalClients: number
  }
  
  export interface CreateRouterData {
    name: string
    host: string
    port?: number
    apiPort?: number
    username: string
    password: string
    useTls?: boolean
    location?: string
    district: string
    province?: string
    department?: string
    normalProfile?: string
    cutProfile?: string
    model?: string
  }
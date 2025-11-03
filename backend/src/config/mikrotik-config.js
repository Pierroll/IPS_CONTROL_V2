/**
 * Configuración específica para el MikroTik MARIATEGUI
 * Host: 45.5.56.186
 * Puerto: 3582
 * Usuario: apiuser
 */

const { RouterOSAPI } = require('node-routeros');

// Configuración del MikroTik
const MIKROTIK_CONFIG = {
    host: '45.5.56.186',
    port: 3582,
    user: 'apiuser',
    password: 'TuPasswordSeguro',
    tls: false,
    timeout: 10
};

class MikrotikConnection {
    constructor() {
        this.connection = null;
        this.isConnected = false;
    }

    /**
     * Establece conexión con el MikroTik
     */
    async connect() {
        try {
            this.connection = new RouterOSAPI(MIKROTIK_CONFIG);
            await this.connection.connect();
            this.isConnected = true;
            console.log('✓ Conectado a MikroTik MARIATEGUI');
            return true;
        } catch (error) {
            console.error('✗ Error al conectar:', error.message);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Cierra la conexión
     */
    async disconnect() {
        try {
            if (this.connection && this.isConnected) {
                await this.connection.close();
                this.isConnected = false;
                console.log('✓ Conexión cerrada');
            }
        } catch (error) {
            console.error('Error al cerrar conexión:', error.message);
        }
    }

    /**
     * Ejecuta un comando en el MikroTik
     */
    async executeCommand(command, params = {}) {
        if (!this.isConnected) {
            throw new Error('No hay conexión activa');
        }

        try {
            const result = await this.connection.write(command, params);
            return result;
        } catch (error) {
            console.error('Error ejecutando comando:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene información del sistema
     */
    async getSystemInfo() {
        try {
            const [identity, version, resource] = await Promise.all([
                this.executeCommand('/system/identity/print'),
                this.executeCommand('/system/resource/print'),
                this.executeCommand('/system/clock/print')
            ]);

            return {
                identity: identity[0]?.name || 'Desconocido',
                version: version[0]?.version || 'Desconocida',
                architecture: version[0]?.architecture || 'Desconocida',
                uptime: version[0]?.uptime || 'Desconocido',
                date: resource[0]?.date || 'Desconocida',
                time: resource[0]?.time || 'Desconocida'
            };
        } catch (error) {
            console.error('Error obteniendo información del sistema:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene usuarios PPPoE activos
     */
    async getActiveUsers() {
        try {
            const activeUsers = await this.executeCommand('/ppp/active/print');
            return activeUsers.map(user => ({
                name: user.name,
                address: user.address,
                uptime: user.uptime,
                bytesIn: user['bytes-in'],
                bytesOut: user['bytes-out']
            }));
        } catch (error) {
            console.error('Error obteniendo usuarios activos:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene perfiles PPPoE
     */
    async getPPPoEProfiles() {
        try {
            const profiles = await this.executeCommand('/ppp/profile/print');
            return profiles.map(profile => ({
                name: profile.name,
                localAddress: profile['local-address'],
                remoteAddress: profile['remote-address'],
                dnsServer: profile['dns-server'],
                useEncryption: profile['use-encryption']
            }));
        } catch (error) {
            console.error('Error obteniendo perfiles PPPoE:', error.message);
            throw error;
        }
    }

    /**
     * Desconecta un usuario específico
     */
    async disconnectUser(username) {
        try {
            const result = await this.executeCommand('/ppp/active/remove', {
                '.id': username
            });
            console.log(`✓ Usuario ${username} desconectado`);
            return result;
        } catch (error) {
            console.error(`Error desconectando usuario ${username}:`, error.message);
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de red
     */
    async getNetworkStats() {
        try {
            const [activeUsers, dhcpLeases] = await Promise.all([
                this.getActiveUsers(),
                this.executeCommand('/ip/dhcp-server/lease/print', { 
                    '.proplist': '.id,address,mac-address,status' 
                })
            ]);

            const boundLeases = dhcpLeases.filter(lease => lease.status === 'bound');

            return {
                activeConnections: activeUsers.length,
                dhcpLeases: dhcpLeases.length,
                boundLeases: boundLeases.length,
                totalClients: activeUsers.length + boundLeases.length
            };
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene todos los clientes PPPoE con sus perfiles
     */
    async getClientsWithProfiles() {
        try {
            const [activeUsers, pppoeSecrets] = await Promise.all([
                this.executeCommand('/ppp/active/print', {
                    '.proplist': 'name,address,uptime,bytes-in,bytes-out,profile'
                }),
                this.executeCommand('/ppp/secret/print', {
                    '.proplist': 'name,profile,local-address,remote-address,service,disabled'
                })
            ]);

            // Crear un mapa de usuarios activos por nombre
            const activeUsersMap = new Map();
            activeUsers.forEach(user => {
                activeUsersMap.set(user.name, {
                    name: user.name,
                    address: user.address,
                    uptime: user.uptime,
                    bytesIn: user['bytes-in'],
                    bytesOut: user['bytes-out'],
                    profile: user.profile,
                    status: 'ACTIVO'
                });
            });

            // Combinar información de usuarios activos y secretos
            const allClients = pppoeSecrets.map(secret => {
                const activeUser = activeUsersMap.get(secret.name);
                
                return {
                    name: secret.name,
                    profile: secret.profile,
                    localAddress: secret['local-address'],
                    remoteAddress: secret['remote-address'],
                    service: secret.service,
                    disabled: secret.disabled === 'true',
                    status: activeUser ? 'ACTIVO' : 'INACTIVO',
                    currentAddress: activeUser?.address || null,
                    uptime: activeUser?.uptime || null,
                    bytesIn: activeUser?.['bytes-in'] || null,
                    bytesOut: activeUser?.['bytes-out'] || null
                };
            });

            return allClients;
        } catch (error) {
            console.error('Error obteniendo clientes con perfiles:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene clientes agrupados por perfil
     */
    async getClientsByProfile() {
        try {
            const clients = await this.getClientsWithProfiles();
            
            // Agrupar por perfil
            const clientsByProfile = {};
            
            clients.forEach(client => {
                const profile = client.profile || 'Sin perfil';
                
                if (!clientsByProfile[profile]) {
                    clientsByProfile[profile] = {
                        profile: profile,
                        totalClients: 0,
                        activeClients: 0,
                        inactiveClients: 0,
                        clients: []
                    };
                }
                
                clientsByProfile[profile].totalClients++;
                clientsByProfile[profile].clients.push(client);
                
                if (client.status === 'ACTIVO') {
                    clientsByProfile[profile].activeClients++;
                } else {
                    clientsByProfile[profile].inactiveClients++;
                }
            });
            
            return clientsByProfile;
        } catch (error) {
            console.error('Error agrupando clientes por perfil:', error.message);
            throw error;
        }
    }

    /**
     * Cambia el perfil de un cliente
     */
    async changeClientProfile(username, newProfile) {
        try {
            // Primero verificar que el cliente existe
            const clients = await this.getClientsWithProfiles();
            const client = clients.find(c => c.name === username);
            
            if (!client) {
                throw new Error(`Cliente '${username}' no encontrado`);
            }

            console.log(`🔄 Cambiando perfil de ${username} de '${client.profile}' a '${newProfile}'`);

            // Si el cliente está activo, desconectarlo primero
            if (client.status === 'ACTIVO') {
                console.log(`📴 Desconectando cliente activo: ${username}`);
                await this.disconnectUser(username);
                
                // Esperar un momento para que se complete la desconexión
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            // Obtener el ID del secreto PPPoE
            const secrets = await this.executeCommand('/ppp/secret/print', {
                '.proplist': '.id,name,profile'
            });
            
            const secret = secrets.find(s => s.name === username);
            if (!secret) {
                throw new Error(`No se encontró el secreto PPPoE para ${username}`);
            }

            console.log(`🔧 Cambiando perfil en secreto PPPoE (ID: ${secret['.id']})`);

            // Cambiar el perfil usando el ID del secreto
            const result = await this.executeCommand('/ppp/secret/set', {
                '.id': secret['.id'],
                'profile': newProfile
            });

            console.log(`✅ Perfil cambiado exitosamente para ${username}`);
            
            // Verificar el cambio
            await new Promise(resolve => setTimeout(resolve, 1000));
            const updatedSecrets = await this.executeCommand('/ppp/secret/print', {
                '.proplist': 'name,profile'
            });
            
            const updatedSecret = updatedSecrets.find(s => s.name === username);
            const actualProfile = updatedSecret ? updatedSecret.profile : 'No encontrado';
            
            return {
                success: true,
                username: username,
                oldProfile: client.profile,
                newProfile: newProfile,
                actualProfile: actualProfile,
                wasActive: client.status === 'ACTIVO',
                message: `Perfil cambiado de '${client.profile}' a '${newProfile}' (verificado: ${actualProfile})`
            };

        } catch (error) {
            console.error(`Error cambiando perfil de ${username}:`, error.message);
            throw error;
        }
    }

    /**
     * Suspende un cliente (cambia a perfil CORTE MOROSO)
     */
    async suspendClient(username) {
        return await this.changeClientProfile(username, 'CORTE MOROSO');
    }

    /**
     * Reactiva un cliente (cambia a perfil normal)
     */
    async reactivateClient(username, profile = 'PLAN_S/. 60.00') {
        return await this.changeClientProfile(username, profile);
    }

    /**
     * Cambia múltiples clientes a un perfil específico
     */
    async changeMultipleClientsProfile(usernames, newProfile) {
        const results = [];
        
        for (const username of usernames) {
            try {
                const result = await this.changeClientProfile(username, newProfile);
                results.push(result);
                
                // Pequeña pausa entre cambios
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                results.push({
                    success: false,
                    username: username,
                    error: error.message
                });
            }
        }
        
        return results;
    }
}

// Función de prueba rápida
async function testConnection() {
    const mikrotik = new MikrotikConnection();
    
    try {
        console.log('🔄 Probando conexión...');
        const connected = await mikrotik.connect();
        
        if (connected) {
            console.log('📊 Obteniendo información del sistema...');
            const systemInfo = await mikrotik.getSystemInfo();
            
            console.log('\n📋 Información del Sistema:');
            console.log(`   Identidad: ${systemInfo.identity}`);
            console.log(`   Versión: ${systemInfo.version}`);
            console.log(`   Arquitectura: ${systemInfo.architecture}`);
            console.log(`   Tiempo activo: ${systemInfo.uptime}`);
            
            console.log('\n📊 Estadísticas de red:');
            const stats = await mikrotik.getNetworkStats();
            console.log(`   Conexiones activas: ${stats.activeConnections}`);
            console.log(`   Clientes DHCP: ${stats.boundLeases}`);
            console.log(`   Total clientes: ${stats.totalClients}`);
            
            console.log('\n✅ Prueba completada exitosamente');
        }
    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
    } finally {
        await mikrotik.disconnect();
    }
}

module.exports = {
    MikrotikConnection,
    MIKROTIK_CONFIG,
    testConnection
};

// Ejecutar prueba si se llama directamente
if (require.main === module) {
    testConnection();
}

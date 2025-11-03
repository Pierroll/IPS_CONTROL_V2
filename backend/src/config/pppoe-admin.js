const RouterOSAPI = require('node-routeros').RouterOSAPI;
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

class PPPoEAdmin {
    constructor() {
        // No mantener conexión permanente
    }

    async executeWithConnection(callback) {
        const conn = new RouterOSAPI({
            host: config.host,
            user: config.user,
            password: config.password,
            port: config.port,
            timeout: 10
        });

        try {
            await conn.connect();
            const result = await callback(conn);
            conn.close();
            return result;
        } catch (error) {
            if (conn) conn.close();
            throw error;
        }
    }

    // ========== GESTIÓN DE USUARIOS ==========

    async getAllUsers() {
        return await this.executeWithConnection(async (conn) => {
            return await conn.write('/ppp/secret/print');
        });
    }

    async getUser(username) {
        return await this.executeWithConnection(async (conn) => {
            const users = await conn.write('/ppp/secret/print', [
                `?name=${username}`
            ]);
            return users[0] || null;
        });
    }

    async getUsersByProfile(profileName) {
        return await this.executeWithConnection(async (conn) => {
            return await conn.write('/ppp/secret/print', [
                `?profile=${profileName}`
            ]);
        });
    }

    // ========== CAMBIAR PERFIL ==========

    async changeUserProfile(username, newProfile) {
        return await this.executeWithConnection(async (conn) => {
            const users = await conn.write('/ppp/secret/print', [
                `?name=${username}`
            ]);
            
            if (users.length === 0) {
                throw new Error(`❌ Usuario "${username}" no encontrado`);
            }

            const user = users[0];
            const oldProfile = user.profile || 'default';

            const profiles = await conn.write('/ppp/profile/print', [
                `?name=${newProfile}`
            ]);
            
            if (profiles.length === 0) {
                throw new Error(`❌ Perfil "${newProfile}" no existe`);
            }

            await conn.write('/ppp/secret/set', [
                `=.id=${user['.id']}`,
                `=profile=${newProfile}`
            ]);

            console.log(`✅ Perfil cambiado: ${username}`);
            console.log(`   ${oldProfile} → ${newProfile}`);

            const activeUsers = await conn.write('/ppp/active/print', [
                `?name=${username}`
            ]);

            if (activeUsers.length > 0) {
                console.log(`⚠️  Usuario conectado - desconectando...`);
                
                await conn.write('/ppp/active/remove', [
                    `=.id=${activeUsers[0]['.id']}`
                ]);
                
                console.log(`✅ Usuario desconectado (debe reconectarse)`);
            }

            return {
                success: true,
                username,
                oldProfile,
                newProfile,
                wasDisconnected: activeUsers.length > 0
            };
        });
    }

    // ========== CORTAR USUARIO (MOROSO) ==========

    async cutUser(username) {
        return await this.executeWithConnection(async (conn) => {
            const users = await conn.write('/ppp/secret/print', [
                `?name=${username}`
            ]);
            
            if (users.length === 0) {
                throw new Error(`❌ Usuario "${username}" no encontrado`);
            }

            const user = users[0];
            const oldProfile = user.profile;

            await conn.write('/ppp/secret/set', [
                `=.id=${user['.id']}`,
                `=profile=CORTE MOROSO`
            ]);

            const activeUsers = await conn.write('/ppp/active/print', [
                `?name=${username}`
            ]);

            if (activeUsers.length > 0) {
                await conn.write('/ppp/active/remove', [
                    `=.id=${activeUsers[0]['.id']}`
                ]);
                console.log(`🔴 Usuario desconectado y cortado: ${username}`);
            } else {
                console.log(`✅ Usuario cortado: ${username}`);
            }

            return {
                success: true,
                username,
                oldProfile,
                newProfile: 'CORTE MOROSO',
                wasDisconnected: activeUsers.length > 0
            };
        });
    }

    // ========== REHABILITAR USUARIO ==========

    async restoreUser(username, newProfile = 'PLAN. S/60.00') {
        return await this.executeWithConnection(async (conn) => {
            const users = await conn.write('/ppp/secret/print', [
                `?name=${username}`
            ]);
            
            if (users.length === 0) {
                throw new Error(`❌ Usuario "${username}" no encontrado`);
            }

            const user = users[0];

            await conn.write('/ppp/secret/set', [
                `=.id=${user['.id']}`,
                `=profile=${newProfile}`
            ]);

            console.log(`✅ Usuario rehabilitado: ${username}`);
            console.log(`   Perfil: ${newProfile}`);

            return {
                success: true,
                username,
                newProfile
            };
        });
    }

    // ========== DESCONECTAR USUARIO ==========

    async disconnectUser(username) {
        return await this.executeWithConnection(async (conn) => {
            const activeUsers = await conn.write('/ppp/active/print', [
                `?name=${username}`
            ]);

            if (activeUsers.length === 0) {
                console.log(`ℹ️  Usuario "${username}" no está conectado`);
                return { success: false, message: 'Usuario no conectado' };
            }

            await conn.write('/ppp/active/remove', [
                `=.id=${activeUsers[0]['.id']}`
            ]);

            console.log(`🔌 Usuario desconectado: ${username}`);

            return { success: true, username };
        });
    }

    // ========== OBTENER USUARIOS ACTIVOS ==========

    async getActiveUsers() {
        return await this.executeWithConnection(async (conn) => {
            return await conn.write('/ppp/active/print');
        });
    }

    // ========== OBTENER USUARIOS MOROSOS ==========

    async getMorosUsers() {
        return await this.executeWithConnection(async (conn) => {
            return await conn.write('/ppp/secret/print', [
                '?profile=CORTE MOROSO'
            ]);
        });
    }

    // ========== OBTENER PERFILES ==========

    async getProfiles() {
        return await this.executeWithConnection(async (conn) => {
            return await conn.write('/ppp/profile/print');
        });
    }

    // ========== CREAR NUEVO USUARIO ==========

    async createUser(username, password, profile = 'PLAN. S/60.00') {
        return await this.executeWithConnection(async (conn) => {
            const existing = await conn.write('/ppp/secret/print', [
                `?name=${username}`
            ]);
            
            if (existing.length > 0) {
                throw new Error(`❌ Usuario "${username}" ya existe`);
            }

            await conn.write('/ppp/secret/add', [
                `=name=${username}`,
                `=password=${password}`,
                `=profile=${profile}`,
                '=service=pppoe'
            ]);

            console.log(`✅ Usuario creado: ${username}`);
            console.log(`   Perfil: ${profile}`);

            return { success: true, username, profile };
        });
    }

    // ========== ESTADÍSTICAS ==========

    async getStats() {
        return await this.executeWithConnection(async (conn) => {
            const profiles = await conn.write('/ppp/profile/print');
            const allUsers = await conn.write('/ppp/secret/print');
            const activeUsers = await conn.write('/ppp/active/print');
            const morosUsers = await conn.write('/ppp/secret/print', [
                '?profile=CORTE MOROSO'
            ]);

            const usersByProfile = {};
            allUsers.forEach(user => {
                const profile = user.profile || 'default';
                if (!usersByProfile[profile]) {
                    usersByProfile[profile] = [];
                }
                usersByProfile[profile].push(user.name);
            });

            return {
                totalProfiles: profiles.length,
                totalUsers: allUsers.length,
                activeUsers: activeUsers.length,
                morosUsers: morosUsers.length,
                usersByProfile
            };
        });
    }
}

module.exports = PPPoEAdmin;
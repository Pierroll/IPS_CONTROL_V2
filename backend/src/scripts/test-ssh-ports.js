/**
 * Script para probar diferentes puertos SSH en el MikroTik
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    magenta: '\x1b[35m',
    cyan: '\x1b[96m',
    white: '\x1b[37m',
    bold: '\x1b[1m'
};

async function testSSHPort(host, port, username, password) {
    try {
        const command = `sshpass -p "${password}" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o ConnectTimeout=5 -p ${port} ${username}@${host} "/system identity print"`;
        
        const { stdout, stderr } = await execAsync(command, {
            timeout: 10000
        });
        
        return {
            success: true,
            port: port,
            output: stdout.trim(),
            error: null
        };
        
    } catch (error) {
        return {
            success: false,
            port: port,
            output: null,
            error: error.message
        };
    }
}

async function testAllPorts() {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  PRUEBA DE PUERTOS SSH EN MIKROTIK                      ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    const host = '45.5.56.186';
    const username = 'apiuser';
    const password = 'TuPasswordSeguro';
    
    // Puertos comunes para SSH en MikroTik
    const ports = [22, 23, 2222, 8022, 3582, 8728, 8729];
    
    console.log(`${colors.yellow}🔄 Probando puertos SSH en ${host}...${colors.reset}\n`);
    
    for (const port of ports) {
        console.log(`${colors.blue}Probando puerto ${port}...${colors.reset}`);
        
        const result = await testSSHPort(host, port, username, password);
        
        if (result.success) {
            console.log(`${colors.green}✅ ¡CONEXIÓN EXITOSA en puerto ${port}!${colors.reset}`);
            console.log(`${colors.cyan}Identidad del sistema:${colors.reset}`);
            console.log(result.output);
            console.log('');
            return { success: true, port: port, output: result.output };
        } else {
            if (result.error.includes('Connection refused')) {
                console.log(`${colors.red}❌ Puerto ${port}: Conexión rechazada${colors.reset}`);
            } else if (result.error.includes('timeout')) {
                console.log(`${colors.yellow}⏰ Puerto ${port}: Timeout${colors.reset}`);
            } else {
                console.log(`${colors.red}❌ Puerto ${port}: ${result.error}${colors.reset}`);
            }
        }
    }
    
    console.log(`${colors.red}❌ No se encontró ningún puerto SSH funcional${colors.reset}`);
    return { success: false, port: null, output: null };
}

async function testTelnetPorts() {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  PRUEBA DE PUERTOS TELNET EN MIKROTIK                   ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    const host = '45.5.56.186';
    const username = 'apiuser';
    const password = 'TuPasswordSeguro';
    
    // Puertos comunes para Telnet en MikroTik
    const ports = [23, 8023];
    
    console.log(`${colors.yellow}🔄 Probando puertos Telnet en ${host}...${colors.reset}\n`);
    
    for (const port of ports) {
        try {
            console.log(`${colors.blue}Probando Telnet puerto ${port}...${colors.reset}`);
            
            // Usar telnet con expect para automatizar
            const command = `timeout 10 telnet ${host} ${port} << 'EOF'
${username}
${password}
/system identity print
quit
EOF`;
            
            const { stdout, stderr } = await execAsync(command, {
                timeout: 15000
            });
            
            if (stdout.includes('MARIATEGUI') || stdout.includes('identity')) {
                console.log(`${colors.green}✅ ¡CONEXIÓN TELNET EXITOSA en puerto ${port}!${colors.reset}`);
                console.log(`${colors.cyan}Salida:${colors.reset}`);
                console.log(stdout);
                return { success: true, port: port, output: stdout };
            } else {
                console.log(`${colors.red}❌ Puerto ${port}: No se obtuvo respuesta válida${colors.reset}`);
            }
            
        } catch (error) {
            console.log(`${colors.red}❌ Puerto ${port}: ${error.message}${colors.reset}`);
        }
    }
    
    console.log(`${colors.red}❌ No se encontró ningún puerto Telnet funcional${colors.reset}`);
    return { success: false, port: null, output: null };
}

async function main() {
    console.log(`${colors.yellow}🔍 Buscando método de conexión al MikroTik...${colors.reset}\n`);
    
    // Probar SSH primero
    const sshResult = await testAllPorts();
    
    if (!sshResult.success) {
        console.log(`\n${colors.yellow}SSH no disponible, probando Telnet...${colors.reset}\n`);
        const telnetResult = await testTelnetPorts();
        
        if (!telnetResult.success) {
            console.log(`\n${colors.red}❌ No se encontró ningún método de conexión directa${colors.reset}`);
            console.log(`${colors.yellow}💡 Posibles soluciones:${colors.reset}`);
            console.log(`   1. Habilitar SSH en el MikroTik: /ip service set ssh port=22`);
            console.log(`   2. Habilitar Telnet en el MikroTik: /ip service set telnet port=23`);
            console.log(`   3. Verificar firewall del MikroTik`);
            console.log(`   4. Usar la API que ya funciona para comandos de solo lectura`);
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main().catch(error => {
        console.error(`${colors.red}💥 Error fatal: ${error.message}${colors.reset}`);
    });
}

module.exports = { testAllPorts, testTelnetPorts };

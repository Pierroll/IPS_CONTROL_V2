const PPPoEAdmin = require('./pppoe-admin');
const readline = require('readline');

const admin = new PPPoEAdmin();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function showMenu() {
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║   ADMINISTRADOR PPPoE MARIATEGUI     ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('\n1. Ver usuarios activos');
    console.log('2. Ver usuarios morosos');
    console.log('3. Cambiar perfil de usuario');
    console.log('4. Cortar usuario (moroso)');
    console.log('5. Rehabilitar usuario');
    console.log('6. Desconectar usuario');
    console.log('7. Ver estadísticas');
    console.log('8. Crear nuevo usuario');
    console.log('9. Salir');
    console.log('');
}

async function handleOption(option) {
    try {
        await admin.connect();

        switch (option) {
            case '1':
                const active = await admin.getActiveUsers();
                console.log(`\n🟢 Usuarios activos: ${active.length}`);
                active.forEach(u => console.log(`   - ${u.name} (${u.address})`));
                break;

            case '2':
                const morosos = await admin.getMorosUsers();
                console.log(`\n🔴 Usuarios morosos: ${morosos.length}`);
                morosos.forEach(u => console.log(`   - ${u.name}`));
                break;

            case '3':
                rl.question('Usuario: ', async (username) => {
                    rl.question('Nuevo perfil: ', async (profile) => {
                        await admin.changeUserProfile(username, profile);
                        promptMenu();
                    });
                });
                return;

            case '4':
                rl.question('Usuario a cortar: ', async (username) => {
                    await admin.cutUser(username);
                    promptMenu();
                });
                return;

            case '5':
                rl.question('Usuario a rehabilitar: ', async (username) => {
                    rl.question('Perfil: ', async (profile) => {
                        await admin.restoreUser(username, profile);
                        promptMenu();
                    });
                });
                return;

            case '6':
                rl.question('Usuario a desconectar: ', async (username) => {
                    await admin.disconnectUser(username);
                    promptMenu();
                });
                return;

            case '7':
                const stats = await admin.getStats();
                console.log('\n📊 ESTADÍSTICAS:');
                console.log(`   Total usuarios: ${stats.totalUsers}`);
                console.log(`   Activos: ${stats.activeUsers}`);
                console.log(`   Morosos: ${stats.morosUsers}`);
                console.log('\n   Por perfil:');
                for (const [profile, users] of Object.entries(stats.usersByProfile)) {
                    console.log(`   - ${profile}: ${users.length} usuarios`);
                }
                break;

            case '8':
                rl.question('Nombre de usuario: ', async (username) => {
                    rl.question('Contraseña: ', async (password) => {
                        rl.question('Perfil: ', async (profile) => {
                            await admin.createUser(username, password, profile);
                            promptMenu();
                        });
                    });
                });
                return;

            case '9':
                await admin.disconnect();
                rl.close();
                process.exit(0);
                break;

            default:
                console.log('Opción inválida');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    promptMenu();
}

function promptMenu() {
    showMenu();
    rl.question('Opción: ', handleOption);
}

promptMenu();
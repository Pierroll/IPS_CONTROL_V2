'use strict';

const express = require('express');
const cors = require('cors');
const { RouterOSAPI } = require('node-routeros');
const { config } = require('./config');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

function createRosClient() {
	return new RouterOSAPI({
		host: config.mikrotik.host,
		user: config.mikrotik.user,
		password: config.mikrotik.password,
		port: config.mikrotik.port,
		timeout: 10
	});
}

async function withRos(callback) {
	const api = createRosClient();
	await api.connect();
	try {
		return await callback(api);
	} finally {
		await api.close();
	}
}

app.get('/api/health', (req, res) => {
	return res.json({ ok: true, service: 'mikrotik-api', time: new Date().toISOString() });
});

app.post('/api/cortar/pppoe/:username', async (req, res) => {
	const username = req.params.username;
	try {
		await withRos(async (api) => {
			await api.write('/ppp/secret/set', { numbers: username, profile: config.ppp.profileCut });
			const active = await api.write('/ppp/active/print', { '.proplist': '.id,name' });
			const session = active.find((s) => s.name === username);
			if (session) {
				await api.write('/ppp/active/remove', { '.id': session['.id'] });
			}
		});
		return res.json({ ok: true, message: `Usuario ${username} movido a ${config.ppp.profileCut}` });
	} catch (e) {
		return res.status(500).json({ ok: false, error: e.message });
	}
});

app.post('/api/restaurar/pppoe/:username', async (req, res) => {
	const username = req.params.username;
	try {
		await withRos(async (api) => {
			await api.write('/ppp/secret/set', { numbers: username, profile: `"${config.ppp.profileNormal}"` });
			const active = await api.write('/ppp/active/print', { '.proplist': '.id,name' });
			const session = active.find((s) => s.name === username);
			if (session) {
				await api.write('/ppp/active/remove', { '.id': session['.id'] });
			}
		});
		return res.json({ ok: true, message: `Usuario ${username} movido a ${config.ppp.profileNormal}` });
	} catch (e) {
		return res.status(500).json({ ok: false, error: e.message });
	}
});

app.post('/api/cortar/dhcp/:mac', async (req, res) => {
	const mac = String(req.params.mac || '').toUpperCase();
	try {
		await withRos(async (api) => {
			const leases = await api.write('/ip/dhcp-server/lease/print', { '.proplist': '.id,mac-address', 'mac-address': mac });
			if (!leases.length) throw new Error('Lease no encontrado');
			await api.write('/ip/dhcp-server/lease/set', { '.id': leases[0]['.id'], 'address-pool': 'POOL_CORTE' });
		});
		return res.json({ ok: true, message: `MAC ${mac} movida a POOL_CORTE` });
	} catch (e) {
		return res.status(500).json({ ok: false, error: e.message });
	}
});

app.listen(config.port, () => {
	console.log(`Servidor iniciado en http://localhost:${config.port}`);
});

'use strict';

require('dotenv').config();

function envBool(value, fallback) {
	if (value === undefined) return !!fallback;
	const lowered = String(value).toLowerCase();
	return lowered === '1' || lowered === 'true' || lowered === 'yes';
}

const config = {
	port: Number(process.env.PORT || 3000),
	mikrotik: {
		host: process.env.MIKROTIK_HOST || '192.168.88.1',
		port: Number(process.env.MIKROTIK_PORT || 8729),
		user: process.env.MIKROTIK_USER || 'apiuser',
		password: process.env.MIKROTIK_PASSWORD || 'TuPasswordSeguro',
		tls: envBool(process.env.MIKROTIK_TLS, true),
		insecure: envBool(process.env.MIKROTIK_INSECURE, true),
	},
	ppp: {
		profileNormal: process.env.PPP_PROFILE_NORMAL || 'PERFIL_NORMAL',
		profileCut: process.env.PPP_PROFILE_CUT || 'PERFIL_CORTE',
	},
};

module.exports = { config };

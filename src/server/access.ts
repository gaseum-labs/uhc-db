import * as fs from 'fs/promises';
import * as express from 'express';
import * as db from './db';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { promisify } from 'util';
import axios from 'axios';
import * as util from './util';

type OAuthFile = {
	client_id: string;
	client_secret: string;
	redirect_uris: string[];
};

type ConfigFile = {
	host: string;
};

export type AccessData = {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
	publicKey: string;
	privateKey: string;
};

export type Payload = {
	userId: string;
};

export type DiscordIdentity = {
	id: string;
	username: string;
};

export const PERMISSIONS_ALL = 0;
export const PERMISSIONS_ADMIN = 1;
export const PERMISSIONS_DEV = 2;

let data: AccessData;
export let config: ConfigFile;

export const setupAccess = async (googleCloudProject: string | undefined) => {
	const [
		oauthFileBuffer,
		publicKeyFileBuffer,
		privateKeyFileBuffer,
		configFileBuffer,
	] = await Promise.all([
		fs.readFile('keys/oauth.json'),
		fs.readFile('keys/public.key'),
		fs.readFile('keys/private.key'),
		fs.readFile('keys/config.json'),
	]);

	const oAuthFile: OAuthFile = JSON.parse(oauthFileBuffer.toString());
	const publicKey = publicKeyFileBuffer.toString();
	const privateKey = privateKeyFileBuffer.toString();
	config = JSON.parse(configFileBuffer.toString());
	if (!config.host) {
		console.error('Host option not found in config.json.');
	}

	data = {
		clientId: oAuthFile.client_id,
		clientSecret: oAuthFile.client_secret,
		redirectUri:
			oAuthFile.redirect_uris[googleCloudProject === undefined ? 0 : 1],
		publicKey,
		privateKey,
	};
};

export const authUrl = (redirect?: string) => {
	const state = {
		redirect: redirect ?? `/home`,
	};
	return (
		`https://discord.com/api/oauth2/authorize?client_id=${data.clientId}&redirect_uri=${data.redirectUri}&response_type=code&scope=identify` +
		`&state=${JSON.stringify(state)}`
	);
};

export const exchangeCodeForDiscordToken = async (code: string) => {
	const params = new URLSearchParams();

	params.append('client_id', data.clientId);
	params.append('client_secret', data.clientSecret);
	params.append('grant_type', 'authorization_code');
	params.append('code', code.toString());
	params.append('redirect_uri', data.redirectUri);

	const tokenRequest = await axios.post(
		'https://discord.com/api/oauth2/token',
		params,
	);

	if (tokenRequest.status != 200) {
		util.makeError(400);
	}

	return tokenRequest.data.access_token as string;
};

export const getDiscordIdentity = async (
	token: string,
): Promise<DiscordIdentity> => {
	const idRequest = await axios.get('https://discord.com/api/users/@me', {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	if (idRequest.status != 200) {
		util.makeError(400);
	}

	return {
		id: idRequest.data.id as string,
		username:
			(idRequest.data.username as string) +
			'#' +
			(idRequest.data.discriminator as string),
	};
};

export const verifyJWT = (token: string | undefined) => {
	if (token === undefined) return undefined;

	try {
		const payload = jwt.verify(token, data.publicKey, {
			algorithms: ['RS512'],
		}) as Payload;

		return payload.userId;
	} catch (ex) {
		console.log(ex);
		return undefined;
	}
};

export const createJWT = (userId: string) => {
	return jwt.sign({ userId }, data.privateKey, {
		expiresIn: '7 days',
		algorithm: 'RS512',
	});
};

export const authorization = async (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
) => {
	const token = req.cookies['token'];
	if (token === undefined) return void res.redirect(authUrl(req.url));

	const user = await db.getUser(token);
	if (user === undefined) return void res.redirect(authUrl(req.url));

	res.locals.user = user;
	next();
};

export const optionalAuthorization = async (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
) => {
	const token = req.cookies['token'];
	if (token === undefined) return next();

	const user = await db.getUser(token);
	if (user === undefined) return next();

	res.locals.user = user;
	next();
};

export const botAuthorization = async (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
) => {
	const authorization = req.headers.authorization;
	if (authorization === undefined) return res.sendStatus(401);

	const parts = authorization.split(' ');
	if (parts.length !== 2 || parts[0] !== 'Bearer') return res.sendStatus(401);

	if (await db.findBotToken(parts[1])) {
		next();
	} else {
		res.sendStatus(401);
	}
};

export const requireAdmin = (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
) => {
	if ((res.locals.user as db.DataUser).permissions < PERMISSIONS_ADMIN) {
		res.sendStatus(401);
	} else {
		next();
	}
};

export const requireDev = (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
) => {
	if ((res.locals.user as db.DataUser).permissions < PERMISSIONS_DEV) {
		res.sendStatus(401);
	} else {
		next();
	}
};

const tokenChars =
	'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.~';

export const generateBotToken = () => {
	let ret = '';

	for (let i = 0; i < 32; ++i) {
		ret += tokenChars[Math.floor(Math.random() * tokenChars.length)];
	}

	return ret;
};

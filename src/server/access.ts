import * as fs from 'fs';
import * as auth from 'google-auth-library';
import * as express from 'express';
import * as db from './db';
import * as init from './init';

type WebClientFile = {
	client_id: string;
	project_id: string;
	auth_uri: string;
	token_uri: string;
	auth_provider_x509_cert_url: string;
	client_secret: string;
	redirect_uris: string[];
	javascript_origins: string[];
};

export const PERMISSIONS_ALL = 0;
export const PERMISSIONS_ADMIN = 1;
export const PERMISSIONS_DEV = 2;

export const webClient: WebClientFile = JSON.parse(
	fs.readFileSync('keys/webclient.json').toString(),
).web;

export const oauthClient = new auth.OAuth2Client(
	webClient.client_id,
	webClient.client_secret,
	webClient.redirect_uris[init.PROJECT_ID === undefined ? 0 : 1],
);

export const authorization = async (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
) => {
	const user = await db.getOrCreateUser(req.cookies['token']);
	if (user === undefined) return void res.redirect('/expired');
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
	if ((res.locals.user as db.User).permissions < PERMISSIONS_ADMIN) {
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
	if ((res.locals.user as db.User).permissions < PERMISSIONS_DEV) {
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

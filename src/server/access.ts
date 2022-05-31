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

export const requireAdmin = (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
) => {
	if ((res.locals.user as db.User).permissions < PERMISSIONS_ADMIN) {
		res.status(401);
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
		res.status(401);
	} else {
		next();
	}
};

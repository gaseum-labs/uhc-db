import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as datastore from '@google-cloud/datastore';
import * as fs from 'fs';
import * as auth from 'google-auth-library';
import * as reactServer from 'react-dom/server';
import * as cookieParser from 'cookie-parser';
import * as stream from 'stream';

import { Home } from './home';
import { NextFunction } from 'connect';
import { Expired } from './expired';

const app = express.default();

const PORT = process.env.PORT ?? 8080;
const PROJECT_ID = process.env['GOOGLE_CLOUD_PROJECT'];

/* use app engine's integrated datastore service account if running on app engine */
/* otherwise use the account specified by the keys file */
const db = new datastore.Datastore(
	PROJECT_ID === undefined
		? {
				keyFilename: 'keys/db.json',
		  }
		: {
				projectId: PROJECT_ID,
		  },
);

const webClient: WebClientFile = JSON.parse(
	fs.readFileSync('keys/webclient.json').toString(),
).web;

const oauthClient = new auth.OAuth2Client(
	webClient.client_id,
	webClient.client_secret,
	webClient.redirect_uris[PROJECT_ID === undefined ? 0 : 1],
);

const PERMISSIONS_ALL = 0;
const PERMISSIONS_ADMIN = 1;
const PERMISSIONS_DEV = 2;

const OBJ_USER = 'user';

const TYPE_JSON = 'application/json';
const TYPE_HTML = 'text/html';

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

type User = {
	data: number;
	permissions: number;
	lastServerToken: string | undefined;
};

type Keyed = { [db.KEY]: datastore.Key };

const getOrCreateUser = async (token: string | undefined) => {
	if (token === undefined) return undefined;

	/* parse the payload of the token and verify that it is valid */
	let ticket: auth.LoginTicket;
	try {
		ticket = await oauthClient.verifyIdToken({
			idToken: token,
			audience: webClient.client_id,
		});
	} catch (ex) {
		return undefined;
	}

	/* grab user from the db */
	const userId = ticket.getUserId();
	if (userId === null) return undefined;
	const key = db.key([OBJ_USER, db.int(userId)]);
	const [fetchedUser]: [(User & Keyed) | undefined] = await db.get(key);

	/* create user if they don't exist */
	let user: User & Keyed;
	if (fetchedUser === undefined) {
		const defaultUser = createDefaultUser();
		await db.save({
			key: key,
			data: defaultUser,
		});

		user = Object.assign(defaultUser, {
			[db.KEY]: key,
		});
	} else {
		user = fetchedUser;
	}

	return user;
};

const createDefaultUser = (): User => {
	return {
		data: Math.floor(Math.random() * 70),
		permissions: 0,
		lastServerToken: undefined,
	};
};

/* i hate this */
const authorizationAll = async (
	req: express.Request,
	res: express.Response,
	next: NextFunction,
) => {
	const user = await getOrCreateUser(req.cookies['token']);
	if (user === undefined) return void res.redirect('/expired');
	if (user.permissions < PERMISSIONS_ALL) return void res.status(401);
	res.locals.user = user;
	next();
};
const authorizationAdmin = async (
	req: express.Request,
	res: express.Response,
	next: NextFunction,
) => {
	const user = await getOrCreateUser(req.cookies['token']);
	if (user === undefined) return void res.redirect('/expired');
	if (user.permissions < PERMISSIONS_ADMIN) return void res.status(401);
	res.locals.user = user;
	next();
};
const authorizationDev = async (
	req: express.Request,
	res: express.Response,
	next: NextFunction,
) => {
	const user = await getOrCreateUser(req.cookies['token']);
	if (user === undefined) return void res.redirect('/expired');
	if (user.permissions < PERMISSIONS_DEV) return void res.status(401);
	res.locals.user = user;
	next();
};

const makeDownload = (
	res: express.Response,
	fileData: string,
	fileName: string,
) => {
	var fileContents = Buffer.from(fileData, 'base64');

	res.set('Content-disposition', 'attachment; filename=' + fileName);
	res.set('Content-type', 'application/json');

	var readStream = new stream.PassThrough();
	readStream.end(fileContents);
	readStream.pipe(res);
};

app.use(cookieParser.default());
app.use(bodyParser.json());

app.get(['/', '/login'], (req, res) => {
	res.redirect(
		oauthClient.generateAuthUrl({
			access_type: 'online',
			scope: 'https://www.googleapis.com/auth/userinfo.email',
		}),
	);
});

app.get('/expired', (req, res) => {
	res.send(reactServer.renderToString(<Expired />));
});

app.get('/token', (req, res) => {
	const code = req.query['code'] as string | undefined;
	if (code === undefined) {
		return res.sendStatus(400);
	}

	const isServerToken =
		(req.query['state'] as string | undefined) === 'server';

	oauthClient.getToken(code).then(async tokenResponse => {
		const token = tokenResponse.tokens.id_token;
		if (typeof token !== 'string') {
			return res.sendStatus(500);
		}
		const user = await getOrCreateUser(token);
		if (user === undefined) return res.status(500);

		if (isServerToken) {
			if (user.permissions < PERMISSIONS_ADMIN) {
				return res.status(401);
			}

			const refreshToken = tokenResponse.tokens.refresh_token;
			if (typeof refreshToken !== 'string') {
				return res.sendStatus(400);
			}

			/* invalidate old token, store new token */
			/* this way users can only have one active token at a time */
			const lastServerToken = user.lastServerToken;
			if (lastServerToken !== undefined) {
				await Promise.all([
					oauthClient.revokeToken(lastServerToken),
					db.save({
						key: user[db.KEY],
						data: Object.assign(user, {
							lastServerToken: refreshToken,
						}),
					}),
				]);
			}

			makeDownload(
				res,
				JSON.stringify({
					token: refreshToken,
				}),
				'uhc-db.json',
			);
		} else {
			res.cookie('token', token);
			res.redirect('/home');
		}
	});
});

app.get('/home', authorizationAll, async (req, res) => {
	const user = res.locals.user as User & Keyed;

	res.send(
		reactServer.renderToString(
			<Home
				number={user.data ?? -1}
				isAdmin={user.permissions >= PERMISSIONS_ADMIN}
			/>,
		),
	);
});

app.get('/servertoken', authorizationAdmin, (req, res) => {
	res.redirect(
		oauthClient.generateAuthUrl({
			access_type: 'offline',
			scope: 'https://www.googleapis.com/auth/userinfo.email',
			state: 'server',
		}),
	);
});

app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}...`);
});

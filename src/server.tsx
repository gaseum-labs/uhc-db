import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as datastore from '@google-cloud/datastore';
import * as fs from 'fs';
import * as auth from 'google-auth-library';
import * as reactServer from 'react-dom/server';
import * as cookieParser from 'cookie-parser';

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

const TYPE_USER = 'user';

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
};

type Keyed = { [db.KEY]: datastore.Key };

const authCheck = async (
	req: express.Request,
	res: express.Response,
	next: NextFunction,
) => {
	try {
		/* authorization token exists in the cookies of the request */
		const token = req.cookies['token'];
		if (token === undefined) return res.status(401);

		/* parse the payload of the token and verify that it is valid */
		const ticket = await oauthClient.verifyIdToken({
			idToken: token,
			audience: webClient.client_id,
		});

		/* pass on userId to next middleware function */
		const userId = ticket.getUserId();
		if (userId === null) return res.status(500);
		res.locals.userId = userId;

		next();
	} catch (ex) {
		/* verification failed, token may be expired */
		res.redirect('/expired');
	}
};

app.use(cookieParser.default());
app.use(bodyParser.json());

app.get(['/', '/login'], (req, res) => {
	res.redirect(
		oauthClient.generateAuthUrl({
			access_type: 'online',
			scope: 'https://www.googleapis.com/auth/userinfo.email',
			response_type: 'code',
		}),
	);
});

app.get('/expired', (req, res) => {
	res.send(reactServer.renderToString(<Expired />));
});

app.get('/token', (req, res) => {
	const code = req.query.code as string | undefined;
	if (code === undefined) {
		return res.sendStatus(400);
	}

	oauthClient.getToken(code).then(async tokenResponse => {
		const jwt = tokenResponse.tokens.id_token;
		if (typeof jwt !== 'string') {
			return res.sendStatus(500);
		}

		const ticket = await oauthClient.verifyIdToken({
			idToken: jwt,
			audience: webClient.client_id,
		});

		const userId = ticket.getUserId();
		if (userId === null) {
			return res.sendStatus(500);
		}

		const key = db.key([TYPE_USER, db.int(userId)]);
		const [user]: [User | undefined] = await db.get(key);

		if (user === undefined) {
			await db.save({
				key: key,
				data: { data: Math.floor(Math.random() * 70) },
			});
		}

		res.cookie('token', jwt).redirect('/home');
	});
});

app.get('/home', authCheck, async (req, res) => {
	const userId = res.locals.userId as string;

	const key = db.key([TYPE_USER, db.int(userId)]);
	const [user]: [User | undefined] = await db.get(key);

	res.send(reactServer.renderToString(<Home number={user?.data ?? -1} />));
});

app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}...`);
});

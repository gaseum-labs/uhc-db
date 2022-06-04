import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as stream from 'stream';
import { Home } from '../shared/home';
import { Expired } from '../shared/expired';
import * as access from './access';
import * as db from './db';
import * as rendering from './rendering';

const makeDownload = (
	res: express.Response,
	fileData: string,
	fileName: string,
	fileType: string,
) => {
	const fileContents = Buffer.from(fileData);

	res.set('Content-disposition', 'attachment; filename=' + fileName);
	res.set('Content-type', fileType);

	const readStream = new stream.PassThrough();
	readStream.end(fileContents);
	readStream.pipe(res);
};

export const app = express.default();

/* logger */
app.use((req, res, next) => {
	console.log(req.httpVersion, req.originalUrl, req.headers);
	next();
});

app.use(express.static('./static'));
app.use(cookieParser.default());

app.get(['/', '/login'], (req, res) => {
	res.redirect(
		access.oauthClient.generateAuthUrl({
			access_type: 'online',
			scope: 'https://www.googleapis.com/auth/userinfo.email',
		}),
	);
});

app.get('/token', (req, res) => {
	const code = req.query['code'] as string | undefined;
	if (code === undefined) {
		return res.sendStatus(400);
	}

	access.oauthClient.getToken(code).then(async tokenResponse => {
		const token = tokenResponse.tokens.id_token;
		if (typeof token !== 'string') {
			return res.sendStatus(500);
		}
		const user = await db.getOrCreateUser(token);
		if (user === undefined) return res.sendStatus(500);

		res.cookie('token', token);
		res.redirect('/home');
	});
});

app.get('/expired', (req, res) => {
	res.send(
		rendering.reactTemplate(Expired, {}, 'Token Expired', '/expired.js'),
	);
});

app.get('/home', access.authorization, async (req, res) => {
	const user = res.locals.user as db.User;

	res.send(
		rendering.reactTemplate(
			Home,
			{
				number: user.data ?? -1,
				isAdmin: user.permissions >= access.PERMISSIONS_ADMIN,
				minecraftUsername: user.minecraftUsername,
			},
			'UHC DB',
			'/home.js',
		),
	);
});

app.post(
	'/api/downloadToken',
	bodyParser.json(),
	access.authorization,
	access.requireAdmin,
	async (req, res) => {
		const botToken = await db.updateUsersBotToken(res.locals.user);

		makeDownload(
			res,
			JSON.stringify({
				token: botToken,
			}),
			'uhcdb.json',
			'application/json',
		);
	},
);

app.post(
	'/api/bot/createVerifyLink',
	bodyParser.json(),
	// access.botAuthorization,
	async (req, res) => {
		const { uuid, username } = req.body;
		if (uuid == undefined || typeof uuid != 'string')
			return res.sendStatus(400);
		if (username == undefined || typeof username != 'string')
			return res.sendStatus(400);

		res.json({
			link: await db.createVerifyLink(uuid, username),
		});
	},
);

app.get('/link/:code', access.authorization, async (req, res) => {
	const verifyResult = await db.verifyLink(
		req.params.code,
		res.locals.user as db.User & db.Keyed,
	);
	switch (verifyResult) {
		case 'invalid':
			// TODO: General error page with passable error message, that includes a link to home.
			res.status(400).send('Invalid code.');
		case 'expired':
			res.status(400).send(
				'Sorry, that code has expired. Please generate a new one using /link.',
			);
		case 'success':
			res.redirect('/home');
	}
});

app.post('/api/bot/ping', access.botAuthorization, async (req, res) => {
	res.sendStatus(200);
});

app.post(
	'/api/bot/summary',
	bodyParser.json(),
	access.botAuthorization,
	async (req, res) => {
		let fullSummary;
		try {
			fullSummary = db.parseFullSummaryBody(req.body);
		} catch (ex) {
			return res.status(400).send(ex);
		}

		await db.uploadSummary(fullSummary);

		res.sendStatus(200);
	},
);

app.get(
	'/api/summaries',
	access.authorization,
	access.requireAdmin,
	async (req, res) => {
		const cursor = req.query['cursor'] as string | undefined;

		const result = await db.getSummaryCursor(cursor);

		return res.send(result);
	},
);

app.delete(
	'/api/summaries/:id',
	access.authorization,
	access.requireAdmin,
	async (req, res) => {
		const id = req.params.id as string | undefined;
		if (id === undefined || id === '') return res.sendStatus(400);

		const found = await db.deleteSummary(id);

		return res.sendStatus(found ? 200 : 404);
	},
);

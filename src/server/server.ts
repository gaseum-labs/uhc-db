import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as stream from 'stream';
import { Home } from '../shared/home';
import { Expired } from '../shared/expired';
import * as access from './access';
import * as db from './db';
import * as rendering from './rendering';
import type { GetMinecraftCodeResponse } from '../shared/apiTypes';

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

app.post('/api/minecraftCode', access.authorization, async (req, res) => {
	const user = res.locals.user as db.User & db.Keyed;

	const { code } = await db.generateNewCode(user);

	const response: GetMinecraftCodeResponse = { code };
	res.send(response);
});

app.post(
	'/api/bot/verifyMinecraftCode',
	bodyParser.json(),
	access.botAuthorization,
	async (req, res) => {
		const body = db.parseVerifyMinecraftCodeBody(req.body);
		if (body === undefined) return res.sendStatus(400);

		const verifyCode = await db.verifyMinecaftCode(body.code);
		if (verifyCode === undefined) return res.sendStatus(400);

		await db.updateMinecraftLink(
			verifyCode.clientId,
			body.uuid,
			body.username,
		);
		res.sendStatus(200);
	},
);

app.post('/api/bot/ping', access.botAuthorization, async (req, res) => {
	res.sendStatus(200);
});

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

	const isServerToken =
		(req.query['state'] as string | undefined) === 'server';

	access.oauthClient.getToken(code).then(async tokenResponse => {
		const token = tokenResponse.tokens.id_token;
		if (typeof token !== 'string') {
			return res.sendStatus(500);
		}
		const user = await db.getOrCreateUser(token);
		if (user === undefined) return res.sendStatus(500);

		if (isServerToken) {
			if (user.permissions < access.PERMISSIONS_ADMIN) {
				return res.sendStatus(401);
			}

			const refreshToken = tokenResponse.tokens.refresh_token;
			if (typeof refreshToken !== 'string') {
				return res.sendStatus(400);
			}

			/* invalidate old token, store new token */
			/* this way users can only have one active token at a time */
			const lastServerToken = user.lastServerToken;
			try {
				await Promise.all([
					lastServerToken !== undefined
						? access.oauthClient.revokeToken(lastServerToken)
						: Promise.resolve(),
					db.ds.save({
						key: user[db.ds.KEY],
						data: Object.assign(user, {
							lastServerToken: refreshToken,
						}),
					}),
				]);
			} catch (ex) {
				console.log('trying to revoke invalid token', lastServerToken);
			}

			res.cookie('refresh-token', refreshToken);
			res.redirect('/home?download-token=true');
		} else {
			res.cookie('token', token);
			res.redirect('/home');
		}
	});
});

app.get('/expired', (req, res) => {
	const user = res.locals.user as db.User;

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
			},
			'UHC DB',
			'/home.js',
		),
	);
});

app.get(
	'/servertoken',
	access.authorization,
	access.requireAdmin,
	(req, res) => {
		res.redirect(
			access.oauthClient.generateAuthUrl({
				access_type: 'offline',
				scope: 'https://www.googleapis.com/auth/userinfo.email',
				state: 'server',
			}),
		);
	},
);

app.post('/api/downloadToken', bodyParser.json(), (req, res) => {
	const body = req.body as { refreshToken: string | undefined };

	if (body.refreshToken === undefined) {
		return res.sendStatus(400);
	}

	makeDownload(
		res,
		JSON.stringify({ token: body.refreshToken }),
		'token.json',
		'application/json',
	);
});

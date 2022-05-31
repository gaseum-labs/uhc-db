import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as reactServer from 'react-dom/server';
import * as cookieParser from 'cookie-parser';
import * as stream from 'stream';
import { Home } from './home';
import { Expired } from './expired';
import * as access from './access';
import * as db from './db';

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

export const app = express.default();

app.use(cookieParser.default());
app.use(bodyParser.json());

app.get(['/', '/login'], (req, res) => {
	res.redirect(
		access.oauthClient.generateAuthUrl({
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

	access.oauthClient.getToken(code).then(async tokenResponse => {
		const token = tokenResponse.tokens.id_token;
		if (typeof token !== 'string') {
			return res.sendStatus(500);
		}
		const user = await db.getOrCreateUser(token);
		if (user === undefined) return res.status(500);

		if (isServerToken) {
			if (user.permissions < access.PERMISSIONS_ADMIN) {
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
					access.oauthClient.revokeToken(lastServerToken),
					db.ds.save({
						key: user[db.ds.KEY],
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

app.get('/home', access.authorization, async (req, res) => {
	const user = res.locals.user as db.User;

	res.send(
		reactServer.renderToString(
			<Home
				number={user.data ?? -1}
				isAdmin={user.permissions >= access.PERMISSIONS_ADMIN}
			/>,
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

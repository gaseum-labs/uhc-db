import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as stream from 'stream';
import { Home } from '../shared/home';
import { Expired } from '../shared/expired';
import * as shared from '../shared/shared';
import * as access from './access';
import * as db from './db';
import * as oauth from './oauth';
import * as rendering from './rendering';
import * as summary from './summary/summary';
import * as summaryParser from './summary/summaryParser';
import * as util from './util';
import { cli } from 'webpack';
import * as parser from './parser';
import axios from 'axios';

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
				discordUsername: user.discordUsername,
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
	access.botAuthorization,
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

const redirect_uri = `https://discord.com/api/oauth2/authorize?client_id=982734191265468436&redirect_uri=${shared.host}/discord/oauth&response_type=code&scope=identify`;

app.get('/discord/link', access.authorization, async (req, res) => {
	res.redirect(redirect_uri);
});

app.get('/discord/oauth', access.authorization, async (req, res) => {
	const code = req.query.code;
	const params = new URLSearchParams();
	params.append('client_id', oauth.clientId);
	params.append('client_secret', oauth.clientSecret);
	params.append('grant_type', 'authorization_code');
	params.append('code', code!.toString());
	params.append('redirect_uri', `${shared.host}/discord/oauth`);
	const tokenRequest = await axios.post(
		'https://discord.com/api/oauth2/token',
		params,
	);
	if (tokenRequest.status != 200) {
		return res.sendStatus(500);
	}
	const token = tokenRequest.data.access_token;
	const idRequest = await axios.get('https://discord.com/api/users/@me', {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
	if (idRequest.status != 200) {
		return res.sendStatus(500);
	}
	const id = idRequest.data.id as string;
	const username =
		(idRequest.data.username as string) +
		'#' +
		(idRequest.data.discriminator as string);
	const user = res.locals.user as db.User & db.Keyed;
	db.updateDiscordInformation(user, id, username).then(() =>
		res.redirect('/home'),
	);
});

app.get('/discord/unlink', access.authorization, (req, res) => {
	const user = res.locals.user as db.User & db.Keyed;
	db.unlinkDiscord(user).then(() => res.redirect('/home'));
});

app.post(
	'/api/bot/discordids',
	bodyParser.json(),
	access.botAuthorization,
	async (req, res) => {
		try {
			const uuids = parser.parseArray(req.body, 'uuids', 'string') as [
				string,
			];
			res.json(await db.retrieveIds(uuids));
		} catch (e) {
			res.sendStatus(400);
		}
	},
);

app.post('/api/bot/ping', access.botAuthorization, async (req, res) => {
	/* required to be 200 by plugin spec */
	res.sendStatus(200);
});

app.post(
	'/api/bot/summary',
	bodyParser.json(),
	access.botAuthorization,
	async (req, res) => {
		let fullSummary = summaryParser.parseFullSummaryBody(
			req.body,
			() => {},
		);

		await summary.uploadSummary(fullSummary);

		util.noContent(res);
	},
);

app.get(
	'/api/summaries',
	access.authorization,
	access.requireAdmin,
	async (req, res) => {
		const cursor = req.query['cursor'] as string | undefined;

		const result = await summary.getSummaryCursor(cursor);

		return res.send(result);
	},
);

app.get(
	'/api/summaries/:id',
	access.authorization,
	access.requireAdmin,
	async (req, res) => {
		const id = util.paramsId(req);

		const clientSummary = await summary.reconstructSummary(id);

		util.content(res, clientSummary);
	},
);

app.delete(
	'/api/summaries/:id',
	access.authorization,
	access.requireAdmin,
	async (req, res) => {
		const id = util.paramsId(req);

		const found = await summary.deleteSummary(id);

		found ? util.noContent(res) : util.makeError(404);
	},
);

app.put(
	'/api/summaries',
	bodyParser.json(),
	access.authorization,
	access.requireAdmin,
	async (req, res, next) => {
		const changed = summaryParser.parseFullSummaryBody(
			req.body,
			summaryParser.parseId,
		);

		await summary.editSummary(changed);

		util.noContent(res);
	},
);

app.use(
	(
		err: any,
		req: express.Request,
		res: express.Response,
		next: express.NextFunction,
	) => {
		const code = err.code;
		const message = err.message;

		if (typeof code !== 'number' || typeof message !== 'string') {
			res.status(500).send({
				message: 'Internal Server Error',
			});
		} else {
			res.status(code).send({
				message,
			});
		}
	},
);

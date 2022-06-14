import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as stream from 'stream';
import { Home } from '../shared/home';
import { Expired } from '../shared/expired';
import * as access from './access';
import * as db from './db';
import * as rendering from './rendering';
import * as summary from './summary/summary';
import * as summaryParser from './summary/summaryParser';
import * as util from './util';
import * as parser from './parser';

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
	res.redirect(access.authUrl());
});

app.get('/token', (req, res) => {
	const code = req.query['code'] as string | undefined;
	if (code === undefined) {
		return res.sendStatus(400);
	}

	access.exchangeCodeForDiscordToken(code).then(async discordToken => {
		const identity = await access.getDiscordIdentity(discordToken);

		await db.getOrCreateUser(identity);

		const jwt = access.createJWT(identity.id);

		res.cookie('token', jwt);
		res.redirect('/home');
	});
});

app.get('/expired', (req, res) => {
	res.send(
		rendering.reactTemplate(Expired, {}, 'Token Expired', '/expired.js'),
	);
});

app.get('/home', access.authorization, async (req, res) => {
	const user = res.locals.user as db.DataUser;

	res.send(
		rendering.reactTemplate(
			Home,
			{
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
		res.locals.user as db.DataUser,
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

		await summary.uploadSummary(summary.inputSummaryToParts(fullSummary));

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

		const parts = await summary.getSummaryParts(id);

		util.content(res, summary.clientSummaryFromParts(parts));
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

app.put(
	'/api/season/:id',
	bodyParser.json(),
	access.authorization,
	access.requireAdmin,
	async (req, res) => {
		const seasonNo = Number.parseInt(util.paramsId(req));

		const season = summaryParser.parseSeason(req.body);

		await summary.putSeason(seasonNo, season);

		util.noContent(res);
	},
);

app.get('/api/season/:id', access.authorization, async (req, res) => {
	const seasonNo = Number.parseInt(util.paramsId(req));

	util.content(res, await summary.getSeason(seasonNo));
});

app.post(
	'/api/summaries/publish/:id',
	bodyParser.json(),
	access.authorization,
	access.requireAdmin,
	async (req, res) => {
		const id = util.paramsId(req);

		const publishBody = summaryParser.parsePublishSummarybody(req.body);

		await summary.publishSummary(id, publishBody);

		util.noContent(res);
	},
);

app.delete(
	'/api/summaries/publish/:season/:game',
	access.authorization,
	access.requireAdmin,
	async (req, res) => {
		const seasonNo = Number.parseInt(util.paramsId(req, 'season'));
		const gameNo = Number.parseInt(util.paramsId(req, 'game'));

		await summary.unpublishSummary(seasonNo, gameNo);

		util.noContent(res);
	},
);

app.get('/api/season/:id/summaries', access.authorization, async (req, res) => {
	const seasonNo = Number.parseInt(util.paramsId(req));

	util.content(res, await summary.getSeasonSummaries(seasonNo));
});

app.get(
	'/api/season/:id/summaries/:game',
	access.authorization,
	async (req, res) => {
		const seasonNo = Number.parseInt(util.paramsId(req));
		const gameNo = Number.parseInt(util.paramsId(req, 'game'));

		util.content(res, await summary.getPublishedSummary(seasonNo, gameNo));
	},
);

/* ERROR HANDLING */

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

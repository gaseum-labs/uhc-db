import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as stream from 'stream';
import { Home } from '../shared/routes/home';
import { Games } from '../shared/routes/games';
import { Admin } from '../shared/routes/admin';
import { Error as ErrorComponent } from '../shared/routes/error';
import * as access from './access';
import * as db from './db';
import * as rendering from './rendering';
import * as summary from './summary/summary';
import * as summaryParser from './summary/summaryParser';
import * as util from './util';
import * as parser from './parser';
import * as sass from 'sass';
import { GlobalProps } from '../shared/apiTypes';
import * as react from 'react';
import { PROJECT_ID } from './init';

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

if (PROJECT_ID === undefined) {
	app.use((req, res, next) => {
		console.log(req.httpVersion, req.originalUrl, req.headers);
		next();
	});
}

app.use(express.static('./static'));
app.use(cookieParser.default());

app.get('/', (req, res) => {
	res.redirect('/home');
});

app.get('/login', access.optionalAuthorization, (req, res) => {
	if (res.locals.user !== undefined) {
		res.redirect('/home');
	} else {
		res.redirect(access.authUrl());
	}
});

app.get('/token', (req, res) => {
	const code = req.query['code'] as string | undefined;
	if (code === undefined) {
		return res.sendStatus(400);
	}

	const stateString =
		(req.query['state'] as string) ??
		util.makeError(400, 'state is required');

	let state: { redirect: string };

	try {
		state = JSON.parse(stateString);
	} catch (e) {
		return util.makeError(400, 'state is invalid json');
	}

	const redirect =
		state.redirect ?? util.makeError(400, 'state.redirect is required');

	access.exchangeCodeForDiscordToken(code).then(async discordToken => {
		const identity = await access.getDiscordIdentity(discordToken);

		await db.getOrCreateUser(identity);

		const jwt = access.createJWT(identity.id);

		res.cookie('token', jwt);
		res.redirect(redirect);
	});
});

type Route<
	T extends react.Component<GlobalProps, react.ComponentState>,
	C extends react.ComponentClass<GlobalProps>,
> = {
	url: string;
	title: string;
	js: string;
	react: react.ClassType<GlobalProps, T, C>;
};

const routes: Route<any, any>[] = [
	{
		url: '/home',
		title: 'UHC DB',
		js: '/home.js',
		react: Home,
	},
	{
		url: '/games',
		title: 'Games',
		js: '/games.js',
		react: Games,
	},
	{
		url: '/admin',
		title: 'Admin Panel',
		js: '/admin.js',
		react: Admin,
	},
];

routes.forEach(route => {
	app.get(route.url, access.optionalAuthorization, (req, res) => {
		res.send(
			rendering.reactTemplate(
				route.react,
				{ user: res.locals.user },
				route.title,
				route.js,
			),
		);
	});
});

app.get('/logout', (req, res) => {
	res.clearCookie('token');
	res.redirect('/home');
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

		if (typeof uuid !== 'string') util.makeError(400);
		if (typeof username !== 'string') util.makeError(400);

		util.content(res, {
			link: await db.createVerifyLink(uuid, username),
		});
	},
);

app.post(
	'/api/bot/unlink/:minecraftId',
	access.botAuthorization,
	async (req, res) => {
		const minecraftId = util.paramsId(req, 'minecraftId');

		const discordUsername = await db.unlink(minecraftId);

		util.content(res, {
			discordUsername: discordUsername,
		});
	},
);

const error = (user: db.DataUser | undefined, error: string) => {
	return rendering.reactTemplate(
		ErrorComponent,
		{
			user,
			error,
		} as GlobalProps & { error: string },
		'An error occurred',
		'/error.js',
	);
};

app.get('/link/:code', access.authorization, async (req, res) => {
	const verifyResult = await db.verifyLink(
		req.params.code,
		res.locals.user as db.DataUser,
	);
	switch (verifyResult) {
		case 'invalid':
			res.status(400).send(
				error(
					res.locals.user,
					'Sorry, that link is invalid. Please generate a new one using /link.',
				),
			);
		case 'expired':
			res.status(400).send(
				error(
					res.locals.user,
					'Sorry, that code has expired. Please generate a new one using /link.',
				),
			);
		case 'success':
			res.redirect('/home');
	}
});

app.post(
	'/api/bot/discordId',
	bodyParser.json(),
	access.botAuthorization,
	async (req, res) => {
		const uuid = parser.parseField(req.body, 'uuid', 'string') as string;

		res.json({ discordId: await db.getDiscordIdFor(uuid) });
	},
);

app.post(
	'/api/bot/discordIds',
	bodyParser.json(),
	access.botAuthorization,
	async (req, res) => {
		const uuids = parser.parseArray(req.body, undefined, 'string') as [
			string,
		];

		res.json(await db.getMassDiscordIdsFor(uuids));
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

		if (
			typeof code !== 'number' ||
			code < 400 ||
			typeof message !== 'string'
		) {
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

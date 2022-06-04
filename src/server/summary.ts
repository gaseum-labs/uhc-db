import * as parser from './parser';
import type {
	Summary,
	FullSummary,
	SummaryEntry,
	Team,
	ClientSummary,
} from '../shared/shared';
import type { Id } from '../shared/shared';
import { ds } from './db';
import * as db from './db';
import type { Keyed } from './db';

export const PAGE_SIZE = 10;

export type Season = {
	logo: string;
	color: number;
	champion: string | undefined;
};

export const didUpdate = (indexUpdates: number | null | undefined) => {
	return typeof indexUpdates === 'number' && indexUpdates > 0;
};

export const parseTeam = (body: any): Team => {
	const name = parser.parseField(body, 'name', 'string');
	const color0 = parser.parseField(body, 'color0', 'number');
	const color1 = parser.parseField(body, 'color1', 'number');
	const members = parser.parseArray(body, 'members', 'string');

	return {
		name,
		color0,
		color1,
		members,
	};
};

export const parseSummaryEntry = (body: any): SummaryEntry => {
	const place = parser.parseField(body, 'place', 'number');
	const uuid = parser.parseField(body, 'uuid', 'string');
	const name = parser.parseField(body, 'name', 'string');
	const timeSurvived = parser.parseField(body, 'timeSurvived', 'number');
	const killedBy = parser.parseField(body, 'killedBy', 'string', true);

	return {
		place,
		uuid,
		name,
		timeSurvived,
		killedBy,
	};
};

const stripDate = (dateString: string) => {
	const first = dateString.split('[')[0];
	const date = new Date(first);
	if (isNaN(date.valueOf())) throw 'invalid date format';
	return date;
};

export const parseFullSummaryBody = (body: any): FullSummary => {
	const gameType = parser.parseField(body, 'gameType', 'string');
	const date = stripDate(parser.parseField(body, 'date', 'string'));
	const gameLength = parser.parseField(body, 'gameLength', 'number');
	const teams = parser.transformArray(body, 'teams', parseTeam);
	const players = parser.transformArray(body, 'players', parseSummaryEntry);

	return {
		gameType,
		date,
		gameLength,
		teams,
		players,
	};
};

export const updateSeason = (seasonNo: number, season: Season) => {
	const key = ds.key([db.OBJ_SEASON, ds.int(seasonNo)]);

	return ds.save({
		key: key,
		data: season,
	});
};

export const uploadSummary = async (fullSummary: FullSummary) => {
	const summaryKey = ds.key([db.OBJ_SUMMARY]);
	const summary: Summary = {
		gameType: fullSummary.gameType,
		date: fullSummary.date,
		gameLength: fullSummary.gameLength,
	};

	/* get the newly uploaded summary key */
	await ds.save({
		key: summaryKey,
		data: summary,
	});

	const refKey = ds.int(summaryKey.id!!);

	return Promise.all([
		ds.save(
			fullSummary.teams.map(team => ({
				key: ds.key([db.OBJ_SUMMARY, refKey, db.OBJ_TEAM]),
				data: team,
			})),
		),
		ds.save(
			fullSummary.players.map(entry => ({
				key: ds.key([db.OBJ_SUMMARY, refKey, db.OBJ_SUMMARY_ENTRY]),
				data: entry,
			})),
		),
	]);
};

export const deleteSummary = async (id: string) => {
	const ancestorKey = ds.key([db.OBJ_SUMMARY, ds.int(id)]);

	/* "hasAncestor" includes itself */
	const [keyeds]: [Keyed[], any] = await ds.runQuery(
		ds.createQuery().hasAncestor(ancestorKey).select('__key__'),
	);

	const [{ indexUpdates }] = await ds.delete(
		keyeds.map(keyed => keyed[ds.KEY]),
	);

	return didUpdate(indexUpdates);
};

const isSummary = (
	obj: (Summary | Team | SummaryEntry) & Keyed,
): obj is Summary & Keyed => {
	return obj[ds.KEY].kind === db.OBJ_SUMMARY;
};
const isTeam = (
	obj: (Summary | Team | SummaryEntry) & Keyed,
): obj is Team & Keyed => {
	return obj[ds.KEY].kind === db.OBJ_TEAM;
};
const isSummaryEntry = (
	obj: (Summary | Team | SummaryEntry) & Keyed,
): obj is SummaryEntry & Keyed => {
	return obj[ds.KEY].kind === db.OBJ_SUMMARY_ENTRY;
};

//TODO use as part of editing
export const reconstructSummary = async (
	id: string,
): Promise<ClientSummary> => {
	const ancestorKey = ds.key([db.OBJ_SUMMARY, ds.int(id)]);

	const [objects]: [((Summary | Team | SummaryEntry) & Keyed)[], any] =
		await ds.runQuery(ds.createQuery().hasAncestor(ancestorKey));

	const summary = objects.find(isSummary) as (Summary & Keyed) | undefined;
	if (summary === undefined) throw 'No summary found';

	const teams = objects.filter(isTeam) as (Team & Keyed)[];
	const players = objects.filter(isSummaryEntry) as (SummaryEntry & Keyed)[];

	return Object.assign(summary, {
		id: summary[ds.KEY].id as string,
		teams: teams.map(team =>
			Object.assign(team, { id: team[ds.KEY].id as string }),
		),
		players: players.map(entry =>
			Object.assign(entry, { id: entry[ds.KEY].id as string }),
		),
	});
};

export const getSummaryCursor = async (
	pageCursor: string | undefined,
): Promise<[Summary[], string | undefined]> => {
	let query = ds
		.createQuery(db.OBJ_SUMMARY)
		.order('date', { descending: true })
		.limit(PAGE_SIZE);

	if (pageCursor !== undefined) {
		query = query.start(pageCursor);
	}

	const [entities, info]: [Summary[], any] = await ds.runQuery(query);

	return [entities, info.endCursor];
};

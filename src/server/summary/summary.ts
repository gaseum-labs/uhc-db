import * as parser from '../parser';
import type {
	SummaryHeader,
	Summary,
	SummaryEntry,
	Team,
	ClientSummary,
	InputSummary,
} from '../../shared/shared';
import type { Id } from '../../shared/shared';
import { ds } from '../db';
import * as db from '../db';
import type { Keyed } from '../db';
import * as util from '../util';
import {
	PaginateSummariesResponse,
	PublishSummaryBody,
} from '../../shared/apiTypes';

export const PAGE_SIZE = 10;

export type Season = {
	logo: string;
	color: number;
	champion: string | undefined;
};

export type SummaryParts = {
	header: SummaryHeader & Keyed;
	teams: (Team & Keyed)[];
	entries: (SummaryEntry & Keyed)[];
};

export type RawSummaryParts = {
	header: SummaryHeader;
	teams: Team[];
	entries: SummaryEntry[];
};

export const didUpdate = (indexUpdates: number | null | undefined) => {
	return typeof indexUpdates === 'number' && indexUpdates > 0;
};

export const inputSummaryToParts = (
	inputSummary: InputSummary,
): RawSummaryParts => {
	return {
		header: {
			gameType: inputSummary.gameType,
			gameLength: inputSummary.gameLength,
			date: inputSummary.date,
		},
		entries: inputSummary.players,
		teams: inputSummary.teams,
	};
};

export const uploadSummary = async (parts: RawSummaryParts) => {
	const summaryKey = ds.key([db.OBJ_SUMMARY]);

	/* get the newly uploaded summary key */
	await ds.save({
		key: summaryKey,
		data: parts.header,
	});

	const refKey = ds.int(summaryKey.id!!);

	return Promise.all([
		ds.save(
			parts.teams.map(team => ({
				key: ds.key([db.OBJ_SUMMARY, refKey, db.OBJ_TEAM]),
				data: team,
			})),
		),
		ds.save(
			parts.entries.map(entry => ({
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
	obj: (SummaryHeader | Team | SummaryEntry) & Keyed,
): obj is SummaryHeader & Keyed => {
	return obj[ds.KEY].kind === db.OBJ_SUMMARY;
};
const isTeam = (
	obj: (SummaryHeader | Team | SummaryEntry) & Keyed,
): obj is Team & Keyed => {
	return obj[ds.KEY].kind === db.OBJ_TEAM;
};
const isSummaryEntry = (
	obj: (SummaryHeader | Team | SummaryEntry) & Keyed,
): obj is SummaryEntry & Keyed => {
	return obj[ds.KEY].kind === db.OBJ_SUMMARY_ENTRY;
};

export const getSummaryParts = async (id: string, preKey: any[] = []) => {
	const ancestorKey = ds.key([...preKey, db.OBJ_SUMMARY, ds.int(id)]);

	const [objects]: [((SummaryHeader | Team | SummaryEntry) & Keyed)[], any] =
		await ds.runQuery(ds.createQuery().hasAncestor(ancestorKey));

	const header =
		(objects.find(isSummary) as (SummaryHeader & Keyed) | undefined) ??
		util.makeError(404);

	const teams = objects.filter(isTeam) as (Team & Keyed)[];
	const entries = objects.filter(isSummaryEntry) as (SummaryEntry & Keyed)[];

	return <SummaryParts>{
		header,
		teams,
		entries,
	};
};

export const clientSummaryFromParts = (parts: SummaryParts): ClientSummary => {
	return Object.assign(parts.header, {
		id: parts.header[ds.KEY].id as string,
		teams: parts.teams.map(team =>
			Object.assign(team, { id: team[ds.KEY].id as string }),
		),
		players: parts.entries.map(entry =>
			Object.assign(entry, { id: entry[ds.KEY].id as string }),
		),
	});
};

export const InputSummaryFromParts = (parts: SummaryParts): InputSummary => {
	return Object.assign(parts.header, {
		teams: parts.teams,
		players: parts.entries,
	});
};

export const getSummaryCursor = async (
	pageCursor: string | undefined,
): Promise<PaginateSummariesResponse> => {
	let query = ds
		.createQuery(db.OBJ_SUMMARY)
		.order('date', { descending: true })
		.limit(PAGE_SIZE);

	if (pageCursor !== undefined) {
		query = query.start(pageCursor);
	}

	const [entities, info] = await ds.runQuery(query);

	const headers = (entities as (SummaryHeader & Keyed)[]).map(header =>
		Object.assign(header, { id: header[ds.KEY].id as string }),
	);

	return {
		summaries: headers,
		cursor:
			info.moreResults === 'NO_MORE_RESULTS' ? undefined : info.endCursor,
	};
};

const stripId = <T>(t: T & Id): T => {
	delete (t as T & { id: string | undefined }).id;
	return t;
};

const summaryEquality = (summary0: SummaryHeader, summary1: SummaryHeader) =>
	summary0.date.valueOf() === summary1.date.valueOf() &&
	summary0.gameLength === summary1.gameLength &&
	summary0.gameType === summary1.gameType;
const teamEquality = (team0: Team, team1: Team) =>
	team0.color0 === team1.color0 &&
	team0.color1 === team1.color1 &&
	team0.name === team1.name &&
	team0.members.length === team1.members.length &&
	team0.members.every(member => team1.members.includes(member));
const summaryEntryEquality = (entry0: SummaryEntry, entry1: SummaryEntry) =>
	entry0.killedBy === entry1.killedBy &&
	entry0.name === entry1.name &&
	entry0.place === entry1.place &&
	entry0.timeSurvived === entry0.timeSurvived &&
	entry0.uuid === entry0.uuid;

export const editSummary = async (changed: ClientSummary) => {
	const old = clientSummaryFromParts(await getSummaryParts(changed.id));
	const headerKeyPart = [db.OBJ_SUMMARY, ds.int(old.id)];

	const changedTeams = changed.teams
		.filter(newTeam => {
			const oldTeam = old.teams.find(
				oldTeam => oldTeam.id === newTeam.id,
			);
			if (oldTeam === undefined) return false;
			return !teamEquality(newTeam, oldTeam);
		})
		.map(team => ({
			key: ds.key([...headerKeyPart, db.OBJ_TEAM, ds.int(team.id)]),
			data: stripId(team),
		}));

	const changedEntries = changed.players
		.filter(newEntry => {
			const oldEntry = old.players.find(
				oldEntry => oldEntry.id === newEntry.id,
			);
			if (oldEntry === undefined) return false;
			return !summaryEntryEquality(newEntry, oldEntry);
		})
		.map(entry => ({
			key: ds.key([
				...headerKeyPart,
				db.OBJ_SUMMARY_ENTRY,
				ds.int(entry.id),
			]),
			data: stripId(entry),
		}));

	return Promise.all([
		summaryEquality(changed, old)
			? Promise.resolve()
			: ds.save({
					key: ds.key([db.OBJ_SUMMARY, ds.int(changed.id)]),
					data: {
						date: changed.date,
						gameLength: changed.gameLength,
						gameType: changed.gameType,
					},
			  }),
		changedTeams.length === 0 ? Promise.resolve() : ds.save(changedTeams),
		changedEntries.length === 0
			? Promise.resolve()
			: ds.save(changedEntries),
	]);
};

export const putSeason = (seasonNo: number, season: Season) => {
	const key = ds.key([db.OBJ_SEASON, ds.int(seasonNo)]);

	return ds.save({
		key: key,
		data: season,
	});
};

export const getSeason = async (seasonNo: number) => {
	return <Season>(
		((await ds.get(ds.key([db.OBJ_SEASON, ds.int(seasonNo)])))[0] ??
			util.makeError(404))
	);
};

export const publishSummary = async (
	summaryId: string,
	publishSummaryBody: PublishSummaryBody,
) => {
	const seasonKeyParts = [db.OBJ_SEASON, ds.int(publishSummaryBody.season)];
	/* season must exist */
	if ((await ds.get(ds.key(seasonKeyParts)))[0] === undefined) {
		util.makeError(404);
	}

	const transaction = ds.transaction();
	await transaction.run();

	const { header, teams, entries } = await getSummaryParts(summaryId);

	const newKeyParts = [
		...seasonKeyParts,
		db.OBJ_SUMMARY,
		ds.int(publishSummaryBody.game),
	];

	transaction.delete([
		header[ds.KEY],
		...teams.map(team => team[ds.KEY]),
		...entries.map(entry => entry[ds.KEY]),
	]);

	transaction.save({
		key: ds.key(newKeyParts),
		data: header,
	});

	transaction.save(
		teams.map(team => ({
			key: ds.key([...newKeyParts, db.OBJ_TEAM]),
			data: team,
		})),
	);

	transaction.save(
		entries.map(entry => ({
			key: ds.key([...newKeyParts, db.OBJ_SUMMARY_ENTRY]),
			data: entry,
		})),
	);

	return await transaction.commit();
};

export const unpublishSummary = async (seasonNo: number, gameNo: number) => {
	const parts = await getSummaryParts(gameNo.toString(), [
		db.OBJ_SEASON,
		ds.int(seasonNo),
	]);

	return Promise.all([
		ds.delete([
			parts.header[ds.KEY],
			...parts.teams.map(team => team[ds.KEY]),
			...parts.entries.map(entry => entry[ds.KEY]),
		]),
		uploadSummary(parts),
	]);
};

export const getPublishedSummary = async (seasonNo: number, gameNo: number) => {
	const parts = await getSummaryParts(gameNo.toString(), [
		db.OBJ_SEASON,
		ds.int(seasonNo),
	]);

	return clientSummaryFromParts(parts);
};

export const getSeasonSummaries = async (
	seasonNo: number,
): Promise<(SummaryHeader & Id)[]> => {
	const [seasonGames]: [(SummaryHeader & Keyed)[], any] = await ds.runQuery(
		ds
			.createQuery(db.OBJ_SUMMARY)
			.hasAncestor(ds.key([db.OBJ_SEASON, ds.int(seasonNo)])),
	);

	return seasonGames.map(seasonGame =>
		Object.assign(seasonGame, { id: seasonGame[ds.KEY].id as string }),
	);
};

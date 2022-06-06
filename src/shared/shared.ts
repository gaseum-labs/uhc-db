export module Shared {}

/* clientside representatin of id'd objects */
export type Id = { id: string };

export type SummaryHeader = {
	gameType: string;
	date: Date;
	gameLength: number;
};

export type Summary<T> = SummaryHeader &
	T & {
		teams: (Team & T)[];
		players: (SummaryEntry & T)[];
	};

export type InputSummary = Summary<{}>;
export type ClientSummary = Summary<Id>;

export type SummaryEntry = {
	place: number;
	uuid: string;
	name: string;
	timeSurvived: number;
	killedBy: string | undefined;
};

export type Team = {
	name: string;
	color0: number;
	color1: number;
	members: string[];
};

declare global {
	interface Window {
		__uhc__: any;
	}
}

export const randomRange = (low: number, high: number) => {
	return Math.floor(Math.random() * (high - low + 1)) + low;
};

export const nowSeconds = () => Math.floor(Date.now() / 1000);

export const host = 'http://localhost:8080';

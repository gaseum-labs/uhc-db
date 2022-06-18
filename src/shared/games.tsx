import * as react from 'react';
import { GlobalProps } from './apiTypes';
import { Nav } from './nav';

const summaries: Summary[] = [
	{
		name: 'CHC Season 7 Game 27',
		date: '2022-06-11T21:43:29.168357585-06:00[America/Denver]',
		gameType: 'UHC',
		gameLength: 41694,
		teams: [
			{
				name: 'Meeeeep... Nipah ^_^',
				color1: 6316256,
				color0: 2121888,
				members: [
					'b8fc1a7c-73e1-4ca3-977f-956688442a69',
					'479b7374-dff6-4cb0-a49b-dc1faaf11070',
					'90ef297a-c5f8-491c-a1c4-861bd143b543',
				],
			},
			{
				name: '승리자들',
				color1: 14737440,
				color0: 14688416,
				members: [
					'42c2b8a9-e43e-40a9-8dac-a284adf6c998',
					'597d3f03-7a52-49bd-9c19-0d451e002894',
					'93c28e21-af9f-4828-b16f-e835d5200b69',
				],
			},
		],
		players: [
			{
				name: 'JStrudel',
				place: 1,
				timeSurvived: 41694,
				uuid: '42c2b8a9-e43e-40a9-8dac-a284adf6c998',
			},
			{
				name: 'balduvian',
				place: 1,
				timeSurvived: 41694,
				uuid: '597d3f03-7a52-49bd-9c19-0d451e002894',
			},
			{
				name: 'ZibboTheGreat',
				place: 1,
				timeSurvived: 41694,
				uuid: '93c28e21-af9f-4828-b16f-e835d5200b69',
			},
			{
				name: 'ontosTorin',
				place: 4,
				timeSurvived: 41694,
				killedBy: '597d3f03-7a52-49bd-9c19-0d451e002894',
				uuid: '90ef297a-c5f8-491c-a1c4-861bd143b543',
			},
			{
				name: 'mclonergan',
				place: 5,
				timeSurvived: 41615,
				killedBy: '597d3f03-7a52-49bd-9c19-0d451e002894',
				uuid: 'b8fc1a7c-73e1-4ca3-977f-956688442a69',
			},
			{
				name: 'Whmsy',
				place: 6,
				timeSurvived: 41459,
				killedBy: '597d3f03-7a52-49bd-9c19-0d451e002894',
				uuid: '479b7374-dff6-4cb0-a49b-dc1faaf11070',
			},
		],
	},
	{
		name: 'UHC Season 7 Game 27',
		date: '2022-06-11T20:40:59.867445429-06:00[America/Denver]',
		gameType: 'UHC',
		gameLength: 53952,
		teams: [
			{
				name: 'Green wool',
				color1: 6299680,
				color0: 10543200,
				members: ['504a4dfa-2ec6-40e4-80d2-46b92c9f3164'],
			},
			{
				name: 'Cave air',
				color1: 6316192,
				color0: 6349024,
				members: [
					'42c2b8a9-e43e-40a9-8dac-a284adf6c998',
					'b8fc1a7c-73e1-4ca3-977f-956688442a69',
				],
			},
			{
				name: 'Jungle slab',
				color1: 14721184,
				color0: 14688416,
				members: [
					'93c28e21-af9f-4828-b16f-e835d5200b69',
					'90ef297a-c5f8-491c-a1c4-861bd143b543',
				],
			},
			{
				name: 'Carrot on a stick',
				color1: 6332640,
				color0: 10493984,
				members: [
					'479b7374-dff6-4cb0-a49b-dc1faaf11070',
					'597d3f03-7a52-49bd-9c19-0d451e002894',
				],
			},
		],
		players: [
			{
				name: 'balduvian',
				place: 1,
				timeSurvived: 53952,
				uuid: '597d3f03-7a52-49bd-9c19-0d451e002894',
			},
			{
				name: 'ZibboTheGreat',
				place: 2,
				timeSurvived: 53952,
				killedBy: '597d3f03-7a52-49bd-9c19-0d451e002894',
				uuid: '93c28e21-af9f-4828-b16f-e835d5200b69',
			},
			{
				name: 'ontosTorin',
				place: 3,
				timeSurvived: 53844,
				killedBy: '597d3f03-7a52-49bd-9c19-0d451e002894',
				uuid: '90ef297a-c5f8-491c-a1c4-861bd143b543',
			},
			{
				name: 'apnpwnpwns',
				place: 4,
				timeSurvived: 45903,
				killedBy: '597d3f03-7a52-49bd-9c19-0d451e002894',
				uuid: '504a4dfa-2ec6-40e4-80d2-46b92c9f3164',
			},
			{
				name: 'Whmsy',
				place: 5,
				timeSurvived: 34016,
				killedBy: '90ef297a-c5f8-491c-a1c4-861bd143b543',
				uuid: '479b7374-dff6-4cb0-a49b-dc1faaf11070',
			},
			{
				name: 'JStrudel',
				place: 6,
				timeSurvived: 33755,
				killedBy: '479b7374-dff6-4cb0-a49b-dc1faaf11070',
				uuid: '42c2b8a9-e43e-40a9-8dac-a284adf6c998',
			},
			{
				name: 'mclonergan',
				place: 7,
				timeSurvived: 29361,
				killedBy: '597d3f03-7a52-49bd-9c19-0d451e002894',
				uuid: 'b8fc1a7c-73e1-4ca3-977f-956688442a69',
			},
		],
	},
	{
		name: 'CHC Season 7 Game 26',
		date: '2022-06-04T21:25:45.963734370-06:00[America/Denver]',
		gameType: 'UHC',
		gameLength: 90268,
		teams: [
			{
				name: 'Black banner',
				color1: 2154592,
				color0: 10494048,
				members: ['619dff6e-2718-4e75-bd08-9b5ce683e071'],
			},
			{
				name: 'Beetroot seeds',
				color1: 10510432,
				color0: 6299680,
				members: ['ed0c05b1-4226-4d61-831c-076ee7d541c6'],
			},
			{
				name: 'Blue bed',
				color1: 2138144,
				color0: 14704800,
				members: ['90ef297a-c5f8-491c-a1c4-861bd143b543'],
			},
			{
				name: 'Cat spawn egg',
				color1: 6348896,
				color0: 14721056,
				members: ['597d3f03-7a52-49bd-9c19-0d451e002894'],
			},
			{
				name: 'Shroomlight',
				color1: 6299808,
				color0: 10543200,
				members: ['78628c2a-eff8-4083-9790-4cc89a60b409'],
			},
		],
		players: [
			{
				name: 'ontosTorin',
				place: 1,
				timeSurvived: 90268,
				uuid: '90ef297a-c5f8-491c-a1c4-861bd143b543',
			},
			{
				name: 'a4955',
				place: 2,
				timeSurvived: 90268,
				killedBy: '90ef297a-c5f8-491c-a1c4-861bd143b543',
				uuid: '619dff6e-2718-4e75-bd08-9b5ce683e071',
			},
			{
				name: 'balduvian',
				place: 3,
				timeSurvived: 86479,
				killedBy: '90ef297a-c5f8-491c-a1c4-861bd143b543',
				uuid: '597d3f03-7a52-49bd-9c19-0d451e002894',
			},
			{
				name: 'Varas_',
				place: 4,
				timeSurvived: 73219,
				uuid: 'ed0c05b1-4226-4d61-831c-076ee7d541c6',
			},
			{
				name: 'Shiverisbjorn1',
				place: 5,
				timeSurvived: 31249,
				uuid: '78628c2a-eff8-4083-9790-4cc89a60b409',
			},
		],
	},
	{
		name: 'UHC Season 7 Game 26',
		date: '2022-06-04T20:36:59.686728431-06:00[America/Denver]',
		gameType: 'UHC',
		gameLength: 53739,
		teams: [
			{
				name: 'slyben',
				color1: 14704672,
				color0: 10510560,
				members: [
					'6ab842cd-242b-412a-bccb-aee79fc89798',
					'78628c2a-eff8-4083-9790-4cc89a60b409',
				],
			},
			{
				name: '"sparky"',
				color1: 14721056,
				color0: 14737440,
				members: [
					'ed0c05b1-4226-4d61-831c-076ee7d541c6',
					'90ef297a-c5f8-491c-a1c4-861bd143b543',
				],
			},
			{
				name: 'Jungle log',
				color1: 6332576,
				color0: 2105568,
				members: [
					'597d3f03-7a52-49bd-9c19-0d451e002894',
					'619dff6e-2718-4e75-bd08-9b5ce683e071',
				],
			},
		],
		players: [
			{
				name: 'Varas_',
				place: 1,
				timeSurvived: 53739,
				uuid: 'ed0c05b1-4226-4d61-831c-076ee7d541c6',
			},
			{
				name: 'ontosTorin',
				place: 1,
				timeSurvived: 53739,
				uuid: '90ef297a-c5f8-491c-a1c4-861bd143b543',
			},
			{
				name: 'balduvian',
				place: 3,
				timeSurvived: 53739,
				killedBy: '90ef297a-c5f8-491c-a1c4-861bd143b543',
				uuid: '597d3f03-7a52-49bd-9c19-0d451e002894',
			},
			{
				name: 'slyzian',
				place: 4,
				timeSurvived: 32894,
				killedBy: 'ed0c05b1-4226-4d61-831c-076ee7d541c6',
				uuid: '6ab842cd-242b-412a-bccb-aee79fc89798',
			},
			{
				name: 'Shiverisbjorn1',
				place: 5,
				timeSurvived: 29778,
				uuid: '78628c2a-eff8-4083-9790-4cc89a60b409',
			},
			{
				name: 'a4955',
				place: 6,
				timeSurvived: 29712,
				killedBy: '78628c2a-eff8-4083-9790-4cc89a60b409',
				uuid: '619dff6e-2718-4e75-bd08-9b5ce683e071',
			},
		],
	},
];

const getPlayerFromUuid = (summary: Summary, uuid: string) => {
	return summary.players.find(p => p.uuid === uuid);
};

type Summary = {
	name: string;
	date: string;
	gameType: string;
	gameLength: number;
	teams: Team[];
	players: Player[];
};

type Team = {
	name: string;
	color1: number;
	color0: number;
	members: string[];
};

type Player = {
	name: string;
	place: number;
	timeSurvived: number;
	killedBy?: string;
	uuid: string;
};

export class Games extends react.Component<GlobalProps, {}> {
	render() {
		return (
			<>
				<Nav loggedIn={this.props.user !== undefined} />
				<main>
					<h1>Games</h1>
					{summaries.map(summary => (
						<SummaryCard key={summary.date} summary={summary} />
					))}
				</main>
			</>
		);
	}
}

class SummaryCard extends react.Component<{ summary: Summary }> {
	render() {
		const { summary } = this.props;
		return (
			<div className="summary">
				<h2>{summary.name}</h2>

				{summary.players.map(entry => (
					<div className="entry">
						{entry.place}. {entry.name}
						{entry.place > 1
							? ` (killed by ${
									entry.killedBy
										? getPlayerFromUuid(
												summary,
												entry.killedBy,
										  )!.name
										: `environment`
							  })`
							: ``}
					</div>
				))}
			</div>
		);
	}
}

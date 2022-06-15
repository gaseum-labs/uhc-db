import * as react from 'react';
import * as client from '../client/client';
import { Header } from './header';

export type HomeProps = {
	isAdmin: boolean;
	minecraftUsername: string | undefined;
	discordUsername: string;
};

type HomeState = {
	code: string | undefined;
};

export class Home extends react.Component<HomeProps, HomeState> {
	constructor(props: HomeProps) {
		super(props);

		this.state = {
			code: undefined,
		};
	}

	downloadNewToken = () => {
		const button = document.getElementById(
			'token-button',
		) as HTMLButtonElement;

		button.disabled = true;

		client
			.postRequest('/api/downloadToken')
			.then(async response => {
				client.fakeDownload(
					await response.blob(),
					client.getFilename(response) ?? 'unknown.txt',
				);
			})
			.catch(err => {
				console.log(err);
				window.alert('Something went wrong');
			})
			.finally(() => (button.disabled = false));
	};

	getCode = () => {
		client
			.postRequest('/api/minecraftCode')
			.then(async response => {
				const json = await response.json();
				this.setState({ code: json.code });
			})
			.catch(err => {
				console.log(err);
				window.alert('Something went wrong');
			});
	};

	copyCommand = () => {
		navigator.clipboard.writeText(
			'/link ' + document.getElementById('code-holder')?.textContent!!,
		);
	};

	render() {
		return (
			<>
				<Header />
				<main>
					<div>
						<p>Hello, {this.props.discordUsername}</p>
						{this.props.minecraftUsername !== undefined ? (
							<div>
								<p>
									Minecraft account:{' '}
									{this.props.minecraftUsername}
								</p>
							</div>
						) : (
							<div>
								<p>
									To link your minecraft account, join the
									server and type /link.
								</p>
							</div>
						)}
					</div>
					{this.props.isAdmin ? (
						<div>
							<p>Secret admin area</p>
							<button
								id="token-button"
								onClick={this.downloadNewToken}
							>
								Generate UHC server token
							</button>
						</div>
					) : null}
				</main>
			</>
		);
	}
}

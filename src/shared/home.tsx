import * as react from 'react';
import * as client from '../client/client';
import { GlobalProps } from './apiTypes';
import { Nav } from './nav';

type HomeState = {
	code: string | undefined;
};

export class Home extends react.Component<GlobalProps, HomeState> {
	constructor(props: GlobalProps) {
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
				<Nav loggedIn={this.props.user !== undefined} />
				<main>
					<div>
						<h1>
							Hello,{' '}
							{this.props.user
								? this.props.user.discordUsername
								: 'you are not logged in.'}
						</h1>
						{this.props.user?.minecraftUsername !== undefined ? (
							<div>
								<p>
									Minecraft account:{' '}
									{this.props.user.minecraftUsername}
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
					{(this.props.user ?? { permissions: 0 }).permissions >=
						1 && (
						<div>
							<p>Secret admin area</p>
							<button
								id="token-button"
								onClick={this.downloadNewToken}
							>
								Generate UHC server token
							</button>
						</div>
					)}
				</main>
			</>
		);
	}
}

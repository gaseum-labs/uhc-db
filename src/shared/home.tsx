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
						{this.props.user ? (
							<>
								<h1>
									Hello, {this.props.user.discordUsername}
								</h1>
								{this.props.user?.minecraftUsername !==
								undefined ? (
									<div>
										<p>
											Your minecraft account is{' '}
											<strong>
												{
													this.props.user
														.minecraftUsername
												}
											</strong>
											.
										</p>
									</div>
								) : (
									<div>
										<p>
											Your minecraft account is not
											linked. To link, join the server and
											type /link.
										</p>
									</div>
								)}
							</>
						) : (
							<>
								<h1>You are not logged it.</h1>
								<p>
									<a href="/login">
										Log in with discord here.
									</a>
								</p>
							</>
						)}
					</div>
					{(this.props.user ?? { permissions: 0 }).permissions >=
						1 && (
						<div>
							<h2>Secret admin area</h2>
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

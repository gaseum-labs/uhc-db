import * as react from 'react';
import { GlobalProps } from '../apiTypes';
import * as client from '../../client/client';
import { Nav } from '../lib/nav';

export class Admin extends react.Component<GlobalProps, {}> {
	downloadNewToken = () => {
		const button = document.getElementById(
			'token-button',
		) as HTMLButtonElement;

		button.disabled = true;

		client
			.postRequest('/api/downloadToken')
			.then(async response => {
				client.fakeDownload(await response.blob(), 'uhcdb.json');
			})
			.catch(err => {
				console.log(err);
				window.alert('Something went wrong');
			})
			.finally(() => (button.disabled = false));
	};

	render() {
		return (
			<>
				<Nav user={this.props.user} />
				{(this.props.user && this.props.user.permissions > 0 && (
					<main>
						<h1>Secret admin panel</h1>
						<h2>Server token</h2>
						<p>
							This is a token used by the server to access the UHC
							database. Download the token below (named{' '}
							<code>uhcdb.json</code>) and put it in the root of
							your server folder.{' '}
							<strong>
								Anyone with this token has complete write access
								to the database. Treat it like a password.
							</strong>
						</p>

						<button
							id="token-button"
							onClick={this.downloadNewToken}
						>
							Generate UHC server token
						</button>
					</main>
				)) || (
					<main>
						<h1>Only admin users can access this page.</h1>
					</main>
				)}
			</>
		);
	}
}

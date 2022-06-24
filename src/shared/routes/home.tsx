import * as react from 'react';
import * as client from '../../client/client';
import { GlobalProps } from '../apiTypes';
import { Nav } from '../lib/nav';

export class Home extends react.Component<GlobalProps, {}> {
	render() {
		return (
			<>
				<Nav user={this.props.user} />
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
				</main>
			</>
		);
	}
}

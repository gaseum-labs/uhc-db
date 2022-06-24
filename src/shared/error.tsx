import * as react from 'react';
import { GlobalProps } from './apiTypes';
import { Nav } from './nav';

export class Error extends react.Component<
	GlobalProps & { error: string },
	{}
> {
	render() {
		return (
			<>
				<Nav loggedIn={this.props.user !== undefined} />
				<main>
					<h1>Whoops</h1>
					<p>{this.props.error}</p>
				</main>
			</>
		);
	}
}

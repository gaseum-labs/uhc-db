import * as react from 'react';
import { GlobalProps } from '../apiTypes';
import { Nav } from '../lib/nav';

export class Error extends react.Component<
	GlobalProps & { error: string },
	{}
> {
	render() {
		return (
			<>
				<Nav user={this.props.user} />
				<main>
					<h1>Whoops</h1>
					<p>{this.props.error}</p>
				</main>
			</>
		);
	}
}

import * as react from 'react';

export class Expired extends react.Component<{}, {}> {
	render() {
		return (
			<div>
				<p>It looks like your access token has expired.</p>
				<a href="/login">
					<button>Log in again</button>
				</a>
			</div>
		);
	}
}

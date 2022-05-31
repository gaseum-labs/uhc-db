import * as react from 'react';

export type HomeProps = {
	number: number;
	isAdmin: boolean;
};

export class Home extends react.Component<HomeProps, {}> {
	render() {
		return (
			<>
				<div>
					<p>Hello, {this.props.number}</p>
				</div>
				{this.props.isAdmin ? (
					<div>
						<p>Secret admin area</p>
						<a href="/servertoken">
							<button>Generate UHC server token</button>
						</a>
					</div>
				) : null}
			</>
		);
	}
}

import * as react from 'react';
import * as shared from './shared';

export class Home extends react.Component<shared.HomeState, {}> {
	render() {
		return (
			<div>
				<p>Hello, {this.props.number}</p>
			</div>
		);
	}
}

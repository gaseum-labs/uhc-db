import * as react from 'react';
import { Logo } from './logo';

export class Header extends react.Component<{ loggedIn: boolean }, {}> {
	render() {
		return (
			<header className="nav">
				<div className="inner-nav">
					<div className="links left">
						<a href="/home">home</a>
						<a href="/games">games</a>
					</div>
					<a href="/" className="logo">
						<Logo />
					</a>
					<div className="links right">
						<a href="/info">info</a>
						<a href={this.props.loggedIn ? '/account' : '/login'}>
							{this.props.loggedIn ? 'account' : 'login'}
						</a>
					</div>
				</div>
			</header>
		);
	}
}

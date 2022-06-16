import * as react from 'react';
import { Logo } from './logo';

export class Nav extends react.Component<{ loggedIn: boolean }, {}> {
	render() {
		return (
			<header className="nav">
				<div className="inner-nav">
					<a href="/" className="logo">
						<Logo />
					</a>
					<div className="links">
						<div className="links-inner">
							<a href="/home">home</a>
							<a href="/games">games</a>
							<a href="/info">info</a>
							<a
								href={
									this.props.loggedIn ? '/account' : '/login'
								}
							>
								{this.props.loggedIn ? 'account' : 'login'}
							</a>
						</div>
					</div>
				</div>
			</header>
		);
	}
}

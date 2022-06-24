import * as react from 'react';
import { DataUser } from '../../server/db';
import { Logo } from './logo';

export class Nav extends react.Component<{ user: DataUser | undefined }, {}> {
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
							{this.props.user &&
								this.props.user.permissions > 0 && (
									<a href="/admin">admin</a>
								)}
							<a href={this.props.user ? '/logout' : '/login'}>
								{this.props.user ? 'logout' : 'login'}
							</a>
						</div>
					</div>
				</div>
			</header>
		);
	}
}

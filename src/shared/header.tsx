import * as react from 'react';
import { Logo } from './logo';

export class Header extends react.Component {
	render() {
		return (
			<header className="nav">
				<div className="inner-nav">
					<div className="links left">
						<a href="/info">info</a>
						<a href="/stats">stats</a>
					</div>
					<a href="/" className="logo">
						{/* <img src={logo} alt="" width="100px" height="100px" /> */}
						<Logo />
					</a>
					<div className="links right">
						<a href="/tips">tips</a>
						<a href="/login">login</a>
					</div>
				</div>
			</header>
		);
	}
}

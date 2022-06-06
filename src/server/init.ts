import * as access from './access';
import * as db from './db';
import * as server from './server';
import * as rendering from './rendering';
import * as oauth from './oauth';

export const PORT = process.env.PORT ?? 8080;
export const PROJECT_ID = process.env['GOOGLE_CLOUD_PROJECT'];

/* setup */
(async () => {
	rendering.loadTemplateParts();
	access.oauthClient;
	db.ds;
	await oauth.readOauthCredientials();
})().then(() => {
	/* entry point */
	server.app.listen(PORT, () => {
		console.log(`Server listening on port ${PORT}...`);
	});
});

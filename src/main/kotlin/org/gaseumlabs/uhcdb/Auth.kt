package org.gaseumlabs.uhcdb

import com.google.api.client.extensions.appengine.http.UrlFetchTransport
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier
import com.google.api.client.json.gson.GsonFactory
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import java.io.File

class Auth(
	val clientId: String,
	val projectId: String,
	val authURI: String,
	val tokenURI: String,
	val clientSecret: String,
	val redirectURI: String,
) {
	/* google recommends to use these globally */
	val transport = UrlFetchTransport()
	val jsonFactory = GsonFactory()

	/* https://developers.google.com/identity/sign-in/web/backend-auth */
	val verifier = GoogleIdTokenVerifier.Builder(transport, jsonFactory)
		.setAudience(listOf(clientId))
		.build()

	fun authorize(idToken: String): GoogleIdToken {
		return verifier.verify(idToken)
	}

	companion object {
		const val CLIENT_SECRET_FILENAME = "client_secret.json"

		fun loadAuthClientData(filename: String, local: Boolean): Auth {
			val file = File(filename)
			if (!file.exists()) throw Exception("No client secret file found")

			try {
				val json = JsonParser.parseReader(file.reader()) as JsonObject

				val clientId = json.get("client_id").asString
				val projectId = json.get("project_id").asString
				val authURI = json.get("auth_uri").asString
				val tokenURI = json.get("token_uri").asString
				val clientSecret = json.get("client_secret").asString
				val redirectURI = (json.get("redirect_uris") as JsonArray).find { element ->
					element.asString.contains("localhost") == local
				}!!.asString

				return Auth(
					clientId,
					projectId,
					authURI,
					tokenURI,
					clientSecret,
					redirectURI
				)
			} catch (ex: Exception) {
				throw Exception("Incorrect client secret structure")
			}
		}
	}
}
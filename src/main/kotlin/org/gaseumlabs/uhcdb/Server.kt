import com.google.gson.JsonObject
import com.google.gson.JsonParser
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.gaseumlabs.uhcdb.Auth
import org.gaseumlabs.uhcdb.HtmlTemplater
import org.gaseumlabs.uhcdb.Util
import java.net.URI
import java.net.URL
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse

fun main(args: Array<String>) {
	/* check environment variables to see if we are running in app engine */
	val isLocal = System.getenv().getOrDefault("GAE_APPLICATION", null) == null

	/* port is 8080 when testing locally */
	val port = System.getenv().getOrDefault("PORT", "8080").toIntOrNull() ?: 8080

	val auth = Auth.loadAuthClientData(Auth.CLIENT_SECRET_FILENAME, isLocal)

	val authTemplate = HtmlTemplater("/auth.html")
	val tokenTemplate = HtmlTemplater("/token.html")

	println("UHC DB STARTING WITH PORT $port")

	embeddedServer(Netty, port = port) {
		routing {
			get("/") {
				call.respondText("hello world")
			}
			get("/auth") {
				call.respondText(authTemplate.template(Util.urlParams(
					auth.authURI,
					"client_id" to auth.clientId,
					"redirect_uri" to auth.redirectURI,
					"response_type" to "code",
					"scope" to "",
				)))
			}
			get("/token") {
				val code = call.parameters["code"]
					?: return@get call.respond(HttpStatusCode.BadRequest)

				/* exchange code for token */
				try {
					val json = Util.httpPostRequest(Util.urlParams(
						auth.tokenURI,
						"client_id" to auth.clientId,
						"client_secret" to auth.clientSecret,
						"code" to code,
						"grant_type" to "authorization_code",
						"redirect_uri" to auth.redirectURI
					)) as JsonObject

					val token = json.get("access_token").asString
					call.respondText(tokenTemplate.template(token))

				} catch (ex: Exception) {
					call.respond(HttpStatusCode.BadRequest)
				}
			}
		}
	}.start(wait = true)
}

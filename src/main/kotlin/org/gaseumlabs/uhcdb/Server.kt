import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.gaseumlabs.uhcdb.Auth

fun main(args: Array<String>) {
	/* check environment variables to see if we are running in app engine */
	val isLocal = System.getenv().getOrDefault("GAE_APPLICATION", null) == null

	/* port is 8080 when testing locally */
	val port = System.getenv().getOrDefault("PORT", "8080").toIntOrNull() ?: 8080

	val auth = Auth.loadAuthClientData(Auth.CLIENT_SECRET_FILENAME, isLocal)

	println("UHC DB STARTING WITH PORT $port")

	embeddedServer(Netty, port = port) {
		routing {
			get("/") {
				call.respondText("hello world")
			}
			get("/auth") {

			}
			get("/token") {

			}
		}
	}.start(wait = true)
}

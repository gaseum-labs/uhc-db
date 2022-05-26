import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun main(args: Array<String>) {
	val port = System.getenv().getOrDefault("PORT", "8080").toIntOrNull() ?: 8080

	println("UHC DB STARTING WITH PORT $port")

	embeddedServer(Netty, port = port) {
		routing {
			get("/") {
				call.respondText("hello world")
			}
		}
	}.start(wait = true)
}

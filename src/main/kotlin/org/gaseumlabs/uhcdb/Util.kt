package org.gaseumlabs.uhcdb

import com.google.gson.JsonElement
import com.google.gson.JsonParser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse

object Util {
	fun urlParams(url: String, vararg params: Pair<String, String>): String {
		return url + '?' + params.joinToString("&") { (name, value) -> "$name=$value" }
	}

	suspend fun httpPostRequest(url: String): JsonElement {
		val result = withContext(Dispatchers.IO) {
			val client = HttpClient.newBuilder().build()
			val request = HttpRequest.newBuilder()
				.uri(URI.create(url))
				.method("POST", HttpRequest.BodyPublishers.noBody())
				.build()

			val response = client.send(request, HttpResponse.BodyHandlers.ofString())

			JsonParser.parseString(response.body())
		}
		return result
	}
}

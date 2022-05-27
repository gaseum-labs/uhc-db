package org.gaseumlabs.uhcdb

class HtmlTemplater(val filename: String) {
	var stringParts: ArrayList<String>? = null

	private fun internalGetStringParts(): ArrayList<String> {
		val stringParts = stringParts
		return if (stringParts != null) {
			stringParts
		} else {
			val fullString = this::class.java.getResource(filename)?.readText()
				?: throw Exception("HTML file $filename does not exist")

			val indices = ArrayList<Int>()
			while (true) {
				val index = fullString.indexOf("{{}}")
				if (index == -1) break
			}

			val newStringParts = ArrayList<String>(indices.size + 1)

			if (indices.isNotEmpty()) {
				newStringParts.add(fullString.substring(0, indices.first()))
				for (i in 1 until indices.size) {
					newStringParts.add(fullString.substring(
						indices[i - 1] + 4,
						indices[i]
					))
				}
				newStringParts.add(fullString.substring(indices.last() + 4))
			} else {
				newStringParts.add(fullString)
			}

			this.stringParts = newStringParts
			newStringParts
		}
	}

	fun template(vararg parameters: String): String {
		val stringParts = internalGetStringParts()

		return if (stringParts.size > 1) {
			val builder = StringBuilder()
			for (i in 0 until stringParts.size - 1) {
				builder.append(stringParts[i])
				builder.append(parameters[i])
			}
			builder.append(stringParts.last())

			return builder.toString()

		} else {
			stringParts.first()
		}
	}
}
package ai.evee.app

import android.os.Bundle
import android.graphics.BitmapFactory
import android.util.Base64
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

private data class ChatMessage(val role: String, val content: String, val imageData: String? = null)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = android.graphics.Color.rgb(9, 10, 20)
        window.navigationBarColor = android.graphics.Color.rgb(9, 10, 20)
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        setContent { EveeApp() }
    }
}

@Composable
private fun EveeApp() {
    val messages = remember {
        mutableStateListOf(
            ChatMessage("assistant", "Hey! I'm EVEE AI. Ask me anything, or tell me what you'd like to create.")
        )
    }
    var input by remember { mutableStateOf("") }
    var provider by remember { mutableStateOf("gemini") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    val bg = Color(0xFF090A14)
    val panel = Color(0xFF141727)
    val purple = Color(0xFF8065FF)

    LaunchedEffect(messages.size, loading) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.lastIndex)
    }

    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = purple,
            background = bg,
            surface = panel,
            onBackground = Color(0xFFF4F2FF),
            onSurface = Color(0xFFF4F2FF)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Brush.verticalGradient(listOf(Color(0xFF111329), bg, Color(0xFF090A14))))
                .padding(horizontal = 16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 14.dp, bottom = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier.size(44.dp).background(
                        Brush.linearGradient(listOf(Color(0xFF9A6BFF), Color(0xFF5147D9))),
                        RoundedCornerShape(15.dp)
                    ),
                    contentAlignment = Alignment.Center
                ) { Text("✦", color = Color.White, fontSize = 25.sp, fontWeight = FontWeight.Bold) }
                Column(Modifier.weight(1f).padding(start = 11.dp)) {
                    Text("EVEE AI", fontSize = 19.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Text("YOUR INTELLIGENCE. WITHOUT LIMITS.", fontSize = 9.sp, color = Color(0xFFAAA6C8), letterSpacing = 1.sp)
                }
                TextButton(onClick = {
                    messages.clear()
                    messages.add(ChatMessage("assistant", "New conversation started. What shall we explore?"))
                    error = null
                }) { Text("New chat", color = Color(0xFFC6B9FF), fontSize = 12.sp) }
            }

            Row(
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ProviderChip("Gemini", provider == "gemini") { provider = "gemini" }
                ProviderChip("OpenAI", provider == "openai") { provider = "openai" }
                Spacer(Modifier.weight(1f))
                Text("NATIVE APP", color = Color(0xFF77748F), fontSize = 9.sp, modifier = Modifier.align(Alignment.CenterVertically))
            }

            LazyColumn(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                state = listState,
                verticalArrangement = Arrangement.spacedBy(14.dp),
                contentPadding = PaddingValues(top = 8.dp, bottom = 16.dp)
            ) {
                itemsIndexed(messages) { _, message ->
                    MessageBubble(message, purple, panel)
                }
                if (loading) {
                    item {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            CircularProgressIndicator(Modifier.size(16.dp), color = purple, strokeWidth = 2.dp)
                            Text("  EVEE is thinking…", color = Color(0xFFAAA6C8), fontSize = 13.sp)
                        }
                    }
                }
            }

            error?.let {
                Text(it, color = Color(0xFFFF8B9A), fontSize = 12.sp, modifier = Modifier.padding(bottom = 8.dp))
            }

            Surface(
                color = Color(0xF0181B2D),
                shape = RoundedCornerShape(25.dp),
                tonalElevation = 4.dp,
                modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp)
            ) {
                Column(Modifier.padding(12.dp)) {
                    OutlinedTextField(
                        value = input,
                        onValueChange = { input = it },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Message EVEE AI…", color = Color(0xFF777D99)) },
                        maxLines = 5,
                        enabled = !loading,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                        keyboardActions = KeyboardActions(onSend = {
                            if (input.isNotBlank() && !loading) {
                                val prompt = input.trim()
                                input = ""
                                sendMessage(messages, prompt, provider, { loading = it }, { error = it }, scope)
                            }
                        }),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color.Transparent,
                            unfocusedBorderColor = Color.Transparent,
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            cursorColor = purple
                        )
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("AI can make mistakes. Verify important information.", color = Color(0xFF777D99), fontSize = 10.sp, modifier = Modifier.weight(1f))
                        Button(
                            onClick = {
                                val prompt = input.trim()
                                if (prompt.isNotEmpty() && !loading) {
                                    input = ""
                                    sendMessage(messages, prompt, provider, { loading = it }, { error = it }, scope)
                                }
                            },
                            enabled = input.isNotBlank() && !loading,
                            shape = CircleShape,
                            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 10.dp)
                        ) { Text("↑", fontSize = 20.sp, fontWeight = FontWeight.Bold) }
                    }
                }
            }
            Text("EVEE AI  ·  POWERED BY EV0", color = Color(0xFF55536C), fontSize = 9.sp, modifier = Modifier.align(Alignment.CenterHorizontally).padding(bottom = 8.dp))
        }
    }
}

@Composable
private fun ProviderChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        color = if (selected) Color(0xFF5543A8) else Color(0xFF191C2D),
        shape = RoundedCornerShape(50),
        border = androidx.compose.foundation.BorderStroke(1.dp, if (selected) Color(0xFF9B85FF) else Color(0xFF30334A))
    ) {
        Text(label, color = Color.White, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp))
    }
}

@Composable
private fun MessageBubble(message: ChatMessage, purple: Color, panel: Color) {
    val isUser = message.role == "user"
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        if (!isUser) {
            Image(
                painter = painterResource(id = R.drawable.evee_ai_avatar),
                contentDescription = "EVEE AI",
                modifier = Modifier.padding(top = 3.dp, end = 8.dp).size(30.dp),
                contentScale = ContentScale.Fit
            )
        }
        Surface(
            color = if (isUser) Color(0xFF30204F) else panel,
            shape = RoundedCornerShape(
                topStart = 20.dp, topEnd = 20.dp,
                bottomStart = if (isUser) 20.dp else 5.dp,
                bottomEnd = if (isUser) 5.dp else 20.dp
            ),
            modifier = Modifier.widthIn(max = 310.dp)
        ) {
            Column(Modifier.padding(14.dp)) {
                if (message.content.isNotBlank()) Text(message.content, color = Color(0xFFF1EFFA), fontSize = 15.sp, lineHeight = 22.sp)
                message.imageData?.let { encoded ->
                    val bitmap = remember(encoded) {
                        runCatching { BitmapFactory.decodeByteArray(Base64.decode(encoded, Base64.DEFAULT), 0, Base64.decode(encoded, Base64.DEFAULT).size)?.asImageBitmap() }.getOrNull()
                    }
                    bitmap?.let { Image(bitmap = it, contentDescription = "AI-generated image", modifier = Modifier.fillMaxWidth().padding(top = 8.dp), contentScale = ContentScale.Fit) }
                }
            }
        }
    }
}

private fun sendMessage(
    messages: MutableList<ChatMessage>,
    prompt: String,
    provider: String,
    setLoading: (Boolean) -> Unit,
    setError: (String?) -> Unit,
    scope: kotlinx.coroutines.CoroutineScope
) {
    messages.add(ChatMessage("user", prompt))
    val assistantIndex = messages.size
    messages.add(ChatMessage("assistant", ""))
    setLoading(true)
    setError(null)
    scope.launch {
        try {
            val wantsImage = Regex("""\b(generate|create|draw|make)\b.{0,50}\b(image|picture|illustration|artwork|wallpaper)\b|\b(image|picture|illustration|artwork|wallpaper)\b.{0,50}\b(generate|create|draw|make)\b""", RegexOption.IGNORE_CASE).containsMatchIn(prompt)
            if (wantsImage) {
                val generated = generateEveeImage(prompt)
                withContext(Dispatchers.Main) {
                    messages[assistantIndex] = ChatMessage("assistant", generated.first, generated.second)
                }
            } else {
                streamEvee(messages.dropLast(1), provider) { chunk ->
                    withContext(Dispatchers.Main) {
                        val current = messages[assistantIndex]
                        messages[assistantIndex] = current.copy(content = current.content + chunk)
                    }
                }
                if (messages[assistantIndex].content.isBlank()) {
                    messages[assistantIndex] = ChatMessage("assistant", "EVEE returned an empty response. Please try again.")
                }
            }
        } catch (e: Exception) {
            messages.removeAt(assistantIndex)
            setError(e.message ?: "Unable to reach EVEE AI. Please try again.")
        } finally {
            setLoading(false)
        }
    }
}

private suspend fun generateEveeImage(prompt: String): Pair<String, String> = withContext(Dispatchers.IO) {
    val payload = JSONObject().put("prompt", prompt).put("aspectRatio", "1:1")
    val connection = (URL("https://evee-ai-q6d9.vercel.app/api/images").openConnection() as HttpURLConnection).apply {
        requestMethod = "POST"
        connectTimeout = 20000
        readTimeout = 180000
        doOutput = true
        setRequestProperty("Content-Type", "application/json")
        setRequestProperty("Accept", "application/json")
    }
    try {
        connection.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
        val code = connection.responseCode
        val body = (if (code in 200..299) connection.inputStream else connection.errorStream)
            ?.bufferedReader()?.use { it.readText() }.orEmpty()
        val json = JSONObject(body)
        if (code !in 200..299) throw IllegalStateException(json.optString("error", "Image generation failed ($code)."))
        val dataUrl = json.optString("image")
        val base64 = dataUrl.substringAfter("base64,", "")
        if (base64.isBlank()) throw IllegalStateException("EVEE did not return an image.")
        (json.optString("text", "Here is your generated image.") to base64)
    } finally {
        connection.disconnect()
    }
}

private suspend fun streamEvee(
    messages: List<ChatMessage>,
    provider: String,
    onChunk: suspend (String) -> Unit
) = withContext(Dispatchers.IO) {
    val payloadMessages = JSONArray()
    messages.forEach { message ->
        payloadMessages.put(JSONObject().put("role", message.role).put("content", message.content))
    }
    val payload = JSONObject().put("provider", provider).put("messages", payloadMessages)
    val connection = (URL("https://evee-ai-q6d9.vercel.app/api/chat").openConnection() as HttpURLConnection).apply {
        requestMethod = "POST"
        connectTimeout = 20000
        readTimeout = 120000
        doOutput = true
        setRequestProperty("Content-Type", "application/json")
        setRequestProperty("Accept", "text/plain")
    }
    try {
        connection.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
        val code = connection.responseCode
        if (code !in 200..299) {
            val body = connection.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
            val message = try { JSONObject(body).optString("error", body) } catch (_: Exception) { body }
            throw IllegalStateException("EVEE API ($code): $message")
        }
        connection.inputStream.bufferedReader(Charsets.UTF_8).use { reader ->
            val buffer = CharArray(1024)
            while (true) {
                val count = reader.read(buffer)
                if (count < 0) break
                if (count > 0) onChunk(String(buffer, 0, count))
            }
        }
    } finally {
        connection.disconnect()
    }
}

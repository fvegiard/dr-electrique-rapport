# Voice Context

## Language Settings
- **User Language:** French (Quebec)
- **Response Language:** French
- **TTS Voice:** fr-CA-SylvieNeural (Microsoft Edge TTS)

## Voice Pipeline
```
[Microphone] -> [Whisper STT] -> [Claude API] -> [Edge TTS FR] -> [Speaker]
```

## Known Issues
- Claude.ai voice mode doesn't support French well
- Workaround: Use voice_pipeline_fr.py on local machine

## Transcription Notes
- If transcription comes in English, interpret intent and respond in French
- Common misheard words: "Léna" might become "Lena", "Elena"

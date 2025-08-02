import os
import requests
import json
import base64
import logging
from flask import jsonify

class GoogleTextToSpeechService:
    def __init__(self):
        self.api_key = os.environ.get('GOOGLE_API_KEY')
        self.base_url = 'https://texttospeech.googleapis.com/v1/text:synthesize'
        
        # French voice configurations (WaveNet for best quality)
        self.voice_configs = {
            'female': {
                'languageCode': 'fr-FR',
                'name': 'fr-FR-Wavenet-C',  # Female WaveNet voice
                'ssmlGender': 'FEMALE'
            },
            'male': {
                'languageCode': 'fr-FR', 
                'name': 'fr-FR-Wavenet-B',  # Male WaveNet voice
                'ssmlGender': 'MALE'
            }
        }
        
        # Audio configuration for high quality
        self.audio_config = {
            'audioEncoding': 'MP3',
            'sampleRateHertz': 24000,  # High quality
            'speakingRate': 1.0,       # Normal speed
            'pitch': 0.0,              # Normal pitch
            'volumeGainDb': 0.0        # Normal volume
        }

    def synthesize_speech(self, text, voice_type='female', rate=1.0, pitch=0.0):
        """
        Synthesize speech using Google Cloud Text-to-Speech API
        
        Args:
            text (str): Text to synthesize
            voice_type (str): 'female' or 'male'
            rate (float): Speaking rate (0.25 to 4.0)
            pitch (float): Pitch adjustment (-20.0 to 20.0)
            
        Returns:
            dict: Response with audio data or error
        """
        if not self.api_key:
            return {'error': 'Google API key not configured'}
        
        if not text or not text.strip():
            return {'error': 'No text provided'}
        
        try:
            # Clean text for speech synthesis
            clean_text = text.strip()
            if len(clean_text) > 5000:  # Google API limit is 5000 characters
                clean_text = clean_text[:4997] + "..."
            
            # Prepare voice configuration
            voice_config = self.voice_configs.get(voice_type, self.voice_configs['female'])
            
            # Prepare audio configuration with custom parameters
            audio_config = self.audio_config.copy()
            audio_config['speakingRate'] = max(0.25, min(4.0, rate))
            audio_config['pitch'] = max(-20.0, min(20.0, pitch))
            
            # Prepare request payload
            payload = {
                'input': {'text': clean_text},
                'voice': voice_config,
                'audioConfig': audio_config
            }
            
            # Make API request
            response = requests.post(
                f"{self.base_url}?key={self.api_key}",
                headers={'Content-Type': 'application/json'},
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                audio_content = result.get('audioContent')
                
                if audio_content:
                    logging.info(f"Google TTS synthesis successful for text: {clean_text[:50]}...")
                    return {
                        'success': True,
                        'audio_content': audio_content,
                        'audio_format': 'mp3',
                        'text_length': len(clean_text)
                    }
                else:
                    return {'error': 'No audio content in response'}
            
            else:
                error_msg = f"Google TTS API error: {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f" - {error_detail.get('error', {}).get('message', 'Unknown error')}"
                except:
                    error_msg += f" - {response.text}"
                
                logging.error(error_msg)
                return {'error': error_msg}
                
        except requests.exceptions.Timeout:
            error_msg = "Google TTS API timeout"
            logging.error(error_msg)
            return {'error': error_msg}
            
        except Exception as e:
            error_msg = f"Google TTS error: {str(e)}"
            logging.error(error_msg)
            return {'error': error_msg}

    def get_available_voices(self):
        """Get list of available French voices"""
        return [
            {
                'name': 'fr-FR-Wavenet-C',
                'type': 'female',
                'description': 'Voix féminine (WaveNet - Haute qualité)'
            },
            {
                'name': 'fr-FR-Wavenet-B', 
                'type': 'male',
                'description': 'Voix masculine (WaveNet - Haute qualité)'
            }
        ]

# Global instance
tts_service = GoogleTextToSpeechService()
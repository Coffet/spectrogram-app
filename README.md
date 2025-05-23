# Spectrogram App

## Overview
The Spectrogram App is a web-based application that allows users to upload audio files, visualize them as 2D spectrograms, and identify the beats per minute (BPM) of the audio. The application features a modern and simplistic user interface that supports both English and Traditional Chinese languages.

## Features
- Audio file upload and playback
- 2D spectrogram visualization
- BPM detection from audio
- Modernized and simplistic UI
- Multi-language support (English and Traditional Chinese)

## Project Structure
```
spectrogram-app
├── index.html          # Main HTML document
├── css
│   └── style.css      # Styles for the application
├── js
│   ├── app.js         # Main JavaScript file for application logic
│   ├── audioPlayer.js  # Audio playback management
│   └── bpmDetector.js  # BPM detection logic
├── locales
│   ├── en.json        # English translations
│   └── zh-TW.json     # Traditional Chinese translations
└── README.md          # Project documentation
```

## Setup Instructions
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/spectrogram-app.git
   ```
2. Navigate to the project directory:
   ```
   cd spectrogram-app
   ```
3. Open `index.html` in your web browser to run the application.

## Usage
- Upload an audio file using the provided interface.
- Click the play button to listen to the audio.
- The spectrogram will be generated and displayed on the screen.
- The BPM of the audio will be calculated and displayed.

## Language Support
The application supports English and Traditional Chinese. You can switch languages by modifying the locale settings in the application.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.
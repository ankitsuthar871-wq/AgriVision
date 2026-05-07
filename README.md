# 🌾 AgriVision

**AgriVision** is a smart, AI-powered agricultural platform designed to empower farmers with real-time intelligence, localized disease detection, and direct market access. 

## 🚀 Features

- **🤖 AI Crop Scanner**: Upload photos of crops (leaves, fruits, vegetables) and the 5-stage Machine Learning pipeline will automatically detect the plant type and any potential diseases.
- **🌦️ Live Weather Intelligence**: Hyper-local weather forecasting with Google-style widgets, providing actionable farming recommendations based on weather conditions.
- **📈 Real-Time Market Prices**: Live tracking of crop prices across various local Mandis (markets) with up/down trends and Government MSP data.
- **🏛️ Government Schemes Tracker**: Access to the latest agricultural schemes, subsidies, and financial support programs provided by the government.
- **🌍 Bilingual Support**: Fully localized in Hindi and English for accessibility in rural areas.

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Machine Learning**: Python, TensorFlow / Keras (5 specialized models for Wheat, Bajra, Fruits, Vegetables, and Spices)
- **AI Integration**: Google Gemini 2.0 Flash (for advanced agricultural diagnosis fallback)

## ⚙️ How to Run Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/nouranglal810-png/AgriVision.git
   cd AgriVision
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Setup the Machine Learning environment:
   ```bash
   cd ml
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   cd ..
   ```

4. Start both Node.js and ML servers at the same time:
   ```bash
   # On Windows
   ./ml/run.bat
   ```

5. Open your browser and navigate to `http://localhost:3000`

---
*Built with ❤️ for Indian Farmers.*

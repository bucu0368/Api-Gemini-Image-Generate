
const express = require('express');
const { GoogleGenAI, Modality } = require('@google/genai');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

// Initialize Google AI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "apikey gemini"
});

app.use(express.json());

// Serve static files (for generated images)
app.use('/images', express.static('images'));

// Create images directory if it doesn't exist
if (!fs.existsSync('images')) {
  fs.mkdirSync('images');
}

app.get('/api/image', async (req, res) => {
  try {
    const prompt = req.query.prompt;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt parameter is required' });
    }

    console.log('Generating image for prompt:', prompt);

    // Generate image using Gemini
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: prompt,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    let imageUrl = null;
    let generatedText = null;

    for (const part of response.candidates[0].content.parts) {
      if (part.text) {
        generatedText = part.text;
        console.log('Generated text:', part.text);
      } else if (part.inlineData) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");
        
        // Generate unique filename
        const timestamp = Date.now();
        const filename = `gemini-image-${timestamp}.png`;
        const filepath = path.join('images', filename);
        
        fs.writeFileSync(filepath, buffer);
        imageUrl = `/images/${filename}`;
        console.log('Image saved as:', filename);
      }
    }

    res.json({
      success: true,
      prompt: prompt,
      text: generatedText,
      imageUrl: imageUrl ? `${req.protocol}://${req.get('host')}${imageUrl}` : null
    });

  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ 
      error: 'Failed to generate image',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Gemini Image Generation API is running',
    usage: 'GET /api/image?prompt=your_prompt_here'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Image generation API available at: /api/image?prompt=your_prompt_here`);
});

// Next.js API route - pages/api/chat.js
export default async function handler(req, res) {
  // Log request details for debugging
  console.log('Received request at /api/chat:', {
    method: req.method,
    body: req.body
  });
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Frontend'den gelen verileri al
    const { message, conversation_id, user_email } = req.body;
    
    if (!message || !conversation_id) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Message and conversation_id are required.'
      });
    }
    
    // Backend'e istek gönder
    const backendUrl = 'http://localhost:8000/chat';
    console.log(`Forwarding request to backend: ${backendUrl}`);
    
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversation_id,
        user_email
      }),
    });
    
    // Backend yanıtını oku
    const responseText = await backendResponse.text();
    console.log('Backend response status:', backendResponse.status);
    console.log('Backend response text:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('Failed to parse backend response:', jsonError);
      return res.status(500).json({ 
        error: 'Invalid response from backend',
        details: responseText
      });
    }
    
    // Başarılı yanıtı istemciye ilet
    if (backendResponse.ok) {
      return res.status(200).json(data);
    } else {
      return res.status(backendResponse.status).json({ 
        error: 'Backend error',
        details: data
      });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
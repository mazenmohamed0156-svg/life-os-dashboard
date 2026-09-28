export default async (req, res) => {
  const { databaseId, filter, pageId, properties } = req.body;
  const NOTION_API_KEY = process.env.NOTION_API_KEY;

  if (!NOTION_API_KEY) {
    return res.status(400).json({ error: 'NOTION_API_KEY not configured' });
  }

  try {
    if (req.method === 'POST') {
      // Query database
      const payload = {};
      if (filter) payload.filter = filter;

      const response = await fetch(
        `https://api.notion.com/v1/databases/${databaseId}/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${NOTION_API_KEY}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error(`Notion API: ${response.status}`);
      }

      const data = await response.json();
      return res.status(200).json(data.results || []);
    } 
    
    else if (req.method === 'PATCH') {
      // Update page
      const response = await fetch(
        `https://api.notion.com/v1/pages/${pageId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${NOTION_API_KEY}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ properties })
        }
      );

      if (!response.ok) {
        throw new Error(`Notion API: ${response.status}`);
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Unable to process request' });
  }
};

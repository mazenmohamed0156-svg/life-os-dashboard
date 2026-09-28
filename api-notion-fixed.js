// api/notion.js - Vercel Serverless Function
// Proxies Notion API calls securely + handles updates

export default async function handler(req, res) {
  const NOTION_API_KEY = process.env.NOTION_API_KEY;

  if (!NOTION_API_KEY) {
    return res.status(400).json({ error: 'NOTION_API_KEY not configured' });
  }

  if (req.method === 'POST') {
    return handleQuery(req, res, NOTION_API_KEY);
  } else if (req.method === 'PATCH') {
    return handleUpdate(req, res, NOTION_API_KEY);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleQuery(req, res, NOTION_API_KEY) {
  try {
    const { databaseId, filter, sorts } = req.body;

    // Validate required databaseId
    if (!databaseId || typeof databaseId !== 'string' || databaseId.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid databaseId' });
    }

    // Validate optional filter
    if (filter !== undefined && (typeof filter !== 'object' || filter === null)) {
      return res.status(400).json({ error: 'Invalid filter object' });
    }

    // Validate optional sorts
    if (sorts !== undefined && (!Array.isArray(sorts))) {
      return res.status(400).json({ error: 'Invalid sorts array' });
    }

    const payload = {};
    
    if (filter) {
      payload.filter = filter;
    }
    
    if (sorts) {
      payload.sorts = sorts;
    }

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
      // Log detailed error for debugging, but don't expose to client
      console.error(`Notion API Error ${response.status}`);
      
      if (response.status === 401 || response.status === 403) {
        return res.status(500).json({ error: 'Authorization failed' });
      }
      if (response.status === 404) {
        return res.status(500).json({ error: 'Database not found' });
      }
      if (response.status === 429) {
        return res.status(500).json({ error: 'Rate limited. Please try again later' });
      }
      return res.status(500).json({ error: 'Unable to load Notion data' });
    }

    const data = await response.json();
    res.status(200).json(data.results || []);
  } catch (error) {
    // Log error details for debugging only
    console.error('Query Error:', error.message);
    res.status(500).json({ error: 'Unable to load Notion data' });
  }
}

async function handleUpdate(req, res, NOTION_API_KEY) {
  try {
    const { pageId, properties } = req.body;

    // Validate required pageId
    if (!pageId || typeof pageId !== 'string' || pageId.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid pageId' });
    }

    // Validate required properties object
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
      return res.status(400).json({ error: 'Invalid properties object' });
    }

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
      // Log detailed error for debugging, but don't expose to client
      console.error(`Notion API Error ${response.status}`);
      
      if (response.status === 401 || response.status === 403) {
        return res.status(500).json({ error: 'Authorization failed' });
      }
      if (response.status === 404) {
        return res.status(500).json({ error: 'Page not found' });
      }
      if (response.status === 429) {
        return res.status(500).json({ error: 'Rate limited. Please try again later' });
      }
      return res.status(500).json({ error: 'Unable to update Notion' });
    }

    const data = await response.json();
    res.status(200).json({ success: true });
  } catch (error) {
    // Log error details for debugging only
    console.error('Update Error:', error.message);
    res.status(500).json({ error: 'Unable to update Notion' });
  }
}

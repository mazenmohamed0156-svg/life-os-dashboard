module.exports = async function handler(req, res) {
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
};

async function handleQuery(req, res, NOTION_API_KEY) {
  try {
    const { databaseId, filter, sorts } = req.body;

    if (!databaseId || typeof databaseId !== 'string' || databaseId.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid databaseId' });
    }

    // Filter can be null (no filtering) or an object
    if (filter !== undefined && filter !== null && typeof filter !== 'object') {
      return res.status(400).json({ error: 'Invalid filter object' });
    }

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
      console.error(`Notion Query Error - Status: ${response.status}, Database: ${databaseId}`);
      
      if (response.status === 401 || response.status === 403) {
        return res.status(500).json({ 
          error: 'Authorization failed',
          step: 'notion-auth',
          details: 'Integration does not have permission to access this database'
        });
      }
      if (response.status === 404) {
        return res.status(500).json({ 
          error: 'Database not found',
          step: 'notion-query',
          details: 'Database ID may be incorrect or no longer exists'
        });
      }
      if (response.status === 429) {
        return res.status(500).json({ 
          error: 'Rate limited',
          step: 'notion-api',
          details: 'Too many requests. Please try again in a moment.'
        });
      }
      return res.status(500).json({ 
        error: 'Unable to load Notion data',
        step: 'notion-query',
        details: `Notion API returned status ${response.status}`
      });
    }

    const data = await response.json();
    res.status(200).json(data.results || []);
  } catch (error) {
    console.error('Query Error:', error.message);
    res.status(500).json({ error: 'Unable to load Notion data' });
  }
}

async function handleUpdate(req, res, NOTION_API_KEY) {
  try {
    const { pageId, properties } = req.body;

    if (!pageId || typeof pageId !== 'string' || pageId.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid pageId' });
    }

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
      console.error(`Notion Update Error - Status: ${response.status}, Page: ${pageId}`);
      
      if (response.status === 401 || response.status === 403) {
        return res.status(500).json({ 
          error: 'Authorization failed',
          step: 'notion-auth',
          details: 'Integration does not have permission to update this page'
        });
      }
      if (response.status === 404) {
        return res.status(500).json({ 
          error: 'Page not found',
          step: 'notion-update',
          details: 'Page ID may be incorrect or no longer exists'
        });
      }
      if (response.status === 429) {
        return res.status(500).json({ 
          error: 'Rate limited',
          step: 'notion-api',
          details: 'Too many requests. Please try again in a moment.'
        });
      }
      return res.status(500).json({ 
        error: 'Unable to update Notion',
        step: 'notion-update',
        details: `Notion API returned status ${response.status}`
      });
    }

    const data = await response.json();
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Update Error:', error.message);
    res.status(500).json({ error: 'Unable to update Notion' });
  }
}

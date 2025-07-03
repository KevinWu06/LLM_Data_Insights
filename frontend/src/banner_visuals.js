import React from 'react';
import bannerImageMap from './embeddedImages';
import { Box, Typography, Card, CardContent, CardMedia, Grid, Link } from '@mui/material';

const isImageUrl = (url) => {
  return url && (url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.gif'));
};

const isHtmlBanner = (url) => {
  // Heuristic: if the URL contains '/HTML/' or ends with a slash, treat as HTML/animated banner
  return url && (url.includes('/HTML/') || url.endsWith('/'));
};

const CARD_HEIGHT = 700; // taller
const CARD_WIDTH = 300;  // wider
const MEDIA_HEIGHT = 600; // more space for image/iframe

const BannerVisuals = () => {
  const banners = Object.entries(bannerImageMap)
    .filter(([title, url]) => url && url.trim() !== '');

  return (
    <Box sx={{ width: '100%', maxWidth: 1800, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 700, textAlign: 'center', color: '#1976d2' }}>
        Banner Visuals
      </Typography>
      <Grid container spacing={6} justifyContent="center">
        {banners.map(([title, url]) => (
          <Grid item xs={12} sm={4} md={4} lg={4} xl={4} key={title} sx={{ display: 'flex', justifyContent: 'center' }}>
            <Card sx={{ height: CARD_HEIGHT, width: CARD_WIDTH, display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2, boxShadow: 3 }}>
              {isImageUrl(url) ? (
                <CardMedia
                  component="img"
                  image={url}
                  alt={title}
                  sx={{ height: MEDIA_HEIGHT, width: '100%', objectFit: 'contain', mb: 2, borderRadius: 2, boxShadow: 1, background: '#f8fafc' }}
                />
              ) : isHtmlBanner(url) ? (
                <Box sx={{ width: '100%', height: MEDIA_HEIGHT, mb: 2, background: '#f8fafc', borderRadius: 2, boxShadow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <iframe
                    src={url}
                    title={title}
                    style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }}
                    sandbox="allow-scripts allow-same-origin"
                  />
                </Box>
              ) : (
                <Box sx={{ width: '100%', height: MEDIA_HEIGHT, mb: 2, background: '#f8fafc', borderRadius: 2, boxShadow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Link href={url} target="_blank" rel="noopener" underline="hover">
                    {url}
                  </Link>
                </Box>
              )}
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, textAlign: 'center' }}>{title}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {banners.length === 0 && (
        <Typography sx={{ mt: 6, color: '#888', textAlign: 'center' }}>
          No banner visuals available.
        </Typography>
      )}
    </Box>
  );
};

export default BannerVisuals; 
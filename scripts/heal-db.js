const fs = require('fs');
const path = require('path');

const TRIPS_FILE = path.join(__dirname, '../packages/db/data/trips.json');
const PIXABAY_KEY = '56439289-7031ef2f0e888cf1c7ab9501e';

async function convertUrlToBase64(imageUrl) {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    return null;
  }
}

async function searchPixabayBase64(query) {
  if (!query) return null;
  try {
    const pixabayUrl = new URL('https://pixabay.com/api/');
    pixabayUrl.searchParams.set('key', PIXABAY_KEY);
    pixabayUrl.searchParams.set('q', query.slice(0, 100));
    pixabayUrl.searchParams.set('image_type', 'photo');
    pixabayUrl.searchParams.set('orientation', 'horizontal');
    pixabayUrl.searchParams.set('safesearch', 'true');
    pixabayUrl.searchParams.set('per_page', '3');

    const res = await fetch(pixabayUrl);
    if (!res.ok) return null;
    const data = await res.json();
    const hit = (data.hits || []).find(h => h.largeImageURL || h.webformatURL || h.previewURL);
    const url = hit?.largeImageURL || hit?.webformatURL || hit?.previewURL;
    if (!url) return null;
    return await convertUrlToBase64(url);
  } catch (error) {
    return null;
  }
}

async function run() {
  if (!fs.existsSync(TRIPS_FILE)) {
    console.error('Trips file not found');
    return;
  }

  const trips = JSON.parse(fs.readFileSync(TRIPS_FILE, 'utf-8'));
  console.log(`Loaded ${trips.length} trips.`);

  for (const trip of trips) {
    console.log(`Processing trip: ${trip.name} (${trip.id})`);
    
    // Check cover image
    if (trip.coverImage && trip.coverImage.startsWith('http') && !trip.coverImage.startsWith('data:')) {
      console.log(`Healing coverImage for trip: ${trip.name}`);
      let base64 = await convertUrlToBase64(trip.coverImage);
      if (!base64) {
        const query = trip.destinations?.[0] || trip.name || 'travel';
        console.log(`Cover image expired. Searching for query: "${query}"`);
        base64 = await searchPixabayBase64(query);
      }
      if (base64) {
        trip.coverImage = base64;
        console.log(`Successfully healed coverImage.`);
      }
    }

    // Check itinerary items
    if (Array.isArray(trip.itinerary)) {
      for (const item of trip.itinerary) {
        if (item.image && item.image.startsWith('http') && !item.image.startsWith('data:')) {
          console.log(`Healing image for item: ${item.title}`);
          let base64 = await convertUrlToBase64(item.image);
          if (!base64) {
            const query = item.meta?.imageSearchQuery || item.title || 'travel';
            console.log(`Item image expired. Searching for query: "${query}"`);
            base64 = await searchPixabayBase64(query);
          }
          if (base64) {
            item.image = base64;
            if (item.meta) {
              item.meta.image = base64;
            }
            console.log(`Successfully healed item image.`);
          }
        }
      }
    }
  }

  fs.writeFileSync(TRIPS_FILE, JSON.stringify(trips, null, 2), 'utf-8');
  console.log('Finished healing database!');
}

run();

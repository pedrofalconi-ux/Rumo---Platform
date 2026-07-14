export async function convertUrlToBase64(imageUrl: string): Promise<string> {
  if (!imageUrl || !imageUrl.startsWith('http')) {
    return imageUrl;
  }
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return imageUrl;
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error('Failed to convert image to Base64:', imageUrl, error);
    return imageUrl;
  }
}

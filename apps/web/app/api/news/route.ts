import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/server-auth';

interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  imageUrl?: string;
  source: string;
}

// Fallback curated news in case external fetch fails or in offline development
const FALLBACK_NEWS: NewsItem[] = [
  {
    title: 'Tendências de viagem para 2026: Destinos sustentáveis e turismo de experiência',
    link: 'https://g1.globo.com/turismo-e-viagem/',
    description: 'Viajantes buscam cada vez mais conexões autênticas com a natureza e comunidades locais. Conheça os principais destinos em alta.',
    pubDate: new Date().toUTCString(),
    imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=600&auto=format&fit=crop',
    source: 'Rumo Curadoria',
  },
  {
    title: 'Como a Inteligência Artificial está transformando a personalização de roteiros',
    link: 'https://g1.globo.com/turismo-e-viagem/',
    description: 'Novas ferramentas ajudam agentes de viagens a criar itinerários hiper-personalizados em minutos, melhorando a experiência do cliente.',
    pubDate: new Date().toUTCString(),
    imageUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=600&auto=format&fit=crop',
    source: 'Rumo Insights',
  },
  {
    title: 'Os 10 destinos mais acolhedores do Brasil para visitar este ano',
    link: 'https://g1.globo.com/turismo-e-viagem/',
    description: 'Levantamento aponta cidades do interior e litoral reconhecidas pela hospitalidade e riqueza cultural.',
    pubDate: new Date().toUTCString(),
    imageUrl: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=600&auto=format&fit=crop',
    source: 'Rumo Curadoria',
  }
];

function extractTag(xml: string, tagName: string): string {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`));
  if (!match) return '';
  let content = match[1];
  if (content.startsWith('<![CDATA[')) {
    content = content.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
  }
  return content.trim();
}

function cleanHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractImage(itemXml: string, description: string): string | undefined {
  // 1. Try enclosure url
  const enclosureMatch = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["']/);
  if (enclosureMatch) return enclosureMatch[1];

  // 2. Try media:content
  const mediaMatch = itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/);
  if (mediaMatch) return mediaMatch[1];

  // 3. Try parsing img src from description
  const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];

  return undefined;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const feedUrl = 'https://g1.globo.com/dynamo/turismo-e-viagem/rss2.xml';
    
    // Fetch feed with 1-hour cache
    const response = await fetch(feedUrl, {
      next: { revalidate: 3600 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS: ${response.status}`);
    }

    const xmlText = await response.text();
    const items = xmlText.split('<item>');
    
    // Skip the first split element (channel headers before <item>)
    if (items.length <= 1) {
      return NextResponse.json(FALLBACK_NEWS);
    }

    const parsedItems: NewsItem[] = items.slice(1, 7).map((itemXml) => {
      const title = extractTag(itemXml, 'title');
      const link = extractTag(itemXml, 'link');
      const rawDescription = extractTag(itemXml, 'description');
      const pubDate = extractTag(itemXml, 'pubDate');
      
      const imageUrl = extractImage(itemXml, rawDescription);
      const description = cleanHtml(rawDescription);

      return {
        title,
        link,
        description: description.length > 150 ? `${description.slice(0, 150)}...` : description,
        pubDate,
        imageUrl,
        source: 'G1 Turismo',
      };
    });

    return NextResponse.json(parsedItems);
  } catch (error) {
    console.error('Error fetching travel news:', error);
    // Graceful fallback to static news
    return NextResponse.json(FALLBACK_NEWS);
  }
}
